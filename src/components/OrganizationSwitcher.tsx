/**
 * OrganizationSwitcher Component
 *
 * Dropdown in sidebar for switching between organizations.
 * Shows current org with option to switch or create new org.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, Plus, Settings,
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import type { OrganizationWithRole } from '../types/branding.types';

// ============================================================================
// TYPES
// ============================================================================

interface OrganizationSwitcherProps {
  onCreateNew?: () => void;
  onOpenSettings?: () => void;
  compact?: boolean;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const OrgAvatar: React.FC<{
  org: OrganizationWithRole;
  size?: 'sm' | 'md' | 'lg';
}> = ({ org, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  if (org.logoUrl) {
    return (
      <img
        src={org.logoUrl}
        alt={org.name}
        className={`${sizeClasses[size]} rounded-lg object-contain`}
      />
    );
  }

  // Generate initials
  const initials = org.name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className={`${sizeClasses[size]} rounded-lg flex items-center justify-center font-semibold text-white`}
      style={{ backgroundColor: org.primaryColor }}
    >
      {initials}
    </div>
  );
};

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const roleStyles: Record<string, string> = {
    owner: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    member: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
    viewer: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-500',
  };

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${roleStyles[role] || roleStyles.member}`}>
      {role}
    </span>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({
  onCreateNew,
  onOpenSettings,
  compact = false,
}) => {
  const { currentOrg, userOrganizations, switchOrganization, loading } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle org switch
  const handleSwitch = async (orgId: string) => {
    if (orgId === currentOrg?.id) {
      setIsOpen(false);
      return;
    }
    await switchOrganization(orgId);
    setIsOpen(false);
  };

  if (loading || !currentOrg) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-600" />
          {!compact && <div className="h-4 w-24 bg-slate-200 dark:bg-slate-600 rounded" />}
        </div>
      </div>
    );
  }

  const hasMultipleOrgs = userOrganizations.length > 1;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
          isOpen
            ? 'bg-slate-100 dark:bg-slate-700'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
      >
        <OrgAvatar org={currentOrg} size={compact ? 'sm' : 'md'} />
        {!compact && (
          <>
            <div className="flex-1 text-left min-w-0">
              <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                {currentOrg.name}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {currentOrg.role}
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
            style={{ minWidth: compact ? '240px' : undefined }}
          >
            {/* Current Org Header */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-700">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Current Organization
              </div>
              <div className="flex items-center gap-3">
                <OrgAvatar org={currentOrg} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white truncate">
                    {currentOrg.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <RoleBadge role={currentOrg.role} />
                    {currentOrg.isDefault && (
                      <span className="text-[10px] text-slate-400">Default</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Organization List */}
            {hasMultipleOrgs && (
              <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider px-2 mb-1">
                  Switch Organization
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {userOrganizations
                    .filter((org) => org.id !== currentOrg.id)
                    .map((org) => (
                      <button
                        key={org.id}
                        onClick={() => handleSwitch(org.id)}
                        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <OrgAvatar org={org} size="sm" />
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                            {org.name}
                          </div>
                        </div>
                        <RoleBadge role={org.role} />
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-2">
              {onCreateNew && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onCreateNew();
                  }}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-blue-600 dark:text-blue-400"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Create New Organization</span>
                </button>
              )}
              {onOpenSettings && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-400"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Organization Settings</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrganizationSwitcher;
