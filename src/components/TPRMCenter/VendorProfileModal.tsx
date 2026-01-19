/**
 * Vendor Profile Modal
 *
 * Detailed view of a vendor with:
 * - Contact information
 * - Risk metrics
 * - Certifications
 * - Contract details
 * - Assessment history
 * - Security artifacts
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Building2,
  Mail,
  Phone,
  Globe,
  Calendar,
  Shield,
  Award,
  FileText,
  Edit,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Paperclip,
  TrendingUp,
  TrendingDown,
  DollarSign,
  User,
} from 'lucide-react';
import type { Vendor } from '../../services/vendor-risk.service';
import { CRITICALITY_CONFIG, CATEGORY_LABELS, STATUS_CONFIG } from './index';

interface VendorProfileModalProps {
  vendor: Vendor;
  onClose: () => void;
  onStartAssessment: () => void;
  onRefresh: () => void;
  organizationId: string;
  userId: string;
}

const VendorProfileModal: React.FC<VendorProfileModalProps> = ({
  vendor,
  onClose,
  onStartAssessment,
  onRefresh: _onRefresh,
  organizationId: _organizationId,
  userId: _userId,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'artifacts' | 'history'>('overview');
  const critConfig = CRITICALITY_CONFIG[vendor.criticality];
  const statusConfig = STATUS_CONFIG[vendor.status];

  // Calculate days until next assessment
  const daysUntilAssessment = vendor.nextAssessmentAt
    ? Math.ceil((new Date(vendor.nextAssessmentAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Calculate days until contract ends
  const daysUntilContractEnd = vendor.contractEndDate
    ? Math.ceil((new Date(vendor.contractEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

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
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: critConfig.bgColor }}
            >
              <Building2 className="w-7 h-7" style={{ color: critConfig.color }} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-3">
                {vendor.name}
                <span
                  className="px-2.5 py-1 text-xs font-medium rounded-lg"
                  style={{ backgroundColor: critConfig.bgColor, color: critConfig.color }}
                >
                  {critConfig.label} Risk
                </span>
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-slate-500">{CATEGORY_LABELS[vendor.category]}</span>
                <span className="text-slate-300">|</span>
                <span
                  className="inline-flex items-center gap-1 text-sm"
                  style={{ color: statusConfig.color }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {}}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-slate-200 bg-white">
          {(['overview', 'artifacts', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Risk Score Card */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-500 mb-3">Risk Assessment</h3>

                  {vendor.riskScore !== undefined ? (
                    <>
                      <div className="flex items-end gap-4 mb-4">
                        <div
                          className={`text-5xl font-bold ${
                            vendor.riskScore >= 75 ? 'text-red-600' :
                            vendor.riskScore >= 50 ? 'text-orange-600' :
                            vendor.riskScore >= 25 ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {vendor.riskScore}
                        </div>
                        <div className="mb-1">
                          <span className="text-sm text-slate-500">out of 100</span>
                          <div className={`flex items-center gap-1 text-sm ${
                            vendor.riskScore >= 50 ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            {vendor.riskScore >= 50 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            <span>{vendor.riskScore >= 50 ? 'Higher' : 'Lower'} risk</span>
                          </div>
                        </div>
                      </div>

                      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${vendor.riskScore}%` }}
                          transition={{ duration: 0.5 }}
                          className={`h-full rounded-full ${
                            vendor.riskScore >= 75 ? 'bg-red-500' :
                            vendor.riskScore >= 50 ? 'bg-orange-500' :
                            vendor.riskScore >= 25 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                      </div>

                      {vendor.lastAssessmentAt && (
                        <p className="text-sm text-slate-500 mt-3 flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          Last assessed: {new Date(vendor.lastAssessmentAt).toLocaleDateString()}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                      <p className="text-slate-600 font-medium">Not yet assessed</p>
                      <button
                        onClick={onStartAssessment}
                        className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                      >
                        Start Assessment
                      </button>
                    </div>
                  )}
                </div>

                {/* Contact Information */}
                <div className="bg-white rounded-xl p-5 border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-500 mb-3">Contact Information</h3>

                  <div className="space-y-3">
                    {vendor.primaryContactName && (
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-900">{vendor.primaryContactName}</span>
                      </div>
                    )}
                    {vendor.primaryContactEmail && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <a
                          href={`mailto:${vendor.primaryContactEmail}`}
                          className="text-indigo-600 hover:underline"
                        >
                          {vendor.primaryContactEmail}
                        </a>
                      </div>
                    )}
                    {vendor.primaryContactPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-900">{vendor.primaryContactPhone}</span>
                      </div>
                    )}
                    {vendor.website && (
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-slate-400" />
                        <a
                          href={vendor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          {vendor.website.replace(/^https?:\/\//, '')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {!vendor.primaryContactName && !vendor.primaryContactEmail && !vendor.website && (
                    <p className="text-slate-400 text-sm">No contact information available</p>
                  )}
                </div>

                {/* Certifications */}
                <div className="bg-white rounded-xl p-5 border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Certifications
                  </h3>

                  {vendor.certifications.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {vendor.certifications.map((cert, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium"
                        >
                          <Shield className="w-4 h-4" />
                          {cert}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">No certifications on file</p>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Contract Details */}
                <div className="bg-white rounded-xl p-5 border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Contract Details
                  </h3>

                  <div className="space-y-4">
                    {vendor.contractStartDate && (
                      <div>
                        <span className="text-xs text-slate-500">Start Date</span>
                        <p className="text-slate-900 font-medium">
                          {new Date(vendor.contractStartDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    )}

                    {vendor.contractEndDate && (
                      <div>
                        <span className="text-xs text-slate-500">End Date</span>
                        <p className="text-slate-900 font-medium flex items-center gap-2">
                          {new Date(vendor.contractEndDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                          {daysUntilContractEnd !== null && daysUntilContractEnd <= 30 && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              daysUntilContractEnd <= 7
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {daysUntilContractEnd <= 0 ? 'Expired' : `${daysUntilContractEnd}d left`}
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {vendor.contractValue && (
                      <div>
                        <span className="text-xs text-slate-500">Contract Value</span>
                        <p className="text-slate-900 font-medium flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-slate-400" />
                          {vendor.contractValue.toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                    )}

                    {vendor.autoRenewal !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          vendor.autoRenewal ? 'bg-emerald-500' : 'bg-slate-300'
                        }`} />
                        <span className="text-sm text-slate-600">
                          Auto-renewal {vendor.autoRenewal ? 'enabled' : 'disabled'}
                        </span>
                      </div>
                    )}
                  </div>

                  {!vendor.contractStartDate && !vendor.contractEndDate && (
                    <p className="text-slate-400 text-sm">No contract details available</p>
                  )}
                </div>

                {/* Next Assessment */}
                <div className={`rounded-xl p-5 border ${
                  daysUntilAssessment !== null && daysUntilAssessment <= 7
                    ? 'bg-red-50 border-red-200'
                    : daysUntilAssessment !== null && daysUntilAssessment <= 30
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-white border-slate-200'
                }`}>
                  <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Assessment Schedule
                  </h3>

                  {vendor.nextAssessmentAt ? (
                    <div>
                      <p className="text-lg font-semibold text-slate-900">
                        {new Date(vendor.nextAssessmentAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      {daysUntilAssessment !== null && (
                        <p className={`text-sm mt-1 ${
                          daysUntilAssessment <= 0 ? 'text-red-600 font-medium' :
                          daysUntilAssessment <= 7 ? 'text-red-600' :
                          daysUntilAssessment <= 30 ? 'text-amber-600' : 'text-slate-500'
                        }`}>
                          {daysUntilAssessment <= 0
                            ? 'Assessment overdue!'
                            : `${daysUntilAssessment} days until next assessment`}
                        </p>
                      )}
                      <button
                        onClick={onStartAssessment}
                        className="mt-4 w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Start Assessment Now
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-slate-400 text-sm mb-3">No assessment scheduled</p>
                      <button
                        onClick={onStartAssessment}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                      >
                        Schedule Assessment
                      </button>
                    </div>
                  )}
                </div>

                {/* Compliance Frameworks */}
                {vendor.complianceFrameworks.length > 0 && (
                  <div className="bg-white rounded-xl p-5 border border-slate-200">
                    <h3 className="text-sm font-medium text-slate-500 mb-3">Applicable Frameworks</h3>
                    <div className="flex flex-wrap gap-2">
                      {vendor.complianceFrameworks.map((fw, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium"
                        >
                          {fw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'artifacts' && (
            <div className="space-y-4">
              <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <Paperclip className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">Security Artifacts</h3>
                <p className="text-slate-500 mb-4">
                  Upload SOC 2 reports, ISO certificates, and other security documents
                </p>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <Paperclip className="w-4 h-4" />
                  Upload Document
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">Assessment History</h3>
                <p className="text-slate-500">
                  No previous assessments found for this vendor
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            Close
          </button>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-white transition-colors flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Export Report
            </button>
            <button
              onClick={onStartAssessment}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Risk Assessment
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default VendorProfileModal;
