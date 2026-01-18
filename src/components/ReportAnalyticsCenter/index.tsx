/**
 * Report & Analytics Center
 *
 * Comprehensive reporting hub with:
 * - Artifact Repository with 4 report categories
 * - Bento Grid layout optimized for Light Mode
 * - Interactive previews and one-click audit bundle
 * - Compliance Velocity analytics
 * - Risk Heatmap visualization
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Target,
  Shield,
  ClipboardList,
  Download,
  Package,
  BarChart3,
  Clock,
  Search,
  Eye,
  History,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import type { UseComplianceReturn } from '../../hooks/useCompliance';
import type { UseIncidentResponseReturn } from '../../hooks/useIncidentResponse';
import type { FrameworkId } from '../../constants/controls';
import { useOrganization } from '../../contexts/OrganizationContext';
import ReportPreviewModal from './ReportPreviewModal';
import RiskHeatmap from './RiskHeatmap';
import ComplianceVelocity from './ComplianceVelocity';
import AuditBundleModal from './AuditBundleModal';

// ============================================================================
// TYPES
// ============================================================================

export interface ReportCategory {
  id: 'executive' | 'gap' | 'framework' | 'inventory';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  reportCount: number;
}

export interface ReportArtifact {
  id: string;
  category: ReportCategory['id'];
  title: string;
  description: string;
  generatedAt: string;
  version: number;
  status: 'draft' | 'final' | 'archived';
  frameworkId?: FrameworkId;
  fileSize: string;
  generatedBy: string;
  hash?: string; // SHA-256 for integrity
}

export interface ReportHistoryEntry {
  id: string;
  reportId: string;
  version: number;
  generatedAt: string;
  generatedBy: string;
  changes: string;
  hash: string;
}

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

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'executive',
    title: 'Executive Summary',
    description: 'Board-ready compliance posture overview with key metrics and trends',
    icon: <BarChart3 className="w-6 h-6" />,
    color: '#6366F1',
    gradient: 'from-indigo-500 to-violet-500',
    reportCount: 0,
  },
  {
    id: 'gap',
    title: 'Gap Analysis',
    description: 'Detailed findings with remediation roadmap and priority scoring',
    icon: <Target className="w-6 h-6" />,
    color: '#F59E0B',
    gradient: 'from-amber-500 to-orange-500',
    reportCount: 0,
  },
  {
    id: 'framework',
    title: 'Framework-Specific',
    description: 'Deep-dive reports for SOC 2, ISO 27001, HIPAA, and more',
    icon: <Shield className="w-6 h-6" />,
    color: '#10B981',
    gradient: 'from-emerald-500 to-teal-500',
    reportCount: 0,
  },
  {
    id: 'inventory',
    title: 'Control Inventory',
    description: 'Complete control catalogue with evidence mapping and ownership',
    icon: <ClipboardList className="w-6 h-6" />,
    color: '#8B5CF6',
    gradient: 'from-violet-500 to-purple-500',
    reportCount: 0,
  },
];

// ============================================================================
// PROPS
// ============================================================================

interface ReportAnalyticsCenterProps {
  compliance: UseComplianceReturn;
  ir: UseIncidentResponseReturn;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ReportAnalyticsCenter: React.FC<ReportAnalyticsCenterProps> = ({
  compliance,
  ir: _ir,
}) => {
  const { currentOrg } = useOrganization();

  // State
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory['id'] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [previewReport, setPreviewReport] = useState<ReportArtifact | null>(null);
  const [showAuditBundle, setShowAuditBundle] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Mock report data (would come from Supabase in production)
  const reports = useMemo<ReportArtifact[]>(() => {
    const mockReports: ReportArtifact[] = [
      {
        id: 'exec-001',
        category: 'executive',
        title: 'Q4 2024 Executive Compliance Summary',
        description: 'Quarterly board-level compliance posture report',
        generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        version: 3,
        status: 'final',
        fileSize: '2.4 MB',
        generatedBy: 'System',
        hash: 'a1b2c3d4e5f6...',
      },
      {
        id: 'gap-001',
        category: 'gap',
        title: 'SOC 2 Gap Analysis - January 2025',
        description: 'Comprehensive gap analysis with remediation timeline',
        generatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        version: 2,
        status: 'final',
        frameworkId: 'SOC2',
        fileSize: '4.1 MB',
        generatedBy: 'System',
        hash: 'b2c3d4e5f6g7...',
      },
      {
        id: 'fw-001',
        category: 'framework',
        title: 'ISO 27001:2022 Compliance Report',
        description: 'Detailed control-by-control assessment for ISO certification',
        generatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        version: 1,
        status: 'draft',
        frameworkId: 'ISO27001',
        fileSize: '5.8 MB',
        generatedBy: 'System',
        hash: 'c3d4e5f6g7h8...',
      },
      {
        id: 'inv-001',
        category: 'inventory',
        title: 'Master Control Inventory Export',
        description: 'Complete catalogue of all controls with evidence links',
        generatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        version: 5,
        status: 'final',
        fileSize: '1.2 MB',
        generatedBy: 'System',
        hash: 'd4e5f6g7h8i9...',
      },
    ];
    return mockReports;
  }, []);

  // Calculate report counts per category
  const categoriesWithCounts = useMemo(() => {
    return REPORT_CATEGORIES.map(cat => ({
      ...cat,
      reportCount: reports.filter(r => r.category === cat.id).length,
    }));
  }, [reports]);

  // Filter reports
  const filteredReports = useMemo(() => {
    let result = reports;

    if (selectedCategory) {
      result = result.filter(r => r.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query)
      );
    }

    if (dateFilter !== 'all') {
      const days = parseInt(dateFilter);
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      result = result.filter(r => new Date(r.generatedAt) >= cutoff);
    }

    return result.sort((a, b) =>
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }, [reports, selectedCategory, searchQuery, dateFilter]);

  // Calculate compliance velocity
  const complianceVelocity = useMemo(() => {
    const responses = compliance.state.responses;
    const implemented = Array.from(responses.values()).filter(r => r.answer === 'yes').length;
    const total = compliance.allControls.length;
    const rate = total > 0 ? (implemented / total) * 100 : 0;

    // Mock trend data (would be calculated from historical data)
    const trend = 12.5; // +12.5% from last period

    return { rate, trend, implemented, total };
  }, [compliance.state.responses, compliance.allControls.length]);

  // Generate report handler
  const handleGenerateReport = useCallback(async (categoryId: ReportCategory['id']) => {
    setIsGenerating(categoryId);
    // Simulate generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGenerating(null);
    // In production, this would call the report generation service
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] -mx-6 -mt-6 px-6 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Report & Analytics Center
            </h1>
            <p className="text-slate-600 mt-1">
              Generate, manage, and analyze compliance reports
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAuditBundle(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
            >
              <Package className="w-5 h-5" />
              One-Click Audit Bundle
            </button>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-6">

        {/* Report Categories - Span 8 columns */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                Artifact Repository
              </h2>
              <div className="flex items-center gap-2">
                {selectedCategory && (
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    View All
                  </button>
                )}
              </div>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {categoriesWithCounts.map((category) => (
                <motion.button
                  key={category.id}
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.id ? null : category.id
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    relative p-5 rounded-xl border-2 text-left transition-all duration-200
                    ${selectedCategory === category.id
                      ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                    }
                  `}
                >
                  {/* Icon with gradient background */}
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center text-white mb-4`}
                  >
                    {category.icon}
                  </div>

                  <h3 className="font-semibold text-slate-900 mb-1">
                    {category.title}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {category.description}
                  </p>

                  {/* Report count badge */}
                  <div className="absolute top-4 right-4 flex items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-400">
                      {category.reportCount}
                    </span>
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Generate button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateReport(category.id);
                    }}
                    disabled={isGenerating === category.id}
                    className={`
                      mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                      text-sm font-medium transition-all
                      ${isGenerating === category.id
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }
                    `}
                  >
                    {isGenerating === category.id ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </motion.div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate New
                      </>
                    )}
                  </button>
                </motion.button>
              ))}
            </div>

            {/* Recent Reports List */}
            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-slate-900">
                  {selectedCategory
                    ? `${categoriesWithCounts.find(c => c.id === selectedCategory)?.title} Reports`
                    : 'Recent Reports'
                  }
                </h3>

                {/* Filters */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search reports..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
                    className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Time</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                  </select>
                </div>
              </div>

              {/* Reports Table */}
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredReports.map((report) => (
                    <motion.div
                      key={report.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                    >
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                        style={{
                          backgroundColor: categoriesWithCounts.find(c => c.id === report.category)?.color
                        }}
                      >
                        {categoriesWithCounts.find(c => c.id === report.category)?.icon}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-slate-900 truncate">
                            {report.title}
                          </h4>
                          {report.frameworkId && (
                            <span
                              className="px-2 py-0.5 text-xs font-medium rounded"
                              style={{
                                backgroundColor: `${FRAMEWORK_CONFIG[report.frameworkId].color}15`,
                                color: FRAMEWORK_CONFIG[report.frameworkId].color,
                              }}
                            >
                              {report.frameworkId}
                            </span>
                          )}
                          <span className={`
                            px-2 py-0.5 text-xs font-medium rounded
                            ${report.status === 'final'
                              ? 'bg-emerald-100 text-emerald-700'
                              : report.status === 'draft'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                            }
                          `}>
                            {report.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(report.generatedAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <History className="w-3.5 h-3.5" />
                            v{report.version}
                          </span>
                          <span>{report.fileSize}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setPreviewReport(report)}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {filteredReports.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">No reports found</p>
                    <p className="text-sm">Generate a new report or adjust your filters</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Analytics */}
        <div className="col-span-12 lg:col-span-4 space-y-6">

          {/* Compliance Velocity Card */}
          <ComplianceVelocity
            rate={complianceVelocity.rate}
            trend={complianceVelocity.trend}
            implemented={complianceVelocity.implemented}
            total={complianceVelocity.total}
          />

          {/* Risk Heatmap Card */}
          <RiskHeatmap compliance={compliance} />

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              Report Statistics
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total Reports</span>
                <span className="font-semibold text-slate-900">{reports.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Generated This Month</span>
                <span className="font-semibold text-slate-900">
                  {reports.filter(r => {
                    const date = new Date(r.generatedAt);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() &&
                           date.getFullYear() === now.getFullYear();
                  }).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Active Frameworks</span>
                <span className="font-semibold text-slate-900">
                  {compliance.frameworkProgress.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Last Generated</span>
                <span className="font-semibold text-slate-900">
                  {reports.length > 0
                    ? new Date(reports[0].generatedAt).toLocaleDateString()
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ReportPreviewModal
        report={previewReport}
        isOpen={!!previewReport}
        onClose={() => setPreviewReport(null)}
        organization={currentOrg}
      />

      <AuditBundleModal
        isOpen={showAuditBundle}
        onClose={() => setShowAuditBundle(false)}
        compliance={compliance}
        organization={currentOrg}
      />
    </div>
  );
};

export default ReportAnalyticsCenter;
