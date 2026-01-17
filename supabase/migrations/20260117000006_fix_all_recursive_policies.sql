-- Migration: Complete fix for all recursive RLS policies
-- Created: 2026-01-17
-- Description: Removes ALL policies that could cause recursion and recreates them safely

-- ============================================================================
-- STEP 1: DROP ALL organization_members POLICIES
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'organization_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.organization_members', pol.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: DROP ALL audit_log POLICIES
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'audit_log'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_log', pol.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 3: CREATE SIMPLE organization_members POLICIES (no recursion possible)
-- ============================================================================

-- Simple policy: users can only see/modify their OWN rows
CREATE POLICY "org_members_select" ON public.organization_members
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "org_members_insert" ON public.organization_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "org_members_update" ON public.organization_members
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "org_members_delete" ON public.organization_members
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- STEP 4: CREATE SIMPLE audit_log POLICIES (no reference to organization_members)
-- ============================================================================

-- Allow any authenticated user to insert audit logs
CREATE POLICY "audit_log_insert" ON public.audit_log
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can only view audit logs they created or where they're the user_id
CREATE POLICY "audit_log_select" ON public.audit_log
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND (user_id = auth.uid() OR user_id IS NULL)
    );

-- ============================================================================
-- STEP 5: FIX organizations SELECT POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;

-- Use a function to get organization IDs to avoid inline recursion
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

-- Now the organizations policy uses the function (SECURITY DEFINER bypasses RLS)
CREATE POLICY "orgs_select_own" ON public.organizations
    FOR SELECT USING (
        id IN (SELECT public.get_my_organization_ids())
    );
