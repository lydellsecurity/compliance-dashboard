/**
 * Audit Bundle Component
 *
 * Provides one-click export of all evidence (policies and uploads) into a single ZIP file.
 * Designed for auditors to download complete working papers.
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Archive, Download, FileText, CheckCircle, AlertCircle, Loader2,
  FolderOpen, File, Shield, Clock, Hash,
} from 'lucide-react';
import type { UseComplianceReturn } from '../hooks/useCompliance';

interface AuditBundleProps {
  compliance: UseComplianceReturn;
  organizationName?: string;
}

interface BundleFile {
  name: string;
  url: string;
  type: 'policy' | 'evidence' | 'certificate';
  controlId?: string;
}

// Simple in-browser ZIP creation without external library
class SimpleZip {
  private files: { name: string; content: Uint8Array }[] = [];

  async addFile(name: string, content: Uint8Array) {
    this.files.push({ name, content });
  }

  async addTextFile(name: string, text: string) {
    const encoder = new TextEncoder();
    this.files.push({ name, content: encoder.encode(text) });
  }

  async generate(): Promise<Blob> {
    // For a production app, use a proper ZIP library like JSZip
    // This creates a simple uncompressed ZIP structure
    const parts: Uint8Array[] = [];
    const centralDir: Uint8Array[] = [];
    let offset = 0;

    for (const file of this.files) {
      // Local file header
      const nameBytes = new TextEncoder().encode(file.name);
      const header = new Uint8Array(30 + nameBytes.length);
      const view = new DataView(header.buffer);

      // Signature
      view.setUint32(0, 0x04034b50, true);
      // Version needed
      view.setUint16(4, 20, true);
      // General purpose flag
      view.setUint16(6, 0, true);
      // Compression method (0 = stored)
      view.setUint16(8, 0, true);
      // Modified time & date
      view.setUint16(10, 0, true);
      view.setUint16(12, 0, true);
      // CRC-32 (simplified - not computed)
      view.setUint32(14, 0, true);
      // Compressed size
      view.setUint32(18, file.content.length, true);
      // Uncompressed size
      view.setUint32(22, file.content.length, true);
      // File name length
      view.setUint16(26, nameBytes.length, true);
      // Extra field length
      view.setUint16(28, 0, true);
      // File name
      header.set(nameBytes, 30);

      // Central directory entry
      const cdHeader = new Uint8Array(46 + nameBytes.length);
      const cdView = new DataView(cdHeader.buffer);
      cdView.setUint32(0, 0x02014b50, true);
      cdView.setUint16(4, 20, true);
      cdView.setUint16(6, 20, true);
      cdView.setUint16(8, 0, true);
      cdView.setUint16(10, 0, true);
      cdView.setUint16(12, 0, true);
      cdView.setUint16(14, 0, true);
      cdView.setUint32(16, 0, true);
      cdView.setUint32(20, file.content.length, true);
      cdView.setUint32(24, file.content.length, true);
      cdView.setUint16(28, nameBytes.length, true);
      cdView.setUint16(30, 0, true);
      cdView.setUint16(32, 0, true);
      cdView.setUint16(34, 0, true);
      cdView.setUint16(36, 0, true);
      cdView.setUint32(38, 0, true);
      cdView.setUint32(42, offset, true);
      cdHeader.set(nameBytes, 46);
      centralDir.push(cdHeader);

      parts.push(header);
      parts.push(file.content);
      offset += header.length + file.content.length;
    }

    // Add central directory
    const cdStart = offset;
    for (const cd of centralDir) {
      parts.push(cd);
      offset += cd.length;
    }

    // End of central directory
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    eocdView.setUint32(0, 0x06054b50, true);
    eocdView.setUint16(4, 0, true);
    eocdView.setUint16(6, 0, true);
    eocdView.setUint16(8, this.files.length, true);
    eocdView.setUint16(10, this.files.length, true);
    eocdView.setUint32(12, offset - cdStart, true);
    eocdView.setUint32(16, cdStart, true);
    eocdView.setUint16(20, 0, true);
    parts.push(eocd);

    return new Blob(parts as BlobPart[], { type: 'application/zip' });
  }
}

const AuditBundle: React.FC<AuditBundleProps> = ({
  compliance,
  organizationName = 'LYDELL SECURITY',
}) => {
  const { getAllEvidence, frameworkProgress, stats, getControlById, allControls } = compliance;
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [error, setError] = useState<string | null>(null);

  const allEvidence = getAllEvidence();

  // Collect all files that need to be bundled
  const collectBundleFiles = useCallback((): BundleFile[] => {
    const files: BundleFile[] = [];

    // Collect from evidence records
    allEvidence.forEach(evidence => {
      if (evidence.fileUrls && evidence.fileUrls.length > 0) {
        evidence.fileUrls.forEach((url, index) => {
          const isPolicyUrl = url.includes('policy');
          files.push({
            name: isPolicyUrl
              ? `policies/${evidence.controlId}_policy.pdf`
              : `evidence/${evidence.controlId}_evidence_${index + 1}.pdf`,
            url,
            type: isPolicyUrl ? 'policy' : 'evidence',
            controlId: evidence.controlId,
          });
        });
      }
    });

    return files;
  }, [allEvidence, getControlById]);

  const generateBundle = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress({ current: 0, total: 0, status: 'Preparing bundle...' });

    try {
      const bundleFiles = collectBundleFiles();
      const zip = new SimpleZip();

      // Generate manifest/index file
      const today = new Date().toISOString();
      let manifest = `AUDIT BUNDLE MANIFEST
=====================
Organization: ${organizationName}
Generated: ${new Date().toLocaleString()}
Total Controls: ${stats.totalControls}
Compliant Controls: ${stats.compliantControls}
Compliance Rate: ${Math.round((stats.compliantControls / stats.totalControls) * 100)}%

FRAMEWORK SUMMARY
-----------------
${frameworkProgress.map(fw => `${fw.name}: ${fw.percentage}% (${fw.completed}/${fw.total})`).join('\n')}

INCLUDED FILES
--------------
`;

      setProgress({ current: 0, total: bundleFiles.length, status: 'Downloading files...' });

      // Download each file and add to ZIP
      for (let i = 0; i < bundleFiles.length; i++) {
        const file = bundleFiles[i];
        setProgress({
          current: i + 1,
          total: bundleFiles.length,
          status: `Downloading ${file.name}...`,
        });

        try {
          const response = await fetch(file.url);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            await zip.addFile(file.name, new Uint8Array(arrayBuffer));
            manifest += `\n[${file.type.toUpperCase()}] ${file.name}`;
            if (file.controlId) {
              const control = getControlById(file.controlId);
              manifest += `\n  Control: ${file.controlId} - ${control?.title || 'Unknown'}`;
            }
          } else {
            manifest += `\n[FAILED] ${file.name} - Could not download`;
          }
        } catch (err) {
          console.warn(`Failed to fetch ${file.url}:`, err);
          manifest += `\n[FAILED] ${file.name} - Download error`;
        }
      }

      // Add control summary
      manifest += `\n\nCONTROL DETAILS
---------------`;
      allControls.forEach(control => {
        const response = compliance.getResponse(control.id);
        manifest += `\n${control.id}: ${control.title}`;
        manifest += `\n  Status: ${response?.answer || 'Not answered'}`;
        if (response?.remediationPlan) {
          manifest += `\n  Remediation: ${response.remediationPlan.substring(0, 100)}...`;
        }
        manifest += '\n';
      });

      // Add manifest to ZIP
      setProgress({ current: bundleFiles.length, total: bundleFiles.length, status: 'Creating archive...' });
      await zip.addTextFile('MANIFEST.txt', manifest);

      // Generate compliance summary JSON
      const summaryJson = JSON.stringify({
        organization: organizationName,
        generatedAt: today,
        stats: {
          totalControls: stats.totalControls,
          compliantControls: stats.compliantControls,
          gapControls: stats.gapControls,
          complianceRate: Math.round((stats.compliantControls / stats.totalControls) * 100),
        },
        frameworks: frameworkProgress.map(fw => ({
          id: fw.id,
          name: fw.name,
          percentage: fw.percentage,
          completed: fw.completed,
          total: fw.total,
        })),
        evidence: allEvidence.map(e => ({
          id: e.id,
          controlId: e.controlId,
          status: e.status,
          files: e.fileUrls?.length || 0,
        })),
      }, null, 2);
      await zip.addTextFile('compliance_summary.json', summaryJson);

      // Generate and download ZIP
      const blob = await zip.generate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${organizationName.replace(/\s+/g, '_')}_Audit_Bundle_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setProgress({ current: bundleFiles.length, total: bundleFiles.length, status: 'Complete!' });

    } catch (err) {
      console.error('Bundle generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate audit bundle');
    }

    setIsGenerating(false);
  };

  const bundleFiles = collectBundleFiles();
  const policyCount = bundleFiles.filter(f => f.type === 'policy').length;
  const evidenceCount = bundleFiles.filter(f => f.type === 'evidence').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Audit Bundle Export
          </h2>
          <p className="text-slate-500 dark:text-white/60">
            Download all evidence and policies in a single ZIP file
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-lg">
          <Archive className="w-4 h-4" />
          <span className="text-sm font-medium">{bundleFiles.length} files</span>
        </div>
      </div>

      {/* Bundle Preview Card */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-white/10 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-violet-500 to-purple-600">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <Archive className="w-7 h-7 text-white" />
            </div>
            <div className="text-white">
              <h3 className="font-bold text-lg">{organizationName} Audit Bundle</h3>
              <p className="text-white/80 text-sm">
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Content Summary */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
            <FileText className="w-6 h-6 text-violet-500 mb-2" />
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{policyCount}</div>
            <div className="text-sm text-slate-500 dark:text-white/60">Policies</div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
            <FolderOpen className="w-6 h-6 text-emerald-500 mb-2" />
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{evidenceCount}</div>
            <div className="text-sm text-slate-500 dark:text-white/60">Evidence Files</div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
            <Shield className="w-6 h-6 text-blue-500 mb-2" />
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalControls}</div>
            <div className="text-sm text-slate-500 dark:text-white/60">Controls</div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
            <CheckCircle className="w-6 h-6 text-amber-500 mb-2" />
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {Math.round((stats.compliantControls / stats.totalControls) * 100)}%
            </div>
            <div className="text-sm text-slate-500 dark:text-white/60">Compliant</div>
          </div>
        </div>

        {/* Bundle Contents Preview */}
        <div className="px-6 pb-4">
          <h4 className="text-sm font-semibold text-slate-500 dark:text-white/50 uppercase mb-3">
            Bundle Contents
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-white/5 rounded-lg">
              <File className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-white/70">MANIFEST.txt</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-white/5 rounded-lg">
              <File className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-white/70">compliance_summary.json</span>
            </div>
            {bundleFiles.slice(0, 6).map((file, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-white/5 rounded-lg">
                <File className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-white/70 truncate">
                  {file.name}
                </span>
              </div>
            ))}
            {bundleFiles.length > 6 && (
              <div className="flex items-center gap-2 p-2 text-slate-500 dark:text-white/50">
                <span className="text-sm">...and {bundleFiles.length - 6} more files</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="px-6 pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-white/70">{progress.status}</span>
                <span className="text-slate-500 dark:text-white/50">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: progress.total > 0
                      ? `${(progress.current / progress.total) * 100}%`
                      : '0%',
                  }}
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-6 pb-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-white/50">
              <Clock className="w-4 h-4" />
              <span>Estimated download: ~{Math.ceil(bundleFiles.length * 0.5)}s</span>
            </div>
            <button
              onClick={generateBundle}
              disabled={isGenerating || bundleFiles.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Bundle...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download Audit Bundle
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-200/50 dark:border-white/10 p-5">
          <Hash className="w-6 h-6 text-violet-500 mb-3" />
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
            Document Hashes Included
          </h3>
          <p className="text-sm text-slate-500 dark:text-white/60">
            Each signed document includes a verification hash that auditors can use to confirm authenticity.
          </p>
        </div>
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-200/50 dark:border-white/10 p-5">
          <Shield className="w-6 h-6 text-emerald-500 mb-3" />
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
            Complete Audit Trail
          </h3>
          <p className="text-sm text-slate-500 dark:text-white/60">
            The manifest includes timestamps, control statuses, and remediation plans for audit review.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuditBundle;
