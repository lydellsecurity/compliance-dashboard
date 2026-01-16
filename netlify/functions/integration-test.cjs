/**
 * Integration Test Function
 * Tests connectivity to third-party integration providers
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Provider test configurations
const PROVIDER_TESTS = {
  // Identity Providers
  okta: {
    name: 'Okta',
    testEndpoint: '/api/v1/users/me',
    authHeader: 'SSWS',
  },
  'azure-ad': {
    name: 'Azure AD',
    testEndpoint: 'https://graph.microsoft.com/v1.0/me',
    authHeader: 'Bearer',
  },
  'google-workspace': {
    name: 'Google Workspace',
    testEndpoint: 'https://admin.googleapis.com/admin/directory/v1/users',
    authHeader: 'Bearer',
  },

  // Code & DevOps
  github: {
    name: 'GitHub',
    testEndpoint: 'https://api.github.com/user',
    authHeader: 'Bearer',
  },
  gitlab: {
    name: 'GitLab',
    testEndpoint: '/api/v4/user',
    authHeader: 'Bearer',
  },
  jira: {
    name: 'Jira',
    testEndpoint: '/rest/api/3/myself',
    authHeader: 'Basic',
  },

  // Cloud Providers
  aws: {
    name: 'AWS',
    testMethod: 'aws-sts',
  },
  gcp: {
    name: 'Google Cloud',
    testEndpoint: 'https://cloudresourcemanager.googleapis.com/v1/projects',
    authHeader: 'Bearer',
  },
  azure: {
    name: 'Azure',
    testEndpoint: 'https://management.azure.com/subscriptions?api-version=2022-12-01',
    authHeader: 'Bearer',
  },

  // Security Tools
  crowdstrike: {
    name: 'CrowdStrike',
    testEndpoint: '/sensors/queries/sensors/v1?limit=1',
    authHeader: 'Bearer',
  },
  sentinelone: {
    name: 'SentinelOne',
    testEndpoint: '/web/api/v2.1/system/status',
    authHeader: 'ApiToken',
  },

  // MDM
  jamf: {
    name: 'Jamf Pro',
    testEndpoint: '/api/v1/auth',
    authHeader: 'Bearer',
  },
  intune: {
    name: 'Microsoft Intune',
    testEndpoint: 'https://graph.microsoft.com/v1.0/deviceManagement',
    authHeader: 'Bearer',
  },

  // Vulnerability Scanners
  qualys: {
    name: 'Qualys',
    testEndpoint: '/api/2.0/fo/scan/?action=list',
    authHeader: 'Basic',
  },
  tenable: {
    name: 'Tenable',
    testEndpoint: '/scans',
    authHeader: 'X-ApiKeys',
  },

  // SIEM
  splunk: {
    name: 'Splunk',
    testEndpoint: '/services/authentication/current-context',
    authHeader: 'Bearer',
  },

  // HR Systems
  workday: {
    name: 'Workday',
    testEndpoint: '/ccx/service/customreport2',
    authHeader: 'Bearer',
  },
  bamboohr: {
    name: 'BambooHR',
    testEndpoint: '/v1/employees/directory',
    authHeader: 'Basic',
  },
};

/**
 * Test connection to a provider
 */
async function testProviderConnection(providerId, config) {
  const providerTest = PROVIDER_TESTS[providerId];

  if (!providerTest) {
    return {
      success: false,
      error: `Unknown provider: ${providerId}`,
      latency: 0,
    };
  }

  const startTime = Date.now();

  try {
    // Special handling for AWS
    if (providerTest.testMethod === 'aws-sts') {
      return await testAwsConnection(config);
    }

    // Build test URL
    let testUrl = config.baseUrl
      ? `${config.baseUrl}${providerTest.testEndpoint}`
      : providerTest.testEndpoint;

    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'LydellSecurity-ComplianceDashboard/1.0',
    };

    // Add auth header based on type
    if (config.accessToken) {
      headers['Authorization'] = `${providerTest.authHeader} ${config.accessToken}`;
    } else if (config.apiKey) {
      if (providerTest.authHeader === 'X-ApiKeys') {
        headers['X-ApiKeys'] = `accessKey=${config.apiKey};secretKey=${config.apiSecret}`;
      } else if (providerTest.authHeader === 'Basic') {
        const encoded = Buffer.from(`${config.apiKey}:${config.apiSecret || ''}`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
      } else {
        headers['Authorization'] = `${providerTest.authHeader} ${config.apiKey}`;
      }
    }

    // Make test request
    const response = await fetch(testUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const latency = Date.now() - startTime;

    if (response.ok || response.status === 401) {
      // 401 means we reached the API, just auth issue
      return {
        success: response.ok,
        status: response.status,
        latency,
        error: response.ok ? null : 'Authentication failed - please check credentials',
      };
    }

    return {
      success: false,
      status: response.status,
      latency,
      error: `API returned status ${response.status}`,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      latency,
      error: error.message || 'Connection failed',
    };
  }
}

/**
 * Test AWS connection using STS
 */
async function testAwsConnection(config) {
  const startTime = Date.now();

  try {
    // AWS STS GetCallerIdentity
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const date = timestamp.slice(0, 8);

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Amz-Date': timestamp,
      Host: 'sts.amazonaws.com',
    };

    // Note: In production, use AWS SDK for proper signing
    const response = await fetch('https://sts.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15', {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(10000),
    });

    const latency = Date.now() - startTime;

    return {
      success: response.ok,
      status: response.status,
      latency,
      error: response.ok ? null : 'AWS authentication failed',
    };
  } catch (error) {
    return {
      success: false,
      latency: Date.now() - startTime,
      error: error.message || 'AWS connection failed',
    };
  }
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
    const { providerId, connectionId, config } = body;

    if (!providerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'providerId is required' }),
      };
    }

    // If connectionId provided, fetch config from database
    let testConfig = config;
    if (connectionId && !config) {
      const { data: connection, error } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (error || !connection) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Connection not found' }),
        };
      }

      // Decrypt credentials (simplified - use proper encryption in production)
      testConfig = {
        baseUrl: connection.config?.baseUrl,
        accessToken: connection.access_token_encrypted ? 'encrypted' : null,
        apiKey: connection.credentials_encrypted ? 'encrypted' : null,
      };
    }

    // Run connection test
    const result = await testProviderConnection(providerId, testConfig || {});

    // Update connection health status in database if connectionId provided
    if (connectionId) {
      await supabase
        .from('integration_connections')
        .update({
          last_health_check_at: new Date().toISOString(),
          health_status: result.success ? 'healthy' : 'unhealthy',
          consecutive_failures: result.success ? 0 : supabase.raw('consecutive_failures + 1'),
          error_message: result.error,
        })
        .eq('id', connectionId);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: result.success,
        providerId,
        provider: PROVIDER_TESTS[providerId]?.name || providerId,
        latency: result.latency,
        status: result.status,
        error: result.error,
        testedAt: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Integration test error:', error);
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
