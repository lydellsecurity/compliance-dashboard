/**
 * Master Progress Ring
 *
 * A large, animated circular progress indicator that shows
 * real-time compliance progress. Updates dynamically as
 * controls are marked as compliant.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

interface MasterProgressRingProps {
  percentage: number;
  totalControls: number;
  implementedControls: number;
  inProgressControls: number;
  frameworkStats: {
    frameworkId: string;
    name: string;
    percentage: number;
    color: string;
  }[];
  className?: string;
}

const MasterProgressRing: React.FC<MasterProgressRingProps> = ({
  percentage,
  totalControls,
  implementedControls,
  inProgressControls,
  frameworkStats,
  className = '',
}) => {
  // Ring calculation
  const size = 200;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on percentage
  const ringColor = useMemo(() => {
    if (percentage >= 80) return '#10B981'; // Emerald
    if (percentage >= 60) return '#3B82F6'; // Blue
    if (percentage >= 40) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  }, [percentage]);

  const notStartedControls = totalControls - implementedControls - inProgressControls;

  return (
    <div className={`bg-white dark:bg-steel-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-steel-700 ${className}`}>
      <div className="flex items-center gap-8">
        {/* Main Progress Ring */}
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-slate-100 dark:text-steel-700"
            />
            {/* Progress circle */}
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              key={percentage}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl font-bold text-slate-900 dark:text-white"
            >
              {percentage}%
            </motion.span>
            <span className="text-sm text-slate-500 dark:text-steel-400">Compliant</span>
          </div>
        </div>

        {/* Stats & Framework breakdown */}
        <div className="flex-1 space-y-4">
          {/* Control Status Summary */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
              Control Status
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  {implementedControls}
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-500">Implemented</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-amber-700 dark:text-amber-400">
                  {inProgressControls}
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-500">In Progress</div>
              </div>
              <div className="bg-slate-50 dark:bg-steel-700 rounded-lg p-3 text-center">
                <AlertTriangle className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <div className="text-xl font-bold text-slate-600 dark:text-steel-300">
                  {notStartedControls}
                </div>
                <div className="text-xs text-slate-500 dark:text-steel-400">Not Started</div>
              </div>
            </div>
          </div>

          {/* Framework Progress */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-steel-300 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Framework Coverage
            </h3>
            <div className="space-y-2">
              {frameworkStats.slice(0, 4).map((fw) => (
                <div key={fw.frameworkId} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-steel-400 w-20 truncate">
                    {fw.name}
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-steel-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${fw.percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: fw.color }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-steel-400 w-10 text-right">
                    {fw.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterProgressRing;
