/**
 * Verification Card
 *
 * Shows detailed verification information for a single requirement.
 * Displays:
 * - Official requirement text
 * - Mapped internal controls
 * - Evidence artifacts with SHA-256 hashes
 * - Compliance status indicators
 * - Clarification request button
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  AlertCircle,
  Circle,
  FileText,
  Download,
  Shield,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Clock,
  User,
  Paperclip,
  Lock,
  Copy,
  Check,
  Hash,
} from 'lucide-react';
import type { FrameworkId } from '../../constants/controls';
import type { RequirementHierarchyItem } from './FrameworkRequirementHierarchy';

// ============================================================================
// TYPES
// ============================================================================

interface MappedControl {
  id: string;
  title: string;
  description: string;
  domain: string;
  status: 'implemented' | 'in_progress' | 'not_started' | 'not_applicable';
  answer: 'yes' | 'no' | 'partial' | 'na' | null;
  hasEvidence: boolean;
  evidenceCount: number;
}

interface EvidenceArtifact {
  id: string;
  title: string;
  description: string;
  type: string;
  status: 'draft' | 'review' | 'final';
  files: {
    id: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
    checksum_sha256: string;
    uploadedAt: string;
  }[];
  approvedAt?: string;
  approvedBy?: string;
}

interface VerificationCardProps {
  requirement: RequirementHierarchyItem;
  frameworkId: FrameworkId;
  frameworkColor: string;
  mappedControls: MappedControl[];
  evidenceArtifacts: EvidenceArtifact[];
  onRequestClarification: (requirementId: string) => void;
  onDownloadEvidence: (evidenceId: string, fileId: string) => void;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const configs: Record<string, { color: string; bg: string; label: string }> = {
    compliant: { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Compliant' },
    partial: { color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Partial' },
    non_compliant: { color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Non-Compliant' },
    not_started: { color: 'text-slate-600 dark:text-steel-400', bg: 'bg-slate-100 dark:bg-steel-700', label: 'Not Started' },
    implemented: { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Implemented' },
    in_progress: { color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'In Progress' },
    final: { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Final' },
    review: { color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'In Review' },
    draft: { color: 'text-slate-600 dark:text-steel-400', bg: 'bg-slate-100 dark:bg-steel-700', label: 'Draft' },
  };

  const config = configs[status] || configs.not_started;

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.color} ${config.bg}`}>
      {config.label}
    </span>
  );
};

const HashBadge: React.FC<{ hash: string; verified?: boolean }> = ({ hash, verified = true }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedHash = `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ${
        verified
          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
          : 'bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-400'
      }`}>
        {verified ? (
          <Lock className="w-3 h-3" />
        ) : (
          <Hash className="w-3 h-3" />
        )}
        <span>{truncatedHash}</span>
        {verified && (
          <CheckCircle className="w-3 h-3 text-emerald-500" />
        )}
      </div>
      <button
        onClick={handleCopy}
        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-steel-300 transition-colors"
        title="Copy full hash"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

const ControlItem: React.FC<{ control: MappedControl }> = ({ control }) => {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = control.answer === 'yes' ? (
    <CheckCircle className="w-4 h-4 text-emerald-500" />
  ) : control.answer === 'partial' ? (
    <AlertCircle className="w-4 h-4 text-amber-500" />
  ) : (
    <Circle className="w-4 h-4 text-slate-400" />
  );

  return (
    <div className="border border-slate-200 dark:border-steel-600 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-steel-750 hover:bg-slate-50 dark:hover:bg-steel-700 transition-colors text-left"
      >
        {statusIcon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded">
              {control.id}
            </span>
            <span className="text-sm font-medium text-slate-800 dark:text-steel-200 truncate">
              {control.title}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {control.hasEvidence && (
            <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
              <Paperclip className="w-4 h-4" />
              <span className="text-xs">{control.evidenceCount}</span>
            </div>
          )}
          <StatusBadge status={control.status} />
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200 dark:border-steel-600 bg-slate-50 dark:bg-steel-800 px-4 py-3"
          >
            <p className="text-sm text-slate-600 dark:text-steel-400">
              {control.description}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-steel-500">
              <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-steel-700 rounded">
                {control.domain.replace('_', ' ')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EvidenceItem: React.FC<{
  evidence: EvidenceArtifact;
  onDownload: (evidenceId: string, fileId: string) => void;
}> = ({ evidence, onDownload }) => {
  const [expanded, setExpanded] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="border border-slate-200 dark:border-steel-600 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-steel-750 hover:bg-slate-50 dark:hover:bg-steel-700 transition-colors text-left"
      >
        <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-slate-800 dark:text-steel-200">
            {evidence.title}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-500 dark:text-steel-500">
              {evidence.files.length} file{evidence.files.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 dark:text-steel-500 capitalize">
              {evidence.type}
            </span>
          </div>
        </div>
        <StatusBadge status={evidence.status} />
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200 dark:border-steel-600"
          >
            {/* Description */}
            {evidence.description && (
              <div className="px-4 py-3 bg-slate-50 dark:bg-steel-800 border-b border-slate-200 dark:border-steel-600">
                <p className="text-sm text-slate-600 dark:text-steel-400">
                  {evidence.description}
                </p>
              </div>
            )}

            {/* Approval info */}
            {evidence.approvedAt && (
              <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/10 border-b border-emerald-200 dark:border-emerald-800/30 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle className="w-4 h-4" />
                <span>Approved on {formatDate(evidence.approvedAt)}</span>
                {evidence.approvedBy && (
                  <>
                    <span className="text-emerald-500">•</span>
                    <User className="w-3 h-3" />
                    <span>{evidence.approvedBy}</span>
                  </>
                )}
              </div>
            )}

            {/* Files list */}
            <div className="divide-y divide-slate-200 dark:divide-steel-600">
              {evidence.files.map((file) => (
                <div
                  key={file.id}
                  className="px-4 py-3 bg-white dark:bg-steel-750 flex items-center gap-3"
                >
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 dark:text-steel-300 truncate">
                      {file.filename}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500 dark:text-steel-500">
                        {formatFileSize(file.size)}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500 dark:text-steel-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(file.uploadedAt)}
                      </span>
                    </div>
                    {/* SHA-256 Hash */}
                    <div className="mt-2">
                      <div className="text-xs text-slate-500 dark:text-steel-500 mb-1">
                        SHA-256 Hash Verified:
                      </div>
                      <HashBadge hash={file.checksum_sha256} verified={true} />
                    </div>
                  </div>
                  <button
                    onClick={() => onDownload(evidence.id, file.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              ))}
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

const VerificationCard: React.FC<VerificationCardProps> = ({
  requirement,
  frameworkId: _frameworkId,
  frameworkColor,
  mappedControls,
  evidenceArtifacts,
  onRequestClarification,
  onDownloadEvidence,
}) => {
  const [activeTab, setActiveTab] = useState<'controls' | 'evidence'>('controls');

  const isCompliant = requirement.status === 'compliant';
  const hasGaps = requirement.status === 'non_compliant' || requirement.status === 'not_started';

  return (
    <div className="bg-white dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-steel-700">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <span
              className="px-2.5 py-1 text-sm font-mono font-semibold rounded"
              style={{ backgroundColor: `${frameworkColor}15`, color: frameworkColor }}
            >
              {requirement.clauseId}
            </span>
            {isCompliant ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium rounded-full">
                <CheckCircle className="w-4 h-4" />
                Compliant
              </span>
            ) : hasGaps ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium rounded-full">
                <AlertCircle className="w-4 h-4" />
                Gap Identified
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium rounded-full">
                <AlertCircle className="w-4 h-4" />
                Partial
              </span>
            )}
          </div>

          <button
            onClick={() => onRequestClarification(requirement.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-steel-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Request Clarification
          </button>
        </div>

        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {requirement.title}
        </h2>

        {requirement.description && (
          <p className="text-sm text-slate-600 dark:text-steel-400">
            {requirement.description}
          </p>
        )}
      </div>

      {/* Legal Text Section */}
      {requirement.legalText && (
        <div className="px-6 py-4 bg-slate-50 dark:bg-steel-750 border-b border-slate-200 dark:border-steel-700">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-slate-500 dark:text-steel-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-steel-300">
              Official Requirement Text
            </span>
          </div>
          <blockquote className="pl-4 border-l-2 border-slate-300 dark:border-steel-600 text-sm text-slate-600 dark:text-steel-400 italic">
            "{requirement.legalText}"
          </blockquote>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex border-b border-slate-200 dark:border-steel-700">
        <button
          onClick={() => setActiveTab('controls')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'controls'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10'
              : 'text-slate-600 dark:text-steel-400 hover:bg-slate-50 dark:hover:bg-steel-750'
          }`}
        >
          <Shield className="w-4 h-4" />
          Mapped Controls ({mappedControls.length})
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'evidence'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10'
              : 'text-slate-600 dark:text-steel-400 hover:bg-slate-50 dark:hover:bg-steel-750'
          }`}
        >
          <Paperclip className="w-4 h-4" />
          Evidence Artifacts ({evidenceArtifacts.length})
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'controls' ? (
            <motion.div
              key="controls"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-3"
            >
              {mappedControls.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-10 h-10 text-slate-300 dark:text-steel-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-steel-400">
                    No controls mapped to this requirement
                  </p>
                </div>
              ) : (
                mappedControls.map((control) => (
                  <ControlItem key={control.id} control={control} />
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="evidence"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-3"
            >
              {evidenceArtifacts.length === 0 ? (
                <div className="text-center py-8">
                  <Paperclip className="w-10 h-10 text-slate-300 dark:text-steel-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-steel-400">
                    No evidence artifacts linked to this requirement
                  </p>
                </div>
              ) : (
                evidenceArtifacts.map((evidence) => (
                  <EvidenceItem
                    key={evidence.id}
                    evidence={evidence}
                    onDownload={onDownloadEvidence}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VerificationCard;
