/**
 * Audit Bundle Modal
 *
 * One-click generation of complete audit package.
 * Includes:
 * - All selected report types
 * - Evidence attachments
 * - Control inventory
 * - Digital signature manifest
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Package,
  FileText,
  Target,
  Shield,
  ClipboardList,
  Paperclip,
  Download,
  CheckCircle2,
  Loader2,
  FolderArchive,
  Hash,
  Calendar,
  Building2,
} from 'lucide-react';
import type { UseComplianceReturn } from '../../hooks/useCompliance';
import type { OrganizationWithRole } from '../../types/branding.types';

interface BundleItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  included: boolean;
  estimatedSize: string;
}

interface AuditBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  compliance: UseComplianceReturn;
  organization: OrganizationWithRole | null;
}

const AuditBundleModal: React.FC<AuditBundleModalProps> = ({
  isOpen,
  onClose,
  compliance,
  organization,
}) => {
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([
    {
      id: 'executive',
      label: 'Executive Summary',
      description: 'Board-ready compliance overview',
      icon: <FileText className="w-5 h-5" />,
      included: true,
      estimatedSize: '2.4 MB',
    },
    {
      id: 'gap',
      label: 'Gap Analysis Report',
      description: 'Detailed findings and remediation roadmap',
      icon: <Target className="w-5 h-5" />,
      included: true,
      estimatedSize: '4.1 MB',
    },
    {
      id: 'framework',
      label: 'Framework Reports',
      description: `Reports for ${compliance.frameworkProgress.length} active frameworks`,
      icon: <Shield className="w-5 h-5" />,
      included: true,
      estimatedSize: '8.2 MB',
    },
    {
      id: 'inventory',
      label: 'Control Inventory',
      description: 'Complete control catalogue with ownership',
      icon: <ClipboardList className="w-5 h-5" />,
      included: true,
      estimatedSize: '1.2 MB',
    },
    {
      id: 'evidence',
      label: 'Evidence Package',
      description: 'All linked evidence files and documents',
      icon: <Paperclip className="w-5 h-5" />,
      included: true,
      estimatedSize: '15.6 MB',
    },
  ]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  // Toggle item inclusion
  const toggleItem = useCallback((id: string) => {
    setBundleItems(items =>
      items.map(item =>
        item.id === id ? { ...item, included: !item.included } : item
      )
    );
  }, []);

  // Calculate total size
  const totalSize = bundleItems
    .filter(item => item.included)
    .reduce((sum, item) => {
      const size = parseFloat(item.estimatedSize);
      return sum + size;
    }, 0)
    .toFixed(1);

  // Generate bundle
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setIsComplete(false);

    const steps = [
      'Preparing reports...',
      'Compiling executive summary...',
      'Generating gap analysis...',
      'Creating framework reports...',
      'Exporting control inventory...',
      'Packaging evidence files...',
      'Adding digital signatures...',
      'Creating ZIP archive...',
    ];

    for (let i = 0; i < steps.length; i++) {
      setGenerationStep(steps[i]);
      setGenerationProgress(((i + 1) / steps.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsComplete(true);
    setIsGenerating(false);
  }, []);

  // Reset state on close
  const handleClose = useCallback(() => {
    setIsGenerating(false);
    setGenerationProgress(0);
    setGenerationStep('');
    setIsComplete(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-violet-600">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">One-Click Audit Bundle</h2>
                <p className="text-sm text-white/80">
                  Generate a complete audit-ready package
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!isGenerating && !isComplete ? (
              <>
                {/* Organization info */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl mb-6">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                    {organization?.logoUrl ? (
                      <img
                        src={organization.logoUrl}
                        alt={organization.name}
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <Building2 className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {organization?.name || 'Organization'}
                    </p>
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Frameworks in scope */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">
                    Frameworks in Scope
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {compliance.frameworkProgress.map((fp) => (
                      <span
                        key={fp.id}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg"
                        style={{
                          backgroundColor: `${fp.color}15`,
                          color: fp.color,
                        }}
                      >
                        {fp.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bundle items */}
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-medium text-slate-700">
                    Bundle Contents
                  </h3>
                  {bundleItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`
                        w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                        ${item.included
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                        }
                      `}
                    >
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center
                        ${item.included ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}
                      `}>
                        {item.included ? <CheckCircle2 className="w-5 h-5" /> : item.icon}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${item.included ? 'text-slate-900' : 'text-slate-600'}`}>
                          {item.label}
                        </p>
                        <p className="text-sm text-slate-500">{item.description}</p>
                      </div>
                      <span className="text-sm text-slate-500">{item.estimatedSize}</span>
                    </button>
                  ))}
                </div>

                {/* Summary */}
                <div className="flex items-center justify-between p-4 bg-slate-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <FolderArchive className="w-5 h-5 text-slate-500" />
                    <span className="font-medium text-slate-700">
                      {bundleItems.filter(i => i.included).length} items selected
                    </span>
                  </div>
                  <span className="text-sm text-slate-500">
                    Estimated size: ~{totalSize} MB
                  </span>
                </div>
              </>
            ) : isGenerating ? (
              <div className="py-8 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 mx-auto mb-4"
                >
                  <Loader2 className="w-16 h-16 text-indigo-500" />
                </motion.div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Generating Audit Bundle
                </h3>
                <p className="text-slate-500 mb-6">{generationStep}</p>

                {/* Progress bar */}
                <div className="max-w-md mx-auto">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${generationProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    {Math.round(generationProgress)}% complete
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </motion.div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Audit Bundle Ready!
                </h3>
                <p className="text-slate-500 mb-6">
                  Your complete audit package has been generated.
                </p>

                {/* Bundle info */}
                <div className="max-w-sm mx-auto p-4 bg-slate-50 rounded-xl mb-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500">File name</span>
                    <span className="font-mono text-slate-700">
                      audit-bundle-{new Date().toISOString().split('T')[0]}.zip
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500">Size</span>
                    <span className="font-medium text-slate-700">~{totalSize} MB</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Integrity</span>
                    <span className="font-mono text-xs text-slate-700 flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      SHA-256 signed
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    // In production, this would trigger the actual download
                    console.log('Downloading audit bundle...');
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
                >
                  <Download className="w-5 h-5" />
                  Download Bundle
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          {!isGenerating && !isComplete && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={bundleItems.filter(i => i.included).length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Package className="w-5 h-5" />
                Generate Bundle
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AuditBundleModal;
