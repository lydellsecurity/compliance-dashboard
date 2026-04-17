/**
 * Cross-integration chaos / fault-injection tests.
 *
 * We pick the GitHub adapter as representative — same patterns apply to the
 * other provider adapters (Slack, Okta, Jira, CrowdStrike). The goal is to
 * prove the adapter envelope survives common failure modes without hanging
 * or throwing uncaught exceptions:
 *   - network timeout
 *   - 429 rate limit
 *   - 500 server error
 *   - malformed (non-JSON) response body
 *   - OAuth 401 (bad credentials)
 *
 * Like the other provider tests, we use msw to intercept Octokit's HTTP calls.
 */
import { describe, expect, it, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

type GithubSyncModule = {
  syncGitHub: (
    token: string,
    config?: { organization?: string }
  ) => Promise<{
    data: Record<string, unknown>;
    normalized: Record<string, unknown>;
    errors: Array<{ type: string; error: string }>;
    recordCount: number;
  }>;
  testConnection: (token: string) => Promise<{
    success: boolean;
    accountId?: string;
    accountName?: string;
    metadata?: Record<string, unknown>;
    error?: string;
  }>;
};

async function loadModule(): Promise<GithubSyncModule> {
  const mod = await import('../../netlify/functions/providers/github-sync.cjs');
  return (mod as { default?: GithubSyncModule }).default ?? (mod as unknown as GithubSyncModule);
}

describe('chaos: network timeout', () => {
  // Runs within the default 10s vitest timeout. Keep the msw delay inside
  // that budget so the test still exits cleanly.
  it('delayed response eventually resolves without hanging', async () => {
    server.use(
      http.get('https://api.github.com/user', async () => {
        await delay(3000);
        return HttpResponse.json({ message: 'server busy' }, { status: 503 });
      })
    );
    const gh = await loadModule();
    const res = await gh.testConnection('gh_xxx');
    expect(res.success).toBe(false);
    expect(typeof res.error).toBe('string');
  }, 8000);
});

describe('chaos: rate limiting (429)', () => {
  it('429 with Retry-After returns a structured failure', async () => {
    server.use(
      http.get('https://api.github.com/user', () =>
        HttpResponse.json(
          { message: 'API rate limit exceeded' },
          {
            status: 429,
            headers: {
              'Retry-After': '60',
              'X-RateLimit-Remaining': '0',
            },
          }
        )
      )
    );
    const gh = await loadModule();
    const res = await gh.testConnection('gh_xxx');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/rate limit|429/i);
  });
});

describe('chaos: 500 Internal Server Error', () => {
  it('testConnection surfaces a failure envelope', async () => {
    server.use(
      http.get('https://api.github.com/user', () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 })
      )
    );
    const gh = await loadModule();
    const res = await gh.testConnection('gh_xxx');
    expect(res.success).toBe(false);
    expect(res.error).toBeTypeOf('string');
  });

  it('syncGitHub records errors[] when /user fails with 500', async () => {
    server.use(
      http.get('https://api.github.com/user', () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 })
      )
    );
    const gh = await loadModule();
    const res = await gh.syncGitHub('gh_xxx');
    // /user is fetched at the top of syncGitHub; its failure lands in errors[] as 'general'.
    expect(res.errors.length).toBeGreaterThan(0);
    const general = res.errors.find((e) => e.type === 'general');
    expect(general).toBeDefined();
  });
});

describe('chaos: malformed JSON response', () => {
  it('non-JSON body does not crash the adapter', async () => {
    server.use(
      http.get('https://api.github.com/user', () =>
        HttpResponse.text('<html>not json</html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        })
      )
    );
    const gh = await loadModule();
    // Either testConnection resolves with a failure envelope, or it resolves
    // with success=false because Octokit chokes parsing. Must NOT throw.
    const res = await gh.testConnection('gh_xxx');
    expect(typeof res.success).toBe('boolean');
    if (!res.success) {
      expect(res.error).toBeTypeOf('string');
    }
  });
});

describe('chaos: OAuth 401', () => {
  it('testConnection returns structured failure (not uncaught)', async () => {
    server.use(
      http.get('https://api.github.com/user', () =>
        HttpResponse.json({ message: 'Bad credentials' }, { status: 401 })
      )
    );
    const gh = await loadModule();
    const res = await gh.testConnection('bad-token');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/credential|401|unauthori/i);
  });

  it('syncGitHub with 401 from /user records error and returns a valid envelope', async () => {
    server.use(
      http.get('https://api.github.com/user', () =>
        HttpResponse.json({ message: 'Bad credentials' }, { status: 401 })
      )
    );
    const gh = await loadModule();
    const res = await gh.syncGitHub('bad-token');
    // Envelope shape preserved.
    expect(res).toMatchObject({
      data: expect.any(Object),
      normalized: expect.any(Object),
      errors: expect.any(Array),
      recordCount: expect.any(Number),
    });
    expect(res.errors.length).toBeGreaterThan(0);
  });
});
