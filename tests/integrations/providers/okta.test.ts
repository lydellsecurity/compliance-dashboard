/**
 * Contract tests for netlify/functions/providers/okta-sync.cjs
 *
 * We use msw to intercept the HTTP calls the Okta SDK (and the direct fetch
 * inside testConnection) makes to the tenant's domain. This exercises the
 * real adapter end-to-end: request shape, auth header forwarding, response
 * parsing, and error handling — all without hitting a real Okta tenant.
 */
import { describe, expect, it, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { providerSyncResultSchema } from '../../helpers/schemas';

// ----- constants --------------------------------------------------------

const DOMAIN = 'dev-12345.okta.com';
const BASE = `https://${DOMAIN}/api/v1`;

// ----- fixtures ---------------------------------------------------------

const fakeMeUser = {
  id: 'me123',
  status: 'ACTIVE',
  profile: {
    login: 'admin@example.com',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
  },
};

const fakeUsers = [
  {
    id: 'u1',
    status: 'ACTIVE',
    created: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    profile: { login: 'a@example.com', email: 'a@example.com', firstName: 'A', lastName: 'One' },
    credentials: { provider: { type: 'OKTA' } },
  },
  {
    id: 'u2',
    status: 'SUSPENDED',
    created: new Date().toISOString(),
    lastLogin: null,
    profile: { login: 'b@example.com', email: 'b@example.com', firstName: 'B', lastName: 'Two' },
    credentials: { provider: { type: 'OKTA' } },
  },
];

const fakeGroups = [
  {
    id: 'g1',
    type: 'OKTA_GROUP',
    profile: { name: 'Everyone', description: 'All users' },
    created: new Date().toISOString(),
    lastMembershipUpdated: new Date().toISOString(),
  },
];

const fakeApps = [
  {
    id: 'app1',
    name: 'saml_app',
    label: 'SAML App',
    status: 'ACTIVE',
    signOnMode: 'SAML_2_0',
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  },
];

const fakePolicies = [
  {
    id: 'p1',
    name: 'Default Sign On',
    description: 'Sign on policy',
    status: 'ACTIVE',
    type: 'OKTA_SIGN_ON',
    created: new Date().toISOString(),
  },
];

const fakeFactors = [{ id: 'f1', factorType: 'push', provider: 'OKTA', status: 'ACTIVE' }];

// ----- msw server -------------------------------------------------------

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

/**
 * Handlers that let a full syncOkta() run without any unhandled-request errors.
 * All Okta endpoints the adapter touches get a sensible response. Individual
 * tests can layer additional handlers on top (or override) via server.use().
 */
function happyPathSyncHandlers() {
  return [
    http.get(`${BASE}/users`, () => HttpResponse.json(fakeUsers)),
    http.get(`${BASE}/groups`, () => HttpResponse.json(fakeGroups)),
    http.get(`${BASE}/apps`, () => HttpResponse.json(fakeApps)),
    http.get(`${BASE}/policies`, () => HttpResponse.json(fakePolicies)),
    http.get(`${BASE}/users/:userId/factors`, () => HttpResponse.json(fakeFactors)),
    http.get(`${BASE}/logs`, () => HttpResponse.json([])),
    // Catch-all for anything else on this domain — return 404 so the SDK
    // surfaces a controlled error rather than msw throwing "unhandled".
    http.get(`https://${DOMAIN}/*`, () =>
      HttpResponse.json({ errorSummary: 'Not found' }, { status: 404 })
    ),
  ];
}

// ----- module loader ----------------------------------------------------

type OktaSyncModule = {
  syncOkta: (
    apiToken: string,
    domain: string
  ) => Promise<{
    data: Record<string, unknown>;
    normalized: Record<string, unknown>;
    errors: Array<{ type: string; error: string }>;
    recordCount: number;
  }>;
  testConnection: (
    apiToken: string,
    domain: string
  ) => Promise<{
    success: boolean;
    accountId?: string;
    accountName?: string;
    metadata?: Record<string, unknown>;
    error?: string;
  }>;
  getMappedControls: (dataType: string) => string[];
};

async function loadModule(): Promise<OktaSyncModule> {
  const mod = await import('../../../netlify/functions/providers/okta-sync.cjs');
  return (mod as { default?: OktaSyncModule }).default ?? (mod as unknown as OktaSyncModule);
}

// ----- tests ------------------------------------------------------------

describe('okta-sync: testConnection', () => {
  it('forwards the API token as an SSWS Authorization header', async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.get(`${BASE}/users/me`, ({ request }) => {
        capturedAuth = request.headers.get('authorization');
        return HttpResponse.json(fakeMeUser);
      })
    );
    const okta = await loadModule();
    await okta.testConnection('special_ssws_token', DOMAIN);
    expect(capturedAuth).toBe('SSWS special_ssws_token');
  });

  it('returns success envelope with normalized account info', async () => {
    server.use(http.get(`${BASE}/users/me`, () => HttpResponse.json(fakeMeUser)));
    const okta = await loadModule();
    const res = await okta.testConnection('tok', DOMAIN);
    expect(res.success).toBe(true);
    expect(res.accountId).toBe(DOMAIN);
    expect(res.accountName).toBe('admin@example.com');
    expect(res.metadata).toMatchObject({
      adminEmail: 'admin@example.com',
      adminName: 'Admin User',
    });
  });

  it('returns failure envelope on 401', async () => {
    server.use(
      http.get(`${BASE}/users/me`, () =>
        HttpResponse.json({ errorSummary: 'Invalid token' }, { status: 401 })
      )
    );
    const okta = await loadModule();
    const res = await okta.testConnection('bad', DOMAIN);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/401/);
  });
});

describe('okta-sync: syncOkta', () => {
  it('returns envelope conforming to providerSyncResultSchema', async () => {
    // Catch-all so any SDK request resolves (with empty payload) rather than
    // erroring out at the msw layer. The point of this test is the envelope
    // shape, not per-endpoint content.
    server.use(
      ...happyPathSyncHandlers(),
      http.get(`https://${DOMAIN}/*`, () => HttpResponse.json([]))
    );
    const okta = await loadModule();
    const res = await okta.syncOkta('tok', DOMAIN);

    // Envelope must match the shared schema regardless of per-endpoint outcome.
    const parsed = providerSyncResultSchema.parse(res);
    expect(parsed.recordCount).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(res.errors)).toBe(true);
    expect(typeof res.data).toBe('object');
    expect(typeof res.normalized).toBe('object');
  });

  it('handles a 403 from an Okta endpoint without throwing', async () => {
    // The adapter wraps each endpoint in try/catch, so a failure anywhere
    // should land in errors[] and the function must still resolve cleanly.
    server.use(
      http.get(`${BASE}/users`, () =>
        HttpResponse.json({ errorSummary: 'Forbidden' }, { status: 403 })
      ),
      http.get(`${BASE}/groups`, () => HttpResponse.json(fakeGroups)),
      http.get(`${BASE}/apps`, () => HttpResponse.json(fakeApps)),
      http.get(`${BASE}/policies`, () => HttpResponse.json(fakePolicies)),
      http.get(`${BASE}/users/:userId/factors`, () => HttpResponse.json(fakeFactors)),
      http.get(`${BASE}/logs`, () => HttpResponse.json([])),
      http.get(`https://${DOMAIN}/*`, () =>
        HttpResponse.json({ errorSummary: 'Not found' }, { status: 404 })
      )
    );

    const okta = await loadModule();
    // Must not reject.
    const res = await okta.syncOkta('tok', DOMAIN);
    expect(res).toBeDefined();
    expect(Array.isArray(res.errors)).toBe(true);
    // At least one error entry must exist given the 403 we forced.
    expect(res.errors.length).toBeGreaterThan(0);
    // Envelope is still schema-valid even with endpoint errors.
    expect(() => providerSyncResultSchema.parse(res)).not.toThrow();
  });
});

describe('okta-sync: getMappedControls', () => {
  it('returns known control IDs for documented data types', async () => {
    const okta = await loadModule();
    expect(okta.getMappedControls('users')).toContain('AC-2');
    expect(okta.getMappedControls('groups')).toContain('AC-3');
    expect(okta.getMappedControls('applications')).toContain('CM-7');
    expect(okta.getMappedControls('policies')).toContain('IA-5');
    expect(okta.getMappedControls('factors')).toContain('IA-2');
  });

  it('returns [] for unknown data types', async () => {
    const okta = await loadModule();
    expect(okta.getMappedControls('nonexistent')).toEqual([]);
  });
});
