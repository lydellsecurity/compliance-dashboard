/**
 * Modular Compliance Engine 2.0 - Final Version
 * 
 * Enhancements:
 * 1. Dashboard: "Action Required" bento + "Download Executive Summary" PDF
 * 2. Assessment: Fractional progress (4/12), Remediation text area for "No" answers
 * 3. Evidence Locker: Searchable table, Status dropdown (Draft/Review/Final), auto-save notes
 * 4. Company Controls: Custom controls appear in "Company Specific" domain, multi-select framework mapping
 */

import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, useRef } from 'react';
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
  Download,
  AlertCircle,
  ChevronDown,
  Save,
  Briefcase,
} from 'lucide-react';

import {
  MASTER_CONTROLS,
  COMPLIANCE_DOMAINS,
  FRAMEWORKS,
  getControlsByDomain,
  calculateFrameworkProgress,
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
type EvidenceStatus = 'draft' | 'review' | 'final';

interface SyncNotification {
  id: string;
  controlId: string;
  controlTitle: string;
  framework: FrameworkMapping;
  timestamp: number;
}

interface EvidenceEntry {
  controlId: string;
  notes: string;
  status: EvidenceStatus;
  remediationPlan: string;
  lastUpdated: string;
}

interface AppState {
  responses: Map<string, UserResponse>;
  customControls: CustomControl[];
  syncNotifications: SyncNotification[];
  evidence: Map<string, EvidenceEntry>;
  darkMode: boolean;
}

interface AppContextType {
  state: AppState;
  answerControl: (controlId: string, answer: 'yes' | 'no' | 'partial' | 'na') => void;
  triggerSync: (control: MasterControl) => void;
  updateEvidence: (controlId: string, updates: Partial<EvidenceEntry>) => void;
  addCustomControl: (control: CustomControl) => void;
  deleteCustomControl: (id: string) => void;
  toggleDarkMode: () => void;
  getAllControls: () => MasterControl[];
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
// COMPANY SPECIFIC DOMAIN
// ============================================================================

const COMPANY_DOMAIN: ComplianceDomainMeta = {
  id: 'company_specific' as unknown as ComplianceDomain,
  title: 'Company Specific',
  description: 'Custom controls created by your organization',
  color: '#8B5CF6',
  icon: 'briefcase',
};

// ============================================================================
// APP PROVIDER
// ============================================================================

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [responsesObj, setResponsesObj] = useLocalStorage<Record<string, UserResponse>>('ce3-responses', {});
  const [customControls, setCustomControls] = useLocalStorage<CustomControl[]>('ce3-custom', []);
  const [evidenceObj, setEvidenceObj] = useLocalStorage<Record<string, EvidenceEntry>>('ce3-evidence', {});
  const [darkMode, setDarkMode] = useLocalStorage('ce3-dark', true);
  const [syncNotifications, setSyncNotifications] = useState<SyncNotification[]>([]);

  const responses = useMemo(() => new Map(Object.entries(responsesObj)), [responsesObj]);
  const evidence = useMemo(() => new Map(Object.entries(evidenceObj)), [evidenceObj]);

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
    
    // Auto-create evidence entry for "yes" answers
    if (answer === 'yes') {
      setEvidenceObj(prev => ({
        ...prev,
        [controlId]: prev[controlId] || {
          controlId,
          notes: '',
          status: 'draft' as EvidenceStatus,
          remediationPlan: '',
          lastUpdated: new Date().toISOString(),
        },
      }));
    }
  }, [setResponsesObj, setEvidenceObj]);

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

  const updateEvidence = useCallback((controlId: string, updates: Partial<EvidenceEntry>) => {
    setEvidenceObj(prev => ({
      ...prev,
      [controlId]: {
        ...prev[controlId],
        ...updates,
        lastUpdated: new Date().toISOString(),
      },
    }));
  }, [setEvidenceObj]);

  const addCustomControl = useCallback((control: CustomControl) => {
    // Ensure custom controls have company_specific as domain
    const customWithDomain = {
      ...control,
      category: 'company_specific' as unknown as ComplianceDomain,
    };
    setCustomControls(prev => [...prev, customWithDomain]);
  }, [setCustomControls]);

  const deleteCustomControl = useCallback((id: string) => {
    setCustomControls(prev => prev.filter(c => c.id !== id));
  }, [setCustomControls]);

  const toggleDarkMode = useCallback(() => setDarkMode(prev => !prev), [setDarkMode]);

  // Get all controls including custom ones
  const getAllControls = useCallback((): MasterControl[] => {
    const customAsMaster: MasterControl[] = customControls.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      question: c.question,
      domain: 'company_specific' as unknown as ComplianceDomain,
      riskLevel: 'medium',
      frameworkMappings: c.frameworkMappings,
      keywords: [c.title.toLowerCase()],
      guidance: 'Custom control created by your organization.',
      evidenceExamples: ['Internal documentation', 'Policy documents'],
      remediationTip: 'Implement the control according to your organization\'s standards.',
    }));
    return [...MASTER_CONTROLS, ...customAsMaster];
  }, [customControls]);

  return (
    <AppContext.Provider value={{
      state: { responses, customControls, syncNotifications, evidence, darkMode },
      answerControl,
      triggerSync,
      updateEvidence,
      addCustomControl,
      deleteCustomControl,
      toggleDarkMode,
      getAllControls,
    }}>
      {children}
    </AppContext.Provider>
  );
};

// ============================================================================
// UI PRIMITIVES
// ============================================================================

const Glass: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`
      relative rounded-2xl overflow-hidden
      bg-white/80 dark:bg-slate-800/80
      backdrop-blur-md
      border border-slate-200/50 dark:border-white/10
      shadow-lg shadow-slate-200/50 dark:shadow-black/20
      ${onClick ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''}
      ${className}
    `}
  >
    {children}
  </div>
);

// Circular Progress Gauge
const CircularGauge: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  count: string;
}> = ({ percentage, size = 110, strokeWidth = 8, color, label, count }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <div className="absolute inset-3 rounded-full blur-xl opacity-25" style={{ backgroundColor: color }} />
        <svg className="relative -rotate-90" width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-200 dark:text-white/10" />
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-900 dark:text-white">{percentage}%</span>
        </div>
      </div>
      <div className="mt-1.5 text-center">
        <div className="font-semibold text-slate-900 dark:text-white text-sm">{label}</div>
        <div className="text-xs text-slate-500 dark:text-white/50">{count}</div>
      </div>
    </div>
  );
};

// Domain Icon
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
    company_specific: <Briefcase className={className} />,
  };
  return <>{icons[domainId] || <Shield className={className} />}</>;
};

// ============================================================================
// PDF EXPORT FUNCTION
// ============================================================================

const generateExecutiveSummaryPDF = (
  frameworks: Array<{ name: string; percentage: number; completed: number; total: number; color: string }>,
  stats: { total: number; assessed: number; compliant: number; gaps: number; remaining: number },
  gaps: MasterControl[]
) => {
  // Create a printable HTML document
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download the PDF');
    return;
  }

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Compliance Executive Summary - ${today}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
    .header h1 { font-size: 28px; color: #0f172a; margin-bottom: 8px; }
    .header p { color: #64748b; }
    .section { margin-bottom: 32px; }
    .section h2 { font-size: 18px; color: #334155; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .frameworks { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .framework-card { padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0; }
    .framework-card .percentage { font-size: 32px; font-weight: bold; }
    .framework-card .name { font-size: 14px; color: #64748b; margin-top: 4px; }
    .framework-card .count { font-size: 12px; color: #94a3b8; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .stat-card { padding: 16px; border-radius: 8px; background: #f8fafc; }
    .stat-card .value { font-size: 24px; font-weight: bold; }
    .stat-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; }
    .gaps-table { width: 100%; border-collapse: collapse; }
    .gaps-table th, .gaps-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .gaps-table th { background: #f8fafc; font-size: 12px; text-transform: uppercase; color: #64748b; }
    .gaps-table .severity { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .severity-critical { background: #fef2f2; color: #dc2626; }
    .severity-high { background: #fff7ed; color: #ea580c; }
    .severity-medium { background: #fefce8; color: #ca8a04; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Compliance Executive Summary</h1>
    <p>Generated on ${today}</p>
  </div>

  <div class="section">
    <h2>Framework Compliance</h2>
    <div class="frameworks">
      ${frameworks.map(fw => `
        <div class="framework-card">
          <div class="percentage" style="color: ${fw.color}">${fw.percentage}%</div>
          <div class="name">${fw.name}</div>
          <div class="count">${fw.completed}/${fw.total} controls</div>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="section">
    <h2>Assessment Summary</h2>
    <div class="stats">
      <div class="stat-card">
        <div class="value" style="color: #3b82f6">${Math.round((stats.assessed / stats.total) * 100)}%</div>
        <div class="label">Assessed</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color: #10b981">${stats.compliant}</div>
        <div class="label">Compliant</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color: #ef4444">${stats.gaps}</div>
        <div class="label">Gaps</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color: #f59e0b">${stats.remaining}</div>
        <div class="label">Remaining</div>
      </div>
    </div>
  </div>

  ${gaps.length > 0 ? `
  <div class="section">
    <h2>Action Required - Critical Gaps</h2>
    <table class="gaps-table">
      <thead>
        <tr>
          <th>Control ID</th>
          <th>Title</th>
          <th>Severity</th>
          <th>Domain</th>
        </tr>
      </thead>
      <tbody>
        ${gaps.map(gap => `
          <tr>
            <td><strong>${gap.id}</strong></td>
            <td>${gap.title}</td>
            <td><span class="severity severity-${gap.riskLevel}">${gap.riskLevel.toUpperCase()}</span></td>
            <td>${COMPLIANCE_DOMAINS.find(d => d.id === gap.domain)?.title || gap.domain}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p>Modular Compliance Engine • Confidential</p>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

// ============================================================================
// MAPPING SIDEBAR
// ============================================================================

const MappingSidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { state } = useApp();
  const { syncNotifications } = state;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/30 z-40 lg:hidden" />
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 z-50 flex flex-col shadow-2xl"
          >
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
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {syncNotifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                  <Activity className="w-12 h-12 text-slate-300 dark:text-white/20 mb-4" />
                  <p className="text-sm text-slate-500 dark:text-white/50">Answer "Yes" to see framework sync</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {syncNotifications.map((n, i) => {
                    const fw = FRAMEWORKS.find(f => f.id === n.framework.frameworkId);
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="p-3 rounded-xl border"
                        style={{ backgroundColor: `${fw?.color}08`, borderColor: `${fw?.color}30` }}
                      >
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: fw?.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-semibold uppercase" style={{ color: fw?.color }}>Requirement Met</div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">{n.framework.frameworkId} {n.framework.clauseId}</div>
                            <div className="text-xs text-slate-500 dark:text-white/50 truncate">{n.framework.clauseTitle}</div>
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
// CONTROL CARD WITH REMEDIATION
// ============================================================================

const ControlCard: React.FC<{
  control: MasterControl;
  response?: UserResponse;
}> = ({ control, response }) => {
  const { answerControl, triggerSync, state, updateEvidence } = useApp();
  const { evidence } = state;
  const [showInfo, setShowInfo] = useState(false);
  const [glowing, setGlowing] = useState(false);
  const [remediation, setRemediation] = useState(evidence.get(control.id)?.remediationPlan || '');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-save remediation plan
  useEffect(() => {
    if (response?.answer === 'no' && remediation) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        updateEvidence(control.id, { remediationPlan: remediation });
      }, 500);
    }
    return () => clearTimeout(saveTimeoutRef.current);
  }, [remediation, control.id, response?.answer, updateEvidence]);

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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border overflow-hidden transition-all duration-300 ${
        glowing
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-white/10'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70 rounded">
                {control.id}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                control.riskLevel === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                control.riskLevel === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                control.riskLevel === 'medium' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                {control.riskLevel.charAt(0).toUpperCase() + control.riskLevel.slice(1)} Impact
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{control.title}</h3>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
              showInfo ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-blue-500'
            }`}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-white/70 mb-4">{control.question}</p>

        <div className="flex flex-wrap gap-1 mb-4">
          {control.frameworkMappings.map(m => {
            const fw = FRAMEWORKS.find(f => f.id === m.frameworkId);
            return (
              <span
                key={`${m.frameworkId}-${m.clauseId}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border"
                style={{ backgroundColor: `${fw?.color}10`, borderColor: `${fw?.color}30`, color: fw?.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fw?.color }} />
                {m.frameworkId} {m.clauseId}
              </span>
            );
          })}
        </div>

        <div className="flex gap-2">
          {buttons.map(btn => {
            const selected = response?.answer === btn.value;
            const colorClasses: Record<string, { selected: string; default: string }> = {
              emerald: { selected: 'bg-emerald-500 text-white border-emerald-500', default: 'border-emerald-300 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10' },
              red: { selected: 'bg-red-500 text-white border-red-500', default: 'border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10' },
              amber: { selected: 'bg-amber-500 text-white border-amber-500', default: 'border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10' },
              slate: { selected: 'bg-slate-500 text-white border-slate-500', default: 'border-slate-300 dark:border-slate-500/40 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-500/10' },
            };
            return (
              <button
                key={btn.value}
                onClick={() => handleAnswer(btn.value)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                  selected ? colorClasses[btn.color].selected : colorClasses[btn.color].default
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Why This Matters */}
      <AnimatePresence>
        {showInfo && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-200 dark:border-white/10">
            <div className="p-5 bg-blue-50 dark:bg-blue-900/20 space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase mb-1">Why This Matters</h4>
                <p className="text-sm text-blue-600 dark:text-blue-200/80">{control.guidance}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase mb-1">Evidence Examples</h4>
                <ul className="space-y-1">
                  {control.evidenceExamples.map((ex, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-200/80">
                      <Check className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" /> {ex}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gap + Remediation Plan */}
      <AnimatePresence>
        {response?.answer === 'no' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-red-200 dark:border-red-500/30">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-1">Gap Detected</div>
                  <p className="text-sm text-red-600 dark:text-red-300">{control.remediationTip}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-2">
                  Remediation Plan
                </label>
                <textarea
                  value={remediation}
                  onChange={e => setRemediation(e.target.value)}
                  placeholder="Document your plan to address this gap..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-red-200 dark:border-red-500/30 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
                <div className="flex items-center gap-1 mt-1 text-xs text-red-400">
                  <Save className="w-3 h-3" /> Auto-saves to local storage
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// DASHBOARD TAB
// ============================================================================

const DashboardTab: React.FC<{ onNavigate: (tab: TabId, domain?: ComplianceDomainMeta) => void }> = ({ onNavigate }) => {
  const { state, getAllControls } = useApp();
  const { responses, customControls } = state;

  const allControls = getAllControls();
  const frameworks = FRAMEWORKS.map(fw => ({
    ...fw,
    ...calculateFrameworkProgress(fw.id, responses),
  }));

  const total = allControls.length;
  const answered = Array.from(responses.values()).filter(r => r.answer).length;
  const compliant = Array.from(responses.values()).filter(r => r.answer === 'yes' || r.answer === 'na').length;
  const gaps = Array.from(responses.values()).filter(r => r.answer === 'no').length;
  const remaining = total - answered;

  // Action Required: Top 5 high-impact gaps
  const criticalGaps = allControls
    .filter(c => {
      const r = responses.get(c.id);
      return r?.answer === 'no' && (c.riskLevel === 'critical' || c.riskLevel === 'high');
    })
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.riskLevel] - order[b.riskLevel];
    })
    .slice(0, 5);

  const handleDownloadPDF = () => {
    generateExecutiveSummaryPDF(frameworks, { total, assessed: answered, compliant, gaps, remaining }, criticalGaps);
  };

  // All domains including company specific if there are custom controls
  const allDomains = customControls.length > 0 
    ? [...COMPLIANCE_DOMAINS, COMPANY_DOMAIN]
    : COMPLIANCE_DOMAINS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Compliance Command Center</h1>
          <p className="text-slate-500 dark:text-white/60">{total} controls mapped across 4 frameworks</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
        >
          <Download className="w-4 h-4" />
          Download Executive Summary
        </button>
      </div>

      {/* Framework Gauges */}
      <Glass className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Framework Compliance</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {frameworks.map((fw, i) => (
            <motion.div key={fw.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
              <CircularGauge percentage={fw.percentage} color={fw.color} label={fw.name} count={`${fw.completed}/${fw.total}`} />
            </motion.div>
          ))}
        </div>
      </Glass>

      {/* Stats + Action Required Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats */}
        <Glass className="p-5">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-white/50 uppercase mb-4">Assessment Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{Math.round((answered/total)*100)}%</div>
              <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Assessed</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{compliant}</div>
              <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Compliant</div>
            </div>
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{gaps}</div>
              <div className="text-xs text-red-600/70 dark:text-red-400/70">Gaps</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{remaining}</div>
              <div className="text-xs text-amber-600/70 dark:text-amber-400/70">Remaining</div>
            </div>
          </div>
        </Glass>

        {/* Action Required Bento */}
        <Glass className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-white/50 uppercase flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Action Required
            </h3>
            <span className="text-xs text-slate-400">Top 5 High-Impact Gaps</span>
          </div>
          {criticalGaps.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400 dark:text-white/40">
              <div className="text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm">No critical gaps!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {criticalGaps.map(control => (
                <button
                  key={control.id}
                  onClick={() => {
                    const domain = allDomains.find(d => d.id === control.domain);
                    if (domain) onNavigate('assessment', domain);
                  }}
                  className="w-full p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-left hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-red-600 dark:text-red-400">{control.id}</span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                          control.riskLevel === 'critical' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                        }`}>
                          {control.riskLevel.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-white/80 truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                        {control.title}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Glass>
      </div>

      {/* Domain Progress Grid */}
      <Glass className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Domain Progress</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {allDomains.map((domain, i) => {
            const domainControls = (domain.id as string) === 'company_specific' 
              ? customControls.length 
              : getControlsByDomain(domain.id).length;
            const domainAnswered = (domain.id as string) === 'company_specific'
              ? customControls.filter(c => responses.get(c.id)?.answer).length
              : getControlsByDomain(domain.id).filter(c => responses.get(c.id)?.answer).length;
            const progress = { 
              completed: domainAnswered, 
              total: domainControls, 
              percentage: domainControls > 0 ? Math.round((domainAnswered / domainControls) * 100) : 0 
            };
            const complete = progress.percentage === 100 && progress.total > 0;

            return (
              <motion.button
                key={domain.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.02 }}
                onClick={() => onNavigate('assessment', domain)}
                className={`p-4 rounded-xl text-left transition-colors ${
                  complete
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${domain.color}20` }}>
                    <div style={{ color: domain.color }}><DomainIcon domainId={domain.id} /></div>
                  </div>
                  {complete && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="font-medium text-sm text-slate-900 dark:text-white mb-2 truncate">{domain.title}</div>
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
                  <span className="text-xs text-slate-500 dark:text-white/50 font-medium">
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
// ASSESSMENT TAB
// ============================================================================

const AssessmentTab: React.FC<{ initialDomain?: ComplianceDomainMeta }> = ({ initialDomain }) => {
  const { state, getAllControls } = useApp();
  const { responses, customControls } = state;
  
  // All domains including company specific
  const allDomains = customControls.length > 0 
    ? [...COMPLIANCE_DOMAINS, COMPANY_DOMAIN]
    : COMPLIANCE_DOMAINS;
    
  const [activeDomain, setActiveDomain] = useState<ComplianceDomainMeta>(initialDomain || allDomains[0]);
  const [search, setSearch] = useState('');

  const allControls = getAllControls();

  // Get controls for current domain or search
  const controls = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return allControls.filter(c =>
        c.id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.keywords.some(k => k.toLowerCase().includes(q))
      );
    }
    if ((activeDomain.id as string) === 'company_specific') {
      return allControls.filter(c => (c.domain as string) === 'company_specific');
    }
    return getControlsByDomain(activeDomain.id);
  }, [activeDomain.id, search, allControls]);

  return (
    <div className="flex gap-6">
      {/* Domain Sidebar with Fractional Progress */}
      <div className="w-64 flex-shrink-0 hidden lg:block">
        <Glass className="p-3 sticky top-4">
          <div className="text-xs font-semibold text-slate-500 dark:text-white/50 uppercase px-3 mb-3">
            Compliance Domains
          </div>
          <div className="space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto">
            {allDomains.map(domain => {
              const domainControls = (domain.id as string) === 'company_specific'
                ? allControls.filter(c => (c.domain as string) === 'company_specific')
                : getControlsByDomain(domain.id);
              const answered = domainControls.filter(c => responses.get(c.id)?.answer).length;
              const total = domainControls.length;
              const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;
              const isActive = activeDomain.id === domain.id && !search;
              const complete = percentage === 100 && total > 0;

              return (
                <button
                  key={domain.id}
                  onClick={() => { setActiveDomain(domain); setSearch(''); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
                    isActive ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-500/30' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${domain.color}15` }}>
                      <div style={{ color: domain.color }}><DomainIcon domainId={domain.id} /></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium truncate ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-white/80'}`}>
                          {domain.title}
                        </span>
                        {/* Fractional Progress Indicator */}
                        <span className="text-xs font-semibold text-slate-500 dark:text-white/50 ml-2">
                          {answered}/{total}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex-1 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: complete ? '#10B981' : domain.color }} />
                        </div>
                      </div>
                    </div>
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
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search controls..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {!search && (
          <Glass className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${activeDomain.color}15` }}>
                <div style={{ color: activeDomain.color }} className="scale-125"><DomainIcon domainId={activeDomain.id} /></div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{activeDomain.title}</h2>
                <p className="text-sm text-slate-500 dark:text-white/60">{activeDomain.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ color: activeDomain.color }}>
                  {controls.filter(c => responses.get(c.id)?.answer).length}/{controls.length}
                </div>
                <div className="text-xs text-slate-500 dark:text-white/50">Completed</div>
              </div>
            </div>
          </Glass>
        )}

        {search && (
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30">
            <p className="text-blue-700 dark:text-blue-300">Found <strong>{controls.length}</strong> controls matching "{search}"</p>
          </div>
        )}

        <div className="space-y-3">
          {controls.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-slate-300 dark:text-white/20 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-white/50">
                {(activeDomain.id as string) === 'company_specific' ? 'No custom controls yet. Create one in the Company tab.' : 'No controls found'}
              </p>
            </div>
          ) : (
            controls.map((control, i) => (
              <motion.div key={control.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
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
// EVIDENCE LOCKER TAB (Searchable with Status Dropdown)
// ============================================================================

const EvidenceTab: React.FC = () => {
  const { state, updateEvidence, getAllControls } = useApp();
  const { responses, evidence } = state;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EvidenceStatus | 'all'>('all');
  const saveTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const allControls = getAllControls();
  const passedControls = allControls.filter(c => responses.get(c.id)?.answer === 'yes');

  // Searchable + filterable
  const filteredControls = useMemo(() => {
    let result = passedControls;
    
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (evidence.get(c.id)?.notes || '').toLowerCase().includes(q)
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(c => (evidence.get(c.id)?.status || 'draft') === statusFilter);
    }
    
    return result;
  }, [passedControls, search, statusFilter, evidence]);

  // Auto-save notes handler
  const handleNotesChange = (controlId: string, notes: string) => {
    updateEvidence(controlId, { notes });
  };

  // Debounced save for notes
  const debouncedNotesChange = (controlId: string, notes: string) => {
    clearTimeout(saveTimeoutRef.current[controlId]);
    saveTimeoutRef.current[controlId] = setTimeout(() => {
      handleNotesChange(controlId, notes);
    }, 300);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Evidence Locker</h1>
          <p className="text-slate-500 dark:text-white/60">Manage documentation for audit preparation</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl font-medium">
            {passedControls.length} controls ready
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search evidence by control ID, title, or notes..."
            className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as EvidenceStatus | 'all')}
            className="appearance-none px-4 py-2.5 pr-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="final">Final</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {passedControls.length === 0 ? (
        <Glass className="p-16 text-center">
          <FolderOpen className="w-16 h-16 text-slate-300 dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Evidence Yet</h3>
          <p className="text-slate-500 dark:text-white/60">Complete controls with "Yes" to start collecting evidence</p>
        </Glass>
      ) : filteredControls.length === 0 ? (
        <Glass className="p-16 text-center">
          <Search className="w-12 h-12 text-slate-300 dark:text-white/20 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-white/50">No evidence matches your search</p>
        </Glass>
      ) : (
        <Glass className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase">Control</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase w-28">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase">Notes (Auto-saves)</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-white/50 uppercase w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {filteredControls.map(control => {
                const entry = evidence.get(control.id) || { notes: '', status: 'draft' as EvidenceStatus };
                return (
                  <tr key={control.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-mono bg-slate-100 dark:bg-white/10 rounded">{control.id}</span>
                        <span className="text-sm text-slate-900 dark:text-white font-medium truncate max-w-[200px]">{control.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={entry.status}
                        onChange={e => updateEvidence(control.id, { status: e.target.value as EvidenceStatus })}
                        className="px-2 py-1 text-xs rounded-lg bg-transparent border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="draft">Draft</option>
                        <option value="review">Review</option>
                        <option value="final">Final</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="text"
                        defaultValue={entry.notes}
                        onChange={e => debouncedNotesChange(control.id, e.target.value)}
                        placeholder="Add evidence notes..."
                        className="w-full px-3 py-1.5 text-sm bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-white/10 focus:border-blue-500 rounded-lg focus:outline-none transition-colors"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <button className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg" title="Upload file (placeholder)">
                        <Upload className="w-4 h-4" />
                      </button>
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
// COMPANY CONTROLS TAB (Multi-select Framework Mapping)
// ============================================================================

const CompanyTab: React.FC = () => {
  const { state, addCustomControl, deleteCustomControl } = useApp();
  const { customControls } = state;
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    question: '',
    mappings: [] as Array<{ frameworkId: FrameworkId; clauseId: string }>,
  });

  // Multi-select state for framework mapping
  const [selectedFrameworks, setSelectedFrameworks] = useState<FrameworkId[]>([]);
  const [clauseInputs, setClauseInputs] = useState<Record<FrameworkId, string>>({
    SOC2: '',
    ISO27001: '',
    HIPAA: '',
    NIST: '',
  });

  const toggleFramework = (fwId: FrameworkId) => {
    setSelectedFrameworks(prev =>
      prev.includes(fwId) ? prev.filter(f => f !== fwId) : [...prev, fwId]
    );
  };

  const resetForm = () => {
    setForm({ name: '', description: '', question: '', mappings: [] });
    setSelectedFrameworks([]);
    setClauseInputs({ SOC2: '', ISO27001: '', HIPAA: '', NIST: '' });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name && form.description) {
      // Build mappings from selected frameworks
      const mappings: FrameworkMapping[] = selectedFrameworks
        .filter(fwId => clauseInputs[fwId].trim())
        .map(fwId => ({
          frameworkId: fwId,
          clauseId: clauseInputs[fwId].trim(),
          clauseTitle: 'Custom mapping',
        }));

      addCustomControl({
        id: `CUSTOM-${Date.now()}`,
        title: form.name,
        description: form.description,
        question: form.question || `Is ${form.name} implemented?`,
        category: 'company_specific' as unknown as ComplianceDomain,
        frameworkMappings: mappings,
        effort: 'medium',
        impact: 'medium',
        createdAt: new Date().toISOString(),
        createdBy: 'User',
      });
      resetForm();
      setShowModal(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Company Controls</h1>
          <p className="text-slate-500 dark:text-white/60">Custom controls appear in the "Company Specific" domain</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-violet-500/25"
        >
          <Plus className="w-4 h-4" />
          Create New Control
        </button>
      </div>

      {customControls.length === 0 ? (
        <Glass className="p-16 text-center">
          <Briefcase className="w-16 h-16 text-slate-300 dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Custom Controls</h3>
          <p className="text-slate-500 dark:text-white/60 mb-4">Create controls specific to your organization</p>
          <p className="text-sm text-slate-400 dark:text-white/40">Custom controls will appear in the Assessment tab under "Company Specific"</p>
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
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border" style={{ borderColor: `${fw?.color}40`, color: fw?.color, backgroundColor: `${fw?.color}10` }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fw?.color }} />
                            {m.frameworkId} {m.clauseId}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button onClick={() => deleteCustomControl(c.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Glass>
          ))}
        </div>
      )}

      {/* Create Modal with Multi-select Framework Mapping */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowModal(false); resetForm(); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5 border-b border-slate-200 dark:border-white/10">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create New Control</h2>
                <p className="text-sm text-slate-500 dark:text-white/60">This control will appear in the "Company Specific" domain</p>
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
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-1.5">Assessment Question</label>
                  <input
                    type="text"
                    value={form.question}
                    onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="e.g., Are weekly security standups conducted?"
                  />
                </div>

                {/* Multi-select Framework Mapping */}
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-3">
                    Framework Mapping (Multi-select)
                  </label>
                  <div className="space-y-3">
                    {FRAMEWORKS.map(fw => {
                      const isSelected = selectedFrameworks.includes(fw.id);
                      return (
                        <div key={fw.id} className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleFramework(fw.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-current bg-opacity-10'
                                : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                            }`}
                            style={isSelected ? { borderColor: fw.color, backgroundColor: `${fw.color}10`, color: fw.color } : undefined}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? '' : 'border-slate-300 dark:border-white/30'}`}
                              style={isSelected ? { borderColor: fw.color, backgroundColor: fw.color } : undefined}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm font-medium ${isSelected ? '' : 'text-slate-600 dark:text-white/70'}`}>
                              {fw.name}
                            </span>
                          </button>
                          {isSelected && (
                            <input
                              type="text"
                              value={clauseInputs[fw.id]}
                              onChange={e => setClauseInputs(p => ({ ...p, [fw.id]: e.target.value }))}
                              placeholder={`${fw.id} Clause ID (e.g., CC6.1)`}
                              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 text-slate-600 dark:text-white/60">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium">
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
  const { syncNotifications, darkMode, customControls } = state;
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
      <nav className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-slate-900 dark:text-white">Compliance Engine</span>
                <span className="text-xs text-slate-500 dark:text-white/50 ml-2">
                  {MASTER_CONTROLS.length + customControls.length} Controls
                </span>
              </div>
            </div>

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

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className={`relative p-2.5 rounded-xl transition-all ${
                  showSidebar ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <Zap className="w-5 h-5" />
                {syncNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {Math.min(syncNotifications.length, 99)}
                  </span>
                )}
              </button>
              <button onClick={toggleDarkMode} className="p-2.5 rounded-xl text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <DashboardTab onNavigate={handleNavigate} />
            </motion.div>
          )}
          {activeTab === 'assessment' && (
            <motion.div key="assessment" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <AssessmentTab initialDomain={selectedDomain} />
            </motion.div>
          )}
          {activeTab === 'evidence' && (
            <motion.div key="evidence" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <EvidenceTab />
            </motion.div>
          )}
          {activeTab === 'company' && (
            <motion.div key="company" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <CompanyTab />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <MappingSidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />
    </div>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
