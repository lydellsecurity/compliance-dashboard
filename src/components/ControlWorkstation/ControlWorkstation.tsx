/**
 * Control Workstation
 *
 * The main Control-Centric Unified Assessment Engine.
 * Features:
 * - Master sidebar grouped by functional domains
 * - Central control cards with framework coverage pills
 * - Real-time progress tracking with Master Progress Ring
 * - 3-phase assessment workflow
 * - Integrated with existing Supabase user_responses
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutGrid,
  List,
  ChevronDown,
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Clock,
  PanelTopClose,
  PanelTopOpen,
} from 'lucide-react';
import type { FrameworkId } from '../../constants/controls';
import {
  useControlMapping,
  type ControlStatus,
} from '../../services/control-mapping-engine';
import DomainSidebar from './DomainSidebar';
import ControlCard from './ControlCard';
import MasterProgressRing from './MasterProgressRing';

// ============================================================================
// TYPES
// ============================================================================

type AssessmentAnswer = 'yes' | 'no' | 'partial' | 'na' | null;

interface ControlWorkstationProps {
  // User responses from compliance context
  getResponse: (controlId: string) => { answer: AssessmentAnswer; answeredAt?: string } | undefined;
  // Evidence data
  getEvidenceCount: (controlId: string) => { evidenceCount: number; fileCount: number; hasFiles: boolean } | undefined;
  // Callbacks
  onAnswerChange: (controlId: string, answer: AssessmentAnswer) => void;
  onGeneratePolicy: (controlId: string) => Promise<void>;
  onGenerateAIPolicy: (controlId: string) => Promise<void>;
  onUploadEvidence: (controlId: string, files: File[]) => void;
  onLinkEvidence: (controlId: string, url: string, description: string) => void;
  onViewEvidence: (controlId: string) => void;
  onViewFramework?: (frameworkId: FrameworkId) => void;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'implemented' | 'in-progress' | 'not-started' | 'needs-evidence' | 'critical';

// ============================================================================
// FILTER OPTIONS
// ============================================================================

const FILTER_OPTIONS: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Controls', icon: <LayoutGrid className="w-4 h-4" /> },
  { value: 'implemented', label: 'Implemented', icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> },
  { value: 'in-progress', label: 'In Progress', icon: <Clock className="w-4 h-4 text-amber-500" /> },
  { value: 'not-started', label: 'Not Started', icon: <AlertTriangle className="w-4 h-4 text-slate-400" /> },
  { value: 'needs-evidence', label: 'Needs Evidence', icon: <Sparkles className="w-4 h-4 text-violet-500" /> },
  { value: 'critical', label: 'Critical Priority', icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ControlWorkstation: React.FC<ControlWorkstationProps> = ({
  getResponse,
  getEvidenceCount,
  onAnswerChange,
  onGenerateAIPolicy,
  onGeneratePolicy,
  onUploadEvidence,
  onLinkEvidence,
  onViewEvidence,
  onViewFramework,
}) => {
  // Control mapping engine
  const mapping = useControlMapping();

  // Local state
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedFramework, setSelectedFramework] = useState<FrameworkId | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedControlId, setExpandedControlId] = useState<string | null>(null);
  const [isStatusPaneCollapsed, setIsStatusPaneCollapsed] = useState(false);

  // Get all data
  const allControls = mapping.getAllControls();
  const allDomains = mapping.getAllDomains();
  const allFrameworks = mapping.getAllFrameworks();

  // Build control statuses map for the mapping engine
  const controlStatuses = useMemo(() => {
    const statusMap = new Map<string, ControlStatus>();
    for (const control of allControls) {
      const response = getResponse(control.id);
      const evidence = getEvidenceCount(control.id);
      statusMap.set(control.id, {
        controlId: control.id,
        status: response?.answer === 'yes' ? 'implemented'
          : response?.answer === 'partial' ? 'in_progress'
            : response?.answer === 'no' ? 'not_started'
              : 'not_started',
        answer: response?.answer,
        hasEvidence: evidence?.hasFiles || false,
        lastUpdated: response?.answeredAt,
      });
    }
    return statusMap;
  }, [allControls, getResponse, getEvidenceCount]);

  // Calculate domain progress
  const domainProgress = useMemo(() => {
    return allDomains.map(domain => {
      const domainControls = allControls.filter(c => c.domain === domain.id);
      const implementedCount = domainControls.filter(c => {
        const status = controlStatuses.get(c.id);
        return status?.answer === 'yes';
      }).length;

      return {
        domainId: domain.id,
        totalControls: domainControls.length,
        implementedCount,
        percentage: domainControls.length > 0
          ? Math.round((implementedCount / domainControls.length) * 100)
          : 0,
      };
    });
  }, [allDomains, allControls, controlStatuses]);

  // Global stats for progress ring
  const globalStats = useMemo(() => {
    return mapping.getGlobalStats(controlStatuses);
  }, [mapping, controlStatuses]);

  // Filter controls
  const filteredControls = useMemo(() => {
    let controls = allControls;

    // Filter by domain
    if (activeDomain) {
      controls = controls.filter(c => c.domain === activeDomain);
    }

    // Filter by framework
    if (selectedFramework !== 'all') {
      controls = controls.filter(c =>
        c.frameworkMappings.some(m => m.frameworkId === selectedFramework)
      );
    }

    // Filter by status
    if (filterType !== 'all') {
      controls = controls.filter(c => {
        const status = controlStatuses.get(c.id);
        switch (filterType) {
          case 'implemented':
            return status?.answer === 'yes';
          case 'in-progress':
            return status?.answer === 'partial';
          case 'not-started':
            return status?.answer === 'no' || !status?.answer || status?.answer === null;
          case 'needs-evidence':
            return status?.answer === 'yes' && !status?.hasEvidence;
          case 'critical':
            return c.riskLevel === 'critical' && status?.answer !== 'yes';
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      controls = controls.filter(c =>
        c.id.toLowerCase().includes(query) ||
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.keywords.some(k => k.toLowerCase().includes(query))
      );
    }

    return controls;
  }, [allControls, activeDomain, selectedFramework, filterType, searchQuery, controlStatuses]);

  // Filter counts for badges
  const filterCounts = useMemo(() => {
    return {
      all: allControls.length,
      implemented: allControls.filter(c => controlStatuses.get(c.id)?.answer === 'yes').length,
      'in-progress': allControls.filter(c => controlStatuses.get(c.id)?.answer === 'partial').length,
      'not-started': allControls.filter(c => {
        const s = controlStatuses.get(c.id);
        return s?.answer === 'no' || !s?.answer;
      }).length,
      'needs-evidence': allControls.filter(c => {
        const s = controlStatuses.get(c.id);
        return s?.answer === 'yes' && !s?.hasEvidence;
      }).length,
      critical: allControls.filter(c => {
        const s = controlStatuses.get(c.id);
        return c.riskLevel === 'critical' && s?.answer !== 'yes';
      }).length,
    };
  }, [allControls, controlStatuses]);

  const handleToggleExpand = useCallback((controlId: string) => {
    setExpandedControlId(prev => prev === controlId ? null : controlId);
  }, []);

  return (
    <div className="flex h-full bg-slate-50 dark:bg-steel-900">
      {/* Domain Sidebar */}
      <DomainSidebar
        domains={allDomains}
        domainProgress={domainProgress}
        activeDomain={activeDomain}
        onSelectDomain={setActiveDomain}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Progress Ring */}
        <div className="bg-white dark:bg-steel-800 border-b border-slate-200 dark:border-steel-700">
          {/* Collapsible Status Pane */}
          <AnimatePresence mode="wait">
            {!isStatusPaneCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-6 py-4">
                  <div className="flex items-start gap-6">
                    {/* Master Progress Ring */}
                    <MasterProgressRing
                      percentage={globalStats.overallPercentage}
                      totalControls={globalStats.totalControls}
                      implementedControls={globalStats.implementedControls}
                      inProgressControls={globalStats.inProgressControls}
                      frameworkStats={globalStats.frameworkStats}
                      className="flex-shrink-0"
                    />

                    {/* Search & Filters */}
                    <div className="flex-1 space-y-4">
                      {/* Search bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search controls by ID, title, or keyword..."
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-steel-750 border border-slate-200 dark:border-steel-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Filter bar */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Quick filters */}
                        {FILTER_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setFilterType(option.value)}
                            className={`
                              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                              ${filterType === option.value
                                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                : 'bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-400 hover:bg-slate-200 dark:hover:bg-steel-600'
                              }
                            `}
                          >
                            {option.icon}
                            {option.label}
                            <span className={`
                              px-1.5 py-0.5 text-xs rounded-full
                              ${filterType === option.value
                                ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200'
                                : 'bg-slate-200 dark:bg-steel-600 text-slate-500 dark:text-steel-400'
                              }
                            `}>
                              {filterCounts[option.value]}
                            </span>
                          </button>
                        ))}

                        {/* Framework filter */}
                        <div className="relative ml-auto">
                          <select
                            value={selectedFramework}
                            onChange={(e) => setSelectedFramework(e.target.value as FrameworkId | 'all')}
                            className="appearance-none pl-3 pr-8 py-1.5 bg-white dark:bg-steel-800 border border-slate-200 dark:border-steel-600 rounded-lg text-sm text-slate-700 dark:text-steel-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="all">All Frameworks</option>
                            {allFrameworks.map(fw => (
                              <option key={fw.id} value={fw.id}>{fw.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        {/* View toggle */}
                        <div className="flex items-center bg-slate-100 dark:bg-steel-700 rounded-lg p-1">
                          <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-steel-600 shadow-sm' : ''}`}
                          >
                            <List className="w-4 h-4 text-slate-600 dark:text-steel-300" />
                          </button>
                          <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-steel-600 shadow-sm' : ''}`}
                          >
                            <LayoutGrid className="w-4 h-4 text-slate-600 dark:text-steel-300" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsed state: Compact search bar + toggle */}
          <div className={`px-6 ${isStatusPaneCollapsed ? 'py-3' : 'pb-3'} flex items-center gap-4`}>
            {/* Toggle button */}
            <button
              onClick={() => setIsStatusPaneCollapsed(!isStatusPaneCollapsed)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                ${isStatusPaneCollapsed
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
                  : 'bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-400 hover:bg-slate-200 dark:hover:bg-steel-600'
                }
              `}
            >
              {isStatusPaneCollapsed ? (
                <>
                  <PanelTopOpen className="w-4 h-4" />
                  Show Status
                </>
              ) : (
                <>
                  <PanelTopClose className="w-4 h-4" />
                  Hide Status
                </>
              )}
            </button>

            {/* Compact search when collapsed */}
            {isStatusPaneCollapsed && (
              <div className="flex-1 flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search controls..."
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-steel-750 border border-slate-200 dark:border-steel-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Quick status badge */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                    {globalStats.overallPercentage}% Compliant
                  </span>
                  <span className="text-slate-500 dark:text-steel-400">
                    {globalStats.implementedControls}/{globalStats.totalControls} controls
                  </span>
                </div>

                {/* Framework filter */}
                <div className="relative">
                  <select
                    value={selectedFramework}
                    onChange={(e) => setSelectedFramework(e.target.value as FrameworkId | 'all')}
                    className="appearance-none pl-3 pr-7 py-1.5 bg-white dark:bg-steel-800 border border-slate-200 dark:border-steel-600 rounded-lg text-xs text-slate-700 dark:text-steel-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Frameworks</option>
                    {allFrameworks.map(fw => (
                      <option key={fw.id} value={fw.id}>{fw.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>

                {/* View toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-steel-700 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1 rounded ${viewMode === 'list' ? 'bg-white dark:bg-steel-600 shadow-sm' : ''}`}
                  >
                    <List className="w-3.5 h-3.5 text-slate-600 dark:text-steel-300" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-steel-600 shadow-sm' : ''}`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-slate-600 dark:text-steel-300" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Control List */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Results count */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-steel-400">
              Showing <span className="font-semibold text-slate-900 dark:text-white">{filteredControls.length}</span> of {allControls.length} controls
              {activeDomain && (
                <span> in <span className="font-semibold">{allDomains.find(d => d.id === activeDomain)?.title}</span></span>
              )}
            </p>
          </div>

          {/* Controls grid/list */}
          {filteredControls.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-slate-300 dark:text-steel-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No controls found
              </h3>
              <p className="text-slate-500 dark:text-steel-400">
                Try adjusting your filters or search query
              </p>
            </div>
          ) : (
            <div className={`
              ${viewMode === 'grid' ? 'grid grid-cols-1 xl:grid-cols-2 gap-4' : 'space-y-4'}
            `}>
              <AnimatePresence mode="popLayout">
                {filteredControls.map((control, index) => {
                  const requirements = mapping.getSatisfiedRequirements(control.id);
                  const response = getResponse(control.id);
                  const evidence = getEvidenceCount(control.id);

                  return (
                    <motion.div
                      key={control.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <ControlCard
                        control={control}
                        requirements={requirements}
                        currentAnswer={response?.answer || null}
                        hasEvidence={evidence?.hasFiles || false}
                        evidenceCount={evidence?.fileCount || 0}
                        onAnswerChange={onAnswerChange}
                        onGeneratePolicy={onGeneratePolicy}
                        onGenerateAIPolicy={onGenerateAIPolicy}
                        onUploadEvidence={onUploadEvidence}
                        onLinkEvidence={onLinkEvidence}
                        onViewEvidence={onViewEvidence}
                        onViewFramework={onViewFramework}
                        isExpanded={expandedControlId === control.id}
                        onToggleExpand={() => handleToggleExpand(control.id)}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlWorkstation;
