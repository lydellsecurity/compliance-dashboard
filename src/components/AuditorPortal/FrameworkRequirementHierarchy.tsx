/**
 * Framework Requirement Hierarchy
 *
 * Displays the official requirement hierarchy for a selected framework.
 * Shows Trust Services Criteria (SOC 2), Annex A Clauses (ISO 27001), etc.
 * Groups requirements by category with expandable sections.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Circle,
  FileText,
  Search,
  Filter,
} from 'lucide-react';
import type { FrameworkId } from '../../constants/controls';
import { FRAMEWORKS } from '../../constants/controls';

// ============================================================================
// TYPES
// ============================================================================

export interface RequirementHierarchyItem {
  id: string;
  clauseId: string;
  title: string;
  description?: string;
  legalText?: string;
  parentId?: string;
  category?: string;
  children?: RequirementHierarchyItem[];
  // Compliance status
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_started';
  mappedControls: string[];
  hasEvidence: boolean;
  evidenceCount: number;
}

export interface RequirementCategory {
  id: string;
  name: string;
  description?: string;
  requirements: RequirementHierarchyItem[];
  totalRequirements: number;
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
}

interface FrameworkRequirementHierarchyProps {
  frameworkId: FrameworkId;
  categories: RequirementCategory[];
  onRequirementSelect: (requirement: RequirementHierarchyItem) => void;
  selectedRequirementId?: string;
}

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

const STATUS_CONFIG = {
  compliant: {
    icon: CheckCircle,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    label: 'Compliant',
  },
  partial: {
    icon: AlertCircle,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    label: 'Partial',
  },
  non_compliant: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    label: 'Non-Compliant',
  },
  not_started: {
    icon: Circle,
    color: 'text-slate-400 dark:text-steel-500',
    bg: 'bg-slate-50 dark:bg-steel-800',
    label: 'Not Started',
  },
};

// ============================================================================
// REQUIREMENT ROW COMPONENT
// ============================================================================

const RequirementRow: React.FC<{
  requirement: RequirementHierarchyItem;
  depth: number;
  isSelected: boolean;
  onSelect: () => void;
  frameworkColor: string;
}> = ({ requirement, depth, isSelected, onSelect, frameworkColor }) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = requirement.children && requirement.children.length > 0;
  const status = STATUS_CONFIG[requirement.status];
  const StatusIcon = status.icon;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`
          flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-steel-700
          cursor-pointer transition-colors
          ${isSelected
            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2'
            : 'hover:bg-slate-50 dark:hover:bg-steel-750 border-l-2 border-l-transparent'
          }
        `}
        style={{
          paddingLeft: `${16 + depth * 24}px`,
          borderLeftColor: isSelected ? frameworkColor : 'transparent',
        }}
        onClick={onSelect}
      >
        {/* Expand/Collapse button */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-steel-300"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}

        {/* Status indicator */}
        <div className={`flex-shrink-0 ${status.color}`}>
          <StatusIcon className="w-5 h-5" />
        </div>

        {/* Clause ID badge */}
        <span
          className="flex-shrink-0 px-2 py-0.5 text-xs font-mono font-medium rounded"
          style={{ backgroundColor: `${frameworkColor}15`, color: frameworkColor }}
        >
          {requirement.clauseId}
        </span>

        {/* Title */}
        <span className="flex-1 text-sm font-medium text-slate-800 dark:text-steel-200 truncate">
          {requirement.title}
        </span>

        {/* Controls count */}
        {requirement.mappedControls.length > 0 && (
          <span className="flex-shrink-0 px-2 py-0.5 text-xs bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-400 rounded">
            {requirement.mappedControls.length} control{requirement.mappedControls.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* Evidence indicator */}
        {requirement.hasEvidence && (
          <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
            <FileText className="w-4 h-4" />
            <span className="text-xs">{requirement.evidenceCount}</span>
          </div>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {requirement.children!.map((child) => (
              <RequirementRow
                key={child.id}
                requirement={child}
                depth={depth + 1}
                isSelected={false}
                onSelect={() => {}}
                frameworkColor={frameworkColor}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ============================================================================
// CATEGORY SECTION COMPONENT
// ============================================================================

const CategorySection: React.FC<{
  category: RequirementCategory;
  frameworkColor: string;
  selectedRequirementId?: string;
  onRequirementSelect: (requirement: RequirementHierarchyItem) => void;
}> = ({ category, frameworkColor, selectedRequirementId, onRequirementSelect }) => {
  const [expanded, setExpanded] = useState(true);
  const completionPercentage = category.totalRequirements > 0
    ? Math.round((category.compliantCount / category.totalRequirements) * 100)
    : 0;

  return (
    <div className="border border-slate-200 dark:border-steel-700 rounded-lg overflow-hidden mb-4">
      {/* Category Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-steel-800 hover:bg-slate-100 dark:hover:bg-steel-750 transition-colors"
      >
        <div className="text-slate-400">
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </div>

        <div className="flex-1 text-left">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {category.name}
          </h3>
          {category.description && (
            <p className="text-xs text-slate-500 dark:text-steel-400 mt-0.5">
              {category.description}
            </p>
          )}
        </div>

        {/* Progress stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {category.compliantCount}
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-600 dark:text-steel-400">
              {category.totalRequirements}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-24 h-2 bg-slate-200 dark:bg-steel-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>

          <span className="text-sm font-medium text-slate-600 dark:text-steel-400 w-10 text-right">
            {completionPercentage}%
          </span>
        </div>
      </button>

      {/* Requirements list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200 dark:border-steel-700"
          >
            {category.requirements.map((requirement) => (
              <RequirementRow
                key={requirement.id}
                requirement={requirement}
                depth={0}
                isSelected={selectedRequirementId === requirement.id}
                onSelect={() => onRequirementSelect(requirement)}
                frameworkColor={frameworkColor}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const FrameworkRequirementHierarchy: React.FC<FrameworkRequirementHierarchyProps> = ({
  frameworkId,
  categories,
  onRequirementSelect,
  selectedRequirementId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'compliant' | 'non_compliant' | 'partial'>('all');

  const framework = FRAMEWORKS.find(f => f.id === frameworkId);
  const frameworkColor = framework?.color || '#6366F1';

  // Filter categories and requirements
  const filteredCategories = useMemo(() => {
    return categories.map(category => {
      const filteredRequirements = category.requirements.filter(req => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch =
            req.clauseId.toLowerCase().includes(query) ||
            req.title.toLowerCase().includes(query) ||
            req.description?.toLowerCase().includes(query);
          if (!matchesSearch) return false;
        }

        // Status filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'non_compliant' && req.status !== 'non_compliant' && req.status !== 'not_started') {
            return false;
          }
          if (statusFilter === 'compliant' && req.status !== 'compliant') {
            return false;
          }
          if (statusFilter === 'partial' && req.status !== 'partial') {
            return false;
          }
        }

        return true;
      });

      return {
        ...category,
        requirements: filteredRequirements,
        totalRequirements: filteredRequirements.length,
        compliantCount: filteredRequirements.filter(r => r.status === 'compliant').length,
        partialCount: filteredRequirements.filter(r => r.status === 'partial').length,
        nonCompliantCount: filteredRequirements.filter(r => r.status === 'non_compliant' || r.status === 'not_started').length,
      };
    }).filter(cat => cat.requirements.length > 0);
  }, [categories, searchQuery, statusFilter]);

  // Overall stats
  const overallStats = useMemo(() => {
    const allRequirements = categories.flatMap(c => c.requirements);
    return {
      total: allRequirements.length,
      compliant: allRequirements.filter(r => r.status === 'compliant').length,
      partial: allRequirements.filter(r => r.status === 'partial').length,
      nonCompliant: allRequirements.filter(r => r.status === 'non_compliant' || r.status === 'not_started').length,
    };
  }, [categories]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with framework info */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: `${frameworkColor}15` }}
            >
              {framework?.icon || '📋'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {framework?.fullName || frameworkId}
              </h2>
              <p className="text-sm text-slate-500 dark:text-steel-400">
                {overallStats.total} requirements • {overallStats.compliant} compliant
              </p>
            </div>
          </div>

          {/* Overall progress */}
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {overallStats.total > 0
                ? Math.round((overallStats.compliant / overallStats.total) * 100)
                : 0}%
            </div>
            <div className="text-xs text-slate-500 dark:text-steel-400">Compliance</div>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search requirements by clause ID or title..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-steel-750 border border-slate-200 dark:border-steel-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 bg-slate-50 dark:bg-steel-750 border border-slate-200 dark:border-steel-600 rounded-lg text-sm text-slate-700 dark:text-steel-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="compliant">Compliant Only</option>
              <option value="partial">Partial Only</option>
              <option value="non_compliant">Gaps Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requirements list */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-slate-300 dark:text-steel-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              No requirements found
            </h3>
            <p className="text-slate-500 dark:text-steel-400">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              frameworkColor={frameworkColor}
              selectedRequirementId={selectedRequirementId}
              onRequirementSelect={onRequirementSelect}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default FrameworkRequirementHierarchy;
