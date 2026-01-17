-- Migration: Fix vendors foreign key constraint
-- Created: 2026-01-17
-- Description: Change vendors.tenant_id to reference organizations instead of tenants

-- ============================================================================
-- DROP FOREIGN KEY CONSTRAINTS THAT REFERENCE tenants TABLE
-- ============================================================================

-- Drop the foreign key constraint on vendors
ALTER TABLE public.vendors
    DROP CONSTRAINT IF EXISTS vendors_tenant_id_fkey;

-- Drop the foreign key constraint on vendor_assessments
ALTER TABLE public.vendor_assessments
    DROP CONSTRAINT IF EXISTS vendor_assessments_tenant_id_fkey;

-- ============================================================================
-- ADD NEW FOREIGN KEY CONSTRAINTS REFERENCING organizations
-- ============================================================================

-- Add foreign key to organizations (optional, for data integrity)
-- Using ON DELETE CASCADE so when org is deleted, vendors are too
ALTER TABLE public.vendors
    ADD CONSTRAINT vendors_organization_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.vendor_assessments
    ADD CONSTRAINT vendor_assessments_organization_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ============================================================================
-- ALSO FIX OTHER TABLES THAT REFERENCE tenants (only if they have tenant_id)
-- ============================================================================

-- Use DO blocks to conditionally modify constraints only if tenant_id column exists

DO $$
BEGIN
    -- evidence_items
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence_items' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.evidence_items DROP CONSTRAINT IF EXISTS evidence_items_tenant_id_fkey;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'evidence_items_organization_id_fkey') THEN
            ALTER TABLE public.evidence_items
                ADD CONSTRAINT evidence_items_organization_id_fkey
                FOREIGN KEY (tenant_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    -- integration_connections
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integration_connections' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.integration_connections DROP CONSTRAINT IF EXISTS integration_connections_tenant_id_fkey;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'integration_connections_organization_id_fkey') THEN
            ALTER TABLE public.integration_connections
                ADD CONSTRAINT integration_connections_organization_id_fkey
                FOREIGN KEY (tenant_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    -- integration_data
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integration_data' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.integration_data DROP CONSTRAINT IF EXISTS integration_data_tenant_id_fkey;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'integration_data_organization_id_fkey') THEN
            ALTER TABLE public.integration_data
                ADD CONSTRAINT integration_data_organization_id_fkey
                FOREIGN KEY (tenant_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    -- integration_webhooks
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integration_webhooks' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.integration_webhooks DROP CONSTRAINT IF EXISTS integration_webhooks_tenant_id_fkey;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'integration_webhooks_organization_id_fkey') THEN
            ALTER TABLE public.integration_webhooks
                ADD CONSTRAINT integration_webhooks_organization_id_fkey
                FOREIGN KEY (tenant_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    -- integration_sync_logs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integration_sync_logs' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.integration_sync_logs DROP CONSTRAINT IF EXISTS integration_sync_logs_tenant_id_fkey;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'integration_sync_logs_organization_id_fkey') THEN
            ALTER TABLE public.integration_sync_logs
                ADD CONSTRAINT integration_sync_logs_organization_id_fkey
                FOREIGN KEY (tenant_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    -- retention_policies
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'retention_policies' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.retention_policies DROP CONSTRAINT IF EXISTS retention_policies_tenant_id_fkey;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'retention_policies_organization_id_fkey') THEN
            ALTER TABLE public.retention_policies
                ADD CONSTRAINT retention_policies_organization_id_fkey
                FOREIGN KEY (tenant_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;
