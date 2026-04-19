/**
 * Changes / Delta View
 *
 * Timeline of every answer transition since the last time history was
 * cleared. Surfaces:
 *   - Regressions (yes → no|partial) — flagged in red, most important
 *   - New attestations (null → yes)
 *   - New gaps (null → no)
 *   - Re-assessments with a value change
 *
 * Powers the "what changed since last audit cycle" use case and helps
 * auditors see delta without diffing a database by hand.
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  History,
  AlertTriangle,
  CheckCircle,
  Clock,
  Circle,
  TrendingUp,
  TrendingDown,
  Filter,
  Trash2,
  Download,
} from 'lucide-react';
import type { AnswerHistoryEvent } from '../hooks/useCompliance';
import { ASSESSMENT_LABELS, statusFor } from '../constants/assessmentLabels';
import EmptyState from './ui/EmptyState';

type Filter = 'all' | 'regressions' | 'new-attestations' | 'new-gaps' | 'reassessments' | 'critical';

interface ChangesViewProps {
  history: AnswerHistoryEvent[];
  onClear: () => void;
  /** Optional: jump into the Assessment tab focused on a specific control. */
  onOpenControl?: (controlId: string) => void;
}

const ANSWER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  yes: CheckCircle,
  partial: Clock,
  no: Circle,
  na: Circle,
};

const ANSWER_COLORS: Record<string, string> = {
  yes: 'text-emerald-600 dark:text-emerald-400',
  partial: 'text-amber-600 dark:text-amber-400',
  no: 'text-rose-600 dark:text-rose-400',
  na: 'text-slate-500 dark:text-steel-400',
};

function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diffMs = now.getTime() - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMo = Math.floor(diffDay / 30);
  if (diffMo < 12) return `${diffMo}mo ago`;
  return `${Math.floor(diffMo / 12)}y ago`;
}

const ChangesView: React.FC<ChangesViewProps> = ({ history, onClear, onOpenControl }) => {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    switch (filter) {
      case 'regressions': return history.filter(e => e.isRegression);
      case 'new-attestations': return history.filter(e => e.from === null && e.to === 'yes');
      case 'new-gaps': return history.filter(e => e.from === null && e.to === 'no');
      case 'reassessments': return history.filter(e => e.isChange && e.from !== null);
      case 'critical': return history.filter(e => e.riskLevel === 'critical' || e.riskLevel === 'high');
      default: return history;
    }
  }, [history, filter]);

  // Summary stats drive the headline counters at the top.
  const summary = useMemo(() => {
    let regressions = 0, newAttestations = 0, newGaps = 0, reassessments = 0;
    for (const e of history) {
      if (e.isRegression) regressions++;
      if (e.from === null && e.to === 'yes') newAttestations++;
      if (e.from === null && e.to === 'no') newGaps++;
      if (e.isChange && e.from !== null) reassessments++;
    }
    return { regressions, newAttestations, newGaps, reassessments };
  }, [history]);

  const exportCsv = () => {
    const header = ['timestamp', 'control_id', 'control_title', 'from', 'to', 'risk_level', 'regression', 'user'];
    const rows = history.map(e => [
      e.at,
      e.controlId,
      `"${e.controlTitle.replace(/"/g, '""')}"`,
      e.from ?? '',
      e.to,
      e.riskLevel,
      String(e.isRegression),
      e.userId ?? '',
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `answer-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-steel-100 flex items-center gap-2">
            <History className="w-5 h-5" aria-hidden="true" />
            Changes
          </h2>
          <p className="text-sm text-slate-500 dark:text-steel-400 mt-1">
            Every answer transition since the log was last cleared. Use this view to see what moved between audits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-steel-700 text-slate-700 dark:text-steel-300 hover:bg-slate-200 dark:hover:bg-steel-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Export CSV
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Clear ${history.length} history event(s)? This is irreversible.`)) onClear();
            }}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Clear log
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryStat
          label="Regressions"
          count={summary.regressions}
          tone="critical"
          icon={<TrendingDown className="w-4 h-4" aria-hidden="true" />}
          onClick={() => setFilter('regressions')}
          active={filter === 'regressions'}
        />
        <SummaryStat
          label="New attestations"
          count={summary.newAttestations}
          tone="positive"
          icon={<TrendingUp className="w-4 h-4" aria-hidden="true" />}
          onClick={() => setFilter('new-attestations')}
          active={filter === 'new-attestations'}
        />
        <SummaryStat
          label="New gaps"
          count={summary.newGaps}
          tone="warn"
          icon={<AlertTriangle className="w-4 h-4" aria-hidden="true" />}
          onClick={() => setFilter('new-gaps')}
          active={filter === 'new-gaps'}
        />
        <SummaryStat
          label="Re-assessments"
          count={summary.reassessments}
          tone="neutral"
          icon={<History className="w-4 h-4" aria-hidden="true" />}
          onClick={() => setFilter('reassessments')}
          active={filter === 'reassessments'}
        />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400" aria-hidden="true" />
        {([
          ['all', `All (${history.length})`],
          ['regressions', `Regressions (${summary.regressions})`],
          ['new-attestations', `New yes (${summary.newAttestations})`],
          ['new-gaps', `New gaps (${summary.newGaps})`],
          ['reassessments', `Re-assessed (${summary.reassessments})`],
          ['critical', 'Critical/High risk'],
        ] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val as Filter)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              filter === val
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-400 hover:bg-slate-200 dark:hover:bg-steel-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Event list */}
      {history.length === 0 ? (
        <EmptyState
          type="generic"
          title="No changes yet"
          description="Once you answer a control, every transition will appear here — regressions, new attestations, and re-assessments."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          type="generic"
          title="No matches"
          description="No history events match the current filter."
          action={{ label: 'Show all', onClick: () => setFilter('all') }}
        />
      ) : (
        <ol className="relative border-l-2 border-slate-200 dark:border-steel-700 ml-3 space-y-4" aria-label="Answer history timeline">
          {filtered.map((e) => {
            const FromIcon = e.from ? ANSWER_ICONS[e.from] ?? Circle : Circle;
            const ToIcon = ANSWER_ICONS[e.to] ?? Circle;
            const fromLabel = ASSESSMENT_LABELS[statusFor(e.from)].short;
            const toLabel = ASSESSMENT_LABELS[e.to].short;

            return (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="ml-6"
              >
                {/* Timeline dot */}
                <span
                  className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ${
                    e.isRegression
                      ? 'bg-rose-500 ring-rose-100 dark:ring-rose-900/30'
                      : e.to === 'yes'
                        ? 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/30'
                        : 'bg-slate-400 ring-slate-100 dark:ring-steel-700'
                  }`}
                  aria-hidden="true"
                />
                <div
                  className={`p-4 rounded-lg border ${
                    e.isRegression
                      ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800'
                      : 'bg-white dark:bg-steel-800 border-slate-200 dark:border-steel-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{e.controlId}</span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded border ${riskBadgeColor(e.riskLevel)}`}
                          aria-label={`Risk: ${e.riskLevel}`}
                        >
                          {e.riskLevel}
                        </span>
                        {e.isRegression && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                            Regression
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-slate-900 dark:text-steel-100 truncate">
                        {e.controlTitle}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        {e.from !== null ? (
                          <>
                            <span className={`flex items-center gap-1 ${ANSWER_COLORS[e.from]}`}>
                              <FromIcon className="w-3.5 h-3.5" aria-hidden="true" />
                              {fromLabel}
                            </span>
                            <span className="text-slate-400">→</span>
                          </>
                        ) : (
                          <span className="text-slate-500 dark:text-steel-400 text-xs italic">first assessment →</span>
                        )}
                        <span className={`flex items-center gap-1 font-medium ${ANSWER_COLORS[e.to]}`}>
                          <ToIcon className="w-3.5 h-3.5" aria-hidden="true" />
                          {toLabel}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-steel-400 whitespace-nowrap" title={new Date(e.at).toLocaleString()}>
                      {formatRelative(e.at)}
                    </div>
                  </div>
                  {onOpenControl && (
                    <div className="mt-3">
                      <button
                        onClick={() => onOpenControl(e.controlId)}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Open control →
                      </button>
                    </div>
                  )}
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

const SummaryStat: React.FC<{
  label: string;
  count: number;
  tone: 'critical' | 'positive' | 'warn' | 'neutral';
  icon: React.ReactNode;
  onClick: () => void;
  active: boolean;
}> = ({ label, count, tone, icon, onClick, active }) => {
  const tones: Record<string, string> = {
    critical: 'border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/10',
    positive: 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/10',
    warn: 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/10',
    neutral: 'border-slate-200 dark:border-steel-700 text-slate-700 dark:text-steel-300 bg-white dark:bg-steel-800',
  };
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`text-left p-3 rounded-lg border transition-all ${tones[tone]} ${active ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-steel-900' : 'hover:shadow-sm'}`}
    >
      <div className="flex items-center gap-2 text-xs font-medium">{icon}{label}</div>
      <div className="text-2xl font-semibold tabular-nums mt-1">{count}</div>
    </button>
  );
};

function riskBadgeColor(level: string): string {
  switch (level) {
    case 'critical': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
    case 'high': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    case 'medium': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    default: return 'bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-400 border-slate-200 dark:border-steel-600';
  }
}

export default ChangesView;
