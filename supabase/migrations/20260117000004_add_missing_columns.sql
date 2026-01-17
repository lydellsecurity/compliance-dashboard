-- Migration: Add missing columns to organizations and audit_log
-- Created: 2026-01-17
-- Description: Adds columns required by the application that were missing from schema

-- ============================================================================
-- ADD settings COLUMN TO organizations
-- ============================================================================

ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- ADD MISSING COLUMNS TO audit_log
-- ============================================================================

-- The audit_log service expects these columns
ALTER TABLE public.audit_log
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info',
    ADD COLUMN IF NOT EXISTS user_email TEXT,
    ADD COLUMN IF NOT EXISTS resource_type TEXT,
    ADD COLUMN IF NOT EXISTS resource_id TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS ip_address TEXT,
    ADD COLUMN IF NOT EXISTS user_agent TEXT,
    ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT now();

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_audit_log_category ON public.audit_log(category);
CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON public.audit_log(severity);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON public.audit_log(timestamp DESC);
