/**
 * Control Detail Drawer Component
 *
 * Slide-over panel that shows control details without page navigation.
 * Features:
 * - Action buttons at the top (AI Policy, Upload Evidence)
 * - ELI5 "Why This Matters" section
 * - Current status and evidence indicators
 * - Framework mappings
 * - Implementation guidance
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Lightbulb,
  BookOpen,
  Shield,
  Paperclip,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { MasterControl } from '../constants/controls';

interface ControlDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  control: MasterControl;
  response?: {
    answer: 'yes' | 'no' | 'partial' | 'na' | null;
    answeredAt?: string;
    remediationPlan?: string;
  };
  evidenceCounts?: {
    evidenceCount: number;
    fileCount: number;
    hasFiles: boolean;
  };
  onAnswerChange: (answer: 'yes' | 'no' | 'partial' | 'na') => void;
  onGeneratePolicy: () => void;
  onUploadEvidence: () => void;
}

const FRAMEWORK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  SOC2: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
  ISO27001: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  HIPAA: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
  NIST: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  PCIDSS: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  GDPR: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
};

const RISK_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: <AlertTriangle className="w-4 h-4" /> },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', icon: <AlertTriangle className="w-4 h-4" /> },
  medium: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', icon: <MinusCircle className="w-4 h-4" /> },
  low: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', icon: <MinusCircle className="w-4 h-4" /> },
};

const ControlDetailDrawer: React.FC<ControlDetailDrawerProps> = ({
  isOpen,
  onClose,
  control,
  response,
  evidenceCounts,
  onAnswerChange,
  onGeneratePolicy,
  onUploadEvidence,
}) => {
  const [showGuidance, setShowGuidance] = useState(false);
  const [showFrameworks, setShowFrameworks] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const riskStyle = RISK_COLORS[control.riskLevel];

  const getStatusDisplay = () => {
    if (!response?.answer) {
      return { icon: <MinusCircle className="w-5 h-5 text-slate-400" />, text: 'Not Assessed', color: 'text-slate-500' };
    }
    switch (response.answer) {
      case 'yes':
        return { icon: <CheckCircle className="w-5 h-5 text-emerald-500" />, text: 'Compliant', color: 'text-emerald-600' };
      case 'no':
        return { icon: <XCircle className="w-5 h-5 text-red-500" />, text: 'Gap Identified', color: 'text-red-600' };
      case 'partial':
        return { icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, text: 'Partially Compliant', color: 'text-amber-600' };
      case 'na':
        return { icon: <MinusCircle className="w-5 h-5 text-slate-400" />, text: 'Not Applicable', color: 'text-slate-500' };
    }
  };

  const status = getStatusDisplay();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            ref={drawerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-midnight-900 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-steel-800">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-200 dark:bg-steel-800 text-slate-700 dark:text-steel-300 rounded">
                    {control.id}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1 ${riskStyle.bg} ${riskStyle.text}`}>
                    {riskStyle.icon}
                    {control.riskLevel.charAt(0).toUpperCase() + control.riskLevel.slice(1)}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-steel-100">{control.title}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-steel-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-steel-400" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Action Buttons - Always at top */}
              <div className="p-6 border-b border-slate-200 dark:border-steel-800 bg-slate-50 dark:bg-midnight-800">
                <div className="flex gap-3">
                  <button
                    onClick={onGeneratePolicy}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate AI Policy
                  </button>
                  <button
                    onClick={onUploadEvidence}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-steel-800 text-slate-700 dark:text-steel-200 border border-slate-300 dark:border-steel-600 rounded-lg hover:bg-slate-50 dark:hover:bg-steel-700 transition-colors font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Evidence
                  </button>
                </div>

                {/* Quick Status Toggle */}
                <div className="mt-4">
                  <label className="text-xs font-medium text-slate-500 dark:text-steel-400 uppercase tracking-wider mb-2 block">
                    Quick Response
                  </label>
                  <div className="flex gap-2">
                    {(['yes', 'no', 'partial', 'na'] as const).map((answer) => {
                      const isSelected = response?.answer === answer;
                      const styles = {
                        yes: isSelected ? 'bg-emerald-600 text-white border-emerald-600' : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50',
                        no: isSelected ? 'bg-red-600 text-white border-red-600' : 'border-red-300 text-red-600 hover:bg-red-50',
                        partial: isSelected ? 'bg-amber-500 text-white border-amber-500' : 'border-amber-300 text-amber-600 hover:bg-amber-50',
                        na: isSelected ? 'bg-slate-600 text-white border-slate-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50',
                      };
                      const labels = { yes: 'Yes', no: 'No', partial: 'Partial', na: 'N/A' };

                      return (
                        <button
                          key={answer}
                          onClick={() => onAnswerChange(answer)}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${styles[answer]}`}
                        >
                          {labels[answer]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Why This Matters (ELI5) */}
              <div className="p-6 border-b border-slate-200 dark:border-steel-800">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-steel-100">Why This Matters</h3>
                </div>
                <p className="text-slate-600 dark:text-steel-400 leading-relaxed">
                  {control.whyItMatters || control.description}
                </p>
              </div>

              {/* Current Status */}
              <div className="p-6 border-b border-slate-200 dark:border-steel-800">
                <h3 className="font-semibold text-slate-900 dark:text-steel-100 mb-4">Current Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-steel-800/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {status.icon}
                      <span className={`font-medium ${status.color}`}>{status.text}</span>
                    </div>
                    {response?.answeredAt && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-steel-400">
                        <Clock className="w-3 h-3" />
                        {new Date(response.answeredAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Evidence Status */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-steel-800/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Paperclip className={`w-4 h-4 ${evidenceCounts?.hasFiles ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className="text-slate-700 dark:text-steel-300">
                        {evidenceCounts?.hasFiles
                          ? `${evidenceCounts.fileCount} file${evidenceCounts.fileCount !== 1 ? 's' : ''} attached`
                          : 'No evidence uploaded'}
                      </span>
                    </div>
                    {!evidenceCounts?.hasFiles && (
                      <button
                        onClick={onUploadEvidence}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Add now
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Framework Mappings */}
              <div className="p-6 border-b border-slate-200 dark:border-steel-800">
                <button
                  onClick={() => setShowFrameworks(!showFrameworks)}
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-steel-100">
                      Framework Mappings ({control.frameworkMappings.length})
                    </h3>
                  </div>
                  {showFrameworks ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                <AnimatePresence>
                  {showFrameworks && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-2">
                        {control.frameworkMappings.map((mapping, i) => {
                          const colors = FRAMEWORK_COLORS[mapping.frameworkId] || FRAMEWORK_COLORS.SOC2;
                          return (
                            <div
                              key={i}
                              className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`font-medium ${colors.text}`}>
                                  {mapping.frameworkId}
                                </span>
                                <span className={`text-sm ${colors.text}`}>
                                  {mapping.clauseId}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-steel-400 mt-1">
                                {mapping.clauseTitle}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!showFrameworks && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {control.frameworkMappings.slice(0, 4).map((mapping, i) => {
                      const colors = FRAMEWORK_COLORS[mapping.frameworkId] || FRAMEWORK_COLORS.SOC2;
                      return (
                        <span
                          key={i}
                          className={`px-2 py-0.5 text-xs font-medium rounded ${colors.bg} ${colors.text}`}
                        >
                          {mapping.frameworkId}
                        </span>
                      );
                    })}
                    {control.frameworkMappings.length > 4 && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 dark:bg-steel-800 text-slate-500 dark:text-steel-400">
                        +{control.frameworkMappings.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Implementation Guidance */}
              <div className="p-6">
                <button
                  onClick={() => setShowGuidance(!showGuidance)}
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-steel-100">Implementation Guidance</h3>
                  </div>
                  {showGuidance ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                <AnimatePresence>
                  {showGuidance && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">Guidance</h4>
                          <p className="text-sm text-slate-600 dark:text-steel-400">{control.guidance}</p>
                        </div>

                        {control.remediationTip && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">Remediation Tip</h4>
                            <p className="text-sm text-slate-600 dark:text-steel-400">{control.remediationTip}</p>
                          </div>
                        )}

                        {control.evidenceExamples && control.evidenceExamples.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">Evidence Examples</h4>
                            <ul className="space-y-1">
                              {control.evidenceExamples.map((example, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-steel-400">
                                  <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                  {example}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ControlDetailDrawer;
