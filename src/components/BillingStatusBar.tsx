/**
 * BillingStatusBar
 *
 * Top-of-app persistent banner stack for billing-adjacent notices. Mounted
 * once inside the main app shell; renders nothing when there's nothing to say.
 *
 * Priority order (highest → lowest; only the top-priority banner shows at a
 * given time to avoid banner fatigue):
 *
 *   1. `payment_failed`  — hard red, blocks paid-feature writes after day 10.
 *                          CTA opens Stripe Billing Portal.
 *   2. `trial_ending`    — amber, within the last 3 days of trial. CTA opens
 *                          the upgrade modal (no modal swap — the same
 *                          Stripe Checkout they'd use to convert).
 *   3. `renewal_soon`    — neutral, within 7 days of annual renewal. Info-only.
 *   4. `quota_warning`   — amber, the highest-utilisation limit ≥80% of cap.
 *                          CTA opens the upgrade modal pointed at the next
 *                          tier that raises that specific limit.
 *
 * Users can dismiss the `renewal_soon` and `quota_warning` banners for the
 * current session (localStorage). Hard blockers (`payment_failed`,
 * `trial_ending` in final 24h) are not dismissible.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, Clock, CreditCard, X, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  useEntitlement,
  type LimitKey,
} from '../hooks/useEntitlement';
import { nextPlan, PLAN_DISPLAY } from '../constants/billing';
import {
  PLAN_CONFIGS,
  type TenantLimits,
  type TenantPlan,
  type TenantUsage,
} from '../services/multi-tenant.service';
import { UpgradeModal } from './UpgradeGate';

// ============================================================================
// CONFIG
// ============================================================================

const QUOTA_WARN_THRESHOLD = 0.8;     // 80% of cap triggers warning
const TRIAL_WARN_DAYS = 3;            // final N days of trial → warn
const RENEWAL_WARN_DAYS = 7;          // final N days before renewal → notice
const DISMISS_STORAGE_PREFIX = 'billing_banner_dismissed:';

// Human-readable names for limit keys. Kept inline to avoid another constant file.
const LIMIT_LABEL: Record<LimitKey, string> = {
  maxUsers: 'users',
  maxControls: 'controls',
  maxEvidence: 'evidence records',
  maxIntegrations: 'integrations',
  maxStorageGb: 'storage',
  retentionDays: 'retention',
  auditLogDays: 'audit log',
  apiRateLimit: 'API requests/min',
};

// ============================================================================
// BANNER MODEL
// ============================================================================

type BannerKind = 'payment_failed' | 'trial_ending' | 'renewal_soon' | 'quota_warning';

interface BannerSpec {
  kind: BannerKind;
  severity: 'critical' | 'warning' | 'info';
  headline: string;
  body: string;
  /** The plan the user should be encouraged toward, if any. */
  upgradeTarget?: TenantPlan;
  /** Primary action label + handler. */
  primaryLabel: string;
  primaryAction: 'portal' | 'upgrade';
  /** Set to a stable id to opt-in to session-dismiss behaviour. */
  dismissKey?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const BillingStatusBar: React.FC = () => {
  const { session } = useAuth();
  const { tenant, plan, loading } = useEntitlement();
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<TenantPlan | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());

  const banners = useMemo<BannerSpec[]>(() => {
    if (!tenant) return [];
    const out: BannerSpec[] = [];

    // 1. Payment failed — tenant.status = 'suspended' set by invoice.payment_failed webhook.
    if (tenant.status === 'suspended' && tenant.billing?.subscriptionId) {
      out.push({
        kind: 'payment_failed',
        severity: 'critical',
        headline: 'Payment failed',
        body: 'Update your payment method to avoid service interruption. Paid features will be blocked if the payment stays unresolved.',
        primaryLabel: 'Update payment method',
        primaryAction: 'portal',
      });
    }

    // 2. Trial ending — reads trialEndsAt (populated by the Stripe webhook).
    const trialDaysLeft = tenant.trialEndsAt
      ? daysBetween(new Date(), new Date(tenant.trialEndsAt))
      : null;
    if (trialDaysLeft !== null && trialDaysLeft >= 0 && trialDaysLeft <= TRIAL_WARN_DAYS) {
      out.push({
        kind: 'trial_ending',
        severity: trialDaysLeft <= 1 ? 'critical' : 'warning',
        headline:
          trialDaysLeft <= 1
            ? 'Your trial ends today'
            : `Your trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}`,
        body: 'Add a payment method to keep your plan active. We won\'t charge until the trial ends.',
        upgradeTarget: plan === 'free' ? nextPlan('free') ?? 'starter' : plan,
        primaryLabel: 'Add payment method',
        primaryAction: 'upgrade',
      });
    }

    // 3. Renewal soon — only for non-trial active subscriptions within 7 days of period end.
    const periodEnd = tenant.billing?.currentPeriodEnd;
    const renewalDays = periodEnd ? daysBetween(new Date(), new Date(periodEnd)) : null;
    if (
      tenant.status === 'active' &&
      tenant.billing?.subscriptionId &&
      periodEnd &&
      renewalDays !== null &&
      renewalDays >= 0 &&
      renewalDays <= RENEWAL_WARN_DAYS
    ) {
      const dismissKey = `renewal_soon:${periodEnd}`;
      if (!dismissed.has(dismissKey)) {
        out.push({
          kind: 'renewal_soon',
          severity: 'info',
          headline: `Renews in ${renewalDays} day${renewalDays === 1 ? '' : 's'}`,
          body: `Your ${PLAN_DISPLAY[plan].name} plan renews on ${formatDate(periodEnd)}. Manage in the billing portal.`,
          primaryLabel: 'Manage billing',
          primaryAction: 'portal',
          dismissKey,
        });
      }
    }

    // 4. Quota warning — scan limits for the one at highest utilisation ≥80%.
    const quota = findHighestUtilisation(tenant.limits, tenant.usage);
    if (quota && quota.ratio >= QUOTA_WARN_THRESHOLD) {
      const dismissKey = `quota:${quota.limit}:${quota.cap}`;
      if (!dismissed.has(dismissKey)) {
        const target = findNextTierRaisingLimit(plan, quota.limit, quota.cap);
        out.push({
          kind: 'quota_warning',
          severity: quota.ratio >= 1 ? 'critical' : 'warning',
          headline:
            quota.ratio >= 1
              ? `You've hit the ${LIMIT_LABEL[quota.limit]} limit`
              : `You're at ${Math.round(quota.ratio * 100)}% of your ${LIMIT_LABEL[quota.limit]} limit`,
          body:
            target
              ? `${target === 'enterprise' ? 'Contact sales' : `${PLAN_DISPLAY[target].name}`} lifts this limit (${formatCap(quota.cap, quota.limit)} → ${formatCap(PLAN_CONFIGS[target].limits[quota.limit], quota.limit)}).`
              : `You're on the highest tier — contact sales for a custom limit.`,
          upgradeTarget: target ?? undefined,
          primaryLabel: target === 'enterprise' ? 'Contact sales' : target ? `Upgrade to ${PLAN_DISPLAY[target].name}` : 'Contact sales',
          primaryAction: 'upgrade',
          dismissKey,
        });
      }
    }

    return out;
  }, [tenant, plan, dismissed]);

  const openPortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/.netlify/functions/stripe-create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not open billing portal');
      window.location.href = json.url;
    } catch {
      setPortalLoading(false);
    }
  }, [session?.access_token]);

  const handlePrimary = useCallback(
    (spec: BannerSpec) => {
      if (spec.primaryAction === 'portal') {
        openPortal();
      } else if (spec.primaryAction === 'upgrade' && spec.upgradeTarget) {
        if (spec.upgradeTarget === 'enterprise') {
          window.location.href = 'mailto:sales@lydellsecurity.com?subject=Enterprise%20plan%20enquiry';
        } else {
          setUpgradeTarget(spec.upgradeTarget);
        }
      }
    },
    [openPortal]
  );

  const handleDismiss = useCallback((key: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      try {
        sessionStorage.setItem(DISMISS_STORAGE_PREFIX + key, '1');
      } catch {
        /* storage unavailable — dismissal is in-memory only */
      }
      return next;
    });
  }, []);

  if (loading || !tenant || banners.length === 0) return null;

  // Show only the top-priority banner to avoid fatigue.
  const top = banners[0];

  return (
    <>
      <BannerRow
        spec={top}
        loading={top.primaryAction === 'portal' && portalLoading}
        onPrimary={() => handlePrimary(top)}
        onDismiss={top.dismissKey ? () => handleDismiss(top.dismissKey!) : undefined}
      />
      <UpgradeModal
        open={upgradeTarget !== null}
        onClose={() => setUpgradeTarget(null)}
        result={upgradeTarget ? { allowed: false, currentPlan: plan, requiredPlan: upgradeTarget } : null}
        targetPlan={upgradeTarget ?? undefined}
      />
    </>
  );
};

// ============================================================================
// BANNER ROW
// ============================================================================

interface BannerRowProps {
  spec: BannerSpec;
  loading: boolean;
  onPrimary: () => void;
  onDismiss?: () => void;
}

const BannerRow: React.FC<BannerRowProps> = ({ spec, loading, onPrimary, onDismiss }) => {
  const severityClasses = {
    critical:
      'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-100',
    warning:
      'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-100',
    info:
      'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-100',
  }[spec.severity];

  const Icon =
    spec.kind === 'payment_failed'
      ? CreditCard
      : spec.kind === 'trial_ending'
        ? Clock
        : spec.kind === 'renewal_soon'
          ? Clock
          : AlertTriangle;

  const buttonClasses =
    spec.severity === 'critical'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : spec.severity === 'warning'
        ? 'bg-amber-600 hover:bg-amber-700 text-white'
        : 'bg-indigo-600 hover:bg-indigo-700 text-white';

  return (
    <div className={`border rounded-xl px-4 py-3 mb-6 flex items-start gap-3 ${severityClasses}`} role="alert">
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{spec.headline}</p>
        <p className="text-sm opacity-90 mt-0.5">{spec.body}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onPrimary}
          disabled={loading}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-60 ${buttonClasses}`}
        >
          {loading ? 'Opening…' : spec.primaryLabel}
          {!loading && <Zap className="w-3.5 h-3.5" />}
        </button>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="p-1 rounded-md opacity-60 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// HELPERS
// ============================================================================

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatCap(cap: number, limit: LimitKey): string {
  if (cap === -1) return 'Unlimited';
  if (limit === 'maxStorageGb') return `${cap} GB`;
  if (limit === 'retentionDays' || limit === 'auditLogDays') return `${cap} days`;
  if (limit === 'apiRateLimit') return `${cap}/min`;
  return cap.toLocaleString();
}

function findHighestUtilisation(
  limits: TenantLimits,
  usage: TenantUsage
): { limit: LimitKey; cap: number; used: number; ratio: number } | null {
  const pairs: [LimitKey, keyof TenantUsage][] = [
    ['maxUsers', 'usersCount'],
    ['maxControls', 'controlsCount'],
    ['maxEvidence', 'evidenceCount'],
    ['maxIntegrations', 'integrationsCount'],
    ['maxStorageGb', 'storageUsedMb'],
  ];

  let best: { limit: LimitKey; cap: number; used: number; ratio: number } | null = null;
  for (const [limitKey, usageKey] of pairs) {
    const cap = limits[limitKey];
    if (cap == null || cap === -1) continue;
    const rawUsed = usage[usageKey];
    const used = typeof rawUsed === 'number'
      ? (limitKey === 'maxStorageGb' ? rawUsed / 1024 : rawUsed)
      : 0;
    const ratio = used / cap;
    if (!best || ratio > best.ratio) {
      best = { limit: limitKey, cap, used, ratio };
    }
  }
  return best;
}

function findNextTierRaisingLimit(
  currentPlan: TenantPlan,
  limit: LimitKey,
  currentCap: number
): TenantPlan | null {
  const order: TenantPlan[] = ['free', 'starter', 'growth', 'scale', 'enterprise'];
  const idx = order.indexOf(currentPlan);
  for (let i = idx + 1; i < order.length; i++) {
    const cap = PLAN_CONFIGS[order[i]].limits[limit];
    if (cap === -1 || cap > currentCap) return order[i];
  }
  return null;
}

function loadDismissed(): Set<string> {
  const out = new Set<string>();
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(DISMISS_STORAGE_PREFIX)) {
        out.add(k.slice(DISMISS_STORAGE_PREFIX.length));
      }
    }
  } catch {
    /* storage unavailable */
  }
  return out;
}
