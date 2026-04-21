/**
 * DowngradeWarning
 *
 * Shown when a user arrives at `/settings/billing?downgrade=confirm` from the
 * Stripe Customer Portal's custom-confirmation-URL hook. Before Stripe
 * actually applies the downgrade at period end, we surface a summary of what
 * the tenant will lose so they can back out.
 *
 * Stripe Portal configuration:
 *   Customer Portal → Subscriptions → When a customer cancels → Configure a
 *   custom flow → Redirect after confirmation to:
 *     https://<app>/settings/billing?downgrade=confirm&to=<plan>
 *
 * Until that portal config is set, this component won't render — the query
 * param is never present. See docs/TODO_FOLLOWUPS.md #5.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, X, Users, ShoppingBag, Globe, Key, Sparkles, Loader2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useEntitlement } from '../hooks/useEntitlement';
import { auth } from '../services/auth.service';
import { PLAN_CONFIGS, type TenantFeatures, type TenantPlan } from '../services/multi-tenant.service';
import { PLAN_DISPLAY, PLAN_ORDER } from '../constants/billing';

interface DowngradeFinding {
  key: string;
  label: string;
  current: number;
  cap: number;
  excess: number;
}

interface DowngradeWarningProps {
  open: boolean;
  targetPlan: TenantPlan;
  onConfirm: () => void;
  onCancel: () => void;
}

// Features that *disappear* on downgrade get a human-readable loss summary.
// Order matters — list the highest-impact losses first.
const FEATURE_LOSS_COPY: Array<{
  key: keyof TenantFeatures;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: 'ssoEnabled', label: 'SSO / SAML sign-in will stop working — users will need password login', icon: <Key className="w-4 h-4" /> },
  { key: 'scimProvisioning', label: 'SCIM auto-provisioning will stop — you\'ll manage users manually', icon: <Users className="w-4 h-4" /> },
  { key: 'customDomain', label: 'Your custom Trust Center domain will stop resolving', icon: <Globe className="w-4 h-4" /> },
  { key: 'vendorRisk', label: 'Vendor Risk Management becomes read-only — no new vendors or assessments', icon: <ShoppingBag className="w-4 h-4" /> },
  { key: 'questionnaireAutomation', label: 'AI questionnaire autofill stops — answers fall back to manual', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'aiRemediationChat', label: 'AI Remediation Chat will be disabled', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'realTimeRegulatoryScan', label: 'Regulatory scanning drops from real-time to daily digest', icon: <AlertTriangle className="w-4 h-4" /> },
  { key: 'auditBundleExport', label: 'Audit bundle export becomes unavailable', icon: <AlertTriangle className="w-4 h-4" /> },
  { key: 'advancedReporting', label: 'Advanced reporting features are removed', icon: <AlertTriangle className="w-4 h-4" /> },
  { key: 'apiAccess', label: 'API access is revoked — existing API keys will stop working', icon: <Key className="w-4 h-4" /> },
  { key: 'customBranding', label: 'Custom logos and colors revert to defaults', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'incidentResponse', label: 'Incident Response engine becomes read-only', icon: <AlertTriangle className="w-4 h-4" /> },
];

export const DowngradeWarning: React.FC<DowngradeWarningProps> = ({
  open,
  targetPlan,
  onConfirm,
  onCancel,
}) => {
  const { plan: currentPlan } = useEntitlement();
  const [preflight, setPreflight] = useState<{ blocked: boolean; findings: DowngradeFinding[] } | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPreflight(null);
      return;
    }
    let cancelled = false;
    setPreflightLoading(true);
    (async () => {
      try {
        const token = (await auth.getAccessToken()) ?? '';
        const res = await fetch('/.netlify/functions/billing-downgrade-preflight', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ targetPlan }),
        });
        const json = await res.json();
        if (!cancelled && res.ok) {
          setPreflight({ blocked: !!json.blocked, findings: json.findings || [] });
        }
      } catch {
        // Non-fatal; the static copy still warns.
      } finally {
        if (!cancelled) setPreflightLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, targetPlan]);

  const losses = useMemo(() => {
    const fromConfig = PLAN_CONFIGS[currentPlan];
    const toConfig = PLAN_CONFIGS[targetPlan];
    const featureLosses = FEATURE_LOSS_COPY.filter(
      (entry) => fromConfig.features[entry.key] && !toConfig.features[entry.key]
    );

    // Numeric limits that shrink — list the ones where going over cap causes
    // real data loss (users, vendors, integrations). Storage downsize is
    // handled by a separate migration flow.
    const limitLosses: Array<{ label: string; from: string; to: string }> = [];
    const limitsToCheck: Array<{ key: keyof typeof fromConfig.limits; label: string }> = [
      { key: 'maxUsers', label: 'Users' },
      { key: 'maxIntegrations', label: 'Active integrations' },
      { key: 'maxEvidence', label: 'Evidence records' },
    ];
    for (const { key, label } of limitsToCheck) {
      const fromVal = fromConfig.limits[key];
      const toVal = toConfig.limits[key];
      if (fromVal === -1 && toVal !== -1) {
        limitLosses.push({ label, from: 'Unlimited', to: String(toVal) });
      } else if (fromVal > toVal && toVal !== -1) {
        limitLosses.push({ label, from: String(fromVal), to: String(toVal) });
      }
    }

    return { featureLosses, limitLosses };
  }, [currentPlan, targetPlan]);

  const isUpgrade = PLAN_ORDER.indexOf(targetPlan) > PLAN_ORDER.indexOf(currentPlan);

  // If the user somehow hit this flow for an upgrade, just bounce — nothing
  // to warn about.
  if (isUpgrade) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="lg"
      title={`Confirm downgrade to ${PLAN_DISPLAY[targetPlan].name}`}
      description={`You're currently on ${PLAN_DISPLAY[currentPlan].name}. Here's what changes at the end of your billing period.`}
    >
      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-amber-900 dark:text-amber-100">
            Your data is never deleted. Affected features become read-only for 90 days,
            giving you time to export or re-upgrade before anything is enforced.
          </p>
        </div>

        {preflightLoading && (
          <div className="flex items-center gap-2 p-3 text-sm text-slate-500 dark:text-steel-400 bg-slate-50 dark:bg-steel-900 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking for resources over the new limits…
          </div>
        )}

        {preflight?.blocked && preflight.findings.length > 0 && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
            <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-100 mb-2">
              You're over the new plan's caps
            </h3>
            <ul className="space-y-1.5 text-sm">
              {preflight.findings.map((f) => (
                <li key={f.key} className="flex justify-between gap-3 text-rose-900 dark:text-rose-100">
                  <span>{f.label}</span>
                  <span className="tabular-nums font-medium">
                    {f.current.toLocaleString()} / {f.cap === 0 ? '0' : f.cap.toLocaleString()} &nbsp;
                    <span className="text-xs opacity-80">(remove {f.excess.toLocaleString()})</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-rose-800 dark:text-rose-200 mt-2">
              Remove the excess before your billing period ends to avoid enforcement.
            </p>
          </div>
        )}

        {losses.featureLosses.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-steel-400 mb-2">
              Features you'll lose
            </h3>
            <ul className="space-y-2">
              {losses.featureLosses.map((loss) => (
                <li
                  key={loss.key}
                  className="flex items-start gap-2 text-sm text-slate-800 dark:text-steel-200"
                >
                  <span className="text-rose-500 mt-0.5 shrink-0">{loss.icon}</span>
                  <span>{loss.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {losses.limitLosses.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-steel-400 mb-2">
              Tightened limits
            </h3>
            <ul className="space-y-1.5">
              {losses.limitLosses.map((l) => (
                <li
                  key={l.label}
                  className="flex items-center justify-between text-sm text-slate-800 dark:text-steel-200"
                >
                  <span>{l.label}</span>
                  <span className="text-xs tabular-nums text-slate-500 dark:text-steel-400">
                    {l.from} <ArrowRight className="inline w-3 h-3 -mt-0.5" aria-hidden /> <span className="font-medium text-rose-600 dark:text-rose-400">{l.to}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 dark:text-steel-400 mt-2">
              If you're over a new cap, you'll need to remove excess records before the
              downgrade takes effect at period end.
            </p>
          </div>
        )}

        {losses.featureLosses.length === 0 && losses.limitLosses.length === 0 && (
          <p className="text-sm text-slate-600 dark:text-steel-400">
            No active features will be lost on this downgrade.
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-steel-700 text-slate-700 dark:text-steel-200 hover:bg-slate-50 dark:hover:bg-steel-800 font-medium"
          >
            <X className="w-4 h-4 inline -mt-0.5 mr-1" aria-hidden />
            Keep {PLAN_DISPLAY[currentPlan].name}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium"
          >
            Downgrade at period end
          </button>
        </div>
      </div>
    </Modal>
  );
};
