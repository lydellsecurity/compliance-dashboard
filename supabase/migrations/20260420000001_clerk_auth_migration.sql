-- ============================================================================
-- CLERK AUTH MIGRATION
-- ============================================================================
-- Switches auth provider from Supabase Auth to Clerk (via Clerk's native
-- third-party auth integration with Supabase).
--
-- Key changes:
--   - All user-identifying columns change from UUID (auth.users.id) to TEXT
--     (Clerk IDs look like "user_2abc..."). FK constraints to auth.users are
--     dropped.
--   - RLS policies stop calling auth.uid() and instead pull the Clerk user id
--     from the JWT `sub` claim via the helper public.clerk_user_id().
--   - Fresh-start migration: all user-scoped data is truncated. No attempt is
--     made to remap legacy UUIDs to Clerk IDs.
--
-- Prerequisites (Supabase dashboard):
--   Authentication → Sign In / Providers → Third-Party Auth → add Clerk,
--   paste your Clerk Frontend API URL. This teaches Supabase to validate
--   Clerk-signed JWTs so auth.jwt() works inside RLS policies.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Helper: resolve the Clerk user id from the incoming JWT.
-- ----------------------------------------------------------------------------
-- With Clerk's native Supabase integration, Clerk session tokens carry the
-- Clerk user id as the `sub` claim. auth.jwt() returns the verified claims.
CREATE OR REPLACE FUNCTION public.clerk_user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'sub', ''),
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')
  );
$$;

GRANT EXECUTE ON FUNCTION public.clerk_user_id() TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. Truncate user-scoped tables (fresh start).
-- ----------------------------------------------------------------------------
-- Order matters only for visuals since TRUNCATE ... CASCADE clears children.
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'organization_members',
    'organization_invites',
    'trust_center_tokens',
    'control_responses',
    'custom_controls',
    'evidence_records',
    'evidence_items',
    'evidence_files',
    'evidence_versions',
    'user_responses',
    'audit_log',
    'vendors',
    'vendor_documents',
    'vendor_assessments',
    'vendor_risk_scores',
    'questionnaires',
    'questionnaire_responses',
    'report_history',
    'profiles',
    'organizations'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('TRUNCATE TABLE public.%I CASCADE', t);
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Drop every RLS policy on public schema + storage schema.
-- ----------------------------------------------------------------------------
-- Policies reference auth.uid() (UUID) or join against public.* columns we're
-- about to retype. Drop them all — public ones get rebuilt below; storage
-- ones (branding bucket, etc.) are rebuilt at the bottom of this migration.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Drop FK constraints in the public schema whose source OR target involves
--    a user-identifying column. This covers:
--     (a) FKs pointing at auth.users (legacy Supabase-auth refs)
--     (b) FKs between our own tables that key on profiles.id /
--         organization_members.user_id / created_by / etc.
--    Both sides become TEXT in section 5, but Postgres won't let us retype a
--    column that still participates in an FK to/from a differently-typed
--    column — so every such FK is dropped up front.
--
--    Scoped to schema='public' so we don't touch Supabase-owned tables
--    (auth.*, storage.*) whose constraints we don't own.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  user_col_names CONSTANT TEXT[] := ARRAY[
    'user_id','created_by','uploaded_by','invited_by',
    'reviewed_by','assessed_by','analyzed_by','answered_by',
    'id' -- profiles.id, which is both PK and user identity
  ];
BEGIN
  FOR r IN
    SELECT DISTINCT
           n.nspname AS schema_name,
           c.relname AS table_name,
           con.conname
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.contype = 'f'
      AND n.nspname = 'public'
      AND (
        -- (a) FK points at auth.users
        con.confrelid = 'auth.users'::regclass
        -- (b) FK source column is one of our user-identity columns
        OR EXISTS (
          SELECT 1
          FROM unnest(con.conkey) AS src_attnum
          JOIN pg_attribute a
            ON a.attrelid = con.conrelid AND a.attnum = src_attnum
          WHERE a.attname = ANY(user_col_names)
        )
        -- (c) FK target column is one of our user-identity columns
        OR EXISTS (
          SELECT 1
          FROM unnest(con.confkey) AS tgt_attnum
          JOIN pg_attribute a
            ON a.attrelid = con.confrelid AND a.attnum = tgt_attnum
          WHERE a.attname = ANY(user_col_names)
        )
      )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
                   r.schema_name, r.table_name, r.conname);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Convert user-identifying columns from UUID to TEXT.
-- ----------------------------------------------------------------------------
-- Any column ending in _by / _id that refers to a user (by convention) is
-- switched to TEXT. This is safe because all tables were truncated above.

-- profiles.id is both PK and user identity.
ALTER TABLE public.profiles
  ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- organization_members.user_id
ALTER TABLE public.organization_members
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- trust_center_tokens.created_by
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='trust_center_tokens' AND column_name='created_by') THEN
    ALTER TABLE public.trust_center_tokens ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
  END IF;
END $$;

-- organization_invites.invited_by
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='organization_invites' AND column_name='invited_by') THEN
    ALTER TABLE public.organization_invites ALTER COLUMN invited_by TYPE TEXT USING invited_by::TEXT;
  END IF;
END $$;

-- control_responses.created_by
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='control_responses' AND column_name='created_by') THEN
    ALTER TABLE public.control_responses ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
  END IF;
END $$;

-- evidence_* user columns
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name LIKE 'evidence%' AND column_name IN ('uploaded_by','created_by','reviewed_by','user_id'))
        OR (table_name LIKE 'vendor%' AND column_name IN ('created_by','uploaded_by','assessed_by','analyzed_by','user_id'))
        OR (table_name LIKE 'questionnaire%' AND column_name IN ('created_by','answered_by','user_id'))
        OR (table_name IN ('custom_controls','user_responses','audit_log','report_history')
            AND column_name IN ('created_by','user_id'))
      )
      AND data_type = 'uuid'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE TEXT USING %I::TEXT',
                   r.table_name, r.column_name, r.column_name);
  END LOOP;
END $$;

-- organizations.created_by (added by an earlier migration)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='organizations' AND column_name='created_by') THEN
    ALTER TABLE public.organizations ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. Rewrite helper functions that took UUID user ids.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_user_default_org(UUID);
CREATE OR REPLACE FUNCTION public.get_user_default_org(p_user_id TEXT)
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = p_user_id
  ORDER BY is_default DESC, joined_at ASC
  LIMIT 1;
$$;

DROP FUNCTION IF EXISTS public.accept_organization_invite(TEXT, UUID);
CREATE OR REPLACE FUNCTION public.accept_organization_invite(p_token TEXT, p_user_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT * INTO v_invite
  FROM public.organization_invites
  WHERE token = p_token
    AND accepted_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found or expired';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, is_default)
  VALUES (v_invite.organization_id, p_user_id, v_invite.role,
          NOT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = p_user_id))
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE public.organization_invites
  SET accepted_at = NOW()
  WHERE id = v_invite.id;

  RETURN v_invite.organization_id;
END $$;

-- ----------------------------------------------------------------------------
-- 7. Recreate RLS policies using public.clerk_user_id().
-- ----------------------------------------------------------------------------

-- organizations: members can read their own orgs; owners/admins can update.
CREATE POLICY "org_select_members" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = public.clerk_user_id())
  );

CREATE POLICY "org_insert_authed" ON public.organizations
  FOR INSERT WITH CHECK (public.clerk_user_id() IS NOT NULL);

CREATE POLICY "org_update_owners" ON public.organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = public.clerk_user_id() AND role IN ('owner','admin')
    )
  );

-- organization_members: users see their own memberships; owners manage the org.
CREATE POLICY "member_select_self_or_same_org" ON public.organization_members
  FOR SELECT USING (
    user_id = public.clerk_user_id()
    OR organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = public.clerk_user_id()
    )
  );

CREATE POLICY "member_insert_self" ON public.organization_members
  FOR INSERT WITH CHECK (user_id = public.clerk_user_id() OR public.clerk_user_id() IS NOT NULL);

CREATE POLICY "member_update_self_or_admin" ON public.organization_members
  FOR UPDATE USING (
    user_id = public.clerk_user_id()
    OR organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = public.clerk_user_id() AND role IN ('owner','admin')
    )
  );

CREATE POLICY "member_delete_admin" ON public.organization_members
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = public.clerk_user_id() AND role IN ('owner','admin')
    )
  );

-- profiles: users manage their own profile row; org-mates can read each other.
CREATE POLICY "profile_select_self_or_org" ON public.profiles
  FOR SELECT USING (
    id = public.clerk_user_id()
    OR organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = public.clerk_user_id()
    )
  );

CREATE POLICY "profile_insert_self" ON public.profiles
  FOR INSERT WITH CHECK (id = public.clerk_user_id());

CREATE POLICY "profile_update_self" ON public.profiles
  FOR UPDATE USING (id = public.clerk_user_id()) WITH CHECK (id = public.clerk_user_id());

-- control_responses: scoped to caller's org(s).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='control_responses') THEN
    EXECUTE $POL$
      CREATE POLICY "cr_rw_org_members" ON public.control_responses
        FOR ALL USING (
          organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = public.clerk_user_id()
          )
        )
        WITH CHECK (
          organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = public.clerk_user_id()
          )
        )
    $POL$;
  END IF;
END $$;

-- Generic per-org policy for any remaining table that has an organization_id
-- column and RLS enabled but no policy yet.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN pg_class pc ON pc.relname = c.table_name AND pc.relnamespace = 'public'::regnamespace
    WHERE c.table_schema = 'public'
      AND c.column_name = 'organization_id'
      AND pc.relrowsecurity = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.table_name
      )
  LOOP
    EXECUTE format($POL$
      CREATE POLICY "org_scope_rw" ON public.%I
        FOR ALL USING (
          organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = public.clerk_user_id()
          )
        )
        WITH CHECK (
          organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = public.clerk_user_id()
          )
        )
    $POL$, r.table_name);
  END LOOP;
END $$;

-- Index tweak: organization_members.user_id lookups are the hot path.
DROP INDEX IF EXISTS public.idx_org_members_user;
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);

-- ----------------------------------------------------------------------------
-- 8. Recreate storage RLS policies for user-owned buckets.
-- ----------------------------------------------------------------------------
-- The branding bucket holds organization logos. Path convention:
-- <organization_id>/<filename>. Members of the org can upload/overwrite/delete;
-- anyone can read (logos are served in the public Trust Center).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'branding') THEN

    EXECUTE $POL$
      CREATE POLICY "branding_public_read" ON storage.objects
        FOR SELECT USING (bucket_id = 'branding')
    $POL$;

    EXECUTE $POL$
      CREATE POLICY "branding_members_insert" ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = 'branding'
          AND (storage.foldername(name))[1] IN (
            SELECT organization_id::text FROM public.organization_members
            WHERE user_id = public.clerk_user_id()
          )
        )
    $POL$;

    EXECUTE $POL$
      CREATE POLICY "branding_members_update" ON storage.objects
        FOR UPDATE USING (
          bucket_id = 'branding'
          AND (storage.foldername(name))[1] IN (
            SELECT organization_id::text FROM public.organization_members
            WHERE user_id = public.clerk_user_id()
          )
        )
    $POL$;

    EXECUTE $POL$
      CREATE POLICY "branding_members_delete" ON storage.objects
        FOR DELETE USING (
          bucket_id = 'branding'
          AND (storage.foldername(name))[1] IN (
            SELECT organization_id::text FROM public.organization_members
            WHERE user_id = public.clerk_user_id()
          )
        )
    $POL$;

  END IF;
END $$;

-- Evidence bucket (if present): per-org read/write, no public read.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'evidence') THEN

    EXECUTE $POL$
      CREATE POLICY "evidence_members_rw" ON storage.objects
        FOR ALL USING (
          bucket_id = 'evidence'
          AND (storage.foldername(name))[1] IN (
            SELECT organization_id::text FROM public.organization_members
            WHERE user_id = public.clerk_user_id()
          )
        )
        WITH CHECK (
          bucket_id = 'evidence'
          AND (storage.foldername(name))[1] IN (
            SELECT organization_id::text FROM public.organization_members
            WHERE user_id = public.clerk_user_id()
          )
        )
    $POL$;

  END IF;
END $$;

COMMIT;
