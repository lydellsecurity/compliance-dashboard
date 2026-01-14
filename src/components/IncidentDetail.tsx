/**
 * Incident Detail Component
 * 
 * Detailed view of a single incident with:
 * - Timeline management
 * - Threat-to-compliance mapping
 * - Post-incident assessment
 * - Remediation tracking
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Clock, Shield, AlertTriangle, FileText,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronRight, Plus,
  Check, Eye,
} from 'lucide-react';
import type { UseComplianceReturn } from '../hooks/useCompliance';
import type { UseIncidentResponseReturn } from '../hooks/useIncidentResponse';
import type { 
  Incident, 
  IncidentStatus,
  ControlAssessmentResult,
} from '../types/incident.types';
import type { MasterControl, FrameworkId } from '../constants/controls';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_FLOW: IncidentStatus[] = [
  'detected', 'triaged', 'containment', 'eradication', 'recovery', 'lessons_learned', 'closed',
];

const STATUS_LABELS: Record<IncidentStatus, string> = {
  detected: 'Detected',
  triaged: 'Triaged',
  containment: 'Containment',
  eradication: 'Eradication',
  recovery: 'Recovery',
  lessons_learned: 'Lessons Learned',
  closed: 'Closed',
};

const FRAMEWORK_COLORS: Record<FrameworkId, string> = {
  SOC2: '#0066FF',
  ISO27001: '#059669',
  HIPAA: '#7C3AED',
  NIST: '#D97706',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}>
    {children}
  </div>
);

const StatusProgressBar: React.FC<{ 
  currentStatus: IncidentStatus;
  onStatusChange: (status: IncidentStatus) => void;
}> = ({ currentStatus, onStatusChange }) => {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-1">
      {STATUS_FLOW.map((status, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <React.Fragment key={status}>
            <button
              onClick={() => onStatusChange(status)}
              className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                isComplete
                  ? 'bg-emerald-600 text-white'
                  : isCurrent
                    ? 'bg-blue-600 text-white ring-4 ring-blue-600/30'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
              }`}
              title={STATUS_LABELS[status]}
            >
              {isComplete ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
            </button>
            {index < STATUS_FLOW.length - 1 && (
              <div className={`flex-1 h-1 rounded ${index < currentIndex ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const TimelineEvent: React.FC<{
  event: { id: string; timestamp: string; eventType: string; title: string; description: string; actor: string };
  isLast: boolean;
}> = ({ event, isLast }) => {
  const colors: Record<string, string> = {
    detection: 'bg-red-600',
    action: 'bg-blue-600',
    finding: 'bg-amber-500',
    escalation: 'bg-orange-600',
    communication: 'bg-purple-600',
    milestone: 'bg-emerald-600',
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${colors[event.eventType] || 'bg-slate-400'}`} />
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700" />}
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-medium text-slate-900 dark:text-white">{event.title}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(event.timestamp).toLocaleString()}</span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{event.description}</p>
        <p className="text-xs text-slate-400 mt-1">by {event.actor}</p>
      </div>
    </div>
  );
};

const AffectedControlCard: React.FC<{
  control: MasterControl;
  complianceStatus: 'compliant' | 'gap' | 'partial' | 'unknown';
  assessmentResult?: ControlAssessmentResult;
  onAssess?: (result: Partial<ControlAssessmentResult>) => void;
}> = ({ control, complianceStatus, assessmentResult, onAssess }) => {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    compliant: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Compliant' },
    gap: { icon: <XCircle className="w-4 h-4" />, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Gap' },
    partial: { icon: <AlertCircle className="w-4 h-4" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Partial' },
    unknown: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Not Assessed' },
  };

  const status = statusConfig[complianceStatus];

  const postIncidentStatus = assessmentResult?.postIncidentStatus;
  const postStatusConfig: Record<string, { color: string; label: string }> = {
    verified: { color: 'text-emerald-500', label: 'Verified' },
    failed: { color: 'text-red-500', label: 'Failed' },
    partially_failed: { color: 'text-yellow-500', label: 'Partially Failed' },
    not_tested: { color: 'text-slate-400', label: 'Not Tested' },
    not_applicable: { color: 'text-slate-400', label: 'N/A' },
  };

  return (
    <div className={`rounded-lg border ${status.bg} border-slate-200 dark:border-slate-700 overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-center gap-3"
      >
        <div className={status.color}>{status.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{control.id}</span>
            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${status.bg} ${status.color}`}>{status.label}</span>
            {postIncidentStatus && postIncidentStatus !== 'not_tested' && (
              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 dark:bg-slate-700 ${postStatusConfig[postIncidentStatus]?.color}`}>
                Post-IR: {postStatusConfig[postIncidentStatus]?.label}
              </span>
            )}
          </div>
          <p className="font-medium text-slate-900 dark:text-white truncate">{control.title}</p>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200 dark:border-slate-700"
          >
            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">{control.description}</p>

              {/* Framework Mappings */}
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Framework Mappings</p>
                <div className="flex flex-wrap gap-1">
                  {control.frameworkMappings.map((m, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-xs font-mono rounded border"
                      style={{
                        backgroundColor: `${FRAMEWORK_COLORS[m.frameworkId]}10`,
                        borderColor: `${FRAMEWORK_COLORS[m.frameworkId]}30`,
                        color: FRAMEWORK_COLORS[m.frameworkId],
                      }}
                    >
                      {m.frameworkId} {m.clauseId}
                    </span>
                  ))}
                </div>
              </div>

              {/* Post-Incident Assessment */}
              {onAssess && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">Post-Incident Assessment</p>
                  <div className="flex flex-wrap gap-2">
                    {(['verified', 'failed', 'partially_failed', 'not_applicable'] as const).map(assessStatus => (
                      <button
                        key={assessStatus}
                        onClick={() => onAssess({ postIncidentStatus: assessStatus })}
                        className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                          assessmentResult?.postIncidentStatus === assessStatus
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-200 dark:border-slate-600 hover:border-blue-500'
                        }`}
                      >
                        {postStatusConfig[assessStatus]?.label}
                      </button>
                    ))}
                  </div>

                  {assessmentResult?.postIncidentStatus === 'failed' && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Failure Description
                      </label>
                      <textarea
                        value={assessmentResult.failureDescription || ''}
                        onChange={e => onAssess({ failureDescription: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white resize-none"
                        rows={2}
                        placeholder="Describe how this control failed..."
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentResult?.contributedToIncident || false}
                      onChange={e => onAssess({ contributedToIncident: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">This control failure contributed to the incident</span>
                  </label>
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

interface IncidentDetailProps {
  incident: Incident;
  compliance: UseComplianceReturn;
  ir: UseIncidentResponseReturn;
  onBack: () => void;
}

const IncidentDetail: React.FC<IncidentDetailProps> = ({ incident, compliance, ir, onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'compliance' | 'assessment'>('overview');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', eventType: 'action' as const });

  // Get threat mapping
  const threatMapping = ir.getThreatMapping(incident.threatCategory);
  
  // Get affected controls with their compliance status
  const affectedControls = useMemo(() => {
    return ir.getAffectedControls(incident.threatCategory, compliance);
  }, [incident.threatCategory, ir, compliance]);

  // Get or create assessment
  const assessment = ir.getAssessmentByIncidentId(incident.id);

  const handleStatusChange = (status: IncidentStatus) => {
    ir.updateIncidentStatus(incident.id, status);
  };

  const handleAddTimelineEvent = () => {
    if (!newEvent.title.trim()) return;
    ir.addTimelineEvent(incident.id, {
      timestamp: new Date().toISOString(),
      eventType: newEvent.eventType,
      title: newEvent.title,
      description: newEvent.description,
      actor: incident.incidentCommander,
      attachments: [],
    });
    setNewEvent({ title: '', description: '', eventType: 'action' });
    setShowAddEvent(false);
  };

  const handleStartAssessment = () => {
    ir.startAssessment(incident.id);
  };

  const handleUpdateControlAssessment = (controlId: string, result: Partial<ControlAssessmentResult>) => {
    if (!assessment) return;
    ir.updateControlAssessment(assessment.id, controlId, result);
  };

  // Calculate metrics
  const complianceMetrics = useMemo(() => {
    const total = affectedControls.length;
    const compliant = affectedControls.filter(c => c.currentStatus === 'compliant').length;
    const gaps = affectedControls.filter(c => c.currentStatus === 'gap').length;
    const partial = affectedControls.filter(c => c.currentStatus === 'partial').length;
    const unknown = affectedControls.filter(c => c.currentStatus === 'unknown').length;
    
    return { total, compliant, gaps, partial, unknown };
  }, [affectedControls]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Eye className="w-4 h-4" /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" /> },
    { id: 'compliance', label: 'Compliance Impact', icon: <Shield className="w-4 h-4" /> },
    { id: 'assessment', label: 'Assessment', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-1 text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
              {incident.incidentNumber}
            </span>
            <span className={`px-2 py-1 text-xs font-bold rounded ${
              incident.severity === 'critical' ? 'bg-red-500/10 text-red-500' :
              incident.severity === 'high' ? 'bg-orange-500/10 text-orange-500' :
              incident.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
              'bg-blue-500/10 text-blue-500'
            }`}>
              {incident.severity.toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{incident.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{incident.description}</p>
        </div>
      </div>

      {/* Status Progress */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-white">Incident Status</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Current: <span className="font-medium text-slate-900 dark:text-white">{STATUS_LABELS[incident.status]}</span>
          </span>
        </div>
        <StatusProgressBar currentStatus={incident.status} onStatusChange={handleStatusChange} />
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Incident Details */}
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Incident Details</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500 dark:text-slate-400">Threat Category</dt>
                  <dd className="text-sm font-medium text-slate-900 dark:text-white">{incident.threatCategory.replace(/_/g, ' ')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500 dark:text-slate-400">Detected</dt>
                  <dd className="text-sm font-medium text-slate-900 dark:text-white">{new Date(incident.detectedAt).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500 dark:text-slate-400">Affected Systems</dt>
                  <dd className="text-sm font-medium text-slate-900 dark:text-white">{incident.affectedSystems.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500 dark:text-slate-400">Affected Users</dt>
                  <dd className="text-sm font-medium text-slate-900 dark:text-white">{incident.affectedUsers.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500 dark:text-slate-400">Data Exposed</dt>
                  <dd className={`text-sm font-medium ${incident.dataExposed ? 'text-red-500' : 'text-emerald-500'}`}>
                    {incident.dataExposed ? 'Yes' : 'No'}
                  </dd>
                </div>
              </dl>
            </Card>

            {/* Response Team */}
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Response Team</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    {incident.incidentCommander.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{incident.incidentCommander}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Incident Commander</p>
                  </div>
                </div>
                {incident.responders.map((responder, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold">
                      {responder.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{responder}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Responder</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Compliance Impact Summary */}
            <Card className="p-5 lg:col-span-2">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Compliance Impact Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{complianceMetrics.total}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Affected Controls</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-500/10 text-center">
                  <p className="text-2xl font-bold text-emerald-500">{complianceMetrics.compliant}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Compliant</p>
                </div>
                <div className="p-4 rounded-lg bg-red-500/10 text-center">
                  <p className="text-2xl font-bold text-red-500">{complianceMetrics.gaps}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">Gaps</p>
                </div>
                <div className="p-4 rounded-lg bg-yellow-500/10 text-center">
                  <p className="text-2xl font-bold text-yellow-500">{complianceMetrics.partial}</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">Partial</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                  <p className="text-2xl font-bold text-slate-400">{complianceMetrics.unknown}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Not Assessed</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'timeline' && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-slate-900 dark:text-white">Incident Timeline</h3>
                <button
                  onClick={() => setShowAddEvent(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Event
                </button>
              </div>

              {/* Add Event Form */}
              <AnimatePresence>
                {showAddEvent && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30"
                  >
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <select
                          value={newEvent.eventType}
                          onChange={e => setNewEvent(prev => ({ ...prev, eventType: e.target.value as 'action' }))}
                          className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                          <option value="action">Action</option>
                          <option value="finding">Finding</option>
                          <option value="escalation">Escalation</option>
                          <option value="communication">Communication</option>
                          <option value="milestone">Milestone</option>
                        </select>
                        <input
                          type="text"
                          value={newEvent.title}
                          onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Event title"
                          className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                      <textarea
                        value={newEvent.description}
                        onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description (optional)"
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowAddEvent(false)}
                          className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddTimelineEvent}
                          className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                          Add Event
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Timeline Events */}
              <div className="space-y-0">
                {incident.timelineEvents.slice().reverse().map((event, i) => (
                  <TimelineEvent key={event.id} event={event} isLast={i === incident.timelineEvents.length - 1} />
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'compliance' && (
          <motion.div
            key="compliance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Threat Mapping Info */}
            {threatMapping && (
              <Card className="p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                  {incident.threatCategory.replace(/_/g, ' ')} Threat Intelligence
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Recommended Actions</p>
                    <ul className="space-y-2">
                      {threatMapping.recommendedActions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Assessment Questions</p>
                    <ul className="space-y-2">
                      {threatMapping.assessmentQuestions.map((question, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          {question}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            )}

            {/* Affected Controls */}
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                Affected Controls ({affectedControls.length})
              </h3>
              <div className="space-y-3">
                {affectedControls.map(({ control, currentStatus }) => (
                  <AffectedControlCard
                    key={control.id}
                    control={control}
                    complianceStatus={currentStatus}
                  />
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'assessment' && (
          <motion.div
            key="assessment"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {!assessment ? (
              <Card className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  No Assessment Started
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  Start a post-incident assessment to evaluate control effectiveness and identify gaps.
                </p>
                <button
                  onClick={handleStartAssessment}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Start Assessment
                </button>
              </Card>
            ) : (
              <>
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Post-Incident Assessment</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Started {new Date(assessment.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      assessment.status === 'complete'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    }`}>
                      {assessment.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Assessment Progress */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-emerald-500/10 text-center">
                      <p className="text-2xl font-bold text-emerald-500">{assessment.controlsValidated.length}</p>
                      <p className="text-xs text-emerald-600">Verified</p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-500/10 text-center">
                      <p className="text-2xl font-bold text-red-500">{assessment.newGapsIdentified.length}</p>
                      <p className="text-xs text-red-600">New Gaps</p>
                    </div>
                    <div className="p-4 rounded-lg bg-orange-500/10 text-center">
                      <p className="text-2xl font-bold text-orange-500">{assessment.existingGapsExacerbated.length}</p>
                      <p className="text-xs text-orange-600">Worsened</p>
                    </div>
                  </div>
                </Card>

                {/* Control Assessments */}
                <Card className="p-5">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Control Assessments</h3>
                  <div className="space-y-3">
                    {affectedControls.map(({ control, currentStatus }) => {
                      const controlAssessment = assessment.controlAssessments.find(ca => ca.controlId === control.id);
                      return (
                        <AffectedControlCard
                          key={control.id}
                          control={control}
                          complianceStatus={currentStatus}
                          assessmentResult={controlAssessment}
                          onAssess={(result) => handleUpdateControlAssessment(control.id, result)}
                        />
                      );
                    })}
                  </div>

                  {assessment.status !== 'complete' && (
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => ir.completeAssessment(assessment.id)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Complete Assessment
                      </button>
                    </div>
                  )}
                </Card>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IncidentDetail;
