-- Migration: Evidence Repository, Integration Hub, and Multi-Tenant Architecture
-- Created: 2025-01-16
-- Description: Adds tables for evidence management, third-party integrations, and multi-tenant support

-- ============================================================================
-- MULTI-TENANT TABLES
-- ============================================================================

-- Tenants (Organizations) Table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'startup', 'business', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),

    -- Settings
    settings JSONB DEFAULT '{}'::jsonb,
    features JSONB DEFAULT '{}'::jsonb,
    branding JSONB DEFAULT '{}'::jsonb,

    -- Usage Tracking
    usage_limits JSONB DEFAULT '{}'::jsonb,
    current_usage JSONB DEFAULT '{}'::jsonb,

    -- Billing
    billing_email TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    trial_ends_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id),

    -- Data Retention
    data_retention_days INTEGER DEFAULT 365,
    deleted_at TIMESTAMPTZ
);

-- Tenant Members Table
CREATE TABLE IF NOT EXISTS public.tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer', 'auditor')),
    permissions JSONB DEFAULT '[]'::jsonb,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    invited_at TIMESTAMPTZ,
    invited_by UUID REFERENCES auth.users(id),
    joined_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    UNIQUE(tenant_id, user_id)
);

-- Tenant Audit Logs Table
CREATE TABLE IF NOT EXISTS public.tenant_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),

    -- Event Details
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,

    -- Context
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,

    -- Risk Assessment
    risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Data Retention Policies Table
CREATE TABLE IF NOT EXISTS public.retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    description TEXT,

    -- Policy Rules
    resource_type TEXT NOT NULL,
    retention_days INTEGER NOT NULL,
    action TEXT NOT NULL DEFAULT 'archive' CHECK (action IN ('archive', 'delete', 'anonymize')),

    -- Schedule
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- EVIDENCE REPOSITORY TABLES
-- ============================================================================

-- Evidence Items Table
CREATE TABLE IF NOT EXISTS public.evidence_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Evidence Details
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('document', 'screenshot', 'log', 'configuration', 'report', 'policy', 'procedure', 'other')),
    category TEXT NOT NULL,

    -- Control Mapping
    control_ids TEXT[] DEFAULT '{}',
    framework_ids TEXT[] DEFAULT '{}',

    -- Status & Workflow
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'expired', 'archived')),

    -- Validity
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    review_cycle_days INTEGER DEFAULT 365,
    last_reviewed_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ,

    -- Current Version Reference
    current_version_id UUID,
    version_count INTEGER DEFAULT 1,

    -- Tags & Search
    tags TEXT[] DEFAULT '{}',
    search_vector TSVECTOR,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Evidence Versions Table
CREATE TABLE IF NOT EXISTS public.evidence_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID NOT NULL REFERENCES public.evidence_items(id) ON DELETE CASCADE,

    -- Version Info
    version_number INTEGER NOT NULL,
    change_summary TEXT,

    -- Approval Workflow
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(evidence_id, version_number)
);

-- Evidence Files Table
CREATE TABLE IF NOT EXISTS public.evidence_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID NOT NULL REFERENCES public.evidence_items(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES public.evidence_versions(id) ON DELETE CASCADE,

    -- File Details
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,

    -- Storage
    storage_path TEXT NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'evidence',

    -- Integrity
    checksum_sha256 TEXT NOT NULL,

    -- Processing
    is_processed BOOLEAN DEFAULT false,
    extracted_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id)
);

-- Evidence Comments Table
CREATE TABLE IF NOT EXISTS public.evidence_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID NOT NULL REFERENCES public.evidence_items(id) ON DELETE CASCADE,
    version_id UUID REFERENCES public.evidence_versions(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES public.evidence_comments(id) ON DELETE CASCADE,

    content TEXT NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- INTEGRATION HUB TABLES
-- ============================================================================

-- Integration Connections Table
CREATE TABLE IF NOT EXISTS public.integration_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Provider Details
    provider_id TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    provider_category TEXT NOT NULL,

    -- Connection Status
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'syncing', 'pending_auth')),
    error_message TEXT,

    -- Authentication
    auth_type TEXT NOT NULL CHECK (auth_type IN ('oauth2', 'api_key', 'basic', 'token')),
    credentials_encrypted BYTEA,
    credentials_iv BYTEA,

    -- OAuth Tokens (encrypted)
    access_token_encrypted BYTEA,
    refresh_token_encrypted BYTEA,
    token_expires_at TIMESTAMPTZ,

    -- Configuration
    config JSONB DEFAULT '{}'::jsonb,
    scopes TEXT[] DEFAULT '{}',

    -- Sync Settings
    sync_enabled BOOLEAN DEFAULT true,
    sync_frequency_minutes INTEGER DEFAULT 60,
    last_sync_at TIMESTAMPTZ,
    next_sync_at TIMESTAMPTZ,
    sync_cursor TEXT,

    -- Health Monitoring
    last_health_check_at TIMESTAMPTZ,
    health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
    consecutive_failures INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    connected_by UUID REFERENCES auth.users(id),

    UNIQUE(tenant_id, provider_id)
);

-- Integration Data Table (Synced Data)
CREATE TABLE IF NOT EXISTS public.integration_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Data Classification
    data_type TEXT NOT NULL,
    external_id TEXT NOT NULL,

    -- Data Content
    data JSONB NOT NULL,
    normalized_data JSONB,

    -- Compliance Mapping
    mapped_controls TEXT[] DEFAULT '{}',
    compliance_status TEXT,

    -- Sync Tracking
    synced_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    source_updated_at TIMESTAMPTZ,
    sync_hash TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    UNIQUE(connection_id, data_type, external_id)
);

-- Integration Webhooks Table
CREATE TABLE IF NOT EXISTS public.integration_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Webhook Details
    event_type TEXT NOT NULL,
    endpoint_url TEXT NOT NULL,
    secret_hash TEXT NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Integration Sync Logs Table
CREATE TABLE IF NOT EXISTS public.integration_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Sync Details
    sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'webhook', 'manual')),
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),

    -- Results
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_deleted INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,

    -- Timing
    started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Metadata
    triggered_by TEXT DEFAULT 'system'
);

-- ============================================================================
-- VENDOR RISK MANAGEMENT TABLES (Placeholder for Task D)
-- ============================================================================

-- Vendors Table
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Vendor Details
    name TEXT NOT NULL,
    description TEXT,
    website TEXT,

    -- Contact
    primary_contact_name TEXT,
    primary_contact_email TEXT,
    primary_contact_phone TEXT,

    -- Classification
    category TEXT NOT NULL,
    criticality TEXT NOT NULL DEFAULT 'medium' CHECK (criticality IN ('critical', 'high', 'medium', 'low')),
    data_classification TEXT DEFAULT 'internal' CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted')),

    -- Risk Assessment
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_tier TEXT CHECK (risk_tier IN ('tier1', 'tier2', 'tier3', 'tier4')),
    last_assessment_at TIMESTAMPTZ,
    next_assessment_at TIMESTAMPTZ,

    -- Contract
    contract_start_date DATE,
    contract_end_date DATE,
    contract_value DECIMAL(15, 2),
    auto_renewal BOOLEAN DEFAULT false,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive', 'offboarding', 'terminated')),

    -- Compliance
    certifications TEXT[] DEFAULT '{}',
    compliance_frameworks TEXT[] DEFAULT '{}',

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Vendor Risk Assessments Table
CREATE TABLE IF NOT EXISTS public.vendor_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Assessment Details
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('initial', 'periodic', 'incident', 'contract_renewal')),
    questionnaire_id TEXT,

    -- Scoring
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    security_score INTEGER CHECK (security_score >= 0 AND security_score <= 100),
    privacy_score INTEGER CHECK (privacy_score >= 0 AND privacy_score <= 100),
    operational_score INTEGER CHECK (operational_score >= 0 AND operational_score <= 100),
    financial_score INTEGER CHECK (financial_score >= 0 AND financial_score <= 100),

    -- Findings
    findings JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,

    -- Status
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('draft', 'in_progress', 'pending_review', 'approved', 'rejected')),

    -- Workflow
    assigned_to UUID REFERENCES auth.users(id),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Tenant Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON public.tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON public.tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_tenant ON public.tenant_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_user ON public.tenant_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_action ON public.tenant_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_created ON public.tenant_audit_logs(created_at DESC);

-- Evidence Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_items_tenant ON public.evidence_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evidence_items_status ON public.evidence_items(status);
CREATE INDEX IF NOT EXISTS idx_evidence_items_type ON public.evidence_items(type);
CREATE INDEX IF NOT EXISTS idx_evidence_items_controls ON public.evidence_items USING GIN(control_ids);
CREATE INDEX IF NOT EXISTS idx_evidence_items_search ON public.evidence_items USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_evidence_versions_evidence ON public.evidence_versions(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_files_evidence ON public.evidence_files(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_files_version ON public.evidence_files(version_id);

-- Integration Indexes
CREATE INDEX IF NOT EXISTS idx_integration_connections_tenant ON public.integration_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_connections_provider ON public.integration_connections(provider_id);
CREATE INDEX IF NOT EXISTS idx_integration_connections_status ON public.integration_connections(status);
CREATE INDEX IF NOT EXISTS idx_integration_data_connection ON public.integration_data(connection_id);
CREATE INDEX IF NOT EXISTS idx_integration_data_type ON public.integration_data(data_type);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_connection ON public.integration_sync_logs(connection_id);

-- Vendor Indexes
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON public.vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_criticality ON public.vendors(criticality);
CREATE INDEX IF NOT EXISTS idx_vendor_assessments_vendor ON public.vendor_assessments(vendor_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_assessments ENABLE ROW LEVEL SECURITY;

-- Tenant Access Policy Function
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT tenant_id FROM public.tenant_members
    WHERE user_id = auth.uid() AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for Tenants
CREATE POLICY "Users can view their tenants" ON public.tenants
    FOR SELECT USING (id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Owners can update their tenants" ON public.tenants
    FOR UPDATE USING (
        id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
        )
    );

-- RLS Policies for Tenant Members
CREATE POLICY "Users can view members of their tenants" ON public.tenant_members
    FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Admins can manage tenant members" ON public.tenant_members
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
        )
    );

-- RLS Policies for Audit Logs
CREATE POLICY "Users can view audit logs of their tenants" ON public.tenant_audit_logs
    FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "System can insert audit logs" ON public.tenant_audit_logs
    FOR INSERT WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- RLS Policies for Evidence Items
CREATE POLICY "Users can view evidence in their tenants" ON public.evidence_items
    FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Users can create evidence in their tenants" ON public.evidence_items
    FOR INSERT WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Users can update evidence in their tenants" ON public.evidence_items
    FOR UPDATE USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- RLS Policies for Evidence Versions
CREATE POLICY "Users can view evidence versions" ON public.evidence_versions
    FOR SELECT USING (
        evidence_id IN (
            SELECT id FROM public.evidence_items WHERE tenant_id IN (SELECT public.get_user_tenant_ids())
        )
    );

CREATE POLICY "Users can create evidence versions" ON public.evidence_versions
    FOR INSERT WITH CHECK (
        evidence_id IN (
            SELECT id FROM public.evidence_items WHERE tenant_id IN (SELECT public.get_user_tenant_ids())
        )
    );

-- RLS Policies for Evidence Files
CREATE POLICY "Users can view evidence files" ON public.evidence_files
    FOR SELECT USING (
        evidence_id IN (
            SELECT id FROM public.evidence_items WHERE tenant_id IN (SELECT public.get_user_tenant_ids())
        )
    );

CREATE POLICY "Users can upload evidence files" ON public.evidence_files
    FOR INSERT WITH CHECK (
        evidence_id IN (
            SELECT id FROM public.evidence_items WHERE tenant_id IN (SELECT public.get_user_tenant_ids())
        )
    );

-- RLS Policies for Integration Connections
CREATE POLICY "Users can view integration connections" ON public.integration_connections
    FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Admins can manage integration connections" ON public.integration_connections
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
        )
    );

-- RLS Policies for Integration Data
CREATE POLICY "Users can view integration data" ON public.integration_data
    FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- RLS Policies for Vendors
CREATE POLICY "Users can view vendors" ON public.vendors
    FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Users can manage vendors" ON public.vendors
    FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- RLS Policies for Vendor Assessments
CREATE POLICY "Users can view vendor assessments" ON public.vendor_assessments
    FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Users can manage vendor assessments" ON public.vendor_assessments
    FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_members_updated_at BEFORE UPDATE ON public.tenant_members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evidence_items_updated_at BEFORE UPDATE ON public.evidence_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integration_connections_updated_at BEFORE UPDATE ON public.integration_connections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integration_data_updated_at BEFORE UPDATE ON public.integration_data
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendor_assessments_updated_at BEFORE UPDATE ON public.vendor_assessments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Evidence search vector trigger
CREATE OR REPLACE FUNCTION public.update_evidence_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector = to_tsvector('english',
        COALESCE(NEW.title, '') || ' ' ||
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE(array_to_string(NEW.tags, ' '), '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_evidence_search BEFORE INSERT OR UPDATE ON public.evidence_items
    FOR EACH ROW EXECUTE FUNCTION public.update_evidence_search_vector();

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage bucket for evidence files (if using Supabase Storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'evidence',
    'evidence',
    false,
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain', 'text/csv', 'application/json', 'application/zip']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS for evidence bucket
CREATE POLICY "Users can upload evidence files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'evidence' AND
        (storage.foldername(name))[1] IN (SELECT id::text FROM public.get_user_tenant_ids())
    );

CREATE POLICY "Users can view evidence files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'evidence' AND
        (storage.foldername(name))[1] IN (SELECT id::text FROM public.get_user_tenant_ids())
    );

CREATE POLICY "Users can delete evidence files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'evidence' AND
        (storage.foldername(name))[1] IN (SELECT id::text FROM public.get_user_tenant_ids())
    );
