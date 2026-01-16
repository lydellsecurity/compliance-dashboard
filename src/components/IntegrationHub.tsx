/**
 * Integration Hub Component
 *
 * Comprehensive integration management interface:
 * - Browse available integrations by category
 * - Connect/disconnect integrations
 * - OAuth flow handling
 * - Connection status monitoring
 * - Sync management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plug,
  Search,
  X,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Shield,
  Users,
  GitBranch,
  FolderKanban,
  Smartphone,
  Cloud,
  Lock,
  MessageSquare,
  Clock,
  Zap,
  Link2,
  Unlink,
  Key,
  Globe,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  integrationHub,
  type IntegrationProvider,
  type IntegrationConnection,
  type IntegrationCategory,
  type IntegrationStatus,
} from '../services/integration-hub.service';

// ============================================================================
// TYPES
// ============================================================================

interface IntegrationHubProps {
  organizationId: string;
  userId: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_META: Record<
  IntegrationCategory,
  { label: string; icon: React.ReactNode; description: string }
> = {
  identity: {
    label: 'Identity & SSO',
    icon: <Shield className="w-5 h-5" />,
    description: 'User authentication and access management',
  },
  hr: {
    label: 'HR Systems',
    icon: <Users className="w-5 h-5" />,
    description: 'Employee data and onboarding',
  },
  code_repository: {
    label: 'Code Repositories',
    icon: <GitBranch className="w-5 h-5" />,
    description: 'Version control and code reviews',
  },
  project_management: {
    label: 'Project Management',
    icon: <FolderKanban className="w-5 h-5" />,
    description: 'Task tracking and workflows',
  },
  endpoint_mdm: {
    label: 'Endpoint & MDM',
    icon: <Smartphone className="w-5 h-5" />,
    description: 'Device management and compliance',
  },
  cloud: {
    label: 'Cloud Providers',
    icon: <Cloud className="w-5 h-5" />,
    description: 'Infrastructure and services',
  },
  security: {
    label: 'Security Tools',
    icon: <Lock className="w-5 h-5" />,
    description: 'Threat detection and vulnerability management',
  },
  communication: {
    label: 'Communication',
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'Team messaging and notifications',
  },
};

const STATUS_STYLES: Record<IntegrationStatus, { color: string; bg: string; label: string }> = {
  connected: { color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Connected' },
  disconnected: { color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', label: 'Not Connected' },
  error: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Error' },
  pending: { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Connecting...' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const IntegrationHub: React.FC<IntegrationHubProps> = ({ organizationId, userId }) => {
  // State
  const [providers, setProviders] = useState<Record<IntegrationCategory, IntegrationProvider[]>>({} as Record<IntegrationCategory, IntegrationProvider[]>);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'all'>('all');
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<IntegrationConnection | null>(null);

  // Initialize
  useEffect(() => {
    integrationHub.setContext(organizationId, userId);
    setProviders(integrationHub.getProvidersByCategory());
    loadConnections();
  }, [organizationId, userId]);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    try {
      const conns = await integrationHub.getConnections();
      setConnections(conns);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get connection status for a provider
  const getProviderConnection = (providerId: string): IntegrationConnection | undefined => {
    return connections.find((c) => c.providerId === providerId);
  };

  // Filter providers
  const getFilteredProviders = (): IntegrationProvider[] => {
    let allProviders: IntegrationProvider[] = [];

    if (selectedCategory === 'all') {
      allProviders = Object.values(providers).flat();
    } else {
      allProviders = providers[selectedCategory] || [];
    }

    if (searchText) {
      const search = searchText.toLowerCase();
      allProviders = allProviders.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search)
      );
    }

    return allProviders;
  };

  // Handle provider click
  const handleProviderClick = (provider: IntegrationProvider) => {
    const connection = getProviderConnection(provider.id);
    if (connection) {
      setSelectedConnection(connection);
      setShowSettingsModal(true);
    } else {
      setSelectedProvider(provider);
      setShowConnectModal(true);
    }
  };

  // Handle disconnect
  const handleDisconnect = async (connectionId: string) => {
    if (window.confirm('Are you sure you want to disconnect this integration?')) {
      const success = await integrationHub.deleteConnection(connectionId);
      if (success) {
        await loadConnections();
        setShowSettingsModal(false);
        setSelectedConnection(null);
      }
    }
  };

  // Handle sync
  const handleSync = async (connectionId: string) => {
    const result = await integrationHub.triggerSync(connectionId);
    if (result.success) {
      await loadConnections();
    }
  };

  // Stats
  const connectedCount = connections.filter((c) => c.status === 'connected').length;
  const errorCount = connections.filter((c) => c.status === 'error').length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-steel-100">
            Integration Hub
          </h2>
          <p className="text-sm text-slate-500 dark:text-steel-400 mt-1">
            Connect third-party services for automated evidence collection
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              {connectedCount} Connected
            </span>
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="w-4 h-4" />
                {errorCount} Errors
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search and Category Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <CategoryPill
            label="All"
            selected={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
          />
          {Object.entries(CATEGORY_META).map(([category, meta]) => (
            <CategoryPill
              key={category}
              label={meta.label}
              icon={meta.icon}
              selected={selectedCategory === category}
              onClick={() => setSelectedCategory(category as IntegrationCategory)}
            />
          ))}
        </div>
      </div>

      {/* Integration Grid */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {getFilteredProviders().map((provider) => {
              const connection = getProviderConnection(provider.id);
              return (
                <IntegrationCard
                  key={provider.id}
                  provider={provider}
                  connection={connection}
                  onClick={() => handleProviderClick(provider)}
                />
              );
            })}
          </div>
        )}

        {!loading && getFilteredProviders().length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-steel-400">
            <Plug className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No integrations found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
          </div>
        )}
      </div>

      {/* Connect Modal */}
      <AnimatePresence>
        {showConnectModal && selectedProvider && (
          <ConnectModal
            provider={selectedProvider}
            onClose={() => {
              setShowConnectModal(false);
              setSelectedProvider(null);
            }}
            onSuccess={() => {
              loadConnections();
              setShowConnectModal(false);
              setSelectedProvider(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && selectedConnection && (
          <ConnectionSettingsModal
            connection={selectedConnection}
            onClose={() => {
              setShowSettingsModal(false);
              setSelectedConnection(null);
            }}
            onDisconnect={() => handleDisconnect(selectedConnection.id)}
            onSync={() => handleSync(selectedConnection.id)}
            onUpdate={() => loadConnections()}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const CategoryPill: React.FC<{
  label: string;
  icon?: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}> = ({ label, icon, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
      selected
        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
        : 'bg-slate-100 dark:bg-steel-800 text-slate-600 dark:text-steel-400 hover:bg-slate-200 dark:hover:bg-steel-700'
    }`}
  >
    {icon}
    {label}
  </button>
);

const IntegrationCard: React.FC<{
  provider: IntegrationProvider;
  connection?: IntegrationConnection;
  onClick: () => void;
}> = ({ provider, connection, onClick }) => {
  const status = connection?.status || 'disconnected';
  const statusStyle = STATUS_STYLES[status];
  const categoryMeta = CATEGORY_META[provider.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 bg-white dark:bg-midnight-800 rounded-lg border cursor-pointer transition-all ${
        connection
          ? 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-300'
          : 'border-slate-200 dark:border-steel-700 hover:border-indigo-300 dark:hover:border-indigo-700'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 dark:bg-steel-800 rounded-lg flex items-center justify-center text-slate-600 dark:text-steel-400">
            {categoryMeta.icon}
          </div>
          <div>
            <h3 className="font-medium text-slate-900 dark:text-steel-100">{provider.name}</h3>
            <p className="text-xs text-slate-500 dark:text-steel-400">{categoryMeta.label}</p>
          </div>
        </div>
        {connection && (
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.color}`}
          >
            {statusStyle.label}
          </span>
        )}
      </div>

      <p className="text-sm text-slate-600 dark:text-steel-400 mb-3 line-clamp-2">
        {provider.description}
      </p>

      <div className="flex flex-wrap gap-1 mb-3">
        {provider.features.slice(0, 3).map((feature) => (
          <span
            key={feature}
            className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-steel-800 text-slate-600 dark:text-steel-400 rounded"
          >
            {feature}
          </span>
        ))}
        {provider.features.length > 3 && (
          <span className="px-2 py-0.5 text-xs text-slate-400">
            +{provider.features.length - 3}
          </span>
        )}
      </div>

      {connection && connection.lastSyncAt && (
        <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-steel-500">
          <Clock className="w-3 h-3" />
          Last synced {formatRelativeTime(connection.lastSyncAt)}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-steel-800">
        <span className="text-xs text-slate-500 dark:text-steel-400 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {provider.controlsMapped.length} controls mapped
        </span>
      </div>
    </motion.div>
  );
};

const ConnectModal: React.FC<{
  provider: IntegrationProvider;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ provider, onClose, onSuccess }) => {
  const [apiKey, setApiKey] = useState('');
  const [domain, setDomain] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setConnecting(true);
    setError('');

    try {
      const credentials: Record<string, string> = {};

      if (provider.authMethod === 'api_key') {
        credentials.apiKey = apiKey;
        if (domain) credentials.domain = domain;
      }

      const result = await integrationHub.createConnection(provider.id, credentials);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Failed to connect');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleOAuthConnect = () => {
    const redirectUri = `${window.location.origin}/integrations/callback`;
    const state = `${provider.id}:${Date.now()}`;
    sessionStorage.setItem('oauth_state', state);

    const authUrl = integrationHub.getOAuthAuthorizationUrl(provider.id, redirectUri, state);
    if (authUrl) {
      window.location.href = authUrl;
    } else {
      setError('OAuth configuration not available');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-white dark:bg-midnight-800 rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-steel-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-steel-800 rounded-lg flex items-center justify-center">
              {CATEGORY_META[provider.category].icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-steel-100">
                Connect {provider.name}
              </h2>
              <p className="text-sm text-slate-500 dark:text-steel-400">
                {provider.authMethod === 'oauth2' ? 'OAuth 2.0' : 'API Key'} Authentication
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:text-steel-500 dark:hover:text-steel-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {provider.authMethod === 'oauth2' ? (
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-steel-400 mb-6">
                Click the button below to authenticate with {provider.name}. You'll be redirected
                to their login page.
              </p>
              <button
                onClick={handleOAuthConnect}
                disabled={connecting}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Connect with {provider.name}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
                  API Key *
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
                    placeholder="Enter your API key"
                    required
                  />
                </div>
              </div>

              {['bamboohr', 'jamf', 'kandji'].includes(provider.id) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
                    Domain / Subdomain
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
                      placeholder="your-company"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleConnect}
                  disabled={connecting || !apiKey}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {connecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      Connect
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-steel-800">
            <a
              href={provider.documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View {provider.name} documentation
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ConnectionSettingsModal: React.FC<{
  connection: IntegrationConnection;
  onClose: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  onUpdate: () => void;
}> = ({ connection, onClose, onDisconnect, onSync, onUpdate }) => {
  const [syncing, setSyncing] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(connection.settings.syncEnabled);
  const [syncInterval, setSyncInterval] = useState(connection.settings.syncIntervalMinutes);

  const handleSync = async () => {
    setSyncing(true);
    await onSync();
    setSyncing(false);
  };

  const handleSaveSettings = async () => {
    await integrationHub.updateConnection(connection.id, {
      settings: {
        syncEnabled,
        syncIntervalMinutes: syncInterval,
      },
    });
    onUpdate();
  };

  const statusStyle = STATUS_STYLES[connection.status];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-white dark:bg-midnight-800 rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-steel-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-steel-800 rounded-lg flex items-center justify-center">
              {CATEGORY_META[connection.category].icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-steel-100">
                {connection.providerName}
              </h2>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.color}`}
              >
                {statusStyle.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:text-steel-500 dark:hover:text-steel-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          {connection.status === 'error' && connection.lastSyncError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{connection.lastSyncError}</p>
            </div>
          )}

          {/* Sync Info */}
          <div className="p-4 bg-slate-50 dark:bg-midnight-900 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700 dark:text-steel-300">
                Last Sync
              </span>
              <span className="text-sm text-slate-500 dark:text-steel-400">
                {connection.lastSyncAt
                  ? formatRelativeTime(connection.lastSyncAt)
                  : 'Never'}
              </span>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sync Now
                </>
              )}
            </button>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-700 dark:text-steel-300">Settings</h3>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-steel-400">Auto-sync enabled</span>
              <button
                onClick={() => setSyncEnabled(!syncEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  syncEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-steel-700'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    syncEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm text-slate-600 dark:text-steel-400 mb-1">
                Sync interval (minutes)
              </label>
              <select
                value={syncInterval}
                onChange={(e) => setSyncInterval(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
              >
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour</option>
                <option value={360}>Every 6 hours</option>
                <option value={1440}>Daily</option>
              </select>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full px-4 py-2 bg-slate-100 dark:bg-steel-800 text-slate-700 dark:text-steel-300 rounded-lg hover:bg-slate-200 dark:hover:bg-steel-700 transition-colors"
            >
              Save Settings
            </button>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-slate-200 dark:border-steel-700">
            <button
              onClick={onDisconnect}
              className="w-full px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
            >
              <Unlink className="w-4 h-4" />
              Disconnect Integration
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// HELPERS
// ============================================================================

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export default IntegrationHub;
