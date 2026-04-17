/**
 * Contract tests for netlify/functions/generate-ai-policy.cjs
 *
 * The handler wraps the Anthropic SDK, which calls
 * https://api.anthropic.com/v1/messages via global fetch. msw intercepts those
 * calls so we can exercise the real handler end-to-end without hitting the
 * Anthropic API. See probe in git history — msw successfully intercepts the
 * SDK's fetch without needing to mock the module itself.
 */
import { describe, expect, it, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { jsonEvent, optionsEvent, parseBody } from '../../helpers/event';
import { aiPolicyResponseSchema } from '../../helpers/schemas';

// ----- msw server -------------------------------------------------------

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

// ----- fixtures ---------------------------------------------------------

const stubPolicyText = `# Access Control Policy

## HEADER
- Policy Name: Access Control
- Version: 1.0

## PURPOSE
Define access requirements.

## POLICY REQUIREMENTS
1. Users must authenticate with MFA.`;

function anthropicHappyHandler(text = stubPolicyText) {
  return http.post('https://api.anthropic.com/v1/messages', () =>
    HttpResponse.json({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text }],
      model: 'claude-sonnet-4-20250514',
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 20 },
    }),
  );
}

// ----- loader -----------------------------------------------------------

type Handler = (event: unknown, context?: unknown) => Promise<{
  statusCode: number;
  headers?: Record<string, unknown>;
  body: string;
}>;

async function loadHandler(): Promise<Handler> {
  const mod = await import('../../../netlify/functions/generate-ai-policy.cjs');
  return (mod as { handler?: Handler; default?: { handler?: Handler } }).handler
    ?? (mod as { default?: { handler?: Handler } }).default?.handler
    ?? (mod as unknown as { default: Handler }).default;
}

// ----- tests ------------------------------------------------------------

describe('generate-ai-policy: method guards', () => {
  it('OPTIONS preflight returns CORS headers (204)', async () => {
    const handler = await loadHandler();
    const res = await handler(optionsEvent());
    expect(res.statusCode).toBe(204);
    expect(res.headers).toBeDefined();
    expect(String(res.headers!['Access-Control-Allow-Origin'])).toBeTruthy();
    expect(String(res.headers!['Access-Control-Allow-Methods'])).toMatch(/POST/);
  });

  it('rejects non-POST with 405', async () => {
    const handler = await loadHandler();
    const res = await handler(jsonEvent('GET', null));
    expect(res.statusCode).toBe(405);
  });
});

describe('generate-ai-policy: validation', () => {
  it('returns 400 when body is missing control_id', async () => {
    const handler = await loadHandler();
    const res = await handler(jsonEvent('POST', { company_name: 'Acme' }));
    expect(res.statusCode).toBe(400);
    const body = parseBody<{ error: string; details?: string[] }>(res);
    expect(body.error).toMatch(/Validation failed/i);
    expect(body.details?.join(',') ?? '').toMatch(/control_id/);
  });

  it('returns 400 when body is missing company_name', async () => {
    const handler = await loadHandler();
    const res = await handler(jsonEvent('POST', { control_id: 'AC-2' }));
    expect(res.statusCode).toBe(400);
    const body = parseBody<{ error: string; details?: string[] }>(res);
    expect(body.details?.join(',') ?? '').toMatch(/company_name/);
  });
});

describe('generate-ai-policy: happy path', () => {
  it('returns aiPolicyResponseSchema envelope with policy text', async () => {
    server.use(anthropicHappyHandler());
    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', {
        control_id: 'AC-2',
        company_name: 'Acme Corp',
        framework_context: {
          controlTitle: 'Account Management',
          riskLevel: 'High',
          frameworks: ['SOC 2 CC6.1', 'ISO 27001 A.9.2.1'],
        },
      }),
    );
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    const parsed = aiPolicyResponseSchema.parse(body);
    expect(parsed.success).toBe(true);
    expect(parsed.policy).toContain('Access Control Policy');
    expect(parsed.metadata).toMatchObject({
      companyName: 'Acme Corp',
      controlId: 'AC-2',
      model: 'claude-sonnet-4-20250514',
    });
  });

  it('supports streaming flag (returns full body with streaming:true)', async () => {
    server.use(anthropicHappyHandler());
    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', {
        control_id: 'AC-3',
        company_name: 'Acme',
        stream: true,
      }),
    );
    expect(res.statusCode).toBe(200);
    const body = parseBody<{ success: boolean; streaming?: boolean; policy: string }>(res);
    expect(body.success).toBe(true);
    expect(body.streaming).toBe(true);
    expect(body.policy.length).toBeGreaterThan(0);
  });
});

describe('generate-ai-policy: error surfaces', () => {
  it('surfaces Anthropic 401 as 401 error envelope', async () => {
    server.use(
      http.post('https://api.anthropic.com/v1/messages', () =>
        HttpResponse.json(
          { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } },
          { status: 401 },
        ),
      ),
    );
    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', { control_id: 'AC-2', company_name: 'Acme' }),
    );
    expect(res.statusCode).toBe(401);
    const body = parseBody<{ error: string }>(res);
    expect(body.error).toMatch(/Invalid Anthropic API key/i);
  });
});
