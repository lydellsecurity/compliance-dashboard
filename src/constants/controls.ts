/**
 * ============================================================================
 * COMPLIANCE ENGINE - CONSTANTS & DATA
 * ============================================================================
 * 
 * Master control library with 236 controls organized by compliance domains
 * Each control maps to multiple frameworks (SOC2, ISO 27001, HIPAA, NIST)
 */

// ============================================================================
// TYPES
// ============================================================================

export type FrameworkId = 'SOC2' | 'ISO27001' | 'HIPAA' | 'NIST';

export type ControlStatus = 'not_started' | 'in_progress' | 'implemented' | 'not_applicable';

export type ComplianceDomain = 
  | 'access_control'
  | 'asset_management'
  | 'risk_assessment'
  | 'security_operations'
  | 'incident_response'
  | 'business_continuity'
  | 'vendor_management'
  | 'data_protection'
  | 'physical_security'
  | 'hr_security'
  | 'change_management'
  | 'compliance_monitoring';

export interface FrameworkMapping {
  frameworkId: FrameworkId;
  clauseId: string;
  clauseTitle: string;
}

export type EffortLevel = 'low' | 'medium' | 'high';
export type ImpactLevel = 'low' | 'medium' | 'high';

export interface MasterControl {
  id: string;
  domain: ComplianceDomain;
  title: string;
  description: string;
  question: string;
  guidance: string;
  whyItMatters?: string;
  evidenceExamples: string[];
  remediationTip: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  effort?: EffortLevel;
  impact?: ImpactLevel;
  frameworkMappings: FrameworkMapping[];
  keywords: string[];
}

export interface CustomControl {
  id: string;
  title: string;
  description: string;
  question: string;
  category: ComplianceDomain;
  frameworkMappings: FrameworkMapping[];
  effort: EffortLevel;
  impact: ImpactLevel;
  createdAt: string;
  createdBy: string;
}

export interface UserResponse {
  controlId: string;
  answer: 'yes' | 'no' | 'partial' | 'na' | null;
  notes: string;
  evidenceUrls: string[];
  evidenceNotes: string;
  answeredAt: string | null;
}

export interface EvidenceItem {
  id: string;
  controlId: string;
  controlTitle: string;
  notes: string;
  fileNames: string[];
  uploadedAt: string;
}

export interface ComplianceDomainMeta {
  id: ComplianceDomain;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface FrameworkMeta {
  id: FrameworkId;
  name: string;
  fullName: string;
  color: string;
  icon: string;
}

// ============================================================================
// FRAMEWORK METADATA
// ============================================================================

export const FRAMEWORKS: FrameworkMeta[] = [
  {
    id: 'SOC2',
    name: 'SOC 2',
    fullName: 'SOC 2 Type II',
    color: '#3B82F6',
    icon: '🛡️',
  },
  {
    id: 'ISO27001',
    name: 'ISO 27001',
    fullName: 'ISO/IEC 27001:2022',
    color: '#10B981',
    icon: '🌐',
  },
  {
    id: 'HIPAA',
    name: 'HIPAA',
    fullName: 'HIPAA Security Rule',
    color: '#8B5CF6',
    icon: '🏥',
  },
  {
    id: 'NIST',
    name: 'NIST CSF',
    fullName: 'NIST Cybersecurity Framework 2.0',
    color: '#F59E0B',
    icon: '🔒',
  },
];

// ============================================================================
// COMPLIANCE DOMAINS
// ============================================================================

export const COMPLIANCE_DOMAINS: ComplianceDomainMeta[] = [
  {
    id: 'access_control',
    title: 'Access Control',
    description: 'User authentication, authorization, and access management',
    icon: '🔐',
    color: '#3B82F6',
  },
  {
    id: 'asset_management',
    title: 'Asset Management',
    description: 'Inventory, classification, and lifecycle management of assets',
    icon: '📦',
    color: '#10B981',
  },
  {
    id: 'risk_assessment',
    title: 'Risk Assessment',
    description: 'Risk identification, analysis, and treatment processes',
    icon: '📊',
    color: '#F59E0B',
  },
  {
    id: 'security_operations',
    title: 'Security Operations',
    description: 'Day-to-day security monitoring and maintenance',
    icon: '👁️',
    color: '#8B5CF6',
  },
  {
    id: 'incident_response',
    title: 'Incident Response',
    description: 'Detection, response, and recovery from security incidents',
    icon: '🚨',
    color: '#EF4444',
  },
  {
    id: 'business_continuity',
    title: 'Business Continuity',
    description: 'Backup, disaster recovery, and continuity planning',
    icon: '🔄',
    color: '#06B6D4',
  },
  {
    id: 'vendor_management',
    title: 'Vendor Management',
    description: 'Third-party risk assessment and management',
    icon: '🤝',
    color: '#EC4899',
  },
  {
    id: 'data_protection',
    title: 'Data Protection',
    description: 'Encryption, data handling, and privacy controls',
    icon: '🔒',
    color: '#14B8A6',
  },
  {
    id: 'physical_security',
    title: 'Physical Security',
    description: 'Facility access and environmental controls',
    icon: '🏢',
    color: '#6366F1',
  },
  {
    id: 'hr_security',
    title: 'HR Security',
    description: 'Employee lifecycle security and awareness training',
    icon: '👥',
    color: '#F97316',
  },
  {
    id: 'change_management',
    title: 'Change Management',
    description: 'Change control and configuration management',
    icon: '🔧',
    color: '#84CC16',
  },
  {
    id: 'compliance_monitoring',
    title: 'Compliance Monitoring',
    description: 'Audit, logging, and compliance verification',
    icon: '📋',
    color: '#A855F7',
  },
];

// ============================================================================
// MASTER CONTROLS (236 controls)
// ============================================================================

export const MASTER_CONTROLS: MasterControl[] = [
  // =========================================
  // ACCESS CONTROL (20 controls)
  // =========================================
  {
    id: 'AC-001',
    domain: 'access_control',
    title: 'Multi-Factor Authentication',
    description: 'Require MFA for all user accounts accessing production systems and sensitive data.',
    question: 'Is multi-factor authentication (MFA) required for all users accessing production systems?',
    guidance: 'MFA should be enforced for all users, especially those with privileged access. Acceptable methods include authenticator apps, hardware tokens, or biometrics. SMS-based OTP is not recommended.',
    evidenceExamples: [
      'Screenshot of identity provider MFA enforcement settings',
      'MFA enrollment report showing 100% coverage',
      'Conditional access policies requiring MFA',
    ],
    remediationTip: 'Enable MFA in your identity provider (Azure AD, Okta, etc.) and set a grace period for users to enroll.',
    riskLevel: 'critical',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Logical Access Security' },
      { frameworkId: 'ISO27001', clauseId: 'A.9.4.2', clauseTitle: 'Secure log-on procedures' },
      { frameworkId: 'HIPAA', clauseId: '164.312(d)', clauseTitle: 'Person or Entity Authentication' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-7', clauseTitle: 'Authentication' },
    ],
    keywords: ['MFA', 'authentication', '2FA', 'multi-factor', 'login'],
  },
  {
    id: 'AC-002',
    domain: 'access_control',
    title: 'Unique User Identification',
    description: 'Each user must have a unique identifier that is not shared with others.',
    question: 'Does each user have a unique identifier (username/email) that is never shared?',
    guidance: 'Shared accounts undermine accountability. Every individual must have their own credentials. Service accounts should be documented and have designated owners.',
    evidenceExamples: [
      'User directory export showing unique identifiers',
      'Policy prohibiting shared accounts',
      'Audit log showing individual accountability',
    ],
    remediationTip: 'Audit your user directory for duplicate or generic accounts. Create a policy explicitly prohibiting shared credentials.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Logical Access Security' },
      { frameworkId: 'ISO27001', clauseId: 'A.9.2.1', clauseTitle: 'User registration and de-registration' },
      { frameworkId: 'HIPAA', clauseId: '164.312(a)(2)(i)', clauseTitle: 'Unique User Identification' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-1', clauseTitle: 'Identity Management' },
    ],
    keywords: ['unique', 'identifier', 'username', 'account', 'shared'],
  },
  {
    id: 'AC-003',
    domain: 'access_control',
    title: 'Role-Based Access Control (RBAC)',
    description: 'Access rights are assigned based on job roles rather than individuals.',
    question: 'Is access to systems and data granted based on defined roles (RBAC)?',
    guidance: 'Define roles that align with job functions. Users should be assigned to roles, not given ad-hoc permissions. Review role assignments periodically.',
    evidenceExamples: [
      'Role matrix documentation',
      'Identity provider role/group configuration',
      'Access review reports',
    ],
    remediationTip: 'Create a role matrix mapping job functions to system access. Implement these roles in your identity provider.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.3', clauseTitle: 'Role-Based Access' },
      { frameworkId: 'ISO27001', clauseId: 'A.9.2.3', clauseTitle: 'Management of privileged access rights' },
      { frameworkId: 'HIPAA', clauseId: '164.312(a)(1)', clauseTitle: 'Access Control' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-4', clauseTitle: 'Access Permissions' },
    ],
    keywords: ['RBAC', 'role', 'permission', 'authorization', 'least privilege'],
  },
  {
    id: 'AC-004',
    domain: 'access_control',
    title: 'Privileged Access Management',
    description: 'Administrative and privileged accounts have enhanced controls and monitoring.',
    question: 'Are privileged accounts (admin, root) subject to enhanced controls and monitoring?',
    guidance: 'Privileged accounts should have additional MFA, just-in-time access, session recording, and regular reviews. Limit the number of privileged users.',
    evidenceExamples: [
      'Privileged access management (PAM) tool configuration',
      'Admin account inventory',
      'Session recording logs',
    ],
    remediationTip: 'Implement a PAM solution or at minimum, enable enhanced logging for admin actions and require approval for privileged access.',
    riskLevel: 'critical',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Logical Access Security' },
      { frameworkId: 'ISO27001', clauseId: 'A.9.2.3', clauseTitle: 'Management of privileged access rights' },
      { frameworkId: 'HIPAA', clauseId: '164.312(a)(1)', clauseTitle: 'Access Control' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-4', clauseTitle: 'Access Permissions' },
    ],
    keywords: ['privileged', 'admin', 'PAM', 'root', 'elevated'],
  },
  {
    id: 'AC-005',
    domain: 'access_control',
    title: 'Access Provisioning Process',
    description: 'Formal process for granting access including approval and documentation.',
    question: 'Is there a documented process for requesting and approving access to systems?',
    guidance: 'Access requests should be documented, approved by data owners or managers, and logged. Self-service portals with approval workflows are ideal.',
    evidenceExamples: [
      'Access request form/workflow',
      'Approval records',
      'Access provisioning procedure document',
    ],
    remediationTip: 'Create an access request form (even a simple ticketing workflow) that requires manager approval before IT grants access.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.2', clauseTitle: 'Access Provisioning' },
      { frameworkId: 'ISO27001', clauseId: 'A.9.2.2', clauseTitle: 'User access provisioning' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(4)', clauseTitle: 'Information Access Management' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-1', clauseTitle: 'Identity Management' },
    ],
    keywords: ['provisioning', 'onboarding', 'access request', 'approval'],
  },
  {
    id: 'AC-006',
    domain: 'access_control',
    title: 'Access De-provisioning (Offboarding)',
    description: 'Timely removal of access when employees leave or change roles.',
    question: 'Is access removed within 24 hours when an employee is terminated or changes roles?',
    guidance: 'Offboarding should be automated where possible. HR and IT must have a coordinated process. All accounts should be disabled, not just primary ones.',
    evidenceExamples: [
      'Offboarding checklist',
      'Termination access removal tickets',
      'Automated de-provisioning logs',
    ],
    remediationTip: 'Create an offboarding checklist that includes all systems. Implement automation between HR system and identity provider.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.2', clauseTitle: 'Access Removal' },
      { frameworkId: 'ISO27001', clauseId: 'A.9.2.6', clauseTitle: 'Removal of access rights' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(3)(ii)(C)', clauseTitle: 'Termination Procedures' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-1', clauseTitle: 'Identity Management' },
    ],
    keywords: ['offboarding', 'termination', 'de-provisioning', 'access removal'],
  },
  {
    id: 'AC-007',
    domain: 'access_control',
    title: 'Periodic Access Reviews',
    description: 'Regular review of user access rights to ensure appropriateness.',
    question: 'Are user access rights reviewed at least quarterly?',
    guidance: 'Access reviews should involve data/system owners, not just IT. Reviews should cover both regular and privileged access. Document findings and remediations.',
    evidenceExamples: [
      'Access review schedule',
      'Completed access review reports',
      'Remediation tickets from access reviews',
    ],
    remediationTip: 'Set calendar reminders for quarterly access reviews. Use your identity provider\'s access certification features if available.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.2', clauseTitle: 'Access Review' },
      { frameworkId: 'ISO27001', clauseId: 'A.9.2.5', clauseTitle: 'Review of user access rights' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(4)(ii)(C)', clauseTitle: 'Access Review' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-1', clauseTitle: 'Identity Management' },
    ],
    keywords: ['access review', 'recertification', 'periodic', 'audit'],
  },
  {
    id: 'AC-008',
    domain: 'access_control',
    title: 'Password Policy',
    description: 'Strong password requirements including complexity, length, and rotation.',
    question: 'Is a password policy enforced with minimum length of 12+ characters and complexity requirements?',
    guidance: 'Modern guidance (NIST 800-63B) recommends long passphrases over complex short passwords. Avoid forced rotation unless compromise suspected. Check passwords against breach databases.',
    evidenceExamples: [
      'Password policy document',
      'Identity provider password configuration',
      'Password complexity enforcement screenshot',
    ],
    remediationTip: 'Configure your identity provider to require 12+ character passwords. Consider implementing a password manager for your organization.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Logical Access Security' },
      { frameworkId: 'ISO27001', clauseId: 'A.9.4.3', clauseTitle: 'Password management system' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(5)(ii)(D)', clauseTitle: 'Password Management' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-7', clauseTitle: 'Authentication' },
    ],
    keywords: ['password', 'passphrase', 'complexity', 'credential'],
  },
  {
    id: 'AC-009',
    domain: 'access_control',
    title: 'Session Timeout',
    description: 'Automatic session termination after period of inactivity.',
    question: 'Do sessions automatically timeout after 15 minutes of inactivity?',
    guidance: 'Session timeouts prevent unauthorized access when users step away. Adjust timeout duration based on data sensitivity. Consider different policies for different applications.',
    evidenceExamples: [
      'Application session timeout configuration',
      'Workstation lock policy (GPO/MDM)',
      'Session management policy',
    ],
    remediationTip: 'Configure session timeouts in your applications and workstation policies. Use MDM/GPO to enforce screen locks.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Logical Access Security' },
      { frameworkId: 'ISO27001', clauseId: 'A.9.4.2', clauseTitle: 'Secure log-on procedures' },
      { frameworkId: 'HIPAA', clauseId: '164.312(a)(2)(iii)', clauseTitle: 'Automatic Logoff' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-7', clauseTitle: 'Authentication' },
    ],
    keywords: ['timeout', 'session', 'idle', 'lock', 'inactivity'],
  },
  {
    id: 'AC-010',
    domain: 'access_control',
    title: 'Account Lockout',
    description: 'Accounts are locked after multiple failed login attempts.',
    question: 'Are accounts locked after 5 or fewer failed login attempts?',
    guidance: 'Account lockout protects against brute force attacks. Balance security with usability. Consider progressive delays or CAPTCHA as alternatives.',
    evidenceExamples: [
      'Identity provider lockout configuration',
      'Failed login attempt logs',
      'Account lockout policy',
    ],
    remediationTip: 'Configure account lockout in your identity provider. Set lockout duration (15-30 minutes) or require admin unlock.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Logical Access Security' },
      { frameworkId: 'ISO27001', clauseId: 'A.9.4.2', clauseTitle: 'Secure log-on procedures' },
      { frameworkId: 'HIPAA', clauseId: '164.312(a)(1)', clauseTitle: 'Access Control' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-7', clauseTitle: 'Authentication' },
    ],
    keywords: ['lockout', 'brute force', 'failed login', 'attempts'],
  },
  {
    id: 'AC-011',
    domain: 'access_control',
    title: 'Single Sign-On (SSO)',
    description: 'Centralized authentication for all enterprise applications.',
    question: 'Is single sign-on (SSO) implemented for all enterprise applications?',
    guidance: 'SSO reduces password fatigue and improves security visibility. Prioritize high-risk and frequently used applications. Use SAML or OIDC standards.',
    evidenceExamples: [
      'SSO application inventory',
      'Identity provider SSO configuration',
      'SSO coverage report',
    ],
    remediationTip: 'Inventory your applications and prioritize SSO integration for those handling sensitive data. Most SaaS apps support SAML SSO.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Logical Access Security' },
      { frameworkId: 'ISO27001', clauseId: 'A.9.4.2', clauseTitle: 'Secure log-on procedures' },
      { frameworkId: 'HIPAA', clauseId: '164.312(d)', clauseTitle: 'Person or Entity Authentication' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-7', clauseTitle: 'Authentication' },
    ],
    keywords: ['SSO', 'single sign-on', 'SAML', 'OIDC', 'federation'],
  },
  {
    id: 'AC-012',
    domain: 'access_control',
    title: 'Network Segmentation',
    description: 'Network is segmented to limit lateral movement and contain breaches.',
    question: 'Is your network segmented with separate zones for production, development, and corporate systems?',
    guidance: 'Segmentation limits blast radius of breaches. Use VLANs, firewalls, or cloud VPCs. Zero trust approaches further reduce implicit trust.',
    evidenceExamples: [
      'Network diagram showing segmentation',
      'Firewall rule documentation',
      'VPC/subnet configuration',
    ],
    remediationTip: 'Create separate network segments for different environments. Implement firewall rules between segments.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.6', clauseTitle: 'Boundary Protection' },
      { frameworkId: 'ISO27001', clauseId: 'A.13.1.3', clauseTitle: 'Segregation in networks' },
      { frameworkId: 'HIPAA', clauseId: '164.312(e)(1)', clauseTitle: 'Transmission Security' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-5', clauseTitle: 'Network Integrity' },
    ],
    keywords: ['segmentation', 'VLAN', 'firewall', 'network', 'zones'],
  },
  {
    id: 'AC-013',
    domain: 'access_control',
    title: 'VPN for Remote Access',
    description: 'Secure VPN required for remote access to internal resources.',
    question: 'Is VPN or zero-trust network access required for remote access to internal resources?',
    guidance: 'Remote access should be encrypted and authenticated. Consider zero-trust alternatives to traditional VPN. Log all remote access sessions.',
    evidenceExamples: [
      'VPN configuration documentation',
      'Remote access policy',
      'VPN connection logs',
    ],
    remediationTip: 'Implement a VPN solution with MFA. Consider zero-trust network access (ZTNA) for more granular control.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.6', clauseTitle: 'Boundary Protection' },
      { frameworkId: 'ISO27001', clauseId: 'A.13.2.1', clauseTitle: 'Information transfer policies' },
      { frameworkId: 'HIPAA', clauseId: '164.312(e)(1)', clauseTitle: 'Transmission Security' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-3', clauseTitle: 'Remote Access' },
    ],
    keywords: ['VPN', 'remote', 'ZTNA', 'tunnel', 'secure access'],
  },
  {
    id: 'AC-014',
    domain: 'access_control',
    title: 'Service Account Management',
    description: 'Service accounts have designated owners and are regularly reviewed.',
    question: 'Are all service accounts documented with designated owners and reviewed regularly?',
    guidance: 'Service accounts are often overlooked. Each should have an owner, documented purpose, and regular credential rotation. Avoid using service accounts for interactive login.',
    evidenceExamples: [
      'Service account inventory',
      'Service account review logs',
      'Service account credential rotation evidence',
    ],
    remediationTip: 'Create a service account inventory spreadsheet. Assign owners and set review reminders. Use secrets management tools.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Logical Access Security' },
      { frameworkId: 'ISO27001', clauseId: 'A.9.2.3', clauseTitle: 'Management of privileged access rights' },
      { frameworkId: 'HIPAA', clauseId: '164.312(a)(1)', clauseTitle: 'Access Control' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-1', clauseTitle: 'Identity Management' },
    ],
    keywords: ['service account', 'non-human', 'API key', 'credentials'],
  },
  {
    id: 'AC-015',
    domain: 'access_control',
    title: 'Database Access Control',
    description: 'Database access is restricted and logged.',
    question: 'Is direct database access restricted to authorized personnel only with all queries logged?',
    guidance: 'Limit direct database access. Use application-layer access where possible. Log all queries, especially for sensitive data. Use separate credentials for each admin.',
    evidenceExamples: [
      'Database user access list',
      'Database audit logs',
      'Database access control policy',
    ],
    remediationTip: 'Enable database auditing. Restrict direct access to DBAs only. Use application service accounts for app access.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Logical Access Security' },
      { frameworkId: 'ISO27001', clauseId: 'A.9.4.1', clauseTitle: 'Information access restriction' },
      { frameworkId: 'HIPAA', clauseId: '164.312(b)', clauseTitle: 'Audit Controls' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-4', clauseTitle: 'Access Permissions' },
    ],
    keywords: ['database', 'SQL', 'query', 'DBA', 'data access'],
  },
  {
    id: 'AC-016',
    domain: 'access_control',
    title: 'Cloud Console Access',
    description: 'Cloud management console access is restricted and monitored.',
    question: 'Is cloud console (AWS/Azure/GCP) access restricted with MFA and activity logging?',
    guidance: 'Cloud console access provides significant power. Require MFA, use IAM policies to restrict permissions, enable CloudTrail/Activity Log, and review access regularly.',
    evidenceExamples: [
      'Cloud IAM policy documentation',
      'CloudTrail/Activity Log configuration',
      'Cloud console user list',
    ],
    remediationTip: 'Enable MFA for all cloud console users. Configure IAM with least privilege. Enable CloudTrail or equivalent logging.',
    riskLevel: 'critical',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Logical Access Security' },
      { frameworkId: 'ISO27001', clauseId: 'A.9.2.3', clauseTitle: 'Management of privileged access rights' },
      { frameworkId: 'HIPAA', clauseId: '164.312(a)(1)', clauseTitle: 'Access Control' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-4', clauseTitle: 'Access Permissions' },
    ],
    keywords: ['cloud', 'AWS', 'Azure', 'GCP', 'console', 'IAM'],
  },
  {
    id: 'AC-017',
    domain: 'access_control',
    title: 'API Authentication',
    description: 'APIs require authentication and use secure token mechanisms.',
    question: 'Do all APIs require authentication using secure methods (OAuth, API keys with rotation)?',
    guidance: 'All APIs should require authentication. Use OAuth 2.0 or API keys with regular rotation. Avoid embedding credentials in code. Use rate limiting.',
    evidenceExamples: [
      'API authentication configuration',
      'API key rotation policy',
      'OAuth implementation documentation',
    ],
    remediationTip: 'Audit your APIs for authentication requirements. Implement OAuth 2.0 for user-facing APIs. Use secrets management for API keys.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Logical Access Security' },
      { frameworkId: 'ISO27001', clauseId: 'A.9.4.2', clauseTitle: 'Secure log-on procedures' },
      { frameworkId: 'HIPAA', clauseId: '164.312(d)', clauseTitle: 'Person or Entity Authentication' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-7', clauseTitle: 'Authentication' },
    ],
    keywords: ['API', 'OAuth', 'token', 'authentication', 'REST'],
  },
  {
    id: 'AC-018',
    domain: 'access_control',
    title: 'Mobile Device Management',
    description: 'Mobile devices accessing corporate data are managed and secured.',
    question: 'Are mobile devices that access corporate data enrolled in MDM with security policies?',
    guidance: 'MDM enables remote wipe, enforces passcodes, and controls app installation. Consider MAM (Mobile App Management) for BYOD scenarios.',
    evidenceExamples: [
      'MDM enrollment report',
      'MDM security policy configuration',
      'Mobile device policy document',
    ],
    remediationTip: 'Deploy an MDM solution (Intune, Jamf, etc.). Create device compliance policies. Require enrollment before granting email/app access.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.7', clauseTitle: 'Mobile Device Security' },
      { frameworkId: 'ISO27001', clauseId: 'A.6.2.1', clauseTitle: 'Mobile device policy' },
      { frameworkId: 'HIPAA', clauseId: '164.312(d)', clauseTitle: 'Device and Media Controls' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-3', clauseTitle: 'Remote Access' },
    ],
    keywords: ['MDM', 'mobile', 'BYOD', 'device', 'smartphone'],
  },
  {
    id: 'AC-019',
    domain: 'access_control',
    title: 'Guest/Visitor Network',
    description: 'Separate network for guests that is isolated from corporate resources.',
    question: 'Is there a separate, isolated guest WiFi network for visitors?',
    guidance: 'Guest networks should be completely isolated from corporate networks. Use separate SSIDs, VLANs, and internet breakout. Monitor for unauthorized access attempts.',
    evidenceExamples: [
      'Network diagram showing guest isolation',
      'Guest network configuration',
      'Firewall rules between guest and corporate',
    ],
    remediationTip: 'Create a separate VLAN for guest WiFi. Ensure no routing to corporate networks. Use a different internet connection if possible.',
    riskLevel: 'low',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.6', clauseTitle: 'Boundary Protection' },
      { frameworkId: 'ISO27001', clauseId: 'A.13.1.3', clauseTitle: 'Segregation in networks' },
      { frameworkId: 'HIPAA', clauseId: '164.312(e)(1)', clauseTitle: 'Transmission Security' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-5', clauseTitle: 'Network Integrity' },
    ],
    keywords: ['guest', 'WiFi', 'visitor', 'isolation', 'network'],
  },
  {
    id: 'AC-020',
    domain: 'access_control',
    title: 'Emergency Access Procedure',
    description: 'Documented process for emergency access in crisis situations.',
    question: 'Is there a documented emergency access ("break glass") procedure for crisis situations?',
    guidance: 'Emergency access procedures ensure operations can continue during crises. Document the process, secure emergency credentials, and require post-incident review.',
    evidenceExamples: [
      'Emergency access procedure document',
      'Break glass account documentation',
      'Emergency access audit logs',
    ],
    remediationTip: 'Create a documented break glass procedure. Store emergency credentials securely (sealed envelope, password vault). Test annually.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Logical Access Security' },
      { frameworkId: 'ISO27001', clauseId: 'A.9.2.3', clauseTitle: 'Management of privileged access rights' },
      { frameworkId: 'HIPAA', clauseId: '164.312(a)(2)(ii)', clauseTitle: 'Emergency Access Procedure' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-4', clauseTitle: 'Access Permissions' },
    ],
    keywords: ['emergency', 'break glass', 'crisis', 'contingency'],
  },

  // =========================================
  // ASSET MANAGEMENT (18 controls)
  // =========================================
  {
    id: 'AM-001',
    domain: 'asset_management',
    title: 'Asset Inventory',
    description: 'Complete inventory of all hardware, software, and data assets.',
    question: 'Is a complete inventory maintained of all hardware, software, and data assets?',
    guidance: 'Asset inventory should include hardware (servers, endpoints, network devices), software (applications, licenses), and data repositories. Update automatically where possible.',
    evidenceExamples: [
      'Asset inventory spreadsheet or tool export',
      'Configuration management database (CMDB)',
      'Automated discovery tool reports',
    ],
    remediationTip: 'Start with an automated discovery scan. Use asset management tools (ServiceNow, Snipe-IT) to maintain the inventory.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Asset Management' },
      { frameworkId: 'ISO27001', clauseId: 'A.8.1.1', clauseTitle: 'Inventory of assets' },
      { frameworkId: 'HIPAA', clauseId: '164.310(d)(1)', clauseTitle: 'Device and Media Controls' },
      { frameworkId: 'NIST', clauseId: 'ID.AM-1', clauseTitle: 'Asset Management' },
    ],
    keywords: ['inventory', 'asset', 'CMDB', 'hardware', 'software'],
  },
  {
    id: 'AM-002',
    domain: 'asset_management',
    title: 'Data Classification',
    description: 'Data is classified based on sensitivity and handled accordingly.',
    question: 'Is data classified into categories (Public, Internal, Confidential, Restricted) with handling requirements?',
    guidance: 'Classification enables appropriate handling. Define categories, labeling requirements, and handling procedures for each level. Train employees on classification.',
    evidenceExamples: [
      'Data classification policy',
      'Classification labels/tags in systems',
      'Training records on data handling',
    ],
    remediationTip: 'Create a data classification policy with 3-4 levels. Train employees on how to classify and label data. Use DLP tools to enforce.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Data Classification' },
      { frameworkId: 'ISO27001', clauseId: 'A.8.2.1', clauseTitle: 'Classification of information' },
      { frameworkId: 'HIPAA', clauseId: '164.312(e)(2)(ii)', clauseTitle: 'Encryption' },
      { frameworkId: 'NIST', clauseId: 'ID.AM-5', clauseTitle: 'Resource Classification' },
    ],
    keywords: ['classification', 'labeling', 'sensitivity', 'data handling'],
  },
  {
    id: 'AM-003',
    domain: 'asset_management',
    title: 'Asset Ownership',
    description: 'Each asset has a designated owner responsible for its security.',
    question: 'Does every critical asset have a designated owner responsible for its security?',
    guidance: 'Ownership creates accountability. Owners should approve access, participate in risk assessments, and ensure appropriate controls. Document ownership in asset inventory.',
    evidenceExamples: [
      'Asset inventory with owner field populated',
      'Ownership assignment documentation',
      'System owner acknowledgment forms',
    ],
    remediationTip: 'Add an "Owner" field to your asset inventory. Assign owners to all systems and data repositories. Have owners formally acknowledge.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Asset Ownership' },
      { frameworkId: 'ISO27001', clauseId: 'A.8.1.2', clauseTitle: 'Ownership of assets' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(2)', clauseTitle: 'Assigned Security Responsibility' },
      { frameworkId: 'NIST', clauseId: 'ID.AM-6', clauseTitle: 'Roles and Responsibilities' },
    ],
    keywords: ['ownership', 'accountability', 'steward', 'custodian'],
  },
  {
    id: 'AM-004',
    domain: 'asset_management',
    title: 'Software License Management',
    description: 'Software licenses are tracked and compliance maintained.',
    question: 'Are software licenses tracked with compliance verified regularly?',
    guidance: 'Track all software licenses including SaaS subscriptions. Verify compliance (not over/under licensed). Manage renewals and true-ups.',
    evidenceExamples: [
      'License management tool report',
      'Software inventory with license counts',
      'License compliance audit results',
    ],
    remediationTip: 'Create a license inventory spreadsheet. Track license counts vs. installations. Set renewal reminders.',
    riskLevel: 'low',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.8', clauseTitle: 'Software Management' },
      { frameworkId: 'ISO27001', clauseId: 'A.8.1.1', clauseTitle: 'Inventory of assets' },
      { frameworkId: 'HIPAA', clauseId: '164.310(d)(1)', clauseTitle: 'Device and Media Controls' },
      { frameworkId: 'NIST', clauseId: 'ID.AM-2', clauseTitle: 'Software Inventory' },
    ],
    keywords: ['license', 'software', 'SaaS', 'compliance', 'subscription'],
  },
  {
    id: 'AM-005',
    domain: 'asset_management',
    title: 'Hardware Lifecycle Management',
    description: 'Hardware is tracked from procurement through secure disposal.',
    question: 'Is hardware tracked through its entire lifecycle including secure disposal?',
    guidance: 'Track hardware from purchase through disposal. Include warranty, maintenance, and end-of-life dates. Ensure secure data destruction before disposal.',
    evidenceExamples: [
      'Hardware asset register',
      'Disposal certificates',
      'Hardware lifecycle documentation',
    ],
    remediationTip: 'Add lifecycle fields to your asset inventory (purchase date, warranty, EOL). Create a disposal procedure with data destruction verification.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.5', clauseTitle: 'Asset Disposal' },
      { frameworkId: 'ISO27001', clauseId: 'A.8.3.2', clauseTitle: 'Disposal of media' },
      { frameworkId: 'HIPAA', clauseId: '164.310(d)(2)', clauseTitle: 'Media Disposal' },
      { frameworkId: 'NIST', clauseId: 'PR.DS-3', clauseTitle: 'Asset Disposal' },
    ],
    keywords: ['lifecycle', 'disposal', 'EOL', 'hardware', 'decommission'],
  },
  {
    id: 'AM-006',
    domain: 'asset_management',
    title: 'Cloud Resource Inventory',
    description: 'Cloud resources are inventoried and tagged appropriately.',
    question: 'Are all cloud resources inventoried and tagged with owner, environment, and data classification?',
    guidance: 'Use resource tagging for organization, cost allocation, and security. Enforce tagging policies. Include owner, environment, data classification, and project.',
    evidenceExamples: [
      'Cloud resource inventory (AWS Resource Groups, Azure Resource Graph)',
      'Tagging policy documentation',
      'Tag compliance report',
    ],
    remediationTip: 'Define a tagging standard. Use cloud-native tools to enforce required tags. Run regular compliance checks.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Asset Management' },
      { frameworkId: 'ISO27001', clauseId: 'A.8.1.1', clauseTitle: 'Inventory of assets' },
      { frameworkId: 'HIPAA', clauseId: '164.310(d)(1)', clauseTitle: 'Device and Media Controls' },
      { frameworkId: 'NIST', clauseId: 'ID.AM-1', clauseTitle: 'Asset Management' },
    ],
    keywords: ['cloud', 'tagging', 'resources', 'AWS', 'Azure', 'inventory'],
  },
  {
    id: 'AM-007',
    domain: 'asset_management',
    title: 'Data Flow Mapping',
    description: 'Data flows are documented showing where sensitive data moves.',
    question: 'Are data flows documented showing how sensitive data moves through your systems?',
    guidance: 'Data flow diagrams help identify protection requirements at each point. Include data sources, processing, storage, and transmission paths.',
    evidenceExamples: [
      'Data flow diagrams',
      'System architecture documentation',
      'Data processing records (GDPR Article 30)',
    ],
    remediationTip: 'Create diagrams showing how customer/sensitive data flows through your systems. Identify protection mechanisms at each point.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC2.1', clauseTitle: 'System Components' },
      { frameworkId: 'ISO27001', clauseId: 'A.8.2.3', clauseTitle: 'Handling of assets' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(1)(ii)(A)', clauseTitle: 'Risk Analysis' },
      { frameworkId: 'NIST', clauseId: 'ID.AM-3', clauseTitle: 'Data Flow' },
    ],
    keywords: ['data flow', 'diagram', 'mapping', 'sensitive data'],
  },
  {
    id: 'AM-008',
    domain: 'asset_management',
    title: 'Endpoint Detection & Response',
    description: 'EDR/antimalware deployed on all endpoints.',
    question: 'Is endpoint detection and response (EDR) or antimalware software deployed on all endpoints?',
    guidance: 'Deploy EDR on all workstations and servers. Ensure definitions are updated and alerts are monitored. Consider managed detection and response (MDR).',
    evidenceExamples: [
      'EDR deployment report showing coverage',
      'EDR console screenshots',
      'Endpoint protection policy',
    ],
    remediationTip: 'Deploy EDR solution (CrowdStrike, SentinelOne, Defender ATP). Verify 100% coverage. Monitor the console for alerts.',
    riskLevel: 'critical',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.8', clauseTitle: 'Malware Protection' },
      { frameworkId: 'ISO27001', clauseId: 'A.12.2.1', clauseTitle: 'Controls against malware' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(5)(ii)(B)', clauseTitle: 'Protection from Malicious Software' },
      { frameworkId: 'NIST', clauseId: 'DE.CM-4', clauseTitle: 'Malware Detection' },
    ],
    keywords: ['EDR', 'antivirus', 'antimalware', 'endpoint', 'protection'],
  },
  {
    id: 'AM-009',
    domain: 'asset_management',
    title: 'Patch Management',
    description: 'Systems are patched regularly with critical patches applied promptly.',
    question: 'Are systems patched regularly with critical/high severity patches applied within 14 days?',
    guidance: 'Define patching SLAs based on severity. Automate where possible. Test patches before production deployment. Track patching compliance.',
    evidenceExamples: [
      'Patch management policy',
      'Patching compliance reports',
      'Vulnerability scan showing patch status',
    ],
    remediationTip: 'Implement patch management tooling (WSUS, SCCM, Automox). Define SLAs: Critical=7 days, High=14 days, Medium=30 days.',
    riskLevel: 'critical',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.8', clauseTitle: 'System Hardening' },
      { frameworkId: 'ISO27001', clauseId: 'A.12.6.1', clauseTitle: 'Management of technical vulnerabilities' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(5)(ii)(B)', clauseTitle: 'Protection from Malicious Software' },
      { frameworkId: 'NIST', clauseId: 'PR.IP-12', clauseTitle: 'Vulnerability Management' },
    ],
    keywords: ['patch', 'update', 'vulnerability', 'WSUS', 'patching'],
  },
  {
    id: 'AM-010',
    domain: 'asset_management',
    title: 'Secure Configuration Baseline',
    description: 'Systems are configured according to security hardening standards.',
    question: 'Are systems configured according to documented security hardening standards (CIS Benchmarks)?',
    guidance: 'Use industry standards like CIS Benchmarks. Create baseline configurations for each system type. Verify compliance regularly.',
    evidenceExamples: [
      'Hardening standards documentation',
      'CIS benchmark compliance reports',
      'System configuration audit results',
    ],
    remediationTip: 'Adopt CIS Benchmarks for your systems. Use configuration management tools to enforce and verify compliance.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.8', clauseTitle: 'System Hardening' },
      { frameworkId: 'ISO27001', clauseId: 'A.12.5.1', clauseTitle: 'Installation of software' },
      { frameworkId: 'HIPAA', clauseId: '164.312(a)(1)', clauseTitle: 'Access Control' },
      { frameworkId: 'NIST', clauseId: 'PR.IP-1', clauseTitle: 'Security Configuration' },
    ],
    keywords: ['hardening', 'CIS', 'baseline', 'configuration', 'secure'],
  },
  // ... continuing with more controls for other domains
  {
    id: 'AM-011',
    domain: 'asset_management',
    title: 'Removable Media Controls',
    description: 'USB and removable media usage is controlled and monitored.',
    question: 'Is removable media (USB drives) usage controlled with encryption requirements?',
    guidance: 'Restrict unauthorized USB devices. Require encryption for any approved removable media. Log usage for forensic purposes.',
    evidenceExamples: [
      'USB control policy',
      'Device control configuration (DLP/EDR)',
      'Approved device list',
    ],
    remediationTip: 'Configure EDR or DLP to block unauthorized USB devices. Allow only approved, encrypted devices.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.7', clauseTitle: 'Media Controls' },
      { frameworkId: 'ISO27001', clauseId: 'A.8.3.1', clauseTitle: 'Management of removable media' },
      { frameworkId: 'HIPAA', clauseId: '164.310(d)(1)', clauseTitle: 'Device and Media Controls' },
      { frameworkId: 'NIST', clauseId: 'PR.DS-3', clauseTitle: 'Media Protection' },
    ],
    keywords: ['USB', 'removable', 'media', 'DLP', 'device control'],
  },

  // =========================================
  // RISK ASSESSMENT (15 controls)
  // =========================================
  {
    id: 'RA-001',
    domain: 'risk_assessment',
    title: 'Annual Risk Assessment',
    description: 'Comprehensive risk assessment conducted annually.',
    question: 'Is a comprehensive risk assessment conducted at least annually?',
    guidance: 'Annual risk assessments should identify threats, vulnerabilities, and impacts. Use a consistent methodology (NIST, ISO 31000). Involve stakeholders from across the organization.',
    evidenceExamples: [
      'Risk assessment report',
      'Risk register',
      'Risk assessment methodology documentation',
    ],
    remediationTip: 'Schedule annual risk assessments. Use a GRC tool or spreadsheet to track risks. Include IT, operations, and business stakeholders.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC3.1', clauseTitle: 'Risk Assessment' },
      { frameworkId: 'ISO27001', clauseId: 'A.6.1.2', clauseTitle: 'Information security risk assessment' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(1)(ii)(A)', clauseTitle: 'Risk Analysis' },
      { frameworkId: 'NIST', clauseId: 'ID.RA', clauseTitle: 'Risk Assessment' },
    ],
    keywords: ['risk assessment', 'annual', 'threat', 'vulnerability', 'risk register'],
  },
  {
    id: 'RA-002',
    domain: 'risk_assessment',
    title: 'Risk Treatment Plan',
    description: 'Identified risks have documented treatment plans.',
    question: 'Do all identified risks have documented treatment plans (mitigate, transfer, accept, avoid)?',
    guidance: 'Each risk should have a treatment decision and action plan. Track treatment progress. Management must accept residual risk.',
    evidenceExamples: [
      'Risk treatment plan document',
      'Risk register with treatment status',
      'Risk acceptance forms',
    ],
    remediationTip: 'For each risk in your register, document the treatment decision and action items. Assign owners and due dates.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC3.2', clauseTitle: 'Risk Treatment' },
      { frameworkId: 'ISO27001', clauseId: 'A.6.1.3', clauseTitle: 'Information security risk treatment' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(1)(ii)(B)', clauseTitle: 'Risk Management' },
      { frameworkId: 'NIST', clauseId: 'ID.RA-6', clauseTitle: 'Risk Response' },
    ],
    keywords: ['treatment', 'mitigation', 'risk response', 'accept', 'transfer'],
  },
  {
    id: 'RA-003',
    domain: 'risk_assessment',
    title: 'Vulnerability Scanning',
    description: 'Regular vulnerability scans of infrastructure and applications.',
    question: 'Are vulnerability scans conducted at least monthly on all production systems?',
    guidance: 'Scan internal and external systems. Include network, host, and web application scans. Remediate findings based on severity SLAs.',
    evidenceExamples: [
      'Vulnerability scan reports',
      'Scan schedule documentation',
      'Remediation tracking evidence',
    ],
    remediationTip: 'Deploy vulnerability scanning tools (Nessus, Qualys, Rapid7). Schedule weekly/monthly scans. Create remediation workflows.',
    riskLevel: 'critical',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC4.1', clauseTitle: 'Vulnerability Management' },
      { frameworkId: 'ISO27001', clauseId: 'A.12.6.1', clauseTitle: 'Management of technical vulnerabilities' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(8)', clauseTitle: 'Evaluation' },
      { frameworkId: 'NIST', clauseId: 'ID.RA-1', clauseTitle: 'Vulnerability Identification' },
    ],
    keywords: ['vulnerability', 'scan', 'Nessus', 'Qualys', 'CVE'],
  },
  {
    id: 'RA-004',
    domain: 'risk_assessment',
    title: 'Penetration Testing',
    description: 'Annual penetration testing by qualified third party.',
    question: 'Is penetration testing conducted annually by a qualified third party?',
    guidance: 'Annual pen tests should cover external, internal, and application security. Use qualified testers. Remediate critical/high findings promptly.',
    evidenceExamples: [
      'Penetration test report',
      'Tester qualifications/certifications',
      'Remediation evidence for findings',
    ],
    remediationTip: 'Engage a reputable penetration testing firm. Define scope to include critical systems. Plan for remediation sprints.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC4.1', clauseTitle: 'Penetration Testing' },
      { frameworkId: 'ISO27001', clauseId: 'A.12.6.1', clauseTitle: 'Management of technical vulnerabilities' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(8)', clauseTitle: 'Evaluation' },
      { frameworkId: 'NIST', clauseId: 'ID.RA-1', clauseTitle: 'Threat Testing' },
    ],
    keywords: ['penetration', 'pentest', 'ethical hacking', 'red team'],
  },
  {
    id: 'RA-005',
    domain: 'risk_assessment',
    title: 'Threat Intelligence',
    description: 'Threat intelligence is collected and used to inform risk decisions.',
    question: 'Is threat intelligence gathered and used to inform security decisions?',
    guidance: 'Subscribe to threat intel feeds relevant to your industry. Review emerging threats. Update controls based on threat landscape.',
    evidenceExamples: [
      'Threat intelligence sources/subscriptions',
      'Threat briefing records',
      'Control updates based on threats',
    ],
    remediationTip: 'Subscribe to CISA alerts, industry ISACs, and vendor threat feeds. Hold regular threat review meetings.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC3.1', clauseTitle: 'Threat Assessment' },
      { frameworkId: 'ISO27001', clauseId: 'A.5.7', clauseTitle: 'Threat intelligence' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(1)(ii)(A)', clauseTitle: 'Risk Analysis' },
      { frameworkId: 'NIST', clauseId: 'ID.RA-2', clauseTitle: 'Threat Intelligence' },
    ],
    keywords: ['threat', 'intelligence', 'ISAC', 'CTI', 'emerging threats'],
  },

  // =========================================
  // SECURITY OPERATIONS (20 controls)
  // =========================================
  {
    id: 'SO-001',
    domain: 'security_operations',
    title: 'Security Monitoring (SIEM)',
    description: 'Centralized security monitoring and alerting.',
    question: 'Is a SIEM or centralized logging solution deployed with 24/7 alert monitoring?',
    guidance: 'Collect logs from all critical systems. Define use cases and alerts. Ensure alerts are reviewed and investigated promptly.',
    evidenceExamples: [
      'SIEM configuration documentation',
      'Log source inventory',
      'Alert investigation procedures',
    ],
    remediationTip: 'Deploy a SIEM solution (Splunk, Sentinel, Elastic). Define critical log sources. Create detection rules for common attacks.',
    riskLevel: 'critical',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC7.2', clauseTitle: 'Security Monitoring' },
      { frameworkId: 'ISO27001', clauseId: 'A.12.4.1', clauseTitle: 'Event logging' },
      { frameworkId: 'HIPAA', clauseId: '164.312(b)', clauseTitle: 'Audit Controls' },
      { frameworkId: 'NIST', clauseId: 'DE.CM', clauseTitle: 'Security Continuous Monitoring' },
    ],
    keywords: ['SIEM', 'monitoring', 'logging', 'alerts', 'SOC'],
  },
  {
    id: 'SO-002',
    domain: 'security_operations',
    title: 'Log Retention',
    description: 'Security logs are retained for required periods.',
    question: 'Are security logs retained for at least 12 months?',
    guidance: 'Retain logs for compliance requirements and forensic investigation. Consider longer retention for critical systems. Ensure logs are tamper-evident.',
    evidenceExamples: [
      'Log retention policy',
      'Log storage configuration showing retention',
      'Archived log samples',
    ],
    remediationTip: 'Configure log retention in your SIEM/log management. Use cold storage for long-term retention. Document retention requirements.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC7.2', clauseTitle: 'Log Retention' },
      { frameworkId: 'ISO27001', clauseId: 'A.12.4.1', clauseTitle: 'Event logging' },
      { frameworkId: 'HIPAA', clauseId: '164.312(b)', clauseTitle: 'Audit Controls' },
      { frameworkId: 'NIST', clauseId: 'PR.PT-1', clauseTitle: 'Audit Records' },
    ],
    keywords: ['retention', 'logs', 'archive', 'storage', 'forensic'],
  },
  {
    id: 'SO-003',
    domain: 'security_operations',
    title: 'Intrusion Detection/Prevention',
    description: 'IDS/IPS deployed to detect and prevent network attacks.',
    question: 'Is intrusion detection/prevention (IDS/IPS) deployed at network boundaries?',
    guidance: 'Deploy IDS/IPS at network perimeters and critical segments. Keep signatures updated. Monitor alerts and tune to reduce false positives.',
    evidenceExamples: [
      'IDS/IPS configuration',
      'Alert logs',
      'Signature update evidence',
    ],
    remediationTip: 'Enable IPS features on your firewall or deploy dedicated IDS. Subscribe to signature updates. Monitor and tune alerts.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.6', clauseTitle: 'Network Security' },
      { frameworkId: 'ISO27001', clauseId: 'A.13.1.1', clauseTitle: 'Network controls' },
      { frameworkId: 'HIPAA', clauseId: '164.312(e)(1)', clauseTitle: 'Transmission Security' },
      { frameworkId: 'NIST', clauseId: 'DE.CM-1', clauseTitle: 'Network Monitoring' },
    ],
    keywords: ['IDS', 'IPS', 'intrusion', 'detection', 'network'],
  },

  // =========================================
  // INCIDENT RESPONSE (15 controls)
  // =========================================
  {
    id: 'IR-001',
    domain: 'incident_response',
    title: 'Incident Response Plan',
    description: 'Documented incident response plan with defined procedures.',
    question: 'Is there a documented incident response plan with defined roles, procedures, and escalation paths?',
    guidance: 'The IRP should cover detection, containment, eradication, recovery, and lessons learned. Define roles and contact information. Include communication templates.',
    evidenceExamples: [
      'Incident response plan document',
      'Roles and responsibilities matrix',
      'Contact list and escalation procedures',
    ],
    remediationTip: 'Create an IRP based on NIST SP 800-61. Define your incident response team. Include playbooks for common incident types.',
    riskLevel: 'critical',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC7.4', clauseTitle: 'Incident Response' },
      { frameworkId: 'ISO27001', clauseId: 'A.5.24', clauseTitle: 'Information security incident management' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(6)', clauseTitle: 'Security Incident Procedures' },
      { frameworkId: 'NIST', clauseId: 'RS.RP-1', clauseTitle: 'Response Planning' },
    ],
    keywords: ['incident response', 'IRP', 'playbook', 'breach', 'escalation'],
  },
  {
    id: 'IR-002',
    domain: 'incident_response',
    title: 'Incident Response Testing',
    description: 'Regular testing of incident response procedures.',
    question: 'Is the incident response plan tested at least annually through tabletop exercises?',
    guidance: 'Conduct tabletop exercises with realistic scenarios. Include technical and management stakeholders. Document findings and update the plan.',
    evidenceExamples: [
      'Tabletop exercise documentation',
      'Post-exercise improvement actions',
      'Exercise schedule',
    ],
    remediationTip: 'Schedule annual tabletop exercises. Use realistic scenarios relevant to your business. Involve executives and technical staff.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC7.5', clauseTitle: 'Incident Response Testing' },
      { frameworkId: 'ISO27001', clauseId: 'A.5.24', clauseTitle: 'Information security incident management' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(7)(ii)(D)', clauseTitle: 'Testing and Revision' },
      { frameworkId: 'NIST', clauseId: 'RS.RP-1', clauseTitle: 'Response Planning' },
    ],
    keywords: ['tabletop', 'exercise', 'testing', 'drill', 'simulation'],
  },

  // =========================================
  // BUSINESS CONTINUITY (12 controls)
  // =========================================
  {
    id: 'BC-001',
    domain: 'business_continuity',
    title: 'Business Continuity Plan',
    description: 'Documented business continuity and disaster recovery plans.',
    question: 'Is there a documented business continuity plan covering critical business functions?',
    guidance: 'BCP should identify critical functions, RTO/RPO requirements, and recovery procedures. Include contact information and alternative processing sites.',
    evidenceExamples: [
      'Business continuity plan document',
      'Business impact analysis',
      'RTO/RPO documentation',
    ],
    remediationTip: 'Conduct a business impact analysis. Create recovery procedures for critical functions. Document RTO/RPO for each system.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'A1.2', clauseTitle: 'Business Continuity' },
      { frameworkId: 'ISO27001', clauseId: 'A.5.29', clauseTitle: 'ICT readiness for business continuity' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(7)', clauseTitle: 'Contingency Plan' },
      { frameworkId: 'NIST', clauseId: 'PR.IP-9', clauseTitle: 'Recovery Plans' },
    ],
    keywords: ['BCP', 'continuity', 'disaster', 'recovery', 'RTO', 'RPO'],
  },
  {
    id: 'BC-002',
    domain: 'business_continuity',
    title: 'Data Backup',
    description: 'Regular automated backups of critical data and systems.',
    question: 'Are critical systems backed up regularly with backups tested for recoverability?',
    guidance: 'Implement 3-2-1 backup strategy: 3 copies, 2 media types, 1 offsite. Test restores regularly. Ensure backup encryption.',
    evidenceExamples: [
      'Backup configuration documentation',
      'Backup completion reports',
      'Restore test results',
    ],
    remediationTip: 'Implement automated backups for all critical systems. Test restores monthly. Store backups offsite or in different cloud region.',
    riskLevel: 'critical',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'A1.2', clauseTitle: 'Data Backup' },
      { frameworkId: 'ISO27001', clauseId: 'A.8.13', clauseTitle: 'Information backup' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(7)(ii)(A)', clauseTitle: 'Data Backup Plan' },
      { frameworkId: 'NIST', clauseId: 'PR.IP-4', clauseTitle: 'Backup' },
    ],
    keywords: ['backup', 'restore', '3-2-1', 'offsite', 'recovery'],
  },

  // =========================================
  // VENDOR MANAGEMENT (10 controls)
  // =========================================
  {
    id: 'VM-001',
    domain: 'vendor_management',
    title: 'Vendor Risk Assessment',
    description: 'Third-party vendors are assessed for security risks.',
    question: 'Are vendors assessed for security risks before engagement and periodically thereafter?',
    guidance: 'Assess vendors based on data access and criticality. Review SOC 2 reports, security questionnaires, or conduct assessments. Reassess annually.',
    evidenceExamples: [
      'Vendor risk assessment questionnaire',
      'Vendor SOC 2 reports',
      'Vendor inventory with risk ratings',
    ],
    remediationTip: 'Create a vendor inventory. Categorize by risk (based on data access). Collect SOC 2 reports or send security questionnaires.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC9.2', clauseTitle: 'Vendor Management' },
      { frameworkId: 'ISO27001', clauseId: 'A.5.19', clauseTitle: 'Information security in supplier relationships' },
      { frameworkId: 'HIPAA', clauseId: '164.308(b)(1)', clauseTitle: 'Business Associate Contracts' },
      { frameworkId: 'NIST', clauseId: 'ID.SC-2', clauseTitle: 'Supply Chain Risk' },
    ],
    keywords: ['vendor', 'third-party', 'supplier', 'assessment', 'SOC 2'],
  },
  {
    id: 'VM-002',
    domain: 'vendor_management',
    title: 'Vendor Contracts',
    description: 'Security requirements in vendor contracts.',
    question: 'Do vendor contracts include security requirements, data protection clauses, and right to audit?',
    guidance: 'Contracts should include security obligations, data handling requirements, breach notification, and audit rights. Include BAAs for HIPAA if applicable.',
    evidenceExamples: [
      'Contract template with security clauses',
      'Signed vendor agreements',
      'Business Associate Agreements (if HIPAA)',
    ],
    remediationTip: 'Add security addendum to your standard contract. Include data protection, breach notification, and audit clauses.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC9.2', clauseTitle: 'Vendor Contracts' },
      { frameworkId: 'ISO27001', clauseId: 'A.5.20', clauseTitle: 'Addressing security within supplier agreements' },
      { frameworkId: 'HIPAA', clauseId: '164.308(b)(1)', clauseTitle: 'Business Associate Contracts' },
      { frameworkId: 'NIST', clauseId: 'ID.SC-3', clauseTitle: 'Supply Chain Contracts' },
    ],
    keywords: ['contract', 'agreement', 'BAA', 'SLA', 'terms'],
  },

  // =========================================
  // DATA PROTECTION (18 controls)
  // =========================================
  {
    id: 'DP-001',
    domain: 'data_protection',
    title: 'Encryption at Rest',
    description: 'Sensitive data is encrypted when stored.',
    question: 'Is all sensitive data encrypted at rest using AES-256 or equivalent?',
    guidance: 'Encrypt databases, file storage, and backups. Use AES-256 or equivalent. Manage encryption keys securely. Consider field-level encryption for highly sensitive data.',
    evidenceExamples: [
      'Encryption configuration screenshots',
      'Key management documentation',
      'Data encryption policy',
    ],
    remediationTip: 'Enable encryption at rest for all databases and storage. Use cloud-native encryption (AWS KMS, Azure Key Vault). Document key management.',
    riskLevel: 'critical',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Data Encryption' },
      { frameworkId: 'ISO27001', clauseId: 'A.8.24', clauseTitle: 'Use of cryptography' },
      { frameworkId: 'HIPAA', clauseId: '164.312(a)(2)(iv)', clauseTitle: 'Encryption' },
      { frameworkId: 'NIST', clauseId: 'PR.DS-1', clauseTitle: 'Data-at-Rest Protection' },
    ],
    keywords: ['encryption', 'AES', 'at rest', 'KMS', 'cryptography'],
  },
  {
    id: 'DP-002',
    domain: 'data_protection',
    title: 'Encryption in Transit',
    description: 'Data is encrypted during transmission.',
    question: 'Is all data encrypted in transit using TLS 1.2 or higher?',
    guidance: 'Use TLS 1.2+ for all data transmission. Disable older protocols. Use HTTPS everywhere. Consider mutual TLS for service-to-service communication.',
    evidenceExamples: [
      'TLS configuration documentation',
      'SSL Labs scan results',
      'Certificate management evidence',
    ],
    remediationTip: 'Configure all services to use TLS 1.2+. Run SSL Labs tests. Disable TLS 1.0/1.1. Implement HSTS.',
    riskLevel: 'critical',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.1', clauseTitle: 'Transmission Encryption' },
      { frameworkId: 'ISO27001', clauseId: 'A.8.24', clauseTitle: 'Use of cryptography' },
      { frameworkId: 'HIPAA', clauseId: '164.312(e)(2)(ii)', clauseTitle: 'Encryption' },
      { frameworkId: 'NIST', clauseId: 'PR.DS-2', clauseTitle: 'Data-in-Transit Protection' },
    ],
    keywords: ['TLS', 'HTTPS', 'transit', 'SSL', 'transport'],
  },
  {
    id: 'DP-003',
    domain: 'data_protection',
    title: 'Data Loss Prevention',
    description: 'DLP controls to prevent unauthorized data exfiltration.',
    question: 'Are data loss prevention (DLP) controls implemented to prevent sensitive data exfiltration?',
    guidance: 'Implement DLP for email, cloud storage, and endpoints. Define rules for sensitive data patterns (SSN, credit cards, PHI). Monitor and alert on violations.',
    evidenceExamples: [
      'DLP policy configuration',
      'DLP alert reports',
      'Sensitive data patterns defined',
    ],
    remediationTip: 'Deploy DLP in your email gateway and cloud apps (O365 DLP, Google DLP). Create rules for sensitive data patterns.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.7', clauseTitle: 'Data Protection' },
      { frameworkId: 'ISO27001', clauseId: 'A.8.12', clauseTitle: 'Data leakage prevention' },
      { frameworkId: 'HIPAA', clauseId: '164.312(e)(1)', clauseTitle: 'Transmission Security' },
      { frameworkId: 'NIST', clauseId: 'PR.DS-5', clauseTitle: 'Data Leak Protection' },
    ],
    keywords: ['DLP', 'data loss', 'exfiltration', 'leakage', 'prevention'],
  },

  // =========================================
  // PHYSICAL SECURITY (8 controls)
  // =========================================
  {
    id: 'PS-001',
    domain: 'physical_security',
    title: 'Physical Access Control',
    description: 'Physical access to facilities is controlled.',
    question: 'Is physical access to office and data center facilities controlled with badge/key card systems?',
    guidance: 'Use badge access for all entry points. Log access events. Review access lists regularly. Consider multi-factor for sensitive areas.',
    evidenceExamples: [
      'Badge access system configuration',
      'Access control logs',
      'Physical access review records',
    ],
    remediationTip: 'Implement badge access for all doors. Review access lists quarterly. Enable logging for all access events.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.4', clauseTitle: 'Physical Access' },
      { frameworkId: 'ISO27001', clauseId: 'A.7.2', clauseTitle: 'Physical entry' },
      { frameworkId: 'HIPAA', clauseId: '164.310(a)(1)', clauseTitle: 'Facility Access Controls' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-2', clauseTitle: 'Physical Access' },
    ],
    keywords: ['badge', 'physical', 'access', 'facility', 'door'],
  },
  {
    id: 'PS-002',
    domain: 'physical_security',
    title: 'Visitor Management',
    description: 'Visitors are logged and escorted.',
    question: 'Are visitors logged, badged, and escorted while on premises?',
    guidance: 'Sign in all visitors. Issue temporary badges. Require escort in sensitive areas. Maintain visitor logs for review.',
    evidenceExamples: [
      'Visitor log book or system',
      'Visitor badge procedures',
      'Escort policy documentation',
    ],
    remediationTip: 'Create a visitor sign-in process. Issue temporary badges. Define areas where escort is required.',
    riskLevel: 'low',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC6.4', clauseTitle: 'Visitor Access' },
      { frameworkId: 'ISO27001', clauseId: 'A.7.2', clauseTitle: 'Physical entry' },
      { frameworkId: 'HIPAA', clauseId: '164.310(a)(2)(iii)', clauseTitle: 'Access Control and Validation' },
      { frameworkId: 'NIST', clauseId: 'PR.AC-2', clauseTitle: 'Physical Access' },
    ],
    keywords: ['visitor', 'escort', 'badge', 'guest', 'sign-in'],
  },

  // =========================================
  // HR SECURITY (10 controls)
  // =========================================
  {
    id: 'HR-001',
    domain: 'hr_security',
    title: 'Background Checks',
    description: 'Background checks for employees with access to sensitive data.',
    question: 'Are background checks conducted for employees with access to sensitive data or systems?',
    guidance: 'Conduct background checks appropriate to role sensitivity. Include criminal, employment, and education verification as appropriate. Document policy.',
    evidenceExamples: [
      'Background check policy',
      'Background check completion records',
      'Vendor agreement for background services',
    ],
    remediationTip: 'Define roles requiring background checks. Partner with a background check vendor. Include in onboarding process.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC1.4', clauseTitle: 'Background Verification' },
      { frameworkId: 'ISO27001', clauseId: 'A.6.1', clauseTitle: 'Screening' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(3)(ii)(B)', clauseTitle: 'Workforce Clearance' },
      { frameworkId: 'NIST', clauseId: 'PR.IP-11', clauseTitle: 'Human Resources Security' },
    ],
    keywords: ['background', 'check', 'screening', 'verification', 'hiring'],
  },
  {
    id: 'HR-002',
    domain: 'hr_security',
    title: 'Security Awareness Training',
    description: 'Annual security awareness training for all employees.',
    question: 'Do all employees complete security awareness training annually?',
    guidance: 'Training should cover phishing, social engineering, data handling, and reporting. Track completion. Consider role-specific training for higher-risk roles.',
    evidenceExamples: [
      'Training completion records',
      'Training content/curriculum',
      'Training policy document',
    ],
    remediationTip: 'Implement security awareness platform (KnowBe4, Proofpoint). Require annual completion. Include phishing simulations.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC1.4', clauseTitle: 'Security Training' },
      { frameworkId: 'ISO27001', clauseId: 'A.6.3', clauseTitle: 'Information security awareness' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(5)', clauseTitle: 'Security Awareness Training' },
      { frameworkId: 'NIST', clauseId: 'PR.AT-1', clauseTitle: 'Awareness and Training' },
    ],
    keywords: ['training', 'awareness', 'phishing', 'education', 'KnowBe4'],
  },

  // =========================================
  // CHANGE MANAGEMENT (10 controls)
  // =========================================
  {
    id: 'CM-001',
    domain: 'change_management',
    title: 'Change Management Process',
    description: 'Formal change management process for production systems.',
    question: 'Is there a formal change management process requiring approval before production changes?',
    guidance: 'All production changes should be documented, reviewed, approved, and tested. Include rollback plans. Track changes for audit purposes.',
    evidenceExamples: [
      'Change management policy',
      'Change request tickets',
      'Change approval records',
    ],
    remediationTip: 'Create a change management policy. Use ticketing system for change requests. Require manager/peer approval.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC8.1', clauseTitle: 'Change Management' },
      { frameworkId: 'ISO27001', clauseId: 'A.8.32', clauseTitle: 'Change management' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(8)', clauseTitle: 'Evaluation' },
      { frameworkId: 'NIST', clauseId: 'PR.IP-3', clauseTitle: 'Configuration Change Control' },
    ],
    keywords: ['change', 'management', 'approval', 'CAB', 'release'],
  },
  {
    id: 'CM-002',
    domain: 'change_management',
    title: 'Code Review',
    description: 'Code changes are reviewed before deployment.',
    question: 'Are all code changes peer-reviewed before deployment to production?',
    guidance: 'Require pull request reviews. Include security considerations in review. Block direct commits to main branches. Consider automated code scanning.',
    evidenceExamples: [
      'Pull request policy',
      'Sample pull requests with reviews',
      'Branch protection rules',
    ],
    remediationTip: 'Enable branch protection requiring reviews. Create PR templates including security checklist. Train developers on secure code review.',
    riskLevel: 'high',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC8.1', clauseTitle: 'Development Review' },
      { frameworkId: 'ISO27001', clauseId: 'A.8.25', clauseTitle: 'Secure development lifecycle' },
      { frameworkId: 'HIPAA', clauseId: '164.312(a)(1)', clauseTitle: 'Access Control' },
      { frameworkId: 'NIST', clauseId: 'PR.IP-2', clauseTitle: 'SDLC Security' },
    ],
    keywords: ['code review', 'pull request', 'peer review', 'SDLC'],
  },

  // =========================================
  // COMPLIANCE MONITORING (10 controls)
  // =========================================
  {
    id: 'MO-001',
    domain: 'compliance_monitoring',
    title: 'Internal Audit',
    description: 'Regular internal audits of security controls.',
    question: 'Are internal audits of security controls conducted at least annually?',
    guidance: 'Internal audits verify control effectiveness. Cover all domains over a cycle. Document findings and track remediation.',
    evidenceExamples: [
      'Internal audit schedule',
      'Audit reports',
      'Remediation tracking evidence',
    ],
    remediationTip: 'Create an annual internal audit plan. Assign internal auditors or engage third party. Track findings to closure.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC4.2', clauseTitle: 'Internal Audit' },
      { frameworkId: 'ISO27001', clauseId: 'A.5.35', clauseTitle: 'Independent review' },
      { frameworkId: 'HIPAA', clauseId: '164.308(a)(8)', clauseTitle: 'Evaluation' },
      { frameworkId: 'NIST', clauseId: 'ID.GV-3', clauseTitle: 'Compliance' },
    ],
    keywords: ['audit', 'internal', 'review', 'assessment', 'evaluation'],
  },
  {
    id: 'MO-002',
    domain: 'compliance_monitoring',
    title: 'Policy Review',
    description: 'Security policies reviewed and updated annually.',
    question: 'Are security policies reviewed and updated at least annually?',
    guidance: 'Annual policy review ensures policies remain current. Include version control and approval tracking. Communicate updates to employees.',
    evidenceExamples: [
      'Policy review schedule',
      'Policy version history',
      'Policy approval records',
    ],
    remediationTip: 'Create a policy review calendar. Assign policy owners. Track versions and approvals in document management system.',
    riskLevel: 'medium',
    frameworkMappings: [
      { frameworkId: 'SOC2', clauseId: 'CC5.3', clauseTitle: 'Policy Management' },
      { frameworkId: 'ISO27001', clauseId: 'A.5.1', clauseTitle: 'Policies for information security' },
      { frameworkId: 'HIPAA', clauseId: '164.316(b)(2)(iii)', clauseTitle: 'Updates' },
      { frameworkId: 'NIST', clauseId: 'ID.GV-1', clauseTitle: 'Policy' },
    ],
    keywords: ['policy', 'review', 'annual', 'update', 'governance'],
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getControlsByDomain(domain: ComplianceDomain): MasterControl[] {
  return MASTER_CONTROLS.filter(c => c.domain === domain);
}

export function getControlById(id: string): MasterControl | undefined {
  return MASTER_CONTROLS.find(c => c.id === id);
}

export function getFrameworkControls(frameworkId: FrameworkId): MasterControl[] {
  return MASTER_CONTROLS.filter(c => 
    c.frameworkMappings.some(m => m.frameworkId === frameworkId)
  );
}

export function calculateFrameworkProgress(
  frameworkId: FrameworkId, 
  responses: Map<string, UserResponse>
): { total: number; completed: number; percentage: number } {
  const frameworkControls = getFrameworkControls(frameworkId);
  const total = frameworkControls.length;
  const completed = frameworkControls.filter(c => {
    const response = responses.get(c.id);
    return response?.answer === 'yes' || response?.answer === 'na';
  }).length;
  
  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function getDomainProgress(
  domain: ComplianceDomain,
  responses: Map<string, UserResponse>
): { total: number; completed: number; percentage: number } {
  const domainControls = getControlsByDomain(domain);
  const total = domainControls.length;
  const completed = domainControls.filter(c => {
    const response = responses.get(c.id);
    // Control is completed if it has a response with any answer (yes, no, partial, or na)
    return response !== undefined && response.answer !== null && response.answer !== undefined;
  }).length;
  
  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
