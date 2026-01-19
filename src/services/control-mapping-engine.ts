/**
 * Control Mapping Engine
 *
 * Core engine for the Control-Centric Unified Assessment System.
 * Handles dynamic mapping between controls and framework requirements.
 */

import {
  MASTER_CONTROLS,
  FRAMEWORKS,
  COMPLIANCE_DOMAINS,
  type MasterControl,
  type FrameworkId,
  type ComplianceDomainMeta,
  type FrameworkMeta
} from '../constants/controls';

// ============================================================================
// TYPES
// ============================================================================

export interface SatisfiedRequirement {
  frameworkId: FrameworkId;
  frameworkName: string;
  frameworkColor: string;
  clauseId: string;
  clauseTitle: string;
  clauseText?: string; // Legal text of the requirement
}

export interface ControlCoverage {
  controlId: string;
  controlTitle: string;
  totalRequirements: number;
  frameworksCovered: FrameworkId[];
  requirements: SatisfiedRequirement[];
  coverageSummary: string; // e.g., "This control satisfies 4 requirements across 2 frameworks."
}

export interface FrameworkCoverage {
  frameworkId: FrameworkId;
  frameworkName: string;
  frameworkColor: string;
  totalClauses: number;
  satisfiedClauses: number;
  excludedClauses: number; // Clauses where ALL mapped controls are N/A
  percentage: number;
  clauses: {
    clauseId: string;
    clauseTitle: string;
    satisfied: boolean | null; // null = excluded (all controls N/A)
    isExcluded: boolean;
    satisfiedByControls: string[];
  }[];
}

export interface WeightedScoreResult {
  weightedScore: number;
  unweightedScore: number;
  riskBreakdown: Record<string, { total: number; implemented: number; weight: number; naCount: number }>;
  criticalGaps: string[];
  highGaps: string[];
}

export interface DomainGroup {
  domain: ComplianceDomainMeta;
  controls: MasterControl[];
  totalControls: number;
  implementedCount: number;
  percentage: number;
}

export interface ControlStatus {
  controlId: string;
  status: 'not_started' | 'in_progress' | 'implemented' | 'not_applicable';
  answer?: 'yes' | 'no' | 'partial' | 'na' | null;
  hasEvidence: boolean;
  lastUpdated?: string;
}

// ============================================================================
// CLAUSE TEXT DATABASE (Legal text for each requirement)
// ============================================================================

const CLAUSE_TEXT_DATABASE: Record<string, Record<string, string>> = {
  SOC2: {
    'CC6.1': 'The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events to meet the entity\'s objectives.',
    'CC6.2': 'Prior to issuing system credentials and granting system access, the entity registers and authorizes new internal and external users whose access is administered by the entity.',
    'CC6.3': 'The entity authorizes, modifies, or removes access to data, software, functions, and other protected information assets based on roles, responsibilities, or the system design and changes.',
    'CC6.6': 'The entity implements logical access security measures to protect against threats from sources outside its system boundaries.',
    'CC6.7': 'The entity restricts the transmission, movement, and removal of information to authorized internal and external users and processes.',
    'CC7.1': 'To meet its objectives, the entity uses detection and monitoring procedures to identify (1) changes to configurations that result in the introduction of new vulnerabilities, and (2) susceptibilities to newly discovered vulnerabilities.',
    'CC7.2': 'The entity monitors system components and the operation of those components for anomalies that are indicative of malicious acts, natural disasters, and errors affecting the entity\'s ability to meet its objectives.',
    'CC7.3': 'The entity evaluates security events to determine whether they could or have resulted in a failure of the entity to meet its objectives (security incidents) and, if so, takes actions to prevent or address such failures.',
    'CC7.4': 'The entity responds to identified security incidents by executing a defined incident response program to understand, contain, remediate, and communicate security incidents.',
    'CC7.5': 'The entity identifies, develops, and implements activities to recover from identified security incidents.',
    'CC8.1': 'The entity authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures to meet its objectives.',
    'CC9.1': 'The entity identifies, selects, and develops risk mitigation activities for risks arising from potential business disruptions.',
    'CC9.2': 'The entity assesses and manages risks associated with vendors and business partners.',
  },
  ISO27001: {
    'A.5.1': 'Policies for information security: Management direction for information security shall be defined and approved by management, published and communicated to employees and relevant external parties.',
    'A.5.15': 'Access control: Rules to control physical and logical access to information and other associated assets shall be established and implemented based on business and information security requirements.',
    'A.5.16': 'Identity management: The full lifecycle of identities shall be managed.',
    'A.5.17': 'Authentication information: Allocation and management of authentication information shall be controlled by a management process.',
    'A.5.18': 'Access rights: Access rights to information and other associated assets shall be provisioned, reviewed, modified and removed in accordance with the organization\'s topic-specific policy on and rules for access control.',
    'A.5.23': 'Information security for use of cloud services: Processes for acquisition, use, management and exit from cloud services shall be established in accordance with the organization\'s information security requirements.',
    'A.5.24': 'Information security incident management planning and preparation: The organization shall plan and prepare for managing information security incidents by defining, establishing and communicating information security incident management processes, roles and responsibilities.',
    'A.5.29': 'Information security during disruption: The organization shall plan how to maintain information security at an appropriate level during disruption.',
    'A.5.30': 'ICT readiness for business continuity: ICT readiness shall be planned, implemented, maintained and tested based on business continuity objectives and ICT continuity requirements.',
    'A.8.1': 'User endpoint devices: Information stored on, processed by or accessible via user endpoint devices shall be protected.',
    'A.8.2': 'Privileged access rights: The allocation and use of privileged access rights shall be restricted and managed.',
    'A.8.3': 'Information access restriction: Access to information and other associated assets shall be restricted in accordance with the established topic-specific policy on access control.',
    'A.8.9': 'Configuration management: Configurations, including security configurations, of hardware, software, services and networks shall be established, documented, implemented, monitored and reviewed.',
    'A.8.12': 'Data leakage prevention: Data leakage prevention measures shall be applied to systems, networks and any other devices that process, store or transmit sensitive information.',
    'A.8.24': 'Use of cryptography: Rules for the effective use of cryptography, including cryptographic key management, shall be defined and implemented.',
  },
  HIPAA: {
    '164.308(a)(1)': 'Security Management Process: Implement policies and procedures to prevent, detect, contain, and correct security violations.',
    '164.308(a)(3)': 'Workforce Security: Implement policies and procedures to ensure that all members of its workforce have appropriate access to electronic protected health information.',
    '164.308(a)(4)': 'Information Access Management: Implement policies and procedures for authorizing access to electronic protected health information.',
    '164.308(a)(5)': 'Security Awareness and Training: Implement a security awareness and training program for all members of its workforce.',
    '164.308(a)(6)': 'Security Incident Procedures: Implement policies and procedures to address security incidents.',
    '164.308(a)(7)': 'Contingency Plan: Establish (and implement as needed) policies and procedures for responding to an emergency or other occurrence.',
    '164.308(a)(8)': 'Evaluation: Perform a periodic technical and nontechnical evaluation.',
    '164.310(a)(1)': 'Facility Access Controls: Implement policies and procedures to limit physical access to its electronic information systems and the facility.',
    '164.310(b)': 'Workstation Use: Implement policies and procedures that specify the proper functions to be performed.',
    '164.310(c)': 'Workstation Security: Implement physical safeguards for all workstations that access electronic protected health information.',
    '164.310(d)(1)': 'Device and Media Controls: Implement policies and procedures that govern the receipt and removal of hardware and electronic media.',
    '164.312(a)(1)': 'Access Control: Implement technical policies and procedures for electronic information systems that maintain electronic protected health information.',
    '164.312(b)': 'Audit Controls: Implement hardware, software, and/or procedural mechanisms that record and examine activity.',
    '164.312(c)(1)': 'Integrity: Implement policies and procedures to protect electronic protected health information from improper alteration or destruction.',
    '164.312(d)': 'Person or Entity Authentication: Implement procedures to verify that a person or entity seeking access is the one claimed.',
    '164.312(e)(1)': 'Transmission Security: Implement technical security measures to guard against unauthorized access to electronic protected health information.',
  },
  NIST: {
    'ID.AM-1': 'Physical devices and systems within the organization are inventoried.',
    'ID.AM-2': 'Software platforms and applications within the organization are inventoried.',
    'ID.AM-3': 'Organizational communication and data flows are mapped.',
    'ID.RA-1': 'Asset vulnerabilities are identified and documented.',
    'ID.RA-2': 'Cyber threat intelligence is received from information sharing forums and sources.',
    'ID.RA-3': 'Threats, both internal and external, are identified and documented.',
    'ID.RA-4': 'Potential business impacts and likelihoods are identified.',
    'ID.RA-5': 'Threats, vulnerabilities, likelihoods, and impacts are used to determine risk.',
    'ID.RA-6': 'Risk responses are identified and prioritized.',
    'PR.AC-1': 'Identities and credentials are issued, managed, verified, revoked, and audited for authorized devices, users, and processes.',
    'PR.AC-2': 'Physical access to assets is managed and protected.',
    'PR.AC-3': 'Remote access is managed.',
    'PR.AC-4': 'Access permissions and authorizations are managed, incorporating the principles of least privilege and separation of duties.',
    'PR.AC-5': 'Network integrity is protected (e.g., network segregation, network segmentation).',
    'PR.AT-1': 'All users are informed and trained.',
    'PR.DS-1': 'Data-at-rest is protected.',
    'PR.DS-2': 'Data-in-transit is protected.',
    'PR.DS-5': 'Protections against data leaks are implemented.',
    'PR.IP-1': 'A baseline configuration of information technology/industrial control systems is created and maintained incorporating security principles.',
    'PR.IP-9': 'Response plans (Incident Response and Business Continuity) and recovery plans (Incident Recovery and Disaster Recovery) are in place and managed.',
    'PR.IP-12': 'A vulnerability management plan is developed and implemented.',
    'DE.AE-1': 'A baseline of network operations and expected data flows for users and systems is established and managed.',
    'DE.AE-2': 'Detected events are analyzed to understand attack targets and methods.',
    'DE.AE-3': 'Event data are collected and correlated from multiple sources and sensors.',
    'DE.CM-1': 'The network is monitored to detect potential cybersecurity events.',
    'DE.CM-4': 'Malicious code is detected.',
    'DE.CM-7': 'Monitoring for unauthorized personnel, connections, devices, and software is performed.',
    'DE.CM-8': 'Vulnerability scans are performed.',
    'RS.AN-1': 'Notifications from detection systems are investigated.',
    'RS.RP-1': 'Response plan is executed during or after an incident.',
    'RS.CO-2': 'Incidents are reported consistent with established criteria.',
    'RS.MI-1': 'Incidents are contained.',
    'RS.MI-2': 'Incidents are mitigated.',
    'RC.RP-1': 'Recovery plan is executed during or after a cybersecurity incident.',
    'RC.IM-1': 'Recovery plans incorporate lessons learned.',
  },
  PCIDSS: {
    '1.1': 'Install and maintain network security controls.',
    '1.2': 'Network security controls (NSCs) are configured and maintained.',
    '1.3': 'Network access to and from the cardholder data environment is restricted.',
    '2.1': 'Processes and mechanisms for applying secure configurations to all system components are defined and understood.',
    '2.2': 'System components are configured and managed securely.',
    '3.1': 'Processes and mechanisms for protecting stored account data are defined and understood.',
    '3.2': 'Storage of account data is kept to a minimum.',
    '3.3': 'Sensitive authentication data (SAD) is not stored after authorization.',
    '3.4': 'Access to displays of full PAN and ability to copy PAN is restricted.',
    '3.5': 'Primary account number (PAN) is secured wherever it is stored.',
    '4.1': 'Processes and mechanisms for protecting cardholder data with strong cryptography during transmission are defined.',
    '4.2': 'PAN is protected with strong cryptography during transmission.',
    '5.1': 'Processes and mechanisms for protecting all systems and networks from malicious software are defined.',
    '5.2': 'Malicious software (malware) is prevented, or detected and addressed.',
    '5.3': 'Anti-malware mechanisms and processes are active, maintained, and monitored.',
    '6.1': 'Processes and mechanisms for developing and maintaining secure systems and software are defined.',
    '6.2': 'Bespoke and custom software are developed securely.',
    '6.3': 'Security vulnerabilities are identified and addressed.',
    '7.1': 'Processes and mechanisms for restricting access to system components are defined.',
    '7.2': 'Access to system components and data is appropriately defined and assigned.',
    '7.3': 'Access to system components and data is managed via an access control system(s).',
    '8.1': 'Processes and mechanisms for identifying users and authenticating access are defined.',
    '8.2': 'User identification and related accounts are strictly managed.',
    '8.3': 'Strong authentication for users and administrators is established and managed.',
    '9.1': 'Processes and mechanisms for restricting physical access to cardholder data are defined.',
    '9.2': 'Physical access controls manage entry into facilities and systems.',
    '10.1': 'Processes and mechanisms for logging and monitoring are defined.',
    '10.2': 'Audit logs are implemented to support the detection of anomalies.',
    '10.3': 'Audit logs are protected from destruction and unauthorized modifications.',
    '10.4': 'Audit logs are reviewed to identify anomalies or suspicious activity.',
    '10.5': 'Audit log history is retained and available for analysis.',
    '11.1': 'Processes and mechanisms for regularly testing security are defined.',
    '11.2': 'Wireless access points are identified and monitored.',
    '11.3': 'External and internal vulnerabilities are regularly identified and addressed.',
    '11.4': 'External and internal penetration testing is regularly performed.',
    '12.1': 'A comprehensive information security policy is established and maintained.',
    '12.2': 'Acceptable use policies for end-user technologies are defined.',
    '12.3': 'Risks to the cardholder data environment are formally identified.',
    '12.6': 'Security awareness education is an ongoing activity.',
    '12.8': 'Risk to information assets associated with third-party relationships is managed.',
    '12.10': 'Suspected and confirmed security incidents that could impact the CDE are responded to immediately.',
  },
  GDPR: {
    'Art.5(1)(f)': 'Personal data shall be processed in a manner that ensures appropriate security of the personal data, including protection against unauthorised or unlawful processing and against accidental loss, destruction or damage, using appropriate technical or organisational measures.',
    'Art.24': 'Taking into account the nature, scope, context and purposes of processing as well as the risks of varying likelihood and severity for the rights and freedoms of natural persons, the controller shall implement appropriate technical and organisational measures.',
    'Art.25': 'Taking into account the state of the art, the cost of implementation and the nature, scope, context and purposes of processing, the controller shall implement appropriate technical and organisational measures designed to implement data-protection principles.',
    'Art.28': 'Where processing is to be carried out on behalf of a controller, the controller shall use only processors providing sufficient guarantees to implement appropriate technical and organisational measures.',
    'Art.30': 'Each controller and, where applicable, the controller\'s representative, shall maintain a record of processing activities under its responsibility.',
    'Art.32(1)(a)': 'Taking into account the state of the art, the costs of implementation and the nature, scope, context and purposes of processing, the controller and the processor shall implement appropriate technical and organisational measures including the pseudonymisation and encryption of personal data.',
    'Art.32(1)(b)': 'The ability to ensure the ongoing confidentiality, integrity, availability and resilience of processing systems and services.',
    'Art.32(1)(c)': 'The ability to restore the availability and access to personal data in a timely manner in the event of a physical or technical incident.',
    'Art.32(1)(d)': 'A process for regularly testing, assessing and evaluating the effectiveness of technical and organisational measures for ensuring the security of the processing.',
    'Art.33': 'In the case of a personal data breach, the controller shall without undue delay and, where feasible, not later than 72 hours after having become aware of it, notify the personal data breach to the supervisory authority.',
    'Art.34': 'When the personal data breach is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall communicate the personal data breach to the data subject without undue delay.',
    'Art.35': 'Where a type of processing is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall, prior to the processing, carry out an assessment of the impact.',
  },
};

// ============================================================================
// MAPPING ENGINE CLASS
// ============================================================================

class ControlMappingEngine {
  private controls: MasterControl[];
  private frameworks: FrameworkMeta[];
  private domains: ComplianceDomainMeta[];

  // Cache for expensive computations
  private requirementsByControlCache: Map<string, SatisfiedRequirement[]> = new Map();
  private controlsByClauseCache: Map<string, string[]> = new Map();

  constructor() {
    this.controls = MASTER_CONTROLS;
    this.frameworks = FRAMEWORKS;
    this.domains = COMPLIANCE_DOMAINS;
    this.buildCaches();
  }

  private buildCaches(): void {
    // Build control -> requirements cache
    for (const control of this.controls) {
      const requirements = this.computeRequirementsForControl(control);
      this.requirementsByControlCache.set(control.id, requirements);
    }

    // Build clause -> controls cache (reverse lookup)
    for (const control of this.controls) {
      for (const mapping of control.frameworkMappings) {
        const key = `${mapping.frameworkId}:${mapping.clauseId}`;
        const existing = this.controlsByClauseCache.get(key) || [];
        existing.push(control.id);
        this.controlsByClauseCache.set(key, existing);
      }
    }
  }

  private computeRequirementsForControl(control: MasterControl): SatisfiedRequirement[] {
    return control.frameworkMappings.map(mapping => {
      const framework = this.frameworks.find(f => f.id === mapping.frameworkId);
      const clauseText = CLAUSE_TEXT_DATABASE[mapping.frameworkId]?.[mapping.clauseId];

      return {
        frameworkId: mapping.frameworkId,
        frameworkName: framework?.name || mapping.frameworkId,
        frameworkColor: framework?.color || '#6B7280',
        clauseId: mapping.clauseId,
        clauseTitle: mapping.clauseTitle,
        clauseText,
      };
    });
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get all requirements satisfied by a specific control
   */
  getSatisfiedRequirements(controlId: string): SatisfiedRequirement[] {
    return this.requirementsByControlCache.get(controlId) || [];
  }

  /**
   * Get full coverage information for a control
   */
  getControlCoverage(controlId: string): ControlCoverage | null {
    const control = this.controls.find(c => c.id === controlId);
    if (!control) return null;

    const requirements = this.getSatisfiedRequirements(controlId);
    const frameworksCovered = [...new Set(requirements.map(r => r.frameworkId))];

    return {
      controlId: control.id,
      controlTitle: control.title,
      totalRequirements: requirements.length,
      frameworksCovered,
      requirements,
      coverageSummary: this.generateCoverageSummary(requirements.length, frameworksCovered.length),
    };
  }

  /**
   * Get all controls that satisfy a specific framework clause
   */
  getControlsForClause(frameworkId: FrameworkId, clauseId: string): MasterControl[] {
    const key = `${frameworkId}:${clauseId}`;
    const controlIds = this.controlsByClauseCache.get(key) || [];
    return controlIds
      .map(id => this.controls.find(c => c.id === id))
      .filter((c): c is MasterControl => c !== undefined);
  }

  /**
   * Get framework coverage statistics
   */
  getFrameworkCoverage(frameworkId: FrameworkId, controlStatuses: Map<string, ControlStatus>): FrameworkCoverage {
    const framework = this.frameworks.find(f => f.id === frameworkId);
    if (!framework) {
      return {
        frameworkId,
        frameworkName: frameworkId,
        frameworkColor: '#6B7280',
        totalClauses: 0,
        satisfiedClauses: 0,
        excludedClauses: 0,
        percentage: 0,
        clauses: [],
      };
    }

    // Get all unique clauses for this framework
    const clauseMap = new Map<string, { clauseTitle: string; satisfiedByControls: string[] }>();

    for (const control of this.controls) {
      for (const mapping of control.frameworkMappings) {
        if (mapping.frameworkId === frameworkId) {
          const existing = clauseMap.get(mapping.clauseId);
          if (existing) {
            existing.satisfiedByControls.push(control.id);
          } else {
            clauseMap.set(mapping.clauseId, {
              clauseTitle: mapping.clauseTitle,
              satisfiedByControls: [control.id],
            });
          }
        }
      }
    }

    // Calculate satisfaction based on control statuses
    // FIX: Handle N/A controls - exclude clauses where ALL mapped controls are N/A
    const clauses = Array.from(clauseMap.entries()).map(([clauseId, data]) => {
      // Check if ALL mapped controls are N/A - if so, exclude from calculation
      const allNA = data.satisfiedByControls.every(controlId => {
        const status = controlStatuses.get(controlId);
        return status?.answer === 'na' || status?.status === 'not_applicable';
      });

      if (allNA && data.satisfiedByControls.length > 0) {
        return {
          clauseId,
          clauseTitle: data.clauseTitle,
          satisfied: null as boolean | null, // Use null to indicate "excluded"
          isExcluded: true,
          satisfiedByControls: data.satisfiedByControls,
        };
      }

      // Check if at least one control is implemented (ignoring N/A controls)
      const satisfied = data.satisfiedByControls.some(controlId => {
        const status = controlStatuses.get(controlId);
        return status?.answer === 'yes' || status?.status === 'implemented';
      });

      return {
        clauseId,
        clauseTitle: data.clauseTitle,
        satisfied,
        isExcluded: false,
        satisfiedByControls: data.satisfiedByControls,
      };
    });

    // Only count applicable clauses (not excluded) for percentage calculation
    const applicableClauses = clauses.filter(c => !c.isExcluded);
    const excludedClauses = clauses.filter(c => c.isExcluded);
    const satisfiedClauses = applicableClauses.filter(c => c.satisfied === true).length;

    return {
      frameworkId,
      frameworkName: framework.name,
      frameworkColor: framework.color,
      totalClauses: clauses.length,
      satisfiedClauses,
      excludedClauses: excludedClauses.length,
      percentage: applicableClauses.length > 0
        ? Math.round((satisfiedClauses / applicableClauses.length) * 100)
        : 0,
      clauses,
    };
  }

  /**
   * Group controls by domain
   * FIX: Excludes N/A controls from percentage calculation
   */
  getControlsByDomain(controlStatuses: Map<string, ControlStatus>): DomainGroup[] {
    return this.domains.map(domain => {
      const domainControls = this.controls.filter(c => c.domain === domain.id);

      // Count N/A controls separately
      const naCount = domainControls.filter(c => {
        const status = controlStatuses.get(c.id);
        return status?.answer === 'na' || status?.status === 'not_applicable';
      }).length;

      const implementedCount = domainControls.filter(c => {
        const status = controlStatuses.get(c.id);
        return status?.answer === 'yes' || status?.status === 'implemented';
      }).length;

      // Exclude N/A controls from percentage denominator
      const applicableControls = domainControls.length - naCount;

      return {
        domain,
        controls: domainControls,
        totalControls: domainControls.length,
        implementedCount,
        percentage: applicableControls > 0
          ? Math.round((implementedCount / applicableControls) * 100)
          : 0,
      };
    });
  }

  /**
   * Get clause legal text
   */
  getClauseText(frameworkId: FrameworkId, clauseId: string): string | undefined {
    return CLAUSE_TEXT_DATABASE[frameworkId]?.[clauseId];
  }

  /**
   * Get all controls
   */
  getAllControls(): MasterControl[] {
    return this.controls;
  }

  /**
   * Get control by ID
   */
  getControlById(controlId: string): MasterControl | undefined {
    return this.controls.find(c => c.id === controlId);
  }

  /**
   * Get all domains
   */
  getAllDomains(): ComplianceDomainMeta[] {
    return this.domains;
  }

  /**
   * Get all frameworks
   */
  getAllFrameworks(): FrameworkMeta[] {
    return this.frameworks;
  }

  /**
   * Get all requirements satisfied by evidence attached to a control
   * Used to show auditors which frameworks are covered by single evidence
   * This enables cross-framework evidence mapping for requirement overlap
   */
  getSharedRequirements(controlId: string): {
    sharedClauses: Map<string, FrameworkId[]>;
    summary: string;
    totalCrossFrameworkCoverage: number;
  } {
    const control = this.controls.find(c => c.id === controlId);
    if (!control) {
      return { sharedClauses: new Map(), summary: '', totalCrossFrameworkCoverage: 0 };
    }

    // Group clauses by their normalized title (e.g., "Access Control" appears in SOC2, ISO, HIPAA)
    const clauseGroups: Map<string, {
      frameworkIds: FrameworkId[];
      clauseIds: string[];
      originalTitles: string[];
    }> = new Map();

    for (const mapping of control.frameworkMappings) {
      // Normalize clause title for grouping - lowercase, trim, remove special chars
      const normalizedTitle = mapping.clauseTitle
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ');

      if (!clauseGroups.has(normalizedTitle)) {
        clauseGroups.set(normalizedTitle, {
          frameworkIds: [],
          clauseIds: [],
          originalTitles: [],
        });
      }

      const group = clauseGroups.get(normalizedTitle)!;
      if (!group.frameworkIds.includes(mapping.frameworkId)) {
        group.frameworkIds.push(mapping.frameworkId);
        group.clauseIds.push(mapping.clauseId);
        group.originalTitles.push(mapping.clauseTitle);
      }
    }

    // Find shared clauses (appear in 2+ frameworks)
    const sharedClauses: Map<string, FrameworkId[]> = new Map();
    let totalCrossFrameworkCoverage = 0;

    for (const [_title, group] of clauseGroups) {
      if (group.frameworkIds.length > 1) {
        sharedClauses.set(group.originalTitles[0], group.frameworkIds);
        totalCrossFrameworkCoverage += group.frameworkIds.length - 1; // Count additional frameworks covered
      }
    }

    const sharedCount = sharedClauses.size;
    const uniqueFrameworks = new Set<FrameworkId>();
    for (const frameworks of sharedClauses.values()) {
      frameworks.forEach(f => uniqueFrameworks.add(f));
    }

    const summary = sharedCount > 0
      ? `Evidence for this control satisfies ${sharedCount} shared requirement(s) across ${uniqueFrameworks.size} frameworks. Single evidence upload covers ${totalCrossFrameworkCoverage + sharedCount} total requirements.`
      : 'This control has no overlapping requirements across frameworks.';

    return { sharedClauses, summary, totalCrossFrameworkCoverage };
  }

  /**
   * Get framework-specific view of shared requirements for auditor portal
   * Shows which requirements in a framework are satisfied by shared evidence
   */
  getAuditorCrossFrameworkView(frameworkId: FrameworkId, controlStatuses: Map<string, ControlStatus>): {
    clauseId: string;
    clauseTitle: string;
    satisfiedByControls: string[];
    sharedWithFrameworks: FrameworkId[];
    hasSharedEvidence: boolean;
  }[] {
    const coverage = this.getFrameworkCoverage(frameworkId, controlStatuses);

    return coverage.clauses
      .filter(c => !c.isExcluded)
      .map(clause => {
        // Check which other frameworks share this clause through the same controls
        const sharedWithFrameworks: Set<FrameworkId> = new Set();

        for (const controlId of clause.satisfiedByControls) {
          const sharedInfo = this.getSharedRequirements(controlId);
          for (const [_title, frameworks] of sharedInfo.sharedClauses) {
            frameworks.forEach(f => {
              if (f !== frameworkId) {
                sharedWithFrameworks.add(f);
              }
            });
          }
        }

        return {
          clauseId: clause.clauseId,
          clauseTitle: clause.clauseTitle,
          satisfiedByControls: clause.satisfiedByControls,
          sharedWithFrameworks: Array.from(sharedWithFrameworks),
          hasSharedEvidence: sharedWithFrameworks.size > 0,
        };
      });
  }

  /**
   * Calculate global compliance statistics
   * FIX: Properly handles N/A controls and excludes them from percentage
   */
  getGlobalStats(controlStatuses: Map<string, ControlStatus>): {
    totalControls: number;
    implementedControls: number;
    inProgressControls: number;
    notStartedControls: number;
    notApplicableControls: number;
    overallPercentage: number;
    frameworkStats: { frameworkId: FrameworkId; name: string; percentage: number; color: string; excludedClauses: number }[];
  } {
    const totalControls = this.controls.length;
    let implemented = 0;
    let inProgress = 0;
    let notStarted = 0;
    let notApplicable = 0;

    for (const control of this.controls) {
      const status = controlStatuses.get(control.id);
      if (status?.answer === 'na' || status?.status === 'not_applicable') {
        notApplicable++;
      } else if (status?.answer === 'yes' || status?.status === 'implemented') {
        implemented++;
      } else if (status?.answer === 'partial' || status?.status === 'in_progress') {
        inProgress++;
      } else {
        notStarted++;
      }
    }

    const frameworkStats = this.frameworks.map(fw => {
      const coverage = this.getFrameworkCoverage(fw.id, controlStatuses);
      return {
        frameworkId: fw.id,
        name: fw.name,
        percentage: coverage.percentage,
        color: fw.color,
        excludedClauses: coverage.excludedClauses,
      };
    });

    // Exclude N/A controls from percentage calculation
    const applicableControls = totalControls - notApplicable;

    return {
      totalControls,
      implementedControls: implemented,
      inProgressControls: inProgress,
      notStartedControls: notStarted,
      notApplicableControls: notApplicable,
      overallPercentage: applicableControls > 0
        ? Math.round((implemented / applicableControls) * 100)
        : 0,
      frameworkStats,
    };
  }

  /**
   * Calculate weighted compliance score based on risk levels
   * Critical controls are weighted 4x, High 3x, Medium 2x, Low 1x
   */
  getWeightedStats(controlStatuses: Map<string, ControlStatus>): WeightedScoreResult {
    const RISK_WEIGHTS: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const riskBreakdown: Record<string, { total: number; implemented: number; weight: number; naCount: number }> = {
      critical: { total: 0, implemented: 0, weight: RISK_WEIGHTS.critical, naCount: 0 },
      high: { total: 0, implemented: 0, weight: RISK_WEIGHTS.high, naCount: 0 },
      medium: { total: 0, implemented: 0, weight: RISK_WEIGHTS.medium, naCount: 0 },
      low: { total: 0, implemented: 0, weight: RISK_WEIGHTS.low, naCount: 0 },
    };

    const criticalGaps: string[] = [];
    const highGaps: string[] = [];
    let totalWeight = 0;
    let achievedWeight = 0;
    let totalApplicable = 0;
    let totalImplemented = 0;

    for (const control of this.controls) {
      const riskLevel = control.riskLevel || 'medium';
      const weight = RISK_WEIGHTS[riskLevel] || RISK_WEIGHTS.medium;
      const status = controlStatuses.get(control.id);
      const isImplemented = status?.answer === 'yes' || status?.status === 'implemented';
      const isNA = status?.answer === 'na' || status?.status === 'not_applicable';

      // Track N/A separately
      if (isNA) {
        if (riskBreakdown[riskLevel]) {
          riskBreakdown[riskLevel].naCount++;
        }
        continue; // Exclude N/A from weighted calculation
      }

      totalWeight += weight;
      totalApplicable++;

      if (riskBreakdown[riskLevel]) {
        riskBreakdown[riskLevel].total++;
      }

      if (isImplemented) {
        achievedWeight += weight;
        totalImplemented++;
        if (riskBreakdown[riskLevel]) {
          riskBreakdown[riskLevel].implemented++;
        }
      } else {
        // Track gaps by severity
        if (riskLevel === 'critical') {
          criticalGaps.push(control.id);
        } else if (riskLevel === 'high') {
          highGaps.push(control.id);
        }
      }
    }

    return {
      weightedScore: totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0,
      unweightedScore: totalApplicable > 0 ? Math.round((totalImplemented / totalApplicable) * 100) : 0,
      riskBreakdown,
      criticalGaps,
      highGaps,
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private generateCoverageSummary(requirementCount: number, frameworkCount: number): string {
    if (requirementCount === 0) {
      return 'This control has no framework mappings.';
    }

    const reqText = requirementCount === 1 ? 'requirement' : 'requirements';
    const fwText = frameworkCount === 1 ? 'framework' : 'frameworks';

    return `This control satisfies ${requirementCount} ${reqText} across ${frameworkCount} ${fwText}.`;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const controlMappingEngine = new ControlMappingEngine();

// ============================================================================
// REACT HOOK
// ============================================================================

import { useMemo, useCallback } from 'react';

export interface UseControlMappingReturn {
  getSatisfiedRequirements: (controlId: string) => SatisfiedRequirement[];
  getControlCoverage: (controlId: string) => ControlCoverage | null;
  getControlsForClause: (frameworkId: FrameworkId, clauseId: string) => MasterControl[];
  getFrameworkCoverage: (frameworkId: FrameworkId, controlStatuses: Map<string, ControlStatus>) => FrameworkCoverage;
  getControlsByDomain: (controlStatuses: Map<string, ControlStatus>) => DomainGroup[];
  getClauseText: (frameworkId: FrameworkId, clauseId: string) => string | undefined;
  getAllControls: () => MasterControl[];
  getControlById: (controlId: string) => MasterControl | undefined;
  getAllDomains: () => ComplianceDomainMeta[];
  getAllFrameworks: () => FrameworkMeta[];
  getGlobalStats: (controlStatuses: Map<string, ControlStatus>) => ReturnType<ControlMappingEngine['getGlobalStats']>;
  getWeightedStats: (controlStatuses: Map<string, ControlStatus>) => WeightedScoreResult;
}

export function useControlMapping(): UseControlMappingReturn {
  const getSatisfiedRequirements = useCallback(
    (controlId: string) => controlMappingEngine.getSatisfiedRequirements(controlId),
    []
  );

  const getControlCoverage = useCallback(
    (controlId: string) => controlMappingEngine.getControlCoverage(controlId),
    []
  );

  const getControlsForClause = useCallback(
    (frameworkId: FrameworkId, clauseId: string) =>
      controlMappingEngine.getControlsForClause(frameworkId, clauseId),
    []
  );

  const getFrameworkCoverage = useCallback(
    (frameworkId: FrameworkId, controlStatuses: Map<string, ControlStatus>) =>
      controlMappingEngine.getFrameworkCoverage(frameworkId, controlStatuses),
    []
  );

  const getControlsByDomain = useCallback(
    (controlStatuses: Map<string, ControlStatus>) =>
      controlMappingEngine.getControlsByDomain(controlStatuses),
    []
  );

  const getClauseText = useCallback(
    (frameworkId: FrameworkId, clauseId: string) =>
      controlMappingEngine.getClauseText(frameworkId, clauseId),
    []
  );

  const getAllControls = useCallback(
    () => controlMappingEngine.getAllControls(),
    []
  );

  const getControlById = useCallback(
    (controlId: string) => controlMappingEngine.getControlById(controlId),
    []
  );

  const getAllDomains = useCallback(
    () => controlMappingEngine.getAllDomains(),
    []
  );

  const getAllFrameworks = useCallback(
    () => controlMappingEngine.getAllFrameworks(),
    []
  );

  const getGlobalStats = useCallback(
    (controlStatuses: Map<string, ControlStatus>) =>
      controlMappingEngine.getGlobalStats(controlStatuses),
    []
  );

  const getWeightedStats = useCallback(
    (controlStatuses: Map<string, ControlStatus>) =>
      controlMappingEngine.getWeightedStats(controlStatuses),
    []
  );

  return useMemo(() => ({
    getSatisfiedRequirements,
    getControlCoverage,
    getControlsForClause,
    getFrameworkCoverage,
    getControlsByDomain,
    getClauseText,
    getAllControls,
    getControlById,
    getAllDomains,
    getAllFrameworks,
    getGlobalStats,
    getWeightedStats,
  }), [
    getSatisfiedRequirements,
    getControlCoverage,
    getControlsForClause,
    getFrameworkCoverage,
    getControlsByDomain,
    getClauseText,
    getAllControls,
    getControlById,
    getAllDomains,
    getAllFrameworks,
    getGlobalStats,
    getWeightedStats,
  ]);
}

export default controlMappingEngine;
