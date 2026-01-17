-- Migration: Fix Vendors RLS to work with organization_members
-- Created: 2026-01-17
-- Description: Updates vendor RLS policies to allow access via organization_members

-- The vendors table uses tenant_id, but our app uses organization_id
-- This migration adds policies that check organization_members as well

-- Drop existing policies that only check tenant_members
DROP POLICY IF EXISTS "Users can view vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can manage vendors" ON public.vendors;

-- Create helper function to get user's organization IDs
CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New policies that check both tenant_members AND organization_members
-- Users can view vendors if they're a tenant member OR organization member
CREATE POLICY "Users can view vendors" ON public.vendors
    FOR SELECT USING (
        tenant_id IN (SELECT public.get_user_tenant_ids())
        OR tenant_id IN (SELECT public.get_user_organization_ids())
    );

-- Users can insert vendors if they're a tenant member OR organization member
CREATE POLICY "Users can insert vendors" ON public.vendors
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT public.get_user_tenant_ids())
        OR tenant_id IN (SELECT public.get_user_organization_ids())
    );

-- Users can update vendors if they're a tenant member OR organization member
CREATE POLICY "Users can update vendors" ON public.vendors
    FOR UPDATE USING (
        tenant_id IN (SELECT public.get_user_tenant_ids())
        OR tenant_id IN (SELECT public.get_user_organization_ids())
    );

-- Users can delete vendors if they're a tenant member OR organization member
CREATE POLICY "Users can delete vendors" ON public.vendors
    FOR DELETE USING (
        tenant_id IN (SELECT public.get_user_tenant_ids())
        OR tenant_id IN (SELECT public.get_user_organization_ids())
    );

-- Also fix vendor_assessments
DROP POLICY IF EXISTS "Users can view vendor assessments" ON public.vendor_assessments;
DROP POLICY IF EXISTS "Users can manage vendor assessments" ON public.vendor_assessments;

CREATE POLICY "Users can view vendor assessments" ON public.vendor_assessments
    FOR SELECT USING (
        tenant_id IN (SELECT public.get_user_tenant_ids())
        OR tenant_id IN (SELECT public.get_user_organization_ids())
    );

CREATE POLICY "Users can manage vendor assessments" ON public.vendor_assessments
    FOR ALL USING (
        tenant_id IN (SELECT public.get_user_tenant_ids())
        OR tenant_id IN (SELECT public.get_user_organization_ids())
    );

-- Fix organization_members RLS to allow users to add themselves
-- This is needed for the organization setup flow
DROP POLICY IF EXISTS "Users can add themselves" ON public.organization_members;
CREATE POLICY "Users can add themselves" ON public.organization_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to create organizations
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
CREATE POLICY "Users can create organizations" ON public.organizations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view organizations they're members of
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
CREATE POLICY "Users can view their organizations" ON public.organizations
    FOR SELECT USING (
        id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    );
