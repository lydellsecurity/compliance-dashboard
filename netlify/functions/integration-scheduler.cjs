/**
 * Integration Scheduler - Background Sync Orchestrator
 * Runs on a schedule to trigger syncs for connections due for refresh
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Maximum connections to process per run (prevent timeout)
const MAX_CONNECTIONS_PER_RUN = 10;

// Timeout for individual sync calls (in ms)
const SYNC_TIMEOUT = 60000; // 1 minute

/**
 * Get connections due for sync
 * @returns {Promise<Array>} Connections that need syncing
 */
async function getDueConnections() {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('status', 'connected')
    .eq('sync_enabled', true)
    .or(`next_sync_at.is.null,next_sync_at.lte.${now}`)
    .order('next_sync_at', { ascending: true, nullsFirst: true })
    .limit(MAX_CONNECTIONS_PER_RUN);

  if (error) {
    throw new Error(`Failed to fetch due connections: ${error.message}`);
  }

  return data || [];
}

/**
 * Calculate next sync time based on frequency
 * @param {number} frequencyMinutes - Sync frequency in minutes
 * @returns {string} ISO timestamp for next sync
 */
function calculateNextSyncAt(frequencyMinutes = 60) {
  const nextSync = new Date(Date.now() + frequencyMinutes * 60 * 1000);
  return nextSync.toISOString();
}

/**
 * Trigger sync for a single connection
 * @param {Object} connection - Connection object
 * @returns {Promise<Object>} Sync result
 */
async function triggerSync(connection) {
  const startTime = Date.now();

  try {
    // Call the integration-sync function
    const response = await fetch(
      `${process.env.URL || 'http://localhost:8888'}/.netlify/functions/integration-sync`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: connection.id,
          tenantId: connection.tenant_id,
          syncType: 'incremental',
          triggeredBy: 'scheduler',
        }),
        signal: AbortSignal.timeout(SYNC_TIMEOUT),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Sync returned ${response.status}`);
    }

    return {
      success: true,
      connectionId: connection.id,
      providerId: connection.provider_id,
      duration: Date.now() - startTime,
      recordsProcessed: result.recordsProcessed || 0,
    };
  } catch (error) {
    return {
      success: false,
      connectionId: connection.id,
      providerId: connection.provider_id,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Update connection after sync
 * @param {string} connectionId - Connection ID
 * @param {boolean} success - Whether sync succeeded
 * @param {number} frequencyMinutes - Sync frequency
 * @param {string} errorMessage - Error message if failed
 */
async function updateConnectionAfterSync(connectionId, success, frequencyMinutes, errorMessage = null) {
  const now = new Date().toISOString();
  const nextSyncAt = calculateNextSyncAt(frequencyMinutes);

  const updateData = {
    last_sync_at: now,
    next_sync_at: nextSyncAt,
  };

  if (success) {
    updateData.consecutive_failures = 0;
    updateData.error_message = null;
  } else {
    // Increment consecutive failures
    const { data: current } = await supabase
      .from('integration_connections')
      .select('consecutive_failures')
      .eq('id', connectionId)
      .single();

    const failures = (current?.consecutive_failures || 0) + 1;
    updateData.consecutive_failures = failures;
    updateData.error_message = errorMessage;

    // If too many consecutive failures, mark as error status
    if (failures >= 5) {
      updateData.status = 'error';
      updateData.health_status = 'unhealthy';
    }

    // Apply exponential backoff for next sync
    const backoffMinutes = Math.min(frequencyMinutes * Math.pow(2, failures - 1), 1440); // Max 24 hours
    updateData.next_sync_at = calculateNextSyncAt(backoffMinutes);
  }

  const { error } = await supabase
    .from('integration_connections')
    .update(updateData)
    .eq('id', connectionId);

  if (error) {
    console.error(`Failed to update connection ${connectionId}:`, error.message);
  }
}

/**
 * Log scheduler run
 * @param {Array} results - Sync results
 */
async function logSchedulerRun(results) {
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  console.log(`Scheduler completed: ${successful} successful, ${failed} failed, ${totalDuration}ms total`);

  // Could also log to a scheduler_runs table for monitoring
}

/**
 * Main handler
 */
exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Handle both scheduled invocations and manual triggers
  const isScheduled = event.headers?.['x-netlify-scheduled'] === 'true';

  console.log(`Integration scheduler triggered (scheduled: ${isScheduled})`);

  try {
    // Get connections due for sync
    const dueConnections = await getDueConnections();

    if (dueConnections.length === 0) {
      console.log('No connections due for sync');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'No connections due for sync',
          processedCount: 0,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    console.log(`Found ${dueConnections.length} connections due for sync`);

    // Process connections sequentially to avoid overwhelming the system
    const results = [];
    for (const connection of dueConnections) {
      console.log(`Syncing connection ${connection.id} (${connection.provider_id})`);

      const result = await triggerSync(connection);
      results.push(result);

      // Update connection with result
      await updateConnectionAfterSync(
        connection.id,
        result.success,
        connection.sync_frequency_minutes || 60,
        result.error
      );

      // Log individual result
      if (result.success) {
        console.log(`  ✓ Synced ${connection.provider_id} in ${result.duration}ms`);
      } else {
        console.log(`  ✗ Failed ${connection.provider_id}: ${result.error}`);
      }
    }

    // Log overall results
    await logSchedulerRun(results);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Scheduler run completed',
        processedCount: results.length,
        successCount: successful.length,
        failedCount: failed.length,
        results: results.map(r => ({
          connectionId: r.connectionId,
          provider: r.providerId,
          success: r.success,
          duration: r.duration,
          error: r.error,
        })),
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Scheduler error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Scheduler failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
