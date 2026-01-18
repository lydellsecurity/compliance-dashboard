/**
 * Report Preview Modal
 *
 * Interactive preview of report before download.
 * Features:
 * - Full report preview with branding
 * - Version history
 * - Download options (PDF, CSV)
 * - Digital signature info
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  History,
  Shield,
  CheckCircle2,
  Clock,
  User,
  Hash,
  ChevronDown,
  ChevronUp,
  Printer,
  Share2,
} from 'lucide-react';
import type { ReportArtifact } from './index';
import type { OrganizationWithRole } from '../../types/branding.types';
import type { FrameworkId } from '../../constants/controls';

const FRAMEWORK_CONFIG: Record<FrameworkId, { name: string; color: string }> = {
  SOC2: { name: 'SOC 2 Type II', color: '#0066FF' },
  ISO27001: { name: 'ISO 27001:2022', color: '#059669' },
  HIPAA: { name: 'HIPAA Security', color: '#7C3AED' },
  NIST: { name: 'NIST CSF 2.0', color: '#D97706' },
  PCIDSS: { name: 'PCI DSS 4.0', color: '#3b82f6' },
  GDPR: { name: 'GDPR', color: '#06b6d4' },
};

interface ReportPreviewModalProps {
  report: ReportArtifact | null;
  isOpen: boolean;
  onClose: () => void;
  organization: OrganizationWithRole | null;
}

const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  report,
  isOpen,
  onClose,
  organization,
}) => {
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'details'>('preview');

  if (!isOpen || !report) return null;

  // Mock version history
  const versionHistory = [
    { version: report.version, date: report.generatedAt, by: report.generatedBy, changes: 'Current version' },
    { version: report.version - 1, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), by: 'System', changes: 'Updated control assessments' },
    { version: report.version - 2, date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), by: 'System', changes: 'Initial generation' },
  ].filter(v => v.version > 0);

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
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {report.title}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  {report.frameworkId && (
                    <span
                      className="px-2 py-0.5 text-xs font-medium rounded"
                      style={{
                        backgroundColor: `${FRAMEWORK_CONFIG[report.frameworkId].color}15`,
                        color: FRAMEWORK_CONFIG[report.frameworkId].color,
                      }}
                    >
                      {FRAMEWORK_CONFIG[report.frameworkId].name}
                    </span>
                  )}
                  <span className={`
                    px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1
                    ${report.status === 'final'
                      ? 'bg-emerald-100 text-emerald-700'
                      : report.status === 'draft'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                    }
                  `}>
                    {report.status === 'final' && <CheckCircle2 className="w-3 h-3" />}
                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                  </span>
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <History className="w-3.5 h-3.5" />
                    Version {report.version}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-6 py-2 border-b border-slate-200 bg-white">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'preview'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'details'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Details & History
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {activeTab === 'preview' ? (
              <div className="p-6">
                {/* Mock Report Preview */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 max-w-3xl mx-auto">
                  {/* Report Header */}
                  <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-200">
                    <div>
                      {organization?.logoUrl ? (
                        <img
                          src={organization.logoUrl}
                          alt={organization.name}
                          className="h-10 object-contain mb-4"
                        />
                      ) : (
                        <div className="text-xl font-bold text-slate-900 mb-4">
                          {organization?.name || 'Organization Name'}
                        </div>
                      )}
                      <h1 className="text-2xl font-bold text-slate-900">
                        {report.title}
                      </h1>
                      <p className="text-slate-500 mt-2">
                        Generated: {new Date(report.generatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
                        <Shield className="w-4 h-4" />
                        Verified Document
                      </div>
                    </div>
                  </div>

                  {/* Executive Summary Section */}
                  <div className="mb-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">
                      Executive Summary
                    </h2>
                    <div className="prose prose-slate max-w-none">
                      <p className="text-slate-600">
                        This report provides a comprehensive overview of the organization's
                        compliance posture across selected frameworks. Key findings and
                        recommendations are outlined below.
                      </p>
                    </div>
                  </div>

                  {/* Metrics Preview */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="p-4 bg-slate-50 rounded-xl text-center">
                      <div className="text-3xl font-bold text-indigo-600">87%</div>
                      <div className="text-sm text-slate-500 mt-1">Overall Score</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl text-center">
                      <div className="text-3xl font-bold text-emerald-600">142</div>
                      <div className="text-sm text-slate-500 mt-1">Controls Assessed</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl text-center">
                      <div className="text-3xl font-bold text-amber-600">12</div>
                      <div className="text-sm text-slate-500 mt-1">Gaps Identified</div>
                    </div>
                  </div>

                  {/* Truncation notice */}
                  <div className="text-center py-8 border-t border-dashed border-slate-200">
                    <p className="text-slate-400 text-sm">
                      Preview truncated. Download the full report to view all sections.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Document Details */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Document Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-slate-500">Generated At</span>
                      <p className="font-medium text-slate-900">
                        {new Date(report.generatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">Generated By</span>
                      <p className="font-medium text-slate-900 flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        {report.generatedBy}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">File Size</span>
                      <p className="font-medium text-slate-900">{report.fileSize}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">Version</span>
                      <p className="font-medium text-slate-900">v{report.version}</p>
                    </div>
                  </div>
                </div>

                {/* Digital Signature */}
                {report.hash && (
                  <div className="bg-emerald-50 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-emerald-900">Digital Signature</h3>
                        <p className="text-sm text-emerald-700 mt-1">
                          This document is digitally signed for integrity verification.
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <Hash className="w-4 h-4 text-emerald-600" />
                          <code className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded font-mono text-xs">
                            SHA-256: {report.hash}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Version History */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setShowVersionHistory(!showVersionHistory)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <History className="w-5 h-5 text-slate-400" />
                      <span className="font-semibold text-slate-900">Version History</span>
                      <span className="text-sm text-slate-500">
                        ({versionHistory.length} versions)
                      </span>
                    </div>
                    {showVersionHistory ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showVersionHistory && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-200 overflow-hidden"
                      >
                        <div className="divide-y divide-slate-100">
                          {versionHistory.map((version, idx) => (
                            <div
                              key={version.version}
                              className={`p-4 flex items-center justify-between ${
                                idx === 0 ? 'bg-indigo-50' : ''
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                  idx === 0
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-slate-200 text-slate-600'
                                }`}>
                                  v{version.version}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {version.changes}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      {new Date(version.date).toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <User className="w-3.5 h-3.5" />
                                      {version.by}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {idx !== 0 && (
                                <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                                  Restore
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-white rounded-lg border border-slate-200 transition-colors">
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-white rounded-lg border border-slate-200 transition-colors">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-white rounded-lg border border-slate-200 transition-colors">
                <FileSpreadsheet className="w-4 h-4" />
                Export CSV
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all">
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReportPreviewModal;
