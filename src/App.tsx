/**
 * Modular Compliance Engine 2.0
 * 
 * Implementation of Product Specification:
 * - 4-Tab Navigation: Dashboard, Assessment, Evidence, Company
 * - Bento Dashboard with glassmorphism and 4 framework gauges
 * - Assessment wizard with 12-domain sidebar
 * - Mapping Sidebar showing "Answer Once, Comply Everywhere" in real-time
 * - Evidence Locker and Company Controls
 * - lucide-react icons, framer-motion animations
 */

import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ClipboardCheck,
  FolderOpen,
  Building2,
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
  Lock,
  Users,
  Server,
  Database,
  Eye,
  Settings,
  RefreshCw,
  CheckCircle2,
  Target,
  Activity,
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

type TabId = 'dashboard' | 'assessment' | 'evidence' | 'company';

interface SyncNotification {
  id: string;
  controlId: string;
  controlTitle: string;
  framework: FrameworkMapping;
  timestamp: number;
}

interface AppState {
  responses: Map<string, UserResponse>;
  customControls: CustomControl[];
  syncNotifications: SyncNotification[];
  darkMode: boolean;
}

interface AppContextType {
  state: AppState;
  answerControl: (controlId: string, answer: 'yes' | 'no' | 'partial' | 'na') => void;
  triggerSync: (control: MasterControl) => void;
  updateNotes: (controlId: string, notes: string) => void;
  addCustomControl: (control: CustomControl) => void;
  deleteCustomControl: (id: string) => void;
  toggleDarkMode: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AppContext = createContext<AppContextType | null>(null);
const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

// ============================================================================
// LOCAL STORAGE HOOK
// ============================================================================

function useLocalStorage<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }, [key, value]);

  return [value, setValue];
}

// ============================================================================
// APP PROVIDER
// ============================================================================

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [responsesObj, setResponsesObj] = useLocalStorage<Record<string, UserResponse>>('ce2-responses', {});
  const [customControls, setCustomControls] = useLocalStorage<CustomControl[]>('ce2-custom', []);
  const [darkMode, setDarkMode] = useLocalStorage('ce2-dark', true);
  const [syncNotifications, setSyncNotifications] = useState<SyncNotification[]>([]);

  const responses = useMemo(() => new Map(Object.entries(responsesObj)), [responsesObj]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const answerControl = useCallback((controlId: string, answer: 'yes' | 'no' | 'partial' | 'na') => {
    setResponsesObj(prev => ({
      ...prev,
      [controlId]: {
        controlId,
        answer,
        notes: prev[controlId]?.notes || '',
        evidenceUrls: [],
        evidenceNotes: '',
        answeredAt: new Date().toISOString(),
      },
    }));
  }, [setResponsesObj]);

  const triggerSync = useCallback((control: MasterControl) => {
    const notifications: SyncNotification[] = control.frameworkMappings.map(m => ({
      id: `${control.id}-${m.frameworkId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      controlId: control.id,
      controlTitle: control.title,
      framework: m,
      timestamp: Date.now(),
    }));
    setSyncNotifications(prev => [...notifications, ...prev].slice(0, 50));
  }, []);

  const updateNotes = useCallback((controlId: string, notes: string) => {
    setResponsesObj(prev => ({ ...prev, [controlId]: { ...prev[controlId], notes } }));
  }, [setResponsesObj]);

  const addCustomControl = useCallback((control: CustomControl) => {
    setCustomControls(prev => [...prev, control]);
  }, [setCustomControls]);

  const deleteCustomControl = useCallback((id: string) => {
    setCustomControls(prev => prev.filter(c => c.id !== id));
  }, [setCustomControls]);

  const toggleDarkMode = useCallback(() => setDarkMode(prev => !prev), [setDarkMode]);

  return (
    <AppContext.Provider value={{
      state: { responses, customControls, syncNotifications, darkMode },
      answerControl,
      triggerSync,
      updateNotes,
      addCustomControl,
      deleteCustomControl,
      toggleDarkMode,
    }}>
      {children}
    </AppContext.Provider>
  );
};

// ============================================================================
// UI PRIMITIVES
// ============================================================================

// Glassmorphism Card
const Glass: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}> = ({ children, className = '', onClick, hover }) => (
  <motion.div
    whileHover={hover ? { scale: 1.01, y: -2 } : undefined}
    whileTap={hover ? { scale: 0.99 } : undefined}
    onClick={onClick}
    className={`
      relative rounded-2xl overflow-hidden
      bg-white/80 dark:bg-slate-800/80
      backdrop-blur-md
      border border-slate-200/50 dark:border-white/10
      shadow-lg shadow-slate-200/50 dark:shadow-black/20
      ${hover ? 'cursor-pointer' : ''}
      ${className}
    `}
  >
    {children}
  </motion.div>
);

// SVG Circular Progress Gauge
const CircularGauge: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  count: string;
}> = ({ percentage, size = 120, strokeWidth = 8, color, label, count }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Glow */}
        <div
          className="absolute inset-4 rounded-full blur-xl opacity-30"
          style={{ backgroundColor: color }}
        />
        
        <svg className="relative -rotate-90" width={size} height={size}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200 dark:text-white/10"
          />
          {/* Progress */}
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
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {percentage}%
          </span>
        </div>
      </div>
      
      <div className="mt-2 text-center">
        <div className="font-semibold text-slate-900 dark:text-white">{label}</div>
        <div className="text-xs text-slate-500 dark:text-white/50">{count}</div>
      </div>
    </div>
  );
};

// Domain Icon Mapping
const DomainIcon: React.FC<{ domainId: string; className?: string }> = ({ domainId, className = 'w-4 h-4' }) => {
  const icons: Record<string, React.ReactNode> = {
    access_control: <Lock className={className} />,
    asset_management: <Database className={className} />,
    audit_logging: <FileText className={className} />,
    business_continuity: <RefreshCw className={className} />,
    change_management: <Settings className={className} />,
    cryptography: <Shield className={className} />,
    data_privacy: <Eye className={className} />,
    hr_security: <Users className={className} />,
    incident_response: <AlertTriangle className={className} />,
    network_security: <Server className={className} />,
    physical_security: <Building2 className={className} />,
    risk_management: <Target className={className} />,
  };
  return <>{icons[domainId] || <Shield className={className} />}</>;
};

// ============================================================================
// MAPPING SIDEBAR (The Dynamic Feed)
// ============================================================================

const MappingSidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { state } = useApp();
  const { syncNotifications } = state;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">Sync Feed</div>
                  <div className="text-xs text-slate-500 dark:text-white/50">Real-time mapping</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto p-4">
              {syncNotifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                    <Activity className="w-7 h-7 text-slate-400 dark:text-white/30" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-white/50">
                    Answer "Yes" to controls to see framework requirements sync in real-time
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {syncNotifications.map((n, i) => {
                    const fw = FRAMEWORKS.find(f => f.id === n.framework.frameworkId);
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: 40, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="relative"
                      >
                        {/* Flash effect */}
                        <motion.div
                          initial={{ opacity: 0.5 }}
                          animate={{ opacity: 0 }}
                          transition={{ duration: 1 }}
                          className="absolute inset-0 rounded-xl bg-emerald-500/30"
                        />
                        
                        <div
                          className="relative p-3 rounded-xl border"
                          style={{
                            backgroundColor: `${fw?.color}08`,
                            borderColor: `${fw?.color}30`,
                          }}
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${fw?.color}20` }}
                            >
                              <CheckCircle2 className="w-4 h-4" style={{ color: fw?.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: fw?.color }}>
                                Requirement Met
                              </div>
                              <div className="text-sm font-bold text-slate-900 dark:text-white">
                                {n.framework.frameworkId} {n.framework.clauseId}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-white/50 truncate">
                                {n.framework.clauseTitle}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
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
// CONTROL CARD
// ============================================================================

const ControlCard: React.FC<{
  control: MasterControl;
  response?: UserResponse;
}> = ({ control, response }) => {
  const { answerControl, triggerSync } = useApp();
  const [showInfo, setShowInfo] = useState(false);
  const [glowing, setGlowing] = useState(false);

  const handleAnswer = (answer: 'yes' | 'no' | 'partial' | 'na') => {
    answerControl(control.id, answer);
    if (answer === 'yes') {
      setGlowing(true);
      triggerSync(control);
      setTimeout(() => setGlowing(false), 800);
    }
  };

  const buttons: Array<{ value: 'yes' | 'no' | 'partial' | 'na'; label: string; color: string }> = [
    { value: 'yes', label: 'Yes', color: 'emerald' },
    { value: 'no', label: 'No', color: 'red' },
    { value: 'partial', label: 'Partial', color: 'amber' },
    { value: 'na', label: 'N/A', color: 'slate' },
  ];

  const effortImpact = {
    critical: { effort: 'High', impact: 'Critical', color: 'red' },
    high: { effort: 'Medium', impact: 'High', color: 'orange' },
    medium: { effort: 'Low', impact: 'Medium', color: 'blue' },
    low: { effort: 'Low', impact: 'Low', color: 'slate' },
  }[control.riskLevel];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-xl border overflow-hidden transition-all duration-300
        ${glowing 
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-white/10'
        }
      `}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70 rounded">
                {control.id}
              </span>
              {/* Effort/Impact Badges */}
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${effortImpact.color}-100 dark:bg-${effortImpact.color}-500/20 text-${effortImpact.color}-600 dark:text-${effortImpact.color}-400`}>
                {effortImpact.effort} Effort
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${effortImpact.color}-100 dark:bg-${effortImpact.color}-500/20 text-${effortImpact.color}-600 dark:text-${effortImpact.color}-400`}>
                {effortImpact.impact} Impact
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-tight">
              {control.title}
            </h3>
          </div>
          
          {/* Info Toggle */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
              showInfo
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-blue-500'
            }`}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Question */}
        <p className="text-sm text-slate-600 dark:text-white/70 mb-4">{control.question}</p>

        {/* Framework Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {control.frameworkMappings.map(m => {
            const fw = FRAMEWORKS.find(f => f.id === m.frameworkId);
            return (
              <span
                key={`${m.frameworkId}-${m.clauseId}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border"
                style={{
                  backgroundColor: `${fw?.color}10`,
                  borderColor: `${fw?.color}30`,
                  color: fw?.color,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fw?.color }} />
                {m.frameworkId} {m.clauseId}
              </span>
            );
          })}
        </div>

        {/* Answer Buttons */}
        <div className="flex gap-2">
          {buttons.map(btn => {
            const selected = response?.answer === btn.value;
            const colors: Record<string, { selected: string; default: string }> = {
              emerald: {
                selected: 'bg-emerald-500 text-white border-emerald-500',
                default: 'border-emerald-300 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
              },
              red: {
                selected: 'bg-red-500 text-white border-red-500',
                default: 'border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10',
              },
              amber: {
                selected: 'bg-amber-500 text-white border-amber-500',
                default: 'border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10',
              },
              slate: {
                selected: 'bg-slate-500 text-white border-slate-500',
                default: 'border-slate-300 dark:border-slate-500/40 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-500/10',
              },
            };
            return (
              <motion.button
                key={btn.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswer(btn.value)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                  selected ? colors[btn.color].selected : colors[btn.color].default
                }`}
              >
                {btn.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Why This Matters (Expandable) */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200 dark:border-white/10"
          >
            <div className="p-5 bg-blue-50 dark:bg-blue-900/20 space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">
                  Why This Matters
                </h4>
                <p className="text-sm text-blue-600 dark:text-blue-200/80">{control.guidance}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">
                  Evidence Examples
                </h4>
                <ul className="space-y-1">
                  {control.evidenceExamples.map((ex, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-200/80">
                      <Check className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      {ex}
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
        {response?.answer === 'no' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-red-200 dark:border-red-500/30"
          >
            <div className="p-4 bg-red-50 dark:bg-red-900/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-1">Gap Detected</div>
                <p className="text-sm text-red-600 dark:text-red-300">{control.remediationTip}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// TAB 1: DASHBOARD (Command Center)
// ============================================================================

const DashboardTab: React.FC<{ onNavigate: (tab: TabId, domain?: ComplianceDomainMeta) => void }> = ({ onNavigate }) => {
  const { state } = useApp();
  const { responses } = state;

  // Calculate framework progress
  const frameworks = FRAMEWORKS.map(fw => ({
    ...fw,
    ...calculateFrameworkProgress(fw.id, responses),
  }));

  // Stats
  const total = MASTER_CONTROLS.length;
  const answered = Array.from(responses.values()).filter(r => r.answer).length;
  const compliant = Array.from(responses.values()).filter(r => r.answer === 'yes' || r.answer === 'na').length;
  const gaps = Array.from(responses.values()).filter(r => r.answer === 'no').length;
  const remaining = total - answered;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="text-center mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-slate-900 dark:text-white mb-2"
        >
          Compliance Command Center
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-slate-500 dark:text-white/60"
        >
          {total} master controls mapped across 4 frameworks
        </motion.p>
      </div>

      {/* Framework Gauges - Bento Style */}
      <Glass className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Framework Compliance</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {frameworks.map((fw, i) => (
            <motion.div
              key={fw.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <CircularGauge
                percentage={fw.percentage}
                color={fw.color}
                label={fw.name}
                count={`${fw.completed}/${fw.total}`}
              />
            </motion.div>
          ))}
        </div>
      </Glass>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Assessed', value: answered, color: 'blue', pct: `${Math.round((answered/total)*100)}%` },
          { label: 'Compliant', value: compliant, color: 'emerald', pct: null },
          { label: 'Gaps', value: gaps, color: 'red', pct: null },
          { label: 'Remaining', value: remaining, color: 'amber', pct: null },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
          >
            <Glass className="p-4">
              <div className={`text-2xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}>
                {stat.pct || stat.value}
              </div>
              <div className="text-sm text-slate-500 dark:text-white/60">{stat.label}</div>
            </Glass>
          </motion.div>
        ))}
      </div>

      {/* Domain Progress Grid */}
      <Glass className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Domain Progress</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {COMPLIANCE_DOMAINS.map((domain, i) => {
            const progress = getDomainProgress(domain.id, responses);
            const complete = progress.percentage === 100 && progress.total > 0;
            
            return (
              <motion.button
                key={domain.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.02 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => onNavigate('assessment', domain)}
                className={`p-4 rounded-xl text-left transition-colors ${
                  complete
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${domain.color}20` }}
                  >
                    <div style={{ color: domain.color }}>
                      <DomainIcon domainId={domain.id} />
                    </div>
                  </div>
                  {complete && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="font-medium text-sm text-slate-900 dark:text-white mb-2 truncate">
                  {domain.title}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.percentage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: complete ? '#10B981' : domain.color }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-white/50">
                    {progress.completed}/{progress.total}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </Glass>
    </div>
  );
};

// ============================================================================
// TAB 2: ASSESSMENT (Wizard)
// ============================================================================

const AssessmentTab: React.FC<{ initialDomain?: ComplianceDomainMeta }> = ({ initialDomain }) => {
  const { state } = useApp();
  const { responses } = state;
  const [activeDomain, setActiveDomain] = useState<ComplianceDomainMeta>(initialDomain || COMPLIANCE_DOMAINS[0]);
  const [search, setSearch] = useState('');

  // Get controls
  const controls = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return MASTER_CONTROLS.filter(c =>
        c.id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.keywords.some(k => k.toLowerCase().includes(q))
      );
    }
    return getControlsByDomain(activeDomain.id);
  }, [activeDomain.id, search]);

  return (
    <div className="flex gap-6">
      {/* Domain Sidebar */}
      <div className="w-64 flex-shrink-0 hidden lg:block">
        <Glass className="p-3 sticky top-4">
          <div className="text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wide px-3 mb-3">
            12 Compliance Domains
          </div>
          <div className="space-y-1">
            {COMPLIANCE_DOMAINS.map(domain => {
              const progress = getDomainProgress(domain.id, responses);
              const isActive = activeDomain.id === domain.id && !search;
              const complete = progress.percentage === 100 && progress.total > 0;

              return (
                <button
                  key={domain.id}
                  onClick={() => { setActiveDomain(domain); setSearch(''); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-500/30'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${domain.color}15` }}
                    >
                      <div style={{ color: domain.color }}>
                        <DomainIcon domainId={domain.id} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${
                        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-white/80'
                      }`}>
                        {domain.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex-1 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progress.percentage}%`,
                              backgroundColor: complete ? '#10B981' : domain.color,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">{progress.percentage}%</span>
                      </div>
                    </div>
                    {/* Checkmark only at 100% */}
                    {complete && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Glass>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search controls by ID, name, or keyword..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Domain Header */}
        {!search && (
          <Glass className="p-5">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${activeDomain.color}15` }}
              >
                <div style={{ color: activeDomain.color }} className="scale-125">
                  <DomainIcon domainId={activeDomain.id} />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{activeDomain.title}</h2>
                <p className="text-sm text-slate-500 dark:text-white/60">{activeDomain.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ color: activeDomain.color }}>
                  {getDomainProgress(activeDomain.id, responses).percentage}%
                </div>
                <div className="text-xs text-slate-500 dark:text-white/50">Complete</div>
              </div>
            </div>
          </Glass>
        )}

        {/* Search Results Header */}
        {search && (
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30">
            <p className="text-blue-700 dark:text-blue-300">
              Found <strong>{controls.length}</strong> controls matching "{search}"
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="space-y-3">
          {controls.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-slate-300 dark:text-white/20 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-white/50">No controls found</p>
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
// TAB 3: EVIDENCE LOCKER
// ============================================================================

const EvidenceTab: React.FC = () => {
  const { state, updateNotes } = useApp();
  const { responses } = state;
  const [editId, setEditId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const passed = MASTER_CONTROLS.filter(c => responses.get(c.id)?.answer === 'yes');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Evidence Locker</h1>
          <p className="text-slate-500 dark:text-white/60">Attach notes and evidence for audit preparation</p>
        </div>
        <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl font-medium">
          {passed.length} controls ready
        </div>
      </div>

      {passed.length === 0 ? (
        <Glass className="p-16 text-center">
          <FolderOpen className="w-16 h-16 text-slate-300 dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Evidence Yet</h3>
          <p className="text-slate-500 dark:text-white/60">Complete controls with "Yes" to start collecting evidence</p>
        </Glass>
      ) : (
        <Glass className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase">Control</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase">Notes</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {passed.map(control => {
                const r = responses.get(control.id);
                const editing = editId === control.id;
                return (
                  <tr key={control.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-mono bg-slate-100 dark:bg-white/10 rounded">{control.id}</span>
                        <span className="text-sm text-slate-900 dark:text-white font-medium truncate max-w-[200px]">{control.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                        <Check className="w-3 h-3" /> Compliant
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {editing ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editNotes}
                            onChange={e => setEditNotes(e.target.value)}
                            placeholder="Add notes..."
                            className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={() => { updateNotes(control.id, editNotes); setEditId(null); }}
                            className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg"
                          >
                            Save
                          </button>
                          <button onClick={() => setEditId(null)} className="px-3 py-1.5 text-slate-500 text-sm">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-600 dark:text-white/70">
                          {r?.notes || <span className="text-slate-400 dark:text-white/30 italic">No notes</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {!editing && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditId(control.id); setEditNotes(r?.notes || ''); }}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            title="Add notes"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
                            title="Upload file (placeholder)"
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
        </Glass>
      )}
    </div>
  );
};

// ============================================================================
// TAB 4: COMPANY CONTROLS
// ============================================================================

const CompanyTab: React.FC = () => {
  const { state, addCustomControl, deleteCustomControl } = useApp();
  const { customControls } = state;
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'access_control' as ComplianceDomain,
    mappings: [] as { fwId: FrameworkId; clause: string }[],
  });
  const [newMap, setNewMap] = useState({ fwId: 'SOC2' as FrameworkId, clause: '' });

  const addMapping = () => {
    if (newMap.clause.trim()) {
      setForm(p => ({ ...p, mappings: [...p.mappings, { fwId: newMap.fwId, clause: newMap.clause.trim() }] }));
      setNewMap({ fwId: 'SOC2', clause: '' });
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name && form.description) {
      addCustomControl({
        id: `CUSTOM-${Date.now()}`,
        title: form.name,
        description: form.description,
        question: `Is ${form.name} implemented?`,
        category: form.category,
        frameworkMappings: form.mappings.map(m => ({
          frameworkId: m.fwId,
          clauseId: m.clause,
          clauseTitle: 'Custom mapping',
        })),
        effort: 'medium',
        impact: 'medium',
        createdAt: new Date().toISOString(),
        createdBy: 'User',
      });
      setForm({ name: '', description: '', category: 'access_control', mappings: [] });
      setShowModal(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Company Controls</h1>
          <p className="text-slate-500 dark:text-white/60">Create custom internal policies with framework mapping</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-violet-500/25"
        >
          <Plus className="w-4 h-4" />
          Create New Control
        </motion.button>
      </div>

      {customControls.length === 0 ? (
        <Glass className="p-16 text-center">
          <Building2 className="w-16 h-16 text-slate-300 dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Custom Controls</h3>
          <p className="text-slate-500 dark:text-white/60 mb-6">Add controls specific to your organization</p>
        </Glass>
      ) : (
        <div className="grid gap-4">
          {customControls.map(c => (
            <Glass key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-mono bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded">{c.id}</span>
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-violet-500/20 text-violet-500 rounded">CUSTOM</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{c.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-white/70 mb-3">{c.description}</p>
                  {c.frameworkMappings.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.frameworkMappings.map((m, i) => {
                        const fw = FRAMEWORKS.find(f => f.id === m.frameworkId);
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border"
                            style={{ borderColor: `${fw?.color}40`, color: fw?.color, backgroundColor: `${fw?.color}10` }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fw?.color }} />
                            {m.frameworkId} {m.clauseId}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteCustomControl(c.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Glass>
          ))}
        </div>
      )}

      {/* Create Modal */}
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
              className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 dark:border-white/10">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create New Control</h2>
                <p className="text-sm text-slate-500 dark:text-white/60">Define a custom control and map it to frameworks</p>
              </div>
              <form onSubmit={submit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-1.5">Control Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="e.g., Weekly Security Standups"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-1.5">Description *</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                    rows={2}
                    placeholder="Describe what this control does..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value as ComplianceDomain }))}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {COMPLIANCE_DOMAINS.map(d => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                  </select>
                </div>
                
                {/* Mapping Tool */}
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-3">
                    Framework Mapping Tool
                  </label>
                  <div className="flex gap-2 mb-3">
                    <select
                      value={newMap.fwId}
                      onChange={e => setNewMap(p => ({ ...p, fwId: e.target.value as FrameworkId }))}
                      className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-lg text-sm"
                    >
                      {FRAMEWORKS.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newMap.clause}
                      onChange={e => setNewMap(p => ({ ...p, clause: e.target.value }))}
                      placeholder="Clause ID (e.g., CC6.1)"
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-lg text-sm"
                    />
                    <button
                      type="button"
                      onClick={addMapping}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                    >
                      Add
                    </button>
                  </div>
                  {form.mappings.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.mappings.map((m, i) => {
                        const fw = FRAMEWORKS.find(f => f.id === m.fwId);
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-white/10 text-sm"
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: fw?.color }} />
                            {m.fwId} {m.clause}
                            <button
                              type="button"
                              onClick={() => setForm(p => ({ ...p, mappings: p.mappings.filter((_, idx) => idx !== i) }))}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-slate-600 dark:text-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium"
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
// MAIN APP
// ============================================================================

const AppContent: React.FC = () => {
  const { state, toggleDarkMode } = useApp();
  const { syncNotifications, darkMode } = state;
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<ComplianceDomainMeta | undefined>();

  const handleNavigate = (tab: TabId, domain?: ComplianceDomainMeta) => {
    setActiveTab(tab);
    if (domain) setSelectedDomain(domain);
  };

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'assessment', label: 'Assessment', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'evidence', label: 'Evidence', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'company', label: 'Company', icon: <Building2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors duration-300">
      {/* Navigation */}
      <nav className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-slate-900 dark:text-white">Compliance Engine</span>
                <span className="text-xs text-slate-500 dark:text-white/50 ml-2">{MASTER_CONTROLS.length} Controls</span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 rounded-xl p-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Sync Toggle */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className={`relative p-2.5 rounded-xl transition-all ${
                  showSidebar
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <Zap className="w-5 h-5" />
                {syncNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {Math.min(syncNotifications.length, 99)}
                  </span>
                )}
              </button>

              {/* Dark Mode */}
              <button
                onClick={toggleDarkMode}
                className="p-2.5 rounded-xl text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <DashboardTab onNavigate={handleNavigate} />
            </motion.div>
          )}
          {activeTab === 'assessment' && (
            <motion.div
              key="assessment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <AssessmentTab initialDomain={selectedDomain} />
            </motion.div>
          )}
          {activeTab === 'evidence' && (
            <motion.div
              key="evidence"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <EvidenceTab />
            </motion.div>
          )}
          {activeTab === 'company' && (
            <motion.div
              key="company"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <CompanyTab />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mapping Sidebar */}
      <MappingSidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />
    </div>
  );
};

// Root Component
const App: React.FC = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
