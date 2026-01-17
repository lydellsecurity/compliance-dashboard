-- Migration: Fix Organization RLS policies
-- Created: 2026-01-17
-- Description: Fixes RLS policies for organizations and organization_members to work properly

-- ============================================================================
-- FIX ORGANIZATION_MEMBERS RLS
-- ============================================================================

-- First, let users view their own memberships (critical for other RLS policies to work)
DROP POLICY IF EXISTS "Users can view their memberships" ON public.organization_members;
CREATE POLICY "Users can view their memberships" ON public.organization_members
    FOR SELECT USING (user_id = auth.uid());

-- Allow users to view memberships of organizations they belong to
DROP POLICY IF EXISTS "Users can view org members" ON public.organization_members;
CREATE POLICY "Users can view org members" ON public.organization_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- FIX ORGANIZATIONS RLS - Remove conflicting policies
-- ============================================================================

-- Drop the "public can view" policy that might interfere
DROP POLICY IF EXISTS "Public can view org by slug" ON public.organizations;

-- Recreate a proper organizations SELECT policy
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
CREATE POLICY "Users can view their organizations" ON public.organizations
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND (
            id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
        )
    );

-- For Trust Center (unauthenticated access), we'll handle this at the app level
-- or create a separate public view function

-- ============================================================================
-- ENSURE organization_members allows INSERT for self-registration
-- ============================================================================

-- This should already exist from previous migration, but ensure it's there
DROP POLICY IF EXISTS "Users can add themselves" ON public.organization_members;
CREATE POLICY "Users can add themselves" ON public.organization_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow users to update their own membership (e.g., set is_default)
DROP POLICY IF EXISTS "Users can update own membership" ON public.organization_members;
CREATE POLICY "Users can update own membership" ON public.organization_members
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- SIMPLIFY VENDORS RLS - Only check organization_members
-- ============================================================================

-- Since the app uses organization_id (passed as tenant_id),
-- and users are in organization_members, we only need to check organization_members

DROP POLICY IF EXISTS "Users can view vendors" ON public.vendors;
CREATE POLICY "Users can view vendors" ON public.vendors
    FOR SELECT USING (
        tenant_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert vendors" ON public.vendors;
CREATE POLICY "Users can insert vendors" ON public.vendors
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update vendors" ON public.vendors;
CREATE POLICY "Users can update vendors" ON public.vendors
    FOR UPDATE USING (
        tenant_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete vendors" ON public.vendors;
CREATE POLICY "Users can delete vendors" ON public.vendors
    FOR DELETE USING (
        tenant_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    );

-- ============================================================================
-- FIX VENDOR_ASSESSMENTS RLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view vendor assessments" ON public.vendor_assessments;
CREATE POLICY "Users can view vendor assessments" ON public.vendor_assessments
    FOR SELECT USING (
        tenant_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can manage vendor assessments" ON public.vendor_assessments;
CREATE POLICY "Users can manage vendor assessments" ON public.vendor_assessments
    FOR ALL USING (
        tenant_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    );
