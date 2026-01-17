/**
 * NIST Cybersecurity Framework 2.0 - Complete Subcategories
 * 106 subcategories across 6 functions
 */

export interface NISTSubcategory {
  id: string;
  title: string;
}

export interface NISTCategory {
  id: string;
  name: string;
  subcategories: NISTSubcategory[];
}

export interface NISTFunction {
  id: string;
  name: string;
  description: string;
  categories: NISTCategory[];
}

export const NIST_CSF_2_0: NISTFunction[] = [
  {
    id: 'GV',
    name: 'GOVERN',
    description: 'Establish and monitor the organization cybersecurity risk management strategy, expectations, and policy',
    categories: [
      {
        id: 'GV.OC',
        name: 'Organizational Context',
        subcategories: [
          { id: 'GV.OC-01', title: 'The organizational mission is understood and informs cybersecurity risk management' },
          { id: 'GV.OC-02', title: 'Internal and external stakeholders are understood, and their needs and expectations regarding cybersecurity risk management are understood and considered' },
          { id: 'GV.OC-03', title: 'Legal, regulatory, and contractual requirements regarding cybersecurity including privacy and civil liberties obligations are understood and managed' },
          { id: 'GV.OC-04', title: 'Critical objectives, capabilities, and services that stakeholders depend on or expect from the organization are understood and communicated' },
          { id: 'GV.OC-05', title: 'Outcomes, capabilities, and services that the organization depends on are understood and communicated' },
        ],
      },
      {
        id: 'GV.RM',
        name: 'Risk Management Strategy',
        subcategories: [
          { id: 'GV.RM-01', title: 'Risk management objectives are established and agreed to by organizational stakeholders' },
          { id: 'GV.RM-02', title: 'Risk appetite and risk tolerance statements are established, communicated, and maintained' },
          { id: 'GV.RM-03', title: 'Cybersecurity risk management activities and outcomes are included in enterprise risk management processes' },
          { id: 'GV.RM-04', title: 'Strategic direction that describes appropriate risk response options is established and communicated' },
          { id: 'GV.RM-05', title: 'Lines of communication across the organization are established for cybersecurity risks' },
          { id: 'GV.RM-06', title: 'A standardized method for calculating, documenting, categorizing, and prioritizing cybersecurity risks is established and communicated' },
          { id: 'GV.RM-07', title: 'Strategic opportunities are characterized and are included in the cybersecurity risk management strategy' },
        ],
      },
      {
        id: 'GV.RR',
        name: 'Roles, Responsibilities, and Authorities',
        subcategories: [
          { id: 'GV.RR-01', title: 'Organizational leadership is responsible and accountable for cybersecurity risk and fosters a culture that is risk-aware, ethical, and continually improving' },
          { id: 'GV.RR-02', title: 'Roles, responsibilities, and authorities related to cybersecurity risk management are established, communicated, understood, and enforced' },
          { id: 'GV.RR-03', title: 'Adequate resources are allocated commensurate with the cybersecurity risk strategy, roles, responsibilities, and policies' },
          { id: 'GV.RR-04', title: 'Cybersecurity is included in human resources practices' },
        ],
      },
      {
        id: 'GV.PO',
        name: 'Policy',
        subcategories: [
          { id: 'GV.PO-01', title: 'Policy for managing cybersecurity risks is established based on organizational context, cybersecurity strategy, and priorities and is communicated and enforced' },
          { id: 'GV.PO-02', title: 'Policy for managing cybersecurity risks is reviewed, updated, communicated, and enforced to reflect changes in requirements, threats, technology, and organizational mission' },
        ],
      },
      {
        id: 'GV.OV',
        name: 'Oversight',
        subcategories: [
          { id: 'GV.OV-01', title: 'Cybersecurity risk management strategy outcomes are reviewed to inform and adjust strategy and direction' },
          { id: 'GV.OV-02', title: 'The cybersecurity risk management strategy is reviewed and adjusted to ensure coverage of organizational requirements and risks' },
          { id: 'GV.OV-03', title: 'Organizational cybersecurity risk management performance is evaluated and reviewed for adjustments needed' },
        ],
      },
      {
        id: 'GV.SC',
        name: 'Cybersecurity Supply Chain Risk Management',
        subcategories: [
          { id: 'GV.SC-01', title: 'A cybersecurity supply chain risk management program, strategy, objectives, policies, and processes are established and agreed to by organizational stakeholders' },
          { id: 'GV.SC-02', title: 'Cybersecurity roles and responsibilities for suppliers, customers, and partners are established, communicated, and coordinated internally and externally' },
          { id: 'GV.SC-03', title: 'Cybersecurity supply chain risk management is integrated into cybersecurity and enterprise risk management' },
          { id: 'GV.SC-04', title: 'Suppliers are known and prioritized by criticality' },
          { id: 'GV.SC-05', title: 'Requirements to address cybersecurity risks in supply chains are established, prioritized, and integrated into contracts and other agreements' },
          { id: 'GV.SC-06', title: 'Planning and due diligence are performed to reduce risks before entering into formal supplier or other third-party relationships' },
          { id: 'GV.SC-07', title: 'The risks posed by a supplier, their products and services, and other third parties are identified, recorded, prioritized, assessed, responded to, and monitored' },
          { id: 'GV.SC-08', title: 'Relevant suppliers and other third parties are included in incident planning, response, and recovery activities' },
          { id: 'GV.SC-09', title: 'Supply chain security practices are integrated into cybersecurity and enterprise risk management programs' },
          { id: 'GV.SC-10', title: 'Cybersecurity supply chain risk management plans include provisions for activities that occur after the conclusion of a partnership or service agreement' },
        ],
      },
    ],
  },
  {
    id: 'ID',
    name: 'IDENTIFY',
    description: 'Understand the organization current cybersecurity risk posture',
    categories: [
      {
        id: 'ID.AM',
        name: 'Asset Management',
        subcategories: [
          { id: 'ID.AM-01', title: 'Inventories of hardware managed by the organization are maintained' },
          { id: 'ID.AM-02', title: 'Inventories of software, services, and systems managed by the organization are maintained' },
          { id: 'ID.AM-03', title: 'Representations of the organization authorized network communication and internal and external network data flows are maintained' },
          { id: 'ID.AM-04', title: 'Inventories of services provided by suppliers are maintained' },
          { id: 'ID.AM-05', title: 'Assets are prioritized based on classification, criticality, resources, and impact on the mission' },
          { id: 'ID.AM-07', title: 'Inventories of data and corresponding metadata for designated data types are maintained' },
          { id: 'ID.AM-08', title: 'Systems, hardware, software, and services are managed throughout their life cycles' },
        ],
      },
      {
        id: 'ID.RA',
        name: 'Risk Assessment',
        subcategories: [
          { id: 'ID.RA-01', title: 'Vulnerabilities in assets are identified, validated, and recorded' },
          { id: 'ID.RA-02', title: 'Cyber threat intelligence is received from information sharing forums and sources' },
          { id: 'ID.RA-03', title: 'Internal and external threats to the organization are identified and recorded' },
          { id: 'ID.RA-04', title: 'Potential impacts and likelihoods of threats exploiting vulnerabilities are identified and recorded' },
          { id: 'ID.RA-05', title: 'Threats, vulnerabilities, likelihoods, and impacts are used to understand inherent risk and inform risk response prioritization' },
          { id: 'ID.RA-06', title: 'Risk responses are chosen, prioritized, planned, tracked, and communicated' },
          { id: 'ID.RA-07', title: 'Changes and exceptions are managed, assessed for risk impact, recorded, and tracked' },
          { id: 'ID.RA-08', title: 'Processes for receiving, analyzing, and responding to vulnerability disclosures are established' },
          { id: 'ID.RA-09', title: 'The authenticity and integrity of hardware and software are assessed prior to acquisition and use' },
          { id: 'ID.RA-10', title: 'Critical suppliers are assessed prior to acquisition' },
        ],
      },
      {
        id: 'ID.IM',
        name: 'Improvement',
        subcategories: [
          { id: 'ID.IM-01', title: 'Improvements are identified from evaluations' },
          { id: 'ID.IM-02', title: 'Improvements are identified from security tests and exercises, including those done in coordination with suppliers and relevant third parties' },
          { id: 'ID.IM-03', title: 'Improvements are identified from execution of operational processes, procedures, and activities' },
          { id: 'ID.IM-04', title: 'Incident response plans and other cybersecurity plans that affect operations are established, communicated, maintained, and improved' },
        ],
      },
    ],
  },
  {
    id: 'PR',
    name: 'PROTECT',
    description: 'Use safeguards to prevent or reduce cybersecurity risk',
    categories: [
      {
        id: 'PR.AA',
        name: 'Identity Management, Authentication, and Access Control',
        subcategories: [
          { id: 'PR.AA-01', title: 'Identities and credentials for authorized users, services, and hardware are managed by the organization' },
          { id: 'PR.AA-02', title: 'Identities are proofed and bound to credentials based on the context of interactions' },
          { id: 'PR.AA-03', title: 'Users, services, and hardware are authenticated' },
          { id: 'PR.AA-04', title: 'Identity assertions are protected, conveyed, and verified' },
          { id: 'PR.AA-05', title: 'Access permissions, entitlements, and authorizations are defined in a policy, managed, enforced, and reviewed, and incorporate the principles of least privilege and separation of duties' },
          { id: 'PR.AA-06', title: 'Physical access to assets is managed, monitored, and enforced commensurate with risk' },
        ],
      },
      {
        id: 'PR.AT',
        name: 'Awareness and Training',
        subcategories: [
          { id: 'PR.AT-01', title: 'Personnel are provided with awareness and training so that they possess the knowledge and skills to perform general tasks with cybersecurity risks in mind' },
          { id: 'PR.AT-02', title: 'Individuals in specialized roles are provided with awareness and training so that they possess the knowledge and skills to perform relevant tasks with cybersecurity risks in mind' },
        ],
      },
      {
        id: 'PR.DS',
        name: 'Data Security',
        subcategories: [
          { id: 'PR.DS-01', title: 'The confidentiality, integrity, and availability of data-at-rest are protected' },
          { id: 'PR.DS-02', title: 'The confidentiality, integrity, and availability of data-in-transit are protected' },
          { id: 'PR.DS-10', title: 'The confidentiality, integrity, and availability of data-in-use are protected' },
          { id: 'PR.DS-11', title: 'Backups of data are created, protected, maintained, and tested' },
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
          { id: 'PR.PS-05', title: 'Installation and execution of unauthorized software are prevented' },
          { id: 'PR.PS-06', title: 'Secure software development practices are integrated, and their performance is monitored throughout the software development life cycle' },
        ],
      },
      {
        id: 'PR.IR',
        name: 'Technology Infrastructure Resilience',
        subcategories: [
          { id: 'PR.IR-01', title: 'Networks and environments are protected from unauthorized logical access and usage' },
          { id: 'PR.IR-02', title: 'The organization technology assets are protected from environmental threats' },
          { id: 'PR.IR-03', title: 'Mechanisms are implemented to achieve resilience requirements in normal and adverse situations' },
          { id: 'PR.IR-04', title: 'Adequate resource capacity to ensure availability is maintained' },
        ],
      },
    ],
  },
  {
    id: 'DE',
    name: 'DETECT',
    description: 'Find and analyze possible cybersecurity attacks and compromises',
    categories: [
      {
        id: 'DE.CM',
        name: 'Continuous Monitoring',
        subcategories: [
          { id: 'DE.CM-01', title: 'Networks and network services are monitored to find potentially adverse events' },
          { id: 'DE.CM-02', title: 'The physical environment is monitored to find potentially adverse events' },
          { id: 'DE.CM-03', title: 'Personnel activity and technology usage are monitored to find potentially adverse events' },
          { id: 'DE.CM-06', title: 'External service provider activities and services are monitored to find potentially adverse events' },
          { id: 'DE.CM-09', title: 'Computing hardware and software, runtime environments, and their data are monitored to find potentially adverse events' },
        ],
      },
      {
        id: 'DE.AE',
        name: 'Adverse Event Analysis',
        subcategories: [
          { id: 'DE.AE-02', title: 'Potentially adverse events are analyzed to better understand associated activities' },
          { id: 'DE.AE-03', title: 'Information is correlated from multiple sources' },
          { id: 'DE.AE-04', title: 'The estimated impact and scope of adverse events are understood' },
          { id: 'DE.AE-06', title: 'Information on adverse events is provided to authorized staff and tools' },
          { id: 'DE.AE-07', title: 'Cyber threat intelligence and other contextual information are integrated into the analysis' },
          { id: 'DE.AE-08', title: 'Incidents are declared when adverse events meet the defined incident criteria' },
        ],
      },
    ],
  },
  {
    id: 'RS',
    name: 'RESPOND',
    description: 'Take action regarding a detected cybersecurity incident',
    categories: [
      {
        id: 'RS.MA',
        name: 'Incident Management',
        subcategories: [
          { id: 'RS.MA-01', title: 'The incident response plan is executed in coordination with relevant third parties once an incident is declared' },
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
          { id: 'RS.AN-03', title: 'Analysis is performed to establish what has taken place during an incident and the root cause of the incident' },
          { id: 'RS.AN-06', title: 'Actions performed during an investigation are recorded, and the records integrity and provenance are preserved' },
          { id: 'RS.AN-07', title: 'Incident data and metadata are collected, and their integrity and provenance are preserved' },
          { id: 'RS.AN-08', title: 'An incident estimate of magnitude is made' },
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
  {
    id: 'RC',
    name: 'RECOVER',
    description: 'Restore assets and operations that were impacted by a cybersecurity incident',
    categories: [
      {
        id: 'RC.RP',
        name: 'Incident Recovery Plan Execution',
        subcategories: [
          { id: 'RC.RP-01', title: 'The recovery portion of the incident response plan is executed once initiated from the incident response process' },
          { id: 'RC.RP-02', title: 'Recovery actions are selected, scoped, prioritized, and performed' },
          { id: 'RC.RP-03', title: 'The integrity of backups and other restoration assets is verified before using them for restoration' },
          { id: 'RC.RP-04', title: 'Critical mission functions and cybersecurity risk management are considered to establish post-incident operational norms' },
          { id: 'RC.RP-05', title: 'The integrity of restored assets is verified, systems and services are restored, and normal operations are confirmed' },
          { id: 'RC.RP-06', title: 'The end of incident recovery is declared based on criteria, and incident-related documentation is completed' },
        ],
      },
      {
        id: 'RC.CO',
        name: 'Incident Recovery Communication',
        subcategories: [
          { id: 'RC.CO-03', title: 'Recovery activities and progress in restoring operational capabilities are communicated to designated internal and external stakeholders' },
          { id: 'RC.CO-04', title: 'Public updates on incident recovery are shared using approved methods and messaging' },
        ],
      },
    ],
  },
];

export function countNISTSubcategories(): number {
  return NIST_CSF_2_0.reduce((sum, func) =>
    sum + func.categories.reduce((catSum, cat) => catSum + cat.subcategories.length, 0), 0
  );
}

export function getAllNISTSubcategories(): NISTSubcategory[] {
  return NIST_CSF_2_0.flatMap(func =>
    func.categories.flatMap(cat => cat.subcategories)
  );
}
