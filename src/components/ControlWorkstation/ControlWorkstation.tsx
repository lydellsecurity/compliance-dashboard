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

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
  WifiOff,
  Keyboard,
  CheckSquare,
  Square,
} from 'lucide-react';
import type { FrameworkId } from '../../constants/controls';
import {
  useControlMapping,
  type ControlStatus,
} from '../../services/control-mapping-engine';
import DomainSidebar from './DomainSidebar';
import ControlCard from './ControlCard';
import MasterProgressRing from './MasterProgressRing';
import { CardSkeleton } from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';

// ============================================================================
// TYPES
// ============================================================================

type AssessmentAnswer = 'yes' | 'no' | 'partial' | 'na' | null;

interface ControlWorkstationProps {
  // User responses from compliance context
  getResponse: (controlId: string) => { answer: AssessmentAnswer; answeredAt?: string; lastReviewedAt?: string } | undefined;
  // Evidence data
  getEvidenceCount: (controlId: string) => { evidenceCount: number; fileCount: number; hasFiles: boolean } | undefined;
  // True when the "yes" answer has real evidence backing it.
  isEvidenceVerified?: (controlId: string) => boolean;
  /** True when the compliance hook is still loading from Supabase. */
  isLoading?: boolean;
  /** True when the browser is online (drives offline banner). */
  isOnline?: boolean;
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
  isEvidenceVerified,
  isLoading = false,
  isOnline = true,
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

  // Keyboard-navigation focus cursor. Tracks which control in the filtered
  // list is "current" for j/k navigation and y/n/p/a answer shortcuts.
  const [focusedControlId, setFocusedControlId] = useState<string | null>(null);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Bulk-selection state. `selectionMode` flips the cards into checkbox mode
  // and surfaces a bulk toolbar; `selectedIds` holds the current selection.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [pendingBulkAnswer, setPendingBulkAnswer] = useState<AssessmentAnswer>(null);

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

  // Keep the keyboard cursor in sync with the filtered list. If the user
  // changes filters and the currently-focused control falls out of the
  // list, jump back to the first visible item.
  useEffect(() => {
    if (filteredControls.length === 0) {
      setFocusedControlId(null);
      return;
    }
    if (!focusedControlId || !filteredControls.some(c => c.id === focusedControlId)) {
      setFocusedControlId(filteredControls[0].id);
    }
  }, [filteredControls, focusedControlId]);

  // Selection helpers.
  const toggleSelected = useCallback((controlId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(controlId)) next.delete(controlId);
      else next.add(controlId);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(filteredControls.map(c => c.id)));
  }, [filteredControls]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const applyBulkAnswer = useCallback((answer: AssessmentAnswer) => {
    if (!answer || selectedIds.size === 0) return;
    // Fire the same callback the single-card path uses. The compliance
    // hook handles evidence, sync notifications, and timestamps per control.
    selectedIds.forEach(id => onAnswerChange(id, answer));
    setPendingBulkAnswer(null);
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds, onAnswerChange]);

  // Global keyboard shortcuts. We listen on `window` and bail out when the
  // user is typing in an input/textarea/contentEditable so shortcut keys
  // don't clobber search or free-text fields.
  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      // Allow "/" to focus search even from anywhere; Esc to blur.
      if (e.key === '/' && !isEditable(e.target) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === 'Escape') {
        if (showShortcutHelp) {
          setShowShortcutHelp(false);
          return;
        }
        if (selectionMode) {
          setSelectionMode(false);
          clearSelection();
          return;
        }
        if (expandedControlId) {
          setExpandedControlId(null);
          return;
        }
      }
      if (isEditable(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const idx = focusedControlId ? filteredControls.findIndex(c => c.id === focusedControlId) : -1;
      switch (e.key) {
        case '?': {
          e.preventDefault();
          setShowShortcutHelp(s => !s);
          break;
        }
        case 'j':
        case 'ArrowDown': {
          if (filteredControls.length === 0) break;
          e.preventDefault();
          const next = idx < 0 ? 0 : Math.min(idx + 1, filteredControls.length - 1);
          setFocusedControlId(filteredControls[next].id);
          break;
        }
        case 'k':
        case 'ArrowUp': {
          if (filteredControls.length === 0) break;
          e.preventDefault();
          const prev = idx < 0 ? 0 : Math.max(idx - 1, 0);
          setFocusedControlId(filteredControls[prev].id);
          break;
        }
        case 'Enter': {
          if (focusedControlId) {
            e.preventDefault();
            handleToggleExpand(focusedControlId);
          }
          break;
        }
        case 'x': {
          // Select / deselect the focused control when in bulk mode.
          if (selectionMode && focusedControlId) {
            e.preventDefault();
            toggleSelected(focusedControlId);
          }
          break;
        }
        case 'y':
        case 'n':
        case 'p':
        case 'a': {
          if (!focusedControlId) break;
          e.preventDefault();
          const map: Record<string, AssessmentAnswer> = {
            y: 'yes', n: 'no', p: 'partial', a: 'na',
          };
          const answer = map[e.key];
          if (!answer) break;
          if (selectionMode && selectedIds.size > 0) {
            // Shortcut from within bulk mode → confirm bulk answer.
            setPendingBulkAnswer(answer);
          } else {
            onAnswerChange(focusedControlId, answer);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    filteredControls,
    focusedControlId,
    expandedControlId,
    selectionMode,
    selectedIds,
    showShortcutHelp,
    handleToggleExpand,
    toggleSelected,
    onAnswerChange,
    clearSelection,
  ]);

  // Scroll the focused card into view when j/k moves the cursor.
  useEffect(() => {
    if (!focusedControlId) return;
    const el = document.querySelector(`[data-control-id="${focusedControlId}"]`);
    if (el && 'scrollIntoView' in el) {
      (el as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedControlId]);

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
        {/* Offline banner — your changes are saved locally and will sync
            when the network comes back. Render BEFORE the header so the
            status ring isn't hidden when offline. */}
        {!isOnline && (
          <div
            role="alert"
            aria-live="polite"
            className="flex items-center gap-2 px-6 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm"
          >
            <WifiOff className="w-4 h-4" aria-hidden="true" />
            <span className="font-medium">Offline</span>
            <span className="text-amber-700 dark:text-amber-300">
              — changes save locally and will sync when you reconnect.
            </span>
          </div>
        )}

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
                          ref={searchInputRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder='Search controls — press "/" to focus, "?" for shortcuts'
                          aria-label="Search controls"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-steel-750 border border-slate-200 dark:border-steel-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            aria-label="Clear search"
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
        <div className="flex-1 overflow-y-auto scrollbar-slim p-6">
          {/* Results count + selection mode + keyboard help */}
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-slate-600 dark:text-steel-400">
              Showing <span className="font-semibold text-slate-900 dark:text-white">{filteredControls.length}</span> of {allControls.length} controls
              {activeDomain && (
                <span> in <span className="font-semibold">{allDomains.find(d => d.id === activeDomain)?.title}</span></span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectionMode(sm => {
                    if (sm) clearSelection();
                    return !sm;
                  });
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectionMode
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-400 hover:bg-slate-200 dark:hover:bg-steel-600'
                }`}
                aria-pressed={selectionMode}
                aria-label={selectionMode ? 'Exit selection mode' : 'Enter bulk-select mode'}
                title={selectionMode ? 'Exit selection mode (Esc)' : 'Bulk-select controls'}
              >
                {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                {selectionMode ? 'Selecting' : 'Bulk select'}
              </button>
              <button
                onClick={() => setShowShortcutHelp(s => !s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-400 hover:bg-slate-200 dark:hover:bg-steel-600"
                aria-label="Show keyboard shortcuts (?)"
                title="Keyboard shortcuts (press ?)"
              >
                <Keyboard className="w-4 h-4" />
                Shortcuts
              </button>
            </div>
          </div>

          {/* Bulk action bar — visible only while in selection mode. Uses
              role="toolbar" + aria-label so screen readers announce the
              action group, not a generic div. */}
          {selectionMode && (
            <div
              role="toolbar"
              aria-label="Bulk actions"
              className="mb-4 flex items-center gap-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg flex-wrap"
            >
              <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                {selectedIds.size} selected
              </span>
              <button
                onClick={selectAllVisible}
                className="text-sm px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
              >
                Select all visible ({filteredControls.length})
              </button>
              <button
                onClick={clearSelection}
                disabled={selectedIds.size === 0}
                className="text-sm px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-indigo-700 dark:text-indigo-300">Mark as:</span>
                {(['yes', 'partial', 'no', 'na'] as const).map(ans => (
                  <button
                    key={ans}
                    onClick={() => setPendingBulkAnswer(ans)}
                    disabled={selectedIds.size === 0}
                    className="text-xs font-medium px-2.5 py-1 rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-steel-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {ans === 'yes' ? 'Implemented' : ans === 'partial' ? 'In Progress' : ans === 'no' ? 'Not Started' : 'N/A'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Controls grid/list. Loading skeletons first, then empty state,
              then the live list. `isLoading` comes from the compliance hook
              so the workstation shows real shimmer instead of a flash of
              "no controls" while Supabase is in-flight. */}
          {isLoading && filteredControls.length === 0 ? (
            <div
              aria-live="polite"
              aria-busy="true"
              className={viewMode === 'grid' ? 'grid grid-cols-1 xl:grid-cols-2 gap-4' : 'space-y-4'}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} lines={3} />
              ))}
            </div>
          ) : filteredControls.length === 0 ? (
            allControls.length === 0 ? (
              <EmptyState
                type="controls"
                title="No controls yet"
                description="Your control library is empty. Add a custom control or wait for the default framework library to load."
              />
            ) : (
              <EmptyState
                type="generic"
                title="No matches"
                description="No controls match the current filters. Try clearing the search or switching framework."
                action={{
                  label: 'Clear filters',
                  icon: <X className="w-4 h-4" />,
                  onClick: () => {
                    setSearchQuery('');
                    setFilterType('all');
                    setSelectedFramework('all');
                  },
                }}
              />
            )
          ) : (
            <div className={`
              ${viewMode === 'grid' ? 'grid grid-cols-1 xl:grid-cols-2 gap-4' : 'space-y-4'}
            `}>
              <AnimatePresence mode="popLayout">
                {filteredControls.map((control, index) => {
                  const requirements = mapping.getSatisfiedRequirements(control.id);
                  const response = getResponse(control.id);
                  const evidence = getEvidenceCount(control.id);

                  const isFocused = focusedControlId === control.id;
                  const isSelected = selectedIds.has(control.id);
                  return (
                    <motion.div
                      key={control.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: Math.min(index, 10) * 0.02 }}
                      data-control-id={control.id}
                      onClick={() => setFocusedControlId(control.id)}
                      // Focus ring + selection ring. Applied via outline so
                      // the card's own border radius is preserved.
                      className={`
                        rounded-xl
                        ${isFocused ? 'outline outline-2 outline-indigo-500 outline-offset-2' : ''}
                        ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-steel-900' : ''}
                      `}
                      // Large lists get a browser-native render optimization:
                      // content outside the viewport is skipped in layout/paint.
                      // Estimated size matches a collapsed card for stable
                      // scrollbars. Expanded cards still render fully.
                      style={{ contentVisibility: 'auto', containIntrinsicSize: '220px' } as React.CSSProperties}
                    >
                      <div className="flex items-start gap-3">
                        {selectionMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelected(control.id);
                            }}
                            aria-pressed={isSelected}
                            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${control.title}`}
                            className="mt-5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                              border-indigo-400 hover:border-indigo-600 dark:border-indigo-500 dark:hover:border-indigo-400
                              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                            "
                            style={isSelected ? { backgroundColor: '#6366f1', borderColor: '#6366f1' } : undefined}
                          >
                            {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                          </button>
                        )}
                        <div className="flex-1 min-w-0">
                          <ControlCard
                            control={control}
                            requirements={requirements}
                            currentAnswer={response?.answer || null}
                            hasEvidence={evidence?.hasFiles || false}
                            evidenceCount={evidence?.fileCount || 0}
                            lastReviewedAt={response?.lastReviewedAt ?? response?.answeredAt ?? null}
                            isVerified={isEvidenceVerified?.(control.id) ?? (evidence?.hasFiles || false)}
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
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Bulk-answer confirmation. Uses a dialog role so assistive tech
          announces it and Escape dismisses via the global keydown handler. */}
      <AnimatePresence>
        {pendingBulkAnswer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setPendingBulkAnswer(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-confirm-title"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-steel-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <h3 id="bulk-confirm-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                      Mark {selectedIds.size} control{selectedIds.size === 1 ? '' : 's'} as{' '}
                      {pendingBulkAnswer === 'yes' ? 'Implemented' :
                        pendingBulkAnswer === 'partial' ? 'In Progress' :
                          pendingBulkAnswer === 'no' ? 'Not Started' : 'Not Applicable'}?
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-steel-400 mt-1">
                      This will overwrite existing answers for the selected controls. Evidence records are preserved when possible — placeholder (empty) evidence is cleaned up automatically.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setPendingBulkAnswer(null)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-steel-300 bg-slate-100 dark:bg-steel-700 rounded-lg hover:bg-slate-200 dark:hover:bg-steel-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => applyBulkAnswer(pendingBulkAnswer)}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    autoFocus
                  >
                    Apply to {selectedIds.size}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcut cheat sheet. Opens with "?" / the Shortcuts button
          and closes on Escape. Kept minimal — every shortcut shown has a
          global handler registered in the keydown effect above. */}
      <AnimatePresence>
        {showShortcutHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowShortcutHelp(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcut-help-title"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-steel-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-steel-700">
                <h3 id="shortcut-help-title" className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Keyboard className="w-5 h-5" aria-hidden="true" />
                  Keyboard shortcuts
                </h3>
                <button
                  onClick={() => setShowShortcutHelp(false)}
                  aria-label="Close"
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-steel-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 text-sm">
                <ShortcutSection title="Navigation">
                  <Shortcut keys={['j', '↓']} desc="Next control" />
                  <Shortcut keys={['k', '↑']} desc="Previous control" />
                  <Shortcut keys={['Enter']} desc="Expand/collapse focused control" />
                  <Shortcut keys={['/']} desc="Focus search" />
                  <Shortcut keys={['Esc']} desc="Close overlay / exit mode" />
                </ShortcutSection>
                <ShortcutSection title="Answer focused control">
                  <Shortcut keys={['y']} desc="Implemented" />
                  <Shortcut keys={['p']} desc="In Progress (partial)" />
                  <Shortcut keys={['n']} desc="Not Started" />
                  <Shortcut keys={['a']} desc="Not Applicable" />
                </ShortcutSection>
                <ShortcutSection title="Bulk selection">
                  <Shortcut keys={['x']} desc="Toggle selection on focused control" />
                  <Shortcut keys={['y', 'n', 'p', 'a']} desc="Bulk-apply (confirms first)" />
                </ShortcutSection>
                <ShortcutSection title="Help">
                  <Shortcut keys={['?']} desc="Show this help" />
                </ShortcutSection>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ShortcutSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-steel-400 mb-2">{title}</h4>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const Shortcut: React.FC<{ keys: string[]; desc: string }> = ({ keys, desc }) => (
  <div className="flex items-center justify-between">
    <span className="text-slate-600 dark:text-steel-400">{desc}</span>
    <span className="flex items-center gap-1">
      {keys.map((k, i) => (
        <React.Fragment key={k}>
          {i > 0 && <span className="text-slate-400 text-xs">/</span>}
          <kbd className="px-2 py-0.5 text-xs font-mono font-medium rounded border border-slate-300 dark:border-steel-600 bg-slate-50 dark:bg-steel-900 text-slate-700 dark:text-steel-300">
            {k}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  </div>
);

export default ControlWorkstation;
