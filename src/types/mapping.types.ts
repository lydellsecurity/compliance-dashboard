/**
 * Mapping Types - Crosswalk Layer
 * 
 * N:N relationships between Requirements and Controls
 * Includes compliance drift detection
 */

import type { FrameworkVersionKey, RequirementFullRef } from './framework.types';

// ============================================
// MAPPING ENUMS
// ============================================

export type ComplianceStatus =
  | 'compliant'
  | 'partial'
  | 'non_compliant'
  | 'not_applicable'
  | 'pending_review'
  | 'drift_detected';

export type DriftType =
  | 'requirement_updated'
  | 'requirement_added'
  | 'requirement_removed'
  | 'control_degraded'
  | 'evidence_expired'
  | 'coverage_insufficient';

export type DriftResolutionStatus =
  | 'unacknowledged'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'accepted_risk';

export type GapPriority =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

export type EffortEstimate =
  | 'hours'
  | 'days'
  | 'weeks'
  | 'months';

export type RecommendedActionType =
  | 'create_control'
  | 'update_control'
  | 'add_evidence'
  | 'update_procedure'
  | 'implement_tool'
  | 'conduct_training';

// ============================================
// CORE INTERFACES
// ============================================

/**
 * Crosswalk Mapping Document - Top Level
 */
export interface CrosswalkMapping {
  crosswalk_version: string;
  last_computed: string;
  organization_id: string;
  active_frameworks: FrameworkVersionKey[];
  mappings: Mapping[];
  summary: CrosswalkSummary;
}

/**
 * Individual Mapping - Requirement to Controls
 */
export interface Mapping {
  mapping_id: string;
  
  // What requirement
  requirement_ref: RequirementReference;
  
  // What controls satisfy it
  control_refs: ControlReference[];
  
  // Coverage analysis
  coverage_score: number;           // 0-100
  coverage_justification: string;
  
  // Gap analysis
  gap_analysis: GapAnalysis;
  
  // Status
  compliance_status: ComplianceStatus;
  drift_status: DriftStatus | null;
  
  // Audit trail
  last_reviewed: string;
  reviewed_by: string;
  notes?: string;
}

/**
 * Requirement Reference in Mapping
 */
export interface RequirementReference {
  framework_version_key: FrameworkVersionKey;
  requirement_id: string;
  requirement_title: string;
  cached_description?: string;
}

/**
 * Control Reference in Mapping
 */
export interface ControlReference {
  control_id: string;
  control_title: string;
  contribution_weight: number;      // 0-100
  coverage_aspects: string[];
  control_status: string;
  evidence_sufficient: boolean;
}

/**
 * Gap Analysis
 */
export interface GapAnalysis {
  has_gap: boolean;
  gap_description?: string;
  missing_aspects: string[];
  recommended_actions: RecommendedAction[];
  priority: GapPriority;
  estimated_effort: EffortEstimate;
  due_date: string | null;
}

/**
 * Recommended Action to Close Gap
 */
export interface RecommendedAction {
  action_type: RecommendedActionType;
  description: string;
  suggested_control_id?: string;
  template_available: boolean;
}

/**
 * Drift Status - Compliance Drift Detection
 */
export interface DriftStatus {
  drift_detected: boolean;
  drift_detected_date: string | null;
  drift_type: DriftType;
  
  // Version tracking
  previous_requirement_version: string;
  new_requirement_version: string;
  
  // Impact
  breaking_change: boolean;
  change_summary: string;
  affected_controls: string[];
  
  // Resolution
  resolution_status: DriftResolutionStatus;
  resolution_deadline: string | null;
  resolution_notes?: string;
}

/**
 * Crosswalk Summary - Aggregate Metrics
 */
export interface CrosswalkSummary {
  // Counts
  total_requirements: number;
  total_controls: number;
  
  // Status breakdown
  compliant_count: number;
  partial_count: number;
  non_compliant_count: number;
  not_applicable_count: number;
  drift_detected_count: number;
  
  // Scores
  overall_compliance_score: number;
  framework_scores: Record<string, number>;
  category_scores: Record<string, number>;
  
  // Gaps
  critical_gaps: number;
  high_gaps: number;
  controls_needing_update: string[];
}

// ============================================
// DRIFT NOTIFICATION TYPES
// ============================================

/**
 * Drift Notification
 */
export interface DriftNotification {
  notification_id: string;
  created_at: string;
  
  // What drifted
  mapping_id: string;
  requirement_ref: RequirementFullRef;
  drift_type: DriftType;
  
  // Severity
  severity: 'critical' | 'high' | 'medium' | 'low';
  breaking_change: boolean;
  
  // Context
  title: string;
  summary: string;
  change_details: string;
  
  // Affected items
  affected_controls: AffectedControl[];
  
  // Actions
  recommended_actions: RecommendedAction[];
  deadline: string | null;
  
  // Status
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolution_status: DriftResolutionStatus;
}

/**
 * Affected Control in Drift Notification
 */
export interface AffectedControl {
  control_id: string;
  control_title: string;
  current_coverage: number;
  required_changes: string[];
  evidence_gaps: string[];
}

// ============================================
// MAPPING OPERATIONS
// ============================================

/**
 * Create Mapping Request
 */
export interface CreateMappingRequest {
  requirement_ref: RequirementFullRef;
  control_ids: string[];
  coverage_justification: string;
  notes?: string;
}

/**
 * Update Mapping Request
 */
export interface UpdateMappingRequest {
  mapping_id: string;
  control_ids?: string[];
  coverage_justification?: string;
  compliance_status?: ComplianceStatus;
  notes?: string;
}

/**
 * Bulk Mapping Operation
 */
export interface BulkMappingOperation {
  operation: 'add' | 'remove' | 'update';
  mappings: CreateMappingRequest[] | UpdateMappingRequest[];
}

/**
 * Mapping Filter
 */
export interface MappingFilter {
  framework_version_keys?: FrameworkVersionKey[];
  compliance_status?: ComplianceStatus[];
  has_drift?: boolean;
  has_gaps?: boolean;
  gap_priority?: GapPriority[];
  control_ids?: string[];
  search?: string;
}

// ============================================
// COMPARISON & PREVIEW
// ============================================

/**
 * Requirement Version Comparison for UI Preview
 */
export interface RequirementVersionPreview {
  requirement_id: string;
  framework_id: string;
  
  // Current version
  current: {
    version_key: string;
    title: string;
    description: string;
    guidance: string;
    keywords: string[];
  };
  
  // New version
  new: {
    version_key: string;
    title: string;
    description: string;
    guidance: string;
    keywords: string[];
  };
  
  // Diff analysis
  diff: {
    title_changed: boolean;
    description_diff: DiffSegment[];
    guidance_diff: DiffSegment[];
    keywords_added: string[];
    keywords_removed: string[];
  };
  
  // Impact
  breaking_change: boolean;
  impact_summary: string;
  affected_controls: string[];
}

/**
 * Diff Segment for Text Comparison
 */
export interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed' | 'modified';
  text: string;
  old_text?: string;
}

/**
 * Framework Update Preview
 */
export interface FrameworkUpdatePreview {
  framework_id: string;
  current_version: string;
  new_version: string;
  
  // Summary
  total_changes: number;
  breaking_changes: number;
  
  // Changes by type
  requirements_added: number;
  requirements_modified: number;
  requirements_removed: number;
  
  // Detailed previews
  requirement_previews: RequirementVersionPreview[];
  
  // Impact
  controls_affected: string[];
  estimated_remediation_effort: EffortEstimate;
  
  // Approval
  can_auto_approve: boolean;
  requires_review: string[];
}
