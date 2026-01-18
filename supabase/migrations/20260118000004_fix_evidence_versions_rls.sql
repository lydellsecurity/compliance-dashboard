-- ============================================================================
-- FIX EVIDENCE_VERSIONS RLS POLICIES
-- ============================================================================
--
-- The evidence_versions table is missing proper RLS policies that allow
-- authenticated users to insert records when they have access to the parent
-- evidence_items record.
--

-- Enable RLS if not already enabled
ALTER TABLE public.evidence_versions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert evidence versions" ON public.evidence_versions;
DROP POLICY IF EXISTS "Users can view evidence versions" ON public.evidence_versions;
DROP POLICY IF EXISTS "Users can update evidence versions" ON public.evidence_versions;
DROP POLICY IF EXISTS "Users can delete evidence versions" ON public.evidence_versions;

-- Policy: Users can insert versions for evidence items in their organization
CREATE POLICY "Users can insert evidence versions"
ON public.evidence_versions
FOR INSERT
TO authenticated
WITH CHECK (
    evidence_id IN (
        SELECT ei.id
        FROM public.evidence_items ei
        INNER JOIN public.organization_members om ON ei.organization_id = om.organization_id
        WHERE om.user_id = auth.uid()
    )
);

-- Policy: Users can view versions for evidence items in their organization
CREATE POLICY "Users can view evidence versions"
ON public.evidence_versions
FOR SELECT
TO authenticated
USING (
    evidence_id IN (
        SELECT ei.id
        FROM public.evidence_items ei
        INNER JOIN public.organization_members om ON ei.organization_id = om.organization_id
        WHERE om.user_id = auth.uid()
    )
);

-- Policy: Users can update versions for evidence items in their organization
CREATE POLICY "Users can update evidence versions"
ON public.evidence_versions
FOR UPDATE
TO authenticated
USING (
    evidence_id IN (
        SELECT ei.id
        FROM public.evidence_items ei
        INNER JOIN public.organization_members om ON ei.organization_id = om.organization_id
        WHERE om.user_id = auth.uid()
    )
);

-- Policy: Users can delete versions for evidence items in their organization
CREATE POLICY "Users can delete evidence versions"
ON public.evidence_versions
FOR DELETE
TO authenticated
USING (
    evidence_id IN (
        SELECT ei.id
        FROM public.evidence_items ei
        INNER JOIN public.organization_members om ON ei.organization_id = om.organization_id
        WHERE om.user_id = auth.uid()
    )
);

-- ============================================================================
-- FIX EVIDENCE_FILES RLS POLICIES
-- ============================================================================
--
-- Also fix evidence_files table RLS policies to allow file uploads
--

-- Enable RLS if not already enabled
ALTER TABLE public.evidence_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert evidence files" ON public.evidence_files;
DROP POLICY IF EXISTS "Users can view evidence files" ON public.evidence_files;
DROP POLICY IF EXISTS "Users can update evidence files" ON public.evidence_files;
DROP POLICY IF EXISTS "Users can delete evidence files" ON public.evidence_files;

-- Policy: Users can insert files for versions in their organization
CREATE POLICY "Users can insert evidence files"
ON public.evidence_files
FOR INSERT
TO authenticated
WITH CHECK (
    evidence_version_id IN (
        SELECT ev.id
        FROM public.evidence_versions ev
        INNER JOIN public.evidence_items ei ON ev.evidence_id = ei.id
        INNER JOIN public.organization_members om ON ei.organization_id = om.organization_id
        WHERE om.user_id = auth.uid()
    )
);

-- Policy: Users can view files for versions in their organization
CREATE POLICY "Users can view evidence files"
ON public.evidence_files
FOR SELECT
TO authenticated
USING (
    evidence_version_id IN (
        SELECT ev.id
        FROM public.evidence_versions ev
        INNER JOIN public.evidence_items ei ON ev.evidence_id = ei.id
        INNER JOIN public.organization_members om ON ei.organization_id = om.organization_id
        WHERE om.user_id = auth.uid()
    )
);

-- Policy: Users can update files for versions in their organization
CREATE POLICY "Users can update evidence files"
ON public.evidence_files
FOR UPDATE
TO authenticated
USING (
    evidence_version_id IN (
        SELECT ev.id
        FROM public.evidence_versions ev
        INNER JOIN public.evidence_items ei ON ev.evidence_id = ei.id
        INNER JOIN public.organization_members om ON ei.organization_id = om.organization_id
        WHERE om.user_id = auth.uid()
    )
);

-- Policy: Users can delete files for versions in their organization
CREATE POLICY "Users can delete evidence files"
ON public.evidence_files
FOR DELETE
TO authenticated
USING (
    evidence_version_id IN (
        SELECT ev.id
        FROM public.evidence_versions ev
        INNER JOIN public.evidence_items ei ON ev.evidence_id = ei.id
        INNER JOIN public.organization_members om ON ei.organization_id = om.organization_id
        WHERE om.user_id = auth.uid()
    )
);
