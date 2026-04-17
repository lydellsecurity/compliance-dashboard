/**
 * stripe-create-portal
 *
 * POST /.netlify/functions/stripe-create-portal
 * Body: { returnPath?: string }
 * Auth: Supabase JWT in Authorization header.
 *
 * Returns: { url: string } — Stripe Billing Portal URL where the customer can
 * update payment method, download invoices, change plan, or cancel.
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

    if (role !== 'owner' && role !== 'admin') {
      return errorResponse(403, 'Only owners or admins can manage billing', origin);
    }

    const rate = checkRateLimit(`portal:${user.id}`);
    if (!rate.allowed) {
      return errorResponse(429, 'Too many requests', origin);
    }

    const parsed = parseJsonBody(event.body || '{}');
    const returnPath = parsed.valid ? parsed.data.returnPath : undefined;

    const org = await getOrganization(organizationId);
    const customerId = org.billing?.customerId;
    if (!customerId) {
      return errorResponse(
        400,
        'No Stripe customer for this organization — subscribe to a paid plan first.',
        origin
      );
    }

    const appUrl =
      process.env.APP_URL ||
      process.env.URL ||
      process.env.DEPLOY_URL ||
      'http://localhost:5173';

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}${returnPath || '/settings/billing'}`,
    });

    return successResponse({ url: session.url }, origin);
  } catch (err) {
    const status = err.statusCode || 500;
    const message = status >= 500 ? 'Internal server error' : err.message;
    if (status >= 500) console.error('stripe-create-portal error:', err);
    return errorResponse(status, message, origin);
  }
};
