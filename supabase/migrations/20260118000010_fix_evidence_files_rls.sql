-- Migration: Fix evidence_files RLS policies
-- Purpose: Add proper Row Level Security to evidence_files table to prevent tenant bleed
-- Date: 2026-01-18

-- ============================================================================
-- CRITICAL SECURITY FIX: evidence_files tenant isolation
-- ============================================================================

-- Enable RLS on evidence_files if not already enabled
ALTER TABLE public.evidence_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to ensure clean state)
DROP POLICY IF EXISTS "evidence_files_select" ON public.evidence_files;
DROP POLICY IF EXISTS "evidence_files_insert" ON public.evidence_files;
DROP POLICY IF EXISTS "evidence_files_update" ON public.evidence_files;
DROP POLICY IF EXISTS "evidence_files_delete" ON public.evidence_files;

-- ============================================================================
-- SELECT Policy: Users can only see files belonging to their organization
-- ============================================================================
CREATE POLICY "evidence_files_select" ON public.evidence_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.evidence_items ei
            WHERE ei.id = evidence_files.evidence_id
            AND public.user_belongs_to_org(ei.organization_id)
        )
    );

-- ============================================================================
-- INSERT Policy: Users can only insert files for evidence in their organization
-- ============================================================================
CREATE POLICY "evidence_files_insert" ON public.evidence_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.evidence_items ei
            WHERE ei.id = evidence_files.evidence_id
            AND public.user_belongs_to_org(ei.organization_id)
        )
    );

-- ============================================================================
-- UPDATE Policy: Users can only update files for evidence in their organization
-- ============================================================================
CREATE POLICY "evidence_files_update" ON public.evidence_files
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.evidence_items ei
            WHERE ei.id = evidence_files.evidence_id
            AND public.user_belongs_to_org(ei.organization_id)
        )
    );

-- ============================================================================
-- DELETE Policy: Users can only delete files for evidence in their organization
-- ============================================================================
CREATE POLICY "evidence_files_delete" ON public.evidence_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.evidence_items ei
            WHERE ei.id = evidence_files.evidence_id
            AND public.user_belongs_to_org(ei.organization_id)
        )
    );

-- ============================================================================
-- Also add RLS policies for evidence_versions if not present
-- ============================================================================
ALTER TABLE public.evidence_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evidence_versions_select" ON public.evidence_versions;
DROP POLICY IF EXISTS "evidence_versions_insert" ON public.evidence_versions;
DROP POLICY IF EXISTS "evidence_versions_update" ON public.evidence_versions;
DROP POLICY IF EXISTS "evidence_versions_delete" ON public.evidence_versions;

CREATE POLICY "evidence_versions_select" ON public.evidence_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.evidence_items ei
            WHERE ei.id = evidence_versions.evidence_id
            AND public.user_belongs_to_org(ei.organization_id)
        )
    );

CREATE POLICY "evidence_versions_insert" ON public.evidence_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.evidence_items ei
            WHERE ei.id = evidence_versions.evidence_id
            AND public.user_belongs_to_org(ei.organization_id)
        )
    );

CREATE POLICY "evidence_versions_update" ON public.evidence_versions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.evidence_items ei
            WHERE ei.id = evidence_versions.evidence_id
            AND public.user_belongs_to_org(ei.organization_id)
        )
    );

CREATE POLICY "evidence_versions_delete" ON public.evidence_versions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.evidence_items ei
            WHERE ei.id = evidence_versions.evidence_id
            AND public.user_belongs_to_org(ei.organization_id)
        )
    );

-- ============================================================================
-- Add index for performance on the RLS lookup
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_evidence_files_evidence_id ON public.evidence_files(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_versions_evidence_id ON public.evidence_versions(evidence_id);

-- ============================================================================
-- Audit: Log policy creation
-- ============================================================================
COMMENT ON POLICY "evidence_files_select" ON public.evidence_files IS
    'Tenant isolation: Users can only access files for evidence belonging to their organization. Added 2026-01-18.';
COMMENT ON POLICY "evidence_files_delete" ON public.evidence_files IS
    'Critical security: Prevents cross-tenant file deletion. Added 2026-01-18.';
