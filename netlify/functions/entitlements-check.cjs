/**
 * entitlements-check
 *
 * POST /.netlify/functions/entitlements-check
 * Body: { feature?: string, limit?: string, incrementMeter?: string, meterQuantity?: number }
 * Auth: Supabase JWT.
 *
 * Server-side re-check of a feature flag and/or a usage limit. Gated endpoints
 * (policy generator, report generator, VRM writes) call this before doing the
 * expensive work so client-side flags can't be bypassed.
 *
 * Responses:
 *   200 { allowed: true, usage?: number }                 — go ahead
 *   402 { allowed: false, reason, requiredPlan, currentPlan, upgradePath }
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
  getOrganization,
  PLAN_CONFIGS,
} = require('./utils/stripe.cjs');

const PLAN_ORDER = ['free', 'starter', 'growth', 'scale', 'enterprise'];

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

    const { feature, limit, incrementMeter, meterQuantity } = parsed.data;
    const org = await getOrganization(organizationId);
    const plan = org.plan;

    // --- dunning soft-block ----------------------------------------------
    // Per monetization plan §8.4: after day 10 of suspended status, block
    // paid-feature writes (which is everything this function is asked about).
    // Reads are left open so the tenant's audit data doesn't disappear.
    if (org.status === 'suspended' && org.suspended_at) {
      const suspendedMs = Date.now() - new Date(org.suspended_at).getTime();
      const suspendedDays = suspendedMs / (1000 * 60 * 60 * 24);
      if (suspendedDays >= 10) {
        return {
          statusCode: 402,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin || '*' },
          body: JSON.stringify({
            allowed: false,
            reason: 'dunning_blocked',
            currentPlan: plan,
            message: 'Payment has been failing for over 10 days. Update your payment method to restore access.',
            suspendedSince: org.suspended_at,
          }),
        };
      }
    }

    // --- feature flag check ----------------------------------------------
    if (feature) {
      const enabled = org.features?.[feature] === true;
      if (!enabled) {
        return paymentRequired(feature, plan, 'feature', origin);
      }
    }

    // --- limit check (numeric quota) -------------------------------------
    if (limit) {
      const limitValue = org.limits?.[limit];
      const usageKey = limitToUsageKey(limit);
      const used = usageKey ? (org.usage?.[usageKey] || 0) : 0;
      if (limitValue !== -1 && used >= limitValue) {
        return paymentRequired(limit, plan, 'limit', origin, { used, cap: limitValue });
      }
    }

    // --- optional meter increment (atomic) -------------------------------
    // Called together with feature/limit checks so the client hits one function
    // per gated action. Only runs if all above checks passed.
    let newQuantity;
    if (incrementMeter) {
      const supabase = getSupabase();
      const periodStart = org.billing?.currentPeriodEnd
        ? startOfPeriod(org.billing.currentPeriodEnd)
        : startOfCurrentMonth();
      const periodEnd = org.billing?.currentPeriodEnd
        ? new Date(org.billing.currentPeriodEnd)
        : endOfCurrentMonth();

      const { data, error } = await supabase.rpc('increment_usage_meter', {
        p_organization_id: organizationId,
        p_meter: incrementMeter,
        p_period_start: periodStart.toISOString(),
        p_period_end: periodEnd.toISOString(),
        p_quantity: typeof meterQuantity === 'number' && meterQuantity > 0 ? meterQuantity : 1,
      });

      if (error) {
        console.error('increment_usage_meter failed:', error);
        return errorResponse(500, 'Failed to record usage', origin);
      }
      newQuantity = data;
    }

    return successResponse(
      { allowed: true, usage: newQuantity, plan },
      origin
    );
  } catch (err) {
    const status = err.statusCode || 500;
    const message = status >= 500 ? 'Internal server error' : err.message;
    if (status >= 500) console.error('entitlements-check error:', err);
    return errorResponse(status, message, origin);
  }
};

// ============================================================================
// HELPERS
// ============================================================================

function paymentRequired(gateKey, currentPlan, kind, origin, extra = {}) {
  const requiredPlan = findMinimumPlanFor(gateKey, kind);
  return {
    statusCode: 402,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '*',
    },
    body: JSON.stringify({
      allowed: false,
      reason: kind === 'feature' ? 'feature_not_enabled' : 'limit_reached',
      gate: gateKey,
      currentPlan,
      requiredPlan,
      upgradePath: PLAN_ORDER.slice(PLAN_ORDER.indexOf(currentPlan) + 1),
      ...extra,
    }),
  };
}

function findMinimumPlanFor(gateKey, kind) {
  for (const plan of PLAN_ORDER) {
    const config = PLAN_CONFIGS[plan];
    if (kind === 'feature' && config.features[gateKey] === true) return plan;
    if (kind === 'limit') {
      const val = config.limits[gateKey];
      if (val === -1 || val > 0) return plan;
    }
  }
  return 'enterprise';
}

function limitToUsageKey(limit) {
  switch (limit) {
    case 'maxUsers':        return 'usersCount';
    case 'maxControls':     return 'controlsCount';
    case 'maxEvidence':     return 'evidenceCount';
    case 'maxIntegrations': return 'integrationsCount';
    case 'maxStorageGb':    return 'storageUsedMb';
    default:                return null;
  }
}

function startOfCurrentMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function endOfCurrentMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59));
}
function startOfPeriod(periodEndIso) {
  // For a Stripe billing period, start = end - ~30 days. Good enough for meter bucketing.
  const end = new Date(periodEndIso);
  return new Date(end.getTime() - 30 * 24 * 3600 * 1000);
}
