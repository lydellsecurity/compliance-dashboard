/**
 * Provider Sync Modules Index
 * Exports all provider-specific sync modules
 */

const githubSync = require('./github-sync.cjs');
const oktaSync = require('./okta-sync.cjs');
const slackSync = require('./slack-sync.cjs');
const jiraSync = require('./jira-sync.cjs');
const crowdstrikeSync = require('./crowdstrike-sync.cjs');

// Provider registry
const PROVIDERS = {
  github: {
    name: 'GitHub',
    sync: githubSync.syncGitHub,
    testConnection: githubSync.testConnection,
    getMappedControls: githubSync.getMappedControls,
    authType: 'oauth2',
    category: 'code_repository',
  },
  okta: {
    name: 'Okta',
    sync: oktaSync.syncOkta,
    testConnection: oktaSync.testConnection,
    getMappedControls: oktaSync.getMappedControls,
    authType: 'api_key',
    category: 'identity_provider',
  },
  slack: {
    name: 'Slack',
    sync: slackSync.syncSlack,
    testConnection: slackSync.testConnection,
    getMappedControls: slackSync.getMappedControls,
    authType: 'oauth2',
    category: 'communication',
  },
  jira: {
    name: 'Jira',
    sync: jiraSync.syncJira,
    testConnection: jiraSync.testConnection,
    getMappedControls: jiraSync.getMappedControls,
    authType: 'oauth2',
    category: 'project_management',
  },
  crowdstrike: {
    name: 'CrowdStrike',
    sync: crowdstrikeSync.syncCrowdStrike,
    testConnection: crowdstrikeSync.testConnection,
    getMappedControls: crowdstrikeSync.getMappedControls,
    authType: 'api_key', // Uses client credentials OAuth
    category: 'security_tools',
  },
};

/**
 * Get provider module by ID
 * @param {string} providerId - Provider identifier
 * @returns {Object|null} Provider module or null
 */
function getProvider(providerId) {
  return PROVIDERS[providerId] || null;
}

/**
 * Check if a provider has SDK support
 * @param {string} providerId - Provider identifier
 * @returns {boolean} True if SDK is available
 */
function hasSDKSupport(providerId) {
  return providerId in PROVIDERS;
}

/**
 * Get all supported provider IDs
 * @returns {string[]} Array of provider IDs
 */
function getSupportedProviders() {
  return Object.keys(PROVIDERS);
}

/**
 * Get provider info
 * @param {string} providerId - Provider identifier
 * @returns {Object|null} Provider info or null
 */
function getProviderInfo(providerId) {
  const provider = PROVIDERS[providerId];
  if (!provider) return null;

  return {
    id: providerId,
    name: provider.name,
    authType: provider.authType,
    category: provider.category,
    hasSDK: true,
  };
}

module.exports = {
  // Individual providers
  github: githubSync,
  okta: oktaSync,
  slack: slackSync,
  jira: jiraSync,
  crowdstrike: crowdstrikeSync,

  // Registry functions
  PROVIDERS,
  getProvider,
  hasSDKSupport,
  getSupportedProviders,
  getProviderInfo,
};
