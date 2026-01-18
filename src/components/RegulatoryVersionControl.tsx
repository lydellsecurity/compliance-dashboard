/**
 * Regulatory Version Control Component
 *
 * Admin UI for previewing and accepting regulatory updates.
 * Features side-by-side comparison: "Current Requirement" vs "New Requirement"
 *
 * Key Features:
 * 1. Framework version selector
 * 2. Side-by-side diff view with syntax highlighting
 * 3. Impact assessment for each change
 * 4. Affected controls list
 * 5. Accept/Reject workflow
 */

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  GitCompare,
  Calendar,
  TrendingUp,
  ArrowRight,
  Eye,
  XCircle,
  Info,
  RefreshCw,
} from 'lucide-react';
import type { FrameworkId } from '../constants/controls';
import { FRAMEWORKS } from '../constants/controls';
import type {
  FrameworkVersion,
  RequirementVersionComparison,
  DiffHighlight,
  ComplianceDrift,
} from '../types/regulatory-update.types';
import {
  getVersionsForFramework,
  getActiveFrameworkVersion,
  getComplianceDrift,
  acknowledgeDrift,
  resolveDrift,
  updateFrameworkVersionStatus,
} from '../services/regulatory-update.service';

// ============================================
// TYPES
// ============================================

interface RegulatoryVersionControlProps {
  onVersionActivated?: (versionId: string) => void;
  onDriftResolved?: (driftId: string) => void;
}

type ViewMode = 'versions' | 'drift' | 'comparison';

// ============================================
// SEVERITY COLORS
// ============================================

const SEVERITY_COLORS = {
  critical: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    badge: 'bg-red-500',
  },
  high: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-700',
    badge: 'bg-orange-500',
  },
  medium: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    badge: 'bg-amber-500',
  },
  low: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
    badge: 'bg-blue-500',
  },
};

// ============================================
// DIFF RENDERER
// ============================================

const DiffRenderer: React.FC<{
  oldText: string;
  newText: string;
  highlights: DiffHighlight[];
}> = ({ oldText, newText, highlights: _highlights }) => {
  // Simple diff rendering - highlights changes inline
  // Note: highlights parameter reserved for future enhanced diff rendering

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Current Version */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-steel-400">
          <Clock className="w-4 h-4" />
          Current Version
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-sm text-slate-700 dark:text-steel-300 whitespace-pre-wrap">
            {oldText || <span className="italic text-slate-400">New requirement (not in current version)</span>}
          </p>
        </div>
      </div>

      {/* New Version */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
          <TrendingUp className="w-4 h-4" />
          New Version
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-slate-700 dark:text-steel-300 whitespace-pre-wrap">
            {newText}
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// VERSION CARD
// ============================================

const VersionCard: React.FC<{
  version: FrameworkVersion;
  isActive: boolean;
  onActivate: () => void;
  onPreview: () => void;
}> = ({ version, isActive, onActivate, onPreview }) => {
  const statusColors = {
    draft: 'bg-slate-100 text-slate-600 dark:bg-steel-700 dark:text-steel-300',
    published: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    active: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    superseded: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    retired: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  const daysUntilEffective = useMemo(() => {
    const effectiveDate = new Date(version.effectiveDate);
    const today = new Date();
    return Math.ceil((effectiveDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [version.effectiveDate]);

  return (
    <div className={`p-4 rounded-lg border ${isActive ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-800'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-900 dark:text-steel-100">
              {version.versionName}
            </h4>
            {isActive && (
              <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full">
                Active
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-steel-400">
            Version {version.versionCode}
          </p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[version.status]}`}>
          {version.status}
        </span>
      </div>

      {/* Dates */}
      <div className="space-y-1 mb-3 text-sm">
        <div className="flex items-center gap-2 text-slate-600 dark:text-steel-400">
          <Calendar className="w-4 h-4" />
          <span>Effective: {new Date(version.effectiveDate).toLocaleDateString()}</span>
          {daysUntilEffective > 0 && version.status !== 'active' && (
            <span className="text-amber-600 dark:text-amber-400">
              ({daysUntilEffective} days)
            </span>
          )}
        </div>
        {version.transitionDeadline && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Transition deadline: {new Date(version.transitionDeadline).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Major Changes Summary */}
      {version.majorChanges.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-slate-500 dark:text-steel-400 mb-1">
            Major Changes: {version.majorChanges.length}
          </p>
          <div className="flex flex-wrap gap-1">
            {version.majorChanges.slice(0, 3).map((change, idx) => (
              <span
                key={idx}
                className={`px-2 py-0.5 text-xs rounded ${SEVERITY_COLORS[change.impactLevel === 'informational' ? 'low' : change.impactLevel].bg} ${SEVERITY_COLORS[change.impactLevel === 'informational' ? 'low' : change.impactLevel].text}`}
              >
                {change.changeType}
              </span>
            ))}
            {version.majorChanges.length > 3 && (
              <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-300 rounded">
                +{version.majorChanges.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onPreview}
          className="flex-1 px-3 py-1.5 text-sm text-indigo-600 dark:text-accent-400 bg-indigo-50 dark:bg-accent-500/10 rounded-lg hover:bg-indigo-100 dark:hover:bg-accent-500/20 transition-colors flex items-center justify-center gap-1"
        >
          <Eye className="w-4 h-4" />
          Preview Changes
        </button>
        {version.status === 'published' && !isActive && (
          <button
            onClick={onActivate}
            className="px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
          >
            <Check className="w-4 h-4" />
            Activate
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================
// DRIFT ALERT CARD
// ============================================

const DriftAlertCard: React.FC<{
  drift: ComplianceDrift;
  onAcknowledge: () => void;
  onResolve: () => void;
  onViewDetails: () => void;
}> = ({ drift, onAcknowledge, onResolve, onViewDetails }) => {
  const severityConfig = SEVERITY_COLORS[drift.severity];

  return (
    <div className={`p-4 rounded-lg border ${severityConfig.border} ${severityConfig.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-5 h-5 ${severityConfig.text}`} />
          <span className={`text-xs px-2 py-0.5 rounded-full ${severityConfig.badge} text-white`}>
            {drift.severity}
          </span>
          <span className="text-xs text-slate-500 dark:text-steel-400">
            {drift.driftType.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-steel-400">
          <Clock className="w-3 h-3" />
          {drift.daysRemaining > 0 ? `${drift.daysRemaining} days remaining` : 'Deadline passed'}
        </div>
      </div>

      <p className="text-sm font-medium text-slate-900 dark:text-steel-100 mb-2">
        {drift.changeSummary}
      </p>

      <p className="text-xs text-slate-600 dark:text-steel-400 mb-3">
        {drift.impactAssessment}
      </p>

      {/* Previous Answer Status */}
      <div className={`p-2 rounded mb-3 ${drift.answerStillValid ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
        <div className="flex items-center gap-2">
          {drift.answerStillValid ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          )}
          <span className={`text-xs ${drift.answerStillValid ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            Previous answer ({drift.previousAnswer}): {drift.answerStillValid ? 'May still be valid' : 'Needs reassessment'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onViewDetails}
          className="flex-1 px-3 py-1.5 text-sm text-slate-600 dark:text-steel-300 bg-white dark:bg-steel-700 border border-slate-200 dark:border-steel-600 rounded-lg hover:bg-slate-50 dark:hover:bg-steel-600 transition-colors"
        >
          View Details
        </button>
        {drift.status === 'detected' && (
          <button
            onClick={onAcknowledge}
            className="px-3 py-1.5 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          >
            Acknowledge
          </button>
        )}
        {drift.status !== 'resolved' && (
          <button
            onClick={onResolve}
            className="px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================
// COMPARISON VIEW
// ============================================

const ComparisonView: React.FC<{
  comparison: RequirementVersionComparison;
  onBack: () => void;
  onAccept: () => void;
}> = ({ comparison, onBack, onAccept }) => {
  const severityConfig = SEVERITY_COLORS[comparison.changeSeverity];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-slate-600 dark:text-steel-400 hover:text-slate-900 dark:hover:text-steel-100"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to versions
        </button>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded-full ${severityConfig.bg} ${severityConfig.text}`}>
            {comparison.changeSeverity} impact
          </span>
          <span className="px-2 py-1 text-xs bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-300 rounded-full">
            {comparison.changeType}
          </span>
        </div>
      </div>

      {/* Requirement Code */}
      <div className="p-4 bg-slate-50 dark:bg-steel-800 rounded-lg">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-indigo-500" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-steel-100">
              {comparison.requirementCode}
            </h3>
            <p className="text-sm text-slate-500 dark:text-steel-400">
              {comparison.current.versionCode} → {comparison.new.versionCode}
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <DiffRenderer
        oldText={comparison.current.text}
        newText={comparison.new.text}
        highlights={comparison.diffHighlights}
      />

      {/* Compliance Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-slate-200 dark:border-steel-700">
          <h4 className="text-sm font-medium text-slate-500 dark:text-steel-400 mb-2">
            Current Compliance
          </h4>
          <div className="flex items-center gap-2">
            {comparison.currentComplianceStatus === 'compliant' && (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            )}
            {comparison.currentComplianceStatus === 'partial' && (
              <AlertCircle className="w-5 h-5 text-amber-500" />
            )}
            {comparison.currentComplianceStatus === 'non_compliant' && (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            {comparison.currentComplianceStatus === 'unknown' && (
              <Info className="w-5 h-5 text-slate-400" />
            )}
            <span className="font-medium text-slate-900 dark:text-steel-100 capitalize">
              {comparison.currentComplianceStatus.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-slate-200 dark:border-steel-700">
          <h4 className="text-sm font-medium text-slate-500 dark:text-steel-400 mb-2">
            Projected Status
          </h4>
          <div className="flex items-center gap-2">
            {comparison.projectedComplianceStatus === 'compliant' && (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            )}
            {comparison.projectedComplianceStatus === 'at_risk' && (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
            {comparison.projectedComplianceStatus === 'non_compliant' && (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            {comparison.projectedComplianceStatus === 'needs_review' && (
              <Eye className="w-5 h-5 text-blue-500" />
            )}
            <span className="font-medium text-slate-900 dark:text-steel-100 capitalize">
              {comparison.projectedComplianceStatus.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Affected Controls */}
      {comparison.affectedControls.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-900 dark:text-steel-100 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-500" />
            Affected Controls ({comparison.affectedControls.length})
          </h4>
          <div className="space-y-2">
            {comparison.affectedControls.map((control) => (
              <div
                key={control.controlId}
                className="p-3 bg-white dark:bg-steel-800 rounded-lg border border-slate-200 dark:border-steel-700 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900 dark:text-steel-100">
                    {control.controlCode}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    control.currentAnswer === 'yes' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                    control.currentAnswer === 'partial' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {control.currentAnswer}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {control.answerStillValid ? (
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Valid
                    </span>
                  ) : (
                    <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Needs Review
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      <div>
        <h4 className="text-sm font-medium text-slate-900 dark:text-steel-100 mb-3">
          Recommended Actions
        </h4>
        <ul className="space-y-2">
          {comparison.recommendedActions.map((action, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-steel-400">
              <ArrowRight className="w-4 h-4 mt-0.5 text-indigo-500" />
              {action}
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-steel-700">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-slate-600 dark:text-steel-400 hover:text-slate-900 dark:hover:text-steel-100"
        >
          Cancel
        </button>
        <button
          onClick={onAccept}
          className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Accept Changes
        </button>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const RegulatoryVersionControl: React.FC<RegulatoryVersionControlProps> = ({
  onVersionActivated,
  onDriftResolved,
}) => {
  const [selectedFramework, setSelectedFramework] = useState<FrameworkId>('SOC2');
  const [viewMode, setViewMode] = useState<ViewMode>('versions');
  const [selectedComparison, setSelectedComparison] = useState<RequirementVersionComparison | null>(null);

  // Get framework versions
  const versions = useMemo(
    () => getVersionsForFramework(selectedFramework),
    [selectedFramework]
  );

  const activeVersion = useMemo(
    () => getActiveFrameworkVersion(selectedFramework),
    [selectedFramework]
  );

  // Get drift alerts for selected framework
  const driftAlerts = useMemo(() => {
    const allDrift = getComplianceDrift();
    // Filter by framework (would need to look up framework from version)
    return allDrift.filter(d => d.status !== 'resolved');
  }, []);

  const handleActivateVersion = (versionId: string) => {
    updateFrameworkVersionStatus(versionId, 'active');
    onVersionActivated?.(versionId);
  };

  const handleAcknowledgeDrift = (driftId: string) => {
    acknowledgeDrift(driftId);
  };

  const handleResolveDrift = (driftId: string) => {
    resolveDrift(driftId, {
      resolutionType: 'update_control',
      notes: 'Resolved via version control UI',
      resolvedBy: 'current-user',
    });
    onDriftResolved?.(driftId);
  };

  const frameworkMeta = FRAMEWORKS.find(f => f.id === selectedFramework);

  return (
    <div className="bg-white dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-steel-700 bg-slate-50 dark:bg-steel-800/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <GitCompare className="w-6 h-6 text-indigo-500" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-steel-100">
                Regulatory Version Control
              </h2>
              <p className="text-sm text-slate-500 dark:text-steel-400">
                Preview and accept regulatory framework updates
              </p>
            </div>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-steel-200 hover:bg-slate-100 dark:hover:bg-steel-700 rounded-lg transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Framework Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-steel-400">Framework:</span>
            <select
              value={selectedFramework}
              onChange={(e) => setSelectedFramework(e.target.value as FrameworkId)}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-steel-600 bg-white dark:bg-steel-700 text-slate-900 dark:text-steel-100"
            >
              {FRAMEWORKS.map(fw => (
                <option key={fw.id} value={fw.id}>
                  {fw.icon} {fw.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-steel-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('versions')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'versions'
                  ? 'bg-white dark:bg-steel-600 text-slate-900 dark:text-steel-100 shadow-sm'
                  : 'text-slate-600 dark:text-steel-400 hover:text-slate-900 dark:hover:text-steel-100'
              }`}
            >
              Versions
            </button>
            <button
              onClick={() => setViewMode('drift')}
              className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1 ${
                viewMode === 'drift'
                  ? 'bg-white dark:bg-steel-600 text-slate-900 dark:text-steel-100 shadow-sm'
                  : 'text-slate-600 dark:text-steel-400 hover:text-slate-900 dark:hover:text-steel-100'
              }`}
            >
              Drift Alerts
              {driftAlerts.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {driftAlerts.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {viewMode === 'comparison' && selectedComparison ? (
          <ComparisonView
            comparison={selectedComparison}
            onBack={() => {
              setSelectedComparison(null);
              setViewMode('versions');
            }}
            onAccept={() => {
              // Handle accepting the change
              setSelectedComparison(null);
              setViewMode('versions');
            }}
          />
        ) : viewMode === 'versions' ? (
          <div className="space-y-4">
            {/* Active Version Highlight */}
            {activeVersion && (
              <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-800 dark:text-green-300">
                    Active Version: {activeVersion.versionName}
                  </span>
                </div>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Effective since {new Date(activeVersion.effectiveDate).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Version List */}
            <div className="grid gap-4">
              {versions.length > 0 ? (
                versions.map(version => (
                  <VersionCard
                    key={version.id}
                    version={version}
                    isActive={version.status === 'active'}
                    onActivate={() => handleActivateVersion(version.id)}
                    onPreview={() => {
                      // Generate comparison if there's an active version
                      if (activeVersion && activeVersion.id !== version.id) {
                        // Would need to generate comparison for each requirement
                        // For demo, just switch view mode
                        setViewMode('comparison');
                      }
                    }}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 dark:text-steel-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-steel-400">
                    No versions available for {frameworkMeta?.name}
                  </p>
                  <p className="text-sm text-slate-400 dark:text-steel-500 mt-1">
                    Version data will be populated when regulatory updates are detected
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Drift Alerts View */
          <div className="space-y-4">
            {driftAlerts.length > 0 ? (
              driftAlerts.map(drift => (
                <DriftAlertCard
                  key={drift.id}
                  drift={drift}
                  onAcknowledge={() => handleAcknowledgeDrift(drift.id)}
                  onResolve={() => handleResolveDrift(drift.id)}
                  onViewDetails={() => {
                    // Would generate comparison view for the specific requirement
                    setViewMode('comparison');
                  }}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-slate-900 dark:text-steel-100 font-medium">
                  No Compliance Drift Detected
                </p>
                <p className="text-sm text-slate-500 dark:text-steel-400 mt-1">
                  Your controls are aligned with current regulatory requirements
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RegulatoryVersionControl;
