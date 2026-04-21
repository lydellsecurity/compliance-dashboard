-- ============================================================================
-- CLERK RLS — FIX RECURSION
-- ============================================================================
-- The initial Clerk migration's policies on public.organization_members did a
-- "your orgs can see each other" subquery that Postgres flagged as infinite
-- recursion (42P17). Same recipe as the pre-Clerk migration
-- 20260117000006_fix_all_recursive_policies.sql: keep membership policies
-- strictly self-scoped, and route every other table's "caller's orgs" lookup
-- through a SECURITY DEFINER helper so the planner doesn't re-enter RLS.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. SECURITY DEFINER helper: resolve the caller's org IDs without RLS.
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER runs as the function owner (postgres), bypassing RLS on
-- organization_members. That's how we break the recursion — any table that
-- wants "caller's orgs" calls this function instead of inlining a subquery
-- over organization_members.
CREATE OR REPLACE FUNCTION public.clerk_user_org_ids()
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = public.clerk_user_id();
$$;

GRANT EXECUTE ON FUNCTION public.clerk_user_org_ids() TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. Rebuild organization_members policies (strictly self-scoped).
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organization_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organization_members', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "member_select_self" ON public.organization_members
  FOR SELECT USING (user_id = public.clerk_user_id());

CREATE POLICY "member_insert_self" ON public.organization_members
  FOR INSERT WITH CHECK (user_id = public.clerk_user_id());

CREATE POLICY "member_update_self" ON public.organization_members
  FOR UPDATE USING (user_id = public.clerk_user_id())
  WITH CHECK (user_id = public.clerk_user_id());

CREATE POLICY "member_delete_self" ON public.organization_members
  FOR DELETE USING (user_id = public.clerk_user_id());

-- ----------------------------------------------------------------------------
-- 3. Rebuild audit_log policies (no reference to organization_members).
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_log'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_log', pol.policyname);
  END LOOP;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='audit_log') THEN
    -- Any signed-in caller can append (the app sets user_id/org_id from the
    -- session; RLS is a backstop, not the primary check for audit-log writes).
    EXECUTE 'CREATE POLICY "audit_log_insert_authed" ON public.audit_log
      FOR INSERT WITH CHECK (public.clerk_user_id() IS NOT NULL)';

    -- Read: own rows, or rows from orgs the caller belongs to.
    EXECUTE 'CREATE POLICY "audit_log_select_self_or_org" ON public.audit_log
      FOR SELECT USING (
        public.clerk_user_id() IS NOT NULL
        AND (
          user_id = public.clerk_user_id()
          OR organization_id IN (SELECT public.clerk_user_org_ids())
        )
      )';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Swap the `public.organization_members` subquery in every other policy for
--    the SECURITY DEFINER helper.
-- ----------------------------------------------------------------------------
-- Tables touched by the first Clerk migration:
--   organizations, profiles, control_responses, and any org-scoped tables that
--   got the generic "org_scope_rw" policy. We rebuild each with the helper.

-- organizations
DROP POLICY IF EXISTS "org_select_members" ON public.organizations;
DROP POLICY IF EXISTS "org_insert_authed" ON public.organizations;
DROP POLICY IF EXISTS "org_update_owners" ON public.organizations;

CREATE POLICY "org_select_members" ON public.organizations
  FOR SELECT USING (id IN (SELECT public.clerk_user_org_ids()));

CREATE POLICY "org_insert_authed" ON public.organizations
  FOR INSERT WITH CHECK (public.clerk_user_id() IS NOT NULL);

-- "owner/admin" check can't use the SECURITY DEFINER shortcut because it
-- needs the role too. Inline the join, but narrow to id+user_id so Postgres
-- doesn't flag recursion when called from organizations.
CREATE POLICY "org_update_owners" ON public.organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organizations.id
        AND m.user_id = public.clerk_user_id()
        AND m.role IN ('owner','admin')
    )
  );

-- profiles
DROP POLICY IF EXISTS "profile_select_self_or_org" ON public.profiles;
DROP POLICY IF EXISTS "profile_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profile_update_self" ON public.profiles;

CREATE POLICY "profile_select_self_or_org" ON public.profiles
  FOR SELECT USING (
    id = public.clerk_user_id()
    OR organization_id IN (SELECT public.clerk_user_org_ids())
  );

CREATE POLICY "profile_insert_self" ON public.profiles
  FOR INSERT WITH CHECK (id = public.clerk_user_id());

CREATE POLICY "profile_update_self" ON public.profiles
  FOR UPDATE USING (id = public.clerk_user_id())
  WITH CHECK (id = public.clerk_user_id());

-- control_responses
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='control_responses') THEN
    EXECUTE 'DROP POLICY IF EXISTS "cr_rw_org_members" ON public.control_responses';
    EXECUTE $POL$
      CREATE POLICY "cr_rw_org_members" ON public.control_responses
        FOR ALL USING (organization_id IN (SELECT public.clerk_user_org_ids()))
        WITH CHECK (organization_id IN (SELECT public.clerk_user_org_ids()))
    $POL$;
  END IF;
END $$;

-- Replace the generic "org_scope_rw" on every remaining org-scoped table.
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_policies
    WHERE schemaname = 'public' AND policyname = 'org_scope_rw'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "org_scope_rw" ON public.%I', t.tablename);
    EXECUTE format($POL$
      CREATE POLICY "org_scope_rw" ON public.%I
        FOR ALL USING (organization_id IN (SELECT public.clerk_user_org_ids()))
        WITH CHECK (organization_id IN (SELECT public.clerk_user_org_ids()))
    $POL$, t.tablename);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Rebuild storage policies with the helper too.
-- ----------------------------------------------------------------------------
-- (Same potential-recursion pattern: joining organization_members from a
--  storage policy is fine today but gets fragile; use the helper for
--  consistency and cheaper plans.)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'branding') THEN
    DROP POLICY IF EXISTS "branding_public_read" ON storage.objects;
    DROP POLICY IF EXISTS "branding_members_insert" ON storage.objects;
    DROP POLICY IF EXISTS "branding_members_update" ON storage.objects;
    DROP POLICY IF EXISTS "branding_members_delete" ON storage.objects;

    EXECUTE 'CREATE POLICY "branding_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = ''branding'')';

    EXECUTE 'CREATE POLICY "branding_members_insert" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = ''branding''
        AND (storage.foldername(name))[1] IN (
          SELECT organization_id::text FROM public.clerk_user_org_ids() AS organization_id
        )
      )';

    EXECUTE 'CREATE POLICY "branding_members_update" ON storage.objects
      FOR UPDATE USING (
        bucket_id = ''branding''
        AND (storage.foldername(name))[1] IN (
          SELECT organization_id::text FROM public.clerk_user_org_ids() AS organization_id
        )
      )';

    EXECUTE 'CREATE POLICY "branding_members_delete" ON storage.objects
      FOR DELETE USING (
        bucket_id = ''branding''
        AND (storage.foldername(name))[1] IN (
          SELECT organization_id::text FROM public.clerk_user_org_ids() AS organization_id
        )
      )';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'evidence') THEN
    DROP POLICY IF EXISTS "evidence_members_rw" ON storage.objects;

    EXECUTE 'CREATE POLICY "evidence_members_rw" ON storage.objects
      FOR ALL USING (
        bucket_id = ''evidence''
        AND (storage.foldername(name))[1] IN (
          SELECT organization_id::text FROM public.clerk_user_org_ids() AS organization_id
        )
      )
      WITH CHECK (
        bucket_id = ''evidence''
        AND (storage.foldername(name))[1] IN (
          SELECT organization_id::text FROM public.clerk_user_org_ids() AS organization_id
        )
      )';
  END IF;
END $$;

COMMIT;
