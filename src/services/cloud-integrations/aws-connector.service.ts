/**
 * AWS Cloud Connector Service
 *
 * Provides automated verification of AWS security controls.
 * Uses AWS SDK to check configurations and generate compliance evidence.
 *
 * MVP Scope:
 * - S3 bucket encryption status
 * - IAM MFA enforcement
 * - CloudTrail logging status
 * - KMS key rotation
 */

// ============================================================================
// TYPES
// ============================================================================

export type VerificationStatus = 'pass' | 'fail' | 'partial' | 'error' | 'not_checked';

export interface ControlVerification {
  controlId: string;
  controlTitle: string;
  status: VerificationStatus;
  details: string;
  evidence?: {
    type: 'json' | 'text' | 'screenshot';
    data: string;
    timestamp: string;
  };
  recommendations?: string[];
  checkedAt: string;
}

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

export interface AWSConnectionStatus {
  connected: boolean;
  accountId?: string;
  region?: string;
  error?: string;
  lastChecked: string;
}

export interface AWSVerificationResult {
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
 * Maps compliance control IDs to AWS verification functions
 */
export const AWS_CONTROL_CHECKS: Record<string, {
  title: string;
  description: string;
  service: string;
  checkType: string;
}> = {
  'AC-001': {
    title: 'Multi-Factor Authentication',
    description: 'Verify MFA is enabled for IAM users',
    service: 'IAM',
    checkType: 'mfa_status',
  },
  'AC-003': {
    title: 'Password Policy',
    description: 'Verify IAM password policy meets requirements',
    service: 'IAM',
    checkType: 'password_policy',
  },
  'DP-001': {
    title: 'Data Encryption at Rest',
    description: 'Verify S3 buckets have encryption enabled',
    service: 'S3',
    checkType: 's3_encryption',
  },
  'DP-002': {
    title: 'Key Management',
    description: 'Verify KMS keys have rotation enabled',
    service: 'KMS',
    checkType: 'kms_rotation',
  },
  'SO-001': {
    title: 'Audit Logging',
    description: 'Verify CloudTrail is enabled and configured',
    service: 'CloudTrail',
    checkType: 'cloudtrail_status',
  },
  'SO-003': {
    title: 'Security Monitoring',
    description: 'Verify AWS Security Hub is enabled',
    service: 'SecurityHub',
    checkType: 'security_hub_status',
  },
  'AM-001': {
    title: 'Asset Inventory',
    description: 'Verify AWS Config is recording resources',
    service: 'Config',
    checkType: 'config_recorder',
  },
};

// ============================================================================
// AWS CONNECTOR CLASS
// ============================================================================

/**
 * AWS Cloud Connector for automated compliance verification
 *
 * Note: This is a client-side service that makes calls to a serverless function
 * which handles the actual AWS API calls. Credentials are never stored client-side.
 */
export class AWSConnector {
  private connectionStatus: AWSConnectionStatus | null = null;

  /**
   * Test AWS connection with provided credentials
   */
  async testConnection(credentials: AWSCredentials): Promise<AWSConnectionStatus> {
    try {
      const response = await fetch('/.netlify/functions/aws-verify', {
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
          error: error.error || 'Failed to connect to AWS',
          lastChecked: new Date().toISOString(),
        };
      }

      const data = await response.json();
      this.connectionStatus = {
        connected: true,
        accountId: data.accountId,
        region: credentials.region,
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
    credentials: AWSCredentials,
    controlIds: string[]
  ): Promise<AWSVerificationResult> {
    const verifications: ControlVerification[] = [];
    let passed = 0;
    let failed = 0;
    let partial = 0;
    let errors = 0;

    for (const controlId of controlIds) {
      const check = AWS_CONTROL_CHECKS[controlId];
      if (!check) {
        verifications.push({
          controlId,
          controlTitle: 'Unknown Control',
          status: 'not_checked',
          details: 'No AWS verification available for this control',
          checkedAt: new Date().toISOString(),
        });
        continue;
      }

      try {
        const response = await fetch('/.netlify/functions/aws-verify', {
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
   * Run all available AWS verifications
   */
  async verifyAll(credentials: AWSCredentials): Promise<AWSVerificationResult> {
    const controlIds = Object.keys(AWS_CONTROL_CHECKS);
    return this.verifyControls(credentials, controlIds);
  }

  /**
   * Get list of controls that can be automatically verified
   */
  getVerifiableControls(): { controlId: string; title: string; description: string; service: string }[] {
    return Object.entries(AWS_CONTROL_CHECKS).map(([controlId, check]) => ({
      controlId,
      title: check.title,
      description: check.description,
      service: check.service,
    }));
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): AWSConnectionStatus | null {
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

export const awsConnector = new AWSConnector();

export default awsConnector;
