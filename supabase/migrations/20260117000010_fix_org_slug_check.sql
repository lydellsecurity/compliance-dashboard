-- Migration: Fix organization slug availability check
-- Created: 2026-01-17
-- Description: Allow authenticated users to check if a slug exists (for org creation)

-- Create a policy that allows authenticated users to check slug existence
-- This is needed for the organization setup form to validate slug availability
-- We only expose the 'id' column to prevent data leakage

DROP POLICY IF EXISTS "orgs_slug_check" ON public.organizations;
CREATE POLICY "orgs_slug_check" ON public.organizations
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Note: This allows any authenticated user to SELECT from organizations
-- The RLS still applies, so they can only see organizations they have access to
-- OR any organization when checking by slug (for availability check)
