/**
 * Reports Component
 *
 * Generate and manage compliance reports for internal use.
 * Supports multiple report types and export formats.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, FolderOpen, Target,
  AlertTriangle, BarChart3, TrendingUp, Eye, X,
  FileSpreadsheet, Download, Clock,
  CheckCircle2, Search,
} from 'lucide-react';
import type { UseComplianceReturn } from '../hooks/useCompliance';
import type { UseIncidentResponseReturn } from '../hooks/useIncidentResponse';
import type { ClientEngagement, ComplianceReport } from '../types/incident.types';
import type { FrameworkId } from '../constants/controls';
import { useOrganization } from '../contexts/OrganizationContext';
import { exportService } from '../services/export.service';

// ============================================================================
// CONSTANTS
// ============================================================================

const FRAMEWORK_CONFIG: Record<FrameworkId, { name: string; color: string }> = {
  SOC2: { name: 'SOC 2 Type II', color: '#0066FF' },
  ISO27001: { name: 'ISO 27001:2022', color: '#059669' },
  HIPAA: { name: 'HIPAA Security', color: '#7C3AED' },
  NIST: { name: 'NIST CSF 2.0', color: '#D97706' },
  PCIDSS: { name: 'PCI DSS 4.0', color: '#3b82f6' },
  GDPR: { name: 'GDPR', color: '#06b6d4' },
};

const REPORT_TYPES = [
  { id: 'executive_summary', label: 'Executive Summary', description: 'High-level overview for leadership', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'detailed_assessment', label: 'Detailed Assessment', description: 'Comprehensive control-by-control analysis', icon: <FileText className="w-5 h-5" /> },
  { id: 'gap_analysis', label: 'Gap Analysis', description: 'Focus on compliance gaps and remediation', icon: <Target className="w-5 h-5" /> },
  { id: 'incident_report', label: 'Incident Report', description: 'Post-incident findings and recommendations', icon: <AlertTriangle className="w-5 h-5" /> },
  { id: 'remediation_status', label: 'Remediation Status', description: 'Progress on addressing identified gaps', icon: <TrendingUp className="w-5 h-5" /> },
] as const;

const PROJECT_TYPES = [
  { value: 'assessment', label: 'Compliance Assessment' },
  { value: 'incident_response', label: 'Incident Response' },
  { value: 'retainer', label: 'Continuous Monitoring' },
  { value: 'audit_prep', label: 'Audit Preparation' },
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
          className="text-slate-200 dark:text-steel-700"
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

const ProjectCard: React.FC<{
  project: ClientEngagement;
  onSelect: () => void;
  isSelected: boolean;
  reportsCount: number;
}> = ({ project, onSelect, isSelected, reportsCount }) => (
  <button
    onClick={onSelect}
    className={`w-full text-left p-4 rounded-xl border transition-all ${
      isSelected
        ? 'bg-accent-500/10 border-accent-500/30 ring-2 ring-accent-500/20'
        : 'card-bg border-slate-200 dark:border-steel-700 hover:border-accent-500/30'
    }`}
  >
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg ${isSelected ? 'bg-accent-500/20' : 'bg-slate-100 dark:bg-steel-800'}`}>
        <FolderOpen className={`w-5 h-5 ${isSelected ? 'text-accent-400' : 'text-slate-500 dark:text-steel-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-primary truncate">{project.clientName}</h4>
        <p className="text-sm text-secondary">
          {PROJECT_TYPES.find(t => t.value === project.engagementType)?.label || project.engagementType}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex flex-wrap gap-1">
            {project.frameworksInScope.slice(0, 3).map(fw => (
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
            {project.frameworksInScope.length > 3 && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 dark:bg-steel-700 text-secondary">
                +{project.frameworksInScope.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          project.status === 'active'
            ? 'bg-status-success/10 text-status-success'
            : 'bg-slate-100 dark:bg-steel-700 text-slate-500 dark:text-steel-400'
        }`}>
          {project.status}
        </span>
        {reportsCount > 0 && (
          <span className="text-xs text-secondary">{reportsCount} reports</span>
        )}
      </div>
    </div>
  </button>
);

const ReportCard: React.FC<{
  report: ComplianceReport;
  onView: () => void;
  onDownloadPDF: () => void;
  onDownloadCSV: () => void;
}> = ({ report, onView, onDownloadPDF, onDownloadCSV }) => {
  const reportType = REPORT_TYPES.find(t => t.id === report.reportType);

  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-steel-800/50 border border-slate-200 dark:border-steel-700 hover:border-accent-500/30 transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-accent-500/10">
            {reportType?.icon || <FileText className="w-5 h-5 text-accent-500" />}
          </div>
          <div>
            <h4 className="font-medium text-primary">{report.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-secondary" />
              <p className="text-xs text-secondary">
                {new Date(report.generatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
        <ScoreGauge score={report.overallScore} size={56} />
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
          onClick={onDownloadPDF}
          className="btn-primary flex-1"
          title="Export as PDF"
        >
          <FileText className="w-4 h-4" />
          PDF
        </button>
        <button
          onClick={onDownloadCSV}
          className="btn-ghost flex-1"
          title="Export as CSV"
        >
          <FileSpreadsheet className="w-4 h-4" />
          CSV
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// CREATE PROJECT MODAL
// ============================================================================

const CreateProjectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: Omit<ClientEngagement, 'id' | 'createdAt' | 'updatedAt'>) => void;
}> = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    clientName: '',
    clientIndustry: '',
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
    // Reset form
    setFormData({
      clientName: '',
      clientIndustry: '',
      engagementType: 'assessment',
      frameworksInScope: [],
      domainsInScope: [],
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: 'active',
      primaryContact: '',
      contacts: [],
      incidentIds: [],
      assessmentIds: [],
    });
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
          <div className="p-6 border-b border-slate-200 dark:border-steel-700">
            <h2 className="text-xl font-bold text-primary">New Report Project</h2>
            <p className="text-sm text-secondary">Create a project to organize your compliance reports</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={formData.clientName}
                onChange={e => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                className="input"
                placeholder="Q1 2025 Compliance Assessment"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Project Type
              </label>
              <select
                value={formData.engagementType}
                onChange={e => setFormData(prev => ({ ...prev, engagementType: e.target.value as ClientEngagement['engagementType'] }))}
                className="input"
              >
                {PROJECT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Frameworks in Scope *
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
                        : 'border-slate-200 dark:border-steel-700 hover:border-accent-500'
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
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={formData.clientIndustry}
                  onChange={e => setFormData(prev => ({ ...prev, clientIndustry: e.target.value }))}
                  className="input"
                  placeholder="Brief description"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-steel-700">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!formData.clientName || formData.frameworksInScope.length === 0}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Project
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
  onExportPDF: (report: ComplianceReport) => void;
  onExportCSV: (report: ComplianceReport) => void;
}> = ({ report, onClose, onExportPDF, onExportCSV }) => {
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
          <div className="p-6 border-b border-slate-200 dark:border-steel-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-primary">{report.title}</h2>
              <p className="text-sm text-secondary">
                Generated {new Date(report.generatedAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onExportPDF(report)}
                className="btn-primary"
                title="Export as PDF"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={() => onExportCSV(report)}
                className="btn-ghost"
                title="Export as CSV"
              >
                <FileSpreadsheet className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-steel-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-steel-400" />
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
            <div className="bg-slate-50 dark:bg-steel-800 rounded-xl p-5">
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
                  <tbody className="divide-y divide-slate-200 dark:divide-steel-700">
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
                      className="text-sm text-status-risk bg-white dark:bg-status-risk/5 rounded-lg px-4 py-2"
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
                  <CheckCircle2 className="w-5 h-5" />
                  Recommendations ({report.recommendations.length})
                </h3>
                <ul className="space-y-2">
                  {report.recommendations.map((rec, index) => (
                    <li
                      key={index}
                      className="text-sm text-status-success bg-white dark:bg-status-success/5 rounded-lg px-4 py-2"
                    >
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Report Metadata */}
            <div className="bg-slate-50 dark:bg-steel-800 rounded-xl p-5">
              <h3 className="font-semibold text-primary mb-3">Report Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-secondary">Report ID</p>
                  <p className="font-medium text-primary font-mono text-xs">{report.id}</p>
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
// QUICK REPORT SECTION
// ============================================================================

const QuickReportSection: React.FC<{
  compliance: UseComplianceReturn;
  onGenerate: (reportType: string) => void;
  selectedType: string;
  onSelectType: (type: string) => void;
}> = ({ compliance, onGenerate, selectedType, onSelectType }) => {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-primary">Quick Report</h3>
          <p className="text-sm text-secondary">Generate a report based on current compliance data</p>
        </div>
        <ScoreGauge score={compliance.stats.assessmentPercentage} size={80} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        {REPORT_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => onSelectType(type.id)}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedType === type.id
                ? 'bg-accent-500/10 border-accent-500/30 ring-2 ring-accent-500/20'
                : 'border-slate-200 dark:border-steel-700 hover:border-accent-500/30'
            }`}
          >
            <div className={`mb-2 ${selectedType === type.id ? 'text-accent-400' : 'text-slate-500 dark:text-steel-400'}`}>
              {type.icon}
            </div>
            <p className="font-medium text-primary text-sm">{type.label}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 flex flex-wrap gap-2">
          {compliance.frameworkProgress.map(fp => (
            <div
              key={fp.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: `${FRAMEWORK_CONFIG[fp.id].color}10` }}
            >
              <span className="text-xs font-medium" style={{ color: FRAMEWORK_CONFIG[fp.id].color }}>
                {fp.id}
              </span>
              <span className="text-xs font-bold" style={{ color: FRAMEWORK_CONFIG[fp.id].color }}>
                {fp.percentage}%
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={() => onGenerate(selectedType)}
          className="btn-primary"
        >
          <FileText className="w-4 h-4" />
          Generate Report
        </button>
      </div>
    </Card>
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
  const { currentOrg } = useOrganization();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ClientEngagement | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<string>('executive_summary');
  const [previewReport, setPreviewReport] = useState<ComplianceReport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Filter projects based on search and status
  const filteredProjects = useMemo(() => {
    return ir.engagements.filter(project => {
      const matchesSearch = project.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [ir.engagements, searchQuery, filterStatus]);

  // Get reports count per project
  const getProjectReportsCount = (projectId: string) => {
    return ir.reports.filter(r => r.engagementId === projectId).length;
  };

  const projectReports = useMemo(() => {
    if (!selectedProject) return [];
    return ir.reports.filter(r => r.engagementId === selectedProject.id);
  }, [selectedProject, ir.reports]);

  // Get all reports sorted by date
  const allReports = useMemo(() => {
    return [...ir.reports].sort((a, b) =>
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }, [ir.reports]);

  const handleCreateProject = (data: Omit<ClientEngagement, 'id' | 'createdAt' | 'updatedAt'>) => {
    const project = ir.createEngagement(data);
    setSelectedProject(project);
  };

  const handleGenerateReport = (reportType?: string) => {
    if (!selectedProject) return;
    ir.generateReport(
      selectedProject.id,
      (reportType || selectedReportType) as ComplianceReport['reportType'],
      compliance
    );
  };

  const handleQuickReport = (reportType: string) => {
    // Create a temporary project for quick reports if none selected
    if (!selectedProject && ir.engagements.length === 0) {
      const project = ir.createEngagement({
        clientName: 'General Reports',
        clientIndustry: '',
        engagementType: 'assessment',
        frameworksInScope: compliance.frameworkProgress.map(fp => fp.id),
        domainsInScope: [],
        startDate: new Date().toISOString(),
        endDate: null,
        status: 'active',
        primaryContact: '',
        contacts: [],
        incidentIds: [],
        assessmentIds: [],
      });
      setSelectedProject(project);
      ir.generateReport(project.id, reportType as ComplianceReport['reportType'], compliance);
    } else if (selectedProject) {
      ir.generateReport(selectedProject.id, reportType as ComplianceReport['reportType'], compliance);
    } else if (ir.engagements.length > 0) {
      // Use first available project
      const project = ir.engagements[0];
      setSelectedProject(project);
      ir.generateReport(project.id, reportType as ComplianceReport['reportType'], compliance);
    }
  };

  const handleExportPDF = (report: ComplianceReport) => {
    exportService.compliancePDF(report, {
      organization: currentOrg,
      includeFindings: true,
      includeRecommendations: true,
    });
  };

  const handleExportCSV = (report: ComplianceReport) => {
    exportService.complianceCSV(report, {
      organization: currentOrg,
    });
  };

  const handleViewReport = (report: ComplianceReport) => {
    setPreviewReport(report);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate and manage compliance reports</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Quick Report Section */}
      <QuickReportSection
        compliance={compliance}
        onGenerate={handleQuickReport}
        selectedType={selectedReportType}
        onSelectType={setSelectedReportType}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects List */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-primary">Projects</h3>
              <span className="text-xs text-secondary bg-slate-100 dark:bg-steel-800 px-2 py-1 rounded">
                {filteredProjects.length}
              </span>
            </div>

            {/* Search and Filter */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input pl-9 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filterStatus === 'all'
                      ? 'bg-accent-500/10 text-accent-500'
                      : 'bg-slate-100 dark:bg-steel-800 text-secondary hover:text-primary'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('active')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filterStatus === 'active'
                      ? 'bg-status-success/10 text-status-success'
                      : 'bg-slate-100 dark:bg-steel-800 text-secondary hover:text-primary'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setFilterStatus('complete')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filterStatus === 'complete'
                      ? 'bg-slate-500/10 text-slate-500'
                      : 'bg-slate-100 dark:bg-steel-800 text-secondary hover:text-primary'
                  }`}
                >
                  Complete
                </button>
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-10 h-10 mx-auto mb-3 text-steel-600" />
                <p className="text-sm text-secondary">
                  {ir.engagements.length === 0 ? 'No projects yet' : 'No matching projects'}
                </p>
                {ir.engagements.length === 0 && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-3 text-sm text-accent-500 hover:text-accent-400"
                  >
                    Create your first project
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onSelect={() => setSelectedProject(project)}
                    isSelected={selectedProject?.id === project.id}
                    reportsCount={getProjectReportsCount(project.id)}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Report Generation & History */}
        <div className="lg:col-span-2">
          {!selectedProject ? (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-steel-600" />
              <h3 className="text-lg font-semibold text-primary mb-2">
                Select a Project
              </h3>
              <p className="text-secondary mb-4">
                Choose a project to generate reports or view history
              </p>
              {allReports.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-steel-700">
                  <h4 className="text-sm font-semibold text-secondary mb-4">Recent Reports</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allReports.slice(0, 4).map(report => (
                      <ReportCard
                        key={report.id}
                        report={report}
                        onView={() => handleViewReport(report)}
                        onDownloadPDF={() => handleExportPDF(report)}
                        onDownloadCSV={() => handleExportCSV(report)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Project Overview */}
              <Card className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-primary">
                      {selectedProject.clientName}
                    </h3>
                    <p className="text-sm text-secondary">
                      {PROJECT_TYPES.find(t => t.value === selectedProject.engagementType)?.label}
                      {selectedProject.clientIndustry && ` - ${selectedProject.clientIndustry}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      selectedProject.status === 'active'
                        ? 'bg-status-success/10 text-status-success'
                        : 'bg-slate-100 dark:bg-steel-700 text-slate-500'
                    }`}>
                      {selectedProject.status}
                    </span>
                    <ScoreGauge score={compliance.stats.assessmentPercentage} size={70} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedProject.frameworksInScope.map(fw => {
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                  {REPORT_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedReportType(type.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selectedReportType === type.id
                          ? 'bg-accent-500/10 border-accent-500/30 ring-2 ring-accent-500/20'
                          : 'border-slate-200 dark:border-steel-700 hover:border-accent-500/30'
                      }`}
                    >
                      <div className={`mb-2 ${selectedReportType === type.id ? 'text-accent-400' : 'text-slate-500 dark:text-steel-400'}`}>
                        {type.icon}
                      </div>
                      <p className="font-medium text-primary text-sm">{type.label}</p>
                      <p className="text-xs text-secondary mt-1 line-clamp-2">{type.description}</p>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleGenerateReport()}
                  className="btn-primary w-full justify-center"
                >
                  <FileText className="w-4 h-4" />
                  Generate Report
                </button>
              </Card>

              {/* Previous Reports */}
              {projectReports.length > 0 && (
                <Card className="p-5">
                  <h4 className="font-semibold text-primary mb-4">
                    Report History ({projectReports.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projectReports.map(report => (
                      <ReportCard
                        key={report.id}
                        report={report}
                        onView={() => handleViewReport(report)}
                        onDownloadPDF={() => handleExportPDF(report)}
                        onDownloadCSV={() => handleExportCSV(report)}
                      />
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateProject}
      />

      {/* Report Preview Modal */}
      <ReportPreviewModal
        report={previewReport}
        onClose={() => setPreviewReport(null)}
        onExportPDF={handleExportPDF}
        onExportCSV={handleExportCSV}
      />
    </div>
  );
};

export default ClientReporting;
