/**
 * billing-downgrade-preflight
 *
 * POST /.netlify/functions/billing-downgrade-preflight
 * Body: { targetPlan: 'free'|'starter'|'growth'|'scale'|'enterprise' }
 * Auth: Supabase JWT.
 *
 * Answers: "if I downgrade this org to targetPlan, which resources will
 * exceed the new caps?". Returns live counts pulled from the database so the
 * downgrade warning modal can tell the user "you have 30 users on a 25-user
 * plan; remove 5 first".
 *
 * Reads only — no side effects. The actual downgrade happens via Stripe Portal
 * or a subsequent Stripe API call.
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
  PLAN_CONFIGS,
} = require('./utils/stripe.cjs');

const VALID_PLANS = new Set(['free', 'starter', 'growth', 'scale', 'enterprise']);

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;

  if (event.httpMethod === 'OPTIONS') return handleCorsPreflght(event);
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed', origin);
  }

  try {
    const { organizationId } = await requireAuthedOrg(
      event.headers.authorization || event.headers.Authorization
    );

    const parsed = parseJsonBody(event.body);
    if (!parsed.valid) return errorResponse(400, parsed.error, origin);

    const targetPlan = parsed.data.targetPlan;
    if (!VALID_PLANS.has(targetPlan)) {
      return errorResponse(400, 'Invalid targetPlan', origin);
    }

    const targetLimits = PLAN_CONFIGS[targetPlan].limits;
    const supabase = getSupabase();

    // Live counts. We don't trust tenant.usage because it can drift — run
    // the actual queries.
    const [users, controls, evidence, integrations, vendors] = await Promise.all([
      countRows(supabase, 'organization_members', organizationId),
      countRows(supabase, 'custom_controls', organizationId),
      countRows(supabase, 'evidence_items', organizationId),
      countRows(supabase, 'integrations', organizationId),
      countRows(supabase, 'vendors', organizationId),
    ]);

    const findings = [];

    appendIfOver(findings, 'users', 'Users', users, targetLimits.maxUsers);
    appendIfOver(findings, 'controls', 'Custom controls', controls, targetLimits.maxControls);
    appendIfOver(findings, 'evidence', 'Evidence records', evidence, targetLimits.maxEvidence);
    appendIfOver(findings, 'integrations', 'Active integrations', integrations, targetLimits.maxIntegrations);
    // Vendors are gated by the vendorRisk FEATURE on Free/Starter — if the
    // target plan lacks the feature and the org has vendors, flag it.
    const targetHasVendors = PLAN_CONFIGS[targetPlan].features.vendorRisk === true;
    if (!targetHasVendors && vendors > 0) {
      findings.push({
        key: 'vendors',
        label: 'Vendors (feature disabled on this plan)',
        current: vendors,
        cap: 0,
        excess: vendors,
      });
    }

    return successResponse(
      {
        targetPlan,
        blocked: findings.length > 0,
        findings,
      },
      origin
    );
  } catch (err) {
    const status = err.statusCode || 500;
    const message = status >= 500 ? 'Internal server error' : err.message;
    if (status >= 500) console.error('downgrade-preflight error:', err);
    return errorResponse(status, message, origin);
  }
};

async function countRows(supabase, table, organizationId) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);
    if (error) {
      console.warn(`countRows(${table}) failed:`, error.message);
      return 0;
    }
    return count || 0;
  } catch (err) {
    console.warn(`countRows(${table}) threw:`, err.message);
    return 0;
  }
}

function appendIfOver(findings, key, label, current, cap) {
  if (cap === -1) return;
  if (current > cap) {
    findings.push({ key, label, current, cap, excess: current - cap });
  }
}
