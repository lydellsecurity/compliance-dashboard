/**
 * Cloud Integrations Index
 *
 * Exports all cloud connector services and types for unified access.
 */

// AWS Connector
import {
  awsConnector as awsConnectorService,
  AWSConnector,
  AWS_CONTROL_CHECKS,
  type AWSCredentials,
  type AWSConnectionStatus,
  type AWSVerificationResult,
  type VerificationStatus,
  type ControlVerification,
} from './aws-connector.service';
export {
  awsConnectorService as awsConnector,
  AWSConnector,
  AWS_CONTROL_CHECKS,
  type AWSCredentials,
  type AWSConnectionStatus,
  type AWSVerificationResult,
  type VerificationStatus,
  type ControlVerification,
};

// Azure Connector
import {
  azureConnector as azureConnectorService,
  AzureConnector,
  AZURE_CONTROL_CHECKS,
  type AzureCredentials,
  type AzureConnectionStatus,
  type AzureVerificationResult,
} from './azure-connector.service';
export {
  azureConnectorService as azureConnector,
  AzureConnector,
  AZURE_CONTROL_CHECKS,
  type AzureCredentials,
  type AzureConnectionStatus,
  type AzureVerificationResult,
};

// GCP Connector
import {
  gcpConnector as gcpConnectorService,
  GCPConnector,
  GCP_CONTROL_CHECKS,
  type GCPCredentials,
  type GCPConnectionStatus,
  type GCPVerificationResult,
} from './gcp-connector.service';
export {
  gcpConnectorService as gcpConnector,
  GCPConnector,
  GCP_CONTROL_CHECKS,
  type GCPCredentials,
  type GCPConnectionStatus,
  type GCPVerificationResult,
};

// ============================================================================
// UNIFIED TYPES
// ============================================================================

export type CloudProvider = 'aws' | 'azure' | 'gcp';

export interface CloudCredentials {
  provider: CloudProvider;
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    sessionToken?: string;
  };
  azure?: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    subscriptionId: string;
  };
  gcp?: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  };
}

export interface CloudConnectionStatus {
  provider: CloudProvider;
  connected: boolean;
  accountId?: string;
  error?: string;
  lastChecked: string;
}

// ============================================================================
// UNIFIED CONTROL MAPPINGS
// ============================================================================

/**
 * Get all controls that can be verified across cloud providers
 */
export function getAllVerifiableControls(): {
  controlId: string;
  providers: CloudProvider[];
  title: string;
  description: string;
}[] {
  const controlMap = new Map<string, {
    providers: CloudProvider[];
    title: string;
    description: string;
  }>();

  // Add AWS controls
  Object.entries(AWS_CONTROL_CHECKS).forEach(([controlId, check]) => {
    controlMap.set(controlId, {
      providers: ['aws'],
      title: check.title,
      description: check.description,
    });
  });

  // Add Azure controls (merge with existing)
  Object.entries(AZURE_CONTROL_CHECKS).forEach(([controlId, check]) => {
    const existing = controlMap.get(controlId);
    if (existing) {
      existing.providers.push('azure');
    } else {
      controlMap.set(controlId, {
        providers: ['azure'],
        title: check.title,
        description: check.description,
      });
    }
  });

  // Add GCP controls (merge with existing)
  Object.entries(GCP_CONTROL_CHECKS).forEach(([controlId, check]) => {
    const existing = controlMap.get(controlId);
    if (existing) {
      existing.providers.push('gcp');
    } else {
      controlMap.set(controlId, {
        providers: ['gcp'],
        title: check.title,
        description: check.description,
      });
    }
  });

  return Array.from(controlMap.entries()).map(([controlId, data]) => ({
    controlId,
    ...data,
  }));
}

/**
 * Get controls verifiable by a specific provider
 */
export function getControlsForProvider(provider: CloudProvider): string[] {
  switch (provider) {
    case 'aws':
      return Object.keys(AWS_CONTROL_CHECKS);
    case 'azure':
      return Object.keys(AZURE_CONTROL_CHECKS);
    case 'gcp':
      return Object.keys(GCP_CONTROL_CHECKS);
    default:
      return [];
  }
}
