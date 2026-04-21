-- Migration: Plan recut — April 2026
-- Created: 2026-04-21
-- Description:
--   Re-applies the refreshed plan configuration (src/services/multi-tenant.service.ts
--   PLAN_CONFIGS and its server-side mirror) to every existing organization so
--   the DB state matches code. Without this, existing rows continue to carry
--   the old `limits`/`features` JSON until their next Stripe webhook fires.
--
--   Changes by tier:
--     Free      — tighter: 1 user, 15 controls, 25 evidence, 250MB storage,
--                 14-day retention, cloud integrations OFF, maxVendors added.
--     Starter   — retention bumped to 365 days (SOC 2 Type II fix),
--                 auditLogDays bumped to 365.
--     Growth    — SSO enabled, maxVendors = 50.
--     Scale     — maxUsers 75 -> 150, SCIM enabled, maxVendors = 150.
--     Enterprise — maxVendors added as unlimited (-1); other values unchanged.
--
--   Pricing: $ amounts for Growth shift from $1,199 to $1,399/mo in code, but
--   pricing is authoritative in Stripe (not here). This migration only
--   adjusts in-app MRR display after a future subscription sync. No rows are
--   mutated for price. Operators must update the VITE_STRIPE_PRICE_GROWTH_*
--   and STRIPE_PRICE_GROWTH_* env vars to point at the new Stripe Price IDs
--   before the new pricing takes effect.

BEGIN;

-- ============================================================================
-- FREE
-- ============================================================================
UPDATE public.organizations
SET
  limits = jsonb_build_object(
    'maxUsers',        1,
    'maxControls',     15,
    'maxEvidence',     25,
    'maxIntegrations', 0,
    'maxStorageGb',    0.25,
    'retentionDays',   14,
    'auditLogDays',    7,
    'apiRateLimit',    0,
    'maxVendors',      0
  ),
  features = jsonb_build_object(
    'cloudIntegrations',       false,
    'customControls',          false,
    'apiAccess',               false,
    'ssoEnabled',              false,
    'customBranding',          false,
    'advancedReporting',       false,
    'trustCenter',             true,
    'incidentResponse',        false,
    'vendorRisk',              false,
    'questionnaireAutomation', false,
    'aiRemediationChat',       false,
    'realTimeRegulatoryScan',  false,
    'auditBundleExport',       false,
    'customDomain',            false,
    'scimProvisioning',        false
  ),
  updated_at = now()
WHERE plan = 'free';

-- ============================================================================
-- STARTER
-- ============================================================================
UPDATE public.organizations
SET
  limits = jsonb_build_object(
    'maxUsers',        10,
    'maxControls',     236,
    'maxEvidence',     750,
    'maxIntegrations', 5,
    'maxStorageGb',    10,
    'retentionDays',   365,
    'auditLogDays',    365,
    'apiRateLimit',    60,
    'maxVendors',      0
  ),
  features = jsonb_build_object(
    'cloudIntegrations',       true,
    'customControls',          true,
    'apiAccess',               false,
    'ssoEnabled',              false,
    'customBranding',          true,
    'advancedReporting',       true,
    'trustCenter',             true,
    'incidentResponse',        true,
    'vendorRisk',              false,
    'questionnaireAutomation', false,
    'aiRemediationChat',       false,
    'realTimeRegulatoryScan',  false,
    'auditBundleExport',       false,
    'customDomain',            false,
    'scimProvisioning',        false
  ),
  updated_at = now()
WHERE plan = 'starter';

-- ============================================================================
-- GROWTH
-- ============================================================================
UPDATE public.organizations
SET
  limits = jsonb_build_object(
    'maxUsers',        25,
    'maxControls',     500,
    'maxEvidence',     3000,
    'maxIntegrations', 15,
    'maxStorageGb',    50,
    'retentionDays',   365,
    'auditLogDays',    90,
    'apiRateLimit',    300,
    'maxVendors',      50
  ),
  features = jsonb_build_object(
    'cloudIntegrations',       true,
    'customControls',          true,
    'apiAccess',               true,
    'ssoEnabled',              true,
    'customBranding',          true,
    'advancedReporting',       true,
    'trustCenter',             true,
    'incidentResponse',        true,
    'vendorRisk',              true,
    'questionnaireAutomation', true,
    'aiRemediationChat',       true,
    'realTimeRegulatoryScan',  false,
    'auditBundleExport',       true,
    'customDomain',            false,
    'scimProvisioning',        false
  ),
  updated_at = now()
WHERE plan = 'growth';

-- ============================================================================
-- SCALE
-- ============================================================================
UPDATE public.organizations
SET
  limits = jsonb_build_object(
    'maxUsers',        150,
    'maxControls',     1500,
    'maxEvidence',     10000,
    'maxIntegrations', 40,
    'maxStorageGb',    200,
    'retentionDays',   730,
    'auditLogDays',    365,
    'apiRateLimit',    1200,
    'maxVendors',      150
  ),
  features = jsonb_build_object(
    'cloudIntegrations',       true,
    'customControls',          true,
    'apiAccess',               true,
    'ssoEnabled',              true,
    'customBranding',          true,
    'advancedReporting',       true,
    'trustCenter',             true,
    'incidentResponse',        true,
    'vendorRisk',              true,
    'questionnaireAutomation', true,
    'aiRemediationChat',       true,
    'realTimeRegulatoryScan',  true,
    'auditBundleExport',       true,
    'customDomain',            true,
    'scimProvisioning',        true
  ),
  updated_at = now()
WHERE plan = 'scale';

-- ============================================================================
-- ENTERPRISE (only adds the new maxVendors key; other fields preserved)
-- ============================================================================
UPDATE public.organizations
SET
  limits = COALESCE(limits, '{}'::jsonb) || jsonb_build_object('maxVendors', -1),
  updated_at = now()
WHERE plan = 'enterprise';

COMMIT;
