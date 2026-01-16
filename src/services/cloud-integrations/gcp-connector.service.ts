/**
 * GCP Cloud Connector Service
 *
 * Provides automated verification of Google Cloud Platform security controls.
 * Uses GCP APIs to check configurations and generate compliance evidence.
 *
 * MVP Scope:
 * - IAM policies and bindings
 * - Cloud Storage bucket encryption
 * - Cloud KMS key configuration
 * - Cloud Audit Logs status
 * - Security Command Center status
 * - VPC firewall rules
 */

import type { VerificationStatus, ControlVerification } from './aws-connector.service';

// ============================================================================
// TYPES
// ============================================================================

export interface GCPCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export interface GCPConnectionStatus {
  connected: boolean;
  projectId?: string;
  projectName?: string;
  error?: string;
  lastChecked: string;
}

export interface GCPVerificationResult {
  success: boolean;
  verifications: ControlVerification[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    partial: number;
    errors: number;
  };
  checkedAt: string;
}

// ============================================================================
// CONTROL MAPPINGS
// ============================================================================

/**
 * Maps compliance control IDs to GCP verification functions
 */
export const GCP_CONTROL_CHECKS: Record<string, {
  title: string;
  description: string;
  service: string;
  checkType: string;
}> = {
  'AC-001': {
    title: 'Multi-Factor Authentication',
    description: 'Verify 2-Step Verification is enforced via Cloud Identity',
    service: 'Cloud Identity',
    checkType: 'mfa_status',
  },
  'AC-002': {
    title: 'IAM Policies',
    description: 'Verify IAM policies follow least-privilege principle',
    service: 'IAM',
    checkType: 'iam_policies',
  },
  'AC-006': {
    title: 'Service Account Keys',
    description: 'Verify service account key rotation and management',
    service: 'IAM',
    checkType: 'service_account_keys',
  },
  'DP-001': {
    title: 'Data Encryption at Rest',
    description: 'Verify Cloud Storage buckets use encryption',
    service: 'Cloud Storage',
    checkType: 'storage_encryption',
  },
  'DP-002': {
    title: 'Key Management',
    description: 'Verify Cloud KMS keys are properly configured',
    service: 'Cloud KMS',
    checkType: 'kms_config',
  },
  'DP-003': {
    title: 'Data Encryption in Transit',
    description: 'Verify TLS enforcement on load balancers and storage',
    service: 'Cloud Storage',
    checkType: 'storage_tls',
  },
  'SO-001': {
    title: 'Audit Logging',
    description: 'Verify Cloud Audit Logs are enabled',
    service: 'Cloud Logging',
    checkType: 'audit_logs_status',
  },
  'SO-002': {
    title: 'Log Retention',
    description: 'Verify log retention meets compliance requirements',
    service: 'Cloud Logging',
    checkType: 'log_retention',
  },
  'SO-003': {
    title: 'Security Monitoring',
    description: 'Verify Security Command Center is enabled',
    service: 'Security Command Center',
    checkType: 'scc_status',
  },
  'SO-005': {
    title: 'Security Findings',
    description: 'Review Security Command Center findings',
    service: 'Security Command Center',
    checkType: 'scc_findings',
  },
  'AM-001': {
    title: 'Asset Inventory',
    description: 'Verify Cloud Asset Inventory is accessible',
    service: 'Cloud Asset Inventory',
    checkType: 'asset_inventory',
  },
  'NS-001': {
    title: 'Network Segmentation',
    description: 'Verify VPC network configuration',
    service: 'VPC',
    checkType: 'vpc_config',
  },
  'NS-002': {
    title: 'Firewall Rules',
    description: 'Verify VPC firewall rules restrict access appropriately',
    service: 'VPC',
    checkType: 'firewall_rules',
  },
};

// ============================================================================
// GCP CONNECTOR CLASS
// ============================================================================

/**
 * GCP Cloud Connector for automated compliance verification
 *
 * Note: This is a client-side service that makes calls to a serverless function
 * which handles the actual GCP API calls. Credentials are never stored client-side.
 */
export class GCPConnector {
  private connectionStatus: GCPConnectionStatus | null = null;

  /**
   * Test GCP connection with provided credentials
   */
  async testConnection(credentials: GCPCredentials): Promise<GCPConnectionStatus> {
    try {
      const response = await fetch('/.netlify/functions/gcp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          credentials,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Connection failed' }));
        return {
          connected: false,
          error: error.error || 'Failed to connect to GCP',
          lastChecked: new Date().toISOString(),
        };
      }

      const data = await response.json();
      this.connectionStatus = {
        connected: true,
        projectId: credentials.projectId,
        projectName: data.projectName,
        lastChecked: new Date().toISOString(),
      };

      return this.connectionStatus;
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Run verification for specific controls
   */
  async verifyControls(
    credentials: GCPCredentials,
    controlIds: string[]
  ): Promise<GCPVerificationResult> {
    const verifications: ControlVerification[] = [];
    let passed = 0;
    let failed = 0;
    let partial = 0;
    let errors = 0;

    for (const controlId of controlIds) {
      const check = GCP_CONTROL_CHECKS[controlId];
      if (!check) {
        verifications.push({
          controlId,
          controlTitle: 'Unknown Control',
          status: 'not_checked',
          details: 'No GCP verification available for this control',
          checkedAt: new Date().toISOString(),
        });
        continue;
      }

      try {
        const response = await fetch('/.netlify/functions/gcp-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verify_control',
            credentials,
            controlId,
            checkType: check.checkType,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Verification failed' }));
          verifications.push({
            controlId,
            controlTitle: check.title,
            status: 'error',
            details: error.error || 'Failed to verify control',
            checkedAt: new Date().toISOString(),
          });
          errors++;
          continue;
        }

        const result = await response.json();
        const verification: ControlVerification = {
          controlId,
          controlTitle: check.title,
          status: result.status,
          details: result.details,
          evidence: result.evidence,
          recommendations: result.recommendations,
          checkedAt: new Date().toISOString(),
        };

        verifications.push(verification);

        if (result.status === 'pass') passed++;
        else if (result.status === 'fail') failed++;
        else if (result.status === 'partial') partial++;
        else errors++;

      } catch (error) {
        verifications.push({
          controlId,
          controlTitle: check.title,
          status: 'error',
          details: error instanceof Error ? error.message : 'Verification failed',
          checkedAt: new Date().toISOString(),
        });
        errors++;
      }
    }

    return {
      success: errors === 0,
      verifications,
      summary: {
        total: controlIds.length,
        passed,
        failed,
        partial,
        errors,
      },
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Run all available GCP verifications
   */
  async verifyAll(credentials: GCPCredentials): Promise<GCPVerificationResult> {
    const controlIds = Object.keys(GCP_CONTROL_CHECKS);
    return this.verifyControls(credentials, controlIds);
  }

  /**
   * Get list of controls that can be automatically verified
   */
  getVerifiableControls(): { controlId: string; title: string; description: string; service: string }[] {
    return Object.entries(GCP_CONTROL_CHECKS).map(([controlId, check]) => ({
      controlId,
      title: check.title,
      description: check.description,
      service: check.service,
    }));
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): GCPConnectionStatus | null {
    return this.connectionStatus;
  }

  /**
   * Clear connection
   */
  disconnect(): void {
    this.connectionStatus = null;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const gcpConnector = new GCPConnector();

export default gcpConnector;
