/**
 * Modular Compliance Engine - Command Center Design
 * High-Trust Corporate/Enterprise GRC Platform
 * Midnight & Steel Theme
 */

import React, { useState, useMemo, createContext, useContext, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ClipboardCheck, FolderOpen, Building2, Search, Check, X,
  Info, AlertTriangle, Shield, FileText, Lock, Users, Paperclip,
  Server, Database, Eye, Settings as SettingsIcon, RefreshCw, CheckCircle2, Target, Activity,
  Download, AlertCircle, ChevronDown, Save, Briefcase, Wrench, Globe,
  Award, ShieldCheck, ChevronRight, Menu, Sparkles, Plug, ShoppingBag, Crown, ClipboardList,
} from 'lucide-react';

import { useCompliance, type UseComplianceReturn, useIncidentResponse } from './hooks';
import { FRAMEWORKS, type MasterControl, type ComplianceDomainMeta, type FrameworkId } from './constants/controls';
import IncidentDashboard from './components/IncidentDashboard';
import IncidentDetail from './components/IncidentDetail';
import ReportAnalyticsCenter from './components/ReportAnalyticsCenter';
import RemediationEngine from './components/RemediationEngine';
import TrustCenter from './components/TrustCenter';
import CertificateGenerator from './components/CertificateGenerator';
import AuditorVerification from './components/AuditorVerification';
import AuditBundle from './components/AuditBundle';
import { PolicyGeneratorButton } from './components/PolicyGenerator';
import { AIPolicyGeneratorButton } from './components/AIPolicyGenerator';
import { ThemeToggle } from './components/ThemeToggle';
import Settings from './components/Settings';
import MonitoringDashboard from './components/MonitoringDashboard';
import AlertConfiguration from './components/AlertConfiguration';
import CloudVerification from './components/CloudVerification';
import RemediationChat from './components/RemediationChat';
import IntegrationHub from './components/IntegrationHub';
import TenantAdmin from './components/TenantAdmin';
import TPRMCenter from './components/TPRMCenter';
import QuestionnaireAutomation from './components/QuestionnaireAutomation';
import OrganizationSetup from './components/OrganizationSetup';
import FrameworkRequirementsView from './components/FrameworkRequirementsView';
import EvidenceRepository from './components/EvidenceRepository';
import AuditorRequirementView from './components/AuditorRequirementView';
import RequirementAssessmentWizard from './components/RequirementAssessmentWizard';
import ControlWorkstationWrapper from './components/ControlWorkstation/ControlWorkstationWrapper';
import { monitoringService } from './services/continuous-monitoring.service';
import type { Incident } from './types/incident.types';
import { useOrganization } from './contexts/OrganizationContext';
import { useAuth } from './hooks/useAuth';
import { CommandPalette, useCommandPalette } from './components/ui';

type TabId = 'dashboard' | 'assessment' | 'incidents' | 'reporting' | 'evidence' | 'integrations' | 'vendors' | 'questionnaires' | 'trust-center' | 'certificate' | 'verify' | 'admin' | 'settings';

// ============================================================================
// CONTEXT
// ============================================================================

const ComplianceContext = createContext<UseComplianceReturn | null>(null);
export const useComplianceContext = () => {
  const ctx = useContext(ComplianceContext);
  if (!ctx) throw new Error('useComplianceContext must be used within ComplianceProvider');
  return ctx;
};

const ComplianceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get the current organization from context to pass to useCompliance
  // This ensures data is saved to the correct organization in Supabase
  const { currentOrg } = useOrganization();
  const compliance = useCompliance({ organizationId: currentOrg?.id });

  // Debug: log when evidenceFileCounts changes
  useEffect(() => {
    // Test lookup for a known control ID
    const testResult = compliance.evidenceFileCounts['GV-022'];
    console.log('[ComplianceProvider] evidenceFileCounts size:', Object.keys(compliance.evidenceFileCounts).length, ', GV-022:', testResult);
  }, [compliance.evidenceFileCounts]);

  return <ComplianceContext.Provider value={compliance}>{children}</ComplianceContext.Provider>;
};

// ============================================================================
// FRAMEWORK COLORS - Industrial Palette
// ============================================================================

const FRAMEWORK_COLORS: Record<FrameworkId, string> = {
  SOC2: '#8b5cf6',     // Violet
  ISO27001: '#10b981', // Emerald
  HIPAA: '#ec4899',    // Pink
  NIST: '#f59e0b',     // Amber
  PCIDSS: '#3b82f6',   // Blue
  GDPR: '#06b6d4',     // Cyan
};

// ============================================================================
// UI COMPONENTS - Command Center Design System
// ============================================================================

const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`card ${onClick ? 'cursor-pointer card-interactive' : ''} ${className}`}
  >
    {children}
  </div>
);

// Slide-Over Drawer - Premium Corporate Side Panel
interface SlideOverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

const SlideOverDrawer: React.FC<SlideOverDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'md'
}) => {
  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed right-0 top-0 h-full ${widthClasses[width]} w-full bg-white dark:bg-midnight-900 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-steel-800`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-steel-800 bg-slate-50 dark:bg-midnight-800">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-steel-100">{title}</h2>
                {subtitle && (
                  <p className="text-sm text-slate-500 dark:text-steel-400 mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 dark:text-steel-500 hover:text-slate-600 dark:hover:text-steel-300 hover:bg-slate-100 dark:hover:bg-steel-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Thin Radial Progress Ring - Premium Corporate Style
const CircularGauge: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  count: string;
  showGlow?: boolean;
  variant?: 'default' | 'compact';
}> = ({ percentage, size = 120, strokeWidth = 3, color, label, count, showGlow: _showGlow = false, variant = 'default' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  // Use Indigo-600 as primary accent
  const ringColor = color || '#4f46e5';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="-rotate-90" width={size} height={size}>
          {/* Background track - very subtle */}
          <circle
            cx={size/2}
            cy={size/2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-steel-800/50"
          />
          {/* Progress ring - thin and elegant */}
          <motion.circle
            cx={size/2}
            cy={size/2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-semibold tracking-tight text-slate-900 dark:text-steel-100 ${variant === 'compact' ? 'text-lg' : 'text-2xl'}`}>
            {percentage}%
          </span>
          {variant === 'default' && (
            <span className="text-xs text-slate-500 dark:text-steel-400 mt-0.5">{count}</span>
          )}
        </div>
      </div>
      <div className={`text-center ${variant === 'compact' ? 'mt-2' : 'mt-3'}`}>
        <div className={`font-medium tracking-tight text-slate-700 dark:text-steel-200 ${variant === 'compact' ? 'text-xs' : 'text-sm'}`}>
          {label}
        </div>
        {variant === 'compact' && (
          <div className="text-xs text-slate-500 dark:text-steel-500 mt-0.5">{count}</div>
        )}
      </div>
    </div>
  );
};

const DomainIcon: React.FC<{ domainId: string; className?: string }> = ({ domainId, className = 'w-4 h-4' }) => {
  const icons: Record<string, React.ReactNode> = {
    access_control: <Lock className={className} />,
    asset_management: <Database className={className} />,
    audit_logging: <FileText className={className} />,
    business_continuity: <RefreshCw className={className} />,
    change_management: <SettingsIcon className={className} />,
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
// PDF EXPORT
// ============================================================================

const generatePDF = (
  frameworks: Array<{ name: string; percentage: number; completed: number; total: number; color: string }>,
  stats: { totalControls: number; answeredControls: number; compliantControls: number; gapControls: number; remainingControls: number },
  gaps: MasterControl[]
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) { alert('Please allow popups'); return; }
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  printWindow.document.write(`<!DOCTYPE html><html><head><title>Compliance Summary - ${today}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 48px; color: #0F172A; background: white; }
  .header { text-align: center; margin-bottom: 48px; padding-bottom: 24px; border-bottom: 2px solid #6366f1; }
  .header h1 { font-size: 28px; color: #0F172A; margin-bottom: 8px; font-weight: 700; letter-spacing: -0.025em; }
  .header p { color: #64748B; font-size: 14px; }
  .logo { font-size: 20px; font-weight: 700; color: #6366f1; margin-bottom: 16px; letter-spacing: -0.5px; }
  .section { margin-bottom: 36px; }
  .section h2 { font-size: 16px; color: #334155; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #E2E8F0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .frameworks { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .framework-card { padding: 24px; text-align: center; border: 1px solid #E2E8F0; background: #F8FAFC; }
  .framework-card .percentage { font-size: 32px; font-weight: 700; }
  .framework-card .name { font-size: 13px; color: #64748B; margin-top: 4px; font-weight: 500; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .stat-card { padding: 20px; background: #F8FAFC; border: 1px solid #E2E8F0; }
  .stat-card .value { font-size: 28px; font-weight: 700; }
  .stat-card .label { font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  .gaps-table { width: 100%; border-collapse: collapse; }
  .gaps-table th, .gaps-table td { padding: 14px; text-align: left; border-bottom: 1px solid #E2E8F0; }
  .gaps-table th { background: #F8FAFC; font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 600; letter-spacing: 0.5px; }
  .severity { padding: 4px 10px; font-size: 11px; font-weight: 600; }
  .severity-critical { background: #FEE2E2; color: #DC2626; }
  .severity-high { background: #FEF3C7; color: #D97706; }
  .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #E2E8F0; text-align: center; color: #94A3B8; font-size: 12px; }
  @media print { body { padding: 24px; } }
</style></head><body>
<div class="header">
  <div class="logo">LYDELL SECURITY</div>
  <h1>Compliance Executive Summary</h1>
  <p>Generated on ${today}</p>
</div>
<div class="section"><h2>Framework Compliance</h2><div class="frameworks">
${frameworks.map(fw => `<div class="framework-card"><div class="percentage" style="color:${fw.color}">${fw.percentage}%</div><div class="name">${fw.name}</div><div style="font-size:11px;color:#94A3B8;margin-top:4px">${fw.completed}/${fw.total} controls</div></div>`).join('')}
</div></div>
<div class="section"><h2>Assessment Summary</h2><div class="stats">
<div class="stat-card"><div class="value" style="color:#6366f1">${Math.round((stats.answeredControls/stats.totalControls)*100)}%</div><div class="label">Assessed</div></div>
<div class="stat-card"><div class="value" style="color:#10b981">${stats.compliantControls}</div><div class="label">Compliant</div></div>
<div class="stat-card"><div class="value" style="color:#f43f5e">${stats.gapControls}</div><div class="label">Gaps</div></div>
<div class="stat-card"><div class="value" style="color:#f59e0b">${stats.remainingControls}</div><div class="label">Remaining</div></div>
</div></div>
${gaps.length > 0 ? `<div class="section"><h2>Action Required - Critical Gaps</h2><table class="gaps-table"><thead><tr><th>Control ID</th><th>Title</th><th>Priority</th></tr></thead><tbody>
${gaps.map(g => `<tr><td><strong>${g.id}</strong></td><td>${g.title}</td><td><span class="severity severity-${g.riskLevel}">${g.riskLevel.toUpperCase()}</span></td></tr>`).join('')}
</tbody></table></div>` : ''}
<div class="footer"><p>AttestAI by Lydell Security | Confidential</p></div>
<script>window.onload=()=>window.print();</script></body></html>`);
  printWindow.document.close();
};

// ============================================================================
// SYNC ACTIVITY SIDEBAR
// ============================================================================

const SyncActivitySidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { syncNotifications } = useComplianceContext();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="modal-backdrop"
          />
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-80 glass-sidebar z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-steel-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-status-success/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-status-success" />
                </div>
                <div>
                  <div className="section-title">Sync Activity</div>
                  <div className="section-subtitle">Real-time updates</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="btn-ghost p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {syncNotifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                  <div className="w-12 h-12 bg-slate-200 dark:bg-steel-800 rounded-lg flex items-center justify-center mb-4">
                    <Activity className="w-6 h-6 text-steel-500" />
                  </div>
                  <p className="text-sm text-steel-500">Complete controls to see framework sync activity</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {syncNotifications.map((n, i) => {
                    const color = FRAMEWORK_COLORS[n.frameworkId] || '#6366f1';
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="p-3 bg-slate-100 dark:bg-midnight-800 border border-slate-200 dark:border-steel-800 rounded-lg"
                        style={{ borderLeftColor: color, borderLeftWidth: '2px' }}
                      >
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span
                                className="pill"
                                style={{ backgroundColor: `${color}20`, color, borderColor: `${color}30` }}
                              >
                                {n.frameworkId}
                              </span>
                              <span className="text-xs font-medium text-secondary">{n.clauseId}</span>
                            </div>
                            <div className="text-xs text-steel-500 truncate">{n.clauseTitle}</div>
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
// PROTOCOL CARD (Control Assessment)
// ============================================================================

const ProtocolCard: React.FC<{ control: MasterControl; onOpenRemediation?: (controlId: string, controlTitle: string) => void; onDropEvidence?: (controlId: string, files: File[]) => void }> = ({ control, onOpenRemediation, onDropEvidence }) => {
  const { answerControl, getResponse, updateRemediation, evidenceFileCounts } = useComplianceContext();
  const [showInfo, setShowInfo] = useState(false);
  const [localRemediation, setLocalRemediation] = useState('');
  const [showAIChat, setShowAIChat] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const response = getResponse(control.id);
  // Access the object directly - this creates a dependency on the object reference
  const evidenceCounts = evidenceFileCounts[control.id];

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && onDropEvidence) {
      onDropEvidence(control.id, files);
    }
  };

  useEffect(() => { setLocalRemediation(response?.remediationPlan || ''); }, [response?.remediationPlan]);

  useEffect(() => {
    if (response?.answer === 'no' && localRemediation !== response.remediationPlan) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => updateRemediation(control.id, localRemediation), 500);
    }
    return () => clearTimeout(saveTimeoutRef.current);
  }, [localRemediation, control.id, response, updateRemediation]);

  const handleAnswer = (answer: 'yes' | 'no' | 'partial' | 'na') => {
    answerControl(control.id, answer);
  };

  // Premium Soft-Tint button styles
  const buttons: Array<{ value: 'yes' | 'no' | 'partial' | 'na'; label: string; activeClass: string; defaultClass: string }> = [
    {
      value: 'yes',
      label: 'Yes',
      activeClass: 'bg-emerald-600 text-white border-emerald-600',
      defaultClass: 'border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
    },
    {
      value: 'no',
      label: 'No',
      activeClass: 'bg-rose-600 text-white border-rose-600',
      defaultClass: 'border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20'
    },
    {
      value: 'partial',
      label: 'Partial',
      activeClass: 'bg-amber-500 text-white border-amber-500',
      defaultClass: 'border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
    },
    {
      value: 'na',
      label: 'N/A',
      activeClass: 'bg-slate-600 text-white border-slate-600 dark:bg-steel-600 dark:border-steel-600',
      defaultClass: 'border-slate-200 dark:border-steel-700 text-slate-500 dark:text-steel-400 hover:bg-slate-50 dark:hover:bg-steel-800'
    },
  ];

  const riskIndicatorClass = {
    critical: 'protocol-card-critical',
    high: 'protocol-card-high',
    medium: 'protocol-card-medium',
    low: 'protocol-card-low',
  }[control.riskLevel];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`protocol-card ${riskIndicatorClass} ${isDragOver ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-midnight-900 bg-indigo-50/50 dark:bg-indigo-900/20' : ''} transition-all`}
    >
      {/* Drop zone overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Paperclip className="w-8 h-8" />
            <span className="text-sm font-medium">Drop files to upload</span>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-200 dark:bg-steel-800 text-secondary rounded">
              {control.id}
            </span>
            {/* Evidence Upload Indicator */}
            {evidenceCounts?.hasFiles ? (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded"
                title={`${evidenceCounts.fileCount} file${evidenceCounts.fileCount !== 1 ? 's' : ''} uploaded`}
              >
                <Paperclip className="w-3 h-3" />
                {evidenceCounts.fileCount}
              </span>
            ) : evidenceCounts?.evidenceCount ? (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded"
                title="Evidence record exists but no files uploaded"
              >
                <Paperclip className="w-3 h-3" />
                <span className="opacity-60">0</span>
              </span>
            ) : null}
            <span className={`badge ${control.riskLevel === 'critical' ? 'badge-risk' : control.riskLevel === 'high' ? 'badge-warning' : control.riskLevel === 'medium' ? 'badge-info' : 'badge-neutral'}`}>
              {control.riskLevel.charAt(0).toUpperCase() + control.riskLevel.slice(1)}
            </span>
            {/* Risk Glow Indicator */}
            {(control.riskLevel === 'critical' || control.riskLevel === 'high') && !response?.answer && (
              <span className={`status-dot risk-glow ${control.riskLevel === 'critical' ? 'status-dot-risk risk-glow-critical' : 'status-dot-warning risk-glow-high'}`} />
            )}
          </div>
          <h3 className="font-semibold text-primary text-sm tracking-tight">{control.title}</h3>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className={`p-2 transition-colors flex-shrink-0 rounded-lg ${showInfo ? 'bg-accent-500 text-white' : 'bg-slate-200 dark:bg-steel-800 text-secondary hover:text-accent-400'}`}
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      <p className="text-sm text-secondary mb-4">{control.question}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {control.frameworkMappings.map(m => {
          const color = FRAMEWORK_COLORS[m.frameworkId] || '#6366f1';
          return (
            <span
              key={`${m.frameworkId}-${m.clauseId}`}
              className="pill"
              style={{ backgroundColor: `${color}20`, color, borderColor: `${color}30` }}
            >
              {m.frameworkId} {m.clauseId}
            </span>
          );
        })}
      </div>

      <div className="flex gap-2">
        {buttons.map(btn => {
          const selected = response?.answer === btn.value;
          return (
            <button
              key={btn.value}
              onClick={() => handleAnswer(btn.value)}
              className={`flex-1 py-2.5 px-3 text-sm font-medium border rounded-lg transition-all duration-200 ${selected ? btn.activeClass : btn.defaultClass}`}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Policy Generator Buttons */}
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-steel-800 flex flex-wrap gap-2">
        <PolicyGeneratorButton control={control} organizationName="LYDELL SECURITY" />
        <AIPolicyGeneratorButton control={control} organizationName="LYDELL SECURITY" controlResponse={response?.answer} />
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100 dark:border-steel-800 mt-4"
          >
            <div className="pt-4 space-y-4">
              <div className="p-4 bg-indigo-50 dark:bg-accent-500/10 rounded-lg border border-indigo-100 dark:border-accent-500/20">
                <h4 className="text-xs font-semibold text-indigo-600 dark:text-accent-400 uppercase tracking-wider mb-1.5">Why This Matters</h4>
                <p className="text-sm text-slate-600 dark:text-steel-300">{control.guidance}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase tracking-wider mb-3">Evidence Examples</h4>
                <ul className="space-y-2">
                  {control.evidenceExamples.map((ex, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-steel-300">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {response?.answer === 'no' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-rose-100 dark:border-status-risk/30 mt-4"
          >
            <div className="pt-4 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-status-risk/10 rounded-lg border border-rose-100 dark:border-status-risk/20">
                <AlertTriangle className="w-5 h-5 text-rose-500 dark:text-status-risk flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-rose-600 dark:text-status-risk uppercase tracking-wide mb-1">Gap Identified</div>
                  <p className="text-sm text-rose-700 dark:text-rose-200">{control.remediationTip}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {onOpenRemediation && (
                  <button
                    onClick={() => onOpenRemediation(control.id, control.title)}
                    className="btn-secondary flex-1"
                  >
                    <Wrench className="w-4 h-4" />
                    Remediation Guide
                  </button>
                )}
                <button
                  onClick={() => setShowAIChat(true)}
                  className="btn-primary flex-1"
                >
                  <Sparkles className="w-4 h-4" />
                  AI Assistant
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-rose-600 dark:text-status-risk uppercase tracking-wide mb-2">Remediation Plan</label>
                <textarea
                  value={localRemediation}
                  onChange={e => setLocalRemediation(e.target.value)}
                  placeholder="Document your remediation plan..."
                  className="input border-rose-200 dark:border-status-risk/30 focus:border-rose-400 dark:focus:border-status-risk resize-none"
                  rows={3}
                />
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 dark:text-steel-500">
                  <Save className="w-3 h-3" /> Auto-saves
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Remediation Chat */}
      <RemediationChat
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        control={control}
        userAnswer={response?.answer || 'no'}
      />
    </motion.div>
  );
};

// ============================================================================
// DASHBOARD TAB - Premium Bento Grid Layout
// ============================================================================

const DashboardTab: React.FC<{ onNavigate: (tab: TabId, domain?: ComplianceDomainMeta) => void }> = ({ onNavigate }) => {
  const { frameworkProgress, stats, criticalGaps, domainProgress, allDomains, allControls, getResponse } = useComplianceContext();

  // Get next 3 tasks - prioritize critical gaps, then high-risk unanswered
  const nextTasks = useMemo(() => {
    const tasks: Array<{ control: MasterControl; reason: string; priority: 'critical' | 'high' | 'medium' }> = [];

    // First: Critical gaps (answered 'no')
    criticalGaps
      .filter(c => c.riskLevel === 'critical')
      .slice(0, 2)
      .forEach(c => tasks.push({ control: c, reason: 'Critical gap needs attention', priority: 'critical' }));

    // Then: High-risk unanswered controls
    if (tasks.length < 3) {
      allControls
        .filter(c => !getResponse(c.id)?.answer && c.riskLevel === 'critical')
        .slice(0, 3 - tasks.length)
        .forEach(c => tasks.push({ control: c, reason: 'Critical control not assessed', priority: 'high' }));
    }

    // Fill remaining with high-risk gaps
    if (tasks.length < 3) {
      criticalGaps
        .filter(c => c.riskLevel === 'high' && !tasks.some(t => t.control.id === c.id))
        .slice(0, 3 - tasks.length)
        .forEach(c => tasks.push({ control: c, reason: 'High priority gap', priority: 'medium' }));
    }

    return tasks.slice(0, 3);
  }, [criticalGaps, allControls, getResponse]);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-steel-100">Dashboard</h1>
          <p className="text-slate-500 dark:text-steel-400 mt-1">{stats.totalControls} controls across {frameworkProgress.length} frameworks</p>
        </div>
        <button
          onClick={() => generatePDF(frameworkProgress, stats, criticalGaps)}
          className="btn-primary"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Bento Grid - Premium Layout */}
      <div className="grid grid-cols-12 gap-5">
        {/* Overall Compliance Score - Big Number */}
        <motion.div
          className="col-span-12 lg:col-span-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <Card className="p-6 h-full bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-midnight-800 border-indigo-100 dark:border-indigo-900/50">
            <h2 className="text-sm font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-4">Overall Compliance</h2>
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                <CircularGauge
                  percentage={stats.assessmentPercentage}
                  size={120}
                  strokeWidth={6}
                  color="#4f46e5"
                  label=""
                  count=""
                />
              </div>
              <div className="flex-1">
                <div className="text-5xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">
                  {stats.assessmentPercentage}%
                </div>
                <div className="text-slate-600 dark:text-steel-400 mt-1">
                  {stats.answeredControls} of {stats.totalControls} controls assessed
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm text-slate-600 dark:text-steel-400">{stats.compliantControls} Compliant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-slate-600 dark:text-steel-400">{stats.gapControls} Gaps</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Your Next 3 Tasks */}
        <motion.div
          className="col-span-12 lg:col-span-7"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <Card className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-slate-500 dark:text-steel-400 uppercase tracking-wide flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-500" />
                Your Next 3 Tasks
              </h2>
              <button
                onClick={() => onNavigate('assessment')}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View all
              </button>
            </div>
            {nextTasks.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-status-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-status-success" />
                  </div>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">All caught up!</p>
                  <p className="text-xs text-slate-500 dark:text-steel-400 mt-1">No critical tasks pending</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {nextTasks.map((task, i) => {
                  const domain = allDomains.find(d => (d.id as string) === (task.control.domain as string));
                  const priorityColors = {
                    critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
                    high: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
                    medium: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
                  };
                  return (
                    <motion.button
                      key={task.control.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      onClick={() => domain && onNavigate('assessment', domain)}
                      className={`w-full p-4 rounded-xl border text-left transition-all duration-200 hover:shadow-md group ${priorityColors[task.priority]}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                          task.priority === 'critical' ? 'bg-red-500' : task.priority === 'high' ? 'bg-orange-500' : 'bg-amber-500'
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-mono text-slate-500 dark:text-steel-500">{task.control.id}</span>
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                              task.priority === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                              task.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}>
                              {task.control.riskLevel.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-800 dark:text-steel-200 truncate">{task.control.title}</p>
                          <p className="text-xs text-slate-500 dark:text-steel-400 mt-0.5">{task.reason}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Framework Progress - Side by Side Cards */}
        <motion.div
          className="col-span-12"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
        >
          <Card className="p-6">
            <h2 className="text-sm font-medium text-slate-500 dark:text-steel-400 uppercase tracking-wide mb-6">Framework Progress</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {frameworkProgress.map((fw, i) => (
                <motion.div
                  key={fw.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.2 }}
                  className="flex flex-col items-center"
                >
                  <CircularGauge
                    percentage={fw.percentage}
                    size={80}
                    strokeWidth={4}
                    color={FRAMEWORK_COLORS[fw.id] || fw.color}
                    label={fw.name}
                    count={`${fw.completed}/${fw.total}`}
                    variant="compact"
                  />
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Active Gaps - Attention Card */}
        <motion.div
          className="col-span-12 lg:col-span-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
        >
          <Card className="p-6 h-full">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-medium text-slate-500 dark:text-steel-400 uppercase tracking-wide flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                Active Gaps
              </h2>
              <span className="badge-risk">{stats.gapControls}</span>
            </div>
            {criticalGaps.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-status-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-status-success" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-steel-400">No critical gaps identified</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {criticalGaps.slice(0, 5).map((control, i) => (
                  <motion.button
                    key={control.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.05, duration: 0.2 }}
                    onClick={() => { const d = allDomains.find(x => (x.id as string) === (control.domain as string)); if (d) onNavigate('assessment', d); }}
                    className="w-full p-4 bg-rose-50 dark:bg-status-risk/5 border border-rose-100 dark:border-status-risk/20 rounded-lg text-left hover:border-rose-200 dark:hover:bg-status-risk/10 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${control.riskLevel === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-400 dark:text-steel-500">{control.id}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${control.riskLevel === 'critical' ? 'bg-rose-100 text-rose-700 dark:bg-status-risk/20 dark:text-status-risk' : 'bg-amber-100 text-amber-700 dark:bg-status-warning/20 dark:text-status-warning'}`}>
                            {control.riskLevel.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-steel-200 truncate">{control.title}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 dark:text-steel-500 group-hover:text-rose-500 dark:group-hover:text-status-risk transition-colors" />
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Quick Stats - Compact Cards */}
        <motion.div
          className="col-span-12 lg:col-span-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
        >
          <Card className="p-6 h-full">
            <h2 className="text-sm font-medium text-slate-500 dark:text-steel-400 uppercase tracking-wide mb-5">Quick Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-midnight-800 rounded-lg border border-slate-100 dark:border-steel-800">
                <div className="text-3xl font-semibold text-slate-900 dark:text-steel-100 tracking-tight">{stats.totalControls}</div>
                <div className="text-xs font-medium text-slate-500 dark:text-steel-400 uppercase tracking-wide mt-1">Total Controls</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-midnight-800 rounded-lg border border-slate-100 dark:border-steel-800">
                <div className="text-3xl font-semibold text-slate-900 dark:text-steel-100 tracking-tight">{stats.answeredControls}</div>
                <div className="text-xs font-medium text-slate-500 dark:text-steel-400 uppercase tracking-wide mt-1">Assessed</div>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-accent-500/10 rounded-lg border border-indigo-100 dark:border-accent-500/20">
                <div className="text-3xl font-semibold text-indigo-600 dark:text-accent-400 tracking-tight">{frameworkProgress.length}</div>
                <div className="text-xs font-medium text-indigo-600/70 dark:text-accent-400/70 uppercase tracking-wide mt-1">Frameworks</div>
              </div>
              <div className="p-4 bg-violet-50 dark:bg-framework-soc2/10 rounded-lg border border-violet-100 dark:border-framework-soc2/20">
                <div className="text-3xl font-semibold text-violet-600 dark:text-framework-soc2 tracking-tight">{domainProgress.length}</div>
                <div className="text-xs font-medium text-violet-600/70 dark:text-framework-soc2/70 uppercase tracking-wide mt-1">Domains</div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Domain Progress - Full Width */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.25 }}
      >
        <Card className="p-6">
          <h2 className="text-sm font-medium text-slate-500 dark:text-steel-400 uppercase tracking-wide mb-5">Domain Progress</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {domainProgress.map((domain, i) => {
              const domainMeta = allDomains.find(d => (d.id as string) === domain.id);
              const complete = domain.percentage === 100 && domain.total > 0;
              const color = FRAMEWORK_COLORS.SOC2;

              return (
                <motion.button
                  key={domain.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.02, duration: 0.2 }}
                  onClick={() => domainMeta && onNavigate('assessment', domainMeta)}
                  className={`p-4 text-left transition-all duration-200 border rounded-lg group ${complete
                    ? 'bg-emerald-50 dark:bg-status-success/5 border-emerald-200 dark:border-status-success/30'
                    : 'bg-white dark:bg-midnight-800 border-slate-200 dark:border-steel-800 hover:border-indigo-200 dark:hover:border-accent-500/30 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className="w-9 h-9 flex items-center justify-center rounded-lg"
                      style={{ backgroundColor: complete ? 'rgb(236 253 245)' : `${color}10` }}
                    >
                      <div style={{ color: complete ? '#10b981' : color }}><DomainIcon domainId={domain.id} /></div>
                    </div>
                    {complete && (
                      <div className="w-5 h-5 bg-emerald-500 flex items-center justify-center rounded-full ml-auto">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="font-medium text-sm text-slate-700 dark:text-steel-200 mb-2 line-clamp-2 tracking-tight min-h-[40px]">{domain.title}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-steel-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${domain.percentage}%` }}
                        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: complete ? '#10b981' : color }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-steel-400 font-medium tabular-nums">{domain.answered}/{domain.total}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// ASSESSMENT TAB
// ============================================================================

const AssessmentTab: React.FC<{ initialDomain?: ComplianceDomainMeta }> = ({ initialDomain }) => {
  const { allDomains, domainProgress, getControlsByDomain, allControls, getResponse, getEvidenceByControlId, evidenceFileCounts } = useComplianceContext();
  const [activeDomain, setActiveDomain] = useState<ComplianceDomainMeta>(initialDomain || allDomains[0]);
  const [search, setSearch] = useState('');
  const [selectedFramework, setSelectedFramework] = useState<FrameworkId | 'all'>('all');
  const [showFrameworkDropdown, setShowFrameworkDropdown] = useState(false);
  const [smartFilter, setSmartFilter] = useState<'all' | 'quick-fix' | 'needs-evidence' | 'critical-gaps'>('all');
  const [remediationControl, setRemediationControl] = useState<{ id: string; title: string } | null>(null);
  const [viewMode, setViewMode] = useState<'controls' | 'requirements' | 'auditor' | 'workstation'>('workstation');
  const [showRequirementWizard, setShowRequirementWizard] = useState(false);

  // Scroll to top when active domain changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeDomain]);

  // Navigate to next domain
  const handleNextDomain = () => {
    const currentIndex = allDomains.findIndex(d => d.id === activeDomain.id);
    if (currentIndex < allDomains.length - 1) {
      setActiveDomain(allDomains[currentIndex + 1]);
      setSearch('');
    }
  };

  // Check if there's a next domain
  const hasNextDomain = allDomains.findIndex(d => d.id === activeDomain.id) < allDomains.length - 1;

  // Helper function to get control answer for FrameworkRequirementsView
  const getControlAnswer = (controlId: string) => {
    const response = getResponse(controlId);
    return response?.answer || null;
  };

  // Calculate smart filter counts
  const smartFilterCounts = useMemo(() => {
    const quickFix = allControls.filter(c => {
      const response = getResponse(c.id);
      return response?.answer === 'no' && c.riskLevel !== 'critical';
    }).length;

    const needsEvidence = allControls.filter(c => {
      const response = getResponse(c.id);
      const counts = evidenceFileCounts[c.id];
      return response?.answer === 'yes' && (!counts || !counts.hasFiles);
    }).length;

    const criticalGaps = allControls.filter(c => {
      const response = getResponse(c.id);
      return response?.answer === 'no' && c.riskLevel === 'critical';
    }).length;

    return { quickFix, needsEvidence, criticalGaps };
  }, [allControls, getResponse, evidenceFileCounts]);

  const controls = useMemo(() => {
    let filtered = allControls;

    // Filter by framework first if selected
    if (selectedFramework !== 'all') {
      filtered = filtered.filter(c =>
        c.frameworkMappings.some(m => m.frameworkId === selectedFramework)
      );
    }

    // Apply smart filter
    if (smartFilter !== 'all') {
      filtered = filtered.filter(c => {
        const response = getResponse(c.id);
        const counts = evidenceFileCounts[c.id];

        switch (smartFilter) {
          case 'quick-fix':
            return response?.answer === 'no' && c.riskLevel !== 'critical';
          case 'needs-evidence':
            return response?.answer === 'yes' && (!counts || !counts.hasFiles);
          case 'critical-gaps':
            return response?.answer === 'no' && c.riskLevel === 'critical';
          default:
            return true;
        }
      });
    }

    // Then filter by search or domain
    if (search.trim()) {
      const q = search.toLowerCase();
      return filtered.filter(c =>
        c.id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.keywords.some(k => k.toLowerCase().includes(q))
      );
    }

    // If framework is selected or smart filter is active, show all matching controls
    if (selectedFramework !== 'all' || smartFilter !== 'all') {
      return filtered;
    }

    return getControlsByDomain(activeDomain.id as string);
  }, [activeDomain.id, search, selectedFramework, smartFilter, allControls, getControlsByDomain, getResponse, evidenceFileCounts]);

  const selectedFrameworkMeta = selectedFramework !== 'all'
    ? FRAMEWORKS.find(f => f.id === selectedFramework)
    : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showFrameworkDropdown && !(e.target as Element).closest('[data-framework-dropdown]')) {
        setShowFrameworkDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showFrameworkDropdown]);

  const currentDomainProgress = domainProgress.find(d => d.id === (activeDomain.id as string));

  const handleOpenRemediation = (controlId: string, controlTitle: string) => {
    setRemediationControl({ id: controlId, title: controlTitle });
  };

  // Show Requirement Assessment Wizard when activated
  if (showRequirementWizard) {
    return (
      <div className="h-[calc(100vh-140px)] -mx-6 -mt-6">
        <RequirementAssessmentWizard
          controls={allControls}
          getControlAnswer={getControlAnswer}
          onControlClick={(controlId) => {
            const control = allControls.find(c => c.id === controlId);
            if (control) {
              handleOpenRemediation(controlId, control.title);
            }
          }}
          onClose={() => setShowRequirementWizard(false)}
        />
        {/* Remediation Modal */}
        {remediationControl && (
          <RemediationEngine
            controlId={remediationControl.id}
            controlTitle={remediationControl.title}
            isOpen={true}
            onClose={() => setRemediationControl(null)}
          />
        )}
      </div>
    );
  }

  // Show Control Workstation (new Control-Centric view)
  if (viewMode === 'workstation') {
    return (
      <div className="space-y-4">
        {/* View Mode Toggle - Primary Toggle */}
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-steel-800/50 rounded-lg border border-slate-200 dark:border-steel-700">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Assessment
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600 dark:text-steel-400">View:</span>
            <div className="flex gap-1 p-1 bg-white dark:bg-steel-800 rounded-lg shadow-sm">
              <button
                onClick={() => setViewMode('workstation')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all bg-indigo-600 text-white shadow-sm"
                title="Control-centric assessment workstation"
              >
                <ClipboardList className="w-4 h-4" />
                <span className="whitespace-nowrap">Control Assessment</span>
              </button>
              <button
                onClick={() => setViewMode('requirements')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all text-slate-600 dark:text-steel-400 hover:text-slate-800 dark:hover:text-steel-200 hover:bg-slate-50 dark:hover:bg-steel-700"
                title="View by framework requirements"
              >
                <FileText className="w-4 h-4" />
                <span className="whitespace-nowrap">Framework View</span>
              </button>
            </div>
            <div className="h-6 w-px bg-slate-300 dark:bg-steel-600" />
            <div className="flex gap-1 p-1 bg-white dark:bg-steel-800 rounded-lg shadow-sm">
              <button
                onClick={() => setViewMode('controls')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all text-slate-500 dark:text-steel-500 hover:text-slate-700 dark:hover:text-steel-300 hover:bg-slate-50 dark:hover:bg-steel-700"
                title="Legacy controls list view"
              >
                <Shield className="w-4 h-4" />
                <span className="whitespace-nowrap">Legacy</span>
              </button>
              <button
                onClick={() => setViewMode('auditor')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all text-slate-500 dark:text-steel-500 hover:text-slate-700 dark:hover:text-steel-300 hover:bg-slate-50 dark:hover:bg-steel-700"
                title="Auditor view with coverage and gaps"
              >
                <Eye className="w-4 h-4" />
                <span className="whitespace-nowrap">Auditor</span>
              </button>
            </div>
          </div>
        </div>

        {/* Control Workstation */}
        <ControlWorkstationWrapper
          initialDomain={initialDomain}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="flex gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Domain Sidebar - Compliance Journey (Controls View Only) */}
      {viewMode === 'controls' && (
        <div className="w-64 flex-shrink-0 hidden lg:block">
          <Card className="p-4 sticky top-4">
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-steel-400">
                Compliance Journey
              </span>
            </div>
            <div className="space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto">
              {domainProgress.map((domain, idx) => {
                const domainMeta = allDomains.find(d => (d.id as string) === domain.id);
                const isActive = (activeDomain.id as string) === domain.id && !search;
                const complete = domain.percentage === 100 && domain.total > 0;

                return (
                  <button
                    key={domain.id}
                    onClick={() => { if (domainMeta) setActiveDomain(domainMeta); setSearch(''); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${isActive
                      ? 'bg-indigo-50 dark:bg-accent-500/10 border border-indigo-200 dark:border-accent-500/30'
                      : 'hover:bg-slate-50 dark:hover:bg-steel-800/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Step Number / Completion Indicator */}
                      <div
                        className={`w-7 h-7 flex items-center justify-center flex-shrink-0 rounded-lg text-xs font-semibold ${
                          complete
                            ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : isActive
                              ? 'bg-indigo-100 dark:bg-accent-500/20 text-indigo-600 dark:text-accent-400'
                              : 'bg-slate-100 dark:bg-steel-800 text-slate-500 dark:text-steel-400'
                        }`}
                      >
                        {complete ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium truncate ${
                            isActive
                              ? 'text-indigo-700 dark:text-accent-400'
                              : 'text-slate-700 dark:text-steel-300'
                          }`}>
                            {domain.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 bg-slate-200 dark:bg-steel-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${domain.percentage}%`, backgroundColor: complete ? '#10b981' : '#4f46e5' }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 dark:text-steel-500">{domain.answered}/{domain.total}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Search and Framework Filter */}
        <div className="flex gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-steel-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search controls..."
              className="input-search w-full"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-steel-500 hover:text-slate-600 dark:hover:text-steel-300">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Framework Filter Dropdown */}
          <div className="relative" data-framework-dropdown>
            <button
              onClick={() => setShowFrameworkDropdown(!showFrameworkDropdown)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                selectedFramework !== 'all'
                  ? 'bg-indigo-50 dark:bg-accent-500/10 border-indigo-300 dark:border-accent-500/30 text-indigo-700 dark:text-accent-400'
                  : 'bg-white dark:bg-steel-900 border-slate-200 dark:border-steel-700 text-slate-700 dark:text-steel-300 hover:border-slate-300 dark:hover:border-steel-600'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium whitespace-nowrap">
                {selectedFramework === 'all' ? 'All Frameworks' : selectedFrameworkMeta?.name || selectedFramework}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFrameworkDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showFrameworkDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-steel-900 border border-slate-200 dark:border-steel-700 rounded-lg shadow-lg z-50 overflow-hidden">
                <button
                  onClick={() => { setSelectedFramework('all'); setShowFrameworkDropdown(false); }}
                  className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-steel-800 transition-colors ${
                    selectedFramework === 'all' ? 'bg-indigo-50 dark:bg-accent-500/10 text-indigo-700 dark:text-accent-400' : 'text-slate-700 dark:text-steel-300'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>All Frameworks</span>
                  {selectedFramework === 'all' && <Check className="w-4 h-4 ml-auto" />}
                </button>
                <div className="border-t border-slate-100 dark:border-steel-800" />
                {FRAMEWORKS.map(fw => (
                  <button
                    key={fw.id}
                    onClick={() => { setSelectedFramework(fw.id); setShowFrameworkDropdown(false); }}
                    className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-steel-800 transition-colors ${
                      selectedFramework === fw.id ? 'bg-indigo-50 dark:bg-accent-500/10 text-indigo-700 dark:text-accent-400' : 'text-slate-700 dark:text-steel-300'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: FRAMEWORK_COLORS[fw.id] }} />
                    <div className="flex-1">
                      <div className="font-medium">{fw.name}</div>
                      <div className="text-xs text-slate-500 dark:text-steel-500">{fw.fullName}</div>
                    </div>
                    {selectedFramework === fw.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Smart Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setSmartFilter(smartFilter === 'quick-fix' ? 'all' : 'quick-fix')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                smartFilter === 'quick-fix'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                  : 'bg-white dark:bg-steel-900 text-slate-600 dark:text-steel-400 border border-slate-200 dark:border-steel-700 hover:border-emerald-300 dark:hover:border-emerald-700'
              }`}
              title="Controls that can be resolved with AI Policy Generator"
            >
              <Sparkles className="w-4 h-4" />
              Quick Fix
              {smartFilterCounts.quickFix > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                  smartFilter === 'quick-fix' ? 'bg-emerald-200 dark:bg-emerald-800' : 'bg-slate-100 dark:bg-steel-800'
                }`}>
                  {smartFilterCounts.quickFix}
                </span>
              )}
            </button>
            <button
              onClick={() => setSmartFilter(smartFilter === 'needs-evidence' ? 'all' : 'needs-evidence')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                smartFilter === 'needs-evidence'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                  : 'bg-white dark:bg-steel-900 text-slate-600 dark:text-steel-400 border border-slate-200 dark:border-steel-700 hover:border-amber-300 dark:hover:border-amber-700'
              }`}
              title="Compliant controls missing evidence files"
            >
              <Paperclip className="w-4 h-4" />
              Needs Evidence
              {smartFilterCounts.needsEvidence > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                  smartFilter === 'needs-evidence' ? 'bg-amber-200 dark:bg-amber-800' : 'bg-slate-100 dark:bg-steel-800'
                }`}>
                  {smartFilterCounts.needsEvidence}
                </span>
              )}
            </button>
            <button
              onClick={() => setSmartFilter(smartFilter === 'critical-gaps' ? 'all' : 'critical-gaps')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                smartFilter === 'critical-gaps'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
                  : 'bg-white dark:bg-steel-900 text-slate-600 dark:text-steel-400 border border-slate-200 dark:border-steel-700 hover:border-red-300 dark:hover:border-red-700'
              }`}
              title="Critical controls marked as non-compliant"
            >
              <AlertTriangle className="w-4 h-4" />
              Critical Gaps
              {smartFilterCounts.criticalGaps > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                  smartFilter === 'critical-gaps' ? 'bg-red-200 dark:bg-red-800' : 'bg-slate-100 dark:bg-steel-800'
                }`}>
                  {smartFilterCounts.criticalGaps}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* View Mode Toggle - Primary Toggle */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-steel-800/50 rounded-lg border border-slate-200 dark:border-steel-700">
          <span className="text-sm font-medium text-slate-600 dark:text-steel-400">View:</span>
          <div className="flex gap-1 p-1 bg-white dark:bg-steel-800 rounded-lg shadow-sm">
            <button
              onClick={() => setViewMode('workstation')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all text-slate-600 dark:text-steel-400 hover:text-slate-800 dark:hover:text-steel-200 hover:bg-slate-50 dark:hover:bg-steel-700"
              title="Control-centric assessment workstation"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="whitespace-nowrap">Control Assessment</span>
            </button>
            <button
              onClick={() => setViewMode('requirements')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'requirements'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-steel-400 hover:text-slate-800 dark:hover:text-steel-200 hover:bg-slate-50 dark:hover:bg-steel-700'
              }`}
              title="View by framework requirements"
            >
              <FileText className="w-4 h-4" />
              <span className="whitespace-nowrap">Framework View</span>
            </button>
          </div>
          <div className="h-6 w-px bg-slate-300 dark:bg-steel-600" />
          <div className="flex gap-1 p-1 bg-white dark:bg-steel-800 rounded-lg shadow-sm">
            <button
              onClick={() => setViewMode('controls')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'controls'
                  ? 'bg-slate-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-steel-500 hover:text-slate-700 dark:hover:text-steel-300 hover:bg-slate-50 dark:hover:bg-steel-700'
              }`}
              title="Legacy controls list view"
            >
              <Shield className="w-4 h-4" />
              <span className="whitespace-nowrap">Legacy</span>
            </button>
            <button
              onClick={() => setViewMode('auditor')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'auditor'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-steel-500 hover:text-slate-700 dark:hover:text-steel-300 hover:bg-slate-50 dark:hover:bg-steel-700'
              }`}
              title="Auditor view with coverage and gaps"
            >
              <Eye className="w-4 h-4" />
              <span className="whitespace-nowrap">Auditor</span>
            </button>
          </div>
        </div>

        {/* Framework Filter Active Banner */}
        {selectedFramework !== 'all' && selectedFrameworkMeta && (
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: `${FRAMEWORK_COLORS[selectedFramework]}10`,
              borderColor: `${FRAMEWORK_COLORS[selectedFramework]}30`
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${FRAMEWORK_COLORS[selectedFramework]}20` }}
                >
                  {selectedFrameworkMeta.icon}
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-steel-100">
                    {selectedFrameworkMeta.name} Compliance
                  </p>
                  <p className="text-sm text-slate-600 dark:text-steel-400">
                    {selectedFrameworkMeta.fullName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFramework('all')}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-steel-400 hover:text-slate-800 dark:hover:text-steel-200 hover:bg-white/50 dark:hover:bg-steel-800/50 rounded-lg transition-colors"
              >
                Clear filter
              </button>
            </div>

            {/* Info text based on view mode */}
            <p className="text-xs text-slate-500 dark:text-steel-500">
              {viewMode === 'controls'
                ? `${controls.length} controls mapped to this framework`
                : 'Viewing framework requirements with evidence tracking'
              }
            </p>
          </div>
        )}

        {/* Domain Header (Controls View Only) */}
        {viewMode === 'controls' && !search && !selectedFrameworkMeta && currentDomainProgress && (
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-accent-500/10">
                <div className="text-indigo-600 dark:text-accent-400 scale-125">
                  <DomainIcon domainId={currentDomainProgress.id} />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-steel-100">{currentDomainProgress.title}</h2>
                <p className="text-sm text-slate-500 dark:text-steel-400 mt-0.5">{activeDomain.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-600 dark:text-accent-400">{currentDomainProgress.answered}/{currentDomainProgress.total}</div>
                <div className="text-xs text-slate-500 dark:text-steel-500">Completed</div>
              </div>
            </div>
          </Card>
        )}

        {/* Search Results Info (Controls View Only) */}
        {viewMode === 'controls' && search && (
          <div className="p-4 bg-indigo-50 dark:bg-accent-500/10 border border-indigo-200 dark:border-accent-500/20 rounded-lg">
            <p className="text-indigo-700 dark:text-accent-400">
              Found <strong>{controls.length}</strong> controls matching "{search}"
            </p>
          </div>
        )}

        {/* Framework Requirements View */}
        {selectedFramework !== 'all' && viewMode === 'requirements' && (
          <FrameworkRequirementsView
            frameworkId={selectedFramework}
            controls={allControls}
            getControlAnswer={getControlAnswer}
            onControlClick={(controlId) => {
              const control = allControls.find(c => c.id === controlId);
              if (control) {
                handleOpenRemediation(controlId, control.title);
              }
            }}
          />
        )}

        {/* Auditor Requirement View */}
        {selectedFramework !== 'all' && viewMode === 'auditor' && (
          <AuditorRequirementView
            frameworkId={selectedFramework}
            controls={allControls}
            getControlAnswer={getControlAnswer}
            getControlResponse={(controlId) => {
              const response = getResponse(controlId);
              if (!response) return undefined;
              // Get evidence URLs if available
              const evidence = response.evidenceId ? getEvidenceByControlId(controlId) : undefined;
              return {
                answer: response.answer,
                evidenceUrls: evidence?.fileUrls || [],
              };
            }}
            onControlClick={(controlId) => {
              const control = allControls.find(c => c.id === controlId);
              if (control) {
                handleOpenRemediation(controlId, control.title);
              }
            }}
            onGapClick={(requirementId) => {
              console.log('Gap clicked:', requirementId);
              // TODO: Open gap resolution modal
            }}
          />
        )}

        {/* Requirements View - No Framework Selected Prompt */}
        {selectedFramework === 'all' && (viewMode === 'requirements' || viewMode === 'auditor') && (
          <Card className="p-8 text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              viewMode === 'auditor'
                ? 'bg-purple-50 dark:bg-purple-500/10'
                : 'bg-indigo-50 dark:bg-accent-500/10'
            }`}>
              {viewMode === 'auditor' ? (
                <Eye className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              ) : (
                <FileText className="w-8 h-8 text-indigo-600 dark:text-accent-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100 mb-2">
              Select a Framework
            </h3>
            <p className="text-slate-500 dark:text-steel-400 mb-6 max-w-md mx-auto">
              {viewMode === 'auditor'
                ? 'Choose a compliance framework to view requirement coverage, gaps, and evidence status from an auditor perspective.'
                : 'Choose a compliance framework to view its requirements structure and track evidence against specific requirements.'
              }
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {FRAMEWORKS.map(fw => (
                <button
                  key={fw.id}
                  onClick={() => setSelectedFramework(fw.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-800 hover:border-indigo-300 dark:hover:border-accent-500/50 hover:bg-indigo-50 dark:hover:bg-accent-500/10 transition-all"
                >
                  <span className="text-lg">{fw.icon}</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-steel-300">{fw.name}</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Controls List */}
        {viewMode === 'controls' && (
          <div className="space-y-3">
            {controls.length === 0 ? (
              <Card className="p-16 text-center">
                <div className="w-12 h-12 bg-slate-100 dark:bg-steel-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-slate-400 dark:text-steel-500" />
                </div>
                <p className="text-slate-500 dark:text-steel-400">
                  {(activeDomain.id as string) === 'company_specific' ? 'No custom controls yet.' : 'No controls found'}
                </p>
              </Card>
            ) : selectedFramework !== 'all' || search ? (
              // Group controls by domain when filtering by framework or searching
              (() => {
                // Group controls by domain
                const groupedControls = controls.reduce((acc, control) => {
                  const domainId = control.domain;
                  if (!acc[domainId]) {
                    acc[domainId] = [];
                  }
                  acc[domainId].push(control);
                  return acc;
                }, {} as Record<string, typeof controls>);

                // Get domain order from allDomains
                const sortedDomainIds = allDomains
                  .map(d => d.id as string)
                  .filter(id => groupedControls[id]);

                let globalIndex = 0;

                return (
                  <>
                    {sortedDomainIds.map((domainId, domainIndex) => {
                      const domainMeta = allDomains.find(d => (d.id as string) === domainId);
                      const domainControls = groupedControls[domainId] || [];
                      const nextDomainId = sortedDomainIds[domainIndex + 1];
                      const nextDomainMeta = nextDomainId ? allDomains.find(d => (d.id as string) === nextDomainId) : null;

                      return (
                        <div key={domainId} className="space-y-3">
                          {/* Domain Header */}
                          <div className="flex items-center gap-3 pt-4 first:pt-0" id={`domain-${domainId}`}>
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${domainMeta?.color || '#6B7280'}15` }}
                            >
                              <div style={{ color: domainMeta?.color || '#6B7280' }}>
                                <DomainIcon domainId={domainId} />
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold text-slate-700 dark:text-steel-300">
                                {domainMeta?.title || domainId}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-steel-500">
                                {domainControls.length} control{domainControls.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>

                          {/* Domain Controls */}
                          {domainControls.map((control) => {
                            const idx = globalIndex++;
                            return (
                              <motion.div
                                key={control.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.02 }}
                              >
                                <ProtocolCard control={control} onOpenRemediation={handleOpenRemediation} />
                              </motion.div>
                            );
                          })}

                          {/* Next Domain Button */}
                          {nextDomainMeta && (
                            <div className="pt-4 pb-2">
                              <button
                                onClick={() => {
                                  const el = document.getElementById(`domain-${nextDomainId}`);
                                  if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }
                                }}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-steel-800 dark:hover:bg-steel-700 text-slate-700 dark:text-steel-300 rounded-lg font-medium transition-colors border border-slate-200 dark:border-steel-700"
                              >
                                <span>Next: {nextDomainMeta.title}</span>
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                );
              })()
            ) : (
              // Regular domain view (no grouping needed - already filtered by domain)
              <>
                {controls.map((control, i) => (
                  <motion.div
                    key={control.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <ProtocolCard control={control} onOpenRemediation={handleOpenRemediation} />
                  </motion.div>
                ))}
                {/* Next Domain Button */}
                {hasNextDomain && controls.length > 0 && (
                  <div className="pt-6 border-t border-slate-200 dark:border-steel-700 mt-6">
                    <button
                      onClick={handleNextDomain}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-accent-600 dark:hover:bg-accent-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <span>Next: {allDomains[allDomains.findIndex(d => d.id === activeDomain.id) + 1]?.title}</span>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Remediation Engine Modal */}
      <RemediationEngine
        controlId={remediationControl?.id || ''}
        controlTitle={remediationControl?.title || ''}
        isOpen={remediationControl !== null}
        onClose={() => setRemediationControl(null)}
      />
    </motion.div>
  );
};

// Note: Custom Controls functionality moved to Admin Center (TenantAdmin.tsx)

// ============================================================================
// PREMIUM CORPORATE SIDEBAR NAVIGATION
// ============================================================================

const CommandSidebar: React.FC<{
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  incidentCount: number;
  alertCount: number;
  syncCount: number;
  onSyncClick: () => void;
  expanded: boolean;
  onToggle: () => void;
  organizationName?: string;
  organizationLogo?: string | null;
  primaryColor?: string;
}> = ({ activeTab, onTabChange, incidentCount, alertCount, syncCount, onSyncClick, expanded, onToggle, organizationName, organizationLogo, primaryColor }) => {
  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'assessment', label: 'Assessment', icon: <ClipboardCheck className="w-5 h-5" /> },
    { id: 'incidents', label: 'Incidents', icon: <AlertTriangle className="w-5 h-5" />, badge: incidentCount },
    { id: 'reporting', label: 'Reports', icon: <FileText className="w-5 h-5" /> },
    { id: 'evidence', label: 'Evidence', icon: <FolderOpen className="w-5 h-5" /> },
    { id: 'integrations', label: 'Integrations', icon: <Plug className="w-5 h-5" /> },
    { id: 'vendors', label: 'Vendors', icon: <ShoppingBag className="w-5 h-5" /> },
    { id: 'questionnaires', label: 'Questionnaires', icon: <ClipboardCheck className="w-5 h-5" /> },
    { id: 'trust-center', label: 'Trust Center', icon: <Globe className="w-5 h-5" /> },
    { id: 'certificate', label: 'Certificate', icon: <Award className="w-5 h-5" /> },
    { id: 'verify', label: 'Verify', icon: <ShieldCheck className="w-5 h-5" /> },
    { id: 'admin', label: 'Admin', icon: <Crown className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" />, badge: alertCount > 0 ? alertCount : undefined },
  ];

  return (
    <aside className={`glass-sidebar fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-200 ${expanded ? 'w-56' : 'w-16'}`}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-200 dark:border-steel-800">
        {organizationLogo ? (
          <img
            src={organizationLogo}
            alt={organizationName || 'Organization'}
            className="w-8 h-8 object-contain flex-shrink-0 rounded-lg"
          />
        ) : (
          <div
            className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-lg"
            style={{ backgroundColor: primaryColor || '#4f46e5' }}
          >
            <Shield className="w-5 h-5 text-white" />
          </div>
        )}
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-3 overflow-hidden"
          >
            <span className="font-semibold text-slate-900 dark:text-steel-100 text-sm tracking-tight whitespace-nowrap">
              {organizationName || 'LYDELL'}
            </span>
            <span className="text-xs text-slate-400 dark:text-steel-500 ml-1.5">GRC</span>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="space-y-0.5 px-2">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <div key={tab.id} className="relative group">
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
                    ? 'bg-indigo-50 dark:bg-accent-500/10 text-indigo-600 dark:text-accent-400 font-medium'
                    : 'text-slate-600 dark:text-steel-400 hover:text-slate-900 dark:hover:text-steel-200 hover:bg-slate-100 dark:hover:bg-steel-800/50'
                  }`}
                >
                  <span className="flex-shrink-0">{tab.icon}</span>
                  {expanded && (
                    <span className="text-sm truncate">{tab.label}</span>
                  )}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`${expanded ? 'ml-auto' : 'absolute -top-1 -right-1'} w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
                {/* Tooltip */}
                {!expanded && (
                  <div className="nav-tooltip">
                    {tab.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="p-2 border-t border-slate-200 dark:border-steel-800 space-y-0.5">
        {/* Sync Activity */}
        <div className="relative group">
          <button
            onClick={onSyncClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${syncCount > 0
              ? 'text-emerald-600 dark:text-status-success bg-emerald-50 dark:bg-status-success/10'
              : 'text-slate-600 dark:text-steel-400 hover:text-slate-900 dark:hover:text-steel-200 hover:bg-slate-100 dark:hover:bg-steel-800/50'
            }`}
          >
            <Activity className="w-5 h-5 flex-shrink-0" />
            {expanded && <span className="text-sm font-medium">Sync Activity</span>}
            {syncCount > 0 && (
              <span className={`${expanded ? 'ml-auto' : 'absolute -top-1 -right-1'} w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full`}>
                {Math.min(syncCount, 99)}
              </span>
            )}
          </button>
          {!expanded && (
            <div className="nav-tooltip">Sync Activity</div>
          )}
        </div>

        {/* Theme Toggle */}
        <div className="relative group">
          <ThemeToggle collapsed={!expanded} />
        </div>

        {/* Toggle Expand */}
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 dark:text-steel-400 hover:text-slate-700 dark:hover:text-steel-200 hover:bg-slate-100 dark:hover:bg-steel-800/50 transition-all duration-200"
        >
          <Menu className="w-5 h-5 flex-shrink-0" />
          {expanded && <span className="text-sm font-medium">Collapse</span>}
        </button>
      </div>
    </aside>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================

const AppContent: React.FC = () => {
  const compliance = useComplianceContext();
  const ir = useIncidentResponse();
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const { syncNotifications, frameworkProgress, stats, criticalGaps, domainProgress, allControls, allDomains, getResponse: _getResponse, evidenceFileCounts: _evidenceFileCounts } = compliance;

  // Use actual user ID from auth, fallback for offline/development mode
  const currentUserId = user?.id || 'anonymous-user';
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<ComplianceDomainMeta | undefined>();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Modal states for new features
  const [showMonitoringDashboard, setShowMonitoringDashboard] = useState(false);
  const [showAlertConfiguration, setShowAlertConfiguration] = useState(false);
  const [showCloudVerification, setShowCloudVerification] = useState(false);

  // Control detail drawer state (will be used when ControlDetailDrawer is wired up)
  const [_selectedControlId, setSelectedControlId] = useState<string | null>(null);
  const [recentControls, setRecentControls] = useState<string[]>(() => {
    // Load from localStorage
    const stored = localStorage.getItem('recentControls');
    return stored ? JSON.parse(stored) : [];
  });

  // Track recent controls
  const handleSelectControl = useCallback((controlId: string) => {
    setSelectedControlId(controlId);
    setRecentControls(prev => {
      const filtered = prev.filter(id => id !== controlId);
      const updated = [controlId, ...filtered].slice(0, 10); // Keep last 10
      localStorage.setItem('recentControls', JSON.stringify(updated));
      return updated;
    });
    // Switch to assessment tab if not already there
    setActiveTab('assessment');
  }, []);

  // Prepare controls and domains for command palette
  const searchableControls = useMemo(() =>
    allControls.map(c => ({
      id: c.id,
      domain: c.domain,
      title: c.title,
      description: c.description,
      keywords: c.keywords || [],
      riskLevel: c.riskLevel,
    })), [allControls]);

  const searchableDomains = useMemo(() =>
    allDomains.map(d => ({
      id: d.id,
      title: d.title,
      color: d.color,
      controlCount: allControls.filter(c => c.domain === d.id).length,
    })), [allDomains, allControls]);

  // Command palette for quick navigation
  const { isOpen: commandPaletteOpen, setIsOpen: setCommandPaletteOpen, commands } = useCommandPalette({
    onNavigate: (tab) => setActiveTab(tab as TabId),
    onToggleTheme: () => {
      const isDark = document.documentElement.classList.contains('dark');
      document.documentElement.classList.toggle('dark', !isDark);
      localStorage.setItem('compliance_dark_mode', (!isDark).toString());
    },
    onSignOut: () => {
      // Will be handled by auth context
      window.location.href = '/';
    },
    controls: searchableControls,
    domains: searchableDomains,
    onSelectControl: handleSelectControl,
    onFilterDomain: (domainId) => {
      const domain = allDomains.find(d => d.id === domainId);
      if (domain) {
        setSelectedDomain(domain);
        setActiveTab('assessment');
      }
    },
    recentControls,
  });

  // Get alert counts from monitoring service
  const [alertCounts, setAlertCounts] = useState(0);

  // Update alert counts when tab changes or when monitoring service updates
  useEffect(() => {
    const updateAlertCounts = () => {
      const counts = monitoringService.getAlertCounts();
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      setAlertCounts(total);
    };

    updateAlertCounts();
    return monitoringService.subscribe(updateAlertCounts);
  }, []);

  // Prepare data for monitoring dashboard
  const currentScore = stats.assessmentPercentage;
  const frameworkScores = useMemo(() => {
    const scores: Record<string, number> = {};
    frameworkProgress.forEach(fw => { scores[fw.id] = fw.percentage; });
    return scores;
  }, [frameworkProgress]);

  const domainScores = useMemo(() => {
    const scores: Record<string, number> = {};
    domainProgress.forEach(d => { scores[d.id] = d.percentage; });
    return scores;
  }, [domainProgress]);

  const criticalGapIds = useMemo(() => criticalGaps.map(g => g.id), [criticalGaps]);

  const handleNavigate = (tab: TabId, domain?: ComplianceDomainMeta) => {
    setActiveTab(tab);
    if (domain) setSelectedDomain(domain);
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setSelectedIncident(null);
  };

  return (
    <div className="min-h-screen transition-colors duration-200">
      {/* Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commands}
        placeholder="Search controls, domains, or commands..."
      />

      {/* Command Center Sidebar */}
      <CommandSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        incidentCount={ir.stats.activeIncidents}
        alertCount={alertCounts}
        syncCount={syncNotifications.length}
        onSyncClick={() => setShowSidebar(!showSidebar)}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        organizationName={currentOrg?.name}
        organizationLogo={currentOrg?.logoUrl}
        primaryColor={currentOrg?.primaryColor}
      />

      {/* Main Content */}
      <main className={`transition-all duration-200 ${sidebarExpanded ? 'ml-56' : 'ml-16'}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <DashboardTab onNavigate={handleNavigate} />
              </motion.div>
            )}
            {activeTab === 'assessment' && (
              <motion.div key="assessment" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <AssessmentTab initialDomain={selectedDomain} />
              </motion.div>
            )}
            {activeTab === 'incidents' && (
              <motion.div key="incidents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {selectedIncident ? <IncidentDetail incident={selectedIncident} compliance={compliance} ir={ir} onBack={() => setSelectedIncident(null)} /> : <IncidentDashboard compliance={compliance} ir={ir} onSelectIncident={setSelectedIncident} />}
              </motion.div>
            )}
            {activeTab === 'reporting' && (
              <motion.div key="reporting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <ReportAnalyticsCenter compliance={compliance} ir={ir} />
              </motion.div>
            )}
            {activeTab === 'evidence' && (
              <motion.div key="evidence" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {currentOrg?.id ? (
                  <EvidenceRepository
                    organizationId={currentOrg.id}
                    userId={currentUserId}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FolderOpen className="w-12 h-12 text-slate-300 dark:text-steel-600 mb-4" />
                    <p className="text-slate-500 dark:text-steel-400">Please select an organization to view evidence</p>
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'integrations' && (
              <motion.div key="integrations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {currentOrg?.id ? (
                  <IntegrationHub
                    organizationId={currentOrg.id}
                    userId={currentUserId}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="text-6xl mb-4">🏢</div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Organization Required</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Please set up your organization to access integrations.</p>
                    <button
                      onClick={() => setActiveTab('admin')}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Set Up Organization
                    </button>
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'vendors' && (
              <motion.div key="vendors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {currentOrg?.id ? (
                  <TPRMCenter
                    organizationId={currentOrg.id}
                    userId={currentUserId}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="text-6xl mb-4">🏢</div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Organization Required</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Please set up your organization to access vendor management.</p>
                    <button
                      onClick={() => setActiveTab('admin')}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Set Up Organization
                    </button>
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'questionnaires' && (
              <motion.div key="questionnaires" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {currentOrg?.id ? (
                  <QuestionnaireAutomation
                    organizationId={currentOrg.id}
                    userId={currentUserId}
                    userEmail={user?.email || ''}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="text-6xl mb-4">🏢</div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Organization Required</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Please set up your organization to access security questionnaires.</p>
                    <button
                      onClick={() => setActiveTab('admin')}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Set Up Organization
                    </button>
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'admin' && (
              <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {currentOrg?.id ? (
                  <TenantAdmin
                    tenantId={currentOrg.id}
                    userId={currentUserId}
                    userRole={currentOrg.role || 'member'}
                  />
                ) : (
                  <OrganizationSetup isOpen={true} onComplete={() => window.location.reload()} />
                )}
              </motion.div>
            )}
            {activeTab === 'trust-center' && (
              <motion.div key="trust-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <TrustCenter
                  compliance={compliance}
                  organizationName={currentOrg?.name || 'LYDELL SECURITY'}
                  organizationLogo={currentOrg?.logoUrl}
                  primaryColor={currentOrg?.primaryColor}
                  contactEmail={currentOrg?.contactEmail}
                />
              </motion.div>
            )}
            {activeTab === 'certificate' && (
              <motion.div key="certificate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <CertificateGenerator
                  compliance={compliance}
                  organizationName={currentOrg?.name || 'LYDELL SECURITY'}
                  organizationLogo={currentOrg?.logoUrl}
                />
                <div className="mt-6">
                  <AuditBundle compliance={compliance} />
                </div>
              </motion.div>
            )}
            {activeTab === 'verify' && (
              <motion.div key="verify" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <AuditorVerification />
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <Settings
                  onOpenMonitoringDashboard={() => setShowMonitoringDashboard(true)}
                  onOpenAlertConfiguration={() => setShowAlertConfiguration(true)}
                  onOpenCloudVerification={() => setShowCloudVerification(true)}
                  onOpenAdmin={() => setActiveTab('admin')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Sync Activity Sidebar */}
      <SyncActivitySidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />

      {/* Monitoring Dashboard Modal */}
      <MonitoringDashboard
        isOpen={showMonitoringDashboard}
        onClose={() => setShowMonitoringDashboard(false)}
        currentScore={currentScore}
        frameworkScores={frameworkScores}
        domainScores={domainScores}
        criticalGaps={criticalGapIds}
        onOpenSettings={() => {
          setShowMonitoringDashboard(false);
          setShowAlertConfiguration(true);
        }}
      />

      {/* Alert Configuration Modal */}
      <AlertConfiguration
        isOpen={showAlertConfiguration}
        onClose={() => setShowAlertConfiguration(false)}
      />

      {/* Cloud Verification Modal */}
      <CloudVerification
        isOpen={showCloudVerification}
        onClose={() => setShowCloudVerification(false)}
      />
    </div>
  );
};

const App: React.FC = () => <ComplianceProvider><AppContent /></ComplianceProvider>;

export { SlideOverDrawer };
export default App;
