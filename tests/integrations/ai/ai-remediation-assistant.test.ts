/**
 * Contract tests for netlify/functions/ai-remediation-assistant.cjs
 *
 * Chat-style endpoint wrapping Anthropic. msw intercepts the SDK's outbound
 * fetch to api.anthropic.com.
 */
import { describe, expect, it, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { jsonEvent, optionsEvent, parseBody } from '../../helpers/event';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

type Handler = (event: unknown, context?: unknown) => Promise<{
  statusCode: number;
  headers?: Record<string, unknown>;
  body: string;
}>;

async function loadHandler(): Promise<Handler> {
  const mod = await import('../../../netlify/functions/ai-remediation-assistant.cjs');
  return (mod as { handler?: Handler }).handler
    ?? (mod as unknown as { default: Handler }).default;
}

function anthropicTextHandler(text: string) {
  return http.post('https://api.anthropic.com/v1/messages', () =>
    HttpResponse.json({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text }],
      model: 'claude-sonnet-4-20250514',
      stop_reason: 'end_turn',
      usage: { input_tokens: 20, output_tokens: 40 },
    }),
  );
}

describe('ai-remediation-assistant: method guards', () => {
  it('OPTIONS preflight returns 204 with CORS', async () => {
    const handler = await loadHandler();
    const res = await handler(optionsEvent());
    expect(res.statusCode).toBe(204);
    expect(String(res.headers!['Access-Control-Allow-Methods'])).toMatch(/POST/);
  });

  it('rejects non-POST with 405', async () => {
    const handler = await loadHandler();
    const res = await handler(jsonEvent('GET', null));
    expect(res.statusCode).toBe(405);
  });
});

describe('ai-remediation-assistant: validation', () => {
  it('returns 400 when controlContext is missing', async () => {
    const handler = await loadHandler();
    const res = await handler(jsonEvent('POST', { userMessage: 'how do I fix this?' }));
    expect(res.statusCode).toBe(400);
    const body = parseBody<{ error: string; details?: string[] }>(res);
    expect(body.error).toMatch(/Validation failed/i);
    expect(body.details?.join(',') ?? '').toMatch(/controlContext/);
  });

  it('returns 400 when userMessage is missing', async () => {
    const handler = await loadHandler();
    const res = await handler(jsonEvent('POST', { controlContext: 'AC-2: Account Management' }));
    expect(res.statusCode).toBe(400);
    const body = parseBody<{ error: string; details?: string[] }>(res);
    expect(body.details?.join(',') ?? '').toMatch(/userMessage/);
  });
});

describe('ai-remediation-assistant: happy path', () => {
  it('returns { success:true, response, metadata } with Anthropic text', async () => {
    server.use(
      anthropicTextHandler(
        '## Fix\nEnable MFA via `aws iam update-account-password-policy`.\n',
      ),
    );
    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', {
        controlContext: 'AC-2: Account Management — ensure MFA is enforced.',
        userMessage: 'How do I enable MFA in AWS?',
        companyName: 'Acme',
      }),
    );
    expect(res.statusCode).toBe(200);
    const body = parseBody<{
      success: boolean;
      response: string;
      metadata: { model: string; timestamp: string };
    }>(res);
    expect(body.success).toBe(true);
    expect(typeof body.response).toBe('string');
    expect(body.response).toMatch(/MFA/);
    expect(body.metadata.model).toBe('claude-sonnet-4-20250514');
    expect(body.metadata.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('accepts conversationHistory and still succeeds', async () => {
    server.use(anthropicTextHandler('Noted.'));
    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', {
        controlContext: 'AC-2',
        userMessage: 'and for GCP?',
        conversationHistory: [
          { role: 'user', content: 'How about AWS?' },
          { role: 'assistant', content: 'Use IAM.' },
        ],
      }),
    );
    expect(res.statusCode).toBe(200);
    const body = parseBody<{ success: boolean; response: string }>(res);
    expect(body.success).toBe(true);
    expect(body.response).toBe('Noted.');
  });
});

describe('ai-remediation-assistant: error surfaces', () => {
  it('surfaces Anthropic 401 as an error envelope (success:false not set, error present)', async () => {
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
      jsonEvent('POST', { controlContext: 'AC-2', userMessage: 'help' }),
    );
    expect(res.statusCode).toBe(401);
    const body = parseBody<{ success?: boolean; error: string }>(res);
    // The handler's errorResponse() does not set success:false explicitly —
    // absence of success:true is the contract here.
    expect(body.success).not.toBe(true);
    expect(body.error).toMatch(/Invalid Anthropic API key/i);
  });

  it('surfaces Anthropic 400 (non-retryable) as a 500 error envelope', async () => {
    // NOTE: the Anthropic SDK retries 5xx automatically (blows past the test
    // timeout). 4xx responses other than 401/429 fall through to the generic
    // catch, which returns 500 "Failed to process request". We test that path
    // using a 400 so the SDK does not retry.
    server.use(
      http.post('https://api.anthropic.com/v1/messages', () =>
        HttpResponse.json(
          { type: 'error', error: { type: 'invalid_request_error', message: 'bad input' } },
          { status: 400 },
        ),
      ),
    );
    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', { controlContext: 'AC-2', userMessage: 'help' }),
    );
    expect(res.statusCode).toBe(500);
    const body = parseBody<{ success?: boolean; error: string }>(res);
    expect(body.success).not.toBe(true);
    expect(body.error).toMatch(/Failed to process request/i);
  });
});
