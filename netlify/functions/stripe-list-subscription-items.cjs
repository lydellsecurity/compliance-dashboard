/**
 * stripe-list-subscription-items
 *
 * POST /.netlify/functions/stripe-list-subscription-items
 * Auth: Supabase JWT.
 *
 * Lists the currently-attached subscription items (base plan + add-ons) for
 * the org, annotated with their metered/flat classification and current
 * quantity. Powers the "Add-ons" block on the billing card so users can see
 * what they're paying for today and the minus/plus controls to tweak.
 *
 * Price metadata conventions (set in Stripe dashboard when creating Prices):
 *   metadata.addon_kind = 'seat' | 'csm' | 'audit_bundle' | 'ai_policy_block' | ...
 *   metadata.display_name = 'Extra seat (Growth)' | 'Dedicated CSM' | ...
 *   metadata.meter = 'ai_policy' | 'questionnaire' | 'vendors' (for metered items)
 * Missing metadata is tolerated; the UI falls back to the price nickname.
 */

const {
  handleCorsPreflght,
  errorResponse,
  successResponse,
} = require('./utils/security.cjs');
const {
  getStripe,
  requireAuthedOrg,
  getOrganization,
  resolvePlanFromPriceId,
} = require('./utils/stripe.cjs');

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;

  if (event.httpMethod === 'OPTIONS') return handleCorsPreflght(event);
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return errorResponse(405, 'Method not allowed', origin);
  }

  try {
    const { organizationId } = await requireAuthedOrg(
      event.headers.authorization || event.headers.Authorization
    );

    const org = await getOrganization(organizationId);
    const subscriptionId = org.billing?.subscriptionId;
    if (!subscriptionId) {
      return successResponse({ items: [], hasSubscription: false }, origin);
    }

    const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price'],
    });

    const items = (subscription.items?.data || []).map((item) => {
      const price = item.price || {};
      const isBase = !!resolvePlanFromPriceId(price.id);
      const usageType = price.recurring?.usage_type || 'licensed';
      return {
        id: item.id,
        priceId: price.id,
        isBasePlan: isBase,
        metered: usageType === 'metered',
        quantity: item.quantity ?? null,
        unitAmount: price.unit_amount ?? null,
        currency: price.currency || 'usd',
        interval: price.recurring?.interval || null,
        nickname: price.nickname || null,
        displayName:
          (price.metadata && price.metadata.display_name) ||
          price.nickname ||
          null,
        addonKind: (price.metadata && price.metadata.addon_kind) || null,
        meter: (price.metadata && price.metadata.meter) || null,
      };
    });

    return successResponse(
      { items, hasSubscription: true, currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null },
      origin
    );
  } catch (err) {
    const status = err.statusCode || 500;
    const message = status >= 500 ? 'Internal server error' : err.message;
    if (status >= 500) console.error('stripe-list-subscription-items error:', err);
    return errorResponse(status, message, origin);
  }
};
