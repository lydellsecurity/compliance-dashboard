-- Migration: AI credits unified meter + atomic-debit RPC
-- Created: 2026-04-22
-- Description:
--   Implements the AI credit system per MONETIZATION_OPTIMIZATION_STRATEGY.md.
--   Every AI action debits from a single `ai_credits` meter that rolls over on
--   billing period boundaries. The Netlify AI endpoints call a new RPC
--   `debit_ai_credits` to check-and-spend atomically so simultaneous AI
--   requests from the same tenant can't race past the cap.
--
--   Credit costs live client+server-side in src/constants/credits.ts; the DB
--   layer is agnostic to action type — it just tracks total consumption per
--   period per org.

BEGIN;

-- ============================================================================
-- 1. EXTEND METER CHECK
-- ============================================================================
-- Drop the existing constraint (if present) and replace with one that allows
-- 'ai_credits' alongside the legacy per-action meters. Kept the legacy names
-- so we can aggregate or split reporting later without migrating rows.

ALTER TABLE public.usage_meters
    DROP CONSTRAINT IF EXISTS usage_meters_meter_check;

ALTER TABLE public.usage_meters
    ADD CONSTRAINT usage_meters_meter_check
    CHECK (meter IN (
        'ai_policy',
        'ai_remediation_chat',
        'questionnaire',
        'vendors',
        'seats',
        'report',
        'ai_credits'
    ));

-- ============================================================================
-- 2. ATOMIC DEBIT RPC
-- ============================================================================
-- `debit_ai_credits` reads the org's `maxAiCredits` limit from its plan,
-- sums current-period consumption, and either returns { allowed: true,
-- remaining } after atomically incrementing the meter or { allowed: false,
-- used, cap } without incrementing. Keeps the cap-check and the write in a
-- single transaction so two concurrent AI requests can't both slip past a
-- 100-credit cap when 50 remain.
--
-- Limit resolution: reads organizations.limits->>'maxAiCredits' directly. A
-- value of -1 means unlimited (Enterprise); null is treated as 0 (locked).

CREATE OR REPLACE FUNCTION public.debit_ai_credits(
    p_organization_id UUID,
    p_cost INTEGER,
    p_period_start TIMESTAMPTZ,
    p_period_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cap INTEGER;
    v_used INTEGER;
    v_new_total INTEGER;
BEGIN
    IF p_cost <= 0 THEN
        RAISE EXCEPTION 'cost must be positive';
    END IF;

    -- Resolve the org's AI credit cap.
    SELECT COALESCE((limits->>'maxAiCredits')::INTEGER, 0)
    INTO v_cap
    FROM public.organizations
    WHERE id = p_organization_id;

    IF v_cap IS NULL THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'org_not_found');
    END IF;

    -- Unlimited plans never debit into the meter table; just ack.
    IF v_cap = -1 THEN
        RETURN jsonb_build_object(
            'allowed', true,
            'used', 0,
            'cap', -1,
            'remaining', -1
        );
    END IF;

    -- Sum current-period ai_credits usage. Intentionally includes ALL rows
    -- that overlap the requested window — see increment_usage_meter for the
    -- period-bucketing contract callers have to honor.
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_used
    FROM public.usage_meters
    WHERE organization_id = p_organization_id
      AND meter = 'ai_credits'
      AND period_start >= p_period_start
      AND period_start < p_period_end;

    IF v_used + p_cost > v_cap THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'cap_exceeded',
            'used', v_used,
            'cap', v_cap,
            'requested', p_cost
        );
    END IF;

    -- Upsert into the canonical period-start bucket. Matches
    -- increment_usage_meter's upsert semantics.
    INSERT INTO public.usage_meters (organization_id, meter, period_start, period_end, quantity)
    VALUES (p_organization_id, 'ai_credits', p_period_start, p_period_end, p_cost)
    ON CONFLICT (organization_id, meter, period_start)
    DO UPDATE SET
        quantity = public.usage_meters.quantity + p_cost,
        updated_at = now()
    RETURNING quantity INTO v_new_total;

    RETURN jsonb_build_object(
        'allowed', true,
        'used', v_used + p_cost,
        'cap', v_cap,
        'remaining', v_cap - (v_used + p_cost)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.debit_ai_credits(UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.debit_ai_credits(UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;

-- ============================================================================
-- 3. BACKFILL maxAiCredits INTO EXISTING ORGS
-- ============================================================================
-- Uses the same values we'll set in PLAN_CONFIGS below. Enterprise = -1
-- (unlimited). Free gets a tiny allocation so the tier has something AI-shaped
-- to hook users.

UPDATE public.organizations
SET limits = limits || jsonb_build_object('maxAiCredits',
    CASE plan
        WHEN 'free'       THEN 50
        WHEN 'starter'    THEN 1500
        WHEN 'growth'     THEN 10000
        WHEN 'scale'      THEN 50000
        WHEN 'enterprise' THEN -1
        ELSE 0
    END::INT
);

COMMIT;
