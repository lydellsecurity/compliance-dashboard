/**
 * Evidence Repository Component
 *
 * Comprehensive evidence management interface with:
 * - Evidence listing and search
 * - File upload with drag-and-drop
 * - Version history viewer
 * - Approval workflow
 * - Evidence statistics dashboard
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  Upload,
  Search,
  Filter,
  File,
  FileText,
  Image,
  FileJson,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Plus,
  Calendar,
  RefreshCw,
  Shield,
  Cloud,
  Github,
  Settings,
  History,
  X,
  Check,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import {
  evidenceRepository,
  type EvidenceItem,
  type EvidenceType,
  type EvidenceSource,
  type EvidenceStats,
  type EvidenceSearchParams,
} from '../services/evidence-repository.service';
import type { EvidenceStatus } from '../lib/database.types';

// ============================================================================
// TYPES
// ============================================================================

interface EvidenceRepositoryProps {
  organizationId: string;
  userId: string;
  controlFilter?: string;
  onEvidenceSelect?: (evidence: EvidenceItem) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EVIDENCE_TYPE_ICONS: Record<EvidenceType, React.ReactNode> = {
  document: <FileText className="w-4 h-4" />,
  screenshot: <Image className="w-4 h-4" />,
  log: <FileJson className="w-4 h-4" />,
  configuration: <Settings className="w-4 h-4" />,
  report: <File className="w-4 h-4" />,
  policy: <Shield className="w-4 h-4" />,
  certificate: <CheckCircle className="w-4 h-4" />,
  assessment: <FileText className="w-4 h-4" />,
  automated: <RefreshCw className="w-4 h-4" />,
};

const EVIDENCE_SOURCE_ICONS: Record<EvidenceSource, React.ReactNode> = {
  manual: <Upload className="w-4 h-4" />,
  aws: <Cloud className="w-4 h-4" />,
  azure: <Cloud className="w-4 h-4" />,
  gcp: <Cloud className="w-4 h-4" />,
  okta: <Shield className="w-4 h-4" />,
  github: <Github className="w-4 h-4" />,
  jira: <FileText className="w-4 h-4" />,
  automated_scan: <RefreshCw className="w-4 h-4" />,
};

const STATUS_COLORS: Record<EvidenceStatus, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-slate-100 dark:bg-steel-800', text: 'text-slate-700 dark:text-steel-300', border: 'border-slate-200 dark:border-steel-700' },
  review: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  final: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EvidenceRepository: React.FC<EvidenceRepositoryProps> = ({
  organizationId,
  userId,
  controlFilter,
  onEvidenceSelect,
}) => {
  // State
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [stats, setStats] = useState<EvidenceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<EvidenceType | ''>('');
  const [filterStatus, setFilterStatus] = useState<EvidenceStatus | ''>('');
  const [filterSource, setFilterSource] = useState<EvidenceSource | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [uploadTargetEvidence, setUploadTargetEvidence] = useState<EvidenceItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Initialize service and load evidence
  useEffect(() => {
    const initAndLoad = async () => {
      // Set context first
      console.log('[EvidenceRepo UI] Setting context:', { organizationId, userId });
      evidenceRepository.setContext(organizationId, userId);

      // Then load evidence
      setLoading(true);
      try {
        const params: EvidenceSearchParams = {
          limit: 100,
        };

        if (controlFilter) {
          params.controlId = controlFilter;
        }
        if (searchText) {
          params.searchText = searchText;
        }
        if (filterType) {
          params.type = filterType;
        }
        if (filterStatus) {
          params.status = filterStatus;
        }
        if (filterSource) {
          params.source = filterSource;
        }

        console.log('[EvidenceRepo UI] Loading evidence with params:', params);
        const results = await evidenceRepository.searchEvidence(params);
        console.log('[EvidenceRepo UI] Loaded evidence:', results.length, 'items');
        setEvidence(results);

        // Load stats
        const statsData = await evidenceRepository.getStats();
        setStats(statsData);
      } catch (error) {
        console.error('[EvidenceRepo UI] Failed to load evidence:', error);
      } finally {
        setLoading(false);
      }
    };

    initAndLoad();
  }, [organizationId, userId, controlFilter, searchText, filterType, filterStatus, filterSource]);

  // Reload function for manual refresh
  const loadEvidence = useCallback(async () => {
    evidenceRepository.setContext(organizationId, userId);
    setLoading(true);
    try {
      const params: EvidenceSearchParams = { limit: 100 };
      if (controlFilter) params.controlId = controlFilter;
      if (searchText) params.searchText = searchText;
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (filterSource) params.source = filterSource;

      const results = await evidenceRepository.searchEvidence(params);
      setEvidence(results);
      const statsData = await evidenceRepository.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('[EvidenceRepo UI] Failed to load evidence:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, userId, controlFilter, searchText, filterType, filterStatus, filterSource]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setShowUploadModal(true);
      // Files will be handled by the upload modal
    }
  }, []);

  // Evidence actions
  const handleApprove = async (evidenceId: string) => {
    const success = await evidenceRepository.approveEvidence(evidenceId);
    if (success) {
      await loadEvidence();
    }
  };

  const handleReject = async (evidenceId: string) => {
    const success = await evidenceRepository.rejectEvidence(evidenceId);
    if (success) {
      await loadEvidence();
    }
  };

  const handleDelete = async (evidenceId: string) => {
    if (window.confirm('Are you sure you want to archive this evidence?')) {
      const success = await evidenceRepository.deleteEvidence(evidenceId);
      if (success) {
        await loadEvidence();
        setSelectedEvidence(null);
      }
    }
  };

  return (
    <div
      className="h-full flex flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-steel-100">
            Evidence Repository
          </h2>
          <p className="text-sm text-slate-500 dark:text-steel-400 mt-1">
            Manage compliance evidence with version control and approval workflows
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Evidence
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Evidence"
            value={stats.total}
            icon={<FolderOpen className="w-5 h-5" />}
            color="indigo"
          />
          <StatCard
            label="Pending Review"
            value={stats.pendingReview}
            icon={<Clock className="w-5 h-5" />}
            color="amber"
          />
          <StatCard
            label="Approved"
            value={stats.byStatus.final}
            icon={<CheckCircle className="w-5 h-5" />}
            color="emerald"
          />
          <StatCard
            label="Expiring Soon"
            value={stats.expiringSoon}
            icon={<AlertCircle className="w-5 h-5" />}
            color="red"
          />
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search evidence..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
            showFilters
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
              : 'border-slate-200 dark:border-steel-700 text-slate-600 dark:text-steel-400 hover:bg-slate-50 dark:hover:bg-steel-800'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {(filterType || filterStatus || filterSource) && (
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          )}
        </button>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="p-4 bg-slate-50 dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
                    Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as EvidenceType | '')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
                  >
                    <option value="">All Types</option>
                    <option value="document">Document</option>
                    <option value="screenshot">Screenshot</option>
                    <option value="log">Log</option>
                    <option value="configuration">Configuration</option>
                    <option value="report">Report</option>
                    <option value="policy">Policy</option>
                    <option value="automated">Automated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as EvidenceStatus | '')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
                  >
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="review">In Review</option>
                    <option value="final">Approved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
                    Source
                  </label>
                  <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value as EvidenceSource | '')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
                  >
                    <option value="">All Sources</option>
                    <option value="manual">Manual Upload</option>
                    <option value="aws">AWS</option>
                    <option value="azure">Azure</option>
                    <option value="gcp">GCP</option>
                    <option value="automated_scan">Automated Scan</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    setFilterType('');
                    setFilterStatus('');
                    setFilterSource('');
                  }}
                  className="text-sm text-slate-500 hover:text-slate-700 dark:text-steel-400 dark:hover:text-steel-200"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag & Drop Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-indigo-500/10 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <div className="bg-white dark:bg-midnight-800 rounded-xl p-8 shadow-2xl border-2 border-dashed border-indigo-500">
              <Upload className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-900 dark:text-steel-100">
                Drop files to upload
              </p>
              <p className="text-sm text-slate-500 dark:text-steel-400 mt-1">
                Files will be added as new evidence
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Evidence Grid */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : evidence.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-steel-400">
            <FolderOpen className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No evidence found</p>
            <p className="text-sm mt-1">Upload files or apply different filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {evidence.map((item) => (
              <EvidenceCard
                key={item.id}
                evidence={item}
                onClick={() => {
                  setSelectedEvidence(item);
                  onEvidenceSelect?.(item);
                }}
                onApprove={() => handleApprove(item.id)}
                onReject={() => handleReject(item.id)}
                onDelete={() => handleDelete(item.id)}
                onViewHistory={() => {
                  setSelectedEvidence(item);
                  setShowVersionHistory(true);
                }}
                onUploadFile={() => {
                  setUploadTargetEvidence(item);
                  setShowFileUploadModal(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadModal
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              loadEvidence();
              setShowUploadModal(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Version History Modal */}
      <AnimatePresence>
        {showVersionHistory && selectedEvidence && (
          <VersionHistoryModal
            evidence={selectedEvidence}
            onClose={() => setShowVersionHistory(false)}
          />
        )}
      </AnimatePresence>

      {/* File Upload Modal for existing evidence */}
      <AnimatePresence>
        {showFileUploadModal && uploadTargetEvidence && (
          <FileUploadModal
            evidence={uploadTargetEvidence}
            onClose={() => {
              setShowFileUploadModal(false);
              setUploadTargetEvidence(null);
            }}
            onSuccess={() => {
              loadEvidence();
              setShowFileUploadModal(false);
              setUploadTargetEvidence(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'indigo' | 'amber' | 'emerald' | 'red';
}> = ({ label, value, icon, color }) => {
  const colorClasses = {
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  };

  return (
    <div className="p-4 bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div>
          <p className="text-2xl font-semibold text-slate-900 dark:text-steel-100">{value}</p>
          <p className="text-sm text-slate-500 dark:text-steel-400">{label}</p>
        </div>
      </div>
    </div>
  );
};

const EvidenceCard: React.FC<{
  evidence: EvidenceItem;
  onClick: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
  onUploadFile: () => void;
}> = ({ evidence, onClick, onApprove, onReject, onDelete, onViewHistory, onUploadFile }) => {
  const [showMenu, setShowMenu] = useState(false);
  const statusStyle = STATUS_COLORS[evidence.status];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-100 dark:bg-steel-800 rounded-lg text-slate-600 dark:text-steel-400">
            {EVIDENCE_TYPE_ICONS[evidence.type]}
          </div>
          <div>
            <h3 className="font-medium text-slate-900 dark:text-steel-100 line-clamp-1">
              {evidence.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-steel-400">
              {evidence.controlId}
            </p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:text-steel-500 dark:hover:text-steel-300 rounded"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-midnight-800 rounded-lg shadow-lg border border-slate-200 dark:border-steel-700 py-1 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    onUploadFile();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Files
                </button>
                <button
                  onClick={() => {
                    onViewHistory();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-steel-300 hover:bg-slate-50 dark:hover:bg-steel-800 flex items-center gap-2"
                >
                  <History className="w-4 h-4" />
                  Version History
                </button>
                {evidence.status === 'review' && (
                  <>
                    <button
                      onClick={() => {
                        onApprove();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        onReject();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Archive
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="text-sm text-slate-600 dark:text-steel-400 line-clamp-2 mb-3">
        {evidence.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}
          >
            {evidence.status === 'final' ? 'Approved' : evidence.status === 'review' ? 'In Review' : 'Draft'}
          </span>
          <span className="text-xs text-slate-400 dark:text-steel-500 flex items-center gap-1">
            {EVIDENCE_SOURCE_ICONS[evidence.source]}
            {evidence.source}
          </span>
        </div>
        <span className="text-xs text-slate-400 dark:text-steel-500">
          v{evidence.currentVersion}
        </span>
      </div>

      {evidence.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {evidence.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-steel-800 text-slate-600 dark:text-steel-400 rounded-full"
            >
              {tag}
            </span>
          ))}
          {evidence.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs text-slate-400 dark:text-steel-500">
              +{evidence.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-steel-800">
        <Calendar className="w-3 h-3 text-slate-400" />
        <span className="text-xs text-slate-500 dark:text-steel-400">
          {formatDate(evidence.updatedAt)}
        </span>
      </div>
    </motion.div>
  );
};

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !controlId) return;

    setUploading(true);
    try {
      const result = await evidenceRepository.createEvidence({
        controlId,
        title,
        description,
        type,
      });

      if (result.success && result.evidenceId && files.length > 0) {
        for (const file of files) {
          await evidenceRepository.uploadFile(result.evidenceId, file);
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
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
        className="w-full max-w-lg bg-white dark:bg-midnight-800 rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-steel-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-steel-100">
            Add Evidence
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:text-steel-500 dark:hover:text-steel-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
              placeholder="Evidence title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
              Control ID *
            </label>
            <input
              type="text"
              value={controlId}
              onChange={(e) => setControlId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
              placeholder="e.g., AC-001"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
              placeholder="Describe this evidence..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EvidenceType)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
            >
              <option value="document">Document</option>
              <option value="screenshot">Screenshot</option>
              <option value="log">Log</option>
              <option value="configuration">Configuration</option>
              <option value="report">Report</option>
              <option value="policy">Policy</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
              Files
            </label>
            <div className="border-2 border-dashed border-slate-200 dark:border-steel-700 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-sm text-slate-500 dark:text-steel-400"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <span className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Click to upload
                </span>{' '}
                or drag and drop
              </label>
              {files.length > 0 && (
                <div className="mt-4 text-left">
                  {files.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-slate-600 dark:text-steel-400"
                    >
                      <File className="w-4 h-4" />
                      {file.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-steel-400 hover:bg-slate-100 dark:hover:bg-steel-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !title || !controlId}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {uploading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {uploading ? 'Uploading...' : 'Add Evidence'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const FileUploadModal: React.FC<{
  evidence: EvidenceItem;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ evidence, onClose, onSuccess }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, 'pending' | 'uploading' | 'done' | 'error'>>({});
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      // Initialize progress for new files
      const newProgress: Record<string, 'pending' | 'uploading' | 'done' | 'error'> = {};
      newFiles.forEach(f => { newProgress[f.name] = 'pending'; });
      setUploadProgress(prev => ({ ...prev, ...newProgress }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
    const newProgress: Record<string, 'pending' | 'uploading' | 'done' | 'error'> = {};
    droppedFiles.forEach(f => { newProgress[f.name] = 'pending'; });
    setUploadProgress(prev => ({ ...prev, ...newProgress }));
  };

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.name !== fileName));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const file of files) {
      setUploadProgress(prev => ({ ...prev, [file.name]: 'uploading' }));
      try {
        const result = await evidenceRepository.uploadFile(evidence.id, file, notes || undefined);
        if (result.success) {
          setUploadProgress(prev => ({ ...prev, [file.name]: 'done' }));
          successCount++;
        } else {
          setUploadProgress(prev => ({ ...prev, [file.name]: 'error' }));
        }
      } catch {
        setUploadProgress(prev => ({ ...prev, [file.name]: 'error' }));
      }
    }

    setUploading(false);

    if (successCount > 0) {
      // Small delay to show success state before closing
      setTimeout(() => {
        onSuccess();
      }, 500);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (file.type === 'application/pdf') return <FileText className="w-4 h-4" />;
    if (file.type === 'application/json') return <FileJson className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
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
        className="w-full max-w-lg bg-white dark:bg-midnight-800 rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-steel-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-steel-100">
              Upload Files
            </h2>
            <p className="text-sm text-slate-500 dark:text-steel-400 mt-0.5">
              {evidence.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:text-steel-500 dark:hover:text-steel-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Evidence info */}
          <div className="p-3 bg-slate-50 dark:bg-steel-800/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 text-xs font-mono bg-slate-200 dark:bg-steel-700 text-slate-600 dark:text-steel-300 rounded">
                {evidence.controlId}
              </span>
              <span className="text-slate-500 dark:text-steel-400">•</span>
              <span className="text-slate-600 dark:text-steel-400">Version {evidence.currentVersion}</span>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-slate-200 dark:border-steel-700 hover:border-slate-300 dark:hover:border-steel-600'
            }`}
          >
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="evidence-file-upload"
            />
            <label
              htmlFor="evidence-file-upload"
              className="cursor-pointer"
            >
              <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-indigo-500' : 'text-slate-400 dark:text-steel-500'}`} />
              <p className="text-sm text-slate-600 dark:text-steel-400">
                <span className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                  Click to upload
                </span>{' '}
                or drag and drop
              </p>
              <p className="text-xs text-slate-400 dark:text-steel-500 mt-1">
                PDF, images, documents up to 10MB each
              </p>
            </label>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-auto">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-steel-800 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-white dark:bg-steel-700 rounded-lg text-slate-500 dark:text-steel-400">
                      {getFileIcon(file)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-steel-300 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-steel-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadProgress[file.name] === 'uploading' && (
                      <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                    )}
                    {uploadProgress[file.name] === 'done' && (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    )}
                    {uploadProgress[file.name] === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    {!uploading && (
                      <button
                        type="button"
                        onClick={() => removeFile(file.name)}
                        className="p-1 text-slate-400 hover:text-red-500 dark:text-steel-500 dark:hover:text-red-400 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
              Version Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100 text-sm"
              placeholder="Describe the files being uploaded..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-slate-600 dark:text-steel-400 hover:bg-slate-100 dark:hover:bg-steel-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || files.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {uploading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {uploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const VersionHistoryModal: React.FC<{
  evidence: EvidenceItem;
  onClose: () => void;
}> = ({ evidence, onClose }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        className="w-full max-w-2xl bg-white dark:bg-midnight-800 rounded-xl shadow-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-steel-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-steel-100">
              Version History
            </h2>
            <p className="text-sm text-slate-500 dark:text-steel-400">{evidence.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:text-steel-500 dark:hover:text-steel-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-4">
            {evidence.versions.map((version, index) => (
              <div
                key={version.id}
                className={`p-4 rounded-lg border ${
                  index === 0
                    ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-steel-700 bg-white dark:bg-midnight-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-steel-100">
                      Version {version.version}
                    </span>
                    {index === 0 && (
                      <span className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full">
                        Current
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[version.status].bg} ${STATUS_COLORS[version.status].text}`}
                    >
                      {version.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-steel-500">
                    {formatDate(version.createdAt)}
                  </span>
                </div>

                <p className="text-sm text-slate-600 dark:text-steel-400 mb-3">{version.notes}</p>

                {version.files.length > 0 && (
                  <div className="space-y-1">
                    {version.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-steel-800 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <File className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700 dark:text-steel-300">
                            {file.originalName}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-steel-500">
                            ({Math.round(file.size / 1024)} KB)
                          </span>
                        </div>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-slate-400 hover:text-slate-600 dark:text-steel-500 dark:hover:text-steel-300"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {version.approvedBy && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-steel-800 flex items-center gap-2 text-xs text-slate-500 dark:text-steel-400">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Approved {version.approvedAt && formatDate(version.approvedAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EvidenceRepository;
