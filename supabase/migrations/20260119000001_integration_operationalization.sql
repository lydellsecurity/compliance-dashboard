-- Integration Hub Operationalization Migration
-- Adds auth tag columns for proper AES-256-GCM decryption and webhook events table

-- ============================================================================
-- PHASE 1: Add auth tag columns to integration_connections
-- These are required for AES-256-GCM decryption (the auth tag validates integrity)
-- ============================================================================

ALTER TABLE public.integration_connections
ADD COLUMN IF NOT EXISTS credentials_auth_tag TEXT,
ADD COLUMN IF NOT EXISTS access_token_auth_tag TEXT,
ADD COLUMN IF NOT EXISTS refresh_token_auth_tag TEXT;

-- Add comment explaining the encryption scheme
COMMENT ON COLUMN public.integration_connections.credentials_auth_tag IS 'AES-256-GCM auth tag for credentials_encrypted';
COMMENT ON COLUMN public.integration_connections.access_token_auth_tag IS 'AES-256-GCM auth tag for access_token_encrypted';
COMMENT ON COLUMN public.integration_connections.refresh_token_auth_tag IS 'AES-256-GCM auth tag for refresh_token_encrypted';

-- ============================================================================
-- PHASE 4: Create webhook_events table for webhook processing and deduplication
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Event identification
    event_type TEXT NOT NULL,
    provider_event_id TEXT, -- Original event ID from provider

    -- Payload storage
    payload JSONB NOT NULL,
    headers JSONB, -- Store relevant headers for debugging

    -- Deduplication key (hash of provider + event_id + timestamp)
    idempotency_key TEXT NOT NULL,

    -- Processing status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'skipped')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Timing
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Ensure idempotency
    CONSTRAINT webhook_events_idempotency_unique UNIQUE (idempotency_key)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_webhook_events_connection ON public.webhook_events(connection_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant ON public.webhook_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events(status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_webhook_events_received ON public.webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON public.webhook_events(event_type);

-- RLS policies
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Users can view webhook events for their tenant
CREATE POLICY "Users can view webhook events for their tenant"
ON public.webhook_events
FOR SELECT
USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- Service role can do everything (for Netlify functions)
CREATE POLICY "Service role has full access to webhook events"
ON public.webhook_events
FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================================
-- PHASE 3: Add next_sync_at index for efficient scheduler queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_integration_connections_next_sync
ON public.integration_connections(next_sync_at)
WHERE status = 'connected' AND sync_enabled = true;

-- Add index for health check queries
CREATE INDEX IF NOT EXISTS idx_integration_connections_health_check
ON public.integration_connections(last_health_check_at)
WHERE status = 'connected';

-- ============================================================================
-- Function to calculate next sync time
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_next_sync_at(
    sync_frequency_minutes INTEGER,
    from_time TIMESTAMPTZ DEFAULT now()
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN from_time + (COALESCE(sync_frequency_minutes, 60) * INTERVAL '1 minute');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Function to get connections due for sync
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_due_sync_connections(
    batch_size INTEGER DEFAULT 50
)
RETURNS SETOF public.integration_connections AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.integration_connections
    WHERE status = 'connected'
      AND sync_enabled = true
      AND (next_sync_at IS NULL OR next_sync_at <= now())
    ORDER BY COALESCE(next_sync_at, '1970-01-01'::timestamptz) ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED; -- Prevent concurrent processing
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger to auto-set next_sync_at on connection creation/update
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_next_sync_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set next_sync_at when connection becomes active or sync settings change
    IF (TG_OP = 'INSERT' AND NEW.status = 'connected' AND NEW.sync_enabled = true)
       OR (TG_OP = 'UPDATE' AND NEW.status = 'connected' AND NEW.sync_enabled = true
           AND (OLD.status != 'connected' OR OLD.sync_enabled != true
                OR OLD.sync_frequency_minutes != NEW.sync_frequency_minutes))
    THEN
        NEW.next_sync_at := public.calculate_next_sync_at(NEW.sync_frequency_minutes);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_next_sync_at ON public.integration_connections;

CREATE TRIGGER trigger_set_next_sync_at
    BEFORE INSERT OR UPDATE ON public.integration_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.set_next_sync_at();

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_next_sync_at TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_due_sync_connections TO service_role;
