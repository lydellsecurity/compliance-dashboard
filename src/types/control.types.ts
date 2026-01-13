/**
 * Control Types - Internal Controls Layer
 * 
 * Represents the company's actions and implementations
 * These are mutable and updated by the organization
 */

import type { PostQuantumAlgorithm } from './framework.types';

// ============================================
// CONTROL ENUMS
// ============================================

export type ControlCategory =
  | 'access_control'
  | 'authentication'
  | 'encryption'
  | 'monitoring'
  | 'incident_response'
  | 'business_continuity'
  | 'change_management'
  | 'asset_management'
  | 'vendor_management'
  | 'physical_security'
  | 'data_protection'
  | 'ai_governance'
  | 'network_security'
  | 'application_security'
  | 'hr_security'
  | 'compliance'
  | 'risk_management';

export type ControlStatus =
  | 'not_started'
  | 'in_progress'
  | 'implemented'
  | 'verified'
  | 'needs_review'
  | 'deprecated';

export type AutomationLevel =
  | 'manual'
  | 'semi_automated'
  | 'fully_automated';

export type EvidenceType =
  | 'policy'
  | 'procedure'
  | 'screenshot'
  | 'log'
  | 'configuration'
  | 'audit_report'
  | 'attestation'
  | 'training_record'
  | 'contract'
  | 'api_response'
  | 'scan_result';

export type EvidenceCollector =
  | 'manual'
  | 'automated'
  | 'third_party';

export type EvidenceVerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'expired';

export type ControlTestResult =
  | 'pass'
  | 'fail'
  | 'partial'
  | 'not_tested';

export type IdentityVerificationMethod =
  | 'mfa'
  | 'passwordless'
  | 'biometric'
  | 'certificate'
  | 'behavioral'
  | 'device_posture'
  | 'location_context';

// Use VerificationFrequency from framework.types.ts
import type { VerificationFrequency } from './framework.types';
export type { VerificationFrequency };

export type RiskAcceptance =
  | 'accepted'
  | 'mitigated'
  | 'transferred';

// ============================================
// CORE INTERFACES
// ============================================

/**
 * Master Control Library - Top Level
 */
export interface MasterControlLibrary {
  library_version: string;
  organization_id: string;
  last_updated: string;
  controls: Control[];
}

/**
 * Internal Control
 */
export interface Control {
  control_id: string;              // e.g., 'CTRL-0001'
  title: string;
  description: string;
  category: ControlCategory;
  subcategory?: string;
  
  // Ownership
  owner: ControlOwner;
  
  // Status
  status: ControlStatus;
  implementation_date: string | null;
  last_verified: string | null;
  verification_frequency: VerificationFrequency;
  
  // Automation
  automation_level: AutomationLevel;
  automation_tool?: string;
  
  // Evidence & Implementation
  evidence: Evidence[];
  implementation_details: ImplementationDetails;
  
  // Metrics
  effectiveness_metrics: EffectivenessMetrics;
  
  // Relationships
  related_controls: string[];
  
  // Tags
  tags: ControlTags;
  
  // Version History
  version_history: ControlVersion[];
}

/**
 * Control Owner
 */
export interface ControlOwner {
  primary: string;                 // Email or user ID
  secondary?: string;
  department: string;
  escalation_path: string[];
}

/**
 * Evidence Record
 */
export interface Evidence {
  evidence_id: string;
  type: EvidenceType;
  description: string;
  file_path?: string;
  collected_date: string;
  expires_date: string | null;
  collector: EvidenceCollector;
  verification_status: EvidenceVerificationStatus;
  
  // For automated evidence
  source_system?: string;
  api_endpoint?: string;
  last_refresh?: string;
}

/**
 * Implementation Details
 */
export interface ImplementationDetails {
  procedure_document?: string;
  technical_configuration?: string;
  testing_procedure?: string;
  exceptions: ControlException[];
  compensating_controls: string[];
}

/**
 * Control Exception
 */
export interface ControlException {
  exception_id: string;
  description: string;
  justification: string;
  approved_by: string;
  approved_date: string;
  expiration_date: string;
  risk_acceptance: RiskAcceptance;
}

/**
 * Effectiveness Metrics
 */
export interface EffectivenessMetrics {
  last_test_date?: string;
  test_result: ControlTestResult;
  coverage_percentage: number;
  incidents_prevented?: number;
  false_positive_rate?: number;
  mean_time_to_detect?: string;    // ISO 8601 duration
  mean_time_to_respond?: string;
}

/**
 * 2026-Specific Control Tags
 */
export interface ControlTags {
  // AI Governance
  ai_model_governance?: boolean;
  training_data_lineage?: boolean;
  bias_detection?: boolean;
  explainability?: boolean;
  
  // Quantum Readiness
  quantum_resistant?: boolean;
  pqc_algorithms_used?: PostQuantumAlgorithm[];
  crypto_agile?: boolean;
  
  // Zero Trust
  zero_trust_enabled?: boolean;
  continuous_verification?: boolean;
  identity_verification_method?: IdentityVerificationMethod[];
  device_trust_signals?: string[];
}

/**
 * Control Version History
 */
export interface ControlVersion {
  version: string;
  changed_date: string;
  changed_by: string;
  change_reason: string;
  previous_state?: Partial<Control>;
  triggered_by_requirement?: string;
}

// ============================================
// CONTROL MANAGEMENT
// ============================================

/**
 * Control Creation Request
 */
export interface CreateControlRequest {
  title: string;
  description: string;
  category: ControlCategory;
  subcategory?: string;
  owner: ControlOwner;
  automation_level: AutomationLevel;
  automation_tool?: string;
  verification_frequency: VerificationFrequency;
  tags?: Partial<ControlTags>;
  
  // Optional initial mapping
  map_to_requirements?: string[];   // Requirement full refs
}

/**
 * Control Update Request
 */
export interface UpdateControlRequest {
  control_id: string;
  updates: Partial<Omit<Control, 'control_id' | 'version_history'>>;
  change_reason: string;
  triggered_by_requirement?: string;
}

/**
 * Control Filter Options
 */
export interface ControlFilter {
  categories?: ControlCategory[];
  status?: ControlStatus[];
  automation_level?: AutomationLevel[];
  owner_department?: string[];
  tags?: Partial<ControlTags>;
  has_gaps?: boolean;
  needs_evidence?: boolean;
  search?: string;
}

/**
 * Control with Compliance Context
 */
export interface ControlWithContext extends Control {
  mapped_requirements: MappedRequirement[];
  compliance_score: number;
  gaps: ControlGap[];
  drift_alerts: number;
}

/**
 * Mapped Requirement Reference
 */
export interface MappedRequirement {
  framework_version_key: string;
  requirement_id: string;
  requirement_title: string;
  contribution_weight: number;
  coverage_aspects: string[];
}

/**
 * Control Gap
 */
export interface ControlGap {
  requirement_ref: string;
  gap_description: string;
  missing_aspects: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}
