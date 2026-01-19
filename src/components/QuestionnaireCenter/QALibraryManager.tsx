/**
 * QA Library Manager
 *
 * Manages the organization's approved Q&A library:
 * - View all approved answers
 * - Search and filter
 * - Edit/delete entries
 * - Export library
 * - Learning stats (usage count, last used)
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Search,
  Edit3,
  Download,
  CheckCircle2,
  Clock,
  Tag,
  ChevronDown,
  ChevronRight,
  Copy,
  RefreshCw,
  Sparkles,
  TrendingUp,
  BarChart3,
  X,
  Check,
} from 'lucide-react';
import type { QuestionLibraryItem, AnswerConfidence } from '../../types/questionnaire.types';

// ============================================================================
// TYPES
// ============================================================================

interface QALibraryManagerProps {
  items: QuestionLibraryItem[];
  onRefresh: () => void;
  organizationId: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONFIDENCE_CONFIG: Record<AnswerConfidence, { label: string; color: string; bgColor: string }> = {
  high: { label: 'High', color: '#059669', bgColor: '#ECFDF5' },
  medium: { label: 'Medium', color: '#D97706', bgColor: '#FFFBEB' },
  low: { label: 'Low', color: '#DC2626', bgColor: '#FEF2F2' },
};

// ============================================================================
// COMPONENT
// ============================================================================

const QALibraryManager: React.FC<QALibraryManagerProps> = ({
  items,
  onRefresh,
  organizationId: _organizationId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterConfidence, setFilterConfidence] = useState<AnswerConfidence | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<QuestionLibraryItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnswer, setEditedAnswer] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchTerm ||
        item.questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.standardAnswer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
      const matchesConfidence = filterConfidence === 'all' || item.confidence === filterConfidence;
      return matchesSearch && matchesCategory && matchesConfidence;
    });
  }, [items, searchTerm, filterCategory, filterConfidence]);

  // Stats
  const stats = useMemo(() => {
    const total = items.length;
    const highConfidence = items.filter(i => i.confidence === 'high').length;
    const recentlyUsed = items.filter(i => {
      if (!i.lastUsed) return false;
      const lastUsed = new Date(i.lastUsed);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return lastUsed > thirtyDaysAgo;
    }).length;
    const totalUsage = items.reduce((sum, i) => sum + i.usageCount, 0);
    return { total, highConfidence, recentlyUsed, totalUsage };
  }, [items]);

  // Toggle item expansion
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Handle edit
  const handleStartEdit = (item: QuestionLibraryItem) => {
    setSelectedItem(item);
    setEditedAnswer(item.standardAnswer);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem || !editedAnswer.trim()) return;

    try {
      // In a real implementation, this would update via the service
      // For now, we just refresh to show the updated data
      onRefresh();
      setIsEditing(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to save edit:', error);
    }
  };

  // Export library
  const handleExport = () => {
    const exportData = items.map(item => ({
      Question: item.questionText,
      Answer: item.standardAnswer,
      Category: item.category,
      Confidence: item.confidence,
      'Usage Count': item.usageCount,
      'Last Used': item.lastUsed || 'Never',
      Tags: item.tags.join(', '),
      'Related Controls': item.relatedControls.join(', '),
    }));

    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row =>
        headers.map(h => {
          const value = String((row as Record<string, unknown>)[h] || '');
          return value.includes(',') || value.includes('"')
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qa_library_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-sm text-slate-500">Library Entries</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.highConfidence}</p>
              <p className="text-sm text-slate-500">High Confidence</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalUsage}</p>
              <p className="text-sm text-slate-500">Total Usage</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.recentlyUsed}</p>
              <p className="text-sm text-slate-500">Used (30d)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">QA Library</h3>
              <p className="text-sm text-slate-500">Approved answers for future questionnaires</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search questions or answers..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
            />
          </div>

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={filterConfidence}
            onChange={e => setFilterConfidence(e.target.value as AnswerConfidence | 'all')}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
          >
            <option value="all">All Confidence</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* List */}
        <div className="max-h-[500px] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">
                {items.length === 0 ? 'No Library Entries' : 'No Matches Found'}
              </h3>
              <p className="text-slate-500">
                {items.length === 0
                  ? 'Approved answers from questionnaires will appear here'
                  : 'Try adjusting your search or filters'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredItems.map(item => {
                const isExpanded = expandedItems.has(item.id);
                const confidenceConfig = CONFIDENCE_CONFIG[item.confidence];

                return (
                  <div key={item.id} className="hover:bg-slate-50 transition-colors">
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="w-full text-left px-6 py-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-0.5">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900 line-clamp-2">
                            {item.questionText}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span
                              className="px-2 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: confidenceConfig.bgColor,
                                color: confidenceConfig.color,
                              }}
                            >
                              {confidenceConfig.label}
                            </span>
                            {item.category && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                                {item.category}
                              </span>
                            )}
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <BarChart3 className="w-3 h-3" />
                              {item.usageCount} uses
                            </span>
                            {item.lastUsed && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(item.lastUsed).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleStartEdit(item);
                            }}
                            className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(item.standardAnswer);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-6 pb-4"
                        >
                          <div className="ml-8 space-y-3">
                            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                              <h5 className="text-xs font-medium text-violet-600 uppercase tracking-wider mb-2">
                                Standard Answer
                              </h5>
                              <p className="text-sm text-slate-900 whitespace-pre-wrap">
                                {item.standardAnswer}
                              </p>
                            </div>

                            {item.relatedControls.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-slate-500">Related Controls:</span>
                                {item.relatedControls.map(control => (
                                  <span
                                    key={control}
                                    className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono"
                                  >
                                    {control}
                                  </span>
                                ))}
                              </div>
                            )}

                            {item.tags.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <Tag className="w-3.5 h-3.5 text-slate-400" />
                                {item.tags.map(tag => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsEditing(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">Edit Library Entry</h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Question
                  </label>
                  <p className="p-3 bg-slate-50 rounded-xl text-sm text-slate-700">
                    {selectedItem.questionText}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Standard Answer
                  </label>
                  <textarea
                    value={editedAnswer}
                    onChange={e => setEditedAnswer(e.target.value)}
                    rows={6}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Box */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-violet-900">AI Learning</h4>
            <p className="text-sm text-violet-700 mt-1">
              When you approve or edit an answer, it&apos;s saved to this library. The AI uses these
              approved answers to improve suggestions for similar questions in future questionnaires.
              Higher usage counts indicate commonly asked questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QALibraryManager;
