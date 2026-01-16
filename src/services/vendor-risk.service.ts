/**
 * Vendor Risk Management Service
 * Handles vendor assessment, risk scoring, and compliance tracking
 * Includes audit logging for compliance tracking
 */

import { supabase } from '../lib/supabase';
import { auditLog } from './audit-log.service';
import { sanitizeString, isValidEmail, isValidUrl } from '../utils/validation';

// Helper to ensure supabase is configured
const getSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  }
  return supabase;
};

// ============================================================================
// TYPES
// ============================================================================

export interface Vendor {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  website?: string;

  // Contact
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;

  // Classification
  category: VendorCategory;
  criticality: VendorCriticality;
  dataClassification: DataClassification;

  // Risk Assessment
  riskScore?: number;
  riskTier?: VendorRiskTier;
  lastAssessmentAt?: string;
  nextAssessmentAt?: string;

  // Contract
  contractStartDate?: string;
  contractEndDate?: string;
  contractValue?: number;
  autoRenewal?: boolean;

  // Status
  status: VendorStatus;

  // Compliance
  certifications: string[];
  complianceFrameworks: string[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface VendorAssessment {
  id: string;
  vendorId: string;
  tenantId: string;

  // Assessment Details
  assessmentType: AssessmentType;
  questionnaireId?: string;

  // Scoring
  overallScore?: number;
  securityScore?: number;
  privacyScore?: number;
  operationalScore?: number;
  financialScore?: number;

  // Findings
  findings: AssessmentFinding[];
  recommendations: AssessmentRecommendation[];

  // Status
  status: AssessmentStatus;

  // Workflow
  assignedTo?: string;
  reviewedBy?: string;
  reviewedAt?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  createdBy?: string;
}

export interface AssessmentFinding {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  evidence?: string;
  remediationStatus: 'open' | 'in_progress' | 'remediated' | 'accepted';
  dueDate?: string;
}

export interface AssessmentRecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedEffort?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
}

export interface VendorQuestionnaire {
  id: string;
  name: string;
  description: string;
  category: string;
  questions: QuestionnaireQuestion[];
  isTemplate: boolean;
  createdAt: string;
}

export interface QuestionnaireQuestion {
  id: string;
  section: string;
  question: string;
  type: 'yes_no' | 'multiple_choice' | 'text' | 'file_upload' | 'date' | 'scale';
  required: boolean;
  weight: number;
  options?: string[];
  helpText?: string;
  controlMapping?: string[];
}

export interface QuestionnaireResponse {
  questionId: string;
  answer: string | string[] | boolean | number;
  notes?: string;
  attachments?: string[];
  answeredAt: string;
  answeredBy: string;
}

export type VendorCategory =
  | 'cloud_services'
  | 'software'
  | 'hardware'
  | 'professional_services'
  | 'data_processing'
  | 'infrastructure'
  | 'security'
  | 'communications'
  | 'financial'
  | 'hr_services'
  | 'marketing'
  | 'legal'
  | 'other';

export type VendorCriticality = 'critical' | 'high' | 'medium' | 'low';
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';
export type VendorRiskTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';
export type VendorStatus = 'active' | 'pending' | 'inactive' | 'offboarding' | 'terminated';
export type AssessmentType = 'initial' | 'periodic' | 'incident' | 'contract_renewal';
export type AssessmentStatus = 'draft' | 'in_progress' | 'pending_review' | 'approved' | 'rejected';

// ============================================================================
// QUESTIONNAIRE TEMPLATES
// ============================================================================

export const QUESTIONNAIRE_TEMPLATES: VendorQuestionnaire[] = [
  {
    id: 'security-assessment-standard',
    name: 'Standard Security Assessment',
    description: 'Comprehensive security questionnaire for vendor evaluation',
    category: 'security',
    isTemplate: true,
    createdAt: new Date().toISOString(),
    questions: [
      // Security Governance
      {
        id: 'sg-1',
        section: 'Security Governance',
        question: 'Does your organization have a documented information security policy?',
        type: 'yes_no',
        required: true,
        weight: 10,
        helpText: 'The policy should be reviewed and updated at least annually',
        controlMapping: ['PM-1', 'PL-1'],
      },
      {
        id: 'sg-2',
        section: 'Security Governance',
        question: 'Do you have a designated Chief Information Security Officer (CISO) or equivalent?',
        type: 'yes_no',
        required: true,
        weight: 8,
        controlMapping: ['PM-2'],
      },
      {
        id: 'sg-3',
        section: 'Security Governance',
        question: 'What security certifications does your organization hold?',
        type: 'multiple_choice',
        required: true,
        weight: 10,
        options: ['SOC 2 Type II', 'ISO 27001', 'PCI DSS', 'HIPAA', 'FedRAMP', 'None'],
        controlMapping: ['CA-2', 'CA-5'],
      },

      // Access Control
      {
        id: 'ac-1',
        section: 'Access Control',
        question: 'Do you enforce multi-factor authentication (MFA) for all user accounts?',
        type: 'yes_no',
        required: true,
        weight: 10,
        controlMapping: ['IA-2', 'IA-5'],
      },
      {
        id: 'ac-2',
        section: 'Access Control',
        question: 'Do you follow the principle of least privilege for access management?',
        type: 'yes_no',
        required: true,
        weight: 9,
        controlMapping: ['AC-6'],
      },
      {
        id: 'ac-3',
        section: 'Access Control',
        question: 'How often do you review user access rights?',
        type: 'multiple_choice',
        required: true,
        weight: 7,
        options: ['Monthly', 'Quarterly', 'Semi-annually', 'Annually', 'Never'],
        controlMapping: ['AC-2'],
      },

      // Data Protection
      {
        id: 'dp-1',
        section: 'Data Protection',
        question: 'Is data encrypted at rest?',
        type: 'yes_no',
        required: true,
        weight: 10,
        controlMapping: ['SC-28'],
      },
      {
        id: 'dp-2',
        section: 'Data Protection',
        question: 'Is data encrypted in transit using TLS 1.2 or higher?',
        type: 'yes_no',
        required: true,
        weight: 10,
        controlMapping: ['SC-8', 'SC-13'],
      },
      {
        id: 'dp-3',
        section: 'Data Protection',
        question: 'What is your data retention policy?',
        type: 'text',
        required: true,
        weight: 6,
        helpText: 'Describe how long data is retained and deletion procedures',
        controlMapping: ['SI-12'],
      },

      // Incident Response
      {
        id: 'ir-1',
        section: 'Incident Response',
        question: 'Do you have a documented incident response plan?',
        type: 'yes_no',
        required: true,
        weight: 9,
        controlMapping: ['IR-1', 'IR-8'],
      },
      {
        id: 'ir-2',
        section: 'Incident Response',
        question: 'What is your breach notification timeframe?',
        type: 'multiple_choice',
        required: true,
        weight: 8,
        options: ['Within 24 hours', 'Within 48 hours', 'Within 72 hours', 'Within 7 days', 'No defined timeframe'],
        controlMapping: ['IR-6'],
      },

      // Business Continuity
      {
        id: 'bc-1',
        section: 'Business Continuity',
        question: 'Do you have a documented business continuity plan?',
        type: 'yes_no',
        required: true,
        weight: 8,
        controlMapping: ['CP-1', 'CP-2'],
      },
      {
        id: 'bc-2',
        section: 'Business Continuity',
        question: 'How often do you test your disaster recovery procedures?',
        type: 'multiple_choice',
        required: true,
        weight: 7,
        options: ['Monthly', 'Quarterly', 'Semi-annually', 'Annually', 'Never'],
        controlMapping: ['CP-4'],
      },

      // Vulnerability Management
      {
        id: 'vm-1',
        section: 'Vulnerability Management',
        question: 'How frequently do you perform vulnerability scans?',
        type: 'multiple_choice',
        required: true,
        weight: 8,
        options: ['Continuously', 'Weekly', 'Monthly', 'Quarterly', 'Annually', 'Never'],
        controlMapping: ['RA-5'],
      },
      {
        id: 'vm-2',
        section: 'Vulnerability Management',
        question: 'Do you perform annual penetration testing?',
        type: 'yes_no',
        required: true,
        weight: 8,
        controlMapping: ['CA-8'],
      },
    ],
  },
  {
    id: 'privacy-assessment',
    name: 'Privacy & Data Processing Assessment',
    description: 'Assessment focused on data privacy and GDPR compliance',
    category: 'privacy',
    isTemplate: true,
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'pr-1',
        section: 'Privacy Governance',
        question: 'Do you have a designated Data Protection Officer (DPO)?',
        type: 'yes_no',
        required: true,
        weight: 9,
        controlMapping: ['PM-2'],
      },
      {
        id: 'pr-2',
        section: 'Privacy Governance',
        question: 'Do you maintain a record of processing activities (ROPA)?',
        type: 'yes_no',
        required: true,
        weight: 8,
        controlMapping: ['PM-5'],
      },
      {
        id: 'pr-3',
        section: 'Data Subject Rights',
        question: 'Can you fulfill data subject access requests within 30 days?',
        type: 'yes_no',
        required: true,
        weight: 9,
        controlMapping: ['IP-1', 'IP-2'],
      },
      {
        id: 'pr-4',
        section: 'Data Subject Rights',
        question: 'Do you support the right to erasure (right to be forgotten)?',
        type: 'yes_no',
        required: true,
        weight: 9,
        controlMapping: ['IP-3'],
      },
      {
        id: 'pr-5',
        section: 'Cross-Border Transfers',
        question: 'Do you transfer personal data outside the EEA?',
        type: 'yes_no',
        required: true,
        weight: 7,
      },
      {
        id: 'pr-6',
        section: 'Cross-Border Transfers',
        question: 'What mechanisms do you use for international data transfers?',
        type: 'multiple_choice',
        required: false,
        weight: 8,
        options: ['Standard Contractual Clauses', 'Binding Corporate Rules', 'Adequacy Decision', 'Not applicable'],
      },
    ],
  },
];

// ============================================================================
// RISK SCORING
// ============================================================================

export interface RiskScoreFactors {
  dataAccess: number;           // 0-25: What data does vendor access?
  systemAccess: number;         // 0-25: What systems does vendor access?
  businessCriticality: number;  // 0-25: How critical is the service?
  compliancePosture: number;    // 0-25: Vendor's security/compliance maturity
}

export function calculateRiskScore(factors: RiskScoreFactors): number {
  const total = factors.dataAccess + factors.systemAccess + factors.businessCriticality + factors.compliancePosture;
  return Math.min(100, Math.max(0, total));
}

export function calculateRiskTier(score: number): VendorRiskTier {
  if (score >= 75) return 'tier1'; // Critical - Highest risk
  if (score >= 50) return 'tier2'; // High risk
  if (score >= 25) return 'tier3'; // Medium risk
  return 'tier4'; // Low risk
}

export function getAssessmentFrequency(tier: VendorRiskTier): number {
  switch (tier) {
    case 'tier1': return 90;   // Quarterly
    case 'tier2': return 180;  // Semi-annually
    case 'tier3': return 365;  // Annually
    case 'tier4': return 730;  // Bi-annually
  }
}

export function calculateQuestionnaireScore(
  questions: QuestionnaireQuestion[],
  responses: QuestionnaireResponse[]
): { total: number; bySection: Record<string, number> } {
  const responseMap = new Map(responses.map(r => [r.questionId, r]));
  let totalScore = 0;
  let totalWeight = 0;
  const sectionScores: Record<string, { score: number; weight: number }> = {};

  for (const question of questions) {
    const response = responseMap.get(question.id);
    if (!response) continue;

    let questionScore = 0;

    // Score based on question type
    switch (question.type) {
      case 'yes_no':
        questionScore = response.answer === true || response.answer === 'yes' ? question.weight : 0;
        break;
      case 'multiple_choice':
        // First option is typically the best
        if (question.options) {
          const index = question.options.indexOf(response.answer as string);
          if (index >= 0) {
            questionScore = question.weight * (1 - index / question.options.length);
          }
        }
        break;
      case 'scale':
        const scaleValue = Number(response.answer) || 0;
        questionScore = (scaleValue / 10) * question.weight;
        break;
      case 'text':
      case 'file_upload':
        // Text/file responses get full weight if provided
        questionScore = response.answer ? question.weight : 0;
        break;
    }

    totalScore += questionScore;
    totalWeight += question.weight;

    // Track by section
    if (!sectionScores[question.section]) {
      sectionScores[question.section] = { score: 0, weight: 0 };
    }
    sectionScores[question.section].score += questionScore;
    sectionScores[question.section].weight += question.weight;
  }

  // Normalize scores to 0-100
  const normalizedTotal = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
  const normalizedSections: Record<string, number> = {};

  for (const [section, data] of Object.entries(sectionScores)) {
    normalizedSections[section] = data.weight > 0 ? (data.score / data.weight) * 100 : 0;
  }

  return {
    total: Math.round(normalizedTotal),
    bySection: normalizedSections,
  };
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class VendorRiskService {
  // -------------------------------------------------------------------------
  // Vendor CRUD
  // -------------------------------------------------------------------------

  async getVendors(tenantId: string, filters?: {
    status?: VendorStatus[];
    criticality?: VendorCriticality[];
    category?: VendorCategory[];
    searchTerm?: string;
  }): Promise<Vendor[]> {
    let query = getSupabase()
      .from('vendors')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters?.criticality?.length) {
      query = query.in('criticality', filters.criticality);
    }
    if (filters?.category?.length) {
      query = query.in('category', filters.category);
    }
    if (filters?.searchTerm) {
      query = query.or(`name.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return this.transformVendors(data || []);
  }

  async getVendor(vendorId: string): Promise<Vendor | null> {
    const { data, error } = await getSupabase()
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.transformVendor(data);
  }

  async createVendor(tenantId: string, vendor: Partial<Vendor>, userId: string): Promise<Vendor> {
    // Validate and sanitize inputs
    const sanitizedName = sanitizeString(vendor.name || '');
    const sanitizedDescription = vendor.description ? sanitizeString(vendor.description) : undefined;

    if (vendor.primaryContactEmail && !isValidEmail(vendor.primaryContactEmail)) {
      throw new Error('Invalid contact email address');
    }
    if (vendor.website && !isValidUrl(vendor.website)) {
      throw new Error('Invalid website URL');
    }

    const { data, error } = await getSupabase()
      .from('vendors')
      .insert({
        tenant_id: tenantId,
        name: sanitizedName,
        description: sanitizedDescription,
        website: vendor.website,
        primary_contact_name: vendor.primaryContactName,
        primary_contact_email: vendor.primaryContactEmail,
        primary_contact_phone: vendor.primaryContactPhone,
        category: vendor.category || 'other',
        criticality: vendor.criticality || 'medium',
        data_classification: vendor.dataClassification || 'internal',
        status: vendor.status || 'pending',
        certifications: vendor.certifications || [],
        compliance_frameworks: vendor.complianceFrameworks || [],
        contract_start_date: vendor.contractStartDate,
        contract_end_date: vendor.contractEndDate,
        contract_value: vendor.contractValue,
        auto_renewal: vendor.autoRenewal,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    const createdVendor = this.transformVendor(data);

    // Audit log
    auditLog.vendor.created(createdVendor.id, createdVendor.name);

    return createdVendor;
  }

  async updateVendor(vendorId: string, updates: Partial<Vendor>): Promise<Vendor> {
    const { data, error } = await getSupabase()
      .from('vendors')
      .update({
        name: updates.name,
        description: updates.description,
        website: updates.website,
        primary_contact_name: updates.primaryContactName,
        primary_contact_email: updates.primaryContactEmail,
        primary_contact_phone: updates.primaryContactPhone,
        category: updates.category,
        criticality: updates.criticality,
        data_classification: updates.dataClassification,
        status: updates.status,
        certifications: updates.certifications,
        compliance_frameworks: updates.complianceFrameworks,
        risk_score: updates.riskScore,
        risk_tier: updates.riskTier,
        contract_start_date: updates.contractStartDate,
        contract_end_date: updates.contractEndDate,
        contract_value: updates.contractValue,
        auto_renewal: updates.autoRenewal,
        next_assessment_at: updates.nextAssessmentAt,
      })
      .eq('id', vendorId)
      .select()
      .single();

    if (error) throw error;
    return this.transformVendor(data);
  }

  async deleteVendor(vendorId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('vendors')
      .delete()
      .eq('id', vendorId);

    if (error) throw error;
  }

  // -------------------------------------------------------------------------
  // Assessments
  // -------------------------------------------------------------------------

  async getAssessments(vendorId: string): Promise<VendorAssessment[]> {
    const { data, error } = await getSupabase()
      .from('vendor_assessments')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return this.transformAssessments(data || []);
  }

  async getAssessment(assessmentId: string): Promise<VendorAssessment | null> {
    const { data, error } = await getSupabase()
      .from('vendor_assessments')
      .select('*')
      .eq('id', assessmentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.transformAssessment(data);
  }

  async createAssessment(
    vendorId: string,
    tenantId: string,
    assessment: Partial<VendorAssessment>,
    userId: string
  ): Promise<VendorAssessment> {
    const { data, error } = await getSupabase()
      .from('vendor_assessments')
      .insert({
        vendor_id: vendorId,
        tenant_id: tenantId,
        assessment_type: assessment.assessmentType || 'periodic',
        questionnaire_id: assessment.questionnaireId,
        status: 'draft',
        findings: [],
        recommendations: [],
        assigned_to: assessment.assignedTo,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return this.transformAssessment(data);
  }

  async updateAssessment(assessmentId: string, updates: Partial<VendorAssessment>): Promise<VendorAssessment> {
    const updateData: Record<string, unknown> = {};

    if (updates.overallScore !== undefined) updateData.overall_score = updates.overallScore;
    if (updates.securityScore !== undefined) updateData.security_score = updates.securityScore;
    if (updates.privacyScore !== undefined) updateData.privacy_score = updates.privacyScore;
    if (updates.operationalScore !== undefined) updateData.operational_score = updates.operationalScore;
    if (updates.financialScore !== undefined) updateData.financial_score = updates.financialScore;
    if (updates.findings !== undefined) updateData.findings = updates.findings;
    if (updates.recommendations !== undefined) updateData.recommendations = updates.recommendations;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;
    if (updates.reviewedBy !== undefined) updateData.reviewed_by = updates.reviewedBy;
    if (updates.reviewedAt !== undefined) updateData.reviewed_at = updates.reviewedAt;
    if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt;

    const { data, error } = await getSupabase()
      .from('vendor_assessments')
      .update(updateData)
      .eq('id', assessmentId)
      .select()
      .single();

    if (error) throw error;
    return this.transformAssessment(data);
  }

  async completeAssessment(
    assessmentId: string,
    vendorId: string,
    scores: { overall: number; security?: number; privacy?: number; operational?: number; financial?: number },
    reviewerId: string
  ): Promise<void> {
    // Update assessment
    await this.updateAssessment(assessmentId, {
      overallScore: scores.overall,
      securityScore: scores.security,
      privacyScore: scores.privacy,
      operationalScore: scores.operational,
      financialScore: scores.financial,
      status: 'approved',
      reviewedBy: reviewerId,
      reviewedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    // Update vendor risk score and next assessment date
    const riskTier = calculateRiskTier(100 - scores.overall); // Invert score to risk
    const assessmentFrequency = getAssessmentFrequency(riskTier);
    const nextAssessment = new Date();
    nextAssessment.setDate(nextAssessment.getDate() + assessmentFrequency);

    await this.updateVendor(vendorId, {
      riskScore: 100 - scores.overall,
      riskTier,
      lastAssessmentAt: new Date().toISOString(),
      nextAssessmentAt: nextAssessment.toISOString(),
    });
  }

  // -------------------------------------------------------------------------
  // Questionnaires
  // -------------------------------------------------------------------------

  getQuestionnaireTemplates(): VendorQuestionnaire[] {
    return QUESTIONNAIRE_TEMPLATES;
  }

  getQuestionnaireTemplate(templateId: string): VendorQuestionnaire | undefined {
    return QUESTIONNAIRE_TEMPLATES.find(t => t.id === templateId);
  }

  // -------------------------------------------------------------------------
  // Dashboard & Reporting
  // -------------------------------------------------------------------------

  async getVendorDashboard(tenantId: string): Promise<{
    totalVendors: number;
    byStatus: Record<VendorStatus, number>;
    byCriticality: Record<VendorCriticality, number>;
    byRiskTier: Record<VendorRiskTier, number>;
    assessmentsDue: number;
    contractsExpiring: number;
    recentAssessments: VendorAssessment[];
  }> {
    const vendors = await this.getVendors(tenantId);

    const byStatus: Record<VendorStatus, number> = {
      active: 0, pending: 0, inactive: 0, offboarding: 0, terminated: 0
    };
    const byCriticality: Record<VendorCriticality, number> = {
      critical: 0, high: 0, medium: 0, low: 0
    };
    const byRiskTier: Record<VendorRiskTier, number> = {
      tier1: 0, tier2: 0, tier3: 0, tier4: 0
    };

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let assessmentsDue = 0;
    let contractsExpiring = 0;

    for (const vendor of vendors) {
      byStatus[vendor.status]++;
      byCriticality[vendor.criticality]++;
      if (vendor.riskTier) byRiskTier[vendor.riskTier]++;

      if (vendor.nextAssessmentAt && new Date(vendor.nextAssessmentAt) <= thirtyDaysFromNow) {
        assessmentsDue++;
      }
      if (vendor.contractEndDate && new Date(vendor.contractEndDate) <= thirtyDaysFromNow) {
        contractsExpiring++;
      }
    }

    // Get recent assessments
    const { data: recentData } = await getSupabase()
      .from('vendor_assessments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      totalVendors: vendors.length,
      byStatus,
      byCriticality,
      byRiskTier,
      assessmentsDue,
      contractsExpiring,
      recentAssessments: this.transformAssessments(recentData || []),
    };
  }

  // -------------------------------------------------------------------------
  // Data Transformation
  // -------------------------------------------------------------------------

  private transformVendor(data: Record<string, unknown>): Vendor {
    return {
      id: data.id as string,
      tenantId: data.tenant_id as string,
      name: data.name as string,
      description: data.description as string | undefined,
      website: data.website as string | undefined,
      primaryContactName: data.primary_contact_name as string | undefined,
      primaryContactEmail: data.primary_contact_email as string | undefined,
      primaryContactPhone: data.primary_contact_phone as string | undefined,
      category: data.category as VendorCategory,
      criticality: data.criticality as VendorCriticality,
      dataClassification: data.data_classification as DataClassification,
      riskScore: data.risk_score as number | undefined,
      riskTier: data.risk_tier as VendorRiskTier | undefined,
      lastAssessmentAt: data.last_assessment_at as string | undefined,
      nextAssessmentAt: data.next_assessment_at as string | undefined,
      contractStartDate: data.contract_start_date as string | undefined,
      contractEndDate: data.contract_end_date as string | undefined,
      contractValue: data.contract_value as number | undefined,
      autoRenewal: data.auto_renewal as boolean | undefined,
      status: data.status as VendorStatus,
      certifications: (data.certifications as string[]) || [],
      complianceFrameworks: (data.compliance_frameworks as string[]) || [],
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      createdBy: data.created_by as string | undefined,
    };
  }

  private transformVendors(data: Record<string, unknown>[]): Vendor[] {
    return data.map(d => this.transformVendor(d));
  }

  private transformAssessment(data: Record<string, unknown>): VendorAssessment {
    return {
      id: data.id as string,
      vendorId: data.vendor_id as string,
      tenantId: data.tenant_id as string,
      assessmentType: data.assessment_type as AssessmentType,
      questionnaireId: data.questionnaire_id as string | undefined,
      overallScore: data.overall_score as number | undefined,
      securityScore: data.security_score as number | undefined,
      privacyScore: data.privacy_score as number | undefined,
      operationalScore: data.operational_score as number | undefined,
      financialScore: data.financial_score as number | undefined,
      findings: (data.findings as AssessmentFinding[]) || [],
      recommendations: (data.recommendations as AssessmentRecommendation[]) || [],
      status: data.status as AssessmentStatus,
      assignedTo: data.assigned_to as string | undefined,
      reviewedBy: data.reviewed_by as string | undefined,
      reviewedAt: data.reviewed_at as string | undefined,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      completedAt: data.completed_at as string | undefined,
      createdBy: data.created_by as string | undefined,
    };
  }

  private transformAssessments(data: Record<string, unknown>[]): VendorAssessment[] {
    return data.map(d => this.transformAssessment(d));
  }
}

export const vendorRiskService = new VendorRiskService();
