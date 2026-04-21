/**
 * Shared Stripe + tenant helpers for billing Netlify functions.
 *
 * Centralises:
 *  - Stripe client construction (lazy, so functions that don't use Stripe
 *    don't require the env var to be set).
 *  - Supabase service-role client.
 *  - JWT → user → organization resolution.
 *  - Price ID → plan key reverse lookup (mirror of src/constants/billing.ts).
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyClerkToken } = require('./clerk-auth.cjs');

// ============================================================================
// STRIPE CLIENT
// ============================================================================

let stripeClient = null;

function getStripe() {
  if (stripeClient) return stripeClient;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  // Pinned API version for reproducible webhook payloads.
  stripeClient = require('stripe')(key, { apiVersion: '2024-06-20' });
  return stripeClient;
}

// ============================================================================
// SUPABASE SERVICE CLIENT
// ============================================================================

let supabaseClient = null;

function getSupabase() {
  if (supabaseClient) return supabaseClient;

  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase env vars missing (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  }
  supabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseClient;
}

// ============================================================================
// AUTH / TENANT RESOLUTION
// ============================================================================

/**
 * Validate a bearer token and resolve the caller's primary organization.
 * Returns { user, organizationId, role } or throws on failure.
 */
async function requireAuthedOrg(authHeader) {
  // Clerk signs the JWT; we verify it networklessly via JWKS and get the
  // caller's Clerk user id from the `sub` claim.
  const { userId, claims } = await verifyClerkToken(authHeader);
  const supabase = getSupabase();

  // Resolve default org for this user. Owners override non-owners.
  const { data: memberships, error: memErr } = await supabase
    .from('organization_members')
    .select('organization_id, role, is_default')
    .eq('user_id', userId);

  if (memErr || !memberships || memberships.length === 0) {
    const err = new Error('No organization membership found');
    err.statusCode = 403;
    throw err;
  }

  const primary =
    memberships.find((m) => m.is_default) ||
    memberships.find((m) => m.role === 'owner') ||
    memberships[0];

  return {
    user: { id: userId, email: claims.email || null },
    organizationId: primary.organization_id,
    role: primary.role,
  };
}

/**
 * Fetch the organization row by id. Returns the raw Supabase row (caller
 * decodes JSONB columns as needed).
 */
async function getOrganization(organizationId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();
  if (error || !data) {
    const err = new Error('Organization not found');
    err.statusCode = 404;
    throw err;
  }
  return data;
}

// ============================================================================
// PRICE ID → PLAN RESOLUTION (server-side mirror of src/constants/billing.ts)
// ============================================================================

function resolvePlanFromPriceId(priceId) {
  const map = {
    [process.env.STRIPE_PRICE_STARTER_MONTHLY]: { plan: 'starter', interval: 'monthly' },
    [process.env.STRIPE_PRICE_STARTER_ANNUAL]:  { plan: 'starter', interval: 'annual' },
    [process.env.STRIPE_PRICE_GROWTH_MONTHLY]:  { plan: 'growth',  interval: 'monthly' },
    [process.env.STRIPE_PRICE_GROWTH_ANNUAL]:   { plan: 'growth',  interval: 'annual' },
    [process.env.STRIPE_PRICE_SCALE_MONTHLY]:   { plan: 'scale',   interval: 'monthly' },
    [process.env.STRIPE_PRICE_SCALE_ANNUAL]:    { plan: 'scale',   interval: 'annual' },
  };
  return map[priceId] || null;
}

// ============================================================================
// PLAN CONFIG (mirror of multi-tenant.service.ts PLAN_CONFIGS)
// ============================================================================
// Kept in sync manually. The webhook uses this to re-apply limits/features
// when a subscription is created or changed. When the TS PLAN_CONFIGS changes,
// update this mirror too.

const PLAN_CONFIGS = {
  free: {
    limits: {
      maxUsers: 1, maxControls: 15, maxEvidence: 25, maxIntegrations: 0,
      maxStorageGb: 0.25, retentionDays: 14, auditLogDays: 7, apiRateLimit: 0,
      maxVendors: 0,
    },
    features: {
      cloudIntegrations: false, customControls: false, apiAccess: false,
      ssoEnabled: false, customBranding: false, advancedReporting: false,
      trustCenter: true, incidentResponse: false, vendorRisk: false,
      questionnaireAutomation: false, aiRemediationChat: false,
      realTimeRegulatoryScan: false, auditBundleExport: false,
      customDomain: false, scimProvisioning: false,
    },
    price: 0,
    priceAnnual: 0,
  },
  starter: {
    limits: {
      maxUsers: 10, maxControls: 236, maxEvidence: 750, maxIntegrations: 5,
      maxStorageGb: 10, retentionDays: 365, auditLogDays: 365, apiRateLimit: 60,
      maxVendors: 0,
    },
    features: {
      cloudIntegrations: true, customControls: true, apiAccess: false,
      ssoEnabled: false, customBranding: true, advancedReporting: true,
      trustCenter: true, incidentResponse: true, vendorRisk: false,
      questionnaireAutomation: false, aiRemediationChat: false,
      realTimeRegulatoryScan: false, auditBundleExport: false,
      customDomain: false, scimProvisioning: false,
    },
    price: 599,
    priceAnnual: 5988,
  },
  growth: {
    limits: {
      maxUsers: 25, maxControls: 500, maxEvidence: 3000, maxIntegrations: 15,
      maxStorageGb: 50, retentionDays: 365, auditLogDays: 90, apiRateLimit: 300,
      maxVendors: 50,
    },
    features: {
      cloudIntegrations: true, customControls: true, apiAccess: true,
      ssoEnabled: true, customBranding: true, advancedReporting: true,
      trustCenter: true, incidentResponse: true, vendorRisk: true,
      questionnaireAutomation: true, aiRemediationChat: true,
      realTimeRegulatoryScan: false, auditBundleExport: true,
      customDomain: false, scimProvisioning: false,
    },
    price: 1399,
    priceAnnual: 13988,
  },
  scale: {
    limits: {
      maxUsers: 150, maxControls: 1500, maxEvidence: 10000, maxIntegrations: 40,
      maxStorageGb: 200, retentionDays: 730, auditLogDays: 365, apiRateLimit: 1200,
      maxVendors: 150,
    },
    features: {
      cloudIntegrations: true, customControls: true, apiAccess: true,
      ssoEnabled: true, customBranding: true, advancedReporting: true,
      trustCenter: true, incidentResponse: true, vendorRisk: true,
      questionnaireAutomation: true, aiRemediationChat: true,
      realTimeRegulatoryScan: true, auditBundleExport: true,
      customDomain: true, scimProvisioning: true,
    },
    price: 2399,
    priceAnnual: 23988,
  },
  enterprise: {
    limits: {
      maxUsers: -1, maxControls: -1, maxEvidence: -1, maxIntegrations: -1,
      maxStorageGb: -1, retentionDays: -1, auditLogDays: -1, apiRateLimit: -1,
      maxVendors: -1,
    },
    features: {
      cloudIntegrations: true, customControls: true, apiAccess: true,
      ssoEnabled: true, customBranding: true, advancedReporting: true,
      trustCenter: true, incidentResponse: true, vendorRisk: true,
      questionnaireAutomation: true, aiRemediationChat: true,
      realTimeRegulatoryScan: true, auditBundleExport: true,
      customDomain: true, scimProvisioning: true,
    },
    price: -1,
    priceAnnual: -1,
  },
};

/**
 * Atomically increment a usage meter for an organization's current billing
 * period. Wraps the `increment_usage_meter` RPC so Netlify functions don't
 * each re-implement period bucketing.
 *
 * Failures are logged and swallowed — metering should never block the user
 * action that's being measured.
 */
async function incrementMeter(organizationId, meter, quantity = 1) {
  try {
    const supabase = getSupabase();
    const { data: org } = await supabase
      .from('organizations')
      .select('billing')
      .eq('id', organizationId)
      .single();

    // Fall back to the calendar month if no subscription period is set
    // (e.g. Free tier). Keeps the meter bucket stable across calls in a month.
    const now = new Date();
    let periodEnd;
    if (org?.billing?.currentPeriodEnd) {
      periodEnd = new Date(org.billing.currentPeriodEnd);
    } else {
      periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
    }
    const periodStart = new Date(periodEnd.getTime() - 30 * 24 * 3600 * 1000);

    const { data, error } = await supabase.rpc('increment_usage_meter', {
      p_organization_id: organizationId,
      p_meter: meter,
      p_period_start: periodStart.toISOString(),
      p_period_end: periodEnd.toISOString(),
      p_quantity: quantity,
    });

    if (error) {
      console.error(`incrementMeter(${meter}) failed for org ${organizationId}:`, error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('incrementMeter error:', err);
    return null;
  }
}

module.exports = {
  getStripe,
  getSupabase,
  requireAuthedOrg,
  getOrganization,
  resolvePlanFromPriceId,
  incrementMeter,
  PLAN_CONFIGS,
};
