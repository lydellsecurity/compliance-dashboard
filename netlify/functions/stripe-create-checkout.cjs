/**
 * stripe-create-checkout
 *
 * POST /.netlify/functions/stripe-create-checkout
 * Body: { priceId: string, interval: 'monthly'|'annual', successPath?: string,
 *         cancelPath?: string, couponId?: string, promotionCode?: string }
 * Auth: Supabase JWT in Authorization header.
 *
 * Returns: { url: string } — Stripe-hosted Checkout URL.
 *
 * Idempotency: creates or reuses a Stripe Customer per organization so that
 * switching plans repeatedly doesn't spawn duplicate customers.
 *
 * Trial policy:
 *   - Starter (and any org that has never had a paid subscription) gets a
 *     14-day trial without a card being charged.
 *   - Growth and Scale still collect a card but skip the trial so we don't
 *     signal "free month" on premium tiers (reduces tire-kicking).
 *   - Users flagged as `trial_consumed=true` on `user_billing_flags` cannot
 *     claim a new trial from a second org they spin up (trial-abuse guard).
 */

const {
  handleCorsPreflght,
  errorResponse,
  successResponse,
  parseJsonBody,
  checkRateLimit,
} = require('./utils/security.cjs');
const {
  getStripe,
  getSupabase,
  requireAuthedOrg,
  getOrganization,
  resolvePlanFromPriceId,
} = require('./utils/stripe.cjs');

const TRIAL_DAYS = 14;
const PLANS_WITH_TRIAL = new Set(['starter']);

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;

  if (event.httpMethod === 'OPTIONS') return handleCorsPreflght(event);
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed', origin);
  }

  try {
    const { user, organizationId, role } = await requireAuthedOrg(
      event.headers.authorization || event.headers.Authorization
    );

    // Only owners/admins can initiate a plan change.
    if (role !== 'owner' && role !== 'admin') {
      return errorResponse(403, 'Only owners or admins can change the plan', origin);
    }

    const rate = checkRateLimit(`checkout:${user.id}`);
    if (!rate.allowed) {
      return errorResponse(429, 'Too many checkout attempts. Try again in a minute.', origin);
    }

    const parsed = parseJsonBody(event.body);
    if (!parsed.valid) return errorResponse(400, parsed.error, origin);

    const { priceId, interval, successPath, cancelPath, couponId, promotionCode } = parsed.data;
    if (!priceId || typeof priceId !== 'string') {
      return errorResponse(400, 'priceId is required', origin);
    }
    if (interval !== 'monthly' && interval !== 'annual') {
      return errorResponse(400, "interval must be 'monthly' or 'annual'", origin);
    }

    // Validate the priceId is one we recognise — stops callers from attaching
    // an arbitrary external price to a subscription.
    const planResolution = resolvePlanFromPriceId(priceId);
    if (!planResolution) {
      return errorResponse(400, 'Unknown priceId', origin);
    }
    if (planResolution.interval !== interval) {
      return errorResponse(400, 'priceId and interval do not match', origin);
    }

    const org = await getOrganization(organizationId);
    const stripe = getStripe();
    const supabase = getSupabase();

    // Reuse customer if we already have one, otherwise create.
    let customerId = org.billing?.customerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: {
          organization_id: organizationId,
          created_by_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Persist immediately so a retry doesn't create a duplicate.
      const nextBilling = {
        ...(org.billing || {}),
        customerId,
        billingEmail: user.email || org.billing?.billingEmail || null,
      };
      await supabase
        .from('organizations')
        .update({ billing: nextBilling, updated_at: new Date().toISOString() })
        .eq('id', organizationId);
    }

    // Trial eligibility: first-time paid for THIS org, plan is trial-eligible,
    // and user hasn't already consumed a trial in another org.
    let trialEligible =
      !org.billing?.subscriptionId && PLANS_WITH_TRIAL.has(planResolution.plan);

    if (trialEligible) {
      const { data: flag } = await supabase
        .from('user_billing_flags')
        .select('trial_consumed')
        .eq('user_id', user.id)
        .maybeSingle();
      if (flag?.trial_consumed) {
        trialEligible = false;
      }
    }

    const appUrl =
      process.env.APP_URL ||
      process.env.URL ||
      process.env.DEPLOY_URL ||
      'http://localhost:5173';

    // Build discount parameters — prefer promotionCode (human-facing code) over
    // couponId (Stripe internal id) so both server-applied and user-entered
    // codes work.
    const discounts = [];
    if (typeof promotionCode === 'string' && promotionCode.trim()) {
      try {
        const matches = await stripe.promotionCodes.list({
          code: promotionCode.trim(),
          active: true,
          limit: 1,
        });
        if (matches.data[0]) {
          discounts.push({ promotion_code: matches.data[0].id });
        }
      } catch (err) {
        console.warn('promotionCode lookup failed:', err.message);
      }
    } else if (typeof couponId === 'string' && couponId.trim()) {
      discounts.push({ coupon: couponId.trim() });
    }

    const checkoutConfig = {
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto', name: 'auto' },
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      subscription_data: {
        trial_period_days: trialEligible ? TRIAL_DAYS : undefined,
        metadata: {
          organization_id: organizationId,
          created_by_user_id: user.id,
          plan: planResolution.plan,
          interval: planResolution.interval,
        },
      },
      success_url: `${appUrl}${successPath || '/settings/billing'}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}${cancelPath || '/settings/billing'}?checkout=cancel`,
      metadata: {
        organization_id: organizationId,
        created_by_user_id: user.id,
        plan: planResolution.plan,
        interval: planResolution.interval,
      },
    };

    // Stripe rejects `discounts` and `allow_promotion_codes` together — pick one.
    if (discounts.length > 0) {
      checkoutConfig.discounts = discounts;
    } else {
      checkoutConfig.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(checkoutConfig);

    return successResponse(
      { url: session.url, sessionId: session.id, trial: trialEligible ? TRIAL_DAYS : 0 },
      origin
    );
  } catch (err) {
    const status = err.statusCode || 500;
    const message = status >= 500 ? 'Internal server error' : err.message;
    if (status >= 500) console.error('stripe-create-checkout error:', err);
    return errorResponse(status, message, origin);
  }
};
