/**
 * Okta Provider Sync Module
 * Uses Okta SDK for identity management integration
 */

const OktaClient = require('@okta/okta-sdk-nodejs');

// Control mappings for Okta data
const OKTA_CONTROL_MAPPINGS = {
  users: ['AC-2', 'IA-2', 'IA-5', 'PS-4'],
  groups: ['AC-2', 'AC-3', 'AC-6'],
  applications: ['AC-2', 'CM-7', 'IA-2'],
  policies: ['AC-7', 'IA-5', 'SC-23'],
  system_log: ['AU-2', 'AU-3', 'AU-12'],
  factors: ['IA-2', 'IA-5', 'IA-11'],
};

/**
 * Sync Okta data using Okta SDK
 * @param {string} apiToken - Okta API token (SSWS)
 * @param {string} domain - Okta domain (e.g., dev-12345.okta.com)
 * @returns {Promise<Object>} Sync results
 */
async function syncOkta(apiToken, domain) {
  // Ensure domain has protocol
  const orgUrl = domain.startsWith('https://') ? domain : `https://${domain}`;

  const client = new OktaClient.Client({
    orgUrl,
    token: apiToken,
  });

  const results = {
    data: {},
    normalized: {},
    errors: [],
    recordCount: 0,
  };

  try {
    // 1. Fetch all users
    try {
      const users = [];
      await client.userApi.listUsers().each(user => {
        users.push({
          id: user.id,
          status: user.status,
          created: user.created,
          lastLogin: user.lastLogin,
          profile: {
            login: user.profile?.login,
            email: user.profile?.email,
            firstName: user.profile?.firstName,
            lastName: user.profile?.lastName,
          },
          credentials: {
            provider: user.credentials?.provider?.type,
          },
        });
      });

      results.data.users = users;
      results.normalized.users = {
        total: users.length,
        active: users.filter(u => u.status === 'ACTIVE').length,
        suspended: users.filter(u => u.status === 'SUSPENDED').length,
        deprovisioned: users.filter(u => u.status === 'DEPROVISIONED').length,
        passwordExpired: users.filter(u => u.status === 'PASSWORD_EXPIRED').length,
        locked: users.filter(u => u.status === 'LOCKED_OUT').length,
        recentlyCreated: users.filter(u => {
          const created = new Date(u.created);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return created > weekAgo;
        }).length,
        neverLoggedIn: users.filter(u => !u.lastLogin).length,
      };
      results.recordCount += users.length;
    } catch (error) {
      results.errors.push({ type: 'users', error: error.message });
    }

    // 2. Fetch all groups
    try {
      const groups = [];
      await client.groupApi.listGroups().each(group => {
        groups.push({
          id: group.id,
          type: group.type,
          profile: {
            name: group.profile?.name,
            description: group.profile?.description,
          },
          created: group.created,
          lastMembershipUpdated: group.lastMembershipUpdated,
        });
      });

      results.data.groups = groups;
      results.normalized.groups = {
        total: groups.length,
        builtIn: groups.filter(g => g.type === 'BUILT_IN').length,
        oktaGroups: groups.filter(g => g.type === 'OKTA_GROUP').length,
        appGroups: groups.filter(g => g.type === 'APP_GROUP').length,
      };
      results.recordCount += groups.length;
    } catch (error) {
      results.errors.push({ type: 'groups', error: error.message });
    }

    // 3. Fetch applications
    try {
      const apps = [];
      await client.applicationApi.listApplications().each(app => {
        apps.push({
          id: app.id,
          name: app.name,
          label: app.label,
          status: app.status,
          signOnMode: app.signOnMode,
          created: app.created,
          lastUpdated: app.lastUpdated,
        });
      });

      results.data.applications = apps;
      results.normalized.applications = {
        total: apps.length,
        active: apps.filter(a => a.status === 'ACTIVE').length,
        inactive: apps.filter(a => a.status === 'INACTIVE').length,
        samlApps: apps.filter(a => a.signOnMode === 'SAML_2_0').length,
        oidcApps: apps.filter(a => ['OPENID_CONNECT', 'OAUTH_2_0'].includes(a.signOnMode)).length,
        bookmarkApps: apps.filter(a => a.signOnMode === 'BOOKMARK').length,
      };
      results.recordCount += apps.length;
    } catch (error) {
      results.errors.push({ type: 'applications', error: error.message });
    }

    // 4. Fetch policies (authentication policies)
    try {
      const policies = [];
      await client.policyApi.listPolicies({ type: 'OKTA_SIGN_ON' }).each(policy => {
        policies.push({
          id: policy.id,
          name: policy.name,
          description: policy.description,
          status: policy.status,
          type: policy.type,
          created: policy.created,
        });
      });

      // Also get password policies
      await client.policyApi.listPolicies({ type: 'PASSWORD' }).each(policy => {
        policies.push({
          id: policy.id,
          name: policy.name,
          description: policy.description,
          status: policy.status,
          type: policy.type,
          created: policy.created,
        });
      });

      // Get MFA policies
      await client.policyApi.listPolicies({ type: 'MFA_ENROLL' }).each(policy => {
        policies.push({
          id: policy.id,
          name: policy.name,
          description: policy.description,
          status: policy.status,
          type: policy.type,
          created: policy.created,
        });
      });

      results.data.policies = policies;
      results.normalized.policies = {
        total: policies.length,
        active: policies.filter(p => p.status === 'ACTIVE').length,
        signOnPolicies: policies.filter(p => p.type === 'OKTA_SIGN_ON').length,
        passwordPolicies: policies.filter(p => p.type === 'PASSWORD').length,
        mfaPolicies: policies.filter(p => p.type === 'MFA_ENROLL').length,
      };
      results.recordCount += policies.length;
    } catch (error) {
      results.errors.push({ type: 'policies', error: error.message });
    }

    // 5. Fetch MFA factors for sample of users
    try {
      const sampleUsers = (results.data.users || [])
        .filter(u => u.status === 'ACTIVE')
        .slice(0, 100);

      const factorStats = {
        usersWithMfa: 0,
        factorTypes: {},
        usersChecked: sampleUsers.length,
      };

      for (const user of sampleUsers) {
        try {
          const factors = [];
          await client.userFactorApi.listFactors({ userId: user.id }).each(factor => {
            factors.push(factor);
          });

          if (factors.length > 0) {
            factorStats.usersWithMfa++;
            factors.forEach(f => {
              factorStats.factorTypes[f.factorType] = (factorStats.factorTypes[f.factorType] || 0) + 1;
            });
          }
        } catch {
          // Skip users where we can't fetch factors
        }
      }

      results.data.factors = factorStats;
      results.normalized.factors = {
        usersChecked: factorStats.usersChecked,
        usersWithMfa: factorStats.usersWithMfa,
        mfaAdoptionRate: factorStats.usersChecked > 0
          ? Math.round((factorStats.usersWithMfa / factorStats.usersChecked) * 100)
          : 0,
        factorTypes: Object.keys(factorStats.factorTypes).length,
      };
    } catch (error) {
      results.errors.push({ type: 'factors', error: error.message });
    }

    // 6. Fetch system log (last 24 hours)
    try {
      const logs = [];
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      await client.systemLogApi.listLogEvents({ since, limit: 1000 }).each(event => {
        if (logs.length < 1000) {
          logs.push({
            uuid: event.uuid,
            eventType: event.eventType,
            severity: event.severity,
            displayMessage: event.displayMessage,
            published: event.published,
            actor: {
              type: event.actor?.type,
              displayName: event.actor?.displayName,
            },
            outcome: event.outcome?.result,
          });
        }
      });

      results.data.system_log = logs;
      results.normalized.system_log = {
        eventsLast24h: logs.length,
        uniqueEventTypes: [...new Set(logs.map(l => l.eventType))].length,
        failures: logs.filter(l => l.outcome === 'FAILURE').length,
        warnings: logs.filter(l => l.severity === 'WARN').length,
        uniqueActors: [...new Set(logs.map(l => l.actor?.displayName).filter(Boolean))].length,
      };
      results.recordCount += logs.length;
    } catch (error) {
      results.errors.push({ type: 'system_log', error: error.message });
    }

  } catch (error) {
    results.errors.push({ type: 'general', error: error.message });
  }

  return results;
}

/**
 * Get mapped compliance controls for Okta data
 * @param {string} dataType - Type of data synced
 * @returns {string[]} Array of control IDs
 */
function getMappedControls(dataType) {
  return OKTA_CONTROL_MAPPINGS[dataType] || [];
}

/**
 * Test Okta connection
 * @param {string} apiToken - Okta API token
 * @param {string} domain - Okta domain
 * @returns {Promise<Object>} Connection status
 */
async function testConnection(apiToken, domain) {
  try {
    const orgUrl = domain.startsWith('https://') ? domain : `https://${domain}`;

    const client = new OktaClient.Client({
      orgUrl,
      token: apiToken,
    });

    // Verify by fetching current user (API token owner)
    const response = await fetch(`${orgUrl}/api/v1/users/me`, {
      headers: {
        'Authorization': `SSWS ${apiToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const user = await response.json();

    return {
      success: true,
      accountId: orgUrl.replace('https://', ''),
      accountName: user.profile?.login || 'Okta Admin',
      metadata: {
        adminEmail: user.profile?.email,
        adminName: `${user.profile?.firstName} ${user.profile?.lastName}`.trim(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  syncOkta,
  testConnection,
  getMappedControls,
  OKTA_CONTROL_MAPPINGS,
};
