/**
 * OAuth Token Exchange Function
 * Handles OAuth 2.0 authorization code exchange and token refresh
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Import shared crypto utilities
const { encrypt, decrypt, tryDecrypt } = require('./utils/crypto.cjs');

// Encryption configuration (key is managed in crypto.cjs)
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// OAuth provider configurations
const OAUTH_PROVIDERS = {
  okta: {
    tokenUrl: '{domain}/oauth2/v1/token',
    revokeUrl: '{domain}/oauth2/v1/revoke',
    scopes: ['openid', 'profile', 'email', 'okta.users.read', 'okta.groups.read'],
  },
  'azure-ad': {
    tokenUrl: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
    revokeUrl: null, // Azure doesn't support revoke endpoint
    scopes: ['User.Read', 'Directory.Read.All', 'AuditLog.Read.All'],
  },
  'google-workspace': {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    scopes: ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
  },
  github: {
    tokenUrl: 'https://github.com/login/oauth/access_token',
    revokeUrl: null,
    scopes: ['repo', 'read:org', 'read:user', 'security_events'],
  },
  gitlab: {
    tokenUrl: '{domain}/oauth/token',
    revokeUrl: '{domain}/oauth/revoke',
    scopes: ['api', 'read_user', 'read_repository'],
  },
  jira: {
    tokenUrl: 'https://auth.atlassian.com/oauth/token',
    revokeUrl: null,
    scopes: ['read:jira-work', 'read:jira-user'],
  },
  slack: {
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    revokeUrl: 'https://slack.com/api/auth.revoke',
    scopes: ['users:read', 'team:read', 'channels:read'],
  },
  salesforce: {
    tokenUrl: '{domain}/services/oauth2/token',
    revokeUrl: '{domain}/services/oauth2/revoke',
    scopes: ['api', 'refresh_token'],
  },
  hubspot: {
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    revokeUrl: null,
    scopes: ['crm.objects.contacts.read'],
  },
  zoom: {
    tokenUrl: 'https://zoom.us/oauth/token',
    revokeUrl: 'https://zoom.us/oauth/revoke',
    scopes: ['user:read', 'meeting:read'],
  },
};

// Note: encrypt and decrypt functions are now imported from ./utils/crypto.cjs

/**
 * Exchange authorization code for tokens
 */
async function exchangeCode(providerId, code, redirectUri, config) {
  const provider = OAUTH_PROVIDERS[providerId];

  if (!provider) {
    throw new Error(`Unknown OAuth provider: ${providerId}`);
  }

  // Build token URL with domain substitution
  let tokenUrl = provider.tokenUrl;
  if (config.domain) {
    tokenUrl = tokenUrl.replace('{domain}', config.domain);
  }
  if (config.tenant) {
    tokenUrl = tokenUrl.replace('{tenant}', config.tenant);
  }

  // Build token request body
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  // GitHub requires Accept header
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (providerId === 'github') {
    headers['Accept'] = 'application/json';
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  const tokens = await response.json();

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    tokenType: tokens.token_type,
    scope: tokens.scope,
  };
}

/**
 * Refresh access token
 */
async function refreshToken(providerId, refreshToken, config) {
  const provider = OAUTH_PROVIDERS[providerId];

  if (!provider) {
    throw new Error(`Unknown OAuth provider: ${providerId}`);
  }

  // Build token URL
  let tokenUrl = provider.tokenUrl;
  if (config.domain) {
    tokenUrl = tokenUrl.replace('{domain}', config.domain);
  }
  if (config.tenant) {
    tokenUrl = tokenUrl.replace('{tenant}', config.tenant);
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
  }

  const tokens = await response.json();

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || refreshToken, // Some providers don't return new refresh token
    expiresIn: tokens.expires_in,
    tokenType: tokens.token_type,
  };
}

/**
 * Revoke tokens
 */
async function revokeToken(providerId, token, config) {
  const provider = OAUTH_PROVIDERS[providerId];

  if (!provider || !provider.revokeUrl) {
    // Provider doesn't support token revocation
    return { success: true, message: 'Provider does not support token revocation' };
  }

  let revokeUrl = provider.revokeUrl;
  if (config.domain) {
    revokeUrl = revokeUrl.replace('{domain}', config.domain);
  }

  const body = new URLSearchParams({
    token,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(revokeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token revocation failed: ${response.status}`);
  }

  return { success: true };
}

/**
 * Store tokens in database with proper encryption metadata
 */
async function storeTokens(connectionId, tokens) {
  // Encrypt tokens
  const encryptedAccess = encrypt(tokens.accessToken);
  const encryptedRefresh = tokens.refreshToken ? encrypt(tokens.refreshToken) : null;

  // Calculate expiration time
  const expiresAt = tokens.expiresIn
    ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
    : null;

  // Store IVs in colon-separated format: accessIv:refreshIv
  const credentialsIv = encryptedAccess.iv + (encryptedRefresh ? `:${encryptedRefresh.iv}` : '');

  const { error } = await supabase
    .from('integration_connections')
    .update({
      access_token_encrypted: encryptedAccess.encrypted,
      refresh_token_encrypted: encryptedRefresh?.encrypted,
      // Store IVs (colon-separated for access:refresh)
      credentials_iv: credentialsIv,
      // Store auth tags for AES-256-GCM decryption
      access_token_auth_tag: encryptedAccess.authTag,
      refresh_token_auth_tag: encryptedRefresh?.authTag || null,
      token_expires_at: expiresAt,
      status: 'connected',
      error_message: null,
      connected_at: new Date().toISOString(),
    })
    .eq('id', connectionId);

  if (error) {
    throw new Error(`Failed to store tokens: ${error.message}`);
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
    const { action, providerId, connectionId, code, redirectUri, config } = body;

    if (!action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'action is required (exchange, refresh, revoke)' }),
      };
    }

    if (!providerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'providerId is required' }),
      };
    }

    let result;

    switch (action) {
      case 'exchange': {
        if (!code || !redirectUri || !config?.clientId || !config?.clientSecret) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'code, redirectUri, config.clientId, and config.clientSecret are required for exchange',
            }),
          };
        }

        // Exchange code for tokens
        const tokens = await exchangeCode(providerId, code, redirectUri, config);

        // Store tokens if connectionId provided
        if (connectionId) {
          await storeTokens(connectionId, tokens);
        }

        result = {
          success: true,
          action: 'exchange',
          expiresIn: tokens.expiresIn,
          tokenType: tokens.tokenType,
          scope: tokens.scope,
          // Don't return actual tokens in response for security
          hasAccessToken: !!tokens.accessToken,
          hasRefreshToken: !!tokens.refreshToken,
        };
        break;
      }

      case 'refresh': {
        if (!connectionId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'connectionId is required for refresh' }),
          };
        }

        // Fetch connection to get refresh token
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

        if (!connection.refresh_token_encrypted) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'No refresh token available' }),
          };
        }

        // Extract refresh token IV (format: accessIv:refreshIv)
        const ivParts = (connection.credentials_iv || '').split(':');
        const refreshIv = ivParts[1]; // Second part is refresh token IV
        const refreshAuthTag = connection.refresh_token_auth_tag;

        if (!refreshIv || !refreshAuthTag) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing encryption metadata for refresh token' }),
          };
        }

        // Decrypt refresh token with proper IV and auth tag
        const decryptedRefresh = decrypt(
          connection.refresh_token_encrypted,
          refreshIv,
          refreshAuthTag
        );

        // Refresh tokens
        const tokens = await refreshToken(providerId, decryptedRefresh, connection.config || {});

        // Store new tokens
        await storeTokens(connectionId, tokens);

        result = {
          success: true,
          action: 'refresh',
          expiresIn: tokens.expiresIn,
        };
        break;
      }

      case 'revoke': {
        if (!connectionId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'connectionId is required for revoke' }),
          };
        }

        // Fetch connection
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

        // Revoke tokens (decrypt first)
        if (connection.access_token_encrypted) {
          const ivParts = (connection.credentials_iv || '').split(':');
          const accessIv = ivParts[0];
          const accessAuthTag = connection.access_token_auth_tag;

          if (accessIv && accessAuthTag) {
            try {
              const decryptedToken = decrypt(
                connection.access_token_encrypted,
                accessIv,
                accessAuthTag
              );
              await revokeToken(providerId, decryptedToken, connection.config || {});
            } catch (decryptError) {
              console.warn('Failed to decrypt token for revocation:', decryptError.message);
              // Continue with disconnection even if revocation fails
            }
          }
        }

        // Update connection status and clear all token data
        await supabase
          .from('integration_connections')
          .update({
            status: 'disconnected',
            access_token_encrypted: null,
            refresh_token_encrypted: null,
            credentials_iv: null,
            access_token_auth_tag: null,
            refresh_token_auth_tag: null,
            token_expires_at: null,
          })
          .eq('id', connectionId);

        result = {
          success: true,
          action: 'revoke',
        };
        break;
      }

      case 'get-auth-url': {
        // Generate OAuth authorization URL
        const provider = OAUTH_PROVIDERS[providerId];
        if (!provider) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Unknown provider: ${providerId}` }),
          };
        }

        if (!config?.clientId || !redirectUri) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'config.clientId and redirectUri are required' }),
          };
        }

        // Generate state for CSRF protection
        const state = crypto.randomBytes(16).toString('hex');

        // Build auth URL based on provider
        let authUrl;
        switch (providerId) {
          case 'azure-ad':
            authUrl = `https://login.microsoftonline.com/${config.tenant || 'common'}/oauth2/v2.0/authorize`;
            break;
          case 'google-workspace':
            authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
            break;
          case 'github':
            authUrl = 'https://github.com/login/oauth/authorize';
            break;
          case 'okta':
            authUrl = `${config.domain}/oauth2/v1/authorize`;
            break;
          case 'slack':
            authUrl = 'https://slack.com/oauth/v2/authorize';
            break;
          default:
            authUrl = `${config.domain}/oauth/authorize`;
        }

        const params = new URLSearchParams({
          client_id: config.clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: provider.scopes.join(' '),
          state,
        });

        // Add provider-specific params
        if (providerId === 'google-workspace') {
          params.append('access_type', 'offline');
          params.append('prompt', 'consent');
        }

        result = {
          success: true,
          action: 'get-auth-url',
          authUrl: `${authUrl}?${params.toString()}`,
          state,
          scopes: provider.scopes,
        };
        break;
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Unknown action: ${action}` }),
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('OAuth exchange error:', error);
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
