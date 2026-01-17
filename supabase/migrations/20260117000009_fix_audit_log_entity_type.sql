-- Migration: Fix audit_log entity_type column
-- Created: 2026-01-17
-- Description: Make entity_type nullable since service uses resource_type column instead

-- Make entity_type nullable (the new resource_type column is used instead)
ALTER TABLE public.audit_log
    ALTER COLUMN entity_type DROP NOT NULL;

-- Also ensure action has a reasonable default
ALTER TABLE public.audit_log
    ALTER COLUMN action DROP NOT NULL;
