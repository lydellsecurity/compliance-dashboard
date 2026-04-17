/**
 * Contract tests for netlify/functions/providers/crowdstrike-sync.cjs
 *
 * CrowdStrike uses raw `fetch` (no SDK). We use msw to intercept both the
 * OAuth2 token endpoint and the Falcon API surface, so we can verify the
 * request shape (form-encoded credentials, bearer auth) and response parsing
 * end-to-end without hitting real CrowdStrike.
 *
 * No accounts required. No SDK mocking needed.
 */
import { describe, expect, it, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { providerSyncResultSchema } from '../../helpers/schemas';

// ----- fixtures ---------------------------------------------------------

const BASE = 'https://api.crowdstrike.com';
const TOKEN = 'cs_test_token_xyz';

const fakeDeviceIds = ['dev-1', 'dev-2', 'dev-3'];
const fakeDevices = [
  {
    device_id: 'dev-1',
    cid: 'cid-1',
    hostname: 'host-a',
    local_ip: '10.0.0.1',
    external_ip: '1.1.1.1',
    mac_address: 'aa:bb:cc:dd:ee:01',
    os_version: 'Windows 11',
    platform_name: 'Windows',
    system_manufacturer: 'Dell',
    system_product_name: 'XPS',
    status: 'normal',
    last_seen: new Date().toISOString(),
    first_seen: new Date(Date.now() - 30 * 86400000).toISOString(),
    agent_version: '7.0.0',
    containment_status: 'normal',
    reduced_functionality_mode: 'no',
  },
  {
    device_id: 'dev-2',
    cid: 'cid-1',
    hostname: 'host-b',
    local_ip: '10.0.0.2',
    external_ip: '1.1.1.2',
    mac_address: 'aa:bb:cc:dd:ee:02',
    os_version: 'macOS 14',
    platform_name: 'Mac',
    system_manufacturer: 'Apple',
    system_product_name: 'MacBookPro',
    status: 'contained',
    last_seen: new Date().toISOString(),
    first_seen: new Date(Date.now() - 30 * 86400000).toISOString(),
    agent_version: '7.0.0',
    containment_status: 'contained',
    reduced_functionality_mode: 'no',
  },
  {
    device_id: 'dev-3',
    cid: 'cid-1',
    hostname: 'host-c',
    local_ip: '10.0.0.3',
    external_ip: '1.1.1.3',
    mac_address: 'aa:bb:cc:dd:ee:03',
    os_version: 'Ubuntu 22',
    platform_name: 'Linux',
    system_manufacturer: 'QEMU',
    system_product_name: 'VM',
    status: 'normal',
    last_seen: new Date().toISOString(),
    first_seen: new Date(Date.now() - 30 * 86400000).toISOString(),
    agent_version: '7.0.0',
    containment_status: 'normal',
    reduced_functionality_mode: 'yes',
  },
];

// ----- msw server -------------------------------------------------------

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

function tokenHandler(
  clientId = 'CS_ID',
  clientSecret = 'CS_SECRET',
  token = TOKEN
) {
  return http.post(`${BASE}/oauth2/token`, async ({ request }) => {
    const body = await request.text();
    const params = new URLSearchParams(body);
    if (
      params.get('client_id') !== clientId ||
      params.get('client_secret') !== clientSecret
    ) {
      return HttpResponse.json(
        { errors: [{ message: 'access denied, invalid client' }] },
        { status: 401 }
      );
    }
    return HttpResponse.json({
      access_token: token,
      expires_in: 1799,
      token_type: 'bearer',
    });
  });
}

function happyPathApiHandlers(token = TOKEN) {
  function requireBearer(request: Request) {
    const auth = request.headers.get('authorization');
    return !!auth && auth.includes(token);
  }

  return [
    // testConnection probe
    http.get(`${BASE}/sensors/queries/sensors/v1`, ({ request }) => {
      if (!requireBearer(request)) {
        return HttpResponse.json({ errors: [{ message: 'unauthorized' }] }, { status: 401 });
      }
      return HttpResponse.json({
        meta: { pagination: { total: 42 } },
        resources: [],
      });
    }),
    // Device query -> ids
    http.get(`${BASE}/devices/queries/devices/v1`, ({ request }) => {
      if (!requireBearer(request)) {
        return HttpResponse.json({ errors: [{ message: 'unauthorized' }] }, { status: 401 });
      }
      return HttpResponse.json({ resources: fakeDeviceIds });
    }),
    // Device details
    http.post(`${BASE}/devices/entities/devices/v2`, ({ request }) => {
      if (!requireBearer(request)) {
        return HttpResponse.json({ errors: [{ message: 'unauthorized' }] }, { status: 401 });
      }
      return HttpResponse.json({ resources: fakeDevices });
    }),
    // Detections query -> empty (nothing to fetch)
    http.get(`${BASE}/detects/queries/detects/v1`, () =>
      HttpResponse.json({ resources: [] })
    ),
    // Spotlight vulnerabilities query -> empty
    http.get(`${BASE}/spotlight/queries/vulnerabilities/v1`, () =>
      HttpResponse.json({ resources: [] })
    ),
    // Incidents query -> empty
    http.get(`${BASE}/incidents/queries/incidents/v1`, () =>
      HttpResponse.json({ resources: [] })
    ),
    // Prevention policies query -> empty
    http.get(`${BASE}/policy/queries/prevention/v1`, () =>
      HttpResponse.json({ resources: [] })
    ),
    // Catch-all for any additional CrowdStrike probes.
    http.all(`${BASE}/*`, () => HttpResponse.json({ resources: [] })),
  ];
}

// ----- module loader ----------------------------------------------------

type CrowdStrikeSyncModule = {
  syncCrowdStrike: (
    clientId: string,
    clientSecret: string,
    baseUrl?: string
  ) => Promise<{
    data: Record<string, unknown>;
    normalized: Record<string, unknown>;
    errors: Array<{ type: string; error: string }>;
    recordCount: number;
  }>;
  testConnection: (
    clientId: string,
    clientSecret: string,
    baseUrl?: string
  ) => Promise<{
    success: boolean;
    accountId?: string;
    accountName?: string;
    metadata?: Record<string, unknown>;
    error?: string;
  }>;
  getAccessToken: (
    clientId: string,
    clientSecret: string,
    baseUrl: string
  ) => Promise<string>;
  getMappedControls: (dataType: string) => string[];
};

async function loadModule(): Promise<CrowdStrikeSyncModule> {
  const mod = await import('../../../netlify/functions/providers/crowdstrike-sync.cjs');
  return (
    (mod as { default?: CrowdStrikeSyncModule }).default ??
    (mod as unknown as CrowdStrikeSyncModule)
  );
}

// ----- tests ------------------------------------------------------------

describe('crowdstrike-sync: getAccessToken', () => {
  it('POSTs form-encoded client credentials and returns the access_token', async () => {
    let capturedBody: string | null = null;
    let capturedContentType: string | null = null;
    server.use(
      http.post(`${BASE}/oauth2/token`, async ({ request }) => {
        capturedBody = await request.text();
        capturedContentType = request.headers.get('content-type');
        return HttpResponse.json({
          access_token: 'fresh-token',
          expires_in: 1799,
          token_type: 'bearer',
        });
      })
    );

    const cs = await loadModule();
    const token = await cs.getAccessToken('my-id', 'my-secret', BASE);

    expect(token).toBe('fresh-token');
    expect(capturedContentType).toMatch(/application\/x-www-form-urlencoded/);
    const params = new URLSearchParams(capturedBody ?? '');
    expect(params.get('client_id')).toBe('my-id');
    expect(params.get('client_secret')).toBe('my-secret');
  });

  it('throws when credentials are rejected with 401', async () => {
    server.use(
      http.post(`${BASE}/oauth2/token`, () =>
        HttpResponse.json(
          { errors: [{ message: 'access denied, invalid client' }] },
          { status: 401 }
        )
      )
    );

    const cs = await loadModule();
    await expect(
      cs.getAccessToken('bad-id', 'bad-secret', BASE)
    ).rejects.toThrow(/401/);
  });
});

describe('crowdstrike-sync: testConnection', () => {
  it('returns success envelope after a valid token exchange + sensors probe', async () => {
    server.use(tokenHandler(), ...happyPathApiHandlers());

    const cs = await loadModule();
    const res = await cs.testConnection('CS_ID', 'CS_SECRET');

    expect(res.success).toBe(true);
    expect(res.accountId).toBe('crowdstrike');
    expect(res.accountName).toBe('CrowdStrike Falcon');
    expect(res.metadata).toMatchObject({
      baseUrl: BASE,
      apiVersion: 'v1',
      totalSensors: 42,
    });
  });

  it('returns {success:false, error} when the token exchange fails', async () => {
    server.use(
      http.post(`${BASE}/oauth2/token`, () =>
        HttpResponse.json(
          { errors: [{ message: 'access denied, invalid client' }] },
          { status: 401 }
        )
      )
    );

    const cs = await loadModule();
    const res = await cs.testConnection('bad-id', 'bad-secret');

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/401|access denied|invalid client/i);
  });
});

describe('crowdstrike-sync: syncCrowdStrike', () => {
  it('returns envelope conforming to providerSyncResultSchema', async () => {
    server.use(tokenHandler(), ...happyPathApiHandlers());

    const cs = await loadModule();
    const res = await cs.syncCrowdStrike('CS_ID', 'CS_SECRET');

    const parsed = providerSyncResultSchema.parse(res);
    expect(parsed.recordCount).toBeGreaterThanOrEqual(fakeDevices.length);

    const normalized = res.normalized as {
      devices: {
        total: number;
        byPlatform: { windows: number; mac: number; linux: number };
        reducedFunctionality: number;
      };
    };
    expect(normalized.devices.total).toBe(fakeDevices.length);
    expect(normalized.devices.byPlatform.windows).toBe(1);
    expect(normalized.devices.byPlatform.mac).toBe(1);
    expect(normalized.devices.byPlatform.linux).toBe(1);
    expect(normalized.devices.reducedFunctionality).toBe(1);
  });

  it('records per-endpoint errors when a downstream API returns 500', async () => {
    server.use(
      tokenHandler(),
      // Devices succeeds so we exercise the happy sub-path too.
      http.get(`${BASE}/devices/queries/devices/v1`, () =>
        HttpResponse.json({ resources: [] })
      ),
      // Incidents blows up with 500.
      http.get(`${BASE}/incidents/queries/incidents/v1`, () =>
        HttpResponse.json({ errors: [{ message: 'boom' }] }, { status: 500 })
      ),
      // Prevention policies blow up with 500 too.
      http.get(`${BASE}/policy/queries/prevention/v1`, () =>
        HttpResponse.json({ errors: [{ message: 'kaboom' }] }, { status: 500 })
      ),
      // Detections + spotlight are quiet so they don't pollute errors.
      http.get(`${BASE}/detects/queries/detects/v1`, () =>
        HttpResponse.json({ resources: [] })
      ),
      http.get(`${BASE}/spotlight/queries/vulnerabilities/v1`, () =>
        HttpResponse.json({ resources: [] })
      ),
      // Catch-all for sensor probes / anything else.
      http.all(`${BASE}/*`, () => HttpResponse.json({ resources: [] }))
    );

    const cs = await loadModule();
    const res = await cs.syncCrowdStrike('CS_ID', 'CS_SECRET');

    const incidents = res.errors.find((e) => e.type === 'incidents');
    const policies = res.errors.find((e) => e.type === 'prevention_policies');
    expect(incidents).toBeDefined();
    expect(incidents?.error).toMatch(/500|boom/);
    expect(policies).toBeDefined();
    expect(policies?.error).toMatch(/500|kaboom/);
  });
});

describe('crowdstrike-sync: getMappedControls', () => {
  it('returns known control IDs for documented data types', async () => {
    const cs = await loadModule();
    expect(cs.getMappedControls('devices')).toContain('CM-8');
    expect(cs.getMappedControls('detections')).toContain('IR-4');
    expect(cs.getMappedControls('vulnerabilities')).toContain('RA-5');
    expect(cs.getMappedControls('incidents')).toContain('IR-6');
    expect(cs.getMappedControls('prevention_policies')).toContain('CM-6');
  });

  it('returns [] for unknown data types', async () => {
    const cs = await loadModule();
    expect(cs.getMappedControls('nonexistent')).toEqual([]);
  });
});
