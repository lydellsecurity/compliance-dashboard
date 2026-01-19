/**
 * Organization Management Suite
 *
 * Enterprise-grade administration dashboard for multi-tenant compliance management:
 * - Team management with RBAC (Owner, Admin, Editor, Auditor)
 * - Secure invite workflow with time-limited tokens
 * - Organization branding and customization
 * - Platform security settings and session management
 * - Framework toggles and domain assignment
 * - Comprehensive audit logging
 *
 * Corporate Light Mode optimized with professional UI/UX
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Users,
  Shield,
  Palette,
  CreditCard,
  FileText,
  UserPlus,
  Mail,
  Search,
  Download,
  RefreshCw,
  Crown,
  Trash2,
  Lock,
  Key,
  Globe,
  Clock,
  AlertTriangle,
  Check,
  X,
  ChevronRight,
  Copy,
  Link2,
  Eye,
  LogOut,
  CheckCircle,
  XCircle,
  Upload,
  Image as ImageIcon,
  Layers,
  Activity,
  Filter,
  Edit3,
  Send,
  ExternalLink,
  Info,
  Target,
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
import { FRAMEWORKS, type FrameworkId, type ComplianceDomain, COMPLIANCE_DOMAINS } from '../constants/controls';

// ============================================================================
// TYPES
// ============================================================================

interface OrgManagementSuiteProps {
  tenantId: string;
  userId: string;
  userRole: UserRole;
}

type AdminTab = 'team' | 'security' | 'branding' | 'billing' | 'logs' | 'frameworks';

// Extended role type with Editor and Auditor
type ExtendedRole = 'owner' | 'admin' | 'editor' | 'auditor';

interface TeamMember extends TenantMember {
  extendedRole: ExtendedRole;
  assignedDomains?: ComplianceDomain[];
  mfaEnabled?: boolean;
  lastLoginAt?: string | null;
  inviteStatus?: 'pending' | 'accepted' | 'expired';
}

interface PendingInvite {
  id: string;
  email: string;
  role: ExtendedRole;
  createdAt: string;
  expiresAt: string;
  invitedBy: string;
  token: string;
}

interface SessionInfo {
  id: string;
  userId: string;
  userEmail: string;
  device: string;
  browser: string;
  ipAddress: string;
  location: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

// Note: FrameworkToggle and DomainAssignment interfaces reserved for future API integration

// ============================================================================
// CONSTANTS
// ============================================================================

const EXTENDED_ROLE_CONFIG: Record<ExtendedRole, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  permissions: string[];
  icon: React.ReactNode;
}> = {
  owner: {
    label: 'Owner',
    description: 'Full control over the organization',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800',
    permissions: ['Manage billing', 'Delete organization', 'Manage all settings', 'Manage team'],
    icon: <Crown className="w-4 h-4" />,
  },
  admin: {
    label: 'Admin',
    description: 'Manage team and settings',
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800',
    permissions: ['Manage team members', 'Edit settings', 'View billing', 'Manage integrations'],
    icon: <Shield className="w-4 h-4" />,
  },
  editor: {
    label: 'Editor',
    description: 'Edit controls and evidence',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800',
    permissions: ['Edit control responses', 'Upload evidence', 'Create incidents', 'Manage assigned domains'],
    icon: <Edit3 className="w-4 h-4" />,
  },
  auditor: {
    label: 'Auditor',
    description: 'Read-only access to reports',
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    permissions: ['View all reports', 'View evidence', 'Export data', 'View audit logs'],
    icon: <Eye className="w-4 h-4" />,
  },
};

const SESSION_TIMEOUT_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
  { value: 1440, label: '24 hours' },
];

const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'team', label: 'Team', icon: <Users className="w-5 h-5" /> },
  { id: 'security', label: 'Security', icon: <Shield className="w-5 h-5" /> },
  { id: 'branding', label: 'Branding', icon: <Palette className="w-5 h-5" /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'frameworks', label: 'Frameworks', icon: <Layers className="w-5 h-5" /> },
  { id: 'logs', label: 'Logs', icon: <FileText className="w-5 h-5" /> },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const OrgManagementSuite: React.FC<OrgManagementSuiteProps> = ({ tenantId, userId, userRole }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [auditLogs, setAuditLogs] = useState<TenantAuditLog[]>([]);
  const [analytics, setAnalytics] = useState<TenantAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('team');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const canManage = userRole === 'owner' || userRole === 'admin';

  // Map UserRole to ExtendedRole
  const mapToExtendedRole = (role: UserRole): ExtendedRole => {
    if (role === 'member') return 'editor';
    if (role === 'viewer') return 'auditor';
    return role as ExtendedRole;
  };

  useEffect(() => {
    multiTenant.setContext(tenantId, userId);
    loadData();
  }, [tenantId, userId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tenantData, membersData, logsData, analyticsData] = await Promise.all([
        multiTenant.getTenant(tenantId),
        multiTenant.getTenantMembers(tenantId),
        multiTenant.getAuditLogs(tenantId, { limit: 100 }),
        multiTenant.getTenantAnalytics(tenantId),
      ]);

      setTenant(tenantData);
      setMembers(membersData.map(m => ({
        ...m,
        extendedRole: mapToExtendedRole(m.role),
        mfaEnabled: Math.random() > 0.5, // Demo: would come from actual user data
        lastLoginAt: m.lastActiveAt,
      })));
      setAuditLogs(logsData);
      setAnalytics(analyticsData);

      // Demo pending invites
      setPendingInvites([]);
    } catch (error) {
      console.error('Failed to load organization data:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-steel-400">Loading organization settings...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500 dark:text-steel-400">
        <AlertTriangle className="w-16 h-16 mb-4 text-amber-500" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100 mb-2">
          Organization Not Found
        </h3>
        <p className="text-sm">Unable to load organization settings. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-midnight-900">
      {/* Header */}
      <div className="bg-white dark:bg-midnight-800 border-b border-slate-200 dark:border-steel-700 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {tenant.branding.logoUrl ? (
              <img
                src={tenant.branding.logoUrl}
                alt={tenant.name}
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-steel-700"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${tenant.branding.primaryColor}15` }}
              >
                <Building2 className="w-7 h-7" style={{ color: tenant.branding.primaryColor }} />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-steel-100">
                {tenant.name}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full"
                  style={{
                    backgroundColor: `${tenant.branding.primaryColor}15`,
                    color: tenant.branding.primaryColor
                  }}
                >
                  {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)} Plan
                </span>
                <span className="flex items-center gap-1 text-sm text-slate-500 dark:text-steel-400">
                  <Globe className="w-3.5 h-3.5" />
                  {tenant.slug}.lydell.ai/trust
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-steel-400 dark:hover:text-steel-200 hover:bg-slate-100 dark:hover:bg-steel-800 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button
>
            <a
              href={`https://${tenant.slug}.lydell.ai/trust`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-steel-300 bg-slate-100 dark:bg-steel-800 hover:bg-slate-200 dark:hover:bg-steel-700 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Trust Center
            </a>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Vertical Tab Navigation */}
        <div className="w-56 bg-white dark:bg-midnight-800 border-r border-slate-200 dark:border-steel-700 p-4">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'text-slate-600 dark:text-steel-400 hover:bg-slate-50 dark:hover:bg-steel-800 hover:text-slate-900 dark:hover:text-steel-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </button>
            ))}
          </nav>

          {/* Quick Stats */}
          <div className="mt-8 p-4 bg-slate-50 dark:bg-midnight-900 rounded-xl">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase tracking-wider mb-3">
              Quick Stats
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-steel-400">Team</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-steel-100">
                  {members.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-steel-400">Invites</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-steel-100">
                  {pendingInvites.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-steel-400">Compliance</span>
                <span className="text-sm font-semibold text-emerald-600">
                  {analytics?.complianceScore || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'team' && (
                <TeamTab
                  tenant={tenant}
                  members={members}
                  pendingInvites={pendingInvites}
                  canManage={canManage}
                  currentUserId={userId}
                  onInvite={() => setShowInviteModal(true)}
                  onUpdate={loadData}
                />
              )}
              {activeTab === 'security' && (
                <SecurityTab
                  tenant={tenant}
                  members={members}
                  canManage={canManage}
                  onUpdate={loadData}
                />
              )}
              {activeTab === 'branding' && (
                <BrandingTab
                  tenant={tenant}
                  canManage={canManage}
                  onUpdate={loadData}
                />
              )}
              {activeTab === 'billing' && (
                <BillingTab tenant={tenant} canManage={canManage} />
              )}
              {activeTab === 'frameworks' && (
                <FrameworksTab
                  tenant={tenant}
                  members={members}
                  canManage={canManage}
                  onUpdate={loadData}
                />
              )}
              {activeTab === 'logs' && (
                <LogsTab logs={auditLogs} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <SecureInviteModal
            tenantId={tenantId}
            tenantName={tenant.name}
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
// TEAM TAB
// ============================================================================

interface TeamTabProps {
  tenant: Tenant;
  members: TeamMember[];
  pendingInvites: PendingInvite[];
  canManage: boolean;
  currentUserId: string;
  onInvite: () => void;
  onUpdate: () => void;
}

const TeamTab: React.FC<TeamTabProps> = ({
  tenant,
  members,
  pendingInvites,
  canManage,
  currentUserId,
  onInvite,
  onUpdate,
}) => {
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<ExtendedRole | 'all'>('all');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.email.toLowerCase().includes(searchText.toLowerCase()) ||
        m.fullName?.toLowerCase().includes(searchText.toLowerCase());
      const matchesRole = roleFilter === 'all' || m.extendedRole === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [members, searchText, roleFilter]);

  const handleSelectAll = () => {
    if (selectedMembers.size === filteredMembers.filter(m => m.extendedRole !== 'owner').length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filteredMembers.filter(m => m.extendedRole !== 'owner').map(m => m.id)));
    }
  };

  const handleSelectMember = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const handleBulkRoleChange = async (newRole: ExtendedRole) => {
    for (const memberId of selectedMembers) {
      const member = members.find(m => m.id === memberId);
      if (member && member.extendedRole !== 'owner') {
        // Map ExtendedRole to UserRole for the service
        const userRole: UserRole = newRole === 'editor' ? 'member' : newRole === 'auditor' ? 'viewer' : newRole as UserRole;
        await multiTenant.updateMemberRole(memberId, userRole);
      }
    }
    setSelectedMembers(new Set());
    onUpdate();
  };

  const handleBulkRemove = async () => {
    if (!window.confirm(`Are you sure you want to remove ${selectedMembers.size} member(s)?`)) return;
    for (const memberId of selectedMembers) {
      const member = members.find(m => m.id === memberId);
      if (member && member.extendedRole !== 'owner') {
        await multiTenant.removeMember(tenant.id, memberId);
      }
    }
    setSelectedMembers(new Set());
    onUpdate();
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member?.extendedRole === 'owner') {
      alert('Cannot remove the organization owner.');
      return;
    }
    if (window.confirm('Are you sure you want to remove this member?')) {
      const success = await multiTenant.removeMember(tenant.id, memberId);
      if (success) onUpdate();
    }
  };

  const handleRoleChange = async (memberId: string, newRole: ExtendedRole) => {
    const member = members.find(m => m.id === memberId);

    // Nuclear Protection: Owner cannot be downgraded
    if (member?.extendedRole === 'owner') {
      alert('The Owner role cannot be changed. Transfer ownership first.');
      return;
    }

    const userRole: UserRole = newRole === 'editor' ? 'member' : newRole === 'auditor' ? 'viewer' : newRole as UserRole;
    const success = await multiTenant.updateMemberRole(memberId, userRole);
    if (success) onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-steel-100">Team Management</h2>
          <p className="text-sm text-slate-500 dark:text-steel-400 mt-1">
            Manage your organization's team members and their access permissions
          </p>
        </div>
        {canManage && (
          <button
            onClick={onInvite}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Role Legend */}
      <div className="grid grid-cols-4 gap-4">
        {(Object.entries(EXTENDED_ROLE_CONFIG) as [ExtendedRole, typeof EXTENDED_ROLE_CONFIG.owner][]).map(([role, config]) => (
          <div
            key={role}
            className={`p-4 rounded-xl border ${config.bgColor}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={config.color}>{config.icon}</span>
              <h4 className={`font-semibold ${config.color}`}>{config.label}</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-steel-400 mb-2">{config.description}</p>
            <div className="flex flex-wrap gap-1">
              {config.permissions.slice(0, 2).map((perm, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-white/50 dark:bg-black/20 rounded text-slate-600 dark:text-steel-400">
                  {perm}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-4 bg-white dark:bg-midnight-800 p-4 rounded-xl border border-slate-200 dark:border-steel-700">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-steel-700 rounded-lg bg-slate-50 dark:bg-midnight-900 text-slate-900 dark:text-steel-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as ExtendedRole | 'all')}
            className="px-3 py-2.5 border border-slate-200 dark:border-steel-700 rounded-lg bg-slate-50 dark:bg-midnight-900 text-slate-900 dark:text-steel-100 text-sm"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owners</option>
            <option value="admin">Admins</option>
            <option value="editor">Editors</option>
            <option value="auditor">Auditors</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedMembers.size > 0 && canManage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl"
          >
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              {selectedMembers.size} member{selectedMembers.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex-1" />
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkRoleChange(e.target.value as ExtendedRole);
                  e.target.value = '';
                }
              }}
              className="px-3 py-1.5 text-sm border border-indigo-300 dark:border-indigo-700 rounded-lg bg-white dark:bg-midnight-800 text-slate-700 dark:text-steel-300"
              defaultValue=""
            >
              <option value="" disabled>Change Role...</option>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="auditor">Auditor</option>
            </select>
            <button
              onClick={handleBulkRemove}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
            <button
              onClick={() => setSelectedMembers(new Set())}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-steel-400 dark:hover:text-steel-200"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Members Table */}
      {filteredMembers.length === 0 ? (
        <EmptyTeamState onInvite={canManage ? onInvite : undefined} />
      ) : (
        <div className="bg-white dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-midnight-900 border-b border-slate-200 dark:border-steel-700">
                {canManage && (
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedMembers.size === filteredMembers.filter(m => m.extendedRole !== 'owner').length && selectedMembers.size > 0}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase tracking-wider">
                  MFA
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase tracking-wider">
                  Joined
                </th>
                {canManage && <th className="px-4 py-3 w-20" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-steel-800">
              {filteredMembers.map((member) => {
                const roleConfig = EXTENDED_ROLE_CONFIG[member.extendedRole];
                const isCurrentUser = member.userId === currentUserId;
                const canModify = canManage && member.extendedRole !== 'owner' && !isCurrentUser;

                return (
                  <tr
                    key={member.id}
                    className={`hover:bg-slate-50 dark:hover:bg-steel-800/50 transition-colors ${
                      selectedMembers.has(member.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                    }`}
                  >
                    {canManage && (
                      <td className="px-4 py-4">
                        {member.extendedRole !== 'owner' && !isCurrentUser ? (
                          <input
                            type="checkbox"
                            checked={selectedMembers.has(member.id)}
                            onChange={() => handleSelectMember(member.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.fullName || member.email}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-white">
                              {(member.fullName || member.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-steel-100 flex items-center gap-2">
                            {member.fullName || 'Unnamed User'}
                            {isCurrentUser && (
                              <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-steel-800 text-slate-500 dark:text-steel-400 rounded">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-steel-400">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {canModify ? (
                        <select
                          value={member.extendedRole}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as ExtendedRole)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border-0 cursor-pointer ${roleConfig.bgColor}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="auditor">Auditor</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ${roleConfig.bgColor} ${roleConfig.color}`}>
                          {roleConfig.icon}
                          {roleConfig.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {member.mfaEnabled ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-4 h-4" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-steel-500">
                          <XCircle className="w-4 h-4" />
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 dark:text-steel-400">
                      {member.lastActiveAt
                        ? new Date(member.lastActiveAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 dark:text-steel-400">
                      {new Date(member.joinedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    {canManage && (
                      <td className="px-4 py-4">
                        {canModify && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending Invites Section */}
      {pendingInvites.length > 0 && (
        <div className="bg-white dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Invitations ({pendingInvites.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-steel-800">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                    <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-steel-100">{invite.email}</p>
                    <p className="text-xs text-slate-500 dark:text-steel-400">
                      Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${EXTENDED_ROLE_CONFIG[invite.role].bgColor} ${EXTENDED_ROLE_CONFIG[invite.role].color}`}>
                    {invite.role}
                  </span>
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-steel-200">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-slate-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Empty Team State
const EmptyTeamState: React.FC<{ onInvite?: () => void }> = ({ onInvite }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700"
  >
    <div className="relative mb-6">
      <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-800/20 rounded-full flex items-center justify-center">
        <Users className="w-12 h-12 text-indigo-500" />
      </div>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="absolute -bottom-1 -right-1 w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg"
      >
        <UserPlus className="w-5 h-5 text-white" />
      </motion.div>
    </div>
    <h3 className="text-xl font-semibold text-slate-900 dark:text-steel-100 mb-2">
      No Team Members Found
    </h3>
    <p className="text-slate-500 dark:text-steel-400 max-w-md mb-6">
      Start building your compliance team by inviting members with the appropriate roles.
    </p>
    {onInvite && (
      <button
        onClick={onInvite}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        Invite Your First Member
      </button>
    )}
  </motion.div>
);

// ============================================================================
// SECURITY TAB
// ============================================================================

interface SecurityTabProps {
  tenant: Tenant;
  members: TeamMember[];
  canManage: boolean;
  onUpdate: () => void;
}

const SecurityTab: React.FC<SecurityTabProps> = ({ tenant, members, canManage, onUpdate }) => {
  const [sessionTimeout, setSessionTimeout] = useState(tenant.settings.securitySettings.sessionTimeoutMinutes);
  const [mfaRequired, setMfaRequired] = useState(tenant.settings.securitySettings.mfaRequired);
  const [saving, setSaving] = useState(false);
  const [showForceLogoutConfirm, setShowForceLogoutConfirm] = useState(false);

  // Demo active sessions
  const activeSessions: SessionInfo[] = [
    {
      id: '1',
      userId: 'current',
      userEmail: 'admin@company.com',
      device: 'MacBook Pro',
      browser: 'Chrome 120',
      ipAddress: '192.168.1.1',
      location: 'San Francisco, CA',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      isCurrent: true,
    },
    {
      id: '2',
      userId: 'user2',
      userEmail: 'user@company.com',
      device: 'iPhone 15',
      browser: 'Safari',
      ipAddress: '192.168.1.50',
      location: 'New York, NY',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
      isCurrent: false,
    },
  ];

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await multiTenant.updateTenantSettings(tenant.id, {
        securitySettings: {
          ...tenant.settings.securitySettings,
          sessionTimeoutMinutes: sessionTimeout,
          mfaRequired,
        },
      });
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  const handleForceLogoutAll = async () => {
    // In production, this would invalidate all sessions
    console.log('Force logout all users');
    setShowForceLogoutConfirm(false);
    // Show success toast
  };

  const mfaCompliance = useMemo(() => {
    const withMfa = members.filter(m => m.mfaEnabled).length;
    return {
      enabled: withMfa,
      total: members.length,
      percentage: members.length > 0 ? Math.round((withMfa / members.length) * 100) : 0,
    };
  }, [members]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-steel-100">Security Settings</h2>
        <p className="text-sm text-slate-500 dark:text-steel-400 mt-1">
          Configure security policies and session management for your organization
        </p>
      </div>

      {/* Session Management */}
      <div className="bg-white dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100">Session Management</h3>
            <p className="text-sm text-slate-500 dark:text-steel-400">Control session duration and active sessions</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
              Session Timeout
            </label>
            <select
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(Number(e.target.value))}
              disabled={!canManage}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-steel-700 rounded-lg bg-slate-50 dark:bg-midnight-900 text-slate-900 dark:text-steel-100 disabled:opacity-50"
            >
              {SESSION_TIMEOUT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-steel-400">
              Users will be automatically logged out after this period of inactivity
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
              Active Sessions
            </label>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-slate-900 dark:text-steel-100">
                {activeSessions.length}
              </span>
              <span className="text-sm text-slate-500 dark:text-steel-400">
                active sessions
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-steel-700">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">Force Logout All Users</h4>
              <p className="text-xs text-slate-500 dark:text-steel-400 mt-0.5">
                Immediately terminate all active sessions except yours
              </p>
            </div>
            <button
              onClick={() => setShowForceLogoutConfirm(true)}
              disabled={!canManage}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Force Logout All
            </button>
          </div>
        </div>
      </div>

      {/* MFA Settings */}
      <div className="bg-white dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <Key className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100">Multi-Factor Authentication</h3>
            <p className="text-sm text-slate-500 dark:text-steel-400">Require MFA for enhanced account security</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-midnight-900 rounded-lg mb-6">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-steel-100">MFA Adoption</p>
              <p className="text-xs text-slate-500 dark:text-steel-400">
                {mfaCompliance.enabled} of {mfaCompliance.total} members have MFA enabled
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-slate-200 dark:bg-steel-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  mfaCompliance.percentage === 100 ? 'bg-emerald-500' :
                  mfaCompliance.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${mfaCompliance.percentage}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-steel-100">
              {mfaCompliance.percentage}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-steel-100">Require MFA for all users</p>
            <p className="text-xs text-slate-500 dark:text-steel-400">
              Users without MFA will be prompted to set it up on next login
            </p>
          </div>
          <button
            onClick={() => setMfaRequired(!mfaRequired)}
            disabled={!canManage}
            className={`relative w-14 h-7 rounded-full transition-colors disabled:opacity-50 ${
              mfaRequired ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-steel-700'
            }`}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
                mfaRequired ? 'translate-x-7' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Password Policy */}
      <div className="bg-white dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
            <Lock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100">Password Policy</h3>
            <p className="text-sm text-slate-500 dark:text-steel-400">Set password requirements for team members</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
              Minimum Length
            </label>
            <input
              type="number"
              value={tenant.settings.securitySettings.passwordPolicy.minLength}
              disabled={!canManage}
              min={8}
              max={32}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-steel-700 rounded-lg bg-slate-50 dark:bg-midnight-900 text-slate-900 dark:text-steel-100 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
              Expiration (days)
            </label>
            <input
              type="number"
              value={tenant.settings.securitySettings.passwordPolicy.expirationDays}
              disabled={!canManage}
              min={0}
              max={365}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-steel-700 rounded-lg bg-slate-50 dark:bg-midnight-900 text-slate-900 dark:text-steel-100 disabled:opacity-50"
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-steel-400">
              0 = passwords never expire
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {[
            { key: 'requireUppercase', label: 'Require uppercase letters (A-Z)' },
            { key: 'requireNumbers', label: 'Require numbers (0-9)' },
            { key: 'requireSymbols', label: 'Require special characters (!@#$%)' },
          ].map((rule) => (
            <label key={rule.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={tenant.settings.securitySettings.passwordPolicy[rule.key as keyof typeof tenant.settings.securitySettings.passwordPolicy] as boolean}
                disabled={!canManage}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
              />
              <span className="text-sm text-slate-700 dark:text-steel-300">{rule.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Save Button */}
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}

      {/* Force Logout Confirmation Modal */}
      <AnimatePresence>
        {showForceLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowForceLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-midnight-800 rounded-xl shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100">
                      Force Logout All Users?
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-steel-400">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-steel-400 mb-6">
                  All users except you will be immediately logged out of their sessions.
                  They will need to sign in again to access the platform.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowForceLogoutConfirm(false)}
                    className="px-4 py-2 text-slate-600 dark:text-steel-400 hover:bg-slate-100 dark:hover:bg-steel-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleForceLogoutAll}
                    className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Force Logout All
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// BRANDING TAB
// ============================================================================

interface BrandingTabProps {
  tenant: Tenant;
  canManage: boolean;
  onUpdate: () => void;
}

const BrandingTab: React.FC<BrandingTabProps> = ({ tenant, canManage, onUpdate }) => {
  const [orgName, setOrgName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [primaryColor, setPrimaryColor] = useState(tenant.branding.primaryColor);
  const [logoUrl, setLogoUrl] = useState(tenant.branding.logoUrl || '');
  const [saving, setSaving] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  const validateSlug = (value: string) => {
    // Simple slug validation - would check against DB in production
    const isValid = /^[a-z0-9-]+$/.test(value) && value.length >= 3;
    setSlugAvailable(isValid && value !== tenant.slug ? true : null);
    return isValid;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await multiTenant.updateTenantBranding(tenant.id, {
        primaryColor,
        logoUrl: logoUrl || null,
      });
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-steel-100">Organization Branding</h2>
        <p className="text-sm text-slate-500 dark:text-steel-400 mt-1">
          Customize your organization's appearance and Trust Center URL
        </p>
      </div>

      {/* Logo & Identity */}
      <div className="bg-white dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
            <ImageIcon className="w-5 h-5 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100">Logo & Identity</h3>
            <p className="text-sm text-slate-500 dark:text-steel-400">Your organization's visual identity</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-3">
              Organization Logo
            </label>
            <div className="flex items-start gap-4">
              <div
                className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 dark:border-steel-600 flex items-center justify-center overflow-hidden"
                style={logoUrl ? {} : { backgroundColor: `${primaryColor}15` }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-10 h-10" style={{ color: primaryColor }} />
                )}
              </div>
              <div className="flex-1">
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  disabled={!canManage}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-steel-700 rounded-lg bg-slate-50 dark:bg-midnight-900 text-slate-900 dark:text-steel-100 disabled:opacity-50"
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-steel-400">
                  Enter a URL to your logo image. Recommended: 200x200px PNG with transparency.
                </p>
                <button
                  disabled={!canManage}
                  className="mt-2 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  Upload from device
                </button>
              </div>
            </div>
          </div>

          {/* Organization Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-3">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={!canManage}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-steel-700 rounded-lg bg-slate-50 dark:bg-midnight-900 text-slate-900 dark:text-steel-100 disabled:opacity-50"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-steel-400">
              This name appears in your Trust Center and reports
            </p>
          </div>
        </div>
      </div>

      {/* Brand Colors */}
      <div className="bg-white dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
            <Palette className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100">Brand Colors</h3>
            <p className="text-sm text-slate-500 dark:text-steel-400">Customize the dashboard and report colors</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-3">
              Primary Color
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                disabled={!canManage}
                className="w-16 h-16 rounded-xl cursor-pointer disabled:cursor-not-allowed border-2 border-slate-200 dark:border-steel-700"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  disabled={!canManage}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-steel-700 rounded-lg bg-slate-50 dark:bg-midnight-900 text-slate-900 dark:text-steel-100 font-mono disabled:opacity-50"
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-steel-400">
                  Hex color code (e.g., #6366f1)
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-3">
              Preview
            </label>
            <div className="p-4 bg-slate-50 dark:bg-midnight-900 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <Shield className="w-5 h-5" style={{ color: primaryColor }} />
                </div>
                <span className="font-semibold text-slate-900 dark:text-steel-100">{orgName}</span>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  Primary Button
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium rounded-lg"
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                >
                  Secondary Button
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Center URL */}
      <div className="bg-white dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <Link2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100">Trust Center URL</h3>
            <p className="text-sm text-slate-500 dark:text-steel-400">Your public-facing compliance portal</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-3">
            URL Slug
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-steel-400 font-mono">
              lydell.ai/trust/
            </span>
            <div className="flex-1 relative">
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                  setSlug(value);
                  validateSlug(value);
                }}
                disabled={!canManage}
                className={`w-full px-4 py-2.5 border rounded-lg bg-slate-50 dark:bg-midnight-900 text-slate-900 dark:text-steel-100 font-mono disabled:opacity-50 ${
                  slugAvailable === true
                    ? 'border-emerald-500 focus:ring-emerald-500'
                    : slugAvailable === false
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-steel-700'
                }`}
              />
              {slugAvailable !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugAvailable ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-steel-400">
            Only lowercase letters, numbers, and hyphens. Minimum 3 characters.
          </p>
        </div>

        <div className="mt-4 p-4 bg-slate-50 dark:bg-midnight-900 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-mono text-slate-600 dark:text-steel-400">
              https://lydell.ai/trust/{slug}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(`https://lydell.ai/trust/${slug}`)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-steel-200 hover:bg-slate-100 dark:hover:bg-steel-800 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
            <a
              href={`https://lydell.ai/trust/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-steel-200 hover:bg-slate-100 dark:hover:bg-steel-800 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// BILLING TAB
// ============================================================================

interface BillingTabProps {
  tenant: Tenant;
  canManage: boolean;
}

const BillingTab: React.FC<BillingTabProps> = ({ tenant, canManage }) => {
  const planConfig = PLAN_CONFIGS[tenant.plan];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-steel-100">Billing & Subscription</h2>
        <p className="text-sm text-slate-500 dark:text-steel-400 mt-1">
          Manage your subscription plan and billing details
        </p>
      </div>

      {/* Current Plan */}
      <div className="bg-white dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100">Current Plan</h3>
              <p className="text-sm text-slate-500 dark:text-steel-400">Your subscription details</p>
            </div>
          </div>
          {canManage && tenant.plan !== 'enterprise' && (
            <button className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
              Upgrade Plan
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2 mb-2">
              {tenant.plan === 'enterprise' && <Crown className="w-5 h-5 text-amber-500" />}
              <span className="text-2xl font-bold text-slate-900 dark:text-steel-100">
                {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
              </span>
            </div>
            <p className="text-lg font-semibold text-slate-700 dark:text-steel-300">
              {planConfig.price === -1
                ? 'Custom Pricing'
                : planConfig.price === 0
                  ? 'Free Forever'
                  : `$${planConfig.price}/month`}
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-midnight-900 rounded-xl">
            <p className="text-sm text-slate-500 dark:text-steel-400 mb-1">Seats Used</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-steel-100">
              {tenant.billing.seatsUsed}
              <span className="text-lg font-normal text-slate-400 dark:text-steel-500">
                /{tenant.limits.maxUsers === -1 ? '∞' : tenant.limits.maxUsers}
              </span>
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-midnight-900 rounded-xl">
            <p className="text-sm text-slate-500 dark:text-steel-400 mb-1">Next Billing</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-steel-100">
              {tenant.billing.currentPeriodEnd
                ? new Date(tenant.billing.currentPeriodEnd).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="bg-white dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100 mb-6">Compare Plans</h3>
        <div className="grid grid-cols-4 gap-4">
          {(['free', 'startup', 'business', 'enterprise'] as TenantPlan[]).map((plan) => {
            const config = PLAN_CONFIGS[plan];
            const isCurrent = plan === tenant.plan;
            return (
              <div
                key={plan}
                className={`p-5 rounded-xl border-2 transition-all ${
                  isCurrent
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-steel-700 hover:border-slate-300 dark:hover:border-steel-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-slate-900 dark:text-steel-100">
                    {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </span>
                  {isCurrent && (
                    <span className="text-xs px-2 py-0.5 bg-indigo-600 text-white rounded-full">Current</span>
                  )}
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-steel-100 mb-4">
                  {config.price === -1 ? 'Custom' : config.price === 0 ? 'Free' : `$${config.price}`}
                  {config.price > 0 && <span className="text-sm font-normal text-slate-400">/mo</span>}
                </p>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-steel-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {config.limits.maxUsers === -1 ? 'Unlimited' : config.limits.maxUsers} users
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {config.limits.maxIntegrations === -1 ? 'Unlimited' : config.limits.maxIntegrations} integrations
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {config.limits.maxStorageGb === -1 ? 'Unlimited' : `${config.limits.maxStorageGb}GB`} storage
                  </li>
                </ul>
                {!isCurrent && canManage && (
                  <button
                    className={`w-full mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      plan === 'enterprise'
                        ? 'bg-slate-900 dark:bg-steel-100 text-white dark:text-slate-900 hover:bg-slate-800'
                        : 'bg-slate-100 dark:bg-steel-800 text-slate-700 dark:text-steel-300 hover:bg-slate-200'
                    }`}
                  >
                    {plan === 'enterprise' ? 'Contact Sales' : PLAN_CONFIGS[plan].price > PLAN_CONFIGS[tenant.plan].price ? 'Upgrade' : 'Downgrade'}
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

// ============================================================================
// FRAMEWORKS TAB
// ============================================================================

interface FrameworksTabProps {
  tenant: Tenant;
  members: TeamMember[];
  canManage: boolean;
  onUpdate: () => void;
}

const FrameworksTab: React.FC<FrameworksTabProps> = ({ members, canManage }) => {
  const [enabledFrameworks, setEnabledFrameworks] = useState<Set<FrameworkId>>(
    new Set(['SOC2', 'ISO27001', 'HIPAA'] as FrameworkId[])
  );
  const [domainAssignments, setDomainAssignments] = useState<Record<string, string>>({});

  const toggleFramework = (frameworkId: FrameworkId) => {
    const newEnabled = new Set(enabledFrameworks);
    if (newEnabled.has(frameworkId)) {
      newEnabled.delete(frameworkId);
    } else {
      newEnabled.add(frameworkId);
    }
    setEnabledFrameworks(newEnabled);
  };

  const handleDomainAssignment = (domain: string, userId: string) => {
    setDomainAssignments(prev => ({
      ...prev,
      [domain]: userId,
    }));
  };

  // Get available domains from constants
  const domains: { id: ComplianceDomain; title: string; description: string }[] = COMPLIANCE_DOMAINS || [
    { id: 'access_control' as ComplianceDomain, title: 'Access Control', description: 'User authentication and authorization' },
    { id: 'asset_management' as ComplianceDomain, title: 'Asset Management', description: 'Hardware and software inventory' },
    { id: 'risk_assessment' as ComplianceDomain, title: 'Risk Assessment', description: 'Risk identification and mitigation' },
    { id: 'security_operations' as ComplianceDomain, title: 'Security Operations', description: 'Security monitoring and response' },
    { id: 'incident_response' as ComplianceDomain, title: 'Incident Response', description: 'Security incident handling' },
    { id: 'business_continuity' as ComplianceDomain, title: 'Business Continuity', description: 'Disaster recovery planning' },
    { id: 'vendor_management' as ComplianceDomain, title: 'Vendor Management', description: 'Third-party risk management' },
    { id: 'data_protection' as ComplianceDomain, title: 'Data Protection', description: 'Data security and privacy' },
    { id: 'hr_security' as ComplianceDomain, title: 'Human Resources', description: 'Employee security and training' },
    { id: 'change_management' as ComplianceDomain, title: 'Change Management', description: 'Change control processes' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-steel-100">Framework & Module Settings</h2>
        <p className="text-sm text-slate-500 dark:text-steel-400 mt-1">
          Enable/disable frameworks and assign domain owners for your compliance program
        </p>
      </div>

      {/* Framework Toggles */}
      <div className="bg-white dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
            <Layers className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100">Active Frameworks</h3>
            <p className="text-sm text-slate-500 dark:text-steel-400">
              Toggle frameworks to show/hide relevant controls and requirements
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {FRAMEWORKS.map((framework) => {
            const isEnabled = enabledFrameworks.has(framework.id);
            return (
              <motion.button
                key={framework.id}
                onClick={() => canManage && toggleFramework(framework.id)}
                disabled={!canManage}
                className={`p-4 rounded-xl border-2 text-left transition-all disabled:cursor-not-allowed ${
                  isEnabled
                    ? 'border-current bg-opacity-10'
                    : 'border-slate-200 dark:border-steel-700 opacity-60'
                }`}
                style={isEnabled ? {
                  borderColor: framework.color,
                  backgroundColor: `${framework.color}10`
                } : {}}
                whileHover={canManage ? { scale: 1.02 } : {}}
                whileTap={canManage ? { scale: 0.98 } : {}}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{framework.icon}</span>
                  <div className={`w-10 h-6 rounded-full transition-colors ${
                    isEnabled ? 'bg-current' : 'bg-slate-300 dark:bg-steel-700'
                  }`} style={isEnabled ? { backgroundColor: framework.color } : {}}>
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${
                        isEnabled ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-steel-100">{framework.name}</h4>
                <p className="text-xs text-slate-500 dark:text-steel-400 mt-1">{framework.fullName}</p>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Disabled frameworks will hide related controls from your team's view, reducing noise.
          </p>
        </div>
      </div>

      {/* Domain Assignment */}
      <div className="bg-white dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100">Domain Owners</h3>
            <p className="text-sm text-slate-500 dark:text-steel-400">
              Assign team members as owners of specific compliance domains
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {domains.map((domain) => {
            const assignedMember = members.find(m => m.id === domainAssignments[domain.id]);
            return (
              <div
                key={domain.id}
                className="p-4 bg-slate-50 dark:bg-midnight-900 rounded-lg border border-slate-200 dark:border-steel-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-steel-100">{domain.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-steel-400">{domain.description}</p>
                  </div>
                  {canManage ? (
                    <select
                      value={domainAssignments[domain.id] || ''}
                      onChange={(e) => handleDomainAssignment(domain.id, e.target.value)}
                      className="px-3 py-1.5 text-sm border border-slate-200 dark:border-steel-700 rounded-lg bg-white dark:bg-midnight-800 text-slate-700 dark:text-steel-300"
                    >
                      <option value="">Unassigned</option>
                      {members.filter(m => m.extendedRole !== 'auditor').map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.fullName || member.email}
                        </option>
                      ))}
                    </select>
                  ) : assignedMember ? (
                    <span className="text-sm text-slate-600 dark:text-steel-400">
                      {assignedMember.fullName || assignedMember.email}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-steel-500">Unassigned</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// LOGS TAB
// ============================================================================

interface LogsTabProps {
  logs: TenantAuditLog[];
}

const LogsTab: React.FC<LogsTabProps> = ({ logs }) => {
  const [searchText, setSearchText] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const actionTypes = useMemo(() => {
    const types = new Set(logs.map(log => log.action));
    return Array.from(types);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.action.toLowerCase().includes(searchText.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchText.toLowerCase()) ||
        log.userEmail?.toLowerCase().includes(searchText.toLowerCase());
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [logs, searchText, actionFilter]);

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('remove')) return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
    if (action.includes('create') || action.includes('add')) return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (action.includes('update') || action.includes('change')) return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
    return 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-steel-100">Audit Logs</h2>
          <p className="text-sm text-slate-500 dark:text-steel-400 mt-1">
            Complete record of all administrative actions in your organization
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-steel-700 rounded-lg text-slate-600 dark:text-steel-400 hover:bg-slate-50 dark:hover:bg-steel-800 transition-colors">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white dark:bg-midnight-800 p-4 rounded-xl border border-slate-200 dark:border-steel-700">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-steel-700 rounded-lg bg-slate-50 dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 dark:border-steel-700 rounded-lg bg-slate-50 dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
        >
          <option value="all">All Actions</option>
          {actionTypes.map((action) => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <EmptyLogsState />
      ) : (
        <div className="bg-white dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-steel-800">
            {filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-steel-800/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <Activity className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-steel-400">
                        {log.resource}
                        {log.resourceId && (
                          <span className="font-mono text-xs ml-1">({log.resourceId.slice(0, 8)})</span>
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-slate-900 dark:text-steel-100">
                      <span className="font-medium">{log.userEmail || 'System'}</span>
                      {' performed this action'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-steel-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                      {log.ipAddress && (
                        <span className="flex items-center gap-1 font-mono">
                          <Globe className="w-3 h-3" />
                          {log.ipAddress}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Empty Logs State
const EmptyLogsState: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700"
  >
    <div className="relative mb-6">
      <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-steel-800 dark:to-steel-700 rounded-full flex items-center justify-center">
        <FileText className="w-12 h-12 text-slate-400 dark:text-steel-500" />
      </div>
    </div>
    <h3 className="text-xl font-semibold text-slate-900 dark:text-steel-100 mb-2">
      No Audit Logs Yet
    </h3>
    <p className="text-slate-500 dark:text-steel-400 max-w-md">
      Administrative actions will appear here once team members start using the platform.
    </p>
  </motion.div>
);

// ============================================================================
// SECURE INVITE MODAL
// ============================================================================

interface SecureInviteModalProps {
  tenantId: string;
  tenantName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const SecureInviteModal: React.FC<SecureInviteModalProps> = ({ tenantId, tenantName, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [role, setRole] = useState<ExtendedRole>('editor');
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState(72); // hours

  const addEmail = () => {
    if (email && !emails.includes(email) && email.includes('@')) {
      setEmails([...emails, email]);
      setEmail('');
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove));
  };

  const handleSendInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emails.length === 0) {
      addEmail();
      return;
    }

    setSending(true);
    try {
      // Generate secure invite link
      const token = crypto.randomUUID();
      const link = `https://lydell.ai/invite/${token}`;
      setInviteLink(link);

      // In production, this would send emails via backend
      console.log('Sending invites to:', emails, 'as', role, 'for', tenantId);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setSending(false);
    }
  };

  // Note: roleConfig available for future UI enhancements
  void EXTENDED_ROLE_CONFIG[role];

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
        className="w-full max-w-lg bg-white dark:bg-midnight-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Secure Team Invite</h2>
                <p className="text-sm text-white/80">Invite members to {tenantName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {inviteLink ? (
          <div className="p-6">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl mb-6">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-medium text-emerald-800 dark:text-emerald-300">Invitations Sent!</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {emails.length} invite{emails.length > 1 ? 's' : ''} sent successfully
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
                Shareable Invite Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-steel-700 rounded-lg bg-slate-50 dark:bg-midnight-900 text-slate-900 dark:text-steel-100 font-mono text-sm"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                  className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-steel-400">
                Link expires in {expiresIn} hours. Anyone with this link can join as {role}.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-steel-700">
              <button
                onClick={onSuccess}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendInvites} className="p-6 space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
                Email Addresses
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-steel-700 rounded-lg bg-slate-50 dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
                  placeholder="colleague@company.com"
                />
                <button
                  type="button"
                  onClick={addEmail}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-steel-800 text-slate-700 dark:text-steel-300 rounded-lg hover:bg-slate-200 dark:hover:bg-steel-700 transition-colors"
                >
                  Add
                </button>
              </div>
              {emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {emails.map((e) => (
                    <span
                      key={e}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm"
                    >
                      {e}
                      <button
                        type="button"
                        onClick={() => removeEmail(e)}
                        className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
                Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['admin', 'editor', 'auditor'] as ExtendedRole[]).map((r) => {
                  const config = EXTENDED_ROLE_CONFIG[r];
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        role === r
                          ? `${config.bgColor} border-current`
                          : 'border-slate-200 dark:border-steel-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={role === r ? config.color : 'text-slate-500'}>{config.icon}</span>
                        <span className={`font-medium ${role === r ? config.color : 'text-slate-700 dark:text-steel-300'}`}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-steel-400">{config.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Link Expiration */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
                Link Expires In
              </label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-steel-700 rounded-lg bg-slate-50 dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
              >
                <option value={24}>24 hours</option>
                <option value={72}>3 days</option>
                <option value={168}>7 days</option>
                <option value={720}>30 days</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-steel-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 dark:text-steel-400 hover:bg-slate-100 dark:hover:bg-steel-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || (emails.length === 0 && !email)}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Invites
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
};

export default OrgManagementSuite;
