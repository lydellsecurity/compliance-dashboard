/**
 * stripe-upcoming-invoice
 *
 * POST /.netlify/functions/stripe-upcoming-invoice
 * Auth: Supabase JWT.
 *
 * Returns the forecasted next invoice for the org so the BillingCard can
 * show "Next invoice: $X on {date}" — includes any metered usage and add-on
 * proration Stripe currently has on the books.
 *
 * The forecast can shift if usage accrues or the subscription changes before
 * the period ends. This is a best-estimate, not a guarantee.
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
    const customerId = org.billing?.customerId;
    const subscriptionId = org.billing?.subscriptionId;

    if (!customerId || !subscriptionId) {
      return successResponse({ hasUpcoming: false }, origin);
    }

    let upcoming;
    try {
      upcoming = await getStripe().invoices.retrieveUpcoming({
        customer: customerId,
        subscription: subscriptionId,
      });
    } catch (err) {
      // Stripe returns 404 when there's no upcoming invoice (e.g. sub is
      // canceled at period end with nothing to bill after).
      if (err?.code === 'invoice_upcoming_none' || err?.statusCode === 404) {
        return successResponse({ hasUpcoming: false }, origin);
      }
      throw err;
    }

    const lineItems = (upcoming.lines?.data || []).map((line) => ({
      id: line.id,
      description: line.description,
      amount: line.amount,
      quantity: line.quantity,
      proration: !!line.proration,
      period: line.period
        ? {
            start: line.period.start
              ? new Date(line.period.start * 1000).toISOString()
              : null,
            end: line.period.end
              ? new Date(line.period.end * 1000).toISOString()
              : null,
          }
        : null,
    }));

    return successResponse(
      {
        hasUpcoming: true,
        amountDue: upcoming.amount_due,
        currency: upcoming.currency,
        periodStart: upcoming.period_start
          ? new Date(upcoming.period_start * 1000).toISOString()
          : null,
        periodEnd: upcoming.period_end
          ? new Date(upcoming.period_end * 1000).toISOString()
          : null,
        subtotal: upcoming.subtotal,
        tax: upcoming.tax,
        total: upcoming.total,
        lines: lineItems,
      },
      origin
    );
  } catch (err) {
    const status = err.statusCode || 500;
    const message = status >= 500 ? 'Internal server error' : err.message;
    if (status >= 500) console.error('stripe-upcoming-invoice error:', err);
    return errorResponse(status, message, origin);
  }
};
