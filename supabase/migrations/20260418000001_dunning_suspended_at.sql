-- Migration: Track when a tenant entered suspension for dunning soft-block
-- Created: 2026-04-18
-- Description:
--   Adds `suspended_at` to organizations so we can compute "days in dunning"
--   and soft-block paid-feature writes after 10 days per monetization plan
--   §8.4. Set by the stripe-webhook on `invoice.payment_failed`, cleared on
--   `invoice.payment_succeeded` or `customer.subscription.updated` back to
--   active.

BEGIN;

ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_organizations_suspended_at
    ON public.organizations(suspended_at)
    WHERE suspended_at IS NOT NULL;

COMMIT;
