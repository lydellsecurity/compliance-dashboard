/**
 * Security Questionnaire Automation Component
 *
 * AI-powered security questionnaire management with:
 * - Questionnaire creation from templates (SIG, CAIQ, VSA, HECVAT)
 * - AI-generated answer suggestions
 * - Question library for reusable answers
 * - Bulk answer generation
 * - Import/Export functionality
 * - Progress tracking and approval workflow
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  FileText,
  Bot,
  CheckCircle,
  Clock,
  Send,
  Download,
  Edit,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Sparkles,
  ThumbsUp,
  Flag,
  Calendar,
  Building,
  X,
  Check,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import {
  questionnaireService,
  QUESTIONNAIRE_TEMPLATES,
} from '../services/questionnaire.service';
import type {
  Questionnaire,
  QuestionnaireQuestion,
  QuestionnaireAnswer,
  QuestionLibraryItem,
  QuestionnaireFormat,
  QuestionnaireStatus,
  QuestionStatus,
  AnswerConfidence,
  AIQuestionnaireContext,
} from '../types/questionnaire.types';

// ============================================================================
// TYPES
// ============================================================================

interface QuestionnaireAutomationProps {
  organizationId: string;
  userId: string;
  userEmail: string;
}

type ViewMode = 'list' | 'detail' | 'library';

// ============================================================================
// CONSTANTS
// ============================================================================

const FORMAT_LABELS: Record<QuestionnaireFormat, string> = {
  SIG: 'SIG (Full)',
  SIG_LITE: 'SIG Lite',
  CAIQ: 'CAIQ',
  VSA: 'VSA',
  HECVAT: 'HECVAT',
  CUSTOM: 'Custom',
};

const STATUS_CONFIG: Record<QuestionnaireStatus, { color: string; bgColor: string; icon: React.ReactNode }> = {
  draft: { color: 'text-slate-600 dark:text-steel-400', bgColor: 'bg-slate-100 dark:bg-steel-800', icon: <Edit className="w-4 h-4" /> },
  in_progress: { color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: <Clock className="w-4 h-4" /> },
  completed: { color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', icon: <CheckCircle className="w-4 h-4" /> },
  submitted: { color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: <Send className="w-4 h-4" /> },
  archived: { color: 'text-gray-500 dark:text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800', icon: <FileText className="w-4 h-4" /> },
};

const QUESTION_STATUS_CONFIG: Record<QuestionStatus, { color: string; bgColor: string; label: string }> = {
  pending: { color: 'text-slate-600 dark:text-steel-400', bgColor: 'bg-slate-100 dark:bg-steel-800', label: 'Pending' },
  ai_suggested: { color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', label: 'AI Suggested' },
  reviewed: { color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', label: 'Reviewed' },
  approved: { color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Approved' },
  flagged: { color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', label: 'Flagged' },
};

const CONFIDENCE_CONFIG: Record<AnswerConfidence, { color: string; label: string }> = {
  high: { color: 'text-emerald-600 dark:text-emerald-400', label: 'High Confidence' },
  medium: { color: 'text-amber-600 dark:text-amber-400', label: 'Medium Confidence' },
  low: { color: 'text-red-600 dark:text-red-400', label: 'Low Confidence' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const QuestionnaireAutomation: React.FC<QuestionnaireAutomationProps> = ({
  organizationId,
  userId,
  userEmail: _userEmail,
}) => {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, QuestionnaireAnswer>>({});
  const [libraryItems, setLibraryItems] = useState<QuestionLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<QuestionnaireStatus | ''>('');
  const [filterFormat, setFilterFormat] = useState<QuestionnaireFormat | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [aiGenerating, setAiGenerating] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalQuestionnaires: number;
    completedThisMonth: number;
    averageCompletionTime: number;
    aiAcceptanceRate: number;
  } | null>(null);

  // Initialize service
  useEffect(() => {
    questionnaireService.setOrganization(organizationId);
  }, [organizationId]);

  // Load initial data
  useEffect(() => {
    loadQuestionnaires();
    loadStats();
  }, [organizationId]);

  // Load questionnaires
  const loadQuestionnaires = useCallback(async () => {
    setLoading(true);
    try {
      const data = await questionnaireService.getQuestionnaires({
        status: filterStatus || undefined,
        format: filterFormat || undefined,
      });
      setQuestionnaires(data);
    } catch (error) {
      console.error('Failed to load questionnaires:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterFormat]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const data = await questionnaireService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  // Load questionnaire details
  const loadQuestionnaireDetails = useCallback(async (questionnaire: Questionnaire) => {
    setLoading(true);
    try {
      const [questionData, answerData] = await Promise.all([
        questionnaireService.getQuestions(questionnaire.id),
        questionnaireService.getAnswers(questionnaire.id),
      ]);
      setQuestions(questionData);

      // Convert answers array to map by question ID
      const answerMap: Record<string, QuestionnaireAnswer> = {};
      answerData.forEach(answer => {
        answerMap[answer.questionId] = answer;
      });
      setAnswers(answerMap);

      // Expand all categories by default
      const categories = new Set(questionData.map(q => q.categoryName));
      setExpandedCategories(categories);
    } catch (error) {
      console.error('Failed to load questionnaire details:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load library items
  const loadLibraryItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await questionnaireService.getLibraryItems({
        search: searchText || undefined,
      });
      setLibraryItems(data);
    } catch (error) {
      console.error('Failed to load library items:', error);
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  // Handle view mode change
  useEffect(() => {
    if (viewMode === 'library') {
      loadLibraryItems();
    } else if (viewMode === 'list') {
      loadQuestionnaires();
    }
  }, [viewMode, loadLibraryItems, loadQuestionnaires]);

  // Handle questionnaire selection
  const handleSelectQuestionnaire = (questionnaire: Questionnaire) => {
    setSelectedQuestionnaire(questionnaire);
    setViewMode('detail');
    loadQuestionnaireDetails(questionnaire);
  };

  // Handle create questionnaire
  const handleCreateQuestionnaire = async (data: {
    templateId: string;
    format: QuestionnaireFormat;
    name: string;
    customerName: string;
    customerEmail?: string;
    dueDate?: string;
  }) => {
    setProcessing(true);
    try {
      const result = await questionnaireService.createQuestionnaire(
        data.name,
        data.customerName,
        data.format,
        {
          templateId: data.templateId,
          customerEmail: data.customerEmail,
          dueDate: data.dueDate,
        }
      );

      if (result.success && result.questionnaire) {
        setShowCreateModal(false);
        handleSelectQuestionnaire(result.questionnaire);
      }
    } catch (error) {
      console.error('Failed to create questionnaire:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Handle save answer
  const handleSaveAnswer = async (questionId: string, answer: string, notes?: string) => {
    if (!selectedQuestionnaire) return;

    try {
      const success = await questionnaireService.saveAnswer(
        selectedQuestionnaire.id,
        questionId,
        answer,
        { notes }
      );

      if (success) {
        // Update local state
        setAnswers(prev => ({
          ...prev,
          [questionId]: {
            ...prev[questionId],
            id: prev[questionId]?.id || questionId,
            questionnaireId: selectedQuestionnaire.id,
            questionId,
            answer,
            notes: notes || '',
            status: 'reviewed' as QuestionStatus,
            evidenceUrls: prev[questionId]?.evidenceUrls || [],
            evidenceNotes: prev[questionId]?.evidenceNotes || '',
            relatedControlIds: prev[questionId]?.relatedControlIds || [],
            createdAt: prev[questionId]?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }));
      }
    } catch (error) {
      console.error('Failed to save answer:', error);
    }
  };

  // Handle approve answer
  const handleApproveAnswer = async (questionId: string) => {
    if (!selectedQuestionnaire) return;

    try {
      const success = await questionnaireService.approveAnswer(
        selectedQuestionnaire.id,
        questionId,
        userId
      );

      if (success) {
        setAnswers(prev => ({
          ...prev,
          [questionId]: {
            ...prev[questionId],
            status: 'approved' as QuestionStatus,
            approvedBy: userId,
            approvedAt: new Date().toISOString(),
          },
        }));
      }
    } catch (error) {
      console.error('Failed to approve answer:', error);
    }
  };

  // Handle flag answer
  const handleFlagAnswer = async (questionId: string, reason: string) => {
    if (!selectedQuestionnaire) return;

    try {
      const success = await questionnaireService.flagAnswer(
        selectedQuestionnaire.id,
        questionId,
        reason
      );

      if (success) {
        setAnswers(prev => ({
          ...prev,
          [questionId]: {
            ...prev[questionId],
            status: 'flagged' as QuestionStatus,
            flagReason: reason,
          },
        }));
      }
    } catch (error) {
      console.error('Failed to flag answer:', error);
    }
  };

  // Build AI context
  const buildAIContext = useCallback((): AIQuestionnaireContext => {
    return {
      organizationName: 'Organization', // Would come from org context
      frameworks: ['SOC2', 'ISO27001'],
      controlResponses: [],
      existingAnswers: libraryItems.slice(0, 10),
    };
  }, [libraryItems]);

  // Handle generate AI answer
  const handleGenerateAIAnswer = async (question: QuestionnaireQuestion) => {
    if (!selectedQuestionnaire) return;

    setAiGenerating(question.id);
    try {
      const context = buildAIContext();
      const suggestion = await questionnaireService.generateAIAnswer(
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
        // Save the AI suggestion
        const existingAnswer = answers[question.id];
        await questionnaireService.saveAnswer(
          selectedQuestionnaire.id,
          question.id,
          existingAnswer?.answer || suggestion.answer
        );

        // Update with AI suggestion data
        setAnswers(prev => ({
          ...prev,
          [question.id]: {
            ...prev[question.id],
            id: prev[question.id]?.id || question.id,
            questionnaireId: selectedQuestionnaire.id,
            questionId: question.id,
            answer: prev[question.id]?.answer || suggestion.answer,
            aiSuggestedAnswer: suggestion.answer,
            aiConfidence: suggestion.confidence,
            aiReasoning: suggestion.reasoning,
            status: 'ai_suggested' as QuestionStatus,
            evidenceUrls: prev[question.id]?.evidenceUrls || [],
            evidenceNotes: prev[question.id]?.evidenceNotes || '',
            relatedControlIds: suggestion.relatedControls,
            notes: prev[question.id]?.notes || '',
            createdAt: prev[question.id]?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }));
      }
    } catch (error) {
      console.error('Failed to generate AI answer:', error);
    } finally {
      setAiGenerating(null);
    }
  };

  // Handle bulk generate AI answers
  const handleBulkGenerateAI = async () => {
    if (!selectedQuestionnaire) return;

    setProcessing(true);
    try {
      const pendingQuestions = questions.filter(q => !answers[q.id] || answers[q.id].status === 'pending');
      const questionIds = pendingQuestions.map(q => q.id);
      const context = buildAIContext();

      await questionnaireService.bulkGenerateAIAnswers(
        selectedQuestionnaire.id,
        questionIds,
        context
      );

      // Reload answers
      const answerData = await questionnaireService.getAnswers(selectedQuestionnaire.id);
      const answerMap: Record<string, QuestionnaireAnswer> = {};
      answerData.forEach(answer => {
        answerMap[answer.questionId] = answer;
      });
      setAnswers(answerMap);
    } catch (error) {
      console.error('Failed to bulk generate AI answers:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Handle add to library
  const handleAddToLibrary = async (question: QuestionnaireQuestion, answer: QuestionnaireAnswer) => {
    try {
      await questionnaireService.addToLibrary(
        question.questionText,
        answer.answer,
        {
          answerType: question.questionType === 'yes_no' ? 'yes_no' : 'text',
          relatedControls: question.relatedControls,
          category: question.categoryName,
          confidence: answer.aiConfidence || 'medium',
        }
      );

      // Reload library if in library view
      if (viewMode === 'library') {
        loadLibraryItems();
      }
    } catch (error) {
      console.error('Failed to add to library:', error);
    }
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Group questions by category
  const groupedQuestions = questions.reduce((acc, question) => {
    const category = question.categoryName || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(question);
    return acc;
  }, {} as Record<string, QuestionnaireQuestion[]>);

  // Filter questionnaires by search
  const filteredQuestionnaires = questionnaires.filter(q => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      q.name.toLowerCase().includes(search) ||
      q.customerName.toLowerCase().includes(search)
    );
  });

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  // Render stats cards
  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-steel-900 rounded-lg border border-steel-200 dark:border-steel-700 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-steel-600 dark:text-steel-400">Total Questionnaires</p>
            <p className="text-2xl font-semibold text-steel-900 dark:text-white">
              {stats?.totalQuestionnaires || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-steel-900 rounded-lg border border-steel-200 dark:border-steel-700 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-steel-600 dark:text-steel-400">Completed This Month</p>
            <p className="text-2xl font-semibold text-steel-900 dark:text-white">
              {stats?.completedThisMonth || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-steel-900 rounded-lg border border-steel-200 dark:border-steel-700 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-steel-600 dark:text-steel-400">Avg. Completion Time</p>
            <p className="text-2xl font-semibold text-steel-900 dark:text-white">
              {stats?.averageCompletionTime || 0} days
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-steel-900 rounded-lg border border-steel-200 dark:border-steel-700 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-steel-600 dark:text-steel-400">AI Acceptance Rate</p>
            <p className="text-2xl font-semibold text-steel-900 dark:text-white">
              {Math.round((stats?.aiAcceptanceRate || 0) * 100)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render questionnaire list
  const renderQuestionnaireList = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
            <input
              type="text"
              placeholder="Search questionnaires..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10 pr-4 py-2 border border-steel-200 dark:border-steel-700 rounded-lg bg-white dark:bg-steel-900 text-steel-900 dark:text-white placeholder-steel-400 w-64"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                : 'bg-white dark:bg-steel-900 border-steel-200 dark:border-steel-700 text-steel-600 dark:text-steel-400 hover:border-steel-300 dark:hover:border-steel-600'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('library')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-steel-600 dark:text-steel-400 hover:border-steel-300 dark:hover:border-steel-600"
          >
            <BookOpen className="w-4 h-4" />
            Question Library
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Questionnaire
          </button>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-4 p-4 bg-steel-50 dark:bg-steel-800/50 rounded-lg">
              <div>
                <label className="block text-sm text-steel-600 dark:text-steel-400 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as QuestionnaireStatus | '')}
                  className="px-3 py-2 border border-steel-200 dark:border-steel-700 rounded-lg bg-white dark:bg-steel-900 text-steel-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="submitted">Submitted</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-steel-600 dark:text-steel-400 mb-1">Format</label>
                <select
                  value={filterFormat}
                  onChange={(e) => setFilterFormat(e.target.value as QuestionnaireFormat | '')}
                  className="px-3 py-2 border border-steel-200 dark:border-steel-700 rounded-lg bg-white dark:bg-steel-900 text-steel-900 dark:text-white"
                >
                  <option value="">All Formats</option>
                  {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setFilterStatus('');
                  setFilterFormat('');
                }}
                className="mt-6 text-sm text-steel-500 hover:text-steel-700 dark:hover:text-steel-300"
              >
                Clear filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Questionnaire Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredQuestionnaires.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-steel-900 rounded-lg border border-steel-200 dark:border-steel-700">
          <ClipboardList className="w-12 h-12 text-steel-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-steel-900 dark:text-white mb-2">No questionnaires yet</h3>
          <p className="text-steel-600 dark:text-steel-400 mb-4">
            Create your first questionnaire from a template or import an existing one.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Questionnaire
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuestionnaires.map((questionnaire) => {
            const statusConfig = STATUS_CONFIG[questionnaire.status];
            const progress = questionnaire.progress.total > 0
              ? Math.round((questionnaire.progress.answered / questionnaire.progress.total) * 100)
              : 0;

            return (
              <motion.div
                key={questionnaire.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-steel-900 rounded-lg border border-steel-200 dark:border-steel-700 hover:border-steel-300 dark:hover:border-steel-600 transition-colors cursor-pointer"
                onClick={() => handleSelectQuestionnaire(questionnaire)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-steel-100 dark:bg-steel-800 text-steel-600 dark:text-steel-400 mb-2">
                        {FORMAT_LABELS[questionnaire.format]}
                      </span>
                      <h3 className="font-medium text-steel-900 dark:text-white line-clamp-1">
                        {questionnaire.name}
                      </h3>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                      {statusConfig.icon}
                      {questionnaire.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-steel-600 dark:text-steel-400 mb-3">
                    <Building className="w-4 h-4" />
                    <span className="truncate">{questionnaire.customerName}</span>
                  </div>

                  {questionnaire.dueDate && (
                    <div className="flex items-center gap-2 text-sm text-steel-600 dark:text-steel-400 mb-3">
                      <Calendar className="w-4 h-4" />
                      <span>Due: {new Date(questionnaire.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-steel-600 dark:text-steel-400">Progress</span>
                      <span className="font-medium text-steel-900 dark:text-white">{progress}%</span>
                    </div>
                    <div className="h-2 bg-steel-100 dark:bg-steel-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-steel-500 dark:text-steel-500 mt-1">
                      <span>{questionnaire.progress.answered} / {questionnaire.progress.total} answered</span>
                      <span>{questionnaire.progress.approved} approved</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Render questionnaire detail view
  const renderQuestionnaireDetail = () => {
    if (!selectedQuestionnaire) return null;

    const statusConfig = STATUS_CONFIG[selectedQuestionnaire.status];
    const progress = selectedQuestionnaire.progress.total > 0
      ? Math.round((selectedQuestionnaire.progress.answered / selectedQuestionnaire.progress.total) * 100)
      : 0;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <button
              onClick={() => {
                setViewMode('list');
                setSelectedQuestionnaire(null);
              }}
              className="flex items-center gap-1 text-sm text-steel-600 dark:text-steel-400 hover:text-steel-900 dark:hover:text-white mb-2"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back to list
            </button>
            <h2 className="text-xl font-semibold text-steel-900 dark:text-white">
              {selectedQuestionnaire.name}
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <span className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                {statusConfig.icon}
                {selectedQuestionnaire.status.replace('_', ' ')}
              </span>
              <span className="text-sm text-steel-600 dark:text-steel-400">
                {FORMAT_LABELS[selectedQuestionnaire.format]}
              </span>
              <span className="text-sm text-steel-600 dark:text-steel-400">
                {selectedQuestionnaire.customerName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkGenerateAI}
              disabled={processing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Generate All AI Answers
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-steel-600 dark:text-steel-400">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white dark:bg-steel-900 rounded-lg border border-steel-200 dark:border-steel-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-steel-900 dark:text-white">Overall Progress</span>
            <span className="text-sm text-steel-600 dark:text-steel-400">{progress}%</span>
          </div>
          <div className="h-3 bg-steel-100 dark:bg-steel-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="grid grid-cols-4 gap-4 mt-4 text-center">
            <div>
              <p className="text-2xl font-semibold text-steel-900 dark:text-white">
                {selectedQuestionnaire.progress.total}
              </p>
              <p className="text-xs text-steel-600 dark:text-steel-400">Total Questions</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                {selectedQuestionnaire.progress.answered}
              </p>
              <p className="text-xs text-steel-600 dark:text-steel-400">Answered</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {selectedQuestionnaire.progress.approved}
              </p>
              <p className="text-xs text-steel-600 dark:text-steel-400">Approved</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                {selectedQuestionnaire.progress.flagged}
              </p>
              <p className="text-xs text-steel-600 dark:text-steel-400">Flagged</p>
            </div>
          </div>
        </div>

        {/* Questions by category */}
        <div className="space-y-4">
          {Object.entries(groupedQuestions).map(([category, categoryQuestions]) => (
            <div
              key={category}
              className="bg-white dark:bg-steel-900 rounded-lg border border-steel-200 dark:border-steel-700 overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-4 hover:bg-steel-50 dark:hover:bg-steel-800/50"
              >
                <div className="flex items-center gap-3">
                  {expandedCategories.has(category) ? (
                    <ChevronDown className="w-5 h-5 text-steel-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-steel-400" />
                  )}
                  <span className="font-medium text-steel-900 dark:text-white">{category}</span>
                  <span className="text-sm text-steel-500 dark:text-steel-500">
                    ({categoryQuestions.length} questions)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">
                    {categoryQuestions.filter(q => answers[q.id]?.status === 'approved').length} approved
                  </span>
                </div>
              </button>

              <AnimatePresence>
                {expandedCategories.has(category) && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-steel-200 dark:border-steel-700">
                      {categoryQuestions.map((question) => {
                        const answer = answers[question.id];
                        const questionStatusConfig = answer ? QUESTION_STATUS_CONFIG[answer.status] : QUESTION_STATUS_CONFIG.pending;

                        return (
                          <div
                            key={question.id}
                            className="border-b border-steel-100 dark:border-steel-800 last:border-b-0"
                          >
                            <div className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-steel-500 dark:text-steel-500">
                                      {question.questionNumber}
                                    </span>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${questionStatusConfig.bgColor} ${questionStatusConfig.color}`}>
                                      {questionStatusConfig.label}
                                    </span>
                                    {question.required && (
                                      <span className="text-red-500 text-xs">Required</span>
                                    )}
                                  </div>
                                  <p className="text-steel-900 dark:text-white">
                                    {question.questionText}
                                  </p>
                                  {question.helpText && (
                                    <p className="text-sm text-steel-500 dark:text-steel-500 mt-1 flex items-center gap-1">
                                      <HelpCircle className="w-3 h-3" />
                                      {question.helpText}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Answer section */}
                              <div className="mt-3 space-y-3">
                                {/* AI Suggestion */}
                                {answer?.aiSuggestedAnswer && (
                                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Suggestion</span>
                                      {answer.aiConfidence && (
                                        <span className={`text-xs ${CONFIDENCE_CONFIG[answer.aiConfidence].color}`}>
                                          {CONFIDENCE_CONFIG[answer.aiConfidence].label}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-steel-700 dark:text-steel-300">
                                      {answer.aiSuggestedAnswer}
                                    </p>
                                    {answer.aiReasoning && (
                                      <p className="text-xs text-steel-500 dark:text-steel-500 mt-2">
                                        <strong>Reasoning:</strong> {answer.aiReasoning}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                      <button
                                        onClick={() => handleSaveAnswer(question.id, answer.aiSuggestedAnswer || '')}
                                        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                                      >
                                        <Check className="w-3 h-3" />
                                        Accept
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Answer input */}
                                {question.questionType === 'yes_no' ? (
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => handleSaveAnswer(question.id, 'Yes')}
                                      className={`px-4 py-2 rounded-lg border transition-colors ${
                                        answer?.answer === 'Yes'
                                          ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
                                          : 'border-steel-200 dark:border-steel-700 text-steel-600 dark:text-steel-400 hover:border-steel-300'
                                      }`}
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={() => handleSaveAnswer(question.id, 'No')}
                                      className={`px-4 py-2 rounded-lg border transition-colors ${
                                        answer?.answer === 'No'
                                          ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400'
                                          : 'border-steel-200 dark:border-steel-700 text-steel-600 dark:text-steel-400 hover:border-steel-300'
                                      }`}
                                    >
                                      No
                                    </button>
                                    <button
                                      onClick={() => handleSaveAnswer(question.id, 'N/A')}
                                      className={`px-4 py-2 rounded-lg border transition-colors ${
                                        answer?.answer === 'N/A'
                                          ? 'bg-steel-100 dark:bg-steel-800 border-steel-300 dark:border-steel-600 text-steel-700 dark:text-steel-300'
                                          : 'border-steel-200 dark:border-steel-700 text-steel-600 dark:text-steel-400 hover:border-steel-300'
                                      }`}
                                    >
                                      N/A
                                    </button>
                                  </div>
                                ) : (
                                  <textarea
                                    value={answer?.answer || ''}
                                    onChange={(e) => handleSaveAnswer(question.id, e.target.value)}
                                    placeholder="Enter your answer..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-steel-200 dark:border-steel-700 rounded-lg bg-white dark:bg-steel-900 text-steel-900 dark:text-white placeholder-steel-400 resize-none"
                                  />
                                )}

                                {/* Action buttons */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleGenerateAIAnswer(question)}
                                    disabled={aiGenerating === question.id}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 disabled:opacity-50"
                                  >
                                    {aiGenerating === question.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-4 h-4" />
                                    )}
                                    Generate AI Answer
                                  </button>

                                  {answer?.answer && (
                                    <>
                                      <button
                                        onClick={() => handleApproveAnswer(question.id)}
                                        disabled={answer.status === 'approved'}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-50"
                                      >
                                        <ThumbsUp className="w-4 h-4" />
                                        Approve
                                      </button>

                                      <button
                                        onClick={() => handleFlagAnswer(question.id, 'Needs review')}
                                        disabled={answer.status === 'flagged'}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                                      >
                                        <Flag className="w-4 h-4" />
                                        Flag
                                      </button>

                                      <button
                                        onClick={() => handleAddToLibrary(question, answer)}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-steel-200 dark:border-steel-700 text-steel-600 dark:text-steel-400 hover:bg-steel-50 dark:hover:bg-steel-800"
                                      >
                                        <BookOpen className="w-4 h-4" />
                                        Save to Library
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render library view
  const renderLibraryView = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode('list')}
            className="flex items-center gap-1 text-sm text-steel-600 dark:text-steel-400 hover:text-steel-900 dark:hover:text-white"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to questionnaires
          </button>
          <h2 className="text-xl font-semibold text-steel-900 dark:text-white">Question Library</h2>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
          <input
            type="text"
            placeholder="Search library..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-10 pr-4 py-2 border border-steel-200 dark:border-steel-700 rounded-lg bg-white dark:bg-steel-900 text-steel-900 dark:text-white placeholder-steel-400 w-64"
          />
        </div>
      </div>

      {/* Library items */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : libraryItems.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-steel-900 rounded-lg border border-steel-200 dark:border-steel-700">
          <BookOpen className="w-12 h-12 text-steel-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-steel-900 dark:text-white mb-2">No library items yet</h3>
          <p className="text-steel-600 dark:text-steel-400">
            Save approved answers to build your question library for faster responses.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {libraryItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-steel-900 rounded-lg border border-steel-200 dark:border-steel-700 p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-steel-900 dark:text-white mb-1">
                    {item.questionText}
                  </p>
                  <p className="text-sm text-steel-600 dark:text-steel-400">
                    {item.standardAnswer}
                  </p>
                </div>
                <span className={`text-xs ${CONFIDENCE_CONFIG[item.confidence].color}`}>
                  {CONFIDENCE_CONFIG[item.confidence].label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-steel-500 dark:text-steel-500">
                <span>Category: {item.category}</span>
                <span>Used {item.usageCount} times</span>
                {item.lastUsed && (
                  <span>Last used: {new Date(item.lastUsed).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render create modal
  const renderCreateModal = () => (
    <AnimatePresence>
      {showCreateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowCreateModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-steel-900 rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-steel-200 dark:border-steel-700">
              <h3 className="text-lg font-semibold text-steel-900 dark:text-white">New Questionnaire</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-steel-400 hover:text-steel-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateQuestionnaire({
                  templateId: formData.get('template') as string,
                  format: formData.get('format') as QuestionnaireFormat,
                  name: formData.get('name') as string,
                  customerName: formData.get('customerName') as string,
                  customerEmail: formData.get('customerEmail') as string,
                  dueDate: formData.get('dueDate') as string,
                });
              }}
              className="p-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-steel-700 dark:text-steel-300 mb-1">
                  Template
                </label>
                <select
                  name="template"
                  required
                  className="w-full px-3 py-2 border border-steel-200 dark:border-steel-700 rounded-lg bg-white dark:bg-steel-900 text-steel-900 dark:text-white"
                >
                  {QUESTIONNAIRE_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.totalQuestions} questions)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-steel-700 dark:text-steel-300 mb-1">
                  Format
                </label>
                <select
                  name="format"
                  required
                  className="w-full px-3 py-2 border border-steel-200 dark:border-steel-700 rounded-lg bg-white dark:bg-steel-900 text-steel-900 dark:text-white"
                >
                  {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-steel-700 dark:text-steel-300 mb-1">
                  Questionnaire Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g., Acme Corp Security Assessment"
                  className="w-full px-3 py-2 border border-steel-200 dark:border-steel-700 rounded-lg bg-white dark:bg-steel-900 text-steel-900 dark:text-white placeholder-steel-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-steel-700 dark:text-steel-300 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  name="customerName"
                  required
                  placeholder="e.g., Acme Corporation"
                  className="w-full px-3 py-2 border border-steel-200 dark:border-steel-700 rounded-lg bg-white dark:bg-steel-900 text-steel-900 dark:text-white placeholder-steel-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-steel-700 dark:text-steel-300 mb-1">
                  Customer Email (optional)
                </label>
                <input
                  type="email"
                  name="customerEmail"
                  placeholder="e.g., security@acme.com"
                  className="w-full px-3 py-2 border border-steel-200 dark:border-steel-700 rounded-lg bg-white dark:bg-steel-900 text-steel-900 dark:text-white placeholder-steel-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-steel-700 dark:text-steel-300 mb-1">
                  Due Date (optional)
                </label>
                <input
                  type="date"
                  name="dueDate"
                  className="w-full px-3 py-2 border border-steel-200 dark:border-steel-700 rounded-lg bg-white dark:bg-steel-900 text-steel-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-steel-600 dark:text-steel-400 hover:text-steel-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create Questionnaire
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="p-6 bg-steel-50 dark:bg-steel-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-steel-900 dark:text-white flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Security Questionnaire Automation
          </h1>
          <p className="text-steel-600 dark:text-steel-400 mt-1">
            Automate security questionnaire responses with AI-powered suggestions
          </p>
        </div>

        {/* Stats (only on list view) */}
        {viewMode === 'list' && renderStats()}

        {/* Main Content */}
        {viewMode === 'list' && renderQuestionnaireList()}
        {viewMode === 'detail' && renderQuestionnaireDetail()}
        {viewMode === 'library' && renderLibraryView()}

        {/* Modals */}
        {renderCreateModal()}
      </div>
    </div>
  );
};

export default QuestionnaireAutomation;
