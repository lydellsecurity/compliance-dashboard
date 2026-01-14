/**
 * Policy Generator Component
 *
 * Generates professional PDF policy documents for compliance controls.
 * Includes organization branding, remediation steps, and signature placeholders.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, Loader2, CheckCircle, AlertCircle, X,
  Building2, Shield, FileCheck,
} from 'lucide-react';
import type { MasterControl } from '../constants/controls';
import { getRemediationGuidance } from '../constants/remediations';
import { EXTENDED_REMEDIATIONS } from '../constants/remediations-extended';
import { useAuth } from '../hooks/useAuth';

// ============================================================================
// TYPES
// ============================================================================

interface PolicyGeneratorProps {
  control: MasterControl;
  organizationName?: string;
}

interface PolicyGeneratorModalProps {
  control: MasterControl | null;
  isOpen: boolean;
  onClose: () => void;
  organizationName?: string;
}

type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

// ============================================================================
// HOOKS
// ============================================================================

function usePolicyGeneration() {
  const { session } = useAuth();
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const generatePolicy = useCallback(async (
    control: MasterControl,
    organizationName: string
  ): Promise<void> => {
    if (!session?.access_token) {
      setError('You must be logged in to generate policies');
      setStatus('error');
      return;
    }

    setStatus('generating');
    setError(null);

    try {
      // Get remediation guidance if available
      const guidance = getRemediationGuidance(control.id) || EXTENDED_REMEDIATIONS[control.id];

      const payload = {
        controlId: control.id,
        controlTitle: control.title,
        controlDescription: control.description,
        organizationName,
        riskLevel: control.riskLevel,
        frameworks: control.frameworkMappings,
        securityPrinciple: guidance?.strategy?.principle || null,
        remediationSteps: guidance?.strategy?.keyObjectives || [],
      };

      const response = await fetch('/.netlify/functions/generate-policy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate policy: ${response.status}`);
      }

      // Get the PDF blob
      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('Generated policy was empty. Please try again.');
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${control.id}-security-policy.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

      setStatus('success');

      // Reset status after delay
      setTimeout(() => {
        setStatus('idle');
      }, 3000);

    } catch (err) {
      console.error('Policy generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate policy');
      setStatus('error');
    }
  }, [session]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, generatePolicy, reset };
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Inline button for control cards
export const PolicyGeneratorButton: React.FC<PolicyGeneratorProps> = ({
  control,
  organizationName = 'LYDELL SECURITY',
}) => {
  const { status, error, generatePolicy, reset } = usePolicyGeneration();

  const handleGenerate = async () => {
    await generatePolicy(control, organizationName);
  };

  return (
    <div className="relative">
      <button
        onClick={handleGenerate}
        disabled={status === 'generating'}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
          ${status === 'generating'
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-500 cursor-wait'
            : status === 'success'
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
              : status === 'error'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 hover:bg-violet-200 dark:hover:bg-violet-900/50'
          }
        `}
      >
        {status === 'generating' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating...</span>
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>Downloaded!</span>
          </>
        ) : status === 'error' ? (
          <>
            <AlertCircle className="w-4 h-4" />
            <span>Failed</span>
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            <span>Generate Policy</span>
          </>
        )}
      </button>

      {/* Error tooltip */}
      {status === 'error' && error && (
        <div className="absolute top-full left-0 mt-2 z-10">
          <div className="p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg shadow-lg max-w-xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                <button
                  onClick={reset}
                  className="text-xs text-red-500 hover:text-red-600 mt-1 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Full modal for policy generation with preview
export const PolicyGeneratorModal: React.FC<PolicyGeneratorModalProps> = ({
  control,
  isOpen,
  onClose,
  organizationName = 'LYDELL SECURITY',
}) => {
  const { status, error, generatePolicy, reset } = usePolicyGeneration();
  const [customOrgName, setCustomOrgName] = useState(organizationName);

  if (!control) return null;

  const guidance = getRemediationGuidance(control.id) || EXTENDED_REMEDIATIONS[control.id];

  const handleGenerate = async () => {
    await generatePolicy(control, customOrgName);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

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
            className="modal-backdrop"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="w-full max-w-2xl modal-content rounded-2xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-violet-500 to-purple-600">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <FileCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Generate Policy Document</h2>
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
              <div className="p-6 space-y-6">
                {/* Organization Name Input */}
                <div>
                  <label className="block text-sm font-semibold text-secondary mb-2">
                    Organization Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-steel-400" />
                    <input
                      type="text"
                      value={customOrgName}
                      onChange={e => setCustomOrgName(e.target.value)}
                      className="input pl-11"
                      placeholder="Enter organization name"
                    />
                  </div>
                </div>

                {/* Preview Section */}
                <div className="p-4 bg-slate-50 dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700">
                  <h3 className="font-semibold text-primary mb-3">Document Preview</h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-framework-hipaa mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-secondary">Control:</span>
                        <span className="text-slate-500 dark:text-steel-400 ml-2">{control.title}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-framework-hipaa mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-secondary">Risk Level:</span>
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                          control.riskLevel === 'critical' ? 'bg-status-risk/10 text-status-risk' :
                          control.riskLevel === 'high' ? 'bg-status-warning/10 text-status-warning' :
                          control.riskLevel === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-status-success/10 text-status-success'
                        }`}>
                          {control.riskLevel.charAt(0).toUpperCase() + control.riskLevel.slice(1)}
                        </span>
                      </div>
                    </div>

                    {guidance?.strategy?.principle && (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-framework-hipaa mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-secondary">Security Principle:</span>
                          <span className="text-slate-500 dark:text-steel-400 ml-2">{guidance.strategy.principle}</span>
                        </div>
                      </div>
                    )}

                    {control.frameworkMappings.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-framework-hipaa mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-secondary">Frameworks:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {control.frameworkMappings.map((m, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-slate-200 dark:bg-steel-700 rounded text-xs text-secondary"
                              >
                                {m.frameworkId} {m.clauseId}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Contents */}
                <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
                  <h3 className="font-semibold text-violet-900 dark:text-violet-300 mb-2">Document Contents</h3>
                  <ul className="space-y-1 text-sm text-violet-700 dark:text-violet-400">
                    <li>• Professional cover page with organization branding</li>
                    <li>• Purpose, scope, and policy statement sections</li>
                    <li>• Implementation requirements and remediation steps</li>
                    <li>• Roles and responsibilities matrix</li>
                    <li>• Compliance and enforcement guidelines</li>
                    <li>• Authorized signature placeholders</li>
                  </ul>
                </div>

                {/* Error Message */}
                {status === 'error' && error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800 dark:text-red-300">Generation Failed</p>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {status === 'success' && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <p className="font-medium text-emerald-800 dark:text-emerald-300">
                        Policy document generated and downloaded successfully!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-steel-700 bg-slate-50 dark:bg-steel-800">
                <button
                  onClick={handleClose}
                  className="px-4 py-2.5 text-secondary hover:text-primary font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={status === 'generating' || !customOrgName.trim()}
                  className={`
                    flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all
                    ${status === 'generating'
                      ? 'bg-violet-400 text-white cursor-wait'
                      : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {status === 'generating' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Generate & Download
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PolicyGeneratorButton;
