/**
 * Security Questionnaire Service
 *
 * Manages security questionnaires with AI-powered response automation.
 * Supports importing questionnaires from customers, auto-suggesting answers
 * based on existing compliance data, and exporting completed questionnaires.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  Questionnaire,
  QuestionnaireQuestion,
  QuestionnaireAnswer,
  QuestionnaireFormat,
  QuestionnaireStatus,
  QuestionStatus,
  QuestionnaireTemplate,
  QuestionLibraryItem,
  AIQuestionnaireContext,
  AIAnswerSuggestion,
  QuestionnaireExportOptions,
  QuestionnaireImportResult,
  QuestionnaireStats,
  AnswerConfidence,
} from '../types/questionnaire.types';

// ============================================================================
// BUILT-IN TEMPLATES
// ============================================================================

export const QUESTIONNAIRE_TEMPLATES: QuestionnaireTemplate[] = [
  {
    id: 'sig-full',
    format: 'SIG',
    name: 'SIG (Standardized Information Gathering)',
    description: 'Full SIG questionnaire with 800+ questions covering all security domains',
    version: '2024',
    totalQuestions: 850,
    categories: [
      'Enterprise Risk Management',
      'Security Policy',
      'Organizational Security',
      'Asset Management',
      'Access Control',
      'Cryptography',
      'Physical Security',
      'Operations Security',
      'Communications Security',
      'System Development',
      'Supplier Relations',
      'Incident Response',
      'Business Continuity',
      'Compliance',
    ],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: 'sig-lite',
    format: 'SIG_LITE',
    name: 'SIG Lite',
    description: 'Condensed version of SIG with core security questions',
    version: '2024',
    totalQuestions: 125,
    categories: [
      'Security Policy',
      'Access Control',
      'Data Protection',
      'Incident Response',
      'Business Continuity',
    ],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: 'caiq',
    format: 'CAIQ',
    name: 'CAIQ (Consensus Assessments Initiative Questionnaire)',
    description: 'CSA CAIQ for cloud service provider assessments',
    version: '4.0.2',
    totalQuestions: 261,
    categories: [
      'Application & Interface Security',
      'Audit Assurance & Compliance',
      'Business Continuity & Disaster Recovery',
      'Change Control & Configuration',
      'Data Security & Privacy',
      'Datacenter Security',
      'Encryption & Key Management',
      'Governance & Risk Management',
      'Human Resources Security',
      'Identity & Access Management',
      'Infrastructure & Virtualization',
      'Interoperability & Portability',
      'Mobile Security',
      'Security Incident Management',
      'Supply Chain Management',
      'Threat & Vulnerability Management',
    ],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: 'vsa',
    format: 'VSA',
    name: 'VSA (Vendor Security Alliance)',
    description: 'VSA questionnaire for vendor security assessments',
    version: '5.0',
    totalQuestions: 75,
    categories: [
      'Security Governance',
      'Information Security Policies',
      'Human Resource Security',
      'Asset Management',
      'Access Control',
      'Cryptography',
      'Physical Security',
      'Operations Security',
      'Incident Management',
    ],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: 'hecvat',
    format: 'HECVAT',
    name: 'HECVAT (Higher Education Cloud Vendor Assessment)',
    description: 'Assessment tool for higher education cloud services',
    version: '3.0.5',
    totalQuestions: 200,
    categories: [
      'Documentation',
      'Company Information',
      'IT Security Management',
      'Compliance',
      'Data Center',
      'Policies and Procedures',
      'Security Controls',
      'User Security',
      'Application Security',
    ],
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
];

// ============================================================================
// QUESTIONNAIRE SERVICE CLASS
// ============================================================================

class QuestionnaireService {
  private organizationId: string | null = null;

  setOrganization(orgId: string): void {
    this.organizationId = orgId;
  }

  isAvailable(): boolean {
    return isSupabaseConfigured() && this.organizationId !== null;
  }

  // ---------------------------------------------------------------------------
  // QUESTIONNAIRE MANAGEMENT
  // ---------------------------------------------------------------------------

  async getQuestionnaires(
    options?: {
      status?: QuestionnaireStatus;
      format?: QuestionnaireFormat;
      limit?: number;
      offset?: number;
    }
  ): Promise<Questionnaire[]> {
    if (!supabase || !this.organizationId) return [];

    try {
      let query = supabase
        .from('questionnaires')
        .select('*')
        .eq('organization_id', this.organizationId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.format) {
        query = query.eq('format', options.format);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(this.mapToQuestionnaire);
    } catch (error) {
      console.error('Failed to fetch questionnaires:', error);
      return [];
    }
  }

  async getQuestionnaire(questionnaireId: string): Promise<Questionnaire | null> {
    if (!supabase || !this.organizationId) return null;

    try {
      const { data, error } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('id', questionnaireId)
        .eq('organization_id', this.organizationId)
        .single();

      if (error || !data) return null;

      return this.mapToQuestionnaire(data);
    } catch {
      return null;
    }
  }

  async createQuestionnaire(
    name: string,
    customerName: string,
    format: QuestionnaireFormat,
    options?: {
      templateId?: string;
      description?: string;
      dueDate?: string;
      customerEmail?: string;
    }
  ): Promise<{ success: boolean; questionnaire?: Questionnaire; error?: string }> {
    if (!supabase || !this.organizationId) {
      return { success: false, error: 'Service not available' };
    }

    try {
      const { data, error } = await supabase
        .from('questionnaires')
        .insert({
          organization_id: this.organizationId,
          template_id: options?.templateId || null,
          format,
          name,
          description: options?.description || '',
          customer_name: customerName,
          customer_email: options?.customerEmail || null,
          due_date: options?.dueDate || null,
          status: 'draft',
          progress: { total: 0, answered: 0, approved: 0, flagged: 0 },
          metadata: {},
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, questionnaire: this.mapToQuestionnaire(data) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create questionnaire',
      };
    }
  }

  async updateQuestionnaire(
    questionnaireId: string,
    updates: Partial<Pick<Questionnaire, 'name' | 'description' | 'customerName' | 'customerEmail' | 'dueDate' | 'status' | 'metadata'>>
  ): Promise<boolean> {
    if (!supabase || !this.organizationId) return false;

    try {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.customerName !== undefined) updateData.customer_name = updates.customerName;
      if (updates.customerEmail !== undefined) updateData.customer_email = updates.customerEmail;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('questionnaires')
        .update(updateData)
        .eq('id', questionnaireId)
        .eq('organization_id', this.organizationId);

      return !error;
    } catch {
      return false;
    }
  }

  async deleteQuestionnaire(questionnaireId: string): Promise<boolean> {
    if (!supabase || !this.organizationId) return false;

    try {
      const { error } = await supabase
        .from('questionnaires')
        .delete()
        .eq('id', questionnaireId)
        .eq('organization_id', this.organizationId);

      return !error;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // QUESTIONS MANAGEMENT
  // ---------------------------------------------------------------------------

  async getQuestions(questionnaireId: string): Promise<QuestionnaireQuestion[]> {
    if (!supabase || !this.organizationId) return [];

    try {
      const { data, error } = await supabase
        .from('questionnaire_questions')
        .select('*')
        .eq('questionnaire_id', questionnaireId)
        .order('order_num', { ascending: true });

      if (error) throw error;

      return data.map(this.mapToQuestion);
    } catch {
      return [];
    }
  }

  async addQuestions(
    questionnaireId: string,
    questions: Array<{
      categoryId: string;
      categoryName: string;
      questionNumber: string;
      questionText: string;
      questionType: 'yes_no' | 'multiple_choice' | 'text' | 'date' | 'file_upload';
      options?: string[];
      required?: boolean;
      helpText?: string;
      relatedControls?: string[];
    }>
  ): Promise<{ success: boolean; count: number; error?: string }> {
    if (!supabase || !this.organizationId) {
      return { success: false, count: 0, error: 'Service not available' };
    }

    try {
      const existingQuestions = await this.getQuestions(questionnaireId);
      let orderStart = existingQuestions.length;

      const questionRecords = questions.map((q, idx) => ({
        questionnaire_id: questionnaireId,
        category_id: q.categoryId,
        category_name: q.categoryName,
        question_number: q.questionNumber,
        question_text: q.questionText,
        question_type: q.questionType,
        options: q.options || null,
        required: q.required ?? true,
        help_text: q.helpText || null,
        related_controls: q.relatedControls || [],
        order_num: orderStart + idx,
      }));

      const { error } = await supabase
        .from('questionnaire_questions')
        .insert(questionRecords);

      if (error) throw error;

      // Update questionnaire progress
      await this.updateQuestionnaireProgress(questionnaireId);

      return { success: true, count: questions.length };
    } catch (error) {
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Failed to add questions',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // ANSWERS MANAGEMENT
  // ---------------------------------------------------------------------------

  async getAnswers(questionnaireId: string): Promise<QuestionnaireAnswer[]> {
    if (!supabase || !this.organizationId) return [];

    try {
      const { data, error } = await supabase
        .from('questionnaire_answers')
        .select('*')
        .eq('questionnaire_id', questionnaireId);

      if (error) throw error;

      return data.map(this.mapToAnswer);
    } catch {
      return [];
    }
  }

  async saveAnswer(
    questionnaireId: string,
    questionId: string,
    answer: string,
    options?: {
      status?: QuestionStatus;
      notes?: string;
      evidenceUrls?: string[];
      evidenceNotes?: string;
      relatedControlIds?: string[];
    }
  ): Promise<boolean> {
    if (!supabase || !this.organizationId) return false;

    try {
      const { error } = await supabase
        .from('questionnaire_answers')
        .upsert({
          questionnaire_id: questionnaireId,
          question_id: questionId,
          answer,
          status: options?.status || 'reviewed',
          notes: options?.notes || '',
          evidence_urls: options?.evidenceUrls || [],
          evidence_notes: options?.evidenceNotes || '',
          related_control_ids: options?.relatedControlIds || [],
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'questionnaire_id,question_id',
        });

      if (error) throw error;

      // Update progress
      await this.updateQuestionnaireProgress(questionnaireId);

      return true;
    } catch {
      return false;
    }
  }

  async approveAnswer(questionnaireId: string, questionId: string, userId: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('questionnaire_answers')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('questionnaire_id', questionnaireId)
        .eq('question_id', questionId);

      if (error) throw error;

      await this.updateQuestionnaireProgress(questionnaireId);
      return true;
    } catch {
      return false;
    }
  }

  async flagAnswer(
    questionnaireId: string,
    questionId: string,
    reason: string
  ): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('questionnaire_answers')
        .update({
          status: 'flagged',
          flag_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('questionnaire_id', questionnaireId)
        .eq('question_id', questionId);

      if (error) throw error;

      await this.updateQuestionnaireProgress(questionnaireId);
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // AI ANSWER SUGGESTIONS
  // ---------------------------------------------------------------------------

  async generateAIAnswer(
    _questionId: string,
    questionText: string,
    context: AIQuestionnaireContext,
    options?: {
      questionType?: 'yes_no' | 'multiple_choice' | 'text' | 'date' | 'file_upload';
      categoryName?: string;
      helpText?: string;
      questionOptions?: string[];
    }
  ): Promise<AIAnswerSuggestion | null> {
    try {
      const response = await fetch('/.netlify/functions/generate-questionnaire-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          questionType: options?.questionType || 'text',
          categoryName: options?.categoryName || 'General',
          helpText: options?.helpText,
          options: options?.questionOptions,
          organizationName: context.organizationName,
          industry: context.industry,
          companySize: context.companySize,
          frameworks: context.frameworks,
          controlResponses: context.controlResponses,
          existingAnswers: context.existingAnswers,
          customContext: context.customContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI answer');
      }

      const data = await response.json();

      // Map the response to AIAnswerSuggestion format
      return {
        answer: data.answer,
        confidence: data.confidence,
        reasoning: data.reasoning,
        relatedControls: data.relatedControls || [],
        evidenceSuggestions: data.evidenceSuggestions || [],
        similarQuestions: [],
      };
    } catch (error) {
      console.error('AI answer generation failed:', error);
      return null;
    }
  }

  async bulkGenerateAIAnswers(
    questionnaireId: string,
    questionIds: string[],
    context: AIQuestionnaireContext
  ): Promise<{ success: number; failed: number; answers: Map<string, AIAnswerSuggestion> }> {
    const answers = new Map<string, AIAnswerSuggestion>();
    let success = 0;
    let failed = 0;

    const questions = await this.getQuestions(questionnaireId);
    const questionsToProcess = questions.filter(q => questionIds.includes(q.id));

    for (const question of questionsToProcess) {
      const suggestion = await this.generateAIAnswer(
        question.id,
        question.questionText,
        context,
        {
          questionType: question.questionType,
          categoryName: question.categoryName,
          helpText: question.helpText,
          questionOptions: question.options,
        }
      );

      if (suggestion) {
        answers.set(question.id, suggestion);
        success++;

        // Save the AI suggestion
        await supabase?.from('questionnaire_answers').upsert({
          questionnaire_id: questionnaireId,
          question_id: question.id,
          ai_suggested_answer: suggestion.answer,
          ai_confidence: suggestion.confidence,
          ai_reasoning: suggestion.reasoning,
          status: 'ai_suggested',
          related_control_ids: suggestion.relatedControls,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'questionnaire_id,question_id',
        });
      } else {
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await this.updateQuestionnaireProgress(questionnaireId);

    return { success, failed, answers };
  }

  // ---------------------------------------------------------------------------
  // QUESTION LIBRARY
  // ---------------------------------------------------------------------------

  async getLibraryItems(
    options?: { category?: string; search?: string; limit?: number }
  ): Promise<QuestionLibraryItem[]> {
    if (!supabase || !this.organizationId) return [];

    try {
      let query = supabase
        .from('question_library')
        .select('*')
        .eq('organization_id', this.organizationId)
        .order('usage_count', { ascending: false });

      if (options?.category) {
        query = query.eq('category', options.category);
      }
      if (options?.search) {
        query = query.ilike('question_text', `%${options.search}%`);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(this.mapToLibraryItem);
    } catch {
      return [];
    }
  }

  async addToLibrary(
    questionText: string,
    standardAnswer: string,
    options?: {
      answerType?: 'yes_no' | 'text' | 'multiple_choice';
      relatedControls?: string[];
      category?: string;
      tags?: string[];
      confidence?: AnswerConfidence;
    }
  ): Promise<{ success: boolean; item?: QuestionLibraryItem; error?: string }> {
    if (!supabase || !this.organizationId) {
      return { success: false, error: 'Service not available' };
    }

    try {
      const normalizedQuestion = this.normalizeQuestion(questionText);

      const { data, error } = await supabase
        .from('question_library')
        .insert({
          organization_id: this.organizationId,
          question_text: questionText,
          normalized_question: normalizedQuestion,
          standard_answer: standardAnswer,
          answer_type: options?.answerType || 'text',
          related_controls: options?.relatedControls || [],
          evidence_references: [],
          category: options?.category || 'General',
          tags: options?.tags || [],
          usage_count: 0,
          confidence: options?.confidence || 'medium',
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, item: this.mapToLibraryItem(data) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add to library',
      };
    }
  }

  async findSimilarQuestions(
    questionText: string,
    limit: number = 5
  ): Promise<QuestionLibraryItem[]> {
    if (!supabase || !this.organizationId) return [];

    try {
      // Simple similarity search based on keywords
      // In production, you'd use vector embeddings
      const keywords = this.extractKeywords(questionText);

      const { data, error } = await supabase
        .from('question_library')
        .select('*')
        .eq('organization_id', this.organizationId)
        .limit(limit * 3);

      if (error || !data) return [];

      // Score and rank by keyword overlap
      const scored = data.map(item => {
        const itemKeywords = this.extractKeywords(item.question_text);
        const overlap = keywords.filter(k => itemKeywords.includes(k)).length;
        return { item, score: overlap / Math.max(keywords.length, 1) };
      });

      return scored
        .filter(s => s.score > 0.2)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(s => this.mapToLibraryItem(s.item));
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // IMPORT / EXPORT
  // ---------------------------------------------------------------------------

  async importQuestionnaire(
    file: File,
    customerName: string,
    format: QuestionnaireFormat
  ): Promise<QuestionnaireImportResult> {
    // This would parse CSV/Excel files and create questionnaire
    // For now, return a placeholder implementation
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());

      if (lines.length < 2) {
        return {
          success: false,
          errors: ['File must contain at least a header row and one question'],
          importedCount: 0,
          skippedCount: 0,
        };
      }

      // Create questionnaire
      const result = await this.createQuestionnaire(
        file.name.replace(/\.[^.]+$/, ''),
        customerName,
        format,
        { description: `Imported from ${file.name}` }
      );

      if (!result.success || !result.questionnaire) {
        return {
          success: false,
          errors: [result.error || 'Failed to create questionnaire'],
          importedCount: 0,
          skippedCount: 0,
        };
      }

      // Parse questions from CSV (simplified)
      // Expected format: category, question_number, question_text, question_type
      const questions: Array<{
        categoryId: string;
        categoryName: string;
        questionNumber: string;
        questionText: string;
        questionType: 'yes_no' | 'multiple_choice' | 'text' | 'date' | 'file_upload';
      }> = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 3) {
          questions.push({
            categoryId: parts[0] || 'general',
            categoryName: parts[0] || 'General',
            questionNumber: parts[1] || `Q${i}`,
            questionText: parts[2] || '',
            questionType: (parts[3] as 'yes_no' | 'text') || 'text',
          });
        }
      }

      const addResult = await this.addQuestions(result.questionnaire.id, questions);

      return {
        success: true,
        questionnaire: result.questionnaire,
        importedCount: addResult.count,
        skippedCount: lines.length - 1 - addResult.count,
        warnings: addResult.count < lines.length - 1
          ? ['Some rows were skipped due to parsing errors']
          : undefined,
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Import failed'],
        importedCount: 0,
        skippedCount: 0,
      };
    }
  }

  async exportQuestionnaire(
    questionnaireId: string,
    options: QuestionnaireExportOptions
  ): Promise<Blob | null> {
    try {
      const [questionnaire, questions, answers] = await Promise.all([
        this.getQuestionnaire(questionnaireId),
        this.getQuestions(questionnaireId),
        this.getAnswers(questionnaireId),
      ]);

      if (!questionnaire) return null;

      const answersMap = new Map(answers.map(a => [a.questionId, a]));

      if (options.format === 'json') {
        const exportData = {
          questionnaire,
          questions: questions.map(q => ({
            ...q,
            answer: answersMap.get(q.id)?.answer || '',
            ...(options.includeAIReasoning && {
              aiReasoning: answersMap.get(q.id)?.aiReasoning,
            }),
            ...(options.includeControlMappings && {
              relatedControls: q.relatedControls,
            }),
          })),
        };
        return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      }

      if (options.format === 'csv') {
        const headers = ['Category', 'Question Number', 'Question', 'Answer'];
        if (options.includeAIReasoning) headers.push('AI Reasoning');
        if (options.includeControlMappings) headers.push('Related Controls');
        if (options.includeEvidence) headers.push('Evidence Notes');

        const rows = questions.map(q => {
          const answer = answersMap.get(q.id);
          const row = [
            q.categoryName,
            q.questionNumber,
            `"${q.questionText.replace(/"/g, '""')}"`,
            `"${(answer?.answer || '').replace(/"/g, '""')}"`,
          ];
          if (options.includeAIReasoning) {
            row.push(`"${(answer?.aiReasoning || '').replace(/"/g, '""')}"`);
          }
          if (options.includeControlMappings) {
            row.push(q.relatedControls.join('; '));
          }
          if (options.includeEvidence) {
            row.push(`"${(answer?.evidenceNotes || '').replace(/"/g, '""')}"`);
          }
          return row.join(',');
        });

        return new Blob([headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
      }

      // For xlsx/pdf, return null - would need additional libraries
      return null;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------------------------------

  async getStats(): Promise<QuestionnaireStats | null> {
    if (!supabase || !this.organizationId) return null;

    try {
      const { data: questionnaires } = await supabase
        .from('questionnaires')
        .select('id, status, created_at, updated_at, format')
        .eq('organization_id', this.organizationId);

      if (!questionnaires) return null;

      const now = new Date();
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

      const completedThisMonth = questionnaires.filter(
        q => q.status === 'completed' && new Date(q.updated_at) >= monthAgo
      ).length;

      // Calculate average completion time for completed questionnaires
      const completedWithTimes = questionnaires.filter(q => q.status === 'completed');
      const totalTime = completedWithTimes.reduce((sum, q) => {
        const created = new Date(q.created_at).getTime();
        const completed = new Date(q.updated_at).getTime();
        return sum + (completed - created);
      }, 0);
      const avgTime = completedWithTimes.length > 0
        ? Math.round(totalTime / completedWithTimes.length / (1000 * 60 * 60 * 24))
        : 0;

      // Get AI acceptance rate from answers
      const { data: answers } = await supabase
        .from('questionnaire_answers')
        .select('status, ai_suggested_answer')
        .in('questionnaire_id', questionnaires.map(q => q.id));

      const aiSuggested = answers?.filter(a => a.ai_suggested_answer) || [];
      const aiAccepted = aiSuggested.filter(a => a.status === 'approved').length;
      const aiAcceptanceRate = aiSuggested.length > 0
        ? Math.round((aiAccepted / aiSuggested.length) * 100)
        : 0;

      // Top formats
      const formatCounts = questionnaires.reduce((acc, q) => {
        acc[q.format] = (acc[q.format] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalQuestionnaires: questionnaires.length,
        completedThisMonth,
        averageCompletionTime: avgTime,
        aiAcceptanceRate,
        topCategories: Object.entries(formatCounts)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        recentActivity: questionnaires
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 10)
          .map(q => ({
            questionnaireId: q.id,
            action: q.status,
            timestamp: q.updated_at,
          })),
      };
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async updateQuestionnaireProgress(questionnaireId: string): Promise<void> {
    if (!supabase) return;

    try {
      const [questions, answers] = await Promise.all([
        this.getQuestions(questionnaireId),
        this.getAnswers(questionnaireId),
      ]);

      const progress = {
        total: questions.length,
        answered: answers.filter(a => a.answer && a.answer.trim()).length,
        approved: answers.filter(a => a.status === 'approved').length,
        flagged: answers.filter(a => a.status === 'flagged').length,
      };

      await supabase
        .from('questionnaires')
        .update({ progress, updated_at: new Date().toISOString() })
        .eq('id', questionnaireId);
    } catch {
      // Silently fail progress update
    }
  }

  private normalizeQuestion(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
      'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where', 'why',
      'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
      'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
      'so', 'than', 'too', 'very', 'just', 'your', 'you', 'our', 'we',
      'does', 'organization', 'company', 'business', 'please', 'describe',
    ]);

    return this.normalizeQuestion(text)
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  private mapToQuestionnaire(data: Record<string, unknown>): Questionnaire {
    return {
      id: data.id as string,
      organizationId: data.organization_id as string,
      templateId: data.template_id as string | null,
      format: data.format as QuestionnaireFormat,
      name: data.name as string,
      description: data.description as string || '',
      customerName: data.customer_name as string,
      customerEmail: data.customer_email as string | undefined,
      dueDate: data.due_date as string | null,
      status: data.status as QuestionnaireStatus,
      progress: data.progress as Questionnaire['progress'],
      metadata: data.metadata as Questionnaire['metadata'] || {},
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      createdBy: data.created_by as string,
    };
  }

  private mapToQuestion(data: Record<string, unknown>): QuestionnaireQuestion {
    return {
      id: data.id as string,
      questionnaireId: data.questionnaire_id as string,
      categoryId: data.category_id as string,
      categoryName: data.category_name as string,
      questionNumber: data.question_number as string,
      questionText: data.question_text as string,
      questionType: data.question_type as QuestionnaireQuestion['questionType'],
      options: data.options as string[] | undefined,
      required: data.required as boolean,
      helpText: data.help_text as string | undefined,
      relatedControls: data.related_controls as string[] || [],
      order: data.order_num as number,
    };
  }

  private mapToAnswer(data: Record<string, unknown>): QuestionnaireAnswer {
    return {
      id: data.id as string,
      questionnaireId: data.questionnaire_id as string,
      questionId: data.question_id as string,
      status: data.status as QuestionStatus,
      answer: data.answer as string || '',
      aiSuggestedAnswer: data.ai_suggested_answer as string | undefined,
      aiConfidence: data.ai_confidence as AnswerConfidence | undefined,
      aiReasoning: data.ai_reasoning as string | undefined,
      evidenceUrls: data.evidence_urls as string[] || [],
      evidenceNotes: data.evidence_notes as string || '',
      relatedControlIds: data.related_control_ids as string[] || [],
      reviewedBy: data.reviewed_by as string | undefined,
      reviewedAt: data.reviewed_at as string | undefined,
      approvedBy: data.approved_by as string | undefined,
      approvedAt: data.approved_at as string | undefined,
      flagReason: data.flag_reason as string | undefined,
      notes: data.notes as string || '',
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }

  private mapToLibraryItem(data: Record<string, unknown>): QuestionLibraryItem {
    return {
      id: data.id as string,
      organizationId: data.organization_id as string,
      questionText: data.question_text as string,
      normalizedQuestion: data.normalized_question as string,
      standardAnswer: data.standard_answer as string,
      answerType: data.answer_type as 'yes_no' | 'text' | 'multiple_choice',
      relatedControls: data.related_controls as string[] || [],
      evidenceReferences: data.evidence_references as string[] || [],
      category: data.category as string,
      tags: data.tags as string[] || [],
      usageCount: data.usage_count as number,
      lastUsed: data.last_used as string | null,
      confidence: data.confidence as AnswerConfidence,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      createdBy: data.created_by as string,
      approvedBy: data.approved_by as string | undefined,
    };
  }

  getTemplates(): QuestionnaireTemplate[] {
    return QUESTIONNAIRE_TEMPLATES;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const questionnaireService = new QuestionnaireService();
export default questionnaireService;
