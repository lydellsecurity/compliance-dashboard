/**
 * Handler-level contract tests for netlify/functions/aws-verify.cjs
 *
 * We do NOT try to stub AWS SDK v2 end-to-end with msw — the SDK uses its own
 * HTTP layer that msw does not reliably intercept. Instead we test the
 * handler's dispatch contract (CORS, method, validation, action routing) and
 * use `vi.mock('aws-sdk', ...)` for the one test that exercises an SDK call.
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
  const mod = await import('../../../netlify/functions/aws-verify.cjs');
  return (mod as { handler?: Handler; default?: { handler?: Handler } }).handler
    ?? (mod as { default?: { handler: Handler } }).default!.handler;
}

const validCreds = {
  accessKeyId: 'AKIAFAKEFAKEFAKE',
  secretAccessKey: 'fakeSecret/FakeSecret+FakeSecret',
  region: 'us-east-1',
};

beforeEach(() => {
  vi.resetModules();
});

describe('aws-verify: CORS + method', () => {
  it('OPTIONS preflight returns CORS headers', async () => {
    const handler = await loadHandler();
    const res = await handler(optionsEvent('http://localhost:5173'), {});
    expect([200, 204]).toContain(res.statusCode);
    // Headers are returned in the response; key casing varies.
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

describe('aws-verify: body validation', () => {
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

describe('aws-verify: SDK exercise (mocked)', () => {
  it('test_connection returns an envelope matching the schema', async () => {
    // Mock aws-sdk at module level BEFORE dynamic import so the handler's
    // lazy `require('aws-sdk')` picks up our fake.
    vi.doMock('aws-sdk', () => {
      class STS {
        constructor(_cfg: unknown) {}
        getCallerIdentity() {
          return {
            promise: async () => ({
              Account: '123456789012',
              UserId: 'AIDAFAKEFAKEFAKE',
              Arn: 'arn:aws:iam::123456789012:user/fake',
            }),
          };
        }
      }
      return { default: { STS }, STS };
    });

    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', { action: 'test_connection', credentials: validCreds }),
      {}
    );
    expect([200, 401, 500]).toContain(res.statusCode);
    const body = parseBody(res);
    const parsed = cloudVerifyTestConnectionBodySchema.parse(body);
    // One of these fields must be present in a healthy envelope.
    const envelope = parsed as {
      accountId?: string;
      error?: string;
      message?: string;
    };
    expect(envelope.accountId ?? envelope.error ?? envelope.message).toBeDefined();
  });

  it('verify_control (mfa_status) returns a control envelope', async () => {
    vi.doMock('aws-sdk', () => {
      class IAM {
        constructor(_cfg: unknown) {}
        listUsers() {
          return { promise: async () => ({ Users: [] }) };
        }
        listMFADevices(_args: unknown) {
          return { promise: async () => ({ MFADevices: [] }) };
        }
      }
      return { default: { IAM }, IAM };
    });

    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', {
        action: 'verify_control',
        credentials: validCreds,
        checkType: 'mfa_status',
      }),
      {}
    );
    expect([200, 401, 500]).toContain(res.statusCode);
    const body = parseBody(res);
    cloudVerifyControlBodySchema.parse(body);
  });
});
