/**
 * HIPAA Security Rule - Complete Implementation Specifications
 * 45 CFR Part 164 Subpart C
 */

export interface HIPAASpecification {
  id: string;
  title: string;
  type: 'required' | 'addressable';
  description?: string;
}

export interface HIPAAStandard {
  id: string;
  name: string;
  specifications: HIPAASpecification[];
}

export interface HIPAASafeguard {
  id: string;
  name: string;
  section: string;
  standards: HIPAAStandard[];
}

export const HIPAA_SECURITY_RULE: HIPAASafeguard[] = [
  {
    id: 'ADMINISTRATIVE',
    name: 'Administrative Safeguards',
    section: '164.308',
    standards: [
      {
        id: '164.308(a)(1)',
        name: 'Security Management Process',
        specifications: [
          { id: '164.308(a)(1)(ii)(A)', title: 'Risk Analysis', type: 'required' },
          { id: '164.308(a)(1)(ii)(B)', title: 'Risk Management', type: 'required' },
          { id: '164.308(a)(1)(ii)(C)', title: 'Sanction Policy', type: 'required' },
          { id: '164.308(a)(1)(ii)(D)', title: 'Information System Activity Review', type: 'required' },
        ],
      },
      {
        id: '164.308(a)(2)',
        name: 'Assigned Security Responsibility',
        specifications: [
          { id: '164.308(a)(2)', title: 'Assigned Security Responsibility', type: 'required' },
        ],
      },
      {
        id: '164.308(a)(3)',
        name: 'Workforce Security',
        specifications: [
          { id: '164.308(a)(3)(ii)(A)', title: 'Authorization and/or Supervision', type: 'addressable' },
          { id: '164.308(a)(3)(ii)(B)', title: 'Workforce Clearance Procedure', type: 'addressable' },
          { id: '164.308(a)(3)(ii)(C)', title: 'Termination Procedures', type: 'addressable' },
        ],
      },
      {
        id: '164.308(a)(4)',
        name: 'Information Access Management',
        specifications: [
          { id: '164.308(a)(4)(ii)(A)', title: 'Isolating Health Care Clearinghouse Functions', type: 'required' },
          { id: '164.308(a)(4)(ii)(B)', title: 'Access Authorization', type: 'addressable' },
          { id: '164.308(a)(4)(ii)(C)', title: 'Access Establishment and Modification', type: 'addressable' },
        ],
      },
      {
        id: '164.308(a)(5)',
        name: 'Security Awareness and Training',
        specifications: [
          { id: '164.308(a)(5)(ii)(A)', title: 'Security Reminders', type: 'addressable' },
          { id: '164.308(a)(5)(ii)(B)', title: 'Protection from Malicious Software', type: 'addressable' },
          { id: '164.308(a)(5)(ii)(C)', title: 'Log-in Monitoring', type: 'addressable' },
          { id: '164.308(a)(5)(ii)(D)', title: 'Password Management', type: 'addressable' },
        ],
      },
      {
        id: '164.308(a)(6)',
        name: 'Security Incident Procedures',
        specifications: [
          { id: '164.308(a)(6)(ii)', title: 'Response and Reporting', type: 'required' },
        ],
      },
      {
        id: '164.308(a)(7)',
        name: 'Contingency Plan',
        specifications: [
          { id: '164.308(a)(7)(ii)(A)', title: 'Data Backup Plan', type: 'required' },
          { id: '164.308(a)(7)(ii)(B)', title: 'Disaster Recovery Plan', type: 'required' },
          { id: '164.308(a)(7)(ii)(C)', title: 'Emergency Mode Operation Plan', type: 'required' },
          { id: '164.308(a)(7)(ii)(D)', title: 'Testing and Revision Procedures', type: 'addressable' },
          { id: '164.308(a)(7)(ii)(E)', title: 'Applications and Data Criticality Analysis', type: 'addressable' },
        ],
      },
      {
        id: '164.308(a)(8)',
        name: 'Evaluation',
        specifications: [
          { id: '164.308(a)(8)', title: 'Evaluation', type: 'required' },
        ],
      },
      {
        id: '164.308(b)(1)',
        name: 'Business Associate Contracts',
        specifications: [
          { id: '164.308(b)(1)', title: 'Written Contract or Other Arrangement', type: 'required' },
        ],
      },
    ],
  },
  {
    id: 'PHYSICAL',
    name: 'Physical Safeguards',
    section: '164.310',
    standards: [
      {
        id: '164.310(a)(1)',
        name: 'Facility Access Controls',
        specifications: [
          { id: '164.310(a)(2)(i)', title: 'Contingency Operations', type: 'addressable' },
          { id: '164.310(a)(2)(ii)', title: 'Facility Security Plan', type: 'addressable' },
          { id: '164.310(a)(2)(iii)', title: 'Access Control and Validation Procedures', type: 'addressable' },
          { id: '164.310(a)(2)(iv)', title: 'Maintenance Records', type: 'addressable' },
        ],
      },
      {
        id: '164.310(b)',
        name: 'Workstation Use',
        specifications: [
          { id: '164.310(b)', title: 'Workstation Use', type: 'required' },
        ],
      },
      {
        id: '164.310(c)',
        name: 'Workstation Security',
        specifications: [
          { id: '164.310(c)', title: 'Workstation Security', type: 'required' },
        ],
      },
      {
        id: '164.310(d)(1)',
        name: 'Device and Media Controls',
        specifications: [
          { id: '164.310(d)(2)(i)', title: 'Disposal', type: 'required' },
          { id: '164.310(d)(2)(ii)', title: 'Media Re-use', type: 'required' },
          { id: '164.310(d)(2)(iii)', title: 'Accountability', type: 'addressable' },
          { id: '164.310(d)(2)(iv)', title: 'Data Backup and Storage', type: 'addressable' },
        ],
      },
    ],
  },
  {
    id: 'TECHNICAL',
    name: 'Technical Safeguards',
    section: '164.312',
    standards: [
      {
        id: '164.312(a)(1)',
        name: 'Access Control',
        specifications: [
          { id: '164.312(a)(2)(i)', title: 'Unique User Identification', type: 'required' },
          { id: '164.312(a)(2)(ii)', title: 'Emergency Access Procedure', type: 'required' },
          { id: '164.312(a)(2)(iii)', title: 'Automatic Logoff', type: 'addressable' },
          { id: '164.312(a)(2)(iv)', title: 'Encryption and Decryption', type: 'addressable' },
        ],
      },
      {
        id: '164.312(b)',
        name: 'Audit Controls',
        specifications: [
          { id: '164.312(b)', title: 'Audit Controls', type: 'required' },
        ],
      },
      {
        id: '164.312(c)(1)',
        name: 'Integrity',
        specifications: [
          { id: '164.312(c)(2)', title: 'Mechanism to Authenticate Electronic PHI', type: 'addressable' },
        ],
      },
      {
        id: '164.312(d)',
        name: 'Person or Entity Authentication',
        specifications: [
          { id: '164.312(d)', title: 'Person or Entity Authentication', type: 'required' },
        ],
      },
      {
        id: '164.312(e)(1)',
        name: 'Transmission Security',
        specifications: [
          { id: '164.312(e)(2)(i)', title: 'Integrity Controls', type: 'addressable' },
          { id: '164.312(e)(2)(ii)', title: 'Encryption', type: 'addressable' },
        ],
      },
    ],
  },
  {
    id: 'ORGANIZATIONAL',
    name: 'Organizational Requirements',
    section: '164.314',
    standards: [
      {
        id: '164.314(a)(1)',
        name: 'Business Associate Contracts or Other Arrangements',
        specifications: [
          { id: '164.314(a)(2)(i)', title: 'Business Associate Contracts', type: 'required' },
          { id: '164.314(a)(2)(ii)', title: 'Other Arrangements', type: 'required' },
        ],
      },
      {
        id: '164.314(b)(1)',
        name: 'Requirements for Group Health Plans',
        specifications: [
          { id: '164.314(b)(2)', title: 'Implementation Specifications', type: 'required' },
        ],
      },
    ],
  },
  {
    id: 'POLICIES',
    name: 'Policies and Procedures and Documentation Requirements',
    section: '164.316',
    standards: [
      {
        id: '164.316(a)',
        name: 'Policies and Procedures',
        specifications: [
          { id: '164.316(a)', title: 'Policies and Procedures', type: 'required' },
        ],
      },
      {
        id: '164.316(b)(1)',
        name: 'Documentation',
        specifications: [
          { id: '164.316(b)(2)(i)', title: 'Time Limit', type: 'required' },
          { id: '164.316(b)(2)(ii)', title: 'Availability', type: 'required' },
          { id: '164.316(b)(2)(iii)', title: 'Updates', type: 'required' },
        ],
      },
    ],
  },
];

export function countHIPAASpecifications(): { total: number; required: number; addressable: number } {
  let total = 0, required = 0, addressable = 0;
  HIPAA_SECURITY_RULE.forEach(safeguard => {
    safeguard.standards.forEach(standard => {
      standard.specifications.forEach(spec => {
        total++;
        if (spec.type === 'required') required++;
        else addressable++;
      });
    });
  });
  return { total, required, addressable };
}

export function getAllHIPAASpecifications(): HIPAASpecification[] {
  return HIPAA_SECURITY_RULE.flatMap(safeguard =>
    safeguard.standards.flatMap(standard => standard.specifications)
  );
}
