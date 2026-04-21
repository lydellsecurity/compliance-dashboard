/**
 * stripe-validate-coupon
 *
 * POST /.netlify/functions/stripe-validate-coupon
 * Body: { code: string, priceId?: string }
 * Auth: Supabase JWT.
 *
 * Looks up a Stripe Promotion Code (the human-facing code like "LAUNCH20") and
 * returns whether it's currently redeemable, plus a preview of what the user
 * will see on checkout (percent/amount off, duration). Used by the UpgradeGate
 * coupon input to validate before redirecting to Checkout.
 *
 * We lean on promotion_codes rather than raw coupons so the UX is code-
 * oriented (what the user types) and redemption rules (first-time customers,
 * expires_at, max_redemptions) are respected.
 */

const {
  handleCorsPreflght,
  errorResponse,
  successResponse,
  parseJsonBody,
  checkRateLimit,
  sanitizeString,
} = require('./utils/security.cjs');
const {
  getStripe,
  requireAuthedOrg,
  getOrganization,
} = require('./utils/stripe.cjs');

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;

  if (event.httpMethod === 'OPTIONS') return handleCorsPreflght(event);
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed', origin);
  }

  try {
    const { user, organizationId } = await requireAuthedOrg(
      event.headers.authorization || event.headers.Authorization
    );

    const rate = checkRateLimit(`coupon:${user.id}`);
    if (!rate.allowed) {
      return errorResponse(429, 'Too many requests', origin);
    }

    const parsed = parseJsonBody(event.body);
    if (!parsed.valid) return errorResponse(400, parsed.error, origin);

    const rawCode = parsed.data.code;
    if (!rawCode || typeof rawCode !== 'string') {
      return errorResponse(400, 'code is required', origin);
    }
    const code = sanitizeString(rawCode, 64).trim();
    if (!code) return errorResponse(400, 'code is required', origin);

    const stripe = getStripe();

    const list = await stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
    });
    const promo = list.data[0];
    if (!promo) {
      return successResponse(
        { valid: false, reason: 'not_found', message: 'This promo code is not valid.' },
        origin
      );
    }

    if (promo.expires_at && promo.expires_at * 1000 < Date.now()) {
      return successResponse(
        { valid: false, reason: 'expired', message: 'This promo code has expired.' },
        origin
      );
    }
    if (
      typeof promo.max_redemptions === 'number' &&
      promo.times_redeemed >= promo.max_redemptions
    ) {
      return successResponse(
        { valid: false, reason: 'exhausted', message: 'This promo code is fully redeemed.' },
        origin
      );
    }

    // First-time-customer restriction — blocked if this org's Stripe customer
    // already has invoice history.
    if (promo.restrictions?.first_time_transaction) {
      const org = await getOrganization(organizationId);
      const customerId = org.billing?.customerId;
      if (customerId) {
        try {
          const invoices = await stripe.invoices.list({
            customer: customerId,
            limit: 1,
            status: 'paid',
          });
          if (invoices.data.length > 0) {
            return successResponse(
              {
                valid: false,
                reason: 'first_time_only',
                message: 'This promo code is for new customers only.',
              },
              origin
            );
          }
        } catch (err) {
          console.warn('first-time check failed; allowing:', err.message);
        }
      }
    }

    const coupon = promo.coupon || {};
    return successResponse(
      {
        valid: true,
        code: promo.code,
        promotionCodeId: promo.id,
        percentOff: coupon.percent_off || null,
        amountOff: coupon.amount_off || null,
        currency: coupon.currency || null,
        duration: coupon.duration || null,
        durationInMonths: coupon.duration_in_months || null,
        name: coupon.name || null,
      },
      origin
    );
  } catch (err) {
    const status = err.statusCode || 500;
    const message = status >= 500 ? 'Internal server error' : err.message;
    if (status >= 500) console.error('stripe-validate-coupon error:', err);
    return errorResponse(status, message, origin);
  }
};
