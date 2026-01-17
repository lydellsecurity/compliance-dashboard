-- Migration: Comprehensive Schema Fix
-- Created: 2026-01-17
-- Description: Fixes all identified schema issues, RLS policies, and edge cases

-- ============================================================================
-- PART 1: FIX user_responses.answer TO ALLOW NULL
-- ============================================================================

-- The answer column needs to allow NULL for initial/pending responses
-- First drop the constraint if it exists
ALTER TABLE public.user_responses
    DROP CONSTRAINT IF EXISTS user_responses_answer_check;

-- Recreate with NULL allowed
ALTER TABLE public.user_responses
    ADD CONSTRAINT user_responses_answer_check
    CHECK (answer IS NULL OR answer IN ('yes', 'no', 'partial', 'na'));

-- ============================================================================
-- PART 2: ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite index for user_responses upserts
CREATE INDEX IF NOT EXISTS idx_user_responses_org_control
    ON public.user_responses(organization_id, control_id);

-- Index for vendor_assessments common query pattern
CREATE INDEX IF NOT EXISTS idx_vendor_assessments_vendor_created
    ON public.vendor_assessments(vendor_id, created_at DESC);

-- Index for audit_log user_id queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id
    ON public.audit_log(user_id);

-- ============================================================================
-- PART 3: CREATE SECURITY DEFINER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to safely get user's organization IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid();
$$;

-- Function to check if user belongs to an organization (for RLS policies)
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE user_id = auth.uid() AND organization_id = org_id
    );
$$;

-- ============================================================================
-- PART 4: FIX user_responses RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view user responses" ON public.user_responses;
DROP POLICY IF EXISTS "Users can insert user responses" ON public.user_responses;
DROP POLICY IF EXISTS "Users can update user responses" ON public.user_responses;
DROP POLICY IF EXISTS "user_responses_select" ON public.user_responses;
DROP POLICY IF EXISTS "user_responses_insert" ON public.user_responses;
DROP POLICY IF EXISTS "user_responses_update" ON public.user_responses;

-- Create new non-recursive policies using the security definer function
CREATE POLICY "user_responses_select" ON public.user_responses
    FOR SELECT USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "user_responses_insert" ON public.user_responses
    FOR INSERT WITH CHECK (public.user_belongs_to_org(organization_id));

CREATE POLICY "user_responses_update" ON public.user_responses
    FOR UPDATE USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "user_responses_delete" ON public.user_responses
    FOR DELETE USING (public.user_belongs_to_org(organization_id));

-- ============================================================================
-- PART 5: FIX evidence_records RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view evidence" ON public.evidence_records;
DROP POLICY IF EXISTS "Users can insert evidence" ON public.evidence_records;
DROP POLICY IF EXISTS "Users can update evidence" ON public.evidence_records;
DROP POLICY IF EXISTS "evidence_records_select" ON public.evidence_records;
DROP POLICY IF EXISTS "evidence_records_insert" ON public.evidence_records;
DROP POLICY IF EXISTS "evidence_records_update" ON public.evidence_records;

CREATE POLICY "evidence_records_select" ON public.evidence_records
    FOR SELECT USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "evidence_records_insert" ON public.evidence_records
    FOR INSERT WITH CHECK (public.user_belongs_to_org(organization_id));

CREATE POLICY "evidence_records_update" ON public.evidence_records
    FOR UPDATE USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "evidence_records_delete" ON public.evidence_records
    FOR DELETE USING (public.user_belongs_to_org(organization_id));

-- ============================================================================
-- PART 6: FIX custom_controls RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view custom controls" ON public.custom_controls;
DROP POLICY IF EXISTS "Users can manage custom controls" ON public.custom_controls;
DROP POLICY IF EXISTS "custom_controls_select" ON public.custom_controls;
DROP POLICY IF EXISTS "custom_controls_all" ON public.custom_controls;

CREATE POLICY "custom_controls_select" ON public.custom_controls
    FOR SELECT USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "custom_controls_insert" ON public.custom_controls
    FOR INSERT WITH CHECK (public.user_belongs_to_org(organization_id));

CREATE POLICY "custom_controls_update" ON public.custom_controls
    FOR UPDATE USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "custom_controls_delete" ON public.custom_controls
    FOR DELETE USING (public.user_belongs_to_org(organization_id));

-- ============================================================================
-- PART 7: FIX control_responses RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view control responses" ON public.control_responses;
DROP POLICY IF EXISTS "Users can insert control responses" ON public.control_responses;
DROP POLICY IF EXISTS "Users can update control responses" ON public.control_responses;
DROP POLICY IF EXISTS "control_responses_select" ON public.control_responses;
DROP POLICY IF EXISTS "control_responses_insert" ON public.control_responses;
DROP POLICY IF EXISTS "control_responses_update" ON public.control_responses;

CREATE POLICY "control_responses_select" ON public.control_responses
    FOR SELECT USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "control_responses_insert" ON public.control_responses
    FOR INSERT WITH CHECK (public.user_belongs_to_org(organization_id));

CREATE POLICY "control_responses_update" ON public.control_responses
    FOR UPDATE USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "control_responses_delete" ON public.control_responses
    FOR DELETE USING (public.user_belongs_to_org(organization_id));

-- ============================================================================
-- PART 8: FIX sync_notifications RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view sync notifications" ON public.sync_notifications;
DROP POLICY IF EXISTS "sync_notifications_select" ON public.sync_notifications;
DROP POLICY IF EXISTS "sync_notifications_insert" ON public.sync_notifications;
DROP POLICY IF EXISTS "sync_notifications_update" ON public.sync_notifications;

CREATE POLICY "sync_notifications_select" ON public.sync_notifications
    FOR SELECT USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "sync_notifications_insert" ON public.sync_notifications
    FOR INSERT WITH CHECK (public.user_belongs_to_org(organization_id));

CREATE POLICY "sync_notifications_update" ON public.sync_notifications
    FOR UPDATE USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "sync_notifications_delete" ON public.sync_notifications
    FOR DELETE USING (public.user_belongs_to_org(organization_id));

-- ============================================================================
-- PART 9: FIX trust_center_tokens RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view trust center tokens" ON public.trust_center_tokens;
DROP POLICY IF EXISTS "Users can manage trust center tokens" ON public.trust_center_tokens;
DROP POLICY IF EXISTS "trust_center_tokens_select" ON public.trust_center_tokens;
DROP POLICY IF EXISTS "trust_center_tokens_all" ON public.trust_center_tokens;

CREATE POLICY "trust_center_tokens_select" ON public.trust_center_tokens
    FOR SELECT USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "trust_center_tokens_insert" ON public.trust_center_tokens
    FOR INSERT WITH CHECK (public.user_belongs_to_org(organization_id));

CREATE POLICY "trust_center_tokens_update" ON public.trust_center_tokens
    FOR UPDATE USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "trust_center_tokens_delete" ON public.trust_center_tokens
    FOR DELETE USING (public.user_belongs_to_org(organization_id));

-- Also allow public SELECT by token (for Trust Center access)
DROP POLICY IF EXISTS "Public can view by token" ON public.trust_center_tokens;
CREATE POLICY "trust_center_public_select" ON public.trust_center_tokens
    FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- ============================================================================
-- PART 10: FIX organization_invites RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view invites" ON public.organization_invites;
DROP POLICY IF EXISTS "Users can manage invites" ON public.organization_invites;
DROP POLICY IF EXISTS "organization_invites_select" ON public.organization_invites;
DROP POLICY IF EXISTS "organization_invites_all" ON public.organization_invites;

-- Org members can view/manage invites for their org
CREATE POLICY "org_invites_select" ON public.organization_invites
    FOR SELECT USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "org_invites_insert" ON public.organization_invites
    FOR INSERT WITH CHECK (public.user_belongs_to_org(organization_id));

CREATE POLICY "org_invites_update" ON public.organization_invites
    FOR UPDATE USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "org_invites_delete" ON public.organization_invites
    FOR DELETE USING (public.user_belongs_to_org(organization_id));

-- Users can view invites sent to their email
CREATE POLICY "org_invites_email_select" ON public.organization_invites
    FOR SELECT USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- ============================================================================
-- PART 11: FIX vendors RLS POLICIES (use organization_id via tenant_id)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can insert vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can update vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can delete vendors" ON public.vendors;
DROP POLICY IF EXISTS "vendors_select" ON public.vendors;
DROP POLICY IF EXISTS "vendors_insert" ON public.vendors;
DROP POLICY IF EXISTS "vendors_update" ON public.vendors;
DROP POLICY IF EXISTS "vendors_delete" ON public.vendors;

-- The vendors table uses tenant_id which maps to organization_id
CREATE POLICY "vendors_select" ON public.vendors
    FOR SELECT USING (public.user_belongs_to_org(tenant_id));

CREATE POLICY "vendors_insert" ON public.vendors
    FOR INSERT WITH CHECK (public.user_belongs_to_org(tenant_id));

CREATE POLICY "vendors_update" ON public.vendors
    FOR UPDATE USING (public.user_belongs_to_org(tenant_id));

CREATE POLICY "vendors_delete" ON public.vendors
    FOR DELETE USING (public.user_belongs_to_org(tenant_id));

-- ============================================================================
-- PART 12: FIX vendor_assessments RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view vendor assessments" ON public.vendor_assessments;
DROP POLICY IF EXISTS "Users can manage vendor assessments" ON public.vendor_assessments;
DROP POLICY IF EXISTS "vendor_assessments_select" ON public.vendor_assessments;
DROP POLICY IF EXISTS "vendor_assessments_all" ON public.vendor_assessments;

CREATE POLICY "vendor_assessments_select" ON public.vendor_assessments
    FOR SELECT USING (public.user_belongs_to_org(tenant_id));

CREATE POLICY "vendor_assessments_insert" ON public.vendor_assessments
    FOR INSERT WITH CHECK (public.user_belongs_to_org(tenant_id));

CREATE POLICY "vendor_assessments_update" ON public.vendor_assessments
    FOR UPDATE USING (public.user_belongs_to_org(tenant_id));

CREATE POLICY "vendor_assessments_delete" ON public.vendor_assessments
    FOR DELETE USING (public.user_belongs_to_org(tenant_id));

-- ============================================================================
-- PART 13: FIX profiles RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (id = auth.uid());

-- Users can view profiles in their organizations
CREATE POLICY "profiles_select_org" ON public.profiles
    FOR SELECT USING (
        organization_id IS NOT NULL
        AND public.user_belongs_to_org(organization_id)
    );

-- Users can insert their own profile
CREATE POLICY "profiles_insert" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update" ON public.profiles
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ============================================================================
-- PART 14: ENSURE organizations INSERT POLICY EXISTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
CREATE POLICY "orgs_insert" ON public.organizations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure UPDATE policy for organization owners
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;
CREATE POLICY "orgs_update" ON public.organizations
    FOR UPDATE USING (
        id IN (SELECT public.get_my_organization_ids())
    );

-- ============================================================================
-- PART 15: GRANT EXECUTE ON FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_my_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_org(UUID) TO authenticated;
