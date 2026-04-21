/**
 * billing-events-log
 *
 * POST /.netlify/functions/billing-events-log
 * Body: { limit?: number, before?: string (ISO timestamp) }
 * Auth: Supabase JWT (owner/admin of the org).
 *
 * Returns the most recent billing_events rows for the caller's org — a
 * paginated audit log of every Stripe webhook we processed. Used by the
 * Admin → Billing → Events tab so operators can answer "why did my plan
 * change at 3 AM UTC?" without needing Stripe dashboard access.
 *
 * The full Stripe payload is returned verbatim — it's already stored and
 * the events came from a signed webhook, so there's no trust boundary to
 * re-cross. The UI is responsible for choosing which fields to display.
 */

const {
  handleCorsPreflght,
  errorResponse,
  successResponse,
  parseJsonBody,
} = require('./utils/security.cjs');
const {
  getSupabase,
  requireAuthedOrg,
} = require('./utils/stripe.cjs');

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

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

    if (role !== 'owner' && role !== 'admin') {
      return errorResponse(403, 'Only owners or admins can view billing events', origin);
    }

    const parsed = parseJsonBody(event.body || '{}');
    const body = parsed.valid ? parsed.data : {};
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(body.limit) || DEFAULT_LIMIT)
    );
    const before =
      typeof body.before === 'string' && body.before
        ? body.before
        : undefined;

    const supabase = getSupabase();

    let query = supabase
      .from('billing_events')
      .select('id, stripe_event_id, type, processed_at, payload')
      .eq('organization_id', organizationId)
      .order('processed_at', { ascending: false })
      .limit(limit + 1);
    if (before) query = query.lt('processed_at', before);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const hasMore = rows.length > limit;
    const events = rows.slice(0, limit).map((r) => {
      const payload = r.payload || {};
      const dataObj = payload?.data?.object || {};
      return {
        id: r.id,
        stripeEventId: r.stripe_event_id,
        type: r.type,
        processedAt: r.processed_at,
        // Summary fields for the UI — avoids shipping the whole payload if
        // the caller just wants to render a row.
        summary: summarize(r.type, dataObj),
        // Full object available if the UI wants to show "raw payload".
        object: dataObj,
      };
    });

    return successResponse({ events, hasMore }, origin);
  } catch (err) {
    const status = err.statusCode || 500;
    const message = status >= 500 ? 'Internal server error' : err.message;
    if (status >= 500) console.error('billing-events-log error:', err);
    return errorResponse(status, message, origin);
  }
};

function summarize(type, obj) {
  switch (type) {
    case 'checkout.session.completed':
      return `Checkout completed (${obj.mode || 'subscription'})`;
    case 'customer.subscription.created':
      return `Subscription created (${obj.status})`;
    case 'customer.subscription.updated':
      return `Subscription updated (${obj.status}${obj.cancel_at_period_end ? ', cancels at period end' : ''})`;
    case 'customer.subscription.deleted':
      return 'Subscription canceled';
    case 'customer.subscription.trial_will_end':
      return `Trial ending ${obj.trial_end ? new Date(obj.trial_end * 1000).toISOString().slice(0, 10) : 'soon'}`;
    case 'invoice.payment_succeeded':
      return `Payment succeeded: ${fmt(obj.amount_paid, obj.currency)}`;
    case 'invoice.payment_failed':
      return `Payment failed: ${fmt(obj.amount_due, obj.currency)} (attempt ${obj.attempt_count || 1})`;
    case 'invoice.upcoming':
      return `Upcoming invoice: ${fmt(obj.amount_due, obj.currency)}`;
    case 'charge.refunded':
      return `Refund: ${fmt(obj.amount_refunded, obj.currency)}`;
    case 'charge.dispute.created':
      return `Dispute opened: ${fmt(obj.amount, obj.currency)} (${obj.reason || 'no reason'})`;
    case 'customer.updated':
      return 'Customer updated';
    case 'customer.deleted':
      return 'Customer deleted';
    default:
      return type;
  }
}

function fmt(amount, currency) {
  if (typeof amount !== 'number') return '';
  try {
    return (amount / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    });
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
}
