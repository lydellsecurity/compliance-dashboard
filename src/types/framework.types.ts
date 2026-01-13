/**
 * Framework Types - Regulatory Requirements Layer
 * 
 * Represents external regulatory requirements (the "law")
 * These are immutable once versioned and come from official sources
 */

// ============================================
// FRAMEWORK ENUMS
// ============================================

export type FrameworkCategory = 
  | 'security'
  | 'privacy'
  | 'ai_governance'
  | 'financial'
  | 'healthcare'
  | 'industry_specific'
  | 'data_residency';

export type FrameworkVersionStatus = 
  | 'draft'
  | 'final'
  | 'active'
  | 'superseded'
  | 'withdrawn';

export type ImplementationLevel = 
  | 'mandatory'
  | 'recommended'
  | 'optional'
  | 'conditional';

export type VerificationMethod = 
  | 'documentation'
  | 'interview'
  | 'observation'
  | 'testing'
  | 'automated';

export type VerificationFrequency = 
  | 'once'
  | 'annual'
  | 'quarterly'
  | 'monthly'
  | 'continuous';

export type ChangeType = 
  | 'added'
  | 'modified'
  | 'deprecated'
  | 'removed'
  | 'clarified';

export type ChangeImpactLevel = 
  | 'breaking'
  | 'significant'
  | 'minor'
  | 'cosmetic';

// ============================================
// 2026-SPECIFIC ENUMS
// ============================================

export type AIRiskLevel = 
  | 'unacceptable'
  | 'high'
  | 'limited'
  | 'minimal';

export type PostQuantumAlgorithm = 
  | 'ML-KEM'      // CRYSTALS-Kyber
  | 'ML-DSA'      // CRYSTALS-Dilithium  
  | 'SLH-DSA'     // SPHINCS+
  | 'BIKE'
  | 'HQC';

export type ZeroTrustPillar = 
  | 'identity'
  | 'device'
  | 'network'
  | 'application'
  | 'data';

// ============================================
// CORE INTERFACES
// ============================================

/**
 * Master Requirement Library - Top Level
 */
export interface MasterRequirementLibrary {
  library_version: string;
  last_updated: string; // ISO 8601
  frameworks: Framework[];
}

/**
 * Regulatory Framework
 */
export interface Framework {
  framework_id: string;           // e.g., 'iso_27001', 'hipaa_security'
  name: string;
  authority: string;              // e.g., 'ISO', 'HHS', 'EU Parliament'
  jurisdiction: string[];         // e.g., ['US'], ['EU'], ['GLOBAL']
  category: FrameworkCategory;
  versions: FrameworkVersion[];
}

/**
 * Framework Version - A specific release of a framework
 */
export interface FrameworkVersion {
  version_id: string;             // e.g., '2022', '2025_update'
  full_version_key: string;       // e.g., 'iso_27001_2022'
  effective_date: string;         // ISO 8601 date
  sunset_date: string | null;
  status: FrameworkVersionStatus;
  source_url: string;
  change_summary: string;
  breaking_changes: boolean;
  requirements: Requirement[];
}

/**
 * Individual Requirement within a Framework
 */
export interface Requirement {
  requirement_id: string;         // e.g., 'A.5.1', '164.312(a)(1)'
  parent_id: string | null;
  title: string;
  description: string;
  guidance: string;
  category: string;
  subcategory: string;
  keywords: string[];
  implementation_level: ImplementationLevel;
  verification_method: VerificationMethod[];
  evidence_types: string[];
  frequency: VerificationFrequency;
  risk_weight: number;            // 1-10
  tags: RequirementTags;
  change_history: ChangeRecord[];
}

/**
 * 2026-Specific Requirement Tags
 */
export interface RequirementTags {
  // AI Transparency (EU AI Act)
  ai_transparency?: boolean;
  ai_bias?: boolean;
  ai_risk_level?: AIRiskLevel;
  
  // Quantum Readiness
  quantum_readiness?: boolean;
  pqc_algorithm?: PostQuantumAlgorithm[];
  
  // Zero Trust
  zero_trust?: boolean;
  zero_trust_pillar?: ZeroTrustPillar[];
  continuous_verification?: boolean;
  
  // Data Governance
  data_residency?: string[];
  supply_chain?: boolean;
  third_party_risk?: boolean;
}

/**
 * Requirement Change Record
 */
export interface ChangeRecord {
  change_date: string;
  change_type: ChangeType;
  previous_version?: string;
  description: string;
  impact_level: ChangeImpactLevel;
  affected_controls?: string[];
}

// ============================================
// AI REGULATORY CHANGE DETECTION
// ============================================

/**
 * Regulatory Change Log - Output from AI Scanner
 */
export interface RegulatoryChangeLog {
  scan_id: string;
  scan_timestamp: string;
  source: string;
  framework_id: string;
  changes: DetectedChange[];
}

/**
 * Individual Detected Change
 */
export interface DetectedChange {
  change_id: string;
  change_type: ChangeType;
  impact_level: ChangeImpactLevel;
  
  // What changed
  requirement_id: string | null;    // null if new requirement
  previous_text: string | null;
  new_text: string;
  
  // Analysis
  summary: string;
  affected_keywords: string[];
  potentially_affected_controls: string[];
  
  // Source
  source_url: string;
  source_document: string;
  effective_date: string | null;
  
  // AI Confidence
  confidence_score: number;         // 0-100
  requires_human_review: boolean;
}

// ============================================
// FRAMEWORK COMPARISON
// ============================================

/**
 * Version Comparison Result
 */
export interface VersionComparison {
  framework_id: string;
  old_version: string;
  new_version: string;
  comparison_date: string;
  
  // Changes
  added_requirements: RequirementDiff[];
  modified_requirements: RequirementDiff[];
  removed_requirements: RequirementDiff[];
  
  // Impact Summary
  breaking_changes_count: number;
  controls_requiring_update: string[];
  overall_impact: ChangeImpactLevel;
}

/**
 * Requirement Difference
 */
export interface RequirementDiff {
  requirement_id: string;
  title: string;
  
  // For modified requirements
  old_value?: Partial<Requirement>;
  new_value?: Partial<Requirement>;
  
  // Analysis
  change_summary: string;
  impact_level: ChangeImpactLevel;
  affected_controls: string[];
  
  // 2026-specific flags
  introduces_ai_requirement?: boolean;
  introduces_quantum_requirement?: boolean;
  introduces_zero_trust_requirement?: boolean;
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Framework Version Key - Used for references
 */
export type FrameworkVersionKey = `${string}_${string}`;

/**
 * Requirement Full Reference
 */
export interface RequirementFullRef {
  framework_version_key: FrameworkVersionKey;
  requirement_id: string;
}

/**
 * Framework Filter Options
 */
export interface FrameworkFilter {
  categories?: FrameworkCategory[];
  jurisdictions?: string[];
  status?: FrameworkVersionStatus[];
  tags?: Partial<RequirementTags>;
  search?: string;
}
