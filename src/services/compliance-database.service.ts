/**
 * ============================================================================
 * COMPLIANCE DATABASE SERVICE
 * ============================================================================
 * 
 * Comprehensive Supabase integration for the Modular Compliance Engine.
 * Features:
 * - Optimistic updates for instant UI feedback
 * - Background sync to database
 * - Multi-tenancy support via organization_id
 * - Evidence file uploads
 * - Audit logging
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface MasterControl {
  id: string;
  title: string;
  description: string;
  question: string;
  domain: string;
  domain_title: string;
  domain_color: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high' | 'critical';
  guidance: string;
  remediation_tip: string;
  evidence_examples: string[];
  keywords: string[];
  is_active: boolean;
  display_order: number;
}

export interface FrameworkRequirement {
  id: string;
  framework_id: 'SOC2' | 'ISO27001' | 'HIPAA' | 'NIST';
  clause_id: string;
  clause_title: string;
  clause_description: string;
  section: string;
  category: string;
}

export interface ControlMapping {
  id: string;
  control_id: string;
  framework_id: string;
  clause_id: string;
  mapping_strength: 'direct' | 'partial' | 'supportive';
}

export interface UserResponse {
  id?: string;
  organization_id: string;
  user_id: string;
  control_id: string;
  answer: 'yes' | 'no' | 'partial' | 'na' | null;
  evidence_note: string;
  file_url: string | null;
  file_name: string | null;
  remediation_plan: string;
  target_date: string | null;
  status: 'pending' | 'in_progress' | 'complete' | 'deferred';
  answered_at: string;
}

export interface EvidenceRecord {
  id?: string;
  evidence_id: string;
  organization_id: string;
  control_id: string;
  response_id?: string;
  title: string;
  description?: string;
  notes: string;
  status: 'draft' | 'review' | 'approved' | 'rejected' | 'expired';
  file_urls: string[];
  file_metadata: Array<{ name: string; size: number; type: string; uploaded_at: string }>;
  created_by: string;
  created_at: string;
}

export interface CustomControl {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  question: string;
  domain: string;
  domain_title: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  guidance?: string;
  evidence_examples: string[];
  is_active: boolean;
  created_by: string;
  framework_mappings?: Array<{
    framework_id: string;
    clause_id: string;
    clause_title: string;
  }>;
}

export interface ComplianceStats {
  total_controls: number;
  answered_controls: number;
  compliant_controls: number;
  gap_controls: number;
  partial_controls: number;
  na_controls: number;
  compliance_percentage: number;
}

export interface FrameworkStats {
  framework_id: string;
  total_requirements: number;
  met_requirements: number;
  compliance_percentage: number;
}

export interface SyncCallback {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// ============================================================================
// COMPLIANCE DATABASE SERVICE
// ============================================================================

class ComplianceDatabaseService {
  private organizationId: string | null = null;
  private userId: string | null = null;
  private pendingSyncs: Map<string, Promise<any>> = new Map();

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  isAvailable(): boolean {
    return isSupabaseConfigured();
  }

  setContext(organizationId: string, userId: string): void {
    this.organizationId = organizationId;
    this.userId = userId;
  }

  getOrganizationId(): string | null {
    return this.organizationId;
  }

  getUserId(): string | null {
    return this.userId;
  }

  // ---------------------------------------------------------------------------
  // MASTER CONTROLS (Read-only reference data)
  // ---------------------------------------------------------------------------

  async getMasterControls(): Promise<MasterControl[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('master_controls')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching master controls:', error);
      return [];
    }

    return data || [];
  }

  async getMasterControlsByDomain(domain: string): Promise<MasterControl[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('master_controls')
      .select('*')
      .eq('domain', domain)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching controls by domain:', error);
      return [];
    }

    return data || [];
  }

  // ---------------------------------------------------------------------------
  // FRAMEWORK REQUIREMENTS
  // ---------------------------------------------------------------------------

  async getFrameworkRequirements(frameworkId?: string): Promise<FrameworkRequirement[]> {
    if (!supabase) return [];

    let query = supabase
      .from('framework_requirements')
      .select('*')
      .eq('is_active', true);

    if (frameworkId) {
      query = query.eq('framework_id', frameworkId);
    }

    const { data, error } = await query.order('clause_id', { ascending: true });

    if (error) {
      console.error('Error fetching framework requirements:', error);
      return [];
    }

    return data || [];
  }

  // ---------------------------------------------------------------------------
  // CONTROL MAPPINGS
  // ---------------------------------------------------------------------------

  async getControlMappings(controlId?: string): Promise<ControlMapping[]> {
    if (!supabase) return [];

    let query = supabase.from('control_mappings').select('*');

    if (controlId) {
      query = query.eq('control_id', controlId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching control mappings:', error);
      return [];
    }

    return data || [];
  }

  async getMappingsForFramework(frameworkId: string): Promise<ControlMapping[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('control_mappings')
      .select('*')
      .eq('framework_id', frameworkId);

    if (error) {
      console.error('Error fetching mappings for framework:', error);
      return [];
    }

    return data || [];
  }

  // ---------------------------------------------------------------------------
  // USER RESPONSES (With Optimistic Updates)
  // ---------------------------------------------------------------------------

  async getUserResponses(): Promise<UserResponse[]> {
    if (!supabase || !this.organizationId) return [];

    const { data, error } = await supabase
      .from('user_responses')
      .select('*')
      .eq('organization_id', this.organizationId);

    if (error) {
      console.error('Error fetching user responses:', error);
      return [];
    }

    return data || [];
  }

  async getResponseForControl(controlId: string): Promise<UserResponse | null> {
    if (!supabase || !this.organizationId) return null;

    const { data, error } = await supabase
      .from('user_responses')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('control_id', controlId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching response:', error);
    }

    return data || null;
  }

  /**
   * Save user response with optimistic update pattern
   * Returns immediately for UI update, syncs in background
   */
  async saveUserResponse(
    response: Partial<UserResponse>,
    callbacks?: SyncCallback
  ): Promise<UserResponse | null> {
    if (!supabase || !this.organizationId || !this.userId) {
      callbacks?.onError?.('Not configured');
      return null;
    }

    const fullResponse: UserResponse = {
      organization_id: this.organizationId,
      user_id: this.userId,
      control_id: response.control_id!,
      answer: response.answer || null,
      evidence_note: response.evidence_note || '',
      file_url: response.file_url || null,
      file_name: response.file_name || null,
      remediation_plan: response.remediation_plan || '',
      target_date: response.target_date || null,
      status: response.status || 'pending',
      answered_at: new Date().toISOString(),
    };

    // Background sync
    const syncKey = `response-${response.control_id}`;
    const syncPromise = this.syncResponseToDatabase(fullResponse, callbacks);
    this.pendingSyncs.set(syncKey, syncPromise);

    // Return immediately for optimistic update
    return fullResponse;
  }

  private async syncResponseToDatabase(
    response: UserResponse,
    callbacks?: SyncCallback
  ): Promise<void> {
    try {
      const { error } = await supabase!
        .from('user_responses')
        .upsert({
          organization_id: response.organization_id,
          user_id: response.user_id,
          control_id: response.control_id,
          answer: response.answer,
          evidence_note: response.evidence_note,
          file_url: response.file_url,
          file_name: response.file_name,
          remediation_plan: response.remediation_plan,
          target_date: response.target_date,
          status: response.status,
          answered_at: response.answered_at,
        }, {
          onConflict: 'organization_id,control_id'
        });

      if (error) throw error;

      // Log audit trail
      await this.logAudit('upsert', 'user_response', response.control_id, null, response);

      callbacks?.onSuccess?.();
    } catch (error) {
      console.error('Sync error:', error);
      callbacks?.onError?.(error instanceof Error ? error.message : 'Sync failed');
    }
  }

  /**
   * Bulk save responses (for initial data migration)
   */
  async bulkSaveResponses(responses: Partial<UserResponse>[]): Promise<number> {
    if (!supabase || !this.organizationId || !this.userId) return 0;

    const fullResponses = responses.map(r => ({
      organization_id: this.organizationId!,
      user_id: this.userId!,
      control_id: r.control_id!,
      answer: r.answer || null,
      evidence_note: r.evidence_note || '',
      file_url: r.file_url || null,
      file_name: r.file_name || null,
      remediation_plan: r.remediation_plan || '',
      target_date: r.target_date || null,
      status: r.status || 'pending',
      answered_at: r.answered_at || new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('user_responses')
      .upsert(fullResponses, {
        onConflict: 'organization_id,control_id'
      });

    if (error) {
      console.error('Bulk save error:', error);
      return 0;
    }

    return fullResponses.length;
  }

  // ---------------------------------------------------------------------------
  // EVIDENCE RECORDS
  // ---------------------------------------------------------------------------

  async getEvidenceRecords(): Promise<EvidenceRecord[]> {
    if (!supabase || !this.organizationId) return [];

    const { data, error } = await supabase
      .from('evidence_records')
      .select('*')
      .eq('organization_id', this.organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching evidence:', error);
      return [];
    }

    return data || [];
  }

  async getEvidenceForControl(controlId: string): Promise<EvidenceRecord[]> {
    if (!supabase || !this.organizationId) return [];

    const { data, error } = await supabase
      .from('evidence_records')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('control_id', controlId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching evidence for control:', error);
      return [];
    }

    return data || [];
  }

  async saveEvidenceRecord(evidence: Partial<EvidenceRecord>): Promise<EvidenceRecord | null> {
    if (!supabase || !this.organizationId || !this.userId) return null;

    const evidenceId = evidence.evidence_id || await this.generateEvidenceId();

    const record = {
      evidence_id: evidenceId,
      organization_id: this.organizationId,
      control_id: evidence.control_id,
      response_id: evidence.response_id,
      title: evidence.title || `Evidence for ${evidence.control_id}`,
      description: evidence.description,
      notes: evidence.notes || '',
      status: evidence.status || 'draft',
      file_urls: evidence.file_urls || [],
      file_metadata: evidence.file_metadata || [],
      created_by: this.userId,
    };

    const { data, error } = await supabase
      .from('evidence_records')
      .upsert(record, {
        onConflict: 'organization_id,evidence_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving evidence:', error);
      return null;
    }

    await this.logAudit('upsert', 'evidence_record', evidenceId, null, data);

    return data;
  }

  async updateEvidenceStatus(
    evidenceId: string,
    status: EvidenceRecord['status'],
    reviewNotes?: string
  ): Promise<boolean> {
    if (!supabase || !this.organizationId || !this.userId) return false;

    const updates: any = { status };
    
    if (status === 'approved') {
      updates.approved_by = this.userId;
      updates.approved_at = new Date().toISOString();
    }
    
    if (reviewNotes) {
      updates.review_notes = reviewNotes;
      updates.reviewed_by = this.userId;
      updates.reviewed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('evidence_records')
      .update(updates)
      .eq('organization_id', this.organizationId)
      .eq('evidence_id', evidenceId);

    if (error) {
      console.error('Error updating evidence status:', error);
      return false;
    }

    return true;
  }

  private async generateEvidenceId(): Promise<string> {
    if (!supabase) {
      return `EV-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    }

    const { data } = await supabase.rpc('generate_evidence_id');
    return data || `EV-${Date.now()}`;
  }

  // ---------------------------------------------------------------------------
  // FILE UPLOADS (Supabase Storage)
  // ---------------------------------------------------------------------------

  async uploadEvidenceFile(
    file: File,
    controlId: string
  ): Promise<{ url: string; path: string } | null> {
    if (!supabase || !this.organizationId) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${this.organizationId}/${controlId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('evidence-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('evidence-files')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath
    };
  }

  async deleteEvidenceFile(filePath: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase.storage
      .from('evidence-files')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // CUSTOM CONTROLS
  // ---------------------------------------------------------------------------

  async getCustomControls(): Promise<CustomControl[]> {
    if (!supabase || !this.organizationId) return [];

    const { data: controls, error } = await supabase
      .from('custom_controls')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching custom controls:', error);
      return [];
    }

    // Fetch mappings for each control
    const controlsWithMappings = await Promise.all(
      (controls || []).map(async (control) => {
        const { data: mappings } = await supabase
          .from('custom_control_mappings')
          .select('*')
          .eq('custom_control_id', control.id);

        return {
          ...control,
          framework_mappings: mappings || []
        };
      })
    );

    return controlsWithMappings;
  }

  async saveCustomControl(control: Partial<CustomControl>): Promise<CustomControl | null> {
    if (!supabase || !this.organizationId || !this.userId) return null;

    const controlId = control.id || await this.generateCustomControlId();

    const record = {
      id: controlId,
      organization_id: this.organizationId,
      title: control.title!,
      description: control.description!,
      question: control.question!,
      domain: control.domain || 'company_specific',
      domain_title: control.domain_title || 'Company Specific',
      risk_level: control.risk_level || 'medium',
      guidance: control.guidance,
      evidence_examples: control.evidence_examples || [],
      is_active: true,
      created_by: this.userId,
    };

    const { data, error } = await supabase
      .from('custom_controls')
      .upsert(record, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving custom control:', error);
      return null;
    }

    // Save framework mappings
    if (control.framework_mappings && control.framework_mappings.length > 0) {
      // Delete existing mappings
      await supabase
        .from('custom_control_mappings')
        .delete()
        .eq('custom_control_id', controlId);

      // Insert new mappings
      const mappings = control.framework_mappings.map(m => ({
        custom_control_id: controlId,
        framework_id: m.framework_id,
        clause_id: m.clause_id,
        clause_title: m.clause_title || '',
      }));

      await supabase
        .from('custom_control_mappings')
        .insert(mappings);
    }

    await this.logAudit('upsert', 'custom_control', controlId, null, data);

    return { ...data, framework_mappings: control.framework_mappings || [] };
  }

  async deleteCustomControl(controlId: string): Promise<boolean> {
    if (!supabase || !this.organizationId) return false;

    const { error } = await supabase
      .from('custom_controls')
      .update({ is_active: false })
      .eq('id', controlId)
      .eq('organization_id', this.organizationId);

    if (error) {
      console.error('Error deleting custom control:', error);
      return false;
    }

    await this.logAudit('delete', 'custom_control', controlId);

    return true;
  }

  private async generateCustomControlId(): Promise<string> {
    if (!supabase) {
      return `CC-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    }

    const { data } = await supabase.rpc('generate_custom_control_id');
    return data || `CC-${Date.now()}`;
  }

  // ---------------------------------------------------------------------------
  // COMPLIANCE STATISTICS
  // ---------------------------------------------------------------------------

  async getComplianceStats(): Promise<ComplianceStats | null> {
    if (!supabase || !this.organizationId) return null;

    const { data, error } = await supabase
      .rpc('get_compliance_stats', { p_org_id: this.organizationId });

    if (error) {
      console.error('Error fetching stats:', error);
      return null;
    }

    return data?.[0] || null;
  }

  async getFrameworkStats(frameworkId: string): Promise<FrameworkStats | null> {
    if (!supabase || !this.organizationId) return null;

    const { data, error } = await supabase
      .rpc('get_framework_compliance', { 
        p_org_id: this.organizationId,
        p_framework_id: frameworkId
      });

    if (error) {
      console.error('Error fetching framework stats:', error);
      return null;
    }

    return data?.[0] ? { framework_id: frameworkId, ...data[0] } : null;
  }

  async getAllFrameworkStats(): Promise<FrameworkStats[]> {
    const frameworks = ['SOC2', 'ISO27001', 'HIPAA', 'NIST'];
    const stats = await Promise.all(
      frameworks.map(fw => this.getFrameworkStats(fw))
    );
    return stats.filter((s): s is FrameworkStats => s !== null);
  }

  // ---------------------------------------------------------------------------
  // SYNC NOTIFICATIONS
  // ---------------------------------------------------------------------------

  async createSyncNotification(
    controlId: string,
    controlTitle: string,
    frameworkId: string,
    clauseId: string,
    clauseTitle: string
  ): Promise<void> {
    if (!supabase || !this.organizationId) return;

    await supabase
      .from('sync_notifications')
      .insert({
        organization_id: this.organizationId,
        user_id: this.userId,
        control_id: controlId,
        control_title: controlTitle,
        framework_id: frameworkId,
        clause_id: clauseId,
        clause_title: clauseTitle,
        notification_type: 'compliance_met',
      });
  }

  async getSyncNotifications(limit: number = 50): Promise<any[]> {
    if (!supabase || !this.organizationId) return [];

    const { data, error } = await supabase
      .from('sync_notifications')
      .select('*')
      .eq('organization_id', this.organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  }

  async markNotificationsRead(notificationIds: string[]): Promise<void> {
    if (!supabase) return;

    await supabase
      .from('sync_notifications')
      .update({ is_read: true })
      .in('id', notificationIds);
  }

  // ---------------------------------------------------------------------------
  // AUDIT LOGGING
  // ---------------------------------------------------------------------------

  private async logAudit(
    action: string,
    entityType: string,
    entityId?: string,
    oldValue?: any,
    newValue?: any
  ): Promise<void> {
    if (!supabase || !this.organizationId) return;

    try {
      await supabase
        .from('audit_log')
        .insert({
          organization_id: this.organizationId,
          user_id: this.userId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          old_value: oldValue,
          new_value: newValue,
        });
    } catch (error) {
      console.error('Audit log error:', error);
    }
  }

  async getAuditLog(limit: number = 100): Promise<any[]> {
    if (!supabase || !this.organizationId) return [];

    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('organization_id', this.organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching audit log:', error);
      return [];
    }

    return data || [];
  }

  // ---------------------------------------------------------------------------
  // DATA MIGRATION (localStorage to Supabase)
  // ---------------------------------------------------------------------------

  async migrateFromLocalStorage(localData: {
    responses: Map<string, any>;
    evidence: any[];
    customControls: any[];
  }): Promise<{ responses: number; evidence: number; controls: number }> {
    let responsesCount = 0;
    let evidenceCount = 0;
    let controlsCount = 0;

    // Migrate responses
    if (localData.responses.size > 0) {
      const responses = Array.from(localData.responses.entries()).map(([controlId, data]) => ({
        control_id: controlId,
        answer: data.answer,
        evidence_note: data.notes || '',
        remediation_plan: data.remediationPlan || '',
      }));

      responsesCount = await this.bulkSaveResponses(responses);
    }

    // Migrate evidence
    for (const ev of localData.evidence) {
      const result = await this.saveEvidenceRecord({
        evidence_id: ev.id,
        control_id: ev.controlId,
        notes: ev.notes,
        status: ev.status,
      });
      if (result) evidenceCount++;
    }

    // Migrate custom controls
    for (const ctrl of localData.customControls) {
      const result = await this.saveCustomControl({
        id: ctrl.id,
        title: ctrl.title,
        description: ctrl.description,
        question: ctrl.question,
        risk_level: ctrl.riskLevel,
        framework_mappings: ctrl.frameworkMappings,
      });
      if (result) controlsCount++;
    }

    return { responses: responsesCount, evidence: evidenceCount, controls: controlsCount };
  }

  // ---------------------------------------------------------------------------
  // REAL-TIME SUBSCRIPTIONS
  // ---------------------------------------------------------------------------

  subscribeToResponses(callback: (payload: any) => void): () => void {
    if (!supabase || !this.organizationId) return () => {};

    const subscription = supabase
      .channel('user_responses_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_responses',
          filter: `organization_id=eq.${this.organizationId}`
        },
        callback
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  subscribeToEvidence(callback: (payload: any) => void): () => void {
    if (!supabase || !this.organizationId) return () => {};

    const subscription = supabase
      .channel('evidence_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'evidence_records',
          filter: `organization_id=eq.${this.organizationId}`
        },
        callback
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const complianceDb = new ComplianceDatabaseService();
