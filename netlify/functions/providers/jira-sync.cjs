/**
 * Jira Provider Sync Module
 * Uses Atlassian REST API for project management integration
 */

// Control mappings for Jira data
const JIRA_CONTROL_MAPPINGS = {
  projects: ['PM-1', 'PL-2', 'SA-3'],
  issues: ['SI-2', 'RA-5', 'CM-3', 'CM-4'],
  users: ['AC-2', 'AC-3'],
  audit_log: ['AU-2', 'AU-3', 'AU-12'],
  security_vulnerabilities: ['SI-2', 'RA-5', 'SA-11'],
};

/**
 * Make authenticated request to Jira Cloud API
 * @param {string} baseUrl - Jira Cloud base URL
 * @param {string} accessToken - OAuth access token
 * @param {string} path - API path
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response
 */
async function jiraFetch(baseUrl, accessToken, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jira API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Sync Jira data
 * @param {string} accessToken - OAuth access token
 * @param {string} cloudId - Atlassian Cloud ID
 * @returns {Promise<Object>} Sync results
 */
async function syncJira(accessToken, cloudId) {
  const baseUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;

  const results = {
    data: {},
    normalized: {},
    errors: [],
    recordCount: 0,
  };

  try {
    // 1. Fetch current user (verify connection)
    try {
      const myself = await jiraFetch(baseUrl, accessToken, '/myself');
      results.data.currentUser = myself;
      results.normalized.currentUser = {
        accountId: myself.accountId,
        displayName: myself.displayName,
        emailAddress: myself.emailAddress,
        active: myself.active,
      };
    } catch (error) {
      results.errors.push({ type: 'currentUser', error: error.message });
    }

    // 2. Fetch all projects
    try {
      let allProjects = [];
      let startAt = 0;
      const maxResults = 50;

      while (true) {
        const response = await jiraFetch(
          baseUrl,
          accessToken,
          `/project/search?startAt=${startAt}&maxResults=${maxResults}&expand=insight`
        );

        allProjects = allProjects.concat(response.values || []);

        if (response.isLast || !response.values?.length) {
          break;
        }
        startAt += maxResults;
      }

      results.data.projects = allProjects.map(project => ({
        id: project.id,
        key: project.key,
        name: project.name,
        projectTypeKey: project.projectTypeKey,
        style: project.style,
        isPrivate: project.isPrivate,
        insight: project.insight,
      }));

      results.normalized.projects = {
        total: allProjects.length,
        software: allProjects.filter(p => p.projectTypeKey === 'software').length,
        serviceDesk: allProjects.filter(p => p.projectTypeKey === 'service_desk').length,
        business: allProjects.filter(p => p.projectTypeKey === 'business').length,
        private: allProjects.filter(p => p.isPrivate).length,
      };
      results.recordCount += allProjects.length;
    } catch (error) {
      results.errors.push({ type: 'projects', error: error.message });
    }

    // 3. Fetch security vulnerabilities and bugs
    try {
      // Search for security-related issues
      const securityJql = 'type in (Bug, "Security Vulnerability", Vulnerability) AND status != Done ORDER BY created DESC';

      let allIssues = [];
      let startAt = 0;
      const maxResults = 100;

      while (allIssues.length < 1000) { // Limit to 1000 issues
        const response = await jiraFetch(
          baseUrl,
          accessToken,
          `/search?jql=${encodeURIComponent(securityJql)}&startAt=${startAt}&maxResults=${maxResults}&fields=key,summary,status,priority,issuetype,created,updated,assignee,reporter`
        );

        allIssues = allIssues.concat(response.issues || []);

        if (response.total <= startAt + maxResults || !response.issues?.length) {
          break;
        }
        startAt += maxResults;
      }

      results.data.issues = allIssues.map(issue => ({
        key: issue.key,
        summary: issue.fields?.summary,
        status: issue.fields?.status?.name,
        statusCategory: issue.fields?.status?.statusCategory?.key,
        priority: issue.fields?.priority?.name,
        issueType: issue.fields?.issuetype?.name,
        created: issue.fields?.created,
        updated: issue.fields?.updated,
        assignee: issue.fields?.assignee?.displayName,
        reporter: issue.fields?.reporter?.displayName,
      }));

      const openIssues = allIssues.filter(i =>
        i.fields?.status?.statusCategory?.key !== 'done'
      );

      results.normalized.issues = {
        total: allIssues.length,
        open: openIssues.length,
        resolved: allIssues.length - openIssues.length,
        byPriority: {
          highest: allIssues.filter(i => i.fields?.priority?.name === 'Highest').length,
          high: allIssues.filter(i => i.fields?.priority?.name === 'High').length,
          medium: allIssues.filter(i => i.fields?.priority?.name === 'Medium').length,
          low: allIssues.filter(i => i.fields?.priority?.name === 'Low').length,
          lowest: allIssues.filter(i => i.fields?.priority?.name === 'Lowest').length,
        },
        byType: {
          bug: allIssues.filter(i => i.fields?.issuetype?.name === 'Bug').length,
          vulnerability: allIssues.filter(i =>
            ['Security Vulnerability', 'Vulnerability'].includes(i.fields?.issuetype?.name)
          ).length,
        },
        unassigned: openIssues.filter(i => !i.fields?.assignee).length,
      };
      results.recordCount += allIssues.length;
    } catch (error) {
      results.errors.push({ type: 'issues', error: error.message });
    }

    // 4. Fetch users
    try {
      let allUsers = [];
      let startAt = 0;
      const maxResults = 50;

      while (true) {
        const response = await jiraFetch(
          baseUrl,
          accessToken,
          `/users/search?startAt=${startAt}&maxResults=${maxResults}`
        );

        if (!response?.length) {
          break;
        }

        allUsers = allUsers.concat(response);

        if (response.length < maxResults) {
          break;
        }
        startAt += maxResults;
      }

      results.data.users = allUsers.map(user => ({
        accountId: user.accountId,
        accountType: user.accountType,
        displayName: user.displayName,
        active: user.active,
      }));

      results.normalized.users = {
        total: allUsers.length,
        active: allUsers.filter(u => u.active).length,
        inactive: allUsers.filter(u => !u.active).length,
        atlassianAccounts: allUsers.filter(u => u.accountType === 'atlassian').length,
        appAccounts: allUsers.filter(u => u.accountType === 'app').length,
      };
      results.recordCount += allUsers.length;
    } catch (error) {
      results.errors.push({ type: 'users', error: error.message });
    }

    // 5. Fetch server info
    try {
      const serverInfo = await jiraFetch(baseUrl, accessToken, '/serverInfo');
      results.data.serverInfo = serverInfo;
      results.normalized.serverInfo = {
        baseUrl: serverInfo.baseUrl,
        version: serverInfo.version,
        deploymentType: serverInfo.deploymentType,
        scmInfo: serverInfo.scmInfo,
      };
    } catch (error) {
      results.errors.push({ type: 'serverInfo', error: error.message });
    }

  } catch (error) {
    results.errors.push({ type: 'general', error: error.message });
  }

  return results;
}

/**
 * Get accessible resources (cloud IDs) for the token
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<Array>} List of accessible resources
 */
async function getAccessibleResources(accessToken) {
  const response = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get accessible resources: ${response.status}`);
  }

  return response.json();
}

/**
 * Get mapped compliance controls for Jira data
 * @param {string} dataType - Type of data synced
 * @returns {string[]} Array of control IDs
 */
function getMappedControls(dataType) {
  return JIRA_CONTROL_MAPPINGS[dataType] || [];
}

/**
 * Test Jira connection
 * @param {string} accessToken - OAuth access token
 * @param {string} cloudId - Optional cloud ID (will be discovered if not provided)
 * @returns {Promise<Object>} Connection status
 */
async function testConnection(accessToken, cloudId = null) {
  try {
    // Get accessible resources if cloudId not provided
    let resources = [];
    if (!cloudId) {
      resources = await getAccessibleResources(accessToken);
      if (!resources.length) {
        throw new Error('No accessible Jira sites found');
      }
      cloudId = resources[0].id;
    }

    const baseUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;

    // Verify connection by fetching current user
    const myself = await jiraFetch(baseUrl, accessToken, '/myself');

    // Get site info
    const site = resources.find(r => r.id === cloudId) || {};

    return {
      success: true,
      accountId: cloudId,
      accountName: site.name || myself.displayName,
      metadata: {
        siteUrl: site.url,
        cloudId,
        userDisplayName: myself.displayName,
        userEmail: myself.emailAddress,
        availableSites: resources.map(r => ({ id: r.id, name: r.name })),
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
  syncJira,
  testConnection,
  getMappedControls,
  getAccessibleResources,
  JIRA_CONTROL_MAPPINGS,
};
