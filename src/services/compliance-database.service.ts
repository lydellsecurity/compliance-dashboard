/**
 * ============================================================================
 * COMPLIANCE DATABASE SERVICE
 * ============================================================================
 * 
 * Comprehensive Supabase integration for the Modular Compliance Engine.
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
  // MASTER CONTROLS
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
  // USER RESPONSES
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

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching response:', error);
    }

    return data || null;
  }

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

    try {
      const { error } = await supabase
        .from('user_responses')
        .upsert({
          organization_id: fullResponse.organization_id,
          user_id: fullResponse.user_id,
          control_id: fullResponse.control_id,
          answer: fullResponse.answer,
          evidence_note: fullResponse.evidence_note,
          file_url: fullResponse.file_url,
          file_name: fullResponse.file_name,
          remediation_plan: fullResponse.remediation_plan,
          target_date: fullResponse.target_date,
          status: fullResponse.status,
          answered_at: fullResponse.answered_at,
        }, {
          onConflict: 'organization_id,control_id'
        });

      if (error) throw error;

      await this.logAudit('upsert', 'user_response', fullResponse.control_id, null, fullResponse);

      callbacks?.onSuccess?.();
      return fullResponse;
    } catch (error) {
      console.error('Sync error:', error);
      callbacks?.onError?.(error instanceof Error ? error.message : 'Sync failed');
      return null;
    }
  }

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

    const evidenceId = evidence.evidence_id || this.generateEvidenceId();

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

    const updates: Record<string, unknown> = { status };
    
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

  private generateEvidenceId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const part1 = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part2 = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `EV-${part1}-${part2}`;
  }

  // ---------------------------------------------------------------------------
  // FILE UPLOADS
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

    const controlId = control.id || this.generateCustomControlId();

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

    if (control.framework_mappings && control.framework_mappings.length > 0) {
      await supabase
        .from('custom_control_mappings')
        .delete()
        .eq('custom_control_id', controlId);

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

  private generateCustomControlId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const part = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `CC-${part}`;
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

  async getSyncNotifications(limit: number = 50): Promise<Record<string, unknown>[]> {
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
    oldValue?: unknown,
    newValue?: unknown
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

  async getAuditLog(limit: number = 100): Promise<Record<string, unknown>[]> {
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
  // DATA MIGRATION
  // ---------------------------------------------------------------------------

  async migrateFromLocalStorage(localData: {
    responses: Map<string, Record<string, unknown>>;
    evidence: Record<string, unknown>[];
    customControls: Record<string, unknown>[];
  }): Promise<{ responses: number; evidence: number; controls: number }> {
    let responsesCount = 0;
    let evidenceCount = 0;
    let controlsCount = 0;

    if (localData.responses.size > 0) {
      const responses = Array.from(localData.responses.entries()).map(([controlId, data]) => ({
        control_id: controlId,
        answer: data.answer as UserResponse['answer'],
        evidence_note: (data.notes as string) || '',
        remediation_plan: (data.remediationPlan as string) || '',
      }));

      responsesCount = await this.bulkSaveResponses(responses);
    }

    for (const ev of localData.evidence) {
      const result = await this.saveEvidenceRecord({
        evidence_id: ev.id as string,
        control_id: ev.controlId as string,
        notes: ev.notes as string,
        status: ev.status as EvidenceRecord['status'],
      });
      if (result) evidenceCount++;
    }

    for (const ctrl of localData.customControls) {
      const result = await this.saveCustomControl({
        id: ctrl.id as string,
        title: ctrl.title as string,
        description: ctrl.description as string,
        question: ctrl.question as string,
        risk_level: ctrl.riskLevel as CustomControl['risk_level'],
        framework_mappings: ctrl.frameworkMappings as CustomControl['framework_mappings'],
      });
      if (result) controlsCount++;
    }

    return { responses: responsesCount, evidence: evidenceCount, controls: controlsCount };
  }

  // ---------------------------------------------------------------------------
  // REAL-TIME SUBSCRIPTIONS
  // ---------------------------------------------------------------------------

  subscribeToResponses(callback: (payload: Record<string, unknown>) => void): () => void {
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

  subscribeToEvidence(callback: (payload: Record<string, unknown>) => void): () => void {
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
