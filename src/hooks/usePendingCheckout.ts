/**
 * usePendingCheckout
 *
 * The "glue" between the landing-page pricing CTA and Stripe Checkout.
 *
 * The pricing section in LandingPage.tsx sends subscribe clicks to
 * `/login?plan=<tier>&interval=<cycle>`. AuthScreen captures those params
 * into localStorage AND passes them through Clerk's `afterSignInUrl` so the
 * intent survives email-verification round-trips / OAuth redirects. After
 * auth, the user lands on `/app?plan=<tier>&interval=<cycle>`; this hook:
 *
 *   1. Does nothing until the user + tenant are loaded.
 *   2. Reads the intent from the URL first (authoritative, survives every
 *      auth flow), falling back to localStorage for older signup paths.
 *   3. Resolves the Stripe Price ID from `src/constants/billing.ts`.
 *   4. Calls `stripe-create-checkout` and hard-redirects to the returned URL.
 *   5. On any terminal failure (missing config, network error, 4xx/5xx),
 *      surfaces a visible toast AND redirects to /app?tab=settings so the
 *      user has an obvious retry path — silence here is worse than noise.
 *
 * Only fires once per session via a ref guard — the effect is idempotent but
 * the redirect isn't, and double-firing would mid-navigate.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { auth } from '../services/auth.service';
import { useEntitlement } from './useEntitlement';
import { useToast } from '../components/ui';
import { PLAN_PRICE_IDS } from '../constants/billing';
import {
  clearPendingCheckout,
  readPendingCheckout,
  type PendingCheckout,
} from '../lib/pendingCheckout';

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
    expiresAt: Date.now() + 60_000, // URL-derived intents never expire here
  };
}

/**
 * Strip the checkout params off the URL after we've acted on them. Keeps
 * the address bar clean and prevents a browser back/refresh from re-firing
 * checkout indefinitely.
 */
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
    if (firedRef.current) return;
    if (loading) return;
    if (!user || !tenant) return;

    // URL wins — it's the channel Clerk preserves through every auth flow.
    // localStorage is a belt-and-suspenders fallback for older signup paths
    // that landed on /app without query params.
    const pending = readPendingFromUrl() ?? readPendingCheckout();
    if (!pending) return;

    // Same-plan or higher — nothing to do. Clean up both sources so we
    // don't keep asking on every remount.
    if (tenant.plan === pending.plan || tenant.plan === 'enterprise') {
      clearPendingCheckout();
      cleanUrlOfCheckoutParams();
      return;
    }

    const priceIds = PLAN_PRICE_IDS[pending.plan];
    const priceId = pending.interval === 'annual' ? priceIds.annual : priceIds.monthly;

    // Missing env-var priceId: the Netlify build didn't embed
    // VITE_STRIPE_PRICE_<plan>_<interval>. Surface the *specific* missing var
    // so the operator can spot it in logs.
    if (!priceId) {
      const varName = `VITE_STRIPE_PRICE_${pending.plan.toUpperCase()}_${pending.interval.toUpperCase()}`;
      console.error(
        `[pending-checkout] ${varName} is empty — Stripe Price ID is not configured in this build. Set it in Netlify and redeploy.`
      );
      clearPendingCheckout();
      cleanUrlOfCheckoutParams();
      toast.error(
        'Checkout not configured',
        `Contact support — ${varName} is missing from this environment. You can retry from Settings → Billing once it's set.`
      );
      return;
    }

    firedRef.current = true;

    (async () => {
      try {
        console.log(
          `[pending-checkout] Opening Stripe Checkout for ${pending.plan}/${pending.interval} (priceId=${priceId.slice(0, 8)}…)`
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
          console.error('[pending-checkout] stripe-create-checkout failed:', msg, json);
          throw new Error(msg);
        }

        // Clear before redirect so the back button doesn't re-trigger.
        clearPendingCheckout();
        cleanUrlOfCheckoutParams();
        window.location.href = json.url;
      } catch (err) {
        clearPendingCheckout();
        cleanUrlOfCheckoutParams();
        firedRef.current = false;
        const detail = err instanceof Error ? err.message : String(err);
        console.error('[pending-checkout] terminal failure:', detail);
        toast.error(
          "We couldn't open checkout",
          `${detail}. Redirecting you to billing settings — you can retry from there.`
        );
        // Bounce to billing so the user has a clear retry path — a silent
        // failure on /app is worse than a visible one on the billing page.
        setTimeout(() => {
          window.location.href = '/app?tab=settings&section=billing&checkout=error';
        }, 1500);
      }
    })();
  }, [user, tenant, loading, toast]);
}
