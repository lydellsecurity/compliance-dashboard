/**
 * useRequirementAssessment Hook
 *
 * State management for requirement-centric compliance assessment.
 * Handles persistence, wizard state, and assessment operations.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { FrameworkId } from '../constants/controls';
import type {
  RequirementAssessment,
  RequirementComplianceStatus,
  ComplianceMethod,
  DirectAssessment,
  RequirementEvidence,
  AddressableDecision,
  CompensatingControlRecord,
  ExceptionRecord,
  AssessmentWizardState,
  FrameworkScope,
  FrameworkAssessmentSummary,
} from '../types/requirement-assessment.types';
import {
  getLeafRequirements,
  getFrameworkIndex,
  buildRequirementDetail,
} from '../services/requirement-mapping.service';

// Storage key prefix
const STORAGE_PREFIX = 'requirement_assessment_';

// ============================================
// PERSISTENCE HELPERS
// ============================================

function loadAssessments(frameworkId: FrameworkId): Record<string, RequirementAssessment> {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${frameworkId}`);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveAssessments(
  frameworkId: FrameworkId,
  assessments: Record<string, RequirementAssessment>
): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${frameworkId}`, JSON.stringify(assessments));
  } catch (error) {
    console.error('Failed to save requirement assessments:', error);
  }
}

function loadScope(frameworkId: FrameworkId): FrameworkScope | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}scope_${frameworkId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveScope(frameworkId: FrameworkId, scope: FrameworkScope): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}scope_${frameworkId}`, JSON.stringify(scope));
  } catch (error) {
    console.error('Failed to save framework scope:', error);
  }
}

// ============================================
// MAIN HOOK
// ============================================

export interface UseRequirementAssessmentReturn {
  // Wizard State
  wizardState: AssessmentWizardState;
  setWizardStep: (step: AssessmentWizardState['currentStep']) => void;
  selectFramework: (frameworkId: FrameworkId) => void;
  setScope: (scope: FrameworkScope) => void;
  setCurrentRequirement: (requirementId: string | null) => void;

  // Assessment Operations
  getAssessment: (requirementId: string) => RequirementAssessment | null;
  updateAssessmentStatus: (
    requirementId: string,
    status: RequirementComplianceStatus,
    method: ComplianceMethod
  ) => void;
  saveDirectAssessment: (requirementId: string, assessment: DirectAssessment) => void;
  addEvidence: (requirementId: string, evidence: Omit<RequirementEvidence, 'id' | 'requirementAssessmentId'>) => void;
  removeEvidence: (requirementId: string, evidenceId: string) => void;
  saveAddressableDecision: (requirementId: string, decision: AddressableDecision) => void;
  saveCompensatingControl: (requirementId: string, record: CompensatingControlRecord) => void;
  saveException: (requirementId: string, record: ExceptionRecord) => void;
  addNote: (requirementId: string, note: string) => void;
  skipRequirement: (requirementId: string) => void;
  unskipRequirement: (requirementId: string) => void;

  // Navigation
  getNextRequirement: () => string | null;
  getPreviousRequirement: () => string | null;
  navigateToRequirement: (requirementId: string) => void;

  // Summary & Stats
  getSummary: () => FrameworkAssessmentSummary | null;
  getRequirementDetails: (requirementId: string) => ReturnType<typeof buildRequirementDetail>;

  // Reset
  resetFrameworkAssessment: (frameworkId: FrameworkId) => void;
  resetAllAssessments: () => void;
}

export function useRequirementAssessment(
  getControlAnswer?: (controlId: string) => 'yes' | 'no' | 'partial' | 'na' | null
): UseRequirementAssessmentReturn {
  // Wizard state
  const [wizardState, setWizardState] = useState<AssessmentWizardState>({
    currentStep: 'framework_selection',
    selectedFramework: null,
    frameworkVersion: null,
    scope: null,
    currentRequirementId: null,
    assessments: {},
    completedRequirements: [],
    skippedRequirements: [],
    progress: {
      total: 0,
      assessed: 0,
      compliant: 0,
      partiallyCompliant: 0,
      nonCompliant: 0,
      notApplicable: 0,
    },
  });

  // Load assessments when framework changes
  useEffect(() => {
    if (wizardState.selectedFramework) {
      const assessments = loadAssessments(wizardState.selectedFramework);
      const scope = loadScope(wizardState.selectedFramework);
      const requirements = getLeafRequirements(wizardState.selectedFramework);

      // Calculate progress
      const completed = Object.values(assessments).filter(a => a.status !== 'not_assessed');
      const progress = {
        total: requirements.length,
        assessed: completed.length,
        compliant: completed.filter(a => a.status === 'compliant').length,
        partiallyCompliant: completed.filter(a => a.status === 'partially_compliant').length,
        nonCompliant: completed.filter(a => a.status === 'non_compliant').length,
        notApplicable: completed.filter(a => a.status === 'not_applicable').length,
      };

      setWizardState(prev => ({
        ...prev,
        assessments,
        scope,
        completedRequirements: completed.map(a => a.requirementId),
        progress,
      }));
    }
  }, [wizardState.selectedFramework]);

  // Get sorted requirement IDs for navigation
  const requirementIds = useMemo(() => {
    if (!wizardState.selectedFramework) return [];
    return getLeafRequirements(wizardState.selectedFramework).map(r => r.id);
  }, [wizardState.selectedFramework]);

  // ============================================
  // WIZARD STATE OPERATIONS
  // ============================================

  const setWizardStep = useCallback((step: AssessmentWizardState['currentStep']) => {
    setWizardState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const selectFramework = useCallback((frameworkId: FrameworkId) => {
    const index = getFrameworkIndex(frameworkId);
    setWizardState(prev => ({
      ...prev,
      selectedFramework: frameworkId,
      frameworkVersion: index.frameworkVersion,
      currentStep: 'scope_definition',
    }));
  }, []);

  const setScope = useCallback((scope: FrameworkScope) => {
    if (wizardState.selectedFramework) {
      saveScope(wizardState.selectedFramework, scope);
    }
    setWizardState(prev => ({
      ...prev,
      scope,
      currentStep: 'assessment',
    }));
  }, [wizardState.selectedFramework]);

  const setCurrentRequirement = useCallback((requirementId: string | null) => {
    setWizardState(prev => ({ ...prev, currentRequirementId: requirementId }));
  }, []);

  // ============================================
  // ASSESSMENT OPERATIONS
  // ============================================

  const getAssessment = useCallback((requirementId: string): RequirementAssessment | null => {
    return wizardState.assessments[requirementId] || null;
  }, [wizardState.assessments]);

  const updateAssessment = useCallback((
    requirementId: string,
    updates: Partial<RequirementAssessment>
  ) => {
    if (!wizardState.selectedFramework) return;

    const existing = wizardState.assessments[requirementId];

    // Create defaults first, then merge existing, then merge updates
    const defaults: RequirementAssessment = {
      id: crypto.randomUUID(),
      frameworkId: wizardState.selectedFramework,
      frameworkVersion: wizardState.frameworkVersion || '',
      requirementId,
      status: 'not_assessed',
      complianceMethod: 'control_mapping',
      evidenceRefs: [],
      mappedControlAssessments: [],
      lastAssessedAt: null,
      lastAssessedBy: null,
      notes: '',
    };

    const updated: RequirementAssessment = {
      ...defaults,
      ...existing,
      ...updates,
      // Preserve the existing ID if present
      id: existing?.id || defaults.id,
    };

    const newAssessments = {
      ...wizardState.assessments,
      [requirementId]: updated,
    };

    saveAssessments(wizardState.selectedFramework, newAssessments);

    // Recalculate progress
    const assessed = Object.values(newAssessments).filter(a => a.status !== 'not_assessed');
    const progress = {
      total: requirementIds.length,
      assessed: assessed.length,
      compliant: assessed.filter(a => a.status === 'compliant').length,
      partiallyCompliant: assessed.filter(a => a.status === 'partially_compliant').length,
      nonCompliant: assessed.filter(a => a.status === 'non_compliant').length,
      notApplicable: assessed.filter(a => a.status === 'not_applicable').length,
    };

    setWizardState(prev => ({
      ...prev,
      assessments: newAssessments,
      completedRequirements: assessed.map(a => a.requirementId),
      progress,
    }));
  }, [wizardState.selectedFramework, wizardState.frameworkVersion, wizardState.assessments, requirementIds.length]);

  const updateAssessmentStatus = useCallback((
    requirementId: string,
    status: RequirementComplianceStatus,
    method: ComplianceMethod
  ) => {
    updateAssessment(requirementId, {
      status,
      complianceMethod: method,
      lastAssessedAt: new Date().toISOString(),
      lastAssessedBy: 'current_user', // TODO: Get from auth context
    });
  }, [updateAssessment]);

  const saveDirectAssessment = useCallback((
    requirementId: string,
    assessment: DirectAssessment
  ) => {
    // Determine overall status based on answers
    const answers = assessment.questions.map(q => q.answer);
    const yesCount = answers.filter(a => a === 'yes').length;
    const noCount = answers.filter(a => a === 'no').length;
    const totalAnswered = answers.filter(a => a !== null).length;

    let status: RequirementComplianceStatus = 'not_assessed';
    if (totalAnswered > 0) {
      if (noCount === 0 && yesCount === totalAnswered) {
        status = 'compliant';
      } else if (noCount === totalAnswered) {
        status = 'non_compliant';
      } else {
        status = 'partially_compliant';
      }
    }

    updateAssessment(requirementId, {
      directAssessment: assessment,
      status,
      complianceMethod: 'direct_assessment',
      lastAssessedAt: new Date().toISOString(),
      lastAssessedBy: 'current_user',
    });
  }, [updateAssessment]);

  const addEvidence = useCallback((
    requirementId: string,
    evidence: Omit<RequirementEvidence, 'id' | 'requirementAssessmentId'>
  ) => {
    const existing = wizardState.assessments[requirementId];
    const newEvidence: RequirementEvidence = {
      ...evidence,
      id: crypto.randomUUID(),
      requirementAssessmentId: existing?.id || '',
    };

    updateAssessment(requirementId, {
      evidenceRefs: [...(existing?.evidenceRefs || []), newEvidence],
    });
  }, [wizardState.assessments, updateAssessment]);

  const removeEvidence = useCallback((requirementId: string, evidenceId: string) => {
    const existing = wizardState.assessments[requirementId];
    if (!existing) return;

    updateAssessment(requirementId, {
      evidenceRefs: existing.evidenceRefs.filter(e => e.id !== evidenceId),
    });
  }, [wizardState.assessments, updateAssessment]);

  const saveAddressableDecision = useCallback((
    requirementId: string,
    decision: AddressableDecision
  ) => {
    let status: RequirementComplianceStatus;

    switch (decision.decision) {
      case 'implemented':
      case 'alternative_implemented':
        status = 'compliant';
        break;
      case 'not_reasonable':
        status = decision.riskAnalysisReference ? 'compliant' : 'partially_compliant';
        break;
      default:
        status = 'not_assessed';
    }

    updateAssessment(requirementId, {
      addressableDecision: decision,
      status,
      complianceMethod: 'direct_assessment',
    });
  }, [updateAssessment]);

  const saveCompensatingControl = useCallback((
    requirementId: string,
    record: CompensatingControlRecord
  ) => {
    updateAssessment(requirementId, {
      compensatingControl: record,
      status: 'compliant',
      complianceMethod: 'compensating_control',
    });
  }, [updateAssessment]);

  const saveException = useCallback((requirementId: string, record: ExceptionRecord) => {
    updateAssessment(requirementId, {
      exception: record,
      status: record.riskLevel === 'critical' ? 'non_compliant' : 'partially_compliant',
      complianceMethod: 'exception',
    });
  }, [updateAssessment]);

  const addNote = useCallback((requirementId: string, note: string) => {
    const existing = wizardState.assessments[requirementId];
    const existingNotes = existing?.notes || '';
    const timestamp = new Date().toLocaleString();
    const newNotes = existingNotes
      ? `${existingNotes}\n\n[${timestamp}]\n${note}`
      : `[${timestamp}]\n${note}`;

    updateAssessment(requirementId, { notes: newNotes });
  }, [wizardState.assessments, updateAssessment]);

  const skipRequirement = useCallback((requirementId: string) => {
    setWizardState(prev => ({
      ...prev,
      skippedRequirements: [...prev.skippedRequirements, requirementId],
    }));
  }, []);

  const unskipRequirement = useCallback((requirementId: string) => {
    setWizardState(prev => ({
      ...prev,
      skippedRequirements: prev.skippedRequirements.filter(id => id !== requirementId),
    }));
  }, []);

  // ============================================
  // NAVIGATION
  // ============================================

  const getNextRequirement = useCallback((): string | null => {
    if (!wizardState.currentRequirementId) {
      // Return first unassessed, non-skipped requirement
      return requirementIds.find(id =>
        !wizardState.completedRequirements.includes(id) &&
        !wizardState.skippedRequirements.includes(id)
      ) || null;
    }

    const currentIndex = requirementIds.indexOf(wizardState.currentRequirementId);
    if (currentIndex === -1 || currentIndex === requirementIds.length - 1) return null;

    // Find next unassessed, non-skipped requirement
    for (let i = currentIndex + 1; i < requirementIds.length; i++) {
      const id = requirementIds[i];
      if (!wizardState.completedRequirements.includes(id) &&
          !wizardState.skippedRequirements.includes(id)) {
        return id;
      }
    }

    // If none found after current, look from beginning
    for (let i = 0; i < currentIndex; i++) {
      const id = requirementIds[i];
      if (!wizardState.completedRequirements.includes(id) &&
          !wizardState.skippedRequirements.includes(id)) {
        return id;
      }
    }

    return null;
  }, [wizardState.currentRequirementId, wizardState.completedRequirements, wizardState.skippedRequirements, requirementIds]);

  const getPreviousRequirement = useCallback((): string | null => {
    if (!wizardState.currentRequirementId) return null;

    const currentIndex = requirementIds.indexOf(wizardState.currentRequirementId);
    if (currentIndex <= 0) return null;

    return requirementIds[currentIndex - 1];
  }, [wizardState.currentRequirementId, requirementIds]);

  const navigateToRequirement = useCallback((requirementId: string) => {
    setWizardState(prev => ({
      ...prev,
      currentRequirementId: requirementId,
      currentStep: 'assessment',
    }));
  }, []);

  // ============================================
  // SUMMARY & STATS
  // ============================================

  const getSummary = useCallback((): FrameworkAssessmentSummary | null => {
    if (!wizardState.selectedFramework) return null;

    const assessments = Object.values(wizardState.assessments);

    const complianceByStatus: Record<RequirementComplianceStatus, number> = {
      not_assessed: 0,
      compliant: 0,
      partially_compliant: 0,
      non_compliant: 0,
      not_applicable: 0,
    };

    const complianceByMethod: Record<ComplianceMethod, number> = {
      control_mapping: 0,
      direct_assessment: 0,
      compensating_control: 0,
      exception: 0,
      inherited: 0,
    };

    for (const assessment of assessments) {
      complianceByStatus[assessment.status]++;
      complianceByMethod[assessment.complianceMethod]++;
    }

    // Calculate unassessed
    complianceByStatus.not_assessed = requirementIds.length - assessments.length;

    // Overall compliance percentage (exclude N/A from calculation)
    const assessed = assessments.filter(a => a.status !== 'not_applicable');
    const compliantCount = assessed.filter(
      a => a.status === 'compliant' || a.status === 'partially_compliant'
    ).length;
    const overallCompliance = assessed.length > 0
      ? Math.round((compliantCount / assessed.length) * 100)
      : 0;

    // Find critical gaps (non-compliant mandatory requirements)
    const requirements = getLeafRequirements(wizardState.selectedFramework);
    const criticalGaps = assessments
      .filter(a => a.status === 'non_compliant')
      .map(a => a.requirementId)
      .filter(id => {
        const req = requirements.find(r => r.id === id);
        return req?.isRequired !== false;
      });

    return {
      frameworkId: wizardState.selectedFramework,
      frameworkVersion: wizardState.frameworkVersion || '',
      totalRequirements: requirementIds.length,
      assessedRequirements: assessments.length,
      complianceByStatus,
      complianceByMethod,
      overallCompliancePercentage: overallCompliance,
      criticalGaps,
      upcomingReassessments: [], // TODO: Implement based on validUntil
      lastAssessmentDate: assessments.length > 0
        ? assessments.reduce((latest, a) =>
            a.lastAssessedAt && (!latest || a.lastAssessedAt > latest)
              ? a.lastAssessedAt
              : latest,
            null as string | null
          )
        : null,
      assessmentCompleteness: requirementIds.length > 0
        ? Math.round((assessments.length / requirementIds.length) * 100)
        : 0,
    };
  }, [wizardState.selectedFramework, wizardState.frameworkVersion, wizardState.assessments, requirementIds]);

  const getRequirementDetails = useCallback((requirementId: string) => {
    if (!wizardState.selectedFramework) return null;
    return buildRequirementDetail(
      requirementId,
      wizardState.selectedFramework,
      undefined,
      getControlAnswer
    );
  }, [wizardState.selectedFramework, getControlAnswer]);

  // ============================================
  // RESET OPERATIONS
  // ============================================

  const resetFrameworkAssessment = useCallback((frameworkId: FrameworkId) => {
    localStorage.removeItem(`${STORAGE_PREFIX}${frameworkId}`);
    localStorage.removeItem(`${STORAGE_PREFIX}scope_${frameworkId}`);

    if (wizardState.selectedFramework === frameworkId) {
      setWizardState(prev => ({
        ...prev,
        assessments: {},
        scope: null,
        completedRequirements: [],
        skippedRequirements: [],
        progress: {
          total: prev.progress.total,
          assessed: 0,
          compliant: 0,
          partiallyCompliant: 0,
          nonCompliant: 0,
          notApplicable: 0,
        },
      }));
    }
  }, [wizardState.selectedFramework]);

  const resetAllAssessments = useCallback(() => {
    const frameworks: FrameworkId[] = ['PCIDSS', 'SOC2', 'ISO27001', 'HIPAA', 'NIST', 'GDPR'];
    for (const framework of frameworks) {
      localStorage.removeItem(`${STORAGE_PREFIX}${framework}`);
      localStorage.removeItem(`${STORAGE_PREFIX}scope_${framework}`);
    }

    setWizardState({
      currentStep: 'framework_selection',
      selectedFramework: null,
      frameworkVersion: null,
      scope: null,
      currentRequirementId: null,
      assessments: {},
      completedRequirements: [],
      skippedRequirements: [],
      progress: {
        total: 0,
        assessed: 0,
        compliant: 0,
        partiallyCompliant: 0,
        nonCompliant: 0,
        notApplicable: 0,
      },
    });
  }, []);

  return {
    wizardState,
    setWizardStep,
    selectFramework,
    setScope,
    setCurrentRequirement,
    getAssessment,
    updateAssessmentStatus,
    saveDirectAssessment,
    addEvidence,
    removeEvidence,
    saveAddressableDecision,
    saveCompensatingControl,
    saveException,
    addNote,
    skipRequirement,
    unskipRequirement,
    getNextRequirement,
    getPreviousRequirement,
    navigateToRequirement,
    getSummary,
    getRequirementDetails,
    resetFrameworkAssessment,
    resetAllAssessments,
  };
}

export default useRequirementAssessment;
