/**
 * Modular Compliance Engine 2.0
 * 
 * Architecture:
 * - Centralized state management for "Answer Once, Comply Everywhere" logic
 * - 4-tab persistent navigation (Dashboard, Assessment, Evidence, Company)
 * - Real-time sync between controls and all 4 framework progress gauges
 * - Lucide React icons for professional UI
 * - Framer Motion for smooth animations
 * - Glassmorphism design system
 */

import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  ClipboardCheck,
  FolderOpen,
  Building2,
  Search,
  Check,
  X,
  ChevronRight,
  Plus,
  Info,
  AlertTriangle,
  Zap,
  Moon,
  Sun,
  Shield,
  Upload,
  FileText,
  Download,
  Link2,
  Target,
  Lock,
  Users,
  Server,
  Database,
  Eye,
  Settings,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';

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
// TYPES
// ============================================================================

type ViewMode = 'dashboard' | 'assessment' | 'evidence' | 'company';

interface SyncNotification {
  id: string;
  controlId: string;
  controlTitle: string;
  framework: FrameworkMapping;
  timestamp: number;
}

interface ComplianceState {
  responses: Map<string, UserResponse>;
  customControls: CustomControl[];
  syncNotifications: SyncNotification[];
  darkMode: boolean;
}

interface ComplianceContextType {
  state: ComplianceState;
  handleAnswer: (controlId: string, answer: 'yes' | 'no' | 'partial' | 'na') => void;
  handleSync: (control: MasterControl) => void;
  handleUpdateNotes: (controlId: string, notes: string) => void;
  addCustomControl: (control: CustomControl) => void;
  deleteCustomControl: (id: string) => void;
  toggleDarkMode: () => void;
  clearNotification: (id: string) => void;
}

// ============================================================================
// CONTEXT - Centralized State Management
// ============================================================================

const ComplianceContext = createContext<ComplianceContextType | null>(null);

const useCompliance = () => {
  const context = useContext(ComplianceContext);
  if (!context) throw new Error('useCompliance must be used within ComplianceProvider');
  return context;
};

// ============================================================================
// LOCAL STORAGE HOOK
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
      console.error('LocalStorage error:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

// ============================================================================
// COMPLIANCE PROVIDER - The Sync Engine
// ============================================================================

const ComplianceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [responsesObj, setResponsesObj] = useLocalStorage<Record<string, UserResponse>>('ce-responses-v5', {});
  const [customControls, setCustomControls] = useLocalStorage<CustomControl[]>('ce-custom-v5', []);
  const [darkMode, setDarkMode] = useLocalStorage('ce-dark-v5', true);
  const [syncNotifications, setSyncNotifications] = useState<SyncNotification[]>([]);

  // Convert to Map for efficient lookups
  const responses = useMemo(() => new Map(Object.entries(responsesObj)), [responsesObj]);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle answer - updates all framework progress simultaneously
  const handleAnswer = useCallback((controlId: string, answer: 'yes' | 'no' | 'partial' | 'na') => {
    setResponsesObj(prev => ({
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
  }, [setResponsesObj]);

  // Handle sync - creates notifications for the Mapping Sidebar
  const handleSync = useCallback((control: MasterControl) => {
    const newNotifications: SyncNotification[] = control.frameworkMappings.map(mapping => ({
      id: `${control.id}-${mapping.frameworkId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      controlId: control.id,
      controlTitle: control.title,
      framework: mapping,
      timestamp: Date.now(),
    }));

    setSyncNotifications(prev => [...newNotifications, ...prev].slice(0, 50));
  }, []);

  // Handle notes update
  const handleUpdateNotes = useCallback((controlId: string, notes: string) => {
    setResponsesObj(prev => ({
      ...prev,
      [controlId]: {
        ...prev[controlId],
        notes,
      },
    }));
  }, [setResponsesObj]);

  // Add custom control
  const addCustomControl = useCallback((control: CustomControl) => {
    setCustomControls(prev => [...prev, control]);
  }, [setCustomControls]);

  // Delete custom control
  const deleteCustomControl = useCallback((id: string) => {
    setCustomControls(prev => prev.filter(c => c.id !== id));
  }, [setCustomControls]);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, [setDarkMode]);

  // Clear notification
  const clearNotification = useCallback((id: string) => {
    setSyncNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const state: ComplianceState = {
    responses,
    customControls,
    syncNotifications,
    darkMode,
  };

  return (
    <ComplianceContext.Provider
      value={{
        state,
        handleAnswer,
        handleSync,
        handleUpdateNotes,
        addCustomControl,
        deleteCustomControl,
        toggleDarkMode,
        clearNotification,
      }}
    >
      {children}
    </ComplianceContext.Provider>
  );
};

// ============================================================================
// UI COMPONENTS - Glassmorphism Design System
// ============================================================================

// Glass Card Component
const GlassCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  gradient?: boolean;
}> = ({ children, className = '', hover = false, onClick, gradient = false }) => (
  <motion.div
    whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
    whileTap={hover ? { scale: 0.98 } : undefined}
    onClick={onClick}
    className={`
      relative overflow-hidden rounded-2xl
      bg-white/[0.08] backdrop-blur-md
      border border-white/[0.12]
      shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.1)]
      ${hover ? 'cursor-pointer transition-shadow hover:shadow-[0_16px_48px_rgba(0,0,0,0.2)]' : ''}
      ${className}
    `}
  >
    {gradient && (
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />
    )}
    <div className="relative z-10">{children}</div>
  </motion.div>
);

// Circular Progress Gauge - High Fidelity
const CircularGauge: React.FC<{
  value: number;
  maxValue: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  icon: React.ReactNode;
}> = ({ value, maxValue, size = 160, strokeWidth = 12, color, label, icon }) => {
  const percentage = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Glow Effect */}
        <div
          className="absolute inset-4 rounded-full blur-2xl opacity-40"
          style={{ backgroundColor: color }}
        />

        {/* SVG Gauge */}
        <svg className="relative z-10 -rotate-90" width={size} height={size}>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-white/10"
          />
          {/* Progress Arc */}
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
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 8px ${color}80) drop-shadow(0 0 16px ${color}40)`,
            }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <div className="mb-1" style={{ color }}>
            {icon}
          </div>
          <motion.span
            className="text-3xl font-bold text-white"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5, type: 'spring' }}
          >
            {percentage}%
          </motion.span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <div className="font-semibold text-white text-lg">{label}</div>
        <div className="text-sm text-white/60">
          {value} / {maxValue} controls
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
  bgColor: string;
}> = ({ icon, value, label, color, bgColor }) => (
  <GlassCard className="p-5">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
        <div className={color}>{icon}</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
        <div className="text-sm text-slate-500 dark:text-white/60">{label}</div>
      </div>
    </div>
  </GlassCard>
);

// Domain Icon Mapper
const getDomainIcon = (domainId: string): React.ReactNode => {
  const iconClass = 'w-5 h-5';
  const icons: Record<string, React.ReactNode> = {
    access_control: <Lock className={iconClass} />,
    asset_management: <Database className={iconClass} />,
    audit_logging: <FileText className={iconClass} />,
    business_continuity: <RefreshCw className={iconClass} />,
    change_management: <Settings className={iconClass} />,
    cryptography: <Shield className={iconClass} />,
    data_privacy: <Eye className={iconClass} />,
    hr_security: <Users className={iconClass} />,
    incident_response: <AlertTriangle className={iconClass} />,
    network_security: <Server className={iconClass} />,
    physical_security: <Building2 className={iconClass} />,
    risk_management: <Target className={iconClass} />,
  };
  return icons[domainId] || <Shield className={iconClass} />;
};

// ============================================================================
// GLOBAL SEARCH COMPONENT
// ============================================================================

const GlobalSearch: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSelectControl?: (control: MasterControl) => void;
}> = ({ value, onChange, onSelectControl }) => {
  const [isFocused, setIsFocused] = useState(false);

  const results = useMemo(() => {
    if (!value.trim()) return [];
    const query = value.toLowerCase();
    return MASTER_CONTROLS.filter(
      c =>
        c.id.toLowerCase().includes(query) ||
        c.title.toLowerCase().includes(query) ||
        c.keywords.some(k => k.toLowerCase().includes(query))
    ).slice(0, 8);
  }, [value]);

  return (
    <div className="relative">
      <div
        className={`
          flex items-center gap-3 px-4 py-3.5 rounded-xl
          bg-white/[0.06] backdrop-blur-md border transition-all duration-200
          ${isFocused ? 'border-blue-500/50 bg-white/[0.1] shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'border-white/10'}
        `}
      >
        <Search className="w-5 h-5 text-white/40" />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Search controls by ID, name, or keyword..."
          className="flex-1 bg-transparent text-white placeholder-white/40 outline-none"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {isFocused && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="absolute top-full left-0 right-0 mt-2 p-2 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 max-h-[400px] overflow-y-auto"
          >
            {results.map(control => (
              <button
                key={control.id}
                onClick={() => {
                  onSelectControl?.(control);
                  onChange('');
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors text-left group"
              >
                <span className="px-2 py-1 text-xs font-mono bg-white/10 rounded text-white/80">
                  {control.id}
                </span>
                <span className="flex-1 text-sm text-white truncate">{control.title}</span>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/80 transition-colors" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// EFFORT/IMPACT BADGES
// ============================================================================

const EffortImpactBadges: React.FC<{ riskLevel: MasterControl['riskLevel'] }> = ({ riskLevel }) => {
  const config = {
    critical: {
      effort: 'High',
      impact: 'Critical',
      effortClass: 'bg-red-500/20 text-red-400 border-red-500/30',
      impactClass: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
    high: {
      effort: 'Medium',
      impact: 'High',
      effortClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      impactClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    },
    medium: {
      effort: 'Low',
      impact: 'Medium',
      effortClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      impactClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
    low: {
      effort: 'Low',
      impact: 'Low',
      effortClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      impactClass: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    },
  };

  const { effort, impact, effortClass, impactClass } = config[riskLevel];

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${effortClass}`}>
        {effort} Effort
      </span>
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${impactClass}`}>
        {impact} Impact
      </span>
    </div>
  );
};

// ============================================================================
// CONTROL CARD COMPONENT
// ============================================================================

const ControlCard: React.FC<{
  control: MasterControl;
  response: UserResponse | undefined;
}> = ({ control, response }) => {
  const { handleAnswer, handleSync } = useCompliance();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showGapNote, setShowGapNote] = useState(false);

  const onAnswer = (answer: 'yes' | 'no' | 'partial' | 'na') => {
    handleAnswer(control.id, answer);
    if (answer === 'yes') {
      handleSync(control);
      setShowGapNote(false);
    } else if (answer === 'no') {
      setShowGapNote(true);
    } else {
      setShowGapNote(false);
    }
  };

  const answerButtons = [
    { value: 'yes' as const, label: 'Yes', selectedClass: 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25', defaultClass: 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10' },
    { value: 'no' as const, label: 'No', selectedClass: 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/25', defaultClass: 'border-red-500/40 text-red-400 hover:bg-red-500/10' },
    { value: 'partial' as const, label: 'Partial', selectedClass: 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/25', defaultClass: 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10' },
    { value: 'na' as const, label: 'N/A', selectedClass: 'bg-slate-500 text-white border-slate-500 shadow-lg shadow-slate-500/25', defaultClass: 'border-slate-500/40 text-slate-400 hover:bg-slate-500/10' },
  ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/80 rounded-lg">
                {control.id}
              </span>
              <EffortImpactBadges riskLevel={control.riskLevel} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white leading-tight">
              {control.title}
            </h3>
          </div>

          {/* Why This Matters Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`
              p-2.5 rounded-xl transition-all
              ${isExpanded
                ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/10'
                : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10'
              }
            `}
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        {/* Question */}
        <p className="text-slate-600 dark:text-white/70 mb-6 leading-relaxed">{control.question}</p>

        {/* Answer Buttons */}
        <div className="flex gap-2 mb-5">
          {answerButtons.map(btn => {
            const isSelected = response?.answer === btn.value;
            return (
              <motion.button
                key={btn.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onAnswer(btn.value)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium border-2 transition-all ${
                  isSelected ? btn.selectedClass : btn.defaultClass
                }`}
              >
                {btn.label}
              </motion.button>
            );
          })}
        </div>

        {/* Framework Mapping Tags */}
        <div className="flex flex-wrap gap-1.5">
          {control.frameworkMappings.map(mapping => {
            const fw = FRAMEWORKS.find(f => f.id === mapping.frameworkId);
            return (
              <span
                key={`${mapping.frameworkId}-${mapping.clauseId}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border"
                style={{
                  backgroundColor: `${fw?.color}12`,
                  color: fw?.color,
                  borderColor: `${fw?.color}30`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: fw?.color }}
                />
                {mapping.frameworkId} {mapping.clauseId}
              </span>
            );
          })}
        </div>
      </div>

      {/* Expandable "Why This Matters" Section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-200 dark:border-white/10"
          >
            <div className="p-6 bg-slate-50 dark:bg-white/[0.03] space-y-5">
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  Why This Matters (Auditor's Perspective)
                </h4>
                <p className="text-sm text-slate-600 dark:text-white/70 leading-relaxed">
                  {control.guidance}
                </p>
              </div>

              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  <FolderOpen className="w-4 h-4 text-emerald-500" />
                  Evidence Examples
                </h4>
                <ul className="space-y-2">
                  {control.evidenceExamples.map((example, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-white/70"
                    >
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gap Note (when "No" is selected) */}
      <AnimatePresence>
        {showGapNote && response?.answer === 'no' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-red-200 dark:border-red-500/30"
          >
            <div className="p-5 bg-red-50 dark:bg-red-500/10 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded mb-2">
                  GAP DETECTED
                </span>
                <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
                  {control.remediationTip}
                </p>
              </div>
              <button
                onClick={() => setShowGapNote(false)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// MAPPING SIDEBAR - The Visual "Sync" Feed
// ============================================================================

const MappingSidebar: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { state } = useCompliance();
  const { syncNotifications } = state;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (mobile) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: 340 }}
            animate={{ x: 0 }}
            exit={{ x: 340 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[320px] bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-50 shadow-2xl"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Sync Feed</h3>
                  <p className="text-xs text-white/50">Real-time mapping</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notifications */}
            <div className="p-4 overflow-y-auto h-[calc(100%-80px)]">
              {syncNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                    <Link2 className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm leading-relaxed">
                    Answer "Yes" to controls to see<br />
                    framework requirements sync in real-time
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {syncNotifications.map((notif, index) => {
                      const fw = FRAMEWORKS.find(f => f.id === notif.framework.frameworkId);
                      return (
                        <motion.div
                          key={notif.id}
                          initial={{ opacity: 0, x: 60, scale: 0.9 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -20, scale: 0.9 }}
                          transition={{ delay: index * 0.02, type: 'spring', damping: 20 }}
                          layout
                          className="relative overflow-hidden group"
                        >
                          {/* Flash Effect */}
                          <motion.div
                            initial={{ opacity: 0.8 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 1.5 }}
                            className="absolute inset-0 bg-emerald-500/40 rounded-xl"
                          />

                          <div className="relative p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                            <div className="flex items-start gap-3">
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0"
                              >
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              </motion.div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-emerald-300 font-medium mb-1">
                                  Requirement Met
                                </p>
                                <p className="text-sm font-bold text-white">
                                  {notif.framework.frameworkId} {notif.framework.clauseId}
                                </p>
                                <p className="text-xs text-white/50 truncate mt-0.5">
                                  {notif.framework.clauseTitle}
                                </p>
                              </div>
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                                style={{
                                  backgroundColor: fw?.color,
                                  boxShadow: `0 0 12px ${fw?.color}`,
                                }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// DASHBOARD VIEW
// ============================================================================

const DashboardView: React.FC<{ onNavigate: (view: ViewMode) => void }> = ({ onNavigate }) => {
  const { state } = useCompliance();
  const { responses } = state;

  // Calculate framework progress
  const frameworkProgress = FRAMEWORKS.map(fw => ({
    ...fw,
    ...calculateFrameworkProgress(fw.id, responses),
  }));

  // Calculate global stats
  const totalControls = MASTER_CONTROLS.length;
  const answeredCount = Array.from(responses.values()).filter(r => r.answer != null).length;
  const passedCount = Array.from(responses.values()).filter(
    r => r.answer === 'yes' || r.answer === 'na'
  ).length;
  const gapsCount = Array.from(responses.values()).filter(r => r.answer === 'no').length;
  const remainingCount = totalControls - answeredCount;
  const assessedPercentage = totalControls > 0 ? Math.round((answeredCount / totalControls) * 100) : 0;

  // Framework icons
  const getFrameworkIcon = (id: string) => {
    const iconClass = 'w-6 h-6';
    switch (id) {
      case 'SOC2':
        return <Shield className={iconClass} />;
      case 'ISO27001':
        return <Lock className={iconClass} />;
      case 'HIPAA':
        return <Users className={iconClass} />;
      case 'NIST':
        return <Server className={iconClass} />;
      default:
        return <Shield className={iconClass} />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section with Framework Gauges */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 lg:p-10">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(59,130,246,0.25),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(139,92,246,0.25),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.15),transparent_60%)]" />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl lg:text-5xl font-bold text-white mb-4"
            >
              Compliance Command Center
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-white/60 text-lg max-w-2xl mx-auto"
            >
              {totalControls} master controls mapped across 4 frameworks.
              <span className="text-emerald-400 font-medium"> Answer once, comply everywhere.</span>
            </motion.p>
          </div>

          {/* Framework Gauges */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {frameworkProgress.map((fw, index) => (
              <motion.div
                key={fw.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: index * 0.15, type: 'spring', damping: 15 }}
              >
                <GlassCard className="p-6 lg:p-8" gradient>
                  <CircularGauge
                    value={fw.completed}
                    maxValue={fw.total}
                    color={fw.color}
                    label={fw.name}
                    icon={getFrameworkIcon(fw.id)}
                  />
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          value={`${assessedPercentage}%`}
          label="Assessed"
          color="text-blue-400"
          bgColor="bg-blue-500/20"
        />
        <StatCard
          icon={<CheckCircle2 className="w-6 h-6" />}
          value={passedCount}
          label="Compliant"
          color="text-emerald-400"
          bgColor="bg-emerald-500/20"
        />
        <StatCard
          icon={<XCircle className="w-6 h-6" />}
          value={gapsCount}
          label="Gaps"
          color="text-red-400"
          bgColor="bg-red-500/20"
        />
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          value={remainingCount}
          label="Remaining"
          color="text-amber-400"
          bgColor="bg-amber-500/20"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-5" hover onClick={() => onNavigate('assessment')}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white">Continue Assessment</h3>
              <p className="text-sm text-slate-500 dark:text-white/60">{remainingCount} controls remaining</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </GlassCard>

        <GlassCard className="p-5" hover onClick={() => onNavigate('evidence')}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white">Evidence Locker</h3>
              <p className="text-sm text-slate-500 dark:text-white/60">{passedCount} controls ready</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </GlassCard>

        <GlassCard className="p-5" hover onClick={() => onNavigate('company')}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white">Company Controls</h3>
              <p className="text-sm text-slate-500 dark:text-white/60">Add custom policies</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </GlassCard>
      </div>

      {/* Domain Progress Grid */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-5">Domain Progress</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {COMPLIANCE_DOMAINS.map(domain => {
            const progress = getDomainProgress(domain.id, responses);
            const isComplete = progress.percentage === 100 && progress.total > 0;

            return (
              <motion.div
                key={domain.id}
                whileHover={{ scale: 1.03, y: -2 }}
                className={`
                  p-4 rounded-xl cursor-pointer transition-all
                  ${isComplete
                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                  }
                `}
                onClick={() => onNavigate('assessment')}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${domain.color}20` }}
                  >
                    <div style={{ color: domain.color }}>{getDomainIcon(domain.id)}</div>
                  </div>
                  {isComplete && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                  )}
                </div>
                <h4 className="font-medium text-slate-900 dark:text-white text-sm mb-2">{domain.title}</h4>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.percentage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: isComplete ? '#10B981' : domain.color }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-white/50 font-medium">
                    {progress.completed}/{progress.total}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
};

// ============================================================================
// ASSESSMENT VIEW
// ============================================================================

const AssessmentView: React.FC<{
  searchQuery: string;
  onSearchChange: (query: string) => void;
}> = ({ searchQuery, onSearchChange }) => {
  const { state } = useCompliance();
  const { responses } = state;
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const currentDomain = COMPLIANCE_DOMAINS[currentDomainIndex];

  // Get controls based on search or current domain
  const controls = useMemo(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return MASTER_CONTROLS.filter(
        c =>
          c.id.toLowerCase().includes(query) ||
          c.title.toLowerCase().includes(query) ||
          c.keywords.some(k => k.toLowerCase().includes(query))
      );
    }
    return getControlsByDomain(currentDomain.id);
  }, [currentDomain.id, searchQuery]);

  return (
    <div className="flex gap-6">
      {/* Domain Sidebar */}
      <div className="w-72 flex-shrink-0 hidden lg:block">
        <div className="sticky top-24">
          <GlassCard className="p-4">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-4 px-2">
              Compliance Domains
            </h3>
            <div className="space-y-1">
              {COMPLIANCE_DOMAINS.map((domain, index) => {
                const progress = getDomainProgress(domain.id, responses);
                const isActive = index === currentDomainIndex && !searchQuery;
                const isComplete = progress.percentage === 100 && progress.total > 0;

                return (
                  <button
                    key={domain.id}
                    onClick={() => {
                      setCurrentDomainIndex(index);
                      onSearchChange('');
                    }}
                    className={`
                      w-full text-left px-3 py-3 rounded-xl transition-all
                      ${isActive
                        ? 'bg-blue-500/15 border border-blue-500/30'
                        : 'hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${domain.color}20` }}
                      >
                        <div style={{ color: domain.color }}>{getDomainIcon(domain.id)}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium text-sm truncate ${
                            isActive
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-700 dark:text-white/80'
                          }`}
                        >
                          {domain.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${progress.percentage}%`,
                                backgroundColor: isComplete ? '#10B981' : domain.color,
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 dark:text-white/50">
                            {progress.completed}/{progress.total}
                          </span>
                        </div>
                      </div>
                      {/* Checkmark only when 100% complete */}
                      {isComplete && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30"
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                        </motion.div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Search Bar */}
        <GlobalSearch value={searchQuery} onChange={onSearchChange} />

        {/* Domain Header */}
        {!searchQuery && (
          <motion.div
            key={currentDomain.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${currentDomain.color}20` }}
                >
                  <div style={{ color: currentDomain.color }} className="scale-150">
                    {getDomainIcon(currentDomain.id)}
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {currentDomain.title}
                  </h2>
                  <p className="text-slate-500 dark:text-white/60">{currentDomain.description}</p>
                </div>
                <div className="text-right">
                  <div
                    className="text-3xl font-bold"
                    style={{ color: currentDomain.color }}
                  >
                    {getDomainProgress(currentDomain.id, responses).percentage}%
                  </div>
                  <div className="text-sm text-slate-500 dark:text-white/50">Complete</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Search Results Header */}
        {searchQuery && (
          <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/30">
            <p className="text-blue-700 dark:text-blue-300">
              Found <strong>{controls.length}</strong> controls matching "{searchQuery}"
            </p>
          </div>
        )}

        {/* Control Cards */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {controls.map((control, index) => (
              <motion.div
                key={control.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.03 }}
              >
                <ControlCard control={control} response={responses.get(control.id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {controls.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-slate-300 dark:text-white/20 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-white/50">No controls found</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// EVIDENCE LOCKER VIEW
// ============================================================================

const EvidenceLockerView: React.FC = () => {
  const { state, handleUpdateNotes } = useCompliance();
  const { responses } = state;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  // Get all passed controls
  const passedControls = MASTER_CONTROLS.filter(c => {
    const r = responses.get(c.id);
    return r?.answer === 'yes';
  });

  const handleSave = (controlId: string) => {
    handleUpdateNotes(controlId, editNotes);
    setEditingId(null);
  };

  const handleExportReport = () => {
    // Placeholder for PDF export
    alert('PDF export coming soon with Supabase integration!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Evidence Locker</h2>
          <p className="text-slate-500 dark:text-white/60">
            Attach notes and evidence for auditor review
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl font-medium">
            {passedControls.length} passed controls
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25"
          >
            <Download className="w-4 h-4" />
            Generate Report
          </motion.button>
        </div>
      </div>

      {/* Evidence Table */}
      {passedControls.length === 0 ? (
        <GlassCard className="p-16 text-center">
          <FolderOpen className="w-16 h-16 text-slate-300 dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No Evidence Yet
          </h3>
          <p className="text-slate-500 dark:text-white/60">
            Complete controls with "Yes" to start collecting evidence
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider">
                    Control
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider">
                    Notes / Evidence
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {passedControls.map(control => {
                  const response = responses.get(control.id);
                  const isEditing = editingId === control.id;

                  return (
                    <tr key={control.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 text-xs font-mono bg-slate-100 dark:bg-white/10 rounded">
                            {control.id}
                          </span>
                          <span className="text-sm text-slate-900 dark:text-white font-medium">
                            {control.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-full">
                          <Check className="w-3.5 h-3.5" />
                          Compliant
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editNotes}
                              onChange={e => setEditNotes(e.target.value)}
                              placeholder="Add notes or evidence link..."
                              className="flex-1 px-3 py-2 text-sm bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSave(control.id)}
                              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-4 py-2 text-slate-500 text-sm hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-600 dark:text-white/70">
                            {response?.notes || (
                              <span className="text-slate-400 dark:text-white/30 italic">
                                No notes added
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {!isEditing && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingId(control.id);
                                setEditNotes(response?.notes || '');
                              }}
                              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="Add notes"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title="Upload file (coming soon)"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

// ============================================================================
// COMPANY CONTROLS VIEW
// ============================================================================

const CompanyControlsView: React.FC = () => {
  const { state, addCustomControl, deleteCustomControl } = useCompliance();
  const { customControls } = state;
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    question: '',
    category: 'access_control' as ComplianceDomain,
    mappings: [] as { frameworkId: FrameworkId; clauseId: string }[],
  });
  const [newMapping, setNewMapping] = useState({
    frameworkId: 'SOC2' as FrameworkId,
    clauseId: '',
  });

  const handleAddMapping = () => {
    if (newMapping.clauseId.trim()) {
      setFormData(prev => ({
        ...prev,
        mappings: [...prev.mappings, { ...newMapping, clauseId: newMapping.clauseId.trim() }],
      }));
      setNewMapping({ frameworkId: 'SOC2', clauseId: '' });
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
    if (formData.name && formData.description) {
      addCustomControl({
        id: `CUSTOM-${Date.now()}`,
        title: formData.name,
        description: formData.description,
        question: formData.question || `Is ${formData.name} implemented?`,
        category: formData.category,
        frameworkMappings: formData.mappings.map(m => ({
          frameworkId: m.frameworkId,
          clauseId: m.clauseId,
          clauseTitle: 'Custom mapping',
        })),
        effort: 'medium',
        impact: 'medium',
        createdAt: new Date().toISOString(),
        createdBy: 'User',
      });
      setFormData({
        name: '',
        description: '',
        question: '',
        category: 'access_control',
        mappings: [],
      });
      setShowModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Company Controls</h2>
          <p className="text-slate-500 dark:text-white/60">
            Create custom internal controls and map them to frameworks
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-shadow"
        >
          <Plus className="w-5 h-5" />
          Create New Control
        </motion.button>
      </div>

      {/* Custom Controls List */}
      {customControls.length === 0 ? (
        <GlassCard className="p-16 text-center">
          <Building2 className="w-16 h-16 text-slate-300 dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No Custom Controls
          </h3>
          <p className="text-slate-500 dark:text-white/60 mb-6">
            Add controls specific to your organization's policies
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First Control
          </button>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {customControls.map(control => (
            <GlassCard key={control.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 text-xs font-mono bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 rounded-lg">
                      {control.id}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-violet-500/20 text-violet-400 rounded">
                      Custom
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                    {control.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-white/70 mb-3">
                    {control.description}
                  </p>

                  {control.frameworkMappings.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {control.frameworkMappings.map((m, i) => {
                        const fw = FRAMEWORKS.find(f => f.id === m.frameworkId);
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border"
                            style={{
                              backgroundColor: `${fw?.color}12`,
                              color: fw?.color,
                              borderColor: `${fw?.color}30`,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: fw?.color }}
                            />
                            {m.frameworkId} {m.clauseId}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteCustomControl(control.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Create Control Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-white/10">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Create New Control
                </h2>
                <p className="text-slate-500 dark:text-white/60 text-sm mt-1">
                  Define a custom control and map it to compliance frameworks
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-2">
                    Control Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Weekly Security Standups"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this control does and why it's important..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-2">
                    Assessment Question
                  </label>
                  <input
                    type="text"
                    value={formData.question}
                    onChange={e => setFormData(prev => ({ ...prev, question: e.target.value }))}
                    placeholder="e.g., Are weekly security standups conducted?"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, category: e.target.value as ComplianceDomain }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {COMPLIANCE_DOMAINS.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Framework Mapping Tool */}
                <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-3">
                    <Link2 className="w-4 h-4 inline mr-2" />
                    Framework Mapping Tool
                  </label>
                  <div className="flex gap-2 mb-4">
                    <select
                      value={newMapping.frameworkId}
                      onChange={e =>
                        setNewMapping(prev => ({ ...prev, frameworkId: e.target.value as FrameworkId }))
                      }
                      className="px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      {FRAMEWORKS.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newMapping.clauseId}
                      onChange={e => setNewMapping(prev => ({ ...prev, clauseId: e.target.value }))}
                      placeholder="Clause ID (e.g., CC6.1)"
                      className="flex-1 px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddMapping}
                      className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-white/10"
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: fw?.color }}
                            />
                            <span className="text-sm text-slate-700 dark:text-white/80">
                              {m.frameworkId} {m.clauseId}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMapping(i)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
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
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 text-slate-600 dark:text-white/60 hover:text-slate-800 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-shadow"
                  >
                    Create Control
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const AppContent: React.FC = () => {
  const { state, toggleDarkMode } = useCompliance();
  const { syncNotifications, darkMode } = state;
  const [view, setView] = useState<ViewMode>('dashboard');
  const [showMappingSidebar, setShowMappingSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Navigation items
  const navItems = [
    { id: 'dashboard' as ViewMode, label: 'Dashboard', icon: Home },
    { id: 'assessment' as ViewMode, label: 'Assessment', icon: ClipboardCheck },
    { id: 'evidence' as ViewMode, label: 'Evidence', icon: FolderOpen },
    { id: 'company' as ViewMode, label: 'Company', icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors duration-300">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  Compliance Engine
                </span>
                <span className="hidden md:inline text-xs text-slate-500 dark:text-white/50 ml-2">
                  {MASTER_CONTROLS.length} Controls
                </span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 rounded-xl p-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${isActive
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Sync Sidebar Toggle */}
              <button
                onClick={() => setShowMappingSidebar(!showMappingSidebar)}
                className={`
                  relative p-2.5 rounded-xl transition-all
                  ${showMappingSidebar
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                  }
                `}
              >
                <Zap className="w-5 h-5" />
                {syncNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    {Math.min(syncNotifications.length, 99)}
                  </span>
                )}
              </button>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2.5 rounded-xl text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DashboardView onNavigate={setView} />
            </motion.div>
          )}

          {view === 'assessment' && (
            <motion.div
              key="assessment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <AssessmentView searchQuery={searchQuery} onSearchChange={setSearchQuery} />
            </motion.div>
          )}

          {view === 'evidence' && (
            <motion.div
              key="evidence"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <EvidenceLockerView />
            </motion.div>
          )}

          {view === 'company' && (
            <motion.div
              key="company"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CompanyControlsView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mapping Sidebar */}
      <MappingSidebar isOpen={showMappingSidebar} onClose={() => setShowMappingSidebar(false)} />
    </div>
  );
};

// Root App with Provider
const App: React.FC = () => (
  <ComplianceProvider>
    <AppContent />
  </ComplianceProvider>
);

export default App;
