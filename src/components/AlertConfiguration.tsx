/**
 * Alert Configuration Component
 *
 * Allows users to configure monitoring alert rules:
 * - Create/edit/delete alert rules
 * - Set severity levels and thresholds
 * - Configure notification channels
 * - Enable/disable individual rules
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Bell, Plus, Trash2, Edit2, Settings,
  Mail, MessageSquare, Webhook, Monitor, ToggleLeft, ToggleRight,
  RefreshCw, Save,
} from 'lucide-react';
import {
  monitoringService,
  type AlertRule,
  type AlertSeverity,
  type AlertType,
  type MonitoringConfig,
} from '../services/continuous-monitoring.service';

// ============================================================================
// TYPES
// ============================================================================

interface AlertConfigurationProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EditingRule {
  id: string;
  name: string;
  type: AlertType;
  severity: AlertSeverity;
  enabled: boolean;
  metric: string;
  operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'change';
  value: number;
  timeWindowMinutes?: number;
  notificationChannels: ('email' | 'slack' | 'webhook' | 'in_app')[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALERT_TYPES: { value: AlertType; label: string; description: string }[] = [
  { value: 'score_threshold', label: 'Score Threshold', description: 'Alert when compliance score crosses a threshold' },
  { value: 'compliance_drift', label: 'Compliance Drift', description: 'Alert when score changes significantly over time' },
  { value: 'control_degraded', label: 'Control Degraded', description: 'Alert when a control status degrades' },
  { value: 'evidence_expiring', label: 'Evidence Expiring', description: 'Alert when evidence is nearing expiration' },
  { value: 'verification_failed', label: 'Verification Failed', description: 'Alert when automated verification fails' },
  { value: 'framework_deadline', label: 'Framework Deadline', description: 'Alert about upcoming audit deadlines' },
];

const SEVERITIES: { value: AlertSeverity; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-blue-500' },
  { value: 'info', label: 'Info', color: 'bg-slate-500' },
];

const OPERATORS: { value: string; label: string }[] = [
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less than or equal' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'eq', label: 'Equal to' },
  { value: 'change', label: 'Changes by' },
];

const METRICS: { value: string; label: string }[] = [
  { value: 'overall_score', label: 'Overall Compliance Score' },
  { value: 'framework_score', label: 'Framework Score' },
  { value: 'domain_score', label: 'Domain Score' },
  { value: 'control_status', label: 'Control Status' },
];

const NOTIFICATION_CHANNELS: { value: 'email' | 'slack' | 'webhook' | 'in_app'; label: string; icon: React.ReactNode }[] = [
  { value: 'in_app', label: 'In-App', icon: <Monitor className="w-4 h-4" /> },
  { value: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
  { value: 'slack', label: 'Slack', icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'webhook', label: 'Webhook', icon: <Webhook className="w-4 h-4" /> },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const RuleCard: React.FC<{
  rule: AlertRule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}> = ({ rule, onEdit, onDelete, onToggle }) => {
  const severity = SEVERITIES.find(s => s.value === rule.severity);
  const alertType = ALERT_TYPES.find(t => t.value === rule.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border transition-all ${
        rule.enabled
          ? 'bg-white dark:bg-steel-800 border-slate-200 dark:border-steel-700'
          : 'bg-slate-50 dark:bg-steel-900 border-slate-200 dark:border-steel-800 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${severity?.color || 'bg-slate-500'}`} />
            <h4 className="font-medium text-primary truncate">{rule.name}</h4>
          </div>
          <p className="text-sm text-secondary mb-2">{alertType?.description}</p>

          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-steel-700 rounded">
              {METRICS.find(m => m.value === rule.conditions.metric)?.label}
            </span>
            <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-steel-700 rounded">
              {OPERATORS.find(o => o.value === rule.conditions.operator)?.label} {rule.conditions.value}
              {rule.conditions.operator === 'change' ? '%' : ''}
            </span>
            {rule.conditions.timeWindowMinutes && (
              <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-steel-700 rounded">
                within {rule.conditions.timeWindowMinutes / 60}h
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-3">
            {rule.notificationChannels.map(channel => {
              const ch = NOTIFICATION_CHANNELS.find(c => c.value === channel);
              return ch ? (
                <span
                  key={channel}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 rounded"
                >
                  {ch.icon}
                  {ch.label}
                </span>
              ) : null;
            })}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={onToggle}
            className={`p-1 rounded transition-colors ${
              rule.enabled ? 'text-status-success' : 'text-slate-400'
            }`}
            title={rule.enabled ? 'Disable rule' : 'Enable rule'}
          >
            {rule.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-steel-700 text-slate-500 dark:text-steel-400 transition-colors"
              title="Edit rule"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-500 dark:text-steel-400 hover:text-red-500 transition-colors"
              title="Delete rule"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const RuleEditor: React.FC<{
  rule: EditingRule | null;
  onSave: (rule: EditingRule) => void;
  onCancel: () => void;
}> = ({ rule, onSave, onCancel }) => {
  const getDefaultForm = (): EditingRule => ({
    id: `rule-${Date.now()}`,
    name: '',
    type: 'score_threshold',
    severity: 'medium',
    enabled: true,
    metric: 'overall_score',
    operator: 'lt',
    value: 70,
    notificationChannels: ['in_app'],
  });

  const [form, setForm] = useState<EditingRule>(rule || getDefaultForm());

  // Reset form when rule prop changes
  useEffect(() => {
    setForm(rule || getDefaultForm());
  }, [rule]);

  const updateForm = <K extends keyof EditingRule>(key: K, value: EditingRule[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleChannel = (channel: 'email' | 'slack' | 'webhook' | 'in_app') => {
    setForm(prev => ({
      ...prev,
      notificationChannels: prev.notificationChannels.includes(channel)
        ? prev.notificationChannels.filter(c => c !== channel)
        : [...prev.notificationChannels, channel],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700 p-5"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <h3 className="text-lg font-semibold text-primary">
          {rule ? 'Edit Alert Rule' : 'Create Alert Rule'}
        </h3>

        {/* Rule Name */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-1.5">Rule Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => updateForm('name', e.target.value)}
            placeholder="e.g., Critical Score Drop Alert"
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-steel-900 border border-slate-200 dark:border-steel-700 rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>

        {/* Alert Type */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-1.5">Alert Type</label>
          <select
            value={form.type}
            onChange={e => updateForm('type', e.target.value as AlertType)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-steel-900 border border-slate-200 dark:border-steel-700 rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            {ALERT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-1.5">Severity</label>
          <div className="flex gap-2">
            {SEVERITIES.map(sev => (
              <button
                key={sev.value}
                type="button"
                onClick={() => updateForm('severity', sev.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  form.severity === sev.value
                    ? 'bg-slate-800 dark:bg-white text-white dark:text-steel-900'
                    : 'bg-slate-100 dark:bg-steel-700 text-secondary hover:bg-slate-200 dark:hover:bg-steel-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${sev.color}`} />
                {sev.label}
              </button>
            ))}
          </div>
        </div>

        {/* Condition */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Metric</label>
            <select
              value={form.metric}
              onChange={e => updateForm('metric', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-steel-900 border border-slate-200 dark:border-steel-700 rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              {METRICS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Operator</label>
            <select
              value={form.operator}
              onChange={e => updateForm('operator', e.target.value as EditingRule['operator'])}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-steel-900 border border-slate-200 dark:border-steel-700 rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              {OPERATORS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Value</label>
            <input
              type="number"
              value={form.value}
              onChange={e => updateForm('value', Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-steel-900 border border-slate-200 dark:border-steel-700 rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        </div>

        {/* Time Window (for drift alerts) */}
        {form.type === 'compliance_drift' && (
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Time Window (hours)</label>
            <input
              type="number"
              value={(form.timeWindowMinutes || 1440) / 60}
              onChange={e => updateForm('timeWindowMinutes', Number(e.target.value) * 60)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-steel-900 border border-slate-200 dark:border-steel-700 rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        )}

        {/* Notification Channels */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-1.5">Notification Channels</label>
          <div className="flex flex-wrap gap-2">
            {NOTIFICATION_CHANNELS.map(channel => (
              <button
                key={channel.value}
                type="button"
                onClick={() => toggleChannel(channel.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  form.notificationChannels.includes(channel.value)
                    ? 'bg-accent-500 text-white'
                    : 'bg-slate-100 dark:bg-steel-700 text-secondary hover:bg-slate-200 dark:hover:bg-steel-600'
                }`}
              >
                {channel.icon}
                {channel.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-steel-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!form.name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Rule
          </button>
        </div>
      </form>
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AlertConfiguration: React.FC<AlertConfigurationProps> = ({
  isOpen,
  onClose,
}) => {
  const [config, setConfig] = useState<MonitoringConfig>(monitoringService.getConfig());
  const [editingRule, setEditingRule] = useState<EditingRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Subscribe to config changes
  useEffect(() => {
    return monitoringService.subscribe(() => {
      setConfig(monitoringService.getConfig());
    });
  }, []);

  const handleSaveRule = (rule: EditingRule) => {
    monitoringService.upsertAlertRule({
      id: rule.id,
      name: rule.name,
      type: rule.type,
      severity: rule.severity,
      enabled: rule.enabled,
      conditions: {
        metric: rule.metric,
        operator: rule.operator,
        value: rule.value,
        timeWindowMinutes: rule.timeWindowMinutes,
      },
      notificationChannels: rule.notificationChannels,
    });
    setEditingRule(null);
    setIsCreating(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm('Are you sure you want to delete this alert rule?')) {
      monitoringService.deleteAlertRule(ruleId);
    }
  };

  const handleToggleRule = (rule: AlertRule) => {
    monitoringService.upsertAlertRule({
      ...rule,
      enabled: !rule.enabled,
    });
  };

  const handleResetRules = () => {
    if (confirm('Reset all alert rules to defaults? This will delete any custom rules.')) {
      monitoringService.resetAlertRules();
    }
  };

  const startEditingRule = (rule: AlertRule) => {
    setEditingRule({
      id: rule.id,
      name: rule.name,
      type: rule.type,
      severity: rule.severity,
      enabled: rule.enabled,
      metric: rule.conditions.metric,
      operator: rule.conditions.operator,
      value: rule.conditions.value,
      timeWindowMinutes: rule.conditions.timeWindowMinutes,
      notificationChannels: rule.notificationChannels,
    });
    setIsCreating(false);
  };

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
            className="fixed right-0 top-0 h-full w-full max-w-2xl modal-content z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-steel-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary">Alert Configuration</h2>
                  <p className="text-sm text-secondary">Configure monitoring rules and notifications</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-steel-800 text-slate-500 dark:text-steel-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Actions */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-secondary uppercase">Alert Rules</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetRules}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary hover:text-primary bg-slate-100 dark:bg-steel-800 hover:bg-slate-200 dark:hover:bg-steel-700 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset to Defaults
                  </button>
                  <button
                    onClick={() => { setIsCreating(true); setEditingRule(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent-500 hover:bg-accent-600 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Rule
                  </button>
                </div>
              </div>

              {/* Rule Editor */}
              <AnimatePresence mode="wait">
                {(isCreating || editingRule) && (
                  <RuleEditor
                    rule={editingRule}
                    onSave={handleSaveRule}
                    onCancel={() => { setIsCreating(false); setEditingRule(null); }}
                  />
                )}
              </AnimatePresence>

              {/* Rules List */}
              <div className="space-y-3">
                {config.alertRules.map(rule => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onEdit={() => startEditingRule(rule)}
                    onDelete={() => handleDeleteRule(rule.id)}
                    onToggle={() => handleToggleRule(rule)}
                  />
                ))}

                {config.alertRules.length === 0 && (
                  <div className="p-8 text-center bg-slate-50 dark:bg-steel-800 rounded-xl">
                    <Bell className="w-12 h-12 text-slate-300 dark:text-steel-600 mx-auto mb-3" />
                    <p className="text-secondary">No alert rules configured</p>
                    <p className="text-sm text-slate-400 dark:text-steel-500">
                      Click "Add Rule" to create your first alert
                    </p>
                  </div>
                )}
              </div>

              {/* Notification Settings */}
              <div className="pt-4 border-t border-slate-200 dark:border-steel-700">
                <h3 className="text-sm font-semibold text-secondary uppercase mb-4">Notification Settings</h3>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-steel-800 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <Mail className="w-5 h-5 text-accent-500" />
                      <span className="font-medium text-primary">Email Notifications</span>
                    </div>
                    <input
                      type="email"
                      placeholder="alerts@yourcompany.com"
                      value={config.notificationEmail || ''}
                      onChange={e => monitoringService.updateConfig({ notificationEmail: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-steel-900 border border-slate-200 dark:border-steel-700 rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                    <p className="text-xs text-slate-500 dark:text-steel-500 mt-2">
                      Configure email notifications for alerts marked with the Email channel
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-steel-800 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <MessageSquare className="w-5 h-5 text-accent-500" />
                      <span className="font-medium text-primary">Slack Webhook</span>
                    </div>
                    <input
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={config.slackWebhook || ''}
                      onChange={e => monitoringService.updateConfig({ slackWebhook: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-steel-900 border border-slate-200 dark:border-steel-700 rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                    <p className="text-xs text-slate-500 dark:text-steel-500 mt-2">
                      Add your Slack incoming webhook URL for Slack notifications
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-steel-800 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <Webhook className="w-5 h-5 text-accent-500" />
                      <span className="font-medium text-primary">Custom Webhook</span>
                    </div>
                    <input
                      type="url"
                      placeholder="https://your-service.com/webhooks/alerts"
                      value={config.webhookUrl || ''}
                      onChange={e => monitoringService.updateConfig({ webhookUrl: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-steel-900 border border-slate-200 dark:border-steel-700 rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                    <p className="text-xs text-slate-500 dark:text-steel-500 mt-2">
                      Send alerts to a custom webhook endpoint (JSON POST)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AlertConfiguration;
