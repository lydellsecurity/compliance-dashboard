/**
 * Domain Sidebar
 *
 * Left-hand navigation grouped by Functional Domains.
 * Shows domain progress and allows filtering by domain.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Package,
  BarChart3,
  Eye,
  AlertTriangle,
  RefreshCw,
  Users,
  Lock,
  Building2,
  UserCheck,
  Settings,
  ClipboardCheck,
  ChevronRight,
} from 'lucide-react';
import type { ComplianceDomainMeta } from '../../constants/controls';

interface DomainProgress {
  domainId: string;
  totalControls: number;
  implementedCount: number;
  percentage: number;
}

interface DomainSidebarProps {
  domains: ComplianceDomainMeta[];
  domainProgress: DomainProgress[];
  activeDomain: string | null;
  onSelectDomain: (domainId: string | null) => void;
}

// Map domain IDs to icons
const DOMAIN_ICONS: Record<string, React.ComponentType<{ className?: string; color?: string }>> = {
  access_control: Shield,
  asset_management: Package,
  risk_assessment: BarChart3,
  security_operations: Eye,
  incident_response: AlertTriangle,
  business_continuity: RefreshCw,
  vendor_management: Users,
  data_protection: Lock,
  physical_security: Building2,
  hr_security: UserCheck,
  change_management: Settings,
  compliance_monitoring: ClipboardCheck,
};

const DomainSidebar: React.FC<DomainSidebarProps> = ({
  domains,
  domainProgress,
  activeDomain,
  onSelectDomain,
}) => {
  const getProgress = (domainId: string): DomainProgress | undefined => {
    return domainProgress.find(p => p.domainId === domainId);
  };

  const totalControls = domainProgress.reduce((sum, p) => sum + p.totalControls, 0);
  const totalImplemented = domainProgress.reduce((sum, p) => sum + p.implementedCount, 0);
  const overallPercentage = totalControls > 0 ? Math.round((totalImplemented / totalControls) * 100) : 0;

  return (
    <aside className="w-72 bg-white dark:bg-steel-800 border-r border-slate-200 dark:border-steel-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-steel-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Functional Domains
        </h2>
        <p className="text-sm text-slate-500 dark:text-steel-400 mt-1">
          {totalControls} controls across {domains.length} domains
        </p>
      </div>

      {/* All Controls option */}
      <button
        onClick={() => onSelectDomain(null)}
        className={`
          w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
          ${!activeDomain
            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-r-2 border-indigo-500'
            : 'text-slate-700 dark:text-steel-300 hover:bg-slate-50 dark:hover:bg-steel-700/50'
          }
        `}
      >
        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">All Controls</div>
          <div className="text-xs text-slate-500 dark:text-steel-400">
            {totalImplemented} of {totalControls} implemented
          </div>
        </div>
        <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          {overallPercentage}%
        </div>
      </button>

      {/* Domain List */}
      <div className="flex-1 overflow-y-auto py-2">
        {domains.map((domain, index) => {
          const Icon = DOMAIN_ICONS[domain.id] || Shield;
          const progress = getProgress(domain.id);
          const isActive = activeDomain === domain.id;

          return (
            <motion.button
              key={domain.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onSelectDomain(domain.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200
                ${isActive
                  ? 'bg-slate-100 dark:bg-steel-700 border-r-2'
                  : 'hover:bg-slate-50 dark:hover:bg-steel-700/50'
                }
              `}
              style={{
                borderRightColor: isActive ? domain.color : 'transparent',
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-200"
                style={{
                  backgroundColor: `${domain.color}15`,
                }}
              >
                <Icon
                  className="w-5 h-5"
                  color={domain.color}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-steel-300'}`}>
                  {domain.title}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {/* Mini progress bar */}
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-steel-600 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress?.percentage || 0}%` }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: domain.color }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-steel-400">
                    {progress?.implementedCount || 0}/{progress?.totalControls || 0}
                  </span>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isActive ? 'rotate-90' : ''}`} />
            </motion.button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-steel-700">
        <div className="text-xs text-slate-500 dark:text-steel-400 text-center">
          Control-Centric Assessment Engine
        </div>
      </div>
    </aside>
  );
};

export default DomainSidebar;
