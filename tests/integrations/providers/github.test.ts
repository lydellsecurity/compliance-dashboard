/**
 * Contract tests for netlify/functions/providers/github-sync.cjs
 *
 * We use msw to intercept the HTTP calls Octokit makes to api.github.com.
 * This tests the real adapter end-to-end (request shape, response parsing,
 * error handling) without hitting a real GitHub.
 *
 * No accounts required. No SDK mocking needed.
 */
import { describe, expect, it, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { providerSyncResultSchema } from '../../helpers/schemas';

// ----- fixtures ---------------------------------------------------------

const fakeUser = {
  login: 'octocat',
  id: 1,
  name: 'Octo Cat',
  email: 'octo@example.com',
  company: 'GitHub',
  public_repos: 3,
};

const fakeRepos = [
  { id: 1, name: 'a', full_name: 'octocat/a', private: false, archived: false, fork: false, default_branch: 'main', owner: { login: 'octocat' } },
  { id: 2, name: 'b', full_name: 'octocat/b', private: true,  archived: false, fork: false, default_branch: 'main', owner: { login: 'octocat' }, has_vulnerability_alerts_enabled: true },
  { id: 3, name: 'c', full_name: 'octocat/c', private: true,  archived: true,  fork: false, default_branch: 'main', owner: { login: 'octocat' } },
];

// ----- msw server -------------------------------------------------------

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

function happyPathHandlers(token = 'gh_xxx') {
  return [
    http.get('https://api.github.com/user', ({ request }) => {
      // Assert the auth header gets forwarded.
      const auth = request.headers.get('authorization');
      if (!auth || !auth.includes(token)) {
        return HttpResponse.json({ message: 'Bad credentials' }, { status: 401 });
      }
      return HttpResponse.json(fakeUser);
    }),
    http.get('https://api.github.com/user/repos', () => HttpResponse.json(fakeRepos)),
    // Branch protection — returns 404 (no protection configured).
    http.get('https://api.github.com/repos/:owner/:repo/branches/:branch/protection', () =>
      HttpResponse.json({ message: 'Branch not protected' }, { status: 404 })
    ),
  ];
}

// ----- module loader ----------------------------------------------------

type GithubSyncModule = {
  syncGitHub: (token: string, config?: { organization?: string }) => Promise<{
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
  getMappedControls: (dataType: string) => string[];
};

async function loadModule(): Promise<GithubSyncModule> {
  const mod = await import('../../../netlify/functions/providers/github-sync.cjs');
  return (mod as { default?: GithubSyncModule }).default ?? (mod as unknown as GithubSyncModule);
}

// ----- tests ------------------------------------------------------------

describe('github-sync: testConnection', () => {
  it('returns success envelope with normalized account info', async () => {
    server.use(...happyPathHandlers());
    const gh = await loadModule();
    const res = await gh.testConnection('gh_xxx');
    expect(res.success).toBe(true);
    expect(res.accountId).toBe('octocat');
    expect(res.accountName).toBe('Octo Cat');
    expect(res.metadata).toMatchObject({ email: 'octo@example.com', publicRepos: 3 });
  });

  it('forwards the access token as a bearer credential', async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.get('https://api.github.com/user', ({ request }) => {
        capturedAuth = request.headers.get('authorization');
        return HttpResponse.json(fakeUser);
      })
    );
    const gh = await loadModule();
    await gh.testConnection('gh_special_token');
    expect(capturedAuth).toMatch(/gh_special_token/);
  });

  it('returns failure envelope on 401', async () => {
    server.use(
      http.get('https://api.github.com/user', () =>
        HttpResponse.json({ message: 'Bad credentials' }, { status: 401 })
      )
    );
    const gh = await loadModule();
    const res = await gh.testConnection('bad');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Bad credentials/);
  });
});

describe('github-sync: syncGitHub', () => {
  it('returns envelope conforming to providerSyncResultSchema', async () => {
    server.use(...happyPathHandlers());
    const gh = await loadModule();
    const res = await gh.syncGitHub('gh_xxx');

    const parsed = providerSyncResultSchema.parse(res);
    expect(parsed.recordCount).toBeGreaterThanOrEqual(fakeRepos.length);

    const normalized = res.normalized as {
      repositories: { total: number; withSecurityFeatures: number; archived: number };
    };
    expect(normalized.repositories.total).toBe(fakeRepos.length);
    expect(normalized.repositories.withSecurityFeatures).toBe(1); // only repo 'b'
    expect(normalized.repositories.archived).toBe(1); // only repo 'c'
  });

  it('suppresses 403 errors from optional org endpoints', async () => {
    server.use(
      ...happyPathHandlers(),
      http.get('https://api.github.com/orgs/:org/members', () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
      ),
      http.get('https://api.github.com/orgs/:org/dependabot/alerts', () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
      ),
      http.get('https://api.github.com/orgs/:org/code-scanning/alerts', () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
      ),
      http.get('https://api.github.com/orgs/:org/audit-log', () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
      ),
      // Octokit's audit-log paginator sometimes probes root/legacy paths.
      // Return 403 as a catch-all for any remaining GitHub endpoints.
      http.get('https://api.github.com/*', () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
      )
    );
    const gh = await loadModule();
    const res = await gh.syncGitHub('gh_xxx', { organization: 'octo-org' });
    const orgErrors = res.errors.filter((e) =>
      ['organization_members', 'security_alerts', 'code_scanning', 'audit_log'].includes(e.type)
    );
    expect(orgErrors).toHaveLength(0);
  });

  it('records non-403 server errors in the errors array', async () => {
    server.use(
      ...happyPathHandlers(),
      http.get('https://api.github.com/orgs/:org/members', () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 })
      ),
      http.get('https://api.github.com/orgs/:org/dependabot/alerts', () => HttpResponse.json([])),
      http.get('https://api.github.com/orgs/:org/code-scanning/alerts', () => HttpResponse.json([])),
      http.get('https://api.github.com/orgs/:org/audit-log', () => HttpResponse.json([]))
    );
    const gh = await loadModule();
    const res = await gh.syncGitHub('gh_xxx', { organization: 'octo-org' });
    const members = res.errors.find((e) => e.type === 'organization_members');
    expect(members).toBeDefined();
    expect(members?.error).toMatch(/boom|500/);
  });
});

describe('github-sync: getMappedControls', () => {
  it('returns known control IDs for documented data types', async () => {
    const gh = await loadModule();
    expect(gh.getMappedControls('repositories')).toContain('CM-2');
    expect(gh.getMappedControls('audit_log')).toContain('AU-2');
    expect(gh.getMappedControls('security_alerts')).toContain('SI-2');
  });

  it('returns [] for unknown data types', async () => {
    const gh = await loadModule();
    expect(gh.getMappedControls('nonexistent')).toEqual([]);
  });
});
