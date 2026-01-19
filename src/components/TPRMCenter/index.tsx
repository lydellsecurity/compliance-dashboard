/**
 * Third-Party Risk Management (TPRM) Center
 *
 * Enterprise-grade vendor oversight system featuring:
 * - Bento Grid layout with Vendor Health Map
 * - Vendor Profiles with Criticality Scoring
 * - Inherent Risk Questionnaire (5-question workflow)
 * - AI Vendor Review for PDF analysis
 * - Security Artifacts repository
 * - Renewal Tracker with 30-day alerts
 * - Compliance Coverage visualization
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Search,
  Plus,
  Building2,
  Shield,
  AlertTriangle,
  Calendar,
  FileText,
  ChevronRight,
  CheckCircle2,
  Clock,
  RefreshCw,
  Award,
  TrendingUp,
  Zap,
  FileSearch,
  Bell,
  BarChart3,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  vendorRiskService,
  type Vendor,
  type VendorCategory,
  type VendorCriticality,
  type VendorStatus,
  type VendorRiskTier,
} from '../../services/vendor-risk.service';
// Reserved for future use: useOrganization

// Sub-components
import VendorHealthMap from './VendorHealthMap';
import VendorProfileModal from './VendorProfileModal';
import InherentRiskQuestionnaire from './InherentRiskQuestionnaire';
import AIVendorReview from './AIVendorReview';
import AddVendorModal from './AddVendorModal';
// Reserved for future use: SecurityArtifacts, RenewalTracker

// ============================================================================
// TYPES
// ============================================================================

interface TPRMCenterProps {
  organizationId: string;
  userId: string;
}

interface VendorDashboardData {
  totalVendors: number;
  byStatus: Record<VendorStatus, number>;
  byCriticality: Record<VendorCriticality, number>;
  byRiskTier: Record<VendorRiskTier, number>;
  assessmentsDue: number;
  contractsExpiring: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CRITICALITY_CONFIG: Record<VendorCriticality, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  critical: {
    label: 'Critical',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  high: {
    label: 'High',
    color: '#EA580C',
    bgColor: '#FFEDD5',
    borderColor: '#FED7AA',
  },
  medium: {
    label: 'Medium',
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  low: {
    label: 'Low',
    color: '#16A34A',
    bgColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
};

export const CATEGORY_LABELS: Record<VendorCategory, string> = {
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

export const STATUS_CONFIG: Record<VendorStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  active: { label: 'Active', color: '#16A34A', bgColor: '#DCFCE7' },
  pending: { label: 'Pending', color: '#D97706', bgColor: '#FEF3C7' },
  inactive: { label: 'Inactive', color: '#64748B', bgColor: '#F1F5F9' },
  offboarding: { label: 'Offboarding', color: '#EA580C', bgColor: '#FFEDD5' },
  terminated: { label: 'Terminated', color: '#DC2626', bgColor: '#FEE2E2' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TPRMCenter: React.FC<TPRMCenterProps> = ({ organizationId, userId }) => {
  // State
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showRiskQuestionnaire, setShowRiskQuestionnaire] = useState(false);
  const [showAIReview, setShowAIReview] = useState(false);
  const [questionnaireVendor, setQuestionnaireVendor] = useState<Vendor | null>(null);
  const [dashboard, setDashboard] = useState<VendorDashboardData | null>(null);
  const [filterCriticality, setFilterCriticality] = useState<VendorCriticality | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, [organizationId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorData, dashboardData] = await Promise.all([
        vendorRiskService.getVendors(organizationId),
        vendorRiskService.getVendorDashboard(organizationId),
      ]);
      setVendors(vendorData);
      setDashboard(dashboardData);
    } catch (error) {
      console.error('Failed to load vendor data:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Filtered vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const matchesSearch = !searchTerm ||
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCriticality = !filterCriticality || v.criticality === filterCriticality;
      return matchesSearch && matchesCriticality;
    });
  }, [vendors, searchTerm, filterCriticality]);

  // Compliance coverage stats
  const complianceCoverage = useMemo(() => {
    const withSOC2 = vendors.filter(v =>
      v.certifications.some(c => c.toLowerCase().includes('soc'))
    ).length;
    const withISO = vendors.filter(v =>
      v.certifications.some(c => c.toLowerCase().includes('iso'))
    ).length;
    const total = vendors.length || 1;
    return {
      soc2: Math.round((withSOC2 / total) * 100),
      iso: Math.round((withISO / total) * 100),
      withSOC2,
      withISO,
    };
  }, [vendors]);

  // Upcoming reviews (next 30 days)
  const upcomingReviews = useMemo(() => {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return vendors
      .filter(v => {
        if (!v.nextAssessmentAt) return false;
        const nextDate = new Date(v.nextAssessmentAt);
        return nextDate >= now && nextDate <= thirtyDays;
      })
      .sort((a, b) =>
        new Date(a.nextAssessmentAt!).getTime() - new Date(b.nextAssessmentAt!).getTime()
      )
      .slice(0, 5);
  }, [vendors]);

  // Handle vendor creation
  const handleVendorCreated = useCallback(async (vendor: Partial<Vendor>) => {
    try {
      await vendorRiskService.createVendor(organizationId, vendor, userId);
      setShowAddVendor(false);
      loadData();
    } catch (error) {
      console.error('Failed to create vendor:', error);
      throw error;
    }
  }, [organizationId, userId, loadData]);

  // Start risk questionnaire for a vendor
  const handleStartQuestionnaire = useCallback((vendor: Vendor) => {
    setQuestionnaireVendor(vendor);
    setShowRiskQuestionnaire(true);
  }, []);

  if (loading && vendors.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white">
              <ShoppingBag className="w-5 h-5" />
            </div>
            Third-Party Risk Management
          </h1>
          <p className="text-slate-500 mt-1">
            Centralized vendor oversight with automated risk assessment
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAIReview(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-medium shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all"
          >
            <FileSearch className="w-4 h-4" />
            AI Vendor Review
          </button>
          <button
            onClick={() => setShowAddVendor(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Vendor
          </button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +12%
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{dashboard?.totalVendors || 0}</div>
          <div className="text-sm text-slate-500">Total Vendors</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{dashboard?.byStatus.active || 0}</div>
          <div className="text-sm text-slate-500">Active Vendors</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            {(dashboard?.assessmentsDue || 0) > 0 && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                Action Required
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-slate-900">{dashboard?.assessmentsDue || 0}</div>
          <div className="text-sm text-slate-500">Assessments Due</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-red-600" />
            </div>
            {(dashboard?.contractsExpiring || 0) > 0 && (
              <Bell className="w-4 h-4 text-red-500 animate-pulse" />
            )}
          </div>
          <div className="text-3xl font-bold text-slate-900">{dashboard?.contractsExpiring || 0}</div>
          <div className="text-sm text-slate-500">Contracts Expiring</div>
        </motion.div>

        {/* Vendor Health Map - Large Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-8 row-span-2"
        >
          <VendorHealthMap
            vendors={vendors}
            onVendorClick={setSelectedVendor}
          />
        </motion.div>

        {/* Compliance Coverage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-slate-900">Compliance Coverage</h3>
          </div>

          <div className="space-y-4">
            {/* SOC 2 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-700">SOC 2 Certified</span>
                <span className="text-sm font-semibold text-indigo-600">{complianceCoverage.soc2}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${complianceCoverage.soc2}%` }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {complianceCoverage.withSOC2} of {vendors.length} vendors
              </p>
            </div>

            {/* ISO 27001 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-700">ISO 27001</span>
                <span className="text-sm font-semibold text-emerald-600">{complianceCoverage.iso}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${complianceCoverage.iso}%` }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {complianceCoverage.withISO} of {vendors.length} vendors
              </p>
            </div>
          </div>
        </motion.div>

        {/* Upcoming Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-slate-900">Upcoming Reviews</h3>
            </div>
            <span className="text-xs font-medium text-slate-500">Next 30 days</span>
          </div>

          {upcomingReviews.length > 0 ? (
            <div className="space-y-3">
              {upcomingReviews.map((vendor) => {
                const daysUntil = Math.ceil(
                  (new Date(vendor.nextAssessmentAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={vendor.id}
                    onClick={() => setSelectedVendor(vendor)}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: CRITICALITY_CONFIG[vendor.criticality].bgColor,
                        }}
                      >
                        <Building2
                          className="w-4 h-4"
                          style={{ color: CRITICALITY_CONFIG[vendor.criticality].color }}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{vendor.name}</p>
                        <p className="text-xs text-slate-500">{CATEGORY_LABELS[vendor.category]}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      daysUntil <= 7
                        ? 'bg-red-100 text-red-700'
                        : daysUntil <= 14
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {daysUntil}d
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No reviews scheduled</p>
            </div>
          )}
        </motion.div>

        {/* Criticality Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-slate-900">Risk Distribution</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(CRITICALITY_CONFIG) as [VendorCriticality, typeof CRITICALITY_CONFIG[VendorCriticality]][]).map(([level, config]) => {
              const count = dashboard?.byCriticality[level] || 0;
              return (
                <motion.button
                  key={level}
                  onClick={() => setFilterCriticality(filterCriticality === level ? null : level)}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    filterCriticality === level
                      ? 'ring-2 ring-indigo-500 ring-offset-2'
                      : ''
                  }`}
                  style={{
                    backgroundColor: config.bgColor,
                    borderColor: config.borderColor,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-2xl font-bold" style={{ color: config.color }}>
                    {count}
                  </div>
                  <div className="text-xs font-medium" style={{ color: config.color }}>
                    {config.label}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="col-span-4 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/25 p-5 text-white"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Quick Actions
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => setShowAddVendor(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-left"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add New Vendor</span>
            </button>
            <button
              onClick={() => setShowAIReview(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-left"
            >
              <FileSearch className="w-5 h-5" />
              <span className="font-medium">AI Policy Review</span>
            </button>
            <button
              onClick={() => {
                if (vendors.length > 0) {
                  handleStartQuestionnaire(vendors[0]);
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-left"
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Risk Assessment</span>
            </button>
          </div>
        </motion.div>

        {/* Vendor Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="col-span-12 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          {/* Table Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <h3 className="font-semibold text-slate-900">Vendor Directory</h3>
              <span className="text-sm text-slate-500">
                {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search vendors..."
                  className="pl-9 pr-4 py-2 w-64 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Filter */}
              {filterCriticality && (
                <button
                  onClick={() => setFilterCriticality(null)}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  <span style={{ color: CRITICALITY_CONFIG[filterCriticality].color }}>
                    {CRITICALITY_CONFIG[filterCriticality].label}
                  </span>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}

              <button
                onClick={() => loadData()}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Criticality
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Certifications
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVendors.map((vendor, idx) => (
                  <motion.tr
                    key={vendor.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedVendor(vendor)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: CRITICALITY_CONFIG[vendor.criticality].bgColor }}
                        >
                          <Building2
                            className="w-5 h-5"
                            style={{ color: CRITICALITY_CONFIG[vendor.criticality].color }}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{vendor.name}</p>
                          {vendor.website && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              {vendor.website.replace(/^https?:\/\//, '').split('/')[0]}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {CATEGORY_LABELS[vendor.category]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: CRITICALITY_CONFIG[vendor.criticality].bgColor,
                          color: CRITICALITY_CONFIG[vendor.criticality].color,
                        }}
                      >
                        {CRITICALITY_CONFIG[vendor.criticality].label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {vendor.riskScore !== undefined ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                vendor.riskScore >= 75 ? 'bg-red-500' :
                                vendor.riskScore >= 50 ? 'bg-amber-500' :
                                vendor.riskScore >= 25 ? 'bg-yellow-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${vendor.riskScore}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${
                            vendor.riskScore >= 75 ? 'text-red-600' :
                            vendor.riskScore >= 50 ? 'text-amber-600' :
                            vendor.riskScore >= 25 ? 'text-yellow-600' : 'text-emerald-600'
                          }`}>
                            {vendor.riskScore}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Not assessed</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: STATUS_CONFIG[vendor.status].bgColor,
                          color: STATUS_CONFIG[vendor.status].color,
                        }}
                      >
                        {vendor.status === 'active' && <CheckCircle2 className="w-3 h-3" />}
                        {STATUS_CONFIG[vendor.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {vendor.certifications.slice(0, 2).map((cert, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs"
                          >
                            <Award className="w-3 h-3" />
                            {cert.length > 10 ? cert.substring(0, 10) + '...' : cert}
                          </span>
                        ))}
                        {vendor.certifications.length > 2 && (
                          <span className="text-xs text-slate-400">
                            +{vendor.certifications.length - 2}
                          </span>
                        )}
                        {vendor.certifications.length === 0 && (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleStartQuestionnaire(vendor)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Risk Assessment"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedVendor(vendor)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {filteredVendors.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No vendors found</h3>
                <p className="text-slate-500 mb-4">
                  {searchTerm || filterCriticality
                    ? 'Try adjusting your search or filters'
                    : 'Get started by adding your first vendor'}
                </p>
                {!searchTerm && !filterCriticality && (
                  <button
                    onClick={() => setShowAddVendor(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Vendor
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedVendor && (
          <VendorProfileModal
            vendor={selectedVendor}
            onClose={() => setSelectedVendor(null)}
            onStartAssessment={() => {
              handleStartQuestionnaire(selectedVendor);
              setSelectedVendor(null);
            }}
            onRefresh={loadData}
            organizationId={organizationId}
            userId={userId}
          />
        )}

        {showAddVendor && (
          <AddVendorModal
            onClose={() => setShowAddVendor(false)}
            onSave={handleVendorCreated}
          />
        )}

        {showRiskQuestionnaire && questionnaireVendor && (
          <InherentRiskQuestionnaire
            vendor={questionnaireVendor}
            onClose={() => {
              setShowRiskQuestionnaire(false);
              setQuestionnaireVendor(null);
            }}
            onComplete={(score) => {
              console.log('Risk assessment completed with score:', score);
              loadData();
              setShowRiskQuestionnaire(false);
              setQuestionnaireVendor(null);
            }}
            organizationId={organizationId}
            userId={userId}
          />
        )}

        {showAIReview && (
          <AIVendorReview
            onClose={() => setShowAIReview(false)}
            vendors={vendors}
            organizationId={organizationId}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TPRMCenter;
