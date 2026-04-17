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
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Missing or invalid authorization token');
    err.statusCode = 401;
    throw err;
  }
  const token = authHeader.replace('Bearer ', '');
  const supabase = getSupabase();

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    const err = new Error('Invalid or expired token');
    err.statusCode = 401;
    throw err;
  }

  const user = userData.user;

  // Resolve default org for this user. Owners override non-owners.
  const { data: memberships, error: memErr } = await supabase
    .from('organization_members')
    .select('organization_id, role, is_default')
    .eq('user_id', user.id);

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
    user,
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
      maxUsers: 3, maxControls: 50, maxEvidence: 100, maxIntegrations: 1,
      maxStorageGb: 1, retentionDays: 30, auditLogDays: 7, apiRateLimit: 0,
    },
    features: {
      cloudIntegrations: true, customControls: false, apiAccess: false,
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
      maxStorageGb: 10, retentionDays: 180, auditLogDays: 30, apiRateLimit: 60,
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
    },
    features: {
      cloudIntegrations: true, customControls: true, apiAccess: true,
      ssoEnabled: false, customBranding: true, advancedReporting: true,
      trustCenter: true, incidentResponse: true, vendorRisk: true,
      questionnaireAutomation: true, aiRemediationChat: true,
      realTimeRegulatoryScan: false, auditBundleExport: true,
      customDomain: false, scimProvisioning: false,
    },
    price: 1199,
    priceAnnual: 11988,
  },
  scale: {
    limits: {
      maxUsers: 75, maxControls: 1500, maxEvidence: 10000, maxIntegrations: 40,
      maxStorageGb: 200, retentionDays: 730, auditLogDays: 365, apiRateLimit: 1200,
    },
    features: {
      cloudIntegrations: true, customControls: true, apiAccess: true,
      ssoEnabled: true, customBranding: true, advancedReporting: true,
      trustCenter: true, incidentResponse: true, vendorRisk: true,
      questionnaireAutomation: true, aiRemediationChat: true,
      realTimeRegulatoryScan: true, auditBundleExport: true,
      customDomain: true, scimProvisioning: false,
    },
    price: 2399,
    priceAnnual: 23988,
  },
  enterprise: {
    limits: {
      maxUsers: -1, maxControls: -1, maxEvidence: -1, maxIntegrations: -1,
      maxStorageGb: -1, retentionDays: -1, auditLogDays: -1, apiRateLimit: -1,
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

module.exports = {
  getStripe,
  getSupabase,
  requireAuthedOrg,
  getOrganization,
  resolvePlanFromPriceId,
  PLAN_CONFIGS,
};
