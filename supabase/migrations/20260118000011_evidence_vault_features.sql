-- ============================================================================
-- EVIDENCE VAULT ENHANCED FEATURES MIGRATION
-- ============================================================================
--
-- This migration adds:
-- 1. Vault Audit Log table for immutable activity tracking
-- 2. Evidence integrity tracking columns
-- 3. Freshness/expiration tracking columns
-- 4. Version archive functionality
-- 5. Enhanced RLS policies for zero-trust access
--

-- ============================================================================
-- VAULT AUDIT LOG TABLE (Immutable Activity Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vault_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Context
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,

    -- Action Details
    action TEXT NOT NULL CHECK (action IN (
        'upload', 'download', 'view', 'delete', 'restore',
        'verify_integrity', 'integrity_failed', 'link_control', 'unlink_control',
        'approve', 'reject', 'archive', 'unarchive', 'expire', 'renew',
        'bulk_export', 'bulk_import', 'integration_sync', 'share', 'revoke_access'
    )),

    -- Target
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'evidence_item', 'evidence_version', 'evidence_file',
        'integration', 'export_package', 'access_grant'
    )),
    entity_id UUID,
    entity_name TEXT,

    -- Details (JSON for flexibility)
    details JSONB DEFAULT '{}'::jsonb,

    -- Context Metadata
    ip_address INET,
    user_agent TEXT,

    -- Risk/Severity
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),

    -- Immutable timestamp - cannot be updated
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Audit log should be append-only (no updates or deletes via RLS)
-- This is enforced by only having INSERT policy

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_vault_audit_log_tenant
    ON public.vault_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vault_audit_log_user
    ON public.vault_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_audit_log_action
    ON public.vault_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_vault_audit_log_entity
    ON public.vault_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_vault_audit_log_created
    ON public.vault_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_audit_log_severity
    ON public.vault_audit_log(severity) WHERE severity != 'info';

-- ============================================================================
-- EVIDENCE FILES - INTEGRITY TRACKING COLUMNS
-- ============================================================================

-- Add integrity status column
ALTER TABLE public.evidence_files
    ADD COLUMN IF NOT EXISTS integrity_status TEXT
    DEFAULT 'unchecked'
    CHECK (integrity_status IN ('verified', 'corrupted', 'missing', 'unchecked'));

-- Add last verified timestamp
ALTER TABLE public.evidence_files
    ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- Add verification count (how many times integrity has been verified)
ALTER TABLE public.evidence_files
    ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0;

-- Add last integrity check result details
ALTER TABLE public.evidence_files
    ADD COLUMN IF NOT EXISTS integrity_details JSONB DEFAULT '{}'::jsonb;

-- Index for integrity status queries
CREATE INDEX IF NOT EXISTS idx_evidence_files_integrity_status
    ON public.evidence_files(integrity_status);
CREATE INDEX IF NOT EXISTS idx_evidence_files_needs_verification
    ON public.evidence_files(last_verified_at)
    WHERE integrity_status = 'unchecked' OR last_verified_at IS NULL;

-- ============================================================================
-- EVIDENCE VERSIONS - ARCHIVE FUNCTIONALITY
-- ============================================================================

-- Add archive status column
ALTER TABLE public.evidence_versions
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Add archive metadata
ALTER TABLE public.evidence_versions
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE public.evidence_versions
    ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

ALTER TABLE public.evidence_versions
    ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Index for archive queries
CREATE INDEX IF NOT EXISTS idx_evidence_versions_archived
    ON public.evidence_versions(is_archived);
CREATE INDEX IF NOT EXISTS idx_evidence_versions_active
    ON public.evidence_versions(evidence_id, is_archived)
    WHERE is_archived = false;

-- ============================================================================
-- EVIDENCE ITEMS - FRESHNESS & EXPIRATION TRACKING
-- ============================================================================

-- Add review cycle in months (more granular than days for compliance)
ALTER TABLE public.evidence_items
    ADD COLUMN IF NOT EXISTS review_cycle_months INTEGER DEFAULT 12;

-- Add explicit expires_at column for evidence freshness
ALTER TABLE public.evidence_items
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add freshness status (computed, but stored for indexing)
ALTER TABLE public.evidence_items
    ADD COLUMN IF NOT EXISTS freshness_status TEXT
    DEFAULT 'fresh'
    CHECK (freshness_status IN ('fresh', 'expiring_soon', 'stale', 'expired'));

-- Add notification tracking
ALTER TABLE public.evidence_items
    ADD COLUMN IF NOT EXISTS expiry_notification_sent BOOLEAN DEFAULT false;

ALTER TABLE public.evidence_items
    ADD COLUMN IF NOT EXISTS expiry_notification_sent_at TIMESTAMPTZ;

-- Index for freshness queries
CREATE INDEX IF NOT EXISTS idx_evidence_items_freshness
    ON public.evidence_items(freshness_status);
CREATE INDEX IF NOT EXISTS idx_evidence_items_expires
    ON public.evidence_items(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_items_expiring_soon
    ON public.evidence_items(tenant_id, expires_at)
    WHERE freshness_status = 'expiring_soon';

-- ============================================================================
-- AUTOMATED EVIDENCE COLLECTION TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.evidence_collection_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Rule Configuration
    name TEXT NOT NULL,
    description TEXT,
    integration_id UUID REFERENCES public.integration_connections(id) ON DELETE SET NULL,

    -- Collection Settings
    source_type TEXT NOT NULL CHECK (source_type IN (
        'github', 'aws', 'azure', 'gcp', 'jira', 'confluence',
        'slack', 'okta', 'crowdstrike', 'qualys', 'nessus', 'custom'
    )),
    collection_config JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Mapping
    target_control_ids TEXT[] DEFAULT '{}',
    evidence_type TEXT NOT NULL DEFAULT 'automated',
    evidence_category TEXT NOT NULL DEFAULT 'system',

    -- Schedule
    is_active BOOLEAN DEFAULT true,
    frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN (
        'realtime', 'hourly', 'daily', 'weekly', 'monthly', 'manual'
    )),
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,

    -- Status
    last_run_status TEXT CHECK (last_run_status IN ('success', 'partial', 'failed', 'running')),
    last_run_details JSONB DEFAULT '{}'::jsonb,
    consecutive_failures INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes for collection rules
CREATE INDEX IF NOT EXISTS idx_evidence_collection_rules_tenant
    ON public.evidence_collection_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evidence_collection_rules_active
    ON public.evidence_collection_rules(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_evidence_collection_rules_next_run
    ON public.evidence_collection_rules(next_run_at) WHERE is_active = true;

-- ============================================================================
-- EVIDENCE EXPORT PACKAGES TABLE (Auditor-Ready Bundles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.evidence_export_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Package Details
    name TEXT NOT NULL,
    description TEXT,

    -- Contents
    evidence_ids UUID[] DEFAULT '{}',
    framework_ids TEXT[] DEFAULT '{}',
    control_ids TEXT[] DEFAULT '{}',

    -- Filters Applied
    filter_config JSONB DEFAULT '{}'::jsonb,

    -- Export Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'generating', 'ready', 'expired', 'failed'
    )),

    -- File Details
    file_path TEXT,
    file_size_bytes BIGINT,
    file_checksum TEXT,

    -- Statistics
    total_files INTEGER DEFAULT 0,
    total_size_bytes BIGINT DEFAULT 0,

    -- Access Control
    download_count INTEGER DEFAULT 0,
    max_downloads INTEGER,
    expires_at TIMESTAMPTZ,
    password_protected BOOLEAN DEFAULT false,
    password_hash TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    generated_at TIMESTAMPTZ,
    last_downloaded_at TIMESTAMPTZ
);

-- Indexes for export packages
CREATE INDEX IF NOT EXISTS idx_evidence_export_packages_tenant
    ON public.evidence_export_packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evidence_export_packages_status
    ON public.evidence_export_packages(status);
CREATE INDEX IF NOT EXISTS idx_evidence_export_packages_expires
    ON public.evidence_export_packages(expires_at) WHERE status = 'ready';

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.vault_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_collection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_export_packages ENABLE ROW LEVEL SECURITY;

-- Vault Audit Log Policies (Append-Only)
CREATE POLICY "Users can view audit logs of their tenants"
    ON public.vault_audit_log
    FOR SELECT
    USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "System can insert audit logs"
    ON public.vault_audit_log
    FOR INSERT
    WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- NO UPDATE or DELETE policies - audit log is immutable

-- Evidence Collection Rules Policies
CREATE POLICY "Users can view collection rules"
    ON public.evidence_collection_rules
    FOR SELECT
    USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Admins can manage collection rules"
    ON public.evidence_collection_rules
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
        )
    );

-- Evidence Export Packages Policies
CREATE POLICY "Users can view export packages"
    ON public.evidence_export_packages
    FOR SELECT
    USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Users can create export packages"
    ON public.evidence_export_packages
    FOR INSERT
    WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Users can update their export packages"
    ON public.evidence_export_packages
    FOR UPDATE
    USING (
        tenant_id IN (SELECT public.get_user_tenant_ids())
        AND created_by = auth.uid()
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger for collection rules
CREATE TRIGGER update_evidence_collection_rules_updated_at
    BEFORE UPDATE ON public.evidence_collection_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- FUNCTION: Update Freshness Status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_evidence_freshness_status()
RETURNS TRIGGER AS $$
DECLARE
    days_until_expiry INTEGER;
BEGIN
    -- Calculate days until expiry
    IF NEW.expires_at IS NOT NULL THEN
        days_until_expiry := EXTRACT(DAY FROM (NEW.expires_at - NOW()));

        IF days_until_expiry < 0 THEN
            NEW.freshness_status := 'expired';
        ELSIF days_until_expiry <= 30 THEN
            NEW.freshness_status := 'expiring_soon';
        ELSIF days_until_expiry <= 60 AND NEW.review_cycle_months <= 6 THEN
            -- For shorter review cycles, mark as stale earlier
            NEW.freshness_status := 'stale';
        ELSE
            NEW.freshness_status := 'fresh';
        END IF;
    ELSE
        -- No expiry set - use last_reviewed_at + review_cycle
        IF NEW.last_reviewed_at IS NOT NULL AND NEW.review_cycle_months IS NOT NULL THEN
            days_until_expiry := EXTRACT(DAY FROM (
                (NEW.last_reviewed_at + (NEW.review_cycle_months || ' months')::interval) - NOW()
            ));

            IF days_until_expiry < 0 THEN
                NEW.freshness_status := 'stale';
            ELSIF days_until_expiry <= 30 THEN
                NEW.freshness_status := 'expiring_soon';
            ELSE
                NEW.freshness_status := 'fresh';
            END IF;
        ELSE
            -- Default to fresh if no review cycle configured
            NEW.freshness_status := 'fresh';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply freshness trigger
CREATE TRIGGER update_evidence_freshness
    BEFORE INSERT OR UPDATE OF expires_at, last_reviewed_at, review_cycle_months
    ON public.evidence_items
    FOR EACH ROW EXECUTE FUNCTION public.update_evidence_freshness_status();

-- ============================================================================
-- FUNCTION: Log Vault Activity (Helper for service layer)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_vault_activity(
    p_tenant_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID DEFAULT NULL,
    p_entity_name TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb,
    p_severity TEXT DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.vault_audit_log (
        tenant_id, user_id, action, entity_type,
        entity_id, entity_name, details, severity
    ) VALUES (
        p_tenant_id, p_user_id, p_action, p_entity_type,
        p_entity_id, p_entity_name, p_details, p_severity
    )
    RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SCHEDULED JOB FUNCTION: Update Stale Evidence
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_stale_evidence()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Update evidence items that have become stale or expired
    WITH updated AS (
        UPDATE public.evidence_items
        SET freshness_status = CASE
            WHEN expires_at < NOW() THEN 'expired'
            WHEN expires_at < NOW() + INTERVAL '30 days' THEN 'expiring_soon'
            WHEN last_reviewed_at + (review_cycle_months || ' months')::interval < NOW() THEN 'stale'
            WHEN last_reviewed_at + (review_cycle_months || ' months')::interval < NOW() + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'fresh'
        END
        WHERE
            -- Only update if status would change
            (expires_at IS NOT NULL OR last_reviewed_at IS NOT NULL)
            AND freshness_status != CASE
                WHEN expires_at < NOW() THEN 'expired'
                WHEN expires_at < NOW() + INTERVAL '30 days' THEN 'expiring_soon'
                WHEN last_reviewed_at + (review_cycle_months || ' months')::interval < NOW() THEN 'stale'
                WHEN last_reviewed_at + (review_cycle_months || ' months')::interval < NOW() + INTERVAL '30 days' THEN 'expiring_soon'
                ELSE 'fresh'
            END
        RETURNING id
    )
    SELECT COUNT(*) INTO updated_count FROM updated;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE public.vault_audit_log IS
    'Immutable audit log for Evidence Vault activities. No updates or deletes allowed.';

COMMENT ON TABLE public.evidence_collection_rules IS
    'Automated evidence collection rules for integration with external systems.';

COMMENT ON TABLE public.evidence_export_packages IS
    'Auditor-ready export packages containing bundled evidence for compliance reviews.';

COMMENT ON FUNCTION public.log_vault_activity IS
    'Helper function to create audit log entries with proper validation.';

COMMENT ON FUNCTION public.update_stale_evidence IS
    'Scheduled function to update freshness status of evidence items.';
