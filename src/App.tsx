/**
 * ============================================================================
 * MODULAR COMPLIANCE ENGINE - REDESIGNED UI
 * ============================================================================
 * 
 * Features:
 * - Wizard-based stepped navigation by compliance domain
 * - Interactive mapping graphics with sync animations
 * - Company-specific custom controls
 * - Guidance tooltips and contextual remediation
 * - Framework progress rings dashboard
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MASTER_CONTROLS,
  COMPLIANCE_DOMAINS,
  FRAMEWORKS,
  getControlsByDomain,
  calculateFrameworkProgress,
  getDomainProgress,
  type MasterControl,
  type FrameworkId,
  type UserResponse,
  type CustomControl,
  type FrameworkMapping,
} from './constants/controls';

// ============================================================================
// ICONS (Inline SVG components)
// ============================================================================

const Icons = {
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Info: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Link: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  Grid: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  Home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 3v1m0 16v1m-8-9h1m16 0h1m-2.636-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
};

// ============================================================================
// PROGRESS RING COMPONENT
// ============================================================================

interface ProgressRingProps {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  label: string;
  sublabel?: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ 
  progress, size, strokeWidth, color, label, sublabel 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-slate-200 dark:text-slate-700"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {progress}%
          </span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <div className="font-semibold text-slate-900 dark:text-white">{label}</div>
        {sublabel && (
          <div className="text-sm text-slate-500 dark:text-slate-400">{sublabel}</div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAPPING TOAST COMPONENT
// ============================================================================

interface MappingToastProps {
  mappings: FrameworkMapping[];
  controlTitle: string;
  onClose: () => void;
}

const MappingToast: React.FC<MappingToastProps> = ({ mappings, controlTitle, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="fixed bottom-6 right-6 z-50 max-w-md"
    >
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 shadow-2xl shadow-emerald-500/25">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Icons.Sparkles />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white/80 text-sm font-medium">Answer Synced!</span>
              <Icons.Check />
            </div>
            <p className="text-white font-medium text-sm mb-3 truncate">{controlTitle}</p>
            <div className="space-y-1.5">
              {mappings.slice(0, 4).map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-2 text-white/90 text-xs"
                >
                  <Icons.Link />
                  <span className="font-mono">{m.frameworkId} {m.clauseId}</span>
                  <span className="text-white/60">→</span>
                  <span className="truncate">{m.clauseTitle}</span>
                </motion.div>
              ))}
              {mappings.length > 4 && (
                <div className="text-white/60 text-xs">
                  +{mappings.length - 4} more mappings
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <Icons.X />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// GUIDANCE TOOLTIP COMPONENT
// ============================================================================

interface GuidanceTooltipProps {
  control: MasterControl;
  isOpen: boolean;
  onClose: () => void;
}

const GuidanceTooltip: React.FC<GuidanceTooltipProps> = ({ control, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute right-0 top-full mt-2 z-40 w-96"
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-start justify-between mb-3">
          <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Icons.Info />
            Why This Matters
          </h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Icons.X />
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
          {control.guidance}
        </p>
        <div className="mb-4">
          <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Evidence Examples
          </h5>
          <ul className="space-y-1.5">
            {control.evidenceExamples.map((ex, i) => (
              <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <span className="text-emerald-500 mt-1">•</span>
                {ex}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          {control.frameworkMappings.map((m, i) => (
            <span
              key={i}
              className="px-2 py-1 text-xs font-mono rounded-lg"
              style={{ 
                backgroundColor: `${FRAMEWORKS.find(f => f.id === m.frameworkId)?.color}20`,
                color: FRAMEWORKS.find(f => f.id === m.frameworkId)?.color 
              }}
            >
              {m.frameworkId} {m.clauseId}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// GAP NOTE COMPONENT
// ============================================================================

interface GapNoteProps {
  control: MasterControl;
  onClose: () => void;
}

const GapNote: React.FC<GapNoteProps> = ({ control, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-4 overflow-hidden"
    >
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-800 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Icons.AlertTriangle />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
              Compliance Gap Detected
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
              {control.remediationTip}
            </p>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                View Remediation Template
              </button>
              <button 
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// CONTROL CARD COMPONENT
// ============================================================================

interface ControlCardProps {
  control: MasterControl;
  response: UserResponse | undefined;
  onAnswer: (answer: 'yes' | 'no' | 'partial' | 'na') => void;
  onShowMapping: () => void;
}

const ControlCard: React.FC<ControlCardProps> = ({ 
  control, response, onAnswer, onShowMapping 
}) => {
  const [showGuidance, setShowGuidance] = useState(false);
  const [showGapNote, setShowGapNote] = useState(false);

  const handleAnswer = (answer: 'yes' | 'no' | 'partial' | 'na') => {
    onAnswer(answer);
    if (answer === 'yes') {
      onShowMapping();
    } else if (answer === 'no') {
      setShowGapNote(true);
    } else {
      setShowGapNote(false);
    }
  };

  const riskColors = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 relative"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">
            {control.id}
          </span>
          <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${riskColors[control.riskLevel]}`}>
            {control.riskLevel.toUpperCase()}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowGuidance(!showGuidance)}
            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <Icons.Info />
          </button>
          <AnimatePresence>
            {showGuidance && (
              <GuidanceTooltip 
                control={control} 
                isOpen={showGuidance} 
                onClose={() => setShowGuidance(false)} 
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Title & Description */}
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {control.title}
      </h3>
      <p className="text-slate-600 dark:text-slate-400 mb-4">
        {control.description}
      </p>

      {/* Question */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-4">
        <p className="text-slate-800 dark:text-slate-200 font-medium">
          {control.question}
        </p>
      </div>

      {/* Framework Badges */}
      <div className="flex flex-wrap gap-2 mb-5">
        {control.frameworkMappings.map((m, i) => (
          <span
            key={i}
            className="px-2 py-1 text-xs font-medium rounded-full border"
            style={{ 
              borderColor: FRAMEWORKS.find(f => f.id === m.frameworkId)?.color,
              color: FRAMEWORKS.find(f => f.id === m.frameworkId)?.color 
            }}
          >
            {m.frameworkId}
          </span>
        ))}
      </div>

      {/* Answer Buttons */}
      <div className="flex items-center gap-3">
        {(['yes', 'no', 'partial', 'na'] as const).map((answer) => {
          const isSelected = response?.answer === answer;
          const styles = {
            yes: isSelected 
              ? 'bg-emerald-500 text-white border-emerald-500' 
              : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-500',
            no: isSelected 
              ? 'bg-red-500 text-white border-red-500' 
              : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-red-500 hover:text-red-500',
            partial: isSelected 
              ? 'bg-amber-500 text-white border-amber-500' 
              : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-amber-500 hover:text-amber-500',
            na: isSelected 
              ? 'bg-slate-500 text-white border-slate-500' 
              : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-500',
          };
          const labels = { yes: 'Yes', no: 'No', partial: 'Partial', na: 'N/A' };

          return (
            <button
              key={answer}
              onClick={() => handleAnswer(answer)}
              className={`flex-1 py-2.5 px-4 rounded-xl border-2 font-medium text-sm transition-all ${styles[answer]}`}
            >
              {labels[answer]}
            </button>
          );
        })}
      </div>

      {/* Gap Note */}
      <AnimatePresence>
        {showGapNote && response?.answer === 'no' && (
          <GapNote control={control} onClose={() => setShowGapNote(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// CUSTOM CONTROL MODAL
// ============================================================================

interface CustomControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (control: Omit<CustomControl, 'id' | 'createdAt' | 'createdBy'>) => void;
}

const CustomControlModal: React.FC<CustomControlModalProps> = ({ isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [question, setQuestion] = useState('');
  const [selectedFrameworks, setSelectedFrameworks] = useState<{ frameworkId: FrameworkId; clauseId: string }[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      description,
      question,
      frameworkMappings: selectedFrameworks.map(sf => ({
        ...sf,
        clauseTitle: 'Custom Control',
      })),
    });
    setTitle('');
    setDescription('');
    setQuestion('');
    setSelectedFrameworks([]);
    onClose();
  };

  const toggleFramework = (frameworkId: FrameworkId) => {
    const existing = selectedFrameworks.find(sf => sf.frameworkId === frameworkId);
    if (existing) {
      setSelectedFrameworks(selectedFrameworks.filter(sf => sf.frameworkId !== frameworkId));
    } else {
      setSelectedFrameworks([...selectedFrameworks, { frameworkId, clauseId: 'CUSTOM' }]);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Add Custom Internal Control
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Create company-specific controls and map them to frameworks
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Control Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekly Team Security Scrums"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this control does..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Assessment Question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Does your team hold weekly security meetings?"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Map to Frameworks
            </label>
            <div className="flex flex-wrap gap-2">
              {FRAMEWORKS.map((fw) => {
                const isSelected = selectedFrameworks.some(sf => sf.frameworkId === fw.id);
                return (
                  <button
                    key={fw.id}
                    type="button"
                    onClick={() => toggleFramework(fw.id)}
                    className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                      isSelected
                        ? 'border-current bg-current/10'
                        : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                    }`}
                    style={isSelected ? { borderColor: fw.color, color: fw.color } : {}}
                  >
                    {fw.icon} {fw.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              Add Control
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// MAPPING VIEW COMPONENT (Visual Crosswalk)
// ============================================================================

interface MappingViewProps {
  responses: Map<string, UserResponse>;
}

const MappingView: React.FC<MappingViewProps> = ({ responses }) => {
  const completedControls = MASTER_CONTROLS.filter(c => {
    const r = responses.get(c.id);
    return r?.answer === 'yes' || r?.answer === 'na';
  });

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Visual Crosswalk Mapping
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          See how your controls satisfy multiple framework requirements
        </p>
      </div>

      {/* Grid View */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-l-xl">
                Control
              </th>
              {FRAMEWORKS.map((fw) => (
                <th
                  key={fw.id}
                  className="px-4 py-3 text-center text-sm font-semibold bg-slate-100 dark:bg-slate-800"
                  style={{ color: fw.color }}
                >
                  {fw.icon} {fw.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {completedControls.slice(0, 20).map((control) => (
              <motion.tr
                key={control.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500">{control.id}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {control.title}
                    </span>
                  </div>
                </td>
                {FRAMEWORKS.map((fw) => {
                  const mapping = control.frameworkMappings.find(m => m.frameworkId === fw.id);
                  return (
                    <td key={fw.id} className="px-4 py-3 text-center">
                      {mapping ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full"
                          style={{ backgroundColor: `${fw.color}20`, color: fw.color }}
                        >
                          <Icons.Check />
                        </motion.div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {completedControls.length > 20 && (
        <p className="text-center text-sm text-slate-500">
          Showing first 20 of {completedControls.length} completed controls
        </p>
      )}
    </div>
  );
};

// ============================================================================
// DASHBOARD VIEW
// ============================================================================

interface DashboardProps {
  responses: Map<string, UserResponse>;
  onStartAssessment: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ responses, onStartAssessment }) => {
  const frameworkProgress = FRAMEWORKS.map(fw => ({
    ...fw,
    ...calculateFrameworkProgress(fw.id, responses),
  }));

  const totalControls = MASTER_CONTROLS.length;
  const answeredControls = Array.from(responses.values()).filter(r => r.answer !== null).length;
  const completedControls = Array.from(responses.values()).filter(r => r.answer === 'yes' || r.answer === 'na').length;
  const gapsIdentified = Array.from(responses.values()).filter(r => r.answer === 'no').length;

  return (
    <div className="space-y-8">
      {/* Hero Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Compliance Dashboard</h1>
            <p className="text-slate-400">Track your progress across all frameworks</p>
          </div>
          <button
            onClick={onStartAssessment}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            Continue Assessment
            <Icons.ChevronRight />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white/10 rounded-2xl p-5">
            <div className="text-4xl font-bold">{totalControls}</div>
            <div className="text-slate-400 text-sm">Total Controls</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-5">
            <div className="text-4xl font-bold text-blue-400">{answeredControls}</div>
            <div className="text-slate-400 text-sm">Answered</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-5">
            <div className="text-4xl font-bold text-emerald-400">{completedControls}</div>
            <div className="text-slate-400 text-sm">Compliant</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-5">
            <div className="text-4xl font-bold text-amber-400">{gapsIdentified}</div>
            <div className="text-slate-400 text-sm">Gaps Identified</div>
          </div>
        </div>
      </motion.div>

      {/* Framework Progress Rings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8"
      >
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-8 text-center">
          Framework Compliance Progress
        </h2>
        <div className="grid grid-cols-4 gap-8">
          {frameworkProgress.map((fw) => (
            <ProgressRing
              key={fw.id}
              progress={fw.percentage}
              size={140}
              strokeWidth={12}
              color={fw.color}
              label={fw.name}
              sublabel={`${fw.completed}/${fw.total} controls`}
            />
          ))}
        </div>
      </motion.div>

      {/* Domain Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8"
      >
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
          Domain Progress
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {COMPLIANCE_DOMAINS.map((domain) => {
            const progress = getDomainProgress(domain.id, responses);
            return (
              <div
                key={domain.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{domain.icon}</span>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {domain.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      {progress.completed}/{progress.total} answered
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.percentage}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: domain.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

type ViewType = 'dashboard' | 'assessment' | 'mapping';

const App: React.FC = () => {
  // State
  const [view, setView] = useState<ViewType>('dashboard');
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, UserResponse>>(new Map());
  const [_customControls, setCustomControls] = useState<CustomControl[]>([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [mappingToast, setMappingToast] = useState<{ control: MasterControl } | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Current domain and controls
  const currentDomain = COMPLIANCE_DOMAINS[currentDomainIndex];
  const domainControls = useMemo(() => getControlsByDomain(currentDomain.id), [currentDomain.id]);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handlers
  const handleAnswer = useCallback((controlId: string, answer: 'yes' | 'no' | 'partial' | 'na') => {
    setResponses(prev => {
      const newResponses = new Map(prev);
      newResponses.set(controlId, {
        controlId,
        answer,
        notes: '',
        evidenceUrls: [],
        answeredAt: new Date().toISOString(),
      });
      return newResponses;
    });
  }, []);

  const handleShowMapping = useCallback((control: MasterControl) => {
    setMappingToast({ control });
  }, []);

  const handleAddCustomControl = useCallback((controlData: Omit<CustomControl, 'id' | 'createdAt' | 'createdBy'>) => {
    const newControl: CustomControl = {
      ...controlData,
      id: `CUSTOM-${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: 'User',
    };
    setCustomControls(prev => [...prev, newControl]);
  }, []);

  const goToNextDomain = () => {
    if (currentDomainIndex < COMPLIANCE_DOMAINS.length - 1) {
      setCurrentDomainIndex(prev => prev + 1);
    }
  };

  const goToPrevDomain = () => {
    if (currentDomainIndex > 0) {
      setCurrentDomainIndex(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                  CE
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  Compliance Engine
                </span>
              </div>

              {/* Nav Links */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setView('dashboard')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                    view === 'dashboard'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Icons.Home />
                  Dashboard
                </button>
                <button
                  onClick={() => setView('assessment')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                    view === 'assessment'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Icons.Check />
                  Assessment
                </button>
                <button
                  onClick={() => setView('mapping')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                    view === 'mapping'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Icons.Grid />
                  Mapping View
                </button>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCustomModal(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-xl transition-colors flex items-center gap-2"
              >
                <Icons.Plus />
                Add Custom Control
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Dashboard 
                responses={responses} 
                onStartAssessment={() => setView('assessment')} 
              />
            </motion.div>
          )}

          {view === 'assessment' && (
            <motion.div
              key="assessment"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex gap-8">
                {/* Sidebar - Domain Navigation */}
                <div className="w-72 flex-shrink-0">
                  <div className="sticky top-24 space-y-2">
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 px-3">
                      Compliance Domains
                    </h3>
                    {COMPLIANCE_DOMAINS.map((domain, index) => {
                      const progress = getDomainProgress(domain.id, responses);
                      const isActive = index === currentDomainIndex;
                      const isCompleted = progress.percentage === 100;

                      return (
                        <button
                          key={domain.id}
                          onClick={() => setCurrentDomainIndex(index)}
                          className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                            isActive
                              ? 'bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700'
                              : 'hover:bg-white/50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{domain.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium truncate ${
                                isActive ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                              }`}>
                                {domain.title}
                              </div>
                              <div className="text-xs text-slate-500">
                                {progress.completed}/{progress.total}
                              </div>
                            </div>
                            {isCompleted && (
                              <span className="text-emerald-500">
                                <Icons.Check />
                              </span>
                            )}
                          </div>
                          {isActive && (
                            <div className="mt-2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress.percentage}%` }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: domain.color }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                  {/* Domain Header */}
                  <motion.div
                    key={currentDomain.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                  >
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-4xl">{currentDomain.icon}</span>
                      <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                          {currentDomain.title}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                          {currentDomain.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>{domainControls.length} controls in this domain</span>
                      <span>•</span>
                      <span>
                        Step {currentDomainIndex + 1} of {COMPLIANCE_DOMAINS.length}
                      </span>
                    </div>
                  </motion.div>

                  {/* Control Cards */}
                  <div className="space-y-6">
                    {domainControls.map((control) => (
                      <ControlCard
                        key={control.id}
                        control={control}
                        response={responses.get(control.id)}
                        onAnswer={(answer) => handleAnswer(control.id, answer)}
                        onShowMapping={() => handleShowMapping(control)}
                      />
                    ))}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={goToPrevDomain}
                      disabled={currentDomainIndex === 0}
                      className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                        currentDomainIndex === 0
                          ? 'text-slate-400 cursor-not-allowed'
                          : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icons.ChevronLeft />
                      Previous Domain
                    </button>
                    <button
                      onClick={goToNextDomain}
                      disabled={currentDomainIndex === COMPLIANCE_DOMAINS.length - 1}
                      className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                        currentDomainIndex === COMPLIANCE_DOMAINS.length - 1
                          ? 'text-slate-400 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      Next Domain
                      <Icons.ChevronRight />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'mapping' && (
            <motion.div
              key="mapping"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8"
            >
              <MappingView responses={responses} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mapping Toast */}
      <AnimatePresence>
        {mappingToast && (
          <MappingToast
            mappings={mappingToast.control.frameworkMappings}
            controlTitle={mappingToast.control.title}
            onClose={() => setMappingToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Custom Control Modal */}
      <AnimatePresence>
        {showCustomModal && (
          <CustomControlModal
            isOpen={showCustomModal}
            onClose={() => setShowCustomModal(false)}
            onSave={handleAddCustomControl}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
