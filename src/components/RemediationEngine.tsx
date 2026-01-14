/**
 * Technical Remediation Engine Component
 *
 * Provides three-tier remediation guidance:
 * 1. Strategy - Platform-agnostic security principle
 * 2. Implementation - Cloud-specific commands (AWS, Azure, GCP)
 * 3. Verification - Evidence requirements for auditors
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, Shield, Server, CheckCircle2, AlertCircle,
  Copy, ExternalLink, Upload, FileText, Camera, Terminal,
  Cloud, BookOpen, Zap, Check,
} from 'lucide-react';
import {
  getRemediationGuidance,
  type RemediationGuidance,
  type CloudProvider,
  type CloudImplementation,
  type EvidenceRequirement,
} from '../constants/remediations';
import { EXTENDED_REMEDIATIONS } from '../constants/remediations-extended';

// ============================================================================
// TYPES
// ============================================================================

interface RemediationEngineProps {
  controlId: string;
  controlTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onUploadEvidence?: (controlId: string, evidenceType: EvidenceRequirement['type']) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CLOUD_PROVIDERS: { id: CloudProvider; name: string; color: string; icon: string }[] = [
  { id: 'aws', name: 'AWS', color: '#FF9900', icon: '☁️' },
  { id: 'azure', name: 'Azure', color: '#0078D4', icon: '⚡' },
  { id: 'gcp', name: 'Google Cloud', color: '#4285F4', icon: '🌐' },
];

const EVIDENCE_TYPE_CONFIG: Record<EvidenceRequirement['type'], { icon: React.ReactNode; color: string; label: string }> = {
  screenshot: { icon: <Camera className="w-4 h-4" />, color: '#3B82F6', label: 'Screenshot' },
  log: { icon: <Terminal className="w-4 h-4" />, color: '#10B981', label: 'Log Export' },
  document: { icon: <FileText className="w-4 h-4" />, color: '#8B5CF6', label: 'Document' },
  config: { icon: <Server className="w-4 h-4" />, color: '#F59E0B', label: 'Config File' },
  report: { icon: <BookOpen className="w-4 h-4" />, color: '#EC4899', label: 'Report' },
};

const EFFORT_CONFIG = {
  low: { label: 'Low Effort', color: '#10B981', description: '1-2 hours' },
  medium: { label: 'Medium Effort', color: '#F59E0B', description: '2-8 hours' },
  high: { label: 'High Effort', color: '#EF4444', description: '1-3 days' },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const GlassPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative rounded-xl overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-lg ${className}`}>
    {children}
  </div>
);

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
};

const CommandBlock: React.FC<{ command: string }> = ({ command }) => (
  <div className="relative group">
    <pre className="p-4 bg-slate-900 dark:bg-black/50 rounded-lg text-sm text-slate-100 overflow-x-auto font-mono whitespace-pre-wrap">
      {command}
    </pre>
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <CopyButton text={command} />
    </div>
  </div>
);

const TerraformBlock: React.FC<{ code: string }> = ({ code }) => (
  <div className="relative group">
    <div className="flex items-center gap-2 px-4 py-2 bg-purple-600 dark:bg-purple-900 rounded-t-lg">
      <span className="text-xs font-semibold text-white">Terraform Example</span>
    </div>
    <pre className="p-4 bg-slate-900 dark:bg-black/50 rounded-b-lg text-sm text-slate-100 overflow-x-auto font-mono whitespace-pre-wrap">
      {code}
    </pre>
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <CopyButton text={code} />
    </div>
  </div>
);

// Strategy Section
const StrategySection: React.FC<{ strategy: RemediationGuidance['strategy'] }> = ({ strategy }) => (
  <div className="space-y-4">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
        <Shield className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{strategy.principle}</h3>
        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{strategy.securityFramework}</p>
      </div>
    </div>

    <p className="text-slate-600 dark:text-white/70 leading-relaxed">{strategy.description}</p>

    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">Key Objectives</h4>
      <ul className="space-y-2">
        {strategy.keyObjectives.map((objective, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-blue-800 dark:text-blue-200">{objective}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

// Implementation Section
const ImplementationSection: React.FC<{
  implementations: CloudImplementation[];
  selectedProvider: CloudProvider;
  onProviderChange: (provider: CloudProvider) => void;
}> = ({ implementations, selectedProvider, onProviderChange }) => {
  const currentImpl = implementations.find(i => i.provider === selectedProvider);
  const [showTerraform, setShowTerraform] = useState(false);

  return (
    <div className="space-y-4">
      {/* Cloud Provider Tabs */}
      <div className="flex gap-2">
        {CLOUD_PROVIDERS.map(provider => {
          const hasImpl = implementations.some(i => i.provider === provider.id);
          const isActive = selectedProvider === provider.id;

          return (
            <button
              key={provider.id}
              onClick={() => hasImpl && onProviderChange(provider.id)}
              disabled={!hasImpl}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all
                ${isActive
                  ? 'text-white shadow-lg'
                  : hasImpl
                    ? 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
                    : 'bg-slate-50 dark:bg-white/[0.02] text-slate-300 dark:text-white/20 cursor-not-allowed'
                }
              `}
              style={isActive ? { backgroundColor: provider.color } : undefined}
            >
              <span>{provider.icon}</span>
              <span>{provider.name}</span>
            </button>
          );
        })}
      </div>

      {currentImpl ? (
        <div className="space-y-6">
          {/* Steps */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              Implementation Steps
            </h4>
            <div className="space-y-2">
              {currentImpl.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                  <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-white/60 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-slate-700 dark:text-white/80">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Console Steps */}
          {currentImpl.consoleSteps && currentImpl.consoleSteps.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Server className="w-4 h-4" />
                Console Instructions
              </h4>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <ol className="space-y-2 list-decimal list-inside">
                  {currentImpl.consoleSteps.map((step, idx) => (
                    <li key={idx} className="text-sm text-amber-800 dark:text-amber-200">{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* CLI Commands */}
          {currentImpl.commands.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                CLI Commands
              </h4>
              <div className="space-y-3">
                {currentImpl.commands.map((cmd, idx) => (
                  <CommandBlock key={idx} command={cmd} />
                ))}
              </div>
            </div>
          )}

          {/* Terraform Example */}
          {currentImpl.terraformExample && (
            <div>
              <button
                onClick={() => setShowTerraform(!showTerraform)}
                className="flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
              >
                <ChevronRight className={`w-4 h-4 transition-transform ${showTerraform ? 'rotate-90' : ''}`} />
                Infrastructure as Code (Terraform)
              </button>
              <AnimatePresence>
                {showTerraform && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 overflow-hidden"
                  >
                    <TerraformBlock code={currentImpl.terraformExample} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center">
          <Cloud className="w-12 h-12 text-slate-300 dark:text-white/20 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-white/50">No implementation guide available for this provider</p>
        </div>
      )}
    </div>
  );
};

// Verification Section
const VerificationSection: React.FC<{
  verification: RemediationGuidance['verification'];
  controlId: string;
  onUploadEvidence?: (controlId: string, evidenceType: EvidenceRequirement['type']) => void;
}> = ({ verification, controlId, onUploadEvidence }) => (
  <div className="space-y-6">
    {/* Evidence Requirements */}
    <div>
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <Upload className="w-4 h-4" />
        Evidence Requirements
      </h4>
      <div className="space-y-4">
        {verification.requirements.map((req, idx) => {
          const config = EVIDENCE_TYPE_CONFIG[req.type];
          return (
            <GlassPanel key={idx} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${config.color}20`, color: config.color }}
                  >
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900 dark:text-white">{config.label}</span>
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded-full"
                        style={{ backgroundColor: `${config.color}20`, color: config.color }}
                      >
                        Required
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-white/70 mb-3">{req.description}</p>

                    {/* Examples */}
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-500 dark:text-white/50 uppercase mb-1.5">Examples</p>
                      <ul className="space-y-1">
                        {req.examples.map((ex, i) => (
                          <li key={i} className="text-sm text-slate-500 dark:text-white/60 flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-white/40" />
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Acceptance Criteria */}
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase mb-2">Acceptance Criteria</p>
                      <ul className="space-y-1">
                        {req.acceptanceCriteria.map((criteria, i) => (
                          <li key={i} className="text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {criteria}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Upload Button */}
                {onUploadEvidence && (
                  <button
                    onClick={() => onUploadEvidence(controlId, req.type)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-emerald-500/25 transition-shadow"
                  >
                    <Upload className="w-4 h-4" />
                    Upload
                  </button>
                )}
              </div>
            </GlassPanel>
          );
        })}
      </div>
    </div>

    {/* Auditor Notes */}
    <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
        <BookOpen className="w-4 h-4" />
        Auditor Notes
      </h4>
      <p className="text-sm text-slate-600 dark:text-white/70">{verification.auditorNotes}</p>
    </div>

    {/* Common Mistakes */}
    {verification.commonMistakes.length > 0 && (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
        <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Common Mistakes to Avoid
        </h4>
        <ul className="space-y-2">
          {verification.commonMistakes.map((mistake, idx) => (
            <li key={idx} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
              <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {mistake}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RemediationEngine: React.FC<RemediationEngineProps> = ({
  controlId,
  controlTitle,
  isOpen,
  onClose,
  onUploadEvidence,
}) => {
  const [activeTab, setActiveTab] = useState<'strategy' | 'implementation' | 'verification'>('strategy');
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>('aws');

  // Get remediation guidance from both main and extended sources
  const guidance = useMemo(() => {
    const main = getRemediationGuidance(controlId);
    if (main) return main;
    return EXTENDED_REMEDIATIONS[controlId] || null;
  }, [controlId]);

  const tabs = [
    { id: 'strategy' as const, label: 'Strategy', icon: <Shield className="w-4 h-4" /> },
    { id: 'implementation' as const, label: 'Implementation', icon: <Terminal className="w-4 h-4" /> },
    { id: 'verification' as const, label: 'Verification', icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-3xl bg-white dark:bg-slate-900 z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-xs font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                    {controlId}
                  </span>
                  {guidance && (
                    <>
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded"
                        style={{
                          backgroundColor: `${EFFORT_CONFIG[guidance.estimatedEffort].color}20`,
                          color: EFFORT_CONFIG[guidance.estimatedEffort].color
                        }}
                      >
                        {EFFORT_CONFIG[guidance.estimatedEffort].label}
                      </span>
                      {guidance.automationPossible && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Automatable
                        </span>
                      )}
                    </>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                  {controlTitle}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {guidance ? (
              <>
                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-white/10">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative
                        ${activeTab === tab.id
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/70'
                        }
                      `}
                    >
                      {tab.icon}
                      {tab.label}
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <AnimatePresence mode="wait">
                    {activeTab === 'strategy' && (
                      <motion.div
                        key="strategy"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <StrategySection strategy={guidance.strategy} />
                      </motion.div>
                    )}

                    {activeTab === 'implementation' && (
                      <motion.div
                        key="implementation"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <ImplementationSection
                          implementations={guidance.implementations}
                          selectedProvider={selectedProvider}
                          onProviderChange={setSelectedProvider}
                        />
                      </motion.div>
                    )}

                    {activeTab === 'verification' && (
                      <motion.div
                        key="verification"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <VerificationSection
                          verification={guidance.verification}
                          controlId={controlId}
                          onUploadEvidence={onUploadEvidence}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer with Resources */}
                {guidance.resources.length > 0 && (
                  <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-white/50 uppercase mb-2">Resources</h4>
                    <div className="flex flex-wrap gap-2">
                      {guidance.resources.map((resource, idx) => (
                        <a
                          key={idx}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {resource.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* No Guidance Available */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                  <BookOpen className="w-10 h-10 text-slate-300 dark:text-white/20" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Remediation Guide Coming Soon
                </h3>
                <p className="text-slate-500 dark:text-white/60 max-w-sm mb-6">
                  Detailed remediation guidance for this control is being developed. Check back soon for implementation steps and evidence requirements.
                </p>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 max-w-sm">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Tip:</strong> In the meantime, consult your framework documentation (SOC 2, ISO 27001, HIPAA, NIST) for guidance on implementing this control.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RemediationEngine;
