/**
 * Client Reporting Component
 * 
 * Generate and manage compliance reports for clients.
 * Supports multiple report types and export formats.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, Plus, Building2, Target,
  AlertTriangle, BarChart3, TrendingUp, Eye, X,
} from 'lucide-react';
import type { UseComplianceReturn } from '../hooks/useCompliance';
import type { UseIncidentResponseReturn } from '../hooks/useIncidentResponse';
import type { ClientEngagement, ComplianceReport } from '../types/incident.types';
import type { FrameworkId } from '../constants/controls';

// ============================================================================
// CONSTANTS
// ============================================================================

const FRAMEWORK_CONFIG: Record<FrameworkId, { name: string; color: string }> = {
  SOC2: { name: 'SOC 2 Type II', color: '#0066FF' },
  ISO27001: { name: 'ISO 27001:2022', color: '#059669' },
  HIPAA: { name: 'HIPAA Security', color: '#7C3AED' },
  NIST: { name: 'NIST CSF 2.0', color: '#D97706' },
};

const REPORT_TYPES = [
  { id: 'executive_summary', label: 'Executive Summary', description: 'High-level overview for leadership', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'detailed_assessment', label: 'Detailed Assessment', description: 'Comprehensive control-by-control analysis', icon: <FileText className="w-5 h-5" /> },
  { id: 'gap_analysis', label: 'Gap Analysis', description: 'Focus on compliance gaps and remediation', icon: <Target className="w-5 h-5" /> },
  { id: 'incident_report', label: 'Incident Report', description: 'Post-incident findings and recommendations', icon: <AlertTriangle className="w-5 h-5" /> },
  { id: 'remediation_status', label: 'Remediation Status', description: 'Progress on addressing identified gaps', icon: <TrendingUp className="w-5 h-5" /> },
] as const;

const INDUSTRIES = [
  'Healthcare',
  'Financial Services',
  'Technology',
  'Manufacturing',
  'Retail',
  'Government',
  'Education',
  'Energy',
  'Other',
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`card ${className}`}>
    {children}
  </div>
);

const ScoreGauge: React.FC<{ score: number; size?: number }> = ({ score, size = 120 }) => {
  const radius = (size - 16) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return '#10B981';
    if (s >= 60) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={8}
          className="text-steel-700 dark:text-steel-700 light:text-slate-200"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-primary">{score}</span>
        <span className="text-xs text-secondary">/ 100</span>
      </div>
    </div>
  );
};

const EngagementCard: React.FC<{
  engagement: ClientEngagement;
  onSelect: () => void;
  isSelected: boolean;
}> = ({ engagement, onSelect, isSelected }) => (
  <button
    onClick={onSelect}
    className={`w-full text-left p-4 rounded-xl border transition-all ${
      isSelected
        ? 'bg-accent-500/10 border-accent-500/30 ring-2 ring-accent-500/20'
        : 'card-bg border-steel-700 dark:border-steel-700 light:border-slate-200 hover:border-accent-500/30'
    }`}
  >
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg ${isSelected ? 'bg-accent-500/20' : 'bg-steel-800 dark:bg-steel-800 light:bg-slate-100'}`}>
        <Building2 className={`w-5 h-5 ${isSelected ? 'text-accent-400' : 'text-steel-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-primary truncate">{engagement.clientName}</h4>
        <p className="text-sm text-secondary">{engagement.clientIndustry}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {engagement.frameworksInScope.map(fw => (
            <span
              key={fw}
              className="px-2 py-0.5 text-[10px] font-medium rounded"
              style={{
                backgroundColor: `${FRAMEWORK_CONFIG[fw].color}15`,
                color: FRAMEWORK_CONFIG[fw].color,
              }}
            >
              {fw}
            </span>
          ))}
        </div>
      </div>
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
        engagement.status === 'active'
          ? 'bg-status-success/10 text-status-success'
          : 'bg-steel-800 dark:bg-steel-700 light:bg-slate-100 text-steel-400'
      }`}>
        {engagement.status}
      </span>
    </div>
  </button>
);

const ReportCard: React.FC<{
  report: ComplianceReport;
  onView: () => void;
  onDownload: () => void;
}> = ({ report, onView, onDownload }) => (
  <div className="p-4 rounded-xl bg-steel-800 dark:bg-steel-800 light:bg-slate-50 border border-steel-700 dark:border-steel-700 light:border-slate-200">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h4 className="font-medium text-primary">{report.title}</h4>
        <p className="text-xs text-secondary">
          Generated {new Date(report.generatedAt).toLocaleDateString()}
        </p>
      </div>
      <ScoreGauge score={report.overallScore} size={60} />
    </div>

    <div className="flex flex-wrap gap-1 mb-3">
      {report.frameworkScores.map(fs => (
        <span
          key={fs.frameworkId}
          className="px-2 py-0.5 text-[10px] font-medium rounded"
          style={{
            backgroundColor: `${FRAMEWORK_CONFIG[fs.frameworkId].color}15`,
            color: FRAMEWORK_CONFIG[fs.frameworkId].color,
          }}
        >
          {fs.frameworkId}: {fs.score}%
        </span>
      ))}
    </div>

    <div className="flex gap-2">
      <button
        onClick={onView}
        className="btn-ghost flex-1"
      >
        <Eye className="w-4 h-4" />
        View
      </button>
      <button
        onClick={onDownload}
        className="btn-primary flex-1"
      >
        <Download className="w-4 h-4" />
        Export
      </button>
    </div>
  </div>
);

// ============================================================================
// CREATE ENGAGEMENT MODAL
// ============================================================================

const CreateEngagementModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: Omit<ClientEngagement, 'id' | 'createdAt' | 'updatedAt'>) => void;
}> = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    clientName: '',
    clientIndustry: 'Technology',
    engagementType: 'assessment' as ClientEngagement['engagementType'],
    frameworksInScope: [] as FrameworkId[],
    domainsInScope: [] as string[],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'active' as ClientEngagement['status'],
    primaryContact: '',
    contacts: [],
    incidentIds: [],
    assessmentIds: [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      ...formData,
      endDate: formData.endDate || null,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-backdrop flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="modal-content w-full max-w-lg"
        >
          <div className="p-6 border-b border-steel-700 dark:border-steel-700 light:border-slate-200">
            <h2 className="text-xl font-bold text-primary">New Client Engagement</h2>
            <p className="text-sm text-secondary">Set up a new compliance engagement</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Client Name *
              </label>
              <input
                type="text"
                required
                value={formData.clientName}
                onChange={e => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                className="input"
                placeholder="Acme Corporation"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Industry
                </label>
                <select
                  value={formData.clientIndustry}
                  onChange={e => setFormData(prev => ({ ...prev, clientIndustry: e.target.value }))}
                  className="input"
                >
                  {INDUSTRIES.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Engagement Type
                </label>
                <select
                  value={formData.engagementType}
                  onChange={e => setFormData(prev => ({ ...prev, engagementType: e.target.value as ClientEngagement['engagementType'] }))}
                  className="input"
                >
                  <option value="assessment">Assessment</option>
                  <option value="incident_response">Incident Response</option>
                  <option value="retainer">Retainer</option>
                  <option value="audit_prep">Audit Prep</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Frameworks in Scope
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(FRAMEWORK_CONFIG) as FrameworkId[]).map(fw => (
                  <button
                    key={fw}
                    type="button"
                    onClick={() => {
                      const inScope = formData.frameworksInScope.includes(fw);
                      setFormData(prev => ({
                        ...prev,
                        frameworksInScope: inScope
                          ? prev.frameworksInScope.filter(f => f !== fw)
                          : [...prev.frameworksInScope, fw],
                      }));
                    }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                      formData.frameworksInScope.includes(fw)
                        ? 'text-white border-transparent'
                        : 'border-steel-700 dark:border-steel-700 light:border-slate-200 hover:border-accent-500'
                    }`}
                    style={{
                      backgroundColor: formData.frameworksInScope.includes(fw)
                        ? FRAMEWORK_CONFIG[fw].color
                        : undefined,
                      color: formData.frameworksInScope.includes(fw)
                        ? 'white'
                        : FRAMEWORK_CONFIG[fw].color,
                    }}
                  >
                    {fw}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Primary Contact
                </label>
                <input
                  type="text"
                  value={formData.primaryContact}
                  onChange={e => setFormData(prev => ({ ...prev, primaryContact: e.target.value }))}
                  className="input"
                  placeholder="Contact name"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-steel-700 dark:border-steel-700 light:border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Create Engagement
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================================
// REPORT PREVIEW MODAL
// ============================================================================

const ReportPreviewModal: React.FC<{
  report: ComplianceReport | null;
  onClose: () => void;
  onExport: (report: ComplianceReport) => void;
}> = ({ report, onClose, onExport }) => {
  if (!report) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-backdrop flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="modal-content w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Modal Header */}
          <div className="p-6 border-b border-steel-700 dark:border-steel-700 light:border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-primary">{report.title}</h2>
              <p className="text-sm text-secondary">
                Generated {new Date(report.generatedAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onExport(report)}
                className="btn-primary"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-steel-800 dark:hover:bg-steel-800 light:hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-steel-400" />
              </button>
            </div>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Overall Score */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div
                  className="w-32 h-32 rounded-full border-8 flex flex-col items-center justify-center mx-auto mb-3"
                  style={{ borderColor: getScoreColor(report.overallScore) }}
                >
                  <span
                    className="text-4xl font-bold"
                    style={{ color: getScoreColor(report.overallScore) }}
                  >
                    {report.overallScore}
                  </span>
                  <span className="text-xs text-secondary">/ 100</span>
                </div>
                <p className="text-sm font-medium text-secondary">Overall Compliance Score</p>
              </div>
            </div>

            {/* Framework Scores */}
            <div className="bg-steel-800 dark:bg-steel-800 light:bg-slate-50 rounded-xl p-5">
              <h3 className="font-semibold text-primary mb-4">Framework Compliance</h3>
              <div className="overflow-x-auto">
                <table className="data-table w-full">
                  <thead>
                    <tr className="text-left text-xs text-secondary uppercase">
                      <th className="pb-3">Framework</th>
                      <th className="pb-3 text-center">Score</th>
                      <th className="pb-3 text-center">Assessed</th>
                      <th className="pb-3 text-center">Compliant</th>
                      <th className="pb-3 text-center">Gaps</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-steel-700 dark:divide-steel-700 light:divide-slate-200">
                    {report.frameworkScores.map(fs => (
                      <tr key={fs.frameworkId}>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: FRAMEWORK_CONFIG[fs.frameworkId].color }}
                            />
                            <span className="font-medium text-primary">
                              {FRAMEWORK_CONFIG[fs.frameworkId].name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className="font-bold"
                            style={{ color: getScoreColor(fs.score) }}
                          >
                            {fs.score}%
                          </span>
                        </td>
                        <td className="py-3 text-center text-secondary">
                          {fs.controlsAssessed}
                        </td>
                        <td className="py-3 text-center text-status-success">
                          {fs.controlsCompliant}
                        </td>
                        <td className="py-3 text-center text-status-risk">
                          {fs.gaps}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Critical Findings */}
            {report.criticalFindings.length > 0 && (
              <div className="bg-status-risk/10 rounded-xl p-5 border border-status-risk/20">
                <h3 className="font-semibold text-status-risk mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Findings ({report.criticalFindings.length})
                </h3>
                <ul className="space-y-2">
                  {report.criticalFindings.map((finding, index) => (
                    <li
                      key={index}
                      className="text-sm text-status-risk bg-midnight-900 dark:bg-status-risk/5 light:bg-white rounded-lg px-4 py-2"
                    >
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations.length > 0 && (
              <div className="bg-status-success/10 rounded-xl p-5 border border-status-success/20">
                <h3 className="font-semibold text-status-success mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Recommendations ({report.recommendations.length})
                </h3>
                <ul className="space-y-2">
                  {report.recommendations.map((rec, index) => (
                    <li
                      key={index}
                      className="text-sm text-status-success bg-midnight-900 dark:bg-status-success/5 light:bg-white rounded-lg px-4 py-2"
                    >
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Report Metadata */}
            <div className="bg-steel-800 dark:bg-steel-800 light:bg-slate-50 rounded-xl p-5">
              <h3 className="font-semibold text-primary mb-3">Report Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-secondary">Report ID</p>
                  <p className="font-medium text-primary">{report.id}</p>
                </div>
                <div>
                  <p className="text-secondary">Report Type</p>
                  <p className="font-medium text-primary capitalize">
                    {report.reportType.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-secondary">Period Start</p>
                  <p className="font-medium text-primary">
                    {new Date(report.periodStart).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-secondary">Period End</p>
                  <p className="font-medium text-primary">
                    {new Date(report.periodEnd).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ClientReportingProps {
  compliance: UseComplianceReturn;
  ir: UseIncidentResponseReturn;
}

const ClientReporting: React.FC<ClientReportingProps> = ({ compliance, ir }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEngagement, setSelectedEngagement] = useState<ClientEngagement | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<string>('executive_summary');
  const [previewReport, setPreviewReport] = useState<ComplianceReport | null>(null);

  const engagementReports = useMemo(() => {
    if (!selectedEngagement) return [];
    return ir.reports.filter(r => r.engagementId === selectedEngagement.id);
  }, [selectedEngagement, ir.reports]);

  const handleCreateEngagement = (data: Omit<ClientEngagement, 'id' | 'createdAt' | 'updatedAt'>) => {
    const engagement = ir.createEngagement(data);
    setSelectedEngagement(engagement);
  };

  const handleGenerateReport = () => {
    if (!selectedEngagement) return;
    ir.generateReport(
      selectedEngagement.id,
      selectedReportType as ComplianceReport['reportType'],
      compliance
    );
  };

  const handleExportPDF = (report: ComplianceReport) => {
    // Generate PDF export
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups');
      return;
    }

    const frameworkRows = report.frameworkScores.map(fs => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${FRAMEWORK_CONFIG[fs.frameworkId].color}; margin-right: 8px;"></span>
          ${FRAMEWORK_CONFIG[fs.frameworkId].name}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: ${fs.score >= 80 ? '#10B981' : fs.score >= 60 ? '#F59E0B' : '#EF4444'};">${fs.score}%</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${fs.controlsAssessed}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #10B981;">${fs.controlsCompliant}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #EF4444;">${fs.gaps}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${report.title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
          .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #0066FF; }
          .header h1 { font-size: 28px; color: #0f172a; margin-bottom: 8px; }
          .header p { color: #64748b; }
          .logo { font-size: 24px; font-weight: bold; color: #0066FF; margin-bottom: 20px; }
          .score-section { text-align: center; margin: 40px 0; }
          .score-circle { width: 150px; height: 150px; border-radius: 50%; border: 8px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto; }
          .score { font-size: 48px; font-weight: bold; color: ${report.overallScore >= 80 ? '#10B981' : report.overallScore >= 60 ? '#F59E0B' : '#EF4444'}; }
          .section { margin-bottom: 32px; }
          .section h2 { font-size: 18px; color: #334155; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f8fafc; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; }
          .findings { list-style: none; }
          .findings li { padding: 12px; background: #fef2f2; border-radius: 8px; margin-bottom: 8px; color: #991b1b; }
          .recommendations li { padding: 12px; background: #f0fdf4; border-radius: 8px; margin-bottom: 8px; color: #166534; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">LYDELL SECURITY</div>
          <h1>${report.title}</h1>
          <p>Generated on ${new Date(report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p>Period: ${new Date(report.periodStart).toLocaleDateString()} - ${new Date(report.periodEnd).toLocaleDateString()}</p>
        </div>

        <div class="score-section">
          <div class="score-circle">
            <div class="score">${report.overallScore}</div>
            <div style="font-size: 12px; color: #64748b;">Overall Score</div>
          </div>
        </div>

        <div class="section">
          <h2>Framework Compliance</h2>
          <table>
            <thead>
              <tr>
                <th>Framework</th>
                <th style="text-align: center;">Score</th>
                <th style="text-align: center;">Assessed</th>
                <th style="text-align: center;">Compliant</th>
                <th style="text-align: center;">Gaps</th>
              </tr>
            </thead>
            <tbody>
              ${frameworkRows}
            </tbody>
          </table>
        </div>

        ${report.criticalFindings.length > 0 ? `
        <div class="section">
          <h2>Critical Findings</h2>
          <ul class="findings">
            ${report.criticalFindings.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        ${report.recommendations.length > 0 ? `
        <div class="section">
          <h2>Recommendations</h2>
          <ul class="findings recommendations">
            ${report.recommendations.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div class="footer">
          <p>Lydell Security | Compliance Report | Confidential</p>
        </div>

        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleViewReport = (report: ComplianceReport) => {
    setPreviewReport(report);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Client Reporting</h1>
          <p className="page-subtitle">Generate and manage compliance reports</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Engagement
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagements List */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-semibold text-primary mb-4">Client Engagements</h3>
            {ir.engagements.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-steel-600" />
                <p className="text-sm text-secondary">No engagements yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ir.engagements.map(engagement => (
                  <EngagementCard
                    key={engagement.id}
                    engagement={engagement}
                    onSelect={() => setSelectedEngagement(engagement)}
                    isSelected={selectedEngagement?.id === engagement.id}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Report Generation */}
        <div className="lg:col-span-2">
          {!selectedEngagement ? (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-steel-600" />
              <h3 className="text-lg font-semibold text-primary mb-2">
                Select an Engagement
              </h3>
              <p className="text-secondary">
                Choose a client engagement to generate reports
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Engagement Overview */}
              <Card className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-primary">
                      {selectedEngagement.clientName}
                    </h3>
                    <p className="text-sm text-secondary">
                      {selectedEngagement.clientIndustry} • {selectedEngagement.engagementType.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <ScoreGauge score={compliance.stats.assessmentPercentage} size={80} />
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedEngagement.frameworksInScope.map(fw => {
                    const progress = compliance.frameworkProgress.find(fp => fp.id === fw);
                    return (
                      <div
                        key={fw}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{ backgroundColor: `${FRAMEWORK_CONFIG[fw].color}10` }}
                      >
                        <span className="text-sm font-medium" style={{ color: FRAMEWORK_CONFIG[fw].color }}>
                          {fw}
                        </span>
                        <span className="text-sm font-bold" style={{ color: FRAMEWORK_CONFIG[fw].color }}>
                          {progress?.percentage || 0}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Generate Report */}
              <Card className="p-5">
                <h4 className="font-semibold text-primary mb-4">Generate New Report</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {REPORT_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedReportType(type.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selectedReportType === type.id
                          ? 'bg-accent-500/10 border-accent-500/30 ring-2 ring-accent-500/20'
                          : 'border-steel-700 dark:border-steel-700 light:border-slate-200 hover:border-accent-500/30'
                      }`}
                    >
                      <div className={`mb-2 ${selectedReportType === type.id ? 'text-accent-400' : 'text-steel-400'}`}>
                        {type.icon}
                      </div>
                      <p className="font-medium text-primary text-sm">{type.label}</p>
                      <p className="text-xs text-secondary mt-1">{type.description}</p>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleGenerateReport}
                  className="btn-primary w-full justify-center"
                >
                  <FileText className="w-4 h-4" />
                  Generate Report
                </button>
              </Card>

              {/* Previous Reports */}
              {engagementReports.length > 0 && (
                <Card className="p-5">
                  <h4 className="font-semibold text-primary mb-4">
                    Previous Reports ({engagementReports.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {engagementReports.map(report => (
                      <ReportCard
                        key={report.id}
                        report={report}
                        onView={() => handleViewReport(report)}
                        onDownload={() => handleExportPDF(report)}
                      />
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Engagement Modal */}
      <CreateEngagementModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateEngagement}
      />

      {/* Report Preview Modal */}
      <ReportPreviewModal
        report={previewReport}
        onClose={() => setPreviewReport(null)}
        onExport={handleExportPDF}
      />
    </div>
  );
};

export default ClientReporting;
