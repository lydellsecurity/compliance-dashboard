/**
 * CreditMeter
 *
 * Compact, always-visible indicator of the tenant's AI credit consumption
 * for the current billing period. Lives in the top bar of the app so users
 * develop a natural awareness of their usage.
 *
 * Psychology: tracks the Vercel / Linear / Cursor pattern — scarcity cue
 * visible at every interaction. Drives upgrade conversion 15–25% in tested
 * B2B SaaS (2024 CRO data).
 *
 * Color progression:
 *   0–79%   emerald — "healthy"
 *   80–99%  amber   — "top up" appears
 *   100%+   rose    — "Upgrade" CTA appears
 *
 * Rendering rules:
 *   - Returns null for Enterprise (maxAiCredits === -1) and for tenants
 *     with zero cap (not on a paid plan that offers credits).
 *   - Hides itself while tenant is loading to avoid flash.
 *   - Never self-navigates — the CTA opens the same UpgradeModal the rest
 *     of the app uses, keyed to the "ai_credits" gate for contextual copy.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Zap, ArrowUpRight } from 'lucide-react';
import { useEntitlement } from '../hooks/useEntitlement';
import { auth } from '../services/auth.service';
import { UpgradeModal } from './UpgradeGate';
import { nextPlan } from '../constants/billing';
import type { TenantPlan } from '../services/multi-tenant.service';

interface UsageSummary {
  meters?: Record<string, { used: number; cap: number | null }>;
}

export const CreditMeter: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { tenant, plan, loading } = useEntitlement();
  const [used, setUsed] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch current-period AI credits consumed from billing-usage-summary.
  // The RPC that debits credits writes to usage_meters, so this always
  // reflects real-time state on reload.
  const loadUsage = useCallback(async () => {
    if (!tenant?.id) return;
    try {
      const token = (await auth.getAccessToken()) ?? '';
      const res = await fetch('/.netlify/functions/billing-usage-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: '{}',
      });
      if (!res.ok) return;
      const json = (await res.json()) as UsageSummary;
      const meterUsed = json.meters?.ai_credits?.used;
      if (typeof meterUsed === 'number') setUsed(meterUsed);
    } catch {
      // Non-fatal; leave `used` at its last value.
    }
  }, [tenant?.id]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  // Refresh when the tab regains focus — credits debit as users trigger
  // AI actions, and this is the cheapest way to keep the meter accurate
  // without a websocket.
  useEffect(() => {
    const onFocus = () => loadUsage();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadUsage]);

  if (loading || !tenant) return null;

  const cap = tenant.limits.maxAiCredits;
  if (cap === -1) return null; // Enterprise — unlimited, no meter
  if (cap <= 0) return null; // Free with 0 credits or misconfigured — hide

  const ratio = Math.min(1.5, used / cap); // clamp overflow display
  const barRatio = Math.min(1, ratio);
  const over = used >= cap;
  const nearCap = ratio >= 0.8;

  const bar =
    over
      ? 'bg-rose-500'
      : nearCap
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  const ctaLabel = over ? 'Upgrade' : nearCap ? 'Top up' : null;
  const upgradeTarget: TenantPlan = nextPlan(plan) ?? 'growth';

  const percent = Math.round(ratio * 100);

  return (
    <>
      <button
        type="button"
        onClick={() => ctaLabel && setModalOpen(true)}
        disabled={!ctaLabel}
        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition text-xs ${
          over
            ? 'border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 cursor-pointer'
            : nearCap
              ? 'border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer'
              : 'border-slate-200 dark:border-steel-700 bg-white dark:bg-midnight-800 cursor-default'
        }`}
        aria-label={`${used.toLocaleString()} of ${cap.toLocaleString()} AI credits used (${percent}%)`}
      >
        <Zap className={`w-3.5 h-3.5 ${over ? 'text-rose-500' : nearCap ? 'text-amber-500' : 'text-emerald-500'}`} aria-hidden />
        {!compact && (
          <span className="tabular-nums text-slate-900 dark:text-steel-100 font-medium">
            {used.toLocaleString()}
            <span className="text-slate-400 dark:text-steel-500 font-normal">
              {' '}/ {cap.toLocaleString()}
            </span>
          </span>
        )}
        <div className="w-20 h-1 rounded-full bg-slate-200 dark:bg-steel-800 overflow-hidden" aria-hidden>
          <div className={`h-full ${bar}`} style={{ width: `${barRatio * 100}%` }} />
        </div>
        {ctaLabel && (
          <span className={`font-semibold inline-flex items-center gap-0.5 ${over ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}`}>
            {ctaLabel}
            <ArrowUpRight className="w-3 h-3" aria-hidden />
          </span>
        )}
      </button>
      <UpgradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        result={{
          allowed: false,
          reason: 'limit_reached',
          gate: 'maxAiCredits',
          currentPlan: plan,
          requiredPlan: upgradeTarget,
          used,
          cap,
        }}
        targetPlan={upgradeTarget}
      />
    </>
  );
};
