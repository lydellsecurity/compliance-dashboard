/**
 * Contract tests for netlify/functions/integration-test.cjs
 *
 * This is the endpoint the UI's "Run all health checks" button hits. We lock
 * in the response envelope shape and the connectionId-based consecutive-
 * failure tracking so a regression breaks loudly.
 *
 * The handler is a .cjs that does `require('@supabase/supabase-js')` at
 * module load time, which bypasses vi.mock. We therefore inject a fake
 * supabase module directly into Node's require.cache before loading the
 * handler via CJS require — same pattern webhook.test.ts uses.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { jsonEvent, optionsEvent, parseBody } from '../helpers/event';

type ConnectionRow = {
  id: string;
  provider_id: string;
  consecutive_failures?: number;
};

type State = {
  connectionById: Map<string, ConnectionRow>;
  lastUpdate: null | Record<string, unknown>;
  lastUpdateId: null | string;
};

const nodeRequire = createRequire(import.meta.url);
const HANDLER_PATH = new URL('../../netlify/functions/integration-test.cjs', import.meta.url).pathname;
const SUPABASE_PATH = nodeRequire.resolve('@supabase/supabase-js');

function installSupabaseStub(state: State) {
  const client = {
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, id: string) => ({
          single: async () => {
            const row = state.connectionById.get(id);
            return row ? { data: row, error: null } : { data: null, error: { message: 'not found' } };
          },
        }),
      }),
      update: (payload: Record<string, unknown>) => ({
        eq: (_col: string, id: string) => {
          state.lastUpdate = payload;
          state.lastUpdateId = id;
          return Promise.resolve({ data: null, error: null });
        },
      }),
    }),
  };
  const exports = { createClient: () => client };
  delete nodeRequire.cache[HANDLER_PATH];
  nodeRequire.cache[SUPABASE_PATH] = {
    id: SUPABASE_PATH,
    filename: SUPABASE_PATH,
    loaded: true,
    exports,
    children: [],
    paths: [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

type Handler = (event: ReturnType<typeof jsonEvent>) => Promise<{
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}>;

let handler: Handler;
let state: State;

beforeEach(() => {
  state = {
    connectionById: new Map(),
    lastUpdate: null,
    lastUpdateId: null,
  };
  installSupabaseStub(state);
  handler = (nodeRequire(HANDLER_PATH) as { handler: Handler }).handler;
});

describe('integration-test handler', () => {
  it('OPTIONS returns CORS preflight', async () => {
    const res = await handler(optionsEvent() as unknown as ReturnType<typeof jsonEvent>);
    expect([200, 204]).toContain(res.statusCode);
  });

  it('rejects non-POST methods', async () => {
    const res = await handler(jsonEvent('GET', {}));
    expect(res.statusCode).toBe(405);
  });

  it('400s when providerId missing', async () => {
    const res = await handler(jsonEvent('POST', { connectionId: 'x' }));
    expect(res.statusCode).toBe(400);
    expect(parseBody<{ error: string }>(res).error).toMatch(/providerId/i);
  });

  it('returns an envelope with latency and testedAt for unknown provider', async () => {
    const res = await handler(jsonEvent('POST', { providerId: 'not-a-real-provider' }));
    expect(res.statusCode).toBe(200);
    const body = parseBody<{
      success: boolean;
      providerId: string;
      latency: number;
      testedAt: string;
      error: string;
    }>(res);
    expect(body.success).toBe(false);
    expect(body.providerId).toBe('not-a-real-provider');
    expect(typeof body.latency).toBe('number');
    expect(body.testedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.error).toMatch(/unknown provider/i);
  });

  it('when connectionId given, writes health columns including latency', async () => {
    state.connectionById.set('conn_1', {
      id: 'conn_1',
      provider_id: 'not-a-real-provider',
      consecutive_failures: 0,
    });
    await handler(jsonEvent('POST', { providerId: 'not-a-real-provider', connectionId: 'conn_1' }));
    expect(state.lastUpdateId).toBe('conn_1');
    expect(state.lastUpdate).toBeTruthy();
    const upd = state.lastUpdate as Record<string, unknown>;
    expect(upd.last_health_check_at).toBeTruthy();
    expect(upd).toHaveProperty('last_health_latency_ms');
    // First failure → degraded, not unhealthy yet.
    expect(upd.health_status).toBe('degraded');
    expect(upd.consecutive_failures).toBe(1);
  });

  it('hits "unhealthy" after 3 consecutive failures', async () => {
    state.connectionById.set('conn_2', {
      id: 'conn_2',
      provider_id: 'not-a-real-provider',
      consecutive_failures: 2, // next failure = 3
    });
    await handler(jsonEvent('POST', { providerId: 'not-a-real-provider', connectionId: 'conn_2' }));
    expect((state.lastUpdate as Record<string, unknown>).health_status).toBe('unhealthy');
    expect((state.lastUpdate as Record<string, unknown>).consecutive_failures).toBe(3);
  });
});
