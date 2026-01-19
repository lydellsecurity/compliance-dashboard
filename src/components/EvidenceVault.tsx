/**
 * Evidence Vault - Cutting-Edge Autonomous Artifact Management
 *
 * Corporate Light Mode UI with:
 * - Bento Grid Dashboard (Integrity, Storage Health, Activity)
 * - Grid/List View Toggle
 * - Drag-and-Drop Dropzone with Progress
 * - Inline File Preview (PDF.js, images)
 * - Version Control with Archive/Restore
 * - Freshness Indicators & Expiration Warnings
 * - Automated Evidence Collection UI
 * - Immutable Audit Log Viewer
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, Upload, Search, Filter, File, FileText, Image,
  FileJson, Clock, CheckCircle, AlertCircle, Trash2, Plus,
  RefreshCw, Shield, Cloud, Settings, X,
  Check, ExternalLink, Paperclip, Download, Eye,
  Grid3X3, List, AlertTriangle, Archive, RotateCcw, Zap,
  Lock, ShieldCheck, Activity, BarChart3, Timer,
  Wifi, WifiOff, Loader2, Package, ChevronRight,
  Link2, Unlink, Hash, Github, Database,
} from 'lucide-react';
import {
  evidenceVault,
  type VaultEvidenceItem,
  type SmartArtifact,
  type EvidenceType,
  type EvidenceSource,
  type FreshnessStatus,
  type IntegrityStatus,
  type VaultHealthMetrics,
  type AuditLogEntry,
  type IntegrationConnection,
} from '../services/evidence-vault.service';
import type { EvidenceStatus } from '../lib/database.types';

// ============================================================================
// TYPES
// ============================================================================

interface EvidenceVaultProps {
  organizationId: string;
  userId: string;
  userName?: string;
  controlFilter?: string;
  onEvidenceSelect?: (evidence: VaultEvidenceItem) => void;
}

type ViewMode = 'grid' | 'list';
type DashboardTab = 'overview' | 'evidence' | 'integrations' | 'audit';

// ============================================================================
// CONSTANTS
// ============================================================================

const EVIDENCE_TYPE_ICONS: Record<EvidenceType, React.ReactNode> = {
  document: <FileText className="w-4 h-4" />,
  screenshot: <Image className="w-4 h-4" />,
  log: <FileJson className="w-4 h-4" />,
  configuration: <Settings className="w-4 h-4" />,
  report: <BarChart3 className="w-4 h-4" />,
  policy: <Shield className="w-4 h-4" />,
  certificate: <CheckCircle className="w-4 h-4" />,
  assessment: <FileText className="w-4 h-4" />,
  automated: <Zap className="w-4 h-4" />,
};

const EVIDENCE_SOURCE_ICONS: Record<EvidenceSource, React.ReactNode> = {
  manual: <Upload className="w-4 h-4" />,
  aws: <Cloud className="w-4 h-4" />,
  azure: <Cloud className="w-4 h-4" />,
  gcp: <Cloud className="w-4 h-4" />,
  okta: <Shield className="w-4 h-4" />,
  github: <Github className="w-4 h-4" />,
  jira: <FileText className="w-4 h-4" />,
  automated_scan: <Zap className="w-4 h-4" />,
};

const STATUS_STYLES: Record<EvidenceStatus, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  review: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  final: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const FRESHNESS_STYLES: Record<FreshnessStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  fresh: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  expiring_soon: { bg: 'bg-amber-50', text: 'text-amber-700', icon: <Timer className="w-3.5 h-3.5" /> },
  stale: { bg: 'bg-orange-50', text: 'text-orange-700', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  expired: { bg: 'bg-red-50', text: 'text-red-700', icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

// Note: INTEGRITY_STYLES will be used when file integrity UI is expanded
const _INTEGRITY_STYLES: Record<IntegrityStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  verified: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  corrupted: { bg: 'bg-red-50', text: 'text-red-700', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  missing: { bg: 'bg-orange-50', text: 'text-orange-700', icon: <Unlink className="w-3.5 h-3.5" /> },
  unchecked: { bg: 'bg-slate-50', text: 'text-slate-600', icon: <Clock className="w-3.5 h-3.5" /> },
};
void _INTEGRITY_STYLES;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EvidenceVault: React.FC<EvidenceVaultProps> = ({
  organizationId,
  userId,
  userName,
  controlFilter,
  onEvidenceSelect,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [evidence, setEvidence] = useState<VaultEvidenceItem[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<VaultHealthMetrics | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<EvidenceType | ''>('');
  const [filterStatus, setFilterStatus] = useState<EvidenceStatus | ''>('');
  const [filterFreshness, setFilterFreshness] = useState<FreshnessStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<VaultEvidenceItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Initialize service and load data
  useEffect(() => {
    const init = async () => {
      evidenceVault.setContext(organizationId, userId, userName);
      setLoading(true);

      try {
        // Load evidence
        const params: Parameters<typeof evidenceVault.searchEvidence>[0] = { limit: 100 };
        if (controlFilter) params.controlId = controlFilter;
        if (searchText) params.searchText = searchText;
        if (filterType) params.type = filterType;
        if (filterStatus) params.status = filterStatus;
        if (filterFreshness) params.freshnessStatus = filterFreshness;

        const [evidenceData, metrics, logData, integrationsData] = await Promise.all([
          evidenceVault.searchEvidence(params),
          evidenceVault.getVaultHealth(),
          evidenceVault.getAuditLog({ limit: 50 }),
          evidenceVault.getIntegrationConnections(),
        ]);

        setEvidence(evidenceData);
        setHealthMetrics(metrics);
        setAuditLog(logData);
        setIntegrations(integrationsData);
      } catch (error) {
        console.error('[EvidenceVault] Failed to load:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [organizationId, userId, userName, controlFilter, searchText, filterType, filterStatus, filterFreshness]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const params: Parameters<typeof evidenceVault.searchEvidence>[0] = { limit: 100 };
      if (controlFilter) params.controlId = controlFilter;
      if (searchText) params.searchText = searchText;
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (filterFreshness) params.freshnessStatus = filterFreshness;

      const [evidenceData, metrics] = await Promise.all([
        evidenceVault.searchEvidence(params),
        evidenceVault.getVaultHealth(),
      ]);

      setEvidence(evidenceData);
      setHealthMetrics(metrics);
    } finally {
      setRefreshing(false);
    }
  }, [controlFilter, searchText, filterType, filterStatus, filterFreshness]);

  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      setShowUploadModal(true);
    }
  }, []);

  const handleEvidenceClick = useCallback((item: VaultEvidenceItem) => {
    setSelectedEvidence(item);
    setShowDetailDrawer(true);
    onEvidenceSelect?.(item);
    evidenceVault.logView(item.id, item.title);
  }, [onEvidenceSelect]);

  return (
    <div
      className="h-full flex flex-col bg-slate-50"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Evidence Vault</h1>
              <p className="text-sm text-slate-500">Autonomous artifact lifecycle management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Evidence
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {(['overview', 'evidence', 'integrations', 'audit'] as DashboardTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && healthMetrics && (
              <BentoGridDashboard metrics={healthMetrics} onNavigate={setActiveTab} />
            )}

            {activeTab === 'evidence' && (
              <EvidenceListView
                evidence={evidence}
                viewMode={viewMode}
                searchText={searchText}
                filterType={filterType}
                filterStatus={filterStatus}
                filterFreshness={filterFreshness}
                showFilters={showFilters}
                onSearchChange={setSearchText}
                onFilterTypeChange={setFilterType}
                onFilterStatusChange={setFilterStatus}
                onFilterFreshnessChange={setFilterFreshness}
                onToggleFilters={() => setShowFilters(!showFilters)}
                onViewModeChange={setViewMode}
                onEvidenceClick={handleEvidenceClick}
                onAddEvidence={() => setShowUploadModal(true)}
              />
            )}

            {activeTab === 'integrations' && (
              <IntegrationsView integrations={integrations} onSync={handleRefresh} />
            )}

            {activeTab === 'audit' && (
              <AuditLogView entries={auditLog} />
            )}
          </>
        )}
      </div>

      {/* Drag Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-indigo-500/10 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-2xl p-8 shadow-2xl border-2 border-dashed border-indigo-500"
            >
              <Upload className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
              <p className="text-xl font-semibold text-slate-900">Drop files to upload</p>
              <p className="text-slate-500 mt-2">Files will be added as new evidence</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadModal
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              setShowUploadModal(false);
              handleRefresh();
            }}
          />
        )}
      </AnimatePresence>

      {/* Detail Drawer */}
      <AnimatePresence>
        {showDetailDrawer && selectedEvidence && (
          <EvidenceDetailDrawer
            evidence={selectedEvidence}
            onClose={() => {
              setShowDetailDrawer(false);
              setSelectedEvidence(null);
            }}
            onUpdate={handleRefresh}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// BENTO GRID DASHBOARD
// ============================================================================

const BentoGridDashboard: React.FC<{
  metrics: VaultHealthMetrics;
  onNavigate: (tab: DashboardTab) => void;
}> = ({ metrics, onNavigate }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Integrity Status - Large Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Integrity Status</h3>
            <p className="text-3xl font-bold text-slate-900 mt-1">{metrics.integrityPercentage}%</p>
            <p className="text-sm text-slate-500 mt-1">Files verified as authentic</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-emerald-50 rounded-xl">
            <p className="text-2xl font-bold text-emerald-700">{metrics.verifiedFiles}</p>
            <p className="text-xs text-emerald-600">Verified</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-xl">
            <p className="text-2xl font-bold text-red-700">{metrics.corruptedFiles}</p>
            <p className="text-xs text-red-600">Corrupted</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-xl">
            <p className="text-2xl font-bold text-orange-700">{metrics.missingFiles}</p>
            <p className="text-xs text-orange-600">Missing</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-xl">
            <p className="text-2xl font-bold text-slate-700">{metrics.uncheckedFiles}</p>
            <p className="text-xs text-slate-600">Unchecked</p>
          </div>
        </div>
      </motion.div>

      {/* Storage Health */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Storage Health</h3>
            <p className="text-3xl font-bold text-slate-900 mt-1">{metrics.coveragePercentage}%</p>
            <p className="text-sm text-slate-500 mt-1">Requirements with current evidence</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Database className="w-6 h-6 text-indigo-600" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-emerald-50 rounded-xl">
            <p className="text-2xl font-bold text-emerald-700">{metrics.freshEvidence}</p>
            <p className="text-xs text-emerald-600">Fresh</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-xl">
            <p className="text-2xl font-bold text-amber-700">{metrics.expiringSoonEvidence}</p>
            <p className="text-xs text-amber-600">Expiring Soon</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-xl">
            <p className="text-2xl font-bold text-orange-700">{metrics.staleEvidence}</p>
            <p className="text-xs text-orange-600">Stale</p>
          </div>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors"
        onClick={() => onNavigate('audit')}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </div>
        <h3 className="text-sm font-medium text-slate-500">Recent Uploads</h3>
        <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.recentUploads}</p>
        <p className="text-xs text-slate-500">Last 7 days</p>
      </motion.div>

      {/* Pending Reviews */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors"
        onClick={() => onNavigate('evidence')}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </div>
        <h3 className="text-sm font-medium text-slate-500">Pending Review</h3>
        <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.pendingReviews}</p>
        <p className="text-xs text-slate-500">Awaiting approval</p>
      </motion.div>

      {/* Approved This Month */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        <h3 className="text-sm font-medium text-slate-500">Approved</h3>
        <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.approvedThisMonth}</p>
        <p className="text-xs text-slate-500">This month</p>
      </motion.div>

      {/* Total Files */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-slate-600" />
          </div>
        </div>
        <h3 className="text-sm font-medium text-slate-500">Total Files</h3>
        <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalFiles}</p>
        <p className="text-xs text-slate-500">In vault</p>
      </motion.div>

      {/* Framework Coverage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
      >
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-4">Framework Coverage</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metrics.frameworkCoverage.map((fw) => (
            <div key={fw.frameworkId} className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke={fw.color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(fw.percentage / 100) * 226} 226`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-900">{fw.percentage}%</span>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-700">{fw.frameworkName}</p>
              <p className="text-xs text-slate-500">{fw.coveredClauses}/{fw.totalClauses}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// EVIDENCE LIST VIEW
// ============================================================================

const EvidenceListView: React.FC<{
  evidence: VaultEvidenceItem[];
  viewMode: ViewMode;
  searchText: string;
  filterType: EvidenceType | '';
  filterStatus: EvidenceStatus | '';
  filterFreshness: FreshnessStatus | '';
  showFilters: boolean;
  onSearchChange: (value: string) => void;
  onFilterTypeChange: (value: EvidenceType | '') => void;
  onFilterStatusChange: (value: EvidenceStatus | '') => void;
  onFilterFreshnessChange: (value: FreshnessStatus | '') => void;
  onToggleFilters: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onEvidenceClick: (evidence: VaultEvidenceItem) => void;
  onAddEvidence: () => void;
}> = ({
  evidence,
  viewMode,
  searchText,
  filterType,
  filterStatus,
  filterFreshness,
  showFilters,
  onSearchChange,
  onFilterTypeChange,
  onFilterStatusChange,
  onFilterFreshnessChange,
  onToggleFilters,
  onViewModeChange,
  onEvidenceClick,
  onAddEvidence,
}) => {
  const hasFilters = filterType || filterStatus || filterFreshness;

  return (
    <div className="space-y-4">
      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search evidence..."
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleFilters}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-colors ${
              showFilters || hasFilters
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasFilters && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
          </button>

          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2.5 transition-colors ${
                viewMode === 'grid' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2.5 transition-colors ${
                viewMode === 'list' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => onFilterTypeChange(e.target.value as EvidenceType | '')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                  >
                    <option value="">All Types</option>
                    <option value="document">Document</option>
                    <option value="screenshot">Screenshot</option>
                    <option value="log">Log</option>
                    <option value="configuration">Configuration</option>
                    <option value="report">Report</option>
                    <option value="policy">Policy</option>
                    <option value="certificate">Certificate</option>
                    <option value="automated">Automated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => onFilterStatusChange(e.target.value as EvidenceStatus | '')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                  >
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="review">In Review</option>
                    <option value="final">Approved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Freshness</label>
                  <select
                    value={filterFreshness}
                    onChange={(e) => onFilterFreshnessChange(e.target.value as FreshnessStatus | '')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                  >
                    <option value="">All</option>
                    <option value="fresh">Fresh</option>
                    <option value="expiring_soon">Expiring Soon</option>
                    <option value="stale">Stale</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    onFilterTypeChange('');
                    onFilterStatusChange('');
                    onFilterFreshnessChange('');
                  }}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Evidence Grid/List */}
      {evidence.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <FolderOpen className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No evidence found</p>
          <p className="text-sm mt-1">Upload files or apply different filters</p>
          <button
            onClick={onAddEvidence}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Add Evidence
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {evidence.map((item) => (
            <EvidenceGridCard key={item.id} evidence={item} onClick={() => onEvidenceClick(item)} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Evidence</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Control</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Freshness</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Files</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {evidence.map((item) => (
                <EvidenceListRow key={item.id} evidence={item} onClick={() => onEvidenceClick(item)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EVIDENCE CARDS
// ============================================================================

const EvidenceGridCard: React.FC<{
  evidence: VaultEvidenceItem;
  onClick: () => void;
}> = ({ evidence, onClick }) => {
  const statusStyle = STATUS_STYLES[evidence.status];
  const freshnessStyle = FRESHNESS_STYLES[evidence.freshnessStatus];
  const currentVersion = evidence.versions.find(v => v.version === evidence.currentVersion);
  const fileCount = currentVersion?.files?.length || 0;

  // Get thumbnail if available
  const thumbnailFile = currentVersion?.files?.find(f =>
    f.mimeType.startsWith('image/') || f.mimeType === 'application/pdf'
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer overflow-hidden"
    >
      {/* Thumbnail */}
      {thumbnailFile?.mimeType.startsWith('image/') && (
        <div className="h-32 bg-slate-100 overflow-hidden">
          <img
            src={thumbnailFile.url}
            alt={thumbnailFile.originalName}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              {EVIDENCE_TYPE_ICONS[evidence.type]}
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-slate-900 truncate">{evidence.title}</h3>
              <p className="text-xs text-slate-500">{evidence.controlId}</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-600 line-clamp-2 mb-3">{evidence.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
            {evidence.status === 'final' ? 'Approved' : evidence.status === 'review' ? 'In Review' : 'Draft'}
          </span>
          <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${freshnessStyle.bg} ${freshnessStyle.text}`}>
            {freshnessStyle.icon}
            {evidence.freshnessStatus === 'expiring_soon' ? 'Expiring' : evidence.freshnessStatus}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Paperclip className="w-3 h-3" />
            {fileCount} file{fileCount !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            {EVIDENCE_SOURCE_ICONS[evidence.source]}
            {evidence.source}
          </div>
        </div>

        {/* Framework Pills */}
        {evidence.frameworkMappings.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {evidence.frameworkMappings.slice(0, 3).map((m) => (
              <span
                key={`${m.frameworkId}-${m.clauseId}`}
                className="px-1.5 py-0.5 text-[10px] font-medium rounded"
                style={{ backgroundColor: `${m.color}15`, color: m.color }}
              >
                {m.frameworkId}
              </span>
            ))}
            {evidence.frameworkMappings.length > 3 && (
              <span className="px-1.5 py-0.5 text-[10px] text-slate-500">
                +{evidence.frameworkMappings.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const EvidenceListRow: React.FC<{
  evidence: VaultEvidenceItem;
  onClick: () => void;
}> = ({ evidence, onClick }) => {
  const statusStyle = STATUS_STYLES[evidence.status];
  const freshnessStyle = FRESHNESS_STYLES[evidence.freshnessStatus];
  const currentVersion = evidence.versions.find(v => v.version === evidence.currentVersion);
  const fileCount = currentVersion?.files?.length || 0;

  return (
    <tr
      onClick={onClick}
      className="hover:bg-slate-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
            {EVIDENCE_TYPE_ICONS[evidence.type]}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{evidence.title}</p>
            <p className="text-xs text-slate-500 truncate">{evidence.description}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="px-2 py-1 text-xs font-mono bg-slate-100 text-slate-700 rounded">
          {evidence.controlId}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
          {evidence.status === 'final' ? 'Approved' : evidence.status === 'review' ? 'In Review' : 'Draft'}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full w-fit ${freshnessStyle.bg} ${freshnessStyle.text}`}>
          {freshnessStyle.icon}
          {evidence.freshnessStatus}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-sm text-slate-600">
          <Paperclip className="w-3.5 h-3.5" />
          {fileCount}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">
        {new Date(evidence.updatedAt).toLocaleDateString()}
      </td>
    </tr>
  );
};

// ============================================================================
// INTEGRATIONS VIEW
// ============================================================================

const IntegrationsView: React.FC<{
  integrations: IntegrationConnection[];
  onSync: () => void;
}> = ({ integrations, onSync: _onSync }) => {
  // Note: onSync will be used when integration sync is implemented
  void _onSync;
  const availableIntegrations = [
    { id: 'aws', name: 'Amazon Web Services', icon: <Cloud className="w-6 h-6" />, description: 'Connect AWS Security Hub, Config, IAM' },
    { id: 'azure', name: 'Microsoft Azure', icon: <Cloud className="w-6 h-6" />, description: 'Connect Azure Security Center, AD' },
    { id: 'gcp', name: 'Google Cloud', icon: <Cloud className="w-6 h-6" />, description: 'Connect GCP Security Command Center' },
    { id: 'github', name: 'GitHub', icon: <Github className="w-6 h-6" />, description: 'Verify repository security settings' },
    { id: 'okta', name: 'Okta', icon: <Shield className="w-6 h-6" />, description: 'Verify SSO and MFA configurations' },
  ];

  const connectedIds = new Set(integrations.map(i => i.provider));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Automated Evidence Collection</h2>
            <p className="text-indigo-100 text-sm">
              Connect your cloud providers to automatically collect and verify compliance evidence
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableIntegrations.map((integration) => {
          const connected = connectedIds.has(integration.id as EvidenceSource);
          const connection = integrations.find(i => i.provider === integration.id);

          return (
            <div
              key={integration.id}
              className={`bg-white rounded-xl border p-5 transition-all ${
                connected ? 'border-emerald-200' : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
                  {integration.icon}
                </div>
                {connected ? (
                  <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                    <Wifi className="w-3 h-3" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                    <WifiOff className="w-3 h-3" />
                    Not Connected
                  </span>
                )}
              </div>

              <h3 className="font-semibold text-slate-900">{integration.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{integration.description}</p>

              {connection && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-slate-500">Evidence</p>
                      <p className="font-medium text-slate-900">{connection.evidenceCount}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Controls</p>
                      <p className="font-medium text-slate-900">{connection.controlsMapped}</p>
                    </div>
                  </div>
                  {connection.lastSyncAt && (
                    <p className="text-xs text-slate-400 mt-2">
                      Last synced: {new Date(connection.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              <button
                className={`w-full mt-4 py-2 px-4 rounded-lg font-medium transition-colors ${
                  connected
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {connected ? 'Manage Connection' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// AUDIT LOG VIEW
// ============================================================================

const AuditLogView: React.FC<{
  entries: AuditLogEntry[];
}> = ({ entries }) => {
  const actionIcons: Record<AuditLogEntry['action'], React.ReactNode> = {
    view: <Eye className="w-4 h-4" />,
    download: <Download className="w-4 h-4" />,
    upload: <Upload className="w-4 h-4" />,
    delete: <Trash2 className="w-4 h-4" />,
    approve: <Check className="w-4 h-4" />,
    reject: <X className="w-4 h-4" />,
    archive: <Archive className="w-4 h-4" />,
    restore: <RotateCcw className="w-4 h-4" />,
    export: <Package className="w-4 h-4" />,
  };

  const actionColors: Record<AuditLogEntry['action'], string> = {
    view: 'bg-slate-100 text-slate-600',
    download: 'bg-blue-100 text-blue-600',
    upload: 'bg-emerald-100 text-emerald-600',
    delete: 'bg-red-100 text-red-600',
    approve: 'bg-emerald-100 text-emerald-600',
    reject: 'bg-amber-100 text-amber-600',
    archive: 'bg-slate-100 text-slate-600',
    restore: 'bg-indigo-100 text-indigo-600',
    export: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Audit Log</h2>
        <button className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
          <Download className="w-4 h-4" />
          Export Log
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {entries.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No audit log entries yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <div key={entry.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${actionColors[entry.action]}`}>
                    {actionIcons[entry.action]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{entry.userName}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600">{entry.action}</span>
                      <span className="px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                        {entry.resourceType}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5 truncate">{entry.resourceName}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// UPLOAD MODAL
// ============================================================================

const UploadModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [controlId, setControlId] = useState('');
  const [type, setType] = useState<EvidenceType>('document');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !controlId.trim()) return;

    setUploading(true);
    try {
      const result = await evidenceVault.createEvidence({
        controlId: controlId.trim(),
        title: title.trim(),
        description: description.trim(),
        type,
      });

      if (!result.success) {
        alert(result.error || 'Failed to create evidence');
        setUploading(false);
        return;
      }

      if (result.evidenceId && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

          const uploadResult = await evidenceVault.uploadFile(result.evidenceId!, file);
          if (uploadResult.success) {
            setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          }
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('An error occurred while uploading.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add Evidence</h2>
            <p className="text-sm text-slate-500">Upload files to the secure vault</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., SOC 2 Type II Report 2024"
              required
            />
          </div>

          {/* Control ID */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Control ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={controlId}
              onChange={(e) => setControlId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., AC-001"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Describe this evidence..."
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EvidenceType)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="document">Document</option>
              <option value="screenshot">Screenshot</option>
              <option value="log">Log</option>
              <option value="configuration">Configuration</option>
              <option value="report">Report</option>
              <option value="policy">Policy</option>
              <option value="certificate">Certificate</option>
            </select>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`} />
            <label
              htmlFor="file-upload"
              className="cursor-pointer"
            >
              <span className="text-indigo-600 font-medium hover:underline">Click to upload</span>
              <span className="text-slate-500"> or drag and drop</span>
            </label>
            <p className="text-xs text-slate-400 mt-2">PDF, images, documents up to 10MB each</p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-white rounded-lg text-slate-500">
                      {file.type.startsWith('image/') ? (
                        <Image className="w-4 h-4" />
                      ) : file.type === 'application/pdf' ? (
                        <FileText className="w-4 h-4" />
                      ) : (
                        <File className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadProgress[file.name] !== undefined && (
                      uploadProgress[file.name] === 100 ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                      )
                    )}
                    {!uploading && (
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !title.trim() || !controlId.trim()}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
            >
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploading ? 'Uploading...' : 'Add Evidence'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// EVIDENCE DETAIL DRAWER
// ============================================================================

const EvidenceDetailDrawer: React.FC<{
  evidence: VaultEvidenceItem;
  onClose: () => void;
  onUpdate: () => void;
}> = ({ evidence, onClose, onUpdate: _onUpdate }) => {
  // Note: onUpdate will be used when edit functionality is implemented
  void _onUpdate;
  const [activeSection, setActiveSection] = useState<'files' | 'history' | 'frameworks'>('files');
  const [previewFile, setPreviewFile] = useState<SmartArtifact | null>(null);

  const currentVersion = evidence.versions.find(v => v.version === evidence.currentVersion);
  const _archivedVersions = evidence.versions.filter(v => v.isArchived);
  void _archivedVersions; // For future archive tab implementation
  const statusStyle = STATUS_STYLES[evidence.status];
  const freshnessStyle = FRESHNESS_STYLES[evidence.freshnessStatus];

  const handleDownload = async (file: SmartArtifact) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      evidenceVault.logDownload(file.id, file.originalName, evidence.id);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600">
                {EVIDENCE_TYPE_ICONS[evidence.type]}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{evidence.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 text-xs font-mono bg-slate-100 text-slate-600 rounded">
                    {evidence.controlId}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                    {evidence.status === 'final' ? 'Approved' : evidence.status === 'review' ? 'In Review' : 'Draft'}
                  </span>
                  <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${freshnessStyle.bg} ${freshnessStyle.text}`}>
                    {freshnessStyle.icon}
                    {evidence.freshnessStatus}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-slate-600 mt-4">{evidence.description}</p>

          {/* Section Tabs */}
          <div className="flex items-center gap-1 mt-4">
            {(['files', 'history', 'frameworks'] as const).map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activeSection === section
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeSection === 'files' && currentVersion && (
            <div className="space-y-3">
              {currentVersion.files.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No files attached</p>
                </div>
              ) : (
                currentVersion.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-white rounded-lg text-slate-500 border border-slate-200">
                        {file.mimeType.startsWith('image/') ? (
                          <Image className="w-5 h-5" />
                        ) : file.mimeType === 'application/pdf' ? (
                          <FileText className="w-5 h-5" />
                        ) : (
                          <File className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{file.originalName}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{(file.size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                          {file.sha256Hash && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                {file.sha256Hash.slice(0, 8)}...
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {(file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf') && (
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-white transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(file)}
                        className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-white transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeSection === 'history' && (
            <div className="space-y-4">
              {evidence.versions.map((version) => (
                <div
                  key={version.id}
                  className={`p-4 rounded-xl border ${
                    version.version === evidence.currentVersion
                      ? 'border-indigo-200 bg-indigo-50'
                      : version.isArchived
                      ? 'border-slate-200 bg-slate-50'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        Version {version.version}
                      </span>
                      {version.version === evidence.currentVersion && (
                        <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                          Current
                        </span>
                      )}
                      {version.isArchived && (
                        <span className="px-2 py-0.5 text-xs bg-slate-200 text-slate-600 rounded-full">
                          Archived
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(version.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{version.notes}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <Paperclip className="w-3 h-3" />
                    {version.files.length} file{version.files.length !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'frameworks' && (
            <div className="space-y-3">
              {evidence.frameworkMappings.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No framework mappings</p>
                </div>
              ) : (
                evidence.frameworkMappings.map((mapping, index) => (
                  <div
                    key={`${mapping.frameworkId}-${mapping.clauseId}-${index}`}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-1 text-xs font-medium rounded"
                        style={{ backgroundColor: `${mapping.color}15`, color: mapping.color }}
                      >
                        {mapping.frameworkName}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700">{mapping.clauseId}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">{mapping.clauseTitle}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Created {new Date(evidence.createdAt).toLocaleDateString()} •
              Updated {new Date(evidence.updatedAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-white transition-colors">
                Export
              </button>
              {evidence.status === 'draft' && (
                <button className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                  Submit for Review
                </button>
              )}
              {evidence.status === 'review' && (
                <button className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                  Approve
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// FILE PREVIEW MODAL
// ============================================================================

const FilePreviewModal: React.FC<{
  file: SmartArtifact;
  onClose: () => void;
}> = ({ file, onClose }) => {
  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              {isImage ? <Image className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-medium text-slate-900">{file.originalName}</h3>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center">
          {isImage ? (
            <img
              src={file.url}
              alt={file.originalName}
              className="max-w-full max-h-full object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={`${file.url}#toolbar=0`}
              className="w-full h-full min-h-[600px]"
              title={file.originalName}
            />
          ) : (
            <div className="text-center text-slate-500 p-8">
              <File className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Preview not available for this file type</p>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Download className="w-4 h-4" />
                Download File
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EvidenceVault;
