/**
 * Handler-level contract tests for netlify/functions/azure-verify.cjs
 *
 * Azure SDKs use their own HTTP layer; msw does not intercept them reliably.
 * We focus on handler-dispatch contract tests and mock @azure/* modules at the
 * module level for the one test that exercises an SDK call path.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { jsonEvent, optionsEvent, parseBody } from '../../helpers/event';
import {
  cloudVerifyTestConnectionBodySchema,
  cloudVerifyControlBodySchema,
} from '../../helpers/schemas';

type Handler = (event: unknown, context: unknown) => Promise<{
  statusCode: number;
  headers?: Record<string, unknown>;
  body: string;
}>;

async function loadHandler(): Promise<Handler> {
  const mod = await import('../../../netlify/functions/azure-verify.cjs');
  return (mod as { handler?: Handler; default?: { handler?: Handler } }).handler
    ?? (mod as { default?: { handler: Handler } }).default!.handler;
}

const validCreds = {
  tenantId: '00000000-0000-0000-0000-000000000000',
  clientId: '11111111-1111-1111-1111-111111111111',
  clientSecret: 'fake-secret',
  subscriptionId: '22222222-2222-2222-2222-222222222222',
};

beforeEach(() => {
  vi.resetModules();
});

describe('azure-verify: CORS + method', () => {
  it('OPTIONS preflight returns CORS headers', async () => {
    const handler = await loadHandler();
    const res = await handler(optionsEvent('http://localhost:5173'), {});
    expect([200, 204]).toContain(res.statusCode);
    const headerKeys = Object.keys(res.headers ?? {}).map((k) => k.toLowerCase());
    expect(headerKeys).toContain('access-control-allow-origin');
  });

  it('GET is rejected as non-POST (4xx)', async () => {
    const handler = await loadHandler();
    const res = await handler(jsonEvent('GET', null), {});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('PUT is rejected as non-POST (4xx)', async () => {
    const handler = await loadHandler();
    const res = await handler(jsonEvent('PUT', { action: 'test_connection' }), {});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('azure-verify: body validation', () => {
  it('missing body → 400 with error', async () => {
    const handler = await loadHandler();
    const res = await handler({ ...jsonEvent('POST', {}), body: null }, {});
    expect(res.statusCode).toBe(400);
    const body = parseBody<{ error?: string }>(res);
    expect(body.error).toBeTypeOf('string');
  });

  it('malformed JSON body → 400', async () => {
    const handler = await loadHandler();
    const evt = { ...jsonEvent('POST', {}), body: '{not-json' };
    const res = await handler(evt, {});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(600);
    const body = parseBody<{ error?: string; message?: string }>(res);
    expect(body.error ?? body.message).toBeTypeOf('string');
  });

  it('missing credentials field → 400', async () => {
    const handler = await loadHandler();
    const res = await handler(jsonEvent('POST', { action: 'test_connection' }), {});
    expect(res.statusCode).toBe(400);
    const body = parseBody<{ error?: string }>(res);
    expect(body.error).toMatch(/credential/i);
  });

  it('missing action field → 400', async () => {
    const handler = await loadHandler();
    const res = await handler(jsonEvent('POST', { credentials: validCreds }), {});
    expect(res.statusCode).toBe(400);
    const body = parseBody<{ error?: string }>(res);
    expect(body.error).toMatch(/action/i);
  });

  it("unknown action ('gibberish') → 400", async () => {
    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', { action: 'gibberish', credentials: validCreds }),
      {}
    );
    expect(res.statusCode).toBe(400);
    const body = parseBody<{ error?: string }>(res);
    expect(body.error).toMatch(/action/i);
  });

  it('verify_control with unknown checkType → 400 or safe error envelope', async () => {
    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', {
        action: 'verify_control',
        credentials: validCreds,
        checkType: 'not_a_real_check',
      }),
      {}
    );
    expect([400, 500]).toContain(res.statusCode);
    const body = parseBody<{ error?: string }>(res);
    expect(body.error).toBeTypeOf('string');
  });
});

describe('azure-verify: SDK exercise (mocked)', () => {
  it('test_connection returns an envelope matching the schema', async () => {
    vi.doMock('@azure/identity', () => ({
      ClientSecretCredential: class {
        constructor(_t: string, _c: string, _s: string) {}
      },
    }));
    vi.doMock('@azure/arm-subscriptions', () => ({
      SubscriptionClient: class {
        subscriptions = {
          get: async (_id: string) => ({
            subscriptionId: validCreds.subscriptionId,
            displayName: 'Fake Subscription',
            state: 'Enabled',
          }),
        };
      },
    }));

    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', { action: 'test_connection', credentials: validCreds }),
      {}
    );
    expect([200, 401, 403, 500]).toContain(res.statusCode);
    const body = parseBody(res);
    cloudVerifyTestConnectionBodySchema.parse(body);
  });

  it('verify_control (storage_encryption) returns a control envelope', async () => {
    vi.doMock('@azure/identity', () => ({
      ClientSecretCredential: class {
        constructor(_t: string, _c: string, _s: string) {}
      },
    }));
    vi.doMock('@azure/arm-storage', () => ({
      StorageManagementClient: class {
        storageAccounts = {
          // Async iterator that yields nothing.
          list: () => ({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [Symbol.asyncIterator](): AsyncIterator<any> {
              return { next: async () => ({ value: undefined, done: true }) };
            },
          }),
        };
      },
    }));

    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', {
        action: 'verify_control',
        credentials: validCreds,
        checkType: 'storage_encryption',
      }),
      {}
    );
    expect([200, 401, 403, 500]).toContain(res.statusCode);
    const body = parseBody(res);
    cloudVerifyControlBodySchema.parse(body);
  });
});
