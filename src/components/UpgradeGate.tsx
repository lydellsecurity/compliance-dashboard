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

import React, { useCallback, useMemo, useState } from 'react';
import { Sparkles, Check, ArrowRight, ArrowUp } from 'lucide-react';
import { auth } from '../services/auth.service';
import { Modal } from './ui/Modal';
import { GLOSSARY, GlossaryTerm } from './ui/Tooltip';

/**
 * Render a feature-highlight string, expanding `@term` tokens into
 * <GlossaryTerm /> so jargon in the upgrade modal is hoverable.
 *
 * Example: "75 users + @sso / @saml" → "75 users + <SSO> / <SAML>"
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
};

function formatLimit(limit: LimitKey, value: number): string {
  if (value === -1) return 'Unlimited';
  if (limit === 'maxStorageGb') return `${value} GB`;
  if (limit === 'retentionDays' || limit === 'auditLogDays') return `${value} days`;
  if (limit === 'apiRateLimit') return `${value}/min`;
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

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  open,
  onClose,
  result,
  targetPlan,
}) => {
  const [interval, setInterval] = useState<'annual' | 'monthly'>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ priceId, interval }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Checkout failed');
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoading(false);
    }
  }, [plan, interval, onClose]);

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

          {error && (
            <div className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubscribe}
            disabled={loading || !isUpgrade(current, plan)}
            className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-steel-700 text-white font-medium transition flex items-center justify-center gap-2"
          >
            {loading ? 'Redirecting…' : display.cta === 'contact_sales' ? 'Contact sales' : `Upgrade to ${display.name}`}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>

          <p className="text-xs text-center text-slate-500 dark:text-steel-400">
            {plan !== 'enterprise' && '14-day free trial. Cancel anytime.'}
          </p>
        </div>
    </Modal>
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
