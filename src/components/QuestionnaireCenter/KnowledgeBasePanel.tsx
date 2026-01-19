/**
 * Knowledge Base Panel
 *
 * Displays the aggregated compliance data that powers AI answers:
 * - Compliant controls with implementation status
 * - Evidence descriptions
 * - Active frameworks
 * - Searchable context for questionnaire responses
 */

import React, { useState, useMemo } from 'react';
import {
  Database,
  Shield,
  CheckCircle2,
  FileText,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Target,
  AlertCircle,
  Zap,
} from 'lucide-react';
import type { KnowledgeBaseContext } from './index';

// ============================================================================
// TYPES
// ============================================================================

interface KnowledgeBasePanelProps {
  knowledgeBase: KnowledgeBaseContext | null;
  isLoading: boolean;
  onRefresh: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

const KnowledgeBasePanel: React.FC<KnowledgeBasePanelProps> = ({
  knowledgeBase,
  isLoading,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'controls' | 'evidence' | 'frameworks'>('controls');

  // Group controls by domain
  const controlsByDomain = useMemo(() => {
    if (!knowledgeBase) return {};

    const grouped: Record<string, typeof knowledgeBase.compliantControls> = {};
    knowledgeBase.compliantControls.forEach(control => {
      if (!grouped[control.domain]) {
        grouped[control.domain] = [];
      }
      grouped[control.domain].push(control);
    });
    return grouped;
  }, [knowledgeBase]);

  // Note: Filtering is done inline in the expanded domain view
  // This keeps the search term reactive and filters controls as user types

  // Filter evidence by search
  const filteredEvidence = useMemo(() => {
    if (!knowledgeBase || !searchTerm) return knowledgeBase?.evidenceItems || [];

    return knowledgeBase.evidenceItems.filter(item =>
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.controlId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [knowledgeBase, searchTerm]);

  const toggleDomain = (domain: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-midnight-900 rounded-2xl border border-slate-200 dark:border-steel-700 p-12 text-center">
        <RefreshCw className="w-12 h-12 text-violet-500 mx-auto mb-4 animate-spin" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100 mb-2">Building Knowledge Base</h3>
        <p className="text-slate-500 dark:text-steel-400">Aggregating compliance data for AI context...</p>
      </div>
    );
  }

  if (!knowledgeBase) {
    return (
      <div className="bg-white dark:bg-midnight-900 rounded-2xl border border-slate-200 dark:border-steel-700 p-12 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100 mb-2">Knowledge Base Unavailable</h3>
        <p className="text-slate-500 dark:text-steel-400 mb-4">Unable to build knowledge base from compliance data</p>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 inline-block mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-steel-100">{knowledgeBase.totalCompliant}</p>
              <p className="text-sm text-slate-500 dark:text-steel-400 dark:text-steel-400">Compliant Controls</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-steel-100">{knowledgeBase.totalWithEvidence}</p>
              <p className="text-sm text-slate-500 dark:text-steel-400 dark:text-steel-400">Evidence Items</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-steel-100">{knowledgeBase.frameworks.length}</p>
              <p className="text-sm text-slate-500 dark:text-steel-400 dark:text-steel-400">Active Frameworks</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-midnight-900 rounded-xl border border-slate-200 dark:border-steel-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Database className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-steel-100">{Object.keys(controlsByDomain).length}</p>
              <p className="text-sm text-slate-500 dark:text-steel-400 dark:text-steel-400">Security Domains</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-white dark:bg-midnight-900 rounded-2xl border border-slate-200 dark:border-steel-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-steel-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-steel-100">Knowledge Base</h3>
              <p className="text-sm text-slate-500 dark:text-steel-400 dark:text-steel-400">AI context for questionnaire responses</p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            className="p-2 text-slate-400 dark:text-steel-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 dark:border-steel-700 dark:border-steel-700 bg-slate-50 dark:bg-midnight-800">
          <button
            onClick={() => setActiveTab('controls')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'controls'
                ? 'bg-white dark:bg-midnight-900 text-violet-700 dark:text-violet-400 shadow-sm'
                : 'text-slate-600 dark:text-steel-300 hover:bg-white/50 dark:hover:bg-steel-800'
            }`}
          >
            <Shield className="w-4 h-4 inline-block mr-1.5" />
            Controls ({knowledgeBase.totalCompliant})
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'evidence'
                ? 'bg-white dark:bg-midnight-900 text-violet-700 dark:text-violet-400 shadow-sm'
                : 'text-slate-600 dark:text-steel-300 hover:bg-white/50 dark:hover:bg-steel-800'
            }`}
          >
            <FileText className="w-4 h-4 inline-block mr-1.5" />
            Evidence ({knowledgeBase.totalWithEvidence})
          </button>
          <button
            onClick={() => setActiveTab('frameworks')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'frameworks'
                ? 'bg-white dark:bg-midnight-900 text-violet-700 dark:text-violet-400 shadow-sm'
                : 'text-slate-600 dark:text-steel-300 hover:bg-white/50 dark:hover:bg-steel-800'
            }`}
          >
            <Target className="w-4 h-4 inline-block mr-1.5" />
            Frameworks ({knowledgeBase.frameworks.length})
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-steel-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-steel-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-midnight-900 text-slate-900 dark:text-steel-100"
            />
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[600px] overflow-y-auto">
          {activeTab === 'controls' && (
            <div className="divide-y divide-slate-100 dark:divide-steel-700">
              {Object.entries(controlsByDomain).map(([domain, controls]) => (
                <div key={domain}>
                  <button
                    onClick={() => toggleDomain(domain)}
                    className="w-full flex items-center justify-between px-6 py-3 hover:bg-slate-50 dark:hover:bg-steel-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedDomains.has(domain) ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="font-medium text-slate-900 dark:text-steel-100 dark:text-steel-100">{domain}</span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-300 rounded-full text-xs">
                        {controls.length} controls
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-emerald-600">
                        {controls.filter(c => c.answer === 'yes').length} compliant
                      </span>
                      <span className="text-sm text-amber-600">
                        {controls.filter(c => c.answer === 'partial').length} partial
                      </span>
                    </div>
                  </button>

                  {expandedDomains.has(domain) && (
                    <div className="bg-slate-50 dark:bg-midnight-800 border-t border-slate-100 dark:border-steel-700">
                      {controls
                        .filter(c =>
                          !searchTerm ||
                          c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.id.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map(control => (
                          <div
                            key={control.id}
                            className="flex items-start gap-3 px-6 py-3 pl-12 border-b border-slate-100 dark:border-steel-700 last:border-b-0"
                          >
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                control.answer === 'yes'
                                  ? 'bg-emerald-100'
                                  : 'bg-amber-100'
                              }`}
                            >
                              <CheckCircle2
                                className={`w-3.5 h-3.5 ${
                                  control.answer === 'yes'
                                    ? 'text-emerald-600'
                                    : 'text-amber-600'
                                }`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-500 dark:text-steel-400 dark:text-steel-400">
                                  {control.id}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-xs ${
                                    control.answer === 'yes'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}
                                >
                                  {control.answer === 'yes' ? 'Compliant' : 'Partial'}
                                </span>
                              </div>
                              <p className="text-sm text-slate-900 dark:text-steel-100 dark:text-steel-100 mt-0.5">{control.title}</p>
                              {control.evidence && (
                                <p className="text-xs text-slate-500 dark:text-steel-400 dark:text-steel-400 dark:text-steel-400 mt-1 line-clamp-2">
                                  {control.evidence}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}

              {Object.keys(controlsByDomain).length === 0 && (
                <div className="py-12 text-center">
                  <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-steel-400">No compliant controls found</p>
                  <p className="text-sm text-slate-400 dark:text-steel-500 mt-1">
                    Complete control assessments to build your knowledge base
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'evidence' && (
            <div className="divide-y divide-slate-100 dark:divide-steel-700">
              {filteredEvidence.length > 0 ? (
                filteredEvidence.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 px-6 py-4 dark:hover:bg-steel-800">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500 dark:text-steel-400 dark:text-steel-400">{item.controlId}</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-300 rounded text-xs">
                          {item.type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-900 dark:text-steel-100">{item.description}</p>
                      {item.fileName && (
                        <p className="text-xs text-slate-500 dark:text-steel-400 dark:text-steel-400 mt-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {item.fileName}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-steel-400">No evidence items found</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'frameworks' && (
            <div className="p-6">
              {knowledgeBase.frameworks.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {knowledgeBase.frameworks.map(framework => (
                    <div
                      key={framework}
                      className="p-4 bg-violet-50 border border-violet-200 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                          <Target className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-steel-100 dark:text-steel-100">{framework}</p>
                          <p className="text-xs text-slate-500 dark:text-steel-400 dark:text-steel-400">Active Framework</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-steel-400">No active frameworks</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-violet-900 dark:text-violet-300">How the Knowledge Base Works</h4>
            <p className="text-sm text-violet-700 dark:text-violet-400 mt-1">
              The AI uses your compliant controls, evidence descriptions, and framework mappings to
              generate accurate questionnaire responses. Controls marked as &quot;Compliant&quot; or
              &quot;Partial&quot; are included in the context. The more complete your compliance data,
              the more accurate the AI suggestions will be.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBasePanel;
