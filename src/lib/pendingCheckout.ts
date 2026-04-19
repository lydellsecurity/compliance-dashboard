/**
 * Pending checkout selection.
 *
 * When a user clicks a pricing-page CTA they land on `/login?plan=growth&interval=annual`.
 * Auth flows (especially signup → email confirmation) break that query string long
 * before we can actually open Stripe Checkout. This module is the persistence layer
 * that survives those round-trips via localStorage, then gets consumed once the
 * user is fully authed and has a tenant.
 *
 * TTL is 24 hours. Beyond that we assume the intent is stale and clear it so a
 * user returning a week later isn't surprised by a checkout redirect.
 */

import type { TenantPlan } from '../services/multi-tenant.service';

const STORAGE_KEY = 'pending_checkout_v1';
const TTL_MS = 24 * 60 * 60 * 1000;

const VALID_PLANS: TenantPlan[] = ['starter', 'growth', 'scale'];
const VALID_INTERVALS = ['monthly', 'annual'] as const;
type BillingInterval = (typeof VALID_INTERVALS)[number];

export interface PendingCheckout {
  plan: Exclude<TenantPlan, 'free' | 'enterprise'>;
  interval: BillingInterval;
  /** Unix ms when this record becomes stale. */
  expiresAt: number;
}

function isValidPlan(s: unknown): s is PendingCheckout['plan'] {
  return typeof s === 'string' && (VALID_PLANS as string[]).includes(s);
}

function isValidInterval(s: unknown): s is BillingInterval {
  return typeof s === 'string' && (VALID_INTERVALS as readonly string[]).includes(s);
}

/**
 * Read query params from the current URL and, if they describe a valid plan
 * selection, persist them. Call from AuthScreen on mount. Returns the captured
 * selection (for UI acknowledgement) or null.
 */
export function capturePendingCheckoutFromUrl(): PendingCheckout | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const plan = params.get('plan');
  const interval = params.get('interval') ?? 'annual';
  if (!isValidPlan(plan)) return null;
  if (!isValidInterval(interval)) return null;

  const pending: PendingCheckout = {
    plan,
    interval,
    expiresAt: Date.now() + TTL_MS,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    /* storage unavailable — pending selection is in-memory only via the return value */
  }
  return pending;
}

/**
 * Read the persisted selection if it's still fresh. Returns null if missing
 * or expired (and clears the expired record so subsequent calls short-circuit).
 */
export function readPendingCheckout(): PendingCheckout | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingCheckout>;
    if (
      !isValidPlan(parsed.plan) ||
      !isValidInterval(parsed.interval) ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null;
    }
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as PendingCheckout;
  } catch {
    return null;
  }
}

/** Clear the persisted selection. Call after the checkout redirect fires or fails. */
export function clearPendingCheckout(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
}
