/**
 * Slack Provider Sync Module
 * Uses Slack Web API SDK for workspace integration
 */

const { WebClient } = require('@slack/web-api');

// Control mappings for Slack data
const SLACK_CONTROL_MAPPINGS = {
  team: ['AC-1', 'PL-4'],
  users: ['AC-2', 'AC-3', 'PS-4', 'PS-5'],
  channels: ['AC-3', 'SC-7', 'SC-8'],
  user_groups: ['AC-2', 'AC-3', 'AC-6'],
  access_logs: ['AU-2', 'AU-3', 'AU-12'],
};

/**
 * Sync Slack workspace data
 * @param {string} accessToken - Slack OAuth access token
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Sync results
 */
async function syncSlack(accessToken, config = {}) {
  const client = new WebClient(accessToken);

  const results = {
    data: {},
    normalized: {},
    errors: [],
    recordCount: 0,
  };

  try {
    // 1. Fetch team/workspace info
    try {
      const teamInfo = await client.team.info();
      results.data.team = teamInfo.team;
      results.normalized.team = {
        id: teamInfo.team.id,
        name: teamInfo.team.name,
        domain: teamInfo.team.domain,
        emailDomain: teamInfo.team.email_domain,
        enterpriseId: teamInfo.team.enterprise_id,
        isEnterprise: !!teamInfo.team.enterprise_id,
      };
    } catch (error) {
      results.errors.push({ type: 'team', error: error.message });
    }

    // 2. Fetch all users
    try {
      const allUsers = [];
      let cursor;

      do {
        const response = await client.users.list({
          cursor,
          limit: 200,
        });

        allUsers.push(...response.members);
        cursor = response.response_metadata?.next_cursor;
      } while (cursor);

      results.data.users = allUsers.map(user => ({
        id: user.id,
        name: user.name,
        realName: user.real_name,
        displayName: user.profile?.display_name,
        email: user.profile?.email,
        isAdmin: user.is_admin,
        isOwner: user.is_owner,
        isPrimaryOwner: user.is_primary_owner,
        isRestricted: user.is_restricted,
        isUltraRestricted: user.is_ultra_restricted,
        isBot: user.is_bot,
        deleted: user.deleted,
        has2fa: user.has_2fa,
        updated: user.updated,
      }));

      const activeUsers = allUsers.filter(u => !u.deleted && !u.is_bot);

      results.normalized.users = {
        total: allUsers.length,
        active: activeUsers.length,
        deleted: allUsers.filter(u => u.deleted).length,
        bots: allUsers.filter(u => u.is_bot).length,
        admins: activeUsers.filter(u => u.is_admin).length,
        owners: activeUsers.filter(u => u.is_owner).length,
        guests: activeUsers.filter(u => u.is_restricted || u.is_ultra_restricted).length,
        with2fa: activeUsers.filter(u => u.has_2fa).length,
        mfaAdoptionRate: activeUsers.length > 0
          ? Math.round((activeUsers.filter(u => u.has_2fa).length / activeUsers.length) * 100)
          : 0,
      };
      results.recordCount += allUsers.length;
    } catch (error) {
      results.errors.push({ type: 'users', error: error.message });
    }

    // 3. Fetch channels
    try {
      const allChannels = [];
      let cursor;

      do {
        const response = await client.conversations.list({
          cursor,
          limit: 200,
          types: 'public_channel,private_channel',
        });

        allChannels.push(...response.channels);
        cursor = response.response_metadata?.next_cursor;
      } while (cursor);

      results.data.channels = allChannels.map(channel => ({
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private,
        isArchived: channel.is_archived,
        isGeneral: channel.is_general,
        isShared: channel.is_shared,
        isExtShared: channel.is_ext_shared,
        numMembers: channel.num_members,
        created: channel.created,
        creator: channel.creator,
      }));

      const activeChannels = allChannels.filter(c => !c.is_archived);

      results.normalized.channels = {
        total: allChannels.length,
        active: activeChannels.length,
        archived: allChannels.filter(c => c.is_archived).length,
        public: activeChannels.filter(c => !c.is_private).length,
        private: activeChannels.filter(c => c.is_private).length,
        shared: activeChannels.filter(c => c.is_shared || c.is_ext_shared).length,
        externallyShared: activeChannels.filter(c => c.is_ext_shared).length,
        avgMembers: activeChannels.length > 0
          ? Math.round(activeChannels.reduce((sum, c) => sum + (c.num_members || 0), 0) / activeChannels.length)
          : 0,
      };
      results.recordCount += allChannels.length;
    } catch (error) {
      results.errors.push({ type: 'channels', error: error.message });
    }

    // 4. Fetch user groups
    try {
      const userGroups = await client.usergroups.list({
        include_users: true,
        include_count: true,
        include_disabled: true,
      });

      results.data.user_groups = (userGroups.usergroups || []).map(group => ({
        id: group.id,
        name: group.name,
        handle: group.handle,
        description: group.description,
        isExternal: group.is_external,
        dateCreate: group.date_create,
        dateUpdate: group.date_update,
        dateDelete: group.date_delete,
        userCount: group.user_count,
        users: group.users,
      }));

      const activeGroups = (userGroups.usergroups || []).filter(g => !g.date_delete);

      results.normalized.user_groups = {
        total: (userGroups.usergroups || []).length,
        active: activeGroups.length,
        deleted: (userGroups.usergroups || []).filter(g => g.date_delete).length,
        external: activeGroups.filter(g => g.is_external).length,
        avgMembers: activeGroups.length > 0
          ? Math.round(activeGroups.reduce((sum, g) => sum + (g.user_count || 0), 0) / activeGroups.length)
          : 0,
      };
      results.recordCount += (userGroups.usergroups || []).length;
    } catch (error) {
      // usergroups.list may not be available on all plans
      if (!error.message.includes('not_allowed')) {
        results.errors.push({ type: 'user_groups', error: error.message });
      }
    }

    // 5. Fetch access logs (Enterprise only)
    try {
      const accessLogs = await client.team.accessLogs({
        count: 1000,
      });

      results.data.access_logs = (accessLogs.logins || []).map(log => ({
        userId: log.user_id,
        username: log.username,
        dateFirst: log.date_first,
        dateLast: log.date_last,
        count: log.count,
        ip: log.ip,
        userAgent: log.user_agent,
        isp: log.isp,
        country: log.country,
        region: log.region,
      }));

      const uniqueCountries = [...new Set((accessLogs.logins || []).map(l => l.country).filter(Boolean))];
      const uniqueIPs = [...new Set((accessLogs.logins || []).map(l => l.ip).filter(Boolean))];

      results.normalized.access_logs = {
        totalLogins: (accessLogs.logins || []).length,
        uniqueUsers: [...new Set((accessLogs.logins || []).map(l => l.user_id))].length,
        uniqueIPs: uniqueIPs.length,
        uniqueCountries: uniqueCountries.length,
        countries: uniqueCountries.slice(0, 10),
      };
      results.recordCount += (accessLogs.logins || []).length;
    } catch (error) {
      // Access logs may require Enterprise plan
      if (!error.message.includes('paid_only') && !error.message.includes('not_allowed')) {
        results.errors.push({ type: 'access_logs', error: error.message });
      }
    }

  } catch (error) {
    results.errors.push({ type: 'general', error: error.message });
  }

  return results;
}

/**
 * Get mapped compliance controls for Slack data
 * @param {string} dataType - Type of data synced
 * @returns {string[]} Array of control IDs
 */
function getMappedControls(dataType) {
  return SLACK_CONTROL_MAPPINGS[dataType] || [];
}

/**
 * Test Slack connection
 * @param {string} accessToken - Slack OAuth access token
 * @returns {Promise<Object>} Connection status
 */
async function testConnection(accessToken) {
  try {
    const client = new WebClient(accessToken);

    // Test auth
    const authTest = await client.auth.test();

    // Get team info
    const teamInfo = await client.team.info();

    return {
      success: true,
      accountId: teamInfo.team.id,
      accountName: teamInfo.team.name,
      metadata: {
        domain: teamInfo.team.domain,
        userId: authTest.user_id,
        botId: authTest.bot_id,
        isEnterprise: !!teamInfo.team.enterprise_id,
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
  syncSlack,
  testConnection,
  getMappedControls,
  SLACK_CONTROL_MAPPINGS,
};
