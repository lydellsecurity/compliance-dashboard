/**
 * Settings Module Component
 *
 * Comprehensive settings hub for the compliance dashboard:
 * - Continuous Monitoring configuration
 * - Cloud integrations (AWS, Azure, GCP)
 * - Alert configuration
 * - Notification preferences
 * - Organization settings
 */

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon, Cloud, Bell, Activity, Shield, Building2,
  ChevronRight, Monitor, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, Zap, Database, Lock, Globe, Mail, MessageSquare,
  Webhook, ToggleLeft, ToggleRight, Clock, TrendingUp, GitCompare,
  UserCog, Users, CreditCard, Key, ExternalLink, Plus, Receipt, Gavel,
  Download, FileText, Edit2, Save, Minus,
} from 'lucide-react';
import RegulatoryVersionControl from './RegulatoryVersionControl';
import {
  monitoringService,
  type AlertSeverity,
} from '../services/continuous-monitoring.service';
import { awsConnector } from '../services/cloud-integrations/aws-connector.service';
import { auth } from '../services/auth.service';
import { useEntitlement } from '../hooks/useEntitlement';
import { useUrlState } from '../hooks/useUrlState';
import { UpgradeModal } from './UpgradeGate';
import { DowngradeWarning } from './DowngradeWarning';
import { PLAN_DISPLAY } from '../constants/billing';
import type { Tenant, TenantPlan } from '../services/multi-tenant.service';

// ============================================================================
// TYPES
// ============================================================================

type SettingsSection = 'overview' | 'monitoring' | 'integrations' | 'alerts' | 'notifications' | 'organization' | 'regulatory' | 'admin';

interface SettingsProps {
  onOpenMonitoringDashboard: () => void;
  onOpenAlertConfiguration: () => void;
  onOpenCloudVerification: () => void;
  onOpenAdmin: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Settings sections are app-level configuration and personal preferences.
// Org-scoped management (team, billing, security, branding, audit) lives on
// the Admin tab via OrgManagementSuite. The "Cloud Integrations" section was
// removed to eliminate duplication with the top-level Integrations tab.
const SECTIONS: { id: SettingsSection; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'overview', label: 'Overview', icon: <SettingsIcon className="w-5 h-5" />, description: 'Quick access to all settings' },
  { id: 'monitoring', label: 'Continuous Monitoring', icon: <Activity className="w-5 h-5" />, description: 'Configure real-time compliance tracking' },
  { id: 'alerts', label: 'Alert Rules', icon: <Bell className="w-5 h-5" />, description: 'Configure alert thresholds and triggers' },
  { id: 'notifications', label: 'Notifications', icon: <Mail className="w-5 h-5" />, description: 'Email, Slack, and webhook delivery preferences' },
  { id: 'organization', label: 'Organization', icon: <Building2 className="w-5 h-5" />, description: 'App-level org preferences — for team, billing, and branding, use the Admin tab' },
  { id: 'regulatory', label: 'Regulatory Updates', icon: <GitCompare className="w-5 h-5" />, description: 'Track framework changes and compliance drift' },
  { id: 'admin', label: 'Admin', icon: <UserCog className="w-5 h-5" />, description: 'Open the Admin dashboard for team, billing, security, and audit logs' },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const QuickActionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  status?: 'active' | 'inactive' | 'warning';
  onClick: () => void;
  badge?: string;
}> = ({ icon, title, description, status, onClick, badge }) => {
  const statusColors = {
    active: 'bg-status-success/10 border-status-success/30',
    inactive: 'bg-slate-100 dark:bg-steel-800/50 border-slate-200 dark:border-steel-700',
    warning: 'bg-status-warning/10 border-status-warning/30',
  };

  const statusDot = {
    active: 'bg-status-success',
    inactive: 'bg-slate-400 dark:bg-steel-600',
    warning: 'bg-status-warning',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-5 rounded-xl border text-left transition-all hover:shadow-lg hover:-translate-y-0.5 ${statusColors[status || 'inactive']}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status === 'active' ? 'bg-status-success/20 text-status-success' : status === 'warning' ? 'bg-status-warning/20 text-status-warning' : 'bg-slate-200 dark:bg-steel-700 text-slate-500 dark:text-steel-400'}`}>
          {icon}
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-accent-500/10 text-accent-500 rounded">
              {badge}
            </span>
          )}
          {status && (
            <span className={`w-2.5 h-2.5 rounded-full ${statusDot[status]}`} />
          )}
        </div>
      </div>
      <h3 className="font-semibold text-primary mb-1">{title}</h3>
      <p className="text-sm text-secondary">{description}</p>
      <div className="flex items-center gap-1 mt-3 text-accent-500 text-sm font-medium">
        Configure
        <ChevronRight className="w-4 h-4" />
      </div>
    </button>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
}> = ({ icon, label, value, trend, color = 'text-accent-500' }) => (
  <div className="p-4 bg-slate-50 dark:bg-steel-800/50 rounded-xl border border-slate-200 dark:border-steel-700">
    <div className="flex items-center justify-between mb-2">
      <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-steel-700 flex items-center justify-center text-slate-500 dark:text-steel-400">
        {icon}
      </div>
      {trend && (
        <TrendingUp className={`w-4 h-4 ${trend === 'up' ? 'text-status-success' : trend === 'down' ? 'text-status-risk rotate-180' : 'text-slate-400'}`} />
      )}
    </div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-secondary mt-1">{label}</div>
  </div>
);

const ToggleSwitch: React.FC<{
  enabled: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}> = ({ enabled, onChange, label, description }) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <div className="font-medium text-primary">{label}</div>
      {description && <div className="text-sm text-secondary">{description}</div>}
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`p-1 rounded transition-colors ${enabled ? 'text-status-success' : 'text-slate-400 dark:text-steel-600'}`}
    >
      {enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
    </button>
  </div>
);

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

const OverviewSection: React.FC<SettingsProps> = ({
  onOpenMonitoringDashboard,
  onOpenAlertConfiguration,
  onOpenCloudVerification,
}) => {
  const config = monitoringService.getConfig();
  const alertCounts = monitoringService.getAlertCounts();
  const connectionStatus = awsConnector.getConnectionStatus();

  const totalActiveAlerts = Object.values(alertCounts).reduce((a, b) => a + b, 0);
  const enabledRules = config.alertRules.filter(r => r.enabled).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-primary mb-1">Settings Overview</h2>
        <p className="text-secondary">Quick access to configure your compliance monitoring</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Activity className="w-4 h-4" />}
          label="Monitoring Status"
          value="Active"
          color="text-status-success"
        />
        <StatCard
          icon={<Bell className="w-4 h-4" />}
          label="Active Alerts"
          value={totalActiveAlerts}
          color={totalActiveAlerts > 0 ? 'text-status-warning' : 'text-status-success'}
        />
        <StatCard
          icon={<Shield className="w-4 h-4" />}
          label="Alert Rules"
          value={`${enabledRules}/${config.alertRules.length}`}
        />
        <StatCard
          icon={<Cloud className="w-4 h-4" />}
          label="Integrations"
          value={connectionStatus?.connected ? '1 Active' : '0 Active'}
          color={connectionStatus?.connected ? 'text-status-success' : 'text-secondary'}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-4">Quick Actions</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <QuickActionCard
            icon={<Activity className="w-5 h-5" />}
            title="Monitoring Dashboard"
            description="View real-time compliance trends and alerts"
            status="active"
            onClick={onOpenMonitoringDashboard}
            badge="Live"
          />
          <QuickActionCard
            icon={<Cloud className="w-5 h-5" />}
            title="Cloud Verification"
            description="Connect AWS to automate compliance checks"
            status={connectionStatus?.connected ? 'active' : 'inactive'}
            onClick={onOpenCloudVerification}
            badge={connectionStatus?.connected ? 'Connected' : undefined}
          />
          <QuickActionCard
            icon={<Bell className="w-5 h-5" />}
            title="Alert Configuration"
            description="Configure alert rules and notifications"
            status={totalActiveAlerts > 0 ? 'warning' : 'active'}
            onClick={onOpenAlertConfiguration}
            badge={totalActiveAlerts > 0 ? `${totalActiveAlerts} alerts` : undefined}
          />
        </div>
      </div>

      {/* Active Alerts Summary */}
      {totalActiveAlerts > 0 && (
        <div className="p-4 bg-status-warning/10 border border-status-warning/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-warning flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-primary mb-1">Active Alerts Require Attention</h4>
              <p className="text-sm text-secondary mb-3">
                You have {totalActiveAlerts} active alert{totalActiveAlerts !== 1 ? 's' : ''} that need review.
              </p>
              <div className="flex flex-wrap gap-2">
                {alertCounts.critical > 0 && (
                  <span className="px-2 py-1 text-xs font-semibold bg-red-500/10 text-red-500 rounded">
                    {alertCounts.critical} Critical
                  </span>
                )}
                {alertCounts.high > 0 && (
                  <span className="px-2 py-1 text-xs font-semibold bg-orange-500/10 text-orange-500 rounded">
                    {alertCounts.high} High
                  </span>
                )}
                {alertCounts.medium > 0 && (
                  <span className="px-2 py-1 text-xs font-semibold bg-yellow-500/10 text-yellow-500 rounded">
                    {alertCounts.medium} Medium
                  </span>
                )}
                {alertCounts.low > 0 && (
                  <span className="px-2 py-1 text-xs font-semibold bg-blue-500/10 text-blue-500 rounded">
                    {alertCounts.low} Low
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MonitoringSection: React.FC<{ onOpenDashboard: () => void }> = ({ onOpenDashboard }) => {
  const config = monitoringService.getConfig();
  const latestSnapshot = monitoringService.getLatestSnapshot();
  const trendData = monitoringService.getTrendData('overall', undefined, 30);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary mb-1">Continuous Monitoring</h2>
          <p className="text-secondary">Configure real-time compliance tracking and analysis</p>
        </div>
        <button onClick={onOpenDashboard} className="btn-primary">
          <Monitor className="w-4 h-4" />
          Open Dashboard
        </button>
      </div>

      {/* Monitoring Status */}
      <div className="p-5 bg-status-success/5 border border-status-success/20 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-status-success/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-status-success" />
          </div>
          <div>
            <h3 className="font-semibold text-primary">Monitoring Active</h3>
            <p className="text-sm text-secondary">
              Recording snapshots every {config.snapshotIntervalMinutes} minutes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-white dark:bg-steel-800 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {latestSnapshot?.overallScore || 0}%
            </div>
            <div className="text-xs text-secondary">Current Score</div>
          </div>
          <div className="p-3 bg-white dark:bg-steel-800 rounded-lg">
            <div className={`text-2xl font-bold ${trendData.trend === 'improving' ? 'text-status-success' : trendData.trend === 'declining' ? 'text-status-risk' : 'text-secondary'}`}>
              {trendData.trend === 'improving' ? '+' : trendData.trend === 'declining' ? '' : ''}{trendData.changePercent}%
            </div>
            <div className="text-xs text-secondary">30-Day Change</div>
          </div>
          <div className="p-3 bg-white dark:bg-steel-800 rounded-lg">
            <div className="text-2xl font-bold text-accent-500">
              {trendData.projectedScore || '—'}%
            </div>
            <div className="text-xs text-secondary">Projected Score</div>
          </div>
        </div>
      </div>

      {/* Enabled Frameworks */}
      <div className="p-5 bg-slate-50 dark:bg-steel-800/50 rounded-xl border border-slate-200 dark:border-steel-700">
        <h3 className="font-semibold text-primary mb-4">Monitored Frameworks</h3>
        <div className="flex flex-wrap gap-2">
          {config.enabledFrameworks.map(fw => (
            <span
              key={fw}
              className="px-3 py-1.5 text-sm font-medium bg-accent-500/10 text-accent-500 rounded-lg"
            >
              {fw}
            </span>
          ))}
        </div>
      </div>

      {/* Snapshot History */}
      {latestSnapshot && (
        <div className="p-5 bg-slate-50 dark:bg-steel-800/50 rounded-xl border border-slate-200 dark:border-steel-700">
          <h3 className="font-semibold text-primary mb-4">Latest Snapshot</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-secondary mb-1">Recorded</div>
              <div className="font-medium text-primary flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(latestSnapshot.timestamp).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-secondary mb-1">Compliant Controls</div>
              <div className="font-medium text-status-success">{latestSnapshot.controlsCompliant}</div>
            </div>
            <div>
              <div className="text-secondary mb-1">Non-Compliant</div>
              <div className="font-medium text-status-risk">{latestSnapshot.controlsNonCompliant}</div>
            </div>
            <div>
              <div className="text-secondary mb-1">Critical Gaps</div>
              <div className="font-medium text-status-warning">{latestSnapshot.criticalGaps.length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const IntegrationsSection: React.FC<{ onOpenCloudVerification: () => void }> = ({ onOpenCloudVerification }) => {
  const connectionStatus = awsConnector.getConnectionStatus();
  const verifiableControls = awsConnector.getVerifiableControls();

  const integrations = [
    {
      id: 'aws',
      name: 'Amazon Web Services',
      description: 'Automate verification of S3, IAM, CloudTrail, KMS controls',
      icon: <Database className="w-6 h-6" />,
      connected: connectionStatus?.connected || false,
      controlCount: verifiableControls.length,
      color: '#FF9900',
    },
    {
      id: 'azure',
      name: 'Microsoft Azure',
      description: 'Coming soon - Azure security center integration',
      icon: <Cloud className="w-6 h-6" />,
      connected: false,
      controlCount: 0,
      color: '#0078D4',
      comingSoon: true,
    },
    {
      id: 'gcp',
      name: 'Google Cloud Platform',
      description: 'Coming soon - GCP security command center',
      icon: <Globe className="w-6 h-6" />,
      connected: false,
      controlCount: 0,
      color: '#4285F4',
      comingSoon: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-primary mb-1">Cloud Integrations</h2>
        <p className="text-secondary">Connect cloud providers for automated compliance verification</p>
      </div>

      <div className="space-y-4">
        {integrations.map(integration => (
          <div
            key={integration.id}
            className={`p-5 rounded-xl border transition-all ${
              integration.connected
                ? 'bg-status-success/5 border-status-success/30'
                : integration.comingSoon
                  ? 'bg-slate-50 dark:bg-steel-800/30 border-slate-200 dark:border-steel-700 opacity-60'
                  : 'bg-slate-50 dark:bg-steel-800/50 border-slate-200 dark:border-steel-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${integration.color}20`, color: integration.color }}
                >
                  {integration.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-primary">{integration.name}</h3>
                    {integration.connected && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-status-success/10 text-status-success rounded">
                        Connected
                      </span>
                    )}
                    {integration.comingSoon && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-slate-200 dark:bg-steel-700 text-secondary rounded">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-secondary mb-2">{integration.description}</p>
                  {integration.controlCount > 0 && (
                    <div className="text-xs text-secondary">
                      {integration.controlCount} controls available for verification
                    </div>
                  )}
                  {integration.connected && connectionStatus?.accountId && (
                    <div className="flex items-center gap-4 mt-3 text-xs">
                      <span className="text-secondary">
                        Account: <span className="font-mono text-primary">{connectionStatus.accountId}</span>
                      </span>
                      <span className="text-secondary">
                        Region: <span className="font-mono text-primary">{connectionStatus.region}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {!integration.comingSoon && (
                <button
                  onClick={onOpenCloudVerification}
                  className={`${integration.connected ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {integration.connected ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Manage
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Connect
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Security Note */}
      <div className="p-4 bg-accent-500/5 border border-accent-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-primary mb-1">Credential Security</h4>
            <p className="text-sm text-secondary">
              Credentials are never stored client-side. All API calls are made through secure serverless functions with encrypted connections.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AlertsSection: React.FC<{ onOpenConfiguration: () => void }> = ({ onOpenConfiguration }) => {
  const config = monitoringService.getConfig();
  const alertCounts = monitoringService.getAlertCounts();

  const severityColors: Record<AlertSeverity, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
    info: 'bg-slate-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary mb-1">Alert Rules</h2>
          <p className="text-secondary">Configure when and how you receive compliance alerts</p>
        </div>
        <button onClick={onOpenConfiguration} className="btn-primary">
          <SettingsIcon className="w-4 h-4" />
          Configure Rules
        </button>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-5 gap-3">
        {(Object.entries(alertCounts) as [AlertSeverity, number][]).map(([severity, count]) => (
          <div
            key={severity}
            className={`p-4 rounded-xl border ${count > 0 ? 'bg-slate-50 dark:bg-steel-800/50 border-slate-200 dark:border-steel-700' : 'bg-slate-50 dark:bg-steel-800/30 border-slate-200 dark:border-steel-800'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${severityColors[severity]}`} />
              <span className="text-xs font-medium text-secondary uppercase">{severity}</span>
            </div>
            <div className={`text-2xl font-bold ${count > 0 ? 'text-primary' : 'text-secondary'}`}>
              {count}
            </div>
          </div>
        ))}
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">Active Rules</h3>
        {config.alertRules.map(rule => (
          <div
            key={rule.id}
            className={`p-4 rounded-xl border transition-all ${
              rule.enabled
                ? 'bg-white dark:bg-steel-800 border-slate-200 dark:border-steel-700'
                : 'bg-slate-50 dark:bg-steel-900 border-slate-200 dark:border-steel-800 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${severityColors[rule.severity]}`} />
                <div>
                  <div className="font-medium text-primary">{rule.name}</div>
                  <div className="text-xs text-secondary">
                    {rule.conditions.metric} {rule.conditions.operator} {rule.conditions.value}
                    {rule.conditions.operator === 'change' ? '%' : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {rule.notificationChannels.map(channel => (
                  <span
                    key={channel}
                    className="px-2 py-1 text-xs bg-slate-100 dark:bg-steel-700 text-secondary rounded"
                  >
                    {channel}
                  </span>
                ))}
                {rule.enabled ? (
                  <CheckCircle2 className="w-5 h-5 text-status-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const NotificationsSection: React.FC = () => {
  const config = monitoringService.getConfig();
  const [email, setEmail] = useState(config.notificationEmail || '');
  const [slackUrl, setSlackUrl] = useState(config.slackWebhook || '');
  const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl || '');

  const handleSaveEmail = () => {
    monitoringService.updateConfig({ notificationEmail: email });
  };

  const handleSaveSlack = () => {
    monitoringService.updateConfig({ slackWebhook: slackUrl });
  };

  const handleSaveWebhook = () => {
    monitoringService.updateConfig({ webhookUrl: webhookUrl });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-primary mb-1">Notification Settings</h2>
        <p className="text-secondary">Configure how you receive alert notifications</p>
      </div>

      {/* Email */}
      <div className="p-5 bg-slate-50 dark:bg-steel-800/50 rounded-xl border border-slate-200 dark:border-steel-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-accent-500" />
          </div>
          <div>
            <h3 className="font-semibold text-primary">Email Notifications</h3>
            <p className="text-sm text-secondary">Receive alerts via email</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="alerts@yourcompany.com"
            className="input flex-1"
          />
          <button onClick={handleSaveEmail} className="btn-secondary">
            Save
          </button>
        </div>
      </div>

      {/* Slack */}
      <div className="p-5 bg-slate-50 dark:bg-steel-800/50 rounded-xl border border-slate-200 dark:border-steel-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#4A154B]/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[#4A154B]" />
          </div>
          <div>
            <h3 className="font-semibold text-primary">Slack Integration</h3>
            <p className="text-sm text-secondary">Send alerts to a Slack channel</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            type="url"
            value={slackUrl}
            onChange={e => setSlackUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            className="input flex-1"
          />
          <button onClick={handleSaveSlack} className="btn-secondary">
            Save
          </button>
        </div>
      </div>

      {/* Webhook */}
      <div className="p-5 bg-slate-50 dark:bg-steel-800/50 rounded-xl border border-slate-200 dark:border-steel-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-steel-700 flex items-center justify-center">
            <Webhook className="w-5 h-5 text-slate-600 dark:text-steel-400" />
          </div>
          <div>
            <h3 className="font-semibold text-primary">Custom Webhook</h3>
            <p className="text-sm text-secondary">Send alerts to a custom endpoint (JSON POST)</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            type="url"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://your-service.com/webhooks/alerts"
            className="input flex-1"
          />
          <button onClick={handleSaveWebhook} className="btn-secondary">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const OrganizationSection: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-primary mb-1">Organization Settings</h2>
        <p className="text-secondary">Configure your organization details and preferences</p>
      </div>

      <div className="p-5 bg-slate-50 dark:bg-steel-800/50 rounded-xl border border-slate-200 dark:border-steel-700">
        <h3 className="font-semibold text-primary mb-4">Company Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Organization Name</label>
            <input
              type="text"
              defaultValue="LYDELL SECURITY"
              className="input"
              placeholder="Your company name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Industry</label>
            <select className="input">
              <option>Technology</option>
              <option>Healthcare</option>
              <option>Finance</option>
              <option>Retail</option>
              <option>Manufacturing</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Company Size</label>
            <select className="input">
              <option>1-10 employees</option>
              <option>11-50 employees</option>
              <option>51-200 employees</option>
              <option>201-500 employees</option>
              <option>500+ employees</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-5 bg-slate-50 dark:bg-steel-800/50 rounded-xl border border-slate-200 dark:border-steel-700">
        <h3 className="font-semibold text-primary mb-4">Data Management</h3>
        <div className="space-y-4">
          <ToggleSwitch
            enabled={true}
            onChange={() => {}}
            label="Auto-sync to cloud"
            description="Automatically backup compliance data to Supabase"
          />
          <ToggleSwitch
            enabled={true}
            onChange={() => {}}
            label="Local storage"
            description="Store data locally for offline access"
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// REGULATORY SECTION
// ============================================================================

const RegulatorySection: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-primary mb-1">Regulatory Updates & Version Control</h2>
        <p className="text-secondary">Track framework version changes, compliance drift, and requirement updates</p>
      </div>

      <RegulatoryVersionControl />
    </div>
  );
};

// ============================================================================
// BILLING CARD
// ============================================================================

interface UsageSummary {
  periodStart: string;
  periodEnd: string;
  meters: Record<string, { used: number; cap: number | null }>;
  apiCallsThisMonth: number;
  plan: string;
  limits: Record<string, number> | null;
  usage: Record<string, number> | null;
}

const METER_LABELS: Record<string, string> = {
  ai_policy: 'AI policy generations',
  ai_remediation_chat: 'AI Remediation Chat messages',
  questionnaire: 'Questionnaire autofills',
  vendors: 'Vendors tracked',
  seats: 'Seats',
  report: 'Reports exported',
};

const BillingCard: React.FC = () => {
  const { tenant, plan, suggestedUpgrade, loading, refresh } = useEntitlement();
  const [portalLoading, setPortalLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [seatLoading, setSeatLoading] = useState(false);
  const [seatFeedback, setSeatFeedback] = useState<string | null>(null);

  // Pre-downgrade loss warning — shown when Stripe Portal redirects back
  // with ?downgrade=confirm&to=<plan>. Relies on Portal custom-flow config.
  const [downgradeFlag, setDowngradeFlag] = useUrlState('downgrade');
  const [downgradeTo] = useUrlState('to');

  const display = PLAN_DISPLAY[plan];
  const hasSubscription = !!tenant?.billing?.subscriptionId;
  const refund = tenant?.billing && (tenant.billing as unknown as {
    lastRefund?: { amount: number; currency: string; refundedAt: string; reason?: string | null };
  }).lastRefund;
  const dispute = tenant?.billing && (tenant.billing as unknown as {
    activeDispute?: { amount: number; currency: string; reason: string; status: string; createdAt: string };
  }).activeDispute;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = (await auth.getAccessToken()) ?? '';
        const res = await fetch('/.netlify/functions/billing-usage-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: '{}',
        });
        if (!res.ok) return;
        const json = (await res.json()) as UsageSummary;
        if (!cancelled) setUsage(json);
      } catch {
        // Non-critical.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant?.id, tenant?.billing?.currentPeriodEnd]);

  const openPortal = async () => {
    setError(null);
    setPortalLoading(true);
    try {
      const token = (await auth.getAccessToken()) ?? '';
      const res = await fetch('/.netlify/functions/stripe-create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not open billing portal');
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open billing portal');
      setPortalLoading(false);
    }
  };

  const addSeat = async () => {
    const priceEnv =
      plan === 'starter'
        ? (import.meta.env?.VITE_STRIPE_PRICE_SEAT_STARTER as string | undefined)
        : plan === 'growth'
          ? (import.meta.env?.VITE_STRIPE_PRICE_SEAT_GROWTH as string | undefined)
          : plan === 'scale'
            ? (import.meta.env?.VITE_STRIPE_PRICE_SEAT_SCALE as string | undefined)
            : '';
    if (!priceEnv) {
      setSeatFeedback('Seat pricing is not configured for your plan yet.');
      return;
    }
    setSeatLoading(true);
    setSeatFeedback(null);
    try {
      const token = (await auth.getAccessToken()) ?? '';
      const res = await fetch('/.netlify/functions/stripe-manage-addons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'add', priceId: priceEnv, quantity: 1 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not add seat');
      setSeatFeedback('Extra seat added. Prorated charge appears on your next invoice.');
      await refresh();
    } catch (err) {
      setSeatFeedback(err instanceof Error ? err.message : 'Could not add seat');
    } finally {
      setSeatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-5 text-sm text-secondary">Loading billing…</div>
    );
  }

  const seatPriceConfigured =
    (plan === 'starter' && !!import.meta.env?.VITE_STRIPE_PRICE_SEAT_STARTER) ||
    (plan === 'growth' && !!import.meta.env?.VITE_STRIPE_PRICE_SEAT_GROWTH) ||
    (plan === 'scale' && !!import.meta.env?.VITE_STRIPE_PRICE_SEAT_SCALE);

  return (
    <>
      <div className="p-5 bg-slate-50 dark:bg-steel-800/50 rounded-xl border border-slate-200 dark:border-steel-700 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-primary">
                {display.name} plan
              </h3>
              <p className="text-xs text-secondary">{display.tagline}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {hasSubscription && (
              <button
                type="button"
                onClick={openPortal}
                disabled={portalLoading}
                className="btn-secondary"
              >
                {portalLoading ? 'Opening…' : 'Manage billing'}
              </button>
            )}
            {hasSubscription && seatPriceConfigured && (
              <button
                type="button"
                onClick={addSeat}
                disabled={seatLoading}
                className="btn-secondary inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                {seatLoading ? 'Adding…' : 'Add seat'}
              </button>
            )}
            {suggestedUpgrade && suggestedUpgrade !== 'enterprise' && (
              <button
                type="button"
                onClick={() => setShowUpgrade(true)}
                className="btn-primary"
              >
                Upgrade to {PLAN_DISPLAY[suggestedUpgrade].name}
              </button>
            )}
            {suggestedUpgrade === 'enterprise' && (
              <a
                href="mailto:sales@lydellsecurity.com?subject=Enterprise%20plan%20enquiry"
                className="btn-primary"
              >
                Contact sales
              </a>
            )}
          </div>
        </div>

        {seatFeedback && (
          <p className="text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-lg px-3 py-2">
            {seatFeedback}
          </p>
        )}

        {dispute && (
          <div className="flex items-start gap-2 text-sm p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
            <Gavel className="w-4 h-4 mt-0.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <div className="text-rose-900 dark:text-rose-100">
              <p className="font-semibold">Active dispute — {dispute.status}</p>
              <p className="text-xs opacity-90">
                {(dispute.amount / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: (dispute.currency || 'usd').toUpperCase(),
                })}{' '}
                disputed {dispute.reason ? `(${dispute.reason})` : ''}. Contact{' '}
                <a className="underline" href="mailto:support@lydellsecurity.com">support</a> to resolve.
              </p>
            </div>
          </div>
        )}

        {refund && (
          <div className="flex items-start gap-2 text-sm p-3 rounded-lg bg-slate-50 dark:bg-steel-900 border border-slate-200 dark:border-steel-700">
            <Receipt className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
            <div>
              <p className="font-medium text-primary">
                Refund of{' '}
                {(refund.amount / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: (refund.currency || 'usd').toUpperCase(),
                })}{' '}
                processed
              </p>
              <p className="text-xs text-secondary">
                {new Date(refund.refundedAt).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
                {refund.reason ? ` — ${refund.reason}` : ''}. Usually posts within 5–10 business days.
              </p>
            </div>
          </div>
        )}

        {hasSubscription && <UpcomingInvoiceBlock tenantId={tenant?.id} />}

        {usage && <UsageMetersBlock usage={usage} />}

        {hasSubscription && (
          <SubscriptionItemsBlock tenantId={tenant?.id} onChange={refresh} />
        )}

        <BillingContactForm tenant={tenant} />

        {hasSubscription && <InvoiceHistoryBlock tenantId={tenant?.id} />}

        {error && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        )}
      </div>
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        result={{ allowed: false, currentPlan: plan, requiredPlan: suggestedUpgrade ?? 'growth' }}
        targetPlan={suggestedUpgrade ?? undefined}
      />
      <DowngradeWarning
        open={downgradeFlag === 'confirm' && !!downgradeTo}
        targetPlan={(downgradeTo as TenantPlan) ?? plan}
        onCancel={() => {
          setDowngradeFlag(null);
        }}
        onConfirm={() => {
          // User confirmed — Stripe has already recorded the cancellation at
          // period end. Just clear the query params.
          setDowngradeFlag(null);
        }}
      />
    </>
  );
};

// ----------------------------------------------------------------------------
// UPCOMING INVOICE BLOCK
// ----------------------------------------------------------------------------

interface UpcomingInvoice {
  hasUpcoming: boolean;
  amountDue?: number;
  currency?: string;
  periodEnd?: string | null;
  total?: number;
  tax?: number;
  subtotal?: number;
  lines?: Array<{ id: string; description: string; amount: number; proration: boolean }>;
}

const UpcomingInvoiceBlock: React.FC<{ tenantId: string | undefined }> = ({ tenantId }) => {
  const [data, setData] = useState<UpcomingInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = (await auth.getAccessToken()) ?? '';
        const res = await fetch('/.netlify/functions/stripe-upcoming-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: '{}',
        });
        if (!res.ok) throw new Error('fetch failed');
        const json = (await res.json()) as UpcomingInvoice;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ hasUpcoming: false });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  if (loading || !data?.hasUpcoming) return null;
  const total = data.total ?? data.amountDue ?? 0;
  const currency = (data.currency || 'usd').toUpperCase();
  return (
    <div className="pt-3 border-t border-slate-200 dark:border-steel-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-steel-400 mb-2">
        Next invoice (estimate)
      </p>
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-semibold text-primary tabular-nums">
          {(total / 100).toLocaleString('en-US', { style: 'currency', currency })}
        </span>
        <span className="text-xs text-secondary">
          {data.periodEnd
            ? `Bills on ${new Date(data.periodEnd).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`
            : ''}
        </span>
      </div>
      {data.lines && data.lines.length > 0 && (
        <details className="mt-1.5">
          <summary className="text-xs text-secondary cursor-pointer hover:text-primary">
            Line items ({data.lines.length})
          </summary>
          <ul className="mt-2 space-y-1 text-xs">
            {data.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-3 text-secondary">
                <span className="truncate">
                  {line.description || '—'}
                  {line.proration ? ' (prorated)' : ''}
                </span>
                <span className="tabular-nums shrink-0">
                  {(line.amount / 100).toLocaleString('en-US', { style: 'currency', currency })}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// SUBSCRIPTION ITEMS BLOCK (seats + CSM + bundles + metered)
// ----------------------------------------------------------------------------

interface SubItem {
  id: string;
  priceId: string;
  isBasePlan: boolean;
  metered: boolean;
  quantity: number | null;
  unitAmount: number | null;
  currency: string;
  interval: string | null;
  nickname: string | null;
  displayName: string | null;
  addonKind: string | null;
  meter: string | null;
}

const SubscriptionItemsBlock: React.FC<{ tenantId: string | undefined; onChange: () => void }> = ({
  tenantId,
  onChange,
}) => {
  const [items, setItems] = useState<SubItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = (await auth.getAccessToken()) ?? '';
      const res = await fetch('/.netlify/functions/stripe-list-subscription-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: '{}',
      });
      const json = await res.json();
      if (res.ok) setItems((json.items as SubItem[]) || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, tenantId]);

  const addons = (items || []).filter((i) => !i.isBasePlan);
  if (!items) return null;
  if (addons.length === 0) return null;

  const bump = async (item: SubItem, delta: number) => {
    if (item.metered) return;
    setBusy(item.id);
    setError(null);
    try {
      const newQty = (item.quantity || 0) + delta;
      const token = (await auth.getAccessToken()) ?? '';
      const res = await fetch('/.netlify/functions/stripe-manage-addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(
          newQty <= 0
            ? { action: 'remove', priceId: item.priceId }
            : { action: 'update', priceId: item.priceId, quantity: newQty }
        ),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not update');
      await load();
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="pt-3 border-t border-slate-200 dark:border-steel-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-steel-400 mb-2">
        Add-ons & extras
      </p>
      <ul className="space-y-1.5 text-sm">
        {addons.map((item) => {
          const label = item.displayName || item.nickname || item.priceId;
          const unit =
            item.unitAmount != null
              ? (item.unitAmount / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: (item.currency || 'usd').toUpperCase(),
                })
              : null;
          return (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 py-1"
            >
              <div className="min-w-0">
                <p className="text-primary truncate">{label}</p>
                <p className="text-xs text-secondary">
                  {item.metered
                    ? 'Metered — billed on usage'
                    : `${item.quantity ?? 0} × ${unit || '—'}`}
                  {item.interval ? ` / ${item.interval}` : ''}
                </p>
              </div>
              {!item.metered && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => bump(item, -1)}
                    disabled={busy === item.id || (item.quantity ?? 0) <= 0}
                    aria-label="Decrease"
                    className="w-7 h-7 rounded-md border border-slate-200 dark:border-steel-700 text-slate-600 dark:text-steel-300 hover:bg-slate-50 dark:hover:bg-steel-800 inline-flex items-center justify-center disabled:opacity-40"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="min-w-[2ch] text-center tabular-nums text-primary">
                    {item.quantity ?? 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => bump(item, +1)}
                    disabled={busy === item.id}
                    aria-label="Increase"
                    className="w-7 h-7 rounded-md border border-slate-200 dark:border-steel-700 text-slate-600 dark:text-steel-300 hover:bg-slate-50 dark:hover:bg-steel-800 inline-flex items-center justify-center disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">{error}</p>}
    </div>
  );
};

// ----------------------------------------------------------------------------
// BILLING CONTACT FORM
// ----------------------------------------------------------------------------

const BillingContactForm: React.FC<{ tenant: Tenant | null }> = ({ tenant }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initial = tenant?.billing?.billingEmail || '';
  const initialAddress = tenant?.billing?.billingAddress || null;

  const [email, setEmail] = useState(initial);
  const [line1, setLine1] = useState(initialAddress?.line1 || '');
  const [line2, setLine2] = useState(initialAddress?.line2 || '');
  const [city, setCity] = useState(initialAddress?.city || '');
  const [state, setState] = useState(initialAddress?.state || '');
  const [postalCode, setPostalCode] = useState(initialAddress?.postalCode || '');
  const [country, setCountry] = useState(initialAddress?.country || '');

  // Reset local state when tenant refreshes.
  useEffect(() => {
    if (!editing) {
      setEmail(tenant?.billing?.billingEmail || '');
      const a = tenant?.billing?.billingAddress || null;
      setLine1(a?.line1 || '');
      setLine2(a?.line2 || '');
      setCity(a?.city || '');
      setState(a?.state || '');
      setPostalCode(a?.postalCode || '');
      setCountry(a?.country || '');
    }
  }, [tenant?.id, tenant?.billing?.billingEmail, tenant?.billing?.billingAddress, editing]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const token = (await auth.getAccessToken()) ?? '';
      const res = await fetch('/.netlify/functions/stripe-sync-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          billingEmail: email,
          billingAddress: {
            line1,
            line2: line2 || undefined,
            city,
            state,
            postalCode,
            country,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not save');
      setFeedback('Saved. Stripe has been updated.');
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-3 border-t border-slate-200 dark:border-steel-700">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-steel-400">
          Billing contact
        </p>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        )}
      </div>

      {!editing ? (
        <div className="text-sm space-y-0.5">
          <p className="text-primary">{email || <span className="text-secondary italic">No billing email set</span>}</p>
          {initialAddress ? (
            <p className="text-xs text-secondary">
              {initialAddress.line1}
              {initialAddress.line2 ? `, ${initialAddress.line2}` : ''}
              {', '}
              {initialAddress.city}, {initialAddress.state} {initialAddress.postalCode}, {initialAddress.country}
            </p>
          ) : (
            <p className="text-xs text-secondary italic">No billing address on file</p>
          )}
          {feedback && <p className="text-xs text-emerald-600 dark:text-emerald-400">{feedback}</p>}
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="billing@company.com"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-midnight-800 text-primary"
          />
          <input
            type="text"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            placeholder="Street address"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-midnight-800 text-primary"
          />
          <input
            type="text"
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
            placeholder="Apt / suite (optional)"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-midnight-800 text-primary"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-midnight-800 text-primary"
            />
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State / region"
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-midnight-800 text-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="Postal code"
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-midnight-800 text-primary"
            />
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="Country (ISO, e.g. US)"
              maxLength={2}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-midnight-800 text-primary"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn-secondary text-sm px-3 py-1.5"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-primary text-sm px-3 py-1.5 inline-flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// INVOICE HISTORY BLOCK
// ----------------------------------------------------------------------------

interface InvoiceRow {
  id: string;
  number: string | null;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

const InvoiceHistoryBlock: React.FC<{ tenantId: string | undefined }> = ({ tenantId }) => {
  const [invoices, setInvoices] = useState<InvoiceRow[] | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = (await auth.getAccessToken()) ?? '';
        const res = await fetch('/.netlify/functions/stripe-list-invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ limit: expanded ? 24 : 5 }),
        });
        const json = await res.json();
        if (!cancelled && res.ok) setInvoices(json.invoices || []);
      } catch {
        if (!cancelled) setInvoices([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, expanded]);

  if (!invoices || invoices.length === 0) return null;

  const statusStyle = (s: string) =>
    s === 'paid'
      ? 'text-emerald-700 dark:text-emerald-400'
      : s === 'open' || s === 'draft'
        ? 'text-amber-700 dark:text-amber-400'
        : s === 'uncollectible' || s === 'void'
          ? 'text-rose-700 dark:text-rose-400'
          : 'text-secondary';

  return (
    <div className="pt-3 border-t border-slate-200 dark:border-steel-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-steel-400 mb-2">
        Invoices
      </p>
      <ul className="divide-y divide-slate-100 dark:divide-steel-800">
        {invoices.map((inv) => {
          const currency = (inv.currency || 'usd').toUpperCase();
          return (
            <li key={inv.id} className="flex items-center justify-between py-2 text-sm gap-3">
              <div className="min-w-0">
                <p className="text-primary font-medium truncate">
                  {inv.number || inv.id.slice(0, 10)}
                </p>
                <p className="text-xs text-secondary">
                  {new Date(inv.created).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                  {' · '}
                  <span className={statusStyle(inv.status)}>{inv.status}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="tabular-nums text-primary text-sm">
                  {((inv.status === 'paid' ? inv.amountPaid : inv.amountDue) / 100).toLocaleString(
                    'en-US',
                    { style: 'currency', currency }
                  )}
                </span>
                {inv.invoicePdf && (
                  <a
                    href={inv.invoicePdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download PDF"
                    className="p-1.5 rounded-md text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-steel-800"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
                {inv.hostedInvoiceUrl && (
                  <a
                    href={inv.hostedInvoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View invoice"
                    className="p-1.5 rounded-md text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-steel-800"
                  >
                    <FileText className="w-4 h-4" />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {!expanded && invoices.length >= 5 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
        >
          Show more invoices
        </button>
      )}
    </div>
  );
};

const UsageMetersBlock: React.FC<{ usage: UsageSummary }> = ({ usage }) => {
  const entries = Object.entries(usage.meters).filter(([, v]) => v.used > 0 || v.cap);
  if (entries.length === 0 && !usage.apiCallsThisMonth) return null;
  return (
    <div className="pt-3 border-t border-slate-200 dark:border-steel-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-steel-400 mb-2">
        Usage this period
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        {entries.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-slate-600 dark:text-steel-300">{METER_LABELS[k] ?? k}</dt>
            <dd className="tabular-nums text-slate-900 dark:text-steel-100">
              {v.used.toLocaleString()}
              {v.cap ? ` / ${v.cap.toLocaleString()}` : ''}
            </dd>
          </div>
        ))}
        {usage.apiCallsThisMonth > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-slate-600 dark:text-steel-300">API calls</dt>
            <dd className="tabular-nums text-slate-900 dark:text-steel-100">
              {usage.apiCallsThisMonth.toLocaleString()}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
};

// ============================================================================
// ADMIN SECTION
// ============================================================================

const AdminSection: React.FC<{ onOpenAdmin: () => void }> = ({ onOpenAdmin }) => {
  const adminFeatures = [
    {
      id: 'team',
      icon: <Users className="w-6 h-6" />,
      title: 'Team Management',
      description: 'Invite members, assign roles, and manage access permissions',
      color: 'bg-indigo-500/10 text-indigo-500',
    },
    {
      id: 'billing',
      icon: <CreditCard className="w-6 h-6" />,
      title: 'Billing & Plans',
      description: 'View current plan, usage metrics, and upgrade options',
      color: 'bg-violet-500/10 text-violet-500',
    },
    {
      id: 'security',
      icon: <Key className="w-6 h-6" />,
      title: 'Security Settings',
      description: 'Configure MFA, session policies, and password requirements',
      color: 'bg-amber-500/10 text-amber-500',
    },
    {
      id: 'audit',
      icon: <Clock className="w-6 h-6" />,
      title: 'Audit Logs',
      description: 'Review activity history and export compliance reports',
      color: 'bg-slate-500/10 text-slate-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary mb-1">Admin Settings</h2>
          <p className="text-secondary">
            Billing, team, security, and audit logs — all live on the Admin tab.
          </p>
        </div>
        <button onClick={onOpenAdmin} className="btn-primary">
          <ExternalLink className="w-4 h-4" />
          Open Admin
        </button>
      </div>

      <BillingCard />

      {/* Category shortcuts — all open the Admin tab; copy makes that explicit. */}
      <div className="grid md:grid-cols-2 gap-4">
        {adminFeatures.map(feature => (
          <button
            key={feature.id}
            onClick={onOpenAdmin}
            aria-label={`Open ${feature.title} in the Admin dashboard`}
            className="p-5 bg-slate-50 dark:bg-steel-800/50 rounded-xl border border-slate-200 dark:border-steel-700 text-left transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-accent-500/30"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${feature.color}`}>
                {feature.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary mb-1">{feature.title}</h3>
                <p className="text-sm text-secondary">{feature.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 dark:text-steel-400 flex-shrink-0 mt-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const Settings: React.FC<SettingsProps> = (props) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('overview');

  return (
    <div className="flex gap-6">
      {/* Settings Sidebar */}
      <div className="w-64 flex-shrink-0 hidden lg:block">
        <div className="card p-3 sticky top-4">
          <div className="px-3 py-2 text-xs font-semibold text-secondary uppercase tracking-wider">
            Settings
          </div>
          <div className="space-y-1">
            {SECTIONS.map(section => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-accent-500/10 text-accent-500'
                      : 'text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-steel-800'
                  }`}
                >
                  <span className={isActive ? 'text-accent-500' : ''}>{section.icon}</span>
                  <span className="text-sm font-medium">{section.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeSection === 'overview' && <OverviewSection {...props} />}
            {activeSection === 'monitoring' && <MonitoringSection onOpenDashboard={props.onOpenMonitoringDashboard} />}
            {activeSection === 'integrations' && <IntegrationsSection onOpenCloudVerification={props.onOpenCloudVerification} />}
            {activeSection === 'alerts' && <AlertsSection onOpenConfiguration={props.onOpenAlertConfiguration} />}
            {activeSection === 'notifications' && <NotificationsSection />}
            {activeSection === 'organization' && <OrganizationSection />}
            {activeSection === 'regulatory' && <RegulatorySection />}
            {activeSection === 'admin' && <AdminSection onOpenAdmin={props.onOpenAdmin} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Settings;
