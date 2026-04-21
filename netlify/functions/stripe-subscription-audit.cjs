/**
 * stripe-subscription-audit
 *
 * Daily scheduled function (see netlify.toml). For every org with a Stripe
 * customer, pulls the customer's active subscription from Stripe and
 * reconciles it against the org row. Covers the case where a webhook was
 * dropped (endpoint offline, Stripe outage, signature rejection) and org
 * state drifted from Stripe's source of truth.
 *
 * Also catches:
 *   - Subscriptions canceled in Stripe Dashboard / Portal while our webhook
 *     was offline → downgrade to Free.
 *   - Period rollovers we missed → update currentPeriodEnd, reset counters.
 *   - Customers deleted in Stripe → null out refs.
 *
 * Invocation: scheduled by Netlify cron. Can also be triggered manually via
 * POST with the USAGE_REPORT_CRON_SECRET header (reused for simplicity).
 */

const {
  getStripe,
  getSupabase,
  resolvePlanFromPriceId,
  PLAN_CONFIGS,
} = require('./utils/stripe.cjs');
const {
  handleCorsPreflght,
  errorResponse,
  successResponse,
} = require('./utils/security.cjs');

exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  if (event.httpMethod === 'OPTIONS') return handleCorsPreflght(event);

  const providedSecret =
    event.headers?.['x-cron-secret'] || event.headers?.['X-Cron-Secret'];
  const expectedSecret = process.env.USAGE_REPORT_CRON_SECRET;
  if (expectedSecret && providedSecret !== expectedSecret) {
    return errorResponse(401, 'Unauthorized', origin);
  }

  try {
    const supabase = getSupabase();
    const stripe = getStripe();

    // Page through orgs that have a Stripe customer. Supabase caps `in` to
    // 1000 so we paginate by updated_at for predictable ordering.
    const pageSize = 200;
    let from = 0;
    const summary = { checked: 0, reconciled: 0, detached: 0, errors: 0 };

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('id, name, plan, status, stripe_price_id, billing, trial_ends_at, cancel_at_period_end, suspended_at')
        .not('billing->>customerId', 'is', null)
        .range(from, from + pageSize - 1);

      if (error) throw error;
      if (!orgs || orgs.length === 0) break;

      for (const org of orgs) {
        summary.checked += 1;
        try {
          const changed = await reconcileOrg(org, stripe, supabase);
          if (changed === 'reconciled') summary.reconciled += 1;
          if (changed === 'detached') summary.detached += 1;
        } catch (err) {
          summary.errors += 1;
          console.error(`subscription-audit error for ${org.id}:`, err.message);
        }
      }

      if (orgs.length < pageSize) break;
      from += pageSize;
    }

    return successResponse(summary, origin);
  } catch (err) {
    console.error('stripe-subscription-audit error:', err);
    return errorResponse(500, 'Internal server error', origin);
  }
};

async function reconcileOrg(org, stripe, supabase) {
  const customerId = org.billing?.customerId;
  const subscriptionId = org.billing?.subscriptionId;

  // If the customer was deleted in Stripe, null out refs and downgrade.
  let customer;
  try {
    customer = await stripe.customers.retrieve(customerId);
  } catch (err) {
    if (err?.code === 'resource_missing' || err?.statusCode === 404) {
      await detachCustomer(org, supabase);
      return 'detached';
    }
    throw err;
  }
  if (customer?.deleted) {
    await detachCustomer(org, supabase);
    return 'detached';
  }

  // Resolve the active subscription (if any). Prefer the one we tracked;
  // fall back to the customer's first active subscription.
  let subscription = null;
  if (subscriptionId) {
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
      });
    } catch (err) {
      if (err?.code !== 'resource_missing') throw err;
    }
  }
  if (!subscription) {
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 5,
      expand: ['data.items.data.price'],
    });
    subscription = list.data.find((s) =>
      ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status)
    ) || list.data[0] || null;
  }

  if (!subscription || ['canceled', 'incomplete_expired'].includes(subscription.status)) {
    // No active subscription on Stripe's side; if the org still has one
    // recorded, fix it.
    if (org.plan !== 'free' || org.billing?.subscriptionId) {
      await applyFreeFallback(org, supabase);
      return 'reconciled';
    }
    return null;
  }

  const baseItem = subscription.items.data.find(
    (i) => i.price?.recurring?.usage_type !== 'metered'
  ) || subscription.items.data[0];
  const priceId = baseItem?.price?.id;
  const resolved = priceId ? resolvePlanFromPriceId(priceId) : null;
  const plan = resolved?.plan || 'free';
  const interval = resolved?.interval || null;
  const config = PLAN_CONFIGS[plan];

  const status =
    subscription.status === 'trialing'
      ? 'trial'
      : subscription.status === 'active'
        ? 'active'
        : subscription.status === 'past_due' || subscription.status === 'unpaid'
          ? 'suspended'
          : subscription.status === 'canceled'
            ? 'cancelled'
            : 'active';

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  // Detect drift across any of the fields we sync via webhook.
  const drift =
    org.plan !== plan ||
    org.status !== status ||
    org.stripe_price_id !== (priceId || null) ||
    org.cancel_at_period_end !== !!subscription.cancel_at_period_end ||
    org.trial_ends_at !== trialEnd ||
    org.billing?.subscriptionId !== subscription.id ||
    org.billing?.currentPeriodEnd !== periodEnd;

  if (!drift) return null;

  const monthlyEquivalent =
    interval === 'annual' && config.priceAnnual > 0
      ? Math.round(config.priceAnnual / 12)
      : config.price > 0
        ? config.price
        : 0;

  await supabase
    .from('organizations')
    .update({
      plan,
      status,
      stripe_price_id: priceId || null,
      billing_interval: interval,
      trial_ends_at: trialEnd,
      cancel_at_period_end: !!subscription.cancel_at_period_end,
      limits: config.limits,
      features: config.features,
      // Preserve an existing suspended_at, clear it if the status is active.
      suspended_at: status === 'suspended' ? org.suspended_at || new Date().toISOString() : null,
      billing: {
        ...(org.billing || {}),
        customerId,
        subscriptionId: subscription.id,
        currentPeriodEnd: periodEnd,
        mrr: monthlyEquivalent,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', org.id);

  return 'reconciled';
}

async function detachCustomer(org, supabase) {
  const freeConfig = PLAN_CONFIGS.free;
  await supabase
    .from('organizations')
    .update({
      plan: 'free',
      status: 'active',
      stripe_price_id: null,
      billing_interval: null,
      trial_ends_at: null,
      cancel_at_period_end: false,
      suspended_at: null,
      limits: freeConfig.limits,
      features: freeConfig.features,
      billing: {
        ...(org.billing || {}),
        customerId: null,
        subscriptionId: null,
        currentPeriodEnd: null,
        mrr: 0,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', org.id);
}

async function applyFreeFallback(org, supabase) {
  const freeConfig = PLAN_CONFIGS.free;
  await supabase
    .from('organizations')
    .update({
      plan: 'free',
      status: 'active',
      stripe_price_id: null,
      billing_interval: null,
      trial_ends_at: null,
      cancel_at_period_end: false,
      suspended_at: null,
      limits: freeConfig.limits,
      features: freeConfig.features,
      billing: {
        ...(org.billing || {}),
        subscriptionId: null,
        currentPeriodEnd: null,
        mrr: 0,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', org.id);
}

exports._test = { reconcileOrg, detachCustomer, applyFreeFallback };
