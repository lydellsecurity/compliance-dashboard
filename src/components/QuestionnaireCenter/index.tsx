/**
 * Security Questionnaire Automation Center
 *
 * Complete overhaul of questionnaire automation with:
 * - Knowledge Base data aggregator (pulls compliant controls, approved policies, evidence)
 * - Excel/CSV upload with AI-powered answer mapping
 * - Dual-pane view: Original question + AI suggestion with source control
 * - Confidence scores with amber highlighting for low confidence
 * - Human-in-the-loop: Approve, Edit, Reject workflow
 * - QA Library with learning capability
 * - Export back to Excel/CSV
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  Eye,
  BookOpen,
  Database,
} from 'lucide-react';
import type { UseComplianceReturn } from '../../hooks/useCompliance';
import { questionnaireService } from '../../services/questionnaire.service';
import type {
  QuestionLibraryItem,
  AnswerConfidence,
  AIQuestionnaireContext,
} from '../../types/questionnaire.types';

// Sub-components
import KnowledgeBasePanel from './KnowledgeBasePanel';
import UploadWizard from './UploadWizard';
import DualPaneReview from './DualPaneReview';
import QALibraryManager from './QALibraryManager';

// ============================================================================
// TYPES
// ============================================================================

export interface QuestionnaireCenterProps {
  compliance: UseComplianceReturn;
  organizationId: string;
  userId: string;
  organizationName: string;
}

export interface KnowledgeBaseContext {
  compliantControls: Array<{
    id: string;
    title: string;
    domain: string;
    answer: 'yes' | 'partial';
    evidence?: string;
  }>;
  policies: Array<{
    id: string;
    name: string;
    status: string;
    description: string;
  }>;
  evidenceItems: Array<{
    controlId: string;
    type: string;
    description: string;
    fileName?: string;
  }>;
  frameworks: string[];
  totalCompliant: number;
  totalWithEvidence: number;
}

export interface ParsedQuestion {
  id: string;
  rowNumber: number;
  originalQuestion: string;
  category?: string;
  questionType: 'yes_no' | 'text' | 'multiple_choice';
  required: boolean;
  aiAnswer?: string;
  aiConfidence?: AnswerConfidence;
  aiReasoning?: string;
  relatedControlIds?: string[];
  status: 'pending' | 'generating' | 'suggested' | 'approved' | 'rejected' | 'edited';
  userAnswer?: string;
  userNotes?: string;
}

export type ViewMode = 'upload' | 'review' | 'library' | 'knowledge';

// ============================================================================
// CONSTANTS
// ============================================================================

export const CONFIDENCE_CONFIG: Record<AnswerConfidence, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}> = {
  high: {
    label: 'High Confidence',
    color: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  medium: {
    label: 'Medium Confidence',
    color: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  low: {
    label: 'Low Confidence - Review Required',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
};

export const STATUS_CONFIG: Record<ParsedQuestion['status'], {
  label: string;
  color: string;
  bgColor: string;
}> = {
  pending: { label: 'Pending', color: '#64748B', bgColor: '#F1F5F9' },
  generating: { label: 'Generating...', color: '#3B82F6', bgColor: '#EFF6FF' },
  suggested: { label: 'AI Suggested', color: '#8B5CF6', bgColor: '#F5F3FF' },
  approved: { label: 'Approved', color: '#059669', bgColor: '#ECFDF5' },
  rejected: { label: 'Rejected', color: '#DC2626', bgColor: '#FEF2F2' },
  edited: { label: 'Edited', color: '#D97706', bgColor: '#FFFBEB' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const QuestionnaireCenter: React.FC<QuestionnaireCenterProps> = ({
  compliance,
  organizationId,
  userId: _userId,
  organizationName,
}) => {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseContext | null>(null);
  const [isLoadingKB, setIsLoadingKB] = useState(true);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [qaLibrary, setQaLibrary] = useState<QuestionLibraryItem[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterConfidence, setFilterConfidence] = useState<AnswerConfidence | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ParsedQuestion['status'] | 'all'>('all');
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    lowConfidence: 0,
  });

  // Initialize service
  useEffect(() => {
    questionnaireService.setOrganization(organizationId);
  }, [organizationId]);

  // Build Knowledge Base from compliance data
  const buildKnowledgeBase = useCallback(() => {
    setIsLoadingKB(true);

    try {
      // Get all controls and their responses
      const allControls = compliance.allControls;
      const compliantControls: KnowledgeBaseContext['compliantControls'] = [];
      const evidenceItems: KnowledgeBaseContext['evidenceItems'] = [];

      allControls.forEach(control => {
        const response = compliance.getResponse(control.id);
        if (response && (response.answer === 'yes' || response.answer === 'partial')) {
          compliantControls.push({
            id: control.id,
            title: control.title,
            domain: control.domain,
            answer: response.answer,
            evidence: response.remediationPlan, // Use remediation as evidence description
          });
        }
      });

      // Get all evidence records
      const allEvidence = compliance.getAllEvidence();
      allEvidence.forEach(evidence => {
        evidenceItems.push({
          controlId: evidence.controlId,
          type: evidence.status, // Use status as type indicator
          description: evidence.notes,
          fileName: evidence.fileUrls?.[0], // Use first file URL as fileName
        });
      });

      // Get active frameworks
      const frameworks = compliance.frameworkProgress
        .filter(fp => fp.percentage > 0)
        .map(fp => fp.name);

      setKnowledgeBase({
        compliantControls,
        policies: [], // TODO: Integrate policy service when available
        evidenceItems,
        frameworks,
        totalCompliant: compliantControls.length,
        totalWithEvidence: evidenceItems.length,
      });
    } catch (error) {
      console.error('Failed to build knowledge base:', error);
    } finally {
      setIsLoadingKB(false);
    }
  }, [compliance]);

  // Load knowledge base on mount
  useEffect(() => {
    buildKnowledgeBase();
  }, [buildKnowledgeBase]);

  // Load QA Library
  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const items = await questionnaireService.getLibraryItems({ limit: 100 });
        setQaLibrary(items);
      } catch (error) {
        console.error('Failed to load QA library:', error);
      }
    };
    loadLibrary();
  }, [organizationId]);

  // Update stats whenever questions change
  useEffect(() => {
    const total = parsedQuestions.length;
    const approved = parsedQuestions.filter(q => q.status === 'approved').length;
    const pending = parsedQuestions.filter(q => q.status === 'pending' || q.status === 'suggested').length;
    const lowConfidence = parsedQuestions.filter(q => q.aiConfidence === 'low').length;
    setStats({ total, approved, pending, lowConfidence });
  }, [parsedQuestions]);

  // Build AI context from knowledge base
  const buildAIContext = useCallback((): AIQuestionnaireContext => {
    if (!knowledgeBase) {
      return {
        organizationName,
        frameworks: [],
        controlResponses: [],
        existingAnswers: qaLibrary,
      };
    }

    return {
      organizationName,
      frameworks: knowledgeBase.frameworks,
      controlResponses: knowledgeBase.compliantControls.map(c => ({
        controlId: c.id,
        controlTitle: c.title,
        answer: c.answer === 'yes' ? 'Implemented' : 'Partially Implemented',
        evidenceNotes: c.evidence,
      })),
      existingAnswers: qaLibrary,
    };
  }, [knowledgeBase, organizationName, qaLibrary]);

  // Handle file upload
  const handleFileUpload = useCallback((questions: ParsedQuestion[], fileName: string) => {
    setParsedQuestions(questions);
    setUploadedFileName(fileName);
    setViewMode('review');
  }, []);

  // Generate AI answers for all pending questions
  const generateAllAnswers = useCallback(async () => {
    if (!knowledgeBase) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    const pendingQuestions = parsedQuestions.filter(q => q.status === 'pending');
    const context = buildAIContext();
    const totalToProcess = pendingQuestions.length;
    let processed = 0;

    for (const question of pendingQuestions) {
      try {
        // Update status to generating
        setParsedQuestions(prev =>
          prev.map(q => q.id === question.id ? { ...q, status: 'generating' as const } : q)
        );

        // Call AI service
        const suggestion = await questionnaireService.generateAIAnswer(
          question.id,
          question.originalQuestion,
          context,
          {
            questionType: question.questionType,
            categoryName: question.category,
          }
        );

        // Update with AI response
        if (suggestion) {
          setParsedQuestions(prev =>
            prev.map(q =>
              q.id === question.id
                ? {
                    ...q,
                    status: 'suggested' as const,
                    aiAnswer: suggestion.answer,
                    aiConfidence: suggestion.confidence,
                    aiReasoning: suggestion.reasoning,
                    relatedControlIds: suggestion.relatedControls,
                  }
                : q
            )
          );
        }

        processed++;
        setGenerationProgress(Math.round((processed / totalToProcess) * 100));

        // Rate limit delay
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to generate answer for question ${question.id}:`, error);
        setParsedQuestions(prev =>
          prev.map(q =>
            q.id === question.id
              ? { ...q, status: 'pending' as const }
              : q
          )
        );
      }
    }

    setIsGenerating(false);
  }, [parsedQuestions, knowledgeBase, buildAIContext]);

  // Approve an answer
  const handleApprove = useCallback(async (questionId: string) => {
    const question = parsedQuestions.find(q => q.id === questionId);
    if (!question || !question.aiAnswer) return;

    // Update local state
    setParsedQuestions(prev =>
      prev.map(q =>
        q.id === questionId
          ? { ...q, status: 'approved' as const, userAnswer: question.aiAnswer }
          : q
      )
    );

    // Save to QA library for future learning
    try {
      await questionnaireService.addToLibrary(
        question.originalQuestion,
        question.aiAnswer,
        {
          category: question.category,
          relatedControls: question.relatedControlIds || [],
          confidence: question.aiConfidence || 'medium',
        }
      );
    } catch (error) {
      console.error('Failed to save to library:', error);
    }
  }, [parsedQuestions]);

  // Reject an answer
  const handleReject = useCallback((questionId: string) => {
    setParsedQuestions(prev =>
      prev.map(q =>
        q.id === questionId
          ? { ...q, status: 'rejected' as const }
          : q
      )
    );
  }, []);

  // Edit an answer
  const handleEdit = useCallback((questionId: string, newAnswer: string, notes?: string) => {
    setParsedQuestions(prev =>
      prev.map(q =>
        q.id === questionId
          ? { ...q, status: 'edited' as const, userAnswer: newAnswer, userNotes: notes }
          : q
      )
    );

    // Save edited answer to library
    const question = parsedQuestions.find(q => q.id === questionId);
    if (question) {
      questionnaireService.addToLibrary(
        question.originalQuestion,
        newAnswer,
        {
          category: question.category,
          relatedControls: question.relatedControlIds || [],
          confidence: 'high', // User-edited = high confidence
        }
      ).catch(console.error);
    }
  }, [parsedQuestions]);

  // Export to Excel/CSV
  const handleExport = useCallback(async (format: 'xlsx' | 'csv') => {
    const exportData = parsedQuestions.map(q => ({
      'Question #': q.rowNumber,
      'Category': q.category || '',
      'Question': q.originalQuestion,
      'Answer': q.userAnswer || q.aiAnswer || '',
      'Confidence': q.aiConfidence || '',
      'Status': STATUS_CONFIG[q.status].label,
      'AI Reasoning': q.aiReasoning || '',
      'Related Controls': (q.relatedControlIds || []).join(', '),
      'Notes': q.userNotes || '',
    }));

    // Create CSV content
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row =>
        headers.map(h => {
          const value = String((row as Record<string, unknown>)[h] || '');
          return value.includes(',') || value.includes('"') || value.includes('\n')
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',')
      ),
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${uploadedFileName.replace(/\.[^.]+$/, '')}_completed.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [parsedQuestions, uploadedFileName]);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    return parsedQuestions.filter(q => {
      const matchesSearch = !searchTerm ||
        q.originalQuestion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.aiAnswer || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesConfidence = filterConfidence === 'all' || q.aiConfidence === filterConfidence;
      const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
      return matchesSearch && matchesConfidence && matchesStatus;
    });
  }, [parsedQuestions, searchTerm, filterConfidence, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            Security Questionnaire Automation Center
          </h2>
          <p className="text-slate-500 mt-1">
            AI-powered questionnaire response with intelligent control mapping
          </p>
        </div>

        {/* Quick Stats */}
        {parsedQuestions.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="text-center px-4">
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
            <div className="text-center px-4 border-l border-slate-200">
              <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
              <p className="text-xs text-slate-500">Approved</p>
            </div>
            <div className="text-center px-4 border-l border-slate-200">
              <p className="text-2xl font-bold text-amber-600">{stats.lowConfidence}</p>
              <p className="text-xs text-slate-500">Review Needed</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setViewMode('upload')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            viewMode === 'upload'
              ? 'bg-violet-100 text-violet-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4 inline-block mr-2" />
          Upload Questionnaire
        </button>
        <button
          onClick={() => setViewMode('review')}
          disabled={parsedQuestions.length === 0}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            viewMode === 'review'
              ? 'bg-violet-100 text-violet-700'
              : parsedQuestions.length === 0
              ? 'text-slate-400 cursor-not-allowed'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Eye className="w-4 h-4 inline-block mr-2" />
          Review Answers
          {parsedQuestions.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-slate-200 rounded-full text-xs">
              {parsedQuestions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewMode('library')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            viewMode === 'library'
              ? 'bg-violet-100 text-violet-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4 inline-block mr-2" />
          QA Library
        </button>
        <button
          onClick={() => setViewMode('knowledge')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            viewMode === 'knowledge'
              ? 'bg-violet-100 text-violet-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4 inline-block mr-2" />
          Knowledge Base
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Export Button */}
        {parsedQuestions.length > 0 && viewMode === 'review' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <UploadWizard
              onUpload={handleFileUpload}
              knowledgeBase={knowledgeBase}
              isLoadingKB={isLoadingKB}
            />
          </motion.div>
        )}

        {viewMode === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <DualPaneReview
              questions={filteredQuestions}
              allQuestions={parsedQuestions}
              selectedQuestionId={selectedQuestionId}
              onSelectQuestion={setSelectedQuestionId}
              onApprove={handleApprove}
              onReject={handleReject}
              onEdit={handleEdit}
              onGenerateAll={generateAllAnswers}
              isGenerating={isGenerating}
              generationProgress={generationProgress}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filterConfidence={filterConfidence}
              onFilterConfidenceChange={setFilterConfidence}
              filterStatus={filterStatus}
              onFilterStatusChange={setFilterStatus}
              compliance={compliance}
              knowledgeBase={knowledgeBase}
            />
          </motion.div>
        )}

        {viewMode === 'library' && (
          <motion.div
            key="library"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <QALibraryManager
              items={qaLibrary}
              onRefresh={() => {
                questionnaireService.getLibraryItems({ limit: 100 })
                  .then(setQaLibrary)
                  .catch(console.error);
              }}
              organizationId={organizationId}
            />
          </motion.div>
        )}

        {viewMode === 'knowledge' && (
          <motion.div
            key="knowledge"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <KnowledgeBasePanel
              knowledgeBase={knowledgeBase}
              isLoading={isLoadingKB}
              onRefresh={buildKnowledgeBase}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuestionnaireCenter;
