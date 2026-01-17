/**
 * Cloud Verification Service
 *
 * Unified frontend service for triggering cloud compliance verifications
 * across AWS, Azure, and GCP via Netlify functions.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type CloudProvider = 'aws' | 'azure' | 'gcp';

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region?: string;
}

export interface AzureCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
}

export interface GCPCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export type CloudCredentials = AWSCredentials | AzureCredentials | GCPCredentials;

export interface VerificationResult {
  controlId: string;
  checkType: string;
  status: 'pass' | 'partial' | 'fail' | 'error' | 'not_checked';
  details: string;
  evidence?: {
    type: 'json' | 'screenshot' | 'log';
    data: string;
    timestamp: string;
  };
  recommendations: string[];
}

export interface ConnectionTestResult {
  success: boolean;
  provider: CloudProvider;
  details: Record<string, unknown>;
  error?: string;
}

export interface VerificationSummary {
  provider: CloudProvider;
  verifiedAt: string;
  totalControls: number;
  passed: number;
  partial: number;
  failed: number;
  notChecked: number;
  results: VerificationResult[];
}

export interface SavedVerification {
  id: string;
  organizationId: string;
  provider: CloudProvider;
  verifiedAt: string;
  connectionName: string;
  summary: VerificationSummary;
}

// Control mappings for each provider
export const AWS_CONTROLS: Record<string, { controlId: string; title: string; checkType: string }> = {
  'AC-001': { controlId: 'AC-001', title: 'Multi-Factor Authentication', checkType: 'mfa_status' },
  'AC-003': { controlId: 'AC-003', title: 'Password Policy', checkType: 'password_policy' },
  'DP-001': { controlId: 'DP-001', title: 'Data Encryption at Rest', checkType: 's3_encryption' },
  'DP-002': { controlId: 'DP-002', title: 'Key Management', checkType: 'kms_rotation' },
  'SO-001': { controlId: 'SO-001', title: 'Audit Logging', checkType: 'cloudtrail_status' },
  'SO-003': { controlId: 'SO-003', title: 'Security Monitoring', checkType: 'security_hub_status' },
  'AM-001': { controlId: 'AM-001', title: 'Asset Inventory', checkType: 'config_recorder' },
};

export const AZURE_CONTROLS: Record<string, { controlId: string; title: string; checkType: string }> = {
  'AC-001': { controlId: 'AC-001', title: 'Multi-Factor Authentication', checkType: 'aad_mfa_status' },
  'AC-003': { controlId: 'AC-003', title: 'Password Policy', checkType: 'aad_password_policy' },
  'AC-005': { controlId: 'AC-005', title: 'Conditional Access', checkType: 'conditional_access' },
  'DP-001': { controlId: 'DP-001', title: 'Data Encryption at Rest', checkType: 'storage_encryption' },
  'DP-002': { controlId: 'DP-002', title: 'Data Encryption in Transit', checkType: 'storage_https_only' },
  'DP-003': { controlId: 'DP-003', title: 'Key Management', checkType: 'keyvault_config' },
  'SO-001': { controlId: 'SO-001', title: 'Audit Logging', checkType: 'activity_log_status' },
  'SO-002': { controlId: 'SO-002', title: 'Log Retention', checkType: 'log_retention' },
  'SO-003': { controlId: 'SO-003', title: 'Security Monitoring', checkType: 'defender_status' },
  'SO-004': { controlId: 'SO-004', title: 'Threat Protection', checkType: 'atp_status' },
  'AM-001': { controlId: 'AM-001', title: 'Asset Inventory', checkType: 'resource_inventory' },
  'NS-001': { controlId: 'NS-001', title: 'Network Segmentation', checkType: 'nsg_config' },
  'NS-002': { controlId: 'NS-002', title: 'Firewall Rules', checkType: 'firewall_rules' },
};

export const GCP_CONTROLS: Record<string, { controlId: string; title: string; checkType: string }> = {
  'AC-001': { controlId: 'AC-001', title: 'Multi-Factor Authentication', checkType: 'mfa_status' },
  'AC-002': { controlId: 'AC-002', title: 'IAM Policies', checkType: 'iam_policies' },
  'AC-006': { controlId: 'AC-006', title: 'Service Account Keys', checkType: 'service_account_keys' },
  'DP-001': { controlId: 'DP-001', title: 'Data Encryption at Rest', checkType: 'storage_encryption' },
  'DP-002': { controlId: 'DP-002', title: 'Data Encryption in Transit', checkType: 'storage_tls' },
  'DP-003': { controlId: 'DP-003', title: 'Key Management', checkType: 'kms_config' },
  'SO-001': { controlId: 'SO-001', title: 'Audit Logging', checkType: 'audit_logs_status' },
  'SO-002': { controlId: 'SO-002', title: 'Log Retention', checkType: 'log_retention' },
  'SO-003': { controlId: 'SO-003', title: 'Security Command Center', checkType: 'scc_status' },
  'SO-005': { controlId: 'SO-005', title: 'Security Findings', checkType: 'scc_findings' },
  'AM-001': { controlId: 'AM-001', title: 'Asset Inventory', checkType: 'asset_inventory' },
  'NS-001': { controlId: 'NS-001', title: 'VPC Configuration', checkType: 'vpc_config' },
  'NS-002': { controlId: 'NS-002', title: 'Firewall Rules', checkType: 'firewall_rules' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getNetlifyFunctionUrl(provider: CloudProvider): string {
  return `/.netlify/functions/${provider}-verify`;
}

function getControlsForProvider(provider: CloudProvider): Record<string, { controlId: string; title: string; checkType: string }> {
  switch (provider) {
    case 'aws':
      return AWS_CONTROLS;
    case 'azure':
      return AZURE_CONTROLS;
    case 'gcp':
      return GCP_CONTROLS;
    default:
      return {};
  }
}

// ============================================================================
// CLOUD VERIFICATION SERVICE
// ============================================================================

class CloudVerificationService {
  /**
   * Test connection to a cloud provider
   */
  async testConnection(
    provider: CloudProvider,
    credentials: CloudCredentials
  ): Promise<ConnectionTestResult> {
    try {
      const response = await fetch(getNetlifyFunctionUrl(provider), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          credentials,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          provider,
          details: {},
          error: data.error || `Connection failed with status ${response.status}`,
        };
      }

      return {
        success: true,
        provider,
        details: data,
      };
    } catch (error) {
      return {
        success: false,
        provider,
        details: {},
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Verify a specific control
   */
  async verifyControl(
    provider: CloudProvider,
    credentials: CloudCredentials,
    controlId: string
  ): Promise<VerificationResult> {
    const controls = getControlsForProvider(provider);
    const control = controls[controlId];

    if (!control) {
      return {
        controlId,
        checkType: 'unknown',
        status: 'error',
        details: `Control ${controlId} not supported for ${provider}`,
        recommendations: [],
      };
    }

    try {
      const response = await fetch(getNetlifyFunctionUrl(provider), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_control',
          credentials,
          controlId,
          checkType: control.checkType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          controlId,
          checkType: control.checkType,
          status: 'error',
          details: data.error || `Verification failed with status ${response.status}`,
          recommendations: [],
        };
      }

      return {
        controlId,
        checkType: control.checkType,
        status: data.status || 'error',
        details: data.details || '',
        evidence: data.evidence,
        recommendations: data.recommendations || [],
      };
    } catch (error) {
      return {
        controlId,
        checkType: control.checkType,
        status: 'error',
        details: error instanceof Error ? error.message : 'Verification failed',
        recommendations: [],
      };
    }
  }

  /**
   * Verify all controls for a provider
   */
  async verifyAllControls(
    provider: CloudProvider,
    credentials: CloudCredentials,
    controlIds?: string[]
  ): Promise<VerificationSummary> {
    const controls = getControlsForProvider(provider);
    const controlsToVerify = controlIds
      ? controlIds.filter(id => controls[id])
      : Object.keys(controls);

    const results: VerificationResult[] = [];

    for (const controlId of controlsToVerify) {
      const result = await this.verifyControl(provider, credentials, controlId);
      results.push(result);
    }

    const summary: VerificationSummary = {
      provider,
      verifiedAt: new Date().toISOString(),
      totalControls: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      partial: results.filter(r => r.status === 'partial').length,
      failed: results.filter(r => r.status === 'fail').length,
      notChecked: results.filter(r => r.status === 'not_checked' || r.status === 'error').length,
      results,
    };

    return summary;
  }

  /**
   * Save verification results to database
   */
  async saveVerification(
    organizationId: string,
    connectionName: string,
    summary: VerificationSummary
  ): Promise<string | null> {
    if (!isSupabaseConfigured() || !supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('cloud_verifications')
        .insert({
          organization_id: organizationId,
          provider: summary.provider,
          connection_name: connectionName,
          verified_at: summary.verifiedAt,
          total_controls: summary.totalControls,
          passed: summary.passed,
          partial: summary.partial,
          failed: summary.failed,
          not_checked: summary.notChecked,
          results: summary.results,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to save verification:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Failed to save verification:', error);
      return null;
    }
  }

  /**
   * Get recent verifications for an organization
   */
  async getRecentVerifications(
    organizationId: string,
    provider?: CloudProvider,
    limit = 10
  ): Promise<SavedVerification[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [];
    }

    try {
      let query = supabase
        .from('cloud_verifications')
        .select('*')
        .eq('organization_id', organizationId)
        .order('verified_at', { ascending: false })
        .limit(limit);

      if (provider) {
        query = query.eq('provider', provider);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch verifications:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        organizationId: row.organization_id,
        provider: row.provider as CloudProvider,
        verifiedAt: row.verified_at,
        connectionName: row.connection_name,
        summary: {
          provider: row.provider as CloudProvider,
          verifiedAt: row.verified_at,
          totalControls: row.total_controls,
          passed: row.passed,
          partial: row.partial,
          failed: row.failed,
          notChecked: row.not_checked,
          results: row.results || [],
        },
      }));
    } catch (error) {
      console.error('Failed to fetch verifications:', error);
      return [];
    }
  }

  /**
   * Get verification statistics for dashboard
   */
  async getVerificationStats(organizationId: string): Promise<{
    totalVerifications: number;
    byProvider: Record<CloudProvider, number>;
    lastVerificationDate: string | null;
    overallPassRate: number;
  }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        totalVerifications: 0,
        byProvider: { aws: 0, azure: 0, gcp: 0 },
        lastVerificationDate: null,
        overallPassRate: 0,
      };
    }

    try {
      const { data, error } = await supabase
        .from('cloud_verifications')
        .select('provider, verified_at, passed, total_controls')
        .eq('organization_id', organizationId)
        .order('verified_at', { ascending: false });

      if (error) {
        console.error('Failed to get verification stats:', error);
        return {
          totalVerifications: 0,
          byProvider: { aws: 0, azure: 0, gcp: 0 },
          lastVerificationDate: null,
          overallPassRate: 0,
        };
      }

      const verifications = data || [];
      const byProvider: Record<CloudProvider, number> = { aws: 0, azure: 0, gcp: 0 };
      let totalPassed = 0;
      let totalControls = 0;

      verifications.forEach(v => {
        byProvider[v.provider as CloudProvider]++;
        totalPassed += v.passed || 0;
        totalControls += v.total_controls || 0;
      });

      return {
        totalVerifications: verifications.length,
        byProvider,
        lastVerificationDate: verifications.length > 0 ? verifications[0].verified_at : null,
        overallPassRate: totalControls > 0 ? Math.round((totalPassed / totalControls) * 100) : 0,
      };
    } catch (error) {
      console.error('Failed to get verification stats:', error);
      return {
        totalVerifications: 0,
        byProvider: { aws: 0, azure: 0, gcp: 0 },
        lastVerificationDate: null,
        overallPassRate: 0,
      };
    }
  }

  /**
   * Get list of verifiable controls for a provider
   */
  getVerifiableControls(provider: CloudProvider): { controlId: string; title: string; checkType: string }[] {
    const controls = getControlsForProvider(provider);
    return Object.values(controls);
  }

  /**
   * Get all verifiable controls across all providers
   */
  getAllVerifiableControls(): Record<CloudProvider, { controlId: string; title: string; checkType: string }[]> {
    return {
      aws: this.getVerifiableControls('aws'),
      azure: this.getVerifiableControls('azure'),
      gcp: this.getVerifiableControls('gcp'),
    };
  }
}

// Export singleton instance
export const cloudVerificationService = new CloudVerificationService();

export default cloudVerificationService;
