/**
 * ============================================================================
 * FRAMEWORK REQUIREMENTS - AUTHORITATIVE SOURCE
 * ============================================================================
 *
 * This file defines the actual requirements for each compliance framework.
 * Used to verify 100% framework coverage in control mappings.
 */

// ============================================================================
// SOC 2 TRUST SERVICES CRITERIA (2017 with 2022 updates)
// ============================================================================

export const SOC2_CRITERIA = {
  // Common Criteria (Security - Required)
  CC1: {
    id: 'CC1',
    name: 'Control Environment',
    criteria: [
      { id: 'CC1.1', title: 'COSO Principle 1: Demonstrates Commitment to Integrity and Ethical Values' },
      { id: 'CC1.2', title: 'COSO Principle 2: Board of Directors Demonstrates Independence' },
      { id: 'CC1.3', title: 'COSO Principle 3: Management Establishes Structures and Reporting Lines' },
      { id: 'CC1.4', title: 'COSO Principle 4: Commitment to Competence' },
      { id: 'CC1.5', title: 'COSO Principle 5: Enforces Accountability' },
    ],
  },
  CC2: {
    id: 'CC2',
    name: 'Communication and Information',
    criteria: [
      { id: 'CC2.1', title: 'COSO Principle 13: Uses Relevant Information' },
      { id: 'CC2.2', title: 'COSO Principle 14: Communicates Internally' },
      { id: 'CC2.3', title: 'COSO Principle 15: Communicates Externally' },
    ],
  },
  CC3: {
    id: 'CC3',
    name: 'Risk Assessment',
    criteria: [
      { id: 'CC3.1', title: 'COSO Principle 6: Specifies Suitable Objectives' },
      { id: 'CC3.2', title: 'COSO Principle 7: Identifies and Analyzes Risk' },
      { id: 'CC3.3', title: 'COSO Principle 8: Assesses Fraud Risk' },
      { id: 'CC3.4', title: 'COSO Principle 9: Identifies and Analyzes Significant Change' },
    ],
  },
  CC4: {
    id: 'CC4',
    name: 'Monitoring Activities',
    criteria: [
      { id: 'CC4.1', title: 'COSO Principle 16: Selects and Develops Ongoing/Separate Evaluations' },
      { id: 'CC4.2', title: 'COSO Principle 17: Evaluates and Communicates Deficiencies' },
    ],
  },
  CC5: {
    id: 'CC5',
    name: 'Control Activities',
    criteria: [
      { id: 'CC5.1', title: 'COSO Principle 10: Selects and Develops Control Activities' },
      { id: 'CC5.2', title: 'COSO Principle 11: Selects and Develops General Controls over Technology' },
      { id: 'CC5.3', title: 'COSO Principle 12: Deploys through Policies and Procedures' },
    ],
  },
  CC6: {
    id: 'CC6',
    name: 'Logical and Physical Access Controls',
    criteria: [
      { id: 'CC6.1', title: 'Logical Access Security Software, Infrastructure, and Architectures' },
      { id: 'CC6.2', title: 'Prior to Issuing System Credentials and Granting System Access' },
      { id: 'CC6.3', title: 'Process to Remove Credential Access When No Longer Required' },
      { id: 'CC6.4', title: 'Restricts Physical Access to Facilities' },
      { id: 'CC6.5', title: 'Logical Access to Information Assets' },
      { id: 'CC6.6', title: 'Security Events That Could Prevent or Detect Unauthorized Access' },
      { id: 'CC6.7', title: 'Transmission of Data Outside System Boundaries' },
      { id: 'CC6.8', title: 'Vulnerability Management Program' },
    ],
  },
  CC7: {
    id: 'CC7',
    name: 'System Operations',
    criteria: [
      { id: 'CC7.1', title: 'Detection and Monitoring Procedures' },
      { id: 'CC7.2', title: 'Security Monitoring - Anomalous Activity' },
      { id: 'CC7.3', title: 'Evaluates Security Events' },
      { id: 'CC7.4', title: 'Security Incident Response' },
      { id: 'CC7.5', title: 'Recovery from Identified Security Incidents' },
    ],
  },
  CC8: {
    id: 'CC8',
    name: 'Change Management',
    criteria: [
      { id: 'CC8.1', title: 'Authorization, Design, Development, Configuration, and Testing Changes' },
    ],
  },
  CC9: {
    id: 'CC9',
    name: 'Risk Mitigation',
    criteria: [
      { id: 'CC9.1', title: 'Business Disruption Risks Are Identified and Mitigated' },
      { id: 'CC9.2', title: 'Vendor and Business Partner Risk Mitigation' },
    ],
  },
  // Availability
  A1: {
    id: 'A1',
    name: 'Availability',
    criteria: [
      { id: 'A1.1', title: 'Maintains, Monitors, and Evaluates Current Processing Capacity' },
      { id: 'A1.2', title: 'Environmental Protections and Redundancy' },
      { id: 'A1.3', title: 'Recovery Infrastructure and Software' },
    ],
  },
  // Processing Integrity
  PI1: {
    id: 'PI1',
    name: 'Processing Integrity',
    criteria: [
      { id: 'PI1.1', title: 'Obtains or Generates Accurate and Complete Data' },
      { id: 'PI1.2', title: 'Complete, Accurate, and Timely Processing' },
      { id: 'PI1.3', title: 'Outputs Complete and Accurate' },
      { id: 'PI1.4', title: 'Processing Integrity Errors are Addressed' },
      { id: 'PI1.5', title: 'Input is Processed Accurately' },
    ],
  },
  // Confidentiality
  C1: {
    id: 'C1',
    name: 'Confidentiality',
    criteria: [
      { id: 'C1.1', title: 'Identifies and Maintains Confidential Information' },
      { id: 'C1.2', title: 'Disposes of Confidential Information' },
    ],
  },
  // Privacy
  P1: {
    id: 'P1',
    name: 'Privacy Notice',
    criteria: [
      { id: 'P1.1', title: 'Provides Notice About Privacy Practices' },
    ],
  },
  P2: {
    id: 'P2',
    name: 'Choice and Consent',
    criteria: [
      { id: 'P2.1', title: 'Communicates Choices for Data Collection, Use, and Retention' },
    ],
  },
  P3: {
    id: 'P3',
    name: 'Collection',
    criteria: [
      { id: 'P3.1', title: 'Collects Personal Information Consistent with Objectives' },
      { id: 'P3.2', title: 'For Implicit Consent, Uses Clear and Conspicuous Notice' },
    ],
  },
  P4: {
    id: 'P4',
    name: 'Use, Retention, and Disposal',
    criteria: [
      { id: 'P4.1', title: 'Limits Use of Personal Information' },
      { id: 'P4.2', title: 'Retains Personal Information Consistent with Objectives' },
      { id: 'P4.3', title: 'Secure Disposal of Personal Information' },
    ],
  },
  P5: {
    id: 'P5',
    name: 'Access',
    criteria: [
      { id: 'P5.1', title: 'Provides Access to Personal Information for Review' },
      { id: 'P5.2', title: 'Correction, Amendment, or Appendment of Personal Information' },
    ],
  },
  P6: {
    id: 'P6',
    name: 'Disclosure and Notification',
    criteria: [
      { id: 'P6.1', title: 'Disclosure to Third Parties' },
      { id: 'P6.2', title: 'Creates and Maintains Records of Disclosures' },
      { id: 'P6.3', title: 'Notification of Breaches and Incidents' },
      { id: 'P6.4', title: 'Makes Privacy Commitments Known' },
      { id: 'P6.5', title: 'Provides Notice of Changes' },
      { id: 'P6.6', title: 'Provides Notice of Dispute Resolution' },
      { id: 'P6.7', title: 'Provides Written Complaint Process' },
    ],
  },
  P7: {
    id: 'P7',
    name: 'Quality',
    criteria: [
      { id: 'P7.1', title: 'Collects and Maintains Accurate Personal Information' },
    ],
  },
  P8: {
    id: 'P8',
    name: 'Monitoring and Enforcement',
    criteria: [
      { id: 'P8.1', title: 'Monitors Compliance with Privacy Policies' },
    ],
  },
};

// ============================================================================
// ISO 27001:2022 ANNEX A CONTROLS
// ============================================================================

export const ISO27001_CONTROLS = {
  // Organizational Controls (A.5)
  A5: {
    id: 'A.5',
    name: 'Organizational Controls',
    controls: [
      { id: 'A.5.1', title: 'Policies for information security' },
      { id: 'A.5.2', title: 'Information security roles and responsibilities' },
      { id: 'A.5.3', title: 'Segregation of duties' },
      { id: 'A.5.4', title: 'Management responsibilities' },
      { id: 'A.5.5', title: 'Contact with authorities' },
      { id: 'A.5.6', title: 'Contact with special interest groups' },
      { id: 'A.5.7', title: 'Threat intelligence' },
      { id: 'A.5.8', title: 'Information security in project management' },
      { id: 'A.5.9', title: 'Inventory of information and other associated assets' },
      { id: 'A.5.10', title: 'Acceptable use of information and other associated assets' },
      { id: 'A.5.11', title: 'Return of assets' },
      { id: 'A.5.12', title: 'Classification of information' },
      { id: 'A.5.13', title: 'Labelling of information' },
      { id: 'A.5.14', title: 'Information transfer' },
      { id: 'A.5.15', title: 'Access control' },
      { id: 'A.5.16', title: 'Identity management' },
      { id: 'A.5.17', title: 'Authentication information' },
      { id: 'A.5.18', title: 'Access rights' },
      { id: 'A.5.19', title: 'Information security in supplier relationships' },
      { id: 'A.5.20', title: 'Addressing information security within supplier agreements' },
      { id: 'A.5.21', title: 'Managing information security in the ICT supply chain' },
      { id: 'A.5.22', title: 'Monitoring, review and change management of supplier services' },
      { id: 'A.5.23', title: 'Information security for use of cloud services' },
      { id: 'A.5.24', title: 'Information security incident management planning and preparation' },
      { id: 'A.5.25', title: 'Assessment and decision on information security events' },
      { id: 'A.5.26', title: 'Response to information security incidents' },
      { id: 'A.5.27', title: 'Learning from information security incidents' },
      { id: 'A.5.28', title: 'Collection of evidence' },
      { id: 'A.5.29', title: 'Information security during disruption' },
      { id: 'A.5.30', title: 'ICT readiness for business continuity' },
      { id: 'A.5.31', title: 'Legal, statutory, regulatory and contractual requirements' },
      { id: 'A.5.32', title: 'Intellectual property rights' },
      { id: 'A.5.33', title: 'Protection of records' },
      { id: 'A.5.34', title: 'Privacy and protection of PII' },
      { id: 'A.5.35', title: 'Independent review of information security' },
      { id: 'A.5.36', title: 'Compliance with policies, rules and standards' },
      { id: 'A.5.37', title: 'Documented operating procedures' },
    ],
  },
  // People Controls (A.6)
  A6: {
    id: 'A.6',
    name: 'People Controls',
    controls: [
      { id: 'A.6.1', title: 'Screening' },
      { id: 'A.6.2', title: 'Terms and conditions of employment' },
      { id: 'A.6.3', title: 'Information security awareness, education and training' },
      { id: 'A.6.4', title: 'Disciplinary process' },
      { id: 'A.6.5', title: 'Responsibilities after termination or change of employment' },
      { id: 'A.6.6', title: 'Confidentiality or non-disclosure agreements' },
      { id: 'A.6.7', title: 'Remote working' },
      { id: 'A.6.8', title: 'Information security event reporting' },
    ],
  },
  // Physical Controls (A.7)
  A7: {
    id: 'A.7',
    name: 'Physical Controls',
    controls: [
      { id: 'A.7.1', title: 'Physical security perimeters' },
      { id: 'A.7.2', title: 'Physical entry' },
      { id: 'A.7.3', title: 'Securing offices, rooms and facilities' },
      { id: 'A.7.4', title: 'Physical security monitoring' },
      { id: 'A.7.5', title: 'Protecting against physical and environmental threats' },
      { id: 'A.7.6', title: 'Working in secure areas' },
      { id: 'A.7.7', title: 'Clear desk and clear screen' },
      { id: 'A.7.8', title: 'Equipment siting and protection' },
      { id: 'A.7.9', title: 'Security of assets off-premises' },
      { id: 'A.7.10', title: 'Storage media' },
      { id: 'A.7.11', title: 'Supporting utilities' },
      { id: 'A.7.12', title: 'Cabling security' },
      { id: 'A.7.13', title: 'Equipment maintenance' },
      { id: 'A.7.14', title: 'Secure disposal or re-use of equipment' },
    ],
  },
  // Technological Controls (A.8)
  A8: {
    id: 'A.8',
    name: 'Technological Controls',
    controls: [
      { id: 'A.8.1', title: 'User endpoint devices' },
      { id: 'A.8.2', title: 'Privileged access rights' },
      { id: 'A.8.3', title: 'Information access restriction' },
      { id: 'A.8.4', title: 'Access to source code' },
      { id: 'A.8.5', title: 'Secure authentication' },
      { id: 'A.8.6', title: 'Capacity management' },
      { id: 'A.8.7', title: 'Protection against malware' },
      { id: 'A.8.8', title: 'Management of technical vulnerabilities' },
      { id: 'A.8.9', title: 'Configuration management' },
      { id: 'A.8.10', title: 'Information deletion' },
      { id: 'A.8.11', title: 'Data masking' },
      { id: 'A.8.12', title: 'Data leakage prevention' },
      { id: 'A.8.13', title: 'Information backup' },
      { id: 'A.8.14', title: 'Redundancy of information processing facilities' },
      { id: 'A.8.15', title: 'Logging' },
      { id: 'A.8.16', title: 'Monitoring activities' },
      { id: 'A.8.17', title: 'Clock synchronization' },
      { id: 'A.8.18', title: 'Use of privileged utility programs' },
      { id: 'A.8.19', title: 'Installation of software on operational systems' },
      { id: 'A.8.20', title: 'Networks security' },
      { id: 'A.8.21', title: 'Security of network services' },
      { id: 'A.8.22', title: 'Segregation of networks' },
      { id: 'A.8.23', title: 'Web filtering' },
      { id: 'A.8.24', title: 'Use of cryptography' },
      { id: 'A.8.25', title: 'Secure development life cycle' },
      { id: 'A.8.26', title: 'Application security requirements' },
      { id: 'A.8.27', title: 'Secure system architecture and engineering principles' },
      { id: 'A.8.28', title: 'Secure coding' },
      { id: 'A.8.29', title: 'Security testing in development and acceptance' },
      { id: 'A.8.30', title: 'Outsourced development' },
      { id: 'A.8.31', title: 'Separation of development, test and production environments' },
      { id: 'A.8.32', title: 'Change management' },
      { id: 'A.8.33', title: 'Test information' },
      { id: 'A.8.34', title: 'Protection of information systems during audit testing' },
    ],
  },
};

// ============================================================================
// HIPAA SECURITY RULE - IMPLEMENTATION SPECIFICATIONS
// ============================================================================

export const HIPAA_SPECIFICATIONS = {
  // Administrative Safeguards (164.308)
  administrative: {
    id: '164.308',
    name: 'Administrative Safeguards',
    standards: [
      {
        id: '164.308(a)(1)',
        title: 'Security Management Process',
        specs: [
          { id: '164.308(a)(1)(i)', title: 'Risk Analysis', required: true },
          { id: '164.308(a)(1)(ii)(A)', title: 'Risk Management', required: true },
          { id: '164.308(a)(1)(ii)(B)', title: 'Sanction Policy', required: true },
          { id: '164.308(a)(1)(ii)(C)', title: 'Information System Activity Review', required: true },
        ],
      },
      {
        id: '164.308(a)(2)',
        title: 'Assigned Security Responsibility',
        specs: [
          { id: '164.308(a)(2)', title: 'Assigned Security Responsibility', required: true },
        ],
      },
      {
        id: '164.308(a)(3)',
        title: 'Workforce Security',
        specs: [
          { id: '164.308(a)(3)(ii)(A)', title: 'Authorization and/or Supervision', required: false },
          { id: '164.308(a)(3)(ii)(B)', title: 'Workforce Clearance Procedure', required: false },
          { id: '164.308(a)(3)(ii)(C)', title: 'Termination Procedures', required: false },
        ],
      },
      {
        id: '164.308(a)(4)',
        title: 'Information Access Management',
        specs: [
          { id: '164.308(a)(4)(i)', title: 'Isolating Healthcare Clearinghouse Functions', required: true },
          { id: '164.308(a)(4)(ii)(A)', title: 'Access Authorization', required: false },
          { id: '164.308(a)(4)(ii)(B)', title: 'Access Establishment and Modification', required: false },
          { id: '164.308(a)(4)(ii)(C)', title: 'Access Termination', required: false },
        ],
      },
      {
        id: '164.308(a)(5)',
        title: 'Security Awareness and Training',
        specs: [
          { id: '164.308(a)(5)(ii)(A)', title: 'Security Reminders', required: false },
          { id: '164.308(a)(5)(ii)(B)', title: 'Protection from Malicious Software', required: false },
          { id: '164.308(a)(5)(ii)(C)', title: 'Log-in Monitoring', required: false },
          { id: '164.308(a)(5)(ii)(D)', title: 'Password Management', required: false },
        ],
      },
      {
        id: '164.308(a)(6)',
        title: 'Security Incident Procedures',
        specs: [
          { id: '164.308(a)(6)(ii)', title: 'Response and Reporting', required: true },
        ],
      },
      {
        id: '164.308(a)(7)',
        title: 'Contingency Plan',
        specs: [
          { id: '164.308(a)(7)(ii)(A)', title: 'Data Backup Plan', required: true },
          { id: '164.308(a)(7)(ii)(B)', title: 'Disaster Recovery Plan', required: true },
          { id: '164.308(a)(7)(ii)(C)', title: 'Emergency Mode Operation Plan', required: true },
          { id: '164.308(a)(7)(ii)(D)', title: 'Testing and Revision Procedures', required: false },
          { id: '164.308(a)(7)(ii)(E)', title: 'Applications and Data Criticality Analysis', required: false },
        ],
      },
      {
        id: '164.308(a)(8)',
        title: 'Evaluation',
        specs: [
          { id: '164.308(a)(8)', title: 'Evaluation', required: true },
        ],
      },
      {
        id: '164.308(b)(1)',
        title: 'Business Associate Contracts',
        specs: [
          { id: '164.308(b)(1)', title: 'Written Contract or Other Arrangement', required: true },
        ],
      },
    ],
  },
  // Physical Safeguards (164.310)
  physical: {
    id: '164.310',
    name: 'Physical Safeguards',
    standards: [
      {
        id: '164.310(a)(1)',
        title: 'Facility Access Controls',
        specs: [
          { id: '164.310(a)(2)(i)', title: 'Contingency Operations', required: false },
          { id: '164.310(a)(2)(ii)', title: 'Facility Security Plan', required: false },
          { id: '164.310(a)(2)(iii)', title: 'Access Control and Validation Procedures', required: false },
          { id: '164.310(a)(2)(iv)', title: 'Maintenance Records', required: false },
        ],
      },
      {
        id: '164.310(b)',
        title: 'Workstation Use',
        specs: [
          { id: '164.310(b)', title: 'Workstation Use', required: true },
        ],
      },
      {
        id: '164.310(c)',
        title: 'Workstation Security',
        specs: [
          { id: '164.310(c)', title: 'Workstation Security', required: true },
        ],
      },
      {
        id: '164.310(d)(1)',
        title: 'Device and Media Controls',
        specs: [
          { id: '164.310(d)(2)(i)', title: 'Disposal', required: true },
          { id: '164.310(d)(2)(ii)', title: 'Media Re-use', required: true },
          { id: '164.310(d)(2)(iii)', title: 'Accountability', required: false },
          { id: '164.310(d)(2)(iv)', title: 'Data Backup and Storage', required: false },
        ],
      },
    ],
  },
  // Technical Safeguards (164.312)
  technical: {
    id: '164.312',
    name: 'Technical Safeguards',
    standards: [
      {
        id: '164.312(a)(1)',
        title: 'Access Control',
        specs: [
          { id: '164.312(a)(2)(i)', title: 'Unique User Identification', required: true },
          { id: '164.312(a)(2)(ii)', title: 'Emergency Access Procedure', required: true },
          { id: '164.312(a)(2)(iii)', title: 'Automatic Logoff', required: false },
          { id: '164.312(a)(2)(iv)', title: 'Encryption and Decryption', required: false },
        ],
      },
      {
        id: '164.312(b)',
        title: 'Audit Controls',
        specs: [
          { id: '164.312(b)', title: 'Audit Controls', required: true },
        ],
      },
      {
        id: '164.312(c)(1)',
        title: 'Integrity',
        specs: [
          { id: '164.312(c)(2)', title: 'Mechanism to Authenticate ePHI', required: false },
        ],
      },
      {
        id: '164.312(d)',
        title: 'Person or Entity Authentication',
        specs: [
          { id: '164.312(d)', title: 'Person or Entity Authentication', required: true },
        ],
      },
      {
        id: '164.312(e)(1)',
        title: 'Transmission Security',
        specs: [
          { id: '164.312(e)(2)(i)', title: 'Integrity Controls', required: false },
          { id: '164.312(e)(2)(ii)', title: 'Encryption', required: false },
        ],
      },
    ],
  },
  // Policies and Procedures (164.316)
  documentation: {
    id: '164.316',
    name: 'Documentation Requirements',
    standards: [
      {
        id: '164.316(a)',
        title: 'Policies and Procedures',
        specs: [
          { id: '164.316(a)', title: 'Policies and Procedures', required: true },
        ],
      },
      {
        id: '164.316(b)(1)',
        title: 'Documentation',
        specs: [
          { id: '164.316(b)(2)(i)', title: 'Time Limit', required: true },
          { id: '164.316(b)(2)(ii)', title: 'Availability', required: true },
          { id: '164.316(b)(2)(iii)', title: 'Updates', required: true },
        ],
      },
    ],
  },
};

// ============================================================================
// NIST CSF 2.0 SUBCATEGORIES
// ============================================================================

export const NIST_CSF_SUBCATEGORIES = {
  // GOVERN Function (New in 2.0)
  GV: {
    id: 'GV',
    name: 'Govern',
    categories: [
      {
        id: 'GV.OC',
        name: 'Organizational Context',
        subcategories: [
          { id: 'GV.OC-01', title: 'Organizational mission is understood and informs cybersecurity risk management' },
          { id: 'GV.OC-02', title: 'Internal and external stakeholders are understood' },
          { id: 'GV.OC-03', title: 'Legal, regulatory, and contractual requirements are understood' },
          { id: 'GV.OC-04', title: 'Critical objectives, capabilities, and services are understood' },
          { id: 'GV.OC-05', title: 'Outcomes, capabilities, and services dependencies are understood' },
        ],
      },
      {
        id: 'GV.RM',
        name: 'Risk Management Strategy',
        subcategories: [
          { id: 'GV.RM-01', title: 'Risk management objectives are established and agreed upon' },
          { id: 'GV.RM-02', title: 'Risk appetite and risk tolerance statements are established' },
          { id: 'GV.RM-03', title: 'Cybersecurity risk management activities and outcomes are included in enterprise risk management' },
          { id: 'GV.RM-04', title: 'Strategic direction describes appropriate risk response options' },
          { id: 'GV.RM-05', title: 'Lines of communication across the organization are established' },
          { id: 'GV.RM-06', title: 'A standardized method for calculating, documenting, categorizing, and prioritizing cybersecurity risks is established' },
          { id: 'GV.RM-07', title: 'Strategic opportunities are characterized and communicated' },
        ],
      },
      {
        id: 'GV.RR',
        name: 'Roles, Responsibilities, and Authorities',
        subcategories: [
          { id: 'GV.RR-01', title: 'Organizational leadership is responsible for cybersecurity risk' },
          { id: 'GV.RR-02', title: 'Roles, responsibilities, and authorities are established and communicated' },
          { id: 'GV.RR-03', title: 'Adequate resources are allocated commensurate with risk strategy' },
          { id: 'GV.RR-04', title: 'Cybersecurity is included in human resources practices' },
        ],
      },
      {
        id: 'GV.PO',
        name: 'Policy',
        subcategories: [
          { id: 'GV.PO-01', title: 'Policy for cybersecurity risk management is established' },
          { id: 'GV.PO-02', title: 'Policy is reviewed, updated, communicated, and enforced' },
        ],
      },
      {
        id: 'GV.OV',
        name: 'Oversight',
        subcategories: [
          { id: 'GV.OV-01', title: 'Cybersecurity risk management strategy outcomes are reviewed' },
          { id: 'GV.OV-02', title: 'The cybersecurity risk management strategy is adjusted based on reviews' },
          { id: 'GV.OV-03', title: 'Organizational cybersecurity risk management performance is evaluated' },
        ],
      },
      {
        id: 'GV.SC',
        name: 'Cybersecurity Supply Chain Risk Management',
        subcategories: [
          { id: 'GV.SC-01', title: 'Cybersecurity supply chain risk management program is established' },
          { id: 'GV.SC-02', title: 'Cybersecurity roles and responsibilities for suppliers are established' },
          { id: 'GV.SC-03', title: 'Cybersecurity supply chain risk management is integrated' },
          { id: 'GV.SC-04', title: 'Suppliers are known and prioritized by criticality' },
          { id: 'GV.SC-05', title: 'Requirements are included in contracts with suppliers' },
          { id: 'GV.SC-06', title: 'Planning and due diligence are conducted with suppliers' },
          { id: 'GV.SC-07', title: 'Risks posed by a supplier are understood and managed' },
          { id: 'GV.SC-08', title: 'Relevant suppliers are included in incident planning' },
          { id: 'GV.SC-09', title: 'Supply chain security practices are integrated into programs' },
          { id: 'GV.SC-10', title: 'Cybersecurity supply chain risk management plans include provisions for offboarding' },
        ],
      },
    ],
  },
  // IDENTIFY Function
  ID: {
    id: 'ID',
    name: 'Identify',
    categories: [
      {
        id: 'ID.AM',
        name: 'Asset Management',
        subcategories: [
          { id: 'ID.AM-01', title: 'Inventories of hardware managed by the organization are maintained' },
          { id: 'ID.AM-02', title: 'Inventories of software, services, and systems are maintained' },
          { id: 'ID.AM-03', title: 'Representations of authorized network communication and data flows are maintained' },
          { id: 'ID.AM-04', title: 'Inventories of services provided by suppliers are maintained' },
          { id: 'ID.AM-05', title: 'Assets are prioritized based on classification, criticality, and business value' },
          { id: 'ID.AM-07', title: 'Inventories of data and corresponding metadata are maintained' },
          { id: 'ID.AM-08', title: 'Systems, hardware, software, and services are managed throughout their life cycles' },
        ],
      },
      {
        id: 'ID.RA',
        name: 'Risk Assessment',
        subcategories: [
          { id: 'ID.RA-01', title: 'Vulnerabilities in assets are identified, validated, and recorded' },
          { id: 'ID.RA-02', title: 'Cyber threat intelligence is received from information sharing forums' },
          { id: 'ID.RA-03', title: 'Internal and external threats are identified and recorded' },
          { id: 'ID.RA-04', title: 'Potential impacts and likelihoods of threats are identified' },
          { id: 'ID.RA-05', title: 'Threats, vulnerabilities, likelihoods, and impacts are used to understand inherent risk' },
          { id: 'ID.RA-06', title: 'Risk responses are chosen, prioritized, planned, and tracked' },
          { id: 'ID.RA-07', title: 'Changes and exceptions are managed, assessed, and recorded' },
          { id: 'ID.RA-08', title: 'Processes for receiving, analyzing, and responding to vulnerability disclosures are established' },
          { id: 'ID.RA-09', title: 'The authenticity and integrity of hardware and software are assessed' },
          { id: 'ID.RA-10', title: 'Critical suppliers are assessed prior to acquisition' },
        ],
      },
      {
        id: 'ID.IM',
        name: 'Improvement',
        subcategories: [
          { id: 'ID.IM-01', title: 'Improvements are identified from evaluations' },
          { id: 'ID.IM-02', title: 'Improvements are identified from security tests and exercises' },
          { id: 'ID.IM-03', title: 'Improvements are identified from execution of operational processes' },
          { id: 'ID.IM-04', title: 'Incident response plans and procedures are established and maintained' },
        ],
      },
    ],
  },
  // PROTECT Function
  PR: {
    id: 'PR',
    name: 'Protect',
    categories: [
      {
        id: 'PR.AA',
        name: 'Identity Management, Authentication, and Access Control',
        subcategories: [
          { id: 'PR.AA-01', title: 'Identities and credentials are issued, managed, verified, revoked, and audited' },
          { id: 'PR.AA-02', title: 'Identities are proofed and bound to credentials based on context of interactions' },
          { id: 'PR.AA-03', title: 'Users, services, and hardware are authenticated' },
          { id: 'PR.AA-04', title: 'Identity assertions are protected, conveyed, and verified' },
          { id: 'PR.AA-05', title: 'Access permissions, entitlements, and authorizations are defined and managed' },
          { id: 'PR.AA-06', title: 'Physical access is managed' },
        ],
      },
      {
        id: 'PR.AT',
        name: 'Awareness and Training',
        subcategories: [
          { id: 'PR.AT-01', title: 'Personnel are provided awareness and training' },
          { id: 'PR.AT-02', title: 'Individuals in specialized roles are provided awareness and training' },
        ],
      },
      {
        id: 'PR.DS',
        name: 'Data Security',
        subcategories: [
          { id: 'PR.DS-01', title: 'Data-at-rest is protected' },
          { id: 'PR.DS-02', title: 'Data-in-transit is protected' },
          { id: 'PR.DS-10', title: 'Integrity of data-in-use is protected' },
          { id: 'PR.DS-11', title: 'Backups are created, protected, maintained, and tested' },
        ],
      },
      {
        id: 'PR.PS',
        name: 'Platform Security',
        subcategories: [
          { id: 'PR.PS-01', title: 'Configuration management practices are established and applied' },
          { id: 'PR.PS-02', title: 'Software is maintained, replaced, and removed commensurate with risk' },
          { id: 'PR.PS-03', title: 'Hardware is maintained, replaced, and removed commensurate with risk' },
          { id: 'PR.PS-04', title: 'Log records are generated and made available for continuous monitoring' },
          { id: 'PR.PS-05', title: 'Installation and execution of unauthorized software is prevented' },
          { id: 'PR.PS-06', title: 'Secure software development practices are integrated' },
        ],
      },
      {
        id: 'PR.IR',
        name: 'Technology Infrastructure Resilience',
        subcategories: [
          { id: 'PR.IR-01', title: 'Networks and environments are protected from unauthorized logical access' },
          { id: 'PR.IR-02', title: 'Technology assets are protected from environmental threats' },
          { id: 'PR.IR-03', title: 'Mechanisms are implemented to achieve resilience' },
          { id: 'PR.IR-04', title: 'Adequate resource capacity is maintained' },
        ],
      },
    ],
  },
  // DETECT Function
  DE: {
    id: 'DE',
    name: 'Detect',
    categories: [
      {
        id: 'DE.CM',
        name: 'Continuous Monitoring',
        subcategories: [
          { id: 'DE.CM-01', title: 'Networks and network services are monitored' },
          { id: 'DE.CM-02', title: 'The physical environment is monitored' },
          { id: 'DE.CM-03', title: 'Personnel activity and technology usage are monitored' },
          { id: 'DE.CM-06', title: 'External service provider activities and services are monitored' },
          { id: 'DE.CM-09', title: 'Computing hardware and software, runtime environments, and their data are monitored' },
        ],
      },
      {
        id: 'DE.AE',
        name: 'Adverse Event Analysis',
        subcategories: [
          { id: 'DE.AE-02', title: 'Potentially adverse events are analyzed' },
          { id: 'DE.AE-03', title: 'Information is correlated from multiple sources' },
          { id: 'DE.AE-04', title: 'Estimated impact and scope of adverse events are understood' },
          { id: 'DE.AE-06', title: 'Information on adverse events is provided to authorized staff and tools' },
          { id: 'DE.AE-07', title: 'Cyber threat intelligence and other contextual information are integrated' },
          { id: 'DE.AE-08', title: 'Incidents are declared when adverse events exceed defined thresholds' },
        ],
      },
    ],
  },
  // RESPOND Function
  RS: {
    id: 'RS',
    name: 'Respond',
    categories: [
      {
        id: 'RS.MA',
        name: 'Incident Management',
        subcategories: [
          { id: 'RS.MA-01', title: 'The incident response plan is executed in coordination with relevant third parties' },
          { id: 'RS.MA-02', title: 'Incident reports are triaged and validated' },
          { id: 'RS.MA-03', title: 'Incidents are categorized and prioritized' },
          { id: 'RS.MA-04', title: 'Incidents are escalated or elevated as needed' },
          { id: 'RS.MA-05', title: 'The criteria for initiating incident recovery are applied' },
        ],
      },
      {
        id: 'RS.AN',
        name: 'Incident Analysis',
        subcategories: [
          { id: 'RS.AN-03', title: 'Analysis is performed to establish what has taken place during an incident' },
          { id: 'RS.AN-06', title: 'Actions performed during an investigation are recorded' },
          { id: 'RS.AN-07', title: 'Incident data and metadata are collected, and their integrity and provenance are preserved' },
          { id: 'RS.AN-08', title: 'Incident causes are identified' },
        ],
      },
      {
        id: 'RS.CO',
        name: 'Incident Response Reporting and Communication',
        subcategories: [
          { id: 'RS.CO-02', title: 'Internal and external stakeholders are notified of incidents' },
          { id: 'RS.CO-03', title: 'Information is shared with designated internal and external stakeholders' },
        ],
      },
      {
        id: 'RS.MI',
        name: 'Incident Mitigation',
        subcategories: [
          { id: 'RS.MI-01', title: 'Incidents are contained' },
          { id: 'RS.MI-02', title: 'Incidents are eradicated' },
        ],
      },
    ],
  },
  // RECOVER Function
  RC: {
    id: 'RC',
    name: 'Recover',
    categories: [
      {
        id: 'RC.RP',
        name: 'Incident Recovery Plan Execution',
        subcategories: [
          { id: 'RC.RP-01', title: 'Recovery portion of the incident response plan is executed' },
          { id: 'RC.RP-02', title: 'Recovery actions are selected, scoped, prioritized, and performed' },
          { id: 'RC.RP-03', title: 'Integrity of backups and other restoration assets is verified' },
          { id: 'RC.RP-04', title: 'Critical mission functions and cybersecurity risk management are considered' },
          { id: 'RC.RP-05', title: 'Integrity of restored assets is verified, systems and services are restored' },
          { id: 'RC.RP-06', title: 'The end of incident recovery is declared based on criteria' },
        ],
      },
      {
        id: 'RC.CO',
        name: 'Incident Recovery Communication',
        subcategories: [
          { id: 'RC.CO-03', title: 'Recovery activities and progress are communicated' },
          { id: 'RC.CO-04', title: 'Public updates on incident recovery are shared' },
        ],
      },
    ],
  },
};

// ============================================================================
// PCI DSS v4.0 REQUIREMENTS
// ============================================================================

export const PCI_DSS_REQUIREMENTS = {
  // Requirement 1: Network Security Controls
  R1: {
    id: '1',
    name: 'Install and Maintain Network Security Controls',
    requirements: [
      { id: '1.1', title: 'Processes and mechanisms for installing and maintaining network security controls are defined' },
      { id: '1.2', title: 'Network security controls are configured and maintained' },
      { id: '1.3', title: 'Network access to and from the CDE is restricted' },
      { id: '1.4', title: 'Network connections between trusted and untrusted networks are controlled' },
      { id: '1.5', title: 'Risks to the CDE from computing devices connecting to untrusted networks are mitigated' },
    ],
  },
  // Requirement 2: Secure Configurations
  R2: {
    id: '2',
    name: 'Apply Secure Configurations to All System Components',
    requirements: [
      { id: '2.1', title: 'Processes and mechanisms for applying secure configurations are defined' },
      { id: '2.2', title: 'System components are configured and managed securely' },
      { id: '2.3', title: 'Wireless environments are configured and managed securely' },
    ],
  },
  // Requirement 3: Protect Stored Account Data
  R3: {
    id: '3',
    name: 'Protect Stored Account Data',
    requirements: [
      { id: '3.1', title: 'Processes and mechanisms for protecting stored account data are defined' },
      { id: '3.2', title: 'Storage of account data is kept to a minimum' },
      { id: '3.3', title: 'Sensitive authentication data is not stored after authorization' },
      { id: '3.4', title: 'Access to displays of full PAN and ability to copy PAN is restricted' },
      { id: '3.5', title: 'PAN is secured wherever it is stored' },
      { id: '3.6', title: 'Cryptographic keys used to protect stored account data are secured' },
      { id: '3.7', title: 'Where cryptography is used to protect stored account data, key management processes and procedures are implemented' },
    ],
  },
  // Requirement 4: Protect CHD During Transmission
  R4: {
    id: '4',
    name: 'Protect Cardholder Data with Strong Cryptography During Transmission',
    requirements: [
      { id: '4.1', title: 'Processes and mechanisms for protecting CHD with strong cryptography during transmission are defined' },
      { id: '4.2', title: 'PAN is protected with strong cryptography during transmission' },
    ],
  },
  // Requirement 5: Protect from Malicious Software
  R5: {
    id: '5',
    name: 'Protect All Systems and Networks from Malicious Software',
    requirements: [
      { id: '5.1', title: 'Processes and mechanisms for protecting all systems and networks from malicious software are defined' },
      { id: '5.2', title: 'Malicious software is prevented, or detected and addressed' },
      { id: '5.3', title: 'Anti-malware mechanisms and processes are active, maintained, and monitored' },
      { id: '5.4', title: 'Anti-phishing mechanisms protect users against phishing attacks' },
    ],
  },
  // Requirement 6: Develop and Maintain Secure Systems
  R6: {
    id: '6',
    name: 'Develop and Maintain Secure Systems and Software',
    requirements: [
      { id: '6.1', title: 'Processes and mechanisms for developing and maintaining secure systems and software are defined' },
      { id: '6.2', title: 'Bespoke and custom software is developed securely' },
      { id: '6.3', title: 'Security vulnerabilities are identified and addressed' },
      { id: '6.4', title: 'Public-facing web applications are protected against attacks' },
      { id: '6.5', title: 'Changes to all system components are managed securely' },
    ],
  },
  // Requirement 7: Restrict Access by Business Need to Know
  R7: {
    id: '7',
    name: 'Restrict Access to System Components and Cardholder Data by Business Need to Know',
    requirements: [
      { id: '7.1', title: 'Processes and mechanisms for restricting access to system components and CHD are defined' },
      { id: '7.2', title: 'Access to system components and data is appropriately defined and assigned' },
      { id: '7.3', title: 'Access to system components and data is managed via an access control system' },
    ],
  },
  // Requirement 8: Identify Users and Authenticate Access
  R8: {
    id: '8',
    name: 'Identify Users and Authenticate Access to System Components',
    requirements: [
      { id: '8.1', title: 'Processes and mechanisms for identifying users and authenticating access are defined' },
      { id: '8.2', title: 'User identification and related accounts are strictly managed throughout the account lifecycle' },
      { id: '8.3', title: 'Strong authentication for users and administrators is established and managed' },
      { id: '8.4', title: 'MFA is implemented to secure access into the CDE' },
      { id: '8.5', title: 'MFA systems are configured to prevent misuse' },
      { id: '8.6', title: 'Use of application and system accounts and associated authentication factors is strictly managed' },
    ],
  },
  // Requirement 9: Restrict Physical Access
  R9: {
    id: '9',
    name: 'Restrict Physical Access to Cardholder Data',
    requirements: [
      { id: '9.1', title: 'Processes and mechanisms for restricting physical access to CHD are defined' },
      { id: '9.2', title: 'Physical access controls manage entry into facilities and systems containing CHD' },
      { id: '9.3', title: 'Physical access for personnel and visitors is authorized and managed' },
      { id: '9.4', title: 'Media with CHD is securely stored, accessed, distributed, and destroyed' },
      { id: '9.5', title: 'POI devices are protected from tampering and unauthorized substitution' },
    ],
  },
  // Requirement 10: Log and Monitor Access
  R10: {
    id: '10',
    name: 'Log and Monitor All Access to System Components and Cardholder Data',
    requirements: [
      { id: '10.1', title: 'Processes and mechanisms for logging and monitoring access are defined' },
      { id: '10.2', title: 'Audit logs are implemented to support the detection of anomalies and suspicious activity' },
      { id: '10.3', title: 'Audit logs are protected from destruction and unauthorized modifications' },
      { id: '10.4', title: 'Audit logs are reviewed to identify anomalies or suspicious activity' },
      { id: '10.5', title: 'Audit log history is retained and available for analysis' },
      { id: '10.6', title: 'Time-synchronization mechanisms support consistent time settings across all systems' },
      { id: '10.7', title: 'Failures of critical security control systems are detected, reported, and responded to promptly' },
    ],
  },
  // Requirement 11: Test Security of Systems and Networks
  R11: {
    id: '11',
    name: 'Test Security of Systems and Networks Regularly',
    requirements: [
      { id: '11.1', title: 'Processes and mechanisms for testing security of systems and networks are defined' },
      { id: '11.2', title: 'Wireless access points are identified and monitored, and unauthorized WAPs are addressed' },
      { id: '11.3', title: 'External and internal vulnerabilities are regularly identified, prioritized, and addressed' },
      { id: '11.4', title: 'External and internal penetration testing is regularly performed, and exploitable vulnerabilities are corrected' },
      { id: '11.5', title: 'Network intrusions and unexpected file changes are detected and responded to' },
      { id: '11.6', title: 'Unauthorized changes on payment pages are detected and responded to' },
    ],
  },
  // Requirement 12: Organizational Policies and Programs
  R12: {
    id: '12',
    name: 'Support Information Security with Organizational Policies and Programs',
    requirements: [
      { id: '12.1', title: 'A comprehensive information security policy is known and acknowledged by all personnel' },
      { id: '12.2', title: 'Acceptable use policies for end-user technologies are defined and implemented' },
      { id: '12.3', title: 'Risks to the CDE are formally identified, evaluated, and managed' },
      { id: '12.4', title: 'PCI DSS compliance is managed' },
      { id: '12.5', title: 'PCI DSS scope is documented and validated' },
      { id: '12.6', title: 'Security awareness education is an ongoing activity' },
      { id: '12.7', title: 'Personnel are screened to reduce risks from insider threats' },
      { id: '12.8', title: 'Risk to information assets associated with TPSPs is managed' },
      { id: '12.9', title: 'TPSPs support their customers PCI DSS compliance' },
      { id: '12.10', title: 'Suspected and confirmed security incidents that could impact the CDE are responded to immediately' },
    ],
  },
};

// ============================================================================
// GDPR SECURITY ARTICLES
// ============================================================================

export const GDPR_ARTICLES = {
  // Data Protection Principles
  principles: {
    id: 'Art.5',
    name: 'Principles relating to processing of personal data',
    provisions: [
      { id: 'Art.5(1)(a)', title: 'Lawfulness, fairness and transparency' },
      { id: 'Art.5(1)(b)', title: 'Purpose limitation' },
      { id: 'Art.5(1)(c)', title: 'Data minimisation' },
      { id: 'Art.5(1)(d)', title: 'Accuracy' },
      { id: 'Art.5(1)(e)', title: 'Storage limitation' },
      { id: 'Art.5(1)(f)', title: 'Integrity and confidentiality' },
      { id: 'Art.5(2)', title: 'Accountability' },
    ],
  },
  // Lawfulness of Processing
  lawfulness: {
    id: 'Art.6',
    name: 'Lawfulness of processing',
    provisions: [
      { id: 'Art.6(1)', title: 'Lawful bases for processing' },
    ],
  },
  // Consent
  consent: {
    id: 'Art.7',
    name: 'Conditions for consent',
    provisions: [
      { id: 'Art.7(1)', title: 'Demonstrable consent' },
      { id: 'Art.7(2)', title: 'Clear and plain language' },
      { id: 'Art.7(3)', title: 'Right to withdraw consent' },
      { id: 'Art.7(4)', title: 'Freely given consent' },
    ],
  },
  // Data Subject Rights
  transparency: {
    id: 'Art.12',
    name: 'Transparent information, communication and modalities',
    provisions: [
      { id: 'Art.12(1)', title: 'Transparent communication' },
      { id: 'Art.12(2)', title: 'Facilitate exercise of rights' },
    ],
  },
  information: {
    id: 'Art.13-14',
    name: 'Information to be provided',
    provisions: [
      { id: 'Art.13', title: 'Information when data collected from data subject' },
      { id: 'Art.14', title: 'Information when data not obtained from data subject' },
    ],
  },
  access: {
    id: 'Art.15',
    name: 'Right of access',
    provisions: [
      { id: 'Art.15(1)', title: 'Right to obtain confirmation and access' },
    ],
  },
  rectification: {
    id: 'Art.16',
    name: 'Right to rectification',
    provisions: [
      { id: 'Art.16', title: 'Right to rectification of inaccurate data' },
    ],
  },
  erasure: {
    id: 'Art.17',
    name: 'Right to erasure',
    provisions: [
      { id: 'Art.17(1)', title: 'Right to be forgotten' },
      { id: 'Art.17(2)', title: 'Notification of erasure to third parties' },
    ],
  },
  restriction: {
    id: 'Art.18',
    name: 'Right to restriction of processing',
    provisions: [
      { id: 'Art.18(1)', title: 'Restriction of processing' },
    ],
  },
  portability: {
    id: 'Art.20',
    name: 'Right to data portability',
    provisions: [
      { id: 'Art.20(1)', title: 'Right to receive data in structured format' },
      { id: 'Art.20(2)', title: 'Right to have data transmitted to another controller' },
    ],
  },
  // Controller Obligations
  responsibility: {
    id: 'Art.24',
    name: 'Responsibility of the controller',
    provisions: [
      { id: 'Art.24(1)', title: 'Appropriate technical and organisational measures' },
      { id: 'Art.24(2)', title: 'Policies for data protection' },
    ],
  },
  byDesign: {
    id: 'Art.25',
    name: 'Data protection by design and by default',
    provisions: [
      { id: 'Art.25(1)', title: 'Data protection by design' },
      { id: 'Art.25(2)', title: 'Data protection by default' },
    ],
  },
  processor: {
    id: 'Art.28',
    name: 'Processor',
    provisions: [
      { id: 'Art.28(1)', title: 'Use only processors with sufficient guarantees' },
      { id: 'Art.28(3)', title: 'Processing contract requirements' },
      { id: 'Art.28(3)(a)', title: 'Process only on documented instructions' },
      { id: 'Art.28(3)(b)', title: 'Ensure persons are committed to confidentiality' },
      { id: 'Art.28(3)(c)', title: 'Take security measures per Article 32' },
      { id: 'Art.28(3)(d)', title: 'Sub-processor requirements' },
      { id: 'Art.28(3)(e)', title: 'Assist controller with data subject requests' },
      { id: 'Art.28(3)(f)', title: 'Assist with compliance obligations' },
      { id: 'Art.28(3)(g)', title: 'Delete or return data after processing ends' },
      { id: 'Art.28(3)(h)', title: 'Make available information for audits' },
    ],
  },
  records: {
    id: 'Art.30',
    name: 'Records of processing activities',
    provisions: [
      { id: 'Art.30(1)', title: 'Controller maintains records' },
      { id: 'Art.30(2)', title: 'Processor maintains records' },
    ],
  },
  // Security
  security: {
    id: 'Art.32',
    name: 'Security of processing',
    provisions: [
      { id: 'Art.32(1)', title: 'Appropriate technical and organisational measures' },
      { id: 'Art.32(1)(a)', title: 'Pseudonymisation and encryption of personal data' },
      { id: 'Art.32(1)(b)', title: 'Ensure ongoing confidentiality, integrity, availability and resilience' },
      { id: 'Art.32(1)(c)', title: 'Restore availability and access in timely manner' },
      { id: 'Art.32(1)(d)', title: 'Regularly test, assess and evaluate effectiveness' },
      { id: 'Art.32(2)', title: 'Assess risks to rights and freedoms' },
      { id: 'Art.32(4)', title: 'Steps to ensure persons act under authority' },
    ],
  },
  // Breach Notification
  breachAuthority: {
    id: 'Art.33',
    name: 'Notification of breach to supervisory authority',
    provisions: [
      { id: 'Art.33(1)', title: 'Notify without undue delay (within 72 hours)' },
      { id: 'Art.33(3)', title: 'Notification content requirements' },
      { id: 'Art.33(4)', title: 'Phased information provision' },
      { id: 'Art.33(5)', title: 'Document breaches' },
    ],
  },
  breachSubject: {
    id: 'Art.34',
    name: 'Communication of breach to data subject',
    provisions: [
      { id: 'Art.34(1)', title: 'Communicate to data subject when high risk' },
      { id: 'Art.34(2)', title: 'Clear and plain language' },
    ],
  },
  // DPIA
  dpia: {
    id: 'Art.35',
    name: 'Data protection impact assessment',
    provisions: [
      { id: 'Art.35(1)', title: 'Assessment required for high risk processing' },
      { id: 'Art.35(7)', title: 'DPIA content requirements' },
      { id: 'Art.35(7)(a)', title: 'Systematic description of processing' },
      { id: 'Art.35(7)(b)', title: 'Assessment of necessity and proportionality' },
      { id: 'Art.35(7)(c)', title: 'Assessment of risks to rights and freedoms' },
      { id: 'Art.35(7)(d)', title: 'Measures to address risks' },
    ],
  },
  // DPO
  dpo: {
    id: 'Art.37-39',
    name: 'Data Protection Officer',
    provisions: [
      { id: 'Art.37', title: 'Designation of DPO' },
      { id: 'Art.38', title: 'Position of the DPO' },
      { id: 'Art.39', title: 'Tasks of the DPO' },
    ],
  },
  // International Transfers
  transfers: {
    id: 'Art.44-49',
    name: 'Transfers of personal data to third countries',
    provisions: [
      { id: 'Art.44', title: 'General principle for transfers' },
      { id: 'Art.45', title: 'Transfers on adequacy decision' },
      { id: 'Art.46', title: 'Transfers subject to appropriate safeguards' },
    ],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getSOC2CriteriaCount(): number {
  let count = 0;
  for (const category of Object.values(SOC2_CRITERIA)) {
    count += category.criteria.length;
  }
  return count;
}

export function getISO27001ControlCount(): number {
  let count = 0;
  for (const category of Object.values(ISO27001_CONTROLS)) {
    count += category.controls.length;
  }
  return count;
}

export function getHIPAASpecCount(): number {
  let count = 0;
  for (const category of Object.values(HIPAA_SPECIFICATIONS)) {
    for (const standard of category.standards) {
      count += standard.specs.length;
    }
  }
  return count;
}

export function getNISTSubcategoryCount(): number {
  let count = 0;
  for (const func of Object.values(NIST_CSF_SUBCATEGORIES)) {
    for (const category of func.categories) {
      count += category.subcategories.length;
    }
  }
  return count;
}

export function getPCIDSSRequirementCount(): number {
  let count = 0;
  for (const req of Object.values(PCI_DSS_REQUIREMENTS)) {
    count += req.requirements.length;
  }
  return count;
}

export function getGDPRProvisionCount(): number {
  let count = 0;
  for (const article of Object.values(GDPR_ARTICLES)) {
    count += article.provisions.length;
  }
  return count;
}

// Summary of all framework requirements
export const FRAMEWORK_SUMMARY = {
  SOC2: { name: 'SOC 2 Trust Services Criteria', getCount: getSOC2CriteriaCount },
  ISO27001: { name: 'ISO 27001:2022 Annex A Controls', getCount: getISO27001ControlCount },
  HIPAA: { name: 'HIPAA Security Rule Implementation Specifications', getCount: getHIPAASpecCount },
  NIST: { name: 'NIST CSF 2.0 Subcategories', getCount: getNISTSubcategoryCount },
  PCIDSS: { name: 'PCI DSS v4.0 Requirements', getCount: getPCIDSSRequirementCount },
  GDPR: { name: 'GDPR Security and Privacy Provisions', getCount: getGDPRProvisionCount },
};
