/**
 * stripe-list-invoices
 *
 * POST /.netlify/functions/stripe-list-invoices
 * Body: { limit?: number, startingAfter?: string }
 * Auth: Supabase JWT.
 *
 * Returns the org's Stripe invoice history so users can browse and download
 * invoices from inside the app instead of routing to the Stripe Portal.
 *
 * Each item includes the hosted invoice URL (for in-browser view/pay) and
 * the PDF URL (direct download). Both are Stripe-hosted and short-lived; the
 * app should render them as on-demand links rather than caching them.
 */

const {
  handleCorsPreflght,
  errorResponse,
  successResponse,
  parseJsonBody,
} = require('./utils/security.cjs');
const {
  getStripe,
  requireAuthedOrg,
  getOrganization,
} = require('./utils/stripe.cjs');

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;

  if (event.httpMethod === 'OPTIONS') return handleCorsPreflght(event);
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed', origin);
  }

  try {
    const { organizationId, role } = await requireAuthedOrg(
      event.headers.authorization || event.headers.Authorization
    );

    // Everyone in the org can read invoices — this is the same data Stripe
    // surfaces in the Portal. Owners/admins additionally get paid/unpaid
    // statuses, but that's the Stripe object shape, not a policy we enforce.
    if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
      return errorResponse(403, 'Not authorised', origin);
    }

    const parsed = parseJsonBody(event.body || '{}');
    const body = parsed.valid ? parsed.data : {};
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(body.limit) || DEFAULT_LIMIT)
    );
    const startingAfter =
      typeof body.startingAfter === 'string' && body.startingAfter
        ? body.startingAfter
        : undefined;

    const org = await getOrganization(organizationId);
    const customerId = org.billing?.customerId;
    if (!customerId) {
      return successResponse({ invoices: [], hasMore: false }, origin);
    }

    const list = await getStripe().invoices.list({
      customer: customerId,
      limit,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    const invoices = list.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status, // draft | open | paid | uncollectible | void
      amountDue: inv.amount_due,
      amountPaid: inv.amount_paid,
      amountRemaining: inv.amount_remaining,
      currency: inv.currency,
      created: new Date(inv.created * 1000).toISOString(),
      periodStart: inv.period_start
        ? new Date(inv.period_start * 1000).toISOString()
        : null,
      periodEnd: inv.period_end
        ? new Date(inv.period_end * 1000).toISOString()
        : null,
      dueDate: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
      hostedInvoiceUrl: inv.hosted_invoice_url || null,
      invoicePdf: inv.invoice_pdf || null,
    }));

    return successResponse(
      { invoices, hasMore: list.has_more },
      origin
    );
  } catch (err) {
    const status = err.statusCode || 500;
    const message = status >= 500 ? 'Internal server error' : err.message;
    if (status >= 500) console.error('stripe-list-invoices error:', err);
    return errorResponse(status, message, origin);
  }
};
