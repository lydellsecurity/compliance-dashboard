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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { complianceDb } from '../services/compliance-database.service';
import { evidenceRepository } from '../services/evidence-repository.service';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
  answeredAt: string;                            // ISO timestamp
  answeredBy: string;                            // User ID (placeholder for auth)
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
 * Compliance State - Complete application state
 */
export interface ComplianceState {
  responses: Map<string, ControlResponse>;
  evidence: Map<string, EvidenceRecord>;
  customControls: CustomControl[];
  syncNotifications: SyncNotification[];
  darkMode: boolean;
  isLoading: boolean;
  lastSyncedAt: string | null;
}

/**
 * Framework Progress - Computed statistics
 */
export interface FrameworkProgress {
  id: FrameworkId;
  name: string;
  color: string;
  total: number;
  completed: number;
  percentage: number;
  gaps: number;
  partial: number;
}

/**
 * Domain Progress - Computed statistics
 */
export interface DomainProgress {
  id: string;
  title: string;
  color: string;
  total: number;
  answered: number;
  compliant: number;
  gaps: number;
  percentage: number;
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
  
  // UI State
  toggleDarkMode: () => void;
  
  // Statistics
  stats: {
    totalControls: number;
    answeredControls: number;
    compliantControls: number;
    gapControls: number;
    remainingControls: number;
    assessmentPercentage: number;
  };
  
  // Critical Gaps (for Action Required)
  criticalGaps: MasterControl[];
  
  // Database Sync (placeholder for PostgreSQL integration)
  syncToDatabase: () => Promise<void>;
  loadFromDatabase: () => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() =>
    loadFromStorage(LEGACY_STORAGE_KEYS.LAST_SYNCED, null)
  );

  // Track if migration has been attempted
  const [migrationAttempted, setMigrationAttempted] = useState(false);

  // Supabase integration state
  const [supabaseUser, setSupabaseUser] = useState<{ id: string; organization_id?: string } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // ============================================================================
  // SUPABASE AUTHENTICATION LISTENER
  // ============================================================================

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Use the organizationId from options (OrganizationContext) if available,
        // otherwise fall back to user_metadata
        const orgId = organizationId || session.user.user_metadata?.organization_id;
        setSupabaseUser({ id: session.user.id, organization_id: orgId });
        if (orgId) {
          complianceDb.setContext(orgId, session.user.id);
          evidenceRepository.setContext(orgId, session.user.id);
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Use the organizationId from options (OrganizationContext) if available,
        // otherwise fall back to user_metadata
        const orgId = organizationId || session.user.user_metadata?.organization_id;
        setSupabaseUser({ id: session.user.id, organization_id: orgId });
        if (orgId) {
          complianceDb.setContext(orgId, session.user.id);
          evidenceRepository.setContext(orgId, session.user.id);
        }
      } else {
        setSupabaseUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [organizationId]);

  // Update database context when organizationId changes (from OrganizationContext)
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase || !organizationId) return;

    // Get the current user to update the context
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && organizationId) {
        complianceDb.setContext(organizationId, session.user.id);
        evidenceRepository.setContext(organizationId, session.user.id);
        setSupabaseUser(prev => prev ? { ...prev, organization_id: organizationId } : null);
      }
    });
  }, [organizationId]);

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

  // Load data from Supabase when user is authenticated
  // Use organizationId from options (OrganizationContext) if available
  useEffect(() => {
    const effectiveOrgId = organizationId || supabaseUser?.organization_id;
    if (effectiveOrgId && isOnline && complianceDb.isAvailable()) {
      loadFromSupabase();
    }
  }, [organizationId, supabaseUser?.organization_id, isOnline]);

  // ============================================================================
  // SUPABASE DATA LOADING
  // ============================================================================

  const loadFromSupabase = useCallback(async () => {
    if (!complianceDb.isAvailable()) return;

    setIsLoading(true);
    try {
      const [userResponses, evidenceRecords, customCtls, notifications] = await Promise.all([
        complianceDb.getUserResponses(),
        complianceDb.getEvidenceRecords(),
        complianceDb.getCustomControls(),
        complianceDb.getSyncNotifications(),
      ]);

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
          answeredBy: r.user_id || 'current-user',
          updatedAt: r.updated_at || r.answered_at,
        };
      });

      // Merge with local data (local takes precedence for unsynced changes)
      setResponsesObj(prev => {
        const merged = { ...responsesFromDb };
        // Keep local changes that might not be synced yet
        Object.keys(prev).forEach(key => {
          if (!merged[key] || new Date(prev[key].updatedAt) > new Date(merged[key]?.updatedAt || 0)) {
            merged[key] = prev[key];
          }
        });
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
      if (evidenceRepository.isAvailable()) {
        const yesResponses = Object.values(responsesFromDb).filter(r => r.answer === 'yes');
        console.log(`[Evidence Sync] Found ${yesResponses.length} "yes" responses to sync`);
        for (const response of yesResponses) {
          const control = allControls.find(c => c.id === response.controlId);
          if (control) {
            // Check if evidence already exists for this control
            const existingEvidence = await evidenceRepository.getEvidenceForControl(response.controlId);
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
              } else {
                console.log(`[Evidence Sync] Created evidence for ${response.controlId}`);
              }
            }
          }
        }
      } else {
        console.log('[Evidence Sync] Evidence repository not available');
      }
    } catch (error) {
      console.error('Error loading from Supabase:', error);
    } finally {
      setIsLoading(false);
    }
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
      const gapCount = allControls.filter(c => {
        const r = responses.get(c.id);
        return r?.answer === 'no' && c.frameworkMappings.some(m => m.frameworkId === fw.id);
      }).length;
      const partialCount = allControls.filter(c => {
        const r = responses.get(c.id);
        return r?.answer === 'partial' && c.frameworkMappings.some(m => m.frameworkId === fw.id);
      }).length;
      
      return {
        id: fw.id,
        name: fw.name,
        color: fw.color,
        total: progress.total,
        completed: progress.completed,
        percentage: progress.percentage,
        gaps: gapCount,
        partial: partialCount,
      };
    }),
  [responses, allControls]);

  // ============================================================================
  // DOMAIN PROGRESS CALCULATION
  // ============================================================================
  
  const domainProgress: DomainProgress[] = useMemo(() => 
    allDomains.map(domain => {
      const domainControls = (domain.id as string) === 'company_specific'
        ? customAsMaster
        : getControlsByDomain(domain.id);
      
      const answered = domainControls.filter(c => responses.get(c.id)?.answer).length;
      const compliant = domainControls.filter(c => {
        const r = responses.get(c.id);
        return r?.answer === 'yes' || r?.answer === 'na';
      }).length;
      const gaps = domainControls.filter(c => responses.get(c.id)?.answer === 'no').length;
      
      return {
        id: domain.id as string,
        title: domain.title,
        color: domain.color,
        total: domainControls.length,
        answered,
        compliant,
        gaps,
        percentage: domainControls.length > 0 ? Math.round((answered / domainControls.length) * 100) : 0,
      };
    }),
  [allDomains, customAsMaster, responses]);

  // ============================================================================
  // STATISTICS
  // ============================================================================
  
  const stats = useMemo(() => {
    const totalControls = allControls.length;
    const answeredControls = Array.from(responses.values()).filter(r => r.answer).length;
    const compliantControls = Array.from(responses.values()).filter(r => r.answer === 'yes' || r.answer === 'na').length;
    const gapControls = Array.from(responses.values()).filter(r => r.answer === 'no').length;
    const remainingControls = totalControls - answeredControls;
    const assessmentPercentage = totalControls > 0 ? Math.round((answeredControls / totalControls) * 100) : 0;
    
    return {
      totalControls,
      answeredControls,
      compliantControls,
      gapControls,
      remainingControls,
      assessmentPercentage,
    };
  }, [allControls, responses]);

  // ============================================================================
  // CRITICAL GAPS (Action Required)
  // ============================================================================
  
  const criticalGaps = useMemo(() => 
    allControls
      .filter(c => {
        const r = responses.get(c.id);
        return r?.answer === 'no' && (c.riskLevel === 'critical' || c.riskLevel === 'high');
      })
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a.riskLevel] - order[b.riskLevel];
      })
      .slice(0, 5),
  [allControls, responses]);

  // ============================================================================
  // CONTROL RESPONSE ACTIONS
  // ============================================================================
  
  const answerControl = useCallback((controlId: string, answer: 'yes' | 'no' | 'partial' | 'na') => {
    const now = new Date().toISOString();
    const existingResponse = responsesObj[controlId];

    // Generate unique IDs
    const responseId = existingResponse?.id || generateUUID();
    const evidenceId = answer === 'yes' ? generateEvidenceId() : null;

    // Create/update response
    const newResponse: ControlResponse = {
      id: responseId,
      controlId,
      answer,
      evidenceId,
      remediationPlan: existingResponse?.remediationPlan || '',
      answeredAt: existingResponse?.answeredAt || now,
      answeredBy: supabaseUser?.id || 'current-user',
      updatedAt: now,
    };

    setResponsesObj(prev => ({ ...prev, [controlId]: newResponse }));

    // Create evidence record for "yes" answers
    if (answer === 'yes' && evidenceId) {
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

      // Generate sync notifications
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
          userId: supabaseUser?.id || 'current-user',
        }));
        setSyncNotifications(prev => [...notifications, ...prev].slice(0, 50));

        // Sync notifications to Supabase
        if (complianceDb.isAvailable() && isOnline) {
          notifications.forEach(n => {
            complianceDb.createSyncNotification(
              n.controlId,
              n.controlTitle,
              n.frameworkId,
              n.clauseId,
              n.clauseTitle
            ).catch(console.error);
          });
        }

        // Create evidence item in Evidence Repository (if not already exists)
        if (evidenceRepository.isAvailable() && isOnline) {
          evidenceRepository.getEvidenceForControl(controlId).then(async existingEvidence => {
            // Only create if no evidence exists for this control
            if (existingEvidence.length === 0) {
              const result = await evidenceRepository.createEvidence({
                controlId,
                title: `${control.title} - Compliance Evidence`,
                description: `Evidence supporting compliance with control ${controlId}: ${control.title}`,
                type: 'assessment',
                source: 'manual',
                tags: ['auto-generated', 'assessment'],
                frameworkMappings: control.frameworkMappings.map(m => m.frameworkId),
              });
              if (!result.success) {
                console.error(`[Evidence] Failed to create evidence for ${controlId}:`, result.error);
              } else {
                console.log(`[Evidence] Created evidence for ${controlId}`);
              }
            }
          }).catch(err => console.error('[Evidence] Error checking existing evidence:', err));
        } else {
          console.log('[Evidence] Repository not available or offline');
        }
      }
    }

    // Remove evidence if changing from "yes" to another answer
    if (answer !== 'yes' && existingResponse?.evidenceId) {
      setEvidenceObj(prev => {
        const { [existingResponse.evidenceId!]: _, ...rest } = prev;
        return rest;
      });
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

  // ============================================================================
  // CUSTOM CONTROL ACTIONS
  // ============================================================================
  
  const addCustomControl = useCallback((
    control: Omit<CustomControl, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>
  ): CustomControl => {
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
  }, [responsesObj, customControls]);

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
    
    // UI State
    toggleDarkMode,
    
    // Statistics
    stats,
    
    // Critical Gaps
    criticalGaps,
    
    // Database Sync
    syncToDatabase,
    loadFromDatabase,
  };
}

export default useCompliance;
