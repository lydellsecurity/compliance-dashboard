/**
 * Control-Requirement Mapping Types
 *
 * Defines the relationship between actionable security controls (the "Work")
 * and framework requirements (the "Proof" for auditors).
 *
 * Architecture:
 * - MasterControl: Single actionable security measure (what users implement)
 * - FrameworkRequirement: Official compliance requirement (what auditors verify)
 * - RequirementMapping: Junction table linking controls to requirements (N:N)
 * - CustomGap: Requirements with no mapped controls that need direct evidence
 */

import type { FrameworkId, ComplianceDomain, EffortLevel, ImpactLevel } from '../constants/controls';

// ============================================
// ENUMS
// ============================================

export type MappingStrength =
  | 'direct'       // Control fully satisfies requirement
  | 'partial'      // Control partially satisfies requirement
  | 'supportive';  // Control supports but doesn't satisfy requirement

export type RequirementStatus =
  | 'not_started'
  | 'in_progress'
  | 'compliant'
  | 'partially_compliant'
  | 'non_compliant'
  | 'not_applicable'
  | 'custom_gap';    // No controls mapped - needs direct evidence

export type GapType =
  | 'no_control_mapped'     // Requirement has zero control mappings
  | 'insufficient_coverage' // Controls exist but don't fully cover
  | 'control_not_implemented' // Controls mapped but not implemented
  | 'evidence_missing';      // Controls implemented but evidence lacking

export type ControlImplementationStatus =
  | 'not_started'
  | 'in_progress'
  | 'implemented'
  | 'verified'
  | 'not_applicable';

// ============================================
// MASTER CONTROL TABLE
// ============================================

/**
 * MasterControl - A single actionable security measure
 * This is what users interact with and implement
 */
export interface MasterControlRecord {
  id: string;                           // UUID
  controlCode: string;                  // Human-readable code (e.g., "AC-001", "MFA-01")
  domain: ComplianceDomain;

  // Core information
  title: string;
  description: string;
  question: string;                     // The question asked to users
  guidance: string;                     // Implementation guidance
  whyItMatters?: string;

  // Implementation metadata
  effort: EffortLevel;
  impact: ImpactLevel;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';

  // Evidence requirements
  evidenceExamples: string[];
  requiredEvidenceTypes: EvidenceType[];

  // Automation
  automatable: boolean;
  automationHints?: string[];

  // Status (user-populated)
  implementationStatus: ControlImplementationStatus;
  implementedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  version: number;

  // Keywords for search/matching
  keywords: string[];
}

/**
 * Evidence types for controls and requirements
 */
export type EvidenceType =
  | 'policy_document'
  | 'procedure_document'
  | 'screenshot'
  | 'configuration_export'
  | 'audit_log'
  | 'test_results'
  | 'certificate'
  | 'attestation'
  | 'training_record'
  | 'risk_assessment'
  | 'vendor_agreement'
  | 'incident_report'
  | 'penetration_test'
  | 'vulnerability_scan'
  | 'other';

// ============================================
// FRAMEWORK REQUIREMENT TABLE
// ============================================

/**
 * FrameworkRequirement - Official compliance requirement
 * This is what auditors verify
 */
export interface FrameworkRequirementRecord {
  id: string;                           // UUID
  frameworkId: FrameworkId;
  frameworkVersion: string;             // e.g., "v4.0", "2022", "2.0"

  // Requirement identification
  requirementCode: string;              // e.g., "CC6.1", "164.312(a)(1)", "A.9.4.3"
  parentCode?: string;                  // For hierarchical requirements

  // Content
  title: string;
  description: string;
  guidance?: string;

  // Classification
  category: string;
  subcategory?: string;

  // Implementation requirements
  implementationLevel: 'mandatory' | 'recommended' | 'optional' | 'conditional';
  isAddressable?: boolean;              // HIPAA-specific

  // Verification
  verificationMethods: ('documentation' | 'interview' | 'observation' | 'testing' | 'automated')[];
  requiredEvidenceTypes: EvidenceType[];
  verificationFrequency: 'once' | 'annual' | 'quarterly' | 'monthly' | 'continuous';

  // Risk
  riskWeight: number;                   // 1-10

  // Keywords for auto-mapping
  keywords: string[];

  // Metadata
  effectiveDate: string;
  sunsetDate?: string;
}

// ============================================
// REQUIREMENT MAPPING JUNCTION TABLE
// ============================================

/**
 * RequirementMapping - Links MasterControl to FrameworkRequirement
 * This is the N:N junction table
 */
export interface RequirementMapping {
  id: string;                           // UUID

  // Foreign keys
  controlId: string;                    // References MasterControlRecord.id
  requirementId: string;                // References FrameworkRequirementRecord.id

  // Mapping metadata
  mappingStrength: MappingStrength;
  coveragePercentage: number;           // 0-100, how much this control covers the requirement

  // What aspects this control covers
  coveredAspects: string[];             // e.g., ["access control", "audit logging"]
  uncoveredAspects?: string[];          // e.g., ["encryption", "key management"]

  // Justification
  mappingJustification: string;

  // Validation
  validatedBy?: string;
  validatedAt?: string;
  validationNotes?: string;

  // Auto-mapping metadata (if AI-generated)
  isAutoMapped: boolean;
  autoMapConfidence?: number;           // 0-100
  humanReviewed: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CUSTOM GAP - UNMAPPED REQUIREMENTS
// ============================================

/**
 * CustomGap - Requirements with no/insufficient control mappings
 * These need direct evidence or new policies
 */
export interface CustomGap {
  id: string;                           // UUID
  requirementId: string;                // References FrameworkRequirementRecord.id

  // Gap classification
  gapType: GapType;
  severity: 'critical' | 'high' | 'medium' | 'low';

  // Gap details
  description: string;
  missingCoverage: string[];            // What's missing

  // Resolution path
  resolutionOptions: GapResolutionOption[];
  selectedResolution?: string;          // Selected resolution option ID

  // Status
  status: 'identified' | 'acknowledged' | 'in_progress' | 'resolved' | 'accepted_risk';

  // Direct evidence (for gaps resolved without controls)
  directEvidence: DirectEvidenceRecord[];

  // Compensating control (if applicable)
  compensatingControl?: CompensatingControlInfo;

  // Risk acceptance (if applicable)
  riskAcceptance?: RiskAcceptanceRecord;

  // Audit trail
  identifiedAt: string;
  identifiedBy: string;
  resolvedAt?: string;
  resolvedBy?: string;
  notes: string;
}

/**
 * Resolution options for gaps
 */
export interface GapResolutionOption {
  id: string;
  type: 'create_control' | 'upload_evidence' | 'create_policy' | 'compensating_control' | 'accept_risk';
  description: string;
  effort: EffortLevel;
  recommendedTemplates?: string[];
}

/**
 * Direct evidence for gap resolution
 */
export interface DirectEvidenceRecord {
  id: string;
  gapId: string;

  name: string;
  description: string;
  evidenceType: EvidenceType;

  // File storage
  fileUrls: string[];
  fileName?: string;
  fileSize?: number;

  // Verification
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;

  // Validity
  validFrom?: string;
  validUntil?: string;

  // Metadata
  uploadedAt: string;
  uploadedBy: string;
}

/**
 * Compensating control for gap resolution
 */
export interface CompensatingControlInfo {
  description: string;
  justification: string;
  constraints: string;
  riskMitigation: string;
  residualRisk: 'low' | 'medium' | 'high';
  approvedBy: string;
  approvedAt: string;
  validUntil: string;
}

/**
 * Risk acceptance for gap resolution
 */
export interface RiskAcceptanceRecord {
  reason: string;
  businessJustification: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mitigatingFactors: string[];
  approvedBy: string;
  approvedAt: string;
  expiresAt: string;
  reviewDate: string;
}

// ============================================
// AUDITOR VIEW TYPES
// ============================================

/**
 * RequirementProgress - Auditor-facing view of requirement compliance
 */
export interface RequirementProgress {
  requirementId: string;
  frameworkId: FrameworkId;
  requirementCode: string;
  title: string;

  // Status
  status: RequirementStatus;

  // Control coverage
  mappedControls: MappedControlSummary[];
  totalCoverage: number;                // 0-100

  // Gap information
  hasGap: boolean;
  gapInfo?: {
    gapType: GapType;
    description: string;
    resolution?: string;
  };

  // Evidence summary
  evidenceSummary: {
    total: number;
    verified: number;
    pending: number;
    expired: number;
  };

  // Direct evidence (for custom gaps)
  directEvidence: DirectEvidenceRecord[];

  // Timestamps
  lastAssessedAt?: string;
  lastEvidenceAt?: string;
}

/**
 * Summary of a control's contribution to a requirement
 */
export interface MappedControlSummary {
  controlId: string;
  controlCode: string;
  controlTitle: string;

  mappingStrength: MappingStrength;
  coveragePercentage: number;

  implementationStatus: ControlImplementationStatus;

  evidenceCount: number;
  hasVerifiedEvidence: boolean;
}

/**
 * Framework compliance summary for auditors
 */
export interface FrameworkComplianceSummary {
  frameworkId: FrameworkId;
  frameworkName: string;
  frameworkVersion: string;

  // Counts
  totalRequirements: number;

  // Status breakdown
  compliant: number;
  partiallyCompliant: number;
  nonCompliant: number;
  notStarted: number;
  notApplicable: number;
  customGaps: number;

  // Scores
  overallScore: number;               // 0-100

  // Gaps
  criticalGaps: number;
  highGaps: number;
  mediumGaps: number;
  lowGaps: number;

  // Evidence
  totalEvidence: number;
  verifiedEvidence: number;
  pendingEvidence: number;
  expiredEvidence: number;

  // Timestamps
  lastUpdated: string;
  lastAuditDate?: string;
}

// ============================================
// INVERSE INDEX - CONTROL TO REQUIREMENTS
// ============================================

/**
 * Control coverage index - shows which requirements each control satisfies
 */
export interface ControlCoverageIndex {
  controlId: string;
  controlCode: string;
  controlTitle: string;

  // Requirements this control maps to
  mappedRequirements: {
    requirementId: string;
    frameworkId: FrameworkId;
    requirementCode: string;
    title: string;
    mappingStrength: MappingStrength;
    coveragePercentage: number;
  }[];

  // Framework coverage summary
  frameworkCoverage: Record<FrameworkId, {
    total: number;
    covered: number;
    percentage: number;
  }>;
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Bulk mapping creation request
 */
export interface BulkMappingRequest {
  controlId: string;
  requirements: {
    requirementId: string;
    mappingStrength: MappingStrength;
    coveragePercentage: number;
    coveredAspects: string[];
    justification: string;
  }[];
}

/**
 * Auto-mapping suggestion from AI
 */
export interface AutoMappingSuggestion {
  controlId: string;
  requirementId: string;

  suggestedStrength: MappingStrength;
  suggestedCoverage: number;

  confidence: number;                   // 0-100
  reasoning: string;

  matchedKeywords: string[];

  accepted?: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
}

// ============================================
// STORAGE KEYS
// ============================================

export const STORAGE_KEYS = {
  MASTER_CONTROLS: 'compliance-master-controls',
  REQUIREMENT_MAPPINGS: 'compliance-requirement-mappings',
  CUSTOM_GAPS: 'compliance-custom-gaps',
  DIRECT_EVIDENCE: 'compliance-direct-evidence',
  AUTO_MAPPING_SUGGESTIONS: 'compliance-auto-mapping-suggestions',
} as const;
