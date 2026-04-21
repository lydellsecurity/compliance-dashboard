/**
 * usePendingCheckout
 *
 * The "glue" between the landing-page pricing CTA and Stripe Checkout.
 *
 * The pricing section in LandingPage.tsx sends subscribe clicks to
 * `/login?plan=<tier>&interval=<cycle>`. AuthScreen captures those query
 * params and persists them to localStorage (`pendingCheckout.ts`). This
 * hook runs at the authenticated app root and:
 *
 *   1. Does nothing until the tenant is loaded AND has an org id.
 *   2. Reads the persisted selection; no-ops if missing or expired.
 *   3. Resolves the Stripe Price ID from `src/constants/billing.ts`.
 *   4. Calls `stripe-create-checkout` and hard-redirects to the returned URL.
 *   5. Clears the pending selection on any terminal outcome (success
 *      redirect, missing Stripe config, checkout failure) so the user
 *      doesn't get looped on retry.
 *
 * Only fires once per session via a ref guard — the effect is idempotent
 * but the redirect isn't, and double-firing would mid-navigate.
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
} from '../lib/pendingCheckout';

export function usePendingCheckout(): void {
  const { user } = useAuth();
  const { tenant, loading } = useEntitlement();
  const toast = useToast();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (loading) return;
    if (!user || !tenant) return;

    const pending = readPendingCheckout();
    if (!pending) return;

    // Already on this plan or higher — nothing to upgrade.
    if (tenant.plan === pending.plan || tenant.plan === 'enterprise') {
      clearPendingCheckout();
      return;
    }

    const priceIds = PLAN_PRICE_IDS[pending.plan];
    const priceId = pending.interval === 'annual' ? priceIds.annual : priceIds.monthly;

    // No Stripe config in this environment — fail softly with a toast so
    // the user understands why checkout didn't open. Clear pending so the
    // toast doesn't re-fire on every mount.
    if (!priceId) {
      clearPendingCheckout();
      toast.info(
        'Checkout not available',
        "We couldn't redirect you to Stripe Checkout in this environment. You can still upgrade from Settings → Billing."
      );
      return;
    }

    firedRef.current = true;

    (async () => {
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
            interval: pending.interval,
            successPath: '/app?tab=settings&checkout=success',
            cancelPath: '/app?tab=settings&checkout=cancel',
          }),
        });

        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !json.url) {
          throw new Error(json.error || 'Checkout failed');
        }

        // Clear before redirect so the back button doesn't re-trigger.
        clearPendingCheckout();
        window.location.href = json.url;
      } catch (err) {
        clearPendingCheckout();
        firedRef.current = false;
        toast.error(
          "We couldn't open checkout",
          err instanceof Error ? err.message : 'Please try again from Settings → Billing.'
        );
      }
    })();
  }, [user, tenant, loading, toast]);
}
