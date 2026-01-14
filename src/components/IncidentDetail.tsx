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
  SOC2: '#3B82F6',
  ISO27001: '#10B981',
  HIPAA: '#8B5CF6',
  NIST: '#F59E0B',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const GlassPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative rounded-2xl overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-lg ${className}`}>
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
                  ? 'bg-emerald-500 text-white' 
                  : isCurrent 
                    ? 'bg-blue-500 text-white ring-4 ring-blue-500/30' 
                    : 'bg-slate-200 dark:bg-white/10 text-slate-400'
              }`}
              title={STATUS_LABELS[status]}
            >
              {isComplete ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
            </button>
            {index < STATUS_FLOW.length - 1 && (
              <div className={`flex-1 h-1 rounded ${index < currentIndex ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'}`} />
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
    detection: 'bg-red-500',
    action: 'bg-blue-500',
    finding: 'bg-yellow-500',
    escalation: 'bg-orange-500',
    communication: 'bg-purple-500',
    milestone: 'bg-emerald-500',
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${colors[event.eventType] || 'bg-slate-400'}`} />
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-white/10" />}
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-medium text-slate-900 dark:text-white">{event.title}</span>
          <span className="text-xs text-slate-500 dark:text-white/50">{new Date(event.timestamp).toLocaleString()}</span>
        </div>
        <p className="text-sm text-slate-600 dark:text-white/70">{event.description}</p>
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
    <div className={`rounded-xl border ${status.bg} border-slate-200 dark:border-white/10 overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-center gap-3"
      >
        <div className={status.color}>{status.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500 dark:text-white/50">{control.id}</span>
            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${status.bg} ${status.color}`}>{status.label}</span>
            {postIncidentStatus && postIncidentStatus !== 'not_tested' && (
              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 dark:bg-white/5 ${postStatusConfig[postIncidentStatus]?.color}`}>
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
            className="border-t border-slate-200 dark:border-white/10"
          >
            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-600 dark:text-white/70">{control.description}</p>
              
              {/* Framework Mappings */}
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-white/50 mb-2">Framework Mappings</p>
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
                <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                  <p className="text-xs font-medium text-slate-500 dark:text-white/50 mb-3">Post-Incident Assessment</p>
                  <div className="flex flex-wrap gap-2">
                    {(['verified', 'failed', 'partially_failed', 'not_applicable'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => onAssess({ postIncidentStatus: status })}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          assessmentResult?.postIncidentStatus === status
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'border-slate-200 dark:border-white/10 hover:border-blue-500'
                        }`}
                      >
                        {postStatusConfig[status]?.label}
                      </button>
                    ))}
                  </div>

                  {assessmentResult?.postIncidentStatus === 'failed' && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-slate-500 dark:text-white/50 mb-1">
                        Failure Description
                      </label>
                      <textarea
                        value={assessmentResult.failureDescription || ''}
                        onChange={e => onAssess({ failureDescription: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white resize-none"
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
                      className="w-4 h-4 rounded border-slate-300 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-white/70">This control failure contributed to the incident</span>
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
            <span className="px-2 py-1 text-xs font-mono bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60 rounded">
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
          <p className="text-slate-500 dark:text-white/60 mt-1">{incident.description}</p>
        </div>
      </div>

      {/* Status Progress */}
      <GlassPanel className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-white">Incident Status</h2>
          <span className="text-sm text-slate-500 dark:text-white/50">
            Current: <span className="font-medium text-slate-900 dark:text-white">{STATUS_LABELS[incident.status]}</span>
          </span>
        </div>
        <StatusProgressBar currentStatus={incident.status} onStatusChange={handleStatusChange} />
      </GlassPanel>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/70'
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
            <GlassPanel className="p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Incident Details</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500 dark:text-white/50">Threat Category</dt>
                  <dd className="text-sm font-medium text-slate-900 dark:text-white">{incident.threatCategory.replace(/_/g, ' ')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500 dark:text-white/50">Detected</dt>
                  <dd className="text-sm font-medium text-slate-900 dark:text-white">{new Date(incident.detectedAt).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500 dark:text-white/50">Affected Systems</dt>
                  <dd className="text-sm font-medium text-slate-900 dark:text-white">{incident.affectedSystems.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500 dark:text-white/50">Affected Users</dt>
                  <dd className="text-sm font-medium text-slate-900 dark:text-white">{incident.affectedUsers.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500 dark:text-white/50">Data Exposed</dt>
                  <dd className={`text-sm font-medium ${incident.dataExposed ? 'text-red-500' : 'text-emerald-500'}`}>
                    {incident.dataExposed ? 'Yes' : 'No'}
                  </dd>
                </div>
              </dl>
            </GlassPanel>

            {/* Response Team */}
            <GlassPanel className="p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Response Team</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    {incident.incidentCommander.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{incident.incidentCommander}</p>
                    <p className="text-xs text-slate-500 dark:text-white/50">Incident Commander</p>
                  </div>
                </div>
                {incident.responders.map((responder, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-white/60 font-bold">
                      {responder.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{responder}</p>
                      <p className="text-xs text-slate-500 dark:text-white/50">Responder</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>

            {/* Compliance Impact Summary */}
            <GlassPanel className="p-5 lg:col-span-2">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Compliance Impact Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{complianceMetrics.total}</p>
                  <p className="text-xs text-slate-500 dark:text-white/50">Affected Controls</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 text-center">
                  <p className="text-2xl font-bold text-emerald-500">{complianceMetrics.compliant}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Compliant</p>
                </div>
                <div className="p-4 rounded-xl bg-red-500/10 text-center">
                  <p className="text-2xl font-bold text-red-500">{complianceMetrics.gaps}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">Gaps</p>
                </div>
                <div className="p-4 rounded-xl bg-yellow-500/10 text-center">
                  <p className="text-2xl font-bold text-yellow-500">{complianceMetrics.partial}</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">Partial</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/5 text-center">
                  <p className="text-2xl font-bold text-slate-400">{complianceMetrics.unknown}</p>
                  <p className="text-xs text-slate-500 dark:text-white/50">Not Assessed</p>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {activeTab === 'timeline' && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GlassPanel className="p-5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-slate-900 dark:text-white">Incident Timeline</h3>
                <button
                  onClick={() => setShowAddEvent(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
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
                    className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30"
                  >
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <select
                          value={newEvent.eventType}
                          onChange={e => setNewEvent(prev => ({ ...prev, eventType: e.target.value as any }))}
                          className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
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
                          className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                        />
                      </div>
                      <textarea
                        value={newEvent.description}
                        onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description (optional)"
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowAddEvent(false)}
                          className="px-4 py-2 text-sm text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddTimelineEvent}
                          className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
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
            </GlassPanel>
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
              <GlassPanel className="p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                  {incident.threatCategory.replace(/_/g, ' ')} Threat Intelligence
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-white/50 mb-2">Recommended Actions</p>
                    <ul className="space-y-2">
                      {threatMapping.recommendedActions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-white/70">
                          <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-white/50 mb-2">Assessment Questions</p>
                    <ul className="space-y-2">
                      {threatMapping.assessmentQuestions.map((question, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-white/70">
                          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          {question}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </GlassPanel>
            )}

            {/* Affected Controls */}
            <GlassPanel className="p-5">
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
            </GlassPanel>
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
              <GlassPanel className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-white/20" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  No Assessment Started
                </h3>
                <p className="text-slate-500 dark:text-white/50 mb-6">
                  Start a post-incident assessment to evaluate control effectiveness and identify gaps.
                </p>
                <button
                  onClick={handleStartAssessment}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
                >
                  Start Assessment
                </button>
              </GlassPanel>
            ) : (
              <>
                <GlassPanel className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Post-Incident Assessment</h3>
                      <p className="text-sm text-slate-500 dark:text-white/50">
                        Started {new Date(assessment.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      assessment.status === 'complete' 
                        ? 'bg-emerald-500/10 text-emerald-500' 
                        : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {assessment.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Assessment Progress */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-emerald-500/10 text-center">
                      <p className="text-2xl font-bold text-emerald-500">{assessment.controlsValidated.length}</p>
                      <p className="text-xs text-emerald-600">Verified</p>
                    </div>
                    <div className="p-4 rounded-xl bg-red-500/10 text-center">
                      <p className="text-2xl font-bold text-red-500">{assessment.newGapsIdentified.length}</p>
                      <p className="text-xs text-red-600">New Gaps</p>
                    </div>
                    <div className="p-4 rounded-xl bg-orange-500/10 text-center">
                      <p className="text-2xl font-bold text-orange-500">{assessment.existingGapsExacerbated.length}</p>
                      <p className="text-xs text-orange-600">Worsened</p>
                    </div>
                  </div>
                </GlassPanel>

                {/* Control Assessments */}
                <GlassPanel className="p-5">
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
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
                      <button
                        onClick={() => ir.completeAssessment(assessment.id)}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
                      >
                        Complete Assessment
                      </button>
                    </div>
                  )}
                </GlassPanel>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IncidentDetail;
