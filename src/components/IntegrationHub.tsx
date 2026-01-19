/**
 * Integration Hub Component - Enterprise OAuth 2.0 Integration Center
 *
 * Features:
 * - Guided wizard UX for OAuth/API key connections
 * - Interactive cards with flip animations
 * - Continuous monitoring with health indicators
 * - Evidence auto-mapping to compliance controls
 * - Corporate light theme with emerald status indicators
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
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
  Info,
  BookOpen,
  ChevronRight,
  Eye,
  Activity,
  AlertTriangle,
  Check,
  ArrowRight,
  Wifi,
  WifiOff,
  BarChart3,
  FileCheck,
} from 'lucide-react';
import {
  integrationHub,
  INTEGRATION_PROVIDERS,
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

type WizardStep = 'prerequisites' | 'configuration' | 'authentication' | 'syncing';

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_META: Record<
  IntegrationCategory,
  { label: string; icon: React.ReactNode; description: string; color: string }
> = {
  identity: {
    label: 'Identity & SSO',
    icon: <Shield className="w-5 h-5" />,
    description: 'User authentication and access management',
    color: 'from-violet-500 to-purple-600',
  },
  hr: {
    label: 'HR Systems',
    icon: <Users className="w-5 h-5" />,
    description: 'Employee data and onboarding',
    color: 'from-pink-500 to-rose-600',
  },
  code_repository: {
    label: 'Code & DevOps',
    icon: <GitBranch className="w-5 h-5" />,
    description: 'Version control and CI/CD',
    color: 'from-emerald-500 to-teal-600',
  },
  project_management: {
    label: 'Project Management',
    icon: <FolderKanban className="w-5 h-5" />,
    description: 'Task tracking and workflows',
    color: 'from-blue-500 to-indigo-600',
  },
  endpoint_mdm: {
    label: 'Endpoint & MDM',
    icon: <Smartphone className="w-5 h-5" />,
    description: 'Device management and compliance',
    color: 'from-orange-500 to-amber-600',
  },
  cloud: {
    label: 'Cloud Providers',
    icon: <Cloud className="w-5 h-5" />,
    description: 'Infrastructure and services',
    color: 'from-cyan-500 to-sky-600',
  },
  security: {
    label: 'Security Tools',
    icon: <Lock className="w-5 h-5" />,
    description: 'Threat detection and vulnerability management',
    color: 'from-red-500 to-rose-600',
  },
  communication: {
    label: 'Communication',
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'Team messaging and notifications',
    color: 'from-fuchsia-500 to-pink-600',
  },
};

const STATUS_CONFIG: Record<IntegrationStatus | 'syncing', {
  color: string;
  bg: string;
  border: string;
  label: string;
  icon: React.ReactNode;
}> = {
  connected: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    label: 'Connected',
    icon: <Wifi className="w-3.5 h-3.5" />,
  },
  syncing: {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    label: 'Syncing',
    icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
  },
  disconnected: {
    color: 'text-slate-500 dark:text-steel-400',
    bg: 'bg-slate-50 dark:bg-steel-900/20',
    border: 'border-slate-200 dark:border-steel-700',
    label: 'Not Connected',
    icon: <WifiOff className="w-3.5 h-3.5" />,
  },
  error: {
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    label: 'Error',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  pending: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    label: 'Pending',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
};

// Evidence mapping by category - used in ConnectionWizard for displaying automatable controls
const CONTROL_MAPPINGS: Record<IntegrationCategory, string[]> = {
  identity: ['MFA Enforced', 'SSO Configuration', 'User Provisioning', 'Access Reviews'],
  hr: ['Background Checks', 'Onboarding Compliance', 'Offboarding Procedures', 'Training Records'],
  code_repository: ['Branch Protection', 'Code Reviews', 'Dependency Scanning', 'Secret Detection'],
  project_management: ['Change Management', 'Issue Tracking', 'Sprint Compliance'],
  endpoint_mdm: ['Device Encryption', 'Patch Management', 'Antivirus Status', 'MDM Compliance'],
  cloud: ['IAM Policies', 'Encryption at Rest', 'Network Security', 'Logging Enabled'],
  security: ['Vulnerability Scanning', 'Threat Detection', 'Incident Response', 'Penetration Testing'],
  communication: ['Audit Logging', 'DLP Monitoring', 'Retention Policies'],
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const IntegrationHub: React.FC<IntegrationHubProps> = ({ organizationId, userId }) => {
  const location = useLocation();

  // State
  const [providers, setProviders] = useState<Record<IntegrationCategory, IntegrationProvider[]>>(
    {} as Record<IntegrationCategory, IntegrationProvider[]>
  );
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'all'>('all');
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null);
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<IntegrationConnection | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successProvider, setSuccessProvider] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Check for OAuth success from callback
  useEffect(() => {
    const state = location.state as { connectionSuccess?: boolean; provider?: string } | null;
    if (state?.connectionSuccess) {
      setShowSuccessToast(true);
      setSuccessProvider(state.provider || 'Integration');
      setTimeout(() => setShowSuccessToast(false), 5000);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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

  // Get connection for a provider
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
          p.description.toLowerCase().includes(search) ||
          p.features.some((f) => f.toLowerCase().includes(search))
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
      setShowWizardModal(true);
    }
  };

  // Handle disconnect
  const handleDisconnect = async (connectionId: string) => {
    if (window.confirm('Are you sure you want to disconnect this integration? This will stop continuous monitoring.')) {
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
    return result;
  };

  // Stats
  const connectedCount = connections.filter((c) => c.status === 'connected').length;
  const errorCount = connections.filter((c) => c.status === 'error').length;
  const totalControls = connections.reduce((sum, conn) => {
    const provider = INTEGRATION_PROVIDERS.find((p) => p.id === conn.providerId);
    return sum + (provider?.controlsMapped.length || 0);
  }, 0);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-midnight-950 -m-6 p-6">
      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50"
          >
            <div className="flex items-center gap-3 px-4 py-3 bg-emerald-600 text-white rounded-lg shadow-lg">
              <CheckCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">{successProvider} Connected!</p>
                <p className="text-sm text-emerald-100">Continuous monitoring is now active.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-steel-100">
              Integration Hub
            </h2>
            <p className="text-sm text-slate-500 dark:text-steel-400 mt-1">
              Connect your tools for continuous compliance monitoring
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-steel-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-steel-800'
              }`}
            >
              <FileCheck className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Wifi className="w-5 h-5" />}
            label="Connected"
            value={connectedCount}
            color="emerald"
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Needs Attention"
            value={errorCount}
            color={errorCount > 0 ? 'red' : 'slate'}
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label="Controls Automated"
            value={totalControls}
            color="indigo"
          />
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Active Monitoring"
            value={connectedCount > 0 ? 'ON' : 'OFF'}
            color={connectedCount > 0 ? 'emerald' : 'slate'}
            isText
          />
        </div>
      </div>

      {/* Search and Category Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search integrations by name, feature, or capability..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-steel-700 rounded-xl bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <CategoryPill
            label="All"
            count={Object.values(providers).flat().length}
            selected={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
          />
          {Object.entries(CATEGORY_META).map(([category, meta]) => (
            <CategoryPill
              key={category}
              label={meta.label}
              icon={meta.icon}
              count={providers[category as IntegrationCategory]?.length || 0}
              selected={selectedCategory === category}
              onClick={() => setSelectedCategory(category as IntegrationCategory)}
            />
          ))}
        </div>
      </div>

      {/* Integration Grid/List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading integrations...</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
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
        ) : (
          <div className="space-y-3">
            {getFilteredProviders().map((provider) => {
              const connection = getProviderConnection(provider.id);
              return (
                <IntegrationListItem
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
            <Plug className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">No integrations found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
          </div>
        )}
      </div>

      {/* Connection Wizard Modal */}
      <AnimatePresence>
        {showWizardModal && selectedProvider && (
          <ConnectionWizard
            provider={selectedProvider}
            onClose={() => {
              setShowWizardModal(false);
              setSelectedProvider(null);
            }}
            onSuccess={() => {
              loadConnections();
              setShowWizardModal(false);
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
// STAT CARD
// ============================================================================

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  isText?: boolean;
}> = ({ icon, label, value, color, isText }) => {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    slate: 'bg-slate-100 dark:bg-steel-800 text-slate-500 dark:text-steel-400',
  };

  return (
    <div className="bg-white dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div>
          <p className="text-xs text-slate-500 dark:text-steel-400 uppercase tracking-wide">
            {label}
          </p>
          <p className={`text-xl font-bold ${isText ? colorClasses[color].split(' ')[2] : 'text-slate-900 dark:text-steel-100'}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CATEGORY PILL
// ============================================================================

const CategoryPill: React.FC<{
  label: string;
  icon?: React.ReactNode;
  count?: number;
  selected: boolean;
  onClick: () => void;
}> = ({ label, icon, count, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
      selected
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
        : 'bg-white dark:bg-midnight-800 text-slate-600 dark:text-steel-400 border border-slate-200 dark:border-steel-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm'
    }`}
  >
    {icon}
    {label}
    {count !== undefined && (
      <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
        selected ? 'bg-white/20' : 'bg-slate-100 dark:bg-steel-800'
      }`}>
        {count}
      </span>
    )}
  </button>
);

// ============================================================================
// INTEGRATION CARD
// ============================================================================

const IntegrationCard: React.FC<{
  provider: IntegrationProvider;
  connection?: IntegrationConnection;
  onClick: () => void;
}> = ({ provider, connection, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const status = connection?.status || 'disconnected';
  const statusConfig = STATUS_CONFIG[status];
  const categoryMeta = CATEGORY_META[provider.category];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`relative bg-white dark:bg-midnight-800 rounded-xl border-2 cursor-pointer transition-all overflow-hidden shadow-sm hover:shadow-lg ${
        connection
          ? `${statusConfig.border}`
          : 'border-slate-200 dark:border-steel-700 hover:border-indigo-300 dark:hover:border-indigo-700'
      }`}
      onClick={onClick}
    >
      {/* Status Pulse for Connected */}
      {connection?.status === 'connected' && (
        <div className="absolute top-3 right-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </div>
      )}

      {/* Category Gradient Header */}
      <div className={`h-1.5 bg-gradient-to-r ${categoryMeta.color}`} />

      <div className="p-5">
        {/* Provider Info */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${categoryMeta.color} flex items-center justify-center text-white shadow-lg`}>
            {categoryMeta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-steel-100 truncate">
              {provider.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-steel-400">{categoryMeta.label}</p>
          </div>
        </div>

        {/* Status Badge */}
        {connection && (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color} mb-3`}>
            {statusConfig.icon}
            {statusConfig.label}
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-slate-600 dark:text-steel-400 mb-4 line-clamp-2">
          {provider.description}
        </p>

        {/* Scopes/Permissions Preview */}
        {provider.scopes && provider.scopes.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-slate-400 dark:text-steel-500 mb-1.5 flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Data Access (Read-only)
            </p>
            <div className="flex flex-wrap gap-1">
              {provider.scopes.slice(0, 2).map((scope) => (
                <span
                  key={scope}
                  className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-steel-800 text-slate-600 dark:text-steel-400 rounded"
                >
                  {scope.split('.').pop()?.replace(/_/g, ' ')}
                </span>
              ))}
              {provider.scopes.length > 2 && (
                <span className="px-2 py-0.5 text-xs text-slate-400">
                  +{provider.scopes.length - 2} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Connected: Show Last Sync */}
        {connection && (
          <div className="mb-4 p-3 bg-slate-50 dark:bg-midnight-900 rounded-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-steel-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last synced
              </span>
              <span className="font-medium text-slate-700 dark:text-steel-300">
                {connection.lastSyncAt ? formatRelativeTime(connection.lastSyncAt) : 'Never'}
              </span>
            </div>
            {connection.lastSyncStatus === 'error' && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Sync failed - check connection
              </p>
            )}
          </div>
        )}

        {/* Controls Mapped */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-steel-800">
          <span className="text-xs text-slate-500 dark:text-steel-400 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {provider.controlsMapped.length} controls automated
          </span>
          <motion.div
            animate={{ x: isHovered ? 4 : 0 }}
            className="text-indigo-600 dark:text-indigo-400"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// INTEGRATION LIST ITEM
// ============================================================================

const IntegrationListItem: React.FC<{
  provider: IntegrationProvider;
  connection?: IntegrationConnection;
  onClick: () => void;
}> = ({ provider, connection, onClick }) => {
  const status = connection?.status || 'disconnected';
  const statusConfig = STATUS_CONFIG[status];
  const categoryMeta = CATEGORY_META[provider.category];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-4 p-4 bg-white dark:bg-midnight-800 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
        connection ? statusConfig.border : 'border-slate-200 dark:border-steel-700 hover:border-indigo-300'
      }`}
      onClick={onClick}
    >
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${categoryMeta.color} flex items-center justify-center text-white`}>
        {categoryMeta.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-slate-900 dark:text-steel-100">{provider.name}</h3>
          {connection && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
              {statusConfig.icon}
              {statusConfig.label}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-steel-400 truncate">{provider.description}</p>
      </div>

      <div className="flex items-center gap-4">
        {connection?.lastSyncAt && (
          <span className="text-xs text-slate-400 dark:text-steel-500 hidden sm:block">
            Synced {formatRelativeTime(connection.lastSyncAt)}
          </span>
        )}
        <span className="text-xs text-slate-500 dark:text-steel-400 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {provider.controlsMapped.length}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>
    </motion.div>
  );
};

// ============================================================================
// CONNECTION WIZARD MODAL
// ============================================================================

const ConnectionWizard: React.FC<{
  provider: IntegrationProvider;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ provider, onClose, onSuccess }) => {
  const [step, setStep] = useState<WizardStep>('prerequisites');
  const [apiKey, setApiKey] = useState('');
  const [domain, setDomain] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const categoryMeta = CATEGORY_META[provider.category];
  const controls = CONTROL_MAPPINGS[provider.category] || [];

  const steps: { key: WizardStep; label: string }[] = [
    { key: 'prerequisites', label: 'Prerequisites' },
    { key: 'configuration', label: 'Configure' },
    { key: 'authentication', label: 'Authenticate' },
  ];

  const handleApiKeyConnect = async () => {
    setConnecting(true);
    setError('');

    try {
      const credentials: Record<string, string> = { apiKey };
      if (domain) credentials.domain = domain;

      const result = await integrationHub.createConnection(provider.id, credentials);

      if (result.success) {
        setStep('syncing');
        // Simulate initial sync
        setTimeout(() => {
          onSuccess();
        }, 2000);
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

  const canProceed = () => {
    if (step === 'prerequisites') return true;
    if (step === 'configuration') {
      if (provider.authMethod === 'api_key') {
        return apiKey.length > 0;
      }
      return true;
    }
    return false;
  };

  const handleNext = () => {
    if (step === 'prerequisites') {
      setStep('configuration');
    } else if (step === 'configuration') {
      setStep('authentication');
    }
  };

  const handleBack = () => {
    if (step === 'configuration') {
      setStep('prerequisites');
    } else if (step === 'authentication') {
      setStep('configuration');
    }
  };

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-lg bg-white dark:bg-midnight-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Gradient */}
        <div className={`bg-gradient-to-r ${categoryMeta.color} px-6 py-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                {categoryMeta.icon}
              </div>
              <div className="text-white">
                <h2 className="text-lg font-semibold">Connect {provider.name}</h2>
                <p className="text-sm text-white/80">
                  {provider.authMethod === 'oauth2' ? 'OAuth 2.0' : 'API Key'} Integration
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        {step !== 'syncing' && (
          <div className="px-6 py-4 border-b border-slate-200 dark:border-steel-700">
            <div className="flex items-center justify-between">
              {steps.map((s, index) => (
                <React.Fragment key={s.key}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        index < currentStepIndex
                          ? 'bg-emerald-500 text-white'
                          : index === currentStepIndex
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 dark:bg-steel-700 text-slate-500 dark:text-steel-400'
                      }`}
                    >
                      {index < currentStepIndex ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    <span
                      className={`text-sm hidden sm:block ${
                        index <= currentStepIndex
                          ? 'text-slate-900 dark:text-steel-100 font-medium'
                          : 'text-slate-400 dark:text-steel-500'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 ${
                        index < currentStepIndex
                          ? 'bg-emerald-500'
                          : 'bg-slate-200 dark:bg-steel-700'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Prerequisites */}
            {step === 'prerequisites' && (
              <motion.div
                key="prerequisites"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100 mb-2">
                    Before you connect
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-steel-400">
                    {provider.setupInstructions || `Ensure you have the necessary access to connect ${provider.name}.`}
                  </p>
                </div>

                {/* Requirements */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Requirements
                  </p>
                  <ul className="space-y-2">
                    {provider.authMethod === 'oauth2' ? (
                      <>
                        <li className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                          <Check className="w-4 h-4 text-blue-500" />
                          Admin or authorized user access to {provider.name}
                        </li>
                        <li className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                          <Check className="w-4 h-4 text-blue-500" />
                          Permission to authorize third-party apps
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                          <Check className="w-4 h-4 text-blue-500" />
                          API key with read permissions
                        </li>
                        {['bamboohr', 'jamf', 'kandji', 'okta'].includes(provider.id) && (
                          <li className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                            <Check className="w-4 h-4 text-blue-500" />
                            Your {provider.name} domain/subdomain
                          </li>
                        )}
                      </>
                    )}
                  </ul>
                </div>

                {/* What we'll access */}
                <div className="p-4 bg-slate-50 dark:bg-midnight-900 rounded-xl">
                  <p className="text-sm font-medium text-slate-700 dark:text-steel-300 mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Data we'll read (read-only access)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(provider.requiredPermissions || provider.scopes || []).slice(0, 5).map((perm, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-white dark:bg-steel-800 text-slate-700 dark:text-steel-300 text-xs rounded-lg border border-slate-200 dark:border-steel-700"
                      >
                        {perm.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Controls that will be automated */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Controls that will be automated
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {controls.slice(0, 4).map((control) => (
                      <span
                        key={control}
                        className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg"
                      >
                        {control}
                      </span>
                    ))}
                    {controls.length > 4 && (
                      <span className="px-2.5 py-1 text-emerald-600 dark:text-emerald-400 text-xs">
                        +{controls.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Configuration */}
            {step === 'configuration' && (
              <motion.div
                key="configuration"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {provider.authMethod === 'api_key' ? (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100 mb-2">
                        Enter your credentials
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-steel-400">
                        Your API key will be encrypted and stored securely.
                      </p>
                    </div>

                    {provider.apiKeyUrl && (
                      <a
                        href={provider.apiKeyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span className="text-sm font-medium">Generate API Key in {provider.name}</span>
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </a>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
                        API Key
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-steel-700 rounded-xl bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Enter your API key"
                        />
                      </div>
                    </div>

                    {['bamboohr', 'jamf', 'kandji', 'crowdstrike'].includes(provider.id) && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
                          Domain / Subdomain
                        </label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-steel-700 rounded-xl bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="your-company"
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">
                          e.g., "acme" from acme.{provider.name.toLowerCase()}.com
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100 mb-2">
                        Ready to connect
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-steel-400">
                        You'll be redirected to {provider.name} to authorize access. We only request read-only permissions.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-midnight-900 rounded-xl">
                      <p className="text-sm font-medium text-slate-700 dark:text-steel-300 mb-3">
                        Permissions requested:
                      </p>
                      <ul className="space-y-2">
                        {(provider.scopes || []).map((scope, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-steel-400">
                            <Check className="w-4 h-4 text-emerald-500" />
                            {scope.replace(/[._:]/g, ' ').replace(/read/gi, 'Read')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Step 3: Authentication */}
            {step === 'authentication' && (
              <motion.div
                key="authentication"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center py-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${categoryMeta.color} flex items-center justify-center text-white mx-auto mb-4`}>
                    {categoryMeta.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100 mb-2">
                    {provider.authMethod === 'oauth2' ? 'Authorize Access' : 'Verify Connection'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-steel-400">
                    {provider.authMethod === 'oauth2'
                      ? `Click below to securely connect your ${provider.name} account.`
                      : 'We will test your API key and establish the connection.'}
                  </p>
                </div>

                {provider.authMethod === 'oauth2' ? (
                  integrationHub.isOAuthConfigured(provider.id) ? (
                    <button
                      onClick={handleOAuthConnect}
                      className={`w-full px-6 py-4 bg-gradient-to-r ${categoryMeta.color} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2`}
                    >
                      <ExternalLink className="w-5 h-5" />
                      Connect with {provider.name}
                    </button>
                  ) : (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            OAuth Not Configured
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            Contact your administrator to configure {provider.name} OAuth credentials.
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <button
                    onClick={handleApiKeyConnect}
                    disabled={connecting || !apiKey}
                    className={`w-full px-6 py-4 bg-gradient-to-r ${categoryMeta.color} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {connecting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Link2 className="w-5 h-5" />
                        Connect & Start Monitoring
                      </>
                    )}
                  </button>
                )}
              </motion.div>
            )}

            {/* Syncing State */}
            {step === 'syncing' && (
              <motion.div
                key="syncing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="relative mx-auto w-20 h-20 mb-6">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-emerald-500/20"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${categoryMeta.color} flex items-center justify-center text-white`}>
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100 mb-2">
                  Initial Sync in Progress
                </h3>
                <p className="text-sm text-slate-600 dark:text-steel-400">
                  Pulling compliance data from {provider.name}...
                </p>
                <div className="mt-4 w-48 mx-auto">
                  <div className="h-2 bg-slate-200 dark:bg-steel-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        {step !== 'syncing' && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-steel-700 flex items-center justify-between">
            <div>
              {step !== 'prerequisites' && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-slate-600 dark:text-steel-400 hover:text-slate-900 dark:hover:text-steel-100 transition-colors"
                >
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <a
                href={provider.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                Documentation
                <ExternalLink className="w-3 h-3" />
              </a>
              {step !== 'authentication' && (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// CONNECTION SETTINGS MODAL
// ============================================================================

const ConnectionSettingsModal: React.FC<{
  connection: IntegrationConnection;
  onClose: () => void;
  onDisconnect: () => void;
  onSync: () => Promise<{ success: boolean }>;
  onUpdate: () => void;
}> = ({ connection, onClose, onDisconnect, onSync, onUpdate }) => {
  const [syncing, setSyncing] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(connection.settings.syncEnabled);
  const [syncInterval, setSyncInterval] = useState(connection.settings.syncIntervalMinutes);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'logs'>('overview');

  const provider = INTEGRATION_PROVIDERS.find((p) => p.id === connection.providerId);
  const categoryMeta = provider ? CATEGORY_META[provider.category] : null;
  const statusConfig = STATUS_CONFIG[connection.status];
  const controls = provider ? CONTROL_MAPPINGS[provider.category] : [];

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-2xl bg-white dark:bg-midnight-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${categoryMeta?.color || 'from-indigo-500 to-purple-600'} px-6 py-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                {categoryMeta?.icon}
              </div>
              <div className="text-white">
                <h2 className="text-lg font-semibold">{connection.providerName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/20`}>
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                  {connection.status === 'connected' && (
                    <span className="text-xs text-white/80">
                      Continuous Monitoring Active
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-steel-700">
          <div className="flex gap-4 px-6">
            {(['overview', 'settings', 'logs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 dark:text-steel-400 hover:text-slate-700 dark:hover:text-steel-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Error Alert */}
              {connection.status === 'error' && connection.lastSyncError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Sync Error
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        {connection.lastSyncError}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sync Status */}
              <div className="p-4 bg-slate-50 dark:bg-midnight-900 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-steel-300">
                      Last Sync
                    </p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-steel-100">
                      {connection.lastSyncAt ? formatRelativeTime(connection.lastSyncAt) : 'Never'}
                    </p>
                  </div>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
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

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-steel-800">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-steel-400">Status</p>
                    <p className={`text-sm font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-steel-400">Interval</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-steel-100">
                      Every {syncInterval} min
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-steel-400">Auto-sync</p>
                    <p className={`text-sm font-medium ${syncEnabled ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {syncEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Automated Controls */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-steel-300 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  Automated Compliance Controls
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {controls.map((control) => (
                    <div
                      key={control}
                      className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-emerald-700 dark:text-emerald-300">{control}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connection Details */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-steel-300 mb-3">
                  Connection Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-steel-800">
                    <span className="text-slate-500 dark:text-steel-400">Connected</span>
                    <span className="text-slate-900 dark:text-steel-100">
                      {new Date(connection.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-steel-800">
                    <span className="text-slate-500 dark:text-steel-400">Auth Type</span>
                    <span className="text-slate-900 dark:text-steel-100 capitalize">
                      {connection.authMethod.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500 dark:text-steel-400">Category</span>
                    <span className="text-slate-900 dark:text-steel-100">
                      {categoryMeta?.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-midnight-900 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-steel-300">
                    Auto-sync enabled
                  </p>
                  <p className="text-xs text-slate-500 dark:text-steel-400 mt-1">
                    Automatically sync data at the configured interval
                  </p>
                </div>
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
                <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
                  Sync Interval
                </label>
                <select
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-steel-700 rounded-xl bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Save Settings
              </button>

              <div className="pt-6 border-t border-slate-200 dark:border-steel-700">
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">
                  Danger Zone
                </h4>
                <button
                  onClick={onDisconnect}
                  className="w-full px-4 py-3 border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Unlink className="w-4 h-4" />
                  Disconnect Integration
                </button>
                <p className="text-xs text-slate-500 dark:text-steel-400 mt-2 text-center">
                  This will stop continuous monitoring for this integration
                </p>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-steel-400">
                Recent sync activity for this integration.
              </p>
              {/* Placeholder for logs - would be populated from webhook_events or sync logs */}
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-midnight-900 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-steel-600'}`} />
                    <div className="flex-1">
                      <p className="text-sm text-slate-700 dark:text-steel-300">
                        {i === 0 ? 'Sync completed successfully' : 'Scheduled sync'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-steel-400">
                        {i === 0 ? '5 minutes ago' : `${(i + 1) * 15} minutes ago`}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {i === 0 ? '12 records' : `${Math.floor(Math.random() * 20)} records`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
