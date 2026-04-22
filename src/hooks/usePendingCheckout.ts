/**
 * usePendingCheckout
 *
 * The "glue" between the landing-page pricing CTA and Stripe Checkout.
 *
 * The pricing section in LandingPage.tsx sends subscribe clicks to
 * `/login?plan=<tier>&interval=<cycle>`. AuthScreen captures those params
 * into localStorage AND passes them through Clerk's `forceRedirectUrl` so
 * the intent survives email-verification round-trips / OAuth redirects.
 * After auth the user lands on `/app?plan=<tier>&interval=<cycle>`; this
 * hook:
 *
 *   1. Does nothing until the user + tenant are loaded.
 *   2. Reads the intent from the URL first (authoritative, survives every
 *      auth flow), falling back to localStorage for older signup paths.
 *   3. Resolves the Stripe Price ID from `src/constants/billing.ts`.
 *   4. Calls `stripe-create-checkout` and hard-redirects to the returned URL.
 *   5. On any terminal outcome, logs WHY with a `[pending-checkout]` prefix
 *      and a toast where appropriate — silent failures here are worse than
 *      noise. If the checkout endpoint errors, we bounce to billing so the
 *      user has an obvious retry path.
 *
 * Only fires once per session via a ref guard — the effect is idempotent but
 * the redirect isn't, and double-firing would mid-navigate.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { auth } from '../services/auth.service';
import { useEntitlement } from './useEntitlement';
import { useToast } from '../components/ui';
import { PLAN_PRICE_IDS, PLAN_ORDER } from '../constants/billing';
import {
  clearPendingCheckout,
  readPendingCheckout,
  type PendingCheckout,
} from '../lib/pendingCheckout';

const LOG = (...args: unknown[]) => console.log('[pending-checkout]', ...args);
const WARN = (...args: unknown[]) => console.warn('[pending-checkout]', ...args);
const ERR = (...args: unknown[]) => console.error('[pending-checkout]', ...args);

// sessionStorage key for the last-failed priceId: used to prevent an infinite
// retry loop when the server keeps returning 4xx for the same priceId (e.g.
// env-var mismatch). The intent is preserved in localStorage either way so
// a user can manually retry from Settings → Billing.
const LAST_FAIL_KEY = 'pending_checkout_last_fail_v1';
const LAST_FAIL_TTL_MS = 5 * 60 * 1000;

function markFailure(priceId: string): void {
  try {
    sessionStorage.setItem(
      LAST_FAIL_KEY,
      JSON.stringify({ priceId, at: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

function recentlyFailed(priceId: string): boolean {
  try {
    const raw = sessionStorage.getItem(LAST_FAIL_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { priceId?: string; at?: number };
    if (!parsed.priceId || typeof parsed.at !== 'number') return false;
    if (parsed.priceId !== priceId) return false;
    return Date.now() - parsed.at < LAST_FAIL_TTL_MS;
  } catch {
    return false;
  }
}

function clearRecentFailure(): void {
  try {
    sessionStorage.removeItem(LAST_FAIL_KEY);
  } catch {
    /* ignore */
  }
}

const VALID_PLANS = ['starter', 'growth', 'scale'] as const;
const VALID_INTERVALS = ['monthly', 'annual'] as const;

/**
 * Parse `?plan=&interval=` off the current URL. Returns null if either is
 * missing or invalid. This is the authoritative source of intent — it
 * survives Clerk's redirect flows (email verify, OAuth callback) that
 * localStorage may not.
 */
function readPendingFromUrl(): PendingCheckout | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const plan = params.get('plan');
  const interval = params.get('interval') ?? 'annual';
  if (!plan || !(VALID_PLANS as readonly string[]).includes(plan)) return null;
  if (!(VALID_INTERVALS as readonly string[]).includes(interval)) return null;
  return {
    plan: plan as PendingCheckout['plan'],
    interval: interval as PendingCheckout['interval'],
    expiresAt: Date.now() + 60_000,
  };
}

function cleanUrlOfCheckoutParams(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('plan');
    url.searchParams.delete('interval');
    window.history.replaceState({}, '', url.toString());
  } catch {
    /* non-fatal */
  }
}

export function usePendingCheckout(): void {
  const { user } = useAuth();
  const { tenant, loading } = useEntitlement();
  const toast = useToast();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) {
      LOG('already fired this session; skipping');
      return;
    }
    if (loading) {
      LOG('tenant loading; will retry when ready');
      return;
    }
    if (!user) {
      LOG('no authenticated user; skipping');
      return;
    }
    if (!tenant) {
      LOG('no tenant; skipping (will retry when org resolves)');
      return;
    }

    const fromUrl = readPendingFromUrl();
    const fromStorage = readPendingCheckout();
    const pending = fromUrl ?? fromStorage;

    LOG('state:', {
      url: window.location.href,
      currentPlan: tenant.plan,
      fromUrl,
      fromStorage,
      resolved: pending,
    });

    if (!pending) {
      LOG('no pending intent found in URL or localStorage; nothing to do');
      return;
    }

    // If the tenant already has this plan or higher, nothing to upgrade to.
    // Surface this explicitly — users testing the CTA on an org that's
    // already subscribed at or above the target plan would otherwise see
    // silence.
    const currentRank = PLAN_ORDER.indexOf(tenant.plan);
    const targetRank = PLAN_ORDER.indexOf(pending.plan);
    if (tenant.plan === 'enterprise' || (currentRank >= 0 && currentRank >= targetRank)) {
      WARN(
        `tenant is already on "${tenant.plan}" (rank ${currentRank}); target "${pending.plan}" is not an upgrade. Clearing intent.`
      );
      clearPendingCheckout();
      cleanUrlOfCheckoutParams();
      toast.info(
        `You're already on the ${tenant.plan[0].toUpperCase() + tenant.plan.slice(1)} plan`,
        `Upgrades and downgrades can be managed from Settings → Billing.`
      );
      return;
    }

    const priceIds = PLAN_PRICE_IDS[pending.plan];
    const priceId = pending.interval === 'annual' ? priceIds.annual : priceIds.monthly;

    LOG('resolved priceId:', priceId || '(empty)');

    if (!priceId) {
      const varName = `VITE_STRIPE_PRICE_${pending.plan.toUpperCase()}_${pending.interval.toUpperCase()}`;
      ERR(
        `${varName} is empty — Stripe Price ID is not configured in this build. Set it in Netlify → Environment and trigger a rebuild.`
      );
      clearPendingCheckout();
      cleanUrlOfCheckoutParams();
      toast.error(
        'Checkout not configured',
        `${varName} is missing from this environment. Contact support or retry from Settings → Billing once it's set.`
      );
      return;
    }

    if (recentlyFailed(priceId)) {
      WARN(
        `skipping auto-retry — same priceId failed within last 5 min. User can retry manually from Settings → Billing.`
      );
      firedRef.current = true;
      return;
    }

    firedRef.current = true;

    (async () => {
      try {
        LOG(
          `opening Stripe Checkout for ${pending.plan}/${pending.interval} (priceId=${priceId.slice(0, 12)}…)`
        );
        const token = (await auth.getAccessToken()) ?? '';
        const res = await fetch('/.netlify/functions/stripe-create-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            priceId,
            interval: pending.interval,
            successPath: '/app?tab=settings&checkout=success',
            cancelPath: '/app?tab=settings&checkout=cancel',
          }),
        });

        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !json.url) {
          const msg = json.error || `Checkout failed (HTTP ${res.status})`;
          ERR('stripe-create-checkout failed:', msg, json);
          throw new Error(msg);
        }

        LOG('redirecting to Stripe Checkout:', json.url);
        clearPendingCheckout();
        cleanUrlOfCheckoutParams();
        clearRecentFailure();
        window.location.href = json.url;
      } catch (err) {
        // Leave pending intent in both URL and localStorage: a 4xx from the
        // checkout endpoint is usually a transient config mismatch (the most
        // common cause is env-var drift between VITE_STRIPE_PRICE_* and
        // STRIPE_PRICE_*). If we clear the intent now we also cause a nasty
        // race with any concurrent window.location.reload() from the org
        // onboarding flow — the reload would pick up the cleaned URL and
        // lose all recovery paths. Keeping intent means a retry just works
        // once the env var is fixed.
        //
        // Mark this priceId as recently failed so we don't loop on hard
        // refresh. The user can still manually retry from Settings → Billing
        // (which uses a fresh UpgradeGate call, not this hook).
        markFailure(priceId);
        firedRef.current = false;
        const detail = err instanceof Error ? err.message : String(err);
        ERR('terminal failure (intent preserved for retry):', detail);
        toast.error(
          "We couldn't open checkout",
          `${detail}. Your plan selection is saved — this usually means a Stripe Price ID env var is mismatched between client and server.`
        );
      }
    })();
  }, [user, tenant, loading, toast]);
}
