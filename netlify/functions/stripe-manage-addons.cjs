/**
 * stripe-manage-addons
 *
 * POST /.netlify/functions/stripe-manage-addons
 * Body: { action: 'add' | 'update' | 'remove', priceId: string, quantity?: number }
 * Auth: Supabase JWT.
 *
 * Allows owners/admins to add, update, or remove non-base subscription items
 * (extra seats, CSM, audit bundle, metered blocks) on an org's active Stripe
 * subscription. Prorates the change by default so mid-cycle add/remove is
 * reflected on the next invoice.
 *
 * This exists so users don't have to go to the Stripe Portal to buy seats or
 * add-ons; the BillingCard "Add seats" button wires into this.
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
  requireAuthedOrg,
  getOrganization,
  resolvePlanFromPriceId,
} = require('./utils/stripe.cjs');

// Allowlist of add-on price env vars — prevents callers from attaching
// arbitrary external prices as "add-ons".
const ALLOWED_ADDON_ENV = [
  'STRIPE_PRICE_SEAT_STARTER',
  'STRIPE_PRICE_SEAT_GROWTH',
  'STRIPE_PRICE_SEAT_SCALE',
  'STRIPE_PRICE_AI_POLICY_BLOCK_50',
  'STRIPE_PRICE_QUESTIONNAIRE_BLOCK_10',
  'STRIPE_PRICE_VENDOR_BLOCK_25',
  'STRIPE_PRICE_CSM_MONTHLY',
  'STRIPE_PRICE_AUDIT_BUNDLE',
];

function isAllowedAddonPrice(priceId) {
  return ALLOWED_ADDON_ENV.some((key) => process.env[key] === priceId);
}

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

    if (role !== 'owner' && role !== 'admin') {
      return errorResponse(403, 'Only owners or admins can change billing', origin);
    }

    const rate = checkRateLimit(`addons:${user.id}`);
    if (!rate.allowed) {
      return errorResponse(429, 'Too many requests', origin);
    }

    const parsed = parseJsonBody(event.body);
    if (!parsed.valid) return errorResponse(400, parsed.error, origin);

    const { action, priceId, quantity } = parsed.data;
    if (action !== 'add' && action !== 'update' && action !== 'remove') {
      return errorResponse(400, "action must be 'add', 'update', or 'remove'", origin);
    }
    if (!priceId || typeof priceId !== 'string') {
      return errorResponse(400, 'priceId is required', origin);
    }

    // Don't let callers attach a *base-plan* price via this endpoint —
    // that's what checkout is for.
    if (resolvePlanFromPriceId(priceId)) {
      return errorResponse(400, 'Use stripe-create-checkout for base-plan changes', origin);
    }
    if (!isAllowedAddonPrice(priceId)) {
      return errorResponse(400, 'Unknown add-on priceId', origin);
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? Math.floor(quantity) : 1;
    if (qty > 1000) {
      return errorResponse(400, 'quantity too large', origin);
    }

    const org = await getOrganization(organizationId);
    const subscriptionId = org.billing?.subscriptionId;
    if (!subscriptionId) {
      return errorResponse(
        400,
        'No active subscription. Subscribe to a paid plan first.',
        origin
      );
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price'],
    });

    const existing = subscription.items.data.find(
      (i) => i.price?.id === priceId
    );

    let result;
    if (action === 'add') {
      if (existing) {
        // Treat "add" on an existing item as "increase qty by the delta" for
        // quantity-based items (seats). Idempotency-friendly.
        const isMetered = existing.price?.recurring?.usage_type === 'metered';
        if (isMetered) {
          return errorResponse(
            400,
            'Metered items cannot be added directly; usage is reported automatically',
            origin
          );
        }
        const newQty = (existing.quantity || 0) + qty;
        result = await stripe.subscriptionItems.update(existing.id, {
          quantity: newQty,
          proration_behavior: 'create_prorations',
        });
      } else {
        result = await stripe.subscriptionItems.create({
          subscription: subscriptionId,
          price: priceId,
          quantity: qty,
          proration_behavior: 'create_prorations',
        });
      }
    } else if (action === 'update') {
      if (!existing) {
        return errorResponse(404, 'Item not found on subscription', origin);
      }
      result = await stripe.subscriptionItems.update(existing.id, {
        quantity: qty,
        proration_behavior: 'create_prorations',
      });
    } else {
      if (!existing) {
        return errorResponse(404, 'Item not found on subscription', origin);
      }
      result = await stripe.subscriptionItems.del(existing.id, {
        proration_behavior: 'create_prorations',
      });
    }

    return successResponse(
      { ok: true, subscriptionItemId: result.id, action },
      origin
    );
  } catch (err) {
    const status = err.statusCode || 500;
    const message = status >= 500 ? 'Internal server error' : err.message;
    if (status >= 500) console.error('stripe-manage-addons error:', err);
    return errorResponse(status, message, origin);
  }
};
