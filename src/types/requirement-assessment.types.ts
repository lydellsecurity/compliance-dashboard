/**
 * Requirement Assessment Types
 *
 * Data model for requirement-centric compliance assessment.
 * This bridges the gap between control-centric assessments and
 * framework requirement-centric auditor expectations.
 */

import type { FrameworkId } from '../constants/controls';
import type { VerificationMethod, VerificationFrequency } from './framework.types';

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type RequirementComplianceStatus =
  | 'not_assessed'
  | 'compliant'
  | 'partially_compliant'
  | 'non_compliant'
  | 'not_applicable';

export type ComplianceMethod =
  | 'control_mapping'        // Satisfied by mapped controls
  | 'direct_assessment'      // Assessed directly (no/insufficient controls)
  | 'compensating_control'   // Alternative control in place
  | 'exception'              // Accepted risk/exception
  | 'inherited';             // Inherited from parent organization/service

export type ControlMappingType =
  | 'direct'                 // Control directly satisfies requirement
  | 'partial'                // Control partially satisfies requirement
  | 'supportive';            // Control supports but doesn't satisfy requirement

export type HIPAASpecificationType = 'required' | 'addressable';

export type AddressableDecisionType =
  | 'implemented'                    // Implemented as specified
  | 'alternative_implemented'        // Alternative measure in place
  | 'not_reasonable';                // Not reasonable/appropriate (risk accepted)

// ============================================
// CORE INTERFACES
// ============================================

/**
 * Represents the assessment state for a single framework requirement
 */
export interface RequirementAssessment {
  id: string;                           // UUID
  frameworkId: FrameworkId;
  frameworkVersion: string;             // e.g., 'v4.0', '2022', '2.0'
  requirementId: string;                // e.g., '1.2.3', '164.308(a)(1)(ii)(A)', 'CC6.1'

  // Assessment State
  status: RequirementComplianceStatus;
  complianceMethod: ComplianceMethod;

  // Direct Assessment (for requirements not fully covered by controls)
  directAssessment?: DirectAssessment;

  // Evidence specific to this requirement
  evidenceRefs: RequirementEvidence[];

  // Control relationships
  mappedControlAssessments: ControlMappingAssessment[];

  // Compensating control (if complianceMethod is 'compensating_control')
  compensatingControl?: CompensatingControlRecord;

  // Exception record (if complianceMethod is 'exception')
  exception?: ExceptionRecord;

  // HIPAA-specific: addressable specification decision
  addressableDecision?: AddressableDecision;

  // Audit trail
  lastAssessedAt: string | null;
  lastAssessedBy: string | null;
  notes: string;

  // Validity period (for periodic reassessment)
  validUntil?: string;
  reassessmentFrequency?: VerificationFrequency;
}

/**
 * Direct assessment answers when controls don't fully cover a requirement
 */
export interface DirectAssessment {
  questions: DirectAssessmentQuestion[];
  overallAnswer: 'yes' | 'no' | 'partial' | 'na';
  justification: string;
  assessedAt: string;
  assessedBy: string;
}

/**
 * Individual question in a direct assessment
 */
export interface DirectAssessmentQuestion {
  id: string;
  question: string;
  answer: 'yes' | 'no' | 'partial' | 'na' | null;
  notes?: string;
}

/**
 * Evidence record specific to a requirement
 */
export interface RequirementEvidence {
  id: string;
  requirementAssessmentId: string;
  evidenceType: string;                 // From framework's evidence_types list
  name: string;
  description: string;
  fileUrls: string[];
  verificationMethod: VerificationMethod;
  verifiedAt: string | null;
  verifiedBy: string | null;
  validUntil?: string;                  // For time-bound evidence
  status: 'pending' | 'verified' | 'expired' | 'rejected';
}

/**
 * Assessment of how well a control maps to a requirement
 */
export interface ControlMappingAssessment {
  controlId: string;
  mappingType: ControlMappingType;
  coveragePercentage: number;           // 0-100
  gapDescription?: string;              // What the control doesn't cover
  controlAnswer?: 'yes' | 'no' | 'partial' | 'na' | null;  // From control assessment
}

/**
 * Compensating control documentation
 */
export interface CompensatingControlRecord {
  id: string;
  description: string;
  justification: string;                // Why original requirement can't be met
  constraints: string;                  // Constraints that preclude original requirement
  objective: string;                    // Original objective being addressed
  riskMitigation: string;               // How compensating control mitigates risk
  residualRisk: 'low' | 'medium' | 'high';
  approvedBy: string;
  approvedAt: string;
  validUntil: string;                   // Compensating controls need periodic review
}

/**
 * Exception/risk acceptance record
 */
export interface ExceptionRecord {
  id: string;
  reason: string;
  businessJustification: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mitigatingFactors: string[];
  approvedBy: string;
  approvedAt: string;
  expiresAt: string;                    // Exceptions must be time-bound
  reviewDate: string;                   // When to review the exception
}

/**
 * HIPAA addressable specification decision
 */
export interface AddressableDecision {
  specificationType: HIPAASpecificationType;
  decision: AddressableDecisionType;
  implementationDescription?: string;   // If implemented or alternative
  alternativeDescription?: string;      // If alternative implemented
  reasonNotImplemented?: string;        // Required if not_reasonable
  riskAnalysisReference?: string;       // Reference to risk analysis supporting decision
  documentedAt: string;
  documentedBy: string;
}

// ============================================
// FRAMEWORK SCOPE DEFINITIONS
// ============================================

/**
 * PCI DSS scope definition
 */
export interface PCIDSSScope {
  entityType: 'merchant' | 'service_provider';
  saqType?: 'A' | 'A-EP' | 'B' | 'B-IP' | 'C' | 'C-VT' | 'D' | 'D-SP' | 'P2PE';
  cdeDefinied: boolean;
  networkSegmented: boolean;
  segmentationValidated: boolean;
  channelsInScope: {
    ecommerce: boolean;
    moto: boolean;
    pos: boolean;
    cardPresent: boolean;
  };
  thirdPartyProcessing: boolean;
  tokenizationUsed: boolean;
  p2peValidated: boolean;
}

/**
 * HIPAA scope definition
 */
export interface HIPAAScope {
  entityType: 'covered_entity' | 'business_associate';
  coveredEntityType?: 'health_plan' | 'healthcare_provider' | 'healthcare_clearinghouse';
  hybridEntity: boolean;
  designatedComponents?: string[];      // If hybrid entity
  ephiSystemsIdentified: boolean;
  businessAssociateAgreementsInPlace: boolean;
}

/**
 * SOC 2 scope definition
 */
export interface SOC2Scope {
  reportType: 'type1' | 'type2';
  trustServiceCategories: {
    security: boolean;                  // Always required (Common Criteria)
    availability: boolean;
    processingIntegrity: boolean;
    confidentiality: boolean;
    privacy: boolean;
  };
  systemDescription: string;
  subserviceOrganizations: string[];
  complementaryUserEntityControls: boolean;
}

/**
 * ISO 27001 scope definition
 */
export interface ISO27001Scope {
  scopeStatement: string;
  excludedControls: string[];           // Controls excluded via Statement of Applicability
  exclusionJustifications: Record<string, string>;  // controlId -> justification
  certificationBodyRequirements?: string;
}

/**
 * NIST CSF scope definition
 */
export interface NISTCSFScope {
  implementationTier: 1 | 2 | 3 | 4;    // Partial, Risk Informed, Repeatable, Adaptive
  targetProfile: string;
  currentProfile?: string;
  prioritizedSubcategories: string[];
}

/**
 * GDPR scope definition
 */
export interface GDPRScope {
  controllerOrProcessor: 'controller' | 'processor' | 'joint_controller';
  establishedInEU: boolean;
  targetingEUResidents: boolean;
  dpoRequired: boolean;
  dpoAppointed: boolean;
  dpiaRequired: boolean;
  crossBorderProcessing: boolean;
  leadSupervisoryAuthority?: string;
}

/**
 * Union type for all framework scopes
 */
export type FrameworkScope =
  | { frameworkId: 'PCIDSS'; scope: PCIDSSScope }
  | { frameworkId: 'HIPAA'; scope: HIPAAScope }
  | { frameworkId: 'SOC2'; scope: SOC2Scope }
  | { frameworkId: 'ISO27001'; scope: ISO27001Scope }
  | { frameworkId: 'NIST'; scope: NISTCSFScope }
  | { frameworkId: 'GDPR'; scope: GDPRScope };

// ============================================
// INVERSE MAPPING INDEX
// ============================================

/**
 * Maps requirements to their associated controls
 */
export interface RequirementControlMapping {
  requirementId: string;
  directControls: string[];             // Controls that directly satisfy
  partialControls: string[];            // Controls that partially satisfy
  supportiveControls: string[];         // Controls that support but don't satisfy
  totalCoverage: number;                // Estimated 0-100 based on mappings
  gaps: string[];                       // Identified gaps not covered by controls
}

/**
 * Full inverse index for a framework
 */
export interface FrameworkRequirementIndex {
  frameworkId: FrameworkId;
  frameworkVersion: string;
  requirements: Record<string, RequirementControlMapping>;
  unmappedRequirements: string[];       // Requirements with no control mappings
  fullyMappedRequirements: string[];    // Requirements with 100% control coverage
  lastBuilt: string;                    // When index was generated
}

// ============================================
// WIZARD STATE
// ============================================

/**
 * Assessment wizard state
 */
export interface AssessmentWizardState {
  currentStep: 'framework_selection' | 'scope_definition' | 'assessment' | 'review';
  selectedFramework: FrameworkId | null;
  frameworkVersion: string | null;
  scope: FrameworkScope | null;
  currentRequirementId: string | null;
  assessments: Record<string, RequirementAssessment>;
  completedRequirements: string[];
  skippedRequirements: string[];
  progress: {
    total: number;
    assessed: number;
    compliant: number;
    partiallyCompliant: number;
    nonCompliant: number;
    notApplicable: number;
  };
}

// ============================================
// REQUIREMENT DETAIL (FOR DISPLAY)
// ============================================

/**
 * Enriched requirement for display in the wizard
 */
export interface RequirementDetail {
  id: string;
  frameworkId: FrameworkId;
  parentId: string | null;
  title: string;
  description: string;
  guidance?: string;

  // Framework-specific metadata
  isRequired: boolean;                  // false for HIPAA addressable, SOC2 optional categories
  implementationLevel?: 'mandatory' | 'recommended' | 'optional' | 'conditional';
  hipaaSpecificationType?: HIPAASpecificationType;

  // Assessment guidance
  assessmentQuestions: string[];
  requiredEvidenceTypes: string[];
  auditorTestingGuidance?: string;
  commonMistakes?: string[];

  // Control mappings
  mappedControls: ControlMappingAssessment[];
  estimatedCoverage: number;

  // Hierarchy
  children: RequirementDetail[];
  level: number;                        // Depth in hierarchy
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Summary statistics for a framework assessment
 */
export interface FrameworkAssessmentSummary {
  frameworkId: FrameworkId;
  frameworkVersion: string;
  totalRequirements: number;
  assessedRequirements: number;
  complianceByStatus: Record<RequirementComplianceStatus, number>;
  complianceByMethod: Record<ComplianceMethod, number>;
  overallCompliancePercentage: number;
  criticalGaps: string[];               // Non-compliant mandatory requirements
  upcomingReassessments: string[];      // Requirements needing reassessment soon
  lastAssessmentDate: string | null;
  assessmentCompleteness: number;       // 0-100
}

/**
 * Export format for compliance reports
 */
export interface RequirementAssessmentExport {
  framework: {
    id: FrameworkId;
    name: string;
    version: string;
  };
  scope: FrameworkScope;
  assessmentDate: string;
  assessedBy: string;
  summary: FrameworkAssessmentSummary;
  requirements: Array<{
    id: string;
    title: string;
    status: RequirementComplianceStatus;
    method: ComplianceMethod;
    evidence: string[];
    notes: string;
    mappedControls: string[];
  }>;
}
