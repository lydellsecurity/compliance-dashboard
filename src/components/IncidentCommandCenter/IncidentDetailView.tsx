/**
 * Incident Detail View
 *
 * Comprehensive view of a single incident with:
 * - Status tracking
 * - Timeline events
 * - Evidence attachments
 * - Compliance impact
 * - Post-mortem export
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  AlertTriangle,
  Shield,
  Clock,
  Users,
  Target,
  CheckCircle2,
  BookOpen,
  Paperclip,
  Download,
  Building2,
  Database,
  ChevronRight,
  Plus,
  Server,
  User,
  AlertCircle,
} from 'lucide-react';
import type { UseComplianceReturn } from '../../hooks/useCompliance';
import type { UseIncidentResponseReturn } from '../../hooks/useIncidentResponse';
import type {
  Incident,
  IncidentStatus,
  IncidentTimelineEvent,
} from '../../types/incident.types';
import { SEVERITY_CONFIG, STATUS_CONFIG, THREAT_LABELS } from './index';
import EvidencePanel from './EvidencePanel';

// ============================================================================
// TYPES
// ============================================================================

interface IncidentDetailViewProps {
  incident: Incident;
  compliance: UseComplianceReturn;
  ir: UseIncidentResponseReturn;
  organizationId: string;
  userId: string;
  onBack: () => void;
  onOpenPlaybook: (incident: Incident) => void;
}

// ============================================================================
// STATUS WORKFLOW
// ============================================================================

const STATUS_WORKFLOW: IncidentStatus[] = [
  'detected',
  'triaged',
  'containment',
  'eradication',
  'recovery',
  'lessons_learned',
  'closed',
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const IncidentDetailView: React.FC<IncidentDetailViewProps> = ({
  incident,
  compliance,
  ir,
  organizationId: _organizationId,
  userId,
  onBack,
  onOpenPlaybook,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'compliance' | 'team'>('overview');
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventType, setNewEventType] = useState<IncidentTimelineEvent['eventType']>('action');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');

  const severityConfig = SEVERITY_CONFIG[incident.severity];
  const statusConfig = STATUS_CONFIG[incident.status];
  const isDrill = incident.title.toLowerCase().includes('drill') ||
    incident.title.toLowerCase().includes('exercise') ||
    incident.title.toLowerCase().includes('tabletop');

  // Calculate time elapsed
  const timeElapsed = useMemo(() => {
    const start = new Date(incident.detectedAt);
    const end = incident.closedAt ? new Date(incident.closedAt) : new Date();
    const diffHours = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d ${diffHours % 24}h`;
  }, [incident.detectedAt, incident.closedAt]);

  // Get current status index
  const currentStatusIndex = STATUS_WORKFLOW.indexOf(incident.status);

  // Get affected controls with compliance status
  const affectedControlsWithStatus = useMemo(() => {
    return incident.affectedControlIds.map(controlId => {
      const control = compliance.allControls.find(c => c.id === controlId);
      const response = compliance.getResponse(controlId);
      return {
        controlId,
        control,
        response,
        hasGap: response?.answer === 'no',
      };
    });
  }, [incident.affectedControlIds, compliance]);

  const gapCount = affectedControlsWithStatus.filter(c => c.hasGap).length;

  // Handle status update
  const handleStatusUpdate = useCallback((newStatus: IncidentStatus) => {
    ir.updateIncidentStatus(incident.id, newStatus);
  }, [ir, incident.id]);

  // Handle add timeline event
  const handleAddEvent = useCallback(() => {
    if (!newEventTitle.trim()) return;

    ir.addTimelineEvent(incident.id, {
      eventType: newEventType,
      title: newEventTitle,
      description: newEventDescription,
      timestamp: new Date().toISOString(),
      actor: userId,
      attachments: [],
    });

    setNewEventTitle('');
    setNewEventDescription('');
    setShowAddEvent(false);
  }, [ir, incident.id, newEventType, newEventTitle, newEventDescription, userId]);

  // Export post-mortem report
  const handleExportPostMortem = useCallback(() => {
    // This would generate a PDF report
    console.log('Exporting post-mortem report for incident:', incident.id);
    // For now, we'll create a simple text export
    const report = `
POST-INCIDENT REPORT
====================

Incident Number: ${incident.incidentNumber}
Title: ${incident.title}
Severity: ${severityConfig.label}
Status: ${statusConfig.label}
${isDrill ? '[TABLETOP EXERCISE]' : ''}

TIMELINE
--------
Detected: ${new Date(incident.detectedAt).toLocaleString()}
${incident.containedAt ? `Contained: ${new Date(incident.containedAt).toLocaleString()}` : ''}
${incident.eradicatedAt ? `Eradicated: ${new Date(incident.eradicatedAt).toLocaleString()}` : ''}
${incident.recoveredAt ? `Recovered: ${new Date(incident.recoveredAt).toLocaleString()}` : ''}
${incident.closedAt ? `Closed: ${new Date(incident.closedAt).toLocaleString()}` : ''}

Time to Resolution: ${timeElapsed}

DESCRIPTION
-----------
${incident.description}

THREAT DETAILS
--------------
Category: ${THREAT_LABELS[incident.threatCategory]}
Attack Vectors: ${incident.attackVectors.join(', ') || 'Not specified'}

IMPACT
------
Affected Systems: ${incident.affectedSystems.length}
Affected Users: ${incident.affectedUsers}
Data Exposed: ${incident.dataExposed ? 'Yes' : 'No'}
${incident.dataTypes.length > 0 ? `Data Types: ${incident.dataTypes.join(', ')}` : ''}

COMPLIANCE IMPACT
-----------------
Affected Controls: ${incident.affectedControlIds.length}
Pre-existing Gaps: ${gapCount}
Frameworks: ${incident.affectedFrameworks.join(', ') || 'Not specified'}

RESPONSE TEAM
-------------
Incident Commander: ${incident.incidentCommander}
Responders: ${incident.responders.join(', ') || 'Not specified'}
Client Contact: ${incident.clientContact || 'Not specified'}

TIMELINE EVENTS
---------------
${incident.timelineEvents.map(e =>
  `[${new Date(e.timestamp).toLocaleString()}] ${e.title}\n${e.description}`
).join('\n\n')}

---
Generated: ${new Date().toLocaleString()}
    `;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PostMortem_${incident.incidentNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [incident, severityConfig, statusConfig, isDrill, timeElapsed, gapCount]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={onBack}
            className="mt-1 p-2 text-slate-400 dark:text-steel-500 hover:text-slate-600 dark:hover:text-steel-200 hover:bg-slate-100 dark:hover:bg-steel-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm text-slate-500 dark:text-steel-400">{incident.incidentNumber}</span>
              {isDrill && (
                <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-lg">
                  TABLETOP EXERCISE
                </span>
              )}
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: severityConfig.bgColor,
                  color: severityConfig.color,
                }}
              >
                {severityConfig.label}
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: statusConfig.bgColor,
                  color: statusConfig.color,
                }}
              >
                {statusConfig.icon}
                {statusConfig.label}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-steel-100">{incident.title}</h1>
            <p className="text-slate-500 dark:text-steel-400 mt-1">{incident.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenPlaybook(incident)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            View Playbook
          </button>
          <button
            onClick={() => setShowEvidencePanel(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-steel-700 text-slate-700 dark:text-steel-200 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-steel-600 transition-colors"
          >
            <Paperclip className="w-4 h-4" />
            Evidence
          </button>
          <button
            onClick={handleExportPostMortem}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-steel-700 text-slate-700 dark:text-steel-200 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-steel-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Status Workflow */}
      <div className="bg-white dark:bg-midnight-900 rounded-2xl border border-slate-200 dark:border-steel-700 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-steel-100">Response Progress</h3>
          <span className="text-sm text-slate-500 dark:text-steel-400">
            <Clock className="w-4 h-4 inline mr-1" />
            Elapsed: {timeElapsed}
          </span>
        </div>
        <div className="flex items-center">
          {STATUS_WORKFLOW.map((status, index) => {
            const config = STATUS_CONFIG[status];
            const isCompleted = index < currentStatusIndex;
            const isCurrent = index === currentStatusIndex;
            const isClickable = index === currentStatusIndex + 1;

            return (
              <React.Fragment key={status}>
                <button
                  onClick={() => isClickable && handleStatusUpdate(status)}
                  disabled={!isClickable && !isCurrent}
                  className={`flex flex-col items-center ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'ring-4 ring-indigo-100'
                        : isClickable
                        ? 'hover:ring-4 hover:ring-indigo-50'
                        : ''
                    }`}
                    style={{
                      backgroundColor: isCompleted ? undefined : config.bgColor,
                      color: isCompleted ? undefined : config.color,
                    }}
                  >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : config.icon}
                  </div>
                  <span className={`text-xs font-medium ${
                    isCurrent ? 'text-indigo-600' : isCompleted ? 'text-emerald-600' : 'text-slate-500'
                  }`}>
                    {config.label}
                  </span>
                </button>
                {index < STATUS_WORKFLOW.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded-full ${
                    index < currentStatusIndex ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-steel-700'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-steel-700">
        {[
          { id: 'overview', label: 'Overview', icon: <Target className="w-4 h-4" /> },
          { id: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" /> },
          { id: 'compliance', label: 'Compliance Impact', icon: <Shield className="w-4 h-4" /> },
          { id: 'team', label: 'Response Team', icon: <Users className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-steel-400 hover:text-slate-700 dark:hover:text-steel-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-12 gap-6">
              {/* Impact Summary */}
              <div className="col-span-12 lg:col-span-8 space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 p-4">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-steel-400 mb-2">
                      <Server className="w-4 h-4" />
                      <span className="text-sm">Systems</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-steel-100">{incident.affectedSystems.length}</p>
                  </div>
                  <div className="bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 p-4">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-steel-400 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Users</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-steel-100">{incident.affectedUsers}</p>
                  </div>
                  <div className="bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 p-4">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-steel-400 mb-2">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm">Controls</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-steel-100">{incident.affectedControlIds.length}</p>
                  </div>
                  <div className="bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 p-4">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-steel-400 mb-2">
                      <Database className="w-4 h-4" />
                      <span className="text-sm">Data Exposed</span>
                    </div>
                    <p className={`text-2xl font-bold ${incident.dataExposed ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {incident.dataExposed ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>

                {/* Affected Systems */}
                {incident.affectedSystems.length > 0 && (
                  <div className="bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
                    <h4 className="font-semibold text-slate-900 dark:text-steel-100 mb-4">Affected Systems</h4>
                    <div className="flex flex-wrap gap-2">
                      {incident.affectedSystems.map((system, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-steel-700 text-slate-700 dark:text-steel-200 rounded-lg text-sm"
                        >
                          <Server className="w-4 h-4" />
                          {system}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data Types */}
                {incident.dataExposed && incident.dataTypes.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <h4 className="font-semibold text-red-900 dark:text-red-200">Data Types Exposed</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {incident.dataTypes.map((type, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium"
                        >
                          {type.toUpperCase()}
                        </span>
                      ))}
                    </div>
                    {incident.regulatoryNotificationRequired && (
                      <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-700 dark:text-red-400">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          Regulatory notification may be required
                          {incident.notificationDeadline && ` by ${new Date(incident.notificationDeadline).toLocaleDateString()}`}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Threat Details */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                <div className="bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
                  <h4 className="font-semibold text-slate-900 dark:text-steel-100 mb-4">Threat Details</h4>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm text-slate-500 dark:text-steel-400">Category</dt>
                      <dd className="font-medium text-slate-900 dark:text-steel-100">{THREAT_LABELS[incident.threatCategory]}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-slate-500 dark:text-steel-400 mb-1">Attack Vectors</dt>
                      <dd className="flex flex-wrap gap-1">
                        {incident.attackVectors.length > 0 ? (
                          incident.attackVectors.map((vector, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-300 rounded text-xs"
                            >
                              {vector.replace(/_/g, ' ')}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 dark:text-steel-500 text-sm">Not specified</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-slate-500 dark:text-steel-400">Frameworks Affected</dt>
                      <dd className="flex flex-wrap gap-1 mt-1">
                        {incident.affectedFrameworks.length > 0 ? (
                          incident.affectedFrameworks.map((fw, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-xs font-medium"
                            >
                              {fw}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 dark:text-steel-500 text-sm">To be determined</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
                  <h4 className="font-semibold text-slate-900 dark:text-steel-100 mb-4">Key Timestamps</h4>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm text-slate-500 dark:text-steel-400">Detected</dt>
                      <dd className="text-sm font-medium text-slate-900 dark:text-steel-100">
                        {new Date(incident.detectedAt).toLocaleString()}
                      </dd>
                    </div>
                    {incident.containedAt && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-slate-500 dark:text-steel-400">Contained</dt>
                        <dd className="text-sm font-medium text-slate-900 dark:text-steel-100">
                          {new Date(incident.containedAt).toLocaleString()}
                        </dd>
                      </div>
                    )}
                    {incident.eradicatedAt && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-slate-500 dark:text-steel-400">Eradicated</dt>
                        <dd className="text-sm font-medium text-slate-900 dark:text-steel-100">
                          {new Date(incident.eradicatedAt).toLocaleString()}
                        </dd>
                      </div>
                    )}
                    {incident.recoveredAt && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-slate-500 dark:text-steel-400">Recovered</dt>
                        <dd className="text-sm font-medium text-slate-900 dark:text-steel-100">
                          {new Date(incident.recoveredAt).toLocaleString()}
                        </dd>
                      </div>
                    )}
                    {incident.closedAt && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-slate-500 dark:text-steel-400">Closed</dt>
                        <dd className="text-sm font-medium text-slate-900 dark:text-steel-100">
                          {new Date(incident.closedAt).toLocaleString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-semibold text-slate-900 dark:text-steel-100">Incident Timeline</h4>
                <button
                  onClick={() => setShowAddEvent(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Event
                </button>
              </div>

              {/* Add Event Form */}
              <AnimatePresence>
                {showAddEvent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 bg-slate-50 dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700"
                  >
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-steel-200 mb-1">Event Type</label>
                        <select
                          value={newEventType}
                          onChange={e => setNewEventType(e.target.value as IncidentTimelineEvent['eventType'])}
                          className="w-full px-3 py-2 bg-white dark:bg-midnight-900 border border-slate-200 dark:border-steel-600 rounded-lg text-sm text-slate-900 dark:text-steel-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                          <option value="action">Action Taken</option>
                          <option value="finding">Finding</option>
                          <option value="escalation">Escalation</option>
                          <option value="communication">Communication</option>
                          <option value="milestone">Milestone</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-steel-200 mb-1">Title</label>
                        <input
                          type="text"
                          value={newEventTitle}
                          onChange={e => setNewEventTitle(e.target.value)}
                          placeholder="Event title..."
                          className="w-full px-3 py-2 bg-white dark:bg-midnight-900 border border-slate-200 dark:border-steel-600 rounded-lg text-sm text-slate-900 dark:text-steel-100 placeholder-slate-400 dark:placeholder-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 dark:text-steel-200 mb-1">Description</label>
                      <textarea
                        value={newEventDescription}
                        onChange={e => setNewEventDescription(e.target.value)}
                        placeholder="Describe what happened..."
                        rows={2}
                        className="w-full px-3 py-2 bg-white dark:bg-midnight-900 border border-slate-200 dark:border-steel-600 rounded-lg text-sm text-slate-900 dark:text-steel-100 placeholder-slate-400 dark:placeholder-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowAddEvent(false)}
                        className="px-3 py-2 text-slate-600 dark:text-steel-300 hover:bg-slate-100 dark:hover:bg-steel-700 rounded-lg transition-colors text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddEvent}
                        disabled={!newEventTitle.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
                      >
                        Add Event
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Timeline */}
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-steel-700" />
                <div className="space-y-6">
                  {incident.timelineEvents.length === 0 ? (
                    <p className="text-slate-500 dark:text-steel-400 text-center py-8">No timeline events recorded yet</p>
                  ) : (
                    [...incident.timelineEvents]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map(event => (
                        <div key={event.id} className="relative flex gap-4">
                          <div className="w-12 flex-shrink-0 flex justify-center">
                            <div className="w-4 h-4 rounded-full bg-indigo-500 border-4 border-white z-10" />
                          </div>
                          <div className="flex-1 pb-6">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-slate-400 dark:text-steel-500">
                                {new Date(event.timestamp).toLocaleString()}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-300 rounded text-xs capitalize">
                                {event.eventType}
                              </span>
                            </div>
                            <h5 className="font-medium text-slate-900 dark:text-steel-100">{event.title}</h5>
                            <p className="text-sm text-slate-600 dark:text-steel-300 mt-1">{event.description}</p>
                            <p className="text-xs text-slate-400 dark:text-steel-500 mt-2">by {event.actor}</p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 p-4">
                  <p className="text-sm text-slate-500 dark:text-steel-400">Affected Controls</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-steel-100">{incident.affectedControlIds.length}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4">
                  <p className="text-sm text-red-600 dark:text-red-400">Pre-existing Gaps</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{gapCount}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">Controls Validated</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{incident.affectedControlIds.length - gapCount}</p>
                </div>
              </div>

              {/* Controls List */}
              <div className="bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-steel-700">
                  <h4 className="font-semibold text-slate-900 dark:text-steel-100">Affected Controls</h4>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-steel-700">
                  {affectedControlsWithStatus.length === 0 ? (
                    <p className="text-slate-500 dark:text-steel-400 text-center py-8">No controls mapped to this incident</p>
                  ) : (
                    affectedControlsWithStatus.map(({ controlId, control, hasGap }) => (
                      <div key={controlId} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            hasGap ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'
                          }`}>
                            {hasGap ? (
                              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            ) : (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-steel-100">
                              {control?.title || controlId}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-steel-400">{controlId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                            hasGap
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {hasGap ? 'Gap Identified' : 'Control Validated'}
                          </span>
                          <ChevronRight className="w-5 h-5 text-slate-400 dark:text-steel-500" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="grid grid-cols-2 gap-6">
              {/* Incident Commander */}
              <div className="bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
                <h4 className="font-semibold text-slate-900 dark:text-steel-100 mb-4">Incident Commander</h4>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-steel-100">{incident.incidentCommander}</p>
                    <p className="text-sm text-slate-500 dark:text-steel-400">Overall incident authority</p>
                  </div>
                </div>
              </div>

              {/* Client Contact */}
              {incident.clientContact && (
                <div className="bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
                  <h4 className="font-semibold text-slate-900 dark:text-steel-100 mb-4">Client Contact</h4>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-steel-100">{incident.clientContact}</p>
                      <p className="text-sm text-slate-500 dark:text-steel-400">Primary client liaison</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Responders */}
              <div className="col-span-2 bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
                <h4 className="font-semibold text-slate-900 dark:text-steel-100 mb-4">Response Team</h4>
                {incident.responders.length === 0 ? (
                  <p className="text-slate-500 dark:text-steel-400">No additional responders assigned</p>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {incident.responders.map((responder, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-midnight-800 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-steel-700 flex items-center justify-center">
                          <User className="w-5 h-5 text-slate-600 dark:text-steel-300" />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-steel-100">{responder}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Evidence Panel Modal */}
      <AnimatePresence>
        {showEvidencePanel && (
          <EvidencePanel
            incidentId={incident.id}
            onClose={() => setShowEvidencePanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default IncidentDetailView;
