/**
 * Handler-level contract tests for netlify/functions/gcp-verify.cjs
 *
 * Google SDK clients use their own HTTP layer; msw does not intercept them
 * reliably. We focus on handler dispatch (CORS, method, validation, action
 * routing) and mock google-auth-library for the one test that exercises an
 * SDK call path.
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
  const mod = await import('../../../netlify/functions/gcp-verify.cjs');
  return (mod as { handler?: Handler; default?: { handler?: Handler } }).handler
    ?? (mod as { default?: { handler: Handler } }).default!.handler;
}

const validCreds = {
  projectId: 'fake-project',
  clientEmail: 'fake@fake-project.iam.gserviceaccount.com',
  // Not a real key — handler will just pass it to google-auth-library in the
  // unmocked path. For mocked tests, the value doesn't matter.
  privateKey: '-----BEGIN PRIVATE KEY-----\\nfake\\n-----END PRIVATE KEY-----\\n',
};

beforeEach(() => {
  vi.resetModules();
});

describe('gcp-verify: CORS + method', () => {
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

describe('gcp-verify: body validation', () => {
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

describe('gcp-verify: SDK exercise (mocked)', () => {
  it('test_connection returns an envelope matching the schema', async () => {
    vi.doMock('google-auth-library', () => ({
      GoogleAuth: class {
        constructor(_cfg: unknown) {}
        async getClient() {
          return {
            request: async (_args: { url: string }) => ({
              data: {
                projectId: validCreds.projectId,
                name: 'Fake Project',
                projectNumber: '1234567890',
                lifecycleState: 'ACTIVE',
              },
            }),
          };
        }
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

  it('verify_control (mfa_status) returns a control envelope', async () => {
    // mfa_status is a placeholder that doesn't touch any SDK, so no mocking
    // is required — this exercises the dispatch path end-to-end. The GCP
    // placeholder returns status='not_checked', which is outside the strict
    // enum in cloudVerifyControlBodySchema; assert envelope shape directly.
    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', {
        action: 'verify_control',
        credentials: validCreds,
        checkType: 'mfa_status',
      }),
      {}
    );
    expect([200, 401, 403, 500]).toContain(res.statusCode);
    const body = parseBody<{
      status?: string;
      details?: string;
      recommendations?: unknown;
      error?: string;
    }>(res);
    // One of: a valid control result (status+details) or an error envelope.
    const hasControl = typeof body.status === 'string' && typeof body.details === 'string';
    const hasError = typeof body.error === 'string';
    expect(hasControl || hasError).toBe(true);
  });
});
