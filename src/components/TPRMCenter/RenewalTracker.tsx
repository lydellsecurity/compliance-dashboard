/**
 * Renewal Tracker Component
 *
 * Tracks vendor contract renewals with:
 * - 30-day automated alerts
 * - Timeline view
 * - Notification engine
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Bell,
  AlertTriangle,
  Clock,
  ChevronRight,
  Building2,
  DollarSign,
} from 'lucide-react';
import type { Vendor } from '../../services/vendor-risk.service';
import { CRITICALITY_CONFIG, CATEGORY_LABELS } from './index';

interface RenewalTrackerProps {
  vendors: Vendor[];
  onVendorClick: (vendor: Vendor) => void;
}

const RenewalTracker: React.FC<RenewalTrackerProps> = ({ vendors, onVendorClick }) => {
  const [timeframe, setTimeframe] = useState<'30' | '60' | '90' | 'all'>('30');
  const [showNotifications, setShowNotifications] = useState(false);

  // Filter vendors by contract end date
  const renewals = useMemo(() => {
    const now = new Date();
    const filtered = vendors
      .filter(v => v.contractEndDate)
      .map(v => ({
        vendor: v,
        daysUntil: Math.ceil((new Date(v.contractEndDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => a.daysUntil - b.daysUntil);

    if (timeframe === 'all') return filtered;
    const days = parseInt(timeframe);
    return filtered.filter(r => r.daysUntil <= days && r.daysUntil >= -30);
  }, [vendors, timeframe]);

  // Group by status
  const grouped = useMemo(() => {
    return {
      expired: renewals.filter(r => r.daysUntil < 0),
      urgent: renewals.filter(r => r.daysUntil >= 0 && r.daysUntil <= 7),
      warning: renewals.filter(r => r.daysUntil > 7 && r.daysUntil <= 30),
      upcoming: renewals.filter(r => r.daysUntil > 30),
    };
  }, [renewals]);

  // Total contract value expiring
  const totalValueExpiring = useMemo(() => {
    return renewals
      .filter(r => r.daysUntil <= 30)
      .reduce((sum, r) => sum + (r.vendor.contractValue || 0), 0);
  }, [renewals]);

  const getStatusBadge = (daysUntil: number) => {
    if (daysUntil < 0) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium">
          <AlertTriangle className="w-3 h-3" />
          Expired
        </span>
      );
    }
    if (daysUntil <= 7) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium animate-pulse">
          <Bell className="w-3 h-3" />
          {daysUntil} days
        </span>
      );
    }
    if (daysUntil <= 30) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
          <Clock className="w-3 h-3" />
          {daysUntil} days
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
        <Calendar className="w-3 h-3" />
        {daysUntil} days
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Renewal Tracker</h3>
            <p className="text-sm text-slate-500">
              {renewals.length} contract{renewals.length !== 1 ? 's' : ''} in view
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe Filter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {(['30', '60', '90', 'all'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  timeframe === tf
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tf === 'all' ? 'All' : `${tf}d`}
              </button>
            ))}
          </div>

          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2 rounded-lg transition-colors ${
              showNotifications
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-5 h-5" />
            {(grouped.expired.length + grouped.urgent.length) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {grouped.expired.length + grouped.urgent.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{grouped.expired.length}</div>
          <div className="text-xs text-slate-500">Expired</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{grouped.urgent.length}</div>
          <div className="text-xs text-slate-500">{"< 7 days"}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">{grouped.warning.length}</div>
          <div className="text-xs text-slate-500">7-30 days</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-600">
            ${(totalValueExpiring / 1000).toFixed(0)}k
          </div>
          <div className="text-xs text-slate-500">Value at risk</div>
        </div>
      </div>

      {/* Renewals List */}
      <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
        {renewals.length > 0 ? (
          renewals.map(({ vendor, daysUntil }) => {
            const critConfig = CRITICALITY_CONFIG[vendor.criticality];
            return (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => onVendorClick(vendor)}
                className={`
                  flex items-center justify-between px-6 py-4 cursor-pointer transition-colors
                  ${daysUntil < 0 ? 'bg-red-50 hover:bg-red-100' :
                    daysUntil <= 7 ? 'hover:bg-red-50' :
                    daysUntil <= 30 ? 'hover:bg-amber-50' : 'hover:bg-slate-50'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: critConfig.bgColor }}
                  >
                    <Building2 className="w-5 h-5" style={{ color: critConfig.color }} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{vendor.name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>{CATEGORY_LABELS[vendor.category]}</span>
                      {vendor.contractValue && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {vendor.contractValue.toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(vendor.contractEndDate!).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    {getStatusBadge(daysUntil)}
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="py-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No renewals found</h3>
            <p className="text-slate-500">
              No contracts expiring in the selected timeframe
            </p>
          </div>
        )}
      </div>

      {/* Alert Configuration */}
      {showNotifications && (
        <div className="px-6 py-4 border-t border-slate-200 bg-indigo-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-indigo-900">Notification Settings</h4>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-3 text-sm text-indigo-800">
              <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
              Email alert at 30 days before expiration
            </label>
            <label className="flex items-center gap-3 text-sm text-indigo-800">
              <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
              Email alert at 7 days before expiration
            </label>
            <label className="flex items-center gap-3 text-sm text-indigo-800">
              <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
              Email alert when contract expires
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default RenewalTracker;
