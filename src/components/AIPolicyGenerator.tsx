/**
 * AI Policy Generator Component
 *
 * Generates dynamic policy documents using Claude API with live streaming display.
 * Includes 'Approve & Save' to generate PDF and save to Evidence Locker.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Download, CheckCircle, AlertCircle, X,
  Copy, Check, Printer, FileCheck, Loader2, ExternalLink, ShieldCheck,
} from 'lucide-react';
import type { MasterControl } from '../constants/controls';
import { complianceDb } from '../services/compliance-database.service';
import confetti from 'canvas-confetti';

// ============================================================================
// TYPES
// ============================================================================

interface AIPolicyGeneratorProps {
  control: MasterControl;
  organizationName?: string;
  onSaveToEvidence?: (controlId: string, policyContent: string, metadata: PolicyMetadata) => void;
}

interface AIPolicyModalProps {
  control: MasterControl | null;
  isOpen: boolean;
  onClose: () => void;
  organizationName?: string;
  onSaveToEvidence?: (controlId: string, policyContent: string, metadata: PolicyMetadata) => void;
}

export interface PolicyMetadata {
  companyName: string;
  controlId: string;
  controlTitle: string;
  riskLevel: string;
  frameworks: string;
  generatedAt: string;
  model: string;
}

interface SaveResult {
  success: boolean;
  evidenceUrl?: string;
  fileName?: string;
  error?: string;
  controlMarkedCompliant?: boolean;
  triggerConfetti?: boolean;
  documentHash?: string;
  isVerified?: boolean;
}

// Confetti celebration for closing critical risks
function triggerConfettiCelebration() {
  // First burst
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#10B981', '#059669', '#34D399', '#6EE7B7', '#A7F3D0'],
  });

  // Second burst after a short delay
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#8B5CF6', '#7C3AED', '#A78BFA'],
    });
  }, 150);

  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#8B5CF6', '#7C3AED', '#A78BFA'],
    });
  }, 300);
}

type GenerationStatus = 'idle' | 'generating' | 'streaming' | 'success' | 'error' | 'saving';

// ============================================================================
// HOOKS
// ============================================================================

function useAIPolicyGeneration() {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<string>('');
  const [displayedPolicy, setDisplayedPolicy] = useState<string>('');
  const [metadata, setMetadata] = useState<PolicyMetadata | null>(null);
  const streamingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Simulate streaming effect for the typing animation
  const simulateStreaming = useCallback((fullText: string) => {
    streamingRef.current = true;
    setStatus('streaming');
    setDisplayedPolicy('');

    let currentIndex = 0;
    const chunkSize = 8; // Characters per chunk
    const intervalMs = 15; // Speed of typing

    const streamInterval = setInterval(() => {
      if (!streamingRef.current) {
        clearInterval(streamInterval);
        return;
      }

      if (currentIndex < fullText.length) {
        const nextIndex = Math.min(currentIndex + chunkSize, fullText.length);
        setDisplayedPolicy(fullText.substring(0, nextIndex));
        currentIndex = nextIndex;
      } else {
        clearInterval(streamInterval);
        streamingRef.current = false;
        setStatus('success');
      }
    }, intervalMs);

    return () => {
      clearInterval(streamInterval);
      streamingRef.current = false;
    };
  }, []);

  const generatePolicy = useCallback(async (
    control: MasterControl,
    organizationName: string
  ): Promise<void> => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setStatus('generating');
    setError(null);
    setPolicy('');
    setDisplayedPolicy('');
    setMetadata(null);

    try {
      const payload = {
        control_id: control.id,
        company_name: organizationName,
        stream: true,
        framework_context: {
          controlTitle: control.title,
          controlDescription: control.description,
          riskLevel: control.riskLevel,
          frameworks: control.frameworkMappings,
          guidance: control.guidance,
          evidenceExamples: control.evidenceExamples,
          remediationTip: control.remediationTip,
        },
      };

      const response = await fetch('/.netlify/functions/generate-ai-policy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate policy: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.policy) {
        throw new Error('Invalid response from policy generator');
      }

      setPolicy(data.policy);
      setMetadata(data.metadata);

      // Start streaming animation
      simulateStreaming(data.policy);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }
      console.error('AI Policy generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate policy');
      setStatus('error');
    }
  }, [simulateStreaming]);

  const skipAnimation = useCallback(() => {
    streamingRef.current = false;
    setDisplayedPolicy(policy);
    setStatus('success');
  }, [policy]);

  const reset = useCallback(() => {
    streamingRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus('idle');
    setError(null);
    setPolicy('');
    setDisplayedPolicy('');
    setMetadata(null);
  }, []);

  return {
    status,
    setStatus,
    error,
    policy,
    displayedPolicy,
    metadata,
    generatePolicy,
    skipAnimation,
    reset,
    isStreaming: streamingRef.current,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Simple markdown to HTML converter for basic rendering
function markdownToHtml(markdown: string): string {
  let html = markdown
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-slate-800 dark:text-white mt-6 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3 pb-2 border-b border-slate-200 dark:border-white/10">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto my-4 text-sm"><code>$1</code></pre>')
    .replace(/`(.*?)`/g, '<code class="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm">$1</code>')
    // Lists
    .replace(/^\s*[-*]\s+(.*$)/gim, '<li class="ml-4 text-slate-700 dark:text-white/80">$1</li>')
    .replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li class="ml-4 text-slate-700 dark:text-white/80 list-decimal">$2</li>')
    // Blockquotes
    .replace(/^>\s+(.*$)/gim, '<blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 text-slate-700 dark:text-white/80">$1</blockquote>')
    // Horizontal rules
    .replace(/^---$/gim, '<hr class="my-6 border-slate-200 dark:border-white/10" />')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="text-slate-700 dark:text-white/80 my-3 leading-relaxed">')
    // Line breaks
    .replace(/\n/g, '<br />');

  // Wrap in paragraph tags
  html = `<p class="text-slate-700 dark:text-white/80 my-3 leading-relaxed">${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p[^>]*><\/p>/g, '');
  html = html.replace(/<p[^>]*><br \/><\/p>/g, '');

  // Wrap consecutive li elements in ul
  html = html.replace(/(<li[^>]*>.*?<\/li>)+/g, '<ul class="list-disc my-3 space-y-1">$&</ul>');

  return html;
}

// Export to PDF via print dialog
function exportToPDF(policy: string, metadata: PolicyMetadata | null) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const htmlContent = markdownToHtml(policy);

  printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>${metadata?.controlId || 'Policy'} - Security Policy</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 24px; color: #111827; margin-bottom: 16px; }
    h2 { font-size: 18px; color: #1f2937; margin-top: 24px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
    h3 { font-size: 16px; color: #374151; margin-top: 16px; margin-bottom: 8px; }
    p { margin-bottom: 12px; }
    ul, ol { margin-left: 24px; margin-bottom: 12px; }
    li { margin-bottom: 4px; }
    strong { font-weight: 600; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
    pre { background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; }
    blockquote { border-left: 4px solid #3b82f6; padding-left: 16px; margin: 16px 0; background: #eff6ff; padding: 12px 16px; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .meta { color: #6b7280; font-size: 14px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${metadata?.companyName || 'Organization'}</h1>
    <div class="meta">
      <strong>${metadata?.controlId}</strong> - Security Policy Document<br />
      Generated: ${today} | Classification: Internal
    </div>
  </div>
  <div class="content">${htmlContent}</div>
  <div class="footer">
    <p>Generated by AI Policy Generator | ${metadata?.companyName || 'Organization'} - Confidential</p>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>
  `);
  printWindow.document.close();
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Animated loading component
const GeneratingAnimation: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="relative w-20 h-20">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-4 border-violet-200 dark:border-violet-900" />
      {/* Spinning ring */}
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
      {/* Inner glow */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 opacity-20 animate-pulse" />
      {/* Icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-violet-500 animate-pulse" />
      </div>
    </div>
    <h3 className="mt-6 text-lg font-semibold text-slate-900 dark:text-white">
      Generating Policy with AI
    </h3>
    <p className="mt-2 text-sm text-slate-500 dark:text-white/50 text-center max-w-sm">
      Our GRC consultant AI is crafting a comprehensive, board-ready policy document...
    </p>
    <div className="mt-4 flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

// Streaming text display with cursor
const StreamingDisplay: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && isStreaming) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [content, isStreaming]);

  return (
    <div
      ref={containerRef}
      className="relative p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 overflow-auto max-h-[50vh] font-mono text-sm"
    >
      <div
        className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
      />
      {isStreaming && (
        <span className="inline-block w-2 h-5 bg-violet-500 animate-pulse ml-1" />
      )}
    </div>
  );
};

// Verified Badge Component - shows when a control has a signed policy
export const VerifiedPolicyBadge: React.FC<{ evidenceUrl?: string | null }> = ({ evidenceUrl }) => {
  if (!evidenceUrl) return null;

  return (
    <a
      href={evidenceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
      title="View signed policy document"
    >
      <ShieldCheck className="w-3.5 h-3.5" />
      <span>Verified</span>
    </a>
  );
};

// Inline button for control cards - only shows for 'no' or 'partial' responses
export const AIPolicyGeneratorButton: React.FC<AIPolicyGeneratorProps & {
  controlResponse?: 'yes' | 'no' | 'partial' | 'na' | null;
  evidenceUrl?: string | null;
}> = ({
  control,
  organizationName = 'LYDELL SECURITY',
  onSaveToEvidence,
  controlResponse,
  evidenceUrl,
}) => {
  const [showModal, setShowModal] = useState(false);

  // Show verified badge if we have evidence
  if (evidenceUrl) {
    return <VerifiedPolicyBadge evidenceUrl={evidenceUrl} />;
  }

  // Only show generate button for controls marked as 'no' or 'partial' (gaps)
  const shouldShow = controlResponse === 'no' || controlResponse === 'partial';

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg hover:shadow-violet-500/25"
      >
        <Sparkles className="w-4 h-4" />
        <span>Generate AI Policy</span>
      </button>

      <AIPolicyModal
        control={showModal ? control : null}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        organizationName={organizationName}
        onSaveToEvidence={onSaveToEvidence}
      />
    </>
  );
};

// Full modal for AI policy generation with live streaming
export const AIPolicyModal: React.FC<AIPolicyModalProps> = ({
  control,
  isOpen,
  onClose,
  organizationName = 'LYDELL SECURITY',
  onSaveToEvidence,
}) => {
  const {
    status,
    setStatus,
    error,
    policy,
    displayedPolicy,
    metadata,
    generatePolicy,
    skipAnimation,
    reset,
  } = useAIPolicyGeneration();

  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [documentHash, setDocumentHash] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState('Compliance Officer');

  if (!control) return null;

  const handleGenerate = async () => {
    await generatePolicy(control, organizationName);
  };

  const handleClose = () => {
    reset();
    setSaved(false);
    setSaveError(null);
    setEvidenceUrl(null);
    setDocumentHash(null);
    onClose();
  };

  const handleCopy = async () => {
    if (policy) {
      await navigator.clipboard.writeText(policy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportPDF = () => {
    if (policy) {
      exportToPDF(policy, metadata);
    }
  };

  const handleApproveAndSave = async () => {
    if (!policy || !metadata) return;

    setStatus('saving');
    setSaveError(null);

    try {
      // Get organization ID and user info from the compliance database service
      const organizationId = complianceDb.getOrganizationId();
      const userName = complianceDb.getUserName() || 'Authorized User';

      if (!organizationId) {
        // If no org ID, fall back to local-only behavior
        if (onSaveToEvidence) {
          onSaveToEvidence(control.id, policy, metadata);
        }
        exportToPDF(policy, metadata);
        setSaved(true);
        setStatus('success');

        // Still trigger confetti for critical/high risk locally
        if (control.riskLevel === 'critical' || control.riskLevel === 'high') {
          triggerConfettiCelebration();
        }
        return;
      }

      // Save to Supabase Storage via Netlify function
      const response = await fetch('/.netlify/functions/save-policy-evidence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          policyMarkdown: policy,
          metadata,
          organizationId,
          controlId: control.id,
          userName,
          jobTitle,
          riskLevel: control.riskLevel,
        }),
      });

      const result: SaveResult = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save policy');
      }

      // Store the evidence URL and document hash
      setEvidenceUrl(result.evidenceUrl || null);
      setDocumentHash(result.documentHash || null);

      // Also call the local save handler if provided
      if (onSaveToEvidence) {
        onSaveToEvidence(control.id, policy, metadata);
      }

      setSaved(true);
      setStatus('success');

      // Trigger confetti celebration for critical risk closures!
      if (result.triggerConfetti) {
        triggerConfettiCelebration();
      }

    } catch (err) {
      console.error('Save policy error:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save policy');
      setStatus('success'); // Keep success so user can retry
    }
  };

  const isStreaming = status === 'streaming';
  const isSaving = status === 'saving';
  const showContent = status === 'streaming' || status === 'success' || status === 'saving';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-violet-500 to-purple-600 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">AI Policy Generator</h2>
                    <p className="text-white/80 text-sm">{control.id} - {control.title}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {status === 'idle' && (
                  <div className="space-y-6">
                    {/* Control Info */}
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Control Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-slate-600 dark:text-white/60">Control ID:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">{control.id}</span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600 dark:text-white/60">Risk Level:</span>
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                            control.riskLevel === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            control.riskLevel === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            control.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {control.riskLevel.charAt(0).toUpperCase() + control.riskLevel.slice(1)}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium text-slate-600 dark:text-white/60">Title:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">{control.title}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium text-slate-600 dark:text-white/60">Frameworks:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {control.frameworkMappings.map((m, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-slate-200 dark:bg-white/10 rounded text-xs text-slate-600 dark:text-white/60"
                              >
                                {m.frameworkId} {m.clauseId}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Generation Info */}
                    <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
                      <h3 className="font-semibold text-violet-900 dark:text-violet-300 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        GRC Consultant AI
                      </h3>
                      <p className="text-sm text-violet-700 dark:text-violet-400 mb-3">
                        Generate a comprehensive, board-ready policy document with mandatory sections:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm text-violet-600 dark:text-violet-400">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Purpose Statement</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Scope Definition</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Policy Statement</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Enforcement</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Roles & Responsibilities</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Implementation Requirements</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {status === 'generating' && <GeneratingAnimation />}

                {status === 'error' && (
                  <div className="space-y-6">
                    <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-red-800 dark:text-red-300">Generation Failed</h3>
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
                          <button
                            onClick={reset}
                            className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          >
                            Try Again
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {showContent && (
                  <div className="space-y-4">
                    {/* Status Banner */}
                    {isStreaming && (
                      <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                          <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                            Generating policy...
                          </span>
                        </div>
                        <button
                          onClick={skipAnimation}
                          className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
                        >
                          Skip animation
                        </button>
                      </div>
                    )}

                    {status === 'success' && !saved && (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                          <p className="font-medium text-emerald-800 dark:text-emerald-300">
                            Policy generated successfully! Review and approve to save to Evidence Locker.
                          </p>
                        </div>
                      </div>
                    )}

                    {isSaving && (
                      <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                          <p className="font-medium text-violet-800 dark:text-violet-300">
                            Saving policy to Evidence Locker...
                          </p>
                        </div>
                      </div>
                    )}

                    {saveError && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-red-500" />
                          <p className="font-medium text-red-800 dark:text-red-300">
                            {saveError}
                          </p>
                        </div>
                      </div>
                    )}

                    {saved && (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                                Policy Verified & Locked
                              </p>
                              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                Saved to Evidence Locker
                              </p>
                            </div>
                          </div>
                          {evidenceUrl && (
                            <a
                              href={evidenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View PDF
                            </a>
                          )}
                        </div>
                        {documentHash && (
                          <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-emerald-700">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Document Hash:</span>
                            <code className="text-xs font-mono text-emerald-600 dark:text-emerald-400">{documentHash}</code>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Job Title Input for E-Signature */}
                    {status === 'success' && !saved && (
                      <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
                        <label className="block text-sm font-medium text-violet-800 dark:text-violet-300 mb-2">
                          Your Job Title (for E-Signature)
                        </label>
                        <input
                          type="text"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          placeholder="e.g., Chief Information Security Officer"
                        />
                        <p className="mt-1.5 text-xs text-violet-600 dark:text-violet-400">
                          This will appear on the signed policy document along with your name and a unique document hash.
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {status === 'success' && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleCopy}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white/70 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Copied!' : 'Copy Markdown'}
                        </button>
                        <button
                          onClick={handleExportPDF}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white/70 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                          Print / Export PDF
                        </button>
                      </div>
                    )}

                    {/* Policy Content */}
                    <StreamingDisplay content={displayedPolicy} isStreaming={isStreaming} />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex-shrink-0">
                <div className="text-sm text-slate-500 dark:text-white/40">
                  {metadata && (
                    <span>Model: {metadata.model}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2.5 text-slate-600 dark:text-white/60 hover:text-slate-800 dark:hover:text-white font-medium transition-colors"
                  >
                    Close
                  </button>

                  {status === 'idle' && (
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Policy
                    </button>
                  )}

                  {status === 'error' && (
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25"
                    >
                      <Sparkles className="w-4 h-4" />
                      Try Again
                    </button>
                  )}

                  {isSaving && (
                    <button
                      disabled
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all bg-gradient-to-r from-violet-400 to-purple-400 text-white cursor-wait"
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </button>
                  )}

                  {status === 'success' && !saved && !isSaving && (
                    <button
                      onClick={handleApproveAndSave}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/25"
                    >
                      <FileCheck className="w-4 h-4" />
                      Approve & Save to Evidence
                    </button>
                  )}

                  {saved && (
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:shadow-lg hover:shadow-blue-500/25"
                    >
                      <Download className="w-4 h-4" />
                      Download Again
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AIPolicyGeneratorButton;
