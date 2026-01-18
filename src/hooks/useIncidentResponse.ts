/**
 * useIncidentResponse Hook
 *
 * Incident Response state management that integrates with useCompliance.
 * Provides post-breach compliance assessment, threat mapping, and client reporting.
 *
 * Part of the AttestAI platform by Lydell Security.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  ThreatCategory,
  AttackVector,
  PostIncidentAssessment,
  ControlAssessmentResult,
  RemediationAction,
  RegulatoryNotification,
  ClientEngagement,
  ComplianceReport,
  IncidentTimelineEvent,
  ThreatControlMapping,
} from '../types/incident.types';
import { THREAT_CONTROL_MAPPINGS, getControlsForThreat } from '../types/incident.types';
import type { UseComplianceReturn } from './useCompliance';
import type { FrameworkId, MasterControl } from '../constants/controls';
import { getOrgStorageKey } from '../utils/storageMigration';

// ============================================================================
// UUID GENERATOR
// ============================================================================

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const generateIncidentNumber = (year: number, sequence: number): string => {
  return `INC-${year}-${String(sequence).padStart(4, '0')}`;
};

// ============================================================================
// LOCAL STORAGE KEYS
// ============================================================================

// Legacy storage keys (for backwards compatibility)
const LEGACY_STORAGE_KEYS = {
  INCIDENTS: 'attestai-ir-incidents',
  ASSESSMENTS: 'attestai-ir-assessments',
  ENGAGEMENTS: 'attestai-ir-engagements',
  REPORTS: 'attestai-ir-reports',
  INCIDENT_SEQUENCE: 'attestai-ir-sequence',
} as const;

// Get storage keys for an organization (or use legacy keys if no org)
function getStorageKeys(organizationId?: string | null) {
  if (organizationId) {
    return {
      INCIDENTS: getOrgStorageKey(organizationId, 'ir-incidents'),
      ASSESSMENTS: getOrgStorageKey(organizationId, 'ir-assessments'),
      ENGAGEMENTS: getOrgStorageKey(organizationId, 'ir-engagements'),
      REPORTS: getOrgStorageKey(organizationId, 'ir-reports'),
      INCIDENT_SEQUENCE: getOrgStorageKey(organizationId, 'ir-sequence'),
    };
  }
  return LEGACY_STORAGE_KEYS;
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save to localStorage: ${key}`, error);
  }
}

// ============================================================================
// HOOK INTERFACE
// ============================================================================

export interface UseIncidentResponseReturn {
  // Incidents
  incidents: Incident[];
  activeIncidents: Incident[];
  getIncidentById: (id: string) => Incident | undefined;
  createIncident: (data: CreateIncidentData) => Incident;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  updateIncidentStatus: (id: string, status: IncidentStatus) => void;
  addTimelineEvent: (incidentId: string, event: Omit<IncidentTimelineEvent, 'id'>) => void;
  
  // Post-Incident Assessment
  assessments: PostIncidentAssessment[];
  getAssessmentByIncidentId: (incidentId: string) => PostIncidentAssessment | undefined;
  startAssessment: (incidentId: string) => PostIncidentAssessment;
  updateControlAssessment: (assessmentId: string, controlId: string, result: Partial<ControlAssessmentResult>) => void;
  completeAssessment: (assessmentId: string) => void;
  
  // Threat Mapping (uses existing compliance data)
  getThreatMapping: (threatCategory: ThreatCategory) => ThreatControlMapping | undefined;
  getAffectedControls: (threatCategory: ThreatCategory, compliance: UseComplianceReturn) => {
    control: MasterControl;
    currentStatus: 'compliant' | 'gap' | 'partial' | 'unknown';
  }[];
  
  // Remediation Tracking
  getRemediationActions: (assessmentId: string) => RemediationAction[];
  addRemediationAction: (assessmentId: string, action: Omit<RemediationAction, 'id'>) => RemediationAction;
  updateRemediationAction: (assessmentId: string, actionId: string, updates: Partial<RemediationAction>) => void;
  
  // Regulatory Notifications
  addNotification: (assessmentId: string, notification: Omit<RegulatoryNotification, 'id'>) => RegulatoryNotification;
  updateNotification: (assessmentId: string, notificationId: string, updates: Partial<RegulatoryNotification>) => void;
  getPendingNotifications: () => { assessment: PostIncidentAssessment; notification: RegulatoryNotification }[];
  
  // Client Engagements
  engagements: ClientEngagement[];
  createEngagement: (data: Omit<ClientEngagement, 'id' | 'createdAt' | 'updatedAt'>) => ClientEngagement;
  updateEngagement: (id: string, updates: Partial<ClientEngagement>) => void;
  getEngagementById: (id: string) => ClientEngagement | undefined;
  
  // Reporting
  reports: ComplianceReport[];
  generateReport: (engagementId: string, reportType: ComplianceReport['reportType'], compliance: UseComplianceReturn) => ComplianceReport;
  
  // Statistics
  stats: {
    totalIncidents: number;
    activeIncidents: number;
    incidentsBySeverity: Record<IncidentSeverity, number>;
    incidentsByThreatCategory: Record<ThreatCategory, number>;
    pendingAssessments: number;
    overdueRemediations: number;
    pendingNotifications: number;
  };
}

export interface CreateIncidentData {
  title: string;
  description: string;
  severity: IncidentSeverity;
  threatCategory: ThreatCategory;
  attackVectors: AttackVector[];
  affectedSystems: string[];
  affectedUsers: number;
  dataExposed: boolean;
  dataTypes: string[];
  incidentCommander: string;
  responders: string[];
  clientContact: string;
}

// ============================================================================
// HOOK OPTIONS
// ============================================================================

export interface UseIncidentResponseOptions {
  organizationId?: string | null;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useIncidentResponse(options: UseIncidentResponseOptions = {}): UseIncidentResponseReturn {
  const { organizationId } = options;

  // Get storage keys based on organization
  const storageKeys = useMemo(() => getStorageKeys(organizationId), [organizationId]);

  // State
  const [incidents, setIncidents] = useState<Incident[]>(() =>
    loadFromStorage(storageKeys.INCIDENTS, [])
  );

  const [assessments, setAssessments] = useState<PostIncidentAssessment[]>(() =>
    loadFromStorage(storageKeys.ASSESSMENTS, [])
  );

  const [engagements, setEngagements] = useState<ClientEngagement[]>(() =>
    loadFromStorage(storageKeys.ENGAGEMENTS, [])
  );

  const [reports, setReports] = useState<ComplianceReport[]>(() =>
    loadFromStorage(storageKeys.REPORTS, [])
  );

  const [incidentSequence, setIncidentSequence] = useState<number>(() =>
    loadFromStorage(storageKeys.INCIDENT_SEQUENCE, 0)
  );

  // Reload data when organization changes
  useEffect(() => {
    if (organizationId) {
      setIncidents(loadFromStorage(storageKeys.INCIDENTS, []));
      setAssessments(loadFromStorage(storageKeys.ASSESSMENTS, []));
      setEngagements(loadFromStorage(storageKeys.ENGAGEMENTS, []));
      setReports(loadFromStorage(storageKeys.REPORTS, []));
      setIncidentSequence(loadFromStorage(storageKeys.INCIDENT_SEQUENCE, 0));
    }
  }, [organizationId, storageKeys]);

  // Persistence
  useEffect(() => { saveToStorage(storageKeys.INCIDENTS, incidents); }, [incidents, storageKeys.INCIDENTS]);
  useEffect(() => { saveToStorage(storageKeys.ASSESSMENTS, assessments); }, [assessments, storageKeys.ASSESSMENTS]);
  useEffect(() => { saveToStorage(storageKeys.ENGAGEMENTS, engagements); }, [engagements, storageKeys.ENGAGEMENTS]);
  useEffect(() => { saveToStorage(storageKeys.REPORTS, reports); }, [reports, storageKeys.REPORTS]);
  useEffect(() => { saveToStorage(storageKeys.INCIDENT_SEQUENCE, incidentSequence); }, [incidentSequence, storageKeys.INCIDENT_SEQUENCE]);

  // ============================================================================
  // INCIDENT MANAGEMENT
  // ============================================================================

  const activeIncidents = useMemo(() => 
    incidents.filter(i => i.status !== 'closed'),
  [incidents]);

  const getIncidentById = useCallback((id: string): Incident | undefined => {
    return incidents.find(i => i.id === id);
  }, [incidents]);

  const createIncident = useCallback((data: CreateIncidentData): Incident => {
    const now = new Date().toISOString();
    const year = new Date().getFullYear();
    const newSequence = incidentSequence + 1;
    
    // Get affected controls based on threat category
    const threatMapping = getControlsForThreat(data.threatCategory);
    const affectedControlIds = threatMapping?.affectedControlIds || [];
    const affectedFrameworks = threatMapping?.frameworkImplications.map(f => f.frameworkId) || [];
    
    const incident: Incident = {
      id: generateUUID(),
      incidentNumber: generateIncidentNumber(year, newSequence),
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: 'detected',
      threatCategory: data.threatCategory,
      attackVectors: data.attackVectors,
      detectedAt: now,
      containedAt: null,
      eradicatedAt: null,
      recoveredAt: null,
      closedAt: null,
      affectedSystems: data.affectedSystems,
      affectedUsers: data.affectedUsers,
      dataExposed: data.dataExposed,
      dataTypes: data.dataTypes,
      financialImpact: null,
      incidentCommander: data.incidentCommander,
      responders: data.responders,
      clientContact: data.clientContact,
      affectedControlIds,
      affectedFrameworks: affectedFrameworks as FrameworkId[],
      regulatoryNotificationRequired: data.dataExposed && data.dataTypes.length > 0,
      notificationDeadline: null,
      forensicReportUrl: null,
      timelineEvents: [
        {
          id: generateUUID(),
          timestamp: now,
          eventType: 'detection',
          title: 'Incident Detected',
          description: `Incident created: ${data.title}`,
          actor: data.incidentCommander,
          attachments: [],
        },
      ],
      createdAt: now,
      updatedAt: now,
      createdBy: data.incidentCommander,
    };

    setIncidents(prev => [incident, ...prev]);
    setIncidentSequence(newSequence);
    
    return incident;
  }, [incidentSequence]);

  const updateIncident = useCallback((id: string, updates: Partial<Incident>) => {
    setIncidents(prev => prev.map(i => 
      i.id === id 
        ? { ...i, ...updates, updatedAt: new Date().toISOString() }
        : i
    ));
  }, []);

  const updateIncidentStatus = useCallback((id: string, status: IncidentStatus) => {
    const now = new Date().toISOString();
    const statusTimestamps: Partial<Incident> = { status, updatedAt: now };
    
    switch (status) {
      case 'containment':
        statusTimestamps.containedAt = now;
        break;
      case 'eradication':
        statusTimestamps.eradicatedAt = now;
        break;
      case 'recovery':
        statusTimestamps.recoveredAt = now;
        break;
      case 'closed':
        statusTimestamps.closedAt = now;
        break;
    }
    
    setIncidents(prev => prev.map(i => 
      i.id === id ? { ...i, ...statusTimestamps } : i
    ));
  }, []);

  const addTimelineEvent = useCallback((incidentId: string, event: Omit<IncidentTimelineEvent, 'id'>) => {
    const fullEvent: IncidentTimelineEvent = {
      ...event,
      id: generateUUID(),
    };
    
    setIncidents(prev => prev.map(i => 
      i.id === incidentId 
        ? { 
            ...i, 
            timelineEvents: [...i.timelineEvents, fullEvent],
            updatedAt: new Date().toISOString(),
          }
        : i
    ));
  }, []);

  // ============================================================================
  // POST-INCIDENT ASSESSMENT
  // ============================================================================

  const getAssessmentByIncidentId = useCallback((incidentId: string): PostIncidentAssessment | undefined => {
    return assessments.find(a => a.incidentId === incidentId);
  }, [assessments]);

  const startAssessment = useCallback((incidentId: string): PostIncidentAssessment => {
    const incident = incidents.find(i => i.id === incidentId);
    if (!incident) throw new Error('Incident not found');

    const now = new Date().toISOString();
    
    // Create control assessments for affected controls
    const controlAssessments: ControlAssessmentResult[] = incident.affectedControlIds.map(controlId => ({
      controlId,
      controlTitle: '', // Will be populated when rendering with compliance data
      preIncidentAnswer: null,
      preIncidentEvidenceId: null,
      postIncidentStatus: 'not_tested',
      failureDescription: null,
      contributedToIncident: false,
      rootCauseNotes: '',
      requiresRemediation: false,
      remediationPriority: null,
      remediationPlan: '',
      remediationDeadline: null,
      assessmentNotes: '',
      evidenceCollected: [],
    }));

    const assessment: PostIncidentAssessment = {
      id: generateUUID(),
      incidentId,
      status: 'in_progress',
      startedAt: now,
      completedAt: null,
      controlAssessments,
      newGapsIdentified: [],
      existingGapsExacerbated: [],
      controlsValidated: [],
      immediateActions: [],
      shortTermActions: [],
      longTermActions: [],
      notificationsSent: [],
      pendingNotifications: [],
      assessedBy: incident.incidentCommander,
      reviewedBy: null,
      approvedBy: null,
    };

    setAssessments(prev => [assessment, ...prev]);
    return assessment;
  }, [incidents]);

  const updateControlAssessment = useCallback((
    assessmentId: string, 
    controlId: string, 
    result: Partial<ControlAssessmentResult>
  ) => {
    setAssessments(prev => prev.map(a => {
      if (a.id !== assessmentId) return a;
      
      const updatedControlAssessments = a.controlAssessments.map(ca =>
        ca.controlId === controlId ? { ...ca, ...result } : ca
      );
      
      return {
        ...a,
        controlAssessments: updatedControlAssessments,
      };
    }));
  }, []);

  const completeAssessment = useCallback((assessmentId: string) => {
    setAssessments(prev => prev.map(a => {
      if (a.id !== assessmentId) return a;
      
      // Analyze results
      const newGaps = a.controlAssessments
        .filter(ca => ca.postIncidentStatus === 'failed' && ca.preIncidentAnswer === 'yes')
        .map(ca => ca.controlId);
      
      const exacerbatedGaps = a.controlAssessments
        .filter(ca => ca.postIncidentStatus === 'failed' && ca.preIncidentAnswer === 'no')
        .map(ca => ca.controlId);
      
      const validated = a.controlAssessments
        .filter(ca => ca.postIncidentStatus === 'verified')
        .map(ca => ca.controlId);
      
      return {
        ...a,
        status: 'complete',
        completedAt: new Date().toISOString(),
        newGapsIdentified: newGaps,
        existingGapsExacerbated: exacerbatedGaps,
        controlsValidated: validated,
      };
    }));
  }, []);

  // ============================================================================
  // THREAT MAPPING
  // ============================================================================

  const getThreatMapping = useCallback((threatCategory: ThreatCategory): ThreatControlMapping | undefined => {
    return THREAT_CONTROL_MAPPINGS.find(m => m.threatCategory === threatCategory);
  }, []);

  const getAffectedControls = useCallback((
    threatCategory: ThreatCategory, 
    compliance: UseComplianceReturn
  ): { control: MasterControl; currentStatus: 'compliant' | 'gap' | 'partial' | 'unknown' }[] => {
    const mapping = getThreatMapping(threatCategory);
    if (!mapping) return [];

    return mapping.affectedControlIds
      .map(controlId => {
        const control = compliance.getControlById(controlId);
        if (!control) return null;
        
        const response = compliance.getResponse(controlId);
        let currentStatus: 'compliant' | 'gap' | 'partial' | 'unknown' = 'unknown';
        
        if (response?.answer === 'yes' || response?.answer === 'na') {
          currentStatus = 'compliant';
        } else if (response?.answer === 'no') {
          currentStatus = 'gap';
        } else if (response?.answer === 'partial') {
          currentStatus = 'partial';
        }
        
        return { control, currentStatus };
      })
      .filter((item): item is { control: MasterControl; currentStatus: 'compliant' | 'gap' | 'partial' | 'unknown' } => item !== null);
  }, [getThreatMapping]);

  // ============================================================================
  // REMEDIATION TRACKING
  // ============================================================================

  const getRemediationActions = useCallback((assessmentId: string): RemediationAction[] => {
    const assessment = assessments.find(a => a.id === assessmentId);
    if (!assessment) return [];
    return [...assessment.immediateActions, ...assessment.shortTermActions, ...assessment.longTermActions];
  }, [assessments]);

  const addRemediationAction = useCallback((
    assessmentId: string, 
    action: Omit<RemediationAction, 'id'>
  ): RemediationAction => {
    const fullAction: RemediationAction = { ...action, id: generateUUID() };
    
    setAssessments(prev => prev.map(a => {
      if (a.id !== assessmentId) return a;
      
      // Determine which array to add to based on priority
      if (action.priority === 'critical') {
        return { ...a, immediateActions: [...a.immediateActions, fullAction] };
      } else if (action.priority === 'high') {
        return { ...a, shortTermActions: [...a.shortTermActions, fullAction] };
      } else {
        return { ...a, longTermActions: [...a.longTermActions, fullAction] };
      }
    }));
    
    return fullAction;
  }, []);

  const updateRemediationAction = useCallback((
    assessmentId: string, 
    actionId: string, 
    updates: Partial<RemediationAction>
  ) => {
    setAssessments(prev => prev.map(a => {
      if (a.id !== assessmentId) return a;
      
      const updateArray = (arr: RemediationAction[]) => 
        arr.map(action => action.id === actionId ? { ...action, ...updates } : action);
      
      return {
        ...a,
        immediateActions: updateArray(a.immediateActions),
        shortTermActions: updateArray(a.shortTermActions),
        longTermActions: updateArray(a.longTermActions),
      };
    }));
  }, []);

  // ============================================================================
  // REGULATORY NOTIFICATIONS
  // ============================================================================

  const addNotification = useCallback((
    assessmentId: string, 
    notification: Omit<RegulatoryNotification, 'id'>
  ): RegulatoryNotification => {
    const fullNotification: RegulatoryNotification = { ...notification, id: generateUUID() };
    
    setAssessments(prev => prev.map(a => 
      a.id === assessmentId 
        ? { ...a, pendingNotifications: [...a.pendingNotifications, fullNotification] }
        : a
    ));
    
    return fullNotification;
  }, []);

  const updateNotification = useCallback((
    assessmentId: string, 
    notificationId: string, 
    updates: Partial<RegulatoryNotification>
  ) => {
    setAssessments(prev => prev.map(a => {
      if (a.id !== assessmentId) return a;
      
      // Check if we're marking as sent
      if (updates.status === 'sent') {
        const notification = a.pendingNotifications.find(n => n.id === notificationId);
        if (notification) {
          const updatedNotification = { ...notification, ...updates };
          return {
            ...a,
            pendingNotifications: a.pendingNotifications.filter(n => n.id !== notificationId),
            notificationsSent: [...a.notificationsSent, updatedNotification],
          };
        }
      }
      
      return {
        ...a,
        pendingNotifications: a.pendingNotifications.map(n => 
          n.id === notificationId ? { ...n, ...updates } : n
        ),
        notificationsSent: a.notificationsSent.map(n => 
          n.id === notificationId ? { ...n, ...updates } : n
        ),
      };
    }));
  }, []);

  const getPendingNotifications = useCallback(() => {
    const pending: { assessment: PostIncidentAssessment; notification: RegulatoryNotification }[] = [];
    
    assessments.forEach(assessment => {
      assessment.pendingNotifications.forEach(notification => {
        pending.push({ assessment, notification });
      });
    });
    
    return pending.sort((a, b) => 
      new Date(a.notification.deadline).getTime() - new Date(b.notification.deadline).getTime()
    );
  }, [assessments]);

  // ============================================================================
  // CLIENT ENGAGEMENTS
  // ============================================================================

  const createEngagement = useCallback((
    data: Omit<ClientEngagement, 'id' | 'createdAt' | 'updatedAt'>
  ): ClientEngagement => {
    const now = new Date().toISOString();
    const engagement: ClientEngagement = {
      ...data,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };
    
    setEngagements(prev => [engagement, ...prev]);
    return engagement;
  }, []);

  const updateEngagement = useCallback((id: string, updates: Partial<ClientEngagement>) => {
    setEngagements(prev => prev.map(e => 
      e.id === id 
        ? { ...e, ...updates, updatedAt: new Date().toISOString() }
        : e
    ));
  }, []);

  const getEngagementById = useCallback((id: string): ClientEngagement | undefined => {
    return engagements.find(e => e.id === id);
  }, [engagements]);

  // ============================================================================
  // REPORTING
  // ============================================================================

  const generateReport = useCallback((
    engagementId: string,
    reportType: ComplianceReport['reportType'],
    compliance: UseComplianceReturn
  ): ComplianceReport => {
    const engagement = engagements.find(e => e.id === engagementId);
    if (!engagement) throw new Error('Engagement not found');

    const now = new Date().toISOString();

    // Calculate framework scores based on compliance data
    const frameworkScores = compliance.frameworkProgress
      .filter(fp => engagement.frameworksInScope.includes(fp.id))
      .map(fp => ({
        frameworkId: fp.id,
        score: fp.percentage,
        controlsAssessed: fp.completed,
        controlsCompliant: fp.completed - fp.gaps,
        gaps: fp.gaps,
      }));

    // Calculate overall score
    const overallScore = frameworkScores.length > 0
      ? Math.round(frameworkScores.reduce((sum, fs) => sum + fs.score, 0) / frameworkScores.length)
      : 0;

    // Generate report-type specific content
    let criticalFindings: string[] = [];
    let recommendations: string[] = [];
    let title = '';

    switch (reportType) {
      case 'executive_summary':
        // High-level overview for leadership - focus on key metrics and business impact
        title = `${engagement.clientName} - Executive Summary`;
        criticalFindings = [
          `Overall compliance score: ${overallScore}% across ${frameworkScores.length} framework(s)`,
          `${frameworkScores.reduce((sum, fs) => sum + fs.gaps, 0)} total control gaps identified`,
          ...compliance.criticalGaps
            .filter(g => g.riskLevel === 'critical' || g.riskLevel === 'high')
            .slice(0, 3)
            .map(gap => `High priority: ${gap.title}`),
        ].filter(Boolean);
        recommendations = [
          overallScore < 70 ? 'Immediate action required to address critical compliance gaps' : null,
          frameworkScores.some(fs => fs.gaps > 5) ? 'Consider allocating additional resources to frameworks with significant gaps' : null,
          'Schedule quarterly compliance reviews to maintain certification readiness',
          'Implement automated monitoring for continuous compliance tracking',
        ].filter((r): r is string => r !== null).slice(0, 4);
        break;

      case 'detailed_assessment':
        // Comprehensive control-by-control analysis
        title = `${engagement.clientName} - Detailed Assessment Report`;
        criticalFindings = compliance.criticalGaps
          .slice(0, 10)
          .map(gap => `[${gap.id}] ${gap.title} - Risk: ${gap.riskLevel.toUpperCase()} - ${gap.domain || 'General'}`);
        recommendations = compliance.criticalGaps
          .slice(0, 6)
          .map(gap => `${gap.id}: ${gap.remediationTip}`);
        break;

      case 'gap_analysis':
        // Focus on compliance gaps and remediation priorities
        title = `${engagement.clientName} - Gap Analysis Report`;
        const gapsByRisk = {
          critical: compliance.criticalGaps.filter(g => g.riskLevel === 'critical'),
          high: compliance.criticalGaps.filter(g => g.riskLevel === 'high'),
          medium: compliance.criticalGaps.filter(g => g.riskLevel === 'medium'),
        };
        criticalFindings = [
          `Critical Risk Gaps (${gapsByRisk.critical.length}): Require immediate remediation`,
          ...gapsByRisk.critical.slice(0, 3).map(g => `  - ${g.id}: ${g.title}`),
          `High Risk Gaps (${gapsByRisk.high.length}): Address within 30 days`,
          ...gapsByRisk.high.slice(0, 3).map(g => `  - ${g.id}: ${g.title}`),
          `Medium Risk Gaps (${gapsByRisk.medium.length}): Address within 90 days`,
        ].filter(Boolean);
        recommendations = [
          gapsByRisk.critical.length > 0 ? `Prioritize ${gapsByRisk.critical.length} critical gaps for immediate remediation` : null,
          'Create a remediation roadmap with assigned owners and deadlines',
          'Implement compensating controls where full remediation is not immediately possible',
          'Schedule follow-up assessment in 30 days to verify gap closure',
          ...gapsByRisk.critical.slice(0, 2).map(g => g.remediationTip),
        ].filter((r): r is string => r !== null);
        break;

      case 'incident_report':
        // Post-incident findings and security recommendations
        title = `${engagement.clientName} - Incident Response Report`;
        const securityGaps = compliance.criticalGaps.filter(g =>
          g.domain?.toLowerCase().includes('security') ||
          g.domain?.toLowerCase().includes('access') ||
          g.domain?.toLowerCase().includes('monitoring')
        );
        criticalFindings = [
          `Security posture assessment: ${overallScore >= 70 ? 'Adequate' : 'Needs Improvement'}`,
          `${securityGaps.length} security-related control gaps identified`,
          ...securityGaps.slice(0, 5).map(gap => `Security gap: ${gap.title} (${gap.riskLevel})`),
        ];
        recommendations = [
          'Conduct thorough incident post-mortem with all stakeholders',
          'Update incident response procedures based on lessons learned',
          'Implement additional monitoring and alerting for affected systems',
          'Review and update access controls and authentication mechanisms',
          ...securityGaps.slice(0, 2).map(g => g.remediationTip),
        ].filter((r): r is string => r !== null);
        break;

      case 'remediation_status':
        // Progress on addressing identified gaps
        title = `${engagement.clientName} - Remediation Status Report`;
        const totalGaps = compliance.criticalGaps.length;
        const completedControls = frameworkScores.reduce((sum, fs) => sum + fs.controlsCompliant, 0);
        const totalControls = frameworkScores.reduce((sum, fs) => sum + fs.controlsAssessed, 0);
        criticalFindings = [
          `Remediation Progress: ${totalControls > 0 ? Math.round((completedControls / totalControls) * 100) : 0}% complete`,
          `Controls Addressed: ${completedControls} of ${totalControls}`,
          `Remaining Gaps: ${totalGaps}`,
          `Estimated completion: ${totalGaps <= 5 ? 'On track' : totalGaps <= 15 ? 'At risk' : 'Behind schedule'}`,
          ...compliance.criticalGaps
            .filter(g => g.riskLevel === 'critical')
            .slice(0, 3)
            .map(g => `Outstanding critical: ${g.title}`),
        ];
        recommendations = [
          totalGaps > 10 ? 'Consider additional resources to accelerate remediation' : null,
          'Maintain weekly status updates on high-priority items',
          'Document all remediation actions for audit trail',
          'Verify remediation effectiveness through testing',
          'Update risk register with current status',
        ].filter((r): r is string => r !== null);
        break;
    }

    const report: ComplianceReport = {
      id: generateUUID(),
      engagementId,
      reportType,
      title,
      generatedAt: now,
      periodStart: engagement.startDate,
      periodEnd: now,
      overallScore,
      frameworkScores,
      criticalFindings,
      recommendations,
      pdfUrl: null,
      excelUrl: null,
      deliveredAt: null,
      deliveredTo: [],
      createdBy: 'system',
      approvedBy: null,
    };

    setReports(prev => [report, ...prev]);
    return report;
  }, [engagements]);

  // ============================================================================
  // STATISTICS
  // ============================================================================

  const stats = useMemo(() => {
    const incidentsBySeverity: Record<IncidentSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    
    const incidentsByThreatCategory: Record<ThreatCategory, number> = {
      ransomware: 0,
      data_exfiltration: 0,
      credential_compromise: 0,
      lateral_movement: 0,
      privilege_escalation: 0,
      supply_chain: 0,
      insider_threat: 0,
      ddos: 0,
      malware: 0,
      phishing: 0,
      zero_day: 0,
      apt: 0,
      cryptojacking: 0,
      other: 0,
    };
    
    incidents.forEach(i => {
      incidentsBySeverity[i.severity]++;
      incidentsByThreatCategory[i.threatCategory]++;
    });
    
    const pendingAssessments = assessments.filter(a => a.status !== 'complete').length;
    
    const overdueRemediations = assessments.reduce((count, a) => {
      const now = new Date();
      const allActions = [...a.immediateActions, ...a.shortTermActions, ...a.longTermActions];
      return count + allActions.filter(action => 
        action.status !== 'complete' && 
        action.dueDate && 
        new Date(action.dueDate) < now
      ).length;
    }, 0);
    
    const pendingNotifications = assessments.reduce((count, a) => 
      count + a.pendingNotifications.length, 0
    );
    
    return {
      totalIncidents: incidents.length,
      activeIncidents: activeIncidents.length,
      incidentsBySeverity,
      incidentsByThreatCategory,
      pendingAssessments,
      overdueRemediations,
      pendingNotifications,
    };
  }, [incidents, activeIncidents, assessments]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Incidents
    incidents,
    activeIncidents,
    getIncidentById,
    createIncident,
    updateIncident,
    updateIncidentStatus,
    addTimelineEvent,
    
    // Post-Incident Assessment
    assessments,
    getAssessmentByIncidentId,
    startAssessment,
    updateControlAssessment,
    completeAssessment,
    
    // Threat Mapping
    getThreatMapping,
    getAffectedControls,
    
    // Remediation Tracking
    getRemediationActions,
    addRemediationAction,
    updateRemediationAction,
    
    // Regulatory Notifications
    addNotification,
    updateNotification,
    getPendingNotifications,
    
    // Client Engagements
    engagements,
    createEngagement,
    updateEngagement,
    getEngagementById,
    
    // Reporting
    reports,
    generateReport,
    
    // Statistics
    stats,
  };
}

export default useIncidentResponse;
