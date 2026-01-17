/**
 * Security Questionnaire Types
 *
 * Types for AI-powered security questionnaire automation
 * Supports SIG, CAIQ, VSA, and custom questionnaire formats
 */

export type QuestionnaireFormat = 'SIG' | 'SIG_LITE' | 'CAIQ' | 'VSA' | 'HECVAT' | 'CUSTOM';
export type QuestionnaireStatus = 'draft' | 'in_progress' | 'completed' | 'submitted' | 'archived';
export type QuestionStatus = 'pending' | 'ai_suggested' | 'reviewed' | 'approved' | 'flagged';
export type AnswerConfidence = 'high' | 'medium' | 'low';

export interface QuestionnaireTemplate {
  id: string;
  format: QuestionnaireFormat;
  name: string;
  description: string;
  version: string;
  totalQuestions: number;
  categories: string[];
  createdAt: string;
  isBuiltIn: boolean;
}

export interface Questionnaire {
  id: string;
  organizationId: string;
  templateId: string | null;
  format: QuestionnaireFormat;
  name: string;
  description: string;
  customerName: string;
  customerEmail?: string;
  dueDate: string | null;
  status: QuestionnaireStatus;
  progress: {
    total: number;
    answered: number;
    approved: number;
    flagged: number;
  };
  metadata: {
    requestedBy?: string;
    requestedAt?: string;
    submittedAt?: string;
    submittedBy?: string;
    notes?: string;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface QuestionCategory {
  id: string;
  name: string;
  description: string;
  order: number;
  questionCount: number;
}

export interface QuestionnaireQuestion {
  id: string;
  questionnaireId: string;
  categoryId: string;
  categoryName: string;
  questionNumber: string;
  questionText: string;
  questionType: 'yes_no' | 'multiple_choice' | 'text' | 'date' | 'file_upload';
  options?: string[];
  required: boolean;
  helpText?: string;
  relatedControls: string[];
  order: number;
}

export interface QuestionnaireAnswer {
  id: string;
  questionnaireId: string;
  questionId: string;
  status: QuestionStatus;
  answer: string;
  aiSuggestedAnswer?: string;
  aiConfidence?: AnswerConfidence;
  aiReasoning?: string;
  evidenceUrls: string[];
  evidenceNotes: string;
  relatedControlIds: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  flagReason?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionLibraryItem {
  id: string;
  organizationId: string;
  questionText: string;
  normalizedQuestion: string;
  standardAnswer: string;
  answerType: 'yes_no' | 'text' | 'multiple_choice';
  relatedControls: string[];
  evidenceReferences: string[];
  category: string;
  tags: string[];
  usageCount: number;
  lastUsed: string | null;
  confidence: AnswerConfidence;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  approvedBy?: string;
}

export interface AIQuestionnaireContext {
  organizationName: string;
  industry?: string;
  companySize?: string;
  frameworks: string[];
  controlResponses: Array<{
    controlId: string;
    controlTitle: string;
    answer: string;
    evidenceNotes?: string;
  }>;
  existingAnswers: QuestionLibraryItem[];
  customContext?: string;
}

export interface AIAnswerSuggestion {
  answer: string;
  confidence: AnswerConfidence;
  reasoning: string;
  relatedControls: string[];
  evidenceSuggestions: string[];
  similarQuestions: Array<{
    question: string;
    answer: string;
    similarity: number;
  }>;
}

export interface QuestionnaireExportOptions {
  format: 'xlsx' | 'csv' | 'pdf' | 'json';
  includeAIReasoning: boolean;
  includeEvidence: boolean;
  includeControlMappings: boolean;
  questionsOnly: boolean;
}

export interface QuestionnaireImportResult {
  success: boolean;
  questionnaire?: Questionnaire;
  questions?: QuestionnaireQuestion[];
  errors?: string[];
  warnings?: string[];
  importedCount: number;
  skippedCount: number;
}

export interface QuestionnaireStats {
  totalQuestionnaires: number;
  completedThisMonth: number;
  averageCompletionTime: number;
  aiAcceptanceRate: number;
  topCategories: Array<{ category: string; count: number }>;
  recentActivity: Array<{
    questionnaireId: string;
    action: string;
    timestamp: string;
  }>;
}
