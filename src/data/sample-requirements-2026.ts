/**
 * ============================================================================
 * SAMPLE 2026 REQUIREMENTS DATA
 * ============================================================================
 * 
 * Example requirements demonstrating:
 * - HIPAA 2026 Updates (MFA requirements)
 * - EU AI Act (AI Transparency)
 * - Post-Quantum Cryptography
 * - Zero Trust Architecture
 */

import {
  MasterRequirement,
  MasterControl,
  RequirementControlMapping,
  FrameworkVersion,
  MasterRequirementLibrary,
} from '../types/compliance.types';

// ============================================================================
// FRAMEWORK VERSIONS
// ============================================================================

export const FRAMEWORK_VERSIONS: Record<string, FrameworkVersion> = {
  HIPAA_SECURITY_2024: {
    frameworkType: 'HIPAA_SECURITY',
    version: '2024',
    effectiveDate: '2024-01-01',
    status: 'active',
    sourceUrl: 'https://www.hhs.gov/hipaa/for-professionals/security/index.html',
    lastVerified: '2025-12-01',
  },
  HIPAA_SECURITY_2026: {
    frameworkType: 'HIPAA_SECURITY',
    version: '2026_update',
    effectiveDate: '2026-06-01',
    sunsetDate: undefined,
    status: 'final',
    sourceUrl: 'https://www.hhs.gov/hipaa/for-professionals/security/2026-update',
    lastVerified: '2026-01-10',
  },
  EU_AI_ACT_2024: {
    frameworkType: 'EU_AI_ACT',
    version: '2024',
    effectiveDate: '2024-08-01',
    status: 'active',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689',
    lastVerified: '2025-12-01',
  },
  EU_AI_ACT_2026: {
    frameworkType: 'EU_AI_ACT',
    version: '2026_enforcement',
    effectiveDate: '2026-08-02',
    status: 'final',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689',
    lastVerified: '2026-01-10',
  },
  ISO_27001_2022: {
    frameworkType: 'ISO_27001',
    version: '2022',
    effectiveDate: '2022-10-25',
    status: 'active',
    sourceUrl: 'https://www.iso.org/standard/27001',
    lastVerified: '2025-12-01',
  },
  NIST_PQC_2026: {
    frameworkType: 'NIST_800_53',
    version: '2026_pqc',
    effectiveDate: '2026-01-01',
    status: 'final',
    sourceUrl: 'https://csrc.nist.gov/projects/post-quantum-cryptography',
    lastVerified: '2026-01-10',
  },
};


// ============================================================================
// HIPAA 2026 REQUIREMENTS - MFA UPDATE EXAMPLE
// ============================================================================

export const HIPAA_MFA_2024: MasterRequirement = {
  id: 'REQ-HIPAA-SEC-164.312.d-2024',
  frameworkId: 'HIPAA_SECURITY',
  frameworkVersion: FRAMEWORK_VERSIONS.HIPAA_SECURITY_2024,
  sectionCode: '164.312(d)',
  sectionTitle: 'Person or Entity Authentication',
  requirementText: 'Implement procedures to verify that a person or entity seeking access to electronic protected health information is the one claimed.',
  requirementSummary: 'Verify identity of users accessing ePHI through authentication procedures.',
  category: 'TRADITIONAL',
  controlFamily: 'Access Control',
  riskLevel: 'high',
  implementationGuidance: [
    'Implement unique user identification',
    'Use password-based authentication',
    'Consider additional authentication factors based on risk',
    'Document authentication procedures',
  ],
  evidenceExamples: [
    'Authentication policy document',
    'User access management procedures',
    'Password policy configuration screenshots',
  ],
  commonFailures: [
    'Shared accounts without individual accountability',
    'Weak password requirements',
    'No documentation of authentication procedures',
  ],
  relatedRequirements: ['REQ-HIPAA-SEC-164.312.a.1', 'REQ-HIPAA-SEC-164.312.a.2.i'],
  keywords: ['authentication', 'identity', 'access', 'password', 'verification'],
  lastUpdated: '2024-01-01',
  changeHistory: [],
};

export const HIPAA_MFA_2026: MasterRequirement = {
  id: 'REQ-HIPAA-SEC-164.312.d-2026',
  frameworkId: 'HIPAA_SECURITY',
  frameworkVersion: FRAMEWORK_VERSIONS.HIPAA_SECURITY_2026,
  sectionCode: '164.312(d)',
  sectionTitle: 'Person or Entity Authentication',
  requirementText: 'Implement multi-factor authentication (MFA) for all access to electronic protected health information. MFA must include at least two of: (1) something the user knows, (2) something the user has, (3) something the user is. Continuous authentication or risk-based step-up authentication is required for high-risk access scenarios. Phishing-resistant authentication methods (such as FIDO2/WebAuthn) must be available for privileged access.',
  requirementSummary: 'MANDATORY multi-factor authentication for all ePHI access with phishing-resistant options for privileged users.',
  category: 'ZERO_TRUST',
  controlFamily: 'Access Control',
  riskLevel: 'critical',
  implementationGuidance: [
    'Implement MFA for ALL users accessing ePHI - no exceptions',
    'Deploy phishing-resistant MFA (FIDO2/WebAuthn) for privileged accounts',
    'Implement continuous authentication for high-risk sessions',
    'Configure risk-based step-up authentication',
    'Remove SMS-based OTP as sole second factor by compliance deadline',
    'Document MFA enrollment and recovery procedures',
    'Implement MFA bypass monitoring and alerting',
  ],
  evidenceExamples: [
    'MFA policy with phishing-resistant requirements',
    'Identity provider configuration showing MFA enforcement',
    'Privileged access management with FIDO2 enforcement',
    'Risk-based authentication rule configuration',
    'MFA coverage report showing 100% enrollment',
    'Continuous authentication implementation documentation',
  ],
  commonFailures: [
    'MFA exceptions for executives or legacy systems',
    'Reliance on SMS-only as second factor',
    'No phishing-resistant option for privileged access',
    'Missing continuous authentication for sensitive operations',
    'Incomplete MFA enrollment across user population',
  ],
  relatedRequirements: ['REQ-HIPAA-SEC-164.312.a.1-2026', 'REQ-HIPAA-SEC-164.312.e.1-2026'],
  supersedes: 'REQ-HIPAA-SEC-164.312.d-2024',
  keywords: ['MFA', 'multi-factor', 'authentication', 'FIDO2', 'WebAuthn', 'phishing-resistant', 'continuous', 'zero trust'],
  lastUpdated: '2026-01-01',
  changeHistory: [
    {
      changeId: 'CHG-HIPAA-MFA-2026-001',
      timestamp: '2026-01-01T00:00:00Z',
      changeType: 'strengthened',
      previousText: 'Implement procedures to verify that a person or entity seeking access...',
      newText: 'Implement multi-factor authentication (MFA) for all access to electronic protected health information...',
      changeDescription: 'HHS strengthened authentication requirements to mandate MFA for all ePHI access with phishing-resistant options',
      sourceReference: 'https://www.hhs.gov/hipaa/2026-security-rule-update',
      detectedBy: 'official_update',
    },
  ],
};


// ============================================================================
// EU AI ACT REQUIREMENTS
// ============================================================================

export const EU_AI_ACT_TRANSPARENCY: MasterRequirement = {
  id: 'REQ-EU-AI-ACT-13-2026',
  frameworkId: 'EU_AI_ACT',
  frameworkVersion: FRAMEWORK_VERSIONS.EU_AI_ACT_2026,
  sectionCode: 'Article 13',
  sectionTitle: 'Transparency and Provision of Information to Deployers',
  requirementText: 'High-risk AI systems shall be designed and developed in such a way as to ensure that their operation is sufficiently transparent to enable deployers to interpret a system\'s output and use it appropriately. Providers shall ensure that high-risk AI systems are accompanied by instructions for use including: (a) identity and contact details of the provider; (b) characteristics, capabilities and limitations of the AI system including its intended purpose, level of accuracy, robustness and cybersecurity; (c) information on training data including data sources, data preparation measures, and labelling methodology.',
  requirementSummary: 'High-risk AI systems must be transparent with documented training data, accuracy metrics, and interpretable outputs.',
  category: 'AI_TRANSPARENCY',
  controlFamily: 'AI Governance',
  riskLevel: 'critical',
  implementationGuidance: [
    'Document all training data sources and preparation methods',
    'Implement and document bias assessment procedures',
    'Provide explainability mechanisms for AI decisions',
    'Maintain accuracy and performance metrics',
    'Create user-facing documentation for AI system behavior',
    'Implement audit trails for AI-assisted decisions',
    'Register high-risk AI systems in EU database',
  ],
  evidenceExamples: [
    'AI system registration in EU database',
    'Training data documentation and data sheets',
    'Bias assessment report with mitigation measures',
    'Model cards documenting accuracy and limitations',
    'Explainability implementation documentation',
    'User instructions for AI system operation',
  ],
  commonFailures: [
    'Incomplete training data documentation',
    'Missing bias assessment or mitigation',
    'No explainability mechanism for decisions',
    'Failure to register high-risk AI system',
    'Inadequate accuracy/performance documentation',
  ],
  relatedRequirements: ['REQ-EU-AI-ACT-9-2026', 'REQ-EU-AI-ACT-14-2026', 'REQ-EU-AI-ACT-15-2026'],
  keywords: ['AI', 'transparency', 'training data', 'bias', 'explainability', 'high-risk', 'documentation', 'EU AI Act'],
  lastUpdated: '2026-01-01',
  changeHistory: [],
};

export const EU_AI_ACT_HUMAN_OVERSIGHT: MasterRequirement = {
  id: 'REQ-EU-AI-ACT-14-2026',
  frameworkId: 'EU_AI_ACT',
  frameworkVersion: FRAMEWORK_VERSIONS.EU_AI_ACT_2026,
  sectionCode: 'Article 14',
  sectionTitle: 'Human Oversight',
  requirementText: 'High-risk AI systems shall be designed and developed in such a way that they can be effectively overseen by natural persons during the period in which they are in use. Human oversight shall aim to prevent or minimize risks to health, safety or fundamental rights that may emerge when a high-risk AI system is used. Human-machine interface tools shall allow the persons to whom human oversight is assigned to: (a) fully understand the capacities and limitations of the AI system; (b) remain aware of automation bias; (c) correctly interpret the AI system output; (d) decide not to use the AI system or override its output.',
  requirementSummary: 'High-risk AI must have human oversight with ability to understand, interpret, and override AI decisions.',
  category: 'HUMAN_OVERSIGHT',
  controlFamily: 'AI Governance',
  riskLevel: 'critical',
  implementationGuidance: [
    'Implement human-in-the-loop for high-risk decisions',
    'Design override mechanisms for AI outputs',
    'Train operators on AI limitations and bias',
    'Create escalation procedures for uncertain AI outputs',
    'Document human oversight responsibilities',
    'Implement monitoring for automation bias',
  ],
  evidenceExamples: [
    'Human oversight procedure documentation',
    'Override mechanism implementation',
    'Operator training records',
    'Automation bias monitoring reports',
    'Escalation procedure documentation',
  ],
  commonFailures: [
    'No ability to override AI decisions',
    'Operators not trained on AI limitations',
    'Automation bias not monitored',
    'Missing escalation procedures',
  ],
  relatedRequirements: ['REQ-EU-AI-ACT-13-2026', 'REQ-EU-AI-ACT-15-2026'],
  keywords: ['human oversight', 'AI', 'override', 'automation bias', 'human-in-the-loop'],
  lastUpdated: '2026-01-01',
  changeHistory: [],
};


// ============================================================================
// POST-QUANTUM CRYPTOGRAPHY REQUIREMENTS
// ============================================================================

export const NIST_PQC_MIGRATION: MasterRequirement = {
  id: 'REQ-NIST-PQC-001-2026',
  frameworkId: 'NIST_800_53',
  frameworkVersion: FRAMEWORK_VERSIONS.NIST_PQC_2026,
  sectionCode: 'SC-13(PQC)',
  sectionTitle: 'Cryptographic Protection - Post-Quantum Migration',
  requirementText: 'Organizations shall develop and implement a cryptographic migration plan to transition from quantum-vulnerable algorithms to NIST-approved post-quantum cryptographic (PQC) algorithms. The plan shall include: (a) inventory of all cryptographic implementations; (b) risk assessment of quantum vulnerability; (c) prioritized migration timeline; (d) hybrid implementation approach during transition; (e) testing and validation procedures for PQC implementations. Organizations processing sensitive data must complete migration to PQC for high-priority systems by 2030.',
  requirementSummary: 'Develop and execute migration plan to NIST-approved post-quantum cryptographic algorithms.',
  category: 'QUANTUM_READINESS',
  controlFamily: 'Cryptography',
  riskLevel: 'high',
  implementationGuidance: [
    'Conduct comprehensive cryptographic inventory',
    'Identify quantum-vulnerable implementations (RSA, ECC, DH)',
    'Prioritize systems based on data sensitivity and longevity',
    'Implement NIST-approved PQC: CRYSTALS-Kyber (KEM), CRYSTALS-Dilithium (signatures)',
    'Consider hybrid classical/PQC approach during transition',
    'Implement crypto-agility for future algorithm updates',
    'Test PQC performance impact and plan capacity upgrades',
    'Update key management procedures for PQC key sizes',
  ],
  evidenceExamples: [
    'Cryptographic asset inventory',
    'Quantum vulnerability risk assessment',
    'PQC migration roadmap with milestones',
    'Hybrid implementation documentation',
    'PQC testing and validation results',
    'Crypto-agility architecture documentation',
  ],
  commonFailures: [
    'No cryptographic inventory',
    'Missing quantum vulnerability assessment',
    'No migration timeline or plan',
    'Ignoring harvest-now-decrypt-later threats',
    'Not considering crypto-agility',
  ],
  relatedRequirements: ['REQ-NIST-SC-12', 'REQ-NIST-SC-13'],
  keywords: ['post-quantum', 'PQC', 'CRYSTALS-Kyber', 'CRYSTALS-Dilithium', 'cryptography', 'migration', 'quantum-safe'],
  lastUpdated: '2026-01-01',
  changeHistory: [],
};


// ============================================================================
// SAMPLE MASTER CONTROLS (Company's Actions)
// ============================================================================

export const SAMPLE_CONTROLS: MasterControl[] = [
  {
    id: 'CTRL-AC-001',
    controlNumber: 'AC-001',
    title: 'Multi-Factor Authentication',
    description: 'Implementation of multi-factor authentication for system access.',
    objective: 'Ensure strong identity verification before granting access to systems and data.',
    scope: 'All production systems and applications containing sensitive data.',
    controlFamily: 'Access Control',
    category2026: 'ZERO_TRUST',
    controlType: 'preventive',
    automationLevel: 'fully_automated',
    implementationDetails: 'Azure AD with MFA enforced via Conditional Access policies. FIDO2 security keys deployed for privileged accounts.',
    owner: 'Identity Team',
    ownerEmail: 'identity@company.com',
    frequency: 'continuous',
    status: 'operational',
    effectivenessRating: 4,
    lastAssessmentDate: '2025-12-15',
    nextAssessmentDate: '2026-03-15',
    evidence: [
      {
        id: 'EV-AC-001-001',
        type: 'configuration_export',
        title: 'Azure AD Conditional Access Policy Export',
        description: 'Export of MFA enforcement policies',
        collectedDate: '2025-12-15',
        collectedBy: 'Security Team',
        verified: true,
        verifiedBy: 'Internal Audit',
        verifiedDate: '2025-12-20',
      },
    ],
    version: '2.1',
    lastUpdated: '2025-12-15',
    changeHistory: [],
    zeroTrustDetails: {
      continuousAuthEnabled: true,
      authenticationMethods: ['FIDO2', 'Microsoft Authenticator', 'SMS (legacy, being phased out)'],
      sessionDuration: 60,
      riskBasedAuthentication: true,
      microsegmentationEnabled: false,
      networkZones: ['Corporate', 'DMZ', 'Cloud'],
      deviceTrustRequired: true,
      deviceComplianceChecks: ['Encryption', 'Antivirus', 'OS Version'],
      dataClassificationEnabled: true,
      encryptionAtRest: true,
      encryptionInTransit: true,
      continuousMonitoring: true,
      behaviorAnalytics: true,
      anomalyDetectionEnabled: true,
    },
  },
  {
    id: 'CTRL-AI-001',
    controlNumber: 'AI-001',
    title: 'AI Model Documentation and Transparency',
    description: 'Documentation of AI model training data, methodology, and decision-making processes.',
    objective: 'Ensure AI systems are transparent and their decisions can be explained.',
    scope: 'All AI/ML models deployed in production.',
    controlFamily: 'AI Governance',
    category2026: 'AI_TRANSPARENCY',
    controlType: 'detective',
    automationLevel: 'semi_automated',
    implementationDetails: 'Model cards maintained for all production models. MLflow used for experiment tracking. Bias assessments conducted quarterly.',
    owner: 'ML Platform Team',
    ownerEmail: 'mlplatform@company.com',
    frequency: 'quarterly',
    status: 'implemented',
    effectivenessRating: 3,
    lastAssessmentDate: '2025-11-01',
    nextAssessmentDate: '2026-02-01',
    evidence: [],
    version: '1.0',
    lastUpdated: '2025-11-01',
    changeHistory: [],
    aiSpecific: {
      aiSystemId: 'AI-SYS-001',
      riskClassification: 'high_risk',
      modelDocumentation: {
        trainingDataDescription: 'Customer interaction data from 2020-2024',
        trainingDataSources: ['CRM System', 'Support Tickets', 'Chat Logs'],
        dataRetentionPolicy: '7 years',
        biasAssessmentDate: '2025-10-15',
        biasAssessmentResults: 'No significant bias detected across protected categories',
      },
      explainabilityMethod: 'SHAP values for feature importance',
      humanOversightMechanism: 'Human review required for decisions over $10k',
      appealProcess: 'Customer can request human review via support portal',
      technicalDocumentationUrl: 'https://docs.internal/ai/model-cards',
    },
  },
  {
    id: 'CTRL-CR-001',
    controlNumber: 'CR-001',
    title: 'Cryptographic Key Management',
    description: 'Management of cryptographic keys including generation, storage, rotation, and destruction.',
    objective: 'Ensure cryptographic keys are properly managed throughout their lifecycle.',
    scope: 'All encryption keys used for data protection.',
    controlFamily: 'Cryptography',
    category2026: 'QUANTUM_READINESS',
    controlType: 'preventive',
    automationLevel: 'fully_automated',
    implementationDetails: 'AWS KMS and Azure Key Vault for key management. RSA-4096 and AES-256 currently in use. PQC assessment initiated.',
    owner: 'Security Architecture',
    ownerEmail: 'secarch@company.com',
    frequency: 'continuous',
    status: 'needs_review',
    effectivenessRating: 4,
    lastAssessmentDate: '2025-09-01',
    nextAssessmentDate: '2026-01-15',
    evidence: [],
    version: '1.5',
    lastUpdated: '2025-09-01',
    changeHistory: [],
    quantumReadiness: {
      currentEncryptionAlgorithms: ['RSA-4096', 'AES-256', 'ECDSA P-384'],
      quantumVulnerableAssets: ['TLS certificates', 'Code signing keys', 'Data encryption keys'],
      postQuantumAlgorithms: [],
      migrationStatus: 'assessment',
      migrationDeadline: '2028-12-31',
      hybridImplementation: false,
      cryptoAgilityScore: 2,
    },
  },
];


// ============================================================================
// SAMPLE MAPPINGS (Crosswalk)
// ============================================================================

export const SAMPLE_MAPPINGS: RequirementControlMapping[] = [
  {
    id: 'MAP-001',
    requirementId: 'REQ-HIPAA-SEC-164.312.d-2024',
    controlId: 'CTRL-AC-001',
    mappingType: 'full',
    coveragePercentage: 100,
    mappingRationale: 'MFA implementation fully satisfies HIPAA authentication requirements.',
    gaps: [],
    status: 'active',
    verifiedBy: 'Compliance Team',
    verifiedDate: '2025-06-01',
    createdAt: '2025-01-01',
    createdBy: 'Compliance Team',
    lastUpdated: '2025-06-01',
    updatedBy: 'Compliance Team',
  },
  {
    id: 'MAP-002',
    requirementId: 'REQ-EU-AI-ACT-13-2026',
    controlId: 'CTRL-AI-001',
    mappingType: 'partial',
    coveragePercentage: 70,
    mappingRationale: 'Model documentation exists but needs enhancement for EU AI Act compliance.',
    gaps: [
      {
        id: 'GAP-001',
        gapDescription: 'EU database registration not yet completed',
        severity: 'high',
        remediationPlan: 'Complete registration by Q2 2026',
        remediationDeadline: '2026-06-30',
        status: 'open',
      },
      {
        id: 'GAP-002',
        gapDescription: 'Bias assessment methodology needs alignment with EU AI Act requirements',
        severity: 'medium',
        remediationPlan: 'Update bias assessment procedure',
        remediationDeadline: '2026-03-31',
        status: 'in_progress',
      },
    ],
    status: 'active',
    createdAt: '2025-12-01',
    createdBy: 'Compliance Team',
    lastUpdated: '2025-12-15',
    updatedBy: 'Compliance Team',
  },
];


// ============================================================================
// COMPLETE MASTER REQUIREMENT LIBRARY
// ============================================================================

export const MASTER_REQUIREMENT_LIBRARY: MasterRequirementLibrary = {
  libraryId: 'MRL-2026-001',
  libraryVersion: '3.0.0',
  lastUpdated: '2026-01-13',
  maintainedBy: 'Compliance Engineering Team',
  
  frameworks: {
    HIPAA_SECURITY: {
      type: 'HIPAA_SECURITY',
      versions: [FRAMEWORK_VERSIONS.HIPAA_SECURITY_2024, FRAMEWORK_VERSIONS.HIPAA_SECURITY_2026],
      activeVersion: '2026_update',
    },
    EU_AI_ACT: {
      type: 'EU_AI_ACT',
      versions: [FRAMEWORK_VERSIONS.EU_AI_ACT_2024, FRAMEWORK_VERSIONS.EU_AI_ACT_2026],
      activeVersion: '2026_enforcement',
    },
    ISO_27001: {
      type: 'ISO_27001',
      versions: [FRAMEWORK_VERSIONS.ISO_27001_2022],
      activeVersion: '2022',
    },
    NIST_800_53: {
      type: 'NIST_800_53',
      versions: [FRAMEWORK_VERSIONS.NIST_PQC_2026],
      activeVersion: '2026_pqc',
    },
  },
  
  requirements: {
    'HIPAA_SECURITY_2024': [HIPAA_MFA_2024],
    'HIPAA_SECURITY_2026_update': [HIPAA_MFA_2026],
    'EU_AI_ACT_2026_enforcement': [EU_AI_ACT_TRANSPARENCY, EU_AI_ACT_HUMAN_OVERSIGHT],
    'NIST_800_53_2026_pqc': [NIST_PQC_MIGRATION],
  },
  
  crossFrameworkMappings: [
    {
      sourceRequirementId: 'REQ-HIPAA-SEC-164.312.d-2026',
      targetRequirementId: 'REQ-ISO-A.9.4.2',
      mappingType: 'related',
      notes: 'Both address authentication; HIPAA 2026 is more prescriptive about MFA',
    },
  ],
  
  changeLog: [],
  
  statistics: {
    totalRequirements: 5,
    requirementsByFramework: {
      HIPAA_SECURITY: 2,
      EU_AI_ACT: 2,
      NIST_800_53: 1,
    },
    requirementsByCategory: {
      ZERO_TRUST: 1,
      AI_TRANSPARENCY: 1,
      HUMAN_OVERSIGHT: 1,
      QUANTUM_READINESS: 1,
      TRADITIONAL: 1,
    },
    lastScanDate: '2026-01-13',
    pendingChanges: 0,
  },
};

export default MASTER_REQUIREMENT_LIBRARY;
