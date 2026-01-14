/**
 * Certificate Generator Component
 *
 * Generates compliance completion certificates when score reaches 100%.
 * Professional corporate design with elegant certificate presentation.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award, Download, CheckCircle, Lock, Loader2, ExternalLink,
  Shield, AlertCircle, Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { UseComplianceReturn } from '../hooks/useCompliance';

interface CertificateGeneratorProps {
  compliance: UseComplianceReturn;
  organizationName?: string;
}

const CertificateGenerator: React.FC<CertificateGeneratorProps> = ({
  compliance,
  organizationName = 'LYDELL SECURITY',
}) => {
  const { frameworkProgress, stats } = compliance;
  const [isGenerating, setIsGenerating] = useState(false);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalScore = Math.round(
    (stats.compliantControls / stats.totalControls) * 100
  );
  const isEligible = totalScore === 100;

  const triggerCelebration = () => {
    const count = 200;
    const defaults = { origin: { y: 0.7 }, zIndex: 9999 };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55, colors: ['#0066FF', '#3385FF'] });
    fire(0.2, { spread: 60, colors: ['#16A34A', '#22C55E'] });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ['#D97706', '#F59E0B'] });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, colors: ['#0066FF', '#60A5FA'] });
    fire(0.1, { spread: 120, startVelocity: 45, colors: ['#059669', '#34D399'] });
  };

  const handleGenerate = async () => {
    if (!isEligible) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/generate-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationName,
          totalScore,
          frameworks: frameworkProgress.map(fw => ({
            id: fw.id,
            name: fw.name,
            percentage: fw.percentage,
          })),
          totalControls: stats.totalControls,
          compliantControls: stats.compliantControls,
          issuedBy: 'Compliance Officer',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to generate certificate');
      }

      setCertificateId(result.certificateId);

      if (result.fileUrl) {
        setCertificateUrl(result.fileUrl);
      } else if (result.pdfBase64) {
        const binaryString = atob(result.pdfBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setCertificateUrl(url);
      }

      triggerCelebration();

    } catch (err) {
      console.error('Certificate generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate certificate');
    }

    setIsGenerating(false);
  };

  const handleDownload = () => {
    if (certificateUrl) {
      const link = document.createElement('a');
      link.href = certificateUrl;
      link.download = `${organizationName.replace(/\s+/g, '_')}_Compliance_Certificate.pdf`;
      link.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">
            Compliance Certificate
          </h1>
          <p className="page-subtitle">
            Generate your official compliance completion certificate
          </p>
        </div>
        {isEligible && (
          <div className="flex items-center gap-2 px-4 py-2 bg-status-success/10 text-status-success rounded-lg border border-status-success/30">
            <Trophy className="w-5 h-5" />
            <span className="font-semibold text-sm">100% Complete</span>
          </div>
        )}
      </div>

      {/* Certificate Preview Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        {/* Top Accent */}
        <div className="h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600" />

        {/* Certificate Preview */}
        <div
          className="relative p-8 md:p-12"
          style={{
            background: isEligible
              ? 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)'
              : 'linear-gradient(180deg, #F1F5F9 0%, #E2E8F0 100%)',
          }}
        >
          {/* Corner Decorations */}
          <div className="absolute top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-blue-300 dark:border-blue-600 rounded-tl" />
          <div className="absolute top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-blue-300 dark:border-blue-600 rounded-tr" />
          <div className="absolute bottom-4 left-4 w-12 h-12 border-l-2 border-b-2 border-blue-300 dark:border-blue-600 rounded-bl" />
          <div className="absolute bottom-4 right-4 w-12 h-12 border-r-2 border-b-2 border-blue-300 dark:border-blue-600 rounded-br" />

          <div className="text-center relative z-10">
            {/* Logo */}
            <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>

            <p className="text-blue-600 font-semibold text-xs tracking-widest uppercase mb-2">
              LYDELL SECURITY
            </p>

            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-6">
              Certificate of Compliance
            </h2>

            <p className="text-slate-600 dark:text-slate-400 mb-2 text-sm">This is to certify that</p>

            <h3 className="text-xl md:text-2xl font-bold text-blue-700 dark:text-blue-400 mb-2">
              {organizationName}
            </h3>
            <div className="w-48 h-0.5 bg-blue-200 dark:bg-blue-700 mx-auto mb-6" />

            <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-lg mx-auto text-sm">
              has successfully achieved {totalScore}% compliance across all security controls
              and has demonstrated adherence to industry-leading frameworks.
            </p>

            {/* Framework Badges */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {frameworkProgress.map(fw => (
                <div
                  key={fw.id}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    fw.percentage === 100
                      ? 'bg-white dark:bg-slate-700 border border-green-300 dark:border-green-700 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {fw.percentage === 100 && (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    )}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{fw.name}</span>
                    <span
                      className={`text-xs font-medium ${
                        fw.percentage === 100 ? 'text-green-600 dark:text-green-400' : 'text-slate-500'
                      }`}
                    >
                      {fw.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Controls Summary */}
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              {stats.compliantControls} of {stats.totalControls} Security Controls Verified
            </p>

            {/* Date */}
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Locked Overlay */}
          {!isEligible && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800/95">
              <div className="text-center px-6">
                <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Certificate Locked
                </h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm text-sm">
                  Achieve 100% compliance to unlock your certificate.
                  Current score: {totalScore}%
                </p>
                <div className="mt-4 w-56 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${totalScore}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-blue-600 rounded-full"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {stats.totalControls - stats.compliantControls} controls remaining
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {certificateUrl ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium text-sm">Certificate Generated!</span>
                {certificateId && (
                  <code className="text-xs bg-green-100 dark:bg-green-800/50 px-2 py-0.5 rounded font-mono">
                    {certificateId}
                  </code>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Certificate
                </button>
                {certificateUrl.startsWith('http') && (
                  <a
                    href={certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-lg font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm">
                {isEligible ? (
                  <>
                    <Award className="w-5 h-5 text-amber-500" />
                    <span className="text-slate-600 dark:text-slate-300">
                      Congratulations! You're eligible for certification.
                    </span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-500 dark:text-slate-400">
                      Complete all controls to generate your certificate.
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={handleGenerate}
                disabled={!isEligible || isGenerating}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4" />
                    Generate Certificate
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">Tamper-Proof</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Each certificate includes a unique hash for verification.
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
          <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">Verifiable</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Auditors can verify certificate authenticity using the document hash.
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-3">
            <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">Professional</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            High-quality PDF ready for printing or digital distribution.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CertificateGenerator;
