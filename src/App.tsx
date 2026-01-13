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
  type ComplianceDomain,
  type FrameworkId,
  type UserResponse,
  type CustomControl,
  type FrameworkMapping,
} from './constants/controls';

// ============================================================================
// ICONS (Inline SVG components)
// ============================================================================

const Icons = {
  Home: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Clipboard: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  Folder: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  Cog: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Search: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Link: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  Info: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Upload: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  Sparkle: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Moon: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  Sun: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
};

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = 'dashboard' | 'assessment' | 'evidence' | 'company';

interface MappingNotification {
  id: string;
  controlTitle: string;
  framework: FrameworkMapping;
  timestamp: number;
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

// ============================================================================
// GLASSMORPHISM CARD COMPONENT
// ============================================================================

const GlassCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  gradient?: string;
}> = ({ children, className = '', gradient }) => (
  <div
    className={`relative overflow-hidden rounded-2xl border border-white/20 backdrop-blur-xl ${className}`}
    style={{
      background: gradient || 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)',
    }}
  >
    {children}
  </div>
);

// ============================================================================
// PROGRESS GAUGE COMPONENT
// ============================================================================

const ProgressGauge: React.FC<{
  value: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  icon: string;
  sublabel?: string;
}> = ({ value, size = 120, strokeWidth = 8, color, label, icon, sublabel }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="-rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl mb-1">{icon}</span>
          <span className="text-xl font-bold text-white">{value}%</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <div className="font-semibold text-white">{label}</div>
        {sublabel && <div className="text-xs text-white/60">{sublabel}</div>}
      </div>
    </div>
  );
};

// ============================================================================
// MAPPING SIDEBAR COMPONENT
// ============================================================================

const MappingSidebar: React.FC<{
  notifications: MappingNotification[];
  isOpen: boolean;
  onClose: () => void;
}> = ({ notifications, isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          className="fixed right-0 top-0 h-full w-80 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-50 shadow-2xl"
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icons.Link />
              <h3 className="font-semibold text-white">Mapping Feed</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <Icons.X />
            </button>
          </div>
          
          <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-64px)]">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <Icons.Sparkle />
                <p className="mt-2 text-sm">Requirements will appear here as you complete controls</p>
              </div>
            ) : (
              notifications.map((notif, index) => (
                <motion.div
                  key={notif.id}
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">
                      <Icons.Check />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-emerald-300 font-medium">Requirement Met</p>
                      <p className="text-sm text-white font-semibold truncate">
                        {notif.framework.frameworkId} {notif.framework.clauseId}
                      </p>
                      <p className="text-xs text-white/60 truncate">{notif.framework.clauseTitle}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// SEARCH BAR COMPONENT
// ============================================================================

const SearchBar: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = 'Search controls...' }) => (
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
      <Icons.Search />
    </div>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
    />
    {value && (
      <button
        onClick={() => onChange('')}
        className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white"
      >
        <Icons.X />
      </button>
    )}
  </div>
);

// ============================================================================
// CONTROL CARD WITH EFFORT/IMPACT
// ============================================================================

const ControlCard: React.FC<{
  control: MasterControl;
  response: UserResponse | undefined;
  onAnswer: (controlId: string, answer: 'yes' | 'no' | 'partial' | 'na') => void;
  onMappingTrigger: (control: MasterControl) => void;
}> = ({ control, response, onAnswer, onMappingTrigger }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showGap, setShowGap] = useState(false);

  // Generate effort/impact based on riskLevel if not present
  const effort = (control as any).effort || (control.riskLevel === 'critical' ? 'high' : control.riskLevel === 'high' ? 'medium' : 'low');
  const impact = (control as any).impact || (control.riskLevel === 'critical' || control.riskLevel === 'high' ? 'high' : 'medium');
  const whyItMatters = (control as any).whyItMatters || control.guidance;

  const handleAnswer = (answer: 'yes' | 'no' | 'partial' | 'na') => {
    onAnswer(control.id, answer);
    if (answer === 'yes') {
      onMappingTrigger(control);
      setShowGap(false);
    } else if (answer === 'no') {
      setShowGap(true);
    } else {
      setShowGap(false);
    }
  };

  const effortColors = {
    low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const impactColors = {
    low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    high: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
    >
      {/* Main Content */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/80 rounded">
                {control.id}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded border ${effortColors[effort as keyof typeof effortColors]}`}>
                {effort.charAt(0).toUpperCase() + effort.slice(1)} Effort
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded border ${impactColors[impact as keyof typeof impactColors]}`}>
                {impact.charAt(0).toUpperCase() + impact.slice(1)} Impact
              </span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {control.title}
            </h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
          >
            <Icons.Info />
          </button>
        </div>

        {/* Question */}
        <p className="text-slate-600 dark:text-white/70 mb-5">
          {control.question}
        </p>

        {/* Answer Buttons */}
        <div className="flex gap-2">
          {(['yes', 'no', 'partial', 'na'] as const).map((answer) => {
            const isSelected = response?.answer === answer;
            const baseStyle = "flex-1 py-2.5 px-4 rounded-xl font-medium transition-all border-2";
            const styles = {
              yes: isSelected 
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25' 
                : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
              no: isSelected 
                ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/25' 
                : 'border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10',
              partial: isSelected 
                ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/25' 
                : 'border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10',
              na: isSelected 
                ? 'bg-slate-500 text-white border-slate-500 shadow-lg shadow-slate-500/25' 
                : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-500/10',
            };

            return (
              <motion.button
                key={answer}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswer(answer)}
                className={`${baseStyle} ${styles[answer]}`}
              >
                {answer === 'yes' ? 'Yes' : answer === 'no' ? 'No' : answer === 'partial' ? 'Partial' : 'N/A'}
              </motion.button>
            );
          })}
        </div>

        {/* Framework Tags */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/10">
          <div className="flex flex-wrap gap-1.5">
            {control.frameworkMappings.map((mapping) => {
              const framework = FRAMEWORKS.find(f => f.id === mapping.frameworkId);
              return (
                <span
                  key={`${mapping.frameworkId}-${mapping.clauseId}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70"
                >
                  <span 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: framework?.color }}
                  />
                  {mapping.frameworkId} {mapping.clauseId}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expandable "Why This Matters" */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5"
          >
            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <span className="text-blue-500">💡</span> Why This Matters
                </h4>
                <p className="text-sm text-slate-600 dark:text-white/70">{whyItMatters}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Evidence Examples
                </h4>
                <ul className="space-y-1">
                  {control.evidenceExamples.map((example, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-white/70">
                      <span className="text-slate-400 mt-1">•</span>
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gap Remediation Note */}
      <AnimatePresence>
        {showGap && response?.answer === 'no' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10"
          >
            <div className="p-4 flex items-start gap-3">
              <span className="text-amber-500 text-xl">⚠️</span>
              <div className="flex-1">
                <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                  Remediation Required
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {control.remediationTip}
                </p>
              </div>
              <button
                onClick={() => setShowGap(false)}
                className="text-amber-400 hover:text-amber-600"
              >
                <Icons.X />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// DASHBOARD VIEW
// ============================================================================

const DashboardView: React.FC<{
  responses: Map<string, UserResponse>;
  onNavigate: (view: ViewMode) => void;
}> = ({ responses, onNavigate }) => {
  const frameworkProgress = FRAMEWORKS.map(f => ({
    framework: f,
    ...calculateFrameworkProgress(f.id, responses),
  }));

  const totalControls = MASTER_CONTROLS.length;
  const answeredCount = Array.from(responses.values()).filter(r => r.answer !== null && r.answer !== undefined).length;
  const completedCount = Array.from(responses.values()).filter(r => r.answer === 'yes' || r.answer === 'na').length;
  const gapsCount = Array.from(responses.values()).filter(r => r.answer === 'no').length;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Compliance Coverage Dashboard</h1>
            <p className="text-white/60">Track your progress across {totalControls} controls and 4 frameworks</p>
          </div>

          {/* Framework Gauges */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            {frameworkProgress.map((fp) => (
              <GlassCard key={fp.framework.id} className="p-6">
                <ProgressGauge
                  value={fp.percentage}
                  color={fp.framework.color}
                  label={fp.framework.name}
                  icon={fp.framework.icon}
                  sublabel={`${fp.completed}/${fp.total} met`}
                />
              </GlassCard>
            ))}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            <GlassCard className="p-4 text-center">
              <div className="text-3xl font-bold text-white">{answeredCount}</div>
              <div className="text-sm text-white/60">Assessed</div>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">{completedCount}</div>
              <div className="text-sm text-white/60">Compliant</div>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <div className="text-3xl font-bold text-red-400">{gapsCount}</div>
              <div className="text-sm text-white/60">Gaps</div>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <div className="text-3xl font-bold text-white">{totalControls - answeredCount}</div>
              <div className="text-sm text-white/60">Remaining</div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('assessment')}
          className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl text-left text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
        >
          <Icons.Clipboard />
          <h3 className="text-lg font-semibold mt-3">Continue Assessment</h3>
          <p className="text-blue-100 text-sm mt-1">{totalControls - answeredCount} controls remaining</p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('evidence')}
          className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl text-left text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-shadow"
        >
          <Icons.Folder />
          <h3 className="text-lg font-semibold mt-3">Evidence Locker</h3>
          <p className="text-emerald-100 text-sm mt-1">{completedCount} controls ready for evidence</p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('company')}
          className="p-6 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl text-left text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-shadow"
        >
          <Icons.Cog />
          <h3 className="text-lg font-semibold mt-3">Company Controls</h3>
          <p className="text-violet-100 text-sm mt-1">Add custom controls</p>
        </motion.button>
      </div>

      {/* Domain Progress */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Progress by Domain</h2>
        <div className="grid grid-cols-3 gap-4">
          {COMPLIANCE_DOMAINS.map((domain) => {
            const progress = getDomainProgress(domain.id, responses);
            return (
              <div
                key={domain.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                onClick={() => onNavigate('assessment')}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{domain.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white truncate">{domain.title}</div>
                    <div className="text-xs text-slate-500">{progress.completed}/{progress.total}</div>
                  </div>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.percentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: domain.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ASSESSMENT VIEW
// ============================================================================

const AssessmentView: React.FC<{
  responses: Map<string, UserResponse>;
  onAnswer: (controlId: string, answer: 'yes' | 'no' | 'partial' | 'na') => void;
  onMappingTrigger: (control: MasterControl) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}> = ({ responses, onAnswer, onMappingTrigger, searchQuery, onSearchChange }) => {
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const currentDomain = COMPLIANCE_DOMAINS[currentDomainIndex];

  const filteredControls = useMemo(() => {
    let controls = getControlsByDomain(currentDomain.id);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      controls = MASTER_CONTROLS.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query) ||
        c.keywords.some(k => k.toLowerCase().includes(query))
      );
    }
    return controls;
  }, [currentDomain.id, searchQuery]);

  const domainProgress = getDomainProgress(currentDomain.id, responses);

  return (
    <div className="flex gap-6">
      {/* Domain Sidebar */}
      <div className="w-72 flex-shrink-0">
        <div className="sticky top-24 space-y-2">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 px-3">
            Compliance Domains
          </h3>
          {COMPLIANCE_DOMAINS.map((domain, index) => {
            const progress = getDomainProgress(domain.id, responses);
            const isActive = index === currentDomainIndex;
            const isCompleted = progress.percentage === 100 && progress.total > 0;

            return (
              <button
                key={domain.id}
                onClick={() => {
                  setCurrentDomainIndex(index);
                  onSearchChange('');
                }}
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
                  <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search all controls..."
        />

        {/* Domain Header */}
        {!searchQuery && (
          <div className="flex items-center gap-4 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-4xl">{currentDomain.icon}</span>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{currentDomain.title}</h2>
              <p className="text-slate-500 dark:text-slate-400">{currentDomain.description}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: currentDomain.color }}>
                {domainProgress.percentage}%
              </div>
              <div className="text-sm text-slate-500">{domainProgress.completed}/{domainProgress.total} complete</div>
            </div>
          </div>
        )}

        {/* Search Results Header */}
        {searchQuery && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-blue-700 dark:text-blue-300">
              Found <strong>{filteredControls.length}</strong> controls matching "{searchQuery}"
            </p>
          </div>
        )}

        {/* Controls List */}
        <div className="space-y-4">
          {filteredControls.map((control) => (
            <ControlCard
              key={control.id}
              control={control}
              response={responses.get(control.id)}
              onAnswer={onAnswer}
              onMappingTrigger={onMappingTrigger}
            />
          ))}
        </div>

        {filteredControls.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Icons.Search />
            <p className="mt-2">No controls found</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// EVIDENCE LOCKER VIEW
// ============================================================================

const EvidenceLockerView: React.FC<{
  responses: Map<string, UserResponse>;
  onUpdateEvidence: (controlId: string, notes: string) => void;
}> = ({ responses, onUpdateEvidence }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const completedControls = MASTER_CONTROLS.filter(c => {
    const response = responses.get(c.id);
    return response?.answer === 'yes';
  });

  const handleSave = (controlId: string) => {
    onUpdateEvidence(controlId, editNotes);
    setEditingId(null);
    setEditNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Evidence Locker</h2>
          <p className="text-slate-500 dark:text-slate-400">Attach notes and evidence to your completed controls</p>
        </div>
        <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl font-medium">
          {completedControls.length} controls ready
        </div>
      </div>

      {/* Evidence Cards */}
      {completedControls.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Icons.Folder />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">No Evidence Yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Complete some controls with "Yes" to start collecting evidence
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {completedControls.map((control) => {
            const response = responses.get(control.id);
            const isEditing = editingId === control.id;

            return (
              <div
                key={control.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Icons.Check />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-500">{control.id}</span>
                      <span className="text-emerald-500 text-xs font-medium">COMPLIANT</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{control.title}</h3>
                    
                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Add notes about your evidence (e.g., location of screenshots, policy documents, etc.)"
                          rows={3}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleSave(control.id)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            Save Notes
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-4 py-2 text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            Cancel
                          </button>
                          <div className="flex-1" />
                          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <Icons.Upload />
                            Upload File
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {response?.evidenceNotes ? (
                          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg mb-3">
                            <p className="text-sm text-slate-600 dark:text-slate-300">{response.evidenceNotes}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 mb-3">No evidence notes added yet</p>
                        )}
                        <button
                          onClick={() => {
                            setEditingId(control.id);
                            setEditNotes(response?.evidenceNotes || '');
                          }}
                          className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                        >
                          {response?.evidenceNotes ? 'Edit Notes' : '+ Add Evidence Notes'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPANY CONTROLS VIEW
// ============================================================================

const CompanyControlsView: React.FC<{
  customControls: CustomControl[];
  onAddControl: (control: CustomControl) => void;
  onDeleteControl: (id: string) => void;
}> = ({ customControls, onAddControl, onDeleteControl }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    question: '',
    category: 'access_control' as ComplianceDomain,
    mappings: [] as FrameworkMapping[],
  });
  const [mappingFramework, setMappingFramework] = useState<FrameworkId>('SOC2');
  const [mappingClause, setMappingClause] = useState('');

  const handleAddMapping = () => {
    if (mappingClause.trim()) {
      setFormData(prev => ({
        ...prev,
        mappings: [...prev.mappings, {
          frameworkId: mappingFramework,
          clauseId: mappingClause.trim(),
          clauseTitle: '',
        }],
      }));
      setMappingClause('');
    }
  };

  const handleRemoveMapping = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mappings: prev.mappings.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title && formData.description && formData.question) {
      onAddControl({
        id: `CUSTOM-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        question: formData.question,
        category: formData.category,
        frameworkMappings: formData.mappings,
        effort: 'medium',
        impact: 'medium',
        createdAt: new Date().toISOString(),
        createdBy: 'User',
      });
      setFormData({
        title: '',
        description: '',
        question: '',
        category: 'access_control',
        mappings: [],
      });
      setShowForm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Company Controls</h2>
          <p className="text-slate-500 dark:text-slate-400">Create custom controls specific to your organization</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors shadow-lg shadow-violet-500/25"
        >
          <Icons.Plus />
          Create New Control
        </button>
      </div>

      {/* Create Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Control</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  Define a custom control and map it to compliance frameworks
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Control Name
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Weekly Security Standup"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this control does..."
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as ComplianceDomain }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
                  >
                    {COMPLIANCE_DOMAINS.map(d => (
                      <option key={d.id} value={d.id}>{d.icon} {d.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Assessment Question
                  </label>
                  <input
                    type="text"
                    value={formData.question}
                    onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                    placeholder="e.g., Does your team conduct weekly security reviews?"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
                    required
                  />
                </div>

                {/* Mapping Tool */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Framework Mapping Tool
                  </label>
                  <div className="flex gap-2 mb-3">
                    <select
                      value={mappingFramework}
                      onChange={(e) => setMappingFramework(e.target.value as FrameworkId)}
                      className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                    >
                      {FRAMEWORKS.map(f => (
                        <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={mappingClause}
                      onChange={(e) => setMappingClause(e.target.value)}
                      placeholder="Clause ID (e.g., CC6.1)"
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddMapping}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Add
                    </button>
                  </div>

                  {formData.mappings.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.mappings.map((m, i) => {
                        const fw = FRAMEWORKS.find(f => f.id === m.frameworkId);
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600"
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: fw?.color }} />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {m.frameworkId} {m.clauseId}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMapping(i)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <Icons.X />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors"
                  >
                    Create Control
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Controls List */}
      {customControls.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Icons.Cog />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">No Custom Controls Yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Create controls specific to your organization's needs
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {customControls.map((control) => (
            <div
              key={control.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-violet-900 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-mono bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded">
                      {control.id}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded">
                      Custom
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{control.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{control.description}</p>
                  
                  {control.frameworkMappings.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {control.frameworkMappings.map((m, i) => {
                        const fw = FRAMEWORKS.find(f => f.id === m.frameworkId);
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded-lg"
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: fw?.color }} />
                            {m.frameworkId} {m.clauseId}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onDeleteControl(control.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Icons.X />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [darkMode, setDarkMode] = useLocalStorage('compliance-dark-mode', false);
  const [responses, setResponses] = useLocalStorage<Record<string, UserResponse>>('compliance-responses-v2', {});
  const [customControls, setCustomControls] = useLocalStorage<CustomControl[]>('compliance-custom-controls', []);
  const [mappingNotifications, setMappingNotifications] = useState<MappingNotification[]>([]);
  const [showMappingSidebar, setShowMappingSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Convert responses to Map
  const responsesMap = useMemo(() => new Map(Object.entries(responses)), [responses]);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle answer
  const handleAnswer = useCallback((controlId: string, answer: 'yes' | 'no' | 'partial' | 'na') => {
    setResponses(prev => ({
      ...prev,
      [controlId]: {
        controlId,
        answer,
        notes: prev[controlId]?.notes || '',
        evidenceUrls: prev[controlId]?.evidenceUrls || [],
        evidenceNotes: prev[controlId]?.evidenceNotes || '',
        answeredAt: new Date().toISOString(),
      },
    }));
  }, [setResponses]);

  // Handle mapping trigger
  const handleMappingTrigger = useCallback((control: MasterControl) => {
    const newNotifications: MappingNotification[] = control.frameworkMappings.map(mapping => ({
      id: `${control.id}-${mapping.frameworkId}-${Date.now()}`,
      controlTitle: control.title,
      framework: mapping,
      timestamp: Date.now(),
    }));
    
    setMappingNotifications(prev => [...newNotifications, ...prev].slice(0, 50));
    setShowMappingSidebar(true);
  }, []);

  // Handle evidence update
  const handleUpdateEvidence = useCallback((controlId: string, notes: string) => {
    setResponses(prev => ({
      ...prev,
      [controlId]: {
        ...prev[controlId],
        evidenceNotes: notes,
      },
    }));
  }, [setResponses]);

  // Handle custom control
  const handleAddCustomControl = useCallback((control: CustomControl) => {
    setCustomControls(prev => [...prev, control]);
  }, [setCustomControls]);

  const handleDeleteCustomControl = useCallback((id: string) => {
    setCustomControls(prev => prev.filter(c => c.id !== id));
  }, [setCustomControls]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/25">
                CE
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">Compliance Engine</span>
                <span className="hidden md:inline text-xs text-slate-500 ml-2">{MASTER_CONTROLS.length} Controls</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: <Icons.Home /> },
                { id: 'assessment', label: 'Assessment', icon: <Icons.Clipboard /> },
                { id: 'evidence', label: 'Evidence', icon: <Icons.Folder /> },
                { id: 'company', label: 'Company', icon: <Icons.Cog /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id as ViewMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    view === tab.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMappingSidebar(!showMappingSidebar)}
                className={`p-2.5 rounded-xl transition-all ${
                  showMappingSidebar
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icons.Link />
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                {darkMode ? <Icons.Sun /> : <Icons.Moon />}
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DashboardView responses={responsesMap} onNavigate={setView} />
            </motion.div>
          )}

          {view === 'assessment' && (
            <motion.div
              key="assessment"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AssessmentView
                responses={responsesMap}
                onAnswer={handleAnswer}
                onMappingTrigger={handleMappingTrigger}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </motion.div>
          )}

          {view === 'evidence' && (
            <motion.div
              key="evidence"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <EvidenceLockerView
                responses={responsesMap}
                onUpdateEvidence={handleUpdateEvidence}
              />
            </motion.div>
          )}

          {view === 'company' && (
            <motion.div
              key="company"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CompanyControlsView
                customControls={customControls}
                onAddControl={handleAddCustomControl}
                onDeleteControl={handleDeleteCustomControl}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mapping Sidebar */}
      <MappingSidebar
        notifications={mappingNotifications}
        isOpen={showMappingSidebar}
        onClose={() => setShowMappingSidebar(false)}
      />
    </div>
  );
};

export default App;
