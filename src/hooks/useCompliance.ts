/**
 * useCompliance Hook
 *
 * Centralized state management for the Compliance Engine.
 * Supports both localStorage (offline) and Supabase (online) persistence.
 *
 * Data Models:
 * - ControlResponse: User answers with unique evidence IDs
 * - CustomControl: Organization-specific controls
 * - EvidenceRecord: Documentation for audit preparation
 * - FrameworkMapping: Cross-framework requirement mappings
 *
 * Every "Yes" answer generates a unique EvidenceID (UUID v4 format)
 *
 * Supabase Integration:
 * - When Supabase is configured and user is authenticated, data syncs to cloud
 * - Falls back to localStorage when offline or Supabase unavailable
 * - Maintains full offline functionality
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { complianceDb } from '../services/compliance-database.service';
import { evidenceRepository } from '../services/evidence-repository.service';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';
import {
  getOrgStorageKeys,
  migrateLocalStorage,
  needsMigration,
  hasLegacyData,
} from '../utils/storageMigration';
import {
  MASTER_CONTROLS,
  COMPLIANCE_DOMAINS,
  FRAMEWORKS,
  getControlsByDomain,
  calculateFrameworkProgress,
  type MasterControl,
  type ComplianceDomain,
  type ComplianceDomainMeta,
  type FrameworkId,
  type UserResponse,
} from '../constants/controls';

// ============================================================================
// UUID GENERATOR (PostgreSQL-compatible)
// ============================================================================

const generateUUID = (): string => {
  // RFC 4122 v4 UUID format - compatible with PostgreSQL uuid type
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const generateEvidenceId = (): string => `EVD-${generateUUID()}`;
const generateControlId = (): string => `CTRL-${generateUUID().slice(0, 8).toUpperCase()}`;

// ============================================================================
// DATA MODELS (PostgreSQL-ready schema)
// ============================================================================

/**
 * Control Response - Maps to `control_responses` table
 * Primary Key: id (UUID)
 * Foreign Keys: control_id -> controls, evidence_id -> evidence_records
 */
export interface ControlResponse {
  id: string;                                    // UUID - Primary Key
  controlId: string;                             // FK -> controls.id
  answer: 'yes' | 'no' | 'partial' | 'na' | null;
  evidenceId: string | null;                     // FK -> evidence_records.id (only for 'yes')
  remediationPlan: string;                       // Text for 'no' answers
  answeredAt: string;                            // ISO timestamp — first-ever answer (stable)
  /**
   * Last time the user re-reviewed or changed this answer. Distinct from
   * `answeredAt` so auditors can see both "first assessed" and "last reviewed"
   * and so stale-answer detection can target real dormancy (>90 days).
   */
  lastReviewedAt: string;                        // ISO timestamp
  answeredBy: string | null;                     // User ID — null when unauthenticated
  updatedAt: string;                             // ISO timestamp
}

/**
 * Evidence Record - Maps to `evidence_records` table
 * Primary Key: id (UUID)
 * Foreign Keys: control_response_id -> control_responses
 */
export interface EvidenceRecord {
  id: string;                                    // UUID - Primary Key (EvidenceID)
  controlResponseId: string;                     // FK -> control_responses.id
  controlId: string;                             // Denormalized for quick lookup
  notes: string;                                 // Evidence documentation
  status: 'draft' | 'review' | 'final';          // Workflow status
  fileUrls: string[];                            // Array of file URLs (S3/storage)
  createdAt: string;                             // ISO timestamp
  updatedAt: string;                             // ISO timestamp
  reviewedBy: string | null;                     // User ID for reviewer
  approvedAt: string | null;                     // ISO timestamp for approval
}

/**
 * Custom Control - Maps to `custom_controls` table
 * Primary Key: id (UUID)
 * Foreign Keys: organization_id -> organizations (future)
 */
export interface CustomControl {
  id: string;                                    // UUID - Primary Key
  title: string;
  description: string;
  question: string;
  category: string;                              // Domain category
  frameworkMappings: FrameworkMappingRecord[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  isActive: boolean;
}

/**
 * Framework Mapping Record - Maps to `framework_mappings` table
 * Primary Key: id (UUID)
 * Foreign Keys: control_id -> controls OR custom_control_id -> custom_controls
 */
export interface FrameworkMappingRecord {
  id: string;                                    // UUID - Primary Key
  frameworkId: FrameworkId;
  clauseId: string;
  clauseTitle: string;
  controlId: string | null;                      // FK -> controls.id (for master controls)
  customControlId: string | null;                // FK -> custom_controls.id (for custom)
}

/**
 * Sync Notification - Maps to `sync_notifications` table (for audit log)
 */
export interface SyncNotification {
  id: string;
  controlId: string;
  controlTitle: string;
  frameworkId: FrameworkId;
  clauseId: string;
  clauseTitle: string;
  timestamp: number;
  userId: string;
}

/**
 * Answer-change event. Records every transition of a control's answer so the
 * Changes/Delta view can show "what moved since the last audit cycle" —
 * including regressions (yes → no), new gaps, and new attestations.
 *
 * Stored locally (and best-effort synced); capped at ANSWER_HISTORY_MAX to
 * keep localStorage size bounded on long-running installations.
 */
export interface AnswerHistoryEvent {
  id: string;
  controlId: string;
  controlTitle: string;
  from: 'yes' | 'no' | 'partial' | 'na' | null;
  to: 'yes' | 'no' | 'partial' | 'na';
  at: string; // ISO timestamp
  userId: string | null;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  /** True when an existing answer changed to a different value (re-assessment). */
  isChange: boolean;
  /** True when this transition represents a compliance regression (yes → no/partial). */
  isRegression: boolean;
}

/**
 * Compliance State - Complete application state
 */
export interface ComplianceState {
  responses: Map<string, ControlResponse>;
  evidence: Map<string, EvidenceRecord>;
  customControls: CustomControl[];
  syncNotifications: SyncNotification[];
  answerHistory: AnswerHistoryEvent[];
  darkMode: boolean;
  isLoading: boolean;
  lastSyncedAt: string | null;
}

const ANSWER_HISTORY_MAX = 500;

/**
 * Framework Progress - Computed statistics.
 *
 * Scoring model (unified with DomainProgress):
 *   - compliant   = yes + na
 *   - assessed    = yes + no + partial + na
 *   - progressed  = yes + na + partial
 *   - percentage  = compliant / total (0 when total === 0; check `isEmpty`)
 */
export interface FrameworkProgress {
  id: FrameworkId;
  name: string;
  color: string;
  total: number;
  /** @deprecated use `compliant`; kept for back-compat. */
  completed: number;
  /** Compliant / total, rounded. 0 when total is 0 — check `isEmpty` first. */
  percentage: number;
  assessedPct: number;
  progressedPct: number;
  assessed: number;
  compliant: number;
  progressed: number;
  gaps: number;
  partial: number;
  /** True when this framework has zero mapped controls — render "N/A". */
  isEmpty: boolean;
}

/**
 * Domain Progress - Computed statistics. Same scoring model as FrameworkProgress.
 */
export interface DomainProgress {
  id: string;
  title: string;
  color: string;
  total: number;
  /** @deprecated use `assessed`; kept for back-compat. */
  answered: number;
  assessed: number;
  compliant: number;
  progressed: number;
  partial: number;
  gaps: number;
  /** Compliant / total, rounded. 0 when total is 0 — check `isEmpty` first. */
  percentage: number;
  assessedPct: number;
  progressedPct: number;
  isEmpty: boolean;
}

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

// Legacy storage keys (for backwards compatibility during migration)
const LEGACY_STORAGE_KEYS = {
  RESPONSES: 'attestai-responses',
  EVIDENCE: 'attestai-evidence',
  CUSTOM_CONTROLS: 'attestai-custom-controls',
  DARK_MODE: 'attestai-dark-mode',
  LAST_SYNCED: 'attestai-last-synced',
} as const;

// Get storage keys for an organization (or use legacy keys if no org)
function getStorageKeys(organizationId?: string | null) {
  if (organizationId) {
    return getOrgStorageKeys(organizationId);
  }
  // Fallback to legacy keys
  return {
    RESPONSES: LEGACY_STORAGE_KEYS.RESPONSES,
    EVIDENCE: LEGACY_STORAGE_KEYS.EVIDENCE,
    CUSTOM_CONTROLS: LEGACY_STORAGE_KEYS.CUSTOM_CONTROLS,
    ATTESTATIONS: 'attestai-attestations',
    IR_INCIDENTS: 'attestai-ir-incidents',
    IR_ESCALATION_PATHS: 'attestai-ir-escalation-paths',
    IR_PLAYBOOKS: 'attestai-ir-playbooks',
    IR_CONTACTS: 'attestai-ir-contacts',
    IR_COMMUNICATION_LOG: 'attestai-ir-communication-log',
    VENDORS: 'attestai-vendors',
    SETTINGS: 'attestai-settings',
    LAST_REPORT: 'attestai-last-report',
    LAST_SYNCED: 'attestai-last-synced',
  };
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save to localStorage: ${key}`, error);
  }
}

// ============================================================================
// COMPANY SPECIFIC DOMAIN
// ============================================================================

export const COMPANY_DOMAIN: ComplianceDomainMeta = {
  id: 'company_specific' as unknown as ComplianceDomain,
  title: 'Company Specific',
  description: 'Custom controls created by your organization',
  color: '#8B5CF6',
  icon: 'briefcase',
};

// ============================================================================
// useCompliance HOOK
// ============================================================================

export interface UseComplianceReturn {
  // State
  state: ComplianceState;

  // Master Controls
  masterControls: MasterControl[];
  allControls: MasterControl[];
  getControlsByDomain: (domainId: string) => MasterControl[];
  getControlById: (controlId: string) => MasterControl | undefined;

  // Control Responses
  answerControl: (controlId: string, answer: 'yes' | 'no' | 'partial' | 'na') => void;
  getResponse: (controlId: string) => ControlResponse | undefined;
  updateRemediation: (controlId: string, plan: string) => void;

  // Evidence Management
  getEvidence: (evidenceId: string) => EvidenceRecord | undefined;
  getEvidenceByControlId: (controlId: string) => EvidenceRecord | undefined;
  updateEvidence: (evidenceId: string, updates: Partial<EvidenceRecord>) => void;
  getAllEvidence: () => EvidenceRecord[];
  getEvidenceFileCounts: (controlId: string) => { evidenceCount: number; fileCount: number; hasFiles: boolean } | undefined;
  evidenceFileCounts: Record<string, { evidenceCount: number; fileCount: number; hasFiles: boolean }>;
  refreshEvidenceCounts: () => Promise<void>;
  /**
   * True only when the "yes" attestation is backed by at least one uploaded
   * file (either on the local EvidenceRecord or the server-side Evidence
   * Repository count). UI: show an "Unverified" badge otherwise.
   */
  isEvidenceVerified: (controlId: string) => boolean;
  
  // Custom Controls
  customControls: CustomControl[];
  addCustomControl: (control: Omit<CustomControl, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) => CustomControl;
  updateCustomControl: (id: string, updates: Partial<CustomControl>) => void;
  deleteCustomControl: (id: string) => void;
  
  // Framework & Domain Progress
  frameworkProgress: FrameworkProgress[];
  domainProgress: DomainProgress[];
  allDomains: ComplianceDomainMeta[];
  
  // Sync Notifications
  syncNotifications: SyncNotification[];
  clearNotifications: () => void;

  // Answer change history — powers the Changes / Delta view.
  answerHistory: AnswerHistoryEvent[];
  clearAnswerHistory: () => void;
  
  // UI State
  toggleDarkMode: () => void;
  
  // Statistics
  stats: {
    totalControls: number;
    answeredControls: number;
    compliantControls: number;
    gapControls: number;
    partialControls: number;
    remainingControls: number;
    /** Answered / total — how much of the assessment is filled in. */
    assessmentPercentage: number;
    /** Compliant (yes + na) / total — audit-ready ratio. */
    compliancePercentage: number;
  };
  
  // Critical Gaps (for Action Required)
  criticalGaps: MasterControl[];
  
  // Database Sync (placeholder for PostgreSQL integration)
  syncToDatabase: () => Promise<void>;
  loadFromDatabase: () => Promise<void>;

  // Exposed to UI so users see when a load/sync fails instead of silently
  // assuming empty state means empty data.
  loadError: string | null;
  clearLoadError: () => void;

  /** True when the browser has a network connection. Drives offline banner. */
  isOnline: boolean;
}

export interface UseComplianceOptions {
  organizationId?: string | null;
}

export function useCompliance(options: UseComplianceOptions = {}): UseComplianceReturn {
  const { organizationId } = options;

  // Get storage keys based on organization
  const storageKeys = useMemo(() => getStorageKeys(organizationId), [organizationId]);

  // ============================================================================
  // STATE INITIALIZATION
  // ============================================================================

  const [responsesObj, setResponsesObj] = useState<Record<string, ControlResponse>>(() =>
    loadFromStorage(storageKeys.RESPONSES, {})
  );

  const [evidenceObj, setEvidenceObj] = useState<Record<string, EvidenceRecord>>(() =>
    loadFromStorage(storageKeys.EVIDENCE, {})
  );

  const [customControls, setCustomControls] = useState<CustomControl[]>(() =>
    loadFromStorage(storageKeys.CUSTOM_CONTROLS, [])
  );

  const [darkMode, setDarkMode] = useState<boolean>(() =>
    loadFromStorage(LEGACY_STORAGE_KEYS.DARK_MODE, true) // Dark mode is global, not org-specific
  );

  const [syncNotifications, setSyncNotifications] = useState<SyncNotification[]>([]);
  const [answerHistory, setAnswerHistory] = useState<AnswerHistoryEvent[]>(() => {
    // Keyed by organization so multi-tenant installs don't leak history
    // across orgs. Stored under ATTESTATIONS (legacy key bucket) namespace.
    const key = organizationId ? `attestai-answer-history-${organizationId}` : 'attestai-answer-history';
    return loadFromStorage<AnswerHistoryEvent[]>(key, []);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() =>
    loadFromStorage(LEGACY_STORAGE_KEYS.LAST_SYNCED, null)
  );

  // Monotonic id incremented on each loadFromSupabase invocation (and on
  // unmount). Lets us drop setState work from a stale load when the user
  // switches orgs mid-fetch or navigates away.
  const loadIdRef = useRef(0);
  useEffect(() => {
    return () => {
      // Monotonic counter — invalidating any in-flight load is the whole
      // point; the ref SHOULD be live at cleanup time.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      loadIdRef.current++;
    };
  }, []);

  // Track if migration has been attempted
  const [migrationAttempted, setMigrationAttempted] = useState(false);

  // Supabase integration state
  const [supabaseUser, setSupabaseUser] = useState<{ id: string; organization_id?: string } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Evidence file counts for UI indicators (using plain object for React reactivity)
  const [evidenceFileCountsObj, setEvidenceFileCountsObj] = useState<Record<string, { evidenceCount: number; fileCount: number; hasFiles: boolean }>>({});

  // ============================================================================
  // SUPABASE AUTHENTICATION LISTENER
  // ============================================================================

  const { user } = useAuth();

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    if (user) {
      const orgId = organizationId || undefined;
      setSupabaseUser({ id: user.id, organization_id: orgId });
      if (orgId) {
        complianceDb.setContext(orgId, user.id);
        evidenceRepository.setContext(orgId, user.id);
      }
    } else {
      setSupabaseUser(null);
    }
  }, [user, organizationId]);

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

  // Load data from Supabase when user/org/online-status changes.
  // loadFromSupabase is a useCallback below and manages its own staleness
  // via loadIdRef, so adding it to deps would cause a redundant double-load.
  useEffect(() => {
    const effectiveOrgId = organizationId || supabaseUser?.organization_id;
    if (effectiveOrgId && isOnline && complianceDb.isAvailable()) {
      loadFromSupabase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, supabaseUser?.organization_id, isOnline]);

  // Load evidence file counts separately (ensures they're loaded even if evidence sync is skipped)
  useEffect(() => {
    const loadCounts = async () => {
      if (!evidenceRepository.isAvailable() || !organizationId) return;

      try {
        const counts = await evidenceRepository.getEvidenceCountsByControl();

        // Convert Map to plain object for React reactivity
        const countsObj: Record<string, { evidenceCount: number; fileCount: number; hasFiles: boolean }> = {};
        counts.forEach((value, key) => {
          countsObj[key] = value;
        });
        setEvidenceFileCountsObj(countsObj);

        // Debug: show breakdown of counts and sample control IDs
        let withFiles = 0;
        let withoutFiles = 0;
        let totalFiles = 0;
        const sampleControlIds: string[] = [];
        counts.forEach((count, controlId) => {
          if (sampleControlIds.length < 5) {
            sampleControlIds.push(controlId);
          }
          if (count.hasFiles) {
            withFiles++;
            totalFiles += count.fileCount;
          } else {
            withoutFiles++;
          }
        });
        console.log(`[Evidence Counts] Loaded: ${counts.size} controls total, ${withFiles} with files (${totalFiles} files), ${withoutFiles} without files`);
        console.log(`[Evidence Counts] Sample control IDs from DB:`, sampleControlIds);
      } catch (err) {
        console.error('[Evidence Counts] Initial load failed:', err);
      }
    };

    loadCounts();
  }, [organizationId]);

  // ============================================================================
  // SUPABASE DATA LOADING
  // ============================================================================

  const loadFromSupabase = useCallback(async () => {
    if (!complianceDb.isAvailable()) return;

    const loadId = ++loadIdRef.current;
    const isStale = () => loadId !== loadIdRef.current;

    setIsLoading(true);
    setLoadError(null);
    try {
      const [userResponses, evidenceRecords, customCtls, notifications] = await Promise.all([
        complianceDb.getUserResponses(),
        complianceDb.getEvidenceRecords(),
        complianceDb.getCustomControls(),
        complianceDb.getSyncNotifications(),
      ]);

      if (isStale()) return;

      // Convert Supabase responses to local format
      const responsesFromDb: Record<string, ControlResponse> = {};
      userResponses.forEach((r: {
        id?: string;
        control_id: string;
        answer: 'yes' | 'no' | 'partial' | 'na' | null;
        file_url?: string | null;
        remediation_plan?: string;
        answered_at: string;
        user_id?: string;
        updated_at?: string;
      }) => {
        responsesFromDb[r.control_id] = {
          id: r.id || generateUUID(),
          controlId: r.control_id,
          answer: r.answer,
          evidenceId: r.file_url || null,
          remediationPlan: r.remediation_plan || '',
          answeredAt: r.answered_at,
          lastReviewedAt: r.updated_at || r.answered_at,
          answeredBy: r.user_id || null,
          updatedAt: r.updated_at || r.answered_at,
        };
      });

      // Merge with local data. Local wins if its updatedAt is newer than the
      // remote copy (handles offline edits). When a true conflict exists —
      // both sides have a response with DIFFERENT answers — we emit a
      // conflict notification so the user isn't silently overwritten.
      setResponsesObj(prev => {
        const merged = { ...responsesFromDb };
        const conflicts: SyncNotification[] = [];
        Object.keys(prev).forEach(key => {
          const remote = merged[key];
          const local = prev[key];
          const localNewer =
            !remote || new Date(local.updatedAt) > new Date(remote.updatedAt || 0);
          if (localNewer) {
            if (remote && remote.answer !== local.answer) {
              // Surface collision to the user via the sync log.
              conflicts.push({
                id: generateUUID(),
                controlId: key,
                controlTitle: `Conflict: local "${local.answer ?? 'none'}" kept over remote "${remote.answer ?? 'none'}"`,
                frameworkId: 'SOC2',
                clauseId: '__conflict__',
                clauseTitle: 'Sync conflict resolved — local wins',
                timestamp: Date.now(),
                userId: local.answeredBy || 'system',
              });
            }
            merged[key] = local;
          }
        });
        if (conflicts.length > 0) {
          // Keep 50 most recent notifications regardless of source.
          setSyncNotifications(current => [...conflicts, ...current].slice(0, 50));
          console.warn(`[Sync] ${conflicts.length} conflict(s) resolved by keeping local answers. See sync log.`);
        }
        return merged;
      });

      // Convert evidence records
      const evidenceFromDb: Record<string, EvidenceRecord> = {};
      evidenceRecords.forEach(e => {
        evidenceFromDb[e.evidence_id] = {
          id: e.evidence_id,
          controlResponseId: '',
          controlId: e.control_id,
          notes: e.notes || '',
          status: e.status === 'approved' ? 'final' : e.status === 'review' ? 'review' : 'draft',
          fileUrls: e.file_urls || [],
          createdAt: e.created_at,
          updatedAt: e.created_at,
          reviewedBy: null,
          approvedAt: null,
        };
      });

      setEvidenceObj(prev => ({ ...evidenceFromDb, ...prev }));

      // Convert custom controls from Supabase (snake_case) to local format (camelCase)
      if (customCtls.length > 0) {
        const convertedCustom: CustomControl[] = customCtls.map((c: {
          id: string;
          title: string;
          description: string;
          question?: string;
          domain?: string;
          risk_level?: 'low' | 'medium' | 'high' | 'critical';
          created_by?: string;
          is_active?: boolean;
          framework_mappings?: Array<{
            id?: string;
            framework_id: string;
            clause_id: string;
            clause_title: string;
          }>;
        }) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          question: c.question || `Is ${c.title} implemented?`,
          category: c.domain || 'company_specific',
          frameworkMappings: (c.framework_mappings || []).map(m => ({
            id: m.id || generateUUID(),
            frameworkId: m.framework_id as FrameworkId,
            clauseId: m.clause_id || '',
            clauseTitle: m.clause_title || '',
            controlId: null,
            customControlId: c.id,
          })),
          riskLevel: c.risk_level || 'medium',
          createdAt: new Date().toISOString(),
          createdBy: c.created_by || 'current-user',
          updatedAt: new Date().toISOString(),
          isActive: c.is_active !== false,
        }));
        setCustomControls(prev => {
          const existingIds = new Set(prev.map(ctrl => ctrl.id));
          const newControls = convertedCustom.filter(ctrl => !existingIds.has(ctrl.id));
          return [...prev, ...newControls];
        });
      }

      // Convert sync notifications
      if (notifications.length > 0) {
        const convertedNotifs: SyncNotification[] = notifications.map(n => ({
          id: n.id,
          controlId: n.control_id,
          controlTitle: n.control_title,
          frameworkId: n.framework_id as FrameworkId,
          clauseId: n.clause_id,
          clauseTitle: n.clause_title,
          timestamp: new Date(n.created_at).getTime(),
          userId: supabaseUser?.id || 'anonymous',
        }));
        setSyncNotifications(prev => [...convertedNotifs, ...prev].slice(0, 50));
      }

      setLastSyncedAt(new Date().toISOString());

      // Sync existing "yes" answers to Evidence Repository
      // Ensure evidence repository context is set
      const dbOrgId = complianceDb.getOrganizationId();
      const dbUserId = complianceDb.getUserId();

      if (evidenceRepository.isAvailable() && dbOrgId && dbUserId) {
        if (isStale()) return;
        evidenceRepository.setContext(dbOrgId, dbUserId);
        const yesResponses = Object.values(responsesFromDb).filter(r => r.answer === 'yes');
        console.log(`[Evidence Sync] Found ${yesResponses.length} "yes" responses to sync`);
        console.log(`[Evidence Sync] OrgId: ${dbOrgId}, UserId: ${dbUserId}`);

        let created = 0;
        let skipped = 0;
        let failed = 0;

        for (const response of yesResponses) {
          const control = allControls.find(c => c.id === response.controlId);
          if (!control) {
            console.log(`[Evidence Sync] Control not found: ${response.controlId}`);
            skipped++;
            continue;
          }

          try {
            // Check if evidence already exists for this control
            const existingEvidence = await evidenceRepository.getEvidenceForControl(response.controlId);
            console.log(`[Evidence Sync] Control ${response.controlId}: ${existingEvidence.length} existing evidence items`);

            if (existingEvidence.length === 0) {
              const result = await evidenceRepository.createEvidence({
                controlId: response.controlId,
                title: `${control.title} - Compliance Evidence`,
                description: `Evidence supporting compliance with control ${response.controlId}: ${control.title}`,
                type: 'assessment',
                source: 'manual',
                tags: ['auto-generated', 'assessment'],
                frameworkMappings: control.frameworkMappings.map(m => m.frameworkId),
              });
              if (!result.success) {
                console.error(`[Evidence Sync] Failed to create evidence for ${response.controlId}:`, result.error);
                failed++;
              } else {
                console.log(`[Evidence Sync] Created evidence for ${response.controlId}`);
                created++;
              }
            } else {
              skipped++;
            }
          } catch (err) {
            console.error(`[Evidence Sync] Exception for ${response.controlId}:`, err);
            failed++;
          }
        }

        console.log(`[Evidence Sync] Complete: ${created} created, ${skipped} skipped, ${failed} failed`);

        // Load evidence file counts for UI indicators
        const counts = await evidenceRepository.getEvidenceCountsByControl();
        if (isStale()) return;
        const countsObj: Record<string, { evidenceCount: number; fileCount: number; hasFiles: boolean }> = {};
        counts.forEach((value, key) => {
          countsObj[key] = value;
        });
        setEvidenceFileCountsObj(countsObj);
        console.log(`[Evidence Counts] Loaded counts for ${counts.size} controls`);
      } else {
        console.log('[Evidence Sync] Evidence repository not available or missing context:', {
          isAvailable: evidenceRepository.isAvailable(),
          hasOrgId: !!dbOrgId,
          hasUserId: !!dbUserId,
        });
      }
    } catch (error) {
      if (isStale()) return;
      console.error('Error loading from Supabase:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load compliance data');
    } finally {
      if (!isStale()) setIsLoading(false);
    }
    // Known stale-closure: `allControls` and `supabaseUser?.id` are captured
    // at definition time. Adding them to deps would re-create the callback
    // on every control edit, triggering the effect above to re-fire. The
    // load path reads these via the latest org context instead, which is
    // acceptable for the one-time-per-org sync this is meant to do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // MIGRATION EFFECT
  // ============================================================================

  // Migrate legacy data to org-specific keys when organizationId is available
  useEffect(() => {
    if (!organizationId || migrationAttempted) return;

    const runMigration = async () => {
      if (needsMigration(organizationId) && hasLegacyData()) {
        console.log('Migrating legacy storage data to org-specific keys...');
        const result = await migrateLocalStorage(organizationId);
        if (result.success && result.migratedKeys.length > 0) {
          console.log(`Migrated ${result.migratedKeys.length} storage keys`);
          // Reload data from new keys
          setResponsesObj(loadFromStorage(storageKeys.RESPONSES, {}));
          setEvidenceObj(loadFromStorage(storageKeys.EVIDENCE, {}));
          setCustomControls(loadFromStorage(storageKeys.CUSTOM_CONTROLS, []));
        }
      }
      setMigrationAttempted(true);
    };

    runMigration();
  }, [organizationId, migrationAttempted, storageKeys]);

  // Reload data when organization changes
  useEffect(() => {
    if (organizationId && migrationAttempted) {
      setResponsesObj(loadFromStorage(storageKeys.RESPONSES, {}));
      setEvidenceObj(loadFromStorage(storageKeys.EVIDENCE, {}));
      setCustomControls(loadFromStorage(storageKeys.CUSTOM_CONTROLS, []));
    }
  }, [organizationId, storageKeys, migrationAttempted]);

  // ============================================================================
  // PERSISTENCE EFFECTS
  // ============================================================================

  useEffect(() => {
    saveToStorage(storageKeys.RESPONSES, responsesObj);
  }, [responsesObj, storageKeys.RESPONSES]);

  useEffect(() => {
    saveToStorage(storageKeys.EVIDENCE, evidenceObj);
  }, [evidenceObj, storageKeys.EVIDENCE]);

  useEffect(() => {
    saveToStorage(storageKeys.CUSTOM_CONTROLS, customControls);
  }, [customControls, storageKeys.CUSTOM_CONTROLS]);

  useEffect(() => {
    saveToStorage(LEGACY_STORAGE_KEYS.DARK_MODE, darkMode); // Dark mode is global
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Answer-history persistence. Scoped per-org so multi-tenant installs
  // don't cross-pollinate delta views.
  useEffect(() => {
    const key = organizationId ? `attestai-answer-history-${organizationId}` : 'attestai-answer-history';
    saveToStorage(key, answerHistory);
  }, [answerHistory, organizationId]);

  // ============================================================================
  // DERIVED STATE (Memoized)
  // ============================================================================
  
  const responses = useMemo(() => new Map(Object.entries(responsesObj)), [responsesObj]);
  const evidence = useMemo(() => new Map(Object.entries(evidenceObj)), [evidenceObj]);
  
  // Convert custom controls to MasterControl format
  const customAsMaster: MasterControl[] = useMemo(() => 
    customControls.filter(c => c.isActive).map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      question: c.question,
      domain: 'company_specific' as unknown as ComplianceDomain,
      riskLevel: c.riskLevel,
      frameworkMappings: c.frameworkMappings.map(m => ({
        frameworkId: m.frameworkId,
        clauseId: m.clauseId,
        clauseTitle: m.clauseTitle,
      })),
      keywords: [c.title.toLowerCase()],
      guidance: 'Custom control created by your organization.',
      evidenceExamples: ['Internal documentation', 'Policy documents'],
      remediationTip: 'Implement according to organizational standards.',
    })),
  [customControls]);
  
  const allControls = useMemo(() => [...MASTER_CONTROLS, ...customAsMaster], [customAsMaster]);
  
  // All domains including company specific
  const allDomains = useMemo(() => 
    customControls.length > 0 ? [...COMPLIANCE_DOMAINS, COMPANY_DOMAIN] : [...COMPLIANCE_DOMAINS],
  [customControls.length]);

  // Convert ControlResponse to UserResponse format for compatibility with controls.ts functions
  const responsesAsUserResponse = useMemo(() => {
    const map = new Map<string, UserResponse>();
    responses.forEach((r, key) => {
      map.set(key, {
        controlId: r.controlId,
        answer: r.answer,
        notes: r.remediationPlan,
        evidenceUrls: [],
        evidenceNotes: '',
        answeredAt: r.answeredAt,
      });
    });
    return map;
  }, [responses]);

  // ============================================================================
  // FRAMEWORK PROGRESS CALCULATION
  // ============================================================================
  
  const frameworkProgress: FrameworkProgress[] = useMemo(() =>
    FRAMEWORKS.map(fw => {
      const progress = calculateFrameworkProgress(fw.id, responsesAsUserResponse);
      const isEmpty = progress.total === 0;
      return {
        id: fw.id,
        name: fw.name,
        color: fw.color,
        total: progress.total,
        completed: progress.compliant,
        compliant: progress.compliant,
        assessed: progress.assessed,
        progressed: progress.progressed,
        gaps: progress.gaps,
        partial: progress.partial,
        // When a framework has zero mapped controls, surface 0% but set
        // `isEmpty` so UIs can render "N/A" instead of a misleading "0%".
        percentage: progress.percentage ?? 0,
        assessedPct: progress.assessedPct ?? 0,
        progressedPct: progress.progressedPct ?? 0,
        isEmpty,
      };
    }),
  [responsesAsUserResponse]);

  // ============================================================================
  // DOMAIN PROGRESS CALCULATION
  // ============================================================================
  
  const domainProgress: DomainProgress[] = useMemo(() =>
    allDomains.map(domain => {
      const domainControls = (domain.id as string) === 'company_specific'
        ? customAsMaster
        : getControlsByDomain(domain.id);

      let assessed = 0, compliant = 0, partial = 0, gaps = 0;
      for (const c of domainControls) {
        const a = responses.get(c.id)?.answer;
        if (!a) continue;
        assessed++;
        if (a === 'yes' || a === 'na') compliant++;
        else if (a === 'partial') partial++;
        else if (a === 'no') gaps++;
      }
      const total = domainControls.length;
      const progressed = compliant + partial;
      const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

      return {
        id: domain.id as string,
        title: domain.title,
        color: domain.color,
        total,
        // `answered` kept for back-compat; `assessed` is the canonical name.
        answered: assessed,
        assessed,
        compliant,
        progressed,
        partial,
        gaps,
        // Primary score is compliance (not assessment) so domains and
        // frameworks agree on "how compliant is this slice?". UIs that
        // want assessment completion should read `assessedPct`.
        percentage: pct(compliant),
        assessedPct: pct(assessed),
        progressedPct: pct(progressed),
        isEmpty: total === 0,
      };
    }),
  [allDomains, customAsMaster, responses]);

  // ============================================================================
  // STATISTICS
  // ============================================================================

  const stats = useMemo(() => {
    const totalControls = allControls.length;
    // Only count responses for controls that still exist. After a custom
    // control is deleted, its stale response must not leak into counts.
    const activeIds = new Set(allControls.map(c => c.id));
    let answeredControls = 0, compliantControls = 0, gapControls = 0, partialControls = 0;
    responses.forEach((r, key) => {
      if (!activeIds.has(key)) return;
      if (!r.answer) return;
      answeredControls++;
      if (r.answer === 'yes' || r.answer === 'na') compliantControls++;
      else if (r.answer === 'no') gapControls++;
      else if (r.answer === 'partial') partialControls++;
    });
    const remainingControls = Math.max(0, totalControls - answeredControls);
    const assessmentPercentage = totalControls > 0
      ? Math.round((answeredControls / totalControls) * 100)
      : 0;
    const compliancePercentage = totalControls > 0
      ? Math.round((compliantControls / totalControls) * 100)
      : 0;

    return {
      totalControls,
      answeredControls,
      compliantControls,
      gapControls,
      partialControls,
      remainingControls,
      assessmentPercentage,
      compliancePercentage,
    };
  }, [allControls, responses]);

  // ============================================================================
  // CRITICAL GAPS (Action Required)
  // ============================================================================
  
  const criticalGaps = useMemo(() => {
    // `|| 99` handles malformed/undefined riskLevel (orphan or legacy data)
    // by sorting it to the end rather than letting the subtraction return NaN.
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return allControls
      .filter(c => {
        const r = responses.get(c.id);
        return r?.answer === 'no' && (c.riskLevel === 'critical' || c.riskLevel === 'high');
      })
      .sort((a, b) => (order[a.riskLevel] ?? 99) - (order[b.riskLevel] ?? 99))
      .slice(0, 5);
  }, [allControls, responses]);

  // ============================================================================
  // CONTROL RESPONSE ACTIONS
  // ============================================================================
  
  const answerControl = useCallback((controlId: string, answer: 'yes' | 'no' | 'partial' | 'na') => {
    const now = new Date().toISOString();
    const existingResponse = responsesObj[controlId];
    // Reuse the existing evidence id on re-answer so we don't orphan records.
    // A new id is only minted when a control transitions INTO "yes" from
    // another answer.
    const reusedEvidenceId = existingResponse?.evidenceId || null;

    // Generate unique IDs
    const responseId = existingResponse?.id || generateUUID();
    const evidenceId =
      answer === 'yes'
        ? reusedEvidenceId ?? generateEvidenceId()
        : null;

    // Create/update response. `answeredAt` is sticky (first-ever assessment),
    // `lastReviewedAt` refreshes every time the user touches the control —
    // this is what stale-answer detection reads.
    const newResponse: ControlResponse = {
      id: responseId,
      controlId,
      answer,
      evidenceId,
      remediationPlan: existingResponse?.remediationPlan || '',
      answeredAt: existingResponse?.answeredAt || now,
      lastReviewedAt: now,
      answeredBy: supabaseUser?.id || null,
      updatedAt: now,
    };

    setResponsesObj(prev => ({ ...prev, [controlId]: newResponse }));

    // Answer-history recording. Every transition (including first-ever
    // answer) lands in the history log so the Changes view can show
    // regressions, new attestations, and re-assessments. Capped at
    // ANSWER_HISTORY_MAX to keep localStorage bounded.
    const priorAnswer = existingResponse?.answer ?? null;
    if (priorAnswer !== answer) {
      const control = allControls.find(c => c.id === controlId);
      const event: AnswerHistoryEvent = {
        id: generateUUID(),
        controlId,
        controlTitle: control?.title ?? controlId,
        from: priorAnswer,
        to: answer,
        at: now,
        userId: supabaseUser?.id || null,
        riskLevel: control?.riskLevel ?? 'low',
        isChange: priorAnswer !== null,
        // Regression = losing compliance (yes → no|partial). na → anything
        // is NOT a regression since na meant "out of scope" anyway.
        isRegression: priorAnswer === 'yes' && (answer === 'no' || answer === 'partial'),
      };
      setAnswerHistory(prev => [event, ...prev].slice(0, ANSWER_HISTORY_MAX));
    }

    const wasYes = existingResponse?.answer === 'yes';
    const becomesYes = answer === 'yes';

    // Fresh "yes" — either first answer or transitioning from another state.
    // Create a placeholder evidence record and fire sync notifications so
    // the audit log captures the attestation.
    //
    // The placeholder is intentionally UNVERIFIED (`fileUrls: []`). Consumers
    // should use `isEvidenceVerified` to distinguish "user claimed yes" from
    // "auditor-ready evidence attached" before counting it toward reports.
    if (becomesYes && !wasYes && evidenceId) {
      const newEvidence: EvidenceRecord = {
        id: evidenceId,
        controlResponseId: responseId,
        controlId,
        notes: '',
        status: 'draft',
        fileUrls: [],
        createdAt: now,
        updatedAt: now,
        reviewedBy: null,
        approvedAt: null,
      };

      setEvidenceObj(prev => ({ ...prev, [evidenceId]: newEvidence }));

      const control = allControls.find(c => c.id === controlId);
      if (control) {
        const notifications: SyncNotification[] = control.frameworkMappings.map(m => ({
          id: generateUUID(),
          controlId,
          controlTitle: control.title,
          frameworkId: m.frameworkId,
          clauseId: m.clauseId,
          clauseTitle: m.clauseTitle,
          timestamp: Date.now(),
          userId: supabaseUser?.id || 'system',
        }));
        setSyncNotifications(prev => [...notifications, ...prev].slice(0, 50));

        if (complianceDb.isAvailable() && isOnline) {
          notifications.forEach(n => {
            complianceDb.createSyncNotification(
              n.controlId,
              n.controlTitle,
              n.frameworkId,
              n.clauseId,
              n.clauseTitle,
            ).catch(console.error);
          });
        }

        const evidenceOrgId = complianceDb.getOrganizationId();
        const evidenceUserId = complianceDb.getUserId();
        if (evidenceRepository.isAvailable() && isOnline && evidenceOrgId && evidenceUserId) {
          evidenceRepository.setContext(evidenceOrgId, evidenceUserId);
          evidenceRepository.getEvidenceForControl(controlId).then(async existingEvidence => {
            if (existingEvidence.length === 0) {
              const result = await evidenceRepository.createEvidence({
                controlId,
                title: `${control.title} - Compliance Evidence`,
                description: `Evidence supporting compliance with control ${controlId}: ${control.title}. Placeholder — upload supporting files to verify.`,
                type: 'assessment',
                source: 'manual',
                tags: ['auto-generated', 'unverified', 'assessment'],
                frameworkMappings: control.frameworkMappings.map(m => m.frameworkId),
              });
              if (!result.success) {
                console.error(`[Evidence] Failed to create evidence for ${controlId}:`, result.error);
              }
            }
          }).catch(err => console.error('[Evidence] Error checking existing evidence:', err));
        }
      }
    }

    // Downgrade from "yes" — clean up local AND repository evidence so we
    // don't leave orphan "compliance evidence" records referencing a control
    // the user has since flagged as not-implemented. Without this the
    // Evidence Repository would accumulate stale placeholders that auditors
    // could mistake for real attestation.
    if (!becomesYes && wasYes && existingResponse?.evidenceId) {
      const orphanId = existingResponse.evidenceId;
      setEvidenceObj(prev => {
        const { [orphanId]: _, ...rest } = prev;
        return rest;
      });

      if (evidenceRepository.isAvailable() && isOnline) {
        evidenceRepository.getEvidenceForControl(controlId).then(items => {
          // Only delete auto-generated placeholders that have no uploaded
          // files in any version. User-uploaded evidence is preserved —
          // the user may toggle the control while keeping historical
          // artefacts.
          items
            .filter(it => {
              const isPlaceholder = it.tags?.includes('auto-generated');
              const hasFiles = it.versions?.some(v => v.files && v.files.length > 0);
              return isPlaceholder && !hasFiles;
            })
            .forEach(it => {
              evidenceRepository.deleteEvidence(it.id).catch(console.error);
            });
        }).catch(console.error);
      }
    }

    // Sync to Supabase in background
    // Check if database context is properly set before attempting sync
    const dbOrgId = complianceDb.getOrganizationId();
    const dbUserId = complianceDb.getUserId();

    if (complianceDb.isAvailable() && isOnline && dbOrgId && dbUserId) {
      complianceDb.saveUserResponse({
        control_id: controlId,
        answer,
        evidence_note: '',
        remediation_plan: existingResponse?.remediationPlan || '',
        status: 'complete',
      }).then(result => {
        if (!result) {
          console.warn('Supabase sync: saveUserResponse returned null - data saved locally only');
        }
      }).catch(err => {
        console.error('Supabase sync failed:', err);
      });
    } else if (complianceDb.isAvailable() && isOnline) {
      // Supabase is available but context is not set - this is the bug we're fixing
      console.warn('Supabase sync skipped: organization context not set', {
        isAvailable: complianceDb.isAvailable(),
        isOnline,
        organizationId: dbOrgId,
        userId: dbUserId,
      });
    }
  }, [responsesObj, allControls, supabaseUser?.id, isOnline]);

  const getResponse = useCallback((controlId: string): ControlResponse | undefined => {
    return responses.get(controlId);
  }, [responses]);

  const updateRemediation = useCallback((controlId: string, plan: string) => {
    setResponsesObj(prev => {
      if (!prev[controlId]) return prev;
      return {
        ...prev,
        [controlId]: {
          ...prev[controlId],
          remediationPlan: plan,
          updatedAt: new Date().toISOString(),
        },
      };
    });

    // Sync to Supabase in background
    const dbOrgId = complianceDb.getOrganizationId();
    const dbUserId = complianceDb.getUserId();

    if (complianceDb.isAvailable() && isOnline && dbOrgId && dbUserId) {
      complianceDb.saveUserResponse({
        control_id: controlId,
        remediation_plan: plan,
      }).catch(err => {
        console.error('Supabase sync failed (remediation):', err);
      });
    }
  }, [isOnline]);

  // ============================================================================
  // EVIDENCE ACTIONS
  // ============================================================================
  
  const getEvidence = useCallback((evidenceId: string): EvidenceRecord | undefined => {
    return evidence.get(evidenceId);
  }, [evidence]);

  const getEvidenceByControlId = useCallback((controlId: string): EvidenceRecord | undefined => {
    const response = responses.get(controlId);
    if (response?.evidenceId) {
      return evidence.get(response.evidenceId);
    }
    return undefined;
  }, [responses, evidence]);

  const updateEvidence = useCallback((evidenceId: string, updates: Partial<EvidenceRecord>) => {
    setEvidenceObj(prev => {
      if (!prev[evidenceId]) return prev;
      return {
        ...prev,
        [evidenceId]: {
          ...prev[evidenceId],
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      };
    });

    // Sync to Supabase in background
    if (complianceDb.isAvailable() && isOnline && updates.status) {
      const dbStatus = updates.status === 'final' ? 'approved' : updates.status;
      complianceDb.updateEvidenceStatus(evidenceId, dbStatus).catch(console.error);
    }
  }, [isOnline]);

  const getAllEvidence = useCallback((): EvidenceRecord[] => {
    return Array.from(evidence.values());
  }, [evidence]);

  const getEvidenceFileCounts = useCallback((controlId: string): { evidenceCount: number; fileCount: number; hasFiles: boolean } | undefined => {
    return evidenceFileCountsObj[controlId];
  }, [evidenceFileCountsObj]);

  const isEvidenceVerified = useCallback((controlId: string): boolean => {
    // A control counts as "verified" only when real files back it up —
    // either a local evidence record with fileUrls, or the server-side
    // repository reports at least one file for this control.
    const response = responses.get(controlId);
    if (response?.answer !== 'yes') return false;
    const local = response.evidenceId ? evidence.get(response.evidenceId) : undefined;
    if (local && local.fileUrls && local.fileUrls.length > 0) return true;
    const repoCount = evidenceFileCountsObj[controlId];
    return !!(repoCount && repoCount.hasFiles);
  }, [responses, evidence, evidenceFileCountsObj]);

  const refreshEvidenceCounts = useCallback(async (): Promise<void> => {
    if (!evidenceRepository.isAvailable()) return;

    try {
      const counts = await evidenceRepository.getEvidenceCountsByControl();
      const countsObj: Record<string, { evidenceCount: number; fileCount: number; hasFiles: boolean }> = {};
      counts.forEach((value, key) => {
        countsObj[key] = value;
      });
      setEvidenceFileCountsObj(countsObj);
      console.log(`[Evidence Counts] Refreshed counts for ${counts.size} controls`);
    } catch (err) {
      console.error('[Evidence Counts] Refresh failed:', err);
    }
  }, []);

  // ============================================================================
  // CUSTOM CONTROL ACTIONS
  // ============================================================================
  
  const addCustomControl = useCallback((
    control: Omit<CustomControl, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>
  ): CustomControl => {
    // A custom control with no framework mappings is invisible to every
    // framework rollup — it will never affect the score it was presumably
    // created to improve. Warn loudly; the UI should also gate creation.
    if (!control.frameworkMappings || control.frameworkMappings.length === 0) {
      console.warn(
        `[useCompliance] Custom control "${control.title}" created without framework mappings. ` +
        'It will not count toward SOC2/ISO/HIPAA/NIST/PCI/GDPR progress. ' +
        'Add at least one framework mapping from the Company Specific tab.',
      );
    }
    const now = new Date().toISOString();
    const newControl: CustomControl = {
      ...control,
      id: generateControlId(),
      createdAt: now,
      updatedAt: now,
      isActive: true,
      frameworkMappings: control.frameworkMappings.map(m => ({
        ...m,
        id: generateUUID(),
        controlId: null,
        customControlId: null, // Will be set after creation
      })),
    };

    // Update customControlId in mappings
    newControl.frameworkMappings = newControl.frameworkMappings.map(m => ({
      ...m,
      customControlId: newControl.id,
    }));

    setCustomControls(prev => [...prev, newControl]);

    // Sync to Supabase in background (convert camelCase to snake_case)
    if (complianceDb.isAvailable() && isOnline) {
      complianceDb.saveCustomControl({
        id: newControl.id,
        title: newControl.title,
        description: newControl.description,
        question: newControl.question,
        domain: newControl.category,
        domain_title: newControl.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        risk_level: newControl.riskLevel,
        framework_mappings: newControl.frameworkMappings.map(m => ({
          framework_id: m.frameworkId,
          clause_id: m.clauseId,
          clause_title: m.clauseTitle,
        })),
        created_by: newControl.createdBy,
        is_active: true,
        evidence_examples: [],
      } as Parameters<typeof complianceDb.saveCustomControl>[0]).catch(console.error);
    }

    return newControl;
  }, [isOnline]);

  const updateCustomControl = useCallback((id: string, updates: Partial<CustomControl>) => {
    setCustomControls(prev => prev.map(c => 
      c.id === id 
        ? { ...c, ...updates, updatedAt: new Date().toISOString() }
        : c
    ));
  }, []);

  const deleteCustomControl = useCallback((id: string) => {
    // Soft delete by setting isActive to false (for audit trail)
    setCustomControls(prev => prev.map(c =>
      c.id === id ? { ...c, isActive: false, updatedAt: new Date().toISOString() } : c
    ));

    // Remove any responses for this control
    setResponsesObj(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });

    // Sync to Supabase in background
    if (complianceDb.isAvailable() && isOnline) {
      complianceDb.deleteCustomControl(id).catch(console.error);
    }
  }, [isOnline]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const getControlsByDomainFn = useCallback((domainId: string): MasterControl[] => {
    if (domainId === 'company_specific') {
      return customAsMaster;
    }
    return getControlsByDomain(domainId as ComplianceDomain);
  }, [customAsMaster]);

  const getControlById = useCallback((controlId: string): MasterControl | undefined => {
    return allControls.find(c => c.id === controlId);
  }, [allControls]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  const clearNotifications = useCallback(() => {
    setSyncNotifications([]);
  }, []);

  const clearAnswerHistory = useCallback(() => {
    setAnswerHistory([]);
  }, []);

  // ============================================================================
  // DATABASE SYNC (Supabase Integration)
  // ============================================================================

  const syncToDatabase = useCallback(async (): Promise<void> => {
    if (!complianceDb.isAvailable()) {
      console.warn('Supabase not available - data saved to localStorage only');
      return;
    }

    setIsLoading(true);
    try {
      // Sync all responses to Supabase
      const responsePromises = Object.values(responsesObj).map(r =>
        complianceDb.saveUserResponse({
          control_id: r.controlId,
          answer: r.answer,
          evidence_note: '',
          remediation_plan: r.remediationPlan,
          status: 'complete',
        })
      );

      // Sync all custom controls to Supabase (convert camelCase to snake_case)
      const customControlPromises = customControls.filter(c => c.isActive).map(c =>
        complianceDb.saveCustomControl({
          id: c.id,
          title: c.title,
          description: c.description,
          question: c.question,
          domain: c.category,
          domain_title: c.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          risk_level: c.riskLevel,
          framework_mappings: c.frameworkMappings.map(m => ({
            framework_id: m.frameworkId,
            clause_id: m.clauseId,
            clause_title: m.clauseTitle,
          })),
          created_by: c.createdBy,
          is_active: true,
          evidence_examples: [],
        } as Parameters<typeof complianceDb.saveCustomControl>[0])
      );

      await Promise.all([...responsePromises, ...customControlPromises]);

      const now = new Date().toISOString();
      setLastSyncedAt(now);
      saveToStorage(storageKeys.LAST_SYNCED, now);

      console.log('Successfully synced to Supabase database');
    } catch (error) {
      console.error('Database sync failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [responsesObj, customControls, storageKeys.LAST_SYNCED]);

  const loadFromDatabase = useCallback(async (): Promise<void> => {
    if (!complianceDb.isAvailable()) {
      console.warn('Supabase not available - loading from localStorage');
      return;
    }

    await loadFromSupabase();
  }, [loadFromSupabase]);

  // ============================================================================
  // RETURN VALUE
  // ============================================================================
  
  const state: ComplianceState = {
    responses,
    evidence,
    customControls,
    syncNotifications,
    answerHistory,
    darkMode,
    isLoading,
    lastSyncedAt,
  };

  return {
    // State
    state,
    
    // Master Controls
    masterControls: MASTER_CONTROLS,
    allControls,
    getControlsByDomain: getControlsByDomainFn,
    getControlById,
    
    // Control Responses
    answerControl,
    getResponse,
    updateRemediation,
    
    // Evidence Management
    getEvidence,
    getEvidenceByControlId,
    updateEvidence,
    getAllEvidence,
    getEvidenceFileCounts,
    evidenceFileCounts: evidenceFileCountsObj,
    refreshEvidenceCounts,
    isEvidenceVerified,

    // Custom Controls
    customControls: customControls.filter(c => c.isActive),
    addCustomControl,
    updateCustomControl,
    deleteCustomControl,
    
    // Framework & Domain Progress
    frameworkProgress,
    domainProgress,
    allDomains,
    
    // Sync Notifications
    syncNotifications,
    clearNotifications,

    // Answer history
    answerHistory,
    clearAnswerHistory,

    // UI State
    toggleDarkMode,
    
    // Statistics
    stats,
    
    // Critical Gaps
    criticalGaps,
    
    // Database Sync
    syncToDatabase,
    loadFromDatabase,

    // Load/sync error surfacing
    loadError,
    clearLoadError: () => setLoadError(null),
    isOnline,
  };
}

export default useCompliance;
