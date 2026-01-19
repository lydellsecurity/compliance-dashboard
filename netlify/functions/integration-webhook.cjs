/**
 * Integration Webhook Receiver
 * Handles incoming webhooks from integration providers with signature verification
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

/**
 * Signature verification functions for each provider
 */
const signatureVerifiers = {
  /**
   * Verify GitHub webhook signature
   * Uses HMAC-SHA256 with x-hub-signature-256 header
   */
  github: (payload, signature, secret) => {
    if (!signature) return false;

    const expected = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  },

  /**
   * Verify Slack webhook signature
   * Uses HMAC-SHA256 with timestamp validation
   */
  slack: (payload, headers, secret) => {
    const timestamp = headers['x-slack-request-timestamp'];
    const signature = headers['x-slack-signature'];

    if (!timestamp || !signature) return false;

    // Check timestamp is within 5 minutes (prevent replay attacks)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
      console.warn('Slack webhook timestamp too old');
      return false;
    }

    const sigBasestring = `v0:${timestamp}:${payload}`;
    const expected = 'v0=' + crypto
      .createHmac('sha256', secret)
      .update(sigBasestring, 'utf8')
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  },

  /**
   * Verify Okta webhook (event hook verification)
   * Okta uses a verification challenge for initial setup
   */
  okta: (payload, headers, secret, parsedPayload) => {
    // Handle verification challenge
    if (headers['x-okta-verification-challenge']) {
      return 'verification_challenge';
    }

    // For regular events, verify using shared secret
    const signature = headers['x-okta-signature'];
    if (!signature) return false;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  },

  /**
   * Verify Jira/Atlassian webhook
   * Atlassian uses asymmetric signing for Connect apps
   */
  jira: (payload, headers, secret) => {
    // Simple shared secret verification
    const signature = headers['x-atlassian-webhook-signature'];
    if (!signature) {
      // Allow webhooks without signature for testing/initial setup
      console.warn('Jira webhook received without signature');
      return true;
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  },

  /**
   * Verify CrowdStrike webhook
   */
  crowdstrike: (payload, headers, secret) => {
    const signature = headers['x-cs-signature'];
    if (!signature) return false;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  },
};

/**
 * Extract event type from webhook payload based on provider
 */
function extractEventType(providerId, headers, payload) {
  switch (providerId) {
    case 'github':
      return headers['x-github-event'] || 'unknown';
    case 'slack':
      return payload.type || payload.event?.type || 'unknown';
    case 'okta':
      return payload.eventType || payload.events?.[0]?.eventType || 'unknown';
    case 'jira':
      return payload.webhookEvent || payload.issue_event_type_name || 'unknown';
    case 'crowdstrike':
      return payload.eventType || 'unknown';
    default:
      return payload.event || payload.type || 'unknown';
  }
}

/**
 * Generate idempotency key for deduplication
 */
function generateIdempotencyKey(providerId, headers, payload) {
  // Use provider-specific unique identifiers
  let uniqueId;

  switch (providerId) {
    case 'github':
      uniqueId = headers['x-github-delivery'];
      break;
    case 'slack':
      uniqueId = payload.event_id || payload.envelope_id;
      break;
    case 'okta':
      uniqueId = payload.eventId || headers['x-okta-event-id'];
      break;
    case 'jira':
      uniqueId = headers['x-atlassian-webhook-identifier'] || payload.timestamp;
      break;
    case 'crowdstrike':
      uniqueId = payload.eventId || headers['x-cs-event-id'];
      break;
    default:
      uniqueId = payload.id || payload.event_id;
  }

  // Fallback to hash of payload if no unique ID
  if (!uniqueId) {
    uniqueId = crypto.createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex')
      .substring(0, 32);
  }

  return crypto.createHash('sha256')
    .update(`${providerId}:${uniqueId}`)
    .digest('hex');
}

/**
 * Process webhook event (trigger appropriate action)
 */
async function processWebhookEvent(webhookEvent, connection) {
  const { event_type: eventType, payload, connection_id: connectionId } = webhookEvent;

  // Determine if this event should trigger a sync
  const syncTriggerEvents = {
    github: ['push', 'pull_request', 'security_alert', 'dependabot_alert', 'repository'],
    slack: ['team_join', 'user_change', 'channel_created', 'channel_deleted'],
    okta: ['user.lifecycle', 'user.session', 'group.user_membership', 'application.user_membership'],
    jira: ['jira:issue_created', 'jira:issue_updated', 'jira:issue_deleted'],
    crowdstrike: ['DetectionCreate', 'IncidentCreate', 'DeviceDiscovered'],
  };

  const providerId = connection.provider_id;
  const triggerEvents = syncTriggerEvents[providerId] || [];

  // Check if event type matches any trigger patterns
  const shouldSync = triggerEvents.some(pattern =>
    eventType.toLowerCase().includes(pattern.toLowerCase())
  );

  if (shouldSync) {
    // Trigger an incremental sync
    try {
      await fetch(
        `${process.env.URL || 'http://localhost:8888'}/.netlify/functions/integration-sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectionId,
            tenantId: connection.tenant_id,
            syncType: 'webhook',
            triggeredBy: 'webhook',
            webhookEventId: webhookEvent.id,
          }),
          signal: AbortSignal.timeout(5000), // Don't wait long
        }
      );
    } catch (error) {
      console.warn('Failed to trigger sync from webhook:', error.message);
    }
  }

  // Update webhook event status
  await supabase
    .from('webhook_events')
    .update({
      status: 'processed',
      processed_at: new Date().toISOString(),
    })
    .eq('id', webhookEvent.id);
}

/**
 * Main handler
 */
exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Extract connection ID from query params
    const params = new URLSearchParams(event.rawQuery || '');
    const connectionId = params.get('connectionId');

    if (!connectionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'connectionId query parameter is required' }),
      };
    }

    // Fetch connection and webhook configuration
    const { data: connection, error: connError } = await supabase
      .from('integration_connections')
      .select('*, integration_webhooks(*)')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      console.warn(`Webhook received for unknown connection: ${connectionId}`);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Connection not found' }),
      };
    }

    // Find active webhook configuration
    const webhook = (connection.integration_webhooks || []).find(w => w.is_active);

    if (!webhook) {
      console.warn(`No active webhook configured for connection: ${connectionId}`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No active webhook configured' }),
      };
    }

    // Parse payload
    const rawBody = event.body || '{}';
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON payload' }),
      };
    }

    // Verify signature
    const providerId = connection.provider_id;
    const verifier = signatureVerifiers[providerId];

    if (verifier) {
      const eventHeaders = Object.fromEntries(
        Object.entries(event.headers).map(([k, v]) => [k.toLowerCase(), v])
      );

      const verificationResult = verifier(rawBody, eventHeaders, webhook.secret_hash, payload);

      // Handle Okta verification challenge
      if (verificationResult === 'verification_challenge') {
        const challenge = eventHeaders['x-okta-verification-challenge'];
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ verification: challenge }),
        };
      }

      if (!verificationResult) {
        console.warn(`Invalid webhook signature for connection: ${connectionId}`);
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid signature' }),
        };
      }
    }

    // Generate idempotency key
    const eventHeaders = Object.fromEntries(
      Object.entries(event.headers).map(([k, v]) => [k.toLowerCase(), v])
    );
    const idempotencyKey = generateIdempotencyKey(providerId, eventHeaders, payload);

    // Check for duplicate
    const { data: existing } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existing) {
      console.log(`Duplicate webhook event: ${idempotencyKey}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'duplicate',
          eventId: existing.id,
        }),
      };
    }

    // Extract event type
    const eventType = extractEventType(providerId, eventHeaders, payload);

    // Store webhook event
    const { data: webhookEvent, error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        connection_id: connectionId,
        tenant_id: connection.tenant_id,
        event_type: eventType,
        provider_event_id: eventHeaders['x-github-delivery'] ||
                          eventHeaders['x-okta-event-id'] ||
                          payload.event_id ||
                          null,
        payload,
        headers: {
          // Store relevant headers for debugging
          'content-type': eventHeaders['content-type'],
          'user-agent': eventHeaders['user-agent'],
        },
        idempotency_key: idempotencyKey,
        status: 'pending',
        received_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to store webhook event:', insertError.message);
      throw insertError;
    }

    // Update webhook statistics
    await supabase
      .from('integration_webhooks')
      .update({
        last_triggered_at: new Date().toISOString(),
        trigger_count: supabase.rpc('increment_trigger_count', { webhook_id: webhook.id }),
      })
      .eq('id', webhook.id);

    // Process the webhook event asynchronously
    // Don't await - respond quickly to the provider
    processWebhookEvent(webhookEvent, connection).catch(err => {
      console.error('Webhook processing error:', err.message);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'accepted',
        eventId: webhookEvent.id,
        eventType,
      }),
    };
  } catch (error) {
    console.error('Webhook handler error:', error);

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
