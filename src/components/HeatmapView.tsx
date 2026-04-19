/**
 * Compliance Heatmap
 *
 * Domain × Framework grid. Each cell shows the compliance percentage of a
 * domain's controls as scored by a specific framework — so you can instantly
 * spot "Access Control is fine for SOC 2 but bombing for ISO 27001".
 *
 * Cells are clickable: jumping into the assessment with domain + framework
 * filters pre-applied saves several clicks during audit prep.
 *
 * Scoring is the same compliant-ratio used by the framework/domain rollups
 * elsewhere, so cell colors agree with the main dashboard gauges.
 */

import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Grid3x3, Info } from 'lucide-react';
import {
  FRAMEWORKS,
  COMPLIANCE_DOMAINS,
  MASTER_CONTROLS,
  type FrameworkId,
  type UserResponse,
  type MasterControl,
} from '../constants/controls';

/**
 * Track whether `<html>` currently has `.dark`. The theme toggle mutates the
 * classList at runtime, so a mount-time read stales the cell colors until
 * the next route change. A MutationObserver on the classList re-renders the
 * heatmap whenever the user flips themes.
 */
function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains('dark'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

interface HeatmapViewProps {
  /** Controls to score (master + active custom). */
  allControls: MasterControl[];
  /** Keyed by controlId. Same shape the compliance hook exposes. */
  responses: Map<string, UserResponse>;
  /** Jump into the Assessment tab with a domain + framework pre-filter. */
  onCellClick?: (domainId: string, frameworkId: FrameworkId) => void;
}

interface Cell {
  total: number;
  compliant: number;
  /** null when total === 0 — render "—" instead of a misleading 0%. */
  percentage: number | null;
}

function scoreCell(controls: MasterControl[], responses: Map<string, UserResponse>): Cell {
  const total = controls.length;
  if (total === 0) return { total: 0, compliant: 0, percentage: null };
  let compliant = 0;
  for (const c of controls) {
    const a = responses.get(c.id)?.answer;
    if (a === 'yes' || a === 'na') compliant++;
  }
  return { total, compliant, percentage: Math.round((compliant / total) * 100) };
}

// Cell color = HSL red → amber → emerald across the 0–100 range. Using HSL
// keeps contrast roughly even; accessibility pass below adds a text label
// for users who can't rely on color alone.
function cellBgColor(pct: number | null, isDark: boolean): string {
  if (pct === null) return isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(241, 245, 249, 1)';
  const hue = (pct / 100) * 130; // 0 red → 130 green
  const sat = isDark ? 40 : 70;
  const light = isDark ? 25 + pct * 0.15 : 92 - pct * 0.25;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

function cellTextColor(pct: number | null): string {
  if (pct === null) return 'text-slate-400 dark:text-steel-500';
  if (pct >= 50) return 'text-slate-900 dark:text-white';
  return 'text-slate-900 dark:text-slate-900';
}

const HeatmapView: React.FC<HeatmapViewProps> = ({ allControls, responses, onCellClick }) => {
  const isDark = useIsDarkMode();

  // Build the matrix. The "Company Specific" row is synthesized from any
  // custom controls in allControls that aren't in MASTER_CONTROLS.
  const matrix = useMemo(() => {
    const masterIds = new Set(MASTER_CONTROLS.map(c => c.id));
    const customControls = allControls.filter(c => !masterIds.has(c.id));

    const domains: { id: string; title: string; color: string; controls: MasterControl[] }[] = [
      ...COMPLIANCE_DOMAINS.map(d => ({
        id: d.id as string,
        title: d.title,
        color: d.color,
        controls: allControls.filter(c => c.domain === d.id),
      })),
    ];
    if (customControls.length > 0) {
      domains.push({
        id: 'company_specific',
        title: 'Company Specific',
        color: '#8B5CF6',
        controls: customControls,
      });
    }

    return domains.map(domain => {
      const rowCells: Record<FrameworkId, Cell> = {} as Record<FrameworkId, Cell>;
      const rowOverall = scoreCell(domain.controls, responses);
      for (const fw of FRAMEWORKS) {
        const controlsInBoth = domain.controls.filter(c =>
          c.frameworkMappings.some(m => m.frameworkId === fw.id),
        );
        rowCells[fw.id] = scoreCell(controlsInBoth, responses);
      }
      return { ...domain, cells: rowCells, overall: rowOverall };
    });
  }, [allControls, responses]);

  // Column totals — same scoring applied per framework across all controls.
  const columnTotals = useMemo(() => {
    const totals: Record<FrameworkId, Cell> = {} as Record<FrameworkId, Cell>;
    for (const fw of FRAMEWORKS) {
      const controlsInFw = allControls.filter(c =>
        c.frameworkMappings.some(m => m.frameworkId === fw.id),
      );
      totals[fw.id] = scoreCell(controlsInFw, responses);
    }
    return totals;
  }, [allControls, responses]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-steel-100 flex items-center gap-2">
            <Grid3x3 className="w-5 h-5" aria-hidden="true" />
            Compliance heatmap
          </h2>
          <p className="text-sm text-slate-500 dark:text-steel-400 mt-1">
            Domain × framework compliance. Darker red = more gaps; darker green = higher compliance. Click a cell to filter the assessment to that slice.
          </p>
        </div>
        <div className="text-xs text-slate-500 dark:text-steel-400 flex items-center gap-3">
          <LegendSwatch pct={0} isDark={isDark} label="0%" />
          <LegendSwatch pct={50} isDark={isDark} label="50%" />
          <LegendSwatch pct={100} isDark={isDark} label="100%" />
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded border border-slate-200 dark:border-steel-600 bg-slate-50 dark:bg-steel-800" aria-hidden="true" />
            <span>N/A</span>
          </span>
        </div>
      </div>

      <div
        role="table"
        aria-label="Domain by framework compliance heatmap"
        className="overflow-x-auto rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-800"
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-steel-900 border-b border-slate-200 dark:border-steel-700">
              <th
                scope="col"
                className="sticky left-0 bg-slate-50 dark:bg-steel-900 text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-steel-400"
              >
                Domain
              </th>
              {FRAMEWORKS.map(fw => (
                <th
                  key={fw.id}
                  scope="col"
                  className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide"
                  style={{ color: fw.color }}
                >
                  {fw.name}
                </th>
              ))}
              <th
                scope="col"
                className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-steel-400 border-l border-slate-200 dark:border-steel-700"
              >
                Overall
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rowIdx) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 dark:border-steel-700/50 hover:bg-slate-50/50 dark:hover:bg-steel-900/50"
              >
                <th
                  scope="row"
                  className="sticky left-0 bg-white dark:bg-steel-800 text-left px-4 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: row.color }}
                      aria-hidden="true"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-steel-100">{row.title}</div>
                      <div className="text-xs text-slate-500 dark:text-steel-400">
                        {row.controls.length} control{row.controls.length === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                </th>
                {FRAMEWORKS.map(fw => {
                  const cell = row.cells[fw.id];
                  const clickable = cell.total > 0 && !!onCellClick;
                  return (
                    <td key={fw.id} className="p-1">
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(rowIdx, 10) * 0.02 }}
                        onClick={clickable ? () => onCellClick(row.id, fw.id) : undefined}
                        disabled={!clickable}
                        aria-label={
                          cell.total === 0
                            ? `${row.title} × ${fw.name}: no controls mapped`
                            : `${row.title} × ${fw.name}: ${cell.percentage}% compliant, ${cell.compliant} of ${cell.total} controls`
                        }
                        title={
                          cell.total === 0
                            ? 'No controls mapped'
                            : `${cell.compliant}/${cell.total} compliant`
                        }
                        className={`
                          w-full h-14 rounded-md flex flex-col items-center justify-center
                          text-xs font-semibold transition-all
                          ${cellTextColor(cell.percentage)}
                          ${clickable ? 'hover:scale-105 hover:ring-2 hover:ring-indigo-500 hover:ring-offset-1 dark:hover:ring-offset-steel-800 cursor-pointer' : 'cursor-default'}
                        `}
                        style={{ backgroundColor: cellBgColor(cell.percentage, isDark) }}
                      >
                        {cell.percentage === null ? (
                          <span className="opacity-60">—</span>
                        ) : (
                          <>
                            <span className="text-sm tabular-nums">{cell.percentage}%</span>
                            <span className="text-[10px] font-normal opacity-75 tabular-nums">
                              {cell.compliant}/{cell.total}
                            </span>
                          </>
                        )}
                      </motion.button>
                    </td>
                  );
                })}
                <td className="p-1 border-l border-slate-200 dark:border-steel-700">
                  <div
                    className={`w-full h-14 rounded-md flex flex-col items-center justify-center text-xs font-semibold ${cellTextColor(row.overall.percentage)}`}
                    style={{ backgroundColor: cellBgColor(row.overall.percentage, isDark) }}
                    aria-label={
                      row.overall.total === 0
                        ? `${row.title} overall: no controls`
                        : `${row.title} overall: ${row.overall.percentage}% compliant`
                    }
                  >
                    {row.overall.percentage === null ? (
                      <span className="opacity-60">—</span>
                    ) : (
                      <>
                        <span className="text-sm tabular-nums">{row.overall.percentage}%</span>
                        <span className="text-[10px] font-normal opacity-75 tabular-nums">
                          {row.overall.compliant}/{row.overall.total}
                        </span>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {/* Column totals row. Separator above to visually distinguish. */}
            <tr className="bg-slate-50 dark:bg-steel-900 border-t-2 border-slate-300 dark:border-steel-600">
              <th
                scope="row"
                className="sticky left-0 bg-slate-50 dark:bg-steel-900 text-left px-4 py-2 text-sm font-semibold text-slate-900 dark:text-steel-100"
              >
                All domains
              </th>
              {FRAMEWORKS.map(fw => {
                const cell = columnTotals[fw.id];
                return (
                  <td key={fw.id} className="p-1">
                    <div
                      className={`w-full h-14 rounded-md flex flex-col items-center justify-center text-xs font-semibold ${cellTextColor(cell.percentage)}`}
                      style={{ backgroundColor: cellBgColor(cell.percentage, isDark) }}
                    >
                      {cell.percentage === null ? (
                        <span className="opacity-60">—</span>
                      ) : (
                        <>
                          <span className="text-sm tabular-nums">{cell.percentage}%</span>
                          <span className="text-[10px] font-normal opacity-75 tabular-nums">
                            {cell.compliant}/{cell.total}
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                );
              })}
              <td className="p-1 border-l border-slate-200 dark:border-steel-700" />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-steel-900 rounded-lg text-xs text-slate-600 dark:text-steel-400">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          Cells show the <strong>compliance ratio</strong> (implemented + not-applicable ÷ total). &ldquo;Partial&rdquo; answers are excluded to keep the number audit-ready — use the Changes view to see in-progress work. Dashes indicate no controls mapped to that domain × framework pair.
        </div>
      </div>
    </div>
  );
};

const LegendSwatch: React.FC<{ pct: number; isDark: boolean; label: string }> = ({ pct, isDark, label }) => (
  <span className="flex items-center gap-1">
    <span
      className="inline-block w-4 h-4 rounded"
      style={{ backgroundColor: cellBgColor(pct, isDark) }}
      aria-hidden="true"
    />
    <span>{label}</span>
  </span>
);

export default HeatmapView;
