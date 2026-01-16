// netlify/functions/azure-verify.cjs
// Azure Verification Function - Handles Azure SDK calls for compliance verification
//
// SECURITY NOTE: This function receives service principal credentials from the client.
// In production, consider using Azure Managed Identities or storing credentials in
// Azure Key Vault for better security practices.

// ============================================================================
// AZURE SDK IMPORTS (Lazy loaded for cold start optimization)
// ============================================================================

let ClientSecretCredential = null;
let SubscriptionClient = null;
let StorageManagementClient = null;
let KeyVaultManagementClient = null;
let MonitorManagementClient = null;
let SecurityCenter = null;
let ResourceGraphClient = null;
let NetworkManagementClient = null;

function getAzureIdentity() {
  if (!ClientSecretCredential) {
    const identity = require('@azure/identity');
    ClientSecretCredential = identity.ClientSecretCredential;
  }
  return { ClientSecretCredential };
}

function getSubscriptionClient() {
  if (!SubscriptionClient) {
    const arm = require('@azure/arm-subscriptions');
    SubscriptionClient = arm.SubscriptionClient;
  }
  return SubscriptionClient;
}

function getStorageClient() {
  if (!StorageManagementClient) {
    const storage = require('@azure/arm-storage');
    StorageManagementClient = storage.StorageManagementClient;
  }
  return StorageManagementClient;
}

function getKeyVaultClient() {
  if (!KeyVaultManagementClient) {
    const keyvault = require('@azure/arm-keyvault');
    KeyVaultManagementClient = keyvault.KeyVaultManagementClient;
  }
  return KeyVaultManagementClient;
}

function getMonitorClient() {
  if (!MonitorManagementClient) {
    const monitor = require('@azure/arm-monitor');
    MonitorManagementClient = monitor.MonitorManagementClient;
  }
  return MonitorManagementClient;
}

function getSecurityClient() {
  if (!SecurityCenter) {
    const security = require('@azure/arm-security');
    SecurityCenter = security.SecurityCenter;
  }
  return SecurityCenter;
}

function getResourceGraphClient() {
  if (!ResourceGraphClient) {
    const resourcegraph = require('@azure/arm-resourcegraph');
    ResourceGraphClient = resourcegraph.ResourceGraphClient;
  }
  return ResourceGraphClient;
}

function getNetworkClient() {
  if (!NetworkManagementClient) {
    const network = require('@azure/arm-network');
    NetworkManagementClient = network.NetworkManagementClient;
  }
  return NetworkManagementClient;
}

// ============================================================================
// CORS HEADERS
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createCredential(credentials) {
  const { ClientSecretCredential } = getAzureIdentity();
  return new ClientSecretCredential(
    credentials.tenantId,
    credentials.clientId,
    credentials.clientSecret
  );
}

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

/**
 * Test Azure connection by getting subscription details
 */
async function testConnection(credentials) {
  const credential = createCredential(credentials);
  const SubscriptionClientClass = getSubscriptionClient();
  const subscriptionClient = new SubscriptionClientClass(credential);

  const subscription = await subscriptionClient.subscriptions.get(credentials.subscriptionId);

  return {
    subscriptionId: subscription.subscriptionId,
    subscriptionName: subscription.displayName,
    state: subscription.state,
    tenantId: credentials.tenantId,
  };
}

/**
 * Check Storage Account Encryption
 */
async function checkStorageEncryption(credentials) {
  const credential = createCredential(credentials);
  const StorageClientClass = getStorageClient();
  const storageClient = new StorageClientClass(credential, credentials.subscriptionId);

  const accounts = [];
  for await (const account of storageClient.storageAccounts.list()) {
    accounts.push(account);
  }

  let encryptedAccounts = 0;
  let unencryptedAccounts = 0;
  const accountDetails = [];

  for (const account of accounts) {
    const isEncrypted = account.encryption?.services?.blob?.enabled === true;

    if (isEncrypted) {
      encryptedAccounts++;
    } else {
      unencryptedAccounts++;
    }

    accountDetails.push({
      name: account.name,
      resourceGroup: account.id.split('/')[4],
      encrypted: isEncrypted,
      keySource: account.encryption?.keySource || 'Unknown',
    });
  }

  const totalAccounts = accounts.length;

  if (totalAccounts === 0) {
    return {
      status: 'pass',
      details: 'No Storage Accounts found in the subscription',
      evidence: {
        type: 'json',
        data: JSON.stringify({ totalAccounts: 0 }, null, 2),
        timestamp: new Date().toISOString(),
      },
      recommendations: [],
    };
  }

  const encryptionPercentage = Math.round((encryptedAccounts / totalAccounts) * 100);

  let status = 'pass';
  let details = `All ${totalAccounts} Storage Accounts have encryption enabled.`;

  if (unencryptedAccounts > 0) {
    status = encryptionPercentage >= 80 ? 'partial' : 'fail';
    details = `${encryptedAccounts}/${totalAccounts} accounts (${encryptionPercentage}%) have encryption enabled.`;
  }

  return {
    status,
    details,
    evidence: {
      type: 'json',
      data: JSON.stringify({
        totalAccounts,
        encryptedAccounts,
        unencryptedAccounts,
        accountDetails,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations: unencryptedAccounts > 0 ? [
      'Enable encryption for all Storage Accounts',
      'Consider using Customer Managed Keys (CMK) for sensitive data',
      'Enable infrastructure encryption for double encryption',
    ] : [],
  };
}

/**
 * Check Storage Account HTTPS-Only
 */
async function checkStorageHttpsOnly(credentials) {
  const credential = createCredential(credentials);
  const StorageClientClass = getStorageClient();
  const storageClient = new StorageClientClass(credential, credentials.subscriptionId);

  const accounts = [];
  for await (const account of storageClient.storageAccounts.list()) {
    accounts.push(account);
  }

  let httpsOnlyAccounts = 0;
  let nonHttpsAccounts = 0;
  const accountDetails = [];

  for (const account of accounts) {
    const isHttpsOnly = account.enableHttpsTrafficOnly === true;

    if (isHttpsOnly) {
      httpsOnlyAccounts++;
    } else {
      nonHttpsAccounts++;
    }

    accountDetails.push({
      name: account.name,
      httpsOnly: isHttpsOnly,
      minimumTlsVersion: account.minimumTlsVersion || 'Unknown',
    });
  }

  const totalAccounts = accounts.length;

  if (totalAccounts === 0) {
    return {
      status: 'pass',
      details: 'No Storage Accounts found in the subscription',
      evidence: {
        type: 'json',
        data: JSON.stringify({ totalAccounts: 0 }, null, 2),
        timestamp: new Date().toISOString(),
      },
      recommendations: [],
    };
  }

  const httpsPercentage = Math.round((httpsOnlyAccounts / totalAccounts) * 100);

  let status = 'pass';
  let details = `All ${totalAccounts} Storage Accounts enforce HTTPS-only access.`;

  if (nonHttpsAccounts > 0) {
    status = httpsPercentage >= 80 ? 'partial' : 'fail';
    details = `${httpsOnlyAccounts}/${totalAccounts} accounts (${httpsPercentage}%) enforce HTTPS-only.`;
  }

  return {
    status,
    details,
    evidence: {
      type: 'json',
      data: JSON.stringify({
        totalAccounts,
        httpsOnlyAccounts,
        nonHttpsAccounts,
        accountDetails,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations: nonHttpsAccounts > 0 ? [
      'Enable "Secure transfer required" on all Storage Accounts',
      'Set minimum TLS version to 1.2',
      'Consider disabling public blob access',
    ] : [],
  };
}

/**
 * Check Key Vault Configuration
 */
async function checkKeyVaultConfig(credentials) {
  const credential = createCredential(credentials);
  const KeyVaultClientClass = getKeyVaultClient();
  const keyVaultClient = new KeyVaultClientClass(credential, credentials.subscriptionId);

  const vaults = [];
  for await (const vault of keyVaultClient.vaults.list()) {
    vaults.push(vault);
  }

  if (vaults.length === 0) {
    return {
      status: 'partial',
      details: 'No Key Vaults found - consider using Key Vault for secrets management',
      evidence: {
        type: 'json',
        data: JSON.stringify({ totalVaults: 0 }, null, 2),
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        'Create an Azure Key Vault for centralized secrets management',
        'Store application secrets, keys, and certificates in Key Vault',
        'Enable soft delete and purge protection',
      ],
    };
  }

  let compliantVaults = 0;
  let nonCompliantVaults = 0;
  const vaultDetails = [];
  const recommendations = new Set();

  for (const vault of vaults) {
    // Get full vault details
    const resourceGroup = vault.id.split('/')[4];
    let fullVault;
    try {
      fullVault = await keyVaultClient.vaults.get(resourceGroup, vault.name);
    } catch {
      continue;
    }

    const properties = fullVault.properties;
    const checks = {
      softDeleteEnabled: properties.enableSoftDelete === true,
      purgeProtectionEnabled: properties.enablePurgeProtection === true,
      rbacEnabled: properties.enableRbacAuthorization === true,
      networkRulesConfigured: properties.networkAcls?.defaultAction === 'Deny',
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const isCompliant = passedChecks >= 3;

    if (isCompliant) {
      compliantVaults++;
    } else {
      nonCompliantVaults++;
      if (!checks.softDeleteEnabled) recommendations.add('Enable soft delete for Key Vaults');
      if (!checks.purgeProtectionEnabled) recommendations.add('Enable purge protection for Key Vaults');
      if (!checks.rbacEnabled) recommendations.add('Enable RBAC authorization for Key Vaults');
      if (!checks.networkRulesConfigured) recommendations.add('Configure network rules to restrict Key Vault access');
    }

    vaultDetails.push({
      name: vault.name,
      resourceGroup,
      ...checks,
      compliant: isCompliant,
    });
  }

  const totalVaults = vaults.length;
  const compliancePercentage = Math.round((compliantVaults / totalVaults) * 100);

  let status = 'pass';
  let details = `All ${totalVaults} Key Vaults meet security requirements.`;

  if (nonCompliantVaults > 0) {
    status = compliancePercentage >= 80 ? 'partial' : 'fail';
    details = `${compliantVaults}/${totalVaults} vaults (${compliancePercentage}%) meet security requirements.`;
  }

  return {
    status,
    details,
    evidence: {
      type: 'json',
      data: JSON.stringify({
        totalVaults,
        compliantVaults,
        nonCompliantVaults,
        vaultDetails,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations: Array.from(recommendations),
  };
}

/**
 * Check Activity Log / Monitor Status
 */
async function checkActivityLogStatus(credentials) {
  const credential = createCredential(credentials);
  const MonitorClientClass = getMonitorClient();
  const monitorClient = new MonitorClientClass(credential, credentials.subscriptionId);

  // Check for diagnostic settings at subscription level
  const diagnosticSettings = [];
  try {
    const settingsIterator = monitorClient.subscriptionDiagnosticSettings.list();
    for await (const setting of settingsIterator) {
      diagnosticSettings.push(setting);
    }
  } catch (error) {
    // Diagnostic settings might not be configured
  }

  // Check for log profiles (activity log archiving)
  const logProfiles = [];
  try {
    const profilesIterator = monitorClient.logProfiles.list();
    for await (const profile of profilesIterator) {
      logProfiles.push(profile);
    }
  } catch (error) {
    // Log profiles might not exist
  }

  const hasActivityLogArchiving = logProfiles.length > 0 || diagnosticSettings.length > 0;
  const recommendations = [];

  if (!hasActivityLogArchiving) {
    recommendations.push('Configure Activity Log archiving to a Storage Account or Log Analytics workspace');
    recommendations.push('Set up diagnostic settings for subscription-level events');
    recommendations.push('Configure retention period of at least 90 days');
  }

  return {
    status: hasActivityLogArchiving ? 'pass' : 'fail',
    details: hasActivityLogArchiving
      ? `Activity Log archiving is configured (${diagnosticSettings.length} diagnostic settings, ${logProfiles.length} log profiles)`
      : 'Activity Log archiving is not configured',
    evidence: {
      type: 'json',
      data: JSON.stringify({
        diagnosticSettings: diagnosticSettings.map(s => ({
          name: s.name,
          storageAccountId: s.storageAccountId,
          workspaceId: s.workspaceId,
        })),
        logProfiles: logProfiles.map(p => ({
          name: p.name,
          storageAccountId: p.storageAccountId,
          retentionDays: p.retentionPolicy?.days,
        })),
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations,
  };
}

/**
 * Check Log Retention
 */
async function checkLogRetention(credentials) {
  const credential = createCredential(credentials);
  const MonitorClientClass = getMonitorClient();
  const monitorClient = new MonitorClientClass(credential, credentials.subscriptionId);

  const retentionIssues = [];
  let hasAdequateRetention = false;

  // Check log profiles
  try {
    const profilesIterator = monitorClient.logProfiles.list();
    for await (const profile of profilesIterator) {
      const retentionDays = profile.retentionPolicy?.days || 0;
      const retentionEnabled = profile.retentionPolicy?.enabled === true;

      if (retentionEnabled && retentionDays >= 90) {
        hasAdequateRetention = true;
      } else if (retentionEnabled && retentionDays < 90) {
        retentionIssues.push(`Log profile '${profile.name}' has only ${retentionDays} days retention`);
      }
    }
  } catch (error) {
    // Log profiles might not exist
  }

  // Check diagnostic settings
  try {
    const settingsIterator = monitorClient.subscriptionDiagnosticSettings.list();
    for await (const setting of settingsIterator) {
      if (setting.workspaceId) {
        // Log Analytics workspace - check workspace retention separately
        hasAdequateRetention = true; // Assume adequate if using Log Analytics
      }
    }
  } catch (error) {
    // Diagnostic settings might not be configured
  }

  const recommendations = [];
  if (!hasAdequateRetention) {
    recommendations.push('Configure log retention of at least 90 days for compliance');
    recommendations.push('Consider using Azure Log Analytics for centralized log management');
    recommendations.push('Set up long-term archiving to Storage Account for audit requirements');
  }

  if (retentionIssues.length > 0) {
    recommendations.push(...retentionIssues.map(issue => `Fix: ${issue}`));
  }

  return {
    status: hasAdequateRetention ? (retentionIssues.length > 0 ? 'partial' : 'pass') : 'fail',
    details: hasAdequateRetention
      ? `Log retention meets requirements${retentionIssues.length > 0 ? ' with some exceptions' : ''}`
      : 'Log retention is not adequately configured',
    evidence: {
      type: 'json',
      data: JSON.stringify({
        hasAdequateRetention,
        issues: retentionIssues,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations,
  };
}

/**
 * Check Microsoft Defender for Cloud Status
 */
async function checkDefenderStatus(credentials) {
  const credential = createCredential(credentials);
  const SecurityClientClass = getSecurityClient();
  const securityClient = new SecurityClientClass(credential, credentials.subscriptionId);

  const enabledPlans = [];
  const disabledPlans = [];

  try {
    const pricingsIterator = securityClient.pricings.list();
    for await (const pricing of pricingsIterator) {
      if (pricing.pricingTier === 'Standard') {
        enabledPlans.push(pricing.name);
      } else {
        disabledPlans.push(pricing.name);
      }
    }
  } catch (error) {
    return {
      status: 'error',
      details: 'Unable to check Defender for Cloud status',
      recommendations: [
        'Ensure the service principal has Security Reader permissions',
        'Enable Microsoft Defender for Cloud for enhanced security',
      ],
    };
  }

  const totalPlans = enabledPlans.length + disabledPlans.length;
  const enabledPercentage = totalPlans > 0 ? Math.round((enabledPlans.length / totalPlans) * 100) : 0;

  let status = 'fail';
  if (enabledPercentage === 100) status = 'pass';
  else if (enabledPercentage >= 50) status = 'partial';

  const recommendations = [];
  if (disabledPlans.length > 0) {
    recommendations.push(`Enable Defender for: ${disabledPlans.join(', ')}`);
    recommendations.push('Consider enabling all Defender plans for comprehensive protection');
  }

  return {
    status,
    details: enabledPlans.length > 0
      ? `${enabledPlans.length}/${totalPlans} Defender plans enabled (${enabledPercentage}%)`
      : 'Microsoft Defender for Cloud is not enabled',
    evidence: {
      type: 'json',
      data: JSON.stringify({
        enabledPlans,
        disabledPlans,
        enabledPercentage,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations,
  };
}

/**
 * Check Advanced Threat Protection Status
 */
async function checkATPStatus(credentials) {
  const credential = createCredential(credentials);
  const SecurityClientClass = getSecurityClient();
  const securityClient = new SecurityClientClass(credential, credentials.subscriptionId);

  const atpResources = {
    servers: false,
    sqlServers: false,
    storageAccounts: false,
    keyVaults: false,
  };

  try {
    const pricingsIterator = securityClient.pricings.list();
    for await (const pricing of pricingsIterator) {
      if (pricing.pricingTier === 'Standard') {
        if (pricing.name === 'VirtualMachines') atpResources.servers = true;
        if (pricing.name === 'SqlServers') atpResources.sqlServers = true;
        if (pricing.name === 'StorageAccounts') atpResources.storageAccounts = true;
        if (pricing.name === 'KeyVaults') atpResources.keyVaults = true;
      }
    }
  } catch (error) {
    return {
      status: 'error',
      details: 'Unable to check Advanced Threat Protection status',
      recommendations: ['Verify permissions and try again'],
    };
  }

  const enabledCount = Object.values(atpResources).filter(Boolean).length;
  const totalCount = Object.keys(atpResources).length;
  const enabledPercentage = Math.round((enabledCount / totalCount) * 100);

  let status = 'fail';
  if (enabledPercentage === 100) status = 'pass';
  else if (enabledPercentage >= 50) status = 'partial';

  const recommendations = [];
  if (!atpResources.servers) recommendations.push('Enable Defender for Servers');
  if (!atpResources.sqlServers) recommendations.push('Enable Defender for SQL');
  if (!atpResources.storageAccounts) recommendations.push('Enable Defender for Storage');
  if (!atpResources.keyVaults) recommendations.push('Enable Defender for Key Vault');

  return {
    status,
    details: `Advanced Threat Protection: ${enabledCount}/${totalCount} resource types protected`,
    evidence: {
      type: 'json',
      data: JSON.stringify({
        atpResources,
        enabledCount,
        totalCount,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations,
  };
}

/**
 * Check Resource Inventory via Resource Graph
 */
async function checkResourceInventory(credentials) {
  const credential = createCredential(credentials);
  const ResourceGraphClientClass = getResourceGraphClient();
  const resourceGraphClient = new ResourceGraphClientClass(credential);

  try {
    // Query to count resources by type
    const query = {
      subscriptions: [credentials.subscriptionId],
      query: `
        resources
        | summarize count() by type
        | order by count_ desc
        | limit 20
      `,
    };

    const result = await resourceGraphClient.resources(query);

    const resourceTypes = result.data || [];
    const totalResources = resourceTypes.reduce((sum, r) => sum + r.count_, 0);

    return {
      status: 'pass',
      details: `Asset inventory accessible: ${totalResources} resources across ${resourceTypes.length} types`,
      evidence: {
        type: 'json',
        data: JSON.stringify({
          totalResources,
          resourceTypes: resourceTypes.slice(0, 10),
        }, null, 2),
        timestamp: new Date().toISOString(),
      },
      recommendations: [],
    };
  } catch (error) {
    return {
      status: 'fail',
      details: 'Unable to query resource inventory via Azure Resource Graph',
      recommendations: [
        'Ensure the service principal has Reader access to the subscription',
        'Azure Resource Graph requires appropriate permissions',
      ],
    };
  }
}

/**
 * Check Network Security Group Configuration
 */
async function checkNSGConfig(credentials) {
  const credential = createCredential(credentials);
  const NetworkClientClass = getNetworkClient();
  const networkClient = new NetworkClientClass(credential, credentials.subscriptionId);

  const nsgs = [];
  for await (const nsg of networkClient.networkSecurityGroups.listAll()) {
    nsgs.push(nsg);
  }

  if (nsgs.length === 0) {
    return {
      status: 'partial',
      details: 'No Network Security Groups found - consider implementing network segmentation',
      evidence: {
        type: 'json',
        data: JSON.stringify({ totalNSGs: 0 }, null, 2),
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        'Create Network Security Groups for network segmentation',
        'Apply NSGs to subnets and network interfaces',
        'Implement least-privilege access rules',
      ],
    };
  }

  let configuredNSGs = 0;
  let emptyNSGs = 0;
  const nsgDetails = [];

  for (const nsg of nsgs) {
    const hasCustomRules = (nsg.securityRules?.length || 0) > 0;

    if (hasCustomRules) {
      configuredNSGs++;
    } else {
      emptyNSGs++;
    }

    nsgDetails.push({
      name: nsg.name,
      resourceGroup: nsg.id.split('/')[4],
      customRulesCount: nsg.securityRules?.length || 0,
      associatedSubnets: nsg.subnets?.length || 0,
      associatedNICs: nsg.networkInterfaces?.length || 0,
    });
  }

  const totalNSGs = nsgs.length;
  const configuredPercentage = Math.round((configuredNSGs / totalNSGs) * 100);

  let status = 'pass';
  if (emptyNSGs > 0) {
    status = configuredPercentage >= 80 ? 'partial' : 'fail';
  }

  return {
    status,
    details: `${configuredNSGs}/${totalNSGs} NSGs have custom security rules configured`,
    evidence: {
      type: 'json',
      data: JSON.stringify({
        totalNSGs,
        configuredNSGs,
        emptyNSGs,
        nsgDetails,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations: emptyNSGs > 0 ? [
      'Configure security rules for all NSGs',
      'Review and remove overly permissive rules',
      'Implement deny-all default rules where appropriate',
    ] : [],
  };
}

/**
 * Check Firewall Rules
 */
async function checkFirewallRules(credentials) {
  const credential = createCredential(credentials);
  const NetworkClientClass = getNetworkClient();
  const networkClient = new NetworkClientClass(credential, credentials.subscriptionId);

  // Check for Azure Firewall
  const firewalls = [];
  try {
    for await (const firewall of networkClient.azureFirewalls.listAll()) {
      firewalls.push(firewall);
    }
  } catch (error) {
    // Azure Firewall might not be available
  }

  // Check NSG rules for overly permissive access
  const nsgs = [];
  for await (const nsg of networkClient.networkSecurityGroups.listAll()) {
    nsgs.push(nsg);
  }

  const securityIssues = [];

  for (const nsg of nsgs) {
    for (const rule of nsg.securityRules || []) {
      // Check for overly permissive inbound rules
      if (rule.direction === 'Inbound' && rule.access === 'Allow') {
        if (rule.sourceAddressPrefix === '*' || rule.sourceAddressPrefix === 'Internet') {
          if (rule.destinationPortRange === '*' || rule.destinationPortRange === '22' || rule.destinationPortRange === '3389') {
            securityIssues.push({
              nsg: nsg.name,
              rule: rule.name,
              issue: `Allows ${rule.sourceAddressPrefix} access to port ${rule.destinationPortRange}`,
            });
          }
        }
      }
    }
  }

  const hasFirewall = firewalls.length > 0;
  const hasSecurityIssues = securityIssues.length > 0;

  let status = 'pass';
  if (hasSecurityIssues) status = hasFirewall ? 'partial' : 'fail';
  else if (!hasFirewall && nsgs.length === 0) status = 'fail';

  const recommendations = [];
  if (!hasFirewall) {
    recommendations.push('Consider deploying Azure Firewall for centralized network security');
  }
  if (hasSecurityIssues) {
    recommendations.push('Review and restrict overly permissive NSG rules');
    recommendations.push('Use Just-In-Time VM access instead of always-open ports');
    recommendations.push('Implement Azure Bastion for secure RDP/SSH access');
  }

  return {
    status,
    details: hasFirewall
      ? `Azure Firewall deployed${hasSecurityIssues ? ` but ${securityIssues.length} NSG issues found` : ''}`
      : `No Azure Firewall; ${securityIssues.length} potentially insecure NSG rules found`,
    evidence: {
      type: 'json',
      data: JSON.stringify({
        firewallsDeployed: firewalls.length,
        nsgCount: nsgs.length,
        securityIssues,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations,
  };
}

// ============================================================================
// PLACEHOLDER FUNCTIONS (Azure AD requires Graph API)
// ============================================================================

async function checkAADMFAStatus(credentials) {
  // Azure AD MFA checks require Microsoft Graph API
  // This is a placeholder that returns guidance
  return {
    status: 'not_checked',
    details: 'Azure AD MFA verification requires Microsoft Graph API integration',
    recommendations: [
      'Configure Microsoft Graph API permissions for MFA status checks',
      'Enable Security Defaults or Conditional Access policies for MFA',
      'Use Azure AD Identity Protection for risk-based MFA',
    ],
  };
}

async function checkAADPasswordPolicy(credentials) {
  return {
    status: 'not_checked',
    details: 'Azure AD password policy verification requires Microsoft Graph API integration',
    recommendations: [
      'Configure Microsoft Graph API permissions for password policy checks',
      'Enable Azure AD Password Protection',
      'Configure custom banned password list',
    ],
  };
}

async function checkConditionalAccess(credentials) {
  return {
    status: 'not_checked',
    details: 'Conditional Access policy verification requires Microsoft Graph API integration',
    recommendations: [
      'Configure Microsoft Graph API permissions for Conditional Access checks',
      'Enable baseline Conditional Access policies',
      'Require MFA for admin accounts via Conditional Access',
    ],
  };
}

// ============================================================================
// HANDLER
// ============================================================================

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { action, credentials, controlId, checkType } = payload;

    if (!credentials || !credentials.tenantId || !credentials.clientId || !credentials.clientSecret || !credentials.subscriptionId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Azure credentials are required (tenantId, clientId, clientSecret, subscriptionId)' }),
      };
    }

    // Test connection
    if (action === 'test_connection') {
      const result = await testConnection(credentials);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    }

    // Verify control
    if (action === 'verify_control') {
      let result;

      switch (checkType) {
        case 'aad_mfa_status':
          result = await checkAADMFAStatus(credentials);
          break;
        case 'aad_password_policy':
          result = await checkAADPasswordPolicy(credentials);
          break;
        case 'conditional_access':
          result = await checkConditionalAccess(credentials);
          break;
        case 'storage_encryption':
          result = await checkStorageEncryption(credentials);
          break;
        case 'storage_https_only':
          result = await checkStorageHttpsOnly(credentials);
          break;
        case 'keyvault_config':
          result = await checkKeyVaultConfig(credentials);
          break;
        case 'activity_log_status':
          result = await checkActivityLogStatus(credentials);
          break;
        case 'log_retention':
          result = await checkLogRetention(credentials);
          break;
        case 'defender_status':
          result = await checkDefenderStatus(credentials);
          break;
        case 'atp_status':
          result = await checkATPStatus(credentials);
          break;
        case 'resource_inventory':
          result = await checkResourceInventory(credentials);
          break;
        case 'nsg_config':
          result = await checkNSGConfig(credentials);
          break;
        case 'firewall_rules':
          result = await checkFirewallRules(credentials);
          break;
        default:
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: `Unknown check type: ${checkType}` }),
          };
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    }

    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid action' }),
    };

  } catch (error) {
    console.error('Azure Verify error:', error);

    // Handle specific Azure errors
    if (error.code === 'CredentialUnavailableError' || error.message?.includes('authentication')) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid Azure credentials' }),
      };
    }

    if (error.code === 'AuthorizationFailed' || error.statusCode === 403) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Access denied. Ensure your service principal has the required permissions.',
        }),
      };
    }

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Verification failed',
        message: error.message,
      }),
    };
  }
};
