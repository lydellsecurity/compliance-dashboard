/**
 * stripe-webhook
 *
 * POST /.netlify/functions/stripe-webhook
 * Body: raw Stripe event payload (NOT JSON-parsed — signature verification
 *       requires the exact raw bytes).
 * Auth: Stripe-Signature header, verified against STRIPE_WEBHOOK_SECRET.
 *
 * Handles the subset of events from docs/MONETIZATION_PLAN.md §7.4 that drive
 * the tenant's plan state. Idempotent via the `billing_events` table: an event
 * whose id has already been processed is acked with 200 and skipped.
 *
 * IMPORTANT: in netlify.toml, route `/.netlify/functions/stripe-webhook` so
 * Netlify does not strip or alter the request body. We parse `event.body`
 * exactly as-is (base64-decoded if Netlify flagged it so).
 */

const {
  getStripe,
  getSupabase,
  resolvePlanFromPriceId,
  PLAN_CONFIGS,
} = require('./utils/stripe.cjs');

// ============================================================================
// ENTRYPOINT
// ============================================================================

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return { statusCode: 400, body: 'Missing signature or webhook secret' };
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const supabase = getSupabase();

  // Idempotency check — if we've already processed this event id, ack and exit.
  const { data: existing } = await supabase
    .from('billing_events')
    .select('id')
    .eq('stripe_event_id', stripeEvent.id)
    .maybeSingle();

  if (existing) {
    return { statusCode: 200, body: JSON.stringify({ received: true, duplicate: true }) };
  }

  try {
    const orgId = await dispatch(stripeEvent, supabase);

    // Record that we processed this event (dedup + audit trail).
    await supabase.from('billing_events').insert({
      organization_id: orgId,
      stripe_event_id: stripeEvent.id,
      type: stripeEvent.type,
      payload: stripeEvent,
    });

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error(`Webhook handler error for ${stripeEvent.type}:`, err);
    // Returning 500 causes Stripe to retry with exponential backoff.
    return { statusCode: 500, body: 'Webhook handler failed' };
  }
};

// ============================================================================
// DISPATCH
// ============================================================================

async function dispatch(stripeEvent, supabase) {
  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      return handleCheckoutCompleted(stripeEvent.data.object, supabase);

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      return handleSubscriptionUpsert(stripeEvent.data.object, supabase);

    case 'customer.subscription.deleted':
      return handleSubscriptionDeleted(stripeEvent.data.object, supabase);

    case 'invoice.payment_succeeded':
      return handleInvoicePaid(stripeEvent.data.object, supabase);

    case 'invoice.payment_failed':
      return handleInvoiceFailed(stripeEvent.data.object, supabase);

    case 'customer.subscription.trial_will_end':
      return handleTrialEnding(stripeEvent.data.object, supabase);

    default:
      // Known but unhandled event — record it but take no action.
      return resolveOrgFromObject(stripeEvent.data.object, supabase);
  }
}

// ============================================================================
// HANDLERS
// ============================================================================

async function handleCheckoutCompleted(session, supabase) {
  const organizationId = session.metadata?.organization_id;
  if (!organizationId) {
    console.warn('checkout.session.completed with no organization_id metadata');
    return null;
  }

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id;

  if (!subscriptionId) return organizationId;

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });

  await applySubscriptionState(organizationId, subscription, customerId, supabase);
  return organizationId;
}

async function handleSubscriptionUpsert(subscription, supabase) {
  const organizationId = subscription.metadata?.organization_id
    || (await resolveOrgFromCustomerId(subscription.customer, supabase));

  if (!organizationId) {
    console.warn('subscription event with no org linkage:', subscription.id);
    return null;
  }

  await applySubscriptionState(organizationId, subscription, subscription.customer, supabase);
  return organizationId;
}

async function handleSubscriptionDeleted(subscription, supabase) {
  const organizationId = subscription.metadata?.organization_id
    || (await resolveOrgFromCustomerId(subscription.customer, supabase));

  if (!organizationId) return null;

  // Downgrade to Free. Data is retained; enforcement kicks in after the 90-day
  // grace period described in docs/MONETIZATION_PLAN.md §5.5.
  const freeConfig = PLAN_CONFIGS.free;
  const { data: org } = await supabase
    .from('organizations')
    .select('billing')
    .eq('id', organizationId)
    .single();

  await supabase
    .from('organizations')
    .update({
      plan: 'free',
      status: 'active',
      stripe_price_id: null,
      billing_interval: null,
      cancel_at_period_end: false,
      limits: freeConfig.limits,
      features: freeConfig.features,
      billing: {
        ...(org?.billing || {}),
        subscriptionId: null,
        currentPeriodEnd: null,
        mrr: 0,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);

  return organizationId;
}

async function handleInvoicePaid(invoice, supabase) {
  const organizationId = await resolveOrgFromCustomerId(invoice.customer, supabase);
  if (!organizationId) return null;

  // Reset the monthly api-call counter for the new period. Metered usage
  // meters are reset implicitly by the next period_start rollover.
  const { data: org } = await supabase
    .from('organizations')
    .select('usage, status')
    .eq('id', organizationId)
    .single();

  const update = {
    usage: org?.usage ? { ...org.usage, apiCallsThisMonth: 0 } : undefined,
    updated_at: new Date().toISOString(),
    // Clear dunning state — payment landed, tenant is healthy again.
    suspended_at: null,
    ...(org?.status === 'suspended' ? { status: 'active' } : {}),
  };

  await supabase
    .from('organizations')
    .update(update)
    .eq('id', organizationId);

  return organizationId;
}

async function handleInvoiceFailed(invoice, supabase) {
  const organizationId = await resolveOrgFromCustomerId(invoice.customer, supabase);
  if (!organizationId) return null;

  // Mark the tenant as suspended-in-dunning and record when it started.
  // `suspended_at` is set *only* on the first payment failure — Stripe Smart
  // Retries will fire additional `invoice.payment_failed` events during the
  // retry window, and we want to measure days from the *first* failure, not
  // the last one.
  const { data: existing } = await supabase
    .from('organizations')
    .select('suspended_at')
    .eq('id', organizationId)
    .single();

  await supabase
    .from('organizations')
    .update({
      status: 'suspended',
      suspended_at: existing?.suspended_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);

  return organizationId;
}

async function handleTrialEnding(subscription, supabase) {
  // Hook point for emailing the owner. The email service lives elsewhere —
  // we just log the event and let a separate notifier pick it up.
  return subscription.metadata?.organization_id
    || (await resolveOrgFromCustomerId(subscription.customer, supabase));
}

// ============================================================================
// SHARED STATE APPLICATION
// ============================================================================

async function applySubscriptionState(organizationId, subscription, customerId, supabase) {
  // Find the base-plan line item. Metered add-on items have `price.recurring.usage_type = 'metered'`.
  const baseItem = subscription.items.data.find(
    (i) => i.price?.recurring?.usage_type !== 'metered'
  ) || subscription.items.data[0];

  const priceId = baseItem?.price?.id;
  const resolved = priceId ? resolvePlanFromPriceId(priceId) : null;
  const plan = resolved?.plan || 'free';
  const interval = resolved?.interval || null;
  const config = PLAN_CONFIGS[plan];

  const { data: org } = await supabase
    .from('organizations')
    .select('billing')
    .eq('id', organizationId)
    .single();

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
      billing: {
        ...(org?.billing || {}),
        customerId: customerId || org?.billing?.customerId || null,
        subscriptionId: subscription.id,
        currentPeriodEnd: periodEnd,
        mrr: monthlyEquivalent,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);
}

// ============================================================================
// HELPERS
// ============================================================================

async function resolveOrgFromCustomerId(customerId, supabase) {
  if (!customerId) return null;
  const id = typeof customerId === 'string' ? customerId : customerId.id;
  const { data } = await supabase
    .from('organizations')
    .select('id')
    .eq('billing->>customerId', id)
    .maybeSingle();
  return data?.id || null;
}

async function resolveOrgFromObject(obj, supabase) {
  if (obj?.metadata?.organization_id) return obj.metadata.organization_id;
  if (obj?.customer) return resolveOrgFromCustomerId(obj.customer, supabase);
  return null;
}
