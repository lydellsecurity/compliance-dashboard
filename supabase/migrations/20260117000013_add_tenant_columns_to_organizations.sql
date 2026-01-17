-- Migration: Add tenant management columns to organizations
-- Created: 2026-01-17
-- Description: Add plan, limits, features, billing, usage, branding columns to organizations table
--              to support multi-tenant admin functionality

-- ============================================================================
-- ADD PLAN AND STATUS COLUMNS
-- ============================================================================

ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'startup', 'business', 'enterprise')),
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled'));

-- ============================================================================
-- ADD JSONB COLUMNS FOR COMPLEX STRUCTURES
-- ============================================================================

-- Limits (max users, storage, etc.)
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS limits JSONB DEFAULT '{
        "maxUsers": 3,
        "maxControls": 50,
        "maxEvidence": 100,
        "maxIntegrations": 1,
        "maxStorageGb": 1,
        "retentionDays": 30,
        "auditLogDays": 7,
        "apiRateLimit": 100
    }'::jsonb;

-- Features (what capabilities are enabled)
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{
        "cloudIntegrations": false,
        "customControls": false,
        "apiAccess": false,
        "ssoEnabled": false,
        "customBranding": false,
        "advancedReporting": false,
        "trustCenter": true,
        "incidentResponse": false,
        "vendorRisk": false,
        "questionnaireAutomation": false
    }'::jsonb;

-- Branding (logo, colors, domain)
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{
        "logoUrl": null,
        "faviconUrl": null,
        "primaryColor": "#6366f1",
        "secondaryColor": "#8b5cf6",
        "customDomain": null,
        "emailFromName": "AttestAI Compliance",
        "emailFooter": "",
        "trustCenterTitle": "Trust Center",
        "trustCenterDescription": "Our commitment to security and compliance"
    }'::jsonb;

-- Billing information
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS billing JSONB DEFAULT '{
        "customerId": null,
        "subscriptionId": null,
        "currentPeriodEnd": null,
        "seats": 3,
        "seatsUsed": 1,
        "mrr": 0,
        "billingEmail": null,
        "billingAddress": null
    }'::jsonb;

-- Usage tracking
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS usage JSONB DEFAULT '{
        "usersCount": 1,
        "controlsCount": 0,
        "evidenceCount": 0,
        "integrationsCount": 0,
        "storageUsedMb": 0,
        "apiCallsThisMonth": 0,
        "lastActivityAt": null
    }'::jsonb;

-- Custom domain column (for lookup by domain)
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS custom_domain TEXT;

-- Created by (user who created the org)
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ============================================================================
-- ADD INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_organizations_plan ON public.organizations(plan);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_custom_domain ON public.organizations(custom_domain) WHERE custom_domain IS NOT NULL;

-- ============================================================================
-- ADD organization_members COLUMNS IF MISSING
-- ============================================================================

ALTER TABLE public.organization_members
    ADD COLUMN IF NOT EXISTS department TEXT,
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT now();

-- Create index on organization_members for profile lookup
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
