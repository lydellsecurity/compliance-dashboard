/**
 * Integration Sync Function
 * Syncs data from third-party integration providers
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Provider sync configurations
const PROVIDER_SYNC_CONFIGS = {
  // Identity Providers
  okta: {
    endpoints: [
      { type: 'users', path: '/api/v1/users', method: 'GET' },
      { type: 'groups', path: '/api/v1/groups', method: 'GET' },
      { type: 'applications', path: '/api/v1/apps', method: 'GET' },
      { type: 'policies', path: '/api/v1/policies', method: 'GET' },
    ],
    pagination: { type: 'link', param: 'after' },
  },

  'azure-ad': {
    endpoints: [
      { type: 'users', path: '/v1.0/users', method: 'GET', baseUrl: 'https://graph.microsoft.com' },
      { type: 'groups', path: '/v1.0/groups', method: 'GET', baseUrl: 'https://graph.microsoft.com' },
      { type: 'applications', path: '/v1.0/applications', method: 'GET', baseUrl: 'https://graph.microsoft.com' },
      { type: 'conditional_access', path: '/v1.0/identity/conditionalAccess/policies', method: 'GET', baseUrl: 'https://graph.microsoft.com' },
    ],
    pagination: { type: 'odata', param: '$skiptoken' },
  },

  github: {
    endpoints: [
      { type: 'repositories', path: '/user/repos', method: 'GET', baseUrl: 'https://api.github.com' },
      { type: 'organization_members', path: '/orgs/{org}/members', method: 'GET', baseUrl: 'https://api.github.com' },
      { type: 'security_alerts', path: '/orgs/{org}/dependabot/alerts', method: 'GET', baseUrl: 'https://api.github.com' },
      { type: 'audit_log', path: '/orgs/{org}/audit-log', method: 'GET', baseUrl: 'https://api.github.com' },
    ],
    pagination: { type: 'page', param: 'page' },
  },

  crowdstrike: {
    endpoints: [
      { type: 'devices', path: '/devices/queries/devices/v1', method: 'GET' },
      { type: 'detections', path: '/detects/queries/detects/v1', method: 'GET' },
      { type: 'vulnerabilities', path: '/spotlight/queries/vulnerabilities/v1', method: 'GET' },
      { type: 'incidents', path: '/incidents/queries/incidents/v1', method: 'GET' },
    ],
    pagination: { type: 'offset', param: 'offset' },
  },

  jamf: {
    endpoints: [
      { type: 'computers', path: '/api/v1/computers-inventory', method: 'GET' },
      { type: 'mobile_devices', path: '/api/v2/mobile-devices', method: 'GET' },
      { type: 'policies', path: '/api/v1/policies', method: 'GET' },
      { type: 'configuration_profiles', path: '/api/v1/configuration-profiles', method: 'GET' },
    ],
    pagination: { type: 'page', param: 'page' },
  },

  qualys: {
    endpoints: [
      { type: 'host_list', path: '/api/2.0/fo/asset/host/?action=list', method: 'GET' },
      { type: 'vulnerabilities', path: '/api/2.0/fo/knowledge_base/vuln/?action=list', method: 'GET' },
      { type: 'scan_list', path: '/api/2.0/fo/scan/?action=list', method: 'GET' },
    ],
    pagination: { type: 'id', param: 'id_min' },
  },

  tenable: {
    endpoints: [
      { type: 'assets', path: '/assets', method: 'GET' },
      { type: 'vulnerabilities', path: '/workbenches/vulnerabilities', method: 'GET' },
      { type: 'scans', path: '/scans', method: 'GET' },
    ],
    pagination: { type: 'offset', param: 'offset' },
  },

  splunk: {
    endpoints: [
      { type: 'saved_searches', path: '/services/saved/searches', method: 'GET' },
      { type: 'alerts', path: '/services/alerts/fired_alerts', method: 'GET' },
    ],
    pagination: { type: 'offset', param: 'offset' },
  },

  workday: {
    endpoints: [
      { type: 'workers', path: '/ccx/service/{tenant}/Human_Resources/v40.1', method: 'GET' },
    ],
    pagination: { type: 'page', param: 'page' },
  },

  bamboohr: {
    endpoints: [
      { type: 'employees', path: '/v1/employees/directory', method: 'GET' },
      { type: 'time_off', path: '/v1/time_off/requests', method: 'GET' },
    ],
    pagination: null, // No pagination
  },
};

/**
 * Create a sync log entry
 */
async function createSyncLog(connectionId, tenantId, syncType) {
  const { data, error } = await supabase
    .from('integration_sync_logs')
    .insert({
      connection_id: connectionId,
      tenant_id: tenantId,
      sync_type: syncType,
      status: 'started',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update sync log with results
 */
async function updateSyncLog(logId, status, results) {
  const { error } = await supabase
    .from('integration_sync_logs')
    .update({
      status,
      records_processed: results.processed || 0,
      records_created: results.created || 0,
      records_updated: results.updated || 0,
      records_deleted: results.deleted || 0,
      errors: results.errors || [],
      completed_at: new Date().toISOString(),
      duration_ms: results.durationMs,
    })
    .eq('id', logId);

  if (error) console.error('Failed to update sync log:', error);
}

/**
 * Fetch data from provider endpoint
 */
async function fetchProviderData(endpoint, connection, config) {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'LydellSecurity-ComplianceDashboard/1.0',
  };

  // Add auth header
  if (connection.auth_type === 'oauth2' && connection.access_token_encrypted) {
    headers['Authorization'] = `Bearer ${connection.access_token_encrypted}`; // Would be decrypted
  } else if (connection.auth_type === 'api_key') {
    headers['Authorization'] = `Bearer ${connection.credentials_encrypted}`; // Would be decrypted
  }

  const baseUrl = endpoint.baseUrl || connection.config?.baseUrl || '';
  let url = `${baseUrl}${endpoint.path}`;

  // Replace path parameters
  if (connection.config?.organization) {
    url = url.replace('{org}', connection.config.organization);
  }
  if (connection.config?.tenant) {
    url = url.replace('{tenant}', connection.config.tenant);
  }

  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch ${endpoint.type}: ${error.message}`);
  }
}

/**
 * Normalize and map data to compliance controls
 */
function normalizeData(providerId, dataType, rawData) {
  const normalized = {
    raw: rawData,
    normalized: {},
    mappedControls: [],
  };

  // Provider-specific normalization
  switch (providerId) {
    case 'okta':
      if (dataType === 'users') {
        normalized.normalized = {
          totalUsers: rawData.length || 0,
          activeUsers: rawData.filter?.(u => u.status === 'ACTIVE')?.length || 0,
          mfaEnabled: rawData.filter?.(u => u.credentials?.provider?.type === 'OKTA')?.length || 0,
        };
        normalized.mappedControls = ['AC-2', 'IA-2', 'IA-5'];
      }
      break;

    case 'github':
      if (dataType === 'security_alerts') {
        normalized.normalized = {
          totalAlerts: rawData.length || 0,
          criticalAlerts: rawData.filter?.(a => a.severity === 'critical')?.length || 0,
          highAlerts: rawData.filter?.(a => a.severity === 'high')?.length || 0,
        };
        normalized.mappedControls = ['SI-2', 'RA-5', 'CM-4'];
      }
      break;

    case 'crowdstrike':
      if (dataType === 'devices') {
        normalized.normalized = {
          totalDevices: rawData.length || 0,
          onlineDevices: rawData.filter?.(d => d.status === 'normal')?.length || 0,
        };
        normalized.mappedControls = ['SI-3', 'SI-4', 'IR-4'];
      }
      break;

    case 'jamf':
      if (dataType === 'computers') {
        normalized.normalized = {
          totalDevices: rawData.totalCount || 0,
          managedDevices: rawData.results?.filter?.(d => d.general?.managed)?.length || 0,
        };
        normalized.mappedControls = ['CM-2', 'CM-3', 'CM-6'];
      }
      break;

    case 'qualys':
    case 'tenable':
      if (dataType === 'vulnerabilities') {
        normalized.normalized = {
          totalVulnerabilities: rawData.length || 0,
          criticalVulns: rawData.filter?.(v => v.severity >= 4)?.length || 0,
          highVulns: rawData.filter?.(v => v.severity === 3)?.length || 0,
        };
        normalized.mappedControls = ['RA-5', 'SI-2', 'CA-7'];
      }
      break;
  }

  return normalized;
}

/**
 * Upsert synced data to database
 */
async function upsertSyncedData(connectionId, tenantId, dataType, externalId, data, normalizedData) {
  const { data: existing } = await supabase
    .from('integration_data')
    .select('id, sync_hash')
    .eq('connection_id', connectionId)
    .eq('data_type', dataType)
    .eq('external_id', externalId)
    .single();

  // Calculate hash to detect changes
  const syncHash = Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 32);

  if (existing && existing.sync_hash === syncHash) {
    return { action: 'unchanged' };
  }

  const record = {
    connection_id: connectionId,
    tenant_id: tenantId,
    data_type: dataType,
    external_id: externalId,
    data,
    normalized_data: normalizedData.normalized,
    mapped_controls: normalizedData.mappedControls,
    synced_at: new Date().toISOString(),
    sync_hash: syncHash,
  };

  if (existing) {
    await supabase
      .from('integration_data')
      .update(record)
      .eq('id', existing.id);
    return { action: 'updated' };
  }

  await supabase
    .from('integration_data')
    .insert(record);
  return { action: 'created' };
}

/**
 * Sync data for a single connection
 */
async function syncConnection(connection, syncType = 'incremental') {
  const providerId = connection.provider_id;
  const config = PROVIDER_SYNC_CONFIGS[providerId];

  if (!config) {
    return {
      success: false,
      error: `No sync configuration for provider: ${providerId}`,
    };
  }

  const results = {
    processed: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [],
  };

  // Sync each endpoint
  for (const endpoint of config.endpoints) {
    try {
      // Fetch data from provider
      const data = await fetchProviderData(endpoint, connection, config);

      // Normalize and map to compliance controls
      const normalized = normalizeData(providerId, endpoint.type, data);

      // Upsert to database
      const externalId = `${endpoint.type}-aggregate`;
      const result = await upsertSyncedData(
        connection.id,
        connection.tenant_id,
        endpoint.type,
        externalId,
        data,
        normalized
      );

      results.processed++;
      if (result.action === 'created') results.created++;
      if (result.action === 'updated') results.updated++;
    } catch (error) {
      results.errors.push({
        endpoint: endpoint.type,
        error: error.message,
      });
    }
  }

  // Update connection status
  await supabase
    .from('integration_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      status: results.errors.length === 0 ? 'connected' : 'error',
      error_message: results.errors.length > 0 ? results.errors[0].error : null,
    })
    .eq('id', connection.id);

  return {
    success: results.errors.length === 0,
    results,
  };
}

/**
 * Main handler
 */
exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { connectionId, tenantId, syncType = 'incremental' } = body;

    if (!connectionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'connectionId is required' }),
      };
    }

    // Fetch connection details
    const { data: connection, error: fetchError } = await supabase
      .from('integration_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (fetchError || !connection) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Connection not found' }),
      };
    }

    // Check if connection is enabled for sync
    if (!connection.sync_enabled) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Sync is disabled for this connection' }),
      };
    }

    // Create sync log
    const startTime = Date.now();
    const syncLog = await createSyncLog(connection.id, connection.tenant_id, syncType);

    // Perform sync
    const syncResult = await syncConnection(connection, syncType);

    // Update sync log with results
    await updateSyncLog(syncLog.id, syncResult.success ? 'completed' : 'failed', {
      ...syncResult.results,
      durationMs: Date.now() - startTime,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: syncResult.success,
        connectionId,
        providerId: connection.provider_id,
        syncLogId: syncLog.id,
        results: syncResult.results,
        syncedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      }),
    };
  } catch (error) {
    console.error('Integration sync error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
