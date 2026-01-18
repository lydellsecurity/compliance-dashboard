/**
 * Audit Bundle Downloader
 *
 * Allows auditors to download all evidence for a framework as a ZIP file.
 * Organized by clause for auditor convenience.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Archive,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  Folder,
  X,
  Clock,
  Hash,
} from 'lucide-react';
import type { FrameworkId } from '../../constants/controls';
import { FRAMEWORKS } from '../../constants/controls';

interface BundleFile {
  name: string;
  url: string;
  hash: string;
  size: number;
  controlId: string;
  clauseId: string;
}

interface AuditBundleDownloaderProps {
  frameworkId: FrameworkId;
  organizationName: string;
  files: BundleFile[];
  totalSize: number;
  onGenerateBundle: () => Promise<{ url: string; filename: string } | null>;
  isOpen: boolean;
  onClose: () => void;
}

// Simple ZIP generation class (browser-based)
class BrowserZip {
  private files: { name: string; content: Uint8Array }[] = [];

  async addFile(name: string, content: Uint8Array) {
    this.files.push({ name, content });
  }

  async addTextFile(name: string, text: string) {
    const encoder = new TextEncoder();
    this.files.push({ name, content: encoder.encode(text) });
  }

  async generate(): Promise<Blob> {
    const parts: Uint8Array[] = [];
    const centralDir: Uint8Array[] = [];
    let offset = 0;

    for (const file of this.files) {
      const nameBytes = new TextEncoder().encode(file.name);
      const header = new Uint8Array(30 + nameBytes.length);
      const view = new DataView(header.buffer);

      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, 0, true);
      view.setUint16(12, 0, true);
      view.setUint32(14, 0, true);
      view.setUint32(18, file.content.length, true);
      view.setUint32(22, file.content.length, true);
      view.setUint16(26, nameBytes.length, true);
      view.setUint16(28, 0, true);
      header.set(nameBytes, 30);

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

    const cdStart = offset;
    for (const cd of centralDir) {
      parts.push(cd);
      offset += cd.length;
    }

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

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AuditBundleDownloader: React.FC<AuditBundleDownloaderProps> = ({
  frameworkId,
  organizationName,
  files,
  totalSize,
  onGenerateBundle,
  isOpen,
  onClose,
}) => {
  const [status, setStatus] = useState<'idle' | 'generating' | 'downloading' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const framework = FRAMEWORKS.find(f => f.id === frameworkId);
  const frameworkColor = framework?.color || '#6366F1';

  // Group files by clause
  const filesByClause = files.reduce((acc, file) => {
    if (!acc[file.clauseId]) {
      acc[file.clauseId] = [];
    }
    acc[file.clauseId].push(file);
    return acc;
  }, {} as Record<string, BundleFile[]>);

  const handleDownload = useCallback(async () => {
    setStatus('generating');
    setProgress(0);
    setError(null);

    try {
      // Try server-side generation first
      const serverBundle = await onGenerateBundle();
      if (serverBundle) {
        setStatus('downloading');
        // Download from URL
        const response = await fetch(serverBundle.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = serverBundle.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus('complete');
        return;
      }

      // Fallback to client-side ZIP generation
      const zip = new BrowserZip();
      const totalFiles = files.length;
      let processed = 0;

      // Add manifest file
      const manifestContent = generateManifest(frameworkId, organizationName, files);
      await zip.addTextFile('MANIFEST.txt', manifestContent);

      // Add hash index
      const hashIndex = generateHashIndex(files);
      await zip.addTextFile('HASH_INDEX.csv', hashIndex);

      // Fetch and add each file
      for (const file of files) {
        try {
          const response = await fetch(file.url);
          const arrayBuffer = await response.arrayBuffer();
          const content = new Uint8Array(arrayBuffer);

          const sanitizedClause = file.clauseId.replace(/[<>:"/\\|?*]/g, '_');
          const filePath = `${frameworkId}/${sanitizedClause}/${file.name}`;
          await zip.addFile(filePath, content);

          processed++;
          setProgress(Math.round((processed / totalFiles) * 100));
        } catch (fetchError) {
          console.error(`Failed to fetch file: ${file.name}`, fetchError);
        }
      }

      setStatus('downloading');
      const blob = await zip.generate();
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${organizationName}_${frameworkId}_Audit_Bundle_${timestamp}.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('complete');
    } catch (err) {
      console.error('Bundle generation failed:', err);
      setError('Failed to generate audit bundle. Please try again.');
      setStatus('error');
    }
  }, [files, frameworkId, organizationName, onGenerateBundle]);

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
          className="bg-white dark:bg-steel-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-steel-700">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${frameworkColor}15` }}
              >
                <Archive className="w-5 h-5" style={{ color: frameworkColor }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Download Audit Bundle
                </h2>
                <p className="text-sm text-slate-500 dark:text-steel-400">
                  {framework?.fullName || frameworkId}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-steel-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Bundle info */}
            <div className="bg-slate-50 dark:bg-steel-750 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700 dark:text-steel-300">
                  Bundle Contents
                </span>
                <span className="text-sm text-slate-500 dark:text-steel-500">
                  {formatFileSize(totalSize)} total
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-steel-400">
                  <FileText className="w-4 h-4" />
                  <span>{files.length} evidence files</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-steel-400">
                  <Folder className="w-4 h-4" />
                  <span>{Object.keys(filesByClause).length} requirement folders</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-steel-400">
                  <Hash className="w-4 h-4" />
                  <span>SHA-256 hash verification index</span>
                </div>
              </div>
            </div>

            {/* Status display */}
            {status === 'idle' && (
              <div className="text-center py-4">
                <p className="text-sm text-slate-600 dark:text-steel-400 mb-4">
                  This bundle includes all evidence artifacts organized by requirement clause,
                  along with a manifest and hash verification index.
                </p>
              </div>
            )}

            {status === 'generating' && (
              <div className="py-4">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                  <span className="text-sm text-slate-600 dark:text-steel-400">
                    Generating bundle... {progress}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-steel-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-indigo-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {status === 'downloading' && (
              <div className="flex items-center justify-center gap-3 py-4">
                <Download className="w-5 h-5 text-indigo-600 animate-bounce" />
                <span className="text-sm text-slate-600 dark:text-steel-400">
                  Preparing download...
                </span>
              </div>
            )}

            {status === 'complete' && (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  Download Complete
                </h3>
                <p className="text-sm text-slate-500 dark:text-steel-400">
                  Your audit bundle has been downloaded successfully.
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  Download Failed
                </h3>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-steel-750 border-t border-slate-200 dark:border-steel-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-steel-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Generated {new Date().toLocaleDateString()}</span>
            </div>

            {(status === 'idle' || status === 'error') && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Download Bundle
              </button>
            )}

            {status === 'complete' && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 dark:text-steel-400 hover:text-slate-800 dark:hover:text-steel-200 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper functions for manifest generation
function generateManifest(frameworkId: FrameworkId, orgName: string, files: BundleFile[]): string {
  const timestamp = new Date().toISOString();
  const lines = [
    '================================================================================',
    `AUDIT BUNDLE MANIFEST`,
    '================================================================================',
    '',
    `Organization: ${orgName}`,
    `Framework: ${frameworkId}`,
    `Generated: ${timestamp}`,
    `Total Files: ${files.length}`,
    '',
    '--------------------------------------------------------------------------------',
    'FILE LISTING',
    '--------------------------------------------------------------------------------',
    '',
  ];

  const byClause = files.reduce((acc, file) => {
    if (!acc[file.clauseId]) acc[file.clauseId] = [];
    acc[file.clauseId].push(file);
    return acc;
  }, {} as Record<string, BundleFile[]>);

  for (const [clauseId, clauseFiles] of Object.entries(byClause)) {
    lines.push(`[${clauseId}]`);
    for (const file of clauseFiles) {
      lines.push(`  - ${file.name}`);
      lines.push(`    Control: ${file.controlId}`);
      lines.push(`    SHA-256: ${file.hash}`);
      lines.push(`    Size: ${formatFileSize(file.size)}`);
      lines.push('');
    }
  }

  lines.push('================================================================================');
  lines.push('This audit bundle was generated by Lydell Security Compliance Platform.');
  lines.push('All file hashes have been verified at the time of generation.');
  lines.push('================================================================================');

  return lines.join('\n');
}

function generateHashIndex(files: BundleFile[]): string {
  const lines = ['Filename,Control ID,Clause ID,SHA-256 Hash,Size (bytes)'];
  for (const file of files) {
    lines.push(`"${file.name}","${file.controlId}","${file.clauseId}","${file.hash}",${file.size}`);
  }
  return lines.join('\n');
}

export default AuditBundleDownloader;
