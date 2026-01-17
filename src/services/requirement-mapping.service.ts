/**
 * Requirement Mapping Service
 *
 * Builds and manages the inverse mapping index from framework requirements
 * to controls. This enables requirement-centric compliance assessment.
 */

import type { FrameworkId, MasterControl } from '../constants/controls';
import type {
  FrameworkRequirementIndex,
  RequirementControlMapping,
  ControlMappingAssessment,
  ControlMappingType,
  RequirementDetail,
} from '../types/requirement-assessment.types';
import { MASTER_CONTROLS } from '../constants/controls';
import { PCI_DSS_V4_REQUIREMENTS } from '../constants/pci-dss-requirements';
import { SOC2_TRUST_SERVICES_CRITERIA } from '../constants/soc2-requirements';
import { ISO27001_2022_CONTROLS } from '../constants/iso27001-requirements';
import { HIPAA_SECURITY_RULE } from '../constants/hipaa-requirements';
import { NIST_CSF_2_0 } from '../constants/nist-csf-requirements';
import { GDPR_REQUIREMENTS } from '../constants/gdpr-requirements';

// ============================================
// REQUIREMENT EXTRACTION
// ============================================

interface FlatRequirement {
  id: string;
  parentId: string | null;
  title: string;
  description?: string;
  isRequired: boolean;
  level: number;
  frameworkId: FrameworkId;
}

/**
 * Extract all leaf requirements from PCI DSS structure
 */
function extractPCIDSSRequirements(): FlatRequirement[] {
  const requirements: FlatRequirement[] = [];

  for (const principal of PCI_DSS_V4_REQUIREMENTS) {
    for (const sub of principal.subRequirements) {
      for (const req of sub.requirements) {
        requirements.push({
          id: req.id,
          parentId: sub.id,
          title: req.title,
          description: req.description,
          isRequired: true,
          level: 2,
          frameworkId: 'PCIDSS',
        });
      }
      // Also add sub-requirement level for mapping
      requirements.push({
        id: sub.id,
        parentId: principal.id,
        title: sub.name,
        isRequired: true,
        level: 1,
        frameworkId: 'PCIDSS',
      });
    }
    // Add principal level
    requirements.push({
      id: principal.id,
      parentId: null,
      title: principal.name,
      isRequired: true,
      level: 0,
      frameworkId: 'PCIDSS',
    });
  }

  return requirements;
}

/**
 * Extract all criteria from SOC 2 structure
 */
function extractSOC2Requirements(): FlatRequirement[] {
  const requirements: FlatRequirement[] = [];

  for (const tsc of SOC2_TRUST_SERVICES_CRITERIA) {
    for (const category of tsc.categories) {
      for (const criterion of category.criteria) {
        requirements.push({
          id: criterion.id,
          parentId: category.id,
          title: criterion.title,
          description: criterion.description,
          isRequired: tsc.required,
          level: 2,
          frameworkId: 'SOC2',
        });
      }
      requirements.push({
        id: category.id,
        parentId: tsc.id,
        title: category.name,
        description: category.description,
        isRequired: tsc.required,
        level: 1,
        frameworkId: 'SOC2',
      });
    }
    requirements.push({
      id: tsc.id,
      parentId: null,
      title: tsc.name,
      isRequired: tsc.required,
      level: 0,
      frameworkId: 'SOC2',
    });
  }

  return requirements;
}

/**
 * Extract all controls from ISO 27001 structure
 */
function extractISO27001Requirements(): FlatRequirement[] {
  const requirements: FlatRequirement[] = [];

  for (const theme of ISO27001_2022_CONTROLS) {
    for (const control of theme.controls) {
      requirements.push({
        id: control.id,
        parentId: theme.id,
        title: control.title,
        description: control.description,
        isRequired: true, // Can be excluded via SoA
        level: 1,
        frameworkId: 'ISO27001',
      });
    }
    requirements.push({
      id: theme.id,
      parentId: null,
      title: theme.name,
      isRequired: true,
      level: 0,
      frameworkId: 'ISO27001',
    });
  }

  return requirements;
}

/**
 * Extract all specifications from HIPAA structure
 */
function extractHIPAARequirements(): FlatRequirement[] {
  const requirements: FlatRequirement[] = [];

  for (const safeguard of HIPAA_SECURITY_RULE) {
    for (const standard of safeguard.standards) {
      if (standard.specifications) {
        for (const spec of standard.specifications) {
          requirements.push({
            id: spec.id,
            parentId: standard.id,
            title: spec.title,
            isRequired: spec.type === 'required',
            level: 2,
            frameworkId: 'HIPAA',
          });
        }
      }
      requirements.push({
        id: standard.id,
        parentId: safeguard.id,
        title: standard.name,
        isRequired: true,
        level: 1,
        frameworkId: 'HIPAA',
      });
    }
    requirements.push({
      id: safeguard.id,
      parentId: null,
      title: safeguard.name,
      description: `Section ${safeguard.section}`,
      isRequired: true,
      level: 0,
      frameworkId: 'HIPAA',
    });
  }

  return requirements;
}

/**
 * Extract all subcategories from NIST CSF structure
 */
function extractNISTRequirements(): FlatRequirement[] {
  const requirements: FlatRequirement[] = [];

  for (const fn of NIST_CSF_2_0) {
    for (const category of fn.categories) {
      for (const subcategory of category.subcategories) {
        requirements.push({
          id: subcategory.id,
          parentId: category.id,
          title: subcategory.title,
          isRequired: true,
          level: 2,
          frameworkId: 'NIST',
        });
      }
      requirements.push({
        id: category.id,
        parentId: fn.id,
        title: category.name,
        isRequired: true,
        level: 1,
        frameworkId: 'NIST',
      });
    }
    requirements.push({
      id: fn.id,
      parentId: null,
      title: fn.name,
      description: fn.description,
      isRequired: true,
      level: 0,
      frameworkId: 'NIST',
    });
  }

  return requirements;
}

/**
 * Extract all provisions from GDPR structure
 */
function extractGDPRRequirements(): FlatRequirement[] {
  const requirements: FlatRequirement[] = [];

  for (const chapter of GDPR_REQUIREMENTS) {
    for (const article of chapter.articles) {
      for (const provision of article.provisions) {
        requirements.push({
          id: provision.id,
          parentId: article.id,
          title: provision.title,
          description: provision.description,
          isRequired: true,
          level: 2,
          frameworkId: 'GDPR',
        });
      }
      requirements.push({
        id: article.id,
        parentId: `Chapter ${chapter.id}`,
        title: article.name,
        isRequired: true,
        level: 1,
        frameworkId: 'GDPR',
      });
    }
    requirements.push({
      id: `Chapter ${chapter.id}`,
      parentId: null,
      title: chapter.name,
      isRequired: true,
      level: 0,
      frameworkId: 'GDPR',
    });
  }

  return requirements;
}

/**
 * Get all requirements for a framework
 */
export function getFrameworkRequirements(frameworkId: FrameworkId): FlatRequirement[] {
  switch (frameworkId) {
    case 'PCIDSS':
      return extractPCIDSSRequirements();
    case 'SOC2':
      return extractSOC2Requirements();
    case 'ISO27001':
      return extractISO27001Requirements();
    case 'HIPAA':
      return extractHIPAARequirements();
    case 'NIST':
      return extractNISTRequirements();
    case 'GDPR':
      return extractGDPRRequirements();
    default:
      return [];
  }
}

/**
 * Get only leaf requirements (no children) for a framework
 */
export function getLeafRequirements(frameworkId: FrameworkId): FlatRequirement[] {
  const allRequirements = getFrameworkRequirements(frameworkId);
  const parentIds = new Set(allRequirements.map(r => r.parentId).filter(Boolean));
  return allRequirements.filter(r => !parentIds.has(r.id));
}

// ============================================
// INVERSE MAPPING INDEX
// ============================================

/**
 * Determine mapping type based on clause ID matching
 */
function determineMappingType(
  controlClauseId: string,
  requirementId: string
): ControlMappingType {
  // Exact match = direct
  if (controlClauseId === requirementId) {
    return 'direct';
  }

  // Control maps to parent of requirement = partial
  // e.g., control maps to "7.1" but requirement is "7.1.1"
  if (requirementId.startsWith(controlClauseId + '.')) {
    return 'partial';
  }

  // Requirement is parent of control mapping = supportive
  // e.g., control maps to "7.1.1" but we're looking at "7.1"
  if (controlClauseId.startsWith(requirementId + '.')) {
    return 'supportive';
  }

  // Different but related (same prefix up to first segment)
  const controlPrefix = controlClauseId.split('.')[0];
  const reqPrefix = requirementId.split('.')[0];
  if (controlPrefix === reqPrefix) {
    return 'supportive';
  }

  return 'supportive';
}

/**
 * Estimate coverage percentage based on mapping type and control count
 */
function estimateCoverage(
  directCount: number,
  partialCount: number,
  supportiveCount: number
): number {
  // Direct mappings provide high coverage
  // Partial mappings provide medium coverage
  // Supportive mappings provide minimal coverage

  if (directCount > 0) {
    // At least one direct mapping - base coverage of 60%, add 10% per additional
    return Math.min(100, 60 + (directCount - 1) * 10 + partialCount * 5);
  }

  if (partialCount > 0) {
    // No direct but has partial - base coverage of 30%, add 10% per additional
    return Math.min(70, 30 + (partialCount - 1) * 10 + supportiveCount * 5);
  }

  if (supportiveCount > 0) {
    // Only supportive - max 20% coverage
    return Math.min(20, supportiveCount * 5);
  }

  return 0;
}

/**
 * Build the inverse mapping index for a framework
 */
export function buildFrameworkIndex(
  frameworkId: FrameworkId,
  controls: MasterControl[] = MASTER_CONTROLS
): FrameworkRequirementIndex {
  const requirements = getLeafRequirements(frameworkId);
  const requirementMap: Record<string, RequirementControlMapping> = {};
  const unmappedRequirements: string[] = [];
  const fullyMappedRequirements: string[] = [];

  for (const req of requirements) {
    const directControls: string[] = [];
    const partialControls: string[] = [];
    const supportiveControls: string[] = [];

    // Find all controls that map to this requirement or its ancestors
    for (const control of controls) {
      for (const mapping of control.frameworkMappings) {
        if (mapping.frameworkId !== frameworkId) continue;

        const mappingType = determineMappingType(mapping.clauseId, req.id);

        // Check if mapping relates to this requirement
        const isRelated =
          mapping.clauseId === req.id ||
          req.id.startsWith(mapping.clauseId + '.') ||
          mapping.clauseId.startsWith(req.id + '.');

        if (isRelated) {
          switch (mappingType) {
            case 'direct':
              if (!directControls.includes(control.id)) {
                directControls.push(control.id);
              }
              break;
            case 'partial':
              if (!partialControls.includes(control.id) && !directControls.includes(control.id)) {
                partialControls.push(control.id);
              }
              break;
            case 'supportive':
              if (!supportiveControls.includes(control.id) &&
                  !partialControls.includes(control.id) &&
                  !directControls.includes(control.id)) {
                supportiveControls.push(control.id);
              }
              break;
          }
        }
      }
    }

    const totalCoverage = estimateCoverage(
      directControls.length,
      partialControls.length,
      supportiveControls.length
    );

    const gaps: string[] = [];
    if (totalCoverage < 100) {
      if (directControls.length === 0) {
        gaps.push('No controls directly address this requirement');
      }
      if (totalCoverage < 50) {
        gaps.push('Requirement may need direct assessment or additional controls');
      }
    }

    requirementMap[req.id] = {
      requirementId: req.id,
      directControls,
      partialControls,
      supportiveControls,
      totalCoverage,
      gaps,
    };

    if (directControls.length === 0 && partialControls.length === 0 && supportiveControls.length === 0) {
      unmappedRequirements.push(req.id);
    } else if (totalCoverage >= 80) {
      fullyMappedRequirements.push(req.id);
    }
  }

  return {
    frameworkId,
    frameworkVersion: getFrameworkVersion(frameworkId),
    requirements: requirementMap,
    unmappedRequirements,
    fullyMappedRequirements,
    lastBuilt: new Date().toISOString(),
  };
}

/**
 * Get framework version string
 */
function getFrameworkVersion(frameworkId: FrameworkId): string {
  switch (frameworkId) {
    case 'PCIDSS':
      return 'v4.0';
    case 'SOC2':
      return '2017/2022';
    case 'ISO27001':
      return '2022';
    case 'HIPAA':
      return '45 CFR 164';
    case 'NIST':
      return '2.0';
    case 'GDPR':
      return '2016/679';
    default:
      return 'Unknown';
  }
}

// ============================================
// CONTROL MAPPING ASSESSMENT
// ============================================

/**
 * Get control mapping assessments for a specific requirement
 */
export function getControlMappingsForRequirement(
  requirementId: string,
  frameworkId: FrameworkId,
  controls: MasterControl[] = MASTER_CONTROLS,
  getControlAnswer?: (controlId: string) => 'yes' | 'no' | 'partial' | 'na' | null
): ControlMappingAssessment[] {
  const mappings: ControlMappingAssessment[] = [];

  for (const control of controls) {
    for (const mapping of control.frameworkMappings) {
      if (mapping.frameworkId !== frameworkId) continue;

      // Check if this control maps to the requirement
      const isRelated =
        mapping.clauseId === requirementId ||
        requirementId.startsWith(mapping.clauseId + '.') ||
        mapping.clauseId.startsWith(requirementId + '.');

      if (isRelated) {
        const mappingType = determineMappingType(mapping.clauseId, requirementId);

        // Calculate coverage percentage based on mapping type
        let coveragePercentage: number;
        let gapDescription: string | undefined;

        switch (mappingType) {
          case 'direct':
            coveragePercentage = 80;
            break;
          case 'partial':
            coveragePercentage = 40;
            gapDescription = `Control maps to ${mapping.clauseId} which is a parent of ${requirementId}`;
            break;
          case 'supportive':
            coveragePercentage = 15;
            gapDescription = `Control provides supporting coverage but does not directly address ${requirementId}`;
            break;
        }

        // Check if we already have this control (avoid duplicates)
        if (!mappings.some(m => m.controlId === control.id)) {
          mappings.push({
            controlId: control.id,
            mappingType,
            coveragePercentage,
            gapDescription,
            controlAnswer: getControlAnswer ? getControlAnswer(control.id) : null,
          });
        }
      }
    }
  }

  // Sort by coverage (highest first)
  return mappings.sort((a, b) => b.coveragePercentage - a.coveragePercentage);
}

// ============================================
// REQUIREMENT DETAIL BUILDER
// ============================================

/**
 * Build detailed requirement information for the wizard
 */
export function buildRequirementDetail(
  requirementId: string,
  frameworkId: FrameworkId,
  controls: MasterControl[] = MASTER_CONTROLS,
  getControlAnswer?: (controlId: string) => 'yes' | 'no' | 'partial' | 'na' | null
): RequirementDetail | null {
  const allRequirements = getFrameworkRequirements(frameworkId);
  const requirement = allRequirements.find(r => r.id === requirementId);

  if (!requirement) return null;

  const mappedControls = getControlMappingsForRequirement(
    requirementId,
    frameworkId,
    controls,
    getControlAnswer
  );

  // Calculate estimated coverage from all mapped controls
  const estimatedCoverage = Math.min(
    100,
    mappedControls.reduce((sum, m) => sum + m.coveragePercentage * 0.3, 0)
  );

  // Get children
  const children = allRequirements
    .filter(r => r.parentId === requirementId)
    .map(child => buildRequirementDetail(child.id, frameworkId, controls, getControlAnswer))
    .filter((d): d is RequirementDetail => d !== null);

  // Generate assessment questions based on requirement
  const assessmentQuestions = generateAssessmentQuestions(requirement, frameworkId);

  // Determine required evidence types
  const requiredEvidenceTypes = determineEvidenceTypes(requirement, frameworkId);

  return {
    id: requirement.id,
    frameworkId,
    parentId: requirement.parentId,
    title: requirement.title,
    description: requirement.description || '',
    guidance: getRequirementGuidance(requirement, frameworkId),
    isRequired: requirement.isRequired,
    implementationLevel: requirement.isRequired ? 'mandatory' : 'optional',
    hipaaSpecificationType: frameworkId === 'HIPAA' && !requirement.isRequired ? 'addressable' : undefined,
    assessmentQuestions,
    requiredEvidenceTypes,
    auditorTestingGuidance: getAuditorGuidance(requirement, frameworkId),
    mappedControls,
    estimatedCoverage,
    children,
    level: requirement.level,
  };
}

/**
 * Generate assessment questions for a requirement
 */
function generateAssessmentQuestions(req: FlatRequirement, _frameworkId: FrameworkId): string[] {
  const questions: string[] = [];
  const title = req.title.toLowerCase();

  // Generic questions based on common requirement patterns
  if (title.includes('document') || title.includes('policies')) {
    questions.push('Is this requirement formally documented?');
    questions.push('Are relevant personnel aware of the documentation?');
    questions.push('Is the documentation reviewed and updated regularly?');
  }

  if (title.includes('implement') || title.includes('configured') || title.includes('maintained')) {
    questions.push('Has this control/mechanism been implemented?');
    questions.push('Is it operating effectively?');
    questions.push('Is it consistently applied across all in-scope systems?');
  }

  if (title.includes('review') || title.includes('monitor') || title.includes('audit')) {
    questions.push('Is this activity performed at the required frequency?');
    questions.push('Are findings documented and tracked?');
    questions.push('Are issues remediated in a timely manner?');
  }

  if (title.includes('access') || title.includes('authentication')) {
    questions.push('Is access restricted to authorized personnel only?');
    questions.push('Are access rights reviewed periodically?');
    questions.push('Is multi-factor authentication enabled where required?');
  }

  if (title.includes('encrypt') || title.includes('protect')) {
    questions.push('Is data protected using approved encryption methods?');
    questions.push('Are encryption keys properly managed?');
    questions.push('Is protection applied consistently across all data stores?');
  }

  // Add a generic compliance question if no specific questions
  if (questions.length === 0) {
    questions.push(`Is "${req.title}" fully implemented?`);
    questions.push('Is there evidence demonstrating compliance?');
    questions.push('Are there any gaps or exceptions?');
  }

  return questions;
}

/**
 * Determine required evidence types for a requirement
 */
function determineEvidenceTypes(req: FlatRequirement, _frameworkId: FrameworkId): string[] {
  const types: string[] = [];
  const title = req.title.toLowerCase();

  if (title.includes('document') || title.includes('policies') || title.includes('procedures')) {
    types.push('Policy document');
    types.push('Procedure document');
  }

  if (title.includes('diagram') || title.includes('network')) {
    types.push('Network diagram');
    types.push('Data flow diagram');
  }

  if (title.includes('review') || title.includes('audit')) {
    types.push('Review meeting minutes');
    types.push('Audit report');
  }

  if (title.includes('log') || title.includes('monitor')) {
    types.push('Log samples');
    types.push('Monitoring dashboard screenshot');
  }

  if (title.includes('training') || title.includes('awareness')) {
    types.push('Training records');
    types.push('Training materials');
    types.push('Attendance records');
  }

  if (title.includes('config') || title.includes('setting')) {
    types.push('Configuration screenshot');
    types.push('Configuration export');
  }

  if (title.includes('test') || title.includes('scan')) {
    types.push('Test results');
    types.push('Scan report');
  }

  // Default evidence types
  if (types.length === 0) {
    types.push('Screenshot or export showing implementation');
    types.push('Relevant documentation');
  }

  return types;
}

/**
 * Get guidance text for a requirement
 */
function getRequirementGuidance(req: FlatRequirement, _frameworkId: FrameworkId): string {
  // This would ideally come from the framework data
  // For now, return a generic guidance based on the requirement
  return `Review ${req.title} and ensure all aspects are fully implemented and documented. Verify that evidence exists to demonstrate ongoing compliance.`;
}

/**
 * Get auditor testing guidance
 */
function getAuditorGuidance(req: FlatRequirement, _frameworkId: FrameworkId): string {
  const title = req.title.toLowerCase();

  if (title.includes('document')) {
    return 'Examine documentation for completeness, accuracy, and currency. Interview personnel to verify awareness.';
  }

  if (title.includes('config') || title.includes('implement')) {
    return 'Observe system configuration. Compare against documented standards. Test effectiveness.';
  }

  if (title.includes('review') || title.includes('monitor')) {
    return 'Examine logs and records. Verify frequency meets requirements. Sample test for completeness.';
  }

  return 'Examine evidence of implementation. Interview relevant personnel. Test operating effectiveness.';
}

// ============================================
// FRAMEWORK STATISTICS
// ============================================

/**
 * Get statistics about framework coverage
 */
export function getFrameworkCoverageStats(frameworkId: FrameworkId): {
  totalRequirements: number;
  leafRequirements: number;
  mappedRequirements: number;
  unmappedRequirements: number;
  averageCoverage: number;
  coverageByLevel: Record<number, { total: number; mapped: number }>;
} {
  const index = buildFrameworkIndex(frameworkId);
  const allRequirements = getFrameworkRequirements(frameworkId);
  const leafRequirements = getLeafRequirements(frameworkId);

  const coverageByLevel: Record<number, { total: number; mapped: number }> = {};

  for (const req of leafRequirements) {
    if (!coverageByLevel[req.level]) {
      coverageByLevel[req.level] = { total: 0, mapped: 0 };
    }
    coverageByLevel[req.level].total++;

    const mapping = index.requirements[req.id];
    if (mapping && (mapping.directControls.length > 0 || mapping.partialControls.length > 0)) {
      coverageByLevel[req.level].mapped++;
    }
  }

  const mappedCount = leafRequirements.length - index.unmappedRequirements.length;
  const totalCoverage = Object.values(index.requirements).reduce(
    (sum, m) => sum + m.totalCoverage,
    0
  );

  return {
    totalRequirements: allRequirements.length,
    leafRequirements: leafRequirements.length,
    mappedRequirements: mappedCount,
    unmappedRequirements: index.unmappedRequirements.length,
    averageCoverage: leafRequirements.length > 0 ? totalCoverage / leafRequirements.length : 0,
    coverageByLevel,
  };
}

// Export singleton index cache
const indexCache: Map<FrameworkId, FrameworkRequirementIndex> = new Map();

/**
 * Get or build framework index (cached)
 */
export function getFrameworkIndex(frameworkId: FrameworkId): FrameworkRequirementIndex {
  if (!indexCache.has(frameworkId)) {
    indexCache.set(frameworkId, buildFrameworkIndex(frameworkId));
  }
  return indexCache.get(frameworkId)!;
}

/**
 * Clear the index cache (useful when controls change)
 */
export function clearIndexCache(): void {
  indexCache.clear();
}
