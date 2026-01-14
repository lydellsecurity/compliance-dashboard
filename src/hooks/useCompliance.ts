/**
 * useCompliance Hook
 * 
 * Centralized state management for the Compliance Engine.
 * Designed for easy migration to PostgreSQL in the next phase.
 * 
 * Data Models:
 * - ControlResponse: User answers with unique evidence IDs
 * - CustomControl: Organization-specific controls
 * - EvidenceRecord: Documentation for audit preparation
 * - FrameworkMapping: Cross-framework requirement mappings
 * 
 * Every "Yes" answer generates a unique EvidenceID (UUID v4 format)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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

const STORAGE_KEYS = {
  RESPONSES: 'ce4-responses',
  EVIDENCE: 'ce4-evidence',
  CUSTOM_CONTROLS: 'ce4-custom-controls',
  DARK_MODE: 'ce4-dark-mode',
  LAST_SYNCED: 'ce4-last-synced',
} as const;

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

export function useCompliance(): UseComplianceReturn {
  // ============================================================================
  // STATE INITIALIZATION
  // ============================================================================
  
  const [responsesObj, setResponsesObj] = useState<Record<string, ControlResponse>>(() =>
    loadFromStorage(STORAGE_KEYS.RESPONSES, {})
  );
  
  const [evidenceObj, setEvidenceObj] = useState<Record<string, EvidenceRecord>>(() =>
    loadFromStorage(STORAGE_KEYS.EVIDENCE, {})
  );
  
  const [customControls, setCustomControls] = useState<CustomControl[]>(() =>
    loadFromStorage(STORAGE_KEYS.CUSTOM_CONTROLS, [])
  );
  
  const [darkMode, setDarkMode] = useState<boolean>(() =>
    loadFromStorage(STORAGE_KEYS.DARK_MODE, true)
  );
  
  const [syncNotifications, setSyncNotifications] = useState<SyncNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() =>
    loadFromStorage(STORAGE_KEYS.LAST_SYNCED, null)
  );

  // ============================================================================
  // PERSISTENCE EFFECTS
  // ============================================================================
  
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.RESPONSES, responsesObj);
  }, [responsesObj]);
  
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.EVIDENCE, evidenceObj);
  }, [evidenceObj]);
  
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CUSTOM_CONTROLS, customControls);
  }, [customControls]);
  
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.DARK_MODE, darkMode);
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
      answeredBy: 'current-user', // Placeholder for auth
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
          userId: 'current-user',
        }));
        setSyncNotifications(prev => [...notifications, ...prev].slice(0, 50));
      }
    }
    
    // Remove evidence if changing from "yes" to another answer
    if (answer !== 'yes' && existingResponse?.evidenceId) {
      setEvidenceObj(prev => {
        const { [existingResponse.evidenceId!]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [responsesObj, allControls]);

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
  }, []);

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
  }, []);

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
    return newControl;
  }, []);

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
  }, []);

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
  // DATABASE SYNC (Placeholder for PostgreSQL integration)
  // ============================================================================
  
  const syncToDatabase = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // TODO: Implement actual database sync
      // This would send responsesObj, evidenceObj, customControls to PostgreSQL
      // Using Supabase, Prisma, or direct pg connection
      
      console.log('Syncing to database...', {
        responses: Object.values(responsesObj),
        evidence: Object.values(evidenceObj),
        customControls,
      });
      
      const now = new Date().toISOString();
      setLastSyncedAt(now);
      saveToStorage(STORAGE_KEYS.LAST_SYNCED, now);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('Database sync failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [responsesObj, evidenceObj, customControls]);

  const loadFromDatabase = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // TODO: Implement actual database load
      // This would fetch data from PostgreSQL and update local state
      
      console.log('Loading from database...');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('Database load failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
