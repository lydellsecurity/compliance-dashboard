/**
 * UpgradeGate
 *
 * Two exports:
 *
 *  1. `<UpgradeModal>` — shown when a gated action is attempted. Lists the
 *     target plan's highlights and opens Stripe Checkout for the monthly or
 *     annual price.
 *
 *  2. `<GatedButton>` — a convenience wrapper that short-circuits a click
 *     handler when the user lacks the required feature/limit and pops the
 *     upgrade modal instead.
 *
 * Both rely on `useEntitlement` for plan state and call the
 * `stripe-create-checkout` Netlify function to produce a checkout URL.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles, Check, ArrowRight, ArrowUp, Tag, Loader2 } from 'lucide-react';
import { auth } from '../services/auth.service';
import { Modal } from './ui/Modal';
import { GLOSSARY, GlossaryTerm } from './ui/Tooltip';

/**
 * Render a feature-highlight string, expanding `@term` tokens into
 * <GlossaryTerm /> so jargon in the upgrade modal is hoverable.
 *
 * Example: "150 users + @scim provisioning" → "150 users + <SCIM>"
 */
function renderHighlight(text: string): React.ReactNode {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (!part.startsWith('@')) return part;
    const key = part.slice(1).toLowerCase() as keyof typeof GLOSSARY;
    if (!(key in GLOSSARY)) return part;
    return <GlossaryTerm key={i} termKey={key} />;
  });
}
import {
  useEntitlement,
  type EntitlementResult,
  type FeatureKey,
  type LimitKey,
} from '../hooks/useEntitlement';
import {
  PLAN_DISPLAY,
  PLAN_PRICE_IDS,
  isUpgrade,
} from '../constants/billing';
import {
  PLAN_CONFIGS,
  type TenantFeatures,
  type TenantPlan,
} from '../services/multi-tenant.service';

// ============================================================================
// DIFF HELPERS
// ============================================================================

const FEATURE_LABELS: Record<keyof TenantFeatures, string> = {
  cloudIntegrations: 'Cloud integrations (AWS, Azure, GCP)',
  customControls: 'Custom controls',
  apiAccess: 'REST API access',
  ssoEnabled: 'SSO / SAML',
  customBranding: 'Custom branding',
  advancedReporting: 'Advanced reporting',
  trustCenter: 'Public Trust Center',
  incidentResponse: 'Incident Response engine',
  vendorRisk: 'Vendor Risk Management',
  questionnaireAutomation: 'Questionnaire autofill',
  aiRemediationChat: 'AI Remediation Chat',
  realTimeRegulatoryScan: 'Real-time regulatory scanning',
  auditBundleExport: 'Audit-ready export',
  customDomain: 'Custom domain',
  scimProvisioning: 'SCIM provisioning',
};

const LIMIT_LABELS: Record<LimitKey, string> = {
  maxUsers: 'Users',
  maxControls: 'Controls',
  maxEvidence: 'Evidence records',
  maxIntegrations: 'Integrations',
  maxStorageGb: 'Storage',
  retentionDays: 'Retention',
  auditLogDays: 'Audit log',
  apiRateLimit: 'API rate',
  maxVendors: 'Vendors',
  maxAiCredits: 'AI credits',
};

function formatLimit(limit: LimitKey, value: number): string {
  if (value === -1) return 'Unlimited';
  if (limit === 'maxStorageGb') {
    return value < 1 ? `${Math.round(value * 1024)} MB` : `${value} GB`;
  }
  if (limit === 'retentionDays' || limit === 'auditLogDays') return `${value} days`;
  if (limit === 'apiRateLimit') return `${value}/min`;
  if (limit === 'maxAiCredits') return `${value.toLocaleString()} /mo`;
  return value.toLocaleString();
}

interface PlanDiff {
  newFeatures: { key: keyof TenantFeatures; label: string }[];
  raisedLimits: { key: LimitKey; label: string; from: string; to: string }[];
}

function computePlanDiff(from: TenantPlan, to: TenantPlan): PlanDiff {
  const fromConfig = PLAN_CONFIGS[from];
  const toConfig = PLAN_CONFIGS[to];

  const newFeatures = (Object.keys(toConfig.features) as (keyof TenantFeatures)[])
    .filter((k) => toConfig.features[k] === true && fromConfig.features[k] === false)
    .map((k) => ({ key: k, label: FEATURE_LABELS[k] }));

  const raisedLimits: PlanDiff['raisedLimits'] = [];
  (Object.keys(toConfig.limits) as LimitKey[]).forEach((k) => {
    const fromVal = fromConfig.limits[k];
    const toVal = toConfig.limits[k];
    const isRaised = toVal === -1 || (fromVal !== -1 && toVal > fromVal);
    if (isRaised) {
      raisedLimits.push({
        key: k,
        label: LIMIT_LABELS[k],
        from: formatLimit(k, fromVal),
        to: formatLimit(k, toVal),
      });
    }
  });

  return { newFeatures, raisedLimits };
}

// ============================================================================
// UPGRADE MODAL
// ============================================================================

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** The gate that failed. Used to customise the modal headline. */
  result: EntitlementResult | null;
  /** Override the recommended target plan (defaults to result.requiredPlan). */
  targetPlan?: TenantPlan;
}

interface ValidatedCoupon {
  code: string;
  promotionCodeId: string;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  duration: string | null;
  durationInMonths: number | null;
  name: string | null;
}

interface ProrationPreview {
  hasExistingSubscription: boolean;
  immediateAmount: number;
  creditApplied: number;
  netDue: number;
  nextInvoiceAmount: number;
  currency: string;
  periodEnd: string | null;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  open,
  onClose,
  result,
  targetPlan,
}) => {
  // Read the tenant's current interval so we can treat a same-plan
  // monthly↔annual flip as a valid action (not a no-op) — and default the
  // toggle to the *other* interval than the one the user is on now.
  const { tenant } = useEntitlement();
  const currentInterval = tenant?.billingInterval ?? null;

  const [interval, setInterval] = useState<'annual' | 'monthly'>(
    currentInterval === 'annual' ? 'monthly' : 'annual'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState('');
  const [couponValidating, setCouponValidating] = useState(false);
  const [coupon, setCoupon] = useState<ValidatedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [preview, setPreview] = useState<ProrationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const plan: TenantPlan = targetPlan
    ?? result?.requiredPlan
    ?? 'growth';

  const current = result?.currentPlan ?? 'free';
  const display = PLAN_DISPLAY[plan];
  const config = PLAN_CONFIGS[plan];
  const diff = useMemo(() => computePlanDiff(current, plan), [current, plan]);
  // Only show the comparison block when the user is already on a paid-ish plan
  // that has real features to contrast against. Free-to-Starter users benefit
  // more from the classic feature-highlight list.
  const showComparison =
    current !== 'free' && (diff.newFeatures.length > 0 || diff.raisedLimits.length > 0);

  const priceMonthly = config.price;
  const priceAnnualPerMonth = config.priceAnnual > 0 ? Math.round(config.priceAnnual / 12) : 0;

  // Reset coupon + preview state when the modal closes or target changes so
  // re-opens start clean (users shouldn't see a stale preview).
  useEffect(() => {
    if (!open) {
      setCoupon(null);
      setCouponInput('');
      setCouponError(null);
      setPreview(null);
      setError(null);
    }
  }, [open, plan, interval]);

  // Fetch proration preview when the modal opens on a paid user changing plans.
  useEffect(() => {
    if (!open) return;
    if (plan === 'free' || plan === 'enterprise') return;
    const priceIds = PLAN_PRICE_IDS[plan];
    const priceId = interval === 'annual' ? priceIds.annual : priceIds.monthly;
    if (!priceId) return;

    let cancelled = false;
    setPreviewLoading(true);
    (async () => {
      try {
        const token = (await auth.getAccessToken()) ?? '';
        const res = await fetch('/.netlify/functions/stripe-preview-upgrade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ priceId }),
        });
        const json = await res.json();
        if (!cancelled && res.ok) setPreview(json as ProrationPreview);
      } catch {
        // Preview is best-effort — failure doesn't block checkout.
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, plan, interval]);

  const applyCoupon = useCallback(async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponValidating(true);
    setCouponError(null);
    try {
      const token = (await auth.getAccessToken()) ?? '';
      const res = await fetch('/.netlify/functions/stripe-validate-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok || !json.valid) {
        setCoupon(null);
        setCouponError(json.message || 'This promo code is not valid.');
        return;
      }
      setCoupon(json as ValidatedCoupon);
    } catch {
      setCouponError('Could not validate code. Try again.');
    } finally {
      setCouponValidating(false);
    }
  }, [couponInput]);

  const clearCoupon = useCallback(() => {
    setCoupon(null);
    setCouponInput('');
    setCouponError(null);
  }, []);

  const handleSubscribe = useCallback(async () => {
    if (plan === 'enterprise') {
      window.location.href = 'mailto:sales@lydellsecurity.com?subject=Enterprise%20plan%20enquiry';
      return;
    }

    if (plan === 'free') {
      onClose();
      return;
    }

    const priceIds = PLAN_PRICE_IDS[plan];
    const priceId = interval === 'annual' ? priceIds.annual : priceIds.monthly;

    if (!priceId) {
      setError(
        'Stripe is not configured in this environment. Set the VITE_STRIPE_PRICE_* env vars and redeploy.'
      );
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const token = (await auth.getAccessToken()) ?? '';
      const res = await fetch('/.netlify/functions/stripe-create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId,
          interval,
          ...(coupon ? { promotionCode: coupon.code } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Checkout failed');
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoading(false);
    }
  }, [plan, interval, onClose, coupon]);

  const headline = useMemo(() => {
    if (!result) return `Upgrade to ${display.name}`;
    if (result.reason === 'limit_reached' && result.cap != null) {
      return `You've reached the ${display.name === 'Growth' ? '' : ''}${current} limit`;
    }
    return `${display.name} unlocks this feature`;
  }, [result, display.name, current]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      titleNode={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-steel-100">
              {headline}
            </h2>
            <p className="text-sm text-slate-500 dark:text-steel-400">
              {renderHighlight(display.tagline)}
            </p>
          </div>
        </div>
      }
    >
      <div className="p-5 sm:p-6 space-y-5">
          {plan !== 'enterprise' && plan !== 'free' && (
            <div className="flex items-center gap-2 p-1 rounded-lg bg-slate-100 dark:bg-steel-900 text-sm">
              <button
                type="button"
                onClick={() => setInterval('annual')}
                className={`flex-1 py-2 rounded-md font-medium transition ${
                  interval === 'annual'
                    ? 'bg-white dark:bg-midnight-700 shadow text-slate-900 dark:text-steel-100'
                    : 'text-slate-500 dark:text-steel-400'
                }`}
              >
                Annual <span className="text-emerald-600 dark:text-emerald-400 text-xs ml-1">Save 17%</span>
              </button>
              <button
                type="button"
                onClick={() => setInterval('monthly')}
                className={`flex-1 py-2 rounded-md font-medium transition ${
                  interval === 'monthly'
                    ? 'bg-white dark:bg-midnight-700 shadow text-slate-900 dark:text-steel-100'
                    : 'text-slate-500 dark:text-steel-400'
                }`}
              >
                Monthly
              </button>
            </div>
          )}

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900 dark:text-steel-100">
                {plan === 'enterprise'
                  ? 'Custom'
                  : plan === 'free'
                  ? 'Free'
                  : `$${interval === 'annual' ? priceAnnualPerMonth : priceMonthly}`}
              </span>
              {plan !== 'enterprise' && plan !== 'free' && (
                <span className="text-sm text-slate-500 dark:text-steel-400">
                  /mo{interval === 'annual' ? ', billed annually' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-steel-400 mt-1">
              {display.targetBuyer}
            </p>
          </div>

          {showComparison ? (
            <div className="space-y-4">
              {diff.newFeatures.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-steel-400 mb-2">
                    What's new at {display.name}
                  </p>
                  <ul className="space-y-1.5">
                    {diff.newFeatures.map((f) => (
                      <li
                        key={f.key}
                        className="flex items-start gap-2 text-sm text-slate-700 dark:text-steel-200"
                      >
                        <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                        <span>{f.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {diff.raisedLimits.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-steel-400 mb-2">
                    Raised limits
                  </p>
                  <ul className="space-y-1.5">
                    {diff.raisedLimits.map((l) => (
                      <li
                        key={l.key}
                        className="flex items-center justify-between text-sm text-slate-700 dark:text-steel-200 gap-3"
                      >
                        <span className="flex items-center gap-2">
                          <ArrowUp className="w-4 h-4 text-emerald-500 shrink-0" />
                          {l.label}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-steel-400 tabular-nums">
                          {l.from} → <span className="font-medium text-slate-900 dark:text-steel-100">{l.to}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {display.featureHighlights.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-700 dark:text-steel-200">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{renderHighlight(f)}</span>
                </li>
              ))}
            </ul>
          )}

          {plan !== 'enterprise' && plan !== 'free' && (
            <CouponField
              coupon={coupon}
              input={couponInput}
              setInput={setCouponInput}
              apply={applyCoupon}
              clear={clearCoupon}
              validating={couponValidating}
              error={couponError}
            />
          )}

          {plan !== 'enterprise' && plan !== 'free' && preview?.hasExistingSubscription && (
            <ProrationPreviewBlock preview={preview} loading={previewLoading} />
          )}

          {error && (
            <div className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg">
              {error}
            </div>
          )}

          {(() => {
            const isSamePlanCrossgrade =
              plan === current && currentInterval && currentInterval !== interval;
            const actionAllowed =
              plan === 'enterprise' || isUpgrade(current, plan) || isSamePlanCrossgrade;
            const label = loading
              ? 'Redirecting…'
              : display.cta === 'contact_sales'
                ? 'Contact sales'
                : isSamePlanCrossgrade
                  ? `Switch to ${interval === 'annual' ? 'annual' : 'monthly'} billing`
                  : `Upgrade to ${display.name}`;
            return (
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={loading || !actionAllowed}
                className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-steel-700 text-white font-medium transition flex items-center justify-center gap-2"
              >
                {label}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            );
          })()}

          <p className="text-xs text-center text-slate-500 dark:text-steel-400">
            {plan !== 'enterprise' && (plan === 'starter'
              ? '14-day free trial. Cancel anytime. Prices exclude VAT where applicable.'
              : 'Cancel anytime. Prices exclude VAT where applicable.')}
          </p>
        </div>
    </Modal>
  );
};

// ============================================================================
// COUPON FIELD + PRORATION PREVIEW (sub-components)
// ============================================================================

interface CouponFieldProps {
  coupon: ValidatedCoupon | null;
  input: string;
  setInput: (s: string) => void;
  apply: () => void;
  clear: () => void;
  validating: boolean;
  error: string | null;
}

const CouponField: React.FC<CouponFieldProps> = ({
  coupon, input, setInput, apply, clear, validating, error,
}) => {
  if (coupon) {
    const savings = coupon.percentOff
      ? `${coupon.percentOff}% off`
      : coupon.amountOff && coupon.currency
        ? `${(coupon.amountOff / 100).toLocaleString('en-US', {
            style: 'currency',
            currency: coupon.currency.toUpperCase(),
          })} off`
        : 'Applied';
    const duration =
      coupon.duration === 'repeating' && coupon.durationInMonths
        ? ` for ${coupon.durationInMonths} months`
        : coupon.duration === 'forever'
          ? ' for the life of the subscription'
          : '';
    return (
      <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
        <div className="flex items-start gap-2 min-w-0">
          <Tag className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="text-sm text-emerald-900 dark:text-emerald-100">
            <span className="font-semibold">{coupon.code}</span> — {savings}{duration}
          </div>
        </div>
        <button
          type="button"
          onClick={clear}
          className="text-xs text-emerald-700 dark:text-emerald-300 hover:underline"
        >
          Remove
        </button>
      </div>
    );
  }
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-steel-400 mb-1.5">
        Promo code (optional)
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              apply();
            }
          }}
          placeholder="e.g. LAUNCH20"
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={apply}
          disabled={!input.trim() || validating}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-steel-700 text-slate-700 dark:text-steel-200 hover:bg-slate-50 dark:hover:bg-steel-800 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {validating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Apply
        </button>
      </div>
      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>
      )}
    </div>
  );
};

const ProrationPreviewBlock: React.FC<{ preview: ProrationPreview; loading: boolean }> = ({
  preview, loading,
}) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-steel-900 text-xs text-slate-500 dark:text-steel-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculating proration…
      </div>
    );
  }
  const fmt = (amt: number) =>
    (amt / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: preview.currency.toUpperCase(),
    });
  return (
    <div className="p-3 rounded-lg bg-slate-50 dark:bg-steel-900 border border-slate-200 dark:border-steel-700 text-sm">
      <p className="font-semibold text-slate-900 dark:text-steel-100 mb-1">Mid-cycle upgrade preview</p>
      <dl className="space-y-0.5 text-xs text-slate-600 dark:text-steel-300">
        {preview.immediateAmount > 0 && (
          <div className="flex justify-between"><dt>New plan (prorated)</dt><dd>{fmt(preview.immediateAmount)}</dd></div>
        )}
        {preview.creditApplied > 0 && (
          <div className="flex justify-between"><dt>Credit from current plan</dt><dd>-{fmt(preview.creditApplied)}</dd></div>
        )}
        <div className="flex justify-between font-semibold text-slate-900 dark:text-steel-100 pt-1 border-t border-slate-200 dark:border-steel-700">
          <dt>Charged now</dt>
          <dd>{fmt(preview.netDue)}</dd>
        </div>
      </dl>
    </div>
  );
};

// ============================================================================
// FEATURE GATE (wrap entire surfaces)
// ============================================================================

interface FeatureGateProps {
  feature: FeatureKey;
  /** Optional custom title for the empty state. */
  title?: string;
  children: React.ReactNode;
}

/**
 * Renders children when the tenant has `feature` enabled, otherwise shows a
 * full-surface upgrade prompt. Use for gating whole tabs/pages (VRM,
 * questionnaire automation, real-time scan). For buttons inside a page, use
 * `GatedButton` instead.
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({ feature, title, children }) => {
  const { hasFeature, minimumPlanFor, plan, loading } = useEntitlement();
  const [modalOpen, setModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        Loading…
      </div>
    );
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  const required = minimumPlanFor(feature) ?? 'enterprise';
  const targetName = PLAN_DISPLAY[required].name;

  return (
    <>
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-steel-100 mb-2">
          {title ?? `Unlock this feature with ${targetName}`}
        </h2>
        <p className="text-sm text-slate-500 dark:text-steel-400 mb-6 max-w-md">
          {PLAN_DISPLAY[required].tagline}
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium inline-flex items-center gap-2"
        >
          See {targetName} plan
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      <UpgradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        result={{ allowed: false, reason: 'feature_not_enabled', currentPlan: plan, requiredPlan: required }}
      />
    </>
  );
};

// ============================================================================
// GATED BUTTON
// ============================================================================

interface GatedButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  feature?: FeatureKey;
  limit?: LimitKey;
  currentUsage?: number;
  onAllow: () => void;
  children: React.ReactNode;
}

/**
 * Wraps a button so that clicking checks the entitlement first and pops the
 * upgrade modal if blocked. When allowed, calls `onAllow`.
 */
export const GatedButton: React.FC<GatedButtonProps> = ({
  feature,
  limit,
  currentUsage,
  onAllow,
  children,
  disabled,
  className,
  ...rest
}) => {
  const { check } = useEntitlement();
  const [result, setResult] = useState<EntitlementResult | null>(null);

  const handleClick = useCallback(() => {
    const res = check({ feature, limit, currentUsage });
    if (res.allowed) {
      onAllow();
    } else {
      setResult(res);
    }
  }, [check, feature, limit, currentUsage, onAllow]);

  return (
    <>
      <button
        {...rest}
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={className}
      >
        {children}
      </button>
      <UpgradeModal
        open={result !== null}
        onClose={() => setResult(null)}
        result={result}
      />
    </>
  );
};
