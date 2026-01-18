/**
 * Control-Requirement Mapping Service
 *
 * Manages the relationship between controls (the "Work") and requirements (the "Proof").
 *
 * Key responsibilities:
 * 1. Build and maintain the RequirementMapping junction table
 * 2. Detect custom gaps (unmapped requirements)
 * 3. Generate auditor views with requirement progress
 * 4. Calculate coverage scores
 */

import type { FrameworkId, MasterControl, UserResponse } from '../constants/controls';
import type {
  RequirementMapping,
  MappingStrength,
  CustomGap,
  GapType,
  RequirementProgress,
  RequirementStatus,
  FrameworkComplianceSummary,
  ControlCoverageIndex,
  MappedControlSummary,
  ControlImplementationStatus,
  DirectEvidenceRecord,
} from '../types/control-requirement-mapping.types';

// Import framework requirements
import { PCI_DSS_V4_REQUIREMENTS } from '../constants/pci-dss-requirements';
import { SOC2_TRUST_SERVICES_CRITERIA } from '../constants/soc2-requirements';
import { ISO27001_2022_CONTROLS } from '../constants/iso27001-requirements';
import { HIPAA_SECURITY_RULE } from '../constants/hipaa-requirements';
import { NIST_CSF_2_0 } from '../constants/nist-csf-requirements';
import { GDPR_REQUIREMENTS } from '../constants/gdpr-requirements';

// ============================================
// STORAGE HELPERS
// ============================================

const MAPPING_STORAGE_KEY = 'compliance-requirement-mappings';
const GAP_STORAGE_KEY = 'compliance-custom-gaps';
// const DIRECT_EVIDENCE_KEY = 'compliance-direct-evidence'; // Reserved for future use

function loadMappings(): RequirementMapping[] {
  try {
    const stored = localStorage.getItem(MAPPING_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveMappings(mappings: RequirementMapping[]): void {
  try {
    localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(mappings));
  } catch (e) {
    console.error('Failed to save mappings:', e);
  }
}

function loadGaps(): CustomGap[] {
  try {
    const stored = localStorage.getItem(GAP_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveGaps(gaps: CustomGap[]): void {
  try {
    localStorage.setItem(GAP_STORAGE_KEY, JSON.stringify(gaps));
  } catch (e) {
    console.error('Failed to save gaps:', e);
  }
}

// Direct evidence functions - reserved for future use
// function loadDirectEvidence(): DirectEvidenceRecord[] { ... }
// function saveDirectEvidence(evidence: DirectEvidenceRecord[]): void { ... }

// ============================================
// FRAMEWORK REQUIREMENT HELPERS
// ============================================

export interface FlatRequirement {
  id: string;
  frameworkId: FrameworkId;
  code: string;
  title: string;
  description: string;
  parentCode?: string;
  level: number;
  isLeaf: boolean;
  category?: string;
}

/**
 * Flatten all framework requirements into a searchable list
 */
export function getAllFrameworkRequirements(): FlatRequirement[] {
  const requirements: FlatRequirement[] = [];

  // PCI DSS
  flattenPCIDSSRequirements(requirements);

  // SOC 2
  SOC2_TRUST_SERVICES_CRITERIA.forEach(category => {
    category.categories.forEach(cat => {
      cat.criteria.forEach(criterion => {
        requirements.push({
          id: `SOC2-${criterion.id}`,
          frameworkId: 'SOC2',
          code: criterion.id,
          title: criterion.title,
          description: criterion.description,
          parentCode: cat.id,
          level: 2,
          isLeaf: true,
          category: category.name,
        });
      });
    });
  });

  // ISO 27001
  ISO27001_2022_CONTROLS.forEach(domain => {
    domain.controls.forEach(control => {
      requirements.push({
        id: `ISO27001-${control.id}`,
        frameworkId: 'ISO27001',
        code: control.id,
        title: control.title,
        description: control.description || '',
        parentCode: domain.id,
        level: 1,
        isLeaf: true,
        category: domain.name,
      });
    });
  });

  // HIPAA
  HIPAA_SECURITY_RULE.forEach(category => {
    category.standards.forEach(standard => {
      standard.specifications.forEach(spec => {
        requirements.push({
          id: `HIPAA-${spec.id}`,
          frameworkId: 'HIPAA',
          code: spec.id,
          title: spec.title,
          description: spec.description || '',
          parentCode: standard.id,
          level: 2,
          isLeaf: true,
          category: category.name,
        });
      });
    });
  });

  // NIST CSF 2.0
  NIST_CSF_2_0.forEach(func => {
    func.categories.forEach(cat => {
      cat.subcategories.forEach(subcat => {
        requirements.push({
          id: `NIST-${subcat.id}`,
          frameworkId: 'NIST',
          code: subcat.id,
          title: subcat.title,
          description: subcat.title, // NIST subcategories only have title
          parentCode: cat.id,
          level: 2,
          isLeaf: true,
          category: func.name,
        });
      });
    });
  });

  // GDPR
  GDPR_REQUIREMENTS.forEach(chapter => {
    chapter.articles.forEach(article => {
      if (article.provisions) {
        article.provisions.forEach(provision => {
          requirements.push({
            id: `GDPR-${provision.id}`,
            frameworkId: 'GDPR',
            code: provision.id,
            title: provision.title,
            description: provision.description || '',
            parentCode: article.id,
            level: 2,
            isLeaf: true,
            category: chapter.name,
          });
        });
      } else {
        requirements.push({
          id: `GDPR-${article.id}`,
          frameworkId: 'GDPR',
          code: article.id,
          title: article.name,
          description: '',
          parentCode: `Chapter ${chapter.id}`,
          level: 1,
          isLeaf: true,
          category: chapter.name,
        });
      }
    });
  });

  return requirements;
}

function flattenPCIDSSRequirements(result: FlatRequirement[]): void {
  // PCI DSS structure: PrincipalRequirement -> SubRequirement -> Requirement
  for (const principal of PCI_DSS_V4_REQUIREMENTS) {
    // Add principal requirement (e.g., "1", "2", etc.)
    result.push({
      id: `PCIDSS-${principal.id}`,
      frameworkId: 'PCIDSS',
      code: principal.id,
      title: principal.name,
      description: principal.name,
      level: 0,
      isLeaf: false,
      category: principal.id,
    });

    for (const sub of principal.subRequirements) {
      // Add sub requirement (e.g., "1.1", "1.2", etc.)
      result.push({
        id: `PCIDSS-${sub.id}`,
        frameworkId: 'PCIDSS',
        code: sub.id,
        title: sub.name,
        description: sub.name,
        parentCode: principal.id,
        level: 1,
        isLeaf: false,
        category: principal.id,
      });

      for (const req of sub.requirements) {
        // Add leaf requirement (e.g., "1.1.1", "1.1.2", etc.)
        result.push({
          id: `PCIDSS-${req.id}`,
          frameworkId: 'PCIDSS',
          code: req.id,
          title: req.title,
          description: req.description || req.title,
          parentCode: sub.id,
          level: 2,
          isLeaf: true,
          category: principal.id,
        });
      }
    }
  }
}

/**
 * Get requirements for a specific framework
 */
export function getFrameworkRequirements(frameworkId: FrameworkId): FlatRequirement[] {
  return getAllFrameworkRequirements().filter(r => r.frameworkId === frameworkId);
}

/**
 * Get leaf requirements (testable requirements) for a framework
 */
export function getLeafRequirements(frameworkId: FrameworkId): FlatRequirement[] {
  return getFrameworkRequirements(frameworkId).filter(r => r.isLeaf);
}

// ============================================
// MAPPING OPERATIONS
// ============================================

/**
 * Create a new requirement mapping
 */
export function createMapping(
  controlId: string,
  requirementId: string,
  mappingStrength: MappingStrength,
  coveragePercentage: number,
  coveredAspects: string[],
  justification: string
): RequirementMapping {
  const mapping: RequirementMapping = {
    id: crypto.randomUUID(),
    controlId,
    requirementId,
    mappingStrength,
    coveragePercentage,
    coveredAspects,
    mappingJustification: justification,
    isAutoMapped: false,
    humanReviewed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mappings = loadMappings();
  mappings.push(mapping);
  saveMappings(mappings);

  // Recalculate gaps after adding mapping
  recalculateGaps();

  return mapping;
}

/**
 * Get all mappings for a control
 */
export function getMappingsForControl(controlId: string): RequirementMapping[] {
  return loadMappings().filter(m => m.controlId === controlId);
}

/**
 * Get all mappings for a requirement
 */
export function getMappingsForRequirement(requirementId: string): RequirementMapping[] {
  return loadMappings().filter(m => m.requirementId === requirementId);
}

/**
 * Remove a mapping
 */
export function removeMapping(mappingId: string): void {
  const mappings = loadMappings().filter(m => m.id !== mappingId);
  saveMappings(mappings);
  recalculateGaps();
}

/**
 * Update a mapping
 */
export function updateMapping(mappingId: string, updates: Partial<RequirementMapping>): void {
  const mappings = loadMappings();
  const index = mappings.findIndex(m => m.id === mappingId);
  if (index !== -1) {
    mappings[index] = {
      ...mappings[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveMappings(mappings);
    recalculateGaps();
  }
}

// ============================================
// GAP DETECTION
// ============================================

/**
 * Recalculate all custom gaps across all frameworks
 */
export function recalculateGaps(): CustomGap[] {
  const allRequirements = getAllFrameworkRequirements().filter(r => r.isLeaf);
  const mappings = loadMappings();
  const existingGaps = loadGaps();

  const gaps: CustomGap[] = [];

  for (const req of allRequirements) {
    const reqMappings = mappings.filter(m => m.requirementId === req.id);

    // Check if requirement has any mappings
    if (reqMappings.length === 0) {
      // Find existing gap or create new one
      const existingGap = existingGaps.find(g => g.requirementId === req.id);

      gaps.push({
        id: existingGap?.id || crypto.randomUUID(),
        requirementId: req.id,
        gapType: 'no_control_mapped',
        severity: determineSeverity(req),
        description: `No controls are mapped to requirement ${req.code}: ${req.title}`,
        missingCoverage: ['Full requirement coverage'],
        resolutionOptions: generateResolutionOptions('no_control_mapped'),
        selectedResolution: existingGap?.selectedResolution,
        status: existingGap?.status || 'identified',
        directEvidence: existingGap?.directEvidence || [],
        compensatingControl: existingGap?.compensatingControl,
        riskAcceptance: existingGap?.riskAcceptance,
        identifiedAt: existingGap?.identifiedAt || new Date().toISOString(),
        identifiedBy: existingGap?.identifiedBy || 'system',
        resolvedAt: existingGap?.resolvedAt,
        resolvedBy: existingGap?.resolvedBy,
        notes: existingGap?.notes || '',
      });
    } else {
      // Check if coverage is sufficient
      const totalCoverage = calculateTotalCoverage(reqMappings);
      if (totalCoverage < 80) {
        const existingGap = existingGaps.find(g => g.requirementId === req.id);

        gaps.push({
          id: existingGap?.id || crypto.randomUUID(),
          requirementId: req.id,
          gapType: 'insufficient_coverage',
          severity: totalCoverage < 50 ? 'high' : 'medium',
          description: `Controls only cover ${totalCoverage}% of requirement ${req.code}`,
          missingCoverage: findMissingCoverage(reqMappings),
          resolutionOptions: generateResolutionOptions('insufficient_coverage'),
          selectedResolution: existingGap?.selectedResolution,
          status: existingGap?.status || 'identified',
          directEvidence: existingGap?.directEvidence || [],
          compensatingControl: existingGap?.compensatingControl,
          riskAcceptance: existingGap?.riskAcceptance,
          identifiedAt: existingGap?.identifiedAt || new Date().toISOString(),
          identifiedBy: existingGap?.identifiedBy || 'system',
          resolvedAt: existingGap?.resolvedAt,
          resolvedBy: existingGap?.resolvedBy,
          notes: existingGap?.notes || '',
        });
      }
    }
  }

  saveGaps(gaps);
  return gaps;
}

function determineSeverity(req: FlatRequirement): 'critical' | 'high' | 'medium' | 'low' {
  // Determine severity based on framework and requirement type
  const title = req.title.toLowerCase();
  const code = req.code.toLowerCase();

  if (
    title.includes('critical') ||
    title.includes('encryption') ||
    title.includes('authentication') ||
    code.includes('cc6') || // SOC2 access controls
    code.includes('164.312') // HIPAA technical safeguards
  ) {
    return 'critical';
  }

  if (
    title.includes('access') ||
    title.includes('audit') ||
    title.includes('incident') ||
    title.includes('backup')
  ) {
    return 'high';
  }

  if (
    title.includes('policy') ||
    title.includes('procedure') ||
    title.includes('training')
  ) {
    return 'medium';
  }

  return 'low';
}

function calculateTotalCoverage(mappings: RequirementMapping[]): number {
  if (mappings.length === 0) return 0;

  // For direct mappings, take the max coverage
  // For partial/supportive, aggregate with diminishing returns
  let coverage = 0;
  const sortedMappings = [...mappings].sort((a, b) => b.coveragePercentage - a.coveragePercentage);

  for (const mapping of sortedMappings) {
    const contribution = mapping.coveragePercentage * (1 - coverage / 100);
    coverage += contribution;
    if (coverage >= 100) break;
  }

  return Math.min(100, Math.round(coverage));
}

function findMissingCoverage(mappings: RequirementMapping[]): string[] {
  // Return aspects that aren't covered based on mapping's uncoveredAspects
  const uncovered = mappings
    .filter(m => m.uncoveredAspects)
    .flatMap(m => m.uncoveredAspects || []);

  return [...new Set(uncovered)];
}

function generateResolutionOptions(_gapType: GapType) {
  const options = [
    {
      id: 'create_control',
      type: 'create_control' as const,
      description: 'Create a new control to address this requirement',
      effort: 'high' as const,
      recommendedTemplates: ['control-template'],
    },
    {
      id: 'upload_evidence',
      type: 'upload_evidence' as const,
      description: 'Upload direct evidence showing compliance',
      effort: 'low' as const,
    },
    {
      id: 'create_policy',
      type: 'create_policy' as const,
      description: 'Create a policy document addressing this requirement',
      effort: 'medium' as const,
      recommendedTemplates: ['policy-template'],
    },
    {
      id: 'compensating_control',
      type: 'compensating_control' as const,
      description: 'Document a compensating control that provides equivalent protection',
      effort: 'medium' as const,
    },
    {
      id: 'accept_risk',
      type: 'accept_risk' as const,
      description: 'Accept the risk with documented justification',
      effort: 'low' as const,
    },
  ];

  return options;
}

/**
 * Get all gaps for a framework
 */
export function getGapsForFramework(frameworkId: FrameworkId): CustomGap[] {
  const gaps = loadGaps();
  const frameworkRequirements = getFrameworkRequirements(frameworkId).filter(r => r.isLeaf);
  const reqIds = new Set(frameworkRequirements.map(r => r.id));
  return gaps.filter(g => reqIds.has(g.requirementId));
}

/**
 * Update gap status
 */
export function updateGap(gapId: string, updates: Partial<CustomGap>): void {
  const gaps = loadGaps();
  const index = gaps.findIndex(g => g.id === gapId);
  if (index !== -1) {
    gaps[index] = { ...gaps[index], ...updates };
    saveGaps(gaps);
  }
}

/**
 * Add direct evidence to a gap
 */
export function addDirectEvidenceToGap(
  gapId: string,
  evidence: Omit<DirectEvidenceRecord, 'id' | 'gapId' | 'uploadedAt'>
): DirectEvidenceRecord {
  const gaps = loadGaps();
  const gapIndex = gaps.findIndex(g => g.id === gapId);

  if (gapIndex === -1) {
    throw new Error('Gap not found');
  }

  const newEvidence: DirectEvidenceRecord = {
    ...evidence,
    id: crypto.randomUUID(),
    gapId,
    uploadedAt: new Date().toISOString(),
  };

  gaps[gapIndex].directEvidence.push(newEvidence);
  saveGaps(gaps);

  return newEvidence;
}

// ============================================
// AUDITOR VIEW - CONTROL CONTEXT
// ============================================

/**
 * Context for requirement progress calculation
 * Allows passing control data and answer lookup function
 */
export interface RequirementProgressContext {
  controls: MasterControl[];
  getControlAnswer: (controlId: string) => UserResponse | undefined;
}

let _progressContext: RequirementProgressContext | null = null;

/**
 * Set the context for requirement progress calculations
 * Call this before calling getRequirementProgress to ensure control data is available
 */
export function setRequirementProgressContext(context: RequirementProgressContext): void {
  _progressContext = context;
}

/**
 * Clear the requirement progress context
 */
export function clearRequirementProgressContext(): void {
  _progressContext = null;
}

/**
 * Convert control answer to implementation status
 */
function answerToImplementationStatus(answer: UserResponse['answer']): ControlImplementationStatus {
  switch (answer) {
    case 'yes':
      return 'implemented';
    case 'partial':
      return 'in_progress';
    case 'na':
      return 'not_applicable';
    case 'no':
    case null:
    default:
      return 'not_started';
  }
}

/**
 * Calculate effective coverage based on control answer
 * yes = 100%, partial = 50%, no/na/null = 0%
 */
function getAnswerCoverageMultiplier(answer: UserResponse['answer']): number {
  switch (answer) {
    case 'yes':
      return 1.0;
    case 'partial':
      return 0.5;
    case 'na':
    case 'no':
    case null:
    default:
      return 0;
  }
}

// ============================================
// AUDITOR VIEW
// ============================================

/**
 * Generate requirement progress view for auditors
 */
export function getRequirementProgress(requirementId: string): RequirementProgress | null {
  const allRequirements = getAllFrameworkRequirements();
  const req = allRequirements.find(r => r.id === requirementId);

  if (!req) return null;

  const mappings = getMappingsForRequirement(requirementId);
  const gaps = loadGaps();
  const gap = gaps.find(g => g.requirementId === requirementId);

  // Build mapped controls from explicit mappings OR from control.frameworkMappings
  const mappedControls: MappedControlSummary[] = [];

  // First, add controls from explicit mappings
  for (const m of mappings) {
    const control = _progressContext?.controls.find(c => c.id === m.controlId);
    const answer = _progressContext?.getControlAnswer(m.controlId);
    const implementationStatus = answerToImplementationStatus(answer?.answer ?? null);

    mappedControls.push({
      controlId: m.controlId,
      controlCode: control?.id || m.controlId,
      controlTitle: control?.title || 'Control',
      mappingStrength: m.mappingStrength,
      coveragePercentage: m.coveragePercentage,
      implementationStatus,
      evidenceCount: answer?.evidenceUrls?.length || 0,
      hasVerifiedEvidence: (answer?.evidenceUrls?.length || 0) > 0,
    });
  }

  // If no explicit mappings, build virtual mappings from control.frameworkMappings
  if (mappings.length === 0 && _progressContext) {
    // Extract framework and clause from requirement ID (e.g., "SOC2-CC6.1" -> { framework: "SOC2", clause: "CC6.1" })
    const match = requirementId.match(/^([A-Z0-9]+)-(.+)$/);
    if (match) {
      const [, frameworkId, clauseId] = match;

      // Find all controls that map to this requirement
      for (const control of _progressContext.controls) {
        const frameworkMapping = control.frameworkMappings.find(
          fm => fm.frameworkId === frameworkId && fm.clauseId === clauseId
        );

        if (frameworkMapping) {
          const answer = _progressContext.getControlAnswer(control.id);
          const implementationStatus = answerToImplementationStatus(answer?.answer ?? null);

          mappedControls.push({
            controlId: control.id,
            controlCode: control.id,
            controlTitle: control.title,
            mappingStrength: 'partial' as MappingStrength,
            coveragePercentage: 50, // Default for auto-mapped
            implementationStatus,
            evidenceCount: answer?.evidenceUrls?.length || 0,
            hasVerifiedEvidence: (answer?.evidenceUrls?.length || 0) > 0,
          });
        }
      }
    }
  }

  // Calculate total coverage based on control implementation
  let totalCoverage = 0;
  if (mappedControls.length > 0) {
    // Weight coverage by implementation status
    let weightedCoverage = 0;
    for (const mc of mappedControls) {
      const answer = _progressContext?.getControlAnswer(mc.controlId);
      const multiplier = getAnswerCoverageMultiplier(answer?.answer ?? null);
      weightedCoverage += mc.coveragePercentage * multiplier;
    }
    // Calculate with diminishing returns
    totalCoverage = Math.min(100, Math.round(weightedCoverage));
  }

  // Determine status based on control implementation
  let status: RequirementStatus = 'not_started';

  if (gap && gap.status !== 'resolved') {
    status = 'custom_gap';
  } else if (mappedControls.length === 0) {
    status = 'not_started';
  } else {
    // Count implementation statuses
    const implemented = mappedControls.filter(
      c => c.implementationStatus === 'implemented' || c.implementationStatus === 'verified'
    ).length;
    const inProgress = mappedControls.filter(c => c.implementationStatus === 'in_progress').length;
    const notApplicable = mappedControls.filter(c => c.implementationStatus === 'not_applicable').length;
    const total = mappedControls.length;

    // All applicable controls are implemented
    if (implemented === total - notApplicable && total > notApplicable) {
      status = 'compliant';
    } else if (implemented > 0 || inProgress > 0) {
      status = totalCoverage >= 50 ? 'partially_compliant' : 'in_progress';
    } else if (notApplicable === total) {
      status = 'not_applicable';
    } else {
      status = 'not_started';
    }
  }

  return {
    requirementId,
    frameworkId: req.frameworkId,
    requirementCode: req.code,
    title: req.title,
    status,
    mappedControls,
    totalCoverage,
    hasGap: !!gap && gap.status !== 'resolved',
    gapInfo: gap
      ? {
          gapType: gap.gapType,
          description: gap.description,
          resolution: gap.selectedResolution,
        }
      : undefined,
    evidenceSummary: {
      total: 0,
      verified: 0,
      pending: 0,
      expired: 0,
    },
    directEvidence: gap?.directEvidence || [],
    lastAssessedAt: undefined,
    lastEvidenceAt: undefined,
  };
}

/**
 * Generate framework compliance summary for auditors
 */
export function getFrameworkComplianceSummary(frameworkId: FrameworkId): FrameworkComplianceSummary {
  const requirements = getLeafRequirements(frameworkId);
  const gaps = getGapsForFramework(frameworkId);

  // Initialize counts
  let compliant = 0;
  let partiallyCompliant = 0;
  let nonCompliant = 0;
  let notStarted = 0;
  let notApplicable = 0;
  let customGaps = gaps.filter(g => g.status !== 'resolved').length;

  // Count by status
  for (const req of requirements) {
    const progress = getRequirementProgress(req.id);
    if (!progress) continue;

    switch (progress.status) {
      case 'compliant':
        compliant++;
        break;
      case 'partially_compliant':
        partiallyCompliant++;
        break;
      case 'non_compliant':
        nonCompliant++;
        break;
      case 'not_started':
        notStarted++;
        break;
      case 'not_applicable':
        notApplicable++;
        break;
      case 'custom_gap':
        // Already counted in customGaps
        break;
    }
  }

  // Calculate overall score
  const assessable = requirements.length - notApplicable;
  const overallScore =
    assessable > 0 ? Math.round(((compliant + partiallyCompliant * 0.5) / assessable) * 100) : 0;

  // Count gaps by severity
  const criticalGaps = gaps.filter(g => g.severity === 'critical' && g.status !== 'resolved').length;
  const highGaps = gaps.filter(g => g.severity === 'high' && g.status !== 'resolved').length;
  const mediumGaps = gaps.filter(g => g.severity === 'medium' && g.status !== 'resolved').length;
  const lowGaps = gaps.filter(g => g.severity === 'low' && g.status !== 'resolved').length;

  const frameworkNames: Record<FrameworkId, string> = {
    SOC2: 'SOC 2 Type II',
    ISO27001: 'ISO 27001:2022',
    HIPAA: 'HIPAA Security Rule',
    NIST: 'NIST CSF 2.0',
    PCIDSS: 'PCI DSS v4.0',
    GDPR: 'GDPR',
  };

  return {
    frameworkId,
    frameworkName: frameworkNames[frameworkId],
    frameworkVersion: getFrameworkVersion(frameworkId),
    totalRequirements: requirements.length,
    compliant,
    partiallyCompliant,
    nonCompliant,
    notStarted,
    notApplicable,
    customGaps,
    overallScore,
    criticalGaps,
    highGaps,
    mediumGaps,
    lowGaps,
    totalEvidence: 0, // Would need to calculate
    verifiedEvidence: 0,
    pendingEvidence: 0,
    expiredEvidence: 0,
    lastUpdated: new Date().toISOString(),
  };
}

function getFrameworkVersion(frameworkId: FrameworkId): string {
  const versions: Record<FrameworkId, string> = {
    SOC2: '2017 (2022 update)',
    ISO27001: '2022',
    HIPAA: '2013 (current)',
    NIST: '2.0',
    PCIDSS: 'v4.0',
    GDPR: '2016/679',
  };
  return versions[frameworkId];
}

// ============================================
// CONTROL COVERAGE INDEX
// ============================================

/**
 * Get coverage index for a control
 */
export function getControlCoverageIndex(controlId: string): ControlCoverageIndex {
  const mappings = getMappingsForControl(controlId);
  const allRequirements = getAllFrameworkRequirements();

  const mappedRequirements = mappings.map(m => {
    const req = allRequirements.find(r => r.id === m.requirementId);
    return {
      requirementId: m.requirementId,
      frameworkId: req?.frameworkId || 'SOC2' as FrameworkId,
      requirementCode: req?.code || '',
      title: req?.title || '',
      mappingStrength: m.mappingStrength,
      coveragePercentage: m.coveragePercentage,
    };
  });

  // Calculate framework coverage
  const frameworkCoverage: Record<FrameworkId, { total: number; covered: number; percentage: number }> = {
    SOC2: { total: 0, covered: 0, percentage: 0 },
    ISO27001: { total: 0, covered: 0, percentage: 0 },
    HIPAA: { total: 0, covered: 0, percentage: 0 },
    NIST: { total: 0, covered: 0, percentage: 0 },
    PCIDSS: { total: 0, covered: 0, percentage: 0 },
    GDPR: { total: 0, covered: 0, percentage: 0 },
  };

  // Count total requirements per framework
  const leafRequirements = allRequirements.filter(r => r.isLeaf);
  for (const req of leafRequirements) {
    frameworkCoverage[req.frameworkId].total++;
  }

  // Count covered requirements
  for (const mapped of mappedRequirements) {
    frameworkCoverage[mapped.frameworkId].covered++;
  }

  // Calculate percentages
  for (const fwId of Object.keys(frameworkCoverage) as FrameworkId[]) {
    const fw = frameworkCoverage[fwId];
    fw.percentage = fw.total > 0 ? Math.round((fw.covered / fw.total) * 100) : 0;
  }

  return {
    controlId,
    controlCode: controlId,
    controlTitle: 'Control',
    mappedRequirements,
    frameworkCoverage,
  };
}

// ============================================
// AUTO-MAPPING SUGGESTIONS
// ============================================

/**
 * Generate auto-mapping suggestions based on keyword matching
 */
export function generateAutoMappingSuggestions(
  control: MasterControl
): { requirementId: string; confidence: number; reasoning: string }[] {
  const allRequirements = getAllFrameworkRequirements().filter(r => r.isLeaf);
  const existingMappings = getMappingsForControl(control.id);
  const existingRequirementIds = new Set(existingMappings.map(m => m.requirementId));

  const suggestions: { requirementId: string; confidence: number; reasoning: string }[] = [];

  for (const req of allRequirements) {
    // Skip already mapped requirements
    if (existingRequirementIds.has(req.id)) continue;

    // Calculate confidence based on keyword matching
    const controlKeywords = new Set([
      ...control.keywords,
      ...control.title.toLowerCase().split(' '),
    ]);

    const reqKeywords = new Set([
      ...req.title.toLowerCase().split(' '),
      ...req.description.toLowerCase().split(' ').filter(w => w.length > 3),
    ]);

    // Count matching keywords
    let matches = 0;
    for (const keyword of controlKeywords) {
      if (reqKeywords.has(keyword) || req.title.toLowerCase().includes(keyword)) {
        matches++;
      }
    }

    // Calculate confidence
    const confidence = Math.min(100, Math.round((matches / Math.max(controlKeywords.size, 1)) * 100));

    if (confidence >= 30) {
      suggestions.push({
        requirementId: req.id,
        confidence,
        reasoning: `${matches} keyword matches found between control and requirement`,
      });
    }
  }

  // Sort by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the mapping service - builds initial mappings from existing control data
 */
export function initializeMappingsFromControls(controls: MasterControl[]): void {
  const existingMappings = loadMappings();
  if (existingMappings.length > 0) {
    // Already initialized
    return;
  }

  const newMappings: RequirementMapping[] = [];

  for (const control of controls) {
    for (const mapping of control.frameworkMappings) {
      // Build requirement ID from framework mapping
      let requirementId: string;
      switch (mapping.frameworkId) {
        case 'SOC2':
          requirementId = `SOC2-${mapping.clauseId}`;
          break;
        case 'ISO27001':
          requirementId = `ISO27001-${mapping.clauseId}`;
          break;
        case 'HIPAA':
          requirementId = `HIPAA-${mapping.clauseId}`;
          break;
        case 'NIST':
          requirementId = `NIST-${mapping.clauseId}`;
          break;
        case 'PCIDSS':
          requirementId = `PCIDSS-${mapping.clauseId}`;
          break;
        case 'GDPR':
          requirementId = `GDPR-${mapping.clauseId}`;
          break;
        default:
          continue;
      }

      newMappings.push({
        id: crypto.randomUUID(),
        controlId: control.id,
        requirementId,
        mappingStrength: 'partial',
        coveragePercentage: 50,
        coveredAspects: [control.title],
        mappingJustification: `Auto-mapped from control framework mappings`,
        isAutoMapped: true,
        autoMapConfidence: 80,
        humanReviewed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  saveMappings(newMappings);
  recalculateGaps();
}
