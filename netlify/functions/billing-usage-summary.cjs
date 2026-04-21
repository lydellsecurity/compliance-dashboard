/**
 * billing-usage-summary
 *
 * GET or POST /.netlify/functions/billing-usage-summary
 * Auth: Supabase JWT.
 *
 * Returns the org's current-period usage across every meter we track, plus
 * the plan's soft caps (where defined). Powers the "Usage this period" block
 * on the BillingCard so users see "25 / 100 AI policies" instead of being
 * surprised by an invoice line item.
 */

const {
  handleCorsPreflght,
  errorResponse,
  successResponse,
} = require('./utils/security.cjs');
const {
  getSupabase,
  requireAuthedOrg,
  getOrganization,
} = require('./utils/stripe.cjs');

// Soft-cap copy — shown beside the current count so users know roughly where
// they stand on metered add-ons. These are meant to match docs/MONETIZATION_PLAN.md
// and will be refined when Stripe metered pricing lands in production.
const SOFT_CAPS = {
  ai_policy: 500,
  ai_remediation_chat: 2000,
  questionnaire: 50,
  vendors: null, // gated by VRM feature, not a meter cap
  seats: null,   // surfaced via maxUsers in limits
  report: null,
};

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
    const supabase = getSupabase();

    const periodEnd = org?.billing?.currentPeriodEnd
      ? new Date(org.billing.currentPeriodEnd)
      : new Date(
          Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth() + 1,
            0,
            23,
            59,
            59
          )
        );
    const periodStart = new Date(periodEnd.getTime() - 30 * 24 * 3600 * 1000);

    const { data: rows, error } = await supabase
      .from('usage_meters')
      .select('meter, quantity, period_start, period_end')
      .eq('organization_id', organizationId)
      .gte('period_end', periodStart.toISOString())
      .lte('period_start', periodEnd.toISOString());

    if (error) throw error;

    const meters = {};
    for (const key of Object.keys(SOFT_CAPS)) {
      meters[key] = { used: 0, cap: SOFT_CAPS[key] };
    }
    for (const row of rows || []) {
      const m = meters[row.meter] || { used: 0, cap: SOFT_CAPS[row.meter] ?? null };
      m.used += row.quantity || 0;
      meters[row.meter] = m;
    }

    return successResponse(
      {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        meters,
        apiCallsThisMonth: org?.usage?.apiCallsThisMonth || 0,
        plan: org?.plan,
        limits: org?.limits || null,
        usage: org?.usage || null,
      },
      origin
    );
  } catch (err) {
    const status = err.statusCode || 500;
    const message = status >= 500 ? 'Internal server error' : err.message;
    if (status >= 500) console.error('billing-usage-summary error:', err);
    return errorResponse(status, message, origin);
  }
};
