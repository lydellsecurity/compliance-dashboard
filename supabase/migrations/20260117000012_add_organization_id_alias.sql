-- Migration: Add organization_id alias column to tables that use tenant_id
-- Created: 2026-01-17
-- Description: Add organization_id column as alias for tenant_id for consistency with app code

-- ============================================================================
-- ADD organization_id COLUMN TO integration_connections
-- ============================================================================

-- Add organization_id column if it doesn't exist
ALTER TABLE public.integration_connections
    ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Copy tenant_id values to organization_id for existing rows
UPDATE public.integration_connections
SET organization_id = tenant_id
WHERE organization_id IS NULL AND tenant_id IS NOT NULL;

-- Create trigger to keep them in sync (organization_id takes precedence)
CREATE OR REPLACE FUNCTION sync_tenant_org_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If organization_id is set, copy to tenant_id
    IF NEW.organization_id IS NOT NULL AND NEW.tenant_id IS NULL THEN
        NEW.tenant_id := NEW.organization_id;
    -- If tenant_id is set but organization_id isn't, copy to organization_id
    ELSIF NEW.tenant_id IS NOT NULL AND NEW.organization_id IS NULL THEN
        NEW.organization_id := NEW.tenant_id;
    -- If both are set but different, prefer organization_id
    ELSIF NEW.organization_id IS NOT NULL AND NEW.tenant_id IS NOT NULL AND NEW.organization_id != NEW.tenant_id THEN
        NEW.tenant_id := NEW.organization_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to integration_connections
DROP TRIGGER IF EXISTS sync_integration_connections_org_id ON public.integration_connections;
CREATE TRIGGER sync_integration_connections_org_id
    BEFORE INSERT OR UPDATE ON public.integration_connections
    FOR EACH ROW EXECUTE FUNCTION sync_tenant_org_id();

-- Add index on organization_id
CREATE INDEX IF NOT EXISTS idx_integration_connections_org_id
    ON public.integration_connections(organization_id);

-- ============================================================================
-- ADD organization_id COLUMN TO integration_data
-- ============================================================================

ALTER TABLE public.integration_data
    ADD COLUMN IF NOT EXISTS organization_id UUID;

UPDATE public.integration_data
SET organization_id = tenant_id
WHERE organization_id IS NULL AND tenant_id IS NOT NULL;

DROP TRIGGER IF EXISTS sync_integration_data_org_id ON public.integration_data;
CREATE TRIGGER sync_integration_data_org_id
    BEFORE INSERT OR UPDATE ON public.integration_data
    FOR EACH ROW EXECUTE FUNCTION sync_tenant_org_id();

CREATE INDEX IF NOT EXISTS idx_integration_data_org_id
    ON public.integration_data(organization_id);

-- ============================================================================
-- ADD organization_id COLUMN TO integration_webhooks
-- ============================================================================

ALTER TABLE public.integration_webhooks
    ADD COLUMN IF NOT EXISTS organization_id UUID;

UPDATE public.integration_webhooks
SET organization_id = tenant_id
WHERE organization_id IS NULL AND tenant_id IS NOT NULL;

DROP TRIGGER IF EXISTS sync_integration_webhooks_org_id ON public.integration_webhooks;
CREATE TRIGGER sync_integration_webhooks_org_id
    BEFORE INSERT OR UPDATE ON public.integration_webhooks
    FOR EACH ROW EXECUTE FUNCTION sync_tenant_org_id();

CREATE INDEX IF NOT EXISTS idx_integration_webhooks_org_id
    ON public.integration_webhooks(organization_id);

-- ============================================================================
-- ADD organization_id COLUMN TO integration_sync_logs
-- ============================================================================

ALTER TABLE public.integration_sync_logs
    ADD COLUMN IF NOT EXISTS organization_id UUID;

UPDATE public.integration_sync_logs
SET organization_id = tenant_id
WHERE organization_id IS NULL AND tenant_id IS NOT NULL;

DROP TRIGGER IF EXISTS sync_integration_sync_logs_org_id ON public.integration_sync_logs;
CREATE TRIGGER sync_integration_sync_logs_org_id
    BEFORE INSERT OR UPDATE ON public.integration_sync_logs
    FOR EACH ROW EXECUTE FUNCTION sync_tenant_org_id();

CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_org_id
    ON public.integration_sync_logs(organization_id);

-- ============================================================================
-- ADD organization_id COLUMN TO evidence_items
-- ============================================================================

ALTER TABLE public.evidence_items
    ADD COLUMN IF NOT EXISTS organization_id UUID;

UPDATE public.evidence_items
SET organization_id = tenant_id
WHERE organization_id IS NULL AND tenant_id IS NOT NULL;

DROP TRIGGER IF EXISTS sync_evidence_items_org_id ON public.evidence_items;
CREATE TRIGGER sync_evidence_items_org_id
    BEFORE INSERT OR UPDATE ON public.evidence_items
    FOR EACH ROW EXECUTE FUNCTION sync_tenant_org_id();

CREATE INDEX IF NOT EXISTS idx_evidence_items_org_id
    ON public.evidence_items(organization_id);

-- ============================================================================
-- ADD organization_id COLUMN TO retention_policies
-- ============================================================================

ALTER TABLE public.retention_policies
    ADD COLUMN IF NOT EXISTS organization_id UUID;

UPDATE public.retention_policies
SET organization_id = tenant_id
WHERE organization_id IS NULL AND tenant_id IS NOT NULL;

DROP TRIGGER IF EXISTS sync_retention_policies_org_id ON public.retention_policies;
CREATE TRIGGER sync_retention_policies_org_id
    BEFORE INSERT OR UPDATE ON public.retention_policies
    FOR EACH ROW EXECUTE FUNCTION sync_tenant_org_id();

CREATE INDEX IF NOT EXISTS idx_retention_policies_org_id
    ON public.retention_policies(organization_id);

-- ============================================================================
-- UPDATE RLS POLICIES FOR THESE TABLES
-- ============================================================================

-- integration_connections RLS
DROP POLICY IF EXISTS "integration_connections_select" ON public.integration_connections;
DROP POLICY IF EXISTS "integration_connections_insert" ON public.integration_connections;
DROP POLICY IF EXISTS "integration_connections_update" ON public.integration_connections;
DROP POLICY IF EXISTS "integration_connections_delete" ON public.integration_connections;

CREATE POLICY "integration_connections_select" ON public.integration_connections
    FOR SELECT USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "integration_connections_insert" ON public.integration_connections
    FOR INSERT WITH CHECK (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "integration_connections_update" ON public.integration_connections
    FOR UPDATE USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "integration_connections_delete" ON public.integration_connections
    FOR DELETE USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

-- integration_data RLS
DROP POLICY IF EXISTS "integration_data_select" ON public.integration_data;
DROP POLICY IF EXISTS "integration_data_insert" ON public.integration_data;
DROP POLICY IF EXISTS "integration_data_update" ON public.integration_data;
DROP POLICY IF EXISTS "integration_data_delete" ON public.integration_data;

CREATE POLICY "integration_data_select" ON public.integration_data
    FOR SELECT USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "integration_data_insert" ON public.integration_data
    FOR INSERT WITH CHECK (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "integration_data_update" ON public.integration_data
    FOR UPDATE USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "integration_data_delete" ON public.integration_data
    FOR DELETE USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

-- integration_webhooks RLS
DROP POLICY IF EXISTS "integration_webhooks_select" ON public.integration_webhooks;
DROP POLICY IF EXISTS "integration_webhooks_insert" ON public.integration_webhooks;
DROP POLICY IF EXISTS "integration_webhooks_update" ON public.integration_webhooks;
DROP POLICY IF EXISTS "integration_webhooks_delete" ON public.integration_webhooks;

CREATE POLICY "integration_webhooks_select" ON public.integration_webhooks
    FOR SELECT USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "integration_webhooks_insert" ON public.integration_webhooks
    FOR INSERT WITH CHECK (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "integration_webhooks_update" ON public.integration_webhooks
    FOR UPDATE USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "integration_webhooks_delete" ON public.integration_webhooks
    FOR DELETE USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

-- integration_sync_logs RLS
DROP POLICY IF EXISTS "integration_sync_logs_select" ON public.integration_sync_logs;
DROP POLICY IF EXISTS "integration_sync_logs_insert" ON public.integration_sync_logs;
DROP POLICY IF EXISTS "integration_sync_logs_update" ON public.integration_sync_logs;
DROP POLICY IF EXISTS "integration_sync_logs_delete" ON public.integration_sync_logs;

CREATE POLICY "integration_sync_logs_select" ON public.integration_sync_logs
    FOR SELECT USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "integration_sync_logs_insert" ON public.integration_sync_logs
    FOR INSERT WITH CHECK (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "integration_sync_logs_update" ON public.integration_sync_logs
    FOR UPDATE USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "integration_sync_logs_delete" ON public.integration_sync_logs
    FOR DELETE USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

-- evidence_items RLS
DROP POLICY IF EXISTS "evidence_items_select" ON public.evidence_items;
DROP POLICY IF EXISTS "evidence_items_insert" ON public.evidence_items;
DROP POLICY IF EXISTS "evidence_items_update" ON public.evidence_items;
DROP POLICY IF EXISTS "evidence_items_delete" ON public.evidence_items;

CREATE POLICY "evidence_items_select" ON public.evidence_items
    FOR SELECT USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "evidence_items_insert" ON public.evidence_items
    FOR INSERT WITH CHECK (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "evidence_items_update" ON public.evidence_items
    FOR UPDATE USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "evidence_items_delete" ON public.evidence_items
    FOR DELETE USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

-- retention_policies RLS
DROP POLICY IF EXISTS "retention_policies_select" ON public.retention_policies;
DROP POLICY IF EXISTS "retention_policies_insert" ON public.retention_policies;
DROP POLICY IF EXISTS "retention_policies_update" ON public.retention_policies;
DROP POLICY IF EXISTS "retention_policies_delete" ON public.retention_policies;

CREATE POLICY "retention_policies_select" ON public.retention_policies
    FOR SELECT USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "retention_policies_insert" ON public.retention_policies
    FOR INSERT WITH CHECK (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "retention_policies_update" ON public.retention_policies
    FOR UPDATE USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));

CREATE POLICY "retention_policies_delete" ON public.retention_policies
    FOR DELETE USING (public.user_belongs_to_org(COALESCE(organization_id, tenant_id)));
