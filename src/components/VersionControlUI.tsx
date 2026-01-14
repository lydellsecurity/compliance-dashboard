/**
 * ============================================================================
 * VERSION CONTROL UI COMPONENTS
 * ============================================================================
 * 
 * React components for managing regulatory updates with side-by-side comparison
 */

import React, { useState } from 'react';
import {
  RequirementComparison,
  ComplianceDrift,
} from '../types/compliance.types';

// ============================================================================
// REQUIREMENT COMPARISON VIEWER - Side-by-Side View
// ============================================================================

interface RequirementComparisonViewerProps {
  comparison: RequirementComparison;
  onAccept: (requirementId: string) => void;
  onReject: (requirementId: string, reason: string) => void;
  onDefer: (requirementId: string) => void;
}

export const RequirementComparisonViewer: React.FC<RequirementComparisonViewerProps> = ({
  comparison,
  onAccept,
  onReject: _onReject,
  onDefer,
}) => {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'guidance' | 'impact'>('text');

  return (
    <div className="card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-steel-700 dark:border-steel-700 light:border-slate-200 bg-steel-800 dark:bg-steel-800 light:bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-mono rounded bg-amber-100 text-amber-800">
                PENDING REVIEW
              </span>
              <span className="text-sm text-slate-500">{comparison.current.sectionCode}</span>
            </div>
            <h3 className="mt-1 text-lg font-semibold text-primary">
              Requirement Update Available
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <VersionBadge version={comparison.current.version.version} label="Current" variant="current" />
            <span className="text-slate-400">→</span>
            <VersionBadge version={comparison.new.version.version} label="New" variant="new" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-steel-700 dark:border-steel-700 light:border-slate-200">
        {[
          { id: 'text', label: 'Requirement Text' },
          { id: 'guidance', label: 'Implementation Guidance' },
          { id: 'impact', label: 'Impact Analysis' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-accent-400 border-b-2 border-accent-500 bg-accent-500/10'
                : 'text-steel-400 hover:text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content - Side by Side Comparison */}
      <div className="p-6">
        {activeTab === 'text' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Current Version */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-steel-400" />
                <span className="text-sm font-medium text-secondary">Current Version</span>
              </div>
              <div className="p-4 rounded-lg bg-steel-800 dark:bg-steel-800 light:bg-slate-100 font-mono text-sm leading-relaxed text-secondary">
                {comparison.current.requirementText}
              </div>
            </div>

            {/* New Version */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-status-success" />
                <span className="text-sm font-medium text-secondary">New 2026 Version</span>
              </div>
              <div className="p-4 rounded-lg bg-status-success/10 border border-status-success/30 font-mono text-sm leading-relaxed text-secondary">
                {comparison.new.requirementText}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'guidance' && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-secondary mb-3">Current Guidance</h4>
              <ul className="space-y-2">
                {comparison.current.implementationGuidance.map((item, i) => (
                  <li key={i} className="text-sm text-secondary flex items-start gap-2">
                    <span className="text-steel-400">•</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-secondary mb-3">New Guidance</h4>
              <ul className="space-y-2">
                {comparison.new.implementationGuidance.map((item, i) => {
                  const isNew = !comparison.current.implementationGuidance.includes(item);
                  return (
                    <li key={i} className={`text-sm flex items-start gap-2 ${isNew ? 'text-status-success font-medium' : 'text-secondary'}`}>
                      <span className={isNew ? 'text-status-success' : 'text-steel-400'}>{isNew ? '+' : '•'}</span>
                      {item}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'impact' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-secondary mb-2">Impact Assessment</h4>
              <p className="text-secondary">{comparison.impactAssessment}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-secondary mb-2">Significant Changes</h4>
              <ul className="space-y-2">
                {comparison.significantChanges.map((change, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-status-warning">
                    <span>⚠️</span>{change}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-secondary mb-2">
                Affected Controls ({comparison.affectedControls.length})
              </h4>
              <div className="space-y-2">
                {comparison.affectedControls.map((control) => (
                  <div key={control.controlId} className="p-3 rounded-lg bg-steel-800 dark:bg-steel-800 light:bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-sm text-secondary">{control.controlId}</span>
                      <span className="mx-2 text-steel-500">|</span>
                      <span className="text-sm text-secondary">{control.controlTitle}</span>
                    </div>
                    <span className="text-xs text-status-warning">{control.requiredUpdates.length} update(s) needed</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 border-t border-steel-700 dark:border-steel-700 light:border-slate-200 bg-steel-800 dark:bg-steel-800 light:bg-slate-50 flex items-center justify-between">
        <div className="text-sm text-steel-400">
          {comparison.affectedControls.length} control(s) will be flagged for review
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onDefer(comparison.requirementId)} className="px-4 py-2 text-sm text-secondary hover:text-primary">
            Defer
          </button>
          <button onClick={() => setShowRejectModal(true)} className="px-4 py-2 text-sm text-status-risk border border-status-risk/30 rounded-lg hover:bg-status-risk/10">
            Reject Update
          </button>
          <button onClick={() => onAccept(comparison.requirementId)} className="btn-primary">
            Accept & Apply
          </button>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-backdrop flex items-center justify-center">
          <div className="modal-content rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-primary mb-4">Reject Update</h3>
            <textarea placeholder="Reason for rejection..." className="input h-32" />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-sm text-secondary">Cancel</button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-status-risk rounded-lg">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ============================================================================
// COMPLIANCE DRIFT ALERT
// ============================================================================

interface ComplianceDriftAlertProps {
  drift: ComplianceDrift;
  onAcknowledge: (driftId: string) => void;
  onRemediate: (driftId: string) => void;
}

export const ComplianceDriftAlert: React.FC<ComplianceDriftAlertProps> = ({
  drift,
  onAcknowledge,
  onRemediate,
}) => {
  const [expanded, setExpanded] = useState(false);

  const impactColors = {
    critical: 'border-l-red-500 bg-red-50',
    high: 'border-l-orange-500 bg-orange-50',
    medium: 'border-l-amber-500 bg-amber-50',
    low: 'border-l-blue-500 bg-blue-50',
  };

  return (
    <div className={`rounded-xl border-l-4 ${impactColors[drift.impactLevel]} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white">
              <span className="text-xl">⚠️</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-white border">
                  {drift.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-xs text-slate-500">{drift.id}</span>
              </div>
              <h4 className="mt-1 font-semibold text-primary">Compliance Drift Detected</h4>
              <p className="mt-1 text-sm text-secondary">{drift.changeSummary}</p>
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="p-1 text-slate-400 hover:text-slate-600">
            {expanded ? '▲' : '▼'}
          </button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 pl-12">
            {/* Version Change */}
            <div className="flex items-center gap-4 text-sm">
              <span className="px-2 py-1 rounded bg-white font-mono">v{drift.previousRequirementVersion}</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-1 rounded bg-green-200 font-mono text-green-800">v{drift.newRequirementVersion}</span>
            </div>

            {/* Gap Description */}
            <div className="p-3 rounded-lg bg-white border border-red-200">
              <h5 className="text-sm font-medium text-red-800 mb-1">Compliance Gap</h5>
              <p className="text-sm text-red-700">{drift.complianceGapDescription}</p>
            </div>

            {/* Affected Controls */}
            {drift.affectedControlIds.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-secondary mb-2">
                  Affected Controls ({drift.affectedControlIds.length})
                </h5>
                <div className="flex flex-wrap gap-2">
                  {drift.affectedControlIds.map((controlId) => (
                    <span key={controlId} className="px-2 py-1 text-xs font-mono rounded bg-white border">
                      {controlId}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Responses needing update */}
            {drift.previousUserResponses.filter(r => !r.meetsNewRequirement).length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-slate-700">Responses Requiring Update</h5>
                {drift.previousUserResponses.filter(r => !r.meetsNewRequirement).map((response) => (
                  <div key={response.questionId} className="p-3 rounded-lg bg-amber-100 border border-amber-200">
                    <p className="text-sm font-medium text-amber-800">{response.questionText}</p>
                    <p className="text-xs text-amber-600 mt-1">{response.gapAnalysis}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Required Actions */}
            {drift.requiredActions.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-secondary mb-2">Required Actions</h5>
                <div className="space-y-2">
                  {drift.requiredActions.map((action) => (
                    <div key={action.id} className="flex items-center justify-between p-3 rounded-lg card">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${
                          action.priority === 'critical' ? 'bg-status-risk' :
                          action.priority === 'high' ? 'bg-status-warning' : 'bg-amber-500'
                        }`} />
                        <span className="text-sm text-secondary">{action.description}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        action.status === 'complete' ? 'bg-status-success/10 text-status-success' : 'bg-steel-700 text-steel-400'
                      }`}>
                        {action.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 card border-t border-steel-700 dark:border-steel-700 light:border-slate-200 flex justify-end gap-2">
        {drift.status === 'detected' && (
          <button onClick={() => onAcknowledge(drift.id)} className="px-3 py-1.5 text-sm text-secondary">
            Acknowledge
          </button>
        )}
        <button onClick={() => onRemediate(drift.id)} className="btn-primary text-sm">
          Start Remediation
        </button>
      </div>
    </div>
  );
};


// ============================================================================
// VERSION BADGE HELPER
// ============================================================================

const VersionBadge: React.FC<{ version: string; label: string; variant: 'current' | 'new' }> = ({
  version,
  label,
  variant,
}) => (
  <div className={`px-3 py-1.5 rounded-lg text-center ${
    variant === 'current' ? 'bg-steel-700 dark:bg-steel-700 light:bg-slate-200' : 'bg-status-success/10'
  }`}>
    <div className={`text-xs ${variant === 'current' ? 'text-steel-400' : 'text-status-success'}`}>
      {label}
    </div>
    <div className={`font-mono font-bold ${variant === 'current' ? 'text-secondary' : 'text-status-success'}`}>
      {version}
    </div>
  </div>
);

export default RequirementComparisonViewer;
