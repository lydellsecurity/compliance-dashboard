/**
 * Control Card
 *
 * Central card component representing a single internal control.
 * Features:
 * - Clear title and status badge
 * - Framework pills showing coverage
 * - Impact summary
 * - Click to expand for full assessment
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  Circle,
  Shield,
  Info,
  Paperclip,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import type { MasterControl, FrameworkId } from '../../constants/controls';
import type { SatisfiedRequirement } from '../../services/control-mapping-engine';
import FrameworkPills, { FrameworkCoverageSummary } from './FrameworkPills';
import RequirementTransparency from './RequirementTransparency';
import AssessmentWorkflow from './AssessmentWorkflow';

type AssessmentAnswer = 'yes' | 'no' | 'partial' | 'na' | null;

interface ControlCardProps {
  control: MasterControl;
  requirements: SatisfiedRequirement[];
  currentAnswer: AssessmentAnswer;
  hasEvidence: boolean;
  evidenceCount: number;
  onAnswerChange: (controlId: string, answer: AssessmentAnswer) => void;
  onGeneratePolicy: (controlId: string) => void;
  onUploadEvidence: (controlId: string, files: File[]) => void;
  onLinkEvidence: (controlId: string, url: string, description: string) => void;
  onViewEvidence: (controlId: string) => void;
  onViewFramework?: (frameworkId: FrameworkId) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const RISK_BADGES = {
  critical: { label: 'Critical', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
  high: { label: 'High', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
  medium: { label: 'Medium', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  low: { label: 'Low', color: 'bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-400 border-slate-200 dark:border-steel-600' },
};

const STATUS_BADGES = {
  yes: { label: 'Implemented', icon: CheckCircle, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  partial: { label: 'In Progress', icon: Clock, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  no: { label: 'Not Started', icon: Circle, color: 'bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-400' },
  na: { label: 'N/A', icon: Circle, color: 'bg-slate-100 dark:bg-steel-700 text-slate-500 dark:text-steel-500' },
  null: { label: 'Not Assessed', icon: Circle, color: 'bg-slate-100 dark:bg-steel-700 text-slate-400 dark:text-steel-500' },
};

const ControlCard: React.FC<ControlCardProps> = ({
  control,
  requirements,
  currentAnswer,
  hasEvidence,
  evidenceCount,
  onAnswerChange,
  onGeneratePolicy,
  onUploadEvidence,
  onLinkEvidence,
  onViewEvidence,
  onViewFramework,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [isGeneratingPolicy, setIsGeneratingPolicy] = useState(false);
  const [isStatusPaneCollapsed, setIsStatusPaneCollapsed] = useState(false);

  const isImplemented = currentAnswer === 'yes';
  const statusKey = currentAnswer || 'null';
  const status = STATUS_BADGES[statusKey];
  const StatusIcon = status.icon;
  const riskBadge = RISK_BADGES[control.riskLevel];

  // Group requirements into framework pills
  const frameworkPills = useMemo(() => {
    const pillMap = new Map<FrameworkId, { frameworkName: string; frameworkColor: string; clauseCount: number }>();

    for (const req of requirements) {
      const existing = pillMap.get(req.frameworkId);
      if (existing) {
        existing.clauseCount++;
      } else {
        pillMap.set(req.frameworkId, {
          frameworkName: req.frameworkName,
          frameworkColor: req.frameworkColor,
          clauseCount: 1,
        });
      }
    }

    return Array.from(pillMap.entries()).map(([frameworkId, data]) => ({
      frameworkId,
      ...data,
    }));
  }, [requirements]);

  const frameworksCovered = frameworkPills.length;

  const handleGeneratePolicy = async () => {
    setIsGeneratingPolicy(true);
    try {
      await onGeneratePolicy(control.id);
    } finally {
      setIsGeneratingPolicy(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        bg-white dark:bg-steel-800 rounded-xl border overflow-hidden transition-all duration-200
        ${isImplemented
          ? 'border-emerald-200 dark:border-emerald-800 shadow-emerald-100 dark:shadow-none'
          : 'border-slate-200 dark:border-steel-700'
        }
        ${isExpanded ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}
      `}
    >
      {/* Card Header - Always visible */}
      <div
        className={`p-5 cursor-pointer ${onToggleExpand ? 'hover:bg-slate-50 dark:hover:bg-steel-750' : ''}`}
        onClick={onToggleExpand}
      >
        <div className="flex items-start gap-4">
          {/* Status indicator */}
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
            ${isImplemented ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-steel-700'}
          `}>
            <StatusIcon className={`w-5 h-5 ${isImplemented ? 'text-emerald-500' : 'text-slate-400 dark:text-steel-500'}`} />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400">
                    {control.id}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${riskBadge.color}`}>
                    {riskBadge.label}
                  </span>
                  {hasEvidence && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <Paperclip className="w-3 h-3" />
                      {evidenceCount}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {control.title}
                </h3>
              </div>

              {/* Status badge */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${status.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-600 dark:text-steel-400 mt-2 line-clamp-2">
              {control.description}
            </p>

            {/* Framework Pills */}
            <div className="mt-3 flex items-center justify-between gap-3">
              <FrameworkPills
                pills={frameworkPills}
                isImplemented={isImplemented}
                compact
                onPillClick={onViewFramework}
              />

              {onToggleExpand && (
                <button className="flex items-center gap-1 text-sm text-slate-500 dark:text-steel-400 hover:text-slate-700 dark:hover:text-steel-300">
                  {isExpanded ? (
                    <>
                      Less
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      More
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Coverage summary */}
            <div className="mt-2">
              <FrameworkCoverageSummary
                totalRequirements={requirements.length}
                frameworksCovered={frameworksCovered}
                isImplemented={isImplemented}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-200 dark:border-steel-700">
              <div className="p-5 flex gap-6">
                {/* Left column: Assessment Workflow */}
                <div className={`space-y-4 transition-all duration-300 ${isStatusPaneCollapsed ? 'flex-1' : 'flex-1 lg:flex-[1]'}`}>
                  <AssessmentWorkflow
                    controlId={control.id}
                    controlTitle={control.title}
                    currentAnswer={currentAnswer}
                    hasEvidence={hasEvidence}
                    evidenceCount={evidenceCount}
                    remediationTip={control.remediationTip}
                    onAnswerChange={(answer) => onAnswerChange(control.id, answer)}
                    onGeneratePolicy={handleGeneratePolicy}
                    onUploadEvidence={(files) => onUploadEvidence(control.id, files)}
                    onLinkEvidence={(url, desc) => onLinkEvidence(control.id, url, desc)}
                    onViewEvidence={() => onViewEvidence(control.id)}
                    isGeneratingPolicy={isGeneratingPolicy}
                  />

                  {/* Why It Matters */}
                  {control.whyItMatters && (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      <div className="flex gap-2">
                        <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                            Why This Matters
                          </p>
                          <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                            {control.whyItMatters}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right column: Requirement Transparency (Retractable) */}
                <div className="hidden lg:flex flex-col">
                  {/* Toggle button */}
                  <button
                    onClick={() => setIsStatusPaneCollapsed(!isStatusPaneCollapsed)}
                    className={`
                      self-start mb-3 flex items-center gap-2 px-3 py-1.5 rounded-lg
                      text-xs font-medium transition-all duration-200
                      ${isStatusPaneCollapsed
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
                        : 'bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-400 hover:bg-slate-200 dark:hover:bg-steel-600'
                      }
                    `}
                  >
                    {isStatusPaneCollapsed ? (
                      <>
                        <PanelRightOpen className="w-4 h-4" />
                        Show Compliance
                      </>
                    ) : (
                      <>
                        <PanelRightClose className="w-4 h-4" />
                        Hide
                      </>
                    )}
                  </button>

                  {/* Status Pane Content */}
                  <AnimatePresence mode="wait">
                    {!isStatusPaneCollapsed && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 'auto', opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="w-[400px]">
                          <RequirementTransparency
                            requirements={requirements}
                            isImplemented={isImplemented}
                            onViewFramework={onViewFramework}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile: Always show status pane below */}
                <div className="lg:hidden">
                  <RequirementTransparency
                    requirements={requirements}
                    isImplemented={isImplemented}
                    onViewFramework={onViewFramework}
                  />
                </div>
              </div>

              {/* Guidance section */}
              <div className="px-5 pb-5">
                <details className="group">
                  <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 dark:text-steel-400 hover:text-slate-800 dark:hover:text-steel-200">
                    <Shield className="w-4 h-4" />
                    Implementation Guidance
                    <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 p-4 bg-slate-50 dark:bg-steel-750 rounded-lg">
                    <p className="text-sm text-slate-700 dark:text-steel-300 leading-relaxed">
                      {control.guidance}
                    </p>
                    {control.evidenceExamples.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase tracking-wider mb-2">
                          Evidence Examples
                        </h5>
                        <ul className="space-y-1">
                          {control.evidenceExamples.map((example, idx) => (
                            <li key={idx} className="text-sm text-slate-600 dark:text-steel-400 flex items-start gap-2">
                              <span className="text-indigo-500 mt-1">•</span>
                              {example}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ControlCard;
