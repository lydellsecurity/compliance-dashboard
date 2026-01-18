/**
 * Clarification Request Form
 *
 * Allows auditors to request clarification on specific requirements.
 * Submissions notify the internal admin team.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  AlertTriangle,
  MessageSquare,
  FileText,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import type { FrameworkId } from '../../constants/controls';

interface ClarificationRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  requirementId: string;
  requirementTitle: string;
  clauseId: string;
  frameworkId: FrameworkId;
  frameworkColor: string;
  auditorName: string;
  auditorEmail: string;
  onSubmit: (data: {
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    relatedControlId?: string;
  }) => Promise<boolean>;
  relatedControls?: { id: string; title: string }[];
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', description: 'General question or clarification' },
  { value: 'medium', label: 'Medium', description: 'Needs attention within a few days' },
  { value: 'high', label: 'High', description: 'Blocking audit progress' },
  { value: 'critical', label: 'Critical', description: 'Immediate attention required' },
] as const;

const ClarificationRequestForm: React.FC<ClarificationRequestFormProps> = ({
  isOpen,
  onClose,
  requirementId: _requirementId,
  requirementTitle,
  clauseId,
  frameworkId: _frameworkId,
  frameworkColor,
  auditorName,
  auditorEmail,
  onSubmit,
  relatedControls = [],
}) => {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [relatedControlId, setRelatedControlId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const success = await onSubmit({
        message: message.trim(),
        priority,
        relatedControlId: relatedControlId || undefined,
      });

      if (success) {
        setSubmitted(true);
        setTimeout(() => {
          onClose();
          // Reset form after close
          setMessage('');
          setPriority('medium');
          setRelatedControlId('');
          setSubmitted(false);
        }, 2000);
      } else {
        setError('Failed to submit clarification request. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-steel-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Success state */}
          {submitted ? (
            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </motion.div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Request Submitted
              </h3>
              <p className="text-slate-600 dark:text-steel-400">
                The compliance team has been notified and will respond to your clarification request.
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-steel-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Request Clarification
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-steel-400">
                      Ask a question about this requirement
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-steel-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Requirement info */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-steel-750 border-b border-slate-200 dark:border-steel-700">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-2 py-0.5 text-xs font-mono font-medium rounded"
                        style={{ backgroundColor: `${frameworkColor}15`, color: frameworkColor }}
                      >
                        {clauseId}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-steel-300">
                      {requirementTitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Auditor info (read-only) */}
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-steel-500">From:</span>
                    <span className="ml-2 font-medium text-slate-800 dark:text-steel-200">
                      {auditorName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-steel-500">Email:</span>
                    <span className="ml-2 text-slate-600 dark:text-steel-400">
                      {auditorEmail}
                    </span>
                  </div>
                </div>

                {/* Priority selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
                    Priority Level
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRIORITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPriority(option.value)}
                        className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                          priority === option.value
                            ? option.value === 'critical'
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                              : option.value === 'high'
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                              : option.value === 'medium'
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                              : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-steel-600 hover:border-slate-300 dark:hover:border-steel-500'
                        }`}
                      >
                        <div className={`text-sm font-medium ${
                          priority === option.value
                            ? option.value === 'critical'
                              ? 'text-red-700 dark:text-red-300'
                              : option.value === 'high'
                              ? 'text-orange-700 dark:text-orange-300'
                              : option.value === 'medium'
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-blue-700 dark:text-blue-300'
                            : 'text-slate-700 dark:text-steel-300'
                        }`}>
                          {option.label}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-steel-500 mt-0.5">
                          {option.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Related control (optional) */}
                {relatedControls.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
                      Related Control (Optional)
                    </label>
                    <select
                      value={relatedControlId}
                      onChange={(e) => setRelatedControlId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-steel-700 border border-slate-200 dark:border-steel-600 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">None selected</option>
                      {relatedControls.map((control) => (
                        <option key={control.id} value={control.id}>
                          {control.id} - {control.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
                    Your Question or Comment
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please describe your question or the clarification you need..."
                    rows={4}
                    className="w-full px-3 py-2 bg-white dark:bg-steel-700 border border-slate-200 dark:border-steel-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* Error message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Submit button */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-steel-400 hover:text-slate-800 dark:hover:text-steel-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !message.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ClarificationRequestForm;
