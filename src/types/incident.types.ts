/**
 * ============================================================================
 * INCIDENT RESPONSE TYPES
 * ============================================================================
 * 
 * Data models for post-breach compliance assessment and threat-to-control mapping.
 * Designed for Lydell Security's IR workflow integration.
 */

import type { FrameworkId } from '../constants/controls';

// ============================================================================
// INCIDENT CLASSIFICATION
// ============================================================================

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';

export type IncidentStatus = 
  | 'detected'
  | 'triaged'
  | 'containment'
  | 'eradication'
  | 'recovery'
  | 'lessons_learned'
  | 'closed';

export type ThreatCategory =
  | 'ransomware'
  | 'data_exfiltration'
  | 'credential_compromise'
  | 'lateral_movement'
  | 'privilege_escalation'
  | 'supply_chain'
  | 'insider_threat'
  | 'ddos'
  | 'malware'
  | 'phishing'
  | 'zero_day'
  | 'apt'
  | 'cryptojacking'
  | 'other';

export type AttackVector =
  | 'email_phishing'
  | 'spear_phishing'
  | 'drive_by_download'
  | 'watering_hole'
  | 'supply_chain_compromise'
  | 'credential_stuffing'
  | 'brute_force'
  | 'zero_day_exploit'
  | 'social_engineering'
  | 'insider_access'
  | 'physical_access'
  | 'misconfiguration'
  | 'unpatched_vulnerability'
  | 'third_party_breach'
  | 'unknown';

// ============================================================================
// INCIDENT RECORD
// ============================================================================

/**
 * Incident - Maps to `incidents` table
 * Primary Key: id (UUID)
 */
export interface Incident {
  id: string;                                    // UUID - Primary Key
  incidentNumber: string;                        // Human-readable: INC-2026-0001
  title: string;
  description: string;
  
  // Classification
  severity: IncidentSeverity;
  status: IncidentStatus;
  threatCategory: ThreatCategory;
  attackVectors: AttackVector[];
  
  // Timeline
  detectedAt: string;                            // ISO timestamp
  containedAt: string | null;
  eradicatedAt: string | null;
  recoveredAt: string | null;
  closedAt: string | null;
  
  // Impact Assessment
  affectedSystems: string[];
  affectedUsers: number;
  dataExposed: boolean;
  dataTypes: string[];                           // PII, PHI, PCI, etc.
  financialImpact: number | null;
  
  // Response Team
  incidentCommander: string;
  responders: string[];
  clientContact: string;
  
  // Compliance Impact
  affectedControlIds: string[];                  // Links to controls
  affectedFrameworks: FrameworkId[];
  regulatoryNotificationRequired: boolean;
  notificationDeadline: string | null;
  
  // Documentation
  forensicReportUrl: string | null;
  timelineEvents: IncidentTimelineEvent[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Timeline event within an incident
 */
export interface IncidentTimelineEvent {
  id: string;
  timestamp: string;
  eventType: 'detection' | 'action' | 'finding' | 'escalation' | 'communication' | 'milestone';
  title: string;
  description: string;
  actor: string;
  attachments: string[];
}

// ============================================================================
// THREAT-TO-CONTROL MAPPING
// ============================================================================

/**
 * Maps threat categories to potentially affected compliance controls
 */
export interface ThreatControlMapping {
  threatCategory: ThreatCategory;
  affectedDomains: string[];                     // Compliance domain IDs
  affectedControlIds: string[];                  // Specific control IDs
  frameworkImplications: {
    frameworkId: FrameworkId;
    clauseIds: string[];
    description: string;
  }[];
  recommendedActions: string[];
  assessmentQuestions: string[];
}

/**
 * Post-incident compliance assessment
 */
export interface PostIncidentAssessment {
  id: string;
  incidentId: string;
  
  // Assessment Status
  status: 'pending' | 'in_progress' | 'review' | 'complete';
  startedAt: string;
  completedAt: string | null;
  
  // Control Verification
  controlAssessments: ControlAssessmentResult[];
  
  // Gap Analysis
  newGapsIdentified: string[];                   // Control IDs with new gaps
  existingGapsExacerbated: string[];            // Control IDs where gaps worsened
  controlsValidated: string[];                   // Controls that held up
  
  // Recommendations
  immediateActions: RemediationAction[];
  shortTermActions: RemediationAction[];        // 30 days
  longTermActions: RemediationAction[];         // 90 days
  
  // Regulatory Impact
  notificationsSent: RegulatoryNotification[];
  pendingNotifications: RegulatoryNotification[];
  
  // Metadata
  assessedBy: string;
  reviewedBy: string | null;
  approvedBy: string | null;
}

/**
 * Individual control assessment during post-incident review
 */
export interface ControlAssessmentResult {
  controlId: string;
  controlTitle: string;
  
  // Pre-incident status (from existing compliance data)
  preIncidentAnswer: 'yes' | 'no' | 'partial' | 'na' | null;
  preIncidentEvidenceId: string | null;
  
  // Post-incident assessment
  postIncidentStatus: 'verified' | 'failed' | 'partially_failed' | 'not_tested' | 'not_applicable';
  failureDescription: string | null;
  
  // Root cause analysis
  contributedToIncident: boolean;
  rootCauseNotes: string;
  
  // Remediation
  requiresRemediation: boolean;
  remediationPriority: 'critical' | 'high' | 'medium' | 'low' | null;
  remediationPlan: string;
  remediationDeadline: string | null;
  
  // Evidence
  assessmentNotes: string;
  evidenceCollected: string[];
}

/**
 * Remediation action item
 */
export interface RemediationAction {
  id: string;
  controlId: string | null;                      // Linked control (if applicable)
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'technical' | 'process' | 'policy' | 'training' | 'vendor';
  assignedTo: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'blocked' | 'complete' | 'deferred';
  completedAt: string | null;
  verificationRequired: boolean;
  verifiedBy: string | null;
  notes: string;
}

/**
 * Regulatory notification tracking
 */
export interface RegulatoryNotification {
  id: string;
  frameworkId: FrameworkId;
  regulatoryBody: string;                        // HHS, State AG, etc.
  notificationType: 'breach' | 'incident' | 'vulnerability';
  deadline: string;
  status: 'pending' | 'drafted' | 'sent' | 'acknowledged' | 'closed';
  sentAt: string | null;
  acknowledgedAt: string | null;
  referenceNumber: string | null;
  notes: string;
}

// ============================================================================
// CLIENT REPORTING
// ============================================================================

/**
 * Client engagement for compliance services
 */
export interface ClientEngagement {
  id: string;
  clientName: string;
  clientIndustry: string;
  engagementType: 'assessment' | 'incident_response' | 'retainer' | 'audit_prep';
  
  // Scope
  frameworksInScope: FrameworkId[];
  domainsInScope: string[];
  
  // Timeline
  startDate: string;
  endDate: string | null;
  status: 'active' | 'paused' | 'complete' | 'cancelled';
  
  // Contacts
  primaryContact: string;
  contacts: ClientContact[];
  
  // Associated Data
  incidentIds: string[];
  assessmentIds: string[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface ClientContact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  isPrimary: boolean;
  notificationPreferences: ('email' | 'sms' | 'portal')[];
}

/**
 * Client-facing compliance report
 */
export interface ComplianceReport {
  id: string;
  engagementId: string;
  reportType: 'executive_summary' | 'detailed_assessment' | 'gap_analysis' | 'incident_report' | 'remediation_status';
  
  // Report Content
  title: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  
  // Metrics
  overallScore: number;                          // 0-100
  frameworkScores: {
    frameworkId: FrameworkId;
    score: number;
    controlsAssessed: number;
    controlsCompliant: number;
    gaps: number;
  }[];
  
  // Key Findings
  criticalFindings: string[];
  recommendations: string[];
  
  // Export
  pdfUrl: string | null;
  excelUrl: string | null;
  
  // Delivery
  deliveredAt: string | null;
  deliveredTo: string[];
  
  // Metadata
  createdBy: string;
  approvedBy: string | null;
}

// ============================================================================
// PREDEFINED THREAT MAPPINGS
// ============================================================================

/**
 * Standard threat-to-control mappings based on common attack patterns
 */
export const THREAT_CONTROL_MAPPINGS: ThreatControlMapping[] = [
  {
    threatCategory: 'ransomware',
    affectedDomains: ['access_control', 'data_protection', 'business_continuity', 'incident_response'],
    affectedControlIds: [
      'AC-001', 'AC-004', 'AC-006', 'AC-007',  // Access controls
      'DP-001', 'DP-002', 'DP-003', 'DP-005',  // Data protection
      'BC-001', 'BC-002', 'BC-003', 'BC-004',  // Business continuity
      'IR-001', 'IR-002', 'IR-003', 'IR-004',  // Incident response
    ],
    frameworkImplications: [
      { frameworkId: 'HIPAA', clauseIds: ['164.308(a)(6)', '164.308(a)(7)', '164.312(a)(1)'], description: 'Security incident procedures and contingency plan' },
      { frameworkId: 'SOC2', clauseIds: ['CC6.1', 'CC7.2', 'CC7.4', 'A1.2'], description: 'Logical access, system recovery, availability' },
      { frameworkId: 'NIST', clauseIds: ['PR.AC-4', 'PR.DS-1', 'PR.IP-4', 'RS.RP-1'], description: 'Access permissions, data protection, backups, response' },
      { frameworkId: 'ISO27001', clauseIds: ['A.9.2.3', 'A.12.3.1', 'A.16.1.5'], description: 'Privileged access, backup, incident response' },
    ],
    recommendedActions: [
      'Verify backup integrity and test restoration procedures',
      'Review privileged access logs for unauthorized elevation',
      'Assess endpoint detection and response (EDR) coverage',
      'Validate network segmentation controls',
      'Review email security gateway effectiveness',
    ],
    assessmentQuestions: [
      'Were backups encrypted and stored offline?',
      'Did MFA prevent initial credential compromise?',
      'Were lateral movement attempts detected by monitoring tools?',
      'Was the incident response plan followed correctly?',
      'Were recovery time objectives (RTOs) met?',
    ],
  },
  {
    threatCategory: 'credential_compromise',
    affectedDomains: ['access_control', 'security_operations', 'hr_security'],
    affectedControlIds: [
      'AC-001', 'AC-002', 'AC-003', 'AC-004', 'AC-005', 'AC-006', 'AC-010',
      'SO-001', 'SO-002', 'SO-003', 'SO-005',
      'HR-001', 'HR-003', 'HR-004',
    ],
    frameworkImplications: [
      { frameworkId: 'HIPAA', clauseIds: ['164.312(a)(2)(i)', '164.312(d)'], description: 'Unique user identification and authentication' },
      { frameworkId: 'SOC2', clauseIds: ['CC6.1', 'CC6.2', 'CC6.3'], description: 'Logical access security' },
      { frameworkId: 'NIST', clauseIds: ['PR.AC-1', 'PR.AC-7', 'DE.CM-3'], description: 'Identity management, authentication, monitoring' },
      { frameworkId: 'ISO27001', clauseIds: ['A.9.2.1', 'A.9.2.4', 'A.9.4.2'], description: 'User access management' },
    ],
    recommendedActions: [
      'Force password reset for all affected accounts',
      'Review and revoke active sessions',
      'Implement or strengthen MFA requirements',
      'Audit privileged account usage',
      'Review credential storage practices',
    ],
    assessmentQuestions: [
      'Was MFA enabled on the compromised account?',
      'How was the credential obtained (phishing, breach, brute force)?',
      'Were there alerts for anomalous login behavior?',
      'Was the compromised credential used elsewhere (credential reuse)?',
      'Were privileged credentials exposed?',
    ],
  },
  {
    threatCategory: 'data_exfiltration',
    affectedDomains: ['data_protection', 'security_operations', 'vendor_management'],
    affectedControlIds: [
      'DP-001', 'DP-002', 'DP-003', 'DP-004', 'DP-005', 'DP-006', 'DP-007',
      'SO-002', 'SO-003', 'SO-004', 'SO-006',
      'VM-001', 'VM-002', 'VM-003',
    ],
    frameworkImplications: [
      { frameworkId: 'HIPAA', clauseIds: ['164.308(a)(1)(ii)(D)', '164.312(b)', '164.312(e)(1)'], description: 'Information system activity review, audit controls, transmission security' },
      { frameworkId: 'SOC2', clauseIds: ['CC6.6', 'CC6.7', 'CC7.2'], description: 'Data classification, protection, incident detection' },
      { frameworkId: 'NIST', clauseIds: ['PR.DS-1', 'PR.DS-2', 'PR.DS-5', 'DE.CM-1'], description: 'Data security, DLP, network monitoring' },
      { frameworkId: 'ISO27001', clauseIds: ['A.8.2.1', 'A.13.2.1', 'A.18.1.4'], description: 'Information classification, data transfer, privacy' },
    ],
    recommendedActions: [
      'Identify all data accessed and exfiltrated',
      'Review DLP tool effectiveness',
      'Audit cloud storage access logs',
      'Assess network egress monitoring capabilities',
      'Review third-party data sharing agreements',
    ],
    assessmentQuestions: [
      'What data classification levels were affected?',
      'Were DLP alerts generated during exfiltration?',
      'Was data encrypted at rest and in transit?',
      'Were unusual data access patterns detected?',
      'Did the attacker use approved data egress paths?',
    ],
  },
  {
    threatCategory: 'lateral_movement',
    affectedDomains: ['access_control', 'security_operations', 'asset_management'],
    affectedControlIds: [
      'AC-003', 'AC-004', 'AC-008', 'AC-009',
      'SO-001', 'SO-002', 'SO-005', 'SO-006',
      'AM-001', 'AM-002', 'AM-003', 'AM-005',
    ],
    frameworkImplications: [
      { frameworkId: 'HIPAA', clauseIds: ['164.312(a)(1)', '164.308(a)(4)'], description: 'Access controls and information access management' },
      { frameworkId: 'SOC2', clauseIds: ['CC6.1', 'CC6.3', 'CC7.2'], description: 'Access controls and monitoring' },
      { frameworkId: 'NIST', clauseIds: ['PR.AC-4', 'PR.AC-5', 'DE.CM-1', 'DE.CM-7'], description: 'Network segmentation, monitoring' },
      { frameworkId: 'ISO27001', clauseIds: ['A.9.1.2', 'A.13.1.1', 'A.13.1.3'], description: 'Network access, controls, segregation' },
    ],
    recommendedActions: [
      'Review network segmentation effectiveness',
      'Audit admin/service account permissions',
      'Assess east-west traffic monitoring',
      'Validate endpoint isolation capabilities',
      'Review jump server / bastion host controls',
    ],
    assessmentQuestions: [
      'Was network segmentation bypassed?',
      'Were service accounts misused for movement?',
      'Did NDR/EDR detect lateral movement techniques?',
      'Were there alerts for unusual internal connections?',
      'Was zero-trust architecture in place?',
    ],
  },
  {
    threatCategory: 'phishing',
    affectedDomains: ['access_control', 'hr_security', 'security_operations'],
    affectedControlIds: [
      'AC-001', 'AC-002',
      'HR-002', 'HR-003', 'HR-004', 'HR-005',
      'SO-001', 'SO-007',
    ],
    frameworkImplications: [
      { frameworkId: 'HIPAA', clauseIds: ['164.308(a)(5)'], description: 'Security awareness and training' },
      { frameworkId: 'SOC2', clauseIds: ['CC1.4', 'CC2.2'], description: 'Security awareness' },
      { frameworkId: 'NIST', clauseIds: ['PR.AT-1', 'PR.AT-2', 'DE.CM-1'], description: 'Awareness training, email security' },
      { frameworkId: 'ISO27001', clauseIds: ['A.7.2.2', 'A.12.2.1'], description: 'Information security awareness' },
    ],
    recommendedActions: [
      'Review email security gateway logs',
      'Assess security awareness training effectiveness',
      'Implement phishing simulation program',
      'Review reported phishing handling process',
      'Evaluate MFA as compensating control',
    ],
    assessmentQuestions: [
      'Did the phishing email bypass email security controls?',
      'Had the user completed recent security awareness training?',
      'Was the phishing attempt reported by other users?',
      'Did MFA prevent account takeover after credential entry?',
      'Was the malicious link/attachment analyzed?',
    ],
  },
  {
    threatCategory: 'insider_threat',
    affectedDomains: ['access_control', 'hr_security', 'data_protection', 'compliance_monitoring'],
    affectedControlIds: [
      'AC-003', 'AC-004', 'AC-006', 'AC-011',
      'HR-001', 'HR-002', 'HR-006', 'HR-007',
      'DP-002', 'DP-004', 'DP-006',
      'CM-001', 'CM-002', 'CM-003',
    ],
    frameworkImplications: [
      { frameworkId: 'HIPAA', clauseIds: ['164.308(a)(3)', '164.308(a)(4)'], description: 'Workforce security and access management' },
      { frameworkId: 'SOC2', clauseIds: ['CC1.3', 'CC6.2', 'CC6.3'], description: 'HR security, access provisioning' },
      { frameworkId: 'NIST', clauseIds: ['PR.AC-4', 'PR.DS-5', 'DE.CM-3'], description: 'Least privilege, DLP, personnel monitoring' },
      { frameworkId: 'ISO27001', clauseIds: ['A.7.1.1', 'A.7.2.3', 'A.7.3.1'], description: 'HR security, disciplinary process, termination' },
    ],
    recommendedActions: [
      'Review user access logs for anomalous behavior',
      'Audit separation of duties controls',
      'Assess DLP effectiveness for insider scenarios',
      'Review offboarding procedures',
      'Evaluate user behavior analytics (UBA) capabilities',
    ],
    assessmentQuestions: [
      'Did the insider have appropriate access for their role?',
      'Were there behavioral indicators prior to the incident?',
      'Was separation of duties enforced?',
      'Did monitoring tools detect unusual data access?',
      'Was the insider a current or former employee?',
    ],
  },
];

/**
 * Get controls affected by a specific threat category
 */
export function getControlsForThreat(threatCategory: ThreatCategory): ThreatControlMapping | undefined {
  return THREAT_CONTROL_MAPPINGS.find(m => m.threatCategory === threatCategory);
}

/**
 * Get all threats that affect a specific control
 */
export function getThreatsForControl(controlId: string): ThreatControlMapping[] {
  return THREAT_CONTROL_MAPPINGS.filter(m => m.affectedControlIds.includes(controlId));
}
