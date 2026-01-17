-- Migration: Fix recursive RLS policy on organization_members
-- Created: 2026-01-17
-- Description: Removes infinite recursion in organization_members RLS policies

-- ============================================================================
-- DROP ALL EXISTING organization_members POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can add themselves" ON public.organization_members;
DROP POLICY IF EXISTS "Users can update own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can insert own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Users can delete own membership" ON public.organization_members;

-- ============================================================================
-- CREATE NON-RECURSIVE POLICIES
-- ============================================================================

-- Users can view their OWN membership records (no recursion - direct check)
CREATE POLICY "Members can view own records" ON public.organization_members
    FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own membership (for organization creation/joining)
CREATE POLICY "Members can insert own records" ON public.organization_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own membership (for setting default org)
CREATE POLICY "Members can update own records" ON public.organization_members
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own membership (for leaving an org)
CREATE POLICY "Members can delete own records" ON public.organization_members
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- FIX organizations POLICY TO AVOID RECURSION
-- ============================================================================

-- The organizations SELECT policy also needs to avoid recursion
-- We use a direct join approach instead of subquery

DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;

-- Use EXISTS with direct user_id check (no recursion)
CREATE POLICY "Users can view their organizations" ON public.organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = id
            AND om.user_id = auth.uid()
        )
    );

-- ============================================================================
-- FIX audit_log RLS POLICIES
-- ============================================================================

-- Drop any recursive audit_log policies
DROP POLICY IF EXISTS "Users can view audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_log;

-- Simple policy: users can insert audit logs for their organizations
-- Use EXISTS to avoid recursion
CREATE POLICY "Users can insert audit logs" ON public.audit_log
    FOR INSERT WITH CHECK (
        organization_id IS NULL
        OR EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = audit_log.organization_id
            AND om.user_id = auth.uid()
        )
    );

-- Users can view audit logs for their organizations
CREATE POLICY "Users can view audit logs" ON public.audit_log
    FOR SELECT USING (
        organization_id IS NULL
        OR EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = audit_log.organization_id
            AND om.user_id = auth.uid()
        )
    );
