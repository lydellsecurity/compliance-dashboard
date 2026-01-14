/**
 * ============================================================================
 * USE COMPLIANCE HOOK (With Supabase Integration)
 * ============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { complianceDb } from '../services/compliance-database.service';
import type { CustomControl, SyncNotification as DbSyncNotification } from '../services/compliance-database.service';
import { useAuth } from './useAuth';

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

export interface Evidence {
  id: string;
  controlId: string;
  notes: string;
  status: 'draft' | 'review' | 'final';
  fileUrls: string[];
  createdAt: string;
}

export interface SyncNotification {
  id: string;
  controlId: string;
  controlTitle: string;
  frameworkId: string;
  clauseId: string;
  clauseTitle: string;
  timestamp: string;
}

export interface ComplianceStats {
  totalControls: number;
  answeredControls: number;
  compliantControls: number;
  gapControls: number;
  partialControls: number;
  remainingControls: number;
  assessmentPercentage: number;
}

export interface FrameworkProgress {
  id: string;
  name: string;
  color: string;
  total: number;
  completed: number;
  percentage: number;
}

export interface UseComplianceWithSupabaseReturn {
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  responses: Map<string, ControlResponse>;
  evidence: Evidence[];
  customControls: CustomControl[];
  syncNotifications: SyncNotification[];
  stats: ComplianceStats;
  frameworkProgress: FrameworkProgress[];
  answerControl: (controlId: string, answer: 'yes' | 'no' | 'partial' | 'na') => Promise<void>;
  updateRemediation: (controlId: string, plan: string) => void;
  addEvidence: (controlId: string, notes: string) => Promise<Evidence | null>;
  updateEvidence: (evidenceId: string, updates: Partial<Evidence>) => Promise<void>;
  uploadFile: (controlId: string, file: File) => Promise<string | null>;
  addCustomControl: (control: Partial<CustomControl>) => Promise<CustomControl | null>;
  deleteCustomControl: (controlId: string) => Promise<void>;
  getResponse: (controlId: string) => ControlResponse | undefined;
  getEvidenceByControlId: (controlId: string) => Evidence | undefined;
  refreshData: () => Promise<void>;
  migrateLocalData: () => Promise<void>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FRAMEWORKS = [
  { id: 'SOC2', name: 'SOC 2', color: '#3b82f6' },
  { id: 'ISO27001', name: 'ISO 27001', color: '#10b981' },
  { id: 'HIPAA', name: 'HIPAA', color: '#f59e0b' },
  { id: 'NIST', name: 'NIST CSF', color: '#8b5cf6' },
];

// ============================================================================
// HOOK
// ============================================================================

export function useComplianceWithSupabase(): UseComplianceWithSupabaseReturn {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [responses, setResponses] = useState<Map<string, ControlResponse>>(new Map());
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [customControls, setCustomControls] = useState<CustomControl[]>([]);
  const [syncNotifications, setSyncNotifications] = useState<SyncNotification[]>([]);
  const [totalControls, setTotalControls] = useState(236);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize when user is available
  useEffect(() => {
    if (user) {
      const orgId = user.user_metadata?.organization_id;
      if (orgId) {
        complianceDb.setContext(orgId, user.id);
        loadData();
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    if (!complianceDb.isAvailable()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [userResponses, evidenceRecords, customCtls, notifications, masterControls] = await Promise.all([
        complianceDb.getUserResponses(),
        complianceDb.getEvidenceRecords(),
        complianceDb.getCustomControls(),
        complianceDb.getSyncNotifications(),
        complianceDb.getMasterControls(),
      ]);

      // Convert responses to Map
      const responsesMap = new Map<string, ControlResponse>();
      userResponses.forEach(r => {
        responsesMap.set(r.control_id, {
          controlId: r.control_id,
          answer: r.answer,
          evidenceId: r.file_url,
          remediationPlan: r.remediation_plan,
          answeredAt: r.answered_at,
        });
      });
      setResponses(responsesMap);

      // Convert evidence
      const evidenceList: Evidence[] = evidenceRecords.map(e => ({
        id: e.evidence_id,
        controlId: e.control_id,
        notes: e.notes,
        status: e.status === 'approved' ? 'final' : e.status === 'review' ? 'review' : 'draft',
        fileUrls: e.file_urls,
        createdAt: e.created_at,
      }));
      setEvidence(evidenceList);

      setCustomControls(customCtls);

      // Convert notifications with proper typing
      const notifList: SyncNotification[] = notifications.map((n: DbSyncNotification) => ({
        id: n.id,
        controlId: n.control_id,
        controlTitle: n.control_title,
        frameworkId: n.framework_id,
        clauseId: n.clause_id,
        clauseTitle: n.clause_title,
        timestamp: n.created_at,
      }));
      setSyncNotifications(notifList);

      setTotalControls(masterControls.length || 236);

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Computed stats
  const stats = useMemo((): ComplianceStats => {
    const answeredControls = responses.size;
    const compliantControls = Array.from(responses.values()).filter(r => r.answer === 'yes').length;
    const gapControls = Array.from(responses.values()).filter(r => r.answer === 'no').length;
    const partialControls = Array.from(responses.values()).filter(r => r.answer === 'partial').length;
    
    return {
      totalControls,
      answeredControls,
      compliantControls,
      gapControls,
      partialControls,
      remainingControls: totalControls - answeredControls,
      assessmentPercentage: totalControls > 0 ? Math.round((answeredControls / totalControls) * 100) : 0,
    };
  }, [responses, totalControls]);

  const frameworkProgress = useMemo((): FrameworkProgress[] => {
    return FRAMEWORKS.map(fw => {
      const compliantCount = stats.compliantControls;
      const estimatedTotal = Math.ceil(totalControls * 0.7);
      const percentage = estimatedTotal > 0 ? Math.round((compliantCount / estimatedTotal) * 100) : 0;
      
      return {
        id: fw.id,
        name: fw.name,
        color: fw.color,
        total: estimatedTotal,
        completed: compliantCount,
        percentage: Math.min(percentage, 100),
      };
    });
  }, [stats, totalControls]);

  // Answer a control with optimistic update
  const answerControl = useCallback(async (
    controlId: string,
    answer: 'yes' | 'no' | 'partial' | 'na'
  ): Promise<void> => {
    const newResponse: ControlResponse = {
      controlId,
      answer,
      evidenceId: null,
      remediationPlan: '',
      answeredAt: new Date().toISOString(),
    };

    // Optimistic update
    setResponses(prev => {
      const next = new Map(prev);
      next.set(controlId, newResponse);
      return next;
    });

    // Create sync notifications for "yes" answers
    if (answer === 'yes') {
      const mappings = await complianceDb.getControlMappings(controlId);
      const newNotifications: SyncNotification[] = mappings.map(m => ({
        id: `${controlId}-${m.framework_id}-${m.clause_id}-${Date.now()}`,
        controlId,
        controlTitle: controlId,
        frameworkId: m.framework_id,
        clauseId: m.clause_id,
        clauseTitle: '',
        timestamp: new Date().toISOString(),
      }));

      setSyncNotifications(prev => [...newNotifications, ...prev]);

      for (const m of mappings) {
        await complianceDb.createSyncNotification(controlId, controlId, m.framework_id, m.clause_id, '');
      }
    }

    // Background sync
    await complianceDb.saveUserResponse({
      control_id: controlId,
      answer,
      evidence_note: '',
      remediation_plan: '',
      status: 'complete',
    });
  }, []);

  const updateRemediation = useCallback((controlId: string, plan: string) => {
    setResponses(prev => {
      const next = new Map(prev);
      const existing = next.get(controlId);
      if (existing) {
        next.set(controlId, { ...existing, remediationPlan: plan });
      }
      return next;
    });

    complianceDb.saveUserResponse({
      control_id: controlId,
      remediation_plan: plan,
    });
  }, []);

  const addEvidence = useCallback(async (controlId: string, notes: string): Promise<Evidence | null> => {
    const result = await complianceDb.saveEvidenceRecord({
      control_id: controlId,
      notes,
      status: 'draft',
    });

    if (result) {
      const newEvidence: Evidence = {
        id: result.evidence_id,
        controlId: result.control_id,
        notes: result.notes,
        status: 'draft',
        fileUrls: result.file_urls,
        createdAt: result.created_at,
      };

      setEvidence(prev => [newEvidence, ...prev]);
      return newEvidence;
    }

    return null;
  }, []);

  const updateEvidence = useCallback(async (evidenceId: string, updates: Partial<Evidence>): Promise<void> => {
    setEvidence(prev => prev.map(e => e.id === evidenceId ? { ...e, ...updates } : e));

    if (updates.status) {
      await complianceDb.updateEvidenceStatus(
        evidenceId,
        updates.status === 'final' ? 'approved' : updates.status
      );
    }
  }, []);

  const uploadFile = useCallback(async (controlId: string, file: File): Promise<string | null> => {
    const result = await complianceDb.uploadEvidenceFile(file, controlId);
    return result?.url || null;
  }, []);

  const addCustomControl = useCallback(async (control: Partial<CustomControl>): Promise<CustomControl | null> => {
    const result = await complianceDb.saveCustomControl(control);

    if (result) {
      setCustomControls(prev => [result, ...prev]);
      return result;
    }

    return null;
  }, []);

  const deleteCustomControl = useCallback(async (controlId: string): Promise<void> => {
    const success = await complianceDb.deleteCustomControl(controlId);

    if (success) {
      setCustomControls(prev => prev.filter(c => c.id !== controlId));
    }
  }, []);

  const getResponse = useCallback((controlId: string): ControlResponse | undefined => {
    return responses.get(controlId);
  }, [responses]);

  const getEvidenceByControlId = useCallback((controlId: string): Evidence | undefined => {
    return evidence.find(e => e.controlId === controlId);
  }, [evidence]);

  const migrateLocalData = useCallback(async (): Promise<void> => {
    const localResponses = localStorage.getItem('compliance-responses');
    const localEvidence = localStorage.getItem('compliance-evidence');
    const localCustomControls = localStorage.getItem('compliance-custom-controls');

    if (!localResponses && !localEvidence && !localCustomControls) {
      return;
    }

    try {
      const responsesData = localResponses ? JSON.parse(localResponses) : {};
      const evidenceData = localEvidence ? JSON.parse(localEvidence) : [];
      const customControlsData = localCustomControls ? JSON.parse(localCustomControls) : [];

      const responsesMap = new Map<string, { answer?: string; notes?: string; remediationPlan?: string }>(
        Object.entries(responsesData)
      );

      await complianceDb.migrateFromLocalStorage({
        responses: responsesMap,
        evidence: evidenceData,
        customControls: customControlsData,
      });

      localStorage.removeItem('compliance-responses');
      localStorage.removeItem('compliance-evidence');
      localStorage.removeItem('compliance-custom-controls');

      await loadData();
    } catch (err) {
      console.error('Migration error:', err);
    }
  }, [loadData]);

  return {
    loading,
    error,
    isOnline,
    responses,
    evidence,
    customControls,
    syncNotifications,
    stats,
    frameworkProgress,
    answerControl,
    updateRemediation,
    addEvidence,
    updateEvidence,
    uploadFile,
    addCustomControl,
    deleteCustomControl,
    getResponse,
    getEvidenceByControlId,
    refreshData,
    migrateLocalData,
  };
}

export type { CustomControl };
