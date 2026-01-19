/**
 * Vendor Health Map Component
 *
 * Visual grid representation of vendor risk status.
 * Each cell represents a vendor, colored by risk level.
 * Supports hover interactions and click-to-view details.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Activity, Building2, AlertTriangle, Info } from 'lucide-react';
import type { Vendor, VendorCriticality } from '../../services/vendor-risk.service';
import { CRITICALITY_CONFIG, CATEGORY_LABELS } from './index';

interface VendorHealthMapProps {
  vendors: Vendor[];
  onVendorClick: (vendor: Vendor) => void;
}

const VendorHealthMap: React.FC<VendorHealthMapProps> = ({ vendors, onVendorClick }) => {
  // Group vendors by criticality for layout
  const groupedVendors = useMemo(() => {
    const groups: Record<VendorCriticality, Vendor[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };

    vendors.forEach(v => {
      groups[v.criticality].push(v);
    });

    return groups;
  }, [vendors]);

  // Get color for risk score
  const getRiskColor = (score?: number) => {
    if (score === undefined) return '#94A3B8';
    if (score >= 75) return '#DC2626';
    if (score >= 50) return '#EA580C';
    if (score >= 25) return '#D97706';
    return '#16A34A';
  };

  // Count vendors needing attention
  const needsAttention = useMemo(() => {
    return vendors.filter(v => {
      const hasHighRisk = (v.riskScore || 0) >= 75;
      const needsAssessment = !v.lastAssessmentAt ||
        (v.nextAssessmentAt && new Date(v.nextAssessmentAt) <= new Date());
      return hasHighRisk || needsAssessment;
    }).length;
  }, [vendors]);

  if (vendors.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-slate-900">Vendor Health Map</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <MapPin className="w-12 h-12 mb-3 opacity-50" />
          <p>No vendors to display</p>
          <p className="text-sm">Add vendors to see the health map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-slate-900">Vendor Health Map</h3>
        </div>
        <div className="flex items-center gap-4">
          {needsAttention > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              {needsAttention} need attention
            </span>
          )}
          <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Health Map Grid */}
      <div className="space-y-4">
        {(Object.entries(groupedVendors) as [VendorCriticality, Vendor[]][]).map(([criticality, vendorList]) => {
          if (vendorList.length === 0) return null;

          const config = CRITICALITY_CONFIG[criticality];

          return (
            <div key={criticality}>
              {/* Section Label */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-sm font-medium text-slate-700">
                  {config.label} Risk ({vendorList.length})
                </span>
              </div>

              {/* Vendor Grid */}
              <div className="flex flex-wrap gap-2">
                {vendorList.map((vendor, idx) => {
                  const hasIssues = (vendor.riskScore || 0) >= 75 ||
                    (vendor.nextAssessmentAt && new Date(vendor.nextAssessmentAt) <= new Date());

                  return (
                    <motion.div
                      key={vendor.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      whileHover={{ scale: 1.1, zIndex: 10 }}
                      onClick={() => onVendorClick(vendor)}
                      className="relative group cursor-pointer"
                    >
                      {/* Vendor Cell */}
                      <div
                        className={`
                          w-12 h-12 rounded-xl flex items-center justify-center
                          transition-all duration-200
                          ${hasIssues ? 'ring-2 ring-red-400 ring-offset-1' : ''}
                        `}
                        style={{
                          backgroundColor: config.bgColor,
                          borderWidth: 2,
                          borderColor: config.borderColor,
                        }}
                      >
                        {vendor.riskScore !== undefined ? (
                          <span
                            className="text-sm font-bold"
                            style={{ color: getRiskColor(vendor.riskScore) }}
                          >
                            {vendor.riskScore}
                          </span>
                        ) : (
                          <Building2
                            className="w-5 h-5"
                            style={{ color: config.color }}
                          />
                        )}
                      </div>

                      {/* Alert indicator */}
                      {hasIssues && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                        <p className="font-medium">{vendor.name}</p>
                        <p className="text-slate-400">{CATEGORY_LABELS[vendor.category]}</p>
                        {vendor.riskScore !== undefined && (
                          <p className="mt-1">Risk Score: {vendor.riskScore}</p>
                        )}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>Risk Score:</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>0-24</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span>25-49</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <span>50-74</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span>75+</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
              <AlertTriangle className="w-2.5 h-2.5 text-white" />
            </div>
            <span>Needs attention</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorHealthMap;
