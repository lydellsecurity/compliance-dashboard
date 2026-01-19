/**
 * CrowdStrike Provider Sync Module
 * Uses CrowdStrike Falcon API for endpoint security integration
 */

// Control mappings for CrowdStrike data
const CROWDSTRIKE_CONTROL_MAPPINGS = {
  devices: ['CM-8', 'SI-3', 'SI-4', 'EP-001'],
  detections: ['IR-4', 'IR-5', 'SI-4', 'IR-001'],
  vulnerabilities: ['RA-5', 'SI-2', 'VM-001'],
  incidents: ['IR-4', 'IR-5', 'IR-6', 'IR-002'],
  prevention_policies: ['CM-6', 'SI-3', 'EP-002'],
  sensor_policies: ['SI-3', 'SI-4', 'EP-001'],
};

/**
 * Get CrowdStrike OAuth2 token using client credentials
 * @param {string} clientId - CrowdStrike API client ID
 * @param {string} clientSecret - CrowdStrike API client secret
 * @param {string} baseUrl - CrowdStrike API base URL
 * @returns {Promise<string>} Access token
 */
async function getAccessToken(clientId, clientSecret, baseUrl) {
  const response = await fetch(`${baseUrl}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get CrowdStrike token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Make authenticated request to CrowdStrike API
 * @param {string} baseUrl - CrowdStrike API base URL
 * @param {string} accessToken - OAuth access token
 * @param {string} path - API path
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response
 */
async function crowdstrikeFetch(baseUrl, accessToken, path, options = {}) {
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
    throw new Error(`CrowdStrike API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Fetch device details by IDs
 * @param {string} baseUrl - CrowdStrike API base URL
 * @param {string} accessToken - OAuth access token
 * @param {string[]} deviceIds - Array of device IDs
 * @returns {Promise<Object[]>} Device details
 */
async function getDeviceDetails(baseUrl, accessToken, deviceIds) {
  if (!deviceIds.length) return [];

  // CrowdStrike API limits to 100 IDs per request
  const chunks = [];
  for (let i = 0; i < deviceIds.length; i += 100) {
    chunks.push(deviceIds.slice(i, i + 100));
  }

  const allDevices = [];
  for (const chunk of chunks) {
    const response = await crowdstrikeFetch(
      baseUrl,
      accessToken,
      '/devices/entities/devices/v2',
      {
        method: 'POST',
        body: JSON.stringify({ ids: chunk }),
      }
    );
    allDevices.push(...(response.resources || []));
  }

  return allDevices;
}

/**
 * Sync CrowdStrike data
 * @param {string} clientId - CrowdStrike API client ID
 * @param {string} clientSecret - CrowdStrike API client secret
 * @param {string} baseUrl - CrowdStrike API base URL (default: https://api.crowdstrike.com)
 * @returns {Promise<Object>} Sync results
 */
async function syncCrowdStrike(clientId, clientSecret, baseUrl = 'https://api.crowdstrike.com') {
  const results = {
    data: {},
    normalized: {},
    errors: [],
    recordCount: 0,
  };

  try {
    // Get OAuth token
    const accessToken = await getAccessToken(clientId, clientSecret, baseUrl);

    // 1. Fetch devices
    try {
      // Get device IDs
      const deviceQueryResponse = await crowdstrikeFetch(
        baseUrl,
        accessToken,
        '/devices/queries/devices/v1?limit=5000'
      );

      const deviceIds = deviceQueryResponse.resources || [];

      // Get device details
      const devices = await getDeviceDetails(baseUrl, accessToken, deviceIds);

      results.data.devices = devices.map(device => ({
        deviceId: device.device_id,
        cid: device.cid,
        hostname: device.hostname,
        localIp: device.local_ip,
        externalIp: device.external_ip,
        macAddress: device.mac_address,
        osVersion: device.os_version,
        platform: device.platform_name,
        systemManufacturer: device.system_manufacturer,
        systemProductName: device.system_product_name,
        status: device.status,
        lastSeen: device.last_seen,
        firstSeen: device.first_seen,
        agentVersion: device.agent_version,
        containmentStatus: device.containment_status,
        reducedFunctionalityMode: device.reduced_functionality_mode,
      }));

      const onlineDevices = devices.filter(d => d.status === 'normal');
      const offlineDevices = devices.filter(d => d.status === 'containment_pending' || d.status === 'contained');

      results.normalized.devices = {
        total: devices.length,
        online: onlineDevices.length,
        offline: devices.length - onlineDevices.length,
        contained: offlineDevices.length,
        reducedFunctionality: devices.filter(d => d.reduced_functionality_mode === 'yes').length,
        byPlatform: {
          windows: devices.filter(d => d.platform_name === 'Windows').length,
          mac: devices.filter(d => d.platform_name === 'Mac').length,
          linux: devices.filter(d => d.platform_name === 'Linux').length,
        },
        staleDevices: devices.filter(d => {
          const lastSeen = new Date(d.last_seen);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return lastSeen < weekAgo;
        }).length,
      };
      results.recordCount += devices.length;
    } catch (error) {
      results.errors.push({ type: 'devices', error: error.message });
    }

    // 2. Fetch detections
    try {
      const detectionsResponse = await crowdstrikeFetch(
        baseUrl,
        accessToken,
        '/detects/queries/detects/v1?limit=1000&sort=last_behavior|desc'
      );

      const detectionIds = detectionsResponse.resources || [];

      // Get detection details (if we have IDs)
      let detections = [];
      if (detectionIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < detectionIds.length; i += 100) {
          chunks.push(detectionIds.slice(i, i + 100));
        }

        for (const chunk of chunks) {
          const response = await crowdstrikeFetch(
            baseUrl,
            accessToken,
            '/detects/entities/summaries/GET/v1',
            {
              method: 'POST',
              body: JSON.stringify({ ids: chunk }),
            }
          );
          detections.push(...(response.resources || []));
        }
      }

      results.data.detections = detections.map(detection => ({
        detectionId: detection.detection_id,
        status: detection.status,
        maxSeverity: detection.max_severity,
        maxConfidence: detection.max_confidence,
        firstBehavior: detection.first_behavior,
        lastBehavior: detection.last_behavior,
        hostname: detection.device?.hostname,
        deviceId: detection.device?.device_id,
        quarantined: detection.quarantined_files?.length > 0,
      }));

      results.normalized.detections = {
        total: detections.length,
        bySeverity: {
          critical: detections.filter(d => d.max_severity >= 80).length,
          high: detections.filter(d => d.max_severity >= 60 && d.max_severity < 80).length,
          medium: detections.filter(d => d.max_severity >= 40 && d.max_severity < 60).length,
          low: detections.filter(d => d.max_severity < 40).length,
        },
        byStatus: {
          new: detections.filter(d => d.status === 'new').length,
          inProgress: detections.filter(d => d.status === 'in_progress').length,
          closed: detections.filter(d => d.status === 'closed').length,
          ignored: detections.filter(d => d.status === 'ignored').length,
        },
        quarantined: detections.filter(d => d.quarantined).length,
      };
      results.recordCount += detections.length;
    } catch (error) {
      results.errors.push({ type: 'detections', error: error.message });
    }

    // 3. Fetch vulnerabilities (Spotlight)
    try {
      const vulnResponse = await crowdstrikeFetch(
        baseUrl,
        accessToken,
        '/spotlight/queries/vulnerabilities/v1?limit=1000&sort=created_timestamp|desc'
      );

      const vulnIds = vulnResponse.resources || [];

      // Get vulnerability details
      let vulnerabilities = [];
      if (vulnIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < vulnIds.length; i += 100) {
          chunks.push(vulnIds.slice(i, i + 100));
        }

        for (const chunk of chunks) {
          const response = await crowdstrikeFetch(
            baseUrl,
            accessToken,
            '/spotlight/entities/vulnerabilities/v2',
            {
              method: 'GET',
              // Note: This endpoint uses query params for IDs
            }
          );
          vulnerabilities.push(...(response.resources || []));
        }
      }

      results.data.vulnerabilities = vulnerabilities.slice(0, 500).map(vuln => ({
        id: vuln.id,
        cve: vuln.cve?.id,
        severity: vuln.cve?.severity,
        exploitStatus: vuln.cve?.exploit_status,
        productName: vuln.apps?.[0]?.product_name,
        hostCount: vuln.host_info?.count,
        createdTimestamp: vuln.created_timestamp,
        updatedTimestamp: vuln.updated_timestamp,
      }));

      results.normalized.vulnerabilities = {
        total: vulnIds.length,
        bySeverity: {
          critical: vulnerabilities.filter(v => v.cve?.severity === 'CRITICAL').length,
          high: vulnerabilities.filter(v => v.cve?.severity === 'HIGH').length,
          medium: vulnerabilities.filter(v => v.cve?.severity === 'MEDIUM').length,
          low: vulnerabilities.filter(v => v.cve?.severity === 'LOW').length,
        },
        exploitable: vulnerabilities.filter(v =>
          v.cve?.exploit_status && v.cve.exploit_status !== 'Unknown'
        ).length,
        uniqueCVEs: [...new Set(vulnerabilities.map(v => v.cve?.id).filter(Boolean))].length,
      };
      results.recordCount += vulnerabilities.length;
    } catch (error) {
      // Spotlight may not be enabled
      if (!error.message.includes('403')) {
        results.errors.push({ type: 'vulnerabilities', error: error.message });
      }
    }

    // 4. Fetch incidents
    try {
      const incidentsResponse = await crowdstrikeFetch(
        baseUrl,
        accessToken,
        '/incidents/queries/incidents/v1?limit=500&sort=start|desc'
      );

      const incidentIds = incidentsResponse.resources || [];

      // Get incident details
      let incidents = [];
      if (incidentIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < incidentIds.length; i += 100) {
          chunks.push(incidentIds.slice(i, i + 100));
        }

        for (const chunk of chunks) {
          const response = await crowdstrikeFetch(
            baseUrl,
            accessToken,
            '/incidents/entities/incidents/GET/v1',
            {
              method: 'POST',
              body: JSON.stringify({ ids: chunk }),
            }
          );
          incidents.push(...(response.resources || []));
        }
      }

      results.data.incidents = incidents.map(incident => ({
        incidentId: incident.incident_id,
        status: incident.status,
        state: incident.state,
        start: incident.start,
        end: incident.end,
        fineScore: incident.fine_score,
        hostCount: incident.hosts?.length || 0,
        tactics: incident.tactics,
        techniques: incident.techniques,
      }));

      results.normalized.incidents = {
        total: incidents.length,
        open: incidents.filter(i => i.status !== 'closed').length,
        closed: incidents.filter(i => i.status === 'closed').length,
        byScore: {
          critical: incidents.filter(i => i.fine_score >= 80).length,
          high: incidents.filter(i => i.fine_score >= 60 && i.fine_score < 80).length,
          medium: incidents.filter(i => i.fine_score >= 40 && i.fine_score < 60).length,
          low: incidents.filter(i => i.fine_score < 40).length,
        },
        multiHostIncidents: incidents.filter(i => (i.hosts?.length || 0) > 1).length,
      };
      results.recordCount += incidents.length;
    } catch (error) {
      results.errors.push({ type: 'incidents', error: error.message });
    }

    // 5. Fetch prevention policies
    try {
      const policiesResponse = await crowdstrikeFetch(
        baseUrl,
        accessToken,
        '/policy/queries/prevention/v1?limit=500'
      );

      const policyIds = policiesResponse.resources || [];

      let policies = [];
      if (policyIds.length > 0) {
        const response = await crowdstrikeFetch(
          baseUrl,
          accessToken,
          `/policy/entities/prevention/v1?ids=${policyIds.join('&ids=')}`
        );
        policies = response.resources || [];
      }

      results.data.prevention_policies = policies.map(policy => ({
        id: policy.id,
        name: policy.name,
        description: policy.description,
        enabled: policy.enabled,
        platformName: policy.platform_name,
        createdBy: policy.created_by,
        createdTimestamp: policy.created_timestamp,
        modifiedTimestamp: policy.modified_timestamp,
      }));

      results.normalized.prevention_policies = {
        total: policies.length,
        enabled: policies.filter(p => p.enabled).length,
        disabled: policies.filter(p => !p.enabled).length,
        byPlatform: {
          windows: policies.filter(p => p.platform_name === 'Windows').length,
          mac: policies.filter(p => p.platform_name === 'Mac').length,
          linux: policies.filter(p => p.platform_name === 'Linux').length,
        },
      };
      results.recordCount += policies.length;
    } catch (error) {
      results.errors.push({ type: 'prevention_policies', error: error.message });
    }

  } catch (error) {
    results.errors.push({ type: 'general', error: error.message });
  }

  return results;
}

/**
 * Get mapped compliance controls for CrowdStrike data
 * @param {string} dataType - Type of data synced
 * @returns {string[]} Array of control IDs
 */
function getMappedControls(dataType) {
  return CROWDSTRIKE_CONTROL_MAPPINGS[dataType] || [];
}

/**
 * Test CrowdStrike connection
 * @param {string} clientId - CrowdStrike API client ID
 * @param {string} clientSecret - CrowdStrike API client secret
 * @param {string} baseUrl - CrowdStrike API base URL
 * @returns {Promise<Object>} Connection status
 */
async function testConnection(clientId, clientSecret, baseUrl = 'https://api.crowdstrike.com') {
  try {
    // Get OAuth token
    const accessToken = await getAccessToken(clientId, clientSecret, baseUrl);

    // Verify by getting sensor info
    const sensorsResponse = await crowdstrikeFetch(
      baseUrl,
      accessToken,
      '/sensors/queries/sensors/v1?limit=1'
    );

    return {
      success: true,
      accountId: 'crowdstrike',
      accountName: 'CrowdStrike Falcon',
      metadata: {
        baseUrl,
        apiVersion: 'v1',
        totalSensors: sensorsResponse.meta?.pagination?.total || 0,
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
  syncCrowdStrike,
  testConnection,
  getMappedControls,
  getAccessToken,
  CROWDSTRIKE_CONTROL_MAPPINGS,
};
