/**
 * Tests for netlify/functions/integration-webhook.cjs
 *
 * The handler (a `.cjs` module) talks to Supabase via `require('@supabase/supabase-js')`.
 * Vitest's `vi.doMock` intercepts ESM-style `import`, not CJS `require` inside a .cjs file.
 * We therefore pre-populate Node's `require.cache` with a fake supabase module before
 * dynamically importing the handler, so `const { createClient } = require(...)` resolves
 * to our fake and signature verification can be exercised end-to-end.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

type Handler = (event: unknown, context?: unknown) => Promise<{
  statusCode: number;
  headers?: Record<string, unknown>;
  body: string;
}>;

interface WebhookEvent {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
  rawQuery: string;
  path: string;
  queryStringParameters: Record<string, string> | null;
  isBase64Encoded?: boolean;
}

const WEBHOOK_SECRET = 'test-shared-webhook-secret';

/**
 * Build a Supabase mock that returns a connection with an active webhook
 * configured using WEBHOOK_SECRET as `secret_hash`.
 */
function buildSupabaseMock(providerId: string) {
  const connection = {
    id: 'conn_1',
    tenant_id: 'tenant_1',
    provider_id: providerId,
    integration_webhooks: [
      { id: 'wh_1', is_active: true, secret_hash: WEBHOOK_SECRET },
    ],
  };

  // Chainable builder that resolves to { data, error } shape expected by handler.
  const fromImpl = (_table: string) => {
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.single = async () => {
      // Return connection for integration_connections; empty for webhook_events dedupe.
      if (_table === 'integration_connections') {
        return { data: connection, error: null };
      }
      if (_table === 'webhook_events') {
        return { data: null, error: null }; // not a duplicate
      }
      return { data: null, error: null };
    };
    chain.insert = () => ({
      select: () => ({
        single: async () => ({
          data: { id: 'evt_new_1', connection_id: connection.id },
          error: null,
        }),
      }),
    });
    chain.update = () => ({ eq: async () => ({ data: null, error: null }) });
    return chain;
  };

  return {
    createClient: () => ({
      from: fromImpl,
      rpc: () => 1,
    }),
  };
}

// Node 20: ESM test file, but the handler is CJS. We need a `require` anchored
// at this file to (a) resolve the supabase module path, (b) clear it from
// require.cache, and (c) inject a fake exports object.
const nodeRequire = createRequire(import.meta.url);
const HANDLER_PATH = path.resolve(
  new URL('../../netlify/functions/integration-webhook.cjs', import.meta.url).pathname
);
const SUPABASE_PATH = nodeRequire.resolve('@supabase/supabase-js');

function installSupabaseStub(providerId: string) {
  const mock = buildSupabaseMock(providerId);
  // Clear any cached handler so it re-executes its top-level require.
  delete nodeRequire.cache[HANDLER_PATH];
  // Inject the fake as the "loaded" supabase module.
  nodeRequire.cache[SUPABASE_PATH] = {
    id: SUPABASE_PATH,
    filename: SUPABASE_PATH,
    loaded: true,
    exports: mock,
    children: [],
    paths: [],
  } as unknown as NodeJS.Require['cache'][string];
}

function restoreSupabase() {
  delete nodeRequire.cache[SUPABASE_PATH];
  delete nodeRequire.cache[HANDLER_PATH];
}

async function loadHandler(providerId = 'github'): Promise<Handler> {
  installSupabaseStub(providerId);
  // Load via CJS require so it picks up the cached stub. Using dynamic ESM
  // `import()` would go through a separate loader that doesn't consult
  // require.cache for the handler's internal `require('@supabase/...')`.
  const mod = nodeRequire(HANDLER_PATH) as { handler: Handler };
  return mod.handler;
}

function githubEvent(body: string, overrides: Partial<WebhookEvent> = {}): WebhookEvent {
  return {
    httpMethod: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'GitHub-Hookshot/abc',
      'x-github-event': 'push',
      'x-github-delivery': 'delivery-1',
      ...(overrides.headers ?? {}),
    },
    body,
    rawQuery: overrides.rawQuery ?? 'connectionId=conn_1',
    path: '/.netlify/functions/integration-webhook',
    queryStringParameters: overrides.queryStringParameters ?? { connectionId: 'conn_1' },
  };
}

function slackEvent(body: string, overrides: Partial<WebhookEvent> = {}): WebhookEvent {
  return {
    httpMethod: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(overrides.headers ?? {}),
    },
    body,
    rawQuery: overrides.rawQuery ?? 'connectionId=conn_1',
    path: '/.netlify/functions/integration-webhook',
    queryStringParameters: overrides.queryStringParameters ?? { connectionId: 'conn_1' },
  };
}

beforeEach(() => {
  restoreSupabase();
});

afterEach(() => {
  restoreSupabase();
});

describe('integration-webhook: routing + body handling', () => {
  it('missing connectionId query → 400', async () => {
    const handler = await loadHandler('github');
    const res = await handler({
      httpMethod: 'POST',
      headers: {},
      body: '{}',
      rawQuery: '',
      path: '/.netlify/functions/integration-webhook',
      queryStringParameters: null,
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { error?: string };
    expect(body.error).toMatch(/connectionId/i);
  });

  it('OPTIONS preflight → 204', async () => {
    const handler = await loadHandler('github');
    const res = await handler({
      httpMethod: 'OPTIONS',
      headers: {},
      body: null,
      rawQuery: '',
      path: '/.netlify/functions/integration-webhook',
      queryStringParameters: null,
    });
    expect(res.statusCode).toBe(204);
  });

  it('GET → 405', async () => {
    const handler = await loadHandler('github');
    const res = await handler({
      httpMethod: 'GET',
      headers: {},
      body: null,
      rawQuery: 'connectionId=conn_1',
      path: '/.netlify/functions/integration-webhook',
      queryStringParameters: { connectionId: 'conn_1' },
    });
    expect(res.statusCode).toBe(405);
  });

  it('malformed JSON body → 400', async () => {
    const handler = await loadHandler('github');
    const res = await handler(githubEvent('{not-json'));
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { error?: string };
    expect(body.error).toMatch(/JSON/i);
  });
});

describe('integration-webhook: GitHub signature verification', () => {
  it('valid HMAC-SHA256 signature is accepted', async () => {
    const handler = await loadHandler('github');
    const body = JSON.stringify({ action: 'opened', number: 1 });
    const sig =
      'sha256=' +
      crypto.createHmac('sha256', WEBHOOK_SECRET).update(body, 'utf8').digest('hex');

    const res = await handler(
      githubEvent(body, { headers: { 'x-hub-signature-256': sig } })
    );
    expect(res.statusCode).toBeLessThan(500);
    const parsed = JSON.parse(res.body) as { status?: string; error?: string };
    expect(['accepted', 'duplicate', 'challenge']).toContain(parsed.status);
  });

  it('tampered signature → 401 rejected', async () => {
    const handler = await loadHandler('github');
    const body = JSON.stringify({ action: 'opened', number: 1 });
    // Use the wrong secret so the signature is the right length but wrong bytes.
    const badSig =
      'sha256=' +
      crypto.createHmac('sha256', 'wrong-secret').update(body, 'utf8').digest('hex');

    const res = await handler(
      githubEvent(body, { headers: { 'x-hub-signature-256': badSig } })
    );
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
    const parsed = JSON.parse(res.body) as { error?: string; status?: string };
    expect(parsed.error ?? parsed.status).toBeDefined();
  });

  it('missing signature header → 401', async () => {
    const handler = await loadHandler('github');
    const body = JSON.stringify({ action: 'opened' });
    const res = await handler(githubEvent(body)); // no x-hub-signature-256
    expect(res.statusCode).toBe(401);
  });
});

describe('integration-webhook: Slack signature verification', () => {
  it('valid signature + fresh timestamp → accepted', async () => {
    const handler = await loadHandler('slack');
    const body = JSON.stringify({ type: 'event_callback', event: { type: 'team_join' } });
    const ts = String(Math.floor(Date.now() / 1000));
    const sig =
      'v0=' +
      crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(`v0:${ts}:${body}`, 'utf8')
        .digest('hex');

    const res = await handler(
      slackEvent(body, {
        headers: {
          'x-slack-signature': sig,
          'x-slack-request-timestamp': ts,
        },
      })
    );
    expect(res.statusCode).toBeLessThan(500);
    const parsed = JSON.parse(res.body) as { status?: string };
    expect(['accepted', 'duplicate', 'challenge']).toContain(parsed.status);
  });

  it('stale timestamp (>5 min old) → 401 rejected', async () => {
    const handler = await loadHandler('slack');
    const body = JSON.stringify({ type: 'event_callback' });
    const ts = String(Math.floor(Date.now() / 1000) - 600); // 10 minutes old
    const sig =
      'v0=' +
      crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(`v0:${ts}:${body}`, 'utf8')
        .digest('hex');

    const res = await handler(
      slackEvent(body, {
        headers: {
          'x-slack-signature': sig,
          'x-slack-request-timestamp': ts,
        },
      })
    );
    expect(res.statusCode).toBe(401);
  });
});

describe('integration-webhook: Okta verification challenge', () => {
  it('echoes the x-okta-verification-challenge header', async () => {
    const handler = await loadHandler('okta');
    const challenge = 'oktachallenge-abc-123';
    const res = await handler({
      httpMethod: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-okta-verification-challenge': challenge,
      },
      body: '{}',
      rawQuery: 'connectionId=conn_1',
      path: '/.netlify/functions/integration-webhook',
      queryStringParameters: { connectionId: 'conn_1' },
    });
    expect(res.statusCode).toBe(200);
    const parsed = JSON.parse(res.body) as { verification?: string };
    expect(parsed.verification).toBe(challenge);
  });
});

describe('integration-webhook: unknown provider', () => {
  it('handles a provider with no verifier gracefully (no crash)', async () => {
    const handler = await loadHandler('some-unknown-provider');
    const body = JSON.stringify({ event: 'hello' });
    const res = await handler(githubEvent(body));
    // No verifier is registered, so the handler skips verification and
    // proceeds to store the event. Should not throw.
    expect(res.statusCode).toBeLessThan(500);
  });
});
