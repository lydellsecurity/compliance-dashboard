/**
 * stripe-create-checkout
 *
 * POST /.netlify/functions/stripe-create-checkout
 * Body: { priceId: string, interval: 'monthly'|'annual', successPath?: string, cancelPath?: string }
 * Auth: Supabase JWT in Authorization header.
 *
 * Returns: { url: string } — Stripe-hosted Checkout URL.
 *
 * Idempotency: creates or reuses a Stripe Customer per organization so that
 * switching plans repeatedly doesn't spawn duplicate customers.
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

    const { priceId, interval, successPath, cancelPath } = parsed.data;
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
      const nextBilling = { ...(org.billing || {}), customerId };
      await supabase
        .from('organizations')
        .update({ billing: nextBilling, updated_at: new Date().toISOString() })
        .eq('id', organizationId);
    }

    // Trial only for first-time paid subscribers on this org.
    const isFirstPaidSubscription = !org.billing?.subscriptionId;

    const appUrl =
      process.env.APP_URL ||
      process.env.URL ||
      process.env.DEPLOY_URL ||
      'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto', name: 'auto' },
      billing_address_collection: 'required',
      subscription_data: {
        trial_period_days: isFirstPaidSubscription ? TRIAL_DAYS : undefined,
        metadata: {
          organization_id: organizationId,
          plan: planResolution.plan,
          interval: planResolution.interval,
        },
      },
      success_url: `${appUrl}${successPath || '/settings/billing'}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}${cancelPath || '/settings/billing'}?checkout=cancel`,
      metadata: {
        organization_id: organizationId,
        plan: planResolution.plan,
        interval: planResolution.interval,
      },
    });

    return successResponse({ url: session.url, sessionId: session.id }, origin);
  } catch (err) {
    const status = err.statusCode || 500;
    const message = status >= 500 ? 'Internal server error' : err.message;
    if (status >= 500) console.error('stripe-create-checkout error:', err);
    return errorResponse(status, message, origin);
  }
};
