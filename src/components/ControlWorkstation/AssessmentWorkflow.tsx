/**
 * Assessment Workflow
 *
 * 3-phase assessment workflow:
 * Phase 1: Self-Assessment - Toggle for Implemented vs Not Started
 * Phase 2: Remediation Guidance - View control guidance and remediation tips
 * Phase 3: Evidence Linking - Drag-and-drop files or URLs
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Circle,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Upload,
  Link,
  Clock,
  X,
  Paperclip,
  ExternalLink,
} from 'lucide-react';

type AssessmentAnswer = 'yes' | 'no' | 'partial' | 'na' | null;

interface AssessmentWorkflowProps {
  controlId: string;
  controlTitle: string;
  currentAnswer: AssessmentAnswer;
  hasEvidence: boolean;
  evidenceCount: number;
  remediationTip: string;
  onAnswerChange: (answer: AssessmentAnswer) => void;
  onGeneratePolicy: () => void;
  onGenerateAIPolicy: () => void;
  onUploadEvidence: (files: File[]) => void;
  onLinkEvidence: (url: string, description: string) => void;
  onViewEvidence: () => void;
  isGeneratingPolicy?: boolean;
  isGeneratingAIPolicy?: boolean;
}

const ANSWER_OPTIONS: { value: AssessmentAnswer; label: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
  {
    value: 'yes',
    label: 'Implemented',
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  },
  {
    value: 'partial',
    label: 'In Progress',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  },
  {
    value: 'no',
    label: 'Not Started',
    icon: <Circle className="w-4 h-4" />,
    color: 'text-slate-600 dark:text-steel-400',
    bgColor: 'bg-slate-50 dark:bg-steel-800 border-slate-200 dark:border-steel-700',
  },
  {
    value: 'na',
    label: 'Not Applicable',
    icon: <X className="w-4 h-4" />,
    color: 'text-slate-400 dark:text-steel-500',
    bgColor: 'bg-slate-50 dark:bg-steel-800 border-slate-200 dark:border-steel-700',
  },
];

const AssessmentWorkflow: React.FC<AssessmentWorkflowProps> = ({
  controlId: _controlId,
  controlTitle: _controlTitle,
  currentAnswer,
  hasEvidence,
  evidenceCount,
  remediationTip,
  onAnswerChange,
  onGeneratePolicy,
  onGenerateAIPolicy,
  onUploadEvidence,
  onLinkEvidence,
  onViewEvidence,
  isGeneratingPolicy = false,
  isGeneratingAIPolicy = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDescription, setLinkDescription] = useState('');

  const needsRemediation = currentAnswer === 'no' || currentAnswer === 'partial';
  const isCompliant = currentAnswer === 'yes';

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onUploadEvidence(files);
    }
  }, [onUploadEvidence]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onUploadEvidence(files);
    }
  }, [onUploadEvidence]);

  const handleLinkSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (linkUrl.trim()) {
      onLinkEvidence(linkUrl.trim(), linkDescription.trim());
      setLinkUrl('');
      setLinkDescription('');
      setShowLinkForm(false);
    }
  }, [linkUrl, linkDescription, onLinkEvidence]);

  return (
    <div className="space-y-6">
      {/* Phase 1: Self-Assessment */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
            1
          </span>
          Self-Assessment
        </h4>

        <div className="grid grid-cols-2 gap-2">
          {ANSWER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onAnswerChange(option.value)}
              className={`
                flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200
                ${currentAnswer === option.value
                  ? `${option.bgColor} border-2`
                  : 'bg-white dark:bg-steel-800 border-slate-200 dark:border-steel-700 hover:border-slate-300 dark:hover:border-steel-600'
                }
              `}
            >
              <span className={currentAnswer === option.value ? option.color : 'text-slate-400 dark:text-steel-500'}>
                {option.icon}
              </span>
              <span className={`text-sm font-medium ${currentAnswer === option.value ? option.color : 'text-slate-600 dark:text-steel-400'}`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Phase 2: AI Remediation (only show if not implemented) */}
      <AnimatePresence>
        {needsRemediation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold">
                2
              </span>
              Remediation Guidance
            </h4>

            {/* Remediation tip */}
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                    Quick Fix Tip
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {remediationTip}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {/* Control Guidance Button */}
              <button
                onClick={onGeneratePolicy}
                disabled={isGeneratingPolicy}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-steel-700 hover:bg-slate-200 dark:hover:bg-steel-600 text-slate-700 dark:text-steel-200 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPolicy ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <BookOpen className="w-4 h-4" />
                    </motion.div>
                    Loading...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4" />
                    Control Guidance
                  </>
                )}
              </button>

              {/* Generate AI Policy Button */}
              <button
                onClick={onGenerateAIPolicy}
                disabled={isGeneratingAIPolicy}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingAIPolicy ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate AI Policy
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 3: Evidence Linking */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <span className={`
            w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
            ${isCompliant
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-slate-100 dark:bg-steel-700 text-slate-500 dark:text-steel-400'
            }
          `}>
            3
          </span>
          Evidence & Documentation
        </h4>

        {/* Evidence status */}
        {hasEvidence && (
          <button
            onClick={onViewEvidence}
            className="w-full flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {evidenceCount} evidence {evidenceCount === 1 ? 'item' : 'items'} attached
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-emerald-500" />
          </button>
        )}

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200
            ${isDragging
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-slate-300 dark:border-steel-600 hover:border-slate-400 dark:hover:border-steel-500'
            }
          `}
        >
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-indigo-500' : 'text-slate-400 dark:text-steel-500'}`} />

          <p className={`text-sm font-medium ${isDragging ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-steel-400'}`}>
            {isDragging ? 'Drop files here' : 'Drag and drop evidence files'}
          </p>
          <p className="text-xs text-slate-500 dark:text-steel-500 mt-1">
            or click to browse • PDF, images, docs up to 10MB
          </p>
        </div>

        {/* Link evidence */}
        <div className="space-y-2">
          {!showLinkForm ? (
            <button
              onClick={() => setShowLinkForm(true)}
              className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <Link className="w-4 h-4" />
              Link external evidence (URL)
            </button>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleLinkSubmit}
              className="space-y-2 p-3 bg-slate-50 dark:bg-steel-750 rounded-lg"
            >
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-steel-800 border border-slate-200 dark:border-steel-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <input
                type="text"
                value={linkDescription}
                onChange={(e) => setLinkDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-steel-800 border border-slate-200 dark:border-steel-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!linkUrl.trim()}
                  className="flex-1 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkForm(false);
                    setLinkUrl('');
                    setLinkDescription('');
                  }}
                  className="px-3 py-2 text-sm text-slate-600 dark:text-steel-400 hover:text-slate-700 dark:hover:text-steel-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentWorkflow;
