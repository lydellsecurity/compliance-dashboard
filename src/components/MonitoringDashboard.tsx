/**
 * Continuous Monitoring Dashboard Component
 *
 * Provides real-time visibility into compliance posture:
 * - Score trends over time with charts
 * - Active alerts with severity indicators
 * - Framework/domain health overview
 * - Quick actions for alert management
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Activity, TrendingUp, TrendingDown, Minus, Bell, AlertTriangle,
  CheckCircle2, XCircle, Shield, Clock, ChevronRight, ChevronDown,
  Settings, Download, Eye, EyeOff, BarChart3,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  monitoringService,
  type ComplianceAlert,
  type AlertSeverity,
  type TrendData,
} from '../services/continuous-monitoring.service';

// ============================================================================
// TYPES
// ============================================================================

interface MonitoringDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentScore?: number;
  frameworkScores?: Record<string, number>;
  domainScores?: Record<string, number>;
  criticalGaps?: string[];
  onOpenSettings?: () => void;
}

type TimeRange = '24h' | '7d' | '30d' | '90d';

// ============================================================================
// CONSTANTS
// ============================================================================

const SEVERITY_CONFIG: Record<AlertSeverity, { color: string; bgColor: string; icon: React.ReactNode }> = {
  critical: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <XCircle className="w-4 h-4" />,
  },
  high: {
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  medium: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  low: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <Bell className="w-4 h-4" />,
  },
  info: {
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    icon: <Bell className="w-4 h-4" />,
  },
};

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string; days: number }[] = [
  { value: '24h', label: '24 Hours', days: 1 },
  { value: '7d', label: '7 Days', days: 7 },
  { value: '30d', label: '30 Days', days: 30 },
  { value: '90d', label: '90 Days', days: 90 },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const TrendIndicator: React.FC<{ trend: 'improving' | 'stable' | 'declining'; change: number }> = ({
  trend,
  change,
}) => {
  if (trend === 'improving') {
    return (
      <div className="flex items-center gap-1 text-status-success">
        <TrendingUp className="w-4 h-4" />
        <span className="text-sm font-medium">+{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  }
  if (trend === 'declining') {
    return (
      <div className="flex items-center gap-1 text-status-error">
        <TrendingDown className="w-4 h-4" />
        <span className="text-sm font-medium">-{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-slate-500 dark:text-steel-400">
      <Minus className="w-4 h-4" />
      <span className="text-sm font-medium">Stable</span>
    </div>
  );
};

const MiniChart: React.FC<{ data: number[]; trend: 'improving' | 'stable' | 'declining' }> = ({
  data,
  trend,
}) => {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  const color = trend === 'improving' ? '#10B981' : trend === 'declining' ? '#EF4444' : '#6B7280';

  return (
    <svg viewBox="0 0 100 100" className="w-24 h-12">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const AlertCard: React.FC<{
  alert: ComplianceAlert;
  onAcknowledge: () => void;
  onDismiss: () => void;
  onResolve: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ alert, onAcknowledge, onDismiss, onResolve, isExpanded, onToggle }) => {
  const config = SEVERITY_CONFIG[alert.severity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${config.bgColor} border-slate-200 dark:border-steel-700 overflow-hidden`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-white/50 dark:hover:bg-steel-700/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={config.color}>{config.icon}</div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary truncate">{alert.title}</p>
            <p className="text-xs text-secondary">{new Date(alert.createdAt).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.bgColor} ${config.color}`}>
            {alert.severity.toUpperCase()}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-slate-200 dark:border-steel-700">
              <p className="text-sm text-secondary mt-3 mb-3">{alert.description}</p>

              {alert.currentValue !== undefined && (
                <div className="flex items-center gap-4 mb-3 text-sm">
                  {alert.previousValue !== undefined && (
                    <span className="text-secondary">
                      Previous: <strong>{alert.previousValue}%</strong>
                    </span>
                  )}
                  <span className="text-secondary">
                    Current: <strong className={alert.currentValue < (alert.threshold || 0) ? 'text-status-error' : ''}>{alert.currentValue}%</strong>
                  </span>
                  {alert.threshold !== undefined && (
                    <span className="text-secondary">
                      Threshold: <strong>{alert.threshold}%</strong>
                    </span>
                  )}
                </div>
              )}

              {alert.status === 'active' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onAcknowledge(); }}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onResolve(); }}
                    className="px-3 py-1.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-steel-800 text-slate-600 dark:text-steel-400 rounded-lg hover:bg-slate-200 dark:hover:bg-steel-700 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {alert.status === 'acknowledged' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    Acknowledged {alert.acknowledgedAt && `at ${new Date(alert.acknowledgedAt).toLocaleString()}`}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onResolve(); }}
                    className="px-3 py-1.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  >
                    Resolve
                  </button>
                </div>
              )}

              {alert.status === 'resolved' && (
                <span className="text-xs text-green-600 dark:text-green-400">
                  Resolved {alert.resolvedAt && `at ${new Date(alert.resolvedAt).toLocaleString()}`}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ScoreCard: React.FC<{
  label: string;
  score: number;
  trend: TrendData;
}> = ({ label, score, trend }) => (
  <div className="p-4 bg-slate-50 dark:bg-steel-800 rounded-xl">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-secondary">{label}</span>
      <TrendIndicator trend={trend.trend} change={trend.changePercent} />
    </div>
    <div className="flex items-end justify-between">
      <div className="text-3xl font-bold text-primary">{score}%</div>
      <MiniChart data={trend.scores.slice(-10)} trend={trend.trend} />
    </div>
    {trend.projectedScore !== undefined && (
      <div className="mt-2 flex items-center gap-1 text-xs text-secondary">
        {trend.projectedScore > score ? (
          <ArrowUpRight className="w-3 h-3 text-status-success" />
        ) : trend.projectedScore < score ? (
          <ArrowDownRight className="w-3 h-3 text-status-error" />
        ) : (
          <Minus className="w-3 h-3" />
        )}
        <span>Projected: {trend.projectedScore}%</span>
      </div>
    )}
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  isOpen,
  onClose,
  currentScore = 0,
  frameworkScores = {},
  domainScores = {},
  criticalGaps = [],
  onOpenSettings,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [showResolvedAlerts, setShowResolvedAlerts] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Get trend data
  const overallTrend = useMemo(() => {
    const days = TIME_RANGE_OPTIONS.find(t => t.value === timeRange)?.days || 7;
    return monitoringService.getTrendData('overall', undefined, days);
  }, [timeRange, refreshKey]);

  const frameworkTrends = useMemo(() => {
    const days = TIME_RANGE_OPTIONS.find(t => t.value === timeRange)?.days || 7;
    const trends: Record<string, TrendData> = {};
    for (const fwId of Object.keys(frameworkScores)) {
      trends[fwId] = monitoringService.getTrendData('framework', fwId, days);
    }
    return trends;
  }, [frameworkScores, timeRange, refreshKey]);

  // Get alerts
  const alerts = useMemo(() => {
    const statuses = showResolvedAlerts
      ? ['active', 'acknowledged', 'resolved', 'dismissed'] as const
      : ['active', 'acknowledged'] as const;
    return monitoringService.getAlerts({ status: [...statuses], limit: 50 });
  }, [showResolvedAlerts, refreshKey]);

  const alertCounts = useMemo(() => monitoringService.getAlertCounts(), [refreshKey]);

  // Track if we've recorded a snapshot for this session
  const hasRecordedSnapshot = useRef(false);

  // Record snapshot when dashboard opens with current data (only once per session)
  useEffect(() => {
    if (isOpen && currentScore > 0 && !hasRecordedSnapshot.current) {
      hasRecordedSnapshot.current = true;

      const controlsCompliant = Math.round((currentScore / 100) * 236);
      const controlsNonCompliant = criticalGaps.length;
      const remaining = Math.max(0, 236 - controlsCompliant - controlsNonCompliant);

      monitoringService.recordSnapshot({
        overallScore: currentScore,
        frameworkScores,
        domainScores,
        controlsCompliant,
        controlsNonCompliant,
        controlsPartial: Math.floor(remaining * 0.3),
        controlsNotStarted: Math.ceil(remaining * 0.7),
        criticalGaps,
      });
      setRefreshKey(k => k + 1);
    }

    // Reset when modal closes
    if (!isOpen) {
      hasRecordedSnapshot.current = false;
    }
  }, [isOpen, currentScore, frameworkScores, domainScores, criticalGaps]);

  // Subscribe to monitoring service updates
  useEffect(() => {
    return monitoringService.subscribe(() => setRefreshKey(k => k + 1));
  }, []);

  const toggleAlert = (alertId: string) => {
    setExpandedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(alertId)) {
        next.delete(alertId);
      } else {
        next.add(alertId);
      }
      return next;
    });
  };

  const handleExport = () => {
    const data = monitoringService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-monitoring-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalActiveAlerts = alertCounts.critical + alertCounts.high + alertCounts.medium + alertCounts.low;

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
            className="modal-backdrop"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-3xl modal-content z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-steel-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary">Continuous Monitoring</h2>
                  <p className="text-sm text-secondary">Real-time compliance posture tracking</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-steel-800 text-slate-500 dark:text-steel-400 transition-colors"
                  title="Export data"
                >
                  <Download className="w-4 h-4" />
                </button>
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-steel-800 text-slate-500 dark:text-steel-400 transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-steel-800 text-slate-500 dark:text-steel-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200 dark:border-steel-700">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-secondary mr-2">Time Range:</span>
              {TIME_RANGE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    timeRange === option.value
                      ? 'bg-accent-500 text-white'
                      : 'bg-slate-100 dark:bg-steel-800 text-secondary hover:bg-slate-200 dark:hover:bg-steel-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Overall Score */}
              <div>
                <h3 className="text-sm font-semibold text-secondary uppercase mb-3">Overall Compliance</h3>
                <ScoreCard
                  label="Compliance Score"
                  score={currentScore}
                  trend={overallTrend}
                />
              </div>

              {/* Framework Scores */}
              {Object.keys(frameworkScores).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-secondary uppercase mb-3">Framework Health</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(frameworkScores).map(([fwId, score]) => (
                      <ScoreCard
                        key={fwId}
                        label={fwId}
                        score={score}
                        trend={frameworkTrends[fwId] || { timestamps: [], scores: [], trend: 'stable', changePercent: 0 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Alert Summary */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-secondary uppercase">Active Alerts</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {alertCounts.critical > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs font-medium">
                          <XCircle className="w-3 h-3" />
                          {alertCounts.critical}
                        </span>
                      )}
                      {alertCounts.high > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          {alertCounts.high}
                        </span>
                      )}
                      {alertCounts.medium > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          {alertCounts.medium}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowResolvedAlerts(!showResolvedAlerts)}
                      className="flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors"
                    >
                      {showResolvedAlerts ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showResolvedAlerts ? 'Hide resolved' : 'Show resolved'}
                    </button>
                  </div>
                </div>

                {totalActiveAlerts === 0 && !showResolvedAlerts ? (
                  <div className="p-8 text-center bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="w-12 h-12 text-status-success mx-auto mb-3" />
                    <p className="font-medium text-green-800 dark:text-green-300">All Clear</p>
                    <p className="text-sm text-green-700 dark:text-green-400">No active alerts at this time</p>
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-steel-800 rounded-xl">
                    <Bell className="w-12 h-12 text-slate-300 dark:text-steel-600 mx-auto mb-3" />
                    <p className="text-secondary">No alerts to display</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.map(alert => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        isExpanded={expandedAlerts.has(alert.id)}
                        onToggle={() => toggleAlert(alert.id)}
                        onAcknowledge={() => {
                          monitoringService.acknowledgeAlert(alert.id);
                          setRefreshKey(k => k + 1);
                        }}
                        onDismiss={() => {
                          monitoringService.dismissAlert(alert.id);
                          setRefreshKey(k => k + 1);
                        }}
                        onResolve={() => {
                          monitoringService.resolveAlert(alert.id);
                          setRefreshKey(k => k + 1);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Critical Gaps */}
              {criticalGaps.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-secondary uppercase mb-3">Critical Gaps</h3>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800 dark:text-red-300">
                          {criticalGaps.length} control{criticalGaps.length > 1 ? 's' : ''} require immediate attention
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {criticalGaps.slice(0, 10).map(gap => (
                            <span
                              key={gap}
                              className="px-2 py-0.5 text-xs font-mono bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 rounded"
                            >
                              {gap}
                            </span>
                          ))}
                          {criticalGaps.length > 10 && (
                            <span className="px-2 py-0.5 text-xs text-red-600 dark:text-red-400">
                              +{criticalGaps.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Historical Data Info */}
              <div className="p-4 bg-slate-50 dark:bg-steel-800 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-5 h-5 text-accent-500" />
                  <span className="font-medium text-primary">Data Points</span>
                </div>
                <p className="text-sm text-secondary">
                  {monitoringService.getSnapshots().length} snapshots recorded.
                  Trend analysis based on {TIME_RANGE_OPTIONS.find(t => t.value === timeRange)?.label.toLowerCase()} of data.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MonitoringDashboard;
