/**
 * Live Regulatory Update Service
 *
 * Handles the core logic for:
 * 1. N:N mapping between controls and versioned requirements
 * 2. Compliance drift detection when frameworks update
 * 3. Auto-flagging controls that need updates
 * 4. Processing AI-generated regulatory change logs
 *
 * This service is framework-agnostic and can handle any regulation.
 */

import type {
  ExtendedFrameworkId,
  FrameworkVersion,
  MasterRequirement,
  VersionedRequirementMapping,
  ComplianceDrift,
  DriftType,
  RegulatoryChangeLog,
  SuggestedControl,
  RequirementVersionComparison,
  DiffHighlight,
  DriftResolutionOption,
} from '../types/regulatory-update.types';
import type { MasterControl, UserResponse } from '../constants/controls';
import type { EvidenceType } from '../types/control-requirement-mapping.types';

// ============================================
// STORAGE HELPERS
// ============================================

const STORAGE_KEYS = {
  FRAMEWORK_VERSIONS: 'regulatory-framework-versions',
  MASTER_REQUIREMENTS: 'regulatory-master-requirements',
  VERSIONED_MAPPINGS: 'regulatory-versioned-mappings',
  COMPLIANCE_DRIFT: 'regulatory-compliance-drift',
  CHANGE_LOGS: 'regulatory-change-logs',
  SUGGESTED_CONTROLS: 'regulatory-suggested-controls',
};

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save to storage (${key}):`, e);
  }
}

// ============================================
// FRAMEWORK VERSION MANAGEMENT
// ============================================

/**
 * Get all framework versions
 */
export function getFrameworkVersions(): FrameworkVersion[] {
  return loadFromStorage<FrameworkVersion[]>(STORAGE_KEYS.FRAMEWORK_VERSIONS, []);
}

/**
 * Get versions for a specific framework
 */
export function getVersionsForFramework(frameworkId: ExtendedFrameworkId): FrameworkVersion[] {
  return getFrameworkVersions().filter(v => v.frameworkId === frameworkId);
}

/**
 * Get the active (current) version of a framework
 */
export function getActiveFrameworkVersion(frameworkId: ExtendedFrameworkId): FrameworkVersion | null {
  const versions = getVersionsForFramework(frameworkId);
  return versions.find(v => v.status === 'active') || null;
}

/**
 * Get the latest version (may be draft or not yet effective)
 */
export function getLatestFrameworkVersion(frameworkId: ExtendedFrameworkId): FrameworkVersion | null {
  const versions = getVersionsForFramework(frameworkId);
  if (versions.length === 0) return null;

  return versions.sort((a, b) =>
    new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  )[0];
}

/**
 * Add a new framework version
 */
export function addFrameworkVersion(version: Omit<FrameworkVersion, 'id' | 'createdAt' | 'updatedAt'>): FrameworkVersion {
  const newVersion: FrameworkVersion = {
    ...version,
    id: `${version.frameworkId}_${version.versionCode}`.toLowerCase().replace(/\s+/g, '_'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const versions = getFrameworkVersions();
  versions.push(newVersion);
  saveToStorage(STORAGE_KEYS.FRAMEWORK_VERSIONS, versions);

  return newVersion;
}

/**
 * Update framework version status (e.g., activate a new version)
 */
export function updateFrameworkVersionStatus(
  versionId: string,
  status: FrameworkVersion['status']
): void {
  const versions = getFrameworkVersions();
  const version = versions.find(v => v.id === versionId);

  if (!version) return;

  // If activating, deactivate previous active version
  if (status === 'active') {
    versions.forEach(v => {
      if (v.frameworkId === version.frameworkId && v.status === 'active') {
        v.status = 'superseded';
      }
    });
  }

  version.status = status;
  version.updatedAt = new Date().toISOString();

  saveToStorage(STORAGE_KEYS.FRAMEWORK_VERSIONS, versions);
}

// ============================================
// MASTER REQUIREMENT LIBRARY
// ============================================

/**
 * Get all master requirements
 */
export function getMasterRequirements(): MasterRequirement[] {
  return loadFromStorage<MasterRequirement[]>(STORAGE_KEYS.MASTER_REQUIREMENTS, []);
}

/**
 * Get requirements for a specific framework version
 */
export function getRequirementsForVersion(frameworkVersionId: string): MasterRequirement[] {
  return getMasterRequirements().filter(r => r.frameworkVersionId === frameworkVersionId);
}

/**
 * Get a requirement by ID
 */
export function getRequirementById(requirementId: string): MasterRequirement | null {
  return getMasterRequirements().find(r => r.id === requirementId) || null;
}

/**
 * Search requirements by keyword or code
 */
export function searchRequirements(
  query: string,
  frameworkId?: ExtendedFrameworkId
): MasterRequirement[] {
  const requirements = getMasterRequirements();
  const lowerQuery = query.toLowerCase();

  return requirements.filter(r => {
    if (frameworkId && r.frameworkId !== frameworkId) return false;

    return (
      r.requirementCode.toLowerCase().includes(lowerQuery) ||
      r.title.toLowerCase().includes(lowerQuery) ||
      r.officialText.toLowerCase().includes(lowerQuery) ||
      r.keywords.some(k => k.toLowerCase().includes(lowerQuery))
    );
  });
}

// ============================================
// N:N MAPPING LOGIC (THE CROSSWALK)
// ============================================

/**
 * Get all versioned mappings
 */
export function getVersionedMappings(): VersionedRequirementMapping[] {
  return loadFromStorage<VersionedRequirementMapping[]>(STORAGE_KEYS.VERSIONED_MAPPINGS, []);
}

/**
 * Get mappings for a specific control
 */
export function getMappingsForControl(controlId: string): VersionedRequirementMapping[] {
  return getVersionedMappings().filter(m => m.controlId === controlId);
}

/**
 * Get mappings for a specific requirement
 */
export function getMappingsForRequirement(requirementId: string): VersionedRequirementMapping[] {
  return getVersionedMappings().filter(m => m.requirementId === requirementId);
}

/**
 * Get current (non-superseded) mappings for a control
 */
export function getCurrentMappingsForControl(controlId: string): VersionedRequirementMapping[] {
  return getMappingsForControl(controlId).filter(m =>
    !m.validUntilVersion && m.driftStatus !== 'invalidated'
  );
}

/**
 * Create a new versioned mapping
 */
export function createVersionedMapping(
  mapping: Omit<VersionedRequirementMapping, 'id' | 'createdAt' | 'updatedAt' | 'lastDriftCheck'>
): VersionedRequirementMapping {
  const newMapping: VersionedRequirementMapping = {
    ...mapping,
    id: crypto.randomUUID(),
    lastDriftCheck: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mappings = getVersionedMappings();
  mappings.push(newMapping);
  saveToStorage(STORAGE_KEYS.VERSIONED_MAPPINGS, mappings);

  return newMapping;
}

/**
 * Update mapping drift status
 */
export function updateMappingDriftStatus(
  mappingId: string,
  driftStatus: VersionedRequirementMapping['driftStatus']
): void {
  const mappings = getVersionedMappings();
  const mapping = mappings.find(m => m.id === mappingId);

  if (mapping) {
    mapping.driftStatus = driftStatus;
    mapping.lastDriftCheck = new Date().toISOString();
    mapping.updatedAt = new Date().toISOString();
    saveToStorage(STORAGE_KEYS.VERSIONED_MAPPINGS, mappings);
  }
}

// ============================================
// COMPLIANCE DRIFT DETECTION
// ============================================

/**
 * Context for drift detection - controls and their answers
 */
interface DriftDetectionContext {
  controls: MasterControl[];
  getControlAnswer: (controlId: string) => UserResponse | undefined;
}

let _driftContext: DriftDetectionContext | null = null;

/**
 * Set the context for drift detection
 */
export function setDriftDetectionContext(context: DriftDetectionContext): void {
  _driftContext = context;
}

/**
 * Get the current drift detection context
 */
export function getDriftDetectionContext(): DriftDetectionContext | null {
  return _driftContext;
}

/**
 * Get all compliance drift records
 */
export function getComplianceDrift(): ComplianceDrift[] {
  return loadFromStorage<ComplianceDrift[]>(STORAGE_KEYS.COMPLIANCE_DRIFT, []);
}

/**
 * Get unresolved drift for a control
 */
export function getUnresolvedDriftForControl(controlId: string): ComplianceDrift[] {
  return getComplianceDrift().filter(d =>
    d.controlId === controlId &&
    d.status !== 'resolved' &&
    d.status !== 'accepted_risk'
  );
}

/**
 * Get drift alerts by severity
 */
export function getDriftBySeverity(severity: ComplianceDrift['severity']): ComplianceDrift[] {
  return getComplianceDrift().filter(d =>
    d.severity === severity && d.status !== 'resolved'
  );
}

/**
 * Detect compliance drift when a framework updates
 *
 * This is the core logic that:
 * 1. Compares old vs new requirements
 * 2. Checks if existing control answers still satisfy new requirements
 * 3. Creates drift alerts for controls that need attention
 */
export function detectComplianceDrift(
  oldVersionId: string,
  newVersionId: string,
  controls: MasterControl[],
  getControlAnswer: (controlId: string) => UserResponse | undefined
): ComplianceDrift[] {
  const oldRequirements = getRequirementsForVersion(oldVersionId);
  const newRequirements = getRequirementsForVersion(newVersionId);
  const mappings = getVersionedMappings();

  const driftAlerts: ComplianceDrift[] = [];

  // Build lookup maps
  const oldReqMap = new Map(oldRequirements.map(r => [r.requirementCode, r]));
  // Note: newReqMap reserved for future use (e.g., detecting removed requirements)
  const _newReqMap = new Map(newRequirements.map(r => [r.requirementCode, r]));
  void _newReqMap; // Suppress unused variable warning

  // Check each new requirement
  for (const newReq of newRequirements) {
    const oldReq = oldReqMap.get(newReq.requirementCode);

    // Find controls mapped to this requirement (via old version)
    const relevantMappings = mappings.filter(m =>
      m.frameworkVersionId === oldVersionId &&
      oldReq && m.requirementId === oldReq.id
    );

    for (const mapping of relevantMappings) {
      const answer = getControlAnswer(mapping.controlId);
      const control = controls.find(c => c.id === mapping.controlId);

      if (!control || !answer) continue;

      // Analyze the change
      const driftAnalysis = analyzeRequirementChange(oldReq!, newReq, answer);

      if (driftAnalysis.hasDrift) {
        const drift: ComplianceDrift = {
          id: crypto.randomUUID(),
          controlId: mapping.controlId,
          mappingId: mapping.id,
          requirementId: newReq.id,
          oldFrameworkVersionId: oldVersionId,
          newFrameworkVersionId: newVersionId,
          driftType: driftAnalysis.driftType,
          severity: driftAnalysis.severity,
          previousRequirementText: oldReq!.officialText,
          newRequirementText: newReq.officialText,
          changeSummary: driftAnalysis.changeSummary,
          impactAssessment: driftAnalysis.impactAssessment,
          affectedEvidenceTypes: driftAnalysis.affectedEvidenceTypes,
          previousAnswer: answer.answer || 'no',
          answerStillValid: driftAnalysis.answerStillValid,
          validityReason: driftAnalysis.validityReason,
          status: 'detected',
          resolutionPath: generateResolutionOptions(driftAnalysis),
          complianceDeadline: newReq.effectiveDate,
          daysRemaining: calculateDaysRemaining(newReq.effectiveDate),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        driftAlerts.push(drift);

        // Update mapping drift status
        updateMappingDriftStatus(mapping.id, driftAnalysis.answerStillValid ? 'at_risk' : 'drifted');
      }
    }

    // Check for entirely new requirements (no mapping exists)
    if (!oldReq) {
      // This is a new requirement - check if any existing controls could map
      const potentialControls = findPotentialControlMatches(newReq, controls);

      if (potentialControls.length > 0) {
        // Create drift alert for new requirement that affects existing controls
        for (const potentialControl of potentialControls) {
          const drift: ComplianceDrift = {
            id: crypto.randomUUID(),
            controlId: potentialControl.controlId,
            mappingId: '', // No existing mapping
            requirementId: newReq.id,
            oldFrameworkVersionId: oldVersionId,
            newFrameworkVersionId: newVersionId,
            driftType: 'new_requirement',
            severity: determineSeverityForNewRequirement(newReq),
            previousRequirementText: '',
            newRequirementText: newReq.officialText,
            changeSummary: `New requirement added: ${newReq.title}`,
            impactAssessment: `This new requirement may affect control "${potentialControl.controlTitle}". Review needed.`,
            affectedEvidenceTypes: newReq.requiredEvidenceTypes,
            previousAnswer: getControlAnswer(potentialControl.controlId)?.answer || 'no',
            answerStillValid: false,
            validityReason: 'New requirement requires explicit assessment',
            status: 'detected',
            resolutionPath: [
              {
                id: crypto.randomUUID(),
                type: 'update_control',
                description: 'Update existing control to address new requirement',
                effort: 'medium',
                recommendedActions: [
                  'Review the new requirement in detail',
                  'Assess if current control implementation satisfies the requirement',
                  'Update control documentation if needed',
                  'Gather required evidence',
                ],
              },
              {
                id: crypto.randomUUID(),
                type: 'create_new_control',
                description: 'Create a new dedicated control for this requirement',
                effort: 'high',
                recommendedActions: [
                  'Design new control specific to this requirement',
                  'Implement the control',
                  'Document implementation',
                  'Collect evidence',
                ],
              },
            ],
            complianceDeadline: newReq.effectiveDate,
            daysRemaining: calculateDaysRemaining(newReq.effectiveDate),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          driftAlerts.push(drift);
        }
      }
    }
  }

  // Save all drift alerts
  const existingDrift = getComplianceDrift();
  saveToStorage(STORAGE_KEYS.COMPLIANCE_DRIFT, [...existingDrift, ...driftAlerts]);

  return driftAlerts;
}

/**
 * Analyze the change between old and new requirement versions
 */
function analyzeRequirementChange(
  oldReq: MasterRequirement,
  newReq: MasterRequirement,
  userAnswer: UserResponse
): {
  hasDrift: boolean;
  driftType: DriftType;
  severity: ComplianceDrift['severity'];
  changeSummary: string;
  impactAssessment: string;
  affectedEvidenceTypes: EvidenceType[];
  answerStillValid: boolean;
  validityReason: string;
} {
  const changes: string[] = [];
  let severity: ComplianceDrift['severity'] = 'low';
  let driftType: DriftType = 'requirement_expanded';
  let answerStillValid = true;

  // Check if requirement text changed significantly
  const textChanged = oldReq.officialText !== newReq.officialText;
  if (textChanged) {
    changes.push('Requirement text has been updated');

    // Check for strengthening keywords
    const strengtheningKeywords = ['must', 'shall', 'required', 'mandatory', 'always', 'all'];
    const oldStrength = strengtheningKeywords.filter(k =>
      newReq.officialText.toLowerCase().includes(k) &&
      !oldReq.officialText.toLowerCase().includes(k)
    );

    if (oldStrength.length > 0) {
      driftType = 'requirement_strengthened';
      severity = 'high';
      changes.push(`Requirement strengthened with: ${oldStrength.join(', ')}`);
    }
  }

  // Check implementation level change
  if (oldReq.implementationLevel !== newReq.implementationLevel) {
    if (
      (oldReq.implementationLevel === 'recommended' && newReq.implementationLevel === 'mandatory') ||
      (oldReq.implementationLevel === 'optional' && newReq.implementationLevel === 'mandatory')
    ) {
      driftType = 'requirement_strengthened';
      severity = 'critical';
      changes.push(`Changed from ${oldReq.implementationLevel} to ${newReq.implementationLevel}`);

      // If user answered "no" to an optional that's now mandatory
      if (userAnswer.answer === 'no' || userAnswer.answer === 'na') {
        answerStillValid = false;
      }
    }
  }

  // Check evidence requirements
  const newEvidenceTypes = newReq.requiredEvidenceTypes.filter(
    e => !oldReq.requiredEvidenceTypes.includes(e)
  );
  if (newEvidenceTypes.length > 0) {
    driftType = 'evidence_type_changed';
    severity = severity === 'critical' ? 'critical' : 'medium';
    changes.push(`New evidence types required: ${newEvidenceTypes.join(', ')}`);
  }

  // Check verification frequency
  const frequencyOrder = ['once', 'annual', 'semi_annual', 'quarterly', 'monthly', 'continuous'];
  const oldFreqIndex = frequencyOrder.indexOf(oldReq.verificationFrequency);
  const newFreqIndex = frequencyOrder.indexOf(newReq.verificationFrequency);

  if (newFreqIndex > oldFreqIndex) {
    driftType = 'verification_frequency_changed';
    severity = severity === 'critical' ? 'critical' : 'medium';
    changes.push(`Verification frequency increased from ${oldReq.verificationFrequency} to ${newReq.verificationFrequency}`);
  }

  // Check risk weight
  if (newReq.riskWeight > oldReq.riskWeight + 2) {
    severity = 'high';
    changes.push(`Risk weight increased from ${oldReq.riskWeight} to ${newReq.riskWeight}`);
  }

  // Check for emerging tech categories (2026 specific)
  if (newReq.emergingTechCategory && !oldReq.emergingTechCategory) {
    driftType = 'technology_specific';
    severity = 'high';
    changes.push(`New technology-specific requirement: ${newReq.emergingTechCategory}`);
    answerStillValid = false; // Force review for tech-specific changes
  }

  const hasDrift = changes.length > 0;

  return {
    hasDrift,
    driftType,
    severity,
    changeSummary: changes.join('. '),
    impactAssessment: generateImpactAssessment(changes, userAnswer),
    affectedEvidenceTypes: newEvidenceTypes.length > 0 ? newEvidenceTypes : newReq.requiredEvidenceTypes,
    answerStillValid,
    validityReason: answerStillValid
      ? 'Current implementation may still satisfy the updated requirement, but review is recommended'
      : 'Current implementation needs to be reassessed to meet updated requirement',
  };
}

/**
 * Generate impact assessment text
 */
function generateImpactAssessment(changes: string[], userAnswer: UserResponse): string {
  const answerStatus = userAnswer.answer === 'yes'
    ? 'currently marked as compliant'
    : userAnswer.answer === 'partial'
    ? 'currently marked as partially compliant'
    : 'currently marked as non-compliant';

  return `This control is ${answerStatus}. The following changes may affect your compliance status: ${changes.join('; ')}.`;
}

/**
 * Generate resolution options based on drift analysis
 */
function generateResolutionOptions(
  analysis: ReturnType<typeof analyzeRequirementChange>
): DriftResolutionOption[] {
  const options: DriftResolutionOption[] = [];

  if (analysis.driftType === 'evidence_type_changed') {
    options.push({
      id: crypto.randomUUID(),
      type: 'add_evidence',
      description: 'Collect and upload the newly required evidence types',
      effort: 'low',
      recommendedActions: [
        'Review the new evidence requirements',
        'Gather the required documentation',
        'Upload evidence to the system',
        'Request verification',
      ],
    });
  }

  if (analysis.driftType === 'requirement_strengthened' || analysis.driftType === 'technology_specific') {
    options.push({
      id: crypto.randomUUID(),
      type: 'update_control',
      description: 'Update your control implementation to meet stricter requirements',
      effort: 'medium',
      recommendedActions: [
        'Review the updated requirement in detail',
        'Identify gaps in current implementation',
        'Update policies and procedures',
        'Implement technical changes if needed',
        'Update documentation',
        'Re-test and validate',
      ],
    });
  }

  options.push({
    id: crypto.randomUUID(),
    type: 'accept_risk',
    description: 'Accept the risk with documented justification (not recommended for critical changes)',
    effort: 'low',
    recommendedActions: [
      'Document business justification',
      'Assess residual risk',
      'Get management approval',
      'Set review date',
    ],
  });

  return options;
}

/**
 * Find controls that might be affected by a new requirement
 */
function findPotentialControlMatches(
  requirement: MasterRequirement,
  controls: MasterControl[]
): { controlId: string; controlTitle: string; confidence: number }[] {
  const matches: { controlId: string; controlTitle: string; confidence: number }[] = [];

  for (const control of controls) {
    // Calculate keyword overlap
    const controlKeywords = new Set([
      ...control.keywords,
      ...control.title.toLowerCase().split(' '),
    ]);

    const reqKeywords = new Set([
      ...requirement.keywords,
      ...requirement.title.toLowerCase().split(' '),
    ]);

    let matchCount = 0;
    for (const keyword of controlKeywords) {
      if (reqKeywords.has(keyword)) matchCount++;
    }

    const confidence = (matchCount / Math.max(reqKeywords.size, 1)) * 100;

    if (confidence >= 30) {
      matches.push({
        controlId: control.id,
        controlTitle: control.title,
        confidence,
      });
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

/**
 * Determine severity for new requirements
 */
function determineSeverityForNewRequirement(req: MasterRequirement): ComplianceDrift['severity'] {
  if (req.implementationLevel === 'mandatory' && req.riskWeight >= 8) return 'critical';
  if (req.implementationLevel === 'mandatory') return 'high';
  if (req.emergingTechCategory) return 'high';
  if (req.riskWeight >= 7) return 'medium';
  return 'low';
}

/**
 * Calculate days remaining until deadline
 */
function calculateDaysRemaining(deadline: string): number {
  const deadlineDate = new Date(deadline);
  const today = new Date();
  const diffTime = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================
// DRIFT RESOLUTION
// ============================================

/**
 * Resolve a compliance drift alert
 */
export function resolveDrift(
  driftId: string,
  resolution: {
    resolutionType: DriftResolutionOption['type'];
    notes: string;
    resolvedBy: string;
  }
): void {
  const driftRecords = getComplianceDrift();
  const drift = driftRecords.find(d => d.id === driftId);

  if (drift) {
    drift.status = 'resolved';
    drift.selectedResolution = resolution.resolutionType;
    drift.resolvedAt = new Date().toISOString();
    drift.resolvedBy = resolution.resolvedBy;
    drift.updatedAt = new Date().toISOString();

    // Update mapping status
    if (drift.mappingId) {
      updateMappingDriftStatus(drift.mappingId, 'current');
    }

    saveToStorage(STORAGE_KEYS.COMPLIANCE_DRIFT, driftRecords);
  }
}

/**
 * Acknowledge drift (mark as reviewed but not yet resolved)
 */
export function acknowledgeDrift(driftId: string): void {
  const driftRecords = getComplianceDrift();
  const drift = driftRecords.find(d => d.id === driftId);

  if (drift) {
    drift.status = 'acknowledged';
    drift.updatedAt = new Date().toISOString();
    saveToStorage(STORAGE_KEYS.COMPLIANCE_DRIFT, driftRecords);
  }
}

// ============================================
// VERSION COMPARISON FOR UI
// ============================================

/**
 * Generate side-by-side comparison for UI
 */
export function generateVersionComparison(
  requirementCode: string,
  oldVersionId: string,
  newVersionId: string,
  controls: MasterControl[],
  getControlAnswer: (controlId: string) => UserResponse | undefined
): RequirementVersionComparison | null {
  const oldReqs = getRequirementsForVersion(oldVersionId);
  const newReqs = getRequirementsForVersion(newVersionId);

  const oldReq = oldReqs.find(r => r.requirementCode === requirementCode);
  const newReq = newReqs.find(r => r.requirementCode === requirementCode);

  if (!newReq) return null;

  // Find affected controls
  const mappings = getVersionedMappings().filter(m =>
    m.frameworkVersionId === oldVersionId &&
    oldReq && m.requirementId === oldReq.id
  );

  const affectedControls = mappings.map(m => {
    const control = controls.find(c => c.id === m.controlId);
    const answer = getControlAnswer(m.controlId);

    return {
      controlId: m.controlId,
      controlCode: control?.id || m.controlId,
      currentAnswer: answer?.answer || 'no',
      answerStillValid: oldReq ? analyzeRequirementChange(oldReq, newReq, answer || { controlId: m.controlId, answer: null, notes: '', evidenceUrls: [], evidenceNotes: '', answeredAt: null }).answerStillValid : false,
      requiredAction: 'Review and update control implementation',
    };
  });

  // Generate diff highlights
  const diffHighlights = generateTextDiff(
    oldReq?.officialText || '',
    newReq.officialText
  );

  // Determine change type and severity
  let changeType: 'added' | 'modified' | 'removed' | 'unchanged' = 'unchanged';
  let changeSeverity: 'critical' | 'high' | 'medium' | 'low' = 'low';

  if (!oldReq) {
    changeType = 'added';
    changeSeverity = newReq.implementationLevel === 'mandatory' ? 'high' : 'medium';
  } else if (oldReq.officialText !== newReq.officialText) {
    changeType = 'modified';
    const analysis = analyzeRequirementChange(
      oldReq,
      newReq,
      { controlId: '', answer: 'yes', notes: '', evidenceUrls: [], evidenceNotes: '', answeredAt: null }
    );
    changeSeverity = analysis.severity;
  }

  const oldVersion = oldVersionId ? getFrameworkVersions().find(v => v.id === oldVersionId) : null;
  const newVersion = getFrameworkVersions().find(v => v.id === newVersionId);

  return {
    requirementCode,
    current: {
      versionId: oldVersionId,
      versionCode: oldVersion?.versionCode || 'Unknown',
      text: oldReq?.officialText || 'New requirement (not in previous version)',
      effectiveDate: oldReq?.effectiveDate || '',
    },
    new: {
      versionId: newVersionId,
      versionCode: newVersion?.versionCode || 'Unknown',
      text: newReq.officialText,
      effectiveDate: newReq.effectiveDate,
      transitionDeadline: newReq.transitionPeriodDays
        ? new Date(Date.now() + newReq.transitionPeriodDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
    },
    changeType,
    changeSeverity,
    diffHighlights,
    currentComplianceStatus: calculateCurrentComplianceStatus(affectedControls),
    projectedComplianceStatus: calculateProjectedComplianceStatus(affectedControls, changeType),
    affectedControls,
    recommendedActions: generateRecommendedActions(changeType, changeSeverity, newReq),
  };
}

/**
 * Generate text diff highlights
 */
function generateTextDiff(oldText: string, newText: string): DiffHighlight[] {
  const highlights: DiffHighlight[] = [];

  // Simple word-level diff (in production, use a proper diff library)
  const oldWords = oldText.split(/\s+/);
  const newWords = newText.split(/\s+/);

  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldWords.length || newIndex < newWords.length) {
    if (oldIndex >= oldWords.length) {
      // All remaining words are additions
      highlights.push({
        type: 'added',
        startIndex: newIndex,
        endIndex: newWords.length,
        newText: newWords.slice(newIndex).join(' '),
      });
      break;
    }

    if (newIndex >= newWords.length) {
      // All remaining words are deletions
      highlights.push({
        type: 'removed',
        startIndex: oldIndex,
        endIndex: oldWords.length,
        oldText: oldWords.slice(oldIndex).join(' '),
      });
      break;
    }

    if (oldWords[oldIndex] !== newWords[newIndex]) {
      highlights.push({
        type: 'changed',
        startIndex: oldIndex,
        endIndex: oldIndex + 1,
        oldText: oldWords[oldIndex],
        newText: newWords[newIndex],
      });
    }

    oldIndex++;
    newIndex++;
  }

  return highlights;
}

function calculateCurrentComplianceStatus(
  controls: { currentAnswer: string; answerStillValid: boolean }[]
): 'compliant' | 'partial' | 'non_compliant' | 'unknown' {
  if (controls.length === 0) return 'unknown';

  const yesCount = controls.filter(c => c.currentAnswer === 'yes').length;
  const partialCount = controls.filter(c => c.currentAnswer === 'partial').length;

  if (yesCount === controls.length) return 'compliant';
  if (yesCount + partialCount > 0) return 'partial';
  return 'non_compliant';
}

function calculateProjectedComplianceStatus(
  controls: { currentAnswer: string; answerStillValid: boolean }[],
  changeType: string
): 'compliant' | 'at_risk' | 'non_compliant' | 'needs_review' {
  if (changeType === 'added') return 'needs_review';

  const validCount = controls.filter(c => c.answerStillValid && c.currentAnswer === 'yes').length;

  if (validCount === controls.length) return 'compliant';
  if (validCount > 0) return 'at_risk';
  if (controls.some(c => !c.answerStillValid)) return 'non_compliant';
  return 'needs_review';
}

function generateRecommendedActions(
  changeType: string,
  severity: string,
  requirement: MasterRequirement
): string[] {
  const actions: string[] = [];

  if (changeType === 'added') {
    actions.push('Review the new requirement and assess applicability');
    actions.push('Identify controls that can address this requirement');
    actions.push('Create new controls if necessary');
  }

  if (severity === 'critical' || severity === 'high') {
    actions.push('Prioritize immediate review by compliance team');
    actions.push('Assess impact on current certifications');
  }

  if (requirement.emergingTechCategory) {
    actions.push(`Review ${requirement.emergingTechCategory} specific requirements`);
    actions.push('Consult with technical team on implementation feasibility');
  }

  actions.push('Update control documentation');
  actions.push('Collect required evidence');
  actions.push(`Ensure compliance by ${requirement.effectiveDate}`);

  return actions;
}

// ============================================
// REGULATORY CHANGE LOG PROCESSING
// ============================================

/**
 * Get all change logs
 */
export function getChangeLogs(): RegulatoryChangeLog[] {
  return loadFromStorage<RegulatoryChangeLog[]>(STORAGE_KEYS.CHANGE_LOGS, []);
}

/**
 * Add a new change log (typically from AI scraping)
 */
export function addChangeLog(log: Omit<RegulatoryChangeLog, 'id' | 'createdAt'>): RegulatoryChangeLog {
  const newLog: RegulatoryChangeLog = {
    ...log,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  const logs = getChangeLogs();
  logs.push(newLog);
  saveToStorage(STORAGE_KEYS.CHANGE_LOGS, logs);

  return newLog;
}

/**
 * Process a change log and generate drift alerts and suggested controls
 */
export function processChangeLog(
  logId: string,
  controls: MasterControl[],
  getControlAnswer: (controlId: string) => UserResponse | undefined
): {
  driftAlerts: ComplianceDrift[];
  suggestedControls: SuggestedControl[];
} {
  const logs = getChangeLogs();
  const log = logs.find(l => l.id === logId);

  if (!log || log.status !== 'verified') {
    return { driftAlerts: [], suggestedControls: [] };
  }

  const driftAlerts: ComplianceDrift[] = [];
  const suggestedControls: SuggestedControl[] = [];

  // Process each detected change
  for (const change of log.detailedChanges) {
    // Find affected controls based on keywords
    const affectedControls = controls.filter(c =>
      change.suggestedKeywords.some(k =>
        c.keywords.includes(k) || c.title.toLowerCase().includes(k)
      )
    );

    // Create drift alerts for affected controls
    for (const control of affectedControls) {
      const answer = getControlAnswer(control.id);

      const drift: ComplianceDrift = {
        id: crypto.randomUUID(),
        controlId: control.id,
        mappingId: '',
        requirementId: change.relatedRequirementIds[0] || '',
        oldFrameworkVersionId: '',
        newFrameworkVersionId: '',
        driftType: change.changeType === 'added' ? 'new_requirement' : 'requirement_expanded',
        severity: log.estimatedImpact === 'critical' ? 'critical' : log.estimatedImpact === 'high' ? 'high' : 'medium',
        previousRequirementText: change.previousText || '',
        newRequirementText: change.newText,
        changeSummary: change.aiInterpretation,
        impactAssessment: change.complianceImplication,
        affectedEvidenceTypes: [],
        previousAnswer: answer?.answer || 'no',
        answerStillValid: change.changeType !== 'added',
        validityReason: change.actionableInsight,
        status: 'detected',
        resolutionPath: [],
        complianceDeadline: log.effectiveDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        daysRemaining: calculateDaysRemaining(log.effectiveDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      driftAlerts.push(drift);
    }
  }

  // Add suggested controls from the log
  suggestedControls.push(...log.suggestedNewControls);

  // Update log status
  const logIndex = logs.findIndex(l => l.id === logId);
  if (logIndex !== -1) {
    logs[logIndex].status = 'processed';
    logs[logIndex].processedAt = new Date().toISOString();
    saveToStorage(STORAGE_KEYS.CHANGE_LOGS, logs);
  }

  // Save drift alerts
  const existingDrift = getComplianceDrift();
  saveToStorage(STORAGE_KEYS.COMPLIANCE_DRIFT, [...existingDrift, ...driftAlerts]);

  // Save suggested controls
  const existingSuggested = loadFromStorage<SuggestedControl[]>(STORAGE_KEYS.SUGGESTED_CONTROLS, []);
  saveToStorage(STORAGE_KEYS.SUGGESTED_CONTROLS, [...existingSuggested, ...suggestedControls]);

  return { driftAlerts, suggestedControls };
}

// ============================================
// STATISTICS AND DASHBOARD
// ============================================

/**
 * Get drift statistics for dashboard
 */
export function getDriftStatistics(): {
  totalDrift: number;
  criticalDrift: number;
  highDrift: number;
  mediumDrift: number;
  lowDrift: number;
  resolvedDrift: number;
  pendingDrift: number;
  averageDaysToDeadline: number;
  frameworksAffected: ExtendedFrameworkId[];
} {
  const drift = getComplianceDrift();
  const unresolvedDrift = drift.filter(d => d.status !== 'resolved');

  const frameworkVersions = getFrameworkVersions();
  const affectedVersionIds = new Set(drift.map(d => d.newFrameworkVersionId));
  const frameworksAffected = [...new Set(
    frameworkVersions
      .filter(v => affectedVersionIds.has(v.id))
      .map(v => v.frameworkId)
  )];

  return {
    totalDrift: drift.length,
    criticalDrift: drift.filter(d => d.severity === 'critical' && d.status !== 'resolved').length,
    highDrift: drift.filter(d => d.severity === 'high' && d.status !== 'resolved').length,
    mediumDrift: drift.filter(d => d.severity === 'medium' && d.status !== 'resolved').length,
    lowDrift: drift.filter(d => d.severity === 'low' && d.status !== 'resolved').length,
    resolvedDrift: drift.filter(d => d.status === 'resolved').length,
    pendingDrift: unresolvedDrift.length,
    averageDaysToDeadline: unresolvedDrift.length > 0
      ? unresolvedDrift.reduce((sum, d) => sum + d.daysRemaining, 0) / unresolvedDrift.length
      : 0,
    frameworksAffected: frameworksAffected as ExtendedFrameworkId[],
  };
}
