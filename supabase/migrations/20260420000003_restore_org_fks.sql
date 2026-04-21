-- ============================================================================
-- RESTORE organization_id FOREIGN KEYS
-- ============================================================================
-- The initial Clerk migration included `'id'` in its list of "user identity
-- columns" as a shorthand for profiles.id — but that match was too broad.
-- Every FK whose TARGET column is named `id` (i.e. every FK pointing at a
-- table's PK) got dropped, including all the org-scoping FKs like
-- `organization_members.organization_id -> organizations.id`.
--
-- PostgREST uses FKs to resolve `organizations(*)` joins in queries like
--   GET /rest/v1/organization_members?select=...,organizations(*)
-- so the missing FK produced "Could not find a relationship between
-- 'organization_members' and 'organizations' in the schema cache".
--
-- This migration re-adds the `organization_id -> public.organizations(id)` FK
-- on every public table that has an `organization_id` column.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  r RECORD;
  constraint_name TEXT;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'organization_id'
      AND c.table_name <> 'organizations'  -- organizations.organization_id doesn't make sense
  LOOP
    constraint_name := format('%s_organization_id_fkey', r.table_name);

    -- Skip if the FK already exists (defensive — a prior manual restore may
    -- have reinstated some of these).
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = constraint_name
        AND conrelid = format('public.%I', r.table_name)::regclass
    ) THEN
      BEGIN
        EXECUTE format(
          'ALTER TABLE public.%I
             ADD CONSTRAINT %I
             FOREIGN KEY (organization_id)
             REFERENCES public.organizations(id)
             ON DELETE CASCADE',
          r.table_name, constraint_name
        );
      EXCEPTION
        -- Skip orphan rows referencing now-gone orgs (fresh-start data should
        -- be clean, but protect against partial states). Logs and moves on.
        WHEN foreign_key_violation THEN
          RAISE NOTICE 'Skipping FK on %: orphan organization_id rows exist', r.table_name;
        WHEN duplicate_object THEN
          NULL;  -- already there
      END;
    END IF;
  END LOOP;
END $$;

-- Bust PostgREST's schema cache so the API sees the new relationships.
-- (Supabase listens for this NOTIFY.)
NOTIFY pgrst, 'reload schema';

COMMIT;
