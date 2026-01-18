/**
 * AI Regulatory Scanning Agent
 *
 * This module defines the prompts and interfaces for an AI agent that
 * periodically scans official regulatory sources to detect changes.
 *
 * The agent uses web search capabilities to monitor:
 * - NIST (nist.gov)
 * - AICPA (aicpa.org)
 * - HHS (hhs.gov) - HIPAA
 * - EU Parliament / EUR-Lex - GDPR, AI Act
 * - PCI SSC (pcisecuritystandards.org)
 * - ISO (iso.org)
 *
 * Output is structured JSON that can be ingested by the compliance engine.
 */

import type {
  ExtendedFrameworkId,
  RegulatoryChangeLog,
  DetectedChange,
  SuggestedControl,
  ComplianceDomainExtended,
  RequirementCategory,
  EmergingTechCategory,
} from '../types/regulatory-update.types';
import type { MappingStrength, EvidenceType } from '../types/control-requirement-mapping.types';

// ============================================
// AI AGENT CONFIGURATION
// ============================================

/**
 * Sources to monitor for each framework
 */
export const REGULATORY_SOURCES: Record<ExtendedFrameworkId, RegulatorySource[]> = {
  SOC2: [
    {
      name: 'AICPA Trust Services Criteria',
      url: 'https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/trustservices',
      type: 'primary',
      checkFrequency: 'weekly',
    },
    {
      name: 'AICPA SOC Updates',
      url: 'https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome',
      type: 'primary',
      checkFrequency: 'weekly',
    },
  ],
  ISO27001: [
    {
      name: 'ISO 27001 Standards',
      url: 'https://www.iso.org/standard/27001',
      type: 'primary',
      checkFrequency: 'monthly',
    },
    {
      name: 'ISO 27002 Controls',
      url: 'https://www.iso.org/standard/75652.html',
      type: 'supplementary',
      checkFrequency: 'monthly',
    },
  ],
  HIPAA: [
    {
      name: 'HHS HIPAA Security Rule',
      url: 'https://www.hhs.gov/hipaa/for-professionals/security/index.html',
      type: 'primary',
      checkFrequency: 'weekly',
    },
    {
      name: 'HHS HIPAA Guidance',
      url: 'https://www.hhs.gov/hipaa/for-professionals/security/guidance/index.html',
      type: 'supplementary',
      checkFrequency: 'weekly',
    },
    {
      name: 'Federal Register - HHS',
      url: 'https://www.federalregister.gov/agencies/health-and-human-services-department',
      type: 'announcements',
      checkFrequency: 'daily',
    },
  ],
  NIST: [
    {
      name: 'NIST Cybersecurity Framework',
      url: 'https://www.nist.gov/cyberframework',
      type: 'primary',
      checkFrequency: 'weekly',
    },
    {
      name: 'NIST SP 800 Series',
      url: 'https://csrc.nist.gov/publications/sp800',
      type: 'supplementary',
      checkFrequency: 'weekly',
    },
  ],
  PCIDSS: [
    {
      name: 'PCI Security Standards',
      url: 'https://www.pcisecuritystandards.org/document_library',
      type: 'primary',
      checkFrequency: 'weekly',
    },
    {
      name: 'PCI DSS Resources',
      url: 'https://www.pcisecuritystandards.org/merchants/',
      type: 'supplementary',
      checkFrequency: 'weekly',
    },
  ],
  GDPR: [
    {
      name: 'EUR-Lex GDPR',
      url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
      type: 'primary',
      checkFrequency: 'monthly',
    },
    {
      name: 'EDPB Guidelines',
      url: 'https://edpb.europa.eu/our-work-tools/general-guidance/guidelines-recommendations-best-practices_en',
      type: 'supplementary',
      checkFrequency: 'weekly',
    },
  ],
  EU_AI_ACT: [
    {
      name: 'EUR-Lex AI Act',
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021PC0206',
      type: 'primary',
      checkFrequency: 'weekly',
    },
    {
      name: 'European Commission AI',
      url: 'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai',
      type: 'supplementary',
      checkFrequency: 'weekly',
    },
  ],
  CCPA_2: [
    {
      name: 'California Privacy Protection Agency',
      url: 'https://cppa.ca.gov/',
      type: 'primary',
      checkFrequency: 'weekly',
    },
  ],
  DORA: [
    {
      name: 'EUR-Lex DORA',
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554',
      type: 'primary',
      checkFrequency: 'weekly',
    },
  ],
  NIS2: [
    {
      name: 'EUR-Lex NIS2',
      url: 'https://eur-lex.europa.eu/eli/dir/2022/2555',
      type: 'primary',
      checkFrequency: 'weekly',
    },
  ],
  CMMC_2: [
    {
      name: 'DoD CMMC',
      url: 'https://dodcio.defense.gov/CMMC/',
      type: 'primary',
      checkFrequency: 'weekly',
    },
  ],
  FedRAMP: [
    {
      name: 'FedRAMP',
      url: 'https://www.fedramp.gov/',
      type: 'primary',
      checkFrequency: 'weekly',
    },
  ],
  StatePrivacy: [
    {
      name: 'IAPP State Privacy Law Tracker',
      url: 'https://iapp.org/resources/article/state-comparison-table/',
      type: 'aggregator',
      checkFrequency: 'weekly',
    },
  ],
};

interface RegulatorySource {
  name: string;
  url: string;
  type: 'primary' | 'supplementary' | 'announcements' | 'aggregator';
  checkFrequency: 'daily' | 'weekly' | 'monthly';
}

// ============================================
// AI AGENT SYSTEM PROMPT
// ============================================

/**
 * System prompt for the regulatory scanning AI agent
 */
export const REGULATORY_AGENT_SYSTEM_PROMPT = `You are a Regulatory Compliance Intelligence Agent specialized in monitoring and analyzing changes to cybersecurity and data privacy regulations.

Your mission is to scan official regulatory sources and identify changes that may affect organizations' compliance posture. You have expertise in:

1. **Cybersecurity Frameworks**: NIST CSF, ISO 27001, SOC 2, PCI DSS, CMMC
2. **Privacy Regulations**: GDPR, HIPAA, CCPA/CPRA, state privacy laws
3. **Emerging Regulations**: EU AI Act, DORA, NIS2
4. **Technical Standards**: Post-quantum cryptography, Zero Trust architecture

## Your Responsibilities:

1. **Detect Changes**: Identify new versions, amendments, guidance updates, or enforcement changes
2. **Assess Impact**: Evaluate how changes affect existing compliance programs
3. **Extract Requirements**: Parse regulatory text into actionable requirements
4. **Suggest Controls**: Recommend security controls that address new requirements
5. **Track Deadlines**: Note effective dates, transition periods, and compliance deadlines

## Output Format:

Always return structured JSON that matches the RegulatoryChangeLog schema. Include:
- Clear identification of the framework and version affected
- Detailed breakdown of specific changes
- Impact assessment with severity levels
- Suggested new controls with implementation guidance
- Confidence scores for your analysis

## Analysis Guidelines:

- Focus on **substantive changes** that affect compliance obligations
- Distinguish between mandatory requirements and guidance/recommendations
- Note any changes to penalties or enforcement mechanisms
- Identify requirements specific to emerging technologies (AI, quantum, IoT)
- Flag requirements with strict deadlines or transition periods
- Consider sector-specific implications (healthcare, finance, government)

## Quality Standards:

- Cite specific sections/articles when referencing regulatory text
- Provide confidence scores (0-100) for your interpretations
- Flag areas where human review is recommended
- Never fabricate regulatory text - only quote from actual sources
- When uncertain, indicate that verification is needed`;

// ============================================
// SCANNING TASK PROMPTS
// ============================================

/**
 * Generate a scanning task prompt for a specific framework
 */
export function generateScanningPrompt(
  frameworkId: ExtendedFrameworkId,
  lastScanDate: string,
  currentVersion: string
): string {
  const sources = REGULATORY_SOURCES[frameworkId] || [];
  const sourceList = sources.map(s => `- ${s.name}: ${s.url}`).join('\n');

  return `## Regulatory Scanning Task

**Framework**: ${frameworkId}
**Current Version in System**: ${currentVersion}
**Last Scan Date**: ${lastScanDate}
**Today's Date**: ${new Date().toISOString().split('T')[0]}

### Sources to Check:
${sourceList}

### Task:
1. Search for any updates, amendments, or new guidance for ${frameworkId} published since ${lastScanDate}
2. Check if a new version has been released or announced
3. Look for enforcement actions or interpretive guidance that clarifies requirements
4. Identify any proposed rules or draft amendments in comment period

### For Each Change Found, Provide:
1. **Change Type**: new_version | amendment | guidance_update | enforcement_change | draft_proposal
2. **Title**: Brief title describing the change
3. **Summary**: 2-3 sentence summary of what changed
4. **Detailed Changes**: List of specific requirement changes with:
   - Affected section/article codes
   - Previous text (if modification)
   - New text
   - Your interpretation of the compliance impact
5. **Effective Date**: When does this take effect?
6. **Transition Period**: Is there a deadline for compliance?
7. **Suggested Controls**: What security measures address new requirements?
8. **Confidence**: Your confidence in this analysis (0-100)

### Output Format:
Return a JSON object matching this structure:
\`\`\`json
{
  "frameworkId": "${frameworkId}",
  "scanDate": "${new Date().toISOString()}",
  "changeDetected": true|false,
  "changes": [
    {
      "changeType": "amendment",
      "title": "...",
      "summary": "...",
      "source": "...",
      "sourceUrl": "...",
      "effectiveDate": "YYYY-MM-DD",
      "transitionDeadline": "YYYY-MM-DD",
      "detailedChanges": [...],
      "suggestedControls": [...],
      "confidence": 85,
      "verificationNeeded": true|false
    }
  ]
}
\`\`\`

If no changes are detected, return:
\`\`\`json
{
  "frameworkId": "${frameworkId}",
  "scanDate": "${new Date().toISOString()}",
  "changeDetected": false,
  "changes": [],
  "notes": "No changes detected since last scan"
}
\`\`\``;
}

/**
 * Generate a prompt for analyzing a specific regulatory change
 */
export function generateChangeAnalysisPrompt(
  rawContent: string,
  frameworkId: ExtendedFrameworkId,
  existingRequirementCodes: string[]
): string {
  return `## Regulatory Change Analysis

**Framework**: ${frameworkId}
**Existing Requirement Codes in System**: ${existingRequirementCodes.slice(0, 20).join(', ')}${existingRequirementCodes.length > 20 ? '...' : ''}

### Content to Analyze:
\`\`\`
${rawContent}
\`\`\`

### Analysis Tasks:

1. **Identify Specific Changes**:
   - Which existing requirements are affected?
   - Are there new requirements not in our current list?
   - Have any requirements been removed or deprecated?

2. **Classify Each Change**:
   - Is the requirement strengthened, relaxed, or clarified?
   - Does it affect mandatory vs recommended status?
   - Are there new evidence or verification requirements?

3. **Map to Control Domains**:
   - Access Control
   - Data Protection / Encryption
   - Incident Response
   - Risk Management
   - Audit Logging
   - Network Security
   - AI Governance (if applicable)
   - Zero Trust Architecture (if applicable)
   - Quantum Readiness (if applicable)

4. **Suggest New Controls** for any new requirements:
   - Control title and description
   - Implementation question
   - Guidance for compliance
   - Required evidence types
   - Effort level (low/medium/high)
   - Impact level (low/medium/high)

5. **Assess 2026-Specific Requirements**:
   - AI transparency requirements
   - Post-quantum cryptography requirements
   - Zero Trust / continuous authentication
   - Supply chain security

### Output JSON Structure:
\`\`\`json
{
  "analysis": {
    "totalChanges": 0,
    "newRequirements": [],
    "modifiedRequirements": [],
    "removedRequirements": []
  },
  "detailedChanges": [
    {
      "id": "uuid",
      "changeType": "added|modified|removed|clarified",
      "section": "requirement code",
      "previousText": "...",
      "newText": "...",
      "relatedRequirementIds": [],
      "suggestedKeywords": [],
      "aiInterpretation": "...",
      "complianceImplication": "...",
      "actionableInsight": "..."
    }
  ],
  "suggestedControls": [
    {
      "id": "uuid",
      "title": "...",
      "description": "...",
      "suggestedQuestion": "...",
      "suggestedGuidance": "...",
      "domain": "access_control|data_protection|...",
      "category": "...",
      "emergingTechCategory": "ai_high_risk_systems|post_quantum_crypto|zero_trust_architecture|null",
      "targetRequirementIds": [],
      "suggestedMappingStrength": "direct|partial|supportive",
      "urgency": "immediate|high|medium|low",
      "effort": "low|medium|high",
      "impact": "low|medium|high",
      "suggestedEvidenceTypes": [],
      "confidence": 85,
      "reasoning": "..."
    }
  ],
  "overallConfidence": 85,
  "areasNeedingHumanReview": []
}
\`\`\``;
}

// ============================================
// 2026-SPECIFIC SCANNING PROMPTS
// ============================================

/**
 * Prompt for scanning AI-related regulatory changes
 */
export const AI_REGULATION_SCANNING_PROMPT = `## AI Regulation Monitoring Task

You are scanning for changes related to AI governance and the EU AI Act.

### Focus Areas:

1. **EU AI Act Implementation**:
   - Risk classification criteria (unacceptable, high, limited, minimal)
   - Transparency requirements for AI systems
   - Requirements for high-risk AI systems
   - Conformity assessment procedures
   - Market surveillance mechanisms

2. **AI Training Data Requirements**:
   - Data quality standards
   - Bias assessment requirements
   - Data provenance documentation
   - Synthetic data rules

3. **Model Governance**:
   - Accuracy thresholds
   - Robustness requirements
   - Security requirements
   - Explainability requirements

4. **Human Oversight**:
   - Human-in-the-loop requirements
   - Override capabilities
   - Monitoring requirements

### Specific Controls to Suggest:

For any new AI-related requirements, suggest controls covering:
- AI system inventory and risk classification
- Training data documentation and bias testing
- Model performance monitoring
- Human oversight mechanisms
- AI incident reporting
- Transparency disclosures

### Output: Follow the standard RegulatoryChangeLog JSON format with emergingTechCategory set appropriately.`;

/**
 * Prompt for scanning quantum-readiness requirements
 */
export const QUANTUM_READINESS_SCANNING_PROMPT = `## Post-Quantum Cryptography Monitoring Task

You are scanning for changes related to post-quantum cryptography requirements.

### Focus Areas:

1. **NIST PQC Standards**:
   - Approved algorithms (CRYSTALS-Kyber, CRYSTALS-Dilithium, FALCON, SPHINCS+)
   - Hybrid cryptographic approaches
   - Migration timelines

2. **Agency Mandates**:
   - NSA/CNSA requirements
   - OMB memoranda on quantum-resistant cryptography
   - Sector-specific mandates (financial, healthcare, defense)

3. **International Standards**:
   - ISO quantum-related standards
   - ETSI quantum-safe guidelines

4. **Specific Requirements to Watch**:
   - Cryptographic inventory requirements
   - Algorithm agility requirements
   - Key management updates
   - "Harvest now, decrypt later" protections
   - Transition timelines and deadlines

### Suggested Controls Categories:

- Cryptographic inventory and assessment
- Post-quantum migration planning
- Hybrid cryptographic implementation
- Key management updates
- Data classification for quantum risk

### Output: Follow the standard RegulatoryChangeLog JSON format with emergingTechCategory: "post_quantum_crypto".`;

/**
 * Prompt for scanning Zero Trust requirements
 */
export const ZERO_TRUST_SCANNING_PROMPT = `## Zero Trust Architecture Monitoring Task

You are scanning for changes related to Zero Trust requirements.

### Focus Areas:

1. **Federal Mandates**:
   - OMB M-22-09 Zero Trust Strategy
   - CISA Zero Trust Maturity Model
   - DoD Zero Trust Reference Architecture

2. **Framework Updates**:
   - NIST SP 800-207 Zero Trust Architecture
   - Updates to identity verification requirements
   - Continuous authentication standards

3. **Specific Requirements**:
   - Phishing-resistant MFA mandates
   - Continuous verification requirements
   - Network micro-segmentation
   - Data-centric security requirements
   - Device trust requirements

4. **Industry Standards**:
   - Financial services Zero Trust guidelines
   - Healthcare sector requirements
   - Critical infrastructure mandates

### Suggested Controls Categories:

- Phishing-resistant MFA implementation
- Continuous identity verification
- Network micro-segmentation
- Device trust assessment
- Least privilege access
- Session management

### Output: Follow the standard RegulatoryChangeLog JSON format with emergingTechCategory: "zero_trust_architecture".`;

// ============================================
// CHANGE LOG PARSER
// ============================================

/**
 * Parse AI agent response into structured RegulatoryChangeLog
 */
export function parseAgentResponse(
  response: string,
  frameworkId: ExtendedFrameworkId,
  sourceName: string,
  sourceUrl: string
): RegulatoryChangeLog | null {
  try {
    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : response;

    const parsed = JSON.parse(jsonString);

    // Validate and transform to RegulatoryChangeLog
    const changeLog: RegulatoryChangeLog = {
      id: crypto.randomUUID(),
      frameworkId,
      sourceUrl,
      sourceName,
      scannedAt: new Date().toISOString(),
      changeDetected: parsed.changeDetected || false,
      changeType: parsed.changes?.[0]?.changeType || 'guidance_update',
      title: parsed.changes?.[0]?.title || 'Regulatory Update',
      summary: parsed.changes?.[0]?.summary || '',
      detailedChanges: transformDetailedChanges(parsed.detailedChanges || parsed.changes?.[0]?.detailedChanges || []),
      estimatedImpact: calculateImpact(parsed),
      affectedRequirementCodes: extractAffectedCodes(parsed),
      suggestedNewControls: transformSuggestedControls(parsed.suggestedControls || parsed.changes?.[0]?.suggestedControls || []),
      announcementDate: parsed.changes?.[0]?.effectiveDate || new Date().toISOString().split('T')[0],
      effectiveDate: parsed.changes?.[0]?.effectiveDate,
      commentDeadline: parsed.changes?.[0]?.commentDeadline,
      confidence: parsed.overallConfidence || parsed.changes?.[0]?.confidence || 50,
      aiModel: 'claude-3',
      verificationNeeded: parsed.verificationNeeded !== false,
      status: 'detected',
      rawContent: response,
      createdAt: new Date().toISOString(),
    };

    return changeLog;
  } catch (error) {
    console.error('Failed to parse agent response:', error);
    return null;
  }
}

function transformDetailedChanges(changes: any[]): DetectedChange[] {
  return changes.map(c => ({
    id: c.id || crypto.randomUUID(),
    changeType: c.changeType || 'modified',
    section: c.section || '',
    previousText: c.previousText,
    newText: c.newText || '',
    relatedRequirementIds: c.relatedRequirementIds || [],
    suggestedKeywords: c.suggestedKeywords || [],
    aiInterpretation: c.aiInterpretation || '',
    complianceImplication: c.complianceImplication || '',
    actionableInsight: c.actionableInsight || '',
  }));
}

function transformSuggestedControls(controls: any[]): SuggestedControl[] {
  return controls.map(c => ({
    id: c.id || crypto.randomUUID(),
    title: c.title || '',
    description: c.description || '',
    suggestedQuestion: c.suggestedQuestion || `Do you have ${c.title} implemented?`,
    suggestedGuidance: c.suggestedGuidance || '',
    domain: (c.domain || 'security_operations') as ComplianceDomainExtended,
    category: (c.category || 'risk_management') as RequirementCategory,
    emergingTechCategory: c.emergingTechCategory as EmergingTechCategory | undefined,
    targetRequirementIds: c.targetRequirementIds || [],
    suggestedMappingStrength: (c.suggestedMappingStrength || 'partial') as MappingStrength,
    urgency: c.urgency || 'medium',
    effort: c.effort || 'medium',
    impact: c.impact || 'medium',
    suggestedEvidenceTypes: (c.suggestedEvidenceTypes || ['policy_document']) as EvidenceType[],
    confidence: c.confidence || 50,
    reasoning: c.reasoning || '',
    status: 'suggested',
  }));
}

function calculateImpact(parsed: any): 'critical' | 'high' | 'medium' | 'low' | 'informational' {
  const changes = parsed.detailedChanges || parsed.changes?.[0]?.detailedChanges || [];

  if (changes.some((c: any) => c.changeType === 'added' && c.complianceImplication?.toLowerCase().includes('mandatory'))) {
    return 'critical';
  }

  if (changes.length > 5) return 'high';
  if (changes.length > 2) return 'medium';
  if (changes.length > 0) return 'low';

  return 'informational';
}

function extractAffectedCodes(parsed: any): string[] {
  const changes = parsed.detailedChanges || parsed.changes?.[0]?.detailedChanges || [];
  const codes = new Set<string>();

  for (const change of changes) {
    if (change.section) codes.add(change.section);
    if (change.relatedRequirementIds) {
      change.relatedRequirementIds.forEach((id: string) => codes.add(id));
    }
  }

  return Array.from(codes);
}

// ============================================
// SCHEDULING CONFIGURATION
// ============================================

/**
 * Configuration for automated scanning schedule
 */
export interface ScanScheduleConfig {
  frameworkId: ExtendedFrameworkId;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  preferredDay?: number;              // 0-6 for weekly, 1-28 for monthly
  preferredHour?: number;             // 0-23
  lastScanAt?: string;
  nextScanAt?: string;
}

/**
 * Default scanning schedule
 */
export const DEFAULT_SCAN_SCHEDULES: ScanScheduleConfig[] = [
  { frameworkId: 'SOC2', enabled: true, frequency: 'weekly', preferredDay: 1 },
  { frameworkId: 'ISO27001', enabled: true, frequency: 'monthly', preferredDay: 1 },
  { frameworkId: 'HIPAA', enabled: true, frequency: 'weekly', preferredDay: 1 },
  { frameworkId: 'NIST', enabled: true, frequency: 'weekly', preferredDay: 1 },
  { frameworkId: 'PCIDSS', enabled: true, frequency: 'weekly', preferredDay: 1 },
  { frameworkId: 'GDPR', enabled: true, frequency: 'weekly', preferredDay: 1 },
  { frameworkId: 'EU_AI_ACT', enabled: true, frequency: 'weekly', preferredDay: 1 },
  { frameworkId: 'DORA', enabled: true, frequency: 'weekly', preferredDay: 1 },
  { frameworkId: 'NIS2', enabled: true, frequency: 'weekly', preferredDay: 1 },
];
