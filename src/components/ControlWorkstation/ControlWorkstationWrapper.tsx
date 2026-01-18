/**
 * Control Workstation Wrapper
 *
 * Integrates the ControlWorkstation with the existing compliance context
 * and provides all necessary callbacks and data.
 */

import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Link } from 'lucide-react';
import { useComplianceContext } from '../../App';
import ControlWorkstation from './ControlWorkstation';
import RemediationEngine from '../RemediationEngine';
import type { FrameworkId, ComplianceDomainMeta } from '../../constants/controls';

interface ControlWorkstationWrapperProps {
  initialDomain?: ComplianceDomainMeta;
  onViewFramework?: (frameworkId: FrameworkId) => void;
}

// Simple Evidence Modal for now (can be replaced with full FileManagementModal later)
const EvidenceModal: React.FC<{
  controlId: string;
  controlTitle: string;
  isOpen: boolean;
  onClose: () => void;
}> = ({ controlId, controlTitle, isOpen, onClose }) => {
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
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Evidence for {controlId}
              </h3>
              <p className="text-sm text-slate-500 dark:text-steel-400">
                {controlTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-steel-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600 dark:text-steel-400">
              Evidence management is available in the Evidence Repository tab.
              Navigate there to upload, view, and manage evidence files for this control.
            </p>

            {/* Quick actions */}
            <div className="flex gap-3">
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <Upload className="w-4 h-4" />
                Upload Evidence
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-steel-600 text-slate-700 dark:text-steel-300 rounded-lg hover:bg-slate-50 dark:hover:bg-steel-750 transition-colors">
                <Link className="w-4 h-4" />
                Link URL
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-steel-750 border-t border-slate-200 dark:border-steel-700">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm text-slate-600 dark:text-steel-400 hover:text-slate-800 dark:hover:text-steel-200 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const ControlWorkstationWrapper: React.FC<ControlWorkstationWrapperProps> = ({
  initialDomain: _initialDomain, // Reserved for future use
  onViewFramework,
}) => {
  const compliance = useComplianceContext();
  const {
    answerControl,
    getResponse,
    evidenceFileCounts,
  } = compliance;

  // Modal states
  const [remediationControl, setRemediationControl] = useState<{ id: string; title: string } | null>(null);
  const [evidenceModalControl, setEvidenceModalControl] = useState<{ id: string; title: string } | null>(null);

  // Get response wrapper that returns the expected format
  const getResponseWrapper = useCallback((controlId: string) => {
    const response = getResponse(controlId);
    if (!response) return undefined;
    return {
      answer: response.answer,
      answeredAt: response.answeredAt,
    };
  }, [getResponse]);

  // Get evidence count wrapper
  const getEvidenceCountWrapper = useCallback((controlId: string) => {
    return evidenceFileCounts[controlId];
  }, [evidenceFileCounts]);

  // Handle answer change
  const handleAnswerChange = useCallback((controlId: string, answer: 'yes' | 'no' | 'partial' | 'na' | null) => {
    if (answer) {
      answerControl(controlId, answer);
    }
  }, [answerControl]);

  // Handle generate policy
  const handleGeneratePolicy = useCallback(async (controlId: string) => {
    const control = compliance.allControls.find(c => c.id === controlId);
    if (control) {
      setRemediationControl({ id: controlId, title: control.title });
    }
  }, [compliance.allControls]);

  // Handle upload evidence
  const handleUploadEvidence = useCallback((controlId: string, _files: File[]) => {
    const control = compliance.allControls.find(c => c.id === controlId);
    if (control) {
      setEvidenceModalControl({ id: controlId, title: control.title });
    }
  }, [compliance.allControls]);

  // Handle link evidence
  const handleLinkEvidence = useCallback((controlId: string, _url: string, _description: string) => {
    const control = compliance.allControls.find(c => c.id === controlId);
    if (control) {
      setEvidenceModalControl({ id: controlId, title: control.title });
    }
  }, [compliance.allControls]);

  // Handle view evidence
  const handleViewEvidence = useCallback((controlId: string) => {
    const control = compliance.allControls.find(c => c.id === controlId);
    if (control) {
      setEvidenceModalControl({ id: controlId, title: control.title });
    }
  }, [compliance.allControls]);

  return (
    <>
      <div className="h-[calc(100vh-140px)] -mx-6 -mt-6 overflow-hidden">
        <ControlWorkstation
          getResponse={getResponseWrapper}
          getEvidenceCount={getEvidenceCountWrapper}
          onAnswerChange={handleAnswerChange}
          onGeneratePolicy={handleGeneratePolicy}
          onUploadEvidence={handleUploadEvidence}
          onLinkEvidence={handleLinkEvidence}
          onViewEvidence={handleViewEvidence}
          onViewFramework={onViewFramework}
        />
      </div>

      {/* Remediation Engine Modal */}
      {remediationControl && (
        <RemediationEngine
          controlId={remediationControl.id}
          controlTitle={remediationControl.title}
          isOpen={true}
          onClose={() => setRemediationControl(null)}
        />
      )}

      {/* Evidence Modal */}
      {evidenceModalControl && (
        <EvidenceModal
          controlId={evidenceModalControl.id}
          controlTitle={evidenceModalControl.title}
          isOpen={true}
          onClose={() => setEvidenceModalControl(null)}
        />
      )}
    </>
  );
};

export default ControlWorkstationWrapper;
