/**
 * Requirement Transparency
 *
 * Shows the full legal text of each framework requirement
 * that a control satisfies. Builds trust with non-technical users.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  Info,
  CheckCircle,
  Circle,
} from 'lucide-react';
import type { FrameworkId } from '../../constants/controls';
import type { SatisfiedRequirement } from '../../services/control-mapping-engine';

interface RequirementTransparencyProps {
  requirements: SatisfiedRequirement[];
  isImplemented: boolean;
  onViewFramework?: (frameworkId: FrameworkId) => void;
}

const RequirementTransparency: React.FC<RequirementTransparencyProps> = ({
  requirements,
  isImplemented,
  onViewFramework,
}) => {
  const [expandedRequirement, setExpandedRequirement] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Group requirements by framework
  const groupedRequirements = requirements.reduce((acc, req) => {
    if (!acc[req.frameworkId]) {
      acc[req.frameworkId] = {
        frameworkName: req.frameworkName,
        frameworkColor: req.frameworkColor,
        requirements: [],
      };
    }
    acc[req.frameworkId].requirements.push(req);
    return acc;
  }, {} as Record<FrameworkId, { frameworkName: string; frameworkColor: string; requirements: SatisfiedRequirement[] }>);

  const visibleFrameworks = showAll
    ? Object.entries(groupedRequirements)
    : Object.entries(groupedRequirements).slice(0, 3);

  const toggleRequirement = (reqKey: string) => {
    setExpandedRequirement(expandedRequirement === reqKey ? null : reqKey);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-500" />
          Compliance Coverage
        </h4>
        <span className="text-xs text-slate-500 dark:text-steel-400">
          {requirements.length} {requirements.length === 1 ? 'requirement' : 'requirements'}
        </span>
      </div>

      {/* Framework groups */}
      <div className="space-y-3">
        {visibleFrameworks.map(([frameworkId, group]) => (
          <div
            key={frameworkId}
            className="rounded-lg border border-slate-200 dark:border-steel-700 overflow-hidden"
          >
            {/* Framework header */}
            <div
              className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-steel-750"
              style={{ borderLeft: `3px solid ${group.frameworkColor}` }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: group.frameworkColor }}
                />
                <span className="font-medium text-slate-900 dark:text-white">
                  {group.frameworkName}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-steel-600 text-slate-600 dark:text-steel-300">
                  {group.requirements.length} {group.requirements.length === 1 ? 'clause' : 'clauses'}
                </span>
              </div>
              {onViewFramework && (
                <button
                  onClick={() => onViewFramework(frameworkId as FrameworkId)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  View all
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Requirements list */}
            <div className="divide-y divide-slate-100 dark:divide-steel-700">
              {group.requirements.map((req) => {
                const reqKey = `${req.frameworkId}-${req.clauseId}`;
                const isExpanded = expandedRequirement === reqKey;

                return (
                  <div key={reqKey} className="bg-white dark:bg-steel-800">
                    {/* Requirement row */}
                    <button
                      onClick={() => toggleRequirement(reqKey)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-steel-750 transition-colors"
                    >
                      {/* Status icon */}
                      {isImplemented ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 dark:text-steel-600 flex-shrink-0" />
                      )}

                      {/* Clause info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-medium text-indigo-600 dark:text-indigo-400">
                            {req.clauseId}
                          </span>
                          <span className="text-sm text-slate-700 dark:text-steel-300 truncate">
                            {req.clauseTitle}
                          </span>
                        </div>
                      </div>

                      {/* Expand/collapse */}
                      {req.clauseText && (
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-slate-400" />
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      )}
                    </button>

                    {/* Legal text (expanded) */}
                    <AnimatePresence>
                      {isExpanded && req.clauseText && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4">
                            <div className="ml-7 p-4 bg-slate-50 dark:bg-steel-750 rounded-lg border border-slate-200 dark:border-steel-700">
                              <h5 className="text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase tracking-wider mb-2">
                                Regulatory Text
                              </h5>
                              <p className="text-sm text-slate-700 dark:text-steel-300 leading-relaxed">
                                "{req.clauseText}"
                              </p>
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-xs text-slate-500 dark:text-steel-400">
                                  Source: {req.frameworkName}
                                </span>
                                {isImplemented && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                    ✓ Satisfied
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Show more/less */}
      {Object.keys(groupedRequirements).length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          {showAll ? (
            <>
              Show less frameworks
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Show {Object.keys(groupedRequirements).length - 3} more frameworks
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}

      {/* Summary */}
      {requirements.length > 0 && (
        <div className={`
          p-3 rounded-lg text-sm
          ${isImplemented
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
          }
        `}>
          {isImplemented ? (
            <>
              <strong>✓ This control is implemented.</strong> It currently satisfies{' '}
              {requirements.length} regulatory {requirements.length === 1 ? 'requirement' : 'requirements'} across{' '}
              {Object.keys(groupedRequirements).length} {Object.keys(groupedRequirements).length === 1 ? 'framework' : 'frameworks'}.
            </>
          ) : (
            <>
              <strong>○ Implementation needed.</strong> When completed, this control will satisfy{' '}
              {requirements.length} regulatory {requirements.length === 1 ? 'requirement' : 'requirements'} across{' '}
              {Object.keys(groupedRequirements).length} {Object.keys(groupedRequirements).length === 1 ? 'framework' : 'frameworks'}.
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RequirementTransparency;
