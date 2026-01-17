#!/usr/bin/env node
/**
 * Script to add PCI DSS and GDPR mappings to all controls
 * Run with: node scripts/add-framework-mappings.js
 */

const fs = require('fs');
const path = require('path');

const controlsPath = path.join(__dirname, '../src/constants/controls.ts');
let content = fs.readFileSync(controlsPath, 'utf8');

// PCI DSS v4.0 mappings by domain/control type
const pciDssMappings = {
  // Access Control (AC)
  'AC': { clauseId: '7.1', clauseTitle: 'Restrict access by business need-to-know' },
  // Asset Management (AM)
  'AM': { clauseId: '12.5.2', clauseTitle: 'Maintain inventory of system components' },
  // Risk Assessment (RA)
  'RA': { clauseId: '12.2', clauseTitle: 'Risk assessment process' },
  // Security Operations (SO)
  'SO': { clauseId: '10.4', clauseTitle: 'Review audit logs' },
  // Incident Response (IR)
  'IR': { clauseId: '12.10', clauseTitle: 'Incident response plan' },
  // Business Continuity (BC)
  'BC': { clauseId: '12.10.1', clauseTitle: 'Business continuity and disaster recovery' },
  // Vendor Management (VM)
  'VM': { clauseId: '12.8', clauseTitle: 'Service provider management' },
  // Data Protection (DP)
  'DP': { clauseId: '3.4', clauseTitle: 'Protect stored cardholder data' },
  // Physical Security (PS)
  'PS': { clauseId: '9.1', clauseTitle: 'Physical access controls' },
  // HR Security (HR)
  'HR': { clauseId: '12.6', clauseTitle: 'Security awareness program' },
  // Change Management (CM)
  'CM': { clauseId: '6.5', clauseTitle: 'Change control processes' },
  // Monitoring (MO)
  'MO': { clauseId: '10.1', clauseTitle: 'Audit trail logging' },
  // Network Security (NS)
  'NS': { clauseId: '1.1', clauseTitle: 'Network security controls' },
  // Cryptography (CR)
  'CR': { clauseId: '4.1', clauseTitle: 'Protect cardholder data with cryptography' },
  // Identity Management (ID)
  'ID': { clauseId: '8.1', clauseTitle: 'User identification management' },
  // Secure Development (SD)
  'SD': { clauseId: '6.2', clauseTitle: 'Secure development practices' },
  // Privacy (PV)
  'PV': { clauseId: '3.1', clauseTitle: 'Data minimization and retention' },
};

// Detailed PCI DSS mappings for specific controls
const detailedPciDss = {
  // Security Operations
  'SO-007': { clauseId: '10.6', clauseTitle: 'Time synchronization and log review' },
  'SO-008': { clauseId: '1.3', clauseTitle: 'Network traffic control' },
  'SO-009': { clauseId: '12.10.3', clauseTitle: 'Security monitoring responsibilities' },
  'SO-010': { clauseId: '11.5', clauseTitle: 'Change detection mechanisms' },
  'SO-011': { clauseId: '6.3', clauseTitle: 'Security vulnerabilities addressed' },
  'SO-012': { clauseId: '6.3.3', clauseTitle: 'Patch management' },
  'SO-013': { clauseId: '10.7', clauseTitle: 'Audit log retention' },
  'SO-014': { clauseId: '11.3', clauseTitle: 'Penetration testing' },
  'SO-015': { clauseId: '10.4.1', clauseTitle: 'Automated log review' },
  'SO-016': { clauseId: '5.2', clauseTitle: 'Anti-malware mechanisms' },
  'SO-017': { clauseId: '10.3', clauseTitle: 'Audit log content' },
  'SO-018': { clauseId: '11.4', clauseTitle: 'Intrusion detection' },
  'SO-019': { clauseId: '5.3', clauseTitle: 'Anti-malware active and monitored' },
  'SO-020': { clauseId: '12.10.4', clauseTitle: 'Incident response training' },
  // Incident Response
  'IR-002': { clauseId: '12.10.2', clauseTitle: 'Incident response procedures' },
  'IR-003': { clauseId: '12.10.5', clauseTitle: 'Incident response alerts' },
  'IR-004': { clauseId: '12.10.6', clauseTitle: 'Incident response testing' },
  'IR-005': { clauseId: '12.10.1', clauseTitle: 'Incident response plan elements' },
  'IR-006': { clauseId: '12.10.3', clauseTitle: 'Personnel responsibilities' },
  'IR-007': { clauseId: '12.10.4', clauseTitle: 'Staff training on incidents' },
  'IR-008': { clauseId: '12.10.7', clauseTitle: 'Incident recovery procedures' },
  'IR-009': { clauseId: '12.10.2', clauseTitle: 'Containment procedures' },
  'IR-010': { clauseId: '12.10.5', clauseTitle: 'Monitoring and alerting' },
  'IR-011': { clauseId: '12.10.6', clauseTitle: 'Annual IR testing' },
  'IR-012': { clauseId: '12.10.1', clauseTitle: 'Communication procedures' },
  'IR-013': { clauseId: '12.10.7', clauseTitle: 'Recovery and restoration' },
  'IR-014': { clauseId: '12.10.4', clauseTitle: 'Lessons learned process' },
  'IR-015': { clauseId: '12.10.2', clauseTitle: 'Legal and regulatory reporting' },
  // Business Continuity
  'BC-001': { clauseId: '12.10.1', clauseTitle: 'Business continuity plan' },
  'BC-002': { clauseId: '12.10.1', clauseTitle: 'Business impact analysis' },
  'BC-003': { clauseId: '9.5', clauseTitle: 'Backup media protection' },
  'BC-004': { clauseId: '12.10.6', clauseTitle: 'BC plan testing' },
  'BC-005': { clauseId: '12.10.1', clauseTitle: 'Recovery objectives' },
  'BC-006': { clauseId: '12.10.1', clauseTitle: 'Communication plan' },
  'BC-007': { clauseId: '9.5.1', clauseTitle: 'Offsite backup storage' },
  'BC-008': { clauseId: '10.5', clauseTitle: 'Audit trail integrity' },
  'BC-009': { clauseId: '12.10.6', clauseTitle: 'DR testing' },
  'BC-010': { clauseId: '12.10.1', clauseTitle: 'Resilience requirements' },
  'BC-011': { clauseId: '12.10.4', clauseTitle: 'BC training' },
  'BC-012': { clauseId: '12.10.6', clauseTitle: 'BC plan review' },
  // Vendor Management
  'VM-001': { clauseId: '12.8.1', clauseTitle: 'Service provider list' },
  'VM-002': { clauseId: '12.8.2', clauseTitle: 'Service provider agreements' },
  'VM-003': { clauseId: '12.8.4', clauseTitle: 'Service provider monitoring' },
  'VM-004': { clauseId: '12.8.5', clauseTitle: 'Service provider compliance' },
  'VM-005': { clauseId: '12.8.3', clauseTitle: 'Due diligence process' },
  'VM-006': { clauseId: '12.8.2', clauseTitle: 'Contractual requirements' },
  'VM-007': { clauseId: '12.8.4', clauseTitle: 'Ongoing monitoring' },
  'VM-008': { clauseId: '12.8.1', clauseTitle: 'Vendor inventory' },
  'VM-009': { clauseId: '12.8.5', clauseTitle: 'Vendor compliance verification' },
  'VM-010': { clauseId: '12.8.2', clauseTitle: 'Vendor offboarding' },
  // Data Protection
  'DP-003': { clauseId: '3.4.1', clauseTitle: 'Encryption of stored data' },
  'DP-004': { clauseId: '4.2', clauseTitle: 'Transmission encryption' },
  'DP-005': { clauseId: '3.2', clauseTitle: 'Data retention limits' },
  'DP-006': { clauseId: '3.3', clauseTitle: 'Data masking' },
  'DP-007': { clauseId: '3.1', clauseTitle: 'Data inventory' },
  'DP-008': { clauseId: '3.4', clauseTitle: 'Data protection mechanisms' },
  'DP-009': { clauseId: '3.5', clauseTitle: 'Key management' },
  'DP-010': { clauseId: '3.6', clauseTitle: 'Cryptographic key procedures' },
  'DP-011': { clauseId: '4.1', clauseTitle: 'Strong cryptography for transmission' },
  'DP-012': { clauseId: '3.2.1', clauseTitle: 'Secure data deletion' },
  'DP-013': { clauseId: '3.3.1', clauseTitle: 'Data masking requirements' },
  'DP-014': { clauseId: '3.4.1', clauseTitle: 'Render data unreadable' },
  'DP-015': { clauseId: '3.5.1', clauseTitle: 'Key access restriction' },
  'DP-016': { clauseId: '4.2.1', clauseTitle: 'Secure transmission protocols' },
  'DP-017': { clauseId: '3.6.1', clauseTitle: 'Key generation' },
  'DP-018': { clauseId: '3.7', clauseTitle: 'Key storage security' },
  // Physical Security
  'PS-001': { clauseId: '9.1', clauseTitle: 'Facility entry controls' },
  'PS-002': { clauseId: '9.2', clauseTitle: 'Physical access procedures' },
  'PS-003': { clauseId: '9.3', clauseTitle: 'Physical access authorization' },
  'PS-004': { clauseId: '9.4', clauseTitle: 'Visitor management' },
  'PS-005': { clauseId: '9.5', clauseTitle: 'Media protection' },
  'PS-006': { clauseId: '9.4.1', clauseTitle: 'Visitor identification' },
  'PS-007': { clauseId: '9.4.2', clauseTitle: 'Visitor logs' },
  'PS-008': { clauseId: '9.4.3', clauseTitle: 'Visitor escort' },
  // HR Security
  'HR-001': { clauseId: '12.7', clauseTitle: 'Background checks' },
  'HR-002': { clauseId: '12.6', clauseTitle: 'Security awareness training' },
  'HR-003': { clauseId: '12.6.1', clauseTitle: 'Security training program' },
  'HR-004': { clauseId: '12.6.2', clauseTitle: 'Periodic training' },
  'HR-005': { clauseId: '12.6.3', clauseTitle: 'Security awareness content' },
  'HR-006': { clauseId: '8.1.3', clauseTitle: 'Personnel termination procedures' },
  'HR-007': { clauseId: '12.4', clauseTitle: 'Security responsibilities' },
  'HR-008': { clauseId: '12.6.3.1', clauseTitle: 'Phishing awareness' },
  'HR-009': { clauseId: '12.4.1', clauseTitle: 'Executive responsibility' },
  'HR-010': { clauseId: '12.6.3.2', clauseTitle: 'Annual training acknowledgment' },
  // Change Management
  'CM-001': { clauseId: '6.5.1', clauseTitle: 'Change control procedures' },
  'CM-002': { clauseId: '6.5.2', clauseTitle: 'Change impact assessment' },
  'CM-003': { clauseId: '6.5.3', clauseTitle: 'Change authorization' },
  'CM-004': { clauseId: '6.5.4', clauseTitle: 'Change testing' },
  'CM-005': { clauseId: '6.5.5', clauseTitle: 'Change documentation' },
  'CM-006': { clauseId: '6.5.6', clauseTitle: 'Change rollback procedures' },
  'CM-007': { clauseId: '2.2', clauseTitle: 'Configuration standards' },
  'CM-008': { clauseId: '2.2.1', clauseTitle: 'Configuration baseline' },
  'CM-009': { clauseId: '6.5.1', clauseTitle: 'Change review process' },
  'CM-010': { clauseId: '6.4', clauseTitle: 'Development environments' },
  // Monitoring
  'MO-001': { clauseId: '10.1', clauseTitle: 'Logging enabled' },
  'MO-002': { clauseId: '10.2', clauseTitle: 'Audit events recorded' },
  'MO-003': { clauseId: '10.3', clauseTitle: 'Log content requirements' },
  'MO-004': { clauseId: '10.4', clauseTitle: 'Log review' },
  'MO-005': { clauseId: '10.5', clauseTitle: 'Log integrity' },
  'MO-006': { clauseId: '10.6', clauseTitle: 'Time synchronization' },
  'MO-007': { clauseId: '10.7', clauseTitle: 'Log retention' },
  'MO-008': { clauseId: '10.4.1', clauseTitle: 'Automated monitoring' },
  'MO-009': { clauseId: '10.4.2', clauseTitle: 'Periodic log review' },
  'MO-010': { clauseId: '10.5.1', clauseTitle: 'Log tampering protection' },
  // Network Security
  'NS-001': { clauseId: '1.2', clauseTitle: 'Network segmentation' },
  'NS-002': { clauseId: '1.3', clauseTitle: 'Firewall configuration' },
  'NS-003': { clauseId: '1.4', clauseTitle: 'Personal firewall' },
  'NS-004': { clauseId: '1.2.1', clauseTitle: 'Network documentation' },
  'NS-005': { clauseId: '1.2.2', clauseTitle: 'Business justification for rules' },
  'NS-006': { clauseId: '1.3.1', clauseTitle: 'Inbound traffic restrictions' },
  'NS-007': { clauseId: '1.3.2', clauseTitle: 'Outbound traffic restrictions' },
  'NS-008': { clauseId: '1.4.1', clauseTitle: 'Anti-spoofing measures' },
  'NS-009': { clauseId: '1.5', clauseTitle: 'Wireless security' },
  'NS-010': { clauseId: '11.4.1', clauseTitle: 'Network intrusion detection' },
  'NS-011': { clauseId: '2.3', clauseTitle: 'Secure protocols' },
  'NS-012': { clauseId: '1.2.3', clauseTitle: 'CDE network diagram' },
  'NS-013': { clauseId: '1.3.3', clauseTitle: 'DMZ implementation' },
  'NS-014': { clauseId: '1.5.1', clauseTitle: 'Wireless defaults changed' },
  'NS-015': { clauseId: '11.4.2', clauseTitle: 'IDS/IPS management' },
  // Cryptography
  'CR-001': { clauseId: '4.1', clauseTitle: 'Strong cryptography' },
  'CR-002': { clauseId: '3.5', clauseTitle: 'Key management procedures' },
  'CR-003': { clauseId: '3.6', clauseTitle: 'Key lifecycle management' },
  'CR-004': { clauseId: '4.2', clauseTitle: 'Transmission security' },
  'CR-005': { clauseId: '3.5.1', clauseTitle: 'Key access controls' },
  'CR-006': { clauseId: '3.6.1', clauseTitle: 'Key generation' },
  'CR-007': { clauseId: '3.6.2', clauseTitle: 'Key distribution' },
  'CR-008': { clauseId: '3.6.3', clauseTitle: 'Key storage' },
  'CR-009': { clauseId: '3.6.4', clauseTitle: 'Key rotation' },
  'CR-010': { clauseId: '3.6.5', clauseTitle: 'Key destruction' },
  // Identity Management
  'ID-001': { clauseId: '8.1', clauseTitle: 'User identification' },
  'ID-002': { clauseId: '8.2', clauseTitle: 'User authentication' },
  'ID-003': { clauseId: '8.3', clauseTitle: 'Strong authentication' },
  'ID-004': { clauseId: '8.4', clauseTitle: 'MFA implementation' },
  'ID-005': { clauseId: '8.5', clauseTitle: 'Single authentication factor' },
  'ID-006': { clauseId: '8.2.1', clauseTitle: 'Unique user IDs' },
  'ID-007': { clauseId: '8.2.2', clauseTitle: 'Group account controls' },
  'ID-008': { clauseId: '8.3.1', clauseTitle: 'MFA for admin access' },
  'ID-009': { clauseId: '8.3.2', clauseTitle: 'MFA for remote access' },
  'ID-010': { clauseId: '8.2.3', clauseTitle: 'Password requirements' },
  'ID-011': { clauseId: '8.2.4', clauseTitle: 'Password history' },
  'ID-012': { clauseId: '8.2.5', clauseTitle: 'Session management' },
  'ID-013': { clauseId: '8.2.6', clauseTitle: 'Account lockout' },
  'ID-014': { clauseId: '8.6', clauseTitle: 'Service account management' },
  'ID-015': { clauseId: '8.2.7', clauseTitle: 'Inactive account management' },
  // Secure Development
  'SD-001': { clauseId: '6.2.1', clauseTitle: 'Secure development training' },
  'SD-002': { clauseId: '6.2.2', clauseTitle: 'Secure coding practices' },
  'SD-003': { clauseId: '6.2.3', clauseTitle: 'Code review' },
  'SD-004': { clauseId: '6.2.4', clauseTitle: 'Vulnerability prevention' },
  'SD-005': { clauseId: '6.3.1', clauseTitle: 'Security testing' },
  'SD-006': { clauseId: '6.3.2', clauseTitle: 'Application security' },
  'SD-007': { clauseId: '6.4.1', clauseTitle: 'Development environment separation' },
  'SD-008': { clauseId: '6.4.2', clauseTitle: 'Test data protection' },
  'SD-009': { clauseId: '6.4.3', clauseTitle: 'Production access controls' },
  'SD-010': { clauseId: '6.5', clauseTitle: 'Secure development lifecycle' },
  'SD-011': { clauseId: '6.5.1', clauseTitle: 'Input validation' },
  'SD-012': { clauseId: '6.5.2', clauseTitle: 'Output encoding' },
  'SD-013': { clauseId: '6.5.3', clauseTitle: 'SQL injection prevention' },
  'SD-014': { clauseId: '6.5.4', clauseTitle: 'XSS prevention' },
  'SD-015': { clauseId: '11.3.1', clauseTitle: 'Application penetration testing' },
  // Privacy
  'PV-001': { clauseId: '3.1', clauseTitle: 'Data minimization' },
  'PV-002': { clauseId: '3.2', clauseTitle: 'Data retention policy' },
  'PV-003': { clauseId: '12.3', clauseTitle: 'Usage policies' },
  'PV-004': { clauseId: '3.2.1', clauseTitle: 'Secure data disposal' },
  'PV-005': { clauseId: '9.8', clauseTitle: 'Media destruction' },
  'PV-006': { clauseId: '12.3.1', clauseTitle: 'Acceptable use policy' },
  'PV-007': { clauseId: '3.4.1', clauseTitle: 'Data masking/tokenization' },
  'PV-008': { clauseId: '12.8.2', clauseTitle: 'Third party data handling' },
  'PV-009': { clauseId: '3.3', clauseTitle: 'Data display restrictions' },
  'PV-010': { clauseId: '12.3.2', clauseTitle: 'Privacy policy' },
  'PV-011': { clauseId: '12.5', clauseTitle: 'Information security responsibilities' },
  'PV-012': { clauseId: '3.4', clauseTitle: 'Data protection mechanisms' },
  'PV-013': { clauseId: '12.1', clauseTitle: 'Security policy documentation' },
  'PV-014': { clauseId: '12.1.1', clauseTitle: 'Policy review' },
  'PV-015': { clauseId: '12.5.1', clauseTitle: 'Data handling responsibilities' },
};

// GDPR mappings by domain/control type
const gdprMappings = {
  // Access Control (AC)
  'AC': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Ensure ongoing confidentiality' },
  // Asset Management (AM)
  'AM': { clauseId: 'Art.30', clauseTitle: 'Records of processing activities' },
  // Risk Assessment (RA)
  'RA': { clauseId: 'Art.35', clauseTitle: 'Data protection impact assessment' },
  // Security Operations (SO)
  'SO': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Regularly test and evaluate security' },
  // Incident Response (IR)
  'IR': { clauseId: 'Art.33', clauseTitle: 'Personal data breach notification' },
  // Business Continuity (BC)
  'BC': { clauseId: 'Art.32(1)(c)', clauseTitle: 'Restore availability and access' },
  // Vendor Management (VM)
  'VM': { clauseId: 'Art.28', clauseTitle: 'Processor obligations' },
  // Data Protection (DP)
  'DP': { clauseId: 'Art.5(1)(f)', clauseTitle: 'Integrity and confidentiality' },
  // Physical Security (PS)
  'PS': { clauseId: 'Art.32(1)', clauseTitle: 'Security of processing' },
  // HR Security (HR)
  'HR': { clauseId: 'Art.32(4)', clauseTitle: 'Ensure persons act under authority' },
  // Change Management (CM)
  'CM': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Process for testing security' },
  // Monitoring (MO)
  'MO': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Regular testing and evaluation' },
  // Network Security (NS)
  'NS': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Pseudonymisation and encryption' },
  // Cryptography (CR)
  'CR': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Encryption of personal data' },
  // Identity Management (ID)
  'ID': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Ensure confidentiality of systems' },
  // Secure Development (SD)
  'SD': { clauseId: 'Art.25', clauseTitle: 'Data protection by design and default' },
  // Privacy (PV)
  'PV': { clauseId: 'Art.5(1)', clauseTitle: 'Principles of processing' },
};

// Detailed GDPR mappings for specific controls
const detailedGdpr = {
  // Security Operations
  'SO-007': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Ongoing confidentiality monitoring' },
  'SO-008': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Network security measures' },
  'SO-009': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Security monitoring and evaluation' },
  'SO-010': { clauseId: 'Art.32(2)', clauseTitle: 'Assess risks to processing' },
  'SO-011': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Regular security testing' },
  'SO-012': { clauseId: 'Art.32(1)', clauseTitle: 'Appropriate security measures' },
  'SO-013': { clauseId: 'Art.30', clauseTitle: 'Record keeping obligations' },
  'SO-014': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Testing security effectiveness' },
  'SO-015': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Automated security monitoring' },
  'SO-016': { clauseId: 'Art.32(1)(b)', clauseTitle: 'System integrity protection' },
  'SO-017': { clauseId: 'Art.30(1)', clauseTitle: 'Processing records maintenance' },
  'SO-018': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Intrusion detection capabilities' },
  'SO-019': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Malware protection' },
  'SO-020': { clauseId: 'Art.32(4)', clauseTitle: 'Personnel security training' },
  // Incident Response
  'IR-002': { clauseId: 'Art.33(1)', clauseTitle: 'Breach notification timing' },
  'IR-003': { clauseId: 'Art.33(3)', clauseTitle: 'Breach notification content' },
  'IR-004': { clauseId: 'Art.32(1)(d)', clauseTitle: 'IR process testing' },
  'IR-005': { clauseId: 'Art.33', clauseTitle: 'Breach response procedures' },
  'IR-006': { clauseId: 'Art.33(5)', clauseTitle: 'Breach documentation' },
  'IR-007': { clauseId: 'Art.32(4)', clauseTitle: 'IR personnel training' },
  'IR-008': { clauseId: 'Art.32(1)(c)', clauseTitle: 'Availability restoration' },
  'IR-009': { clauseId: 'Art.33(1)', clauseTitle: 'Breach containment' },
  'IR-010': { clauseId: 'Art.33(4)', clauseTitle: 'Breach detection monitoring' },
  'IR-011': { clauseId: 'Art.32(1)(d)', clauseTitle: 'IR testing and evaluation' },
  'IR-012': { clauseId: 'Art.34', clauseTitle: 'Data subject notification' },
  'IR-013': { clauseId: 'Art.32(1)(c)', clauseTitle: 'Recovery procedures' },
  'IR-014': { clauseId: 'Art.33(5)', clauseTitle: 'Breach lessons learned' },
  'IR-015': { clauseId: 'Art.33(1)', clauseTitle: 'Supervisory authority notification' },
  // Business Continuity
  'BC-001': { clauseId: 'Art.32(1)(c)', clauseTitle: 'Availability resilience' },
  'BC-002': { clauseId: 'Art.35(7)(c)', clauseTitle: 'Impact assessment' },
  'BC-003': { clauseId: 'Art.32(1)(c)', clauseTitle: 'Backup and recovery' },
  'BC-004': { clauseId: 'Art.32(1)(d)', clauseTitle: 'BC testing' },
  'BC-005': { clauseId: 'Art.32(1)(c)', clauseTitle: 'Recovery objectives' },
  'BC-006': { clauseId: 'Art.33', clauseTitle: 'Incident communication' },
  'BC-007': { clauseId: 'Art.32(1)(c)', clauseTitle: 'Offsite data availability' },
  'BC-008': { clauseId: 'Art.5(1)(f)', clauseTitle: 'Data integrity' },
  'BC-009': { clauseId: 'Art.32(1)(d)', clauseTitle: 'DR testing and evaluation' },
  'BC-010': { clauseId: 'Art.32(1)(b)', clauseTitle: 'System resilience' },
  'BC-011': { clauseId: 'Art.32(4)', clauseTitle: 'BC personnel training' },
  'BC-012': { clauseId: 'Art.32(1)(d)', clauseTitle: 'BC plan review' },
  // Vendor Management
  'VM-001': { clauseId: 'Art.28(1)', clauseTitle: 'Processor engagement' },
  'VM-002': { clauseId: 'Art.28(3)', clauseTitle: 'Processing contract' },
  'VM-003': { clauseId: 'Art.28(3)(h)', clauseTitle: 'Processor audits' },
  'VM-004': { clauseId: 'Art.28(1)', clauseTitle: 'Sufficient guarantees' },
  'VM-005': { clauseId: 'Art.28(1)', clauseTitle: 'Processor due diligence' },
  'VM-006': { clauseId: 'Art.28(3)', clauseTitle: 'Contractual requirements' },
  'VM-007': { clauseId: 'Art.28(3)(h)', clauseTitle: 'Ongoing processor oversight' },
  'VM-008': { clauseId: 'Art.30(1)(d)', clauseTitle: 'Processor records' },
  'VM-009': { clauseId: 'Art.28(3)(a)', clauseTitle: 'Processor compliance' },
  'VM-010': { clauseId: 'Art.28(3)(g)', clauseTitle: 'Data return/deletion' },
  // Data Protection
  'DP-003': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Encryption of personal data' },
  'DP-004': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Transmission encryption' },
  'DP-005': { clauseId: 'Art.5(1)(e)', clauseTitle: 'Storage limitation' },
  'DP-006': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Pseudonymisation' },
  'DP-007': { clauseId: 'Art.30', clauseTitle: 'Data processing records' },
  'DP-008': { clauseId: 'Art.5(1)(f)', clauseTitle: 'Integrity and confidentiality' },
  'DP-009': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Key management' },
  'DP-010': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Cryptographic controls' },
  'DP-011': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Encryption in transit' },
  'DP-012': { clauseId: 'Art.17', clauseTitle: 'Right to erasure' },
  'DP-013': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Data masking' },
  'DP-014': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Data protection at rest' },
  'DP-015': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Key access control' },
  'DP-016': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Secure transmission' },
  'DP-017': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Key generation security' },
  'DP-018': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Key storage protection' },
  // Physical Security
  'PS-001': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Physical access security' },
  'PS-002': { clauseId: 'Art.32(1)', clauseTitle: 'Physical security measures' },
  'PS-003': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Access authorization' },
  'PS-004': { clauseId: 'Art.32(1)', clauseTitle: 'Visitor management' },
  'PS-005': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Media protection' },
  'PS-006': { clauseId: 'Art.32(4)', clauseTitle: 'Visitor identification' },
  'PS-007': { clauseId: 'Art.30', clauseTitle: 'Access records' },
  'PS-008': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Visitor escort procedures' },
  // HR Security
  'HR-001': { clauseId: 'Art.32(4)', clauseTitle: 'Personnel screening' },
  'HR-002': { clauseId: 'Art.32(4)', clauseTitle: 'Security awareness' },
  'HR-003': { clauseId: 'Art.32(4)', clauseTitle: 'Training program' },
  'HR-004': { clauseId: 'Art.32(4)', clauseTitle: 'Ongoing training' },
  'HR-005': { clauseId: 'Art.32(4)', clauseTitle: 'GDPR awareness content' },
  'HR-006': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Termination access removal' },
  'HR-007': { clauseId: 'Art.32(4)', clauseTitle: 'Role responsibilities' },
  'HR-008': { clauseId: 'Art.32(4)', clauseTitle: 'Phishing awareness' },
  'HR-009': { clauseId: 'Art.37', clauseTitle: 'DPO designation' },
  'HR-010': { clauseId: 'Art.32(4)', clauseTitle: 'Training acknowledgment' },
  // Change Management
  'CM-001': { clauseId: 'Art.25(1)', clauseTitle: 'Privacy by design' },
  'CM-002': { clauseId: 'Art.35', clauseTitle: 'Change impact assessment' },
  'CM-003': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Change authorization' },
  'CM-004': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Change testing' },
  'CM-005': { clauseId: 'Art.30', clauseTitle: 'Change documentation' },
  'CM-006': { clauseId: 'Art.32(1)(c)', clauseTitle: 'Rollback capability' },
  'CM-007': { clauseId: 'Art.25(2)', clauseTitle: 'Default privacy settings' },
  'CM-008': { clauseId: 'Art.32(1)', clauseTitle: 'Security configuration' },
  'CM-009': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Change review' },
  'CM-010': { clauseId: 'Art.25(1)', clauseTitle: 'Development privacy' },
  // Monitoring
  'MO-001': { clauseId: 'Art.30', clauseTitle: 'Processing activity logging' },
  'MO-002': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Security event recording' },
  'MO-003': { clauseId: 'Art.30(1)', clauseTitle: 'Log content requirements' },
  'MO-004': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Log review procedures' },
  'MO-005': { clauseId: 'Art.5(1)(f)', clauseTitle: 'Log integrity' },
  'MO-006': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Time accuracy' },
  'MO-007': { clauseId: 'Art.5(1)(e)', clauseTitle: 'Log retention limits' },
  'MO-008': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Automated monitoring' },
  'MO-009': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Regular log review' },
  'MO-010': { clauseId: 'Art.5(1)(f)', clauseTitle: 'Log protection' },
  // Network Security
  'NS-001': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Network segmentation' },
  'NS-002': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Network access control' },
  'NS-003': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Endpoint protection' },
  'NS-004': { clauseId: 'Art.30', clauseTitle: 'Network documentation' },
  'NS-005': { clauseId: 'Art.32(1)', clauseTitle: 'Network security policy' },
  'NS-006': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Inbound traffic control' },
  'NS-007': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Outbound traffic control' },
  'NS-008': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Network integrity' },
  'NS-009': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Wireless security' },
  'NS-010': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Intrusion detection' },
  'NS-011': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Secure protocols' },
  'NS-012': { clauseId: 'Art.30', clauseTitle: 'Network architecture records' },
  'NS-013': { clauseId: 'Art.32(1)(b)', clauseTitle: 'DMZ security' },
  'NS-014': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Wireless configuration' },
  'NS-015': { clauseId: 'Art.32(1)(b)', clauseTitle: 'IDS/IPS monitoring' },
  // Cryptography
  'CR-001': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Encryption implementation' },
  'CR-002': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Key management policy' },
  'CR-003': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Key lifecycle' },
  'CR-004': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Transmission security' },
  'CR-005': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Key access restriction' },
  'CR-006': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Secure key generation' },
  'CR-007': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Key distribution security' },
  'CR-008': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Key storage protection' },
  'CR-009': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Key rotation policy' },
  'CR-010': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Secure key destruction' },
  // Identity Management
  'ID-001': { clauseId: 'Art.32(1)(b)', clauseTitle: 'User identification' },
  'ID-002': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Authentication controls' },
  'ID-003': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Strong authentication' },
  'ID-004': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Multi-factor authentication' },
  'ID-005': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Authentication management' },
  'ID-006': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Unique identifiers' },
  'ID-007': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Shared account control' },
  'ID-008': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Admin MFA' },
  'ID-009': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Remote access MFA' },
  'ID-010': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Password policy' },
  'ID-011': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Password history' },
  'ID-012': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Session controls' },
  'ID-013': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Account lockout' },
  'ID-014': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Service accounts' },
  'ID-015': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Inactive account handling' },
  // Secure Development
  'SD-001': { clauseId: 'Art.25(1)', clauseTitle: 'Privacy by design training' },
  'SD-002': { clauseId: 'Art.25(1)', clauseTitle: 'Secure coding for privacy' },
  'SD-003': { clauseId: 'Art.25(1)', clauseTitle: 'Privacy code review' },
  'SD-004': { clauseId: 'Art.25(1)', clauseTitle: 'Vulnerability prevention' },
  'SD-005': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Security testing' },
  'SD-006': { clauseId: 'Art.25(1)', clauseTitle: 'Application security' },
  'SD-007': { clauseId: 'Art.25(1)', clauseTitle: 'Environment separation' },
  'SD-008': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Test data pseudonymisation' },
  'SD-009': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Production access' },
  'SD-010': { clauseId: 'Art.25(1)', clauseTitle: 'Privacy by design lifecycle' },
  'SD-011': { clauseId: 'Art.25(1)', clauseTitle: 'Input validation' },
  'SD-012': { clauseId: 'Art.25(1)', clauseTitle: 'Output handling' },
  'SD-013': { clauseId: 'Art.32(1)(b)', clauseTitle: 'Injection prevention' },
  'SD-014': { clauseId: 'Art.32(1)(b)', clauseTitle: 'XSS prevention' },
  'SD-015': { clauseId: 'Art.32(1)(d)', clauseTitle: 'Penetration testing' },
  // Privacy
  'PV-001': { clauseId: 'Art.5(1)(c)', clauseTitle: 'Data minimisation' },
  'PV-002': { clauseId: 'Art.5(1)(e)', clauseTitle: 'Storage limitation' },
  'PV-003': { clauseId: 'Art.12', clauseTitle: 'Transparent communication' },
  'PV-004': { clauseId: 'Art.17', clauseTitle: 'Right to erasure' },
  'PV-005': { clauseId: 'Art.17(2)', clauseTitle: 'Erasure notification' },
  'PV-006': { clauseId: 'Art.13', clauseTitle: 'Information provision' },
  'PV-007': { clauseId: 'Art.32(1)(a)', clauseTitle: 'Pseudonymisation' },
  'PV-008': { clauseId: 'Art.28', clauseTitle: 'Third party processing' },
  'PV-009': { clauseId: 'Art.25(2)', clauseTitle: 'Data protection by default' },
  'PV-010': { clauseId: 'Art.13', clauseTitle: 'Privacy notice' },
  'PV-011': { clauseId: 'Art.24', clauseTitle: 'Controller responsibility' },
  'PV-012': { clauseId: 'Art.32', clauseTitle: 'Security of processing' },
  'PV-013': { clauseId: 'Art.30', clauseTitle: 'Processing records' },
  'PV-014': { clauseId: 'Art.24(1)', clauseTitle: 'Policy review' },
  'PV-015': { clauseId: 'Art.29', clauseTitle: 'Processing under authority' },
};

// Function to add PCI DSS and GDPR mappings to a control
function addMappings(controlBlock, controlId) {
  const domain = controlId.split('-')[0];

  // Get the appropriate PCI DSS mapping
  let pciMapping = detailedPciDss[controlId] || pciDssMappings[domain];
  let gdprMapping = detailedGdpr[controlId] || gdprMappings[domain];

  if (!pciMapping || !gdprMapping) {
    console.log(`Warning: No mapping found for ${controlId}`);
    return controlBlock;
  }

  // Check if mappings already exist
  if (controlBlock.includes("frameworkId: 'PCIDSS'")) {
    return controlBlock; // Already has mappings
  }

  // Find the closing bracket of frameworkMappings array
  const mappingsMatch = controlBlock.match(/(\s*\],\s*\n\s*keywords:)/);
  if (!mappingsMatch) {
    console.log(`Warning: Could not find frameworkMappings end for ${controlId}`);
    return controlBlock;
  }

  // Insert the new mappings before the closing bracket
  const pciLine = `      { frameworkId: 'PCIDSS', clauseId: '${pciMapping.clauseId}', clauseTitle: '${pciMapping.clauseTitle}' },\n`;
  const gdprLine = `      { frameworkId: 'GDPR', clauseId: '${gdprMapping.clauseId}', clauseTitle: '${gdprMapping.clauseTitle}' },\n`;

  const insertPoint = controlBlock.lastIndexOf('    ],\n    keywords:');
  if (insertPoint === -1) {
    // Try alternate format
    const altPoint = controlBlock.lastIndexOf("{ frameworkId: 'NIST'");
    if (altPoint === -1) {
      console.log(`Warning: Could not find insertion point for ${controlId}`);
      return controlBlock;
    }

    // Find the end of the NIST line
    const nistEndMatch = controlBlock.substring(altPoint).match(/\},?\n/);
    if (nistEndMatch) {
      const nistEnd = altPoint + nistEndMatch.index + nistEndMatch[0].length;
      return controlBlock.substring(0, nistEnd) + pciLine + gdprLine + controlBlock.substring(nistEnd);
    }
  }

  return controlBlock;
}

// Process the file
const controlRegex = /(\{\n\s+id: '[A-Z]+-\d+',[\s\S]*?keywords: \[[^\]]*\],?\n\s+\},?)/g;

let match;
let newContent = content;
let processedCount = 0;
let skippedCount = 0;

// Find all controls and add mappings
const controls = content.match(controlRegex);
if (controls) {
  for (const control of controls) {
    const idMatch = control.match(/id: '([A-Z]+-\d+)'/);
    if (idMatch) {
      const controlId = idMatch[1];

      // Check if already has PCI DSS mapping
      if (control.includes("frameworkId: 'PCIDSS'")) {
        skippedCount++;
        continue;
      }

      const domain = controlId.split('-')[0];
      let pciMapping = detailedPciDss[controlId] || pciDssMappings[domain];
      let gdprMapping = detailedGdpr[controlId] || gdprMappings[domain];

      if (!pciMapping || !gdprMapping) {
        console.log(`Warning: No mapping found for ${controlId}`);
        continue;
      }

      // Find the NIST line and add after it
      const nistPattern = /(\{ frameworkId: 'NIST', clauseId: '[^']+', clauseTitle: '[^']+' \},?\n)/;
      const nistMatch = control.match(nistPattern);

      if (nistMatch) {
        const pciLine = `      { frameworkId: 'PCIDSS', clauseId: '${pciMapping.clauseId}', clauseTitle: '${pciMapping.clauseTitle}' },\n`;
        const gdprLine = `      { frameworkId: 'GDPR', clauseId: '${gdprMapping.clauseId}', clauseTitle: '${gdprMapping.clauseTitle}' },\n`;

        const updatedControl = control.replace(nistMatch[0], nistMatch[0] + pciLine + gdprLine);
        newContent = newContent.replace(control, updatedControl);
        processedCount++;
      } else {
        console.log(`Warning: Could not find NIST line for ${controlId}`);
      }
    }
  }
}

// Update the header comment
newContent = newContent.replace(
  'Each control maps to multiple frameworks (SOC2, ISO 27001, HIPAA, NIST)',
  'Each control maps to all 6 frameworks (SOC 2, ISO 27001, HIPAA, NIST, PCI DSS, GDPR)'
);

newContent = newContent.replace(
  'Master control library with 236 controls organized by compliance domains',
  'Master control library with 236 controls mapped to 6 compliance frameworks'
);

// Write the updated content
fs.writeFileSync(controlsPath, newContent, 'utf8');

console.log(`\nProcessing complete!`);
console.log(`- Controls updated with PCI DSS + GDPR mappings: ${processedCount}`);
console.log(`- Controls skipped (already had mappings): ${skippedCount}`);
console.log(`- Total controls: ${processedCount + skippedCount}`);
