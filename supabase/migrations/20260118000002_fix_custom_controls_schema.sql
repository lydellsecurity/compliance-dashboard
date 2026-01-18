-- ============================================================================
-- FIX CUSTOM_CONTROLS SCHEMA
-- ============================================================================
--
-- The compliance-database.service.ts expects is_active column that doesn't exist.
--

-- Add is_active column to custom_controls
ALTER TABLE public.custom_controls
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_custom_controls_is_active
    ON public.custom_controls(is_active);

-- Set existing records to active
UPDATE public.custom_controls
SET is_active = true
WHERE is_active IS NULL;
