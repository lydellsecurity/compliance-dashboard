/**
 * GitHub Provider Sync Module
 * Uses Octokit SDK for robust GitHub API integration
 */

const { Octokit } = require('@octokit/rest');

// Control mappings for GitHub data
const GITHUB_CONTROL_MAPPINGS = {
  repositories: ['CM-2', 'CM-3', 'CM-6', 'SA-10'],
  branch_protection: ['CM-3', 'CM-5', 'SI-7'],
  security_alerts: ['SI-2', 'RA-5', 'CM-4'],
  code_scanning: ['SA-11', 'SI-2', 'RA-5'],
  organization_members: ['AC-2', 'AC-3', 'PS-4'],
  audit_log: ['AU-2', 'AU-3', 'AU-12'],
};

/**
 * Sync GitHub data using Octokit SDK
 * @param {string} accessToken - OAuth access token
 * @param {Object} config - Configuration including organization
 * @returns {Promise<Object>} Sync results
 */
async function syncGitHub(accessToken, config = {}) {
  const octokit = new Octokit({ auth: accessToken });
  const results = {
    data: {},
    normalized: {},
    errors: [],
    recordCount: 0,
  };

  try {
    // 1. Fetch authenticated user info
    const { data: user } = await octokit.rest.users.getAuthenticated();
    results.data.user = user;
    results.normalized.accountInfo = {
      login: user.login,
      name: user.name,
      email: user.email,
      company: user.company,
    };

    // 2. Fetch repositories
    try {
      const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
        per_page: 100,
        sort: 'updated',
      });
      results.data.repositories = repos;
      results.normalized.repositories = {
        total: repos.length,
        public: repos.filter(r => !r.private).length,
        private: repos.filter(r => r.private).length,
        withSecurityFeatures: repos.filter(r =>
          r.has_vulnerability_alerts_enabled || r.security_and_analysis
        ).length,
        archived: repos.filter(r => r.archived).length,
      };
      results.recordCount += repos.length;
    } catch (error) {
      results.errors.push({ type: 'repositories', error: error.message });
    }

    // 3. Fetch organization data if specified
    if (config.organization) {
      const org = config.organization;

      // Organization members
      try {
        const members = await octokit.paginate(octokit.rest.orgs.listMembers, {
          org,
          per_page: 100,
        });
        results.data.organization_members = members;
        results.normalized.organization_members = {
          total: members.length,
          admins: members.filter(m => m.role === 'admin').length,
          members: members.filter(m => m.role === 'member').length,
        };
        results.recordCount += members.length;
      } catch (error) {
        if (error.status !== 403) {
          results.errors.push({ type: 'organization_members', error: error.message });
        }
      }

      // Dependabot security alerts (requires security_events scope)
      try {
        const alerts = await octokit.paginate(octokit.rest.dependabot.listAlertsForOrg, {
          org,
          per_page: 100,
          state: 'open',
        });
        results.data.security_alerts = alerts;
        results.normalized.security_alerts = {
          total: alerts.length,
          critical: alerts.filter(a => a.security_vulnerability?.severity === 'critical').length,
          high: alerts.filter(a => a.security_vulnerability?.severity === 'high').length,
          medium: alerts.filter(a => a.security_vulnerability?.severity === 'medium').length,
          low: alerts.filter(a => a.security_vulnerability?.severity === 'low').length,
        };
        results.recordCount += alerts.length;
      } catch (error) {
        if (error.status !== 403) {
          results.errors.push({ type: 'security_alerts', error: error.message });
        }
      }

      // Code scanning alerts
      try {
        const codeAlerts = await octokit.paginate(octokit.rest.codeScanning.listAlertsForOrg, {
          org,
          per_page: 100,
          state: 'open',
        });
        results.data.code_scanning = codeAlerts;
        results.normalized.code_scanning = {
          total: codeAlerts.length,
          error: codeAlerts.filter(a => a.rule?.severity === 'error').length,
          warning: codeAlerts.filter(a => a.rule?.severity === 'warning').length,
          note: codeAlerts.filter(a => a.rule?.severity === 'note').length,
        };
        results.recordCount += codeAlerts.length;
      } catch (error) {
        if (error.status !== 403) {
          results.errors.push({ type: 'code_scanning', error: error.message });
        }
      }

      // Audit log (requires admin:org scope)
      try {
        const auditLog = await octokit.paginate(octokit.rest.orgs.getAuditLog, {
          org,
          per_page: 100,
          include: 'all',
        });
        results.data.audit_log = auditLog.slice(0, 1000); // Limit to last 1000 events
        results.normalized.audit_log = {
          totalEvents: auditLog.length,
          uniqueActors: [...new Set(auditLog.map(e => e.actor))].length,
          actionTypes: [...new Set(auditLog.map(e => e.action))].length,
        };
        results.recordCount += Math.min(auditLog.length, 1000);
      } catch (error) {
        if (error.status !== 403) {
          results.errors.push({ type: 'audit_log', error: error.message });
        }
      }
    }

    // 4. Check branch protection on main repos
    const topRepos = (results.data.repositories || [])
      .filter(r => !r.archived && !r.fork)
      .slice(0, 10);

    const branchProtectionResults = [];
    for (const repo of topRepos) {
      try {
        const { data: protection } = await octokit.rest.repos.getBranchProtection({
          owner: repo.owner.login,
          repo: repo.name,
          branch: repo.default_branch,
        });
        branchProtectionResults.push({
          repo: repo.full_name,
          protected: true,
          requiresReviews: protection.required_pull_request_reviews?.required_approving_review_count > 0,
          requiresStatusChecks: protection.required_status_checks?.strict || false,
          enforceAdmins: protection.enforce_admins?.enabled || false,
        });
      } catch (error) {
        branchProtectionResults.push({
          repo: repo.full_name,
          protected: false,
          error: error.status === 404 ? 'No branch protection' : error.message,
        });
      }
    }

    results.data.branch_protection = branchProtectionResults;
    results.normalized.branch_protection = {
      checkedRepos: topRepos.length,
      protectedRepos: branchProtectionResults.filter(r => r.protected).length,
      withReviewRequirements: branchProtectionResults.filter(r => r.requiresReviews).length,
      withStatusChecks: branchProtectionResults.filter(r => r.requiresStatusChecks).length,
    };

  } catch (error) {
    results.errors.push({ type: 'general', error: error.message });
  }

  return results;
}

/**
 * Get mapped compliance controls for GitHub data
 * @param {string} dataType - Type of data synced
 * @returns {string[]} Array of control IDs
 */
function getMappedControls(dataType) {
  return GITHUB_CONTROL_MAPPINGS[dataType] || [];
}

/**
 * Test GitHub connection
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<Object>} Connection status
 */
async function testConnection(accessToken) {
  try {
    const octokit = new Octokit({ auth: accessToken });
    const { data: user } = await octokit.rest.users.getAuthenticated();

    return {
      success: true,
      accountId: user.login,
      accountName: user.name || user.login,
      metadata: {
        email: user.email,
        company: user.company,
        publicRepos: user.public_repos,
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
  syncGitHub,
  testConnection,
  getMappedControls,
  GITHUB_CONTROL_MAPPINGS,
};
