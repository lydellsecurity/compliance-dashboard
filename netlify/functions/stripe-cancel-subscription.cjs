/**
 * stripe-cancel-subscription
 *
 * POST /.netlify/functions/stripe-cancel-subscription
 * Body: { immediate?: boolean, reason?: string }
 * Auth: Supabase JWT.
 *
 * Owner-only. Cancels the org's Stripe subscription either immediately or at
 * the end of the current billing period. Used by:
 *   1. The billing UI "Cancel subscription" action.
 *   2. The GDPR / org-delete workflow in the app — before deleting the
 *      organization record, the client calls this with `immediate=true` so we
 *      stop billing the customer even if the webhook misses the subsequent
 *      org deletion.
 *
 * Returns: { subscriptionId, status, cancelAt, canceledAt }
 *
 * The webhook's `customer.subscription.deleted` / `.updated` event will flip
 * the org back to Free and clear the subscriptionId — this endpoint doesn't
 * attempt to do both synchronously. Cancellation is the source of truth;
 * state application follows via webhook.
 */

const {
  handleCorsPreflght,
  errorResponse,
  successResponse,
  parseJsonBody,
  sanitizeString,
  checkRateLimit,
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
    const { user, organizationId, role } = await requireAuthedOrg(
      event.headers.authorization || event.headers.Authorization
    );

    // Only an owner can cancel — admins can change plans but cancellation is
    // destructive for the whole org.
    if (role !== 'owner') {
      return errorResponse(403, 'Only the organization owner can cancel the subscription', origin);
    }

    const rate = checkRateLimit(`cancel:${user.id}`);
    if (!rate.allowed) {
      return errorResponse(429, 'Too many requests', origin);
    }

    const parsed = parseJsonBody(event.body || '{}');
    const immediate = !!(parsed.valid && parsed.data.immediate);
    const reason =
      parsed.valid && typeof parsed.data.reason === 'string'
        ? sanitizeString(parsed.data.reason, 500)
        : undefined;

    const org = await getOrganization(organizationId);
    const subscriptionId = org.billing?.subscriptionId;
    if (!subscriptionId) {
      return errorResponse(400, 'No active subscription to cancel', origin);
    }

    const stripe = getStripe();
    let subscription;
    if (immediate) {
      subscription = await stripe.subscriptions.cancel(subscriptionId, {
        prorate: true,
        invoice_now: false,
        ...(reason ? { cancellation_details: { comment: reason } } : {}),
      });
    } else {
      subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
        ...(reason ? { cancellation_details: { comment: reason } } : {}),
      });
    }

    return successResponse(
      {
        subscriptionId: subscription.id,
        status: subscription.status,
        cancelAt: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : null,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
      },
      origin
    );
  } catch (err) {
    const status = err.statusCode || 500;
    const message = status >= 500 ? 'Internal server error' : err.message;
    if (status >= 500) console.error('stripe-cancel-subscription error:', err);
    return errorResponse(status, message, origin);
  }
};
