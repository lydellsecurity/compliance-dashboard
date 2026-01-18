/**
 * Evidence Repository Service
 *
 * Centralized evidence management system with:
 * - File upload and storage (Supabase Storage)
 * - Version control with audit trail
 * - Automated evidence collection from integrations
 * - Evidence search and filtering
 * - Retention policy management
 * - Evidence approval workflows
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { EvidenceStatus } from '../lib/database.types';

// ============================================================================
// TYPES
// ============================================================================

export type EvidenceType =
  | 'document'
  | 'screenshot'
  | 'log'
  | 'configuration'
  | 'report'
  | 'policy'
  | 'certificate'
  | 'assessment'
  | 'automated';

export type EvidenceSource =
  | 'manual'
  | 'aws'
  | 'azure'
  | 'gcp'
  | 'okta'
  | 'github'
  | 'jira'
  | 'automated_scan';

export interface EvidenceFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
  uploadedBy: string | null;
}

export interface EvidenceVersion {
  id: string;
  version: number;
  notes: string;
  status: EvidenceStatus;
  files: EvidenceFile[];
  createdAt: string;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface EvidenceItem {
  id: string;
  organizationId: string;
  controlId: string;
  controlTitle?: string;
  title: string;
  description: string;
  type: EvidenceType;
  source: EvidenceSource;
  status: EvidenceStatus;
  currentVersion: number;
  versions: EvidenceVersion[];
  tags: string[];
  retentionDate: string | null;
  frameworkMappings: string[];
  collectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceSearchParams {
  controlId?: string;
  controlIds?: string[];
  type?: EvidenceType;
  source?: EvidenceSource;
  status?: EvidenceStatus;
  tags?: string[];
  framework?: string;
  searchText?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface EvidenceUploadResult {
  success: boolean;
  evidenceId?: string;
  fileId?: string;
  error?: string;
}

export interface EvidenceStats {
  total: number;
  byStatus: Record<EvidenceStatus, number>;
  byType: Record<string, number>;
  bySource: Record<string, number>;
  pendingReview: number;
  expiringSoon: number;
  recentUploads: number;
}

export interface RetentionPolicy {
  id: string;
  name: string;
  retentionDays: number;
  autoDelete: boolean;
  frameworks: string[];
  evidenceTypes: EvidenceType[];
  isDefault: boolean;
}

// ============================================================================
// EVIDENCE REPOSITORY SERVICE
// ============================================================================

class EvidenceRepositoryService {
  private organizationId: string | null = null;
  private userId: string | null = null;
  private bucketName = 'evidence';

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  setContext(organizationId: string, userId: string): void {
    this.organizationId = organizationId;
    this.userId = userId;
  }

  clearContext(): void {
    this.organizationId = null;
    this.userId = null;
  }

  isAvailable(): boolean {
    return isSupabaseConfigured();
  }

  // ---------------------------------------------------------------------------
  // EVIDENCE CRUD
  // ---------------------------------------------------------------------------

  /**
   * Create a new evidence item
   */
  async createEvidence(data: {
    controlId: string;
    title: string;
    description: string;
    type: EvidenceType;
    source?: EvidenceSource;
    tags?: string[];
    frameworkMappings?: string[];
  }): Promise<EvidenceUploadResult> {
    if (!supabase || !this.organizationId) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      const { data: evidence, error } = await supabase
        .from('evidence_items')
        .insert({
          organization_id: this.organizationId,
          control_id: data.controlId,
          title: data.title,
          description: data.description,
          type: data.type,
          source: data.source || 'manual',
          status: 'draft',
          current_version: 1,
          tags: data.tags || [],
          framework_mappings: data.frameworkMappings || [],
          created_by: this.userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial version
      await supabase
        .from('evidence_versions')
        .insert({
          evidence_id: evidence.id,
          version: 1,
          notes: 'Initial version',
          status: 'draft',
          created_by: this.userId,
        });

      return { success: true, evidenceId: evidence.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create evidence',
      };
    }
  }

  /**
   * Get evidence by ID
   */
  async getEvidence(evidenceId: string): Promise<EvidenceItem | null> {
    if (!supabase || !this.organizationId) return null;

    try {
      const { data, error } = await supabase
        .from('evidence_items')
        .select(`
          *,
          evidence_versions (
            id,
            version,
            notes,
            status,
            created_at,
            created_by,
            approved_by,
            approved_at,
            evidence_files (
              id,
              filename,
              original_name,
              mime_type,
              size,
              url,
              uploaded_at,
              uploaded_by
            )
          )
        `)
        .eq('id', evidenceId)
        .eq('organization_id', this.organizationId)
        .single();

      if (error || !data) return null;

      return this.mapToEvidenceItem(data);
    } catch {
      return null;
    }
  }

  /**
   * Search evidence with filters
   */
  async searchEvidence(params: EvidenceSearchParams): Promise<EvidenceItem[]> {
    if (!supabase || !this.organizationId) return [];

    try {
      let query = supabase
        .from('evidence_items')
        .select(`
          *,
          evidence_versions (
            id,
            version,
            notes,
            status,
            created_at,
            created_by,
            approved_by,
            approved_at,
            evidence_files (
              id,
              filename,
              original_name,
              mime_type,
              size,
              url,
              uploaded_at,
              uploaded_by
            )
          )
        `)
        .eq('organization_id', this.organizationId)
        .order('updated_at', { ascending: false });

      // Apply filters
      if (params.controlId) {
        query = query.eq('control_id', params.controlId);
      }
      if (params.controlIds && params.controlIds.length > 0) {
        query = query.in('control_id', params.controlIds);
      }
      if (params.type) {
        query = query.eq('type', params.type);
      }
      if (params.source) {
        query = query.eq('source', params.source);
      }
      if (params.status) {
        query = query.eq('status', params.status);
      }
      if (params.tags && params.tags.length > 0) {
        query = query.overlaps('tags', params.tags);
      }
      if (params.framework) {
        query = query.contains('framework_mappings', [params.framework]);
      }
      if (params.searchText) {
        query = query.or(`title.ilike.%${params.searchText}%,description.ilike.%${params.searchText}%`);
      }
      if (params.startDate) {
        query = query.gte('created_at', params.startDate);
      }
      if (params.endDate) {
        query = query.lte('created_at', params.endDate);
      }
      if (params.limit) {
        query = query.limit(params.limit);
      }
      if (params.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error || !data) return [];

      return data.map((item) => this.mapToEvidenceItem(item));
    } catch {
      return [];
    }
  }

  /**
   * Get evidence for a specific control
   */
  async getEvidenceForControl(controlId: string): Promise<EvidenceItem[]> {
    return this.searchEvidence({ controlId });
  }

  /**
   * Update evidence metadata
   */
  async updateEvidence(
    evidenceId: string,
    updates: Partial<Pick<EvidenceItem, 'title' | 'description' | 'tags' | 'frameworkMappings'>>
  ): Promise<boolean> {
    if (!supabase || !this.organizationId) return false;

    try {
      const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.frameworkMappings !== undefined) dbUpdates.framework_mappings = updates.frameworkMappings;

      const { error } = await supabase
        .from('evidence_items')
        .update(dbUpdates)
        .eq('id', evidenceId)
        .eq('organization_id', this.organizationId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Delete evidence (soft delete by setting status)
   */
  async deleteEvidence(evidenceId: string): Promise<boolean> {
    if (!supabase || !this.organizationId) return false;

    try {
      const { error } = await supabase
        .from('evidence_items')
        .update({
          status: 'archived' as EvidenceStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', evidenceId)
        .eq('organization_id', this.organizationId);

      return !error;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // FILE OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Upload a file to an evidence item
   */
  async uploadFile(
    evidenceId: string,
    file: File,
    versionNotes?: string
  ): Promise<EvidenceUploadResult> {
    if (!supabase || !this.organizationId) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      // Get current evidence to determine version
      const { data: evidence } = await supabase
        .from('evidence_items')
        .select('current_version')
        .eq('id', evidenceId)
        .single();

      if (!evidence) {
        return { success: false, error: 'Evidence not found' };
      }

      const currentVersion = evidence.current_version;
      const filename = `${this.organizationId}/${evidenceId}/${currentVersion}/${Date.now()}-${file.name}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from(this.bucketName)
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filename);

      // Get or create version
      let versionId: string;
      const { data: existingVersion } = await supabase
        .from('evidence_versions')
        .select('id')
        .eq('evidence_id', evidenceId)
        .eq('version', currentVersion)
        .single();

      if (existingVersion) {
        versionId = existingVersion.id;
        if (versionNotes) {
          await supabase
            .from('evidence_versions')
            .update({ notes: versionNotes })
            .eq('id', versionId);
        }
      } else {
        const { data: newVersion, error: versionError } = await supabase
          .from('evidence_versions')
          .insert({
            evidence_id: evidenceId,
            version: currentVersion,
            notes: versionNotes || `Version ${currentVersion}`,
            status: 'draft',
            created_by: this.userId,
          })
          .select()
          .single();

        if (versionError || !newVersion) {
          throw new Error('Failed to create version');
        }
        versionId = newVersion.id;
      }

      // Create file record
      const { data: fileRecord, error: fileError } = await supabase
        .from('evidence_files')
        .insert({
          evidence_version_id: versionId,
          filename,
          original_name: file.name,
          mime_type: file.type,
          size: file.size,
          url: urlData.publicUrl,
          uploaded_by: this.userId,
        })
        .select()
        .single();

      if (fileError) throw fileError;

      // Update evidence timestamp
      await supabase
        .from('evidence_items')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', evidenceId);

      return { success: true, evidenceId, fileId: fileRecord.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
      };
    }
  }

  /**
   * Delete a file from evidence
   */
  async deleteFile(fileId: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      // Get file info first
      const { data: file } = await supabase
        .from('evidence_files')
        .select('filename')
        .eq('id', fileId)
        .single();

      if (!file) return false;

      // Delete from storage
      await supabase.storage.from(this.bucketName).remove([file.filename]);

      // Delete record
      const { error } = await supabase
        .from('evidence_files')
        .delete()
        .eq('id', fileId);

      return !error;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // VERSION CONTROL
  // ---------------------------------------------------------------------------

  /**
   * Create a new version of evidence
   */
  async createVersion(evidenceId: string, notes: string): Promise<number | null> {
    if (!supabase || !this.organizationId) return null;

    try {
      // Get current version
      const { data: evidence, error: evidenceError } = await supabase
        .from('evidence_items')
        .select('current_version')
        .eq('id', evidenceId)
        .eq('organization_id', this.organizationId)
        .single();

      if (evidenceError || !evidence) return null;

      const newVersion = evidence.current_version + 1;

      // Create version record
      const { error: versionError } = await supabase
        .from('evidence_versions')
        .insert({
          evidence_id: evidenceId,
          version: newVersion,
          notes,
          status: 'draft',
          created_by: this.userId,
        });

      if (versionError) return null;

      // Update evidence current version
      await supabase
        .from('evidence_items')
        .update({
          current_version: newVersion,
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', evidenceId);

      return newVersion;
    } catch {
      return null;
    }
  }

  /**
   * Get version history for evidence
   */
  async getVersionHistory(evidenceId: string): Promise<EvidenceVersion[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('evidence_versions')
        .select(`
          id,
          version,
          notes,
          status,
          created_at,
          created_by,
          approved_by,
          approved_at,
          evidence_files (
            id,
            filename,
            original_name,
            mime_type,
            size,
            url,
            uploaded_at,
            uploaded_by
          )
        `)
        .eq('evidence_id', evidenceId)
        .order('version', { ascending: false });

      if (error || !data) return [];

      return data.map((v) => ({
        id: v.id,
        version: v.version,
        notes: v.notes,
        status: v.status,
        files: (v.evidence_files || []).map((f: Record<string, unknown>) => ({
          id: f.id as string,
          filename: f.filename as string,
          originalName: f.original_name as string,
          mimeType: f.mime_type as string,
          size: f.size as number,
          url: f.url as string,
          uploadedAt: f.uploaded_at as string,
          uploadedBy: f.uploaded_by as string | null,
        })),
        createdAt: v.created_at,
        createdBy: v.created_by,
        approvedBy: v.approved_by,
        approvedAt: v.approved_at,
      }));
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // APPROVAL WORKFLOW
  // ---------------------------------------------------------------------------

  /**
   * Submit evidence for review
   */
  async submitForReview(evidenceId: string): Promise<boolean> {
    if (!supabase || !this.organizationId) return false;

    try {
      const { error } = await supabase
        .from('evidence_items')
        .update({
          status: 'review' as EvidenceStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', evidenceId)
        .eq('organization_id', this.organizationId);

      if (error) return false;

      // Also update current version status
      const { data: evidence } = await supabase
        .from('evidence_items')
        .select('current_version')
        .eq('id', evidenceId)
        .single();

      if (evidence) {
        await supabase
          .from('evidence_versions')
          .update({ status: 'review' })
          .eq('evidence_id', evidenceId)
          .eq('version', evidence.current_version);
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Approve evidence
   */
  async approveEvidence(evidenceId: string): Promise<boolean> {
    if (!supabase || !this.organizationId || !this.userId) return false;

    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('evidence_items')
        .update({
          status: 'final' as EvidenceStatus,
          updated_at: now,
        })
        .eq('id', evidenceId)
        .eq('organization_id', this.organizationId);

      if (error) return false;

      // Update current version
      const { data: evidence } = await supabase
        .from('evidence_items')
        .select('current_version')
        .eq('id', evidenceId)
        .single();

      if (evidence) {
        await supabase
          .from('evidence_versions')
          .update({
            status: 'final',
            approved_by: this.userId,
            approved_at: now,
          })
          .eq('evidence_id', evidenceId)
          .eq('version', evidence.current_version);
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reject evidence back to draft
   */
  async rejectEvidence(evidenceId: string, reason?: string): Promise<boolean> {
    if (!supabase || !this.organizationId) return false;

    try {
      const { error } = await supabase
        .from('evidence_items')
        .update({
          status: 'draft' as EvidenceStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', evidenceId)
        .eq('organization_id', this.organizationId);

      if (error) return false;

      // Update current version with rejection note
      const { data: evidence } = await supabase
        .from('evidence_items')
        .select('current_version')
        .eq('id', evidenceId)
        .single();

      if (evidence) {
        const { data: version } = await supabase
          .from('evidence_versions')
          .select('notes')
          .eq('evidence_id', evidenceId)
          .eq('version', evidence.current_version)
          .single();

        await supabase
          .from('evidence_versions')
          .update({
            status: 'draft',
            notes: reason ? `${version?.notes || ''}\n\nRejected: ${reason}` : version?.notes,
          })
          .eq('evidence_id', evidenceId)
          .eq('version', evidence.current_version);
      }

      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------------------------------

  /**
   * Get evidence statistics for the organization
   */
  async getStats(): Promise<EvidenceStats | null> {
    if (!supabase || !this.organizationId) return null;

    try {
      const { data, error } = await supabase
        .from('evidence_items')
        .select('id, status, type, source, created_at, retention_date')
        .eq('organization_id', this.organizationId);

      if (error || !data) return null;

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const stats: EvidenceStats = {
        total: data.length,
        byStatus: {
          draft: 0,
          review: 0,
          final: 0,
        },
        byType: {},
        bySource: {},
        pendingReview: 0,
        expiringSoon: 0,
        recentUploads: 0,
      };

      for (const item of data) {
        // Count by status
        if (item.status in stats.byStatus) {
          stats.byStatus[item.status as EvidenceStatus]++;
        }
        if (item.status === 'review') {
          stats.pendingReview++;
        }

        // Count by type
        stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;

        // Count by source
        stats.bySource[item.source] = (stats.bySource[item.source] || 0) + 1;

        // Check for expiring evidence
        if (item.retention_date) {
          const retentionDate = new Date(item.retention_date);
          if (retentionDate <= monthFromNow) {
            stats.expiringSoon++;
          }
        }

        // Recent uploads
        if (new Date(item.created_at) >= weekAgo) {
          stats.recentUploads++;
        }
      }

      return stats;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // AUTOMATED EVIDENCE COLLECTION
  // ---------------------------------------------------------------------------

  /**
   * Create evidence from cloud verification result
   */
  async createFromCloudVerification(
    source: 'aws' | 'azure' | 'gcp',
    controlId: string,
    verificationData: {
      title: string;
      details: string;
      evidence?: Record<string, unknown>;
      status: 'pass' | 'fail' | 'partial';
    }
  ): Promise<EvidenceUploadResult> {
    const result = await this.createEvidence({
      controlId,
      title: verificationData.title,
      description: verificationData.details,
      type: 'automated',
      source,
      tags: ['automated', source, verificationData.status],
    });

    if (result.success && result.evidenceId && verificationData.evidence) {
      // Store evidence data as a JSON file
      const evidenceBlob = new Blob(
        [JSON.stringify(verificationData.evidence, null, 2)],
        { type: 'application/json' }
      );
      const evidenceFile = new File(
        [evidenceBlob],
        `${source}-${controlId}-evidence.json`,
        { type: 'application/json' }
      );

      await this.uploadFile(
        result.evidenceId,
        evidenceFile,
        `Automated evidence from ${source.toUpperCase()} verification`
      );
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // RETENTION POLICIES
  // ---------------------------------------------------------------------------

  /**
   * Get retention policies for the organization
   */
  async getRetentionPolicies(): Promise<RetentionPolicy[]> {
    if (!supabase || !this.organizationId) return [];

    try {
      const { data, error } = await supabase
        .from('retention_policies')
        .select('*')
        .eq('organization_id', this.organizationId)
        .order('is_default', { ascending: false });

      if (error || !data) return [];

      return data.map((p) => ({
        id: p.id,
        name: p.name,
        retentionDays: p.retention_days,
        autoDelete: p.auto_delete,
        frameworks: p.frameworks || [],
        evidenceTypes: p.evidence_types || [],
        isDefault: p.is_default,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Apply retention date to evidence
   */
  async setRetentionDate(evidenceId: string, retentionDate: string | null): Promise<boolean> {
    if (!supabase || !this.organizationId) return false;

    try {
      const { error } = await supabase
        .from('evidence_items')
        .update({
          retention_date: retentionDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', evidenceId)
        .eq('organization_id', this.organizationId);

      return !error;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private mapToEvidenceItem(data: Record<string, unknown>): EvidenceItem {
    const versions = (data.evidence_versions as Record<string, unknown>[] || []).map((v) => ({
      id: v.id as string,
      version: v.version as number,
      notes: v.notes as string,
      status: v.status as EvidenceStatus,
      files: ((v.evidence_files as Record<string, unknown>[]) || []).map((f) => ({
        id: f.id as string,
        filename: f.filename as string,
        originalName: f.original_name as string,
        mimeType: f.mime_type as string,
        size: f.size as number,
        url: f.url as string,
        uploadedAt: f.uploaded_at as string,
        uploadedBy: f.uploaded_by as string | null,
      })),
      createdAt: v.created_at as string,
      createdBy: v.created_by as string | null,
      approvedBy: v.approved_by as string | null,
      approvedAt: v.approved_at as string | null,
    }));

    return {
      id: data.id as string,
      organizationId: data.organization_id as string,
      controlId: data.control_id as string,
      title: data.title as string,
      description: data.description as string,
      type: data.type as EvidenceType,
      source: data.source as EvidenceSource,
      status: data.status as EvidenceStatus,
      currentVersion: data.current_version as number,
      versions: versions.sort((a, b) => b.version - a.version),
      tags: (data.tags as string[]) || [],
      retentionDate: data.retention_date as string | null,
      frameworkMappings: (data.framework_mappings as string[]) || [],
      collectedAt: data.collected_at as string || data.created_at as string,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const evidenceRepository = new EvidenceRepositoryService();
export default evidenceRepository;
