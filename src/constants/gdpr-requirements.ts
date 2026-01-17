/**
 * GDPR - Complete Articles and Requirements
 * EU General Data Protection Regulation
 */

export interface GDPRProvision {
  id: string;
  title: string;
  description?: string;
}

export interface GDPRArticle {
  id: string;
  name: string;
  provisions: GDPRProvision[];
}

export interface GDPRChapter {
  id: string;
  name: string;
  articles: GDPRArticle[];
}

export const GDPR_REQUIREMENTS: GDPRChapter[] = [
  {
    id: 'II',
    name: 'Principles',
    articles: [
      {
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
      {
        id: 'Art.6',
        name: 'Lawfulness of processing',
        provisions: [
          { id: 'Art.6(1)(a)', title: 'Consent' },
          { id: 'Art.6(1)(b)', title: 'Contract performance' },
          { id: 'Art.6(1)(c)', title: 'Legal obligation' },
          { id: 'Art.6(1)(d)', title: 'Vital interests' },
          { id: 'Art.6(1)(e)', title: 'Public task' },
          { id: 'Art.6(1)(f)', title: 'Legitimate interests' },
        ],
      },
      {
        id: 'Art.7',
        name: 'Conditions for consent',
        provisions: [
          { id: 'Art.7(1)', title: 'Demonstrable consent' },
          { id: 'Art.7(2)', title: 'Distinguishable consent request' },
          { id: 'Art.7(3)', title: 'Right to withdraw consent' },
          { id: 'Art.7(4)', title: 'Freely given consent assessment' },
        ],
      },
      {
        id: 'Art.9',
        name: 'Processing of special categories of personal data',
        provisions: [
          { id: 'Art.9(1)', title: 'Prohibition of processing special categories' },
          { id: 'Art.9(2)', title: 'Exceptions to prohibition' },
        ],
      },
    ],
  },
  {
    id: 'III',
    name: 'Rights of the Data Subject',
    articles: [
      {
        id: 'Art.12',
        name: 'Transparent information, communication and modalities',
        provisions: [
          { id: 'Art.12(1)', title: 'Transparent and easily accessible information' },
          { id: 'Art.12(2)', title: 'Facilitate exercise of data subject rights' },
          { id: 'Art.12(3)', title: 'Response within one month' },
          { id: 'Art.12(4)', title: 'Reasons for not taking action' },
          { id: 'Art.12(5)', title: 'Free of charge information provision' },
        ],
      },
      {
        id: 'Art.13',
        name: 'Information to be provided where personal data are collected from the data subject',
        provisions: [
          { id: 'Art.13(1)', title: 'Controller identity and contact details' },
          { id: 'Art.13(2)', title: 'Additional information for fair processing' },
        ],
      },
      {
        id: 'Art.14',
        name: 'Information to be provided where personal data have not been obtained from the data subject',
        provisions: [
          { id: 'Art.14(1)', title: 'Information when data not from subject' },
          { id: 'Art.14(2)', title: 'Additional information requirements' },
          { id: 'Art.14(3)', title: 'Timing of information provision' },
        ],
      },
      {
        id: 'Art.15',
        name: 'Right of access by the data subject',
        provisions: [
          { id: 'Art.15(1)', title: 'Confirmation and access to data' },
          { id: 'Art.15(2)', title: 'Information about third country transfers' },
          { id: 'Art.15(3)', title: 'Copy of personal data' },
          { id: 'Art.15(4)', title: 'Not adversely affect rights of others' },
        ],
      },
      {
        id: 'Art.16',
        name: 'Right to rectification',
        provisions: [
          { id: 'Art.16', title: 'Rectification of inaccurate personal data' },
        ],
      },
      {
        id: 'Art.17',
        name: 'Right to erasure (Right to be forgotten)',
        provisions: [
          { id: 'Art.17(1)', title: 'Grounds for erasure' },
          { id: 'Art.17(2)', title: 'Inform third parties of erasure' },
          { id: 'Art.17(3)', title: 'Exceptions to erasure right' },
        ],
      },
      {
        id: 'Art.18',
        name: 'Right to restriction of processing',
        provisions: [
          { id: 'Art.18(1)', title: 'Grounds for restriction' },
          { id: 'Art.18(2)', title: 'Processing of restricted data' },
          { id: 'Art.18(3)', title: 'Inform before lifting restriction' },
        ],
      },
      {
        id: 'Art.19',
        name: 'Notification obligation regarding rectification or erasure',
        provisions: [
          { id: 'Art.19', title: 'Communicate to recipients' },
        ],
      },
      {
        id: 'Art.20',
        name: 'Right to data portability',
        provisions: [
          { id: 'Art.20(1)', title: 'Receive data in structured format' },
          { id: 'Art.20(2)', title: 'Transmit to another controller' },
          { id: 'Art.20(3)', title: 'Direct transmission where feasible' },
          { id: 'Art.20(4)', title: 'Not adversely affect rights of others' },
        ],
      },
      {
        id: 'Art.21',
        name: 'Right to object',
        provisions: [
          { id: 'Art.21(1)', title: 'Object to processing based on legitimate interests or public task' },
          { id: 'Art.21(2)', title: 'Object to direct marketing' },
          { id: 'Art.21(3)', title: 'Cease processing for direct marketing' },
          { id: 'Art.21(4)', title: 'Inform of right to object' },
        ],
      },
      {
        id: 'Art.22',
        name: 'Automated individual decision-making, including profiling',
        provisions: [
          { id: 'Art.22(1)', title: 'Not be subject to solely automated decision-making' },
          { id: 'Art.22(2)', title: 'Exceptions' },
          { id: 'Art.22(3)', title: 'Safeguards for automated decisions' },
        ],
      },
    ],
  },
  {
    id: 'IV',
    name: 'Controller and Processor',
    articles: [
      {
        id: 'Art.24',
        name: 'Responsibility of the controller',
        provisions: [
          { id: 'Art.24(1)', title: 'Implement appropriate technical and organisational measures' },
          { id: 'Art.24(2)', title: 'Implement data protection policies' },
          { id: 'Art.24(3)', title: 'Adherence to approved codes of conduct or certification' },
        ],
      },
      {
        id: 'Art.25',
        name: 'Data protection by design and by default',
        provisions: [
          { id: 'Art.25(1)', title: 'Data protection by design' },
          { id: 'Art.25(2)', title: 'Data protection by default' },
          { id: 'Art.25(3)', title: 'Certification mechanism' },
        ],
      },
      {
        id: 'Art.26',
        name: 'Joint controllers',
        provisions: [
          { id: 'Art.26(1)', title: 'Arrangement between joint controllers' },
          { id: 'Art.26(2)', title: 'Essence of arrangement available to data subjects' },
          { id: 'Art.26(3)', title: 'Data subject rights against each controller' },
        ],
      },
      {
        id: 'Art.28',
        name: 'Processor',
        provisions: [
          { id: 'Art.28(1)', title: 'Use only processors with sufficient guarantees' },
          { id: 'Art.28(2)', title: 'No sub-processor without authorization' },
          { id: 'Art.28(3)', title: 'Contract or legal act requirements' },
          { id: 'Art.28(4)', title: 'Sub-processor obligations' },
        ],
      },
      {
        id: 'Art.29',
        name: 'Processing under the authority of the controller or processor',
        provisions: [
          { id: 'Art.29', title: 'Processing only on instructions' },
        ],
      },
      {
        id: 'Art.30',
        name: 'Records of processing activities',
        provisions: [
          { id: 'Art.30(1)', title: 'Controller records' },
          { id: 'Art.30(2)', title: 'Processor records' },
          { id: 'Art.30(3)', title: 'Written form including electronic' },
          { id: 'Art.30(4)', title: 'Make available to supervisory authority' },
        ],
      },
      {
        id: 'Art.32',
        name: 'Security of processing',
        provisions: [
          { id: 'Art.32(1)(a)', title: 'Pseudonymisation and encryption' },
          { id: 'Art.32(1)(b)', title: 'Ensure confidentiality, integrity, availability and resilience' },
          { id: 'Art.32(1)(c)', title: 'Ability to restore availability and access' },
          { id: 'Art.32(1)(d)', title: 'Process for regularly testing and evaluating' },
          { id: 'Art.32(2)', title: 'Assess appropriate level of security' },
          { id: 'Art.32(4)', title: 'Ensure persons with access process only on instructions' },
        ],
      },
      {
        id: 'Art.33',
        name: 'Notification of a personal data breach to the supervisory authority',
        provisions: [
          { id: 'Art.33(1)', title: 'Notify within 72 hours' },
          { id: 'Art.33(2)', title: 'Processor notify controller' },
          { id: 'Art.33(3)', title: 'Content of notification' },
          { id: 'Art.33(4)', title: 'Information provided in phases' },
          { id: 'Art.33(5)', title: 'Document all breaches' },
        ],
      },
      {
        id: 'Art.34',
        name: 'Communication of a personal data breach to the data subject',
        provisions: [
          { id: 'Art.34(1)', title: 'Communicate to data subject when high risk' },
          { id: 'Art.34(2)', title: 'Clear and plain language' },
          { id: 'Art.34(3)', title: 'Exceptions to communication' },
          { id: 'Art.34(4)', title: 'Supervisory authority may require communication' },
        ],
      },
      {
        id: 'Art.35',
        name: 'Data protection impact assessment',
        provisions: [
          { id: 'Art.35(1)', title: 'DPIA when high risk' },
          { id: 'Art.35(3)', title: 'When DPIA required' },
          { id: 'Art.35(7)', title: 'Minimum content of DPIA' },
          { id: 'Art.35(9)', title: 'Seek views of data subjects' },
          { id: 'Art.35(11)', title: 'Review when risk changes' },
        ],
      },
      {
        id: 'Art.36',
        name: 'Prior consultation',
        provisions: [
          { id: 'Art.36(1)', title: 'Consult supervisory authority when high residual risk' },
          { id: 'Art.36(2)', title: 'Supervisory authority advice' },
          { id: 'Art.36(3)', title: 'Information to provide' },
        ],
      },
      {
        id: 'Art.37',
        name: 'Designation of the data protection officer',
        provisions: [
          { id: 'Art.37(1)', title: 'When DPO required' },
          { id: 'Art.37(5)', title: 'DPO qualifications' },
          { id: 'Art.37(6)', title: 'DPO can be staff or external' },
          { id: 'Art.37(7)', title: 'Publish DPO contact details' },
        ],
      },
      {
        id: 'Art.38',
        name: 'Position of the data protection officer',
        provisions: [
          { id: 'Art.38(1)', title: 'Involve DPO properly and timely' },
          { id: 'Art.38(2)', title: 'Support DPO with resources' },
          { id: 'Art.38(3)', title: 'DPO independence' },
          { id: 'Art.38(4)', title: 'Data subjects may contact DPO' },
          { id: 'Art.38(5)', title: 'DPO secrecy and confidentiality' },
          { id: 'Art.38(6)', title: 'DPO other tasks without conflict' },
        ],
      },
      {
        id: 'Art.39',
        name: 'Tasks of the data protection officer',
        provisions: [
          { id: 'Art.39(1)(a)', title: 'Inform and advise' },
          { id: 'Art.39(1)(b)', title: 'Monitor compliance' },
          { id: 'Art.39(1)(c)', title: 'Advise on DPIA' },
          { id: 'Art.39(1)(d)', title: 'Cooperate with supervisory authority' },
          { id: 'Art.39(1)(e)', title: 'Contact point for supervisory authority' },
          { id: 'Art.39(2)', title: 'Have regard to risk' },
        ],
      },
    ],
  },
  {
    id: 'V',
    name: 'Transfers of personal data to third countries or international organisations',
    articles: [
      {
        id: 'Art.44',
        name: 'General principle for transfers',
        provisions: [
          { id: 'Art.44', title: 'Conditions for transfer' },
        ],
      },
      {
        id: 'Art.45',
        name: 'Transfers on the basis of an adequacy decision',
        provisions: [
          { id: 'Art.45(1)', title: 'Transfer to adequate country' },
          { id: 'Art.45(2)', title: 'Elements for adequacy assessment' },
        ],
      },
      {
        id: 'Art.46',
        name: 'Transfers subject to appropriate safeguards',
        provisions: [
          { id: 'Art.46(1)', title: 'Transfer with appropriate safeguards' },
          { id: 'Art.46(2)', title: 'Safeguards without authorization' },
          { id: 'Art.46(3)', title: 'Safeguards with authorization' },
        ],
      },
      {
        id: 'Art.49',
        name: 'Derogations for specific situations',
        provisions: [
          { id: 'Art.49(1)', title: 'Derogations for transfers' },
          { id: 'Art.49(2)', title: 'Binding corporate rules for public authorities' },
        ],
      },
    ],
  },
];

export function countGDPRProvisions(): number {
  return GDPR_REQUIREMENTS.reduce((sum, chapter) =>
    sum + chapter.articles.reduce((artSum, art) => artSum + art.provisions.length, 0), 0
  );
}

export function getAllGDPRProvisions(): GDPRProvision[] {
  return GDPR_REQUIREMENTS.flatMap(chapter =>
    chapter.articles.flatMap(art => art.provisions)
  );
}
