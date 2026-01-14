/**
 * Client Reporting Component
 * 
 * Generate and manage compliance reports for clients.
 * Supports multiple report types and export formats.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, Plus, Building2, Calendar, Shield, Target,
  CheckCircle2, AlertTriangle, BarChart3, PieChart, TrendingUp,
  Mail, ExternalLink, Printer, Filter, Search, ChevronDown, Eye,
} from 'lucide-react';
import type { UseComplianceReturn } from '../hooks/useCompliance';
import type { UseIncidentResponseReturn } from '../hooks/useIncidentResponse';
import type { ClientEngagement, ComplianceReport } from '../types/incident.types';
import type { FrameworkId } from '../constants/controls';

// ============================================================================
// CONSTANTS
// ============================================================================

const FRAMEWORK_CONFIG: Record<FrameworkId, { name: string; color: string; icon: string }> = {
  SOC2: { name: 'SOC 2 Type II', color: '#3B82F6', icon: '🛡️' },
  ISO27001: { name: 'ISO 27001:2022', color: '#10B981', icon: '🌐' },
  HIPAA: { name: 'HIPAA Security', color: '#8B5CF6', icon: '🏥' },
  NIST: { name: 'NIST CSF 2.0', color: '#F59E0B', icon: '🔒' },
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

const GlassPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative rounded-2xl overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-lg ${className}`}>
    {children}
  </div>
);

const ScoreGauge: React.FC<{ score: number; size?: number }> = ({ score, size = 120 }) => {
  const radius = (size - 16) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  
  const getColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
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
          className="text-slate-200 dark:text-white/10"
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
        <span className="text-3xl font-bold text-slate-900 dark:text-white">{score}</span>
        <span className="text-xs text-slate-500 dark:text-white/50">/ 100</span>
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
        ? 'bg-blue-500/10 border-blue-500/30 ring-2 ring-blue-500/20'
        : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-white/10 hover:border-blue-500/30'
    }`}
  >
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-500/20' : 'bg-slate-100 dark:bg-white/5'}`}>
        <Building2 className={`w-5 h-5 ${isSelected ? 'text-blue-500' : 'text-slate-500 dark:text-white/50'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-900 dark:text-white truncate">{engagement.clientName}</h4>
        <p className="text-sm text-slate-500 dark:text-white/50">{engagement.clientIndustry}</p>
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
          ? 'bg-emerald-500/10 text-emerald-500' 
          : 'bg-slate-100 dark:bg-white/10 text-slate-500'
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
  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h4 className="font-medium text-slate-900 dark:text-white">{report.title}</h4>
        <p className="text-xs text-slate-500 dark:text-white/50">
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
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 rounded-lg hover:border-blue-500 transition-colors"
      >
        <Eye className="w-4 h-4" />
        View
      </button>
      <button
        onClick={onDownload}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-slate-200 dark:border-white/10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">New Client Engagement</h2>
            <p className="text-sm text-slate-500 dark:text-white/50">Set up a new compliance engagement</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                required
                value={formData.clientName}
                onChange={e => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                placeholder="Acme Corporation"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-1">
                  Industry
                </label>
                <select
                  value={formData.clientIndustry}
                  onChange={e => setFormData(prev => ({ ...prev, clientIndustry: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                >
                  {INDUSTRIES.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-1">
                  Engagement Type
                </label>
                <select
                  value={formData.engagementType}
                  onChange={e => setFormData(prev => ({ ...prev, engagementType: e.target.value as any }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                >
                  <option value="assessment">Assessment</option>
                  <option value="incident_response">Incident Response</option>
                  <option value="retainer">Retainer</option>
                  <option value="audit_prep">Audit Prep</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-2">
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
                        : 'border-slate-200 dark:border-white/10 hover:border-blue-500'
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
                    {FRAMEWORK_CONFIG[fw].icon} {fw}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-1">
                  Primary Contact
                </label>
                <input
                  type="text"
                  value={formData.primaryContact}
                  onChange={e => setFormData(prev => ({ ...prev, primaryContact: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  placeholder="Contact name"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
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
    const report = ir.generateReport(
      selectedEngagement.id,
      selectedReportType as ComplianceReport['reportType'],
      compliance
    );
    // Report is now in ir.reports
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Client Reporting</h1>
          <p className="text-slate-500 dark:text-white/60">Generate and manage compliance reports</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Engagement
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagements List */}
        <div className="lg:col-span-1">
          <GlassPanel className="p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Client Engagements</h3>
            {ir.engagements.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-white/20" />
                <p className="text-sm text-slate-500 dark:text-white/50">No engagements yet</p>
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
          </GlassPanel>
        </div>

        {/* Report Generation */}
        <div className="lg:col-span-2">
          {!selectedEngagement ? (
            <GlassPanel className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-white/20" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Select an Engagement
              </h3>
              <p className="text-slate-500 dark:text-white/50">
                Choose a client engagement to generate reports
              </p>
            </GlassPanel>
          ) : (
            <div className="space-y-6">
              {/* Engagement Overview */}
              <GlassPanel className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {selectedEngagement.clientName}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-white/50">
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
              </GlassPanel>

              {/* Generate Report */}
              <GlassPanel className="p-5">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Generate New Report</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {REPORT_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedReportType(type.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selectedReportType === type.id
                          ? 'bg-blue-500/10 border-blue-500/30 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-white/10 hover:border-blue-500/30'
                      }`}
                    >
                      <div className={`mb-2 ${selectedReportType === type.id ? 'text-blue-500' : 'text-slate-400'}`}>
                        {type.icon}
                      </div>
                      <p className="font-medium text-slate-900 dark:text-white text-sm">{type.label}</p>
                      <p className="text-xs text-slate-500 dark:text-white/50 mt-1">{type.description}</p>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleGenerateReport}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generate Report
                </button>
              </GlassPanel>

              {/* Previous Reports */}
              {engagementReports.length > 0 && (
                <GlassPanel className="p-5">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
                    Previous Reports ({engagementReports.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {engagementReports.map(report => (
                      <ReportCard
                        key={report.id}
                        report={report}
                        onView={() => {}}
                        onDownload={() => handleExportPDF(report)}
                      />
                    ))}
                  </div>
                </GlassPanel>
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
    </div>
  );
};

export default ClientReporting;
