/**
 * Regulatory Scan Service
 *
 * Frontend service for triggering and managing AI-powered regulatory scans
 * via Netlify functions. Integrates with the regulatory scanner agent.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { RegulatoryChangeLog, FrameworkType } from '../types/compliance.types';

// ============================================================================
// TYPES
// ============================================================================

export interface RegulatoryScanRequest {
  organizationId: string;
  sources?: string[]; // Source IDs to scan, or all if not specified
  frameworks?: FrameworkType[]; // Filter by framework types
}

export interface RegulatoryScanResult {
  sourceId: string;
  sourceName: string;
  framework: string;
  status: 'completed' | 'failed';
  changesFound: number;
  changes: RegulatoryChangeLog[];
  error?: string;
}

export interface RegulatoryScanResponse {
  success: boolean;
  scannedAt: string;
  summary: {
    sourcesScanned: number;
    totalChangesDetected: number;
    criticalChanges: number;
  };
  results: RegulatoryScanResult[];
  error?: string;
}

export interface SavedScan {
  id: string;
  organizationId: string;
  scannedAt: string;
  sourcesScanned: number;
  changesDetected: number;
  criticalChanges: number;
  status: 'completed' | 'failed' | 'partial';
  results: RegulatoryScanResult[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get auth token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Get the base URL for Netlify functions
 */
function getNetlifyFunctionUrl(functionName: string): string {
  return `/.netlify/functions/${functionName}`;
}

// ============================================================================
// REGULATORY SCAN SERVICE
// ============================================================================

class RegulatoryScanService {
  /**
   * Trigger a regulatory scan via the Netlify function
   * Returns detected regulatory changes across all configured sources
   */
  async triggerScan(request?: RegulatoryScanRequest): Promise<RegulatoryScanResponse> {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        scannedAt: new Date().toISOString(),
        summary: { sourcesScanned: 0, totalChangesDetected: 0, criticalChanges: 0 },
        results: [],
        error: 'Not authenticated',
      };
    }

    try {
      const response = await fetch(getNetlifyFunctionUrl('regulatory-scan'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request || {}),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          scannedAt: new Date().toISOString(),
          summary: { sourcesScanned: 0, totalChangesDetected: 0, criticalChanges: 0 },
          results: [],
          error: data.error || `Failed with status ${response.status}`,
        };
      }

      // Save scan results to database if configured
      if (request?.organizationId && isSupabaseConfigured() && supabase) {
        await this.saveScanResults(request.organizationId, data);
      }

      return data;
    } catch (error) {
      console.error('Regulatory scan error:', error);
      return {
        success: false,
        scannedAt: new Date().toISOString(),
        summary: { sourcesScanned: 0, totalChangesDetected: 0, criticalChanges: 0 },
        results: [],
        error: error instanceof Error ? error.message : 'Failed to trigger regulatory scan',
      };
    }
  }

  /**
   * Get the most recent scan results for an organization
   */
  async getRecentScans(organizationId: string, limit = 10): Promise<SavedScan[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('regulatory_scans')
        .select('*')
        .eq('organization_id', organizationId)
        .order('scanned_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch recent scans:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        organizationId: row.organization_id,
        scannedAt: row.scanned_at,
        sourcesScanned: row.sources_scanned,
        changesDetected: row.changes_detected,
        criticalChanges: row.critical_changes,
        status: row.status,
        results: row.results || [],
      }));
    } catch (error) {
      console.error('Failed to fetch recent scans:', error);
      return [];
    }
  }

  /**
   * Get all detected changes for an organization (not yet reviewed)
   */
  async getPendingChanges(organizationId: string): Promise<RegulatoryChangeLog[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('regulatory_changes')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'detected')
        .order('detected_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch pending changes:', error);
        return [];
      }

      return (data || []).map(row => this.mapChangeRow(row));
    } catch (error) {
      console.error('Failed to fetch pending changes:', error);
      return [];
    }
  }

  /**
   * Mark a regulatory change as reviewed
   */
  async reviewChange(
    changeId: string,
    status: 'reviewed' | 'acknowledged' | 'dismissed',
    notes?: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('regulatory_changes')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        })
        .eq('id', changeId);

      if (error) {
        console.error('Failed to review change:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to review change:', error);
      return false;
    }
  }

  /**
   * Get changes filtered by framework
   */
  async getChangesByFramework(
    organizationId: string,
    framework: FrameworkType
  ): Promise<RegulatoryChangeLog[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('regulatory_changes')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('framework_type', framework)
        .order('detected_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch changes by framework:', error);
        return [];
      }

      return (data || []).map(row => this.mapChangeRow(row));
    } catch (error) {
      console.error('Failed to fetch changes by framework:', error);
      return [];
    }
  }

  /**
   * Get critical changes that need immediate attention
   */
  async getCriticalChanges(organizationId: string): Promise<RegulatoryChangeLog[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('regulatory_changes')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('estimated_impact', 'critical')
        .in('status', ['detected', 'reviewed'])
        .order('detected_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch critical changes:', error);
        return [];
      }

      return (data || []).map(row => this.mapChangeRow(row));
    } catch (error) {
      console.error('Failed to fetch critical changes:', error);
      return [];
    }
  }

  /**
   * Get scan statistics for dashboard
   */
  async getScanStatistics(organizationId: string): Promise<{
    totalScans: number;
    totalChangesDetected: number;
    criticalChanges: number;
    pendingReview: number;
    lastScanDate: string | null;
    changesByFramework: Record<string, number>;
  }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        totalScans: 0,
        totalChangesDetected: 0,
        criticalChanges: 0,
        pendingReview: 0,
        lastScanDate: null,
        changesByFramework: {},
      };
    }

    try {
      // Get scan count and last scan date
      const { data: scans } = await supabase
        .from('regulatory_scans')
        .select('id, scanned_at, changes_detected, critical_changes')
        .eq('organization_id', organizationId)
        .order('scanned_at', { ascending: false });

      // Get pending changes count
      const { count: pendingCount } = await supabase
        .from('regulatory_changes')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'detected');

      // Get changes by framework
      const { data: frameworkChanges } = await supabase
        .from('regulatory_changes')
        .select('framework_type')
        .eq('organization_id', organizationId);

      const changesByFramework: Record<string, number> = {};
      (frameworkChanges || []).forEach(row => {
        const framework = row.framework_type as string;
        changesByFramework[framework] = (changesByFramework[framework] || 0) + 1;
      });

      const scanList = scans || [];
      const totalChanges = scanList.reduce((sum, s) => sum + (s.changes_detected || 0), 0);
      const totalCritical = scanList.reduce((sum, s) => sum + (s.critical_changes || 0), 0);

      return {
        totalScans: scanList.length,
        totalChangesDetected: totalChanges,
        criticalChanges: totalCritical,
        pendingReview: pendingCount || 0,
        lastScanDate: scanList.length > 0 ? scanList[0].scanned_at : null,
        changesByFramework,
      };
    } catch (error) {
      console.error('Failed to get scan statistics:', error);
      return {
        totalScans: 0,
        totalChangesDetected: 0,
        criticalChanges: 0,
        pendingReview: 0,
        lastScanDate: null,
        changesByFramework: {},
      };
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Save scan results to database
   */
  private async saveScanResults(
    organizationId: string,
    response: RegulatoryScanResponse
  ): Promise<void> {
    if (!supabase) return;

    try {
      // Save scan record
      const { data: scanRecord, error: scanError } = await supabase
        .from('regulatory_scans')
        .insert({
          organization_id: organizationId,
          scanned_at: response.scannedAt,
          sources_scanned: response.summary.sourcesScanned,
          changes_detected: response.summary.totalChangesDetected,
          critical_changes: response.summary.criticalChanges,
          status: response.success ? 'completed' : 'failed',
          results: response.results,
        })
        .select()
        .single();

      if (scanError) {
        console.error('Failed to save scan record:', scanError);
        return;
      }

      // Save individual changes
      const changes = response.results.flatMap(result =>
        result.changes.map(change => ({
          organization_id: organizationId,
          scan_id: scanRecord.id,
          change_id: change.id,
          detected_at: change.detectedAt,
          source_url: change.sourceUrl,
          source_type: change.sourceType,
          published_date: change.publishedDate,
          framework_type: change.frameworkType,
          affected_sections: change.affectedSections,
          change_type: change.changeType,
          change_summary: change.changeSummary,
          change_details: change.changeDetails,
          estimated_impact: change.estimatedImpact,
          affected_control_families: change.affectedControlFamilies,
          suggested_actions: change.suggestedActions,
          status: 'detected',
          ai_confidence_score: change.aiConfidenceScore,
          requires_human_review: change.requiresHumanReview,
        }))
      );

      if (changes.length > 0) {
        const { error: changesError } = await supabase
          .from('regulatory_changes')
          .insert(changes);

        if (changesError) {
          console.error('Failed to save changes:', changesError);
        }
      }
    } catch (error) {
      console.error('Failed to save scan results:', error);
    }
  }

  /**
   * Map database row to RegulatoryChangeLog
   */
  private mapChangeRow(row: Record<string, unknown>): RegulatoryChangeLog {
    return {
      id: row.change_id as string || row.id as string,
      detectedAt: row.detected_at as string,
      sourceUrl: row.source_url as string,
      sourceType: row.source_type as RegulatoryChangeLog['sourceType'],
      publishedDate: row.published_date as string,
      frameworkType: row.framework_type as FrameworkType,
      affectedSections: (row.affected_sections as string[]) || [],
      changeType: row.change_type as RegulatoryChangeLog['changeType'],
      changeSummary: row.change_summary as string,
      changeDetails: row.change_details as string,
      estimatedImpact: row.estimated_impact as RegulatoryChangeLog['estimatedImpact'],
      affectedControlFamilies: (row.affected_control_families as string[]) || [],
      suggestedActions: (row.suggested_actions as string[]) || [],
      status: row.status as RegulatoryChangeLog['status'],
      aiConfidenceScore: row.ai_confidence_score as number,
      requiresHumanReview: row.requires_human_review as boolean,
    };
  }
}

// Export singleton instance
export const regulatoryScanService = new RegulatoryScanService();

export default regulatoryScanService;
