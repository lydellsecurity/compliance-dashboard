/**
 * Modular Compliance Engine v6.0
 * 
 * Major Changes:
 * - Persistent collapsible LEFT sidebar navigation
 * - Clickable framework gauges that filter assessment view
 * - Critical Gaps bento box with top 5 high-impact gaps
 * - Domain Heatmap visualization
 * - Progressive disclosure (one domain at a time)
 * - Framework Sync Live sidebar with real-time feed
 * - Enhanced control cards with audit guidance
 */

import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Layers,
  FolderOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  X,
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
  Target,
  Lock,
  Users,
  Server,
  Database,
  Eye,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Activity,
  BarChart3,
  Filter,
  Sparkles,
  Menu,
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
  type ComplianceDomainMeta,
  type FrameworkId,
  type UserResponse,
  type CustomControl,
  type FrameworkMapping,
} from './constants/controls';

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = 'overview' | 'workspaces' | 'evidence' | 'company';

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
  frameworkFilter: FrameworkId | null;
}

interface ComplianceContextType {
  state: ComplianceState;
  handleAnswer: (controlId: string, answer: 'yes' | 'no' | 'partial' | 'na') => void;
  handleSync: (control: MasterControl) => void;
  handleUpdateNotes: (controlId: string, notes: string) => void;
  addCustomControl: (control: CustomControl) => void;
  deleteCustomControl: (id: string) => void;
  toggleDarkMode: () => void;
  setFrameworkFilter: (fw: FrameworkId | null) => void;
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
// COMPLIANCE PROVIDER
// ============================================================================

const ComplianceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [responsesObj, setResponsesObj] = useLocalStorage<Record<string, UserResponse>>('ce-responses-v6', {});
  const [customControls, setCustomControls] = useLocalStorage<CustomControl[]>('ce-custom-v6', []);
  const [darkMode, setDarkMode] = useLocalStorage('ce-dark-v6', true);
  const [syncNotifications, setSyncNotifications] = useState<SyncNotification[]>([]);
  const [frameworkFilter, setFrameworkFilter] = useState<FrameworkId | null>(null);

  const responses = useMemo(() => new Map(Object.entries(responsesObj)), [responsesObj]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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

  const handleUpdateNotes = useCallback((controlId: string, notes: string) => {
    setResponsesObj(prev => ({
      ...prev,
      [controlId]: { ...prev[controlId], notes },
    }));
  }, [setResponsesObj]);

  const addCustomControl = useCallback((control: CustomControl) => {
    setCustomControls(prev => [...prev, control]);
  }, [setCustomControls]);

  const deleteCustomControl = useCallback((id: string) => {
    setCustomControls(prev => prev.filter(c => c.id !== id));
  }, [setCustomControls]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, [setDarkMode]);

  const state: ComplianceState = {
    responses,
    customControls,
    syncNotifications,
    darkMode,
    frameworkFilter,
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
        setFrameworkFilter,
      }}
    >
      {children}
    </ComplianceContext.Provider>
  );
};

// ============================================================================
// UI COMPONENTS
// ============================================================================

const GlassCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  glow?: string;
}> = ({ children, className = '', hover = false, onClick, glow }) => (
  <motion.div
    whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
    whileTap={hover ? { scale: 0.98 } : undefined}
    onClick={onClick}
    className={`
      relative overflow-hidden rounded-2xl
      bg-white dark:bg-slate-800/60
      border border-slate-200 dark:border-white/10
      shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]
      ${hover ? 'cursor-pointer transition-all hover:shadow-lg dark:hover:shadow-[0_16px_48px_rgba(0,0,0,0.3)]' : ''}
      ${className}
    `}
    style={glow ? { boxShadow: `0 0 30px ${glow}30, inset 0 0 30px ${glow}10` } : undefined}
  >
    {children}
  </motion.div>
);

// Interactive Circular Gauge - Clickable
const CircularGauge: React.FC<{
  value: number;
  maxValue: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
}> = ({ value, maxValue, size = 140, strokeWidth = 10, color, label, icon, onClick, isActive }) => {
  const percentage = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <motion.div
      className={`flex flex-col items-center cursor-pointer group ${isActive ? 'scale-105' : ''}`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* Active Ring */}
        {isActive && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 1 }}
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: color }}
          />
        )}
        
        {/* Glow Effect */}
        <div
          className={`absolute inset-2 rounded-full blur-2xl transition-opacity ${isActive ? 'opacity-60' : 'opacity-30 group-hover:opacity-50'}`}
          style={{ backgroundColor: color }}
        />

        <svg className="relative z-10 -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200 dark:text-white/10"
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
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <div className="mb-0.5" style={{ color }}>{icon}</div>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">{percentage}%</span>
        </div>
      </div>

      <div className="mt-3 text-center">
        <div className={`font-semibold transition-colors ${isActive ? 'text-white' : 'text-slate-700 dark:text-white/80'}`} style={isActive ? { color } : undefined}>
          {label}
        </div>
        <div className="text-xs text-slate-500 dark:text-white/50">{value}/{maxValue} controls</div>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 text-xs font-medium"
            style={{ color }}
          >
            ✓ Filtering Active
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Domain Heatmap Cell
const HeatmapCell: React.FC<{
  domain: ComplianceDomainMeta;
  progress: { completed: number; total: number; percentage: number };
  onClick: () => void;
}> = ({ domain, progress, onClick }) => {
  const getHeatColor = (pct: number) => {
    if (pct >= 80) return { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-600 dark:text-emerald-400' };
    if (pct >= 60) return { bg: 'bg-lime-500/20', border: 'border-lime-500/40', text: 'text-lime-600 dark:text-lime-400' };
    if (pct >= 40) return { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-600 dark:text-amber-400' };
    if (pct >= 20) return { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-600 dark:text-orange-400' };
    return { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-600 dark:text-red-400' };
  };

  const heat = getHeatColor(progress.percentage);

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 rounded-xl border ${heat.bg} ${heat.border} transition-all text-left w-full`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${domain.color}20` }}>
          <span style={{ color: domain.color }}>{getDomainIcon(domain.id)}</span>
        </div>
        <span className={`text-lg font-bold ${heat.text}`}>{progress.percentage}%</span>
      </div>
      <div className="text-sm font-medium text-slate-700 dark:text-white/80 truncate">{domain.title}</div>
      <div className="text-xs text-slate-500 dark:text-white/50">{progress.completed}/{progress.total}</div>
    </motion.button>
  );
};

// Critical Gap Card
const GapCard: React.FC<{ control: MasterControl; onClick: () => void }> = ({ control, onClick }) => (
  <motion.button
    whileHover={{ x: 4 }}
    onClick={onClick}
    className="w-full p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-left group"
  >
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
        <AlertCircle className="w-4 h-4 text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-red-600 dark:text-red-400">{control.id}</span>
          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
            control.riskLevel === 'critical' ? 'bg-red-500 text-white' :
            control.riskLevel === 'high' ? 'bg-orange-500 text-white' :
            'bg-amber-500 text-white'
          }`}>
            {control.riskLevel.toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-slate-700 dark:text-white/80 truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
          {control.title}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  </motion.button>
);

// Domain Icon Helper
const getDomainIcon = (domainId: string): React.ReactNode => {
  const iconClass = 'w-4 h-4';
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

// Framework Icon Helper
const getFrameworkIcon = (id: string) => {
  const iconClass = 'w-5 h-5';
  switch (id) {
    case 'SOC2': return <Shield className={iconClass} />;
    case 'ISO27001': return <Lock className={iconClass} />;
    case 'HIPAA': return <Users className={iconClass} />;
    case 'NIST': return <Server className={iconClass} />;
    default: return <Shield className={iconClass} />;
  }
};

// ============================================================================
// CONTROL CARD WITH AUDIT GUIDANCE
// ============================================================================

const ControlCard: React.FC<{
  control: MasterControl;
  response: UserResponse | undefined;
  onGlowComplete?: () => void;
}> = ({ control, response, onGlowComplete }) => {
  const { handleAnswer, handleSync } = useCompliance();
  const [showHelp, setShowHelp] = useState(false);
  const [showGlow, setShowGlow] = useState(false);

  const onAnswer = (answer: 'yes' | 'no' | 'partial' | 'na') => {
    handleAnswer(control.id, answer);
    if (answer === 'yes') {
      setShowGlow(true);
      handleSync(control);
      setTimeout(() => {
        setShowGlow(false);
        onGlowComplete?.();
      }, 1000);
    }
  };

  const answerConfig = [
    { value: 'yes' as const, label: 'Yes', color: 'emerald' },
    { value: 'no' as const, label: 'No', color: 'red' },
    { value: 'partial' as const, label: 'Partial', color: 'amber' },
    { value: 'na' as const, label: 'N/A', color: 'slate' },
  ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border overflow-hidden transition-all duration-500 ${
        showGlow 
          ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-400 dark:border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]' 
          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-white/10'
      }`}
    >
      {/* Glow Animation Overlay */}
      <AnimatePresence>
        {showGlow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2 py-1 text-xs font-mono font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/80 rounded-lg">
                {control.id}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                control.riskLevel === 'critical' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                control.riskLevel === 'high' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                control.riskLevel === 'medium' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400'
              }`}>
                {control.riskLevel.charAt(0).toUpperCase() + control.riskLevel.slice(1)} Impact
              </span>
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">
              {control.title}
            </h3>
          </div>

          {/* Audit Guidance Help Button */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className={`p-2 rounded-xl transition-all flex-shrink-0 ${
              showHelp
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10'
            }`}
            title="Audit Guidance"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Question */}
        <p className="text-sm text-slate-600 dark:text-white/70 mb-4">{control.question}</p>

        {/* Framework Mapping Badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {control.frameworkMappings.map(mapping => {
            const fw = FRAMEWORKS.find(f => f.id === mapping.frameworkId);
            return (
              <span
                key={`${mapping.frameworkId}-${mapping.clauseId}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border"
                style={{
                  backgroundColor: `${fw?.color}10`,
                  color: fw?.color,
                  borderColor: `${fw?.color}30`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fw?.color }} />
                {mapping.frameworkId} {mapping.clauseId}
              </span>
            );
          })}
        </div>

        {/* Answer Buttons */}
        <div className="flex gap-2">
          {answerConfig.map(btn => {
            const isSelected = response?.answer === btn.value;
            const colorMap: Record<string, string> = {
              emerald: isSelected ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25' : 'border-emerald-400/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
              red: isSelected ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/25' : 'border-red-400/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10',
              amber: isSelected ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/25' : 'border-amber-400/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10',
              slate: isSelected ? 'bg-slate-500 text-white border-slate-500 shadow-lg shadow-slate-500/25' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-500/10',
            };
            return (
              <motion.button
                key={btn.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onAnswer(btn.value)}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all ${colorMap[btn.color]}`}
              >
                {btn.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Audit Guidance Panel */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200 dark:border-white/10"
          >
            <div className="p-5 bg-blue-50 dark:bg-blue-500/10 space-y-4">
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
                  <Info className="w-4 h-4" />
                  What Auditors Want to See
                </h4>
                <p className="text-sm text-blue-600 dark:text-blue-200/80">{control.guidance}</p>
              </div>
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
                  <FileText className="w-4 h-4" />
                  Evidence Examples
                </h4>
                <ul className="space-y-1">
                  {control.evidenceExamples.map((example, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-200/80">
                      <Check className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gap Remediation (when No selected) */}
      <AnimatePresence>
        {response?.answer === 'no' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-red-200 dark:border-red-500/30"
          >
            <div className="p-4 bg-red-50 dark:bg-red-500/10 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <span className="inline-block px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded mb-1">GAP</span>
                <p className="text-sm text-red-700 dark:text-red-300">{control.remediationTip}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// FRAMEWORK SYNC LIVE SIDEBAR
// ============================================================================

const SyncSidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { state } = useCompliance();
  const { syncNotifications } = state;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Framework Sync</h3>
                  <p className="text-xs text-slate-500 dark:text-white/50">Live Feed</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notifications */}
            <div className="flex-1 overflow-y-auto p-4">
              {syncNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-slate-300 dark:text-white/20" />
                  </div>
                  <h4 className="font-medium text-slate-700 dark:text-white/80 mb-1">No Sync Activity</h4>
                  <p className="text-sm text-slate-500 dark:text-white/50">
                    Answer "Yes" to controls to see requirements sync in real-time
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {syncNotifications.map((notif, i) => {
                    const fw = FRAMEWORKS.find(f => f.id === notif.framework.frameworkId);
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="relative"
                      >
                        <motion.div
                          initial={{ opacity: 0.6 }}
                          animate={{ opacity: 0 }}
                          transition={{ duration: 1.5 }}
                          className="absolute inset-0 rounded-xl"
                          style={{ backgroundColor: `${fw?.color}40` }}
                        />
                        <div className="relative p-3 rounded-xl border" style={{ borderColor: `${fw?.color}40`, backgroundColor: `${fw?.color}08` }}>
                          <div className="flex items-start gap-2">
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: 'spring', damping: 10 }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${fw?.color}20` }}
                            >
                              <CheckCircle2 className="w-4 h-4" style={{ color: fw?.color }} />
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: fw?.color }}>
                                Requirement Met
                              </p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {notif.framework.frameworkId} {notif.framework.clauseId}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-white/50 truncate">
                                {notif.framework.clauseTitle}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Stats */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex-shrink-0">
              <div className="grid grid-cols-2 gap-3">
                {FRAMEWORKS.slice(0, 4).map(fw => {
                  const count = syncNotifications.filter(n => n.framework.frameworkId === fw.id).length;
                  return (
                    <div key={fw.id} className="text-center">
                      <div className="text-lg font-bold" style={{ color: fw.color }}>{count}</div>
                      <div className="text-[10px] text-slate-500 dark:text-white/50">{fw.id}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// LEFT SIDEBAR NAVIGATION
// ============================================================================

const LeftSidebar: React.FC<{
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}> = ({ currentView, onViewChange, isCollapsed, onToggleCollapse }) => {
  const { state, toggleDarkMode } = useCompliance();
  const { darkMode, responses } = state;

  const totalControls = MASTER_CONTROLS.length;
  const answeredCount = Array.from(responses.values()).filter(r => r.answer).length;
  const progressPct = Math.round((answeredCount / totalControls) * 100);

  const navItems = [
    { id: 'overview' as ViewMode, label: 'Overview', icon: LayoutDashboard, description: 'Dashboard & Analytics' },
    { id: 'workspaces' as ViewMode, label: 'Workspaces', icon: Layers, description: '12 Compliance Domains' },
    { id: 'evidence' as ViewMode, label: 'Evidence', icon: FolderOpen, description: 'Document Repository' },
    { id: 'company' as ViewMode, label: 'Company', icon: Building2, description: 'Custom Controls' },
  ];

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 72 : 260 }}
      className="h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 flex flex-col fixed left-0 top-0 z-30"
    >
      {/* Logo */}
      <div className="p-4 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25 flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="overflow-hidden"
              >
                <div className="font-bold text-slate-900 dark:text-white whitespace-nowrap">Compliance Engine</div>
                <div className="text-xs text-slate-500 dark:text-white/50">v6.0</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress Summary */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 border-b border-slate-200 dark:border-white/10"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-white/50">Overall Progress</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">{progressPct}%</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
            />
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-white/50">
            {answeredCount} of {totalControls} controls assessed
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <motion.button
              key={item.id}
              whileHover={{ x: isCollapsed ? 0 : 4 }}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-500' : ''}`} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 text-left overflow-hidden"
                  >
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-slate-400 dark:text-white/40 truncate">{item.description}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-1">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          title={isCollapsed ? (darkMode ? 'Light Mode' : 'Dark Mode') : undefined}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {!isCollapsed && <span className="text-sm">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!isCollapsed && <span className="text-sm">Collapse</span>}
        </button>
      </div>
    </motion.div>
  );
};

// ============================================================================
// OVERVIEW (DASHBOARD) VIEW
// ============================================================================

const OverviewView: React.FC<{
  onNavigate: (view: ViewMode) => void;
  onSelectDomain: (domain: ComplianceDomainMeta) => void;
}> = ({ onNavigate, onSelectDomain }) => {
  const { state, setFrameworkFilter } = useCompliance();
  const { responses, frameworkFilter } = state;

  // Framework progress
  const frameworkProgress = FRAMEWORKS.map(fw => ({
    ...fw,
    ...calculateFrameworkProgress(fw.id, responses),
  }));

  // Stats
  const totalControls = MASTER_CONTROLS.length;
  const answeredCount = Array.from(responses.values()).filter(r => r.answer).length;
  const passedCount = Array.from(responses.values()).filter(r => r.answer === 'yes' || r.answer === 'na').length;
  const gapsCount = Array.from(responses.values()).filter(r => r.answer === 'no').length;

  // Critical Gaps (top 5 high-impact "No" or unanswered)
  const criticalGaps = MASTER_CONTROLS
    .filter(c => {
      const r = responses.get(c.id);
      return (r?.answer === 'no' || r?.answer === 'partial') && (c.riskLevel === 'critical' || c.riskLevel === 'high');
    })
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.riskLevel] - order[b.riskLevel];
    })
    .slice(0, 5);

  const handleGaugeClick = (fwId: FrameworkId) => {
    setFrameworkFilter(frameworkFilter === fwId ? null : fwId);
    if (frameworkFilter !== fwId) {
      onNavigate('workspaces');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Compliance Overview</h1>
          <p className="text-slate-500 dark:text-white/60">Monitor your security posture across all frameworks</p>
        </div>
        <div className="flex items-center gap-2">
          {frameworkFilter && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setFrameworkFilter(null)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium"
            >
              <Filter className="w-4 h-4" />
              {frameworkFilter} Filter Active
              <X className="w-3 h-3" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Framework Gauges - Clickable */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Framework Compliance</h2>
          <p className="text-sm text-slate-500 dark:text-white/50">Click a gauge to filter assessments</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {frameworkProgress.map(fw => (
            <CircularGauge
              key={fw.id}
              value={fw.completed}
              maxValue={fw.total}
              color={fw.color}
              label={fw.name}
              icon={getFrameworkIcon(fw.id)}
              onClick={() => handleGaugeClick(fw.id)}
              isActive={frameworkFilter === fw.id}
            />
          ))}
        </div>
      </GlassCard>

      {/* Stats + Critical Gaps Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wide mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{Math.round((answeredCount/totalControls)*100)}%</div>
              <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Assessed</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{passedCount}</div>
              <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Compliant</div>
            </div>
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{gapsCount}</div>
              <div className="text-xs text-red-600/70 dark:text-red-400/70">Gaps</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalControls - answeredCount}</div>
              <div className="text-xs text-amber-600/70 dark:text-amber-400/70">Remaining</div>
            </div>
          </div>
        </GlassCard>

        {/* Critical Gaps */}
        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wide flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Critical Gaps
            </h3>
            <span className="text-xs text-slate-400 dark:text-white/40">Top 5 High-Impact</span>
          </div>
          {criticalGaps.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400 dark:text-white/40">
              <div className="text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm">No critical gaps detected!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {criticalGaps.map(control => (
                <GapCard
                  key={control.id}
                  control={control}
                  onClick={() => {
                    onSelectDomain(COMPLIANCE_DOMAINS.find(d => d.id === control.domain)!);
                    onNavigate('workspaces');
                  }}
                />
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Domain Heatmap */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wide flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Domain Heatmap
          </h3>
          <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-white/40">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/30" /> At Risk</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/30" /> Needs Work</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/30" /> Healthy</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {COMPLIANCE_DOMAINS.map(domain => {
            const progress = getDomainProgress(domain.id, responses);
            return (
              <HeatmapCell
                key={domain.id}
                domain={domain}
                progress={progress}
                onClick={() => {
                  onSelectDomain(domain);
                  onNavigate('workspaces');
                }}
              />
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
};

// ============================================================================
// WORKSPACES (ASSESSMENT) VIEW
// ============================================================================

const WorkspacesView: React.FC<{
  selectedDomain: ComplianceDomainMeta | null;
  onSelectDomain: (domain: ComplianceDomainMeta) => void;
}> = ({ selectedDomain, onSelectDomain }) => {
  const { state } = useCompliance();
  const { responses, frameworkFilter } = state;
  const [searchQuery, setSearchQuery] = useState('');

  // Get controls based on domain and framework filter
  const controls = useMemo(() => {
    let filtered = selectedDomain ? getControlsByDomain(selectedDomain.id) : MASTER_CONTROLS;
    
    // Apply framework filter
    if (frameworkFilter) {
      filtered = filtered.filter(c => 
        c.frameworkMappings.some(m => m.frameworkId === frameworkFilter)
      );
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.keywords.some(k => k.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [selectedDomain, frameworkFilter, searchQuery]);

  return (
    <div className="flex gap-6 h-full">
      {/* Domain List */}
      <div className="w-64 flex-shrink-0">
        <GlassCard className="p-3 sticky top-0">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wide px-3 mb-3">
            Compliance Domains
          </h3>
          <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
            {COMPLIANCE_DOMAINS.map(domain => {
              const progress = getDomainProgress(domain.id, responses);
              const isActive = selectedDomain?.id === domain.id;
              const isComplete = progress.percentage === 100 && progress.total > 0;

              return (
                <button
                  key={domain.id}
                  onClick={() => onSelectDomain(domain)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${domain.color}20` }}
                    >
                      <span style={{ color: domain.color }}>{getDomainIcon(domain.id)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-white/80'}`}>
                        {domain.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex-1 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${progress.percentage}%`, backgroundColor: isComplete ? '#10B981' : domain.color }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-white/40">{progress.percentage}%</span>
                      </div>
                    </div>
                    {isComplete && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Controls Area */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Search + Filter Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search controls..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {frameworkFilter && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 rounded-xl">
              <Filter className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{frameworkFilter}</span>
            </div>
          )}
        </div>

        {/* Domain Header */}
        {selectedDomain && (
          <GlassCard className="p-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${selectedDomain.color}20` }}
              >
                <span style={{ color: selectedDomain.color }} className="scale-125">{getDomainIcon(selectedDomain.id)}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedDomain.title}</h2>
                <p className="text-sm text-slate-500 dark:text-white/60">{selectedDomain.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ color: selectedDomain.color }}>
                  {getDomainProgress(selectedDomain.id, responses).percentage}%
                </div>
                <div className="text-xs text-slate-500 dark:text-white/50">Complete</div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Controls List */}
        <div className="space-y-3">
          {controls.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-slate-300 dark:text-white/20 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-white/50">
                {searchQuery ? 'No controls match your search' : 'Select a domain to view controls'}
              </p>
            </div>
          ) : (
            controls.map((control, i) => (
              <motion.div
                key={control.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <ControlCard control={control} response={responses.get(control.id)} />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EVIDENCE VIEW
// ============================================================================

const EvidenceView: React.FC = () => {
  const { state, handleUpdateNotes } = useCompliance();
  const { responses } = state;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const passedControls = MASTER_CONTROLS.filter(c => responses.get(c.id)?.answer === 'yes');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Evidence Repository</h1>
          <p className="text-slate-500 dark:text-white/60">Centralized storage for audit documentation</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-medium text-sm">
            {passedControls.length} controls ready for evidence
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-medium text-sm hover:bg-blue-600 transition-colors">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {passedControls.length === 0 ? (
        <GlassCard className="p-16 text-center">
          <FolderOpen className="w-16 h-16 text-slate-300 dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Evidence Yet</h3>
          <p className="text-slate-500 dark:text-white/60">Complete controls with "Yes" to start collecting evidence</p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase">Control</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase">Evidence Notes</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {passedControls.map(control => {
                const response = responses.get(control.id);
                const isEditing = editingId === control.id;
                return (
                  <tr key={control.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-mono bg-slate-100 dark:bg-white/10 rounded">{control.id}</span>
                        <span className="text-sm text-slate-900 dark:text-white font-medium truncate max-w-xs">{control.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full">
                        <Check className="w-3 h-3" /> Compliant
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editNotes}
                            onChange={e => setEditNotes(e.target.value)}
                            placeholder="Add evidence notes..."
                            className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/20 rounded-lg"
                            autoFocus
                          />
                          <button onClick={() => { handleUpdateNotes(control.id, editNotes); setEditingId(null); }} className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg">Save</button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-slate-500 text-sm">Cancel</button>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-600 dark:text-white/70">
                          {response?.notes || <span className="text-slate-400 dark:text-white/30 italic">No notes</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {!isEditing && (
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingId(control.id); setEditNotes(response?.notes || ''); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg" title="Upload (coming soon)">
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
        </GlassCard>
      )}
    </div>
  );
};

// ============================================================================
// COMPANY CONTROLS VIEW
// ============================================================================

const CompanyView: React.FC = () => {
  const { state, addCustomControl, deleteCustomControl } = useCompliance();
  const { customControls } = state;
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', desc: '', question: '', category: 'access_control' as ComplianceDomain, mappings: [] as { fwId: FrameworkId; clause: string }[] });
  const [newMap, setNewMap] = useState({ fwId: 'SOC2' as FrameworkId, clause: '' });

  const addMapping = () => {
    if (newMap.clause.trim()) {
      setForm(p => ({ ...p, mappings: [...p.mappings, { ...newMap, clause: newMap.clause.trim() }] }));
      setNewMap({ fwId: 'SOC2', clause: '' });
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name && form.desc) {
      addCustomControl({
        id: `CUSTOM-${Date.now()}`,
        title: form.name,
        description: form.desc,
        question: form.question || `Is ${form.name} implemented?`,
        category: form.category,
        frameworkMappings: form.mappings.map(m => ({ frameworkId: m.fwId, clauseId: m.clause, clauseTitle: 'Custom' })),
        effort: 'medium',
        impact: 'medium',
        createdAt: new Date().toISOString(),
        createdBy: 'User',
      });
      setForm({ name: '', desc: '', question: '', category: 'access_control', mappings: [] });
      setShowModal(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Company Controls</h1>
          <p className="text-slate-500 dark:text-white/60">Custom internal policies and framework mappings</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-violet-500/25">
          <Plus className="w-4 h-4" /> Create Control
        </button>
      </div>

      {customControls.length === 0 ? (
        <GlassCard className="p-16 text-center">
          <Building2 className="w-16 h-16 text-slate-300 dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Custom Controls</h3>
          <p className="text-slate-500 dark:text-white/60 mb-6">Add controls specific to your organization</p>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-xl">
            <Plus className="w-4 h-4" /> Create Your First Control
          </button>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {customControls.map(c => (
            <GlassCard key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-mono bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded">{c.id}</span>
                    <span className="px-2 py-0.5 text-[10px] bg-violet-500/20 text-violet-500 rounded">CUSTOM</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{c.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-white/70 mb-3">{c.description}</p>
                  {c.frameworkMappings.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.frameworkMappings.map((m, i) => {
                        const fw = FRAMEWORKS.find(f => f.id === m.frameworkId);
                        return (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border" style={{ borderColor: `${fw?.color}40`, color: fw?.color, backgroundColor: `${fw?.color}10` }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fw?.color }} />
                            {m.frameworkId} {m.clauseId}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button onClick={() => deleteCustomControl(c.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-slate-200 dark:border-white/10">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Custom Control</h2>
              </div>
              <form onSubmit={submit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-1.5">Control Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-1.5">Description *</label>
                  <textarea value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as ComplianceDomain }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white">
                    {COMPLIANCE_DOMAINS.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                  </select>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-2">Framework Mappings</label>
                  <div className="flex gap-2 mb-3">
                    <select value={newMap.fwId} onChange={e => setNewMap(p => ({ ...p, fwId: e.target.value as FrameworkId }))} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-lg text-sm">
                      {FRAMEWORKS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <input type="text" value={newMap.clause} onChange={e => setNewMap(p => ({ ...p, clause: e.target.value }))} placeholder="Clause ID" className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-lg text-sm" />
                    <button type="button" onClick={addMapping} className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm">Add</button>
                  </div>
                  {form.mappings.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.mappings.map((m, i) => {
                        const fw = FRAMEWORKS.find(f => f.id === m.fwId);
                        return (
                          <span key={i} className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-white/10 text-sm">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: fw?.color }} />
                            {m.fwId} {m.clause}
                            <button type="button" onClick={() => setForm(p => ({ ...p, mappings: p.mappings.filter((_, idx) => idx !== i) }))} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-white/60">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium">Create</button>
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
// MAIN APP
// ============================================================================

const AppContent: React.FC = () => {
  const { state } = useCompliance();
  const { syncNotifications } = state;
  const [view, setView] = useState<ViewMode>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSyncSidebar, setShowSyncSidebar] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<ComplianceDomainMeta | null>(COMPLIANCE_DOMAINS[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Left Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <LeftSidebar
          currentView={view}
          onViewChange={setView}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2">
              <Menu className="w-5 h-5 text-slate-600 dark:text-white/60" />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Compliance Engine</span>
          </div>
          <button
            onClick={() => setShowSyncSidebar(!showSyncSidebar)}
            className={`relative p-2 rounded-lg ${showSyncSidebar ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600' : 'text-slate-400'}`}
          >
            <Zap className="w-5 h-5" />
            {syncNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {Math.min(syncNotifications.length, 99)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-black/50 z-40 lg:hidden" />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 z-50 lg:hidden">
              <LeftSidebar currentView={view} onViewChange={(v) => { setView(v); setMobileMenuOpen(false); }} isCollapsed={false} onToggleCollapse={() => {}} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'} pt-16 lg:pt-0`}
        style={{ paddingRight: showSyncSidebar ? '320px' : '0' }}
      >
        {/* Sync Toggle Button - Desktop */}
        <button
          onClick={() => setShowSyncSidebar(!showSyncSidebar)}
          className={`hidden lg:flex fixed right-4 top-4 z-30 items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            showSyncSidebar
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-white/60 border border-slate-200 dark:border-white/10 hover:border-emerald-500 hover:text-emerald-500'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span className="text-sm font-medium">Sync Feed</span>
          {syncNotifications.length > 0 && (
            <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full ${showSyncSidebar ? 'bg-white/20' : 'bg-emerald-500 text-white'}`}>
              {syncNotifications.length}
            </span>
          )}
        </button>

        <div className="p-6 lg:p-8">
          <AnimatePresence mode="wait">
            {view === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <OverviewView
                  onNavigate={setView}
                  onSelectDomain={d => { setSelectedDomain(d); setView('workspaces'); }}
                />
              </motion.div>
            )}
            {view === 'workspaces' && (
              <motion.div key="workspaces" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <WorkspacesView
                  selectedDomain={selectedDomain}
                  onSelectDomain={setSelectedDomain}
                />
              </motion.div>
            )}
            {view === 'evidence' && (
              <motion.div key="evidence" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <EvidenceView />
              </motion.div>
            )}
            {view === 'company' && (
              <motion.div key="company" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <CompanyView />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Sync Sidebar */}
      <SyncSidebar isOpen={showSyncSidebar} onClose={() => setShowSyncSidebar(false)} />
    </div>
  );
};

const App: React.FC = () => (
  <ComplianceProvider>
    <AppContent />
  </ComplianceProvider>
);

export default App;
