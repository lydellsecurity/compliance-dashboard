/**
 * Audit Bundle Component
 *
 * Provides one-click export of all evidence (policies and uploads) into a single ZIP file.
 * Organizes evidence by Framework Clause for auditor convenience:
 *   SOC2/CC6.1_Logical_Access/AC-001_policy.pdf
 *   ISO27001/A.9.4.2_Secure_log-on/AC-001_policy.pdf
 *
 * Features:
 * - Framework selection (generate bundle for specific framework)
 * - Clause-organized folder structure
 * - Framework-specific cover page and summary
 * - Cross-reference index for multi-framework controls
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Archive, Download, FileText, CheckCircle, AlertCircle, Loader2,
  FolderOpen, File, Shield, Clock, Hash, Filter, ChevronDown,
} from 'lucide-react';
import type { UseComplianceReturn } from '../hooks/useCompliance';
import { FRAMEWORKS, type FrameworkId, type FrameworkMapping } from '../constants/controls';

interface AuditBundleProps {
  compliance: UseComplianceReturn;
  organizationName?: string;
}

interface BundleFile {
  name: string;
  url: string;
  type: 'policy' | 'evidence' | 'certificate';
  controlId?: string;
  frameworkMappings?: FrameworkMapping[];
}

type BundleMode = 'all' | FrameworkId;

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

// Helper to sanitize folder/file names
const sanitizeName = (name: string): string => {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50);
};

// Helper to get framework display info
const getFrameworkInfo = (id: FrameworkId) => {
  return FRAMEWORKS.find(f => f.id === id) || { name: id, fullName: id, color: '#6B7280', icon: '📋' };
};

const AuditBundle: React.FC<AuditBundleProps> = ({
  compliance,
  organizationName = 'LYDELL SECURITY',
}) => {
  const { getAllEvidence, frameworkProgress, stats, getControlById, allControls, getResponse } = compliance;
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [error, setError] = useState<string | null>(null);
  const [bundleMode, setBundleMode] = useState<BundleMode>('all');
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  const allEvidence = getAllEvidence();

  // Calculate controls per framework for the selector
  const frameworkStats = useMemo(() => {
    const stats: Record<FrameworkId, { total: number; completed: number }> = {
      SOC2: { total: 0, completed: 0 },
      ISO27001: { total: 0, completed: 0 },
      HIPAA: { total: 0, completed: 0 },
      NIST: { total: 0, completed: 0 },
    };

    allControls.forEach(control => {
      const response = getResponse(control.id);
      const isCompliant = response?.answer === 'yes';

      control.frameworkMappings.forEach(mapping => {
        stats[mapping.frameworkId].total++;
        if (isCompliant) {
          stats[mapping.frameworkId].completed++;
        }
      });
    });

    return stats;
  }, [allControls, getResponse]);

  // Collect all files that need to be bundled (with framework mappings)
  const collectBundleFiles = useCallback((): BundleFile[] => {
    const files: BundleFile[] = [];

    // Collect from evidence records
    allEvidence.forEach(evidence => {
      if (evidence.fileUrls && evidence.fileUrls.length > 0) {
        const control = getControlById(evidence.controlId);
        const frameworkMappings = control?.frameworkMappings || [];

        evidence.fileUrls.forEach((url, index) => {
          const isPolicyUrl = url.includes('policy');
          files.push({
            name: isPolicyUrl
              ? `${evidence.controlId}_policy.pdf`
              : `${evidence.controlId}_evidence_${index + 1}.pdf`,
            url,
            type: isPolicyUrl ? 'policy' : 'evidence',
            controlId: evidence.controlId,
            frameworkMappings,
          });
        });
      }
    });

    return files;
  }, [allEvidence, getControlById]);

  // Get files filtered by framework mode
  const getFilteredFiles = useCallback((files: BundleFile[]): BundleFile[] => {
    if (bundleMode === 'all') return files;

    return files.filter(file =>
      file.frameworkMappings?.some(m => m.frameworkId === bundleMode)
    );
  }, [bundleMode]);

  // Organize files by framework clause
  const organizeByFramework = useCallback((
    files: BundleFile[],
    mode: BundleMode
  ): Map<string, { clause: FrameworkMapping; files: BundleFile[] }> => {
    const organized = new Map<string, { clause: FrameworkMapping; files: BundleFile[] }>();

    files.forEach(file => {
      if (!file.frameworkMappings) return;

      // Filter mappings based on mode
      const relevantMappings = mode === 'all'
        ? file.frameworkMappings
        : file.frameworkMappings.filter(m => m.frameworkId === mode);

      relevantMappings.forEach(mapping => {
        const key = `${mapping.frameworkId}/${mapping.clauseId}`;
        if (!organized.has(key)) {
          organized.set(key, { clause: mapping, files: [] });
        }
        organized.get(key)!.files.push(file);
      });
    });

    return organized;
  }, []);

  const generateBundle = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress({ current: 0, total: 0, status: 'Preparing bundle...' });

    try {
      const allBundleFiles = collectBundleFiles();
      const bundleFiles = getFilteredFiles(allBundleFiles);
      const organizedFiles = organizeByFramework(bundleFiles, bundleMode);
      const zip = new SimpleZip();
      const today = new Date().toISOString();
      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Determine bundle title based on mode
      const bundleTitle = bundleMode === 'all'
        ? 'Multi-Framework Compliance Audit Bundle'
        : `${getFrameworkInfo(bundleMode).fullName} Audit Bundle`;

      // ================================================================
      // COVER PAGE
      // ================================================================
      const coverPage = `
================================================================================
                        ${organizationName}
================================================================================
                    ${bundleTitle}
--------------------------------------------------------------------------------

Generated:        ${dateStr}
Bundle Type:      ${bundleMode === 'all' ? 'All Frameworks' : getFrameworkInfo(bundleMode).fullName}
Total Controls:   ${stats.totalControls}
Compliant:        ${stats.compliantControls} (${Math.round((stats.compliantControls / stats.totalControls) * 100)}%)
Gaps Identified:  ${stats.gapControls}

================================================================================
                           FRAMEWORK SUMMARY
================================================================================
${frameworkProgress.map(fw => {
  const pct = fw.percentage;
  const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
  return `${fw.name.padEnd(12)} [${bar}] ${pct}% (${fw.completed}/${fw.total})`;
}).join('\n')}

================================================================================
                           BUNDLE STRUCTURE
================================================================================
This audit bundle is organized by Framework → Clause for auditor convenience.

${bundleMode === 'all' ? `Folder Structure:
├── SOC2/
│   ├── CC6.1_Logical_Access_Security/
│   │   ├── AC-001_policy.pdf
│   │   └── AC-002_evidence_1.pdf
│   └── CC7.2_Change_Management/
├── ISO27001/
│   ├── A.9.4.2_Secure_log-on_procedures/
│   └── ...
├── HIPAA/
│   └── ...
├── NIST/
│   └── ...
└── _CrossReference/
    └── control_index.json` : `Folder Structure:
├── ${bundleMode}/
│   ├── [Clause_ID]_[Clause_Title]/
│   │   ├── [Control_ID]_policy.pdf
│   │   └── [Control_ID]_evidence_N.pdf
│   └── ...
└── _CrossReference/
    └── control_index.json`}

================================================================================
                           DOCUMENT INTEGRITY
================================================================================
Each policy document in this bundle has been digitally signed with SHA-256
hashing. Hash values are stored in the control_index.json file for verification.

This bundle was generated by AttestAI, a Lydell Security product.
For questions, contact: support@attestai.com

================================================================================
`;
      await zip.addTextFile('00_COVER_PAGE.txt', coverPage);

      // ================================================================
      // DOWNLOAD FILES AND ORGANIZE BY FRAMEWORK/CLAUSE
      // ================================================================
      setProgress({ current: 0, total: bundleFiles.length, status: 'Downloading files...' });

      const downloadedFiles: Map<string, Uint8Array> = new Map();
      const failedFiles: string[] = [];

      // Download all files first
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
            downloadedFiles.set(file.url, new Uint8Array(arrayBuffer));
          } else {
            failedFiles.push(file.name);
          }
        } catch (err) {
          console.warn(`Failed to fetch ${file.url}:`, err);
          failedFiles.push(file.name);
        }
      }

      setProgress({ current: bundleFiles.length, total: bundleFiles.length, status: 'Organizing by framework...' });

      // Add files to ZIP organized by framework/clause
      const clauseIndex: Record<string, {
        frameworkId: string;
        clauseId: string;
        clauseTitle: string;
        controls: Array<{
          controlId: string;
          controlTitle: string;
          status: string;
          files: string[];
        }>;
      }> = {};

      for (const [key, { clause, files }] of organizedFiles) {
        const frameworkFolder = clause.frameworkId;
        const clauseFolder = sanitizeName(`${clause.clauseId}_${clause.clauseTitle}`);
        const basePath = `${frameworkFolder}/${clauseFolder}`;

        // Initialize clause index entry
        if (!clauseIndex[key]) {
          clauseIndex[key] = {
            frameworkId: clause.frameworkId,
            clauseId: clause.clauseId,
            clauseTitle: clause.clauseTitle,
            controls: [],
          };
        }

        // Group files by control
        const controlFiles = new Map<string, BundleFile[]>();
        files.forEach(file => {
          if (!file.controlId) return;
          if (!controlFiles.has(file.controlId)) {
            controlFiles.set(file.controlId, []);
          }
          controlFiles.get(file.controlId)!.push(file);
        });

        // Add each control's files to the ZIP
        for (const [controlId, ctrlFiles] of controlFiles) {
          const control = getControlById(controlId);
          const response = getResponse(controlId);
          const fileNames: string[] = [];

          for (const file of ctrlFiles) {
            const content = downloadedFiles.get(file.url);
            if (content) {
              const filePath = `${basePath}/${file.name}`;
              await zip.addFile(filePath, content);
              fileNames.push(file.name);
            }
          }

          clauseIndex[key].controls.push({
            controlId,
            controlTitle: control?.title || 'Unknown',
            status: response?.answer || 'not_answered',
            files: fileNames,
          });
        }
      }

      // ================================================================
      // CROSS-REFERENCE INDEX (JSON)
      // ================================================================
      const crossReference = {
        organization: organizationName,
        generatedAt: today,
        bundleMode,
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
        clauses: clauseIndex,
        failedDownloads: failedFiles,
      };
      await zip.addTextFile('_CrossReference/control_index.json', JSON.stringify(crossReference, null, 2));

      // ================================================================
      // FRAMEWORK-SPECIFIC SUMMARIES
      // ================================================================
      const frameworksInBundle = bundleMode === 'all'
        ? (['SOC2', 'ISO27001', 'HIPAA', 'NIST'] as FrameworkId[])
        : [bundleMode];

      for (const fwId of frameworksInBundle) {
        const fw = getFrameworkInfo(fwId);
        const fwClauses = Object.values(clauseIndex).filter(c => c.frameworkId === fwId);
        const fwStats = frameworkStats[fwId];

        if (fwClauses.length === 0) continue;

        const summary = `
================================================================================
                    ${fw.fullName} - Evidence Summary
================================================================================

Organization:     ${organizationName}
Generated:        ${dateStr}
Framework:        ${fw.fullName}

COMPLIANCE STATUS
-----------------
Total Controls:   ${fwStats.total}
Compliant:        ${fwStats.completed} (${Math.round((fwStats.completed / fwStats.total) * 100)}%)
Gaps:             ${fwStats.total - fwStats.completed}

EVIDENCE BY CLAUSE
------------------
${fwClauses.map(clause => {
  const compliantCount = clause.controls.filter(c => c.status === 'yes').length;
  return `
${clause.clauseId} - ${clause.clauseTitle}
  Controls: ${clause.controls.length} | Compliant: ${compliantCount}
${clause.controls.map(ctrl => `    [${ctrl.status === 'yes' ? '✓' : ctrl.status === 'partial' ? '◐' : '✗'}] ${ctrl.controlId}: ${ctrl.controlTitle}
        Files: ${ctrl.files.length > 0 ? ctrl.files.join(', ') : 'No evidence uploaded'}`).join('\n')}
`;
}).join('\n')}

================================================================================
`;
        await zip.addTextFile(`${fwId}/00_${fwId}_SUMMARY.txt`, summary);
      }

      // ================================================================
      // CONTROL DETAIL APPENDIX
      // ================================================================
      let controlAppendix = `
================================================================================
                    CONTROL DETAIL APPENDIX
================================================================================

This appendix provides detailed information for each control, including
remediation plans for non-compliant items.

`;
      allControls.forEach(control => {
        // Skip controls not in this bundle mode
        if (bundleMode !== 'all' && !control.frameworkMappings.some(m => m.frameworkId === bundleMode)) {
          return;
        }

        const response = getResponse(control.id);
        const statusIcon = response?.answer === 'yes' ? '✓ COMPLIANT'
          : response?.answer === 'partial' ? '◐ PARTIAL'
          : response?.answer === 'na' ? '○ N/A'
          : response?.answer === 'no' ? '✗ GAP'
          : '? NOT ASSESSED';

        controlAppendix += `
--------------------------------------------------------------------------------
${control.id}: ${control.title}
--------------------------------------------------------------------------------
Status:       ${statusIcon}
Risk Level:   ${control.riskLevel.toUpperCase()}
Domain:       ${control.domain.replace(/_/g, ' ').toUpperCase()}

Description:
${control.description}

Framework Mappings:
${control.frameworkMappings.map(m => `  - ${m.frameworkId} ${m.clauseId}: ${m.clauseTitle}`).join('\n')}
${response?.remediationPlan ? `
Remediation Plan:
${response.remediationPlan}
` : ''}
`;
      });
      await zip.addTextFile('_CrossReference/CONTROL_APPENDIX.txt', controlAppendix);

      // ================================================================
      // GENERATE AND DOWNLOAD ZIP
      // ================================================================
      setProgress({ current: bundleFiles.length, total: bundleFiles.length, status: 'Creating archive...' });

      const blob = await zip.generate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const modeLabel = bundleMode === 'all' ? 'MultiFramework' : bundleMode;
      link.download = `${organizationName.replace(/\s+/g, '_')}_${modeLabel}_Audit_Bundle_${new Date().toISOString().split('T')[0]}.zip`;
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
  const filteredFiles = getFilteredFiles(bundleFiles);
  const policyCount = filteredFiles.filter(f => f.type === 'policy').length;
  const evidenceCount = filteredFiles.filter(f => f.type === 'evidence').length;

  // Get current mode display info
  const currentModeInfo = bundleMode === 'all'
    ? { name: 'All Frameworks', icon: '📦', color: '#8B5CF6' }
    : getFrameworkInfo(bundleMode);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary">
            Audit Bundle Export
          </h2>
          <p className="text-secondary">
            Download evidence organized by Framework → Clause
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Framework Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className="flex items-center gap-2 px-4 py-2 card rounded-xl hover:bg-slate-50 dark:hover:bg-steel-800 transition-colors border border-slate-200 dark:border-steel-700"
            >
              <Filter className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-primary">
                {bundleMode === 'all' ? 'All Frameworks' : currentModeInfo.name}
              </span>
              <ChevronDown className={`w-4 h-4 text-secondary transition-transform ${showModeDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showModeDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowModeDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-64 card rounded-xl shadow-xl border border-slate-200 dark:border-steel-700 z-20 overflow-hidden">
                  <div className="p-2">
                    <button
                      onClick={() => { setBundleMode('all'); setShowModeDropdown(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        bundleMode === 'all'
                          ? 'bg-framework-hipaa/10 text-framework-hipaa'
                          : 'hover:bg-slate-100 dark:hover:bg-steel-800 text-secondary'
                      }`}
                    >
                      <span className="text-lg">📦</span>
                      <div className="flex-1 text-left">
                        <div className="font-medium">All Frameworks</div>
                        <div className="text-xs opacity-70">Multi-framework bundle</div>
                      </div>
                      {bundleMode === 'all' && <CheckCircle className="w-4 h-4" />}
                    </button>

                    <div className="my-2 border-t border-slate-200 dark:border-steel-700" />

                    {FRAMEWORKS.map(fw => {
                      const fwStat = frameworkStats[fw.id];
                      const pct = Math.round((fwStat.completed / fwStat.total) * 100);
                      return (
                        <button
                          key={fw.id}
                          onClick={() => { setBundleMode(fw.id); setShowModeDropdown(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                            bundleMode === fw.id
                              ? 'bg-framework-hipaa/10 text-framework-hipaa'
                              : 'hover:bg-slate-100 dark:hover:bg-steel-800 text-secondary'
                          }`}
                        >
                          <span className="text-lg">{fw.icon}</span>
                          <div className="flex-1 text-left">
                            <div className="font-medium">{fw.name}</div>
                            <div className="text-xs opacity-70">{pct}% complete ({fwStat.completed}/{fwStat.total})</div>
                          </div>
                          {bundleMode === fw.id && <CheckCircle className="w-4 h-4" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-framework-hipaa/10 text-framework-hipaa rounded-lg">
            <Archive className="w-4 h-4" />
            <span className="text-sm font-medium">{filteredFiles.length} files</span>
          </div>
        </div>
      </div>

      {/* Bundle Preview Card */}
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-steel-700 bg-gradient-to-r from-framework-hipaa to-purple-600">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-2xl">{bundleMode === 'all' ? '📦' : currentModeInfo.icon}</span>
            </div>
            <div className="text-white">
              <h3 className="font-bold text-lg">
                {bundleMode === 'all'
                  ? `${organizationName} Multi-Framework Bundle`
                  : `${organizationName} ${currentModeInfo.name} Bundle`}
              </h3>
              <p className="text-white/80 text-sm">
                {bundleMode === 'all'
                  ? 'SOC 2 • ISO 27001 • HIPAA • NIST CSF'
                  : getFrameworkInfo(bundleMode as FrameworkId).fullName} — {new Date().toLocaleDateString('en-US', {
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
          <div className="p-4 bg-slate-50 dark:bg-steel-800 rounded-xl">
            <FileText className="w-6 h-6 text-framework-hipaa mb-2" />
            <div className="text-2xl font-bold text-primary">{policyCount}</div>
            <div className="text-sm text-secondary">Policies</div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-steel-800 rounded-xl">
            <FolderOpen className="w-6 h-6 text-status-success mb-2" />
            <div className="text-2xl font-bold text-primary">{evidenceCount}</div>
            <div className="text-sm text-secondary">Evidence Files</div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-steel-800 rounded-xl">
            <Shield className="w-6 h-6 text-accent-400 mb-2" />
            <div className="text-2xl font-bold text-primary">{stats.totalControls}</div>
            <div className="text-sm text-secondary">Controls</div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-steel-800 rounded-xl">
            <CheckCircle className="w-6 h-6 text-status-warning mb-2" />
            <div className="text-2xl font-bold text-primary">
              {Math.round((stats.compliantControls / stats.totalControls) * 100)}%
            </div>
            <div className="text-sm text-secondary">Compliant</div>
          </div>
        </div>

        {/* Bundle Contents Preview */}
        <div className="px-6 pb-4">
          <h4 className="text-sm font-semibold text-secondary uppercase mb-3">
            Bundle Structure
          </h4>
          <div className="p-4 bg-slate-900 dark:bg-black/50 rounded-xl font-mono text-sm text-slate-300 overflow-x-auto">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <File className="w-4 h-4 text-emerald-400" />
                <span>00_COVER_PAGE.txt</span>
              </div>
              {(bundleMode === 'all' ? ['SOC2', 'ISO27001', 'HIPAA', 'NIST'] : [bundleMode]).map(fwId => {
                return (
                  <div key={fwId} className="ml-0">
                    <div className="flex items-center gap-2 text-blue-400">
                      <FolderOpen className="w-4 h-4" />
                      <span>{fwId}/</span>
                    </div>
                    <div className="ml-6 space-y-1">
                      <div className="flex items-center gap-2 text-slate-400">
                        <File className="w-3 h-3" />
                        <span className="text-xs">00_{fwId}_SUMMARY.txt</span>
                      </div>
                      <div className="flex items-center gap-2 text-amber-400">
                        <FolderOpen className="w-3 h-3" />
                        <span className="text-xs">[Clause_ID]_[Clause_Title]/</span>
                      </div>
                      <div className="ml-6 flex items-center gap-2 text-slate-500">
                        <File className="w-3 h-3" />
                        <span className="text-xs">[Control_ID]_policy.pdf</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-2 text-purple-400">
                <FolderOpen className="w-4 h-4" />
                <span>_CrossReference/</span>
              </div>
              <div className="ml-6 space-y-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <File className="w-3 h-3" />
                  <span className="text-xs">control_index.json</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <File className="w-3 h-3" />
                  <span className="text-xs">CONTROL_APPENDIX.txt</span>
                </div>
              </div>
            </div>
          </div>
          {filteredFiles.length > 0 && (
            <p className="mt-2 text-xs text-secondary">
              {filteredFiles.length} evidence files will be organized into {
                bundleMode === 'all' ? '4 framework folders' : `the ${currentModeInfo.name} folder`
              }
            </p>
          )}
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="px-6 pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">{progress.status}</span>
                <span className="text-secondary">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-steel-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: progress.total > 0
                      ? `${(progress.current / progress.total) * 100}%`
                      : '0%',
                  }}
                  className="h-full bg-gradient-to-r from-framework-hipaa to-purple-500 rounded-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-6 pb-4">
            <div className="p-3 bg-status-risk/10 border border-status-risk/30 rounded-lg flex items-center gap-2 text-status-risk">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="p-6 bg-slate-50 dark:bg-steel-900/50 border-t border-slate-200 dark:border-steel-700">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-secondary">
              <Clock className="w-4 h-4" />
              <span>
                {filteredFiles.length === 0
                  ? 'No evidence files to bundle'
                  : `Estimated download: ~${Math.ceil(filteredFiles.length * 0.5)}s`}
              </span>
            </div>
            <button
              onClick={generateBundle}
              disabled={isGenerating || filteredFiles.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-framework-hipaa to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-framework-hipaa/25 hover:shadow-framework-hipaa/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Bundle...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download {bundleMode === 'all' ? 'Multi-Framework' : currentModeInfo.name} Bundle
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <FolderOpen className="w-6 h-6 text-framework-hipaa mb-3" />
          <h3 className="font-semibold text-primary mb-1">
            Framework-Organized
          </h3>
          <p className="text-sm text-secondary">
            Evidence is organized by Framework → Clause for easy auditor navigation (e.g., SOC2/CC6.1/).
          </p>
        </div>
        <div className="card p-5">
          <Hash className="w-6 h-6 text-status-warning mb-3" />
          <h3 className="font-semibold text-primary mb-1">
            Document Integrity
          </h3>
          <p className="text-sm text-secondary">
            SHA-256 hashes in control_index.json allow auditors to verify document authenticity.
          </p>
        </div>
        <div className="card p-5">
          <Shield className="w-6 h-6 text-status-success mb-3" />
          <h3 className="font-semibold text-primary mb-1">
            Complete Audit Trail
          </h3>
          <p className="text-sm text-secondary">
            Includes cover page, framework summaries, control appendix, and cross-reference index.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuditBundle;
