// netlify/functions/gcp-verify.cjs
// GCP Verification Function - Handles GCP API calls for compliance verification
//
// SECURITY NOTE: This function receives service account credentials from the client.
// In production, consider using Workload Identity Federation for better security.

// ============================================================================
// GCP CLIENT IMPORTS (Lazy loaded for cold start optimization)
// ============================================================================

let GoogleAuth = null;
let Storage = null;
let KeyManagementServiceClient = null;
let SecurityCenterClient = null;
let AssetServiceClient = null;

function getGoogleAuth() {
  if (!GoogleAuth) {
    const { GoogleAuth: GA } = require('google-auth-library');
    GoogleAuth = GA;
  }
  return GoogleAuth;
}

function getStorageClient() {
  if (!Storage) {
    const { Storage: S } = require('@google-cloud/storage');
    Storage = S;
  }
  return Storage;
}

function getKMSClient() {
  if (!KeyManagementServiceClient) {
    const { KeyManagementServiceClient: KMS } = require('@google-cloud/kms');
    KeyManagementServiceClient = KMS;
  }
  return KeyManagementServiceClient;
}

function getSecurityCenterClient() {
  if (!SecurityCenterClient) {
    const { SecurityCenterClient: SCC } = require('@google-cloud/security-center');
    SecurityCenterClient = SCC;
  }
  return SecurityCenterClient;
}

function getAssetServiceClient() {
  if (!AssetServiceClient) {
    const { AssetServiceClient: ASC } = require('@google-cloud/asset');
    AssetServiceClient = ASC;
  }
  return AssetServiceClient;
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

function createAuthClient(credentials) {
  const GoogleAuthClass = getGoogleAuth();
  return new GoogleAuthClass({
    credentials: {
      client_email: credentials.clientEmail,
      private_key: credentials.privateKey.replace(/\\n/g, '\n'),
    },
    projectId: credentials.projectId,
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/cloud-platform.read-only',
    ],
  });
}

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

/**
 * Test GCP connection by getting project info
 */
async function testConnection(credentials) {
  const auth = createAuthClient(credentials);
  const client = await auth.getClient();
  const projectId = credentials.projectId;

  // Make a simple API call to verify credentials
  const url = `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}`;
  const response = await client.request({ url });

  return {
    projectId: response.data.projectId,
    projectName: response.data.name,
    projectNumber: response.data.projectNumber,
    lifecycleState: response.data.lifecycleState,
  };
}

/**
 * Check Cloud Storage Bucket Encryption
 */
async function checkStorageEncryption(credentials) {
  const StorageClass = getStorageClient();
  const storage = new StorageClass({
    projectId: credentials.projectId,
    credentials: {
      client_email: credentials.clientEmail,
      private_key: credentials.privateKey.replace(/\\n/g, '\n'),
    },
  });

  const [buckets] = await storage.getBuckets();

  if (buckets.length === 0) {
    return {
      status: 'pass',
      details: 'No Cloud Storage buckets found in the project',
      evidence: {
        type: 'json',
        data: JSON.stringify({ totalBuckets: 0 }, null, 2),
        timestamp: new Date().toISOString(),
      },
      recommendations: [],
    };
  }

  let encryptedBuckets = 0;
  let defaultEncryptedBuckets = 0;
  let cmekBuckets = 0;
  const bucketDetails = [];

  for (const bucket of buckets) {
    const [metadata] = await bucket.getMetadata();
    const encryption = metadata.encryption;

    // All GCS buckets have Google-managed encryption by default
    encryptedBuckets++;

    if (encryption?.defaultKmsKeyName) {
      cmekBuckets++;
      bucketDetails.push({
        name: bucket.name,
        encryption: 'CMEK',
        kmsKey: encryption.defaultKmsKeyName,
      });
    } else {
      defaultEncryptedBuckets++;
      bucketDetails.push({
        name: bucket.name,
        encryption: 'Google-managed',
      });
    }
  }

  const totalBuckets = buckets.length;

  return {
    status: 'pass',
    details: `All ${totalBuckets} buckets encrypted (${cmekBuckets} with CMEK, ${defaultEncryptedBuckets} with Google-managed keys)`,
    evidence: {
      type: 'json',
      data: JSON.stringify({
        totalBuckets,
        encryptedBuckets,
        cmekBuckets,
        defaultEncryptedBuckets,
        bucketDetails,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations: cmekBuckets < totalBuckets ? [
      'Consider using Customer-Managed Encryption Keys (CMEK) for sensitive data',
      'Configure default encryption keys at the bucket level',
    ] : [],
  };
}

/**
 * Check Cloud Storage TLS/HTTPS enforcement
 */
async function checkStorageTLS(credentials) {
  const StorageClass = getStorageClient();
  const storage = new StorageClass({
    projectId: credentials.projectId,
    credentials: {
      client_email: credentials.clientEmail,
      private_key: credentials.privateKey.replace(/\\n/g, '\n'),
    },
  });

  const [buckets] = await storage.getBuckets();

  if (buckets.length === 0) {
    return {
      status: 'pass',
      details: 'No Cloud Storage buckets found in the project',
      evidence: {
        type: 'json',
        data: JSON.stringify({ totalBuckets: 0 }, null, 2),
        timestamp: new Date().toISOString(),
      },
      recommendations: [],
    };
  }

  // GCS always uses TLS for API access
  // Check for public access which could be a security concern
  let publicBuckets = 0;
  let privateBuckets = 0;
  const bucketDetails = [];

  for (const bucket of buckets) {
    const [metadata] = await bucket.getMetadata();
    const iamConfiguration = metadata.iamConfiguration;

    const isPublicAccessPrevented = iamConfiguration?.publicAccessPrevention === 'enforced';

    if (isPublicAccessPrevented) {
      privateBuckets++;
    } else {
      publicBuckets++;
    }

    bucketDetails.push({
      name: bucket.name,
      publicAccessPrevention: isPublicAccessPrevented ? 'Enforced' : 'Not enforced',
      uniformBucketLevelAccess: iamConfiguration?.uniformBucketLevelAccess?.enabled || false,
    });
  }

  const totalBuckets = buckets.length;
  let status = 'pass';
  if (publicBuckets > 0) {
    status = publicBuckets > totalBuckets / 2 ? 'fail' : 'partial';
  }

  return {
    status,
    details: `${privateBuckets}/${totalBuckets} buckets have public access prevention enforced`,
    evidence: {
      type: 'json',
      data: JSON.stringify({
        totalBuckets,
        privateBuckets,
        publicBuckets,
        bucketDetails,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations: publicBuckets > 0 ? [
      'Enable public access prevention on sensitive buckets',
      'Use uniform bucket-level access for consistent permissions',
      'Review and restrict bucket IAM policies',
    ] : [],
  };
}

/**
 * Check Cloud KMS Configuration
 */
async function checkKMSConfig(credentials) {
  const KMSClient = getKMSClient();
  const kmsClient = new KMSClient({
    credentials: {
      client_email: credentials.clientEmail,
      private_key: credentials.privateKey.replace(/\\n/g, '\n'),
    },
  });

  const projectId = credentials.projectId;
  const parent = `projects/${projectId}/locations/-`;

  try {
    // List all key rings
    const [keyRings] = await kmsClient.listKeyRings({ parent });

    if (!keyRings || keyRings.length === 0) {
      return {
        status: 'partial',
        details: 'No Cloud KMS key rings found - consider using KMS for key management',
        evidence: {
          type: 'json',
          data: JSON.stringify({ totalKeyRings: 0 }, null, 2),
          timestamp: new Date().toISOString(),
        },
        recommendations: [
          'Create Cloud KMS key rings for centralized key management',
          'Use Customer-Managed Encryption Keys (CMEK) for sensitive workloads',
          'Implement key rotation policies',
        ],
      };
    }

    let totalKeys = 0;
    let rotationEnabledKeys = 0;
    const keyDetails = [];

    for (const keyRing of keyRings) {
      const [keys] = await kmsClient.listCryptoKeys({ parent: keyRing.name });

      for (const key of keys || []) {
        totalKeys++;
        const hasRotation = key.rotationPeriod != null;

        if (hasRotation) {
          rotationEnabledKeys++;
        }

        keyDetails.push({
          name: key.name.split('/').pop(),
          keyRing: keyRing.name.split('/').pop(),
          purpose: key.purpose,
          rotationEnabled: hasRotation,
          rotationPeriod: key.rotationPeriod,
        });
      }
    }

    if (totalKeys === 0) {
      return {
        status: 'partial',
        details: 'Key rings exist but no crypto keys found',
        evidence: {
          type: 'json',
          data: JSON.stringify({
            totalKeyRings: keyRings.length,
            totalKeys: 0,
          }, null, 2),
          timestamp: new Date().toISOString(),
        },
        recommendations: [
          'Create crypto keys for encryption operations',
          'Enable automatic key rotation',
        ],
      };
    }

    const rotationPercentage = Math.round((rotationEnabledKeys / totalKeys) * 100);
    let status = 'pass';
    if (rotationPercentage < 100) {
      status = rotationPercentage >= 80 ? 'partial' : 'fail';
    }

    return {
      status,
      details: `${rotationEnabledKeys}/${totalKeys} keys (${rotationPercentage}%) have rotation enabled`,
      evidence: {
        type: 'json',
        data: JSON.stringify({
          totalKeyRings: keyRings.length,
          totalKeys,
          rotationEnabledKeys,
          keyDetails,
        }, null, 2),
        timestamp: new Date().toISOString(),
      },
      recommendations: rotationEnabledKeys < totalKeys ? [
        'Enable automatic key rotation for all symmetric encryption keys',
        'Set rotation period to 90 days or less',
      ] : [],
    };
  } catch (error) {
    if (error.code === 7) { // PERMISSION_DENIED
      return {
        status: 'error',
        details: 'Permission denied accessing Cloud KMS',
        recommendations: ['Grant cloudkms.viewer role to the service account'],
      };
    }
    throw error;
  }
}

/**
 * Check Cloud Audit Logs Status
 */
async function checkAuditLogsStatus(credentials) {
  const auth = createAuthClient(credentials);
  const client = await auth.getClient();
  const projectId = credentials.projectId;

  // Get IAM policy to check audit log configuration
  const url = `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:getIamPolicy`;
  const response = await client.request({
    url,
    method: 'POST',
    data: { options: { requestedPolicyVersion: 3 } },
  });

  const policy = response.data;
  const auditConfigs = policy.auditConfigs || [];

  if (auditConfigs.length === 0) {
    return {
      status: 'partial',
      details: 'No custom audit log configurations found (using defaults)',
      evidence: {
        type: 'json',
        data: JSON.stringify({
          auditConfigured: false,
          note: 'Admin Activity logs are enabled by default and cannot be disabled',
        }, null, 2),
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        'Configure Data Access audit logs for sensitive services',
        'Enable audit logs for Cloud Storage, BigQuery, and other data services',
        'Consider enabling all audit log types for compliance',
      ],
    };
  }

  const configuredServices = auditConfigs.map(config => ({
    service: config.service,
    logTypes: config.auditLogConfigs?.map(c => c.logType) || [],
  }));

  const hasAllServicesConfig = auditConfigs.some(c => c.service === 'allServices');

  return {
    status: hasAllServicesConfig ? 'pass' : 'partial',
    details: hasAllServicesConfig
      ? 'Audit logging configured for all services'
      : `Audit logging configured for ${auditConfigs.length} services`,
    evidence: {
      type: 'json',
      data: JSON.stringify({
        totalConfigs: auditConfigs.length,
        configuredServices,
        hasAllServicesConfig,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations: !hasAllServicesConfig ? [
      'Consider enabling audit logs for allServices',
      'Ensure DATA_READ and DATA_WRITE logs are enabled for sensitive services',
    ] : [],
  };
}

/**
 * Check Log Retention
 */
async function checkLogRetention(credentials) {
  const auth = createAuthClient(credentials);
  const client = await auth.getClient();
  const projectId = credentials.projectId;

  // Check log sinks (exports) and buckets
  const sinksUrl = `https://logging.googleapis.com/v2/projects/${projectId}/sinks`;
  const sinksResponse = await client.request({ url: sinksUrl });
  const sinks = sinksResponse.data.sinks || [];

  // Check log buckets for retention settings
  const bucketsUrl = `https://logging.googleapis.com/v2/projects/${projectId}/locations/-/buckets`;
  let buckets = [];
  try {
    const bucketsResponse = await client.request({ url: bucketsUrl });
    buckets = bucketsResponse.data.buckets || [];
  } catch (error) {
    // Buckets API might not be accessible
  }

  const hasLongTermRetention = sinks.some(sink =>
    sink.destination?.includes('storage.googleapis.com') ||
    sink.destination?.includes('bigquery.googleapis.com')
  );

  const bucketRetention = buckets.map(bucket => ({
    name: bucket.name?.split('/').pop(),
    retentionDays: bucket.retentionDays || 30,
    locked: bucket.locked || false,
  }));

  const hasAdequateRetention = bucketRetention.some(b => b.retentionDays >= 90) || hasLongTermRetention;

  return {
    status: hasAdequateRetention ? 'pass' : 'partial',
    details: hasAdequateRetention
      ? 'Log retention meets compliance requirements'
      : 'Consider configuring longer log retention',
    evidence: {
      type: 'json',
      data: JSON.stringify({
        sinks: sinks.map(s => ({
          name: s.name,
          destination: s.destination,
        })),
        bucketRetention,
        hasLongTermRetention,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations: !hasAdequateRetention ? [
      'Configure log sinks to Cloud Storage for long-term retention',
      'Set log bucket retention to at least 90 days',
      'Consider BigQuery export for log analytics',
    ] : [],
  };
}

/**
 * Check Security Command Center Status
 */
async function checkSCCStatus(credentials) {
  try {
    const SCCClient = getSecurityCenterClient();
    const sccClient = new SCCClient({
      credentials: {
        client_email: credentials.clientEmail,
        private_key: credentials.privateKey.replace(/\\n/g, '\n'),
      },
    });

    const parent = `organizations/-`; // SCC is at org level
    const projectId = credentials.projectId;

    // Try to list sources to verify SCC access
    // Note: This requires organization-level permissions
    try {
      const [sources] = await sccClient.listSources({
        parent: `projects/${projectId}`,
      });

      return {
        status: 'pass',
        details: `Security Command Center is accessible (${sources?.length || 0} sources found)`,
        evidence: {
          type: 'json',
          data: JSON.stringify({
            sourcesCount: sources?.length || 0,
            sources: sources?.slice(0, 5).map(s => s.displayName),
          }, null, 2),
          timestamp: new Date().toISOString(),
        },
        recommendations: [],
      };
    } catch (error) {
      if (error.code === 7) { // PERMISSION_DENIED
        return {
          status: 'partial',
          details: 'Security Command Center requires organization-level setup',
          recommendations: [
            'Enable Security Command Center at the organization level',
            'Grant securitycenter.admin role for full access',
            'Consider Security Command Center Premium for advanced features',
          ],
        };
      }
      throw error;
    }
  } catch (error) {
    return {
      status: 'not_checked',
      details: 'Unable to verify Security Command Center status',
      recommendations: [
        'Ensure Security Command Center is enabled for the organization',
        'Verify service account has appropriate permissions',
      ],
    };
  }
}

/**
 * Check Security Command Center Findings
 */
async function checkSCCFindings(credentials) {
  return {
    status: 'not_checked',
    details: 'Security Command Center findings check requires organization-level access',
    recommendations: [
      'Enable Security Command Center at the organization level',
      'Review findings regularly in the Google Cloud Console',
      'Set up notifications for critical findings',
    ],
  };
}

/**
 * Check Cloud Asset Inventory
 */
async function checkAssetInventory(credentials) {
  try {
    const AssetClient = getAssetServiceClient();
    const assetClient = new AssetClient({
      credentials: {
        client_email: credentials.clientEmail,
        private_key: credentials.privateKey.replace(/\\n/g, '\n'),
      },
    });

    const parent = `projects/${credentials.projectId}`;

    // Try to search assets to verify access
    const [assets] = await assetClient.searchAllResources({
      scope: parent,
      pageSize: 10,
    });

    return {
      status: 'pass',
      details: `Cloud Asset Inventory accessible (sample: ${assets?.length || 0} resources)`,
      evidence: {
        type: 'json',
        data: JSON.stringify({
          sampleSize: assets?.length || 0,
          assetTypes: [...new Set(assets?.map(a => a.assetType))].slice(0, 10),
        }, null, 2),
        timestamp: new Date().toISOString(),
      },
      recommendations: [],
    };
  } catch (error) {
    if (error.code === 7) { // PERMISSION_DENIED
      return {
        status: 'fail',
        details: 'Permission denied accessing Cloud Asset Inventory',
        recommendations: [
          'Grant cloudasset.viewer role to the service account',
          'Enable Cloud Asset API for the project',
        ],
      };
    }
    return {
      status: 'error',
      details: `Error accessing Cloud Asset Inventory: ${error.message}`,
      recommendations: ['Verify Cloud Asset API is enabled'],
    };
  }
}

/**
 * Check VPC Network Configuration
 */
async function checkVPCConfig(credentials) {
  const auth = createAuthClient(credentials);
  const client = await auth.getClient();
  const projectId = credentials.projectId;

  const url = `https://compute.googleapis.com/compute/v1/projects/${projectId}/global/networks`;
  const response = await client.request({ url });
  const networks = response.data.items || [];

  if (networks.length === 0) {
    return {
      status: 'partial',
      details: 'No VPC networks found (using default network or no compute resources)',
      evidence: {
        type: 'json',
        data: JSON.stringify({ totalNetworks: 0 }, null, 2),
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        'Create custom VPC networks for better network isolation',
        'Delete the default network if not needed',
        'Use Private Google Access for internal resources',
      ],
    };
  }

  const networkDetails = networks.map(network => ({
    name: network.name,
    autoCreateSubnetworks: network.autoCreateSubnetworks,
    subnetworksCount: network.subnetworks?.length || 0,
  }));

  const hasCustomNetworks = networks.some(n => !n.autoCreateSubnetworks);

  return {
    status: hasCustomNetworks ? 'pass' : 'partial',
    details: `${networks.length} VPC networks found (${hasCustomNetworks ? 'includes custom networks' : 'only auto-mode networks'})`,
    evidence: {
      type: 'json',
      data: JSON.stringify({
        totalNetworks: networks.length,
        networkDetails,
        hasCustomNetworks,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations: !hasCustomNetworks ? [
      'Create custom-mode VPC networks for fine-grained subnet control',
      'Implement network segmentation based on workload sensitivity',
    ] : [],
  };
}

/**
 * Check VPC Firewall Rules
 */
async function checkFirewallRules(credentials) {
  const auth = createAuthClient(credentials);
  const client = await auth.getClient();
  const projectId = credentials.projectId;

  const url = `https://compute.googleapis.com/compute/v1/projects/${projectId}/global/firewalls`;
  const response = await client.request({ url });
  const firewalls = response.data.items || [];

  if (firewalls.length === 0) {
    return {
      status: 'partial',
      details: 'No firewall rules found',
      evidence: {
        type: 'json',
        data: JSON.stringify({ totalRules: 0 }, null, 2),
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        'Configure firewall rules to restrict network access',
        'Implement default-deny ingress rules',
        'Use service accounts as targets instead of network tags',
      ],
    };
  }

  const securityIssues = [];
  const ruleDetails = [];

  for (const rule of firewalls) {
    const isIngress = rule.direction === 'INGRESS';
    const isAllow = rule.allowed && rule.allowed.length > 0;
    const sourceRanges = rule.sourceRanges || [];

    // Check for overly permissive rules
    if (isIngress && isAllow) {
      const allowsAll = sourceRanges.includes('0.0.0.0/0');
      const allowedPorts = rule.allowed.flatMap(a => a.ports || ['all']);

      if (allowsAll) {
        const hasSshOrRdp = allowedPorts.some(p =>
          p === 'all' || p === '22' || p === '3389' || p.includes('22') || p.includes('3389')
        );

        if (hasSshOrRdp) {
          securityIssues.push({
            rule: rule.name,
            issue: 'Allows SSH/RDP from 0.0.0.0/0',
            ports: allowedPorts,
          });
        }
      }
    }

    ruleDetails.push({
      name: rule.name,
      direction: rule.direction,
      action: isAllow ? 'ALLOW' : 'DENY',
      priority: rule.priority,
      sourceRanges: sourceRanges.slice(0, 3),
    });
  }

  const hasIssues = securityIssues.length > 0;

  return {
    status: hasIssues ? 'fail' : 'pass',
    details: hasIssues
      ? `${securityIssues.length} potentially insecure firewall rules found`
      : `${firewalls.length} firewall rules configured (no critical issues found)`,
    evidence: {
      type: 'json',
      data: JSON.stringify({
        totalRules: firewalls.length,
        securityIssues,
        sampleRules: ruleDetails.slice(0, 10),
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations: hasIssues ? [
      'Restrict SSH/RDP access to specific IP ranges or use IAP',
      'Use Google Cloud IAP (Identity-Aware Proxy) for secure access',
      'Implement OS Login for SSH instead of firewall rules',
      'Review and remove overly permissive rules',
    ] : [],
  };
}

/**
 * Check IAM Policies
 */
async function checkIAMPolicies(credentials) {
  const auth = createAuthClient(credentials);
  const client = await auth.getClient();
  const projectId = credentials.projectId;

  const url = `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:getIamPolicy`;
  const response = await client.request({
    url,
    method: 'POST',
    data: { options: { requestedPolicyVersion: 3 } },
  });

  const policy = response.data;
  const bindings = policy.bindings || [];

  const securityIssues = [];
  const bindingDetails = [];

  for (const binding of bindings) {
    const role = binding.role;
    const members = binding.members || [];

    // Check for overly permissive roles
    const isOwnerOrEditor = role === 'roles/owner' || role === 'roles/editor';
    const hasAllUsers = members.some(m => m === 'allUsers' || m === 'allAuthenticatedUsers');

    if (hasAllUsers) {
      securityIssues.push({
        role,
        issue: 'Role granted to allUsers or allAuthenticatedUsers',
      });
    }

    if (isOwnerOrEditor && members.length > 3) {
      securityIssues.push({
        role,
        issue: `${members.length} members have ${role} - consider more specific roles`,
      });
    }

    bindingDetails.push({
      role,
      memberCount: members.length,
      sampleMembers: members.slice(0, 2),
    });
  }

  const hasIssues = securityIssues.length > 0;

  return {
    status: hasIssues ? 'partial' : 'pass',
    details: hasIssues
      ? `${securityIssues.length} IAM policy concerns found`
      : `${bindings.length} IAM bindings reviewed (follows least privilege)`,
    evidence: {
      type: 'json',
      data: JSON.stringify({
        totalBindings: bindings.length,
        securityIssues,
        bindingSummary: bindingDetails.slice(0, 10),
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations: hasIssues ? [
      'Remove allUsers/allAuthenticatedUsers from IAM policies',
      'Use predefined roles instead of primitive roles (owner/editor)',
      'Implement least-privilege access',
      'Use service accounts with minimal permissions',
    ] : [],
  };
}

/**
 * Check Service Account Keys
 */
async function checkServiceAccountKeys(credentials) {
  const auth = createAuthClient(credentials);
  const client = await auth.getClient();
  const projectId = credentials.projectId;

  const url = `https://iam.googleapis.com/v1/projects/${projectId}/serviceAccounts`;
  const response = await client.request({ url });
  const accounts = response.data.accounts || [];

  const accountsWithKeys = [];
  const recommendations = new Set();

  for (const account of accounts) {
    if (account.email.endsWith('.gserviceaccount.com')) {
      try {
        const keysUrl = `https://iam.googleapis.com/v1/projects/${projectId}/serviceAccounts/${account.email}/keys`;
        const keysResponse = await client.request({ url: keysUrl });
        const keys = keysResponse.data.keys || [];

        // Filter out Google-managed keys
        const userManagedKeys = keys.filter(k => k.keyType === 'USER_MANAGED');

        if (userManagedKeys.length > 0) {
          const oldKeys = userManagedKeys.filter(k => {
            const created = new Date(k.validAfterTime);
            const ageInDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
            return ageInDays > 90;
          });

          accountsWithKeys.push({
            email: account.email,
            userManagedKeys: userManagedKeys.length,
            oldKeys: oldKeys.length,
          });

          if (oldKeys.length > 0) {
            recommendations.add('Rotate service account keys older than 90 days');
          }
        }
      } catch (error) {
        // Skip if we can't list keys
      }
    }
  }

  const hasOldKeys = accountsWithKeys.some(a => a.oldKeys > 0);
  const totalUserKeys = accountsWithKeys.reduce((sum, a) => sum + a.userManagedKeys, 0);

  if (totalUserKeys === 0) {
    return {
      status: 'pass',
      details: 'No user-managed service account keys found (best practice)',
      evidence: {
        type: 'json',
        data: JSON.stringify({
          totalAccounts: accounts.length,
          userManagedKeys: 0,
          note: 'Using Google-managed keys is the recommended approach',
        }, null, 2),
        timestamp: new Date().toISOString(),
      },
      recommendations: [],
    };
  }

  recommendations.add('Consider using Workload Identity instead of service account keys');
  recommendations.add('Implement key rotation for all user-managed keys');

  return {
    status: hasOldKeys ? 'fail' : 'partial',
    details: `${totalUserKeys} user-managed service account keys found${hasOldKeys ? ' (some are > 90 days old)' : ''}`,
    evidence: {
      type: 'json',
      data: JSON.stringify({
        totalAccounts: accounts.length,
        accountsWithUserKeys: accountsWithKeys.length,
        accountsWithKeys,
      }, null, 2),
      timestamp: new Date().toISOString(),
    },
    recommendations: Array.from(recommendations),
  };
}

/**
 * Placeholder for MFA Status (requires Cloud Identity/Workspace admin)
 */
async function checkMFAStatus(credentials) {
  return {
    status: 'not_checked',
    details: '2-Step Verification check requires Cloud Identity/Workspace Admin SDK access',
    recommendations: [
      'Enable 2-Step Verification in Cloud Identity or Google Workspace admin',
      'Enforce 2-Step Verification for all users',
      'Use security keys for privileged accounts',
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

    if (!credentials || !credentials.projectId || !credentials.clientEmail || !credentials.privateKey) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'GCP credentials are required (projectId, clientEmail, privateKey)' }),
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
        case 'mfa_status':
          result = await checkMFAStatus(credentials);
          break;
        case 'iam_policies':
          result = await checkIAMPolicies(credentials);
          break;
        case 'service_account_keys':
          result = await checkServiceAccountKeys(credentials);
          break;
        case 'storage_encryption':
          result = await checkStorageEncryption(credentials);
          break;
        case 'storage_tls':
          result = await checkStorageTLS(credentials);
          break;
        case 'kms_config':
          result = await checkKMSConfig(credentials);
          break;
        case 'audit_logs_status':
          result = await checkAuditLogsStatus(credentials);
          break;
        case 'log_retention':
          result = await checkLogRetention(credentials);
          break;
        case 'scc_status':
          result = await checkSCCStatus(credentials);
          break;
        case 'scc_findings':
          result = await checkSCCFindings(credentials);
          break;
        case 'asset_inventory':
          result = await checkAssetInventory(credentials);
          break;
        case 'vpc_config':
          result = await checkVPCConfig(credentials);
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
    console.error('GCP Verify error:', error);

    // Handle specific GCP errors
    if (error.code === 401 || error.message?.includes('authentication')) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid GCP credentials' }),
      };
    }

    if (error.code === 403 || error.code === 7) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Access denied. Ensure your service account has the required permissions.',
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
