/**
 * Vendor Risk Management Component
 * Enterprise-grade third-party risk management dashboard
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Search, Plus, Filter, Building2, AlertTriangle, Shield,
  Calendar, FileText, ChevronRight, ExternalLink, Mail, Phone, Globe,
  CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, BarChart3,
  Users, AlertCircle, RefreshCw, Download, Upload, Eye, Edit, Trash2,
  Star, Award, Lock, Briefcase, X
} from 'lucide-react';
import {
  vendorRiskService,
  type Vendor,
  type VendorAssessment,
  type VendorCategory,
  type VendorCriticality,
  type VendorStatus,
  type VendorRiskTier,
  QUESTIONNAIRE_TEMPLATES,
} from '../services/vendor-risk.service';

interface VendorRiskManagementProps {
  organizationId: string;
  userId: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_LABELS: Record<VendorCategory, string> = {
  cloud_services: 'Cloud Services',
  software: 'Software',
  hardware: 'Hardware',
  professional_services: 'Professional Services',
  data_processing: 'Data Processing',
  infrastructure: 'Infrastructure',
  security: 'Security',
  communications: 'Communications',
  financial: 'Financial Services',
  hr_services: 'HR Services',
  marketing: 'Marketing',
  legal: 'Legal',
  other: 'Other',
};

const CRITICALITY_COLORS: Record<VendorCriticality, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
};

const RISK_TIER_CONFIG: Record<VendorRiskTier, { label: string; color: string; frequency: string }> = {
  tier1: { label: 'Tier 1 - Critical', color: 'text-red-400', frequency: 'Quarterly' },
  tier2: { label: 'Tier 2 - High', color: 'text-orange-400', frequency: 'Semi-Annual' },
  tier3: { label: 'Tier 3 - Medium', color: 'text-yellow-400', frequency: 'Annual' },
  tier4: { label: 'Tier 4 - Low', color: 'text-green-400', frequency: 'Bi-Annual' },
};

const STATUS_CONFIG: Record<VendorStatus, { label: string; icon: React.ReactNode; color: string }> = {
  active: { label: 'Active', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-400' },
  pending: { label: 'Pending', icon: <Clock className="w-4 h-4" />, color: 'text-yellow-400' },
  inactive: { label: 'Inactive', icon: <XCircle className="w-4 h-4" />, color: 'text-slate-400' },
  offboarding: { label: 'Offboarding', icon: <AlertCircle className="w-4 h-4" />, color: 'text-orange-400' },
  terminated: { label: 'Terminated', icon: <XCircle className="w-4 h-4" />, color: 'text-red-400' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const VendorRiskManagement: React.FC<VendorRiskManagementProps> = ({ organizationId, userId }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'vendors' | 'assessments' | 'questionnaires'>('dashboard');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCriticality, setFilterCriticality] = useState<VendorCriticality[]>([]);
  const [filterStatus, setFilterStatus] = useState<VendorStatus[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dashboard, setDashboard] = useState<{
    totalVendors: number;
    byStatus: Record<VendorStatus, number>;
    byCriticality: Record<VendorCriticality, number>;
    byRiskTier: Record<VendorRiskTier, number>;
    assessmentsDue: number;
    contractsExpiring: number;
    recentAssessments: VendorAssessment[];
  } | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, [organizationId, filterCriticality, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vendorData, dashboardData] = await Promise.all([
        vendorRiskService.getVendors(organizationId, {
          criticality: filterCriticality.length > 0 ? filterCriticality : undefined,
          status: filterStatus.length > 0 ? filterStatus : undefined,
          searchTerm: searchTerm || undefined,
        }),
        vendorRiskService.getVendorDashboard(organizationId),
      ]);
      setVendors(vendorData);
      setDashboard(dashboardData);
    } catch (error) {
      console.error('Failed to load vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 text-violet-400" />
            Vendor Risk Management
          </h1>
          <p className="text-slate-400 mt-1">
            Assess, monitor, and manage third-party vendor risks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddVendor(true)}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Vendor
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800 w-fit">
        {(['dashboard', 'vendors', 'assessments', 'questionnaires'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && dashboard && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <DashboardView dashboard={dashboard} onVendorClick={setSelectedVendor} vendors={vendors} />
          </motion.div>
        )}

        {activeTab === 'vendors' && (
          <motion.div
            key="vendors"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <VendorListView
              vendors={filteredVendors}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filterCriticality={filterCriticality}
              onFilterCriticalityChange={setFilterCriticality}
              filterStatus={filterStatus}
              onFilterStatusChange={setFilterStatus}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              onVendorClick={setSelectedVendor}
              loading={loading}
            />
          </motion.div>
        )}

        {activeTab === 'assessments' && (
          <motion.div
            key="assessments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AssessmentsView vendors={vendors} />
          </motion.div>
        )}

        {activeTab === 'questionnaires' && (
          <motion.div
            key="questionnaires"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <QuestionnairesView />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <VendorDetailModal
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          organizationId={organizationId}
          userId={userId}
        />
      )}

      {/* Add Vendor Modal */}
      {showAddVendor && (
        <AddVendorModal
          onClose={() => setShowAddVendor(false)}
          onSave={async (vendor) => {
            await vendorRiskService.createVendor(organizationId, vendor, userId);
            setShowAddVendor(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// DASHBOARD VIEW
// ============================================================================

const DashboardView: React.FC<{
  dashboard: NonNullable<Parameters<typeof VendorRiskManagement>[0] extends { dashboard?: infer D } ? D : never>;
  vendors: Vendor[];
  onVendorClick: (vendor: Vendor) => void;
}> = ({ dashboard, vendors, onVendorClick }) => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Vendors"
          value={dashboard.totalVendors}
          icon={<Building2 className="w-5 h-5" />}
          color="violet"
        />
        <StatCard
          title="Active Vendors"
          value={dashboard.byStatus.active || 0}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Assessments Due"
          value={dashboard.assessmentsDue}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="orange"
          alert={dashboard.assessmentsDue > 0}
        />
        <StatCard
          title="Contracts Expiring"
          value={dashboard.contractsExpiring}
          icon={<Calendar className="w-5 h-5" />}
          color="yellow"
          alert={dashboard.contractsExpiring > 0}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution */}
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-400" />
            Risk Tier Distribution
          </h3>
          <div className="space-y-3">
            {(Object.entries(RISK_TIER_CONFIG) as [VendorRiskTier, typeof RISK_TIER_CONFIG[VendorRiskTier]][]).map(([tier, config]) => {
              const count = dashboard.byRiskTier[tier] || 0;
              const percentage = dashboard.totalVendors > 0 ? (count / dashboard.totalVendors) * 100 : 0;
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm ${config.color}`}>{config.label}</span>
                    <span className="text-sm text-slate-400">{count} vendors ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        tier === 'tier1' ? 'bg-red-500' :
                        tier === 'tier2' ? 'bg-orange-500' :
                        tier === 'tier3' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Criticality Breakdown */}
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-400" />
            Vendor Criticality
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {(Object.entries(CRITICALITY_COLORS) as [VendorCriticality, typeof CRITICALITY_COLORS[VendorCriticality]][]).map(([criticality, colors]) => {
              const count = dashboard.byCriticality[criticality] || 0;
              return (
                <div
                  key={criticality}
                  className={`p-4 rounded-lg ${colors.bg} border ${colors.border}`}
                >
                  <div className={`text-2xl font-bold ${colors.text}`}>{count}</div>
                  <div className="text-sm text-slate-400 capitalize">{criticality} Risk</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* High Risk Vendors */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          High Risk Vendors Requiring Attention
        </h3>
        <div className="space-y-3">
          {vendors
            .filter(v => v.criticality === 'critical' || v.criticality === 'high')
            .slice(0, 5)
            .map((vendor) => (
              <div
                key={vendor.id}
                onClick={() => onVendorClick(vendor)}
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg ${CRITICALITY_COLORS[vendor.criticality].bg} flex items-center justify-center`}>
                    <Building2 className={`w-5 h-5 ${CRITICALITY_COLORS[vendor.criticality].text}`} />
                  </div>
                  <div>
                    <div className="font-medium text-white">{vendor.name}</div>
                    <div className="text-sm text-slate-400">{CATEGORY_LABELS[vendor.category]}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {vendor.riskScore !== undefined && (
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${
                        vendor.riskScore >= 75 ? 'text-red-400' :
                        vendor.riskScore >= 50 ? 'text-orange-400' :
                        vendor.riskScore >= 25 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {vendor.riskScore}
                      </div>
                      <div className="text-xs text-slate-500">Risk Score</div>
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </div>
              </div>
            ))}
          {vendors.filter(v => v.criticality === 'critical' || v.criticality === 'high').length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No high-risk vendors found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// VENDOR LIST VIEW
// ============================================================================

const VendorListView: React.FC<{
  vendors: Vendor[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterCriticality: VendorCriticality[];
  onFilterCriticalityChange: (values: VendorCriticality[]) => void;
  filterStatus: VendorStatus[];
  onFilterStatusChange: (values: VendorStatus[]) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  onVendorClick: (vendor: Vendor) => void;
  loading: boolean;
}> = ({
  vendors,
  searchTerm,
  onSearchChange,
  filterCriticality,
  onFilterCriticalityChange,
  filterStatus,
  onFilterStatusChange,
  showFilters,
  onToggleFilters,
  onVendorClick,
  loading,
}) => {
  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search vendors..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
          />
        </div>
        <button
          onClick={onToggleFilters}
          className={`px-4 py-2.5 rounded-lg border transition-colors flex items-center gap-2 ${
            showFilters || filterCriticality.length > 0 || filterStatus.length > 0
              ? 'bg-violet-600/20 border-violet-500/50 text-violet-300'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {(filterCriticality.length > 0 || filterStatus.length > 0) && (
            <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center">
              {filterCriticality.length + filterStatus.length}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-900/50 rounded-xl border border-slate-800 p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Criticality</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CRITICALITY_COLORS) as VendorCriticality[]).map((crit) => (
                    <button
                      key={crit}
                      onClick={() => {
                        onFilterCriticalityChange(
                          filterCriticality.includes(crit)
                            ? filterCriticality.filter(c => c !== crit)
                            : [...filterCriticality, crit]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                        filterCriticality.includes(crit)
                          ? `${CRITICALITY_COLORS[crit].bg} ${CRITICALITY_COLORS[crit].text} ${CRITICALITY_COLORS[crit].border} border`
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {crit}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STATUS_CONFIG) as VendorStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        onFilterStatusChange(
                          filterStatus.includes(status)
                            ? filterStatus.filter(s => s !== status)
                            : [...filterStatus, status]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors flex items-center gap-1.5 ${
                        filterStatus.includes(status)
                          ? 'bg-violet-600/20 text-violet-300 border border-violet-500/50'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {STATUS_CONFIG[status].icon}
                      {STATUS_CONFIG[status].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vendor Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Vendors Found</h3>
          <p className="text-slate-400">Add your first vendor to get started with risk management</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} onClick={() => onVendorClick(vendor)} />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// VENDOR CARD
// ============================================================================

const VendorCard: React.FC<{ vendor: Vendor; onClick: () => void }> = ({ vendor, onClick }) => {
  const critColors = CRITICALITY_COLORS[vendor.criticality];
  const statusConfig = STATUS_CONFIG[vendor.status];

  return (
    <motion.div
      onClick={onClick}
      className="bg-slate-900/50 rounded-xl border border-slate-800 p-5 cursor-pointer hover:bg-slate-900/80 hover:border-slate-700 transition-all group"
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${critColors.bg} flex items-center justify-center`}>
          <Building2 className={`w-6 h-6 ${critColors.text}`} />
        </div>
        <div className={`flex items-center gap-1.5 text-sm ${statusConfig.color}`}>
          {statusConfig.icon}
          {statusConfig.label}
        </div>
      </div>

      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-violet-300 transition-colors">
        {vendor.name}
      </h3>
      <p className="text-sm text-slate-400 mb-4">{CATEGORY_LABELS[vendor.category]}</p>

      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${critColors.bg} ${critColors.text} border ${critColors.border}`}>
            {vendor.criticality.toUpperCase()}
          </span>
          {vendor.riskTier && (
            <span className={`text-xs ${RISK_TIER_CONFIG[vendor.riskTier].color}`}>
              {RISK_TIER_CONFIG[vendor.riskTier].label.split(' - ')[0]}
            </span>
          )}
        </div>
        {vendor.riskScore !== undefined && (
          <div className={`text-lg font-bold ${
            vendor.riskScore >= 75 ? 'text-red-400' :
            vendor.riskScore >= 50 ? 'text-orange-400' :
            vendor.riskScore >= 25 ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {vendor.riskScore}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================================
// ASSESSMENTS VIEW
// ============================================================================

const AssessmentsView: React.FC<{ vendors: Vendor[] }> = ({ vendors }) => {
  const dueVendors = vendors.filter(v => {
    if (!v.nextAssessmentAt) return true;
    return new Date(v.nextAssessmentAt) <= new Date();
  });

  const upcomingVendors = vendors.filter(v => {
    if (!v.nextAssessmentAt) return false;
    const nextDate = new Date(v.nextAssessmentAt);
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return nextDate > now && nextDate <= thirtyDays;
  });

  return (
    <div className="space-y-6">
      {/* Due Assessments */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          Overdue Assessments ({dueVendors.length})
        </h3>
        {dueVendors.length > 0 ? (
          <div className="space-y-3">
            {dueVendors.map((vendor) => (
              <div key={vendor.id} className="flex items-center justify-between p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                <div>
                  <div className="font-medium text-white">{vendor.name}</div>
                  <div className="text-sm text-slate-400">
                    Last assessed: {vendor.lastAssessmentAt ? new Date(vendor.lastAssessmentAt).toLocaleDateString() : 'Never'}
                  </div>
                </div>
                <button className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                  Start Assessment
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-400/50" />
            All assessments are up to date
          </div>
        )}
      </div>

      {/* Upcoming Assessments */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-yellow-400" />
          Upcoming Assessments ({upcomingVendors.length})
        </h3>
        {upcomingVendors.length > 0 ? (
          <div className="space-y-3">
            {upcomingVendors.map((vendor) => (
              <div key={vendor.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div>
                  <div className="font-medium text-white">{vendor.name}</div>
                  <div className="text-sm text-slate-400">
                    Due: {vendor.nextAssessmentAt ? new Date(vendor.nextAssessmentAt).toLocaleDateString() : 'TBD'}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded text-sm ${CRITICALITY_COLORS[vendor.criticality].bg} ${CRITICALITY_COLORS[vendor.criticality].text}`}>
                  {vendor.criticality}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            No assessments due in the next 30 days
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// QUESTIONNAIRES VIEW
// ============================================================================

const QuestionnairesView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-violet-400" />
          Assessment Questionnaire Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUESTIONNAIRE_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="p-5 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-violet-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-violet-400" />
                </div>
                <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300 capitalize">
                  {template.category}
                </span>
              </div>
              <h4 className="font-medium text-white mb-1">{template.name}</h4>
              <p className="text-sm text-slate-400 mb-3">{template.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{template.questions.length} questions</span>
                <button className="text-violet-400 hover:text-violet-300 flex items-center gap-1">
                  Preview <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STAT CARD
// ============================================================================

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'violet' | 'green' | 'orange' | 'yellow' | 'red';
  alert?: boolean;
}> = ({ title, value, icon, color, alert }) => {
  const colorClasses = {
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  return (
    <div className={`bg-slate-900/50 rounded-xl border border-slate-800 p-5 ${alert ? 'ring-2 ring-orange-500/30' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        {alert && <AlertCircle className="w-5 h-5 text-orange-400 animate-pulse" />}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-400">{title}</div>
    </div>
  );
};

// ============================================================================
// VENDOR DETAIL MODAL
// ============================================================================

const VendorDetailModal: React.FC<{
  vendor: Vendor;
  onClose: () => void;
  organizationId: string;
  userId: string;
}> = ({ vendor, onClose }) => {
  const critColors = CRITICALITY_COLORS[vendor.criticality];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${critColors.bg} flex items-center justify-center`}>
              <Building2 className={`w-6 h-6 ${critColors.text}`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{vendor.name}</h2>
              <p className="text-sm text-slate-400">{CATEGORY_LABELS[vendor.category]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Row */}
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${critColors.bg} ${critColors.text} border ${critColors.border}`}>
              {vendor.criticality.toUpperCase()} RISK
            </span>
            <span className={`flex items-center gap-1.5 text-sm ${STATUS_CONFIG[vendor.status].color}`}>
              {STATUS_CONFIG[vendor.status].icon}
              {STATUS_CONFIG[vendor.status].label}
            </span>
            {vendor.riskTier && (
              <span className={`text-sm ${RISK_TIER_CONFIG[vendor.riskTier].color}`}>
                {RISK_TIER_CONFIG[vendor.riskTier].label}
              </span>
            )}
          </div>

          {/* Risk Score */}
          {vendor.riskScore !== undefined && (
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Risk Score</h3>
              <div className="flex items-end gap-4">
                <div className={`text-4xl font-bold ${
                  vendor.riskScore >= 75 ? 'text-red-400' :
                  vendor.riskScore >= 50 ? 'text-orange-400' :
                  vendor.riskScore >= 25 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {vendor.riskScore}
                </div>
                <div className="flex-1">
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        vendor.riskScore >= 75 ? 'bg-red-500' :
                        vendor.riskScore >= 50 ? 'bg-orange-500' :
                        vendor.riskScore >= 25 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${vendor.riskScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Info */}
          {(vendor.primaryContactName || vendor.primaryContactEmail || vendor.website) && (
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Contact Information</h3>
              <div className="space-y-2">
                {vendor.primaryContactName && (
                  <div className="flex items-center gap-2 text-white">
                    <Users className="w-4 h-4 text-slate-400" />
                    {vendor.primaryContactName}
                  </div>
                )}
                {vendor.primaryContactEmail && (
                  <div className="flex items-center gap-2 text-white">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {vendor.primaryContactEmail}
                  </div>
                )}
                {vendor.primaryContactPhone && (
                  <div className="flex items-center gap-2 text-white">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {vendor.primaryContactPhone}
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center gap-2 text-violet-400">
                    <Globe className="w-4 h-4" />
                    <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {vendor.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Certifications */}
          {vendor.certifications.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Certifications</h3>
              <div className="flex flex-wrap gap-2">
                {vendor.certifications.map((cert, i) => (
                  <span key={i} className="px-3 py-1 rounded-lg bg-green-500/10 text-green-400 text-sm flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button className="flex-1 px-4 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              Start Assessment
            </button>
            <button className="px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors border border-slate-700">
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// ADD VENDOR MODAL
// ============================================================================

const AddVendorModal: React.FC<{
  onClose: () => void;
  onSave: (vendor: Partial<Vendor>) => Promise<void>;
}> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Vendor>>({
    name: '',
    category: 'software',
    criticality: 'medium',
    dataClassification: 'internal',
    status: 'pending',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.name) return;
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-xl bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl"
      >
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add New Vendor</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Vendor Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
              placeholder="Enter vendor name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as VendorCategory })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Criticality</label>
              <select
                value={formData.criticality}
                onChange={(e) => setFormData({ ...formData, criticality: e.target.value as VendorCriticality })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Website</label>
            <input
              type="url"
              value={formData.website || ''}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Primary Contact Email</label>
            <input
              type="email"
              value={formData.primaryContactEmail || ''}
              onChange={(e) => setFormData({ ...formData, primaryContactEmail: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
              placeholder="contact@vendor.com"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.name || saving}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            Add Vendor
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default VendorRiskManagement;
