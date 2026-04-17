/**
 * Contract tests for netlify/functions/providers/jira-sync.cjs
 *
 * Jira uses raw fetch against api.atlassian.com with a two-step lookup:
 *   1. GET /oauth/token/accessible-resources -> list of cloudIds
 *   2. GET /ex/jira/{cloudId}/rest/api/3/... -> actual data
 *
 * msw intercepts both. We assert the bearer token is forwarded and the
 * sync envelope conforms to providerSyncResultSchema.
 */
import { describe, expect, it, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { providerSyncResultSchema } from '../../helpers/schemas';

// ----- fixtures ---------------------------------------------------------

const CLOUD_ID = '11111111-2222-3333-4444-555555555555';
const ACCESS_TOKEN = 'atl_xxx';

const fakeAccessibleResources = [
  {
    id: CLOUD_ID,
    name: 'Acme Jira',
    url: 'https://acme.atlassian.net',
    scopes: ['read:jira-user', 'read:jira-work'],
    avatarUrl: 'https://example.com/avatar.png',
  },
];

const fakeMyself = {
  accountId: 'user-1',
  displayName: 'Jane Doe',
  emailAddress: 'jane@example.com',
  active: true,
};

const fakeServerInfo = {
  baseUrl: 'https://acme.atlassian.net',
  version: '1001.0.0-SNAPSHOT',
  deploymentType: 'Cloud',
  scmInfo: 'abc123',
};

const fakeProjects = {
  isLast: true,
  values: [
    { id: '10000', key: 'SEC', name: 'Security', projectTypeKey: 'software', style: 'next-gen', isPrivate: false },
    { id: '10001', key: 'HD',  name: 'Help Desk', projectTypeKey: 'service_desk', style: 'classic', isPrivate: true },
    { id: '10002', key: 'BIZ', name: 'Biz Ops',   projectTypeKey: 'business', style: 'classic', isPrivate: false },
  ],
};

const fakeIssues = {
  total: 2,
  issues: [
    {
      key: 'SEC-1',
      fields: {
        summary: 'SQLi in login',
        status: { name: 'Open', statusCategory: { key: 'new' } },
        priority: { name: 'Highest' },
        issuetype: { name: 'Security Vulnerability' },
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-02T00:00:00Z',
        assignee: { displayName: 'Jane Doe' },
        reporter: { displayName: 'Bob Smith' },
      },
    },
    {
      key: 'SEC-2',
      fields: {
        summary: 'XSS on profile',
        status: { name: 'In Progress', statusCategory: { key: 'indeterminate' } },
        priority: { name: 'High' },
        issuetype: { name: 'Bug' },
        created: '2025-01-03T00:00:00Z',
        updated: '2025-01-04T00:00:00Z',
        assignee: null,
        reporter: { displayName: 'Bob Smith' },
      },
    },
  ],
};

const fakeUsers = [
  { accountId: 'user-1', accountType: 'atlassian', displayName: 'Jane Doe',  active: true },
  { accountId: 'user-2', accountType: 'atlassian', displayName: 'Bob Smith', active: true },
  { accountId: 'app-1',  accountType: 'app',       displayName: 'Jira Bot',  active: true },
];

// ----- msw server -------------------------------------------------------

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

function requireBearer(token: string, request: Request): Response | null {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.includes(token)) {
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

function happyPathHandlers(token = ACCESS_TOKEN) {
  const jiraBase = `https://api.atlassian.com/ex/jira/${CLOUD_ID}/rest/api/3`;
  return [
    http.get('https://api.atlassian.com/oauth/token/accessible-resources', ({ request }) => {
      const bad = requireBearer(token, request);
      if (bad) return bad;
      return HttpResponse.json(fakeAccessibleResources);
    }),
    http.get(`${jiraBase}/myself`, ({ request }) => {
      const bad = requireBearer(token, request);
      if (bad) return bad;
      return HttpResponse.json(fakeMyself);
    }),
    http.get(`${jiraBase}/serverInfo`, ({ request }) => {
      const bad = requireBearer(token, request);
      if (bad) return bad;
      return HttpResponse.json(fakeServerInfo);
    }),
    http.get(`${jiraBase}/project/search`, ({ request }) => {
      const bad = requireBearer(token, request);
      if (bad) return bad;
      return HttpResponse.json(fakeProjects);
    }),
    http.get(`${jiraBase}/search`, ({ request }) => {
      const bad = requireBearer(token, request);
      if (bad) return bad;
      return HttpResponse.json(fakeIssues);
    }),
    http.get(`${jiraBase}/users/search`, ({ request, cookies: _cookies }) => {
      const bad = requireBearer(token, request);
      if (bad) return bad;
      const url = new URL(request.url);
      const startAt = Number(url.searchParams.get('startAt') ?? '0');
      // Return the full set on the first page; empty on subsequent pages so
      // the pagination loop terminates cleanly.
      if (startAt === 0) return HttpResponse.json(fakeUsers);
      return HttpResponse.json([]);
    }),
  ];
}

// ----- module loader ----------------------------------------------------

type JiraSyncModule = {
  syncJira: (
    accessToken: string,
    cloudId: string,
  ) => Promise<{
    data: Record<string, unknown>;
    normalized: Record<string, unknown>;
    errors: Array<{ type: string; error: string }>;
    recordCount: number;
  }>;
  testConnection: (
    accessToken: string,
    cloudId?: string | null,
  ) => Promise<{
    success: boolean;
    accountId?: string;
    accountName?: string;
    metadata?: Record<string, unknown>;
    error?: string;
  }>;
  getAccessibleResources: (accessToken: string) => Promise<Array<{ id: string; name: string; url: string }>>;
  getMappedControls: (dataType: string) => string[];
};

async function loadModule(): Promise<JiraSyncModule> {
  const mod = await import('../../../netlify/functions/providers/jira-sync.cjs');
  return (mod as { default?: JiraSyncModule }).default ?? (mod as unknown as JiraSyncModule);
}

// ----- tests ------------------------------------------------------------

describe('jira-sync: getAccessibleResources', () => {
  it('returns the array of cloudIds and forwards the bearer token', async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.get('https://api.atlassian.com/oauth/token/accessible-resources', ({ request }) => {
        capturedAuth = request.headers.get('authorization');
        return HttpResponse.json(fakeAccessibleResources);
      }),
    );
    const jira = await loadModule();
    const resources = await jira.getAccessibleResources(ACCESS_TOKEN);
    expect(Array.isArray(resources)).toBe(true);
    expect(resources).toHaveLength(1);
    expect(resources[0].id).toBe(CLOUD_ID);
    expect(capturedAuth).toMatch(new RegExp(ACCESS_TOKEN));
  });
});

describe('jira-sync: testConnection', () => {
  it('succeeds when an explicit cloudId is provided (no accessible-resources call needed)', async () => {
    server.use(...happyPathHandlers());
    const jira = await loadModule();
    const res = await jira.testConnection(ACCESS_TOKEN, CLOUD_ID);
    expect(res.success).toBe(true);
    expect(res.accountId).toBe(CLOUD_ID);
    // When no resources were discovered, site.name falls back to displayName.
    expect(res.accountName).toBe(fakeMyself.displayName);
    expect(res.metadata).toMatchObject({
      cloudId: CLOUD_ID,
      userDisplayName: fakeMyself.displayName,
      userEmail: fakeMyself.emailAddress,
    });
  });

  it('auto-discovers cloudId from accessible-resources when none is given', async () => {
    server.use(...happyPathHandlers());
    const jira = await loadModule();
    const res = await jira.testConnection(ACCESS_TOKEN);
    expect(res.success).toBe(true);
    expect(res.accountId).toBe(CLOUD_ID);
    // When resources were discovered, site.name wins.
    expect(res.accountName).toBe(fakeAccessibleResources[0].name);
    expect(res.metadata).toMatchObject({
      siteUrl: fakeAccessibleResources[0].url,
      cloudId: CLOUD_ID,
    });
  });

  it('returns failure envelope on 401', async () => {
    server.use(
      http.get('https://api.atlassian.com/oauth/token/accessible-resources', () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
      ),
      http.get(`https://api.atlassian.com/ex/jira/${CLOUD_ID}/rest/api/3/myself`, () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
      ),
    );
    const jira = await loadModule();
    const res = await jira.testConnection('bad_token', CLOUD_ID);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/401|Unauthorized/);
  });
});

describe('jira-sync: syncJira', () => {
  it('returns envelope conforming to providerSyncResultSchema', async () => {
    server.use(...happyPathHandlers());
    const jira = await loadModule();
    const res = await jira.syncJira(ACCESS_TOKEN, CLOUD_ID);

    const parsed = providerSyncResultSchema.parse(res);
    // projects (3) + issues (2) + users (3) = 8 records
    expect(parsed.recordCount).toBe(
      fakeProjects.values.length + fakeIssues.issues.length + fakeUsers.length,
    );

    const normalized = res.normalized as {
      projects: { total: number; software: number; serviceDesk: number; business: number };
      issues: { total: number; byPriority: Record<string, number>; byType: Record<string, number> };
      users: { total: number; active: number; atlassianAccounts: number; appAccounts: number };
      serverInfo: { version: string };
    };
    expect(normalized.projects.total).toBe(3);
    expect(normalized.projects.software).toBe(1);
    expect(normalized.projects.serviceDesk).toBe(1);
    expect(normalized.projects.business).toBe(1);
    expect(normalized.issues.total).toBe(2);
    expect(normalized.issues.byPriority.highest).toBe(1);
    expect(normalized.issues.byPriority.high).toBe(1);
    expect(normalized.issues.byType.vulnerability).toBe(1);
    expect(normalized.issues.byType.bug).toBe(1);
    expect(normalized.users.total).toBe(3);
    expect(normalized.users.atlassianAccounts).toBe(2);
    expect(normalized.users.appAccounts).toBe(1);
    expect(normalized.serverInfo.version).toBe(fakeServerInfo.version);

    // Happy path -> no errors.
    expect(res.errors).toHaveLength(0);
  });

  it('records errors from non-OK responses without throwing', async () => {
    const jiraBase = `https://api.atlassian.com/ex/jira/${CLOUD_ID}/rest/api/3`;
    server.use(
      // /myself succeeds so the sync can proceed past the first block.
      http.get(`${jiraBase}/myself`, () => HttpResponse.json(fakeMyself)),
      // Projects blow up.
      http.get(`${jiraBase}/project/search`, () =>
        HttpResponse.json({ message: 'server on fire' }, { status: 500 }),
      ),
      // Issues blow up.
      http.get(`${jiraBase}/search`, () =>
        HttpResponse.json({ message: 'nope' }, { status: 500 }),
      ),
      // Users & serverInfo return OK so we can verify the errors array
      // isolates just the failing fetches.
      http.get(`${jiraBase}/users/search`, () => HttpResponse.json([])),
      http.get(`${jiraBase}/serverInfo`, () => HttpResponse.json(fakeServerInfo)),
      // Catch-all for anything else to make failures loud.
      http.get('https://api.atlassian.com/*', () =>
        HttpResponse.json({ message: 'unexpected endpoint' }, { status: 599 }),
      ),
    );

    const jira = await loadModule();
    const res = await jira.syncJira(ACCESS_TOKEN, CLOUD_ID);

    const projectsErr = res.errors.find((e) => e.type === 'projects');
    const issuesErr = res.errors.find((e) => e.type === 'issues');
    expect(projectsErr).toBeDefined();
    expect(projectsErr?.error).toMatch(/500/);
    expect(issuesErr).toBeDefined();
    expect(issuesErr?.error).toMatch(/500/);
    // serverInfo succeeded -> shouldn't show up.
    expect(res.errors.find((e) => e.type === 'serverInfo')).toBeUndefined();
  });
});

describe('jira-sync: getMappedControls', () => {
  it('returns known control IDs for documented data types', async () => {
    const jira = await loadModule();
    expect(jira.getMappedControls('projects')).toContain('PM-1');
    expect(jira.getMappedControls('issues')).toContain('SI-2');
    expect(jira.getMappedControls('users')).toContain('AC-2');
    expect(jira.getMappedControls('audit_log')).toContain('AU-2');
  });

  it('returns [] for unknown data types', async () => {
    const jira = await loadModule();
    expect(jira.getMappedControls('nonexistent')).toEqual([]);
  });
});
