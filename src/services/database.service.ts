/**
 * ============================================================================
 * SUPABASE DATABASE SERVICE
 * ============================================================================
 * 
 * Handles all database operations for the Compliance Engine.
 * Provides sync between local state and Supabase cloud database.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  ControlResponseRow,
  EvidenceRecordRow,
  CustomControlRow,
  FrameworkMappingRow,
  Organization,
  Profile,
} from '../lib/database.types';

// ============================================================================
// TYPES
// ============================================================================

export interface ControlResponse {
  controlId: string;
  answer: 'yes' | 'no' | 'partial' | 'na' | null;
  evidenceId: string | null;
  remediationPlan: string;
  answeredAt: string;
}

export interface EvidenceRecord {
  id: string;
  controlId: string;
  notes: string;
  status: 'draft' | 'review' | 'final';
  fileUrls: string[];
  createdAt: string;
}

export interface CustomControl {
  id: string;
  title: string;
  description: string;
  question: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  frameworkMappings: Array<{
    frameworkId: string;
    clauseId: string;
    clauseTitle: string;
  }>;
  createdAt: string;
}

export interface SyncResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// DATABASE SERVICE CLASS
// ============================================================================

class DatabaseService {
  private organizationId: string | null = null;
  private userId: string | null = null;

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  /**
   * Check if Supabase is configured and available
   */
  isAvailable(): boolean {
    return isSupabaseConfigured();
  }

  /**
   * Set the current organization context
   */
  setOrganization(orgId: string): void {
    this.organizationId = orgId;
  }

  /**
   * Set the current user context
   */
  setUser(userId: string): void {
    this.userId = userId;
  }

  /**
   * Get current organization ID
   */
  getOrganizationId(): string | null {
    return this.organizationId;
  }

  // ---------------------------------------------------------------------------
  // ORGANIZATION OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Create a new organization
   */
  async createOrganization(name: string, slug: string): Promise<SyncResult<Organization>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    const { data, error } = await supabase
      .from('organizations')
      .insert({ name, slug })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    
    this.organizationId = data.id;
    return { success: true, data };
  }

  /**
   * Get organization by ID
   */
  async getOrganization(orgId: string): Promise<SyncResult<Organization>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }

  // ---------------------------------------------------------------------------
  // CONTROL RESPONSE OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Save a control response to the database
   */
  async saveControlResponse(response: ControlResponse): Promise<SyncResult<ControlResponseRow>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    if (!this.organizationId) return { success: false, error: 'Organization not set' };

    const { data, error } = await supabase
      .from('control_responses')
      .upsert({
        organization_id: this.organizationId,
        control_id: response.controlId,
        answer: response.answer,
        evidence_id: response.evidenceId,
        remediation_plan: response.remediationPlan,
        answered_at: response.answeredAt,
        answered_by: this.userId,
      }, {
        onConflict: 'organization_id,control_id'
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }

  /**
   * Get all control responses for the current organization
   */
  async getControlResponses(): Promise<SyncResult<ControlResponseRow[]>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    if (!this.organizationId) return { success: false, error: 'Organization not set' };

    const { data, error } = await supabase
      .from('control_responses')
      .select('*')
      .eq('organization_id', this.organizationId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  }

  /**
   * Delete a control response
   */
  async deleteControlResponse(controlId: string): Promise<SyncResult<void>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    if (!this.organizationId) return { success: false, error: 'Organization not set' };

    const { error } = await supabase
      .from('control_responses')
      .delete()
      .eq('organization_id', this.organizationId)
      .eq('control_id', controlId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  /**
   * Bulk save control responses
   */
  async bulkSaveControlResponses(responses: ControlResponse[]): Promise<SyncResult<number>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    if (!this.organizationId) return { success: false, error: 'Organization not set' };

    const records = responses.map(r => ({
      organization_id: this.organizationId!,
      control_id: r.controlId,
      answer: r.answer,
      evidence_id: r.evidenceId,
      remediation_plan: r.remediationPlan,
      answered_at: r.answeredAt,
      answered_by: this.userId,
    }));

    const { error } = await supabase
      .from('control_responses')
      .upsert(records, {
        onConflict: 'organization_id,control_id'
      });

    if (error) return { success: false, error: error.message };
    return { success: true, data: records.length };
  }

  // ---------------------------------------------------------------------------
  // EVIDENCE OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Save an evidence record
   */
  async saveEvidence(evidence: EvidenceRecord): Promise<SyncResult<EvidenceRecordRow>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    if (!this.organizationId) return { success: false, error: 'Organization not set' };

    const { data, error } = await supabase
      .from('evidence_records')
      .upsert({
        id: evidence.id,
        organization_id: this.organizationId,
        control_id: evidence.controlId,
        notes: evidence.notes,
        status: evidence.status,
        file_urls: evidence.fileUrls,
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }

  /**
   * Get all evidence records for the current organization
   */
  async getEvidenceRecords(): Promise<SyncResult<EvidenceRecordRow[]>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    if (!this.organizationId) return { success: false, error: 'Organization not set' };

    const { data, error } = await supabase
      .from('evidence_records')
      .select('*')
      .eq('organization_id', this.organizationId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  }

  /**
   * Update evidence status
   */
  async updateEvidenceStatus(
    evidenceId: string, 
    status: 'draft' | 'review' | 'final'
  ): Promise<SyncResult<void>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    const { error } = await supabase
      .from('evidence_records')
      .update({ status })
      .eq('id', evidenceId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // CUSTOM CONTROL OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Save a custom control
   */
  async saveCustomControl(control: CustomControl): Promise<SyncResult<CustomControlRow>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    if (!this.organizationId) return { success: false, error: 'Organization not set' };

    // First, save the control
    const { data, error } = await supabase
      .from('custom_controls')
      .upsert({
        id: control.id,
        organization_id: this.organizationId,
        title: control.title,
        description: control.description,
        question: control.question,
        category: control.category,
        risk_level: control.riskLevel,
        created_by: this.userId,
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Then, save framework mappings
    if (control.frameworkMappings.length > 0) {
      const mappings = control.frameworkMappings.map(m => ({
        custom_control_id: control.id,
        framework_id: m.frameworkId as 'SOC2' | 'ISO27001' | 'HIPAA' | 'NIST',
        clause_id: m.clauseId,
        clause_title: m.clauseTitle,
      }));

      // Delete existing mappings first
      await supabase
        .from('framework_mappings')
        .delete()
        .eq('custom_control_id', control.id);

      // Insert new mappings
      await supabase
        .from('framework_mappings')
        .insert(mappings);
    }

    return { success: true, data };
  }

  /**
   * Get all custom controls for the current organization
   */
  async getCustomControls(): Promise<SyncResult<CustomControlRow[]>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    if (!this.organizationId) return { success: false, error: 'Organization not set' };

    const { data, error } = await supabase
      .from('custom_controls')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('is_active', true);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  }

  /**
   * Delete a custom control (soft delete)
   */
  async deleteCustomControl(controlId: string): Promise<SyncResult<void>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    const { error } = await supabase
      .from('custom_controls')
      .update({ is_active: false })
      .eq('id', controlId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  /**
   * Get framework mappings for a custom control
   */
  async getFrameworkMappings(controlId: string): Promise<SyncResult<FrameworkMappingRow[]>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    const { data, error } = await supabase
      .from('framework_mappings')
      .select('*')
      .eq('custom_control_id', controlId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  }

  // ---------------------------------------------------------------------------
  // SYNC OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Sync all local data to Supabase
   */
  async syncToCloud(localData: {
    responses: ControlResponse[];
    evidence: EvidenceRecord[];
    customControls: CustomControl[];
  }): Promise<SyncResult<{ responses: number; evidence: number; controls: number }>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    if (!this.organizationId) return { success: false, error: 'Organization not set' };

    try {
      // Sync responses
      const responsesResult = await this.bulkSaveControlResponses(localData.responses);
      if (!responsesResult.success) throw new Error(responsesResult.error);

      // Sync evidence
      let evidenceCount = 0;
      for (const ev of localData.evidence) {
        const result = await this.saveEvidence(ev);
        if (result.success) evidenceCount++;
      }

      // Sync custom controls
      let controlCount = 0;
      for (const ctrl of localData.customControls) {
        const result = await this.saveCustomControl(ctrl);
        if (result.success) controlCount++;
      }

      return {
        success: true,
        data: {
          responses: responsesResult.data || 0,
          evidence: evidenceCount,
          controls: controlCount,
        }
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Sync failed' };
    }
  }

  /**
   * Load all data from Supabase
   */
  async loadFromCloud(): Promise<SyncResult<{
    responses: ControlResponseRow[];
    evidence: EvidenceRecordRow[];
    customControls: CustomControlRow[];
  }>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    if (!this.organizationId) return { success: false, error: 'Organization not set' };

    try {
      const [responsesResult, evidenceResult, controlsResult] = await Promise.all([
        this.getControlResponses(),
        this.getEvidenceRecords(),
        this.getCustomControls(),
      ]);

      if (!responsesResult.success) throw new Error(responsesResult.error);
      if (!evidenceResult.success) throw new Error(evidenceResult.error);
      if (!controlsResult.success) throw new Error(controlsResult.error);

      return {
        success: true,
        data: {
          responses: responsesResult.data!,
          evidence: evidenceResult.data!,
          customControls: controlsResult.data!,
        }
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Load failed' };
    }
  }

  // ---------------------------------------------------------------------------
  // AUDIT LOG
  // ---------------------------------------------------------------------------

  /**
   * Log an action for audit purposes
   */
  async logAction(
    action: string,
    entityType: string,
    entityId?: string,
    oldValue?: unknown,
    newValue?: unknown
  ): Promise<void> {
    if (!supabase || !this.organizationId) return;

    await supabase.from('audit_log').insert({
      organization_id: this.organizationId,
      user_id: this.userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue as any,
      new_value: newValue as any,
    });
  }

  // ---------------------------------------------------------------------------
  // USER PROFILE OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<SyncResult<Profile>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<Profile>): Promise<SyncResult<Profile>> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const db = new DatabaseService();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert database row to local format
 */
export function rowToControlResponse(row: ControlResponseRow): ControlResponse {
  return {
    controlId: row.control_id,
    answer: row.answer,
    evidenceId: row.evidence_id,
    remediationPlan: row.remediation_plan,
    answeredAt: row.answered_at,
  };
}

/**
 * Convert database row to local evidence format
 */
export function rowToEvidenceRecord(row: EvidenceRecordRow): EvidenceRecord {
  return {
    id: row.id,
    controlId: row.control_id,
    notes: row.notes,
    status: row.status,
    fileUrls: row.file_urls,
    createdAt: row.created_at,
  };
}

/**
 * Convert database row to local custom control format
 */
export function rowToCustomControl(
  row: CustomControlRow, 
  mappings: FrameworkMappingRow[] = []
): CustomControl {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    question: row.question,
    category: row.category,
    riskLevel: row.risk_level,
    frameworkMappings: mappings.map(m => ({
      frameworkId: m.framework_id,
      clauseId: m.clause_id,
      clauseTitle: m.clause_title,
    })),
    createdAt: row.created_at,
  };
}
