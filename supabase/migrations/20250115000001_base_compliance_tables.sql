-- Migration: Base Compliance Tables
-- Created: 2025-01-15
-- Description: Creates the foundational compliance tables required by the application

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#6366f1',
    contact_email VARCHAR(255),
    description TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID
);

-- Index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- CONTROL RESPONSES TABLE (legacy, referenced by multi-tenant migration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.control_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    control_id TEXT NOT NULL,
    response TEXT,
    notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID,

    UNIQUE(organization_id, control_id)
);

-- ============================================================================
-- USER RESPONSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,
    control_id TEXT NOT NULL,

    -- Response Data
    answer TEXT CHECK (answer IN ('yes', 'no', 'partial', 'na')),
    evidence_note TEXT DEFAULT '',
    file_url TEXT,
    file_name TEXT,
    evidence_url TEXT,  -- URL to AI-generated policy PDF in Supabase Storage
    remediation_plan TEXT DEFAULT '',
    target_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete', 'deferred')),

    -- Metadata
    answered_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Unique constraint for upsert
    UNIQUE(organization_id, control_id)
);

-- ============================================================================
-- MASTER CONTROLS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.master_controls (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    question TEXT NOT NULL,
    domain TEXT NOT NULL,
    domain_title TEXT NOT NULL,
    domain_color TEXT DEFAULT '#6366f1',
    risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    effort TEXT DEFAULT 'medium' CHECK (effort IN ('low', 'medium', 'high')),
    impact TEXT DEFAULT 'medium' CHECK (impact IN ('low', 'medium', 'high', 'critical')),
    guidance TEXT,
    remediation_tip TEXT,
    evidence_examples TEXT[] DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- FRAMEWORK REQUIREMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.framework_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework_id TEXT NOT NULL CHECK (framework_id IN ('SOC2', 'ISO27001', 'HIPAA', 'NIST', 'GDPR', 'PCI-DSS')),
    clause_id TEXT NOT NULL,
    clause_title TEXT NOT NULL,
    clause_description TEXT,
    section TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    UNIQUE(framework_id, clause_id)
);

-- ============================================================================
-- CONTROL MAPPINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.control_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_id TEXT NOT NULL,
    framework_id TEXT NOT NULL,
    clause_id TEXT NOT NULL,
    mapping_strength TEXT DEFAULT 'direct' CHECK (mapping_strength IN ('direct', 'partial', 'supportive')),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    UNIQUE(control_id, framework_id, clause_id)
);

-- ============================================================================
-- EVIDENCE RECORDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.evidence_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id TEXT NOT NULL,
    organization_id UUID NOT NULL,
    control_id TEXT NOT NULL,
    response_id UUID,

    -- Evidence Details
    title TEXT NOT NULL,
    description TEXT,
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'rejected', 'expired')),

    -- Files
    file_urls TEXT[] DEFAULT '{}',
    file_metadata JSONB DEFAULT '[]'::jsonb,

    -- Review Workflow
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    approved_by UUID,
    approved_at TIMESTAMPTZ,

    -- Metadata
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    UNIQUE(organization_id, evidence_id)
);

-- ============================================================================
-- CUSTOM CONTROLS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.custom_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    question TEXT NOT NULL,
    domain TEXT NOT NULL DEFAULT 'company_specific',
    domain_title TEXT NOT NULL DEFAULT 'Company Specific',
    risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    guidance TEXT,
    evidence_examples TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- CUSTOM CONTROL MAPPINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.custom_control_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custom_control_id UUID NOT NULL REFERENCES public.custom_controls(id) ON DELETE CASCADE,
    framework_id TEXT NOT NULL,
    clause_id TEXT NOT NULL,
    clause_title TEXT DEFAULT '',

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    UNIQUE(custom_control_id, framework_id, clause_id)
);

-- ============================================================================
-- SYNC NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sync_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    user_id UUID,
    control_id TEXT NOT NULL,
    control_title TEXT NOT NULL,
    framework_id TEXT NOT NULL,
    clause_id TEXT NOT NULL,
    clause_title TEXT NOT NULL,
    notification_type TEXT DEFAULT 'compliance_met',
    is_read BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User Responses Indexes
CREATE INDEX IF NOT EXISTS idx_user_responses_org ON public.user_responses(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_responses_control ON public.user_responses(control_id);
CREATE INDEX IF NOT EXISTS idx_user_responses_status ON public.user_responses(status);

-- Master Controls Indexes
CREATE INDEX IF NOT EXISTS idx_master_controls_domain ON public.master_controls(domain);
CREATE INDEX IF NOT EXISTS idx_master_controls_active ON public.master_controls(is_active);

-- Framework Requirements Indexes
CREATE INDEX IF NOT EXISTS idx_framework_requirements_framework ON public.framework_requirements(framework_id);

-- Control Mappings Indexes
CREATE INDEX IF NOT EXISTS idx_control_mappings_control ON public.control_mappings(control_id);
CREATE INDEX IF NOT EXISTS idx_control_mappings_framework ON public.control_mappings(framework_id);

-- Evidence Records Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_records_org ON public.evidence_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_evidence_records_control ON public.evidence_records(control_id);
CREATE INDEX IF NOT EXISTS idx_evidence_records_status ON public.evidence_records(status);

-- Custom Controls Indexes
CREATE INDEX IF NOT EXISTS idx_custom_controls_org ON public.custom_controls(organization_id);

-- Sync Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_sync_notifications_org ON public.sync_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_sync_notifications_unread ON public.sync_notifications(organization_id, is_read) WHERE is_read = false;

-- Audit Log Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_org ON public.audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.user_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_control_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will be applied in the multi-tenant setup migration

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Trigger function (if not exists from other migrations)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_user_responses_updated_at ON public.user_responses;
CREATE TRIGGER update_user_responses_updated_at BEFORE UPDATE ON public.user_responses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_master_controls_updated_at ON public.master_controls;
CREATE TRIGGER update_master_controls_updated_at BEFORE UPDATE ON public.master_controls
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_framework_requirements_updated_at ON public.framework_requirements;
CREATE TRIGGER update_framework_requirements_updated_at BEFORE UPDATE ON public.framework_requirements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_evidence_records_updated_at ON public.evidence_records;
CREATE TRIGGER update_evidence_records_updated_at BEFORE UPDATE ON public.evidence_records
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_custom_controls_updated_at ON public.custom_controls;
CREATE TRIGGER update_custom_controls_updated_at BEFORE UPDATE ON public.custom_controls
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STORAGE BUCKET FOR EVIDENCE FILES
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'evidence-files',
    'evidence-files',
    false,
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain', 'text/csv', 'application/json', 'application/zip']
) ON CONFLICT (id) DO NOTHING;
