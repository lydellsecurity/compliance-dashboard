/**
 * Continuous Monitoring Service
 *
 * Provides real-time compliance monitoring capabilities:
 * - Compliance score tracking over time
 * - Control status change detection
 * - Alert generation for compliance drift
 * - Trend analysis and forecasting
 * - Integration with cloud verification results
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertType = 'compliance_drift' | 'control_degraded' | 'evidence_expiring' | 'verification_failed' | 'score_threshold' | 'framework_deadline';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';

export interface ComplianceSnapshot {
  id: string;
  timestamp: string;
  overallScore: number;
  frameworkScores: Record<string, number>;
  domainScores: Record<string, number>;
  controlsCompliant: number;
  controlsNonCompliant: number;
  controlsPartial: number;
  controlsNotStarted: number;
  criticalGaps: string[];
  metadata?: Record<string, unknown>;
}

export interface ComplianceAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  controlId?: string;
  frameworkId?: string;
  previousValue?: number;
  currentValue?: number;
  threshold?: number;
  status: AlertStatus;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  enabled: boolean;
  severity: AlertSeverity;
  conditions: {
    metric: string;
    operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'change';
    value: number;
    timeWindowMinutes?: number;
  };
  notificationChannels: ('email' | 'slack' | 'webhook' | 'in_app')[];
  createdAt: string;
  updatedAt: string;
}

export interface MonitoringConfig {
  snapshotIntervalMinutes: number;
  alertRules: AlertRule[];
  enabledFrameworks: string[];
  enabledDomains: string[];
  notificationEmail?: string;
  slackWebhook?: string;
  webhookUrl?: string;
}

export interface TrendData {
  timestamps: string[];
  scores: number[];
  trend: 'improving' | 'stable' | 'declining';
  changePercent: number;
  projectedScore?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEYS = {
  SNAPSHOTS: 'compliance_monitoring_snapshots',
  ALERTS: 'compliance_monitoring_alerts',
  CONFIG: 'compliance_monitoring_config',
  ALERT_RULES: 'compliance_monitoring_rules',
};

const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'rule-score-critical',
    name: 'Critical Score Drop',
    type: 'score_threshold',
    enabled: true,
    severity: 'critical',
    conditions: {
      metric: 'overall_score',
      operator: 'lt',
      value: 50,
    },
    notificationChannels: ['in_app', 'email'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-compliance-drift',
    name: 'Compliance Drift Detected',
    type: 'compliance_drift',
    enabled: true,
    severity: 'high',
    conditions: {
      metric: 'overall_score',
      operator: 'change',
      value: -10,
      timeWindowMinutes: 1440, // 24 hours
    },
    notificationChannels: ['in_app'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-control-degraded',
    name: 'Control Status Degraded',
    type: 'control_degraded',
    enabled: true,
    severity: 'medium',
    conditions: {
      metric: 'control_status',
      operator: 'change',
      value: -1, // Any downgrade
    },
    notificationChannels: ['in_app'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-framework-low',
    name: 'Framework Score Below Threshold',
    type: 'score_threshold',
    enabled: true,
    severity: 'high',
    conditions: {
      metric: 'framework_score',
      operator: 'lt',
      value: 70,
    },
    notificationChannels: ['in_app'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_CONFIG: MonitoringConfig = {
  snapshotIntervalMinutes: 60,
  alertRules: DEFAULT_ALERT_RULES,
  enabledFrameworks: ['SOC2', 'ISO27001', 'HIPAA', 'NIST'],
  enabledDomains: [],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function calculateTrend(scores: number[]): 'improving' | 'stable' | 'declining' {
  if (scores.length < 2) return 'stable';

  const recentScores = scores.slice(-5);
  const firstHalf = recentScores.slice(0, Math.floor(recentScores.length / 2));
  const secondHalf = recentScores.slice(Math.floor(recentScores.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;

  if (diff > 2) return 'improving';
  if (diff < -2) return 'declining';
  return 'stable';
}

function projectScore(scores: number[]): number | undefined {
  if (scores.length < 3) return undefined;

  // Simple linear regression for next value
  const recent = scores.slice(-10);
  const n = recent.length;
  const x = recent.map((_, i) => i);
  const y = recent;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);

  const denominator = n * sumX2 - sumX * sumX;

  // Avoid division by zero (happens when all x values are the same)
  if (denominator === 0) {
    return Math.round(sumY / n); // Return average if no trend can be calculated
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const projected = slope * n + intercept;
  return Math.max(0, Math.min(100, Math.round(projected)));
}

// ============================================================================
// CONTINUOUS MONITORING SERVICE CLASS
// ============================================================================

export class ContinuousMonitoringService {
  private snapshots: ComplianceSnapshot[] = [];
  private alerts: ComplianceAlert[] = [];
  private config: MonitoringConfig = DEFAULT_CONFIG;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  // -------------------------------------------------------------------------
  // INITIALIZATION & PERSISTENCE
  // -------------------------------------------------------------------------

  private loadFromStorage(): void {
    try {
      const snapshotsJson = localStorage.getItem(STORAGE_KEYS.SNAPSHOTS);
      const alertsJson = localStorage.getItem(STORAGE_KEYS.ALERTS);
      const configJson = localStorage.getItem(STORAGE_KEYS.CONFIG);

      if (snapshotsJson) {
        this.snapshots = JSON.parse(snapshotsJson);
      }
      if (alertsJson) {
        this.alerts = JSON.parse(alertsJson);
      }
      if (configJson) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(configJson) };
      }
    } catch (error) {
      console.error('Error loading monitoring data from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(this.snapshots));
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(this.alerts));
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving monitoring data to storage:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // -------------------------------------------------------------------------
  // SNAPSHOT MANAGEMENT
  // -------------------------------------------------------------------------

  /**
   * Record a compliance snapshot with current state
   */
  recordSnapshot(data: {
    overallScore: number;
    frameworkScores: Record<string, number>;
    domainScores: Record<string, number>;
    controlsCompliant: number;
    controlsNonCompliant: number;
    controlsPartial: number;
    controlsNotStarted: number;
    criticalGaps: string[];
  }): ComplianceSnapshot {
    const snapshot: ComplianceSnapshot = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      ...data,
    };

    this.snapshots.push(snapshot);

    // Keep last 1000 snapshots
    if (this.snapshots.length > 1000) {
      this.snapshots = this.snapshots.slice(-1000);
    }

    // Check alert rules
    this.evaluateAlertRules(snapshot);

    this.saveToStorage();
    this.notifyListeners();

    // Also save to Supabase if available
    this.saveSnapshotToSupabase(snapshot);

    return snapshot;
  }

  /**
   * Get all snapshots within a time range
   */
  getSnapshots(options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): ComplianceSnapshot[] {
    let filtered = [...this.snapshots];

    if (options?.startDate) {
      const start = options.startDate.toISOString();
      filtered = filtered.filter(s => s.timestamp >= start);
    }

    if (options?.endDate) {
      const end = options.endDate.toISOString();
      filtered = filtered.filter(s => s.timestamp <= end);
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Get the latest snapshot
   */
  getLatestSnapshot(): ComplianceSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  /**
   * Get trend data for a specific metric
   */
  getTrendData(metric: 'overall' | 'framework' | 'domain', id?: string, days: number = 30): TrendData {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const relevantSnapshots = this.snapshots.filter(
      s => new Date(s.timestamp) >= cutoff
    );

    let scores: number[];
    if (metric === 'overall') {
      scores = relevantSnapshots.map(s => s.overallScore);
    } else if (metric === 'framework' && id) {
      scores = relevantSnapshots.map(s => s.frameworkScores[id] || 0);
    } else if (metric === 'domain' && id) {
      scores = relevantSnapshots.map(s => s.domainScores[id] || 0);
    } else {
      scores = [];
    }

    const timestamps = relevantSnapshots.map(s => s.timestamp);
    const trend = calculateTrend(scores);

    // Calculate change percent, avoiding division by zero
    let changePercent = 0;
    if (scores.length >= 2 && scores[0] !== 0) {
      changePercent = ((scores[scores.length - 1] - scores[0]) / scores[0]) * 100;
    } else if (scores.length >= 2 && scores[0] === 0 && scores[scores.length - 1] !== 0) {
      // If starting from 0, report as 100% increase if current value is positive
      changePercent = 100;
    }

    return {
      timestamps,
      scores,
      trend,
      changePercent: Math.round(changePercent * 10) / 10,
      projectedScore: projectScore(scores),
    };
  }

  // -------------------------------------------------------------------------
  // ALERT MANAGEMENT
  // -------------------------------------------------------------------------

  /**
   * Evaluate alert rules against a snapshot
   */
  private evaluateAlertRules(snapshot: ComplianceSnapshot): void {
    const previousSnapshot = this.snapshots.length > 1
      ? this.snapshots[this.snapshots.length - 2]
      : null;

    for (const rule of this.config.alertRules) {
      if (!rule.enabled) continue;

      let shouldAlert = false;
      let alertData: Partial<ComplianceAlert> = {};

      switch (rule.type) {
        case 'score_threshold':
          if (rule.conditions.metric === 'overall_score') {
            shouldAlert = this.evaluateCondition(
              snapshot.overallScore,
              rule.conditions.operator,
              rule.conditions.value
            );
            if (shouldAlert) {
              alertData = {
                title: `Overall compliance score is ${snapshot.overallScore}%`,
                description: `Score has fallen ${rule.conditions.operator === 'lt' ? 'below' : 'to'} the threshold of ${rule.conditions.value}%`,
                currentValue: snapshot.overallScore,
                threshold: rule.conditions.value,
              };
            }
          } else if (rule.conditions.metric === 'framework_score') {
            for (const [fwId, score] of Object.entries(snapshot.frameworkScores)) {
              if (this.evaluateCondition(score, rule.conditions.operator, rule.conditions.value)) {
                this.createAlert({
                  type: rule.type,
                  severity: rule.severity,
                  title: `${fwId} framework score is ${score}%`,
                  description: `Framework score has fallen below the threshold of ${rule.conditions.value}%`,
                  frameworkId: fwId,
                  currentValue: score,
                  threshold: rule.conditions.value,
                });
              }
            }
          }
          break;

        case 'compliance_drift':
          if (previousSnapshot && rule.conditions.timeWindowMinutes) {
            const timeDiff = new Date(snapshot.timestamp).getTime() -
              new Date(previousSnapshot.timestamp).getTime();
            const windowMs = rule.conditions.timeWindowMinutes * 60 * 1000;

            if (timeDiff <= windowMs) {
              const drift = snapshot.overallScore - previousSnapshot.overallScore;
              if (drift <= rule.conditions.value) {
                shouldAlert = true;
                alertData = {
                  title: `Compliance drift detected: ${drift.toFixed(1)}% change`,
                  description: `Overall compliance score dropped from ${previousSnapshot.overallScore}% to ${snapshot.overallScore}%`,
                  previousValue: previousSnapshot.overallScore,
                  currentValue: snapshot.overallScore,
                };
              }
            }
          }
          break;

        case 'control_degraded':
          if (previousSnapshot) {
            const prevCritical = new Set(previousSnapshot.criticalGaps);
            const newGaps = snapshot.criticalGaps.filter(g => !prevCritical.has(g));

            for (const gap of newGaps) {
              this.createAlert({
                type: rule.type,
                severity: rule.severity,
                title: `Control ${gap} has become non-compliant`,
                description: `This control was previously compliant but is now marked as a critical gap`,
                controlId: gap,
              });
            }
          }
          break;
      }

      if (shouldAlert && alertData.title) {
        this.createAlert({
          type: rule.type,
          severity: rule.severity,
          ...alertData,
        } as Omit<ComplianceAlert, 'id' | 'status' | 'createdAt'>);
      }
    }
  }

  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  /**
   * Create a new alert
   */
  createAlert(data: Omit<ComplianceAlert, 'id' | 'status' | 'createdAt'>): ComplianceAlert {
    // Check for duplicate active alerts
    const existingAlert = this.alerts.find(
      a => a.status === 'active' &&
        a.type === data.type &&
        a.controlId === data.controlId &&
        a.frameworkId === data.frameworkId
    );

    if (existingAlert) {
      return existingAlert;
    }

    const alert: ComplianceAlert = {
      id: generateId(),
      status: 'active',
      createdAt: new Date().toISOString(),
      ...data,
    };

    this.alerts.unshift(alert);

    // Keep last 500 alerts
    if (this.alerts.length > 500) {
      this.alerts = this.alerts.slice(0, 500);
    }

    this.saveToStorage();
    this.notifyListeners();

    return alert;
  }

  /**
   * Get all alerts with optional filters
   */
  getAlerts(options?: {
    status?: AlertStatus | AlertStatus[];
    severity?: AlertSeverity | AlertSeverity[];
    type?: AlertType | AlertType[];
    limit?: number;
  }): ComplianceAlert[] {
    let filtered = [...this.alerts];

    if (options?.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      filtered = filtered.filter(a => statuses.includes(a.status));
    }

    if (options?.severity) {
      const severities = Array.isArray(options.severity) ? options.severity : [options.severity];
      filtered = filtered.filter(a => severities.includes(a.severity));
    }

    if (options?.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type];
      filtered = filtered.filter(a => types.includes(a.type));
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Get count of active alerts by severity
   */
  getAlertCounts(): Record<AlertSeverity, number> {
    const counts: Record<AlertSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const alert of this.alerts) {
      if (alert.status === 'active') {
        counts[alert.severity]++;
      }
    }

    return counts;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, userId?: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || alert.status !== 'active') return false;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = userId;

    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, userId?: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || alert.status === 'resolved') return false;

    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();
    alert.resolvedBy = userId;

    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  /**
   * Dismiss an alert
   */
  dismissAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.status = 'dismissed';
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  // -------------------------------------------------------------------------
  // CONFIGURATION
  // -------------------------------------------------------------------------

  /**
   * Get current monitoring configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(updates: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Add or update an alert rule
   */
  upsertAlertRule(rule: Omit<AlertRule, 'createdAt' | 'updatedAt'>): void {
    const existingIndex = this.config.alertRules.findIndex(r => r.id === rule.id);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      this.config.alertRules[existingIndex] = {
        ...rule,
        createdAt: this.config.alertRules[existingIndex].createdAt,
        updatedAt: now,
      };
    } else {
      this.config.alertRules.push({
        ...rule,
        createdAt: now,
        updatedAt: now,
      });
    }

    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Delete an alert rule
   */
  deleteAlertRule(ruleId: string): void {
    this.config.alertRules = this.config.alertRules.filter(r => r.id !== ruleId);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Reset to default alert rules
   */
  resetAlertRules(): void {
    this.config.alertRules = [...DEFAULT_ALERT_RULES];
    this.saveToStorage();
    this.notifyListeners();
  }

  // -------------------------------------------------------------------------
  // SUPABASE INTEGRATION
  // -------------------------------------------------------------------------

  private async saveSnapshotToSupabase(snapshot: ComplianceSnapshot): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;

    try {
      await supabase.from('compliance_snapshots').insert({
        id: snapshot.id,
        timestamp: snapshot.timestamp,
        overall_score: snapshot.overallScore,
        framework_scores: snapshot.frameworkScores,
        domain_scores: snapshot.domainScores,
        controls_compliant: snapshot.controlsCompliant,
        controls_non_compliant: snapshot.controlsNonCompliant,
        controls_partial: snapshot.controlsPartial,
        controls_not_started: snapshot.controlsNotStarted,
        critical_gaps: snapshot.criticalGaps,
        metadata: snapshot.metadata,
      });
    } catch (error) {
      console.error('Error saving snapshot to Supabase:', error);
    }
  }

  /**
   * Sync historical data from Supabase
   */
  async syncFromSupabase(): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('compliance_snapshots')
        .select('*')
        .order('timestamp', { ascending: true })
        .limit(1000);

      if (error) throw error;

      if (data && data.length > 0) {
        this.snapshots = data.map(row => ({
          id: row.id,
          timestamp: row.timestamp,
          overallScore: row.overall_score,
          frameworkScores: row.framework_scores,
          domainScores: row.domain_scores,
          controlsCompliant: row.controls_compliant,
          controlsNonCompliant: row.controls_non_compliant,
          controlsPartial: row.controls_partial,
          controlsNotStarted: row.controls_not_started,
          criticalGaps: row.critical_gaps,
          metadata: row.metadata,
        }));

        this.saveToStorage();
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error syncing from Supabase:', error);
    }
  }

  // -------------------------------------------------------------------------
  // UTILITY METHODS
  // -------------------------------------------------------------------------

  /**
   * Clear all monitoring data
   */
  clearAll(): void {
    this.snapshots = [];
    this.alerts = [];
    this.config = { ...DEFAULT_CONFIG };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Export monitoring data as JSON
   */
  exportData(): string {
    return JSON.stringify({
      snapshots: this.snapshots,
      alerts: this.alerts,
      config: this.config,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Import monitoring data from JSON
   */
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);

      if (data.snapshots) this.snapshots = data.snapshots;
      if (data.alerts) this.alerts = data.alerts;
      if (data.config) this.config = { ...DEFAULT_CONFIG, ...data.config };

      this.saveToStorage();
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Error importing monitoring data:', error);
      return false;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const monitoringService = new ContinuousMonitoringService();

export default monitoringService;
