/**
 * Auditor Requirement View Component
 *
 * Displays requirement progress from an auditor's perspective.
 * Shows coverage percentages, mapped controls, gaps, and evidence status.
 * This is the "Proof" view - what auditors see when verifying compliance.
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  AlertCircle,
  AlertTriangle,
  Shield,
  FileText,
  Eye,
  Target,
  TrendingUp,
  XCircle,
  Info,
  Filter,
} from 'lucide-react';
import type { FrameworkId, MasterControl } from '../constants/controls';
import { FRAMEWORKS } from '../constants/controls';
import type { RequirementStatus, MappingStrength } from '../types/control-requirement-mapping.types';
import {
  getFrameworkComplianceSummary,
  getRequirementProgress,
  getLeafRequirements,
  type FlatRequirement,
} from '../services/control-requirement-mapping.service';

type ControlAnswer = 'yes' | 'no' | 'partial' | 'na' | null;

interface AuditorRequirementViewProps {
  frameworkId: FrameworkId;
  controls: MasterControl[];
  getControlAnswer: (controlId: string) => ControlAnswer;
  onControlClick?: (controlId: string) => void;
  onGapClick?: (requirementId: string) => void;
}

// Color configuration for framework styling
const FRAMEWORK_COLORS: Record<FrameworkId, string> = {
  'PCIDSS': '#DC2626',
  'SOC2': '#3B82F6',
  'ISO27001': '#10B981',
  'HIPAA': '#8B5CF6',
  'NIST': '#F59E0B',
  'GDPR': '#2563EB',
};

// Status colors and labels
const STATUS_CONFIG: Record<RequirementStatus, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  'compliant': {
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    label: 'Compliant',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  'partially_compliant': {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'Partial',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  'non_compliant': {
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Non-Compliant',
    icon: <XCircle className="w-4 h-4" />,
  },
  'not_started': {
    color: 'text-slate-500 dark:text-steel-400',
    bg: 'bg-slate-100 dark:bg-steel-700',
    label: 'Not Started',
    icon: <Circle className="w-4 h-4" />,
  },
  'not_applicable': {
    color: 'text-slate-400 dark:text-steel-500',
    bg: 'bg-slate-50 dark:bg-steel-800',
    label: 'N/A',
    icon: <Circle className="w-4 h-4 opacity-50" />,
  },
  'in_progress': {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'In Progress',
    icon: <TrendingUp className="w-4 h-4" />,
  },
  'custom_gap': {
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    label: 'Gap Identified',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
};

// Mapping strength indicator
const MappingStrengthBadge: React.FC<{ strength: MappingStrength; coverage: number }> = ({ strength, coverage }) => {
  const config = {
    direct: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', label: 'Direct' },
    partial: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', label: 'Partial' },
    supportive: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Supportive' },
  };

  const { color, bg, label } = config[strength];

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${color} ${bg}`}>
      {label} ({coverage}%)
    </span>
  );
};

// Coverage progress bar
const CoverageBar: React.FC<{ coverage: number; size?: 'sm' | 'md' }> = ({ coverage, size = 'sm' }) => {
  const height = size === 'sm' ? 'h-1.5' : 'h-2';
  const getColor = (pct: number) => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 50) return 'bg-amber-500';
    if (pct > 0) return 'bg-orange-500';
    return 'bg-slate-300 dark:bg-steel-600';
  };

  return (
    <div className={`w-full ${height} bg-slate-200 dark:bg-steel-700 rounded-full overflow-hidden`}>
      <div
        className={`${height} ${getColor(coverage)} transition-all duration-300`}
        style={{ width: `${coverage}%` }}
      />
    </div>
  );
};

// Single requirement row in the auditor view
const RequirementRow: React.FC<{
  requirement: FlatRequirement;
  frameworkId: FrameworkId;
  controls: MasterControl[];
  getControlAnswer: (controlId: string) => ControlAnswer;
  onControlClick?: (controlId: string) => void;
  onGapClick?: (requirementId: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}> = ({
  requirement,
  frameworkId,
  controls: _controls, // Reserved for future control status integration
  getControlAnswer: _getControlAnswer, // Reserved for future control status integration
  onControlClick,
  onGapClick,
  isExpanded,
  onToggleExpand,
}) => {
  const progress = useMemo(
    () => getRequirementProgress(requirement.id),
    [requirement.id]
  );

  const frameworkColor = FRAMEWORK_COLORS[frameworkId];

  // Determine status based on progress
  const status: RequirementStatus = progress
    ? progress.status
    : 'not_started';

  const statusConfig = STATUS_CONFIG[status];
  const coverage = progress?.totalCoverage ?? 0;
  const mappedControlCount = progress?.mappedControls.length ?? 0;
  const hasGap = progress?.hasGap ?? false;

  // Count evidence
  const evidenceTotal = progress?.evidenceSummary.total ?? 0;
  const evidenceVerified = progress?.evidenceSummary.verified ?? 0;

  return (
    <div className="border-b border-slate-100 dark:border-steel-700 last:border-b-0">
      <div
        className={`flex items-center gap-3 py-3 px-4 hover:bg-slate-50 dark:hover:bg-steel-800/50 cursor-pointer transition-colors ${
          hasGap ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''
        }`}
        onClick={onToggleExpand}
      >
        {/* Expand/collapse indicator */}
        <button className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:text-steel-500 dark:hover:text-steel-300">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Status icon */}
        <div className={`flex-shrink-0 ${statusConfig.color}`}>
          {statusConfig.icon}
        </div>

        {/* Requirement ID and title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${frameworkColor}15`,
                color: frameworkColor,
              }}
            >
              {requirement.code}
            </span>
            <span className="text-sm text-slate-700 dark:text-steel-200 truncate">
              {requirement.title}
            </span>
            {hasGap && (
              <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Gap
              </span>
            )}
          </div>
        </div>

        {/* Coverage bar */}
        <div className="w-24 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CoverageBar coverage={coverage} />
            <span className="text-xs text-slate-500 dark:text-steel-400 w-8 text-right">
              {coverage}%
            </span>
          </div>
        </div>

        {/* Mapped controls count */}
        <div className="w-16 flex-shrink-0 text-center">
          <span className={`text-xs px-2 py-1 rounded ${
            mappedControlCount > 0
              ? 'bg-indigo-50 dark:bg-accent-500/10 text-indigo-600 dark:text-accent-400'
              : 'bg-slate-100 dark:bg-steel-700 text-slate-400 dark:text-steel-500'
          }`}>
            <Shield className="w-3 h-3 inline-block mr-1" />
            {mappedControlCount}
          </span>
        </div>

        {/* Evidence count */}
        <div className="w-16 flex-shrink-0 text-center">
          <span className={`text-xs px-2 py-1 rounded ${
            evidenceTotal > 0
              ? evidenceVerified === evidenceTotal
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
              : 'bg-slate-100 dark:bg-steel-700 text-slate-400 dark:text-steel-500'
          }`}>
            <FileText className="w-3 h-3 inline-block mr-1" />
            {evidenceVerified}/{evidenceTotal}
          </span>
        </div>

        {/* Status badge */}
        <div className="w-28 flex-shrink-0">
          <span className={`text-xs px-2 py-1 rounded ${statusConfig.bg} ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="bg-slate-50 dark:bg-steel-800/50 border-t border-slate-200 dark:border-steel-700 p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Left column: Requirement details */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-steel-100 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400" />
                Requirement Details
              </h4>
              <p className="text-sm text-slate-600 dark:text-steel-300 mb-3">
                {requirement.description || 'No description available'}
              </p>

              {/* Gap information */}
              {hasGap && progress?.gapInfo && (
                <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h5 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Gap Identified
                  </h5>
                  <p className="text-xs text-purple-700 dark:text-purple-400 mb-2">
                    {progress.gapInfo.description}
                  </p>
                  {progress.gapInfo.resolution && (
                    <p className="text-xs text-purple-600 dark:text-purple-500">
                      Resolution: {progress.gapInfo.resolution}
                    </p>
                  )}
                  {onGapClick && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onGapClick(requirement.id);
                      }}
                      className="mt-2 text-xs px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      Resolve Gap
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right column: Mapped controls */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-steel-100 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-500" />
                Mapped Controls ({mappedControlCount})
              </h4>

              {progress?.mappedControls && progress.mappedControls.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {progress.mappedControls.map((mc) => (
                    <div
                      key={mc.controlId}
                      className="p-2 bg-white dark:bg-steel-800 rounded border border-slate-200 dark:border-steel-700"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onControlClick?.(mc.controlId);
                          }}
                          className="text-sm font-medium text-indigo-600 dark:text-accent-400 hover:underline flex items-center gap-1"
                        >
                          <Shield className="w-3 h-3" />
                          {mc.controlCode}
                        </button>
                        <MappingStrengthBadge
                          strength={mc.mappingStrength}
                          coverage={mc.coveragePercentage}
                        />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-steel-400 truncate">
                        {mc.controlTitle}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${
                          mc.implementationStatus === 'implemented' || mc.implementationStatus === 'verified'
                            ? 'text-green-600 dark:text-green-400'
                            : mc.implementationStatus === 'in_progress'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-400 dark:text-steel-500'
                        }`}>
                          {mc.implementationStatus === 'implemented' ? 'Implemented' :
                           mc.implementationStatus === 'verified' ? 'Verified' :
                           mc.implementationStatus === 'in_progress' ? 'In Progress' :
                           mc.implementationStatus === 'not_applicable' ? 'N/A' : 'Not Started'}
                        </span>
                        {mc.hasVerifiedEvidence && (
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Evidence
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-100 dark:bg-steel-700 rounded-lg text-center">
                  <Circle className="w-8 h-8 text-slate-300 dark:text-steel-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-steel-400">
                    No controls mapped to this requirement
                  </p>
                  <p className="text-xs text-slate-400 dark:text-steel-500 mt-1">
                    This is a custom gap that needs direct evidence
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Direct evidence section (for gaps) */}
          {progress?.directEvidence && progress.directEvidence.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-steel-700">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-steel-100 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-500" />
                Direct Evidence ({progress.directEvidence.length})
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {progress.directEvidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2 bg-white dark:bg-steel-800 rounded border border-slate-200 dark:border-steel-700"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-steel-200 truncate">
                        {ev.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        ev.status === 'verified'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : ev.status === 'rejected'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                      }`}>
                        {ev.status}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-steel-500">
                        {ev.evidenceType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Filter options
type StatusFilter = 'all' | RequirementStatus | 'gaps_only';

export const AuditorRequirementView: React.FC<AuditorRequirementViewProps> = ({
  frameworkId,
  controls,
  getControlAnswer,
  onControlClick,
  onGapClick,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const frameworkMeta = FRAMEWORKS.find((f) => f.id === frameworkId);
  const frameworkColor = FRAMEWORK_COLORS[frameworkId];

  // Get compliance summary
  const summary = useMemo(
    () => getFrameworkComplianceSummary(frameworkId),
    [frameworkId]
  );

  // Get all leaf requirements for this framework
  const requirements = useMemo(
    () => getLeafRequirements(frameworkId),
    [frameworkId]
  );

  // Filter requirements
  const filteredRequirements = useMemo(() => {
    let filtered = requirements;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((req) => {
        const progress = getRequirementProgress(req.id);
        if (statusFilter === 'gaps_only') {
          return progress?.hasGap;
        }
        return progress?.status === statusFilter;
      });
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.code.toLowerCase().includes(query) ||
          req.title.toLowerCase().includes(query) ||
          req.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [requirements, statusFilter, searchQuery]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Calculate score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="bg-white dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700 overflow-hidden">
      {/* Header with summary */}
      <div
        className="px-4 py-4 border-b border-slate-200 dark:border-steel-700"
        style={{ backgroundColor: `${frameworkColor}08` }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{frameworkMeta?.icon}</span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                {frameworkMeta?.fullName}
                <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
                  <Eye className="w-3 h-3 inline-block mr-1" />
                  Auditor View
                </span>
              </h2>
              <p className="text-sm text-slate-500 dark:text-steel-400">
                {summary.totalRequirements} requirements • Requirement-centric compliance view
              </p>
            </div>
          </div>

          {/* Overall score */}
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(summary.overallScore)}`}>
              {summary.overallScore}%
            </div>
            <div className="text-xs text-slate-500 dark:text-steel-400">
              Overall Compliance
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-6 gap-3">
          <div className="p-3 bg-white dark:bg-steel-700 rounded-lg border border-slate-200 dark:border-steel-600">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-slate-500 dark:text-steel-400">Compliant</span>
            </div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {summary.compliant}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-steel-700 rounded-lg border border-slate-200 dark:border-steel-600">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-slate-500 dark:text-steel-400">Partial</span>
            </div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {summary.partiallyCompliant}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-steel-700 rounded-lg border border-slate-200 dark:border-steel-600">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-slate-500 dark:text-steel-400">Non-Compliant</span>
            </div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">
              {summary.nonCompliant}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-steel-700 rounded-lg border border-slate-200 dark:border-steel-600">
            <div className="flex items-center gap-2 mb-1">
              <Circle className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-steel-400">Not Started</span>
            </div>
            <div className="text-xl font-bold text-slate-600 dark:text-steel-300">
              {summary.notStarted}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-steel-700 rounded-lg border border-slate-200 dark:border-steel-600">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-slate-500 dark:text-steel-400">Gaps</span>
            </div>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {summary.customGaps}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-steel-700 rounded-lg border border-slate-200 dark:border-steel-600">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-slate-500 dark:text-steel-400">Evidence</span>
            </div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {summary.verifiedEvidence}/{summary.totalEvidence}
            </div>
          </div>
        </div>

        {/* Gap severity breakdown */}
        {(summary.criticalGaps > 0 || summary.highGaps > 0) && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-red-800 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 inline-block mr-1" />
                Gap Severity:
              </span>
              {summary.criticalGaps > 0 && (
                <span className="text-xs px-2 py-1 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded">
                  {summary.criticalGaps} Critical
                </span>
              )}
              {summary.highGaps > 0 && (
                <span className="text-xs px-2 py-1 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded">
                  {summary.highGaps} High
                </span>
              )}
              {summary.mediumGaps > 0 && (
                <span className="text-xs px-2 py-1 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded">
                  {summary.mediumGaps} Medium
                </span>
              )}
              {summary.lowGaps > 0 && (
                <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                  {summary.lowGaps} Low
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-steel-700 bg-slate-50 dark:bg-steel-800/50 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-steel-600 bg-white dark:bg-steel-700 text-slate-700 dark:text-steel-200"
          >
            <option value="all">All Requirements</option>
            <option value="compliant">Compliant</option>
            <option value="partially_compliant">Partially Compliant</option>
            <option value="non_compliant">Non-Compliant</option>
            <option value="not_started">Not Started</option>
            <option value="not_applicable">Not Applicable</option>
            <option value="gaps_only">Gaps Only</option>
          </select>
        </div>

        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requirements..."
            className="w-full max-w-md text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-steel-600 bg-white dark:bg-steel-700 text-slate-700 dark:text-steel-200"
          />
        </div>

        <div className="text-sm text-slate-500 dark:text-steel-400">
          Showing {filteredRequirements.length} of {requirements.length}
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 py-2 px-4 bg-slate-100 dark:bg-steel-700 text-xs font-medium text-slate-500 dark:text-steel-400 border-b border-slate-200 dark:border-steel-600">
        <div className="w-4 flex-shrink-0"></div>
        <div className="w-4 flex-shrink-0"></div>
        <div className="flex-1">Requirement</div>
        <div className="w-24 flex-shrink-0 text-center">Coverage</div>
        <div className="w-16 flex-shrink-0 text-center">Controls</div>
        <div className="w-16 flex-shrink-0 text-center">Evidence</div>
        <div className="w-28 flex-shrink-0 text-center">Status</div>
      </div>

      {/* Requirements list */}
      <div className="max-h-[500px] overflow-y-auto">
        {filteredRequirements.length > 0 ? (
          filteredRequirements.map((req) => (
            <RequirementRow
              key={req.id}
              requirement={req}
              frameworkId={frameworkId}
              controls={controls}
              getControlAnswer={getControlAnswer}
              onControlClick={onControlClick}
              onGapClick={onGapClick}
              isExpanded={expandedIds.has(req.id)}
              onToggleExpand={() => toggleExpanded(req.id)}
            />
          ))
        ) : (
          <div className="p-8 text-center">
            <Target className="w-12 h-12 text-slate-300 dark:text-steel-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-steel-400">
              {searchQuery || statusFilter !== 'all'
                ? 'No requirements match your filters'
                : 'No requirements available for this framework'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditorRequirementView;
