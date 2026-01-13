/**
 * ============================================================================
 * MODULAR COMPLIANCE ENGINE - TYPE DEFINITIONS
 * ============================================================================
 * 
 * This file defines the complete type system for a framework-agnostic
 * regulatory compliance management system with live update capabilities.
 * 
 * Architecture Principles:
 * 1. Separation of Concerns: Framework Requirements ≠ Internal Controls
 * 2. Version-First: Every entity is versioned and time-stamped
 * 3. N-to-N Mapping: Any requirement can map to any control (crosswalk)
 * 4. Framework Agnostic: New regulations can be added without refactoring
 */

// ============================================================================
// SECTION 1: FRAMEWORK REQUIREMENTS (THE LAW)
// ============================================================================

/**
 * Supported regulatory frameworks
 * Extensible: Add new frameworks here without changing logic
 */
export type FrameworkType = 
  | 'SOC2_TYPE1'
  | 'SOC2_TYPE2'
  | 'ISO_27001'
  | 'ISO_27002'
  | 'HIPAA_SECURITY'
  | 'HIPAA_PRIVACY'
  | 'EU_AI_ACT'
  | 'NIST_CSF'
  | 'NIST_800_53'
  | 'GDPR'
  | 'CCPA'
  | 'PCI_DSS'
  | 'FedRAMP'
  | 'CMMC'
  | 'CUSTOM';

/**
 * Framework version identifier
 * Format: {framework}_{year}[_{revision}]
 */
export interface FrameworkVersion {
  frameworkType: FrameworkType;
  version: string;           // e.g., "2022", "2025_update", "2026_final"
  effectiveDate: string;     // ISO 8601 date when regulation takes effect
  sunsetDate?: string;       // When previous version becomes non-compliant
  status: 'draft' | 'final' | 'active' | 'deprecated' | 'superseded';
  sourceUrl: string;         // Official publication URL
  lastVerified: string;      // When we last checked the source
}

/**
 * 2026-Specific Requirement Categories
 */
export type RequirementCategory2026 =
  | 'AI_TRANSPARENCY'        // EU AI Act: Model training, bias, explainability
  | 'AI_RISK_CLASSIFICATION' // EU AI Act: High-risk AI systems
  | 'QUANTUM_READINESS'      // Post-quantum cryptography requirements
  | 'ZERO_TRUST'             // Continuous identity verification
  | 'DATA_RESIDENCY'         // Geographic data storage requirements
  | 'SUPPLY_CHAIN'           // Third-party AI/software supply chain
  | 'ALGORITHMIC_AUDIT'      // AI decision audit trails
  | 'HUMAN_OVERSIGHT'        // Human-in-the-loop requirements
  | 'TRADITIONAL';           // Pre-2026 standard controls

/**
 * Master Requirement - The canonical representation of a regulatory requirement
 */
export interface MasterRequirement {
  // Identifiers
  id: string;                          // Unique: e.g., "REQ-HIPAA-SEC-164.312.d"
  frameworkId: string;                 // e.g., "HIPAA_SECURITY"
  frameworkVersion: FrameworkVersion;
  
  // Requirement Details
  sectionCode: string;                 // Official section: "164.312(d)"
  sectionTitle: string;                // "Person or Entity Authentication"
  requirementText: string;             // Full legal text
  requirementSummary: string;          // Plain-English summary
  
  // Classification
  category: RequirementCategory2026;
  controlFamily: string;               // e.g., "Access Control", "Encryption"
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  
  // Implementation Guidance
  implementationGuidance: string[];
  evidenceExamples: string[];
  commonFailures: string[];
  
  // Relationships
  parentRequirementId?: string;        // For hierarchical requirements
  relatedRequirements: string[];       // Cross-references within framework
  supersedes?: string;                 // Previous version requirement ID
  supersededBy?: string;               // Newer version requirement ID
  
  // Metadata
  keywords: string[];                  // For search and AI matching
  lastUpdated: string;
  changeHistory: RequirementChange[];
}

/**
 * Tracks changes to requirements over time
 */
export interface RequirementChange {
  changeId: string;
  timestamp: string;
  changeType: 'created' | 'modified' | 'clarified' | 'strengthened' | 'weakened' | 'deprecated';
  previousText?: string;
  newText: string;
  changeDescription: string;
  sourceReference: string;
  detectedBy: 'manual' | 'ai_scan' | 'official_update';
}


// ============================================================================
// SECTION 2: INTERNAL CONTROLS (COMPANY'S ACTIONS)
// ============================================================================

/**
 * Control implementation status
 */
export type ControlStatus = 
  | 'not_started'
  | 'in_progress'
  | 'implemented'
  | 'tested'
  | 'operational'
  | 'needs_review'
  | 'non_compliant'
  | 'not_applicable';

/**
 * Evidence types for control implementation
 */
export type EvidenceType =
  | 'policy_document'
  | 'procedure_document'
  | 'screenshot'
  | 'configuration_export'
  | 'audit_log'
  | 'test_result'
  | 'interview_notes'
  | 'third_party_report'
  | 'automated_scan'
  | 'attestation';

/**
 * Master Control - The company's implementation to meet requirements
 */
export interface MasterControl {
  // Identifiers
  id: string;                          // e.g., "CTRL-AC-001"
  controlNumber: string;               // Human-readable: "AC-001"
  title: string;                       // "Multi-Factor Authentication"
  
  // Description
  description: string;
  objective: string;
  scope: string;
  
  // Classification
  controlFamily: string;               // "Access Control"
  category2026: RequirementCategory2026;
  controlType: 'preventive' | 'detective' | 'corrective' | 'compensating';
  automationLevel: 'manual' | 'semi_automated' | 'fully_automated';
  
  // Implementation Details
  implementationDetails: string;
  owner: string;
  ownerEmail: string;
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'ad_hoc';
  
  // Current State
  status: ControlStatus;
  effectivenessRating: 1 | 2 | 3 | 4 | 5;  // 1=Weak, 5=Strong
  lastAssessmentDate: string;
  nextAssessmentDate: string;
  
  // Evidence
  evidence: ControlEvidence[];
  
  // Versioning
  version: string;
  lastUpdated: string;
  changeHistory: ControlChange[];
  
  // 2026-Specific Fields
  aiSpecific?: AIControlDetails;
  quantumReadiness?: QuantumReadinessDetails;
  zeroTrustDetails?: ZeroTrustDetails;
}

/**
 * Evidence attached to a control
 */
export interface ControlEvidence {
  id: string;
  type: EvidenceType;
  title: string;
  description: string;
  fileUrl?: string;
  collectedDate: string;
  expirationDate?: string;
  collectedBy: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedDate?: string;
}

/**
 * Control change tracking
 */
export interface ControlChange {
  changeId: string;
  timestamp: string;
  changedBy: string;
  changeType: 'created' | 'updated' | 'evidence_added' | 'status_changed' | 'mapped' | 'unmapped';
  previousValue?: string;
  newValue: string;
  reason: string;
}


// ============================================================================
// SECTION 3: 2026-SPECIFIC CONTROL DETAILS
// ============================================================================

/**
 * AI-Specific Control Details (EU AI Act Compliance)
 */
export interface AIControlDetails {
  // AI System Classification
  aiSystemId: string;
  riskClassification: 'unacceptable' | 'high_risk' | 'limited_risk' | 'minimal_risk';
  
  // Transparency Requirements
  modelDocumentation: {
    trainingDataDescription: string;
    trainingDataSources: string[];
    dataRetentionPolicy: string;
    biasAssessmentDate: string;
    biasAssessmentResults: string;
  };
  
  // Explainability
  explainabilityMethod: string;
  humanOversightMechanism: string;
  appealProcess: string;
  
  // Technical Documentation
  technicalDocumentationUrl: string;
  conformityAssessmentDate?: string;
  euDatabaseRegistration?: string;
}

/**
 * Quantum Readiness Details
 */
export interface QuantumReadinessDetails {
  // Current State
  currentEncryptionAlgorithms: string[];
  quantumVulnerableAssets: string[];
  
  // Migration Plan
  postQuantumAlgorithms: string[];  // e.g., "CRYSTALS-Kyber", "CRYSTALS-Dilithium"
  migrationStatus: 'not_started' | 'assessment' | 'planning' | 'pilot' | 'migration' | 'complete';
  migrationDeadline: string;
  
  // Hybrid Approach
  hybridImplementation: boolean;
  cryptoAgilityScore: 1 | 2 | 3 | 4 | 5;
}

/**
 * Zero Trust Architecture Details
 */
export interface ZeroTrustDetails {
  // Identity Verification
  continuousAuthEnabled: boolean;
  authenticationMethods: string[];
  sessionDuration: number;  // minutes, 0 = continuous
  riskBasedAuthentication: boolean;
  
  // Network Segmentation
  microsegmentationEnabled: boolean;
  networkZones: string[];
  
  // Device Trust
  deviceTrustRequired: boolean;
  deviceComplianceChecks: string[];
  
  // Data Protection
  dataClassificationEnabled: boolean;
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  
  // Monitoring
  continuousMonitoring: boolean;
  behaviorAnalytics: boolean;
  anomalyDetectionEnabled: boolean;
}


// ============================================================================
// SECTION 4: N-TO-N MAPPING (THE CROSSWALK)
// ============================================================================

/**
 * Mapping between a requirement and a control
 */
export interface RequirementControlMapping {
  id: string;
  requirementId: string;
  controlId: string;
  
  // Mapping Details
  mappingType: 'full' | 'partial' | 'compensating' | 'shared';
  coveragePercentage: number;  // 0-100
  mappingRationale: string;
  
  // Gap Analysis
  gaps: MappingGap[];
  
  // Status
  status: 'active' | 'pending_review' | 'deprecated';
  verifiedBy?: string;
  verifiedDate?: string;
  
  // Audit Trail
  createdAt: string;
  createdBy: string;
  lastUpdated: string;
  updatedBy: string;
}

/**
 * Identified gaps in requirement coverage
 */
export interface MappingGap {
  id: string;
  gapDescription: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  remediationPlan?: string;
  remediationDeadline?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
}


// ============================================================================
// SECTION 5: COMPLIANCE DRIFT DETECTION
// ============================================================================

/**
 * Compliance drift - when a control no longer meets updated requirements
 */
export interface ComplianceDrift {
  id: string;
  detectedAt: string;
  
  // What Changed
  requirementId: string;
  previousRequirementVersion: string;
  newRequirementVersion: string;
  changeType: 'new_requirement' | 'requirement_strengthened' | 'requirement_clarified' | 'requirement_removed';
  changeSummary: string;
  
  // Impact Assessment
  affectedControlIds: string[];
  impactLevel: 'critical' | 'high' | 'medium' | 'low';
  complianceGapDescription: string;
  
  // Resolution
  status: 'detected' | 'acknowledged' | 'remediation_planned' | 'in_remediation' | 'resolved' | 'risk_accepted';
  assignedTo?: string;
  dueDate?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  
  // User Response Tracking
  previousUserResponses: UserResponse[];
  requiredActions: RequiredAction[];
}

/**
 * User's previous compliance response
 */
export interface UserResponse {
  questionId: string;
  questionText: string;
  userAnswer: string;
  answeredAt: string;
  meetsNewRequirement: boolean;
  gapAnalysis?: string;
}

/**
 * Action required to resolve drift
 */
export interface RequiredAction {
  id: string;
  actionType: 'update_control' | 'add_evidence' | 'update_policy' | 'implement_new' | 'reassess';
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  deadline?: string;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'complete';
}


// ============================================================================
// SECTION 6: REGULATORY CHANGE DETECTION (AI AGENT OUTPUT)
// ============================================================================

/**
 * Regulatory change log entry from AI scanning
 */
export interface RegulatoryChangeLog {
  id: string;
  detectedAt: string;
  
  // Source Information
  sourceUrl: string;
  sourceType: 'official_publication' | 'draft_regulation' | 'guidance_document' | 'enforcement_action' | 'news_article';
  publishedDate: string;
  
  // Framework Identification
  frameworkType: FrameworkType;
  affectedSections: string[];
  
  // Change Details
  changeType: 'new_requirement' | 'amendment' | 'clarification' | 'enforcement_guidance' | 'deadline_change' | 'new_framework';
  changeSummary: string;
  changeDetails: string;
  
  // Impact Analysis
  estimatedImpact: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  affectedControlFamilies: string[];
  suggestedActions: string[];
  
  // Processing Status
  status: 'detected' | 'reviewed' | 'accepted' | 'rejected' | 'implemented';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  
  // AI Confidence
  aiConfidenceScore: number;  // 0-100
  requiresHumanReview: boolean;
}

/**
 * Suggested new control from AI analysis
 */
export interface SuggestedControl {
  id: string;
  changeLogId: string;  // Reference to the regulatory change that triggered this
  
  // Suggestion Details
  suggestedTitle: string;
  suggestedDescription: string;
  suggestedControlFamily: string;
  suggestedCategory: RequirementCategory2026;
  
  // Mapping
  relatedRequirementIds: string[];
  existingControlsToUpdate: string[];
  
  // Implementation Guidance
  implementationSteps: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  suggestedDeadline?: string;
  
  // Status
  status: 'suggested' | 'under_review' | 'approved' | 'rejected' | 'implemented';
  approvedBy?: string;
  approvedAt?: string;
}


// ============================================================================
// SECTION 7: VERSION CONTROL UI DATA
// ============================================================================

/**
 * Side-by-side comparison for version control UI
 */
export interface RequirementComparison {
  requirementId: string;
  
  // Current Version
  current: {
    version: FrameworkVersion;
    sectionCode: string;
    requirementText: string;
    implementationGuidance: string[];
  };
  
  // New Version
  new: {
    version: FrameworkVersion;
    sectionCode: string;
    requirementText: string;
    implementationGuidance: string[];
  };
  
  // Diff Analysis
  textDiff: TextDiff[];
  significantChanges: string[];
  impactAssessment: string;
  
  // Affected Controls
  affectedControls: {
    controlId: string;
    controlTitle: string;
    currentMappingStatus: string;
    requiredUpdates: string[];
  }[];
  
  // Admin Actions
  adminActions: {
    previewedAt?: string;
    previewedBy?: string;
    acceptedAt?: string;
    acceptedBy?: string;
    rejectedAt?: string;
    rejectedBy?: string;
    rejectionReason?: string;
  };
}

/**
 * Text diff for requirement comparison
 */
export interface TextDiff {
  type: 'unchanged' | 'added' | 'removed' | 'modified';
  currentText?: string;
  newText?: string;
  significance: 'cosmetic' | 'clarification' | 'substantive' | 'breaking';
}


// ============================================================================
// SECTION 8: MASTER REQUIREMENT LIBRARY (JSON SCHEMA)
// ============================================================================

/**
 * The Master Requirement Library - Single source of truth
 */
export interface MasterRequirementLibrary {
  // Library Metadata
  libraryId: string;
  libraryVersion: string;
  lastUpdated: string;
  maintainedBy: string;
  
  // Framework Registry
  frameworks: {
    [key: string]: {
      type: FrameworkType;
      versions: FrameworkVersion[];
      activeVersion: string;
    };
  };
  
  // Requirements by Framework
  requirements: {
    [frameworkVersionKey: string]: MasterRequirement[];
  };
  
  // Cross-Framework Mappings (e.g., HIPAA → ISO 27001)
  crossFrameworkMappings: {
    sourceRequirementId: string;
    targetRequirementId: string;
    mappingType: 'equivalent' | 'partial' | 'related';
    notes: string;
  }[];
  
  // Change Log
  changeLog: RegulatoryChangeLog[];
  
  // Statistics
  statistics: {
    totalRequirements: number;
    requirementsByFramework: { [key: string]: number };
    requirementsByCategory: { [key: string]: number };
    lastScanDate: string;
    pendingChanges: number;
  };
}


// ============================================================================
// SECTION 9: API RESPONSE TYPES
// ============================================================================

export interface ComplianceDashboard {
  overallComplianceScore: number;
  frameworkScores: {
    framework: FrameworkType;
    version: string;
    score: number;
    totalRequirements: number;
    metRequirements: number;
    gapCount: number;
  }[];
  
  driftAlerts: ComplianceDrift[];
  pendingChanges: RegulatoryChangeLog[];
  upcomingDeadlines: {
    controlId: string;
    controlTitle: string;
    deadline: string;
    type: 'assessment' | 'evidence' | 'remediation';
  }[];
  
  recentActivity: {
    timestamp: string;
    action: string;
    user: string;
    entityType: 'control' | 'requirement' | 'evidence' | 'mapping';
    entityId: string;
  }[];
}

export type ComplianceEngineTypes = {
  FrameworkType: FrameworkType;
  MasterRequirement: MasterRequirement;
  MasterControl: MasterControl;
  RequirementControlMapping: RequirementControlMapping;
  ComplianceDrift: ComplianceDrift;
  RegulatoryChangeLog: RegulatoryChangeLog;
  RequirementComparison: RequirementComparison;
  MasterRequirementLibrary: MasterRequirementLibrary;
};
