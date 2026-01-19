/**
 * Integration Health Check - Scheduled Health Monitoring
 * Runs periodically to check connection health and detect stale connections
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Thresholds for health status
const STALE_THRESHOLD_HOURS = 24; // Consider stale if no sync in 24 hours
const DEGRADED_THRESHOLD_FAILURES = 2; // Degraded after 2 failures
const UNHEALTHY_THRESHOLD_FAILURES = 5; // Unhealthy after 5 failures

/**
 * Get all active connections for health check
 * @returns {Promise<Array>} Active connections
 */
async function getActiveConnections() {
  const { data, error } = await supabase
    .from('integration_connections')
    .select('*')
    .in('status', ['connected', 'error'])
    .eq('sync_enabled', true);

  if (error) {
    throw new Error(`Failed to fetch connections: ${error.message}`);
  }

  return data || [];
}

/**
 * Test connection to a provider
 * @param {Object} connection - Connection object
 * @returns {Promise<Object>} Test result
 */
async function testConnectionHealth(connection) {
  const startTime = Date.now();

  try {
    const response = await fetch(
      `${process.env.URL || 'http://localhost:8888'}/.netlify/functions/integration-test`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: connection.id,
          providerId: connection.provider_id,
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      }
    );

    const result = await response.json();

    return {
      success: response.ok && result.success,
      latency: Date.now() - startTime,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      latency: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Determine health status based on connection state
 * @param {Object} connection - Connection object
 * @param {Object} testResult - Test result
 * @returns {string} Health status
 */
function determineHealthStatus(connection, testResult) {
  // Check consecutive failures
  if (connection.consecutive_failures >= UNHEALTHY_THRESHOLD_FAILURES) {
    return 'unhealthy';
  }

  if (connection.consecutive_failures >= DEGRADED_THRESHOLD_FAILURES) {
    return 'degraded';
  }

  // Check if connection test failed
  if (!testResult.success) {
    return 'degraded';
  }

  // Check for stale syncs
  if (connection.last_sync_at) {
    const lastSync = new Date(connection.last_sync_at);
    const hoursAgo = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);

    if (hoursAgo > STALE_THRESHOLD_HOURS * 2) {
      return 'unhealthy';
    }

    if (hoursAgo > STALE_THRESHOLD_HOURS) {
      return 'degraded';
    }
  }

  // Check token expiration
  if (connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at);
    const hoursUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilExpiry < 0) {
      return 'unhealthy'; // Token expired
    }

    if (hoursUntilExpiry < 24) {
      return 'degraded'; // Token expiring soon
    }
  }

  return 'healthy';
}

/**
 * Update connection health status
 * @param {string} connectionId - Connection ID
 * @param {string} healthStatus - New health status
 * @param {Object} testResult - Test result
 */
async function updateConnectionHealth(connectionId, healthStatus, testResult) {
  const { error } = await supabase
    .from('integration_connections')
    .update({
      health_status: healthStatus,
      last_health_check_at: new Date().toISOString(),
      // Update error message if unhealthy
      ...(healthStatus === 'unhealthy' && testResult.error ? {
        error_message: testResult.error,
      } : {}),
    })
    .eq('id', connectionId);

  if (error) {
    console.error(`Failed to update health for ${connectionId}:`, error.message);
  }
}

/**
 * Attempt to refresh tokens for connections with expiring tokens
 * @param {Object} connection - Connection object
 */
async function refreshExpiringToken(connection) {
  if (connection.auth_type !== 'oauth2' || !connection.token_expires_at) {
    return;
  }

  const expiresAt = new Date(connection.token_expires_at);
  const hoursUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);

  // Refresh if expiring in less than 1 hour
  if (hoursUntilExpiry < 1 && connection.refresh_token_encrypted) {
    try {
      const response = await fetch(
        `${process.env.URL || 'http://localhost:8888'}/.netlify/functions/oauth-exchange`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'refresh',
            providerId: connection.provider_id,
            connectionId: connection.id,
          }),
          signal: AbortSignal.timeout(30000),
        }
      );

      if (response.ok) {
        console.log(`Refreshed token for connection ${connection.id}`);
      } else {
        console.warn(`Failed to refresh token for ${connection.id}`);
      }
    } catch (error) {
      console.error(`Token refresh error for ${connection.id}:`, error.message);
    }
  }
}

/**
 * Main handler
 */
exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  const isScheduled = event.headers?.['x-netlify-scheduled'] === 'true';
  console.log(`Health check triggered (scheduled: ${isScheduled})`);

  try {
    // Get all active connections
    const connections = await getActiveConnections();

    if (connections.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'No active connections to check',
          timestamp: new Date().toISOString(),
        }),
      };
    }

    console.log(`Checking health of ${connections.length} connections`);

    const results = {
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      tokensRefreshed: 0,
      details: [],
    };

    // Process each connection
    for (const connection of connections) {
      // Test connection
      const testResult = await testConnectionHealth(connection);

      // Determine health status
      const healthStatus = determineHealthStatus(connection, testResult);

      // Update in database
      await updateConnectionHealth(connection.id, healthStatus, testResult);

      // Count by status
      results[healthStatus]++;

      // Try to refresh expiring tokens
      if (healthStatus !== 'unhealthy') {
        await refreshExpiringToken(connection);
      }

      results.details.push({
        connectionId: connection.id,
        provider: connection.provider_id,
        previousStatus: connection.health_status,
        newStatus: healthStatus,
        testSuccess: testResult.success,
        latency: testResult.latency,
      });

      // Log status changes
      if (connection.health_status !== healthStatus) {
        console.log(`  ${connection.provider_id}: ${connection.health_status} → ${healthStatus}`);
      }
    }

    console.log(`Health check complete: ${results.healthy} healthy, ${results.degraded} degraded, ${results.unhealthy} unhealthy`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Health check completed',
        summary: {
          total: connections.length,
          healthy: results.healthy,
          degraded: results.degraded,
          unhealthy: results.unhealthy,
        },
        details: results.details,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Health check error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Health check failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
