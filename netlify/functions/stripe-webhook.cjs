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
const email = require('./utils/email.cjs');

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

    case 'invoice.upcoming':
      return handleInvoiceUpcoming(stripeEvent.data.object, supabase);

    case 'customer.subscription.trial_will_end':
      return handleTrialEnding(stripeEvent.data.object, supabase);

    case 'charge.refunded':
      return handleChargeRefunded(stripeEvent.data.object, supabase);

    case 'charge.dispute.created':
      return handleDisputeCreated(stripeEvent.data.object, supabase);

    case 'customer.updated':
      return handleCustomerUpdated(stripeEvent.data.object, supabase);

    case 'customer.deleted':
      return handleCustomerDeleted(stripeEvent.data.object, supabase);

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

  // Flag the user (not just the org) as having consumed a trial so that a
  // second org they spin up can't claim another trial. See
  // `user_trial_consumed` migration.
  const userId = session.metadata?.created_by_user_id;
  if (userId) {
    await supabase
      .from('user_billing_flags')
      .upsert({ user_id: userId, trial_consumed: true }, { onConflict: 'user_id' });
  }

  // Capture billing email + address from the session into org.billing so we
  // have a non-Stripe record for emailing/audit.
  const billingDetails = {
    billingEmail: session.customer_details?.email || session.customer_email || null,
    billingAddress: session.customer_details?.address
      ? {
          line1: session.customer_details.address.line1 || '',
          line2: session.customer_details.address.line2 || undefined,
          city: session.customer_details.address.city || '',
          state: session.customer_details.address.state || '',
          postalCode: session.customer_details.address.postal_code || '',
          country: session.customer_details.address.country || '',
        }
      : null,
  };

  if (!subscriptionId) {
    await mergeOrgBilling(organizationId, billingDetails, supabase);
    return organizationId;
  }

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });

  await applySubscriptionState(
    organizationId,
    subscription,
    customerId,
    supabase,
    billingDetails
  );
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
    .select('billing, name')
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

  // Notify — downgrade is surprising even when self-initiated via Portal.
  const freshOrg = { id: organizationId, name: org?.name || 'your organization', billing: org?.billing };
  const recipients = await email.getBillingRecipients(supabase, freshOrg);
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const tpl = email.templates.subscriptionCanceled({
    orgName: freshOrg.name,
    periodEnd,
  });
  await email.send({ to: recipients, ...tpl });

  return organizationId;
}

async function handleInvoicePaid(invoice, supabase) {
  const organizationId = await resolveOrgFromCustomerId(invoice.customer, supabase);
  if (!organizationId) return null;

  // Reset the monthly api-call counter for the new period. Metered usage
  // meters are reset implicitly by the next period_start rollover.
  const { data: org } = await supabase
    .from('organizations')
    .select('usage, status, suspended_at, name, billing')
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

  // If we were in dunning, this is a "payment recovered" moment — tell the user.
  if (org?.suspended_at) {
    const recipients = await email.getBillingRecipients(supabase, {
      id: organizationId,
      billing: org.billing,
    });
    const tpl = email.templates.paymentRecovered({
      orgName: org.name,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      periodEnd: invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : null,
    });
    await email.send({ to: recipients, ...tpl });
  }

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
    .select('suspended_at, name, billing')
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

  const recipients = await email.getBillingRecipients(supabase, {
    id: organizationId,
    billing: existing?.billing,
  });
  const tpl = email.templates.paymentFailed({
    orgName: existing?.name || 'your organization',
    amount: invoice.amount_due,
    currency: invoice.currency,
    invoiceUrl: invoice.hosted_invoice_url,
    attemptCount: invoice.attempt_count,
    nextRetryAt: invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000).toISOString()
      : null,
  });
  await email.send({ to: recipients, ...tpl });

  return organizationId;
}

async function handleInvoiceUpcoming(invoice, supabase) {
  const organizationId = await resolveOrgFromCustomerId(invoice.customer, supabase);
  if (!organizationId) return null;

  const { data: org } = await supabase
    .from('organizations')
    .select('name, plan, billing')
    .eq('id', organizationId)
    .single();

  const recipients = await email.getBillingRecipients(supabase, {
    id: organizationId,
    billing: org?.billing,
  });
  const tpl = email.templates.invoiceUpcoming({
    orgName: org?.name || 'your organization',
    planName: org?.plan ? org.plan[0].toUpperCase() + org.plan.slice(1) : 'subscription',
    amount: invoice.amount_due,
    currency: invoice.currency,
    periodEnd: invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString()
      : null,
    invoiceUrl: invoice.hosted_invoice_url,
  });
  await email.send({ to: recipients, ...tpl });

  return organizationId;
}

async function handleTrialEnding(subscription, supabase) {
  const organizationId = subscription.metadata?.organization_id
    || (await resolveOrgFromCustomerId(subscription.customer, supabase));
  if (!organizationId) return null;

  const { data: org } = await supabase
    .from('organizations')
    .select('name, plan, billing, trial_ends_at')
    .eq('id', organizationId)
    .single();

  const recipients = await email.getBillingRecipients(supabase, {
    id: organizationId,
    billing: org?.billing,
  });
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : org?.trial_ends_at;
  const tpl = email.templates.trialEnding({
    orgName: org?.name || 'your organization',
    trialEndsAt: trialEnd,
    planName: org?.plan ? org.plan[0].toUpperCase() + org.plan.slice(1) : 'your plan',
  });
  await email.send({ to: recipients, ...tpl });

  return organizationId;
}

async function handleChargeRefunded(charge, supabase) {
  const organizationId = await resolveOrgFromCustomerId(charge.customer, supabase);
  if (!organizationId) return null;

  const { data: org } = await supabase
    .from('organizations')
    .select('billing, name')
    .eq('id', organizationId)
    .single();

  // Stripe sets `amount_refunded` on the Charge (includes all refunds so far).
  // We record the latest refund line so the billing card can show "Refunded $X on Y".
  const latest = (charge.refunds?.data || []).slice(-1)[0] || null;
  const refundEntry = {
    amount: charge.amount_refunded,
    currency: charge.currency,
    reason: latest?.reason || null,
    refundedAt: new Date((latest?.created ?? charge.created) * 1000).toISOString(),
    chargeId: charge.id,
  };

  await supabase
    .from('organizations')
    .update({
      billing: {
        ...(org?.billing || {}),
        lastRefund: refundEntry,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);

  const recipients = await email.getBillingRecipients(supabase, {
    id: organizationId,
    billing: org?.billing,
  });
  const tpl = email.templates.refund({
    orgName: org?.name || 'your organization',
    amount: charge.amount_refunded,
    currency: charge.currency,
    reason: refundEntry.reason,
  });
  await email.send({ to: recipients, ...tpl });

  return organizationId;
}

async function handleDisputeCreated(dispute, supabase) {
  const organizationId = await resolveOrgFromCustomerId(
    dispute.charge && typeof dispute.charge === 'object' ? dispute.charge.customer : null,
    supabase
  );
  // Dispute objects don't always include customer at the top level — fall
  // back to retrieving the charge if needed.
  let orgId = organizationId;
  if (!orgId && dispute.charge) {
    try {
      const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;
      const charge = await getStripe().charges.retrieve(chargeId);
      orgId = await resolveOrgFromCustomerId(charge.customer, supabase);
    } catch (err) {
      console.error('dispute: charge lookup failed:', err);
    }
  }
  if (!orgId) return null;

  const { data: org } = await supabase
    .from('organizations')
    .select('billing, name')
    .eq('id', orgId)
    .single();

  await supabase
    .from('organizations')
    .update({
      billing: {
        ...(org?.billing || {}),
        activeDispute: {
          id: dispute.id,
          amount: dispute.amount,
          currency: dispute.currency,
          reason: dispute.reason,
          status: dispute.status,
          createdAt: new Date(dispute.created * 1000).toISOString(),
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId);

  const recipients = await email.getBillingRecipients(supabase, {
    id: orgId,
    billing: org?.billing,
  });
  const tpl = email.templates.disputeCreated({
    orgName: org?.name || 'your organization',
    amount: dispute.amount,
    currency: dispute.currency,
    reason: dispute.reason,
  });
  await email.send({ to: recipients, ...tpl });

  return orgId;
}

async function handleCustomerUpdated(customer, supabase) {
  const organizationId = await resolveOrgFromCustomerId(customer.id, supabase);
  if (!organizationId) return null;

  const { data: org } = await supabase
    .from('organizations')
    .select('billing')
    .eq('id', organizationId)
    .single();

  const billingAddress = customer.address
    ? {
        line1: customer.address.line1 || '',
        line2: customer.address.line2 || undefined,
        city: customer.address.city || '',
        state: customer.address.state || '',
        postalCode: customer.address.postal_code || '',
        country: customer.address.country || '',
      }
    : org?.billing?.billingAddress || null;

  await supabase
    .from('organizations')
    .update({
      billing: {
        ...(org?.billing || {}),
        billingEmail: customer.email || org?.billing?.billingEmail || null,
        billingAddress,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);

  return organizationId;
}

async function handleCustomerDeleted(customer, supabase) {
  const organizationId = await resolveOrgFromCustomerId(customer.id, supabase);
  if (!organizationId) return null;

  // The Stripe customer was removed (typically by Stripe admin action). Null
  // out the refs on the org so future portal/checkout calls re-create cleanly.
  const freeConfig = PLAN_CONFIGS.free;
  const { data: org } = await supabase
    .from('organizations')
    .select('billing, name')
    .eq('id', organizationId)
    .single();

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
        ...(org?.billing || {}),
        customerId: null,
        subscriptionId: null,
        currentPeriodEnd: null,
        mrr: 0,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);

  const recipients = await email.getBillingRecipients(supabase, {
    id: organizationId,
    billing: org?.billing,
  });
  const tpl = email.templates.subscriptionCanceled({
    orgName: org?.name || 'your organization',
    periodEnd: null,
  });
  await email.send({ to: recipients, ...tpl });

  return organizationId;
}

// ============================================================================
// SHARED STATE APPLICATION
// ============================================================================

async function applySubscriptionState(
  organizationId,
  subscription,
  customerId,
  supabase,
  extraBilling
) {
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
        ...(extraBilling || {}),
        customerId: customerId || org?.billing?.customerId || null,
        subscriptionId: subscription.id,
        currentPeriodEnd: periodEnd,
        mrr: monthlyEquivalent,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);
}

async function mergeOrgBilling(organizationId, extraBilling, supabase) {
  if (!extraBilling) return;
  const { data: org } = await supabase
    .from('organizations')
    .select('billing')
    .eq('id', organizationId)
    .single();
  await supabase
    .from('organizations')
    .update({
      billing: { ...(org?.billing || {}), ...extraBilling },
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

// ============================================================================
// TEST EXPORTS
// ============================================================================
// Internals exposed for unit tests. These let test files drive the dispatch
// handlers against a mock Supabase without going through signature
// verification (Stripe's webhooks.constructEvent can't be sensibly mocked
// from CommonJS callers under Vitest).

exports._test = {
  dispatch,
  handleCheckoutCompleted,
  handleSubscriptionUpsert,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoiceFailed,
  handleInvoiceUpcoming,
  handleTrialEnding,
  handleChargeRefunded,
  handleDisputeCreated,
  handleCustomerUpdated,
  handleCustomerDeleted,
};
