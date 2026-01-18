/**
 * Framework Pills
 *
 * Visual indicators showing which frameworks a control satisfies.
 * Pills "glow" when the control is implemented, showing coverage.
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { FrameworkId } from '../../constants/controls';

interface FrameworkPill {
  frameworkId: FrameworkId;
  frameworkName: string;
  frameworkColor: string;
  clauseCount: number;
}

interface FrameworkPillsProps {
  pills: FrameworkPill[];
  isImplemented: boolean;
  compact?: boolean;
  onPillClick?: (frameworkId: FrameworkId) => void;
}

const FrameworkPills: React.FC<FrameworkPillsProps> = ({
  pills,
  isImplemented,
  compact = false,
  onPillClick,
}) => {
  // Group pills by framework
  const uniquePills = pills.reduce((acc, pill) => {
    const existing = acc.find(p => p.frameworkId === pill.frameworkId);
    if (existing) {
      existing.clauseCount += pill.clauseCount;
    } else {
      acc.push({ ...pill });
    }
    return acc;
  }, [] as FrameworkPill[]);

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'gap-2'}`}>
      {uniquePills.map((pill, index) => (
        <motion.button
          key={pill.frameworkId}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onPillClick?.(pill.frameworkId)}
          className={`
            relative group rounded-full font-medium transition-all duration-300
            ${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
            ${onPillClick ? 'cursor-pointer' : 'cursor-default'}
          `}
          style={{
            backgroundColor: isImplemented
              ? `${pill.frameworkColor}20`
              : 'rgb(241 245 249)', // slate-100
            color: isImplemented
              ? pill.frameworkColor
              : 'rgb(148 163 184)', // slate-400
            boxShadow: isImplemented
              ? `0 0 12px ${pill.frameworkColor}40`
              : 'none',
          }}
        >
          {/* Glow effect when implemented */}
          {isImplemented && (
            <motion.span
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                backgroundColor: pill.frameworkColor,
                filter: 'blur(4px)',
                zIndex: -1,
              }}
            />
          )}

          <span className="relative z-10 flex items-center gap-1">
            {pill.frameworkName}
            {!compact && pill.clauseCount > 1 && (
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: isImplemented
                    ? `${pill.frameworkColor}30`
                    : 'rgb(226 232 240)', // slate-200
                }}
              >
                {pill.clauseCount}
              </span>
            )}
          </span>

          {/* Tooltip on hover */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            <div className="bg-slate-900 dark:bg-steel-600 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
              {pill.clauseCount} {pill.clauseCount === 1 ? 'clause' : 'clauses'} in {pill.frameworkName}
              {isImplemented ? (
                <span className="text-emerald-400 ml-1">✓ Satisfied</span>
              ) : (
                <span className="text-slate-400 ml-1">○ Pending</span>
              )}
            </div>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-steel-600" />
          </div>
        </motion.button>
      ))}
    </div>
  );
};

// Summary component for showing coverage at a glance
export const FrameworkCoverageSummary: React.FC<{
  totalRequirements: number;
  frameworksCovered: number;
  isImplemented: boolean;
}> = ({ totalRequirements, frameworksCovered, isImplemented }) => {
  if (totalRequirements === 0) return null;

  return (
    <div className={`
      text-xs font-medium
      ${isImplemented ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-steel-400'}
    `}>
      {isImplemented ? (
        <>
          ✓ Satisfies {totalRequirements} {totalRequirements === 1 ? 'requirement' : 'requirements'} across {frameworksCovered} {frameworksCovered === 1 ? 'framework' : 'frameworks'}
        </>
      ) : (
        <>
          Will satisfy {totalRequirements} {totalRequirements === 1 ? 'requirement' : 'requirements'} across {frameworksCovered} {frameworksCovered === 1 ? 'framework' : 'frameworks'}
        </>
      )}
    </div>
  );
};

export default FrameworkPills;
