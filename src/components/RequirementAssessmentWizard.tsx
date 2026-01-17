/**
 * Requirement Assessment Wizard
 *
 * Framework-centric assessment workflow that guides users through
 * assessing compliance at the requirement level, not just control level.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  AlertCircle,
  XCircle,
  Shield,
  FileText,
  Target,
  ArrowRight,
  RotateCcw,
  Download,
  ChevronDown,
  Minus,
} from 'lucide-react';
import type { FrameworkId, MasterControl } from '../constants/controls';
import { FRAMEWORKS } from '../constants/controls';
import { useRequirementAssessment } from '../hooks/useRequirementAssessment';
import {
  getLeafRequirements,
  getFrameworkCoverageStats,
} from '../services/requirement-mapping.service';
// Types imported as needed from requirement-assessment.types
import { RequirementAssessmentPanel } from './RequirementAssessmentPanel';
import { FrameworkScopeForm } from './FrameworkScopeForm';

// ============================================
// TYPES
// ============================================

interface RequirementAssessmentWizardProps {
  controls: MasterControl[];
  getControlAnswer: (controlId: string) => 'yes' | 'no' | 'partial' | 'na' | null;
  onControlClick?: (controlId: string) => void;
  onClose?: () => void;
}

// Framework colors
const FRAMEWORK_COLORS: Record<FrameworkId, string> = {
  'PCIDSS': '#DC2626',
  'SOC2': '#3B82F6',
  'ISO27001': '#10B981',
  'HIPAA': '#8B5CF6',
  'NIST': '#F59E0B',
  'GDPR': '#2563EB',
};

// ============================================
// STEP 1: FRAMEWORK SELECTION
// ============================================

const FrameworkSelectionStep: React.FC<{
  onSelect: (frameworkId: FrameworkId) => void;
}> = ({ onSelect }) => {
  const frameworkStats = useMemo(() => {
    const stats: Record<FrameworkId, ReturnType<typeof getFrameworkCoverageStats>> = {} as any;
    for (const fw of FRAMEWORKS) {
      stats[fw.id] = getFrameworkCoverageStats(fw.id);
    }
    return stats;
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-steel-100">
          Select Compliance Framework
        </h2>
        <p className="text-slate-600 dark:text-steel-400 mt-2">
          Choose a framework to assess your compliance at the requirement level
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FRAMEWORKS.map(fw => {
          const stats = frameworkStats[fw.id];
          const color = FRAMEWORK_COLORS[fw.id];

          return (
            <button
              key={fw.id}
              onClick={() => onSelect(fw.id)}
              className="p-5 rounded-xl border-2 border-slate-200 dark:border-steel-700 hover:border-slate-300 dark:hover:border-steel-600 bg-white dark:bg-steel-800 text-left transition-all hover:shadow-lg group"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${color}15` }}
                >
                  {fw.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-steel-100 group-hover:text-indigo-600 dark:group-hover:text-accent-400 transition-colors">
                    {fw.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-steel-400 truncate">
                    {fw.fullName}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 dark:text-steel-500 group-hover:text-indigo-600 dark:group-hover:text-accent-400 transition-colors" />
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-steel-700">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-steel-400">Requirements</span>
                  <span className="font-medium text-slate-700 dark:text-steel-300">
                    {stats.leafRequirements}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500 dark:text-steel-400">Control Coverage</span>
                  <span
                    className="font-medium"
                    style={{ color: stats.averageCoverage > 50 ? '#10b981' : stats.averageCoverage > 25 ? '#f59e0b' : '#ef4444' }}
                  >
                    {Math.round(stats.averageCoverage)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500 dark:text-steel-400">Unmapped</span>
                  <span className={stats.unmappedRequirements > 0 ? 'text-amber-600' : 'text-green-600'}>
                    {stats.unmappedRequirements} requirements
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// STEP 3: REQUIREMENT NAVIGATOR
// ============================================

interface RequirementNavItem {
  id: string;
  title: string;
  level: number;
  hasChildren: boolean;
  status: 'not_assessed' | 'compliant' | 'partially_compliant' | 'non_compliant' | 'not_applicable';
  isRequired: boolean;
}

const RequirementNavigator: React.FC<{
  frameworkId: FrameworkId;
  currentRequirementId: string | null;
  assessments: Record<string, { status: string }>;
  onSelect: (requirementId: string) => void;
}> = ({ frameworkId, currentRequirementId, assessments, onSelect }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const requirements = useMemo(() => {
    const leafReqs = getLeafRequirements(frameworkId);
    return leafReqs.map(req => ({
      id: req.id,
      title: req.title,
      level: req.level,
      hasChildren: false,
      status: (assessments[req.id]?.status as RequirementNavItem['status']) || 'not_assessed',
      isRequired: req.isRequired,
    }));
  }, [frameworkId, assessments]);

  // Group by parent (first two segments of ID)
  const groupedRequirements = useMemo(() => {
    const groups: Record<string, RequirementNavItem[]> = {};
    for (const req of requirements) {
      const parts = req.id.split('.');
      const parent = parts.length > 1 ? parts.slice(0, -1).join('.') : 'root';
      if (!groups[parent]) groups[parent] = [];
      groups[parent].push(req);
    }
    return groups;
  }, [requirements]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const getStatusIcon = (status: RequirementNavItem['status']) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'partially_compliant':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'non_compliant':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'not_applicable':
        return <Minus className="w-4 h-4 text-slate-400" />;
      default:
        return <Circle className="w-4 h-4 text-slate-300 dark:text-steel-600" />;
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 border-b border-slate-200 dark:border-steel-700 sticky top-0 bg-white dark:bg-steel-800 z-10">
        <h3 className="font-semibold text-slate-900 dark:text-steel-100 text-sm">
          Requirements
        </h3>
        <p className="text-xs text-slate-500 dark:text-steel-400 mt-1">
          {requirements.filter(r => r.status !== 'not_assessed').length} / {requirements.length} assessed
        </p>
      </div>

      <div className="p-2 space-y-1">
        {Object.entries(groupedRequirements).map(([parent, reqs]) => {
          const isExpanded = expandedSections.has(parent) || parent === 'root';
          const sectionCompliant = reqs.filter(r => r.status === 'compliant').length;

          return (
            <div key={parent} className="mb-2">
              {parent !== 'root' && (
                <button
                  onClick={() => toggleSection(parent)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-slate-700 dark:text-steel-300 hover:bg-slate-50 dark:hover:bg-steel-700/50 rounded-lg"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <span className="flex-1 text-left truncate">{parent}</span>
                  <span className="text-xs text-slate-400 dark:text-steel-500">
                    {sectionCompliant}/{reqs.length}
                  </span>
                </button>
              )}

              {isExpanded && (
                <div className={parent !== 'root' ? 'ml-4 mt-1 space-y-0.5' : 'space-y-0.5'}>
                  {reqs.map(req => (
                    <button
                      key={req.id}
                      onClick={() => onSelect(req.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg transition-colors ${
                        currentRequirementId === req.id
                          ? 'bg-indigo-50 dark:bg-accent-500/10 text-indigo-700 dark:text-accent-400'
                          : 'text-slate-600 dark:text-steel-400 hover:bg-slate-50 dark:hover:bg-steel-700/50'
                      }`}
                    >
                      {getStatusIcon(req.status)}
                      <span className="font-mono text-xs opacity-60">{req.id}</span>
                      <span className="flex-1 text-left truncate text-xs">{req.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// STEP 4: REVIEW SUMMARY
// ============================================

const ReviewSummary: React.FC<{
  frameworkId: FrameworkId;
  summary: ReturnType<typeof useRequirementAssessment>['getSummary'] extends () => infer R ? R : never;
  onRestart: () => void;
  onExport: () => void;
}> = ({ frameworkId, summary, onRestart, onExport }) => {
  if (!summary) return null;

  const fw = FRAMEWORKS.find(f => f.id === frameworkId);
  const color = FRAMEWORK_COLORS[frameworkId];

  const statusData = [
    { label: 'Compliant', count: summary.complianceByStatus.compliant, color: '#10b981' },
    { label: 'Partial', count: summary.complianceByStatus.partially_compliant, color: '#f59e0b' },
    { label: 'Non-Compliant', count: summary.complianceByStatus.non_compliant, color: '#ef4444' },
    { label: 'N/A', count: summary.complianceByStatus.not_applicable, color: '#94a3b8' },
    { label: 'Not Assessed', count: summary.complianceByStatus.not_assessed, color: '#e2e8f0' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4"
          style={{ backgroundColor: `${color}15` }}
        >
          {fw?.icon}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-steel-100">
          {fw?.name} Assessment Complete
        </h2>
        <p className="text-slate-600 dark:text-steel-400 mt-2">
          {summary.assessedRequirements} of {summary.totalRequirements} requirements assessed
        </p>
      </div>

      {/* Overall Score */}
      <div className="bg-white dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700 p-6 text-center">
        <div className="text-5xl font-bold mb-2" style={{ color }}>
          {summary.overallCompliancePercentage}%
        </div>
        <p className="text-slate-600 dark:text-steel-400">Overall Compliance Score</p>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-steel-100 mb-4">
          Compliance Status Breakdown
        </h3>
        <div className="space-y-3">
          {statusData.map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="flex-1 text-sm text-slate-600 dark:text-steel-400">{item.label}</span>
              <span className="font-semibold text-slate-900 dark:text-steel-100">{item.count}</span>
              <span className="text-xs text-slate-400 dark:text-steel-500 w-12 text-right">
                {Math.round((item.count / summary.totalRequirements) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Gaps */}
      {summary.criticalGaps.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6">
          <h3 className="font-semibold text-red-900 dark:text-red-300 mb-3 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Critical Gaps ({summary.criticalGaps.length})
          </h3>
          <ul className="space-y-2">
            {summary.criticalGaps.slice(0, 5).map(gap => (
              <li key={gap} className="text-sm text-red-700 dark:text-red-400 font-mono">
                {gap}
              </li>
            ))}
            {summary.criticalGaps.length > 5 && (
              <li className="text-sm text-red-600 dark:text-red-400">
                +{summary.criticalGaps.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onRestart}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-steel-700 rounded-xl text-slate-700 dark:text-steel-300 hover:bg-slate-50 dark:hover:bg-steel-700/50 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Start Over
        </button>
        <button
          onClick={onExport}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Export Report
        </button>
      </div>
    </div>
  );
};

// ============================================
// MAIN WIZARD COMPONENT
// ============================================

export const RequirementAssessmentWizard: React.FC<RequirementAssessmentWizardProps> = ({
  controls,
  getControlAnswer,
  onControlClick,
  onClose,
}) => {
  const {
    wizardState,
    setWizardStep,
    selectFramework,
    setScope,
    getAssessment,
    updateAssessmentStatus,
    saveDirectAssessment,
    addEvidence,
    removeEvidence,
    saveAddressableDecision,
    addNote,
    skipRequirement,
    getNextRequirement,
    getPreviousRequirement,
    navigateToRequirement,
    getSummary,
    getRequirementDetails,
    resetFrameworkAssessment,
  } = useRequirementAssessment(getControlAnswer);

  const frameworkMeta = wizardState.selectedFramework
    ? FRAMEWORKS.find(f => f.id === wizardState.selectedFramework)
    : null;

  const currentRequirementDetails = useMemo(() => {
    if (!wizardState.currentRequirementId) return null;
    return getRequirementDetails(wizardState.currentRequirementId);
  }, [wizardState.currentRequirementId, getRequirementDetails]);

  const handleNext = () => {
    const nextId = getNextRequirement();
    if (nextId) {
      navigateToRequirement(nextId);
    } else {
      setWizardStep('review');
    }
  };

  const handlePrevious = () => {
    const prevId = getPreviousRequirement();
    if (prevId) {
      navigateToRequirement(prevId);
    }
  };

  const handleSkip = () => {
    if (wizardState.currentRequirementId) {
      skipRequirement(wizardState.currentRequirementId);
      handleNext();
    }
  };

  const handleExport = () => {
    const summary = getSummary();
    if (!summary) return;

    const exportData = {
      framework: frameworkMeta,
      summary,
      exportedAt: new Date().toISOString(),
      assessments: wizardState.assessments,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${wizardState.selectedFramework}_assessment_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stepIndicators = [
    { id: 'framework_selection', label: 'Framework', icon: Target },
    { id: 'scope_definition', label: 'Scope', icon: FileText },
    { id: 'assessment', label: 'Assessment', icon: Shield },
    { id: 'review', label: 'Review', icon: CheckCircle2 },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-steel-900">
      {/* Header */}
      <div className="bg-white dark:bg-steel-800 border-b border-slate-200 dark:border-steel-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {frameworkMeta && (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: `${FRAMEWORK_COLORS[frameworkMeta.id]}15` }}
              >
                {frameworkMeta.icon}
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-steel-100">
                {frameworkMeta ? `${frameworkMeta.name} Assessment` : 'Requirement Assessment Wizard'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-steel-400">
                {frameworkMeta?.fullName || 'Assess compliance at the requirement level'}
              </p>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="hidden md:flex items-center gap-2">
            {stepIndicators.map((step, idx) => {
              const isActive = wizardState.currentStep === step.id;
              const isPast = stepIndicators.findIndex(s => s.id === wizardState.currentStep) > idx;
              const Icon = step.icon;

              return (
                <React.Fragment key={step.id}>
                  {idx > 0 && (
                    <div className={`w-8 h-0.5 ${isPast ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-steel-700'}`} />
                  )}
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-100 dark:bg-accent-500/20 text-indigo-700 dark:text-accent-400'
                        : isPast
                          ? 'text-indigo-600 dark:text-accent-400'
                          : 'text-slate-400 dark:text-steel-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{step.label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:text-steel-500 dark:hover:text-steel-300"
            >
              <XCircle className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Step 1: Framework Selection */}
          {wizardState.currentStep === 'framework_selection' && (
            <motion.div
              key="framework"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto p-6"
            >
              <div className="max-w-4xl mx-auto">
                <FrameworkSelectionStep onSelect={selectFramework} />
              </div>
            </motion.div>
          )}

          {/* Step 2: Scope Definition */}
          {wizardState.currentStep === 'scope_definition' && wizardState.selectedFramework && (
            <motion.div
              key="scope"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto p-6"
            >
              <div className="max-w-2xl mx-auto">
                <FrameworkScopeForm
                  frameworkId={wizardState.selectedFramework}
                  existingScope={wizardState.scope}
                  onSubmit={setScope}
                  onBack={() => setWizardStep('framework_selection')}
                />
              </div>
            </motion.div>
          )}

          {/* Step 3: Assessment */}
          {wizardState.currentStep === 'assessment' && wizardState.selectedFramework && (
            <motion.div
              key="assessment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex"
            >
              {/* Requirement Navigator Sidebar */}
              <div className="w-80 flex-shrink-0 border-r border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-800">
                <RequirementNavigator
                  frameworkId={wizardState.selectedFramework}
                  currentRequirementId={wizardState.currentRequirementId}
                  assessments={wizardState.assessments}
                  onSelect={navigateToRequirement}
                />
              </div>

              {/* Assessment Panel */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {wizardState.currentRequirementId && currentRequirementDetails ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-6">
                      <RequirementAssessmentPanel
                        requirement={currentRequirementDetails}
                        assessment={getAssessment(wizardState.currentRequirementId)}
                        controls={controls}
                        getControlAnswer={getControlAnswer}
                        onControlClick={onControlClick}
                        onUpdateStatus={updateAssessmentStatus}
                        onSaveDirectAssessment={saveDirectAssessment}
                        onAddEvidence={addEvidence}
                        onRemoveEvidence={removeEvidence}
                        onSaveAddressableDecision={saveAddressableDecision}
                        onAddNote={addNote}
                      />
                    </div>

                    {/* Navigation Footer */}
                    <div className="border-t border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-800 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={handlePrevious}
                          disabled={!getPreviousRequirement()}
                          className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-steel-400 hover:text-slate-800 dark:hover:text-steel-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-5 h-5" />
                          Previous
                        </button>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleSkip}
                            className="px-4 py-2 text-slate-500 dark:text-steel-400 hover:text-slate-700 dark:hover:text-steel-200"
                          >
                            Skip for now
                          </button>
                          <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            {getNextRequirement() ? 'Next' : 'Review'}
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-steel-400 mb-1">
                          <span>Progress</span>
                          <span>{wizardState.progress.assessed} / {wizardState.progress.total}</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-steel-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 transition-all duration-300"
                            style={{ width: `${(wizardState.progress.assessed / wizardState.progress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Shield className="w-16 h-16 text-slate-300 dark:text-steel-600 mx-auto mb-4" />
                      <p className="text-slate-500 dark:text-steel-400">
                        Select a requirement from the sidebar to begin assessment
                      </p>
                      <button
                        onClick={() => {
                          const first = getNextRequirement();
                          if (first) navigateToRequirement(first);
                        }}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Start Assessment
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 4: Review */}
          {wizardState.currentStep === 'review' && wizardState.selectedFramework && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto p-6"
            >
              <div className="max-w-2xl mx-auto">
                <ReviewSummary
                  frameworkId={wizardState.selectedFramework}
                  summary={getSummary()}
                  onRestart={() => {
                    if (wizardState.selectedFramework) {
                      resetFrameworkAssessment(wizardState.selectedFramework);
                    }
                    setWizardStep('framework_selection');
                  }}
                  onExport={handleExport}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RequirementAssessmentWizard;
