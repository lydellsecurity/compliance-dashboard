/**
 * ============================================================================
 * REGULATORY SCANNING AGENT
 * ============================================================================
 * 
 * AI-powered agent that periodically scans official regulatory sources
 * and outputs structured change logs for the compliance engine.
 * 
 * Sources:
 * - NIST (nist.gov)
 * - AICPA (aicpa.org)
 * - HHS/OCR (hhs.gov/hipaa)
 * - EU Parliament/Commission (eur-lex.europa.eu)
 * - SEC, FTC, state regulators
 */

import {
  RegulatoryChangeLog,
  SuggestedControl,
  FrameworkType,
  RequirementCategory2026,
} from '../types/compliance.types';

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

export interface RegulatorySource {
  id: string;
  name: string;
  url: string;
  framework: FrameworkType;
  scanFrequency: 'daily' | 'weekly' | 'monthly';
  priority: 'critical' | 'high' | 'medium' | 'low';
  keywords: string[];
}

export const REGULATORY_SOURCES: RegulatorySource[] = [
  // US Federal
  {
    id: 'nist-csf',
    name: 'NIST Cybersecurity Framework',
    url: 'https://www.nist.gov/cyberframework',
    framework: 'NIST_CSF',
    scanFrequency: 'weekly',
    priority: 'high',
    keywords: ['cybersecurity framework', 'CSF', 'NIST update', 'control catalog'],
  },
  {
    id: 'nist-800-53',
    name: 'NIST SP 800-53',
    url: 'https://csrc.nist.gov/publications/sp800',
    framework: 'NIST_800_53',
    scanFrequency: 'weekly',
    priority: 'high',
    keywords: ['800-53', 'security controls', 'privacy controls', 'federal'],
  },
  {
    id: 'hhs-hipaa',
    name: 'HHS HIPAA Security Rule',
    url: 'https://www.hhs.gov/hipaa/for-professionals/security',
    framework: 'HIPAA_SECURITY',
    scanFrequency: 'weekly',
    priority: 'critical',
    keywords: ['HIPAA', 'security rule', 'PHI', 'healthcare', 'breach notification'],
  },
  {
    id: 'hhs-hipaa-guidance',
    name: 'HHS OCR Guidance',
    url: 'https://www.hhs.gov/hipaa/for-professionals/privacy/guidance',
    framework: 'HIPAA_PRIVACY',
    scanFrequency: 'weekly',
    priority: 'high',
    keywords: ['OCR', 'guidance', 'enforcement', 'penalty', 'settlement'],
  },
  {
    id: 'aicpa-soc',
    name: 'AICPA SOC Framework',
    url: 'https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome',
    framework: 'SOC2_TYPE2',
    scanFrequency: 'monthly',
    priority: 'high',
    keywords: ['SOC 2', 'trust services criteria', 'SSAE', 'service organization'],
  },
  
  // EU Regulations
  {
    id: 'eu-ai-act',
    name: 'EU AI Act',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021PC0206',
    framework: 'EU_AI_ACT',
    scanFrequency: 'weekly',
    priority: 'critical',
    keywords: ['AI Act', 'artificial intelligence', 'high-risk AI', 'conformity assessment'],
  },
  {
    id: 'eu-gdpr',
    name: 'GDPR Updates & Guidance',
    url: 'https://edpb.europa.eu/our-work-tools/general-guidance_en',
    framework: 'GDPR',
    scanFrequency: 'weekly',
    priority: 'high',
    keywords: ['GDPR', 'data protection', 'EDPB', 'guidance', 'DPA'],
  },
  
  // ISO Standards
  {
    id: 'iso-27001',
    name: 'ISO 27001 Updates',
    url: 'https://www.iso.org/standard/27001',
    framework: 'ISO_27001',
    scanFrequency: 'monthly',
    priority: 'high',
    keywords: ['ISO 27001', 'ISMS', 'information security', 'certification'],
  },
  
  // PCI
  {
    id: 'pci-dss',
    name: 'PCI DSS Updates',
    url: 'https://www.pcisecuritystandards.org/document_library',
    framework: 'PCI_DSS',
    scanFrequency: 'weekly',
    priority: 'high',
    keywords: ['PCI DSS', 'payment card', 'cardholder data', 'v4.0'],
  },
];


// ============================================================================
// AI AGENT PROMPTS
// ============================================================================

/**
 * System prompt for the regulatory scanning agent
 */
export const REGULATORY_SCAN_SYSTEM_PROMPT = `You are a Regulatory Compliance Intelligence Agent specializing in cybersecurity, data privacy, and AI governance regulations.

Your mission is to scan official regulatory sources and identify changes, updates, and new requirements that could impact organizations' compliance posture.

Core Competencies:
1. REGULATORY FRAMEWORKS: Deep understanding of SOC 2, ISO 27001, HIPAA, EU AI Act, GDPR, NIST CSF, PCI DSS, CCPA, FedRAMP, CMMC
2. CHANGE DETECTION: Ability to identify meaningful regulatory changes vs. cosmetic updates
3. IMPACT ANALYSIS: Assessment of how changes affect existing controls and compliance programs
4. 2026 FOCUS AREAS: Special attention to:
   - AI Transparency & Governance (EU AI Act)
   - Post-Quantum Cryptography readiness
   - Zero Trust Architecture requirements
   - Supply Chain Security
   - Data Residency requirements

Output Format: Always respond with valid JSON that can be parsed by automated systems.

Quality Standards:
- Only report changes that would require action by compliance teams
- Include specific section references and effective dates
- Assess confidence level in each finding
- Flag items requiring human review`;

/**
 * Generate the scan prompt for a specific source
 */
export function generateScanPrompt(source: RegulatorySource, lastScanDate: string): string {
  return `TASK: Scan for regulatory updates

SOURCE: ${source.name}
URL: ${source.url}
FRAMEWORK: ${source.framework}
LAST SCAN: ${lastScanDate}
KEYWORDS: ${source.keywords.join(', ')}

INSTRUCTIONS:
1. Search the web for recent updates, guidance, or announcements from this regulatory source
2. Focus on changes published after ${lastScanDate}
3. Identify any new requirements, amendments, enforcement actions, or guidance documents
4. Pay special attention to:
   - Effective dates and compliance deadlines
   - New or modified security/privacy controls
   - AI-specific requirements (if applicable)
   - Quantum cryptography mentions
   - Zero trust architecture requirements

OUTPUT FORMAT (JSON array):
[
  {
    "changeId": "unique-id",
    "sourceUrl": "exact URL of the change announcement",
    "sourceType": "official_publication|draft_regulation|guidance_document|enforcement_action|news_article",
    "publishedDate": "YYYY-MM-DD",
    "frameworkType": "${source.framework}",
    "affectedSections": ["section codes affected"],
    "changeType": "new_requirement|amendment|clarification|enforcement_guidance|deadline_change|new_framework",
    "changeSummary": "Brief 1-2 sentence summary",
    "changeDetails": "Detailed description of the change and its implications",
    "estimatedImpact": "critical|high|medium|low|informational",
    "affectedControlFamilies": ["Access Control", "Encryption", etc.],
    "suggestedActions": ["Action 1", "Action 2"],
    "aiConfidenceScore": 0-100,
    "requiresHumanReview": true|false,
    "category2026": "AI_TRANSPARENCY|QUANTUM_READINESS|ZERO_TRUST|TRADITIONAL|null"
  }
]

If no changes are found, return an empty array: []

IMPORTANT: Only include changes that would impact compliance programs. Ignore routine announcements, events, or administrative updates.`;
}

/**
 * Prompt for analyzing impact of a detected change
 */
export function generateImpactAnalysisPrompt(
  changeLog: RegulatoryChangeLog,
  existingControls: { id: string; title: string; description: string }[]
): string {
  return `TASK: Analyze compliance impact of regulatory change

CHANGE DETAILS:
- Framework: ${changeLog.frameworkType}
- Type: ${changeLog.changeType}
- Summary: ${changeLog.changeSummary}
- Details: ${changeLog.changeDetails}
- Affected Sections: ${changeLog.affectedSections.join(', ')}

EXISTING CONTROLS (${existingControls.length} total):
${existingControls.map(c => `- ${c.id}: ${c.title}`).join('\n')}

ANALYSIS REQUIRED:
1. Which existing controls are affected by this change?
2. Are any existing controls now insufficient?
3. Are new controls required?
4. What specific updates are needed?

OUTPUT FORMAT (JSON):
{
  "affectedControls": [
    {
      "controlId": "CTRL-XXX",
      "impactType": "requires_update|now_insufficient|no_change",
      "reason": "explanation",
      "suggestedUpdate": "what needs to change"
    }
  ],
  "newControlsNeeded": [
    {
      "suggestedTitle": "New Control Title",
      "suggestedDescription": "Description",
      "suggestedControlFamily": "Family",
      "suggestedCategory": "AI_TRANSPARENCY|QUANTUM_READINESS|ZERO_TRUST|TRADITIONAL",
      "implementationSteps": ["Step 1", "Step 2"],
      "estimatedEffort": "low|medium|high",
      "relatedRequirementSections": ["section codes"]
    }
  ],
  "overallImpactAssessment": "summary of total impact",
  "recommendedPriority": "critical|high|medium|low",
  "suggestedDeadline": "YYYY-MM-DD or null"
}`;
}

/**
 * Prompt for 2026-specific requirement analysis
 */
export const PROMPT_2026_ANALYSIS = `TASK: Analyze requirement for 2026-specific compliance needs

Analyze the following regulatory requirement and determine if it relates to any 2026-forward compliance areas:

1. AI TRANSPARENCY & GOVERNANCE (EU AI Act)
   - Model documentation and training data transparency
   - Bias assessment and mitigation
   - Explainability requirements
   - High-risk AI classification
   - Human oversight mechanisms
   - Algorithmic audit trails

2. QUANTUM READINESS
   - Post-quantum cryptography (PQC) migration
   - CRYSTALS-Kyber, CRYSTALS-Dilithium, FALCON, SPHINCS+
   - Crypto-agility requirements
   - Hybrid classical/PQC implementations
   - Key management for PQC

3. ZERO TRUST ARCHITECTURE
   - Continuous authentication (replacing static sessions)
   - Identity-centric security
   - Microsegmentation
   - Device trust verification
   - Real-time access decisions
   - Never trust, always verify

4. SUPPLY CHAIN SECURITY
   - Software bill of materials (SBOM)
   - Third-party AI component governance
   - Vendor risk assessment for AI systems
   - Code signing and integrity verification

5. DATA RESIDENCY
   - Geographic data storage requirements
   - Cross-border transfer restrictions
   - Sovereignty requirements for AI training data

OUTPUT FORMAT (JSON):
{
  "category2026": "AI_TRANSPARENCY|AI_RISK_CLASSIFICATION|QUANTUM_READINESS|ZERO_TRUST|DATA_RESIDENCY|SUPPLY_CHAIN|ALGORITHMIC_AUDIT|HUMAN_OVERSIGHT|TRADITIONAL",
  "relevanceScore": 0-100,
  "specificRequirements": ["list of specific 2026 requirements applicable"],
  "implementationGuidance": ["guidance for implementing 2026 aspects"],
  "timelineConsiderations": "any deadline or phasing considerations"
}`;


// ============================================================================
// CHANGE LOG PROCESSOR
// ============================================================================

/**
 * Parse and validate AI agent output into structured change logs
 */
export function parseAgentOutput(
  rawOutput: string,
  sourceId: string
): RegulatoryChangeLog[] {
  try {
    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = rawOutput;
    const jsonMatch = rawOutput.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const arrayMatch = rawOutput.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonStr = arrayMatch[0];
      }
    }

    const parsed = JSON.parse(jsonStr);
    
    if (!Array.isArray(parsed)) {
      console.warn('Agent output is not an array');
      return [];
    }

    return parsed.map((item: any, index: number) => ({
      id: item.changeId || `change-${sourceId}-${Date.now()}-${index}`,
      detectedAt: new Date().toISOString(),
      sourceUrl: item.sourceUrl || '',
      sourceType: item.sourceType || 'official_publication',
      publishedDate: item.publishedDate || new Date().toISOString().split('T')[0],
      frameworkType: item.frameworkType as FrameworkType,
      affectedSections: Array.isArray(item.affectedSections) ? item.affectedSections : [],
      changeType: item.changeType || 'amendment',
      changeSummary: item.changeSummary || '',
      changeDetails: item.changeDetails || '',
      estimatedImpact: item.estimatedImpact || 'medium',
      affectedControlFamilies: Array.isArray(item.affectedControlFamilies) ? item.affectedControlFamilies : [],
      suggestedActions: Array.isArray(item.suggestedActions) ? item.suggestedActions : [],
      status: 'detected' as const,
      aiConfidenceScore: item.aiConfidenceScore || 50,
      requiresHumanReview: item.requiresHumanReview !== false,
    }));
  } catch (error) {
    console.error('Failed to parse agent output:', error);
    return [];
  }
}

/**
 * Parse suggested controls from impact analysis
 */
export function parseSuggestedControls(
  rawOutput: string,
  changeLogId: string
): SuggestedControl[] {
  try {
    let jsonStr = rawOutput;
    const jsonMatch = rawOutput.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);
    
    if (!parsed.newControlsNeeded || !Array.isArray(parsed.newControlsNeeded)) {
      return [];
    }

    return parsed.newControlsNeeded.map((item: any, index: number) => ({
      id: `suggested-${changeLogId}-${index}`,
      changeLogId,
      suggestedTitle: item.suggestedTitle || 'New Control',
      suggestedDescription: item.suggestedDescription || '',
      suggestedControlFamily: item.suggestedControlFamily || 'General',
      suggestedCategory: item.suggestedCategory || 'TRADITIONAL',
      relatedRequirementIds: item.relatedRequirementSections || [],
      existingControlsToUpdate: [],
      implementationSteps: Array.isArray(item.implementationSteps) ? item.implementationSteps : [],
      estimatedEffort: item.estimatedEffort || 'medium',
      suggestedDeadline: item.suggestedDeadline || undefined,
      status: 'suggested' as const,
    }));
  } catch (error) {
    console.error('Failed to parse suggested controls:', error);
    return [];
  }
}


// ============================================================================
// SCANNING SCHEDULER
// ============================================================================

export interface ScanSchedule {
  sourceId: string;
  lastScanDate: string;
  nextScanDate: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  lastError?: string;
}

/**
 * Calculate next scan date based on frequency
 */
export function calculateNextScanDate(frequency: RegulatorySource['scanFrequency']): string {
  const now = new Date();
  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      now.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
  }
  return now.toISOString();
}

/**
 * Get sources due for scanning
 */
export function getSourcesDueForScan(schedules: ScanSchedule[]): RegulatorySource[] {
  const now = new Date();
  const dueSourceIds = schedules
    .filter(s => new Date(s.nextScanDate) <= now && s.status !== 'running')
    .map(s => s.sourceId);

  return REGULATORY_SOURCES.filter(s => dueSourceIds.includes(s.id));
}


// ============================================================================
// NETLIFY FUNCTION FOR SCANNING
// ============================================================================

export const SCAN_FUNCTION_CODE = `
// netlify/functions/regulatory-scan.js
// Scheduled function to scan regulatory sources

export default async (request, context) => {
  const ANTHROPIC_API_KEY = Netlify.env.get('ANTHROPIC_API_KEY');
  
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get sources due for scanning (in production, read from database)
  const sourcesToScan = [
    {
      id: 'hhs-hipaa',
      name: 'HHS HIPAA Security Rule',
      framework: 'HIPAA_SECURITY',
      keywords: ['HIPAA', 'security rule', 'MFA', '2026'],
    },
    {
      id: 'eu-ai-act',
      name: 'EU AI Act',
      framework: 'EU_AI_ACT',
      keywords: ['AI Act', 'high-risk AI', 'conformity'],
    },
  ];

  const results = [];
  const lastScanDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  for (const source of sourcesToScan) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          system: \`You are a Regulatory Compliance Intelligence Agent...\`,
          messages: [{
            role: 'user',
            content: \`Scan for regulatory updates from \${source.name}...
                       Keywords: \${source.keywords.join(', ')}
                       Last scan: \${lastScanDate}
                       Return JSON array of changes found.\`
          }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Parse response and add to results
        results.push({
          sourceId: source.id,
          status: 'completed',
          changesFound: data.content.length,
        });
      }
    } catch (error) {
      results.push({
        sourceId: source.id,
        status: 'failed',
        error: error.message,
      });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    scannedAt: new Date().toISOString(),
    results,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const config = {
  schedule: "0 6 * * 1"  // Every Monday at 6 AM
};
`;
