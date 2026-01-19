/**
 * Dual Pane Review
 *
 * The core review interface with:
 * - Left pane: Original question list with status indicators
 * - Right pane: AI suggestion with source control and confidence
 * - Human-in-the-loop: Approve, Edit, Reject actions
 * - Amber highlighting for low confidence answers
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Sparkles,
  Shield,
  Search,
  Filter,
  ChevronRight,
  Loader2,
  Eye,
  Check,
  FileText,
  Copy,
  Percent,
  Lightbulb,
} from 'lucide-react';
import type { UseComplianceReturn } from '../../hooks/useCompliance';
import type { ParsedQuestion, KnowledgeBaseContext } from './index';
import { CONFIDENCE_CONFIG, STATUS_CONFIG } from './index';
import type { AnswerConfidence } from '../../types/questionnaire.types';

// ============================================================================
// TYPES
// ============================================================================

interface DualPaneReviewProps {
  questions: ParsedQuestion[];
  allQuestions: ParsedQuestion[];
  selectedQuestionId: string | null;
  onSelectQuestion: (id: string | null) => void;
  onApprove: (questionId: string) => void;
  onReject: (questionId: string) => void;
  onEdit: (questionId: string, newAnswer: string, notes?: string) => void;
  onGenerateAll: () => void;
  isGenerating: boolean;
  generationProgress: number;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterConfidence: AnswerConfidence | 'all';
  onFilterConfidenceChange: (confidence: AnswerConfidence | 'all') => void;
  filterStatus: ParsedQuestion['status'] | 'all';
  onFilterStatusChange: (status: ParsedQuestion['status'] | 'all') => void;
  compliance: UseComplianceReturn;
  knowledgeBase: KnowledgeBaseContext | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

const DualPaneReview: React.FC<DualPaneReviewProps> = ({
  questions,
  allQuestions,
  selectedQuestionId,
  onSelectQuestion,
  onApprove,
  onReject,
  onEdit,
  onGenerateAll,
  isGenerating,
  generationProgress,
  searchTerm,
  onSearchChange,
  filterConfidence,
  onFilterConfidenceChange,
  filterStatus,
  onFilterStatusChange,
  compliance,
  knowledgeBase: _knowledgeBase,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnswer, setEditedAnswer] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Get selected question
  const selectedQuestion = useMemo(() => {
    return questions.find(q => q.id === selectedQuestionId) || null;
  }, [questions, selectedQuestionId]);

  // Get related controls for selected question
  const relatedControls = useMemo(() => {
    if (!selectedQuestion?.relatedControlIds || !compliance) return [];

    return selectedQuestion.relatedControlIds.map(controlId => {
      const control = compliance.allControls.find(c => c.id === controlId);
      const response = compliance.getResponse(controlId);
      return control ? { control, response } : null;
    }).filter(Boolean);
  }, [selectedQuestion, compliance]);

  // Stats
  const stats = useMemo(() => {
    const pending = allQuestions.filter(q => q.status === 'pending').length;
    const suggested = allQuestions.filter(q => q.status === 'suggested').length;
    const approved = allQuestions.filter(q => q.status === 'approved').length;
    const lowConfidence = allQuestions.filter(q => q.aiConfidence === 'low').length;
    return { pending, suggested, approved, lowConfidence };
  }, [allQuestions]);

  // Handle edit start
  const handleStartEdit = () => {
    if (selectedQuestion) {
      setEditedAnswer(selectedQuestion.userAnswer || selectedQuestion.aiAnswer || '');
      setEditedNotes(selectedQuestion.userNotes || '');
      setIsEditing(true);
    }
  };

  // Handle edit save
  const handleSaveEdit = () => {
    if (selectedQuestion && editedAnswer.trim()) {
      onEdit(selectedQuestion.id, editedAnswer, editedNotes);
      setIsEditing(false);
    }
  };

  // Handle edit cancel
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedAnswer('');
    setEditedNotes('');
  };

  // Get confidence badge
  const getConfidenceBadge = (confidence?: AnswerConfidence) => {
    if (!confidence) return null;
    const config = CONFIDENCE_CONFIG[confidence];
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
        style={{
          backgroundColor: config.bgColor,
          color: config.color,
          border: `1px solid ${config.borderColor}`,
        }}
      >
        {config.icon}
        {Math.round(confidence === 'high' ? 95 : confidence === 'medium' ? 75 : 50)}%
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search questions..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-steel-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 dark:text-steel-100"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              showFilters
                ? 'bg-violet-50 border-violet-200 text-violet-700'
                : 'bg-white dark:bg-midnight-900 border-slate-200 dark:border-steel-700 text-slate-600 dark:text-steel-300 hover:bg-slate-50 dark:hover:bg-steel-800 dark:hover:bg-steel-800'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          {/* Generate All Button */}
          <button
            onClick={onGenerateAll}
            disabled={isGenerating || stats.pending === 0}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating... {generationProgress}%
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate AI Answers ({stats.pending})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-50 dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 p-4"
          >
            <div className="flex items-center gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-steel-400 dark:text-steel-400 mb-1.5">
                  Confidence
                </label>
                <select
                  value={filterConfidence}
                  onChange={e => onFilterConfidenceChange(e.target.value as AnswerConfidence | 'all')}
                  className="text-sm border border-slate-200 dark:border-steel-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 dark:text-steel-100"
                >
                  <option value="all">All Confidence</option>
                  <option value="high">High Only</option>
                  <option value="medium">Medium Only</option>
                  <option value="low">Low (Review Needed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-steel-400 dark:text-steel-400 mb-1.5">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={e => onFilterStatusChange(e.target.value as ParsedQuestion['status'] | 'all')}
                  className="text-sm border border-slate-200 dark:border-steel-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 dark:text-steel-100"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="suggested">AI Suggested</option>
                  <option value="approved">Approved</option>
                  <option value="edited">Edited</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-4 ml-auto text-sm">
                <span className="text-slate-500 dark:text-steel-400">
                  {stats.pending} pending
                </span>
                <span className="text-violet-600">
                  {stats.suggested} suggested
                </span>
                <span className="text-emerald-600">
                  {stats.approved} approved
                </span>
                {stats.lowConfidence > 0 && (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {stats.lowConfidence} need review
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dual Pane Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Pane: Question List */}
        <div className="col-span-5 bg-white dark:bg-midnight-900 rounded-2xl border border-slate-200 dark:border-steel-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-steel-700 bg-slate-50 dark:bg-midnight-800">
            <h3 className="font-semibold text-slate-900 dark:text-steel-100 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500 dark:text-steel-400" />
              Questions ({questions.length})
            </h3>
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {questions.length === 0 ? (
              <div className="py-12 text-center">
                <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-steel-400">No questions match your filters</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-steel-700">
                {questions.map(question => {
                  const isSelected = question.id === selectedQuestionId;
                  const statusConfig = STATUS_CONFIG[question.status];
                  const confidenceConfig = question.aiConfidence
                    ? CONFIDENCE_CONFIG[question.aiConfidence]
                    : null;
                  const isLowConfidence = question.aiConfidence === 'low';

                  return (
                    <button
                      key={question.id}
                      onClick={() => onSelectQuestion(question.id)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        isSelected
                          ? 'bg-violet-50 border-l-2 border-l-violet-500'
                          : isLowConfidence
                          ? 'bg-amber-50/50 hover:bg-amber-50 border-l-2 border-l-amber-400'
                          : 'hover:bg-slate-50 dark:hover:bg-steel-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xs text-slate-400 dark:text-steel-500 font-mono mt-0.5">
                          #{question.rowNumber}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm line-clamp-2 ${
                            isSelected ? 'text-violet-900' : 'text-slate-900 dark:text-steel-100'
                          }`}>
                            {question.originalQuestion}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className="px-1.5 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: statusConfig.bgColor,
                                color: statusConfig.color,
                              }}
                            >
                              {statusConfig.label}
                            </span>
                            {confidenceConfig && (
                              <span
                                className="px-1.5 py-0.5 rounded text-xs flex items-center gap-1"
                                style={{
                                  backgroundColor: confidenceConfig.bgColor,
                                  color: confidenceConfig.color,
                                }}
                              >
                                <Percent className="w-3 h-3" />
                                {question.aiConfidence === 'high' ? '95' : question.aiConfidence === 'medium' ? '75' : '50'}
                              </span>
                            )}
                            {question.category && (
                              <span className="text-xs text-slate-400 dark:text-steel-500 truncate">
                                {question.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 flex-shrink-0 ${
                          isSelected ? 'text-violet-500' : 'text-slate-300'
                        }`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: AI Suggestion & Actions */}
        <div className="col-span-7">
          {selectedQuestion ? (
            <motion.div
              key={selectedQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-midnight-900 rounded-2xl border border-slate-200 dark:border-steel-700 overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-steel-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: selectedQuestion.aiConfidence
                          ? CONFIDENCE_CONFIG[selectedQuestion.aiConfidence].bgColor
                          : '#F1F5F9',
                      }}
                    >
                      {selectedQuestion.status === 'generating' ? (
                        <Loader2 className="w-5 h-5 text-violet-600 animate-spin" />
                      ) : selectedQuestion.aiConfidence ? (
                        CONFIDENCE_CONFIG[selectedQuestion.aiConfidence].icon
                      ) : (
                        <Sparkles className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-steel-100 dark:text-steel-100">
                        Question #{selectedQuestion.rowNumber}
                      </h3>
                      {selectedQuestion.aiConfidence && (
                        <p
                          className="text-sm"
                          style={{ color: CONFIDENCE_CONFIG[selectedQuestion.aiConfidence].color }}
                        >
                          {CONFIDENCE_CONFIG[selectedQuestion.aiConfidence].label}
                        </p>
                      )}
                    </div>
                  </div>

                  {getConfidenceBadge(selectedQuestion.aiConfidence)}
                </div>
              </div>

              {/* Low Confidence Warning */}
              {selectedQuestion.aiConfidence === 'low' && (
                <div className="px-6 py-3 bg-amber-50 border-b border-amber-200">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-sm font-medium">
                      Low confidence - Manual review recommended
                    </p>
                  </div>
                </div>
              )}

              {/* Original Question */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-steel-700">
                <h4 className="text-xs font-medium text-slate-500 dark:text-steel-400 uppercase tracking-wider mb-2">
                  Original Question
                </h4>
                <p className="text-slate-900 dark:text-steel-100">{selectedQuestion.originalQuestion}</p>
                {selectedQuestion.category && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-300 rounded text-xs">
                    {selectedQuestion.category}
                  </span>
                )}
              </div>

              {/* AI Suggested Answer */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-steel-700">
                <h4 className="text-xs font-medium text-slate-500 dark:text-steel-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Suggested Answer
                </h4>

                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedAnswer}
                      onChange={e => setEditedAnswer(e.target.value)}
                      rows={4}
                      className="w-full p-3 border border-slate-200 dark:border-steel-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100"
                      placeholder="Enter your answer..."
                    />
                    <input
                      type="text"
                      value={editedNotes}
                      onChange={e => setEditedNotes(e.target.value)}
                      placeholder="Add notes (optional)"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Save Answer
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 text-slate-600 dark:text-steel-300 hover:text-slate-800 dark:hover:text-steel-100 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {selectedQuestion.status === 'pending' ? (
                      <div className="bg-slate-50 dark:bg-midnight-800 rounded-xl p-6 text-center">
                        <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-steel-400">No AI answer yet</p>
                        <p className="text-sm text-slate-400 dark:text-steel-500 mt-1">
                          Click &quot;Generate AI Answers&quot; to process
                        </p>
                      </div>
                    ) : selectedQuestion.status === 'generating' ? (
                      <div className="bg-violet-50 rounded-xl p-6 text-center">
                        <Loader2 className="w-10 h-10 text-violet-500 mx-auto mb-3 animate-spin" />
                        <p className="text-violet-700">Generating answer...</p>
                      </div>
                    ) : (
                      <div
                        className={`p-4 rounded-xl ${
                          selectedQuestion.status === 'approved'
                            ? 'bg-emerald-50 border border-emerald-200'
                            : selectedQuestion.status === 'edited'
                            ? 'bg-amber-50 border border-amber-200'
                            : selectedQuestion.status === 'rejected'
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-violet-50 border border-violet-200'
                        }`}
                      >
                        <p className="text-slate-900 dark:text-steel-100 whitespace-pre-wrap">
                          {selectedQuestion.userAnswer || selectedQuestion.aiAnswer}
                        </p>
                        {selectedQuestion.userNotes && (
                          <p className="text-sm text-slate-500 dark:text-steel-400 mt-2 pt-2 border-t border-slate-200">
                            <strong>Notes:</strong> {selectedQuestion.userNotes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI Reasoning */}
              {selectedQuestion.aiReasoning && !isEditing && (
                <div className="px-6 py-4 border-b border-slate-100 dark:border-steel-700">
                  <h4 className="text-xs font-medium text-slate-500 dark:text-steel-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Lightbulb className="w-3.5 h-3.5" />
                    AI Reasoning
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-steel-300">{selectedQuestion.aiReasoning}</p>
                </div>
              )}

              {/* Related Controls */}
              {relatedControls.length > 0 && !isEditing && (
                <div className="px-6 py-4 border-b border-slate-100 dark:border-steel-700">
                  <h4 className="text-xs font-medium text-slate-500 dark:text-steel-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    Source Controls ({relatedControls.length})
                  </h4>
                  <div className="space-y-2">
                    {relatedControls.map((item, idx) => {
                      if (!item) return null;
                      const { control, response } = item;
                      const isCompliant = response?.answer === 'yes';
                      const isPartial = response?.answer === 'partial';

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-midnight-800 rounded-lg"
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isCompliant
                                ? 'bg-emerald-100'
                                : isPartial
                                ? 'bg-amber-100'
                                : 'bg-slate-200'
                            }`}
                          >
                            <Shield
                              className={`w-4 h-4 ${
                                isCompliant
                                  ? 'text-emerald-600'
                                  : isPartial
                                  ? 'text-amber-600'
                                  : 'text-slate-400'
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-steel-100 dark:text-steel-100">
                              {control.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-steel-400 dark:text-steel-400">{control.id}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              isCompliant
                                ? 'bg-emerald-100 text-emerald-700'
                                : isPartial
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-300'
                            }`}
                          >
                            {isCompliant ? 'Compliant' : isPartial ? 'Partial' : 'Not Assessed'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedQuestion.status !== 'pending' &&
                selectedQuestion.status !== 'generating' &&
                !isEditing && (
                  <div className="px-6 py-4 bg-slate-50 dark:bg-midnight-800">
                    <div className="flex items-center gap-3">
                      {selectedQuestion.status !== 'approved' && (
                        <button
                          onClick={() => onApprove(selectedQuestion.id)}
                          className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          Approve
                        </button>
                      )}

                      <button
                        onClick={handleStartEdit}
                        className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-steel-800 transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>

                      {selectedQuestion.status !== 'rejected' && (
                        <button
                          onClick={() => onReject(selectedQuestion.id)}
                          className="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        className="px-4 py-2.5 text-slate-400 dark:text-steel-500 hover:text-slate-600 dark:hover:text-steel-300 hover:bg-slate-100 dark:hover:bg-steel-700 rounded-xl transition-colors"
                        title="Copy answer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>

                    {selectedQuestion.status === 'approved' && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" />
                        Answer approved and saved to QA Library
                      </div>
                    )}
                  </div>
                )}
            </motion.div>
          ) : (
            <div className="bg-white dark:bg-midnight-900 rounded-2xl border border-slate-200 dark:border-steel-700 p-12 text-center">
              <Eye className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100 dark:text-steel-100 mb-2">
                Select a Question
              </h3>
              <p className="text-slate-500 dark:text-steel-400">
                Click on a question from the left panel to review the AI suggestion
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DualPaneReview;
