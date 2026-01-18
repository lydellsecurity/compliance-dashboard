/**
 * Risk Heatmap Component
 *
 * 5x5 matrix visualization of risk distribution.
 * Axes:
 * - X-axis: Impact (Negligible → Critical)
 * - Y-axis: Likelihood (Rare → Almost Certain)
 *
 * Cell color intensity based on risk level:
 * - Green: Low risk
 * - Yellow: Medium risk
 * - Orange: High risk
 * - Red: Critical risk
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Grid3X3, AlertTriangle, Info } from 'lucide-react';
import type { UseComplianceReturn } from '../../hooks/useCompliance';

interface RiskHeatmapProps {
  compliance: UseComplianceReturn;
}

// Risk levels for 5x5 matrix
const LIKELIHOOD_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const IMPACT_LABELS = ['Negligible', 'Minor', 'Moderate', 'Major', 'Critical'];

// Risk score matrix (likelihood x impact = risk level)
// 1-4: Low, 5-9: Medium, 10-15: High, 16-25: Critical
const getRiskLevel = (likelihood: number, impact: number): 'low' | 'medium' | 'high' | 'critical' => {
  const score = (likelihood + 1) * (impact + 1);
  if (score <= 4) return 'low';
  if (score <= 9) return 'medium';
  if (score <= 15) return 'high';
  return 'critical';
};

const RISK_COLORS = {
  low: { bg: '#D1FAE5', text: '#065F46', hover: '#A7F3D0' },
  medium: { bg: '#FEF3C7', text: '#92400E', hover: '#FDE68A' },
  high: { bg: '#FED7AA', text: '#C2410C', hover: '#FDBA74' },
  critical: { bg: '#FECACA', text: '#991B1B', hover: '#FCA5A5' },
};

const RiskHeatmap: React.FC<RiskHeatmapProps> = ({ compliance }) => {
  // Calculate risk distribution from controls
  const heatmapData = useMemo(() => {
    const matrix: number[][] = Array(5).fill(null).map(() => Array(5).fill(0));
    const responses = compliance.state.responses;

    // Map controls to risk matrix based on their risk level and assessment status
    compliance.allControls.forEach((control) => {
      const response = responses.get(control.id);
      const answer = response?.answer;
      const isGap = answer === 'no' || answer === 'partial' || !answer;

      if (isGap) {
        // Map risk level to impact (x-axis)
        const impactIndex = control.riskLevel === 'critical' ? 4
          : control.riskLevel === 'high' ? 3
          : control.riskLevel === 'medium' ? 2
          : 1;

        // Distribute likelihood based on domain and random factor for demo
        // In production, this would be based on actual threat intelligence
        const likelihoodIndex = Math.min(4, Math.floor(Math.random() * 3) + (isGap ? 2 : 0));

        matrix[4 - likelihoodIndex][impactIndex]++; // Invert Y for display (top = high likelihood)
      }
    });

    return matrix;
  }, [compliance.allControls, compliance.state.responses]);

  // Find max value for normalization
  const maxValue = useMemo(() => {
    return Math.max(1, ...heatmapData.flat());
  }, [heatmapData]);

  // Calculate summary stats
  const riskSummary = useMemo(() => {
    let critical = 0, high = 0, medium = 0, low = 0;

    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const count = heatmapData[y][x];
        const level = getRiskLevel(4 - y, x); // Invert Y back
        if (level === 'critical') critical += count;
        else if (level === 'high') high += count;
        else if (level === 'medium') medium += count;
        else low += count;
      }
    }

    return { critical, high, medium, low };
  }, [heatmapData]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-indigo-500" />
          Risk Heatmap
        </h3>
        <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Heatmap Grid */}
      <div className="relative">
        {/* Y-axis label */}
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium text-slate-500 whitespace-nowrap">
          Likelihood
        </div>

        <div className="pl-8">
          {/* Grid */}
          <div className="grid grid-cols-5 gap-1 mb-2">
            {heatmapData.map((row, y) =>
              row.map((count, x) => {
                const riskLevel = getRiskLevel(4 - y, x);
                const colors = RISK_COLORS[riskLevel];
                const intensity = count > 0 ? Math.max(0.3, count / maxValue) : 0.15;

                return (
                  <motion.div
                    key={`${x}-${y}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (x + y) * 0.05 }}
                    className="relative aspect-square rounded-lg flex items-center justify-center cursor-pointer group"
                    style={{
                      backgroundColor: count > 0 ? colors.bg : '#F1F5F9',
                      opacity: intensity,
                    }}
                    title={`${LIKELIHOOD_LABELS[4 - y]} x ${IMPACT_LABELS[x]}: ${count} controls`}
                  >
                    {count > 0 && (
                      <span
                        className="text-xs font-semibold"
                        style={{ color: colors.text }}
                      >
                        {count}
                      </span>
                    )}

                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {LIKELIHOOD_LABELS[4 - y]} / {IMPACT_LABELS[x]}
                      <br />
                      {count} gap{count !== 1 ? 's' : ''}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* X-axis labels */}
          <div className="grid grid-cols-5 gap-1 text-[10px] text-slate-500">
            {IMPACT_LABELS.map((label) => (
              <div key={label} className="text-center truncate">
                {label}
              </div>
            ))}
          </div>

          {/* X-axis title */}
          <div className="text-center text-xs font-medium text-slate-500 mt-2">
            Impact
          </div>
        </div>

        {/* Y-axis labels */}
        <div className="absolute left-8 top-0 bottom-8 flex flex-col justify-between text-[10px] text-slate-500 -ml-7">
          {LIKELIHOOD_LABELS.slice().reverse().map((label) => (
            <div key={label} className="h-0 flex items-center">
              <span className="truncate w-14 text-right">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Summary */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-lg text-center" style={{ backgroundColor: RISK_COLORS.critical.bg }}>
            <span className="text-lg font-bold" style={{ color: RISK_COLORS.critical.text }}>
              {riskSummary.critical}
            </span>
            <span className="text-xs block" style={{ color: RISK_COLORS.critical.text }}>
              Critical
            </span>
          </div>
          <div className="p-2 rounded-lg text-center" style={{ backgroundColor: RISK_COLORS.high.bg }}>
            <span className="text-lg font-bold" style={{ color: RISK_COLORS.high.text }}>
              {riskSummary.high}
            </span>
            <span className="text-xs block" style={{ color: RISK_COLORS.high.text }}>
              High
            </span>
          </div>
          <div className="p-2 rounded-lg text-center" style={{ backgroundColor: RISK_COLORS.medium.bg }}>
            <span className="text-lg font-bold" style={{ color: RISK_COLORS.medium.text }}>
              {riskSummary.medium}
            </span>
            <span className="text-xs block" style={{ color: RISK_COLORS.medium.text }}>
              Medium
            </span>
          </div>
          <div className="p-2 rounded-lg text-center" style={{ backgroundColor: RISK_COLORS.low.bg }}>
            <span className="text-lg font-bold" style={{ color: RISK_COLORS.low.text }}>
              {riskSummary.low}
            </span>
            <span className="text-xs block" style={{ color: RISK_COLORS.low.text }}>
              Low
            </span>
          </div>
        </div>

        {riskSummary.critical > 0 && (
          <div className="mt-3 p-2 bg-red-50 rounded-lg flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4" />
            {riskSummary.critical} critical risk gap{riskSummary.critical !== 1 ? 's' : ''} require immediate attention
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskHeatmap;
