/**
 * Rebuild Framework Mappings Script
 *
 * This script rebuilds framework mappings from scratch based on:
 * 1. Control domain relevance to each framework
 * 2. Specific control content/keywords
 * 3. Framework-specific requirements
 *
 * Framework Requirements Summary:
 * - SOC 2: Trust Services Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy)
 * - ISO 27001: Information Security Management (all domains apply)
 * - HIPAA: Healthcare data protection (PHI focus)
 * - NIST CSF: Cybersecurity framework (broad coverage)
 * - PCI DSS: Payment card data protection (cardholder data focus)
 * - GDPR: EU data privacy (personal data focus)
 */

const fs = require('fs');
const path = require('path');

// Framework relevance by domain
// true = highly relevant, false = not applicable
const DOMAIN_FRAMEWORK_RELEVANCE = {
  access_control: {
    SOC2: true,      // CC6.1-6.8 Logical and Physical Access
    ISO27001: true,  // A.5.15-A.5.18, A.8.2-A.8.5 Access Control
    HIPAA: true,     // 164.312(a) Access Control
    NIST: true,      // PR.AC Identity Management and Access Control
    PCIDSS: true,    // Req 7-8 Access Control
    GDPR: true,      // Art.32 Security of processing
  },
  asset_management: {
    SOC2: true,      // CC6.1 Asset inventory
    ISO27001: true,  // A.5.9-A.5.14 Asset Management
    HIPAA: true,     // 164.310(d) Device and Media Controls
    NIST: true,      // ID.AM Asset Management
    PCIDSS: true,    // Req 2, 9 System inventory
    GDPR: false,     // Not directly applicable (data mapping is separate)
  },
  risk_assessment: {
    SOC2: true,      // CC3.1-3.4 Risk Assessment
    ISO27001: true,  // Clause 6.1, A.5.2 Risk Assessment
    HIPAA: true,     // 164.308(a)(1) Risk Analysis
    NIST: true,      // ID.RA Risk Assessment
    PCIDSS: true,    // Req 12.2 Risk Assessment
    GDPR: true,      // Art.35 DPIA
  },
  security_operations: {
    SOC2: true,      // CC7.1-7.5 System Operations
    ISO27001: true,  // A.8.x Technological Controls
    HIPAA: true,     // 164.312 Technical Safeguards
    NIST: true,      // PR.DS, DE.CM
    PCIDSS: true,    // Req 5, 6, 10, 11 Security Operations
    GDPR: true,      // Art.32 Security measures
  },
  incident_response: {
    SOC2: true,      // CC7.4-7.5 Incident Response
    ISO27001: true,  // A.5.24-A.5.28 Incident Management
    HIPAA: true,     // 164.308(a)(6) Security Incident Procedures
    NIST: true,      // RS Response, RC Recovery
    PCIDSS: true,    // Req 12.10 Incident Response
    GDPR: true,      // Art.33-34 Breach Notification
  },
  business_continuity: {
    SOC2: true,      // A1.1-A1.3 Availability
    ISO27001: true,  // A.5.29-A.5.30 Business Continuity
    HIPAA: true,     // 164.308(a)(7) Contingency Plan
    NIST: true,      // PR.IP, RC Recovery
    PCIDSS: false,   // Not a primary PCI DSS focus
    GDPR: false,     // Not directly applicable
  },
  vendor_management: {
    SOC2: true,      // CC9.2 Vendor Management
    ISO27001: true,  // A.5.19-A.5.23 Supplier Relationships
    HIPAA: true,     // 164.308(b) Business Associates
    NIST: true,      // ID.SC Supply Chain
    PCIDSS: true,    // Req 12.8-12.9 Service Providers
    GDPR: true,      // Art.28 Processor agreements
  },
  data_protection: {
    SOC2: true,      // CC6.7, C1.1-C1.2, P1-P8
    ISO27001: true,  // A.5.33-A.5.34, A.8.10-A.8.12
    HIPAA: true,     // Core HIPAA focus - PHI protection
    NIST: true,      // PR.DS Data Security
    PCIDSS: true,    // Core PCI focus - cardholder data
    GDPR: true,      // Core GDPR focus - personal data
  },
  physical_security: {
    SOC2: true,      // CC6.4-6.5 Physical Access
    ISO27001: true,  // A.7.x Physical Controls
    HIPAA: true,     // 164.310 Physical Safeguards
    NIST: true,      // PR.AC-2 Physical Access
    PCIDSS: true,    // Req 9 Physical Access
    GDPR: false,     // Not directly applicable
  },
  hr_security: {
    SOC2: true,      // CC1.4 Personnel
    ISO27001: true,  // A.6.x People Controls
    HIPAA: true,     // 164.308(a)(3) Workforce Security
    NIST: true,      // PR.AT Awareness and Training
    PCIDSS: false,   // Limited relevance
    GDPR: false,     // Limited relevance (Art.39 DPO only)
  },
  change_management: {
    SOC2: true,      // CC8.1 Change Management
    ISO27001: true,  // A.8.32 Change Management
    HIPAA: false,    // Not explicitly required
    NIST: true,      // PR.IP Configuration Management
    PCIDSS: true,    // Req 6.4 Change Control
    GDPR: false,     // Not directly applicable
  },
  compliance_monitoring: {
    SOC2: true,      // CC4.1-4.2 Monitoring
    ISO27001: true,  // A.5.35-A.5.37 Compliance
    HIPAA: true,     // 164.308(a)(8) Evaluation
    NIST: true,      // ID.GV Governance
    PCIDSS: true,    // Req 12 Security Policies
    GDPR: true,      // Art.5(2) Accountability
  },
};

// Specific control ID overrides (for controls that don't follow domain rules)
const CONTROL_OVERRIDES = {
  // Processing Integrity controls - SOC 2 specific
  'PI-001': ['SOC2'],
  'PI-002': ['SOC2'],
  'PI-003': ['SOC2'],
  'PI-004': ['SOC2'],
  'PI-005': ['SOC2'],

  // Confidentiality controls - SOC 2 specific
  'CF-001': ['SOC2', 'ISO27001', 'HIPAA'],
  'CF-002': ['SOC2', 'ISO27001', 'HIPAA'],

  // Governance controls - NIST CSF 2.0 GOVERN function
  // These are organizational governance, apply broadly
  'GV-001': ['NIST', 'SOC2', 'ISO27001'],
  'GV-002': ['NIST', 'SOC2', 'ISO27001'],
  'GV-003': ['NIST', 'SOC2', 'ISO27001'],
  'GV-004': ['NIST', 'SOC2', 'ISO27001'],
  'GV-005': ['NIST', 'SOC2', 'ISO27001'],
  'GV-006': ['NIST', 'SOC2', 'ISO27001'],
  'GV-007': ['NIST', 'SOC2', 'ISO27001'],
  'GV-008': ['NIST', 'SOC2', 'ISO27001'],
  'GV-009': ['NIST', 'SOC2', 'ISO27001'],
  'GV-010': ['NIST', 'SOC2', 'ISO27001'],
  'GV-011': ['NIST', 'SOC2', 'ISO27001'],
  'GV-012': ['NIST', 'SOC2', 'ISO27001'],
  'GV-013': ['NIST', 'SOC2', 'ISO27001'],
  'GV-014': ['NIST', 'SOC2', 'ISO27001'],
  'GV-015': ['NIST', 'SOC2', 'ISO27001'],
  'GV-016': ['NIST', 'SOC2', 'ISO27001'],
  'GV-017': ['NIST', 'SOC2', 'ISO27001'],
  'GV-018': ['NIST', 'SOC2', 'ISO27001'],
  'GV-019': ['NIST', 'SOC2', 'ISO27001'],
  'GV-020': ['NIST', 'SOC2', 'ISO27001'],
  'GV-021': ['NIST', 'SOC2', 'ISO27001', 'PCIDSS'],
  'GV-022': ['NIST', 'SOC2', 'ISO27001', 'PCIDSS'],
  'GV-023': ['NIST', 'SOC2', 'ISO27001', 'PCIDSS'],
  'GV-024': ['NIST', 'SOC2', 'ISO27001', 'PCIDSS'],
  'GV-025': ['NIST', 'SOC2', 'ISO27001', 'PCIDSS'],
  'GV-026': ['NIST', 'SOC2', 'ISO27001', 'PCIDSS'],
  'GV-027': ['NIST', 'SOC2', 'ISO27001', 'PCIDSS'],
  'GV-028': ['NIST', 'SOC2', 'ISO27001', 'PCIDSS'],
  'GV-029': ['NIST', 'SOC2', 'ISO27001', 'PCIDSS'],
  'GV-030': ['NIST', 'SOC2', 'ISO27001', 'PCIDSS'],

  // Data Subject Rights - GDPR specific
  'DSR-001': ['GDPR'],
  'DSR-002': ['GDPR'],
  'DSR-003': ['GDPR'],
  'DSR-004': ['GDPR'],
  'DSR-005': ['GDPR'],
  'DSR-006': ['GDPR'],

  // SOC 2 specific organizational controls
  'SOC-001': ['SOC2'],
  'SOC-002': ['SOC2'],
  'SOC-003': ['SOC2'],
  'SOC-004': ['SOC2'],
  'SOC-005': ['SOC2'],
  'SOC-006': ['SOC2'],
  'SOC-007': ['SOC2'],
  'SOC-008': ['SOC2'],
};

// Framework-specific clause mappings
const FRAMEWORK_CLAUSES = {
  SOC2: {
    access_control: [
      { clauseId: 'CC6.1', clauseTitle: 'Logical and Physical Access Controls' },
      { clauseId: 'CC6.2', clauseTitle: 'User Authentication' },
      { clauseId: 'CC6.3', clauseTitle: 'Access Authorization' },
    ],
    asset_management: [
      { clauseId: 'CC6.1', clauseTitle: 'Asset Inventory and Management' },
    ],
    risk_assessment: [
      { clauseId: 'CC3.1', clauseTitle: 'Risk Identification' },
      { clauseId: 'CC3.2', clauseTitle: 'Risk Assessment' },
    ],
    security_operations: [
      { clauseId: 'CC7.1', clauseTitle: 'Detection of Security Events' },
      { clauseId: 'CC7.2', clauseTitle: 'Monitoring of System Components' },
    ],
    incident_response: [
      { clauseId: 'CC7.4', clauseTitle: 'Response to Security Incidents' },
      { clauseId: 'CC7.5', clauseTitle: 'Recovery from Security Incidents' },
    ],
    business_continuity: [
      { clauseId: 'A1.1', clauseTitle: 'Availability Commitment' },
      { clauseId: 'A1.2', clauseTitle: 'System Recovery' },
    ],
    vendor_management: [
      { clauseId: 'CC9.2', clauseTitle: 'Vendor Risk Management' },
    ],
    data_protection: [
      { clauseId: 'CC6.7', clauseTitle: 'Data Protection' },
      { clauseId: 'P1.1', clauseTitle: 'Privacy Notice' },
    ],
    physical_security: [
      { clauseId: 'CC6.4', clauseTitle: 'Physical Access Controls' },
      { clauseId: 'CC6.5', clauseTitle: 'Environmental Controls' },
    ],
    hr_security: [
      { clauseId: 'CC1.4', clauseTitle: 'Personnel Requirements' },
    ],
    change_management: [
      { clauseId: 'CC8.1', clauseTitle: 'Change Management' },
    ],
    compliance_monitoring: [
      { clauseId: 'CC4.1', clauseTitle: 'Monitoring Activities' },
      { clauseId: 'CC4.2', clauseTitle: 'Evaluation and Communication' },
    ],
  },
  ISO27001: {
    access_control: [
      { clauseId: 'A.5.15', clauseTitle: 'Access control' },
      { clauseId: 'A.8.2', clauseTitle: 'Privileged access rights' },
    ],
    asset_management: [
      { clauseId: 'A.5.9', clauseTitle: 'Inventory of information and other associated assets' },
      { clauseId: 'A.5.10', clauseTitle: 'Acceptable use of information and other associated assets' },
    ],
    risk_assessment: [
      { clauseId: 'A.5.2', clauseTitle: 'Information security roles and responsibilities' },
    ],
    security_operations: [
      { clauseId: 'A.8.7', clauseTitle: 'Protection against malware' },
      { clauseId: 'A.8.15', clauseTitle: 'Logging' },
    ],
    incident_response: [
      { clauseId: 'A.5.24', clauseTitle: 'Information security incident management planning and preparation' },
      { clauseId: 'A.5.26', clauseTitle: 'Response to information security incidents' },
    ],
    business_continuity: [
      { clauseId: 'A.5.29', clauseTitle: 'Information security during disruption' },
      { clauseId: 'A.5.30', clauseTitle: 'ICT readiness for business continuity' },
    ],
    vendor_management: [
      { clauseId: 'A.5.19', clauseTitle: 'Information security in supplier relationships' },
      { clauseId: 'A.5.21', clauseTitle: 'Managing information security in the ICT supply chain' },
    ],
    data_protection: [
      { clauseId: 'A.5.12', clauseTitle: 'Classification of information' },
      { clauseId: 'A.8.24', clauseTitle: 'Use of cryptography' },
    ],
    physical_security: [
      { clauseId: 'A.7.1', clauseTitle: 'Physical security perimeters' },
      { clauseId: 'A.7.2', clauseTitle: 'Physical entry' },
    ],
    hr_security: [
      { clauseId: 'A.6.1', clauseTitle: 'Screening' },
      { clauseId: 'A.6.2', clauseTitle: 'Terms and conditions of employment' },
    ],
    change_management: [
      { clauseId: 'A.8.32', clauseTitle: 'Change management' },
    ],
    compliance_monitoring: [
      { clauseId: 'A.5.35', clauseTitle: 'Independent review of information security' },
      { clauseId: 'A.5.36', clauseTitle: 'Compliance with policies, rules and standards' },
    ],
  },
  HIPAA: {
    access_control: [
      { clauseId: '164.312(a)(1)', clauseTitle: 'Access Control' },
      { clauseId: '164.312(d)', clauseTitle: 'Person or Entity Authentication' },
    ],
    asset_management: [
      { clauseId: '164.310(d)(1)', clauseTitle: 'Device and Media Controls' },
    ],
    risk_assessment: [
      { clauseId: '164.308(a)(1)(ii)(A)', clauseTitle: 'Risk Analysis' },
      { clauseId: '164.308(a)(1)(ii)(B)', clauseTitle: 'Risk Management' },
    ],
    security_operations: [
      { clauseId: '164.312(b)', clauseTitle: 'Audit Controls' },
      { clauseId: '164.312(e)(1)', clauseTitle: 'Transmission Security' },
    ],
    incident_response: [
      { clauseId: '164.308(a)(6)', clauseTitle: 'Security Incident Procedures' },
    ],
    business_continuity: [
      { clauseId: '164.308(a)(7)', clauseTitle: 'Contingency Plan' },
    ],
    vendor_management: [
      { clauseId: '164.308(b)(1)', clauseTitle: 'Business Associate Contracts' },
    ],
    data_protection: [
      { clauseId: '164.312(a)(2)(iv)', clauseTitle: 'Encryption and Decryption' },
      { clauseId: '164.312(c)(1)', clauseTitle: 'Integrity Controls' },
    ],
    physical_security: [
      { clauseId: '164.310(a)(1)', clauseTitle: 'Facility Access Controls' },
      { clauseId: '164.310(b)', clauseTitle: 'Workstation Use' },
    ],
    hr_security: [
      { clauseId: '164.308(a)(3)', clauseTitle: 'Workforce Security' },
      { clauseId: '164.308(a)(5)', clauseTitle: 'Security Awareness and Training' },
    ],
    compliance_monitoring: [
      { clauseId: '164.308(a)(8)', clauseTitle: 'Evaluation' },
    ],
  },
  NIST: {
    access_control: [
      { clauseId: 'PR.AC-1', clauseTitle: 'Identities and credentials are issued, managed, verified, revoked, and audited' },
      { clauseId: 'PR.AC-3', clauseTitle: 'Remote access is managed' },
    ],
    asset_management: [
      { clauseId: 'ID.AM-1', clauseTitle: 'Physical devices and systems are inventoried' },
      { clauseId: 'ID.AM-2', clauseTitle: 'Software platforms and applications are inventoried' },
    ],
    risk_assessment: [
      { clauseId: 'ID.RA-1', clauseTitle: 'Asset vulnerabilities are identified and documented' },
      { clauseId: 'ID.RA-3', clauseTitle: 'Threats are identified and documented' },
    ],
    security_operations: [
      { clauseId: 'PR.DS-1', clauseTitle: 'Data-at-rest is protected' },
      { clauseId: 'DE.CM-1', clauseTitle: 'The network is monitored to detect potential cybersecurity events' },
    ],
    incident_response: [
      { clauseId: 'RS.RP-1', clauseTitle: 'Response plan is executed during or after an incident' },
      { clauseId: 'RS.CO-1', clauseTitle: 'Personnel know their roles and order of operations' },
    ],
    business_continuity: [
      { clauseId: 'PR.IP-9', clauseTitle: 'Response and recovery plans are in place and managed' },
      { clauseId: 'RC.RP-1', clauseTitle: 'Recovery plan is executed during or after a cybersecurity incident' },
    ],
    vendor_management: [
      { clauseId: 'ID.SC-1', clauseTitle: 'Cyber supply chain risk management processes are established' },
      { clauseId: 'ID.SC-2', clauseTitle: 'Suppliers and third party partners are identified' },
    ],
    data_protection: [
      { clauseId: 'PR.DS-1', clauseTitle: 'Data-at-rest is protected' },
      { clauseId: 'PR.DS-2', clauseTitle: 'Data-in-transit is protected' },
    ],
    physical_security: [
      { clauseId: 'PR.AC-2', clauseTitle: 'Physical access to assets is managed and protected' },
    ],
    hr_security: [
      { clauseId: 'PR.AT-1', clauseTitle: 'All users are informed and trained' },
      { clauseId: 'PR.AT-2', clauseTitle: 'Privileged users understand their responsibilities' },
    ],
    change_management: [
      { clauseId: 'PR.IP-3', clauseTitle: 'Configuration change control processes are in place' },
    ],
    compliance_monitoring: [
      { clauseId: 'ID.GV-1', clauseTitle: 'Organizational cybersecurity policy is established' },
      { clauseId: 'ID.GV-3', clauseTitle: 'Legal and regulatory requirements are understood and managed' },
    ],
  },
  PCIDSS: {
    access_control: [
      { clauseId: '7.1', clauseTitle: 'Limit access to system components' },
      { clauseId: '8.2', clauseTitle: 'User identification and authentication' },
      { clauseId: '8.3', clauseTitle: 'Multi-factor authentication' },
    ],
    asset_management: [
      { clauseId: '2.4', clauseTitle: 'Maintain inventory of system components' },
      { clauseId: '9.5', clauseTitle: 'Protect POI devices from tampering' },
    ],
    risk_assessment: [
      { clauseId: '12.2', clauseTitle: 'Risk assessment process' },
    ],
    security_operations: [
      { clauseId: '5.1', clauseTitle: 'Anti-malware solutions' },
      { clauseId: '6.4', clauseTitle: 'Secure development practices' },
      { clauseId: '10.1', clauseTitle: 'Audit trails' },
      { clauseId: '11.3', clauseTitle: 'Penetration testing' },
    ],
    incident_response: [
      { clauseId: '12.10', clauseTitle: 'Incident response plan' },
    ],
    vendor_management: [
      { clauseId: '12.8', clauseTitle: 'Service provider management' },
      { clauseId: '12.9', clauseTitle: 'Service provider acknowledgment' },
    ],
    data_protection: [
      { clauseId: '3.4', clauseTitle: 'Render PAN unreadable' },
      { clauseId: '3.5', clauseTitle: 'Protect cryptographic keys' },
      { clauseId: '4.1', clauseTitle: 'Strong cryptography for transmission' },
    ],
    physical_security: [
      { clauseId: '9.1', clauseTitle: 'Restrict physical access' },
      { clauseId: '9.4', clauseTitle: 'Visitor management' },
    ],
    change_management: [
      { clauseId: '6.4', clauseTitle: 'Change control procedures' },
    ],
    compliance_monitoring: [
      { clauseId: '12.1', clauseTitle: 'Security policies' },
      { clauseId: '12.4', clauseTitle: 'Security responsibilities' },
    ],
  },
  GDPR: {
    access_control: [
      { clauseId: 'Art.32(1)(b)', clauseTitle: 'Ensure confidentiality of processing systems' },
    ],
    risk_assessment: [
      { clauseId: 'Art.35', clauseTitle: 'Data protection impact assessment' },
    ],
    security_operations: [
      { clauseId: 'Art.32(1)(a)', clauseTitle: 'Pseudonymisation and encryption' },
      { clauseId: 'Art.32(1)(d)', clauseTitle: 'Process for regularly testing security' },
    ],
    incident_response: [
      { clauseId: 'Art.33', clauseTitle: 'Notification to supervisory authority' },
      { clauseId: 'Art.34', clauseTitle: 'Communication to data subject' },
    ],
    vendor_management: [
      { clauseId: 'Art.28', clauseTitle: 'Processor requirements' },
      { clauseId: 'Art.29', clauseTitle: 'Processing under authority' },
    ],
    data_protection: [
      { clauseId: 'Art.5(1)(f)', clauseTitle: 'Integrity and confidentiality' },
      { clauseId: 'Art.25', clauseTitle: 'Data protection by design and default' },
      { clauseId: 'Art.32', clauseTitle: 'Security of processing' },
    ],
    compliance_monitoring: [
      { clauseId: 'Art.5(2)', clauseTitle: 'Accountability' },
      { clauseId: 'Art.30', clauseTitle: 'Records of processing activities' },
      { clauseId: 'Art.37', clauseTitle: 'Designation of DPO' },
    ],
  },
};

const controlsPath = path.join(__dirname, '../src/constants/controls.ts');
let content = fs.readFileSync(controlsPath, 'utf-8');

// Parse all controls
const controlPattern = /{\s*id:\s*'([^']+)',\s*domain:\s*'([^']+)',[\s\S]*?frameworkMappings:\s*\[([\s\S]*?)\],/g;

let match;
const controls = [];
while ((match = controlPattern.exec(content)) !== null) {
  controls.push({
    id: match[1],
    domain: match[2],
    fullMatch: match[0],
    mappingsStart: match.index + match[0].indexOf('frameworkMappings:'),
  });
}

console.log(`Found ${controls.length} controls to process\n`);

// Track statistics
const stats = {
  SOC2: 0,
  ISO27001: 0,
  HIPAA: 0,
  NIST: 0,
  PCIDSS: 0,
  GDPR: 0,
};

// Process each control
let updatedContent = content;
let offset = 0;

controls.forEach(control => {
  // Determine which frameworks apply
  let applicableFrameworks;

  if (CONTROL_OVERRIDES[control.id]) {
    applicableFrameworks = CONTROL_OVERRIDES[control.id];
  } else {
    applicableFrameworks = Object.entries(DOMAIN_FRAMEWORK_RELEVANCE[control.domain] || {})
      .filter(([, applies]) => applies)
      .map(([fw]) => fw);
  }

  // Build new mappings
  const newMappings = applicableFrameworks.map(fw => {
    stats[fw]++;
    const clauses = FRAMEWORK_CLAUSES[fw]?.[control.domain];
    if (clauses && clauses.length > 0) {
      const clause = clauses[0]; // Use first relevant clause
      return `      { frameworkId: '${fw}', clauseId: '${clause.clauseId}', clauseTitle: '${clause.clauseTitle}' }`;
    }
    return `      { frameworkId: '${fw}', clauseId: 'General', clauseTitle: 'General Controls' }`;
  });

  // Find and replace the frameworkMappings array
  const oldMappingsRegex = new RegExp(
    `(id:\\s*'${control.id}'[\\s\\S]*?frameworkMappings:\\s*)\\[[^\\]]*\\]`,
    'g'
  );

  const newMappingsStr = `[\n${newMappings.join(',\n')}\n    ]`;
  updatedContent = updatedContent.replace(oldMappingsRegex, `$1${newMappingsStr}`);
});

// Write updated content
fs.writeFileSync(controlsPath, updatedContent, 'utf-8');

console.log('Framework Mapping Rebuild Complete!\n');
console.log('New mapping counts:');
Object.entries(stats).forEach(([fw, count]) => {
  console.log(`  ${fw}: ${count} controls`);
});
console.log(`\nTotal controls: ${controls.length}`);
