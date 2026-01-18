-- ============================================================================
-- FIX EVIDENCE_ITEMS SCHEMA TO MATCH SERVICE CODE
-- ============================================================================
--
-- The evidence-repository.service.ts expects columns that don't exist in the
-- current schema. This migration adds the missing columns and relaxes constraints
-- to allow the service to work correctly.
--

-- ============================================================================
-- ADD MISSING COLUMNS
-- ============================================================================

-- Add control_id for single control reference (service uses this)
ALTER TABLE public.evidence_items
    ADD COLUMN IF NOT EXISTS control_id TEXT;

-- Add source column (service expects this)
ALTER TABLE public.evidence_items
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add current_version column (service expects integer, not UUID reference)
ALTER TABLE public.evidence_items
    ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;

-- Add framework_mappings column (service uses this name)
ALTER TABLE public.evidence_items
    ADD COLUMN IF NOT EXISTS framework_mappings TEXT[] DEFAULT '{}';

-- ============================================================================
-- RELAX TYPE CONSTRAINT TO ALLOW 'assessment' AND OTHER VALUES
-- ============================================================================

-- Drop existing type constraint
ALTER TABLE public.evidence_items
    DROP CONSTRAINT IF EXISTS evidence_items_type_check;

-- Add new constraint with expanded allowed values
ALTER TABLE public.evidence_items
    ADD CONSTRAINT evidence_items_type_check
    CHECK (type IN ('document', 'screenshot', 'log', 'configuration', 'report', 'policy', 'procedure', 'certificate', 'assessment', 'automated', 'other'));

-- ============================================================================
-- RELAX STATUS CONSTRAINT TO ALLOW 'review' AND 'final'
-- ============================================================================

-- Drop existing status constraint
ALTER TABLE public.evidence_items
    DROP CONSTRAINT IF EXISTS evidence_items_status_check;

-- Add new constraint with expanded allowed values (mapping: review -> pending_review, final -> approved)
ALTER TABLE public.evidence_items
    ADD CONSTRAINT evidence_items_status_check
    CHECK (status IN ('draft', 'review', 'pending_review', 'approved', 'final', 'rejected', 'expired', 'archived'));

-- ============================================================================
-- MAKE CATEGORY OPTIONAL (service doesn't always provide it)
-- ============================================================================

-- Allow NULL for category (drop NOT NULL constraint if it exists)
ALTER TABLE public.evidence_items
    ALTER COLUMN category DROP NOT NULL;

-- Set default category
ALTER TABLE public.evidence_items
    ALTER COLUMN category SET DEFAULT 'general';

-- ============================================================================
-- CREATE INDEXES FOR NEW COLUMNS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_evidence_items_control_id
    ON public.evidence_items(control_id);

CREATE INDEX IF NOT EXISTS idx_evidence_items_source
    ON public.evidence_items(source);

-- ============================================================================
-- SYNC CONTROL_ID FROM CONTROL_IDS ARRAY (for existing records)
-- ============================================================================

-- If control_ids array has values, use the first one for control_id
UPDATE public.evidence_items
SET control_id = control_ids[1]
WHERE control_id IS NULL AND control_ids IS NOT NULL AND array_length(control_ids, 1) > 0;

-- ============================================================================
-- SYNC FRAMEWORK_MAPPINGS FROM FRAMEWORK_IDS (for existing records)
-- ============================================================================

UPDATE public.evidence_items
SET framework_mappings = framework_ids
WHERE framework_mappings = '{}' AND framework_ids IS NOT NULL AND array_length(framework_ids, 1) > 0;

-- ============================================================================
-- FIX EVIDENCE_VERSIONS TABLE
-- ============================================================================

-- Add 'version' column as alias for 'version_number' (service uses 'version')
ALTER TABLE public.evidence_versions
    ADD COLUMN IF NOT EXISTS version INTEGER;

-- Sync version from version_number
UPDATE public.evidence_versions
SET version = version_number
WHERE version IS NULL AND version_number IS NOT NULL;

-- Add 'notes' column (service uses this instead of change_summary)
ALTER TABLE public.evidence_versions
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- Sync notes from change_summary
UPDATE public.evidence_versions
SET notes = change_summary
WHERE notes IS NULL AND change_summary IS NOT NULL;

-- Relax status constraint for evidence_versions to allow 'draft', 'review', 'final'
ALTER TABLE public.evidence_versions
    DROP CONSTRAINT IF EXISTS evidence_versions_status_check;

ALTER TABLE public.evidence_versions
    ADD CONSTRAINT evidence_versions_status_check
    CHECK (status IN ('pending', 'draft', 'review', 'approved', 'final', 'rejected'));

-- ============================================================================
-- FIX EVIDENCE_FILES TABLE (if it exists)
-- ============================================================================

-- Add original_name column (service expects this, schema has original_filename)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evidence_files') THEN
        ALTER TABLE public.evidence_files
            ADD COLUMN IF NOT EXISTS original_name TEXT;

        -- Sync from original_filename
        UPDATE public.evidence_files
        SET original_name = original_filename
        WHERE original_name IS NULL AND original_filename IS NOT NULL;

        -- Add size column (service uses 'size', schema has 'size_bytes')
        ALTER TABLE public.evidence_files
            ADD COLUMN IF NOT EXISTS size BIGINT;

        UPDATE public.evidence_files
        SET size = size_bytes
        WHERE size IS NULL AND size_bytes IS NOT NULL;

        -- Add url column (service expects this)
        ALTER TABLE public.evidence_files
            ADD COLUMN IF NOT EXISTS url TEXT;

        -- Add uploaded_at column (alias for created_at)
        ALTER TABLE public.evidence_files
            ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ;

        UPDATE public.evidence_files
        SET uploaded_at = created_at
        WHERE uploaded_at IS NULL AND created_at IS NOT NULL;
    END IF;
END $$;
