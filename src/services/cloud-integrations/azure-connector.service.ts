/**
 * Azure Cloud Connector Service
 *
 * Provides automated verification of Azure security controls.
 * Uses Azure SDK to check configurations and generate compliance evidence.
 *
 * MVP Scope:
 * - Azure AD MFA enforcement
 * - Storage account encryption status
 * - Key Vault configuration
 * - Activity Log / Monitor status
 * - Security Center (Defender for Cloud) status
 * - Network Security Group rules
 */

import type { ControlVerification } from './aws-connector.service';

// ============================================================================
// TYPES
// ============================================================================

export interface AzureCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
}

export interface AzureConnectionStatus {
  connected: boolean;
  tenantId?: string;
  subscriptionId?: string;
  subscriptionName?: string;
  error?: string;
  lastChecked: string;
}

export interface AzureVerificationResult {
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
 * Maps compliance control IDs to Azure verification functions
 */
export const AZURE_CONTROL_CHECKS: Record<string, {
  title: string;
  description: string;
  service: string;
  checkType: string;
}> = {
  'AC-001': {
    title: 'Multi-Factor Authentication',
    description: 'Verify MFA is enforced in Azure AD',
    service: 'Azure AD',
    checkType: 'aad_mfa_status',
  },
  'AC-003': {
    title: 'Password Policy',
    description: 'Verify Azure AD password policy meets requirements',
    service: 'Azure AD',
    checkType: 'aad_password_policy',
  },
  'AC-005': {
    title: 'Conditional Access Policies',
    description: 'Verify Conditional Access policies are configured',
    service: 'Azure AD',
    checkType: 'conditional_access',
  },
  'DP-001': {
    title: 'Data Encryption at Rest',
    description: 'Verify Storage Accounts have encryption enabled',
    service: 'Storage',
    checkType: 'storage_encryption',
  },
  'DP-002': {
    title: 'Key Management',
    description: 'Verify Key Vault is configured with proper access policies',
    service: 'Key Vault',
    checkType: 'keyvault_config',
  },
  'DP-003': {
    title: 'Data Encryption in Transit',
    description: 'Verify HTTPS-only access is enforced on Storage Accounts',
    service: 'Storage',
    checkType: 'storage_https_only',
  },
  'SO-001': {
    title: 'Audit Logging',
    description: 'Verify Azure Monitor and Activity Logs are enabled',
    service: 'Monitor',
    checkType: 'activity_log_status',
  },
  'SO-002': {
    title: 'Log Retention',
    description: 'Verify log retention meets compliance requirements',
    service: 'Monitor',
    checkType: 'log_retention',
  },
  'SO-003': {
    title: 'Security Monitoring',
    description: 'Verify Microsoft Defender for Cloud is enabled',
    service: 'Security Center',
    checkType: 'defender_status',
  },
  'SO-004': {
    title: 'Threat Detection',
    description: 'Verify Advanced Threat Protection is enabled',
    service: 'Security Center',
    checkType: 'atp_status',
  },
  'AM-001': {
    title: 'Asset Inventory',
    description: 'Verify Azure Resource Graph is accessible for asset inventory',
    service: 'Resource Graph',
    checkType: 'resource_inventory',
  },
  'NS-001': {
    title: 'Network Segmentation',
    description: 'Verify Network Security Groups are configured',
    service: 'Network',
    checkType: 'nsg_config',
  },
  'NS-002': {
    title: 'Firewall Rules',
    description: 'Verify Azure Firewall or NSG rules restrict access',
    service: 'Network',
    checkType: 'firewall_rules',
  },
};

// ============================================================================
// AZURE CONNECTOR CLASS
// ============================================================================

/**
 * Azure Cloud Connector for automated compliance verification
 *
 * Note: This is a client-side service that makes calls to a serverless function
 * which handles the actual Azure API calls. Credentials are never stored client-side.
 */
export class AzureConnector {
  private connectionStatus: AzureConnectionStatus | null = null;

  /**
   * Test Azure connection with provided credentials
   */
  async testConnection(credentials: AzureCredentials): Promise<AzureConnectionStatus> {
    try {
      const response = await fetch('/.netlify/functions/azure-verify', {
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
          error: error.error || 'Failed to connect to Azure',
          lastChecked: new Date().toISOString(),
        };
      }

      const data = await response.json();
      this.connectionStatus = {
        connected: true,
        tenantId: credentials.tenantId,
        subscriptionId: credentials.subscriptionId,
        subscriptionName: data.subscriptionName,
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
    credentials: AzureCredentials,
    controlIds: string[]
  ): Promise<AzureVerificationResult> {
    const verifications: ControlVerification[] = [];
    let passed = 0;
    let failed = 0;
    let partial = 0;
    let errors = 0;

    for (const controlId of controlIds) {
      const check = AZURE_CONTROL_CHECKS[controlId];
      if (!check) {
        verifications.push({
          controlId,
          controlTitle: 'Unknown Control',
          status: 'not_checked',
          details: 'No Azure verification available for this control',
          checkedAt: new Date().toISOString(),
        });
        continue;
      }

      try {
        const response = await fetch('/.netlify/functions/azure-verify', {
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
   * Run all available Azure verifications
   */
  async verifyAll(credentials: AzureCredentials): Promise<AzureVerificationResult> {
    const controlIds = Object.keys(AZURE_CONTROL_CHECKS);
    return this.verifyControls(credentials, controlIds);
  }

  /**
   * Get list of controls that can be automatically verified
   */
  getVerifiableControls(): { controlId: string; title: string; description: string; service: string }[] {
    return Object.entries(AZURE_CONTROL_CHECKS).map(([controlId, check]) => ({
      controlId,
      title: check.title,
      description: check.description,
      service: check.service,
    }));
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): AzureConnectionStatus | null {
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

export const azureConnector = new AzureConnector();

export default azureConnector;
