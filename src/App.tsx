/**
 * Modular Compliance Engine - Command Center Design
 * High-Trust Corporate/Enterprise GRC Platform
 * Midnight & Steel Theme
 */

import React, { useState, useMemo, createContext, useContext, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ClipboardCheck, FolderOpen, Building2, Search, Check, X, Plus,
  Info, AlertTriangle, Shield, Upload, FileText, Lock, Users,
  Server, Database, Eye, Settings as SettingsIcon, RefreshCw, CheckCircle2, Target, Activity,
  Download, AlertCircle, ChevronDown, Save, Briefcase, Wrench, Globe, ExternalLink,
  Award, ShieldCheck, ChevronRight, Menu, Sparkles, Plug, ShoppingBag, Crown,
} from 'lucide-react';

import { useCompliance, type UseComplianceReturn, useIncidentResponse } from './hooks';
import { FRAMEWORKS, type MasterControl, type ComplianceDomainMeta, type FrameworkId } from './constants/controls';
import IncidentDashboard from './components/IncidentDashboard';
import IncidentDetail from './components/IncidentDetail';
import ClientReporting from './components/ClientReporting';
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
import VendorRiskManagement from './components/VendorRiskManagement';
import QuestionnaireAutomation from './components/QuestionnaireAutomation';
import OrganizationSetup from './components/OrganizationSetup';
import FrameworkRequirementsView from './components/FrameworkRequirementsView';
import RequirementAssessmentWizard from './components/RequirementAssessmentWizard';
import { monitoringService } from './services/continuous-monitoring.service';
import type { Incident } from './types/incident.types';
import { useOrganization } from './contexts/OrganizationContext';
import { useAuth } from './hooks/useAuth';
import { CommandPalette, useCommandPalette } from './components/ui';

type TabId = 'dashboard' | 'assessment' | 'incidents' | 'reporting' | 'evidence' | 'integrations' | 'vendors' | 'questionnaires' | 'trust-center' | 'certificate' | 'verify' | 'company' | 'admin' | 'settings';

// ============================================================================
// CONTEXT
// ============================================================================

const ComplianceContext = createContext<UseComplianceReturn | null>(null);
const useComplianceContext = () => {
  const ctx = useContext(ComplianceContext);
  if (!ctx) throw new Error('useComplianceContext must be used within ComplianceProvider');
  return ctx;
};

const ComplianceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const compliance = useCompliance();
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

const ProtocolCard: React.FC<{ control: MasterControl; onOpenRemediation?: (controlId: string, controlTitle: string) => void }> = ({ control, onOpenRemediation }) => {
  const { answerControl, getResponse, updateRemediation, getEvidenceByControlId } = useComplianceContext();
  const [showInfo, setShowInfo] = useState(false);
  const [localRemediation, setLocalRemediation] = useState('');
  const [showAIChat, setShowAIChat] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const response = getResponse(control.id);
  const evidence = getEvidenceByControlId(control.id);

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
      className={`protocol-card ${riskIndicatorClass}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-200 dark:bg-steel-800 text-secondary rounded">
              {control.id}
            </span>
            {evidence && (
              <span className="px-2 py-0.5 text-[10px] font-mono bg-status-success/10 text-status-success border border-status-success/20" title="Evidence ID">
                {evidence.id.slice(0, 12)}...
              </span>
            )}
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
  const { frameworkProgress, stats, criticalGaps, domainProgress, allDomains } = useComplianceContext();

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
          <p className="text-slate-500 dark:text-steel-400 mt-1">{stats.totalControls} controls across 4 frameworks</p>
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
        {/* Overall Compliance Score - Large Card */}
        <motion.div
          className="col-span-12 lg:col-span-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <Card className="p-6 h-full">
            <h2 className="text-sm font-medium text-slate-500 dark:text-steel-400 uppercase tracking-wide mb-6">Overall Compliance</h2>
            <div className="flex justify-center mb-6">
              <CircularGauge
                percentage={stats.assessmentPercentage}
                size={140}
                strokeWidth={4}
                color="#4f46e5"
                label="Assessed"
                count={`${stats.answeredControls}/${stats.totalControls} controls`}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-auto">
              <div className="p-4 bg-emerald-50 dark:bg-status-success/10 rounded-lg">
                <div className="text-2xl font-semibold text-emerald-600 dark:text-status-success tracking-tight">{stats.compliantControls}</div>
                <div className="text-xs font-medium text-emerald-600/70 dark:text-status-success/70 uppercase tracking-wide mt-1">Compliant</div>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-status-warning/10 rounded-lg">
                <div className="text-2xl font-semibold text-amber-600 dark:text-status-warning tracking-tight">{stats.remainingControls}</div>
                <div className="text-xs font-medium text-amber-600/70 dark:text-status-warning/70 uppercase tracking-wide mt-1">Remaining</div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Framework Progress - Side by Side Cards */}
        <motion.div
          className="col-span-12 lg:col-span-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <Card className="p-6 h-full">
            <h2 className="text-sm font-medium text-slate-500 dark:text-steel-400 uppercase tracking-wide mb-6">Framework Progress</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {frameworkProgress.map((fw, i) => (
                <motion.div
                  key={fw.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.2 }}
                  className="flex flex-col items-center"
                >
                  <CircularGauge
                    percentage={fw.percentage}
                    size={88}
                    strokeWidth={3}
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
  const { allDomains, domainProgress, getControlsByDomain, allControls, getResponse } = useComplianceContext();
  const [activeDomain, setActiveDomain] = useState<ComplianceDomainMeta>(initialDomain || allDomains[0]);
  const [search, setSearch] = useState('');
  const [selectedFramework, setSelectedFramework] = useState<FrameworkId | 'all'>('all');
  const [showFrameworkDropdown, setShowFrameworkDropdown] = useState(false);
  const [remediationControl, setRemediationControl] = useState<{ id: string; title: string } | null>(null);
  const [viewMode, setViewMode] = useState<'controls' | 'requirements'>('controls');
  const [showRequirementWizard, setShowRequirementWizard] = useState(false);

  // Helper function to get control answer for FrameworkRequirementsView
  const getControlAnswer = (controlId: string) => {
    const response = getResponse(controlId);
    return response?.answer || null;
  };

  const controls = useMemo(() => {
    let filtered = allControls;

    // Filter by framework first if selected
    if (selectedFramework !== 'all') {
      filtered = filtered.filter(c =>
        c.frameworkMappings.some(m => m.frameworkId === selectedFramework)
      );
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

    // If framework is selected, show all controls for that framework (not filtered by domain)
    if (selectedFramework !== 'all') {
      return filtered;
    }

    return getControlsByDomain(activeDomain.id as string);
  }, [activeDomain.id, search, selectedFramework, allControls, getControlsByDomain]);

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

  return (
    <motion.div
      className="flex gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Domain Sidebar - Compliance Journey */}
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

          {/* Requirement Assessment Wizard Button */}
          <button
            onClick={() => setShowRequirementWizard(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent hover:from-indigo-600 hover:to-purple-600 transition-all shadow-sm"
          >
            <Target className="w-4 h-4" />
            <span className="text-sm font-medium whitespace-nowrap">Requirement Wizard</span>
          </button>
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

            {/* View Mode Toggle */}
            <div className="flex gap-2 p-1 bg-white/50 dark:bg-steel-800/50 rounded-lg w-fit">
              <button
                onClick={() => setViewMode('controls')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  viewMode === 'controls'
                    ? 'bg-white dark:bg-steel-700 text-slate-900 dark:text-steel-100 shadow-sm'
                    : 'text-slate-600 dark:text-steel-400 hover:text-slate-800 dark:hover:text-steel-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  Controls View
                </span>
              </button>
              <button
                onClick={() => setViewMode('requirements')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  viewMode === 'requirements'
                    ? 'bg-white dark:bg-steel-700 text-slate-900 dark:text-steel-100 shadow-sm'
                    : 'text-slate-600 dark:text-steel-400 hover:text-slate-800 dark:hover:text-steel-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Requirements View
                </span>
              </button>
            </div>

            {viewMode === 'controls' && (
              <p className="text-xs text-slate-500 dark:text-steel-500 mt-2">
                {controls.length} controls mapped to this framework
              </p>
            )}
          </div>
        )}

        {/* Domain Header */}
        {!search && !selectedFrameworkMeta && currentDomainProgress && (
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

        {/* Search Results Info */}
        {search && (
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

        {/* Controls List */}
        {(selectedFramework === 'all' || viewMode === 'controls') && (
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
            ) : (
              controls.map((control, i) => (
                <motion.div
                  key={control.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <ProtocolCard control={control} onOpenRemediation={handleOpenRemediation} />
                </motion.div>
              ))
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

// ============================================================================
// EVIDENCE TAB
// ============================================================================

const EvidenceTab: React.FC = () => {
  const { getAllEvidence, updateEvidence, getControlById } = useComplianceContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'review' | 'final'>('all');
  const saveTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const allEvidence = getAllEvidence();

  const filteredEvidence = useMemo(() => {
    let result = allEvidence;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e => {
        const control = getControlById(e.controlId);
        return e.controlId.toLowerCase().includes(q) || control?.title.toLowerCase().includes(q) || e.notes.toLowerCase().includes(q);
      });
    }
    if (statusFilter !== 'all') result = result.filter(e => e.status === statusFilter);
    return result;
  }, [allEvidence, search, statusFilter, getControlById]);

  const handleNotesChange = (evidenceId: string, notes: string) => {
    clearTimeout(saveTimeoutRef.current[evidenceId]);
    saveTimeoutRef.current[evidenceId] = setTimeout(() => updateEvidence(evidenceId, { notes }), 300);
  };

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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-steel-100">Evidence Repository</h1>
          <p className="text-slate-500 dark:text-steel-400 mt-1">Manage audit documentation and evidence</p>
        </div>
        <div className="badge-success">
          {allEvidence.length} Records
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-steel-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search evidence..."
            className="input-search w-full"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            className="input appearance-none pr-10"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="final">Final</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-steel-500 pointer-events-none" />
        </div>
      </div>

      {/* Evidence Table */}
      {allEvidence.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-steel-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-slate-400 dark:text-steel-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100 mb-2 tracking-tight">No Evidence Yet</h3>
          <p className="text-slate-500 dark:text-steel-400">Complete controls with "Yes" to generate evidence records</p>
        </Card>
      ) : filteredEvidence.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="w-12 h-12 bg-slate-100 dark:bg-steel-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-slate-400 dark:text-steel-500" />
          </div>
          <p className="text-slate-500 dark:text-steel-400">No evidence matches your search</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-steel-800">
                <th className="table-header">Control</th>
                <th className="table-header">Evidence ID</th>
                <th className="table-header w-28">Status</th>
                <th className="table-header">Notes</th>
                <th className="table-header w-32">Policy</th>
                <th className="table-header w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvidence.map(entry => {
                const control = getControlById(entry.controlId);
                const policyUrl = entry.fileUrls && entry.fileUrls.length > 0 ? entry.fileUrls.find(url => url.includes('policy')) || entry.fileUrls[0] : null;
                return (
                  <tr key={entry.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs font-mono bg-slate-100 dark:bg-steel-800 text-slate-600 dark:text-steel-300 rounded-md">{entry.controlId}</span>
                        <span className="text-sm text-slate-700 dark:text-steel-200 font-medium truncate max-w-[200px]">{control?.title || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="px-2 py-1 text-xs font-mono bg-emerald-50 dark:bg-status-success/10 text-emerald-600 dark:text-status-success rounded-md">{entry.id.slice(0, 16)}...</span>
                    </td>
                    <td className="table-cell">
                      <select
                        value={entry.status}
                        onChange={e => updateEvidence(entry.id, { status: e.target.value as 'draft' | 'review' | 'final' })}
                        className="px-2.5 py-1.5 text-xs bg-white dark:bg-transparent border border-slate-200 dark:border-steel-700 text-slate-600 dark:text-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="draft">Draft</option>
                        <option value="review">Review</option>
                        <option value="final">Final</option>
                      </select>
                    </td>
                    <td className="table-cell">
                      <input
                        type="text"
                        defaultValue={entry.notes}
                        onChange={e => handleNotesChange(entry.id, e.target.value)}
                        placeholder="Add notes..."
                        className="w-full px-3 py-1.5 text-sm bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-steel-700 focus:border-indigo-500 text-slate-600 dark:text-steel-300 focus:outline-none transition-colors rounded-lg"
                      />
                    </td>
                    <td className="table-cell">
                      {policyUrl ? (
                        <a
                          href={policyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 dark:bg-accent-500/10 text-indigo-600 dark:text-accent-400 text-xs font-medium rounded-md hover:bg-indigo-100 dark:hover:bg-accent-500/20 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View PDF
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-steel-600">No policy</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <button className="p-2 text-slate-400 dark:text-steel-500 hover:text-indigo-600 dark:hover:text-accent-400 hover:bg-indigo-50 dark:hover:bg-accent-500/10 rounded-lg transition-colors" title="Upload file">
                        <Upload className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </motion.div>
  );
};

// ============================================================================
// COMPANY TAB
// ============================================================================

const CompanyTab: React.FC = () => {
  const { customControls, addCustomControl, deleteCustomControl } = useComplianceContext();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', question: '', riskLevel: 'medium' as 'low' | 'medium' | 'high' | 'critical' });
  const [selectedFrameworks, setSelectedFrameworks] = useState<FrameworkId[]>([]);
  const [clauseInputs, setClauseInputs] = useState<Record<FrameworkId, string>>({ SOC2: '', ISO27001: '', HIPAA: '', NIST: '', PCIDSS: '', GDPR: '' });

  const currentUserId = user?.id || 'anonymous-user';

  const toggleFramework = (fwId: FrameworkId) => setSelectedFrameworks(prev => prev.includes(fwId) ? prev.filter(f => f !== fwId) : [...prev, fwId]);
  const resetForm = () => { setForm({ title: '', description: '', question: '', riskLevel: 'medium' }); setSelectedFrameworks([]); setClauseInputs({ SOC2: '', ISO27001: '', HIPAA: '', NIST: '', PCIDSS: '', GDPR: '' }); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title && form.description) {
      const mappings = selectedFrameworks.filter(fwId => clauseInputs[fwId].trim()).map(fwId => ({ id: '', frameworkId: fwId, clauseId: clauseInputs[fwId].trim(), clauseTitle: 'Custom mapping', controlId: null, customControlId: null }));
      addCustomControl({ title: form.title, description: form.description, question: form.question || `Is ${form.title} implemented?`, category: 'company_specific', frameworkMappings: mappings, riskLevel: form.riskLevel, createdBy: currentUserId });
      resetForm(); setShowModal(false);
    }
  };

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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-steel-100">Custom Controls</h1>
          <p className="text-slate-500 dark:text-steel-400 mt-1">Organization-specific compliance requirements</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add Control
        </button>
      </div>

      {/* Controls Grid */}
      {customControls.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-steel-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-slate-400 dark:text-steel-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100 mb-2 tracking-tight">No Custom Controls</h3>
          <p className="text-slate-500 dark:text-steel-400 mb-4">Create controls specific to your organization</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {customControls.map(c => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-xs font-mono bg-indigo-50 dark:bg-accent-500/10 text-indigo-600 dark:text-accent-400 rounded-md">{c.id}</span>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md">CUSTOM</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-steel-100 mb-1 tracking-tight">{c.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-steel-400 mb-3">{c.description}</p>
                    {c.frameworkMappings.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {c.frameworkMappings.map((m, i) => {
                          const color = FRAMEWORK_COLORS[m.frameworkId] || '#6366f1';
                          return (
                            <span
                              key={i}
                              className="px-2 py-1 text-xs font-medium rounded-md"
                              style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}25` }}
                            >
                              {m.frameworkId} {m.clauseId}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteCustomControl(c.id)}
                    className="p-2 text-slate-400 dark:text-steel-500 hover:text-rose-600 dark:hover:text-status-risk hover:bg-rose-50 dark:hover:bg-status-risk/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            </motion.div>
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
            className="modal-backdrop flex items-center justify-center p-4"
            onClick={() => { setShowModal(false); resetForm(); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="modal-content w-full max-w-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5 border-b border-slate-200 dark:border-steel-700">
                <h2 className="text-lg font-bold text-primary tracking-tight">Create Custom Control</h2>
                <p className="text-sm text-secondary">Add organization-specific requirements</p>
              </div>
              <form onSubmit={submit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Control Name *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    className="input"
                    placeholder="e.g., Weekly Security Standups"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Description *</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    className="input resize-none"
                    rows={2}
                    placeholder="Describe what this control does..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Assessment Question</label>
                  <input
                    type="text"
                    value={form.question}
                    onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                    className="input"
                    placeholder="e.g., Are weekly security standups conducted?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Risk Level</label>
                  <select
                    value={form.riskLevel}
                    onChange={e => setForm(p => ({ ...p, riskLevel: e.target.value as typeof form.riskLevel }))}
                    className="input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="p-4 bg-slate-100 dark:bg-midnight-900 border border-slate-200 dark:border-steel-800 rounded-lg">
                  <label className="block text-sm font-medium text-secondary mb-3">Framework Mapping</label>
                  <div className="space-y-3">
                    {FRAMEWORKS.map(fw => {
                      const isSelected = selectedFrameworks.includes(fw.id);
                      const color = FRAMEWORK_COLORS[fw.id] || '#6366f1';
                      return (
                        <div key={fw.id} className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleFramework(fw.id)}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-all ${isSelected ? '' : 'border-slate-300 dark:border-steel-700 hover:border-slate-400 dark:hover:border-steel-600'}`}
                            style={isSelected ? { borderColor: color, backgroundColor: `${color}10`, color } : undefined}
                          >
                            <div
                              className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? '' : 'border-slate-400 dark:border-steel-600'}`}
                              style={isSelected ? { borderColor: color, backgroundColor: color } : undefined}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm font-medium ${isSelected ? '' : 'text-secondary'}`}>{fw.name}</span>
                          </button>
                          {isSelected && (
                            <input
                              type="text"
                              value={clauseInputs[fw.id]}
                              onChange={e => setClauseInputs(p => ({ ...p, [fw.id]: e.target.value }))}
                              placeholder={`${fw.id} Clause ID`}
                              className="input flex-1"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Create Control
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

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
    { id: 'company', label: 'Company', icon: <Building2 className="w-5 h-5" /> },
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
  const { syncNotifications, frameworkProgress, stats, criticalGaps, domainProgress } = compliance;

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
        placeholder="Search commands... (navigation, actions, settings)"
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
                <ClientReporting compliance={compliance} ir={ir} />
              </motion.div>
            )}
            {activeTab === 'evidence' && (
              <motion.div key="evidence" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <EvidenceTab />
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
                  <VendorRiskManagement
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
            {activeTab === 'company' && (
              <motion.div key="company" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <CompanyTab />
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
