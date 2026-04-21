-- Migration: Billing guardrails (trial abuse, sole-owner, billing cascade)
-- Created: 2026-04-21
-- Description:
--   1. user_billing_flags: tracks whether a user has already consumed a free
--      trial on any org, so they can't spin up a second org to claim another
--      trial. Set by stripe-webhook on checkout.session.completed.
--   2. Trigger: prevent removing the last remaining owner from an org. If the
--      user needs to leave, they must promote another member to owner first.
--   3. Index: billing_events(type, processed_at) for efficient audit queries
--      (admin billing log).

BEGIN;

-- ============================================================================
-- 1. USER BILLING FLAGS (trial abuse guard)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_billing_flags (
    user_id TEXT PRIMARY KEY,
    trial_consumed BOOLEAN NOT NULL DEFAULT false,
    trial_consumed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_user_billing_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    IF NEW.trial_consumed = true AND OLD.trial_consumed = false THEN
        NEW.trial_consumed_at := now();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_billing_flags_touch ON public.user_billing_flags;
CREATE TRIGGER trg_user_billing_flags_touch
    BEFORE UPDATE ON public.user_billing_flags
    FOR EACH ROW EXECUTE FUNCTION public.touch_user_billing_flags();

ALTER TABLE public.user_billing_flags ENABLE ROW LEVEL SECURITY;

-- Users can read their own flag (for UX — "you've already used your trial").
DROP POLICY IF EXISTS "user_billing_flags_self_select" ON public.user_billing_flags;
CREATE POLICY "user_billing_flags_self_select" ON public.user_billing_flags
    FOR SELECT
    USING (user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub'));

-- Only the service role writes (via webhook) — no policy needed for insert/update.

-- ============================================================================
-- 2. SOLE-OWNER GUARD
-- ============================================================================
-- Prevent deleting the last owner of an org. This applies to both removing a
-- member (DELETE on organization_members) and demoting the owner via UPDATE.
-- The app-layer (multi-tenant.service.removeMember) already short-circuits
-- removing an owner, but enforce at the DB to survive direct SQL or future
-- admin tooling.

CREATE OR REPLACE FUNCTION public.ensure_sole_owner_not_removed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    remaining_owners INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.role <> 'owner' THEN
            RETURN OLD;
        END IF;
        SELECT COUNT(*) INTO remaining_owners
        FROM public.organization_members
        WHERE organization_id = OLD.organization_id
          AND role = 'owner'
          AND id <> OLD.id;
        IF remaining_owners = 0 THEN
            RAISE EXCEPTION 'Cannot remove the last owner of the organization. Promote another member to owner first.'
                USING ERRCODE = 'restrict_violation';
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.role = 'owner' AND NEW.role <> 'owner' THEN
            SELECT COUNT(*) INTO remaining_owners
            FROM public.organization_members
            WHERE organization_id = OLD.organization_id
              AND role = 'owner'
              AND id <> OLD.id;
            IF remaining_owners = 0 THEN
                RAISE EXCEPTION 'Cannot demote the last owner of the organization. Promote another member first.'
                    USING ERRCODE = 'restrict_violation';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_organization_members_sole_owner ON public.organization_members;
CREATE TRIGGER trg_organization_members_sole_owner
    BEFORE DELETE OR UPDATE ON public.organization_members
    FOR EACH ROW EXECUTE FUNCTION public.ensure_sole_owner_not_removed();

-- ============================================================================
-- 3. BILLING EVENTS INDEX (type + processed_at for admin log)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_billing_events_type_processed
    ON public.billing_events (type, processed_at DESC);

COMMIT;
