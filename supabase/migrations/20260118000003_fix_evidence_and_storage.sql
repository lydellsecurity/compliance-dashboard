-- ============================================================================
-- FIX EVIDENCE SCHEMA AND CREATE STORAGE BUCKET
-- ============================================================================
--
-- This migration:
-- 1. Adds missing columns to evidence_items (source, retention_date alias)
-- 2. Creates the evidence storage bucket
-- 3. Sets up storage policies for file uploads
--

-- ============================================================================
-- ADD MISSING COLUMNS TO EVIDENCE_ITEMS
-- ============================================================================

-- Add source column (manual, aws, azure, gcp, etc.)
ALTER TABLE public.evidence_items
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add retention_date as alias for valid_until
ALTER TABLE public.evidence_items
    ADD COLUMN IF NOT EXISTS retention_date TIMESTAMPTZ;

-- Sync retention_date from valid_until for existing records
UPDATE public.evidence_items
SET retention_date = valid_until
WHERE retention_date IS NULL AND valid_until IS NOT NULL;

-- Add collected_at column
ALTER TABLE public.evidence_items
    ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ;

-- Sync collected_at from created_at for existing records
UPDATE public.evidence_items
SET collected_at = created_at
WHERE collected_at IS NULL;

-- Create index for source column
CREATE INDEX IF NOT EXISTS idx_evidence_items_source
    ON public.evidence_items(source);

-- ============================================================================
-- CREATE EVIDENCE STORAGE BUCKET
-- ============================================================================

-- Create the evidence bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'evidence',
    'evidence',
    false,
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/json', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete evidence files" ON storage.objects;

-- Policy: Authenticated users can upload files to their organization's folder
CREATE POLICY "Users can upload evidence files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] IN (
        SELECT o.id::text
        FROM public.organizations o
        INNER JOIN public.organization_members om ON o.id = om.organization_id
        WHERE om.user_id = auth.uid()
    )
);

-- Policy: Authenticated users can view files in their organization's folder
CREATE POLICY "Users can view evidence files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] IN (
        SELECT o.id::text
        FROM public.organizations o
        INNER JOIN public.organization_members om ON o.id = om.organization_id
        WHERE om.user_id = auth.uid()
    )
);

-- Policy: Authenticated users can update files in their organization's folder
CREATE POLICY "Users can update evidence files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] IN (
        SELECT o.id::text
        FROM public.organizations o
        INNER JOIN public.organization_members om ON o.id = om.organization_id
        WHERE om.user_id = auth.uid()
    )
);

-- Policy: Authenticated users can delete files in their organization's folder
CREATE POLICY "Users can delete evidence files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] IN (
        SELECT o.id::text
        FROM public.organizations o
        INNER JOIN public.organization_members om ON o.id = om.organization_id
        WHERE om.user_id = auth.uid()
    )
);

-- ============================================================================
-- FIX EVIDENCE_FILES TABLE
-- ============================================================================

-- Make sure evidence_files has evidence_version_id column (service uses this)
ALTER TABLE public.evidence_files
    ADD COLUMN IF NOT EXISTS evidence_version_id UUID REFERENCES public.evidence_versions(id) ON DELETE CASCADE;

-- Sync from version_id if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence_files' AND column_name = 'version_id') THEN
        UPDATE public.evidence_files
        SET evidence_version_id = version_id
        WHERE evidence_version_id IS NULL AND version_id IS NOT NULL;
    END IF;
END $$;

-- Add mime_type column if missing
ALTER TABLE public.evidence_files
    ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Add uploaded_by column if missing
ALTER TABLE public.evidence_files
    ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);

-- Sync uploaded_by from created_by if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence_files' AND column_name = 'created_by') THEN
        UPDATE public.evidence_files
        SET uploaded_by = created_by
        WHERE uploaded_by IS NULL AND created_by IS NOT NULL;
    END IF;
END $$;
