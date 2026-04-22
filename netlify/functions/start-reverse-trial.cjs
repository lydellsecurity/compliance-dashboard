/**
 * start-reverse-trial
 *
 * Called internally by create-organization.cjs right after the org + owner
 * membership are inserted, on first-org-ever for a user. Provisions a
 * 14-day Growth trial that:
 *
 *   - Requires NO payment method up front (`payment_behavior:
 *     'default_incomplete'` is not used — we rely on Stripe's
 *     `trial_settings.end_behavior.missing_payment_method: 'cancel'` to
 *     auto-cancel on day 14 if the user never added a card).
 *   - Fires `customer.subscription.created` immediately (webhook
 *     promotes org.plan to 'growth' with status='trial').
 *   - Fires `customer.subscription.trial_will_end` on day 11 (webhook
 *     sends trial-ending email via utils/email.cjs).
 *   - Fires `customer.subscription.deleted` on day 14 if no card
 *     (webhook downgrades org back to 'free' with 90-day data grace).
 *
 * Psychology: per MONETIZATION_OPTIMIZATION_STRATEGY.md §2.1. Endowment
 * effect — users who've used AI Remediation Chat + questionnaire autofill
 * + VRM for 2 weeks lose roughly 3× the value they'd have gained by
 * choosing to pay. Reverse trials convert 40–55% vs 8–15% for classic
 * freemium→paid (Linear, Superhuman, Vercel public benchmarks).
 *
 * Called only from other Netlify functions (service role). No auth check
 * here because create-organization already verified the Clerk JWT.
 */

const { createClient } = require('@supabase/supabase-js');

const TRIAL_DAYS = 14;

let stripeClient = null;
function getStripe() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  stripeClient = require('stripe')(key, { apiVersion: '2024-06-20' });
  return stripeClient;
}

let supabaseClient = null;
function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase env vars missing');
  supabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseClient;
}

/**
 * Provision a 14-day Growth trial for a freshly-created organization.
 * Returns { trialStarted: bool, reason?: string, subscriptionId?: string }.
 * Non-fatal on error: org creation succeeded, trial is best-effort.
 */
async function startReverseTrial({ organizationId, userId, userEmail, organizationName }) {
  const growthPriceId = process.env.STRIPE_PRICE_GROWTH_ANNUAL;
  if (!growthPriceId) {
    console.warn(
      '[start-reverse-trial] STRIPE_PRICE_GROWTH_ANNUAL not configured; skipping reverse-trial provisioning'
    );
    return { trialStarted: false, reason: 'growth_price_not_configured' };
  }

  try {
    const stripe = getStripe();
    const supabase = getSupabase();

    // Customer: create fresh for this org. create-organization.cjs runs
    // before this so we know there's no pre-existing customer.
    const customer = await stripe.customers.create({
      email: userEmail || undefined,
      name: organizationName,
      metadata: {
        organization_id: organizationId,
        created_by_user_id: userId,
        reverse_trial: 'true',
      },
    });

    // Subscription with trial, no payment method required.
    //
    // `trial_settings.end_behavior.missing_payment_method: 'cancel'` is the
    // critical flag: on day 14, if the customer still has no payment
    // method on file, Stripe cancels the subscription instead of trying
    // to charge (which would 402 without a card). The webhook then
    // downgrades the org to free gracefully.
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: growthPriceId, quantity: 1 }],
      trial_period_days: TRIAL_DAYS,
      trial_settings: {
        end_behavior: {
          missing_payment_method: 'cancel',
        },
      },
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      metadata: {
        organization_id: organizationId,
        created_by_user_id: userId,
        reverse_trial: 'true',
        plan: 'growth',
        interval: 'annual',
      },
    });

    // Mirror the customerId + subscriptionId into org.billing so the
    // webhook's state-application code has something to update when
    // customer.subscription.created fires a moment later. Also set plan
    // to 'growth' and status to 'trial' preemptively so the user sees
    // the Growth features immediately without waiting on webhook
    // propagation. The webhook's applySubscriptionState is idempotent
    // and will converge to the same state.
    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;

    await supabase
      .from('organizations')
      .update({
        plan: 'growth',
        status: 'trial',
        stripe_price_id: growthPriceId,
        billing_interval: 'annual',
        trial_ends_at: trialEnd,
        cancel_at_period_end: false,
        // Limits/features mirror Growth from PLAN_CONFIGS
        limits: {
          maxUsers: 25,
          maxControls: 500,
          maxEvidence: 3000,
          maxIntegrations: 15,
          maxStorageGb: 50,
          retentionDays: 365,
          auditLogDays: 90,
          apiRateLimit: 300,
          maxVendors: 50,
          maxAiCredits: 10000,
        },
        features: {
          cloudIntegrations: true,
          customControls: true,
          apiAccess: true,
          ssoEnabled: true,
          customBranding: true,
          advancedReporting: true,
          trustCenter: true,
          incidentResponse: true,
          vendorRisk: true,
          questionnaireAutomation: true,
          aiRemediationChat: true,
          realTimeRegulatoryScan: false,
          auditBundleExport: true,
          customDomain: false,
          scimProvisioning: false,
        },
        billing: {
          customerId: customer.id,
          subscriptionId: subscription.id,
          currentPeriodEnd: trialEnd,
          seats: 25,
          seatsUsed: 1,
          mrr: 1166, // annual effective monthly for $11,964/yr Growth
          billingEmail: userEmail || null,
          billingAddress: null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    // Record the reverse-trial flag on the user so the trial-abuse guard
    // in stripe-create-checkout.cjs blocks a second trial when they spin
    // up a second org. They've already consumed their trial.
    await supabase
      .from('user_billing_flags')
      .upsert(
        { user_id: userId, trial_consumed: true },
        { onConflict: 'user_id' }
      );

    console.log(
      `[start-reverse-trial] provisioned ${TRIAL_DAYS}-day Growth trial for org ${organizationId}, subscription ${subscription.id}, ends ${trialEnd}`
    );

    return {
      trialStarted: true,
      subscriptionId: subscription.id,
      customerId: customer.id,
      trialEndsAt: trialEnd,
    };
  } catch (err) {
    console.error('[start-reverse-trial] failed:', err);
    return {
      trialStarted: false,
      reason: 'stripe_error',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

module.exports = { startReverseTrial };
