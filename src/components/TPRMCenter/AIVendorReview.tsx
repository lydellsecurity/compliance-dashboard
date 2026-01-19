/**
 * AI Vendor Review Component
 *
 * Upload vendor security policies (PDF) for AI-powered analysis.
 * Features:
 * - Drag & drop PDF upload
 * - AI-powered policy analysis
 * - Risk scoring and recommendations
 * - Gap identification
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Upload,
  FileSearch,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Loader2,
  Sparkles,
  Target,
  Download,
} from 'lucide-react';
import type { Vendor } from '../../services/vendor-risk.service';

interface AIVendorReviewProps {
  onClose: () => void;
  vendors: Vendor[];
  organizationId: string;
}

interface AnalysisResult {
  overallScore: number;
  categories: {
    name: string;
    score: number;
    status: 'strong' | 'adequate' | 'weak' | 'missing';
    findings: string[];
  }[];
  risks: {
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
  }[];
  recommendations: string[];
}

const AIVendorReview: React.FC<AIVendorReviewProps> = ({
  onClose,
  vendors,
  organizationId: _organizationId,
}) => {
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
    }
  }, []);

  // Handle file select
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
    }
  }, []);

  // Simulate AI analysis
  const handleAnalyze = useCallback(async () => {
    if (!uploadedFile) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const steps = [
      'Extracting document content...',
      'Analyzing security policies...',
      'Evaluating access controls...',
      'Reviewing data protection measures...',
      'Checking incident response procedures...',
      'Assessing compliance coverage...',
      'Generating risk assessment...',
      'Finalizing recommendations...',
    ];

    for (let i = 0; i < steps.length; i++) {
      setAnalysisStep(steps[i]);
      setAnalysisProgress(((i + 1) / steps.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    // Simulated result
    setResult({
      overallScore: 72,
      categories: [
        {
          name: 'Access Control',
          score: 85,
          status: 'strong',
          findings: [
            'Multi-factor authentication implemented',
            'Role-based access control documented',
            'Regular access reviews mentioned',
          ],
        },
        {
          name: 'Data Protection',
          score: 78,
          status: 'adequate',
          findings: [
            'Encryption at rest and in transit',
            'Data classification mentioned but incomplete',
            'Backup procedures documented',
          ],
        },
        {
          name: 'Incident Response',
          score: 65,
          status: 'adequate',
          findings: [
            'Basic incident response plan exists',
            'Notification timelines defined',
            'Missing escalation procedures',
          ],
        },
        {
          name: 'Business Continuity',
          score: 55,
          status: 'weak',
          findings: [
            'Disaster recovery mentioned',
            'RTO/RPO not clearly defined',
            'Missing testing schedule',
          ],
        },
        {
          name: 'Vendor Management',
          score: 40,
          status: 'missing',
          findings: [
            'No subprocessor list provided',
            'Fourth-party risk not addressed',
            'Missing supply chain controls',
          ],
        },
      ],
      risks: [
        {
          severity: 'high',
          title: 'Incomplete Business Continuity',
          description: 'Business continuity plan lacks specific recovery objectives and testing procedures.',
        },
        {
          severity: 'high',
          title: 'Missing Vendor Management',
          description: 'No documentation on subprocessor oversight or fourth-party risk management.',
        },
        {
          severity: 'medium',
          title: 'Incomplete Data Classification',
          description: 'Data classification scheme mentioned but not fully documented.',
        },
        {
          severity: 'low',
          title: 'Incident Escalation',
          description: 'Escalation procedures could be more detailed.',
        },
      ],
      recommendations: [
        'Request detailed business continuity and disaster recovery plan with RTO/RPO',
        'Obtain complete list of subprocessors and their security certifications',
        'Request updated data classification documentation',
        'Ask for incident response escalation matrix',
        'Schedule annual security review meeting',
      ],
    });

    setIsAnalyzing(false);
  }, [uploadedFile]);

  // Reset to start
  const handleReset = useCallback(() => {
    setUploadedFile(null);
    setResult(null);
    setAnalysisProgress(0);
    setAnalysisStep('');
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'strong': return { bg: '#DCFCE7', text: '#16A34A' };
      case 'adequate': return { bg: '#FEF3C7', text: '#D97706' };
      case 'weak': return { bg: '#FFEDD5', text: '#EA580C' };
      case 'missing': return { bg: '#FEE2E2', text: '#DC2626' };
      default: return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-violet-600 to-purple-600">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                AI Vendor Review
                <Sparkles className="w-4 h-4 text-yellow-300" />
              </h2>
              <p className="text-sm text-white/80">
                Analyze vendor security policies with AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!result && !isAnalyzing ? (
            <div className="space-y-6">
              {/* Vendor Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Vendor (Optional)
                </label>
                <select
                  value={selectedVendor?.id || ''}
                  onChange={(e) => setSelectedVendor(vendors.find(v => v.id === e.target.value) || null)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="">-- Select a vendor --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Upload Area */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`
                  relative rounded-2xl border-2 border-dashed p-8 text-center transition-all
                  ${isDragOver
                    ? 'border-violet-500 bg-violet-50'
                    : uploadedFile
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                  }
                `}
              >
                {uploadedFile ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <FileText className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-slate-900">{uploadedFile.name}</p>
                      <p className="text-sm text-slate-500">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => setUploadedFile(null)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-1">
                      Upload Security Policy
                    </h3>
                    <p className="text-slate-500 mb-4">
                      Drag & drop a PDF file or click to browse
                    </p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <span className="text-sm text-slate-400">PDF files only</span>
                  </>
                )}
              </div>

              {/* Analysis Button */}
              {uploadedFile && (
                <button
                  onClick={handleAnalyze}
                  className="w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Analyze with AI
                </button>
              )}
            </div>
          ) : isAnalyzing ? (
            <div className="py-12 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 mx-auto mb-6"
              >
                <Loader2 className="w-16 h-16 text-violet-500" />
              </motion.div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Analyzing Document
              </h3>
              <p className="text-slate-500 mb-6">{analysisStep}</p>

              <div className="max-w-md mx-auto">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${analysisProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  {Math.round(analysisProgress)}% complete
                </p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 text-center">
                <div className="text-6xl font-bold mb-2" style={{
                  color: result.overallScore >= 80 ? '#16A34A' :
                         result.overallScore >= 60 ? '#D97706' :
                         result.overallScore >= 40 ? '#EA580C' : '#DC2626'
                }}>
                  {result.overallScore}
                </div>
                <div className="text-slate-500 mb-4">Overall Security Score</div>
                <div className="h-3 max-w-xs mx-auto bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      result.overallScore >= 80 ? 'bg-emerald-500' :
                      result.overallScore >= 60 ? 'bg-amber-500' :
                      result.overallScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${result.overallScore}%` }}
                  />
                </div>
              </div>

              {/* Categories */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Policy Analysis</h3>
                <div className="space-y-3">
                  {result.categories.map((cat) => {
                    const colors = getStatusColor(cat.status);
                    return (
                      <div key={cat.name} className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: colors.bg }}
                            >
                              <Shield className="w-5 h-5" style={{ color: colors.text }} />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{cat.name}</p>
                              <span
                                className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                                style={{ backgroundColor: colors.bg, color: colors.text }}
                              >
                                {cat.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-2xl font-bold" style={{ color: colors.text }}>
                            {cat.score}
                          </div>
                        </div>
                        <ul className="mt-3 space-y-1">
                          {cat.findings.map((finding, i) => (
                            <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                              {finding}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Risks */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Identified Risks
                </h3>
                <div className="space-y-2">
                  {result.risks.map((risk, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start gap-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium uppercase ${getSeverityColor(risk.severity)}`}>
                          {risk.severity}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">{risk.title}</p>
                          <p className="text-sm text-slate-500 mt-1">{risk.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-500" />
                  Recommendations
                </h3>
                <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-indigo-600">{i + 1}</span>
                      </div>
                      <p className="text-sm text-indigo-900">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          {result ? (
            <>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Analyze Another
              </button>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-white transition-colors">
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all"
                >
                  Done
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AIVendorReview;
