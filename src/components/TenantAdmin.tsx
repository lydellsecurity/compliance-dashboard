/**
 * Tenant Admin Component
 *
 * Administrative dashboard for tenant management:
 * - Tenant settings configuration
 * - Team member management
 * - Plan and billing overview
 * - Usage analytics
 * - Audit log viewer
 * - Branding customization
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Users,
  Settings,
  CreditCard,
  BarChart3,
  Shield,
  Palette,
  Clock,
  AlertTriangle,
  Check,
  X,
  Mail,
  Search,
  Download,
  RefreshCw,
  Crown,
  UserPlus,
  Trash2,
  Lock,
  Key,
  Globe,
  Bell,
  Plus,
  Briefcase,
} from 'lucide-react';
import {
  multiTenant,
  type Tenant,
  type TenantMember,
  type TenantAuditLog,
  type TenantAnalytics,
  type TenantPlan,
  PLAN_CONFIGS,
} from '../services/multi-tenant.service';
import type { UserRole } from '../lib/database.types';
import { FRAMEWORKS, type FrameworkId } from '../constants/controls';
import { useComplianceContext } from '../App';
import { useAuth } from '../hooks/useAuth';

// ============================================================================
// TYPES
// ============================================================================

interface TenantAdminProps {
  tenantId: string;
  userId: string;
  userRole: UserRole;
}

type AdminTab = 'overview' | 'team' | 'controls' | 'settings' | 'billing' | 'security' | 'audit';

// ============================================================================
// CONSTANTS
// ============================================================================

const ROLE_LABELS: Record<UserRole, { label: string; color: string }> = {
  owner: { label: 'Owner', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
  admin: { label: 'Admin', color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30' },
  member: { label: 'Member', color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
  viewer: { label: 'Viewer', color: 'text-slate-500 bg-slate-50 dark:bg-slate-900' },
};

const PLAN_COLORS: Record<TenantPlan, string> = {
  free: 'text-slate-600 bg-slate-100',
  startup: 'text-indigo-600 bg-indigo-100',
  business: 'text-violet-600 bg-violet-100',
  enterprise: 'text-amber-600 bg-amber-100',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TenantAdmin: React.FC<TenantAdminProps> = ({ tenantId, userId, userRole }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [analytics, setAnalytics] = useState<TenantAnalytics | null>(null);
  const [auditLogs, setAuditLogs] = useState<TenantAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const canManage = userRole === 'owner' || userRole === 'admin';

  // Initialize
  useEffect(() => {
    multiTenant.setContext(tenantId, userId);
    loadData();
  }, [tenantId, userId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tenantData, membersData, analyticsData, logsData] = await Promise.all([
        multiTenant.getTenant(tenantId),
        multiTenant.getTenantMembers(tenantId),
        multiTenant.getTenantAnalytics(tenantId),
        multiTenant.getAuditLogs(tenantId, { limit: 50 }),
      ]);

      setTenant(tenantData);
      setMembers(membersData);
      setAnalytics(analyticsData);
      setAuditLogs(logsData);
    } catch (error) {
      console.error('Failed to load tenant data:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <p>Failed to load tenant information</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {tenant.branding.logoUrl ? (
            <img
              src={tenant.branding.logoUrl}
              alt={tenant.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-steel-100">
              {tenant.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${PLAN_COLORS[tenant.plan]}`}
              >
                {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)} Plan
              </span>
              <span className="text-sm text-slate-500 dark:text-steel-400">
                {tenant.slug}.attestai.com
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-steel-700">
        {[
          { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'team', label: 'Team', icon: <Users className="w-4 h-4" /> },
          { id: 'controls', label: 'Custom Controls', icon: <Briefcase className="w-4 h-4" /> },
          { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
          { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
          { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
          { id: 'audit', label: 'Audit Log', icon: <Clock className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AdminTab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-steel-400 hover:text-slate-700 dark:hover:text-steel-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' && (
          <OverviewTab tenant={tenant} analytics={analytics} members={members} />
        )}
        {activeTab === 'team' && (
          <TeamTab
            tenant={tenant}
            members={members}
            canManage={canManage}
            onInvite={() => setShowInviteModal(true)}
            onUpdate={loadData}
          />
        )}
        {activeTab === 'controls' && (
          <CustomControlsTab canManage={canManage} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab tenant={tenant} canManage={canManage} onUpdate={loadData} />
        )}
        {activeTab === 'billing' && <BillingTab tenant={tenant} canManage={canManage} />}
        {activeTab === 'security' && (
          <SecurityTab tenant={tenant} canManage={canManage} onUpdate={loadData} />
        )}
        {activeTab === 'audit' && <AuditLogTab logs={auditLogs} />}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <InviteModal
            tenantId={tenantId}
            onClose={() => setShowInviteModal(false)}
            onSuccess={() => {
              loadData();
              setShowInviteModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// TAB COMPONENTS
// ============================================================================

const OverviewTab: React.FC<{
  tenant: Tenant;
  analytics: TenantAnalytics | null;
  members: TenantMember[];
}> = ({ tenant, analytics, members }) => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Compliance Score"
          value={`${analytics?.complianceScore || 0}%`}
          icon={<Shield className="w-5 h-5" />}
          color="indigo"
        />
        <StatCard
          label="Team Members"
          value={members.length.toString()}
          subtext={`of ${tenant.limits.maxUsers === -1 ? '∞' : tenant.limits.maxUsers}`}
          icon={<Users className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          label="Controls Completed"
          value={`${analytics?.controlsCompleted || 0}/${analytics?.controlsTotal || 0}`}
          icon={<Check className="w-5 h-5" />}
          color="violet"
        />
        <StatCard
          label="Open Incidents"
          value={(analytics?.openIncidents || 0).toString()}
          icon={<AlertTriangle className="w-5 h-5" />}
          color={analytics?.openIncidents ? 'amber' : 'slate'}
        />
      </div>

      {/* Usage Meters */}
      <div className="bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700 p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-steel-100 mb-4">
          Usage & Limits
        </h3>
        <div className="space-y-4">
          <UsageMeter
            label="Users"
            current={tenant.usage.usersCount}
            max={tenant.limits.maxUsers}
          />
          <UsageMeter
            label="Evidence"
            current={tenant.usage.evidenceCount}
            max={tenant.limits.maxEvidence}
          />
          <UsageMeter
            label="Integrations"
            current={tenant.usage.integrationsCount}
            max={tenant.limits.maxIntegrations}
          />
          <UsageMeter
            label="Storage"
            current={Math.round(tenant.usage.storageUsedMb / 1024 * 100) / 100}
            max={tenant.limits.maxStorageGb}
            unit="GB"
          />
          <UsageMeter
            label="API Calls (this month)"
            current={tenant.usage.apiCallsThisMonth}
            max={tenant.limits.apiRateLimit * 30}
          />
        </div>
      </div>

      {/* Features */}
      <div className="bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700 p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-steel-100 mb-4">
          Plan Features
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(tenant.features).map(([feature, enabled]) => (
            <div
              key={feature}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                enabled
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-slate-50 dark:bg-steel-800 text-slate-400 dark:text-steel-500'
              }`}
            >
              {enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              <span className="text-sm">
                {feature.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TeamTab: React.FC<{
  tenant: Tenant;
  members: TenantMember[];
  canManage: boolean;
  onInvite: () => void;
  onUpdate: () => void;
}> = ({ tenant, members, canManage, onInvite, onUpdate }) => {
  const [searchText, setSearchText] = useState('');

  const filteredMembers = members.filter(
    (m) =>
      m.email.toLowerCase().includes(searchText.toLowerCase()) ||
      m.fullName?.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleRemoveMember = async (memberId: string) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      const success = await multiTenant.removeMember(tenant.id, memberId);
      if (success) onUpdate();
    }
  };

  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    const success = await multiTenant.updateMemberRole(memberId, newRole);
    if (success) onUpdate();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100"
          />
        </div>
        {canManage && (
          <button
            onClick={onInvite}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Members List */}
      <div className="bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-midnight-900">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-steel-400 uppercase">
                Member
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-steel-400 uppercase">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-steel-400 uppercase">
                Joined
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-steel-400 uppercase">
                Last Active
              </th>
              {canManage && <th className="px-4 py-3 w-12" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-steel-800">
            {filteredMembers.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-steel-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.fullName || member.email}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-slate-200 dark:bg-steel-700 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-slate-600 dark:text-steel-400">
                          {member.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-steel-100">
                        {member.fullName || member.email}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-steel-400">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {canManage && member.role !== 'owner' ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${ROLE_LABELS[member.role].color}`}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_LABELS[member.role].color}`}
                    >
                      {ROLE_LABELS[member.role].label}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-steel-400">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-steel-400">
                  {member.lastActiveAt
                    ? new Date(member.lastActiveAt).toLocaleDateString()
                    : 'Never'}
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SettingsTab: React.FC<{
  tenant: Tenant;
  canManage: boolean;
  onUpdate: () => void;
}> = ({ tenant, canManage, onUpdate }) => {
  const [timezone, setTimezone] = useState(tenant.settings.timezone);
  const [dateFormat, setDateFormat] = useState(tenant.settings.dateFormat);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await multiTenant.updateTenantSettings(tenant.id, {
        timezone,
        dateFormat,
      });
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* General Settings */}
      <div className="bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700 p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-steel-100 mb-4">
          General Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100 disabled:opacity-50"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="UTC">UTC</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
              Date Format
            </label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100 disabled:opacity-50"
            >
              <option value="MM/dd/yyyy">MM/DD/YYYY</option>
              <option value="dd/MM/yyyy">DD/MM/YYYY</option>
              <option value="yyyy-MM-dd">YYYY-MM-DD</option>
            </select>
          </div>
          {canManage && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {/* Branding Settings */}
      <div className="bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-slate-600 dark:text-steel-400" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-steel-100">Branding</h3>
          {!tenant.features.customBranding && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
              Upgrade Required
            </span>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={tenant.branding.primaryColor}
                disabled={!canManage || !tenant.features.customBranding}
                className="w-10 h-10 rounded cursor-pointer disabled:cursor-not-allowed"
              />
              <input
                type="text"
                value={tenant.branding.primaryColor}
                disabled={!canManage || !tenant.features.customBranding}
                className="flex-1 px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100 disabled:opacity-50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
              Custom Domain
            </label>
            <input
              type="text"
              value={tenant.branding.customDomain || ''}
              placeholder="compliance.yourcompany.com"
              disabled={!canManage || !tenant.features.customBranding}
              className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-slate-600 dark:text-steel-400" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-steel-100">Notifications</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-steel-300">
                Email Digest
              </p>
              <p className="text-xs text-slate-500 dark:text-steel-400">
                Receive summary emails about compliance status
              </p>
            </div>
            <select
              value={tenant.settings.notificationPreferences.emailDigest}
              disabled={!canManage}
              className="px-3 py-1 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-sm disabled:opacity-50"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="none">Never</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-steel-300">
                Compliance Deadlines
              </p>
              <p className="text-xs text-slate-500 dark:text-steel-400">
                Get notified about upcoming compliance deadlines
              </p>
            </div>
            <button
              disabled={!canManage}
              className={`w-12 h-6 rounded-full transition-colors ${
                tenant.settings.notificationPreferences.complianceDeadlines
                  ? 'bg-indigo-600'
                  : 'bg-slate-300 dark:bg-steel-700'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  tenant.settings.notificationPreferences.complianceDeadlines
                    ? 'translate-x-6'
                    : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BillingTab: React.FC<{
  tenant: Tenant;
  canManage: boolean;
}> = ({ tenant, canManage }) => {
  const planConfig = PLAN_CONFIGS[tenant.plan];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Current Plan */}
      <div className="bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-slate-900 dark:text-steel-100">Current Plan</h3>
          {canManage && tenant.plan !== 'enterprise' && (
            <button className="text-sm text-indigo-600 hover:underline">Upgrade Plan</button>
          )}
        </div>
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-midnight-900 rounded-lg">
          <div>
            <p className="text-xl font-semibold text-slate-900 dark:text-steel-100 flex items-center gap-2">
              {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
              {tenant.plan === 'enterprise' && <Crown className="w-5 h-5 text-amber-500" />}
            </p>
            <p className="text-sm text-slate-500 dark:text-steel-400">
              {planConfig.price === -1
                ? 'Custom pricing'
                : planConfig.price === 0
                  ? 'Free forever'
                  : `$${planConfig.price}/month`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-600 dark:text-steel-400">
              {tenant.billing.seatsUsed} / {tenant.limits.maxUsers === -1 ? '∞' : tenant.limits.maxUsers} seats used
            </p>
            {tenant.billing.currentPeriodEnd && (
              <p className="text-xs text-slate-500 dark:text-steel-400">
                Renews {new Date(tenant.billing.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700 p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-steel-100 mb-4">
          Compare Plans
        </h3>
        <div className="grid grid-cols-4 gap-4 text-sm">
          {(['free', 'startup', 'business', 'enterprise'] as TenantPlan[]).map((plan) => {
            const config = PLAN_CONFIGS[plan];
            const isCurrent = plan === tenant.plan;
            return (
              <div
                key={plan}
                className={`p-4 rounded-lg border ${
                  isCurrent
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-steel-700'
                }`}
              >
                <p className="font-medium text-slate-900 dark:text-steel-100 mb-1">
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-steel-100 mb-3">
                  {config.price === -1
                    ? 'Custom'
                    : config.price === 0
                      ? 'Free'
                      : `$${config.price}`}
                  {config.price > 0 && <span className="text-xs font-normal">/mo</span>}
                </p>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-steel-400">
                  <li>{config.limits.maxUsers === -1 ? 'Unlimited' : config.limits.maxUsers} users</li>
                  <li>{config.limits.maxIntegrations === -1 ? 'Unlimited' : config.limits.maxIntegrations} integrations</li>
                  <li>{config.limits.maxStorageGb === -1 ? 'Unlimited' : `${config.limits.maxStorageGb}GB`} storage</li>
                </ul>
                {!isCurrent && canManage && plan !== 'enterprise' && (
                  <button className="w-full mt-3 px-3 py-1.5 bg-slate-100 dark:bg-steel-800 text-slate-700 dark:text-steel-300 rounded text-xs hover:bg-slate-200 dark:hover:bg-steel-700">
                    {PLAN_CONFIGS[plan].price > PLAN_CONFIGS[tenant.plan].price ? 'Upgrade' : 'Downgrade'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const SecurityTab: React.FC<{
  tenant: Tenant;
  canManage: boolean;
  onUpdate: () => void;
}> = ({ tenant, canManage, onUpdate: _onUpdate }) => {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* MFA Settings */}
      <div className="bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-slate-600 dark:text-steel-400" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-steel-100">
            Authentication
          </h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-steel-300">
                Require MFA
              </p>
              <p className="text-xs text-slate-500 dark:text-steel-400">
                All team members must enable two-factor authentication
              </p>
            </div>
            <button
              disabled={!canManage}
              className={`w-12 h-6 rounded-full transition-colors ${
                tenant.settings.securitySettings.mfaRequired
                  ? 'bg-indigo-600'
                  : 'bg-slate-300 dark:bg-steel-700'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  tenant.settings.securitySettings.mfaRequired
                    ? 'translate-x-6'
                    : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              value={tenant.settings.securitySettings.sessionTimeoutMinutes}
              disabled={!canManage}
              className="w-32 px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Password Policy */}
      <div className="bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-slate-600 dark:text-steel-400" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-steel-100">
            Password Policy
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
              Minimum Length
            </label>
            <input
              type="number"
              value={tenant.settings.securitySettings.passwordPolicy.minLength}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
              Expiration (days)
            </label>
            <input
              type="number"
              value={tenant.settings.securitySettings.passwordPolicy.expirationDays}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 disabled:opacity-50"
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {[
            { key: 'requireUppercase', label: 'Require uppercase letters' },
            { key: 'requireNumbers', label: 'Require numbers' },
            { key: 'requireSymbols', label: 'Require special characters' },
          ].map((rule) => (
            <div key={rule.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={tenant.settings.securitySettings.passwordPolicy[rule.key as keyof typeof tenant.settings.securitySettings.passwordPolicy] as boolean}
                disabled={!canManage}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700 dark:text-steel-300">{rule.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* IP Whitelist */}
      <div className="bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-slate-600 dark:text-steel-400" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-steel-100">
            IP Whitelist
          </h3>
          {!tenant.features.ssoEnabled && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
              Business+ Plan
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-steel-400 mb-3">
          Restrict access to specific IP addresses or ranges
        </p>
        <textarea
          placeholder="Enter IP addresses (one per line)"
          value={tenant.settings.securitySettings.ipWhitelist.join('\n')}
          disabled={!canManage || !tenant.features.ssoEnabled}
          rows={4}
          className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100 disabled:opacity-50 font-mono text-sm"
        />
      </div>
    </div>
  );
};

const AuditLogTab: React.FC<{ logs: TenantAuditLog[] }> = ({ logs }) => {
  const [searchText, setSearchText] = useState('');

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchText.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchText.toLowerCase()) ||
      log.userEmail?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit logs..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-steel-700 rounded-lg text-slate-600 dark:text-steel-400 hover:bg-slate-50 dark:hover:bg-steel-800">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-midnight-900">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-steel-400 uppercase">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-steel-400 uppercase">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-steel-400 uppercase">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-steel-400 uppercase">
                Resource
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-steel-400 uppercase">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-steel-800">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-steel-800/50">
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-steel-400">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-slate-900 dark:text-steel-100">
                  {log.userEmail || 'System'}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-steel-800 text-slate-700 dark:text-steel-300 rounded">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-steel-400">
                  {log.resource}
                  {log.resourceId && (
                    <span className="text-slate-400 dark:text-steel-500 ml-1">
                      ({log.resourceId.slice(0, 8)}...)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500 dark:text-steel-400 font-mono">
                  {log.ipAddress || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// CUSTOM CONTROLS TAB
// ============================================================================

const FRAMEWORK_COLORS: Record<FrameworkId, string> = {
  SOC2: '#6366f1',
  ISO27001: '#0ea5e9',
  HIPAA: '#8b5cf6',
  NIST: '#14b8a6',
  PCIDSS: '#f59e0b',
  GDPR: '#ec4899',
};

const CustomControlsTab: React.FC<{ canManage: boolean }> = ({ canManage }) => {
  const { customControls, addCustomControl, deleteCustomControl } = useComplianceContext();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', question: '', riskLevel: 'medium' as 'low' | 'medium' | 'high' | 'critical' });
  const [selectedFrameworks, setSelectedFrameworks] = useState<FrameworkId[]>([]);
  const [clauseInputs, setClauseInputs] = useState<Record<FrameworkId, string>>({ SOC2: '', ISO27001: '', HIPAA: '', NIST: '', PCIDSS: '', GDPR: '' });

  const currentUserId = user?.id || 'anonymous-user';

  const toggleFramework = (fwId: FrameworkId) => setSelectedFrameworks(prev => prev.includes(fwId) ? prev.filter(f => f !== fwId) : [...prev, fwId]);
  const resetForm = () => { setForm({ title: '', description: '', question: '', riskLevel: 'medium' }); setSelectedFrameworks([]); setClauseInputs({ SOC2: '', ISO27001: '', HIPAA: '', NIST: '', PCIDSS: '', GDPR: '' }); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title && form.description) {
      const mappings = selectedFrameworks.filter(fwId => clauseInputs[fwId].trim()).map(fwId => ({ id: '', frameworkId: fwId, clauseId: clauseInputs[fwId].trim(), clauseTitle: 'Custom mapping', controlId: null, customControlId: null }));
      addCustomControl({ title: form.title, description: form.description, question: form.question || `Is ${form.title} implemented?`, category: 'company_specific', frameworkMappings: mappings, riskLevel: form.riskLevel, createdBy: currentUserId });
      resetForm(); setShowModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-steel-100">Custom Controls</h2>
          <p className="text-sm text-slate-500 dark:text-steel-400">Organization-specific compliance requirements</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Control
          </button>
        )}
      </div>

      {/* Controls List */}
      {customControls.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700">
          <div className="w-16 h-16 bg-slate-100 dark:bg-steel-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-slate-400 dark:text-steel-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100 mb-2">No Custom Controls</h3>
          <p className="text-slate-500 dark:text-steel-400 mb-4">Create controls specific to your organization</p>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Control
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {customControls.map(c => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="p-5 bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs font-mono bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md">{c.id}</span>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">CUSTOM</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-steel-100 mb-1">{c.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-steel-400 mb-3">{c.description}</p>
                  {c.frameworkMappings.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {c.frameworkMappings.map((m, i) => {
                        const color = FRAMEWORK_COLORS[m.frameworkId] || '#6366f1';
                        return (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs font-medium rounded-md"
                            style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}25` }}
                          >
                            {m.frameworkId} {m.clauseId}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                {canManage && (
                  <button
                    onClick={() => deleteCustomControl(c.id)}
                    className="p-2 text-slate-400 dark:text-steel-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => { setShowModal(false); resetForm(); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-midnight-800 rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5 border-b border-slate-200 dark:border-steel-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-steel-100">Create Custom Control</h2>
                <p className="text-sm text-slate-500 dark:text-steel-400">Add organization-specific requirements</p>
              </div>
              <form onSubmit={submit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">Control Name *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
                    placeholder="e.g., Weekly Security Standups"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">Description *</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100 resize-none"
                    rows={2}
                    placeholder="Describe what this control does..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">Assessment Question</label>
                  <input
                    type="text"
                    value={form.question}
                    onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
                    placeholder="e.g., Are weekly security standups conducted?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">Risk Level</label>
                  <select
                    value={form.riskLevel}
                    onChange={e => setForm(p => ({ ...p, riskLevel: e.target.value as typeof form.riskLevel }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-midnight-900 border border-slate-200 dark:border-steel-700 rounded-lg">
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-3">Framework Mapping</label>
                  <div className="space-y-3">
                    {FRAMEWORKS.map(fw => {
                      const isSelected = selectedFrameworks.includes(fw.id);
                      const color = FRAMEWORK_COLORS[fw.id] || '#6366f1';
                      return (
                        <div key={fw.id} className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleFramework(fw.id)}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-all ${isSelected ? '' : 'border-slate-300 dark:border-steel-700 hover:border-slate-400 dark:hover:border-steel-600'}`}
                            style={isSelected ? { borderColor: color, backgroundColor: `${color}10`, color } : undefined}
                          >
                            <div
                              className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? '' : 'border-slate-400 dark:border-steel-600'}`}
                              style={isSelected ? { borderColor: color, backgroundColor: color } : undefined}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm font-medium ${isSelected ? '' : 'text-slate-600 dark:text-steel-400'}`}>{fw.name}</span>
                          </button>
                          {isSelected && (
                            <input
                              type="text"
                              value={clauseInputs[fw.id]}
                              onChange={e => setClauseInputs(p => ({ ...p, [fw.id]: e.target.value }))}
                              placeholder={`${fw.id} Clause ID`}
                              className="flex-1 px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="px-4 py-2 border border-slate-200 dark:border-steel-700 text-slate-700 dark:text-steel-300 rounded-lg hover:bg-slate-50 dark:hover:bg-steel-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Create Control
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const StatCard: React.FC<{
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, subtext, icon, color }) => {
  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  };

  return (
    <div className="p-4 bg-white dark:bg-midnight-800 rounded-lg border border-slate-200 dark:border-steel-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.slate}`}>{icon}</div>
        <div>
          <p className="text-2xl font-semibold text-slate-900 dark:text-steel-100">{value}</p>
          <p className="text-sm text-slate-500 dark:text-steel-400">
            {label}
            {subtext && <span className="text-slate-400"> ({subtext})</span>}
          </p>
        </div>
      </div>
    </div>
  );
};

const UsageMeter: React.FC<{
  label: string;
  current: number;
  max: number;
  unit?: string;
}> = ({ label, current, max, unit = '' }) => {
  const percentage = max === -1 ? 0 : Math.min(100, (current / max) * 100);
  const isWarning = percentage > 80;
  const isCritical = percentage > 95;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-700 dark:text-steel-300">{label}</span>
        <span className="text-sm text-slate-500 dark:text-steel-400">
          {current}{unit} / {max === -1 ? '∞' : `${max}${unit}`}
        </span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-steel-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isCritical
              ? 'bg-red-500'
              : isWarning
                ? 'bg-amber-500'
                : 'bg-indigo-500'
          }`}
          style={{ width: max === -1 ? '0%' : `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const InviteModal: React.FC<{
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ tenantId, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [sending, setSending] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      // In a real implementation, this would send an invite email
      console.log('Inviting', email, 'as', role, 'to', tenantId);
      onSuccess();
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-white dark:bg-midnight-800 rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-steel-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-steel-100">
            Invite Team Member
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleInvite} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
              placeholder="colleague@company.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-steel-400 hover:bg-slate-100 dark:hover:bg-steel-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !email}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {sending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send Invite
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default TenantAdmin;
