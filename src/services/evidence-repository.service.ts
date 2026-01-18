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
  private deduplicationRan: Set<string> = new Set(); // Track per-org deduplication

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  setContext(organizationId: string, userId: string): void {
    this.organizationId = organizationId;
    this.userId = userId;

    // Run deduplication once per organization per session
    if (organizationId && !this.deduplicationRan.has(organizationId)) {
      this.deduplicationRan.add(organizationId);
      // Run in background, don't block initialization
      this.removeDuplicates().then(result => {
        if (result.removed > 0) {
          console.log(`[EvidenceRepo] Auto-cleanup: removed ${result.removed} duplicates`);
        }
      }).catch(err => {
        console.error('[EvidenceRepo] Auto-cleanup error:', err);
      });
    }
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
    if (!supabase) {
      console.error('[EvidenceRepo] Supabase not configured');
      return { success: false, error: 'Supabase not configured' };
    }
    if (!this.organizationId) {
      console.error('[EvidenceRepo] Organization ID not set');
      return { success: false, error: 'Organization ID not set' };
    }

    try {
      console.log('[EvidenceRepo] Creating evidence:', { controlId: data.controlId, orgId: this.organizationId });

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

      if (error) {
        console.error('[EvidenceRepo] Insert error:', error);
        throw error;
      }

      console.log('[EvidenceRepo] Evidence created:', evidence.id);

      // Create initial version
      const { error: versionError } = await supabase
        .from('evidence_versions')
        .insert({
          evidence_id: evidence.id,
          version: 1,
          version_number: 1,
          notes: 'Initial version',
          status: 'draft',
          created_by: this.userId,
        });

      if (versionError) {
        console.error('[EvidenceRepo] Version insert error:', versionError);
      }

      return { success: true, evidenceId: evidence.id };
    } catch (error) {
      console.error('[EvidenceRepo] Exception:', error);
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
            evidence_files!evidence_version_id (
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
    if (!supabase) {
      console.log('[EvidenceRepo] searchEvidence: Supabase not configured');
      return [];
    }
    if (!this.organizationId) {
      console.log('[EvidenceRepo] searchEvidence: Organization ID not set');
      return [];
    }

    console.log('[EvidenceRepo] searchEvidence:', { orgId: this.organizationId, params });

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
            evidence_files!evidence_version_id (
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
        // Escape special characters to prevent SQL injection in ilike patterns
        const escapedSearch = params.searchText.replace(/[%_\\]/g, '\\$&');
        query = query.or(`title.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`);
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

      if (error) {
        console.error('[EvidenceRepo] searchEvidence error:', error);
        return [];
      }

      if (!data) {
        console.log('[EvidenceRepo] searchEvidence: No data returned');
        return [];
      }

      console.log('[EvidenceRepo] searchEvidence: Found', data.length, 'items');
      return data.map((item) => this.mapToEvidenceItem(item));
    } catch (err) {
      console.error('[EvidenceRepo] searchEvidence exception:', err);
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
   * Compute SHA-256 hash of a file
   */
  private async computeFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

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
      // Compute file hash for integrity checking
      const checksum = await this.computeFileHash(file);

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

      // Use maybeSingle() to avoid 406 error when no version exists
      const { data: existingVersions } = await supabase
        .from('evidence_versions')
        .select('id')
        .eq('evidence_id', evidenceId)
        .or(`version.eq.${currentVersion},version_number.eq.${currentVersion}`)
        .limit(1);

      const existingVersion = existingVersions?.[0];

      if (existingVersion) {
        versionId = existingVersion.id;
        if (versionNotes) {
          await supabase
            .from('evidence_versions')
            .update({ notes: versionNotes })
            .eq('id', versionId);
        }
      } else {
        // Insert with both version and version_number for compatibility
        const { data: newVersion, error: versionError } = await supabase
          .from('evidence_versions')
          .insert({
            evidence_id: evidenceId,
            version: currentVersion,
            version_number: currentVersion,
            notes: versionNotes || `Version ${currentVersion}`,
            status: 'draft',
            created_by: this.userId,
          })
          .select('id')
          .single();

        if (versionError || !newVersion) {
          console.error('[EvidenceRepo] Failed to create version:', versionError);
          throw new Error('Failed to create version');
        }
        versionId = newVersion.id;
      }

      // Create file record - include all FK columns for compatibility
      const { data: fileRecord, error: fileError } = await supabase
        .from('evidence_files')
        .insert({
          evidence_id: evidenceId, // Required: direct FK to evidence_items
          evidence_version_id: versionId,
          version_id: versionId, // Also set legacy FK column
          filename,
          original_name: file.name,
          original_filename: file.name, // Also set legacy column name
          mime_type: file.type || 'application/octet-stream', // Default if no type
          size: file.size,
          size_bytes: file.size, // Also set legacy column name
          url: urlData.publicUrl,
          storage_path: filename, // Set storage path
          checksum_sha256: checksum, // Required: file integrity hash
          uploaded_by: this.userId,
          uploaded_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (fileError) {
        console.error('[EvidenceRepo] Failed to create file record:', fileError);
        // Clean up the uploaded file from storage since record creation failed
        try {
          await supabase.storage.from(this.bucketName).remove([filename]);
          console.log('[EvidenceRepo] Cleaned up orphaned file from storage:', filename);
        } catch (cleanupError) {
          console.error('[EvidenceRepo] Failed to clean up orphaned file:', cleanupError);
        }
        throw fileError;
      }

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
    if (!supabase || !this.organizationId) return false;

    try {
      // Get file info with organization check through evidence_items
      const { data: file } = await supabase
        .from('evidence_files')
        .select(`
          filename,
          evidence_id,
          evidence_items!evidence_id (
            organization_id
          )
        `)
        .eq('id', fileId)
        .single();

      if (!file) return false;

      // Verify organization ownership - evidence_items is nested via join
      const evidenceItems = file.evidence_items as { organization_id: string } | { organization_id: string }[] | null;
      const orgId = Array.isArray(evidenceItems)
        ? evidenceItems[0]?.organization_id
        : evidenceItems?.organization_id;

      if (!orgId || orgId !== this.organizationId) {
        console.error('[EvidenceRepo] Unauthorized file deletion attempt');
        return false;
      }

      // Delete from storage
      if (file.filename) {
        await supabase.storage.from(this.bucketName).remove([file.filename]);
      }

      // Delete record
      const { error } = await supabase
        .from('evidence_files')
        .delete()
        .eq('id', fileId);

      return !error;
    } catch (err) {
      console.error('[EvidenceRepo] deleteFile error:', err);
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

      // Create version record with both version and version_number for compatibility
      const { error: versionError } = await supabase
        .from('evidence_versions')
        .insert({
          evidence_id: evidenceId,
          version: newVersion,
          version_number: newVersion, // Include both for schema compatibility
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
          evidence_files!evidence_version_id (
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
      // Query with columns that should exist after migrations
      const { data, error } = await supabase
        .from('evidence_items')
        .select('id, status, type, source, created_at, retention_date, valid_until')
        .eq('organization_id', this.organizationId);

      if (error) {
        console.error('[EvidenceRepo] getStats error:', error);
        // Return empty stats on error instead of null
        return {
          total: 0,
          byStatus: { draft: 0, review: 0, final: 0 },
          byType: {},
          bySource: {},
          pendingReview: 0,
          expiringSoon: 0,
          recentUploads: 0,
        };
      }

      if (!data) return null;

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

        // Count by source (default to 'manual' if not set)
        const source = item.source || 'manual';
        stats.bySource[source] = (stats.bySource[source] || 0) + 1;

        // Check for expiring evidence (use retention_date or valid_until)
        const expiryDate = item.retention_date || item.valid_until;
        if (expiryDate) {
          const retentionDate = new Date(expiryDate);
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
      // Handle both 'version' and 'version_number' columns for compatibility
      version: (v.version ?? v.version_number ?? 1) as number,
      notes: (v.notes ?? v.change_summary ?? '') as string,
      status: v.status as EvidenceStatus,
      files: ((v.evidence_files as Record<string, unknown>[]) || []).map((f) => ({
        id: f.id as string,
        filename: f.filename as string,
        originalName: (f.original_name ?? f.original_filename ?? f.filename ?? 'Unknown') as string,
        mimeType: (f.mime_type ?? 'application/octet-stream') as string,
        size: (f.size ?? f.size_bytes ?? 0) as number,
        url: (f.url ?? '') as string,
        uploadedAt: (f.uploaded_at ?? f.created_at ?? new Date().toISOString()) as string,
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

  // ---------------------------------------------------------------------------
  // CLEANUP / MAINTENANCE
  // ---------------------------------------------------------------------------

  /**
   * Remove duplicate evidence items, keeping the oldest entry per control_id.
   * Returns the number of duplicates removed.
   */
  async removeDuplicates(): Promise<{ removed: number; error?: string }> {
    if (!supabase || !this.organizationId) {
      return { removed: 0, error: 'Not configured' };
    }

    try {
      console.log('[EvidenceRepo] Starting duplicate cleanup...');

      // Get all evidence items for this organization
      const { data: allEvidence, error: fetchError } = await supabase
        .from('evidence_items')
        .select('id, control_id, created_at')
        .eq('organization_id', this.organizationId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('[EvidenceRepo] Fetch error:', fetchError);
        return { removed: 0, error: fetchError.message };
      }

      if (!allEvidence || allEvidence.length === 0) {
        console.log('[EvidenceRepo] No evidence items found');
        return { removed: 0 };
      }

      console.log(`[EvidenceRepo] Found ${allEvidence.length} total evidence items`);

      // Group by control_id, keeping track of which to keep (first/oldest) and which to delete
      const byControlId: Record<string, string[]> = {};
      for (const item of allEvidence) {
        const controlId = item.control_id;
        if (!byControlId[controlId]) {
          byControlId[controlId] = [];
        }
        byControlId[controlId].push(item.id);
      }

      // Find duplicates (all entries after the first for each control_id)
      const idsToDelete: string[] = [];
      for (const controlId of Object.keys(byControlId)) {
        const ids = byControlId[controlId];
        if (ids.length > 1) {
          // Keep the first (oldest), delete the rest
          idsToDelete.push(...ids.slice(1));
        }
      }

      console.log(`[EvidenceRepo] Found ${idsToDelete.length} duplicates to remove`);

      if (idsToDelete.length === 0) {
        return { removed: 0 };
      }

      // Delete in batches to avoid issues with large deletes
      const BATCH_SIZE = 100;
      let removed = 0;

      for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
        const batch = idsToDelete.slice(i, i + BATCH_SIZE);
        const { error: deleteError } = await supabase
          .from('evidence_items')
          .delete()
          .in('id', batch);

        if (deleteError) {
          console.error('[EvidenceRepo] Delete batch error:', deleteError);
          return { removed, error: deleteError.message };
        }

        removed += batch.length;
        console.log(`[EvidenceRepo] Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}, total removed: ${removed}`);
      }

      console.log(`[EvidenceRepo] Cleanup complete: ${removed} duplicates removed`);
      return { removed };
    } catch (error) {
      console.error('[EvidenceRepo] Cleanup exception:', error);
      return { removed: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const evidenceRepository = new EvidenceRepositoryService();
export default evidenceRepository;
