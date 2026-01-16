/**
 * Cloud Verification UI Component
 *
 * Provides OAuth/credential flow for connecting to cloud providers
 * and displays automated verification results for compliance controls.
 * Supports AWS, Azure, and GCP.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Cloud, Shield, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Key, Eye, EyeOff, RefreshCw, Download, ChevronDown,
  ChevronRight, Terminal, FileJson, Unplug
} from 'lucide-react';
import {
  awsConnector,
  azureConnector,
  gcpConnector,
  type AWSCredentials,
  type AzureCredentials,
  type GCPCredentials,
  type ControlVerification,
} from '../services/cloud-integrations';

// ============================================================================
// TYPES
// ============================================================================

type CloudProvider = 'aws' | 'azure' | 'gcp';

interface ConnectionStatus {
  connected: boolean;
  accountId?: string;
  error?: string;
  lastChecked: string;
  providerDetails?: Record<string, string>;
}

interface VerificationResult {
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

interface CloudVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationComplete?: (results: VerificationResult) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CLOUD_PROVIDERS: {
  id: CloudProvider;
  name: string;
  fullName: string;
  color: string;
  available: boolean;
}[] = [
  { id: 'aws', name: 'AWS', fullName: 'Amazon Web Services', color: '#FF9900', available: true },
  { id: 'azure', name: 'Azure', fullName: 'Microsoft Azure', color: '#0078D4', available: true },
  { id: 'gcp', name: 'GCP', fullName: 'Google Cloud Platform', color: '#4285F4', available: true },
];

const STATUS_CONFIG = {
  pass: { icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-status-success', bgColor: 'bg-green-100 dark:bg-green-900/30', label: 'Pass' },
  fail: { icon: <XCircle className="w-5 h-5" />, color: 'text-status-error', bgColor: 'bg-red-100 dark:bg-red-900/30', label: 'Fail' },
  partial: { icon: <AlertTriangle className="w-5 h-5" />, color: 'text-status-warning', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Partial' },
  error: { icon: <XCircle className="w-5 h-5" />, color: 'text-slate-500', bgColor: 'bg-slate-100 dark:bg-slate-800', label: 'Error' },
  not_checked: { icon: <AlertTriangle className="w-5 h-5" />, color: 'text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-800', label: 'Not Checked' },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const CredentialInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isSecret?: boolean;
  isTextArea?: boolean;
}> = ({ label, value, onChange, placeholder, isSecret, isTextArea }) => {
  const [showValue, setShowValue] = useState(false);

  if (isTextArea) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-primary">{label}</label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-steel-800 border border-slate-200 dark:border-steel-700 rounded-lg text-sm text-primary font-mono placeholder-slate-400 dark:placeholder-steel-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none"
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-primary">{label}</label>
      <div className="relative">
        <input
          type={isSecret && !showValue ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-steel-800 border border-slate-200 dark:border-steel-700 rounded-lg text-sm text-primary font-mono placeholder-slate-400 dark:placeholder-steel-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-steel-300"
          >
            {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

const VerificationCard: React.FC<{
  verification: ControlVerification;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ verification, isExpanded, onToggle }) => {
  const config = STATUS_CONFIG[verification.status];

  return (
    <div className={`rounded-xl border ${config.bgColor} border-slate-200 dark:border-steel-700 overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/50 dark:hover:bg-steel-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={config.color}>{config.icon}</div>
          <div>
            <span className="px-2 py-0.5 text-xs font-mono bg-slate-200 dark:bg-steel-700 rounded mr-2">
              {verification.controlId}
            </span>
            <span className="font-medium text-primary">{verification.controlTitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.bgColor} ${config.color}`}>
            {config.label}
          </span>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-slate-200 dark:border-steel-700">
              {/* Details */}
              <div className="pt-4">
                <p className="text-sm text-secondary">{verification.details}</p>
              </div>

              {/* Recommendations */}
              {verification.recommendations && verification.recommendations.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase mb-2">
                    Recommendations
                  </h4>
                  <ul className="space-y-1">
                    {verification.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-secondary">
                        <Terminal className="w-4 h-4 text-accent-400 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Evidence */}
              {verification.evidence && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase mb-2 flex items-center gap-2">
                    <FileJson className="w-3.5 h-3.5" />
                    Evidence Captured
                  </h4>
                  <pre className="p-3 bg-slate-900 dark:bg-black rounded-lg text-xs text-slate-100 overflow-x-auto max-h-48 font-mono">
                    {verification.evidence.data}
                  </pre>
                  <p className="text-xs text-slate-400 dark:text-steel-500 mt-1">
                    Captured at {new Date(verification.evidence.timestamp).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CloudVerification: React.FC<CloudVerificationProps> = ({
  isOpen,
  onClose,
  onVerificationComplete,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>('aws');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [verificationResults, setVerificationResults] = useState<VerificationResult | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AWS Credentials
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');

  // Azure Credentials
  const [azureTenantId, setAzureTenantId] = useState('');
  const [azureClientId, setAzureClientId] = useState('');
  const [azureClientSecret, setAzureClientSecret] = useState('');
  const [azureSubscriptionId, setAzureSubscriptionId] = useState('');

  // GCP Credentials
  const [gcpProjectId, setGcpProjectId] = useState('');
  const [gcpClientEmail, setGcpClientEmail] = useState('');
  const [gcpPrivateKey, setGcpPrivateKey] = useState('');

  // Get verifiable controls for selected provider
  const getVerifiableControls = useCallback(() => {
    switch (selectedProvider) {
      case 'aws':
        return awsConnector.getVerifiableControls();
      case 'azure':
        return azureConnector.getVerifiableControls();
      case 'gcp':
        return gcpConnector.getVerifiableControls();
    }
  }, [selectedProvider]);

  const verifiableControls = getVerifiableControls();

  // Clear sensitive data when modal closes or provider changes
  useEffect(() => {
    if (!isOpen) {
      // Clear all credentials when modal closes for security
      setAwsAccessKeyId('');
      setAwsSecretAccessKey('');
      setAzureTenantId('');
      setAzureClientId('');
      setAzureClientSecret('');
      setAzureSubscriptionId('');
      setGcpProjectId('');
      setGcpClientEmail('');
      setGcpPrivateKey('');
      setConnectionStatus(null);
      setVerificationResults(null);
      setError(null);
      setExpandedCards(new Set());
      awsConnector.disconnect();
      azureConnector.disconnect();
      gcpConnector.disconnect();
    }
  }, [isOpen]);

  // Clear connection when provider changes
  useEffect(() => {
    setConnectionStatus(null);
    setVerificationResults(null);
    setError(null);
  }, [selectedProvider]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      switch (selectedProvider) {
        case 'aws': {
          if (!awsAccessKeyId || !awsSecretAccessKey) {
            setError('Please provide both Access Key ID and Secret Access Key');
            setIsConnecting(false);
            return;
          }
          const credentials: AWSCredentials = {
            accessKeyId: awsAccessKeyId,
            secretAccessKey: awsSecretAccessKey,
            region: awsRegion,
          };
          const status = await awsConnector.testConnection(credentials);
          setConnectionStatus({
            connected: status.connected,
            accountId: status.accountId,
            error: status.error,
            lastChecked: status.lastChecked,
            providerDetails: { region: awsRegion },
          });
          if (!status.connected) {
            setError(status.error || 'Failed to connect to AWS');
          }
          break;
        }
        case 'azure': {
          if (!azureTenantId || !azureClientId || !azureClientSecret || !azureSubscriptionId) {
            setError('Please provide all Azure credentials');
            setIsConnecting(false);
            return;
          }
          const credentials: AzureCredentials = {
            tenantId: azureTenantId,
            clientId: azureClientId,
            clientSecret: azureClientSecret,
            subscriptionId: azureSubscriptionId,
          };
          const status = await azureConnector.testConnection(credentials);
          setConnectionStatus({
            connected: status.connected,
            accountId: status.subscriptionId,
            error: status.error,
            lastChecked: status.lastChecked,
            providerDetails: { subscriptionName: status.subscriptionName || '' },
          });
          if (!status.connected) {
            setError(status.error || 'Failed to connect to Azure');
          }
          break;
        }
        case 'gcp': {
          if (!gcpProjectId || !gcpClientEmail || !gcpPrivateKey) {
            setError('Please provide all GCP credentials');
            setIsConnecting(false);
            return;
          }
          const credentials: GCPCredentials = {
            projectId: gcpProjectId,
            clientEmail: gcpClientEmail,
            privateKey: gcpPrivateKey,
          };
          const status = await gcpConnector.testConnection(credentials);
          setConnectionStatus({
            connected: status.connected,
            accountId: status.projectId,
            error: status.error,
            lastChecked: status.lastChecked,
            providerDetails: { projectName: status.projectName || '' },
          });
          if (!status.connected) {
            setError(status.error || 'Failed to connect to GCP');
          }
          break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    }

    setIsConnecting(false);
  }, [selectedProvider, awsAccessKeyId, awsSecretAccessKey, awsRegion, azureTenantId, azureClientId, azureClientSecret, azureSubscriptionId, gcpProjectId, gcpClientEmail, gcpPrivateKey]);

  const handleDisconnect = useCallback(() => {
    switch (selectedProvider) {
      case 'aws':
        awsConnector.disconnect();
        setAwsAccessKeyId('');
        setAwsSecretAccessKey('');
        break;
      case 'azure':
        azureConnector.disconnect();
        setAzureTenantId('');
        setAzureClientId('');
        setAzureClientSecret('');
        setAzureSubscriptionId('');
        break;
      case 'gcp':
        gcpConnector.disconnect();
        setGcpProjectId('');
        setGcpClientEmail('');
        setGcpPrivateKey('');
        break;
    }
    setConnectionStatus(null);
    setVerificationResults(null);
    setError(null);
  }, [selectedProvider]);

  const handleVerify = useCallback(async () => {
    if (!connectionStatus?.connected) return;

    setIsVerifying(true);
    setError(null);

    try {
      let results: VerificationResult;

      switch (selectedProvider) {
        case 'aws': {
          const credentials: AWSCredentials = {
            accessKeyId: awsAccessKeyId,
            secretAccessKey: awsSecretAccessKey,
            region: awsRegion,
          };
          results = await awsConnector.verifyAll(credentials);
          break;
        }
        case 'azure': {
          const credentials: AzureCredentials = {
            tenantId: azureTenantId,
            clientId: azureClientId,
            clientSecret: azureClientSecret,
            subscriptionId: azureSubscriptionId,
          };
          results = await azureConnector.verifyAll(credentials);
          break;
        }
        case 'gcp': {
          const credentials: GCPCredentials = {
            projectId: gcpProjectId,
            clientEmail: gcpClientEmail,
            privateKey: gcpPrivateKey,
          };
          results = await gcpConnector.verifyAll(credentials);
          break;
        }
      }

      setVerificationResults(results);

      if (onVerificationComplete) {
        onVerificationComplete(results);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    }

    setIsVerifying(false);
  }, [connectionStatus, selectedProvider, awsAccessKeyId, awsSecretAccessKey, awsRegion, azureTenantId, azureClientId, azureClientSecret, azureSubscriptionId, gcpProjectId, gcpClientEmail, gcpPrivateKey, onVerificationComplete]);

  const toggleCard = (controlId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(controlId)) {
        next.delete(controlId);
      } else {
        next.add(controlId);
      }
      return next;
    });
  };

  const downloadEvidence = () => {
    if (!verificationResults) return;

    const providerName = CLOUD_PROVIDERS.find(p => p.id === selectedProvider)?.name || selectedProvider;
    const data = {
      provider: providerName,
      accountId: connectionStatus?.accountId,
      providerDetails: connectionStatus?.providerDetails,
      verifiedAt: verificationResults.checkedAt,
      summary: verificationResults.summary,
      verifications: verificationResults.verifications,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedProvider}-verification-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getProviderLabel = () => {
    return CLOUD_PROVIDERS.find(p => p.id === selectedProvider)?.name || '';
  };

  const renderCredentialsForm = () => {
    switch (selectedProvider) {
      case 'aws':
        return (
          <>
            <CredentialInput
              label="Access Key ID"
              value={awsAccessKeyId}
              onChange={setAwsAccessKeyId}
              placeholder="AKIAIOSFODNN7EXAMPLE"
            />
            <CredentialInput
              label="Secret Access Key"
              value={awsSecretAccessKey}
              onChange={setAwsSecretAccessKey}
              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              isSecret
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-primary">Region</label>
              <select
                value={awsRegion}
                onChange={(e) => setAwsRegion(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-steel-800 border border-slate-200 dark:border-steel-700 rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-east-2">US East (Ohio)</option>
                <option value="us-west-1">US West (N. California)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">EU (Ireland)</option>
                <option value="eu-west-2">EU (London)</option>
                <option value="eu-central-1">EU (Frankfurt)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
              </select>
            </div>
          </>
        );

      case 'azure':
        return (
          <>
            <CredentialInput
              label="Tenant ID"
              value={azureTenantId}
              onChange={setAzureTenantId}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            <CredentialInput
              label="Client ID (Application ID)"
              value={azureClientId}
              onChange={setAzureClientId}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            <CredentialInput
              label="Client Secret"
              value={azureClientSecret}
              onChange={setAzureClientSecret}
              placeholder="Your client secret"
              isSecret
            />
            <CredentialInput
              label="Subscription ID"
              value={azureSubscriptionId}
              onChange={setAzureSubscriptionId}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </>
        );

      case 'gcp':
        return (
          <>
            <CredentialInput
              label="Project ID"
              value={gcpProjectId}
              onChange={setGcpProjectId}
              placeholder="my-project-id"
            />
            <CredentialInput
              label="Service Account Email"
              value={gcpClientEmail}
              onChange={setGcpClientEmail}
              placeholder="service-account@project.iam.gserviceaccount.com"
            />
            <CredentialInput
              label="Private Key"
              value={gcpPrivateKey}
              onChange={setGcpPrivateKey}
              placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
              isTextArea
            />
          </>
        );
    }
  };

  const getSecurityNote = () => {
    switch (selectedProvider) {
      case 'aws':
        return 'We recommend using temporary credentials from AWS STS or an IAM role with read-only permissions. Credentials are never stored.';
      case 'azure':
        return 'Create a service principal with Reader role for verification. Use Azure Key Vault for production. Credentials are never stored.';
      case 'gcp':
        return 'Use a service account with Viewer role. Download the JSON key file from GCP Console. Credentials are never stored.';
    }
  };

  const isFormValid = () => {
    switch (selectedProvider) {
      case 'aws':
        return awsAccessKeyId && awsSecretAccessKey;
      case 'azure':
        return azureTenantId && azureClientId && azureClientSecret && azureSubscriptionId;
      case 'gcp':
        return gcpProjectId && gcpClientEmail && gcpPrivateKey;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="modal-backdrop"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl modal-content z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-steel-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary">Cloud Verification</h2>
                  <p className="text-sm text-secondary">Automated compliance control verification</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-steel-800 text-slate-500 dark:text-steel-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Provider Tabs */}
            <div className="flex border-b border-slate-200 dark:border-steel-700 px-5">
              {CLOUD_PROVIDERS.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => provider.available && setSelectedProvider(provider.id)}
                  disabled={!provider.available}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative
                    ${selectedProvider === provider.id
                      ? 'text-accent-400'
                      : provider.available
                        ? 'text-slate-500 dark:text-steel-400 hover:text-secondary'
                        : 'text-slate-300 dark:text-steel-600 cursor-not-allowed'
                    }
                  `}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: provider.color }} />
                  {provider.name}
                  {!provider.available && (
                    <span className="text-xs bg-slate-100 dark:bg-steel-800 px-1.5 py-0.5 rounded">Soon</span>
                  )}
                  {selectedProvider === provider.id && (
                    <motion.div
                      layoutId="activeProvider"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Connection Status */}
              {connectionStatus?.connected ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-status-success" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-300">Connected to {getProviderLabel()}</p>
                        <p className="text-sm text-green-700 dark:text-green-400">
                          {selectedProvider === 'aws' && `Account: ${connectionStatus.accountId} • Region: ${connectionStatus.providerDetails?.region}`}
                          {selectedProvider === 'azure' && `Subscription: ${connectionStatus.providerDetails?.subscriptionName || connectionStatus.accountId}`}
                          {selectedProvider === 'gcp' && `Project: ${connectionStatus.providerDetails?.projectName || connectionStatus.accountId}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnect}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Unplug className="w-4 h-4" />
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                /* Credentials Form */
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <Key className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-300">Security Note</p>
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          {getSecurityNote()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {renderCredentialsForm()}

                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleConnect}
                    disabled={isConnecting || !isFormValid()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Connect to {getProviderLabel()}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Verifiable Controls */}
              {connectionStatus?.connected && !verificationResults && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-primary">Available Verifications</h3>
                  <p className="text-sm text-secondary">
                    The following {verifiableControls.length} controls can be automatically verified against your {getProviderLabel()} account.
                  </p>

                  <div className="grid gap-2">
                    {verifiableControls.map(control => (
                      <div
                        key={control.controlId}
                        className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-steel-800 rounded-lg"
                      >
                        <span className="px-2 py-0.5 text-xs font-mono bg-slate-200 dark:bg-steel-700 rounded">
                          {control.controlId}
                        </span>
                        <span className="text-sm text-primary">{control.title}</span>
                        <span className="ml-auto text-xs text-slate-400 dark:text-steel-500">
                          {control.service}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Running Verifications...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Run All Verifications
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Verification Results */}
              {verificationResults && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-primary">Verification Results</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleVerify}
                        disabled={isVerifying}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-secondary hover:bg-slate-100 dark:hover:bg-steel-800 rounded-lg transition-colors"
                      >
                        <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
                        Re-run
                      </button>
                      <button
                        onClick={downloadEvidence}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent-500 hover:bg-accent-500/10 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Export Evidence
                      </button>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
                      <p className="text-2xl font-bold text-status-success">{verificationResults.summary.passed}</p>
                      <p className="text-xs text-green-700 dark:text-green-400">Passed</p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">
                      <p className="text-2xl font-bold text-status-error">{verificationResults.summary.failed}</p>
                      <p className="text-xs text-red-700 dark:text-red-400">Failed</p>
                    </div>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-center">
                      <p className="text-2xl font-bold text-status-warning">{verificationResults.summary.partial}</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400">Partial</p>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-steel-800 rounded-xl text-center">
                      <p className="text-2xl font-bold text-slate-500">{verificationResults.summary.errors}</p>
                      <p className="text-xs text-slate-500 dark:text-steel-400">Errors</p>
                    </div>
                  </div>

                  {/* Individual Results */}
                  <div className="space-y-3">
                    {verificationResults.verifications.map(verification => (
                      <VerificationCard
                        key={verification.controlId}
                        verification={verification}
                        isExpanded={expandedCards.has(verification.controlId)}
                        onToggle={() => toggleCard(verification.controlId)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CloudVerification;
