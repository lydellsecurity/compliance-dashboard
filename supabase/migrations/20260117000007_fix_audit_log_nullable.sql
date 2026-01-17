-- Migration: Make audit_log.organization_id nullable
-- Created: 2026-01-17
-- Description: Allow audit logs to be created without an organization (e.g., during onboarding)

-- Make organization_id nullable
ALTER TABLE public.audit_log
    ALTER COLUMN organization_id DROP NOT NULL;
