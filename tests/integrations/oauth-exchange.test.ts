/**
 * Contract tests for netlify/functions/oauth-exchange.cjs
 *
 * The handler uses raw `fetch` against provider token endpoints
 * (GitHub, Slack, Google, Okta, Azure, Atlassian, etc.). msw intercepts those.
 * We don't exercise the DB-writing branches here — we stay on the paths that
 * don't require a real Supabase (get-auth-url, exchange without connectionId,
 * unknown-action/unknown-provider error paths).
 */
import { describe, expect, it, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { jsonEvent, optionsEvent, parseBody } from '../helpers/event';
import { oauthExchangeBodySchema } from '../helpers/schemas';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

type Handler = (event: unknown) => Promise<{
  statusCode: number;
  headers?: Record<string, unknown>;
  body: string;
}>;

async function loadHandler(): Promise<Handler> {
  const mod = await import('../../netlify/functions/oauth-exchange.cjs');
  return (mod as { handler?: Handler }).handler
    ?? (mod as unknown as { default: Handler }).default;
}

describe('oauth-exchange: method guards', () => {
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

describe('oauth-exchange: get-auth-url', () => {
  it('returns github auth URL with client_id, scope, state', async () => {
    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', {
        action: 'get-auth-url',
        providerId: 'github',
        redirectUri: 'https://example.com/cb',
        config: { clientId: 'gh_client_123' },
      }),
    );
    expect(res.statusCode).toBe(200);
    const body = parseBody<{
      success: boolean;
      authUrl: string;
      state: string;
      scopes: string[];
    }>(res);
    expect(body.success).toBe(true);
    expect(body.authUrl).toContain('https://github.com/login/oauth/authorize');
    expect(body.authUrl).toContain('client_id=gh_client_123');
    expect(body.authUrl).toContain(encodeURIComponent('https://example.com/cb'));
    expect(body.state).toMatch(/^[0-9a-f]+$/);
    expect(body.scopes).toEqual(expect.arrayContaining(['repo', 'read:org']));
  });

  it('returns 400 when config.clientId is missing', async () => {
    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', {
        action: 'get-auth-url',
        providerId: 'github',
        redirectUri: 'https://example.com/cb',
        config: {},
      }),
    );
    expect(res.statusCode).toBe(400);
    const body = parseBody<{ error: string }>(res);
    expect(body.error).toMatch(/clientId|redirectUri/);
  });

  it('returns 400 for unknown provider on get-auth-url', async () => {
    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', {
        action: 'get-auth-url',
        providerId: 'not-a-real-provider',
        redirectUri: 'https://example.com/cb',
        config: { clientId: 'x' },
      }),
    );
    expect(res.statusCode).toBe(400);
    const body = parseBody<{ error: string }>(res);
    expect(body.error).toMatch(/Unknown provider/i);
  });
});

describe('oauth-exchange: exchange', () => {
  it('exchanges a github auth code for tokens (no connectionId ⇒ no DB write)', async () => {
    let capturedHeaders: Headers | null = null;
    server.use(
      http.post('https://github.com/login/oauth/access_token', ({ request }) => {
        capturedHeaders = request.headers;
        return HttpResponse.json({
          access_token: 'gho_fake_access',
          refresh_token: 'ghr_fake_refresh',
          expires_in: 3600,
          token_type: 'bearer',
          scope: 'repo,read:org',
        });
      }),
    );
    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', {
        action: 'exchange',
        providerId: 'github',
        code: 'tmp_code_abc',
        redirectUri: 'https://example.com/cb',
        config: { clientId: 'cid', clientSecret: 'csec' },
      }),
    );
    expect(res.statusCode).toBe(200);
    const parsed = oauthExchangeBodySchema.parse(parseBody(res));
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe('exchange');
    expect(parsed.expiresIn).toBe(3600);
    expect(parsed.tokenType).toBe('bearer');
    expect(parsed.scope).toBe('repo,read:org');
    expect(parsed.hasAccessToken).toBe(true);
    expect(parsed.hasRefreshToken).toBe(true);
    // GitHub adapter sets Accept: application/json so it gets JSON back
    expect(capturedHeaders?.get('accept')).toBe('application/json');
  });

  it('surfaces provider token endpoint errors as 500 with a message', async () => {
    server.use(
      http.post('https://github.com/login/oauth/access_token', () =>
        HttpResponse.text('bad_verification_code', { status: 400 }),
      ),
    );
    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', {
        action: 'exchange',
        providerId: 'github',
        code: 'bad',
        redirectUri: 'https://example.com/cb',
        config: { clientId: 'cid', clientSecret: 'csec' },
      }),
    );
    expect(res.statusCode).toBe(500);
    const body = parseBody<{ error: string; message?: string }>(res);
    expect(body.message ?? body.error).toMatch(/Token exchange failed|bad_verification_code|400/);
  });

  it('returns 400 when exchange is missing code', async () => {
    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', {
        action: 'exchange',
        providerId: 'github',
        redirectUri: 'https://example.com/cb',
        config: { clientId: 'cid', clientSecret: 'csec' },
      }),
    );
    expect(res.statusCode).toBe(400);
    const body = parseBody<{ error: string }>(res);
    expect(body.error).toMatch(/code/);
  });
});

describe('oauth-exchange: error envelopes', () => {
  it('returns 400 on unknown action', async () => {
    const handler = await loadHandler();
    const res = await handler(
      jsonEvent('POST', { action: 'telepathy', providerId: 'github' }),
    );
    expect(res.statusCode).toBe(400);
    const body = parseBody<{ error: string }>(res);
    expect(body.error).toMatch(/Unknown action/i);
  });

  it('returns 400 when action is missing', async () => {
    const handler = await loadHandler();
    const res = await handler(jsonEvent('POST', { providerId: 'github' }));
    expect(res.statusCode).toBe(400);
    const body = parseBody<{ error: string }>(res);
    expect(body.error).toMatch(/action/);
  });

  it('returns 400 when providerId is missing', async () => {
    const handler = await loadHandler();
    const res = await handler(jsonEvent('POST', { action: 'exchange' }));
    expect(res.statusCode).toBe(400);
    const body = parseBody<{ error: string }>(res);
    expect(body.error).toMatch(/providerId/);
  });
});
