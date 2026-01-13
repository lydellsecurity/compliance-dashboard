/**
 * ============================================================================
 * CROSSWALK MAPPING SERVICE
 * ============================================================================
 * 
 * Handles N-to-N mapping between requirements and controls with:
 * - Automated drift detection when requirements change
 * - Impact analysis for regulatory updates
 * - Gap identification and remediation tracking
 */

import {
  MasterRequirement,
  MasterControl,
  RequirementControlMapping,
  ComplianceDrift,
  RequirementChange,
  MappingGap,
  RequiredAction,
  UserResponse,
  FrameworkVersion,
  RequirementCategory2026,
} from '../types/compliance.types';

// ============================================================================
// CROSSWALK MAPPING ENGINE
// ============================================================================

export class CrosswalkMappingService {
  private requirements: Map<string, MasterRequirement> = new Map();
  private controls: Map<string, MasterControl> = new Map();
  private mappings: Map<string, RequirementControlMapping> = new Map();
  private driftAlerts: ComplianceDrift[] = [];

  constructor(
    requirements: MasterRequirement[],
    controls: MasterControl[],
    mappings: RequirementControlMapping[]
  ) {
    requirements.forEach(r => this.requirements.set(r.id, r));
    controls.forEach(c => this.controls.set(c.id, c));
    mappings.forEach(m => this.mappings.set(m.id, m));
  }

  /**
   * Get all controls mapped to a specific requirement
   */
  getControlsForRequirement(requirementId: string): MasterControl[] {
    const controlIds = Array.from(this.mappings.values())
      .filter(m => m.requirementId === requirementId && m.status === 'active')
      .map(m => m.controlId);

    return controlIds
      .map(id => this.controls.get(id))
      .filter((c): c is MasterControl => c !== undefined);
  }

  /**
   * Get all requirements satisfied by a specific control
   */
  getRequirementsForControl(controlId: string): MasterRequirement[] {
    const requirementIds = Array.from(this.mappings.values())
      .filter(m => m.controlId === controlId && m.status === 'active')
      .map(m => m.requirementId);

    return requirementIds
      .map(id => this.requirements.get(id))
      .filter((r): r is MasterRequirement => r !== undefined);
  }

  /**
   * Process a requirement update and detect compliance drift
   */
  processRequirementUpdate(
    oldRequirement: MasterRequirement,
    newRequirement: MasterRequirement,
    userResponses: Map<string, UserResponse[]>
  ): ComplianceDrift | null {
    const affectedMappings = Array.from(this.mappings.values())
      .filter(m => m.requirementId === oldRequirement.id && m.status === 'active');

    const affectedControlIds = affectedMappings.map(m => m.controlId);
    const changeAnalysis = this.analyzeRequirementChange(oldRequirement, newRequirement);

    if (changeAnalysis.impactLevel === 'none') {
      return null;
    }

    const drift = this.createDriftAlert(
      oldRequirement,
      newRequirement,
      affectedControlIds,
      userResponses.get(oldRequirement.id) || []
    );

    affectedMappings.forEach(mapping => {
      mapping.status = 'pending_review';
      mapping.lastUpdated = new Date().toISOString();
    });

    this.driftAlerts.push(drift);
    return drift;
  }

  private analyzeRequirementChange(
    oldReq: MasterRequirement,
    newReq: MasterRequirement
  ): {
    changeType: ComplianceDrift['changeType'];
    impactLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
    summary: string;
  } {
    const strengthenedKeywords = [
      'must', 'shall', 'required', 'mandatory',
      'continuous', 'real-time', 'automated',
      'multi-factor', 'MFA', 'zero trust',
      'quantum', 'post-quantum',
      'AI', 'algorithm', 'model',
    ];

    const oldTextLower = oldReq.requirementText.toLowerCase();
    const newTextLower = newReq.requirementText.toLowerCase();

    let oldStrength = 0;
    let newStrength = 0;
    strengthenedKeywords.forEach(keyword => {
      if (oldTextLower.includes(keyword.toLowerCase())) oldStrength++;
      if (newTextLower.includes(keyword.toLowerCase())) newStrength++;
    });

    if (newStrength > oldStrength + 2) {
      return {
        changeType: 'requirement_strengthened',
        impactLevel: 'high',
        summary: `Requirement significantly strengthened with ${newStrength - oldStrength} new mandatory conditions`,
      };
    }

    if (newReq.requirementText !== oldReq.requirementText) {
      return {
        changeType: 'requirement_clarified',
        impactLevel: 'low',
        summary: 'Minor text updates or clarifications',
      };
    }

    return {
      changeType: 'requirement_clarified',
      impactLevel: 'none',
      summary: 'No significant changes detected',
    };
  }

  private createDriftAlert(
    oldReq: MasterRequirement,
    newReq: MasterRequirement,
    affectedControlIds: string[],
    previousResponses: UserResponse[]
  ): ComplianceDrift {
    const changeAnalysis = this.analyzeRequirementChange(oldReq, newReq);

    const analyzedResponses = previousResponses.map(response => ({
      ...response,
      meetsNewRequirement: this.checkResponseAgainstNewRequirement(response, newReq),
      gapAnalysis: this.generateGapAnalysis(response, newReq),
    }));

    const requiredActions = this.generateRequiredActions(
      newReq,
      affectedControlIds,
      analyzedResponses
    );

    return {
      id: `drift-${newReq.id}-${Date.now()}`,
      detectedAt: new Date().toISOString(),
      requirementId: newReq.id,
      previousRequirementVersion: oldReq.frameworkVersion.version,
      newRequirementVersion: newReq.frameworkVersion.version,
      changeType: changeAnalysis.changeType,
      changeSummary: changeAnalysis.summary,
      affectedControlIds,
      impactLevel: changeAnalysis.impactLevel as ComplianceDrift['impactLevel'],
      complianceGapDescription: `${analyzedResponses.filter(r => !r.meetsNewRequirement).length} responses need review`,
      status: 'detected',
      previousUserResponses: analyzedResponses,
      requiredActions,
    };
  }

  private checkResponseAgainstNewRequirement(
    response: UserResponse,
    newReq: MasterRequirement
  ): boolean {
    const responseText = response.userAnswer.toLowerCase();
    const requirementKeywords = newReq.keywords.map(k => k.toLowerCase());

    let matchScore = 0;
    requirementKeywords.forEach(keyword => {
      if (responseText.includes(keyword)) matchScore++;
    });

    return matchScore >= requirementKeywords.length * 0.6;
  }

  private generateGapAnalysis(response: UserResponse, newReq: MasterRequirement): string {
    const gaps: string[] = [];
    const responseText = response.userAnswer.toLowerCase();

    if (newReq.category === 'ZERO_TRUST' && !responseText.includes('continuous')) {
      gaps.push('Missing continuous authentication/verification');
    }

    if (newReq.category === 'QUANTUM_READINESS' && !responseText.includes('post-quantum')) {
      gaps.push('No post-quantum cryptography migration plan');
    }

    if (newReq.category === 'AI_TRANSPARENCY' && !responseText.includes('training data')) {
      gaps.push('Training data documentation not addressed');
    }

    return gaps.length > 0 ? `Identified gaps: ${gaps.join('; ')}` : 'Response appears compliant';
  }

  private generateRequiredActions(
    newReq: MasterRequirement,
    affectedControlIds: string[],
    responses: UserResponse[]
  ): RequiredAction[] {
    const actions: RequiredAction[] = [];
    const nonCompliantResponses = responses.filter(r => !r.meetsNewRequirement);

    if (affectedControlIds.length > 0) {
      actions.push({
        id: `action-${Date.now()}-1`,
        actionType: 'update_control',
        description: `Review and update ${affectedControlIds.length} control(s)`,
        priority: nonCompliantResponses.length > 0 ? 'high' : 'medium',
        status: 'pending',
      });
    }

    if (nonCompliantResponses.length > 0) {
      actions.push({
        id: `action-${Date.now()}-2`,
        actionType: 'reassess',
        description: `Re-answer ${nonCompliantResponses.length} compliance questions`,
        priority: 'high',
        status: 'pending',
      });
    }

    return actions;
  }

  getDriftAlerts(): ComplianceDrift[] {
    return [...this.driftAlerts];
  }
}

export function createCrosswalkService(
  requirements: MasterRequirement[],
  controls: MasterControl[],
  mappings: RequirementControlMapping[]
): CrosswalkMappingService {
  return new CrosswalkMappingService(requirements, controls, mappings);
}
