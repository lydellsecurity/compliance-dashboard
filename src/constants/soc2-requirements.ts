/**
 * SOC 2 Trust Services Criteria - Complete Requirements
 * Based on AICPA 2017 Trust Services Criteria (with 2022 updates)
 */

export interface SOC2Criterion {
  id: string;
  title: string;
  description: string;
  focusPoints?: string[];
}

export interface SOC2Category {
  id: string;
  name: string;
  description: string;
  criteria: SOC2Criterion[];
}

export interface SOC2TrustServiceCategory {
  id: string;
  name: string;
  required: boolean;
  categories: SOC2Category[];
}

export const SOC2_TRUST_SERVICES_CRITERIA: SOC2TrustServiceCategory[] = [
  // SECURITY (Common Criteria) - Required for all SOC 2 reports
  {
    id: 'SECURITY',
    name: 'Security',
    required: true,
    categories: [
      {
        id: 'CC1',
        name: 'Control Environment',
        description: 'The set of standards, processes, and structures that provide the basis for carrying out internal control across the organization',
        criteria: [
          { id: 'CC1.1', title: 'COSO Principle 1: Demonstrates Commitment to Integrity and Ethical Values', description: 'The entity demonstrates a commitment to integrity and ethical values.' },
          { id: 'CC1.2', title: 'COSO Principle 2: Board Independence', description: 'The board of directors demonstrates independence from management and exercises oversight of the development and performance of internal control.' },
          { id: 'CC1.3', title: 'COSO Principle 3: Management Structures', description: 'Management establishes, with board oversight, structures, reporting lines, and appropriate authorities and responsibilities in the pursuit of objectives.' },
          { id: 'CC1.4', title: 'COSO Principle 4: Commitment to Competence', description: 'The entity demonstrates a commitment to attract, develop, and retain competent individuals in alignment with objectives.' },
          { id: 'CC1.5', title: 'COSO Principle 5: Enforces Accountability', description: 'The entity holds individuals accountable for their internal control responsibilities in the pursuit of objectives.' },
        ],
      },
      {
        id: 'CC2',
        name: 'Communication and Information',
        description: 'Information is necessary for the entity to carry out internal control responsibilities',
        criteria: [
          { id: 'CC2.1', title: 'COSO Principle 13: Uses Relevant Information', description: 'The entity obtains or generates and uses relevant, quality information to support the functioning of internal control.' },
          { id: 'CC2.2', title: 'COSO Principle 14: Communicates Internally', description: 'The entity internally communicates information, including objectives and responsibilities for internal control, necessary to support the functioning of internal control.' },
          { id: 'CC2.3', title: 'COSO Principle 15: Communicates Externally', description: 'The entity communicates with external parties regarding matters affecting the functioning of internal control.' },
        ],
      },
      {
        id: 'CC3',
        name: 'Risk Assessment',
        description: 'Risk assessment involves a dynamic and iterative process for identifying and assessing risks to the achievement of objectives',
        criteria: [
          { id: 'CC3.1', title: 'COSO Principle 6: Specifies Suitable Objectives', description: 'The entity specifies objectives with sufficient clarity to enable the identification and assessment of risks relating to objectives.' },
          { id: 'CC3.2', title: 'COSO Principle 7: Identifies and Analyzes Risk', description: 'The entity identifies risks to the achievement of its objectives across the entity and analyzes risks as a basis for determining how the risks should be managed.' },
          { id: 'CC3.3', title: 'COSO Principle 8: Assesses Fraud Risk', description: 'The entity considers the potential for fraud in assessing risks to the achievement of objectives.' },
          { id: 'CC3.4', title: 'COSO Principle 9: Identifies and Analyzes Significant Change', description: 'The entity identifies and assesses changes that could significantly impact the system of internal control.' },
        ],
      },
      {
        id: 'CC4',
        name: 'Monitoring Activities',
        description: 'Ongoing evaluations, separate evaluations, or some combination of the two are used to ascertain whether each of the components of internal control is present and functioning',
        criteria: [
          { id: 'CC4.1', title: 'COSO Principle 16: Ongoing and Separate Evaluations', description: 'The entity selects, develops, and performs ongoing and/or separate evaluations to ascertain whether the components of internal control are present and functioning.' },
          { id: 'CC4.2', title: 'COSO Principle 17: Evaluates and Communicates Deficiencies', description: 'The entity evaluates and communicates internal control deficiencies in a timely manner to those parties responsible for taking corrective action, including senior management and the board of directors, as appropriate.' },
        ],
      },
      {
        id: 'CC5',
        name: 'Control Activities',
        description: 'Control activities are the actions established through policies and procedures that help ensure that management directives to mitigate risks are carried out',
        criteria: [
          { id: 'CC5.1', title: 'COSO Principle 10: Selects and Develops Control Activities', description: 'The entity selects and develops control activities that contribute to the mitigation of risks to the achievement of objectives to acceptable levels.' },
          { id: 'CC5.2', title: 'COSO Principle 11: Technology General Controls', description: 'The entity also selects and develops general control activities over technology to support the achievement of objectives.' },
          { id: 'CC5.3', title: 'COSO Principle 12: Deploys Through Policies and Procedures', description: 'The entity deploys control activities through policies that establish what is expected and procedures that put policies into action.' },
        ],
      },
      {
        id: 'CC6',
        name: 'Logical and Physical Access Controls',
        description: 'Controls over logical and physical access to protect information and system components',
        criteria: [
          { id: 'CC6.1', title: 'Logical Access Security Software', description: 'The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events to meet the entity objectives.' },
          { id: 'CC6.2', title: 'User Registration and Authorization', description: 'Prior to issuing system credentials and granting system access, the entity registers and authorizes new internal and external users whose access is administered by the entity.' },
          { id: 'CC6.3', title: 'Role-Based Access', description: 'The entity authorizes, modifies, or removes access to data, software, functions, and other protected information assets based on roles, responsibilities, or the system design and changes.' },
          { id: 'CC6.4', title: 'Physical Access Restrictions', description: 'The entity restricts physical access to facilities and protected information assets to authorized personnel to meet the entity objectives.' },
          { id: 'CC6.5', title: 'Asset Disposal', description: 'The entity discontinues logical and physical protections over physical assets only after the ability to read or recover data and software from those assets has been diminished.' },
          { id: 'CC6.6', title: 'Security Against External Threats', description: 'The entity implements logical access security measures to protect against threats from sources outside its system boundaries.' },
          { id: 'CC6.7', title: 'Transmission and Movement Restrictions', description: 'The entity restricts the transmission, movement, and removal of information to authorized internal and external users and processes.' },
          { id: 'CC6.8', title: 'Malicious Software Prevention', description: 'The entity implements controls to prevent or detect and act upon the introduction of unauthorized or malicious software to meet the entity objectives.' },
        ],
      },
      {
        id: 'CC7',
        name: 'System Operations',
        description: 'Controls over the management of system operations and security events',
        criteria: [
          { id: 'CC7.1', title: 'Detection and Monitoring', description: 'To meet its objectives, the entity uses detection and monitoring procedures to identify changes to configurations that result in the introduction of new vulnerabilities, and susceptibilities to newly discovered vulnerabilities.' },
          { id: 'CC7.2', title: 'Security Event Monitoring', description: 'The entity monitors system components and the operation of those components for anomalies that are indicative of malicious acts, natural disasters, and errors affecting the entity ability to meet its objectives.' },
          { id: 'CC7.3', title: 'Security Event Evaluation', description: 'The entity evaluates security events to determine whether they could or have resulted in a failure of the entity to meet its objectives (security incidents) and, if so, takes actions to prevent or address such failures.' },
          { id: 'CC7.4', title: 'Incident Response', description: 'The entity responds to identified security incidents by executing a defined incident response program to understand, contain, remediate, and communicate security incidents.' },
          { id: 'CC7.5', title: 'Recovery from Incidents', description: 'The entity identifies, develops, and implements activities to recover from identified security incidents.' },
        ],
      },
      {
        id: 'CC8',
        name: 'Change Management',
        description: 'Controls over the management of system changes',
        criteria: [
          { id: 'CC8.1', title: 'Change Management Process', description: 'The entity authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures to meet its objectives.' },
        ],
      },
      {
        id: 'CC9',
        name: 'Risk Mitigation',
        description: 'Controls related to risk mitigation',
        criteria: [
          { id: 'CC9.1', title: 'Business Disruption Risk Identification', description: 'The entity identifies, selects, and develops risk mitigation activities for risks arising from potential business disruptions.' },
          { id: 'CC9.2', title: 'Vendor and Business Partner Risk', description: 'The entity assesses and manages risks associated with vendors and business partners.' },
        ],
      },
    ],
  },
  // AVAILABILITY - Optional
  {
    id: 'AVAILABILITY',
    name: 'Availability',
    required: false,
    categories: [
      {
        id: 'A1',
        name: 'Availability Criteria',
        description: 'The system is available for operation and use as committed or agreed',
        criteria: [
          { id: 'A1.1', title: 'Availability Commitment', description: 'The entity maintains, monitors, and evaluates current processing capacity and use of system components to manage capacity demand and to enable the implementation of additional capacity to help meet its objectives.' },
          { id: 'A1.2', title: 'Environmental Protections', description: 'The entity authorizes, designs, develops or acquires, implements, operates, approves, maintains, and monitors environmental protections, software, data backup processes, and recovery infrastructure to meet its objectives.' },
          { id: 'A1.3', title: 'Recovery Testing', description: 'The entity tests recovery plan procedures supporting system recovery to meet its objectives.' },
        ],
      },
    ],
  },
  // PROCESSING INTEGRITY - Optional
  {
    id: 'PROCESSING_INTEGRITY',
    name: 'Processing Integrity',
    required: false,
    categories: [
      {
        id: 'PI1',
        name: 'Processing Integrity Criteria',
        description: 'System processing is complete, valid, accurate, timely, and authorized to meet the entity objectives',
        criteria: [
          { id: 'PI1.1', title: 'Processing Specifications', description: 'The entity obtains or generates, uses, and communicates relevant, quality information regarding the objectives related to processing, including definitions of data processed and product and service specifications.' },
          { id: 'PI1.2', title: 'Input Controls', description: 'The entity implements policies and procedures over system inputs, including controls over completeness and accuracy.' },
          { id: 'PI1.3', title: 'Processing Controls', description: 'The entity implements policies and procedures over system processing to ensure processing is complete, accurate, and authorized.' },
          { id: 'PI1.4', title: 'Output Controls', description: 'The entity implements policies and procedures over system outputs, including controls to ensure output is complete and distributed to authorized recipients.' },
          { id: 'PI1.5', title: 'Data Retention', description: 'The entity implements policies and procedures to store inputs, items in processing, and outputs completely, accurately, and timely.' },
        ],
      },
    ],
  },
  // CONFIDENTIALITY - Optional
  {
    id: 'CONFIDENTIALITY',
    name: 'Confidentiality',
    required: false,
    categories: [
      {
        id: 'C1',
        name: 'Confidentiality Criteria',
        description: 'Information designated as confidential is protected to meet the entity objectives',
        criteria: [
          { id: 'C1.1', title: 'Confidential Information Identification', description: 'The entity identifies and maintains confidential information to meet the entity objectives related to confidentiality.' },
          { id: 'C1.2', title: 'Confidential Information Disposal', description: 'The entity disposes of confidential information to meet the entity objectives related to confidentiality.' },
        ],
      },
    ],
  },
  // PRIVACY - Optional
  {
    id: 'PRIVACY',
    name: 'Privacy',
    required: false,
    categories: [
      {
        id: 'P1',
        name: 'Notice',
        description: 'The entity provides notice about its privacy practices',
        criteria: [
          { id: 'P1.1', title: 'Privacy Notice', description: 'The entity provides notice to data subjects about its privacy practices to meet the entity objectives related to privacy.' },
        ],
      },
      {
        id: 'P2',
        name: 'Choice and Consent',
        description: 'The entity obtains consent for the collection, use, and disclosure of personal information',
        criteria: [
          { id: 'P2.1', title: 'Choice and Consent', description: 'The entity communicates choices available regarding the collection, use, retention, disclosure, and disposal of personal information to data subjects.' },
        ],
      },
      {
        id: 'P3',
        name: 'Collection',
        description: 'The entity collects personal information consistent with its objectives',
        criteria: [
          { id: 'P3.1', title: 'Collection for Identified Purposes', description: 'Personal information is collected consistent with the entity objectives related to privacy.' },
          { id: 'P3.2', title: 'Implicit Consent', description: 'For information requiring implicit consent, the entity communicates the consequences of failing to provide personal information or not consenting to the use of personal information.' },
        ],
      },
      {
        id: 'P4',
        name: 'Use, Retention, and Disposal',
        description: 'The entity limits use and retention of personal information and disposes of it appropriately',
        criteria: [
          { id: 'P4.1', title: 'Limited Use', description: 'The entity limits the use of personal information to the purposes identified in the notice and for which the data subject has provided consent.' },
          { id: 'P4.2', title: 'Retention', description: 'The entity retains personal information consistent with the entity objectives related to privacy.' },
          { id: 'P4.3', title: 'Secure Disposal', description: 'The entity securely disposes of personal information to meet the entity objectives related to privacy.' },
        ],
      },
      {
        id: 'P5',
        name: 'Access',
        description: 'The entity provides data subjects with access to their personal information',
        criteria: [
          { id: 'P5.1', title: 'Access to Personal Information', description: 'The entity grants identified and authenticated data subjects the ability to access their stored personal information for review.' },
          { id: 'P5.2', title: 'Correction/Amendment', description: 'The entity provides a mechanism for data subjects to update or correct their personal information.' },
        ],
      },
      {
        id: 'P6',
        name: 'Disclosure and Notification',
        description: 'The entity discloses personal information only for identified purposes',
        criteria: [
          { id: 'P6.1', title: 'Disclosure to Third Parties', description: 'The entity discloses personal information to third parties with the consent of the data subjects.' },
          { id: 'P6.2', title: 'Notification of Changes', description: 'The entity notifies data subjects of changes to its privacy practices.' },
          { id: 'P6.3', title: 'Disclosure for Legal Purposes', description: 'Personal information is disclosed to law enforcement, regulators, and others only in compliance with applicable laws and regulations.' },
          { id: 'P6.4', title: 'Third Party Purpose Limitation', description: 'The entity obtains privacy commitments from vendors and other third parties who have access to personal information.' },
          { id: 'P6.5', title: 'Third Party Complaint Resolution', description: 'The entity obtains commitments from vendors and others to report unauthorized disclosures or breaches.' },
          { id: 'P6.6', title: 'Data Subject Notification', description: 'The entity notifies affected data subjects, regulators, and others of unauthorized disclosures and breaches.' },
          { id: 'P6.7', title: 'Cross-Border Transfers', description: 'The entity provides notice of cross-border transfers and obtains appropriate consents.' },
        ],
      },
      {
        id: 'P7',
        name: 'Quality',
        description: 'The entity maintains accurate, complete, and relevant personal information',
        criteria: [
          { id: 'P7.1', title: 'Data Quality', description: 'The entity collects and maintains accurate, up-to-date, complete, and relevant personal information.' },
        ],
      },
      {
        id: 'P8',
        name: 'Monitoring and Enforcement',
        description: 'The entity monitors compliance with its privacy practices',
        criteria: [
          { id: 'P8.1', title: 'Privacy Compliance Monitoring', description: 'The entity implements a process for receiving, addressing, and resolving inquiries, complaints, and disputes from data subjects.' },
        ],
      },
    ],
  },
];

// Helper functions
export function countSOC2Criteria(): { categories: number; criteria: number } {
  let categories = 0;
  let criteria = 0;

  SOC2_TRUST_SERVICES_CRITERIA.forEach(tsc => {
    tsc.categories.forEach(cat => {
      categories++;
      criteria += cat.criteria.length;
    });
  });

  return { categories, criteria };
}

export function getAllSOC2Criteria(): SOC2Criterion[] {
  const all: SOC2Criterion[] = [];
  SOC2_TRUST_SERVICES_CRITERIA.forEach(tsc => {
    tsc.categories.forEach(cat => {
      cat.criteria.forEach(c => all.push(c));
    });
  });
  return all;
}

export function getRequiredSOC2Criteria(): SOC2Criterion[] {
  const all: SOC2Criterion[] = [];
  SOC2_TRUST_SERVICES_CRITERIA.filter(tsc => tsc.required).forEach(tsc => {
    tsc.categories.forEach(cat => {
      cat.criteria.forEach(c => all.push(c));
    });
  });
  return all;
}
