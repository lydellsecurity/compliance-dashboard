/**
 * Live Regulatory Update System - Type Definitions
 *
 * This module defines the "Single Source of Truth" architecture for managing
 * regulatory frameworks that change over time. It separates:
 *
 * 1. Framework Requirements (THE LAW) - Official regulatory requirements
 * 2. Internal Controls (YOUR ACTIONS) - Organization's implementation measures
 * 3. Crosswalk Mappings (THE BRIDGE) - N:N relationships with versioning
 * 4. Compliance Drift (THE GAPS) - When updates invalidate previous compliance
 *
 * Designed to be framework-agnostic for future regulations (CCPA 2.0, AI Act, etc.)
 */

import type { FrameworkId, EffortLevel, ImpactLevel } from '../constants/controls';
import type { EvidenceType, MappingStrength } from './control-requirement-mapping.types';

// ============================================
// FRAMEWORK VERSION MANAGEMENT
// ============================================

/**
 * Extended Framework ID to support future regulations
 */
export type ExtendedFrameworkId =
  | FrameworkId
  | 'EU_AI_ACT'
  | 'CCPA_2'
  | 'DORA'           // Digital Operational Resilience Act
  | 'NIS2'           // Network and Information Security Directive 2
  | 'CMMC_2'         // Cybersecurity Maturity Model Certification 2.0
  | 'FedRAMP'
  | 'StatePrivacy';  // Generic state privacy laws

/**
 * Framework Version - Tracks different versions of the same framework
 */
export interface FrameworkVersion {
  id: string;                              // e.g., "iso_27001_2022", "hipaa_2026"
  frameworkId: ExtendedFrameworkId;
  versionCode: string;                     // e.g., "2022", "v4.0", "2026-update"
  versionName: string;                     // Human-readable name

  // Version status
  status: 'draft' | 'published' | 'active' | 'superseded' | 'retired';

  // Dates
  publishedDate: string;                   // When the regulation was published
  effectiveDate: string;                   // When it becomes enforceable
  transitionDeadline?: string;             // Deadline for compliance
  sunsetDate?: string;                     // When this version is no longer valid

  // Source information
  officialSource: string;                  // URL to official document
  sourceLastChecked: string;               // When we last verified this source

  // Change tracking
  previousVersionId?: string;              // Link to prior version
  changelogSummary?: string;               // Brief description of changes
  majorChanges: VersionChange[];           // Detailed change list

  // Metadata
  jurisdiction: string[];                  // e.g., ["US", "EU", "Global"]
  applicableSectors: string[];             // e.g., ["Healthcare", "Finance", "All"]

  createdAt: string;
  updatedAt: string;
}

/**
 * Individual change between framework versions
 */
export interface VersionChange {
  id: string;
  changeType: 'added' | 'modified' | 'removed' | 'clarified' | 'strengthened' | 'relaxed';

  // What changed
  affectedRequirementCode: string;
  previousText?: string;
  newText?: string;

  // Impact assessment
  impactLevel: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  complianceImpact: string;                // How this affects compliance
  actionRequired: string;                  // What organizations need to do

  // Mapping to controls
  affectedControlIds: string[];            // Controls that may need updates

  // Tags for categorization
  tags: string[];                          // e.g., ["encryption", "mfa", "ai-transparency"]
}

// ============================================
// MASTER REQUIREMENT LIBRARY
// ============================================

/**
 * Master Requirement - Framework-agnostic requirement record
 * This is the "Single Source of Truth" for what the law requires
 */
export interface MasterRequirement {
  id: string;                              // UUID - globally unique

  // Framework linkage (supports multiple versions)
  frameworkId: ExtendedFrameworkId;
  frameworkVersionId: string;              // References FrameworkVersion.id

  // Requirement identification
  requirementCode: string;                 // Official code (e.g., "CC6.1", "Art. 52")
  parentCode?: string;                     // For hierarchical requirements
  hierarchy: string[];                     // Full path: ["Chapter 3", "Section 52", "Paragraph 1"]

  // Content
  title: string;
  officialText: string;                    // Verbatim regulatory text
  plainLanguageSummary: string;            // Simplified explanation
  implementationGuidance: string;          // How to comply

  // Classification
  category: RequirementCategory;
  subcategory?: string;
  domain: ComplianceDomainExtended;

  // 2026+ Specific Categories
  emergingTechCategory?: EmergingTechCategory;

  // Requirement attributes
  implementationLevel: 'mandatory' | 'recommended' | 'optional' | 'conditional';
  conditions?: RequirementCondition[];     // When requirement applies

  // Risk and priority
  riskWeight: number;                      // 1-10
  penaltyRisk: PenaltyRisk;

  // Evidence requirements
  requiredEvidenceTypes: EvidenceType[];
  verificationMethods: VerificationMethod[];
  verificationFrequency: VerificationFrequency;

  // Keywords for AI mapping
  keywords: string[];
  semanticEmbedding?: number[];            // Vector embedding for semantic search

  // Lifecycle
  effectiveDate: string;
  transitionPeriodDays?: number;
  sunsetDate?: string;

  // Audit trail
  sourceUrl: string;
  lastVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Requirement categories - extensible for future regulations
 */
export type RequirementCategory =
  // Traditional categories
  | 'access_control'
  | 'data_protection'
  | 'incident_response'
  | 'risk_management'
  | 'audit_logging'
  | 'encryption'
  | 'network_security'
  | 'physical_security'
  | 'hr_security'
  | 'vendor_management'
  | 'business_continuity'
  | 'change_management'
  | 'configuration_management'
  | 'vulnerability_management'
  // 2026+ Categories
  | 'ai_governance'
  | 'ai_transparency'
  | 'ai_bias_mitigation'
  | 'quantum_readiness'
  | 'zero_trust'
  | 'supply_chain_security'
  | 'data_sovereignty'
  | 'privacy_by_design'
  | 'algorithmic_accountability';

/**
 * Extended compliance domains for 2026+
 */
export type ComplianceDomainExtended =
  | 'access_control'
  | 'asset_management'
  | 'risk_assessment'
  | 'security_operations'
  | 'incident_response'
  | 'business_continuity'
  | 'vendor_management'
  | 'data_protection'
  | 'physical_security'
  | 'hr_security'
  | 'change_management'
  | 'compliance_monitoring'
  // New domains
  | 'ai_ml_governance'
  | 'cryptographic_controls'
  | 'identity_governance'
  | 'cloud_security'
  | 'api_security'
  | 'privacy_management';

/**
 * Emerging technology categories for 2026 requirements
 */
export type EmergingTechCategory =
  | 'ai_foundation_models'
  | 'ai_high_risk_systems'
  | 'ai_general_purpose'
  | 'post_quantum_crypto'
  | 'zero_trust_architecture'
  | 'confidential_computing'
  | 'homomorphic_encryption'
  | 'blockchain_identity'
  | 'iot_security';

/**
 * Conditional requirement applicability
 */
export interface RequirementCondition {
  type: 'sector' | 'size' | 'data_type' | 'geography' | 'risk_level' | 'technology';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_list';
  value: string | number | string[];
  description: string;
}

/**
 * Penalty risk assessment
 */
export interface PenaltyRisk {
  maxFinancialPenalty?: string;            // e.g., "4% of global revenue" or "$1M"
  penaltyType: 'percentage_revenue' | 'fixed_amount' | 'per_violation' | 'per_day';
  criminalLiability: boolean;
  reputationalImpact: 'critical' | 'high' | 'medium' | 'low';
}

export type VerificationMethod =
  | 'documentation_review'
  | 'interview'
  | 'observation'
  | 'technical_testing'
  | 'automated_scan'
  | 'penetration_test'
  | 'code_review'
  | 'model_audit'                          // AI-specific
  | 'bias_assessment';                     // AI-specific

export type VerificationFrequency =
  | 'once'
  | 'annual'
  | 'semi_annual'
  | 'quarterly'
  | 'monthly'
  | 'continuous'
  | 'on_change'                            // When system changes
  | 'on_incident';                         // After security incidents

// ============================================
// CROSSWALK MAPPING (N:N WITH VERSIONING)
// ============================================

/**
 * Versioned Requirement Mapping - Links controls to specific requirement versions
 */
export interface VersionedRequirementMapping {
  id: string;

  // Links
  controlId: string;                       // Your internal control
  requirementId: string;                   // MasterRequirement.id
  frameworkVersionId: string;              // Specific version this mapping applies to

  // Mapping details
  mappingStrength: MappingStrength;
  coveragePercentage: number;              // 0-100

  // Coverage details
  coveredAspects: string[];
  uncoveredAspects: string[];
  gaps: string[];                          // Specific gaps in coverage

  // Justification
  mappingJustification: string;
  evidenceOfCompliance: string[];          // How you prove this mapping works

  // Version tracking
  validFromVersion: string;                // First framework version this applies to
  validUntilVersion?: string;              // Last framework version (null = current)
  supersededByMappingId?: string;          // If this mapping was replaced

  // Validation
  validationStatus: 'pending' | 'validated' | 'rejected' | 'needs_review';
  validatedBy?: string;
  validatedAt?: string;

  // AI assistance metadata
  isAutoMapped: boolean;
  autoMapConfidence?: number;
  aiReasoning?: string;
  humanReviewed: boolean;

  // Compliance drift tracking
  driftStatus: 'current' | 'at_risk' | 'drifted' | 'invalidated';
  lastDriftCheck: string;

  createdAt: string;
  updatedAt: string;
}

// ============================================
// COMPLIANCE DRIFT DETECTION
// ============================================

/**
 * Compliance Drift - When regulatory changes invalidate existing compliance
 */
export interface ComplianceDrift {
  id: string;

  // What's affected
  controlId: string;
  mappingId: string;
  requirementId: string;

  // Version context
  oldFrameworkVersionId: string;
  newFrameworkVersionId: string;

  // Drift details
  driftType: DriftType;
  severity: 'critical' | 'high' | 'medium' | 'low';

  // What changed
  previousRequirementText: string;
  newRequirementText: string;
  changeSummary: string;

  // Impact
  impactAssessment: string;
  affectedEvidenceTypes: EvidenceType[];

  // User's previous answer
  previousAnswer: 'yes' | 'no' | 'partial' | 'na';
  answerStillValid: boolean;
  validityReason: string;

  // Resolution
  status: 'detected' | 'acknowledged' | 'in_review' | 'resolved' | 'accepted_risk';
  resolutionPath: DriftResolutionOption[];
  selectedResolution?: string;
  resolvedAt?: string;
  resolvedBy?: string;

  // Notification
  notifiedAt?: string;
  notificationMethod?: 'email' | 'in_app' | 'both';

  // Deadline
  complianceDeadline: string;
  daysRemaining: number;

  createdAt: string;
  updatedAt: string;
}

export type DriftType =
  | 'requirement_strengthened'             // Requirement became stricter
  | 'requirement_expanded'                 // Requirement scope increased
  | 'new_requirement'                      // Entirely new requirement
  | 'evidence_type_changed'                // Different evidence now required
  | 'verification_frequency_changed'       // More frequent verification needed
  | 'technology_specific'                  // New tech-specific requirements (AI, quantum)
  | 'deadline_changed'                     // Compliance timeline changed
  | 'penalty_increased';                   // Risk of non-compliance increased

export interface DriftResolutionOption {
  id: string;
  type: 'update_control' | 'add_evidence' | 'create_new_control' | 'accept_risk' | 'request_exception';
  description: string;
  effort: EffortLevel;
  recommendedActions: string[];
  templates?: string[];
}

// ============================================
// REGULATORY CHANGE LOG (AI SCRAPING OUTPUT)
// ============================================

/**
 * Regulatory Change Log - Output from AI regulatory scanning
 */
export interface RegulatoryChangeLog {
  id: string;

  // Source information
  frameworkId: ExtendedFrameworkId;
  sourceUrl: string;
  sourceName: string;                      // e.g., "HHS.gov", "NIST.gov"
  scannedAt: string;

  // Change detection
  changeDetected: boolean;
  changeType: 'new_version' | 'amendment' | 'guidance_update' | 'enforcement_change' | 'draft_proposal';

  // Change details
  title: string;
  summary: string;
  detailedChanges: DetectedChange[];

  // Impact assessment
  estimatedImpact: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  affectedRequirementCodes: string[];
  suggestedNewControls: SuggestedControl[];

  // Dates
  announcementDate: string;
  effectiveDate?: string;
  commentDeadline?: string;                // For draft regulations

  // AI confidence
  confidence: number;                      // 0-100
  aiModel: string;
  verificationNeeded: boolean;

  // Processing status
  status: 'detected' | 'verified' | 'processed' | 'dismissed' | 'false_positive';
  processedAt?: string;
  processedBy?: string;

  // Raw data
  rawContent?: string;                     // Original scraped text
  structuredData?: Record<string, unknown>;

  createdAt: string;
}

/**
 * Individual detected change from regulatory scanning
 */
export interface DetectedChange {
  id: string;

  changeType: 'added' | 'modified' | 'removed' | 'clarified';
  section: string;
  previousText?: string;
  newText: string;

  // Mapping suggestions
  relatedRequirementIds: string[];
  suggestedKeywords: string[];

  // AI analysis
  aiInterpretation: string;
  complianceImplication: string;
  actionableInsight: string;
}

/**
 * AI-suggested new control based on regulatory changes
 */
export interface SuggestedControl {
  id: string;

  // Control details
  title: string;
  description: string;
  suggestedQuestion: string;
  suggestedGuidance: string;

  // Classification
  domain: ComplianceDomainExtended;
  category: RequirementCategory;
  emergingTechCategory?: EmergingTechCategory;

  // Mapping
  targetRequirementIds: string[];
  suggestedMappingStrength: MappingStrength;

  // Priority
  urgency: 'immediate' | 'high' | 'medium' | 'low';
  effort: EffortLevel;
  impact: ImpactLevel;

  // Evidence
  suggestedEvidenceTypes: EvidenceType[];

  // AI metadata
  confidence: number;
  reasoning: string;

  // Status
  status: 'suggested' | 'under_review' | 'accepted' | 'modified' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  finalControlId?: string;                 // If accepted and created
}

// ============================================
// 2026-SPECIFIC REQUIREMENT SCHEMAS
// ============================================

/**
 * EU AI Act specific requirement attributes
 */
export interface AIActRequirement extends MasterRequirement {
  aiRiskLevel: 'unacceptable' | 'high' | 'limited' | 'minimal';

  // AI-specific requirements
  aiSystemType?: string[];                 // Types of AI systems covered
  transparencyRequirements?: {
    disclosureRequired: boolean;
    humanOversightRequired: boolean;
    explainabilityLevel: 'full' | 'partial' | 'outcome_only';
  };

  // Training data requirements
  dataGovernance?: {
    dataQualityStandards: string[];
    biasAssessmentRequired: boolean;
    dataProvenanceRequired: boolean;
    syntheticDataRules?: string;
  };

  // Model requirements
  modelRequirements?: {
    accuracyThresholds?: Record<string, number>;
    robustnessRequirements: string[];
    securityRequirements: string[];
  };

  // Conformity assessment
  conformityAssessment: 'self_assessment' | 'third_party' | 'notified_body';
}

/**
 * Quantum-readiness requirement attributes
 */
export interface QuantumReadinessRequirement extends MasterRequirement {
  quantumThreatLevel: 'immediate' | 'near_term' | 'medium_term' | 'long_term';

  // Cryptographic requirements
  cryptoRequirements?: {
    currentAlgorithms: string[];           // Algorithms to phase out
    approvedPQCAlgorithms: string[];       // NIST-approved post-quantum algorithms
    hybridApproach: boolean;               // Whether hybrid classical/PQC is acceptable
    migrationDeadline?: string;
  };

  // Key management
  keyManagement?: {
    keyLengthRequirements: Record<string, number>;
    keyRotationFrequency: string;
    harvestNowDecryptLater: boolean;       // Protection against HNDL attacks
  };

  // Data classification for quantum risk
  dataQuantumRisk?: {
    longTermSecrecy: boolean;              // Data needs protection beyond quantum timeline
    sensitivityLevel: 'top_secret' | 'secret' | 'confidential' | 'standard';
  };
}

/**
 * Zero Trust requirement attributes
 */
export interface ZeroTrustRequirement extends MasterRequirement {
  zeroTrustPillar: 'identity' | 'device' | 'network' | 'application' | 'data';

  // Identity requirements
  identityRequirements?: {
    mfaRequired: boolean;
    mfaStrength: 'phishing_resistant' | 'standard' | 'basic';
    continuousAuthentication: boolean;
    riskBasedAccess: boolean;
    sessionTimeout: number;                // Minutes
  };

  // Device requirements
  deviceRequirements?: {
    deviceTrustRequired: boolean;
    complianceCheckFrequency: VerificationFrequency;
    allowedDeviceTypes: string[];
  };

  // Network requirements
  networkRequirements?: {
    microsegmentation: boolean;
    encryptionInTransit: boolean;
    encryptionAtRest: boolean;
    tlsVersion: string;
  };
}

// ============================================
// REGULATORY UPDATE SUBSCRIPTION
// ============================================

/**
 * Subscription to regulatory updates for specific frameworks
 */
export interface RegulatorySubscription {
  id: string;
  organizationId: string;

  // Subscribed frameworks
  frameworks: ExtendedFrameworkId[];

  // Notification preferences
  notificationSettings: {
    criticalChanges: 'immediate' | 'daily' | 'weekly';
    highChanges: 'immediate' | 'daily' | 'weekly';
    mediumChanges: 'daily' | 'weekly' | 'monthly';
    lowChanges: 'weekly' | 'monthly' | 'never';
    draftProposals: boolean;
    guidanceUpdates: boolean;
  };

  // Notification channels
  channels: {
    email: string[];
    slack?: string;
    webhook?: string;
  };

  // Auto-processing
  autoProcessing: {
    autoCreateDriftAlerts: boolean;
    autoSuggestControls: boolean;
    requireHumanReview: boolean;
  };

  createdAt: string;
  updatedAt: string;
}

// ============================================
// VERSION COMPARISON (FOR UI)
// ============================================

/**
 * Side-by-side comparison for version control UI
 */
export interface RequirementVersionComparison {
  requirementCode: string;

  current: {
    versionId: string;
    versionCode: string;
    text: string;
    effectiveDate: string;
  };

  new: {
    versionId: string;
    versionCode: string;
    text: string;
    effectiveDate: string;
    transitionDeadline?: string;
  };

  // Diff analysis
  changeType: 'added' | 'modified' | 'removed' | 'unchanged';
  changeSeverity: 'critical' | 'high' | 'medium' | 'low';
  diffHighlights: DiffHighlight[];

  // Impact on existing compliance
  currentComplianceStatus: 'compliant' | 'partial' | 'non_compliant' | 'unknown';
  projectedComplianceStatus: 'compliant' | 'at_risk' | 'non_compliant' | 'needs_review';

  // Affected controls
  affectedControls: {
    controlId: string;
    controlCode: string;
    currentAnswer: 'yes' | 'no' | 'partial' | 'na';
    answerStillValid: boolean;
    requiredAction?: string;
  }[];

  // Recommended actions
  recommendedActions: string[];
}

/**
 * Text diff highlight for UI rendering
 */
export interface DiffHighlight {
  type: 'added' | 'removed' | 'changed';
  startIndex: number;
  endIndex: number;
  oldText?: string;
  newText?: string;
}

// ============================================
// STORAGE KEYS
// ============================================

export const REGULATORY_STORAGE_KEYS = {
  FRAMEWORK_VERSIONS: 'regulatory-framework-versions',
  MASTER_REQUIREMENTS: 'regulatory-master-requirements',
  VERSIONED_MAPPINGS: 'regulatory-versioned-mappings',
  COMPLIANCE_DRIFT: 'regulatory-compliance-drift',
  CHANGE_LOGS: 'regulatory-change-logs',
  SUBSCRIPTIONS: 'regulatory-subscriptions',
  SUGGESTED_CONTROLS: 'regulatory-suggested-controls',
} as const;
