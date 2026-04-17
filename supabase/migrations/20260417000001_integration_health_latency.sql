-- ============================================================================
-- Integration Health Probes — add latency column
-- ============================================================================
-- The "Run all health checks" fleet probe renders latency alongside each
-- connection's last-probe timestamp. Without this column the UI falls back to
-- "unknown ms" after every check. Safe to apply idempotently.

ALTER TABLE public.integration_connections
    ADD COLUMN IF NOT EXISTS last_health_latency_ms INTEGER;

COMMENT ON COLUMN public.integration_connections.last_health_latency_ms
    IS 'Milliseconds the last integration-test probe took round-trip. '
       'Populated by netlify/functions/integration-test.cjs.';
