/**
 * Compliance Velocity Component
 *
 * Displays the rate of compliance implementation over time.
 * Formula: (Controls Implemented This Period / Total Controls) * 100
 *
 * Features:
 * - Animated progress ring
 * - Trend indicator
 * - Period comparison
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from 'lucide-react';

interface ComplianceVelocityProps {
  rate: number; // 0-100
  trend: number; // positive or negative percentage change
  implemented: number;
  total: number;
}

const ComplianceVelocity: React.FC<ComplianceVelocityProps> = ({
  rate,
  trend,
  implemented,
  total,
}) => {
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (rate / 100) * circumference;

  // Determine trend status
  const trendStatus = trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'neutral';
  const TrendIcon = trend > 0 ? ArrowUpRight : trend < 0 ? ArrowDownRight : Minus;

  // Get color based on rate
  const getColor = (value: number) => {
    if (value >= 80) return { main: '#10B981', light: '#D1FAE5', ring: '#059669' };
    if (value >= 60) return { main: '#F59E0B', light: '#FEF3C7', ring: '#D97706' };
    return { main: '#EF4444', light: '#FEE2E2', ring: '#DC2626' };
  };

  const colors = getColor(rate);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Compliance Velocity
        </h3>
        <div className={`
          flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium
          ${trendStatus === 'positive'
            ? 'bg-emerald-100 text-emerald-700'
            : trendStatus === 'negative'
            ? 'bg-red-100 text-red-700'
            : 'bg-slate-100 text-slate-600'
          }
        `}>
          <TrendIcon className="w-4 h-4" />
          {Math.abs(trend)}%
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Progress Ring */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg className="-rotate-90" width={size} height={size}>
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth={strokeWidth}
            />
            {/* Progress circle */}
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={colors.main}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-3xl font-bold"
              style={{ color: colors.main }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {Math.round(rate)}%
            </motion.span>
            <span className="text-xs text-slate-500">Implemented</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-500">Controls Implemented</span>
              <span className="text-sm font-semibold text-slate-900">
                {implemented} / {total}
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: colors.main }}
                initial={{ width: 0 }}
                animate={{ width: `${rate}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-500 block">This Period</span>
              <span className="text-lg font-semibold text-slate-900">
                +{Math.round(implemented * 0.15)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-500 block">Avg/Week</span>
              <span className="text-lg font-semibold text-slate-900">
                {Math.round(implemented * 0.03)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Message */}
      <div className={`
        mt-4 p-3 rounded-lg text-sm flex items-center gap-2
        ${trendStatus === 'positive'
          ? 'bg-emerald-50 text-emerald-700'
          : trendStatus === 'negative'
          ? 'bg-red-50 text-red-700'
          : 'bg-slate-50 text-slate-600'
        }
      `}>
        {trendStatus === 'positive' ? (
          <TrendingUp className="w-4 h-4" />
        ) : trendStatus === 'negative' ? (
          <TrendingDown className="w-4 h-4" />
        ) : (
          <Minus className="w-4 h-4" />
        )}
        <span>
          {trendStatus === 'positive'
            ? `Great progress! ${Math.abs(trend)}% faster than last period.`
            : trendStatus === 'negative'
            ? `Velocity dropped ${Math.abs(trend)}% from last period.`
            : 'Velocity is stable compared to last period.'
          }
        </span>
      </div>
    </div>
  );
};

export default ComplianceVelocity;
