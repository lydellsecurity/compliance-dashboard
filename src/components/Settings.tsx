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

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon, Cloud, Bell, Activity, Shield, Building2,
  ChevronRight, Monitor, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, Zap, Database, Lock, Globe, Mail, MessageSquare,
  Webhook, ToggleLeft, ToggleRight, Clock, TrendingUp, GitCompare,
  UserCog, Users, CreditCard, Key, ExternalLink,
} from 'lucide-react';
import RegulatoryVersionControl from './RegulatoryVersionControl';
import {
  monitoringService,
  type AlertSeverity,
} from '../services/continuous-monitoring.service';
import { awsConnector } from '../services/cloud-integrations/aws-connector.service';

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

const SECTIONS: { id: SettingsSection; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'overview', label: 'Overview', icon: <SettingsIcon className="w-5 h-5" />, description: 'Quick access to all settings' },
  { id: 'monitoring', label: 'Continuous Monitoring', icon: <Activity className="w-5 h-5" />, description: 'Configure real-time compliance tracking' },
  { id: 'integrations', label: 'Cloud Integrations', icon: <Cloud className="w-5 h-5" />, description: 'Connect AWS, Azure, and GCP' },
  { id: 'alerts', label: 'Alert Rules', icon: <Bell className="w-5 h-5" />, description: 'Configure alert thresholds and triggers' },
  { id: 'notifications', label: 'Notifications', icon: <Mail className="w-5 h-5" />, description: 'Email, Slack, and webhook settings' },
  { id: 'organization', label: 'Organization', icon: <Building2 className="w-5 h-5" />, description: 'Company settings and preferences' },
  { id: 'regulatory', label: 'Regulatory Updates', icon: <GitCompare className="w-5 h-5" />, description: 'Track framework changes and compliance drift' },
  { id: 'admin', label: 'Admin', icon: <UserCog className="w-5 h-5" />, description: 'Team, billing, security, and audit logs' },
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
          <p className="text-secondary">Manage your organization, team, and security settings</p>
        </div>
        <button onClick={onOpenAdmin} className="btn-primary">
          <ExternalLink className="w-4 h-4" />
          Open Admin Dashboard
        </button>
      </div>

      {/* Admin Features Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {adminFeatures.map(feature => (
          <button
            key={feature.id}
            onClick={onOpenAdmin}
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
              <ChevronRight className="w-5 h-5 text-slate-400 dark:text-steel-600 flex-shrink-0 mt-1" />
            </div>
          </button>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="p-5 bg-accent-500/5 border border-accent-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-primary mb-1">Admin Access Required</h4>
            <p className="text-sm text-secondary">
              Full admin settings including team management, billing, and audit logs are available in the dedicated Admin Dashboard.
              Owner and Admin roles have access to all administrative features.
            </p>
          </div>
        </div>
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
