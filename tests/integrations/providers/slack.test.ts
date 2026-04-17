/**
 * Contract tests for netlify/functions/providers/slack-sync.cjs
 *
 * We use msw to intercept HTTP calls the Slack WebClient makes to
 * https://slack.com/api/*. This tests the real adapter end-to-end (request
 * shape, response parsing, error handling) without hitting real Slack.
 *
 * Slack API note: all Slack Web API calls return HTTP 200; success/failure is
 * encoded in the JSON body as { ok: true/false, error?: string }.
 */
import { describe, expect, it, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { providerSyncResultSchema } from '../../helpers/schemas';

// ----- fixtures ---------------------------------------------------------

const fakeTeam = {
  id: 'T12345',
  name: 'Acme Workspace',
  domain: 'acme',
  email_domain: 'acme.com',
  enterprise_id: null,
};

const fakeAuthTest = {
  ok: true,
  url: 'https://acme.slack.com/',
  team: 'Acme Workspace',
  user: 'compliance-bot',
  team_id: 'T12345',
  user_id: 'U99999',
  bot_id: 'B11111',
};

const fakeUsers = [
  {
    id: 'U001',
    name: 'alice',
    real_name: 'Alice A',
    profile: { display_name: 'alice', email: 'alice@acme.com' },
    is_admin: true,
    is_owner: false,
    is_primary_owner: false,
    is_restricted: false,
    is_ultra_restricted: false,
    is_bot: false,
    deleted: false,
    has_2fa: true,
    updated: 1700000000,
  },
  {
    id: 'U002',
    name: 'bob',
    real_name: 'Bob B',
    profile: { display_name: 'bob', email: 'bob@acme.com' },
    is_admin: false,
    is_owner: false,
    is_primary_owner: false,
    is_restricted: false,
    is_ultra_restricted: false,
    is_bot: false,
    deleted: false,
    has_2fa: false,
    updated: 1700000000,
  },
  {
    id: 'UBOT',
    name: 'botty',
    real_name: 'Botty',
    profile: { display_name: 'botty' },
    is_admin: false,
    is_owner: false,
    is_primary_owner: false,
    is_restricted: false,
    is_ultra_restricted: false,
    is_bot: true,
    deleted: false,
    has_2fa: false,
    updated: 1700000000,
  },
];

const fakeChannels = [
  {
    id: 'C001',
    name: 'general',
    is_private: false,
    is_archived: false,
    is_general: true,
    is_shared: false,
    is_ext_shared: false,
    num_members: 10,
    created: 1600000000,
    creator: 'U001',
  },
  {
    id: 'C002',
    name: 'secret',
    is_private: true,
    is_archived: false,
    is_general: false,
    is_shared: false,
    is_ext_shared: false,
    num_members: 3,
    created: 1600000000,
    creator: 'U001',
  },
];

const fakeUserGroups = [
  {
    id: 'S001',
    name: 'Admins',
    handle: 'admins',
    description: 'Workspace admins',
    is_external: false,
    date_create: 1600000000,
    date_update: 1600000001,
    date_delete: 0,
    user_count: 2,
    users: ['U001'],
  },
];

const fakeLogins = [
  {
    user_id: 'U001',
    username: 'alice',
    date_first: 1700000000,
    date_last: 1700000100,
    count: 5,
    ip: '1.2.3.4',
    user_agent: 'Mozilla/5.0',
    isp: 'ISP',
    country: 'US',
    region: 'CA',
  },
];

// ----- msw server -------------------------------------------------------

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

function slackOk(body: Record<string, unknown>) {
  return HttpResponse.json({ ok: true, ...body });
}

function happyPathHandlers() {
  return [
    http.post('https://slack.com/api/auth.test', () => slackOk(fakeAuthTest)),
    http.post('https://slack.com/api/team.info', () => slackOk({ team: fakeTeam })),
    http.post('https://slack.com/api/users.list', () =>
      slackOk({ members: fakeUsers, response_metadata: { next_cursor: '' } })
    ),
    http.post('https://slack.com/api/conversations.list', () =>
      slackOk({ channels: fakeChannels, response_metadata: { next_cursor: '' } })
    ),
    http.post('https://slack.com/api/usergroups.list', () =>
      slackOk({ usergroups: fakeUserGroups })
    ),
    http.post('https://slack.com/api/team.accessLogs', () =>
      slackOk({ logins: fakeLogins })
    ),
  ];
}

// ----- module loader ----------------------------------------------------

type SlackSyncModule = {
  syncSlack: (
    token: string,
    config?: Record<string, unknown>
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
  getMappedControls: (dataType: string) => string[];
};

async function loadModule(): Promise<SlackSyncModule> {
  const mod = await import('../../../netlify/functions/providers/slack-sync.cjs');
  return (mod as { default?: SlackSyncModule }).default ?? (mod as unknown as SlackSyncModule);
}

// ----- tests ------------------------------------------------------------

describe('slack-sync: testConnection', () => {
  it('forwards the access token as an Authorization Bearer header', async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.post('https://slack.com/api/auth.test', ({ request }) => {
        capturedAuth = request.headers.get('authorization');
        return slackOk(fakeAuthTest);
      }),
      http.post('https://slack.com/api/team.info', () => slackOk({ team: fakeTeam }))
    );
    const slack = await loadModule();
    await slack.testConnection('xoxb-special-token');
    expect(capturedAuth).toMatch(/Bearer\s+xoxb-special-token/);
  });

  it('returns success envelope with normalized account info', async () => {
    server.use(
      http.post('https://slack.com/api/auth.test', () => slackOk(fakeAuthTest)),
      http.post('https://slack.com/api/team.info', () => slackOk({ team: fakeTeam }))
    );
    const slack = await loadModule();
    const res = await slack.testConnection('xoxb-good');
    expect(res.success).toBe(true);
    expect(res.accountId).toBe('T12345');
    expect(res.accountName).toBe('Acme Workspace');
    expect(res.metadata).toMatchObject({
      domain: 'acme',
      userId: 'U99999',
      botId: 'B11111',
      isEnterprise: false,
    });
  });

  it('returns failure envelope on {ok:false, error:"invalid_auth"}', async () => {
    server.use(
      http.post('https://slack.com/api/auth.test', () =>
        HttpResponse.json({ ok: false, error: 'invalid_auth' })
      ),
      // team.info should not be reached, but guard in case.
      http.post('https://slack.com/api/team.info', () =>
        HttpResponse.json({ ok: false, error: 'invalid_auth' })
      )
    );
    const slack = await loadModule();
    const res = await slack.testConnection('bad-token');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/invalid_auth/);
  });
});

describe('slack-sync: syncSlack', () => {
  it('returns envelope conforming to providerSyncResultSchema', async () => {
    server.use(...happyPathHandlers());
    const slack = await loadModule();
    const res = await slack.syncSlack('xoxb-xxx');

    const parsed = providerSyncResultSchema.parse(res);
    // users + channels + user_groups + access_logs
    expect(parsed.recordCount).toBe(
      fakeUsers.length + fakeChannels.length + fakeUserGroups.length + fakeLogins.length
    );

    const normalized = res.normalized as {
      team: { id: string; name: string };
      users: { total: number; bots: number; admins: number; with2fa: number };
      channels: { total: number; private: number };
    };
    expect(normalized.team.id).toBe('T12345');
    expect(normalized.users.total).toBe(fakeUsers.length);
    expect(normalized.users.bots).toBe(1);
    expect(normalized.users.admins).toBe(1);
    expect(normalized.users.with2fa).toBe(1);
    expect(normalized.channels.total).toBe(fakeChannels.length);
    expect(normalized.channels.private).toBe(1);
  });

  it('records a non-suppressed ok:false error (e.g. missing_scope) in errors', async () => {
    server.use(
      http.post('https://slack.com/api/team.info', () => slackOk({ team: fakeTeam })),
      http.post('https://slack.com/api/users.list', () =>
        HttpResponse.json({ ok: false, error: 'missing_scope' })
      ),
      http.post('https://slack.com/api/conversations.list', () =>
        slackOk({ channels: fakeChannels, response_metadata: { next_cursor: '' } })
      ),
      http.post('https://slack.com/api/usergroups.list', () =>
        slackOk({ usergroups: fakeUserGroups })
      ),
      http.post('https://slack.com/api/team.accessLogs', () =>
        slackOk({ logins: fakeLogins })
      ),
      // Catch-all safety net.
      http.post('https://slack.com/api/*', () =>
        HttpResponse.json({ ok: false, error: 'unknown_method' })
      )
    );
    const slack = await loadModule();
    const res = await slack.syncSlack('xoxb-xxx');
    const userErr = res.errors.find((e) => e.type === 'users');
    expect(userErr).toBeDefined();
    expect(userErr?.error).toMatch(/missing_scope/);
  });
});

describe('slack-sync: getMappedControls', () => {
  it('returns known control IDs for documented data types', async () => {
    const slack = await loadModule();
    expect(slack.getMappedControls('team')).toContain('AC-1');
    expect(slack.getMappedControls('users')).toContain('AC-2');
    expect(slack.getMappedControls('channels')).toContain('SC-7');
    expect(slack.getMappedControls('access_logs')).toContain('AU-2');
  });

  it('returns [] for unknown data types', async () => {
    const slack = await loadModule();
    expect(slack.getMappedControls('nonexistent')).toEqual([]);
  });
});
