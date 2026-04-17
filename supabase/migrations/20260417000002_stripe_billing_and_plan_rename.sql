-- Migration: Stripe billing integration + plan key rename
-- Created: 2026-04-17
-- Description:
--   1. Renames plan keys (startup → starter, business → growth) and adds `scale`.
--      Updates the CHECK constraint on organizations.plan accordingly.
--   2. Adds top-level billing columns (stripe_price_id, billing_interval,
--      trial_ends_at, cancel_at_period_end) that the TypeScript `TenantBilling`
--      struct has been extended to expect.
--   3. Backfills `features` JSON on existing rows with the five new flags
--      (aiRemediationChat, realTimeRegulatoryScan, auditBundleExport,
--      customDomain, scimProvisioning) so `data.features as TenantFeatures`
--      casts remain valid.
--   4. Creates `billing_events` (idempotent webhook log) and `usage_meters`
--      (per-period usage counters for metered Stripe subscription items).
--
-- See docs/MONETIZATION_PLAN.md §7 for the full architecture.

BEGIN;

-- ============================================================================
-- 1. RENAME PLAN KEYS
-- ============================================================================
-- Drop the old CHECK constraint so we can update values, then re-add with the
-- new allowed set. Constraint name matches the default Postgres auto-name
-- pattern; if your database was created with a different name, you may need to
-- look it up via: SELECT conname FROM pg_constraint WHERE conrelid = 'public.organizations'::regclass AND contype = 'c';
ALTER TABLE public.organizations
    DROP CONSTRAINT IF EXISTS organizations_plan_check;

UPDATE public.organizations SET plan = 'starter' WHERE plan = 'startup';
UPDATE public.organizations SET plan = 'growth'  WHERE plan = 'business';

ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_plan_check
    CHECK (plan IN ('free', 'starter', 'growth', 'scale', 'enterprise'));

-- ============================================================================
-- 2. TOP-LEVEL STRIPE COLUMNS
-- ============================================================================
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
    ADD COLUMN IF NOT EXISTS billing_interval TEXT
        CHECK (billing_interval IN ('monthly', 'annual')),
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer
    ON public.organizations ((billing->>'customerId'))
    WHERE billing->>'customerId' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription
    ON public.organizations ((billing->>'subscriptionId'))
    WHERE billing->>'subscriptionId' IS NOT NULL;

-- ============================================================================
-- 3. BACKFILL NEW FEATURE FLAGS
-- ============================================================================
-- Any existing row's features JSON is missing the five new flags. Merge them in
-- with the free-tier defaults; plan-specific enablement is reapplied on the
-- next call to changePlan() or when the Stripe webhook fires.
UPDATE public.organizations
SET features = COALESCE(features, '{}'::jsonb) || jsonb_build_object(
    'aiRemediationChat',       COALESCE(features->'aiRemediationChat', 'false'::jsonb),
    'realTimeRegulatoryScan',  COALESCE(features->'realTimeRegulatoryScan', 'false'::jsonb),
    'auditBundleExport',       COALESCE(features->'auditBundleExport', 'false'::jsonb),
    'customDomain',            COALESCE(features->'customDomain', 'false'::jsonb),
    'scimProvisioning',        COALESCE(features->'scimProvisioning', 'false'::jsonb)
);

-- ============================================================================
-- 4. BILLING EVENTS (webhook idempotency log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    stripe_event_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_org
    ON public.billing_events(organization_id, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_type
    ON public.billing_events(type);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- Only the service role writes/reads billing events. Owners of the org can
-- read their own events for support visibility.
DROP POLICY IF EXISTS "billing_events_owner_select" ON public.billing_events;
CREATE POLICY "billing_events_owner_select" ON public.billing_events
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- ============================================================================
-- 5. USAGE METERS (for metered Stripe subscription items)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.usage_meters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    meter TEXT NOT NULL CHECK (meter IN (
        'ai_policy',
        'ai_remediation_chat',
        'questionnaire',
        'vendors',
        'seats',
        'report'
    )),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reported_to_stripe BOOLEAN NOT NULL DEFAULT false,
    reported_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, meter, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_meters_org_period
    ON public.usage_meters(organization_id, meter, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_usage_meters_pending
    ON public.usage_meters(reported_to_stripe, period_end)
    WHERE reported_to_stripe = false;

ALTER TABLE public.usage_meters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_meters_member_select" ON public.usage_meters;
CREATE POLICY "usage_meters_member_select" ON public.usage_meters
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- 6. HELPER: increment_usage_meter
-- ============================================================================
-- Atomic upsert so increment calls from different Netlify function invocations
-- don't race. Returns the new quantity. Period boundaries are callers'
-- responsibility (they pass the billing period start/end).
CREATE OR REPLACE FUNCTION public.increment_usage_meter(
    p_organization_id UUID,
    p_meter TEXT,
    p_period_start TIMESTAMPTZ,
    p_period_end TIMESTAMPTZ,
    p_quantity INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_quantity INTEGER;
BEGIN
    INSERT INTO public.usage_meters (organization_id, meter, period_start, period_end, quantity)
    VALUES (p_organization_id, p_meter, p_period_start, p_period_end, p_quantity)
    ON CONFLICT (organization_id, meter, period_start)
    DO UPDATE SET
        quantity = public.usage_meters.quantity + p_quantity,
        updated_at = now()
    RETURNING quantity INTO new_quantity;

    RETURN new_quantity;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_usage_meter(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_usage_meter(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) TO authenticated, service_role;

COMMIT;
