/**
 * Billing constants — single source of truth for Stripe Price IDs and plan
 * metadata used by the checkout, webhook, and upgrade-gate UI.
 *
 * Price IDs are resolved from Vite env vars at runtime. Provision the Stripe
 * Products/Prices in the dashboard (see docs/MONETIZATION_PLAN.md §7.1) and
 * populate the following env vars in .env.local (dev) and Netlify config (prod):
 *
 *   VITE_STRIPE_PUBLIC_KEY
 *   VITE_STRIPE_PRICE_STARTER_MONTHLY / _ANNUAL
 *   VITE_STRIPE_PRICE_GROWTH_MONTHLY  / _ANNUAL
 *   VITE_STRIPE_PRICE_SCALE_MONTHLY   / _ANNUAL
 *   VITE_STRIPE_PRICE_SEAT_STARTER / _GROWTH / _SCALE
 *   VITE_STRIPE_PRICE_AI_POLICY_BLOCK_50
 *   VITE_STRIPE_PRICE_QUESTIONNAIRE_BLOCK_10
 *   VITE_STRIPE_PRICE_VENDOR_BLOCK_25
 *   VITE_STRIPE_PRICE_CSM_MONTHLY
 *   VITE_STRIPE_PRICE_AUDIT_BUNDLE
 *
 * The webhook function on the server side uses STRIPE_SECRET_KEY and
 * STRIPE_WEBHOOK_SECRET (no VITE_ prefix).
 */

import type { BillingInterval, TenantPlan } from '../services/multi-tenant.service';

// ============================================================================
// PUBLIC (CLIENT) CONFIG
// ============================================================================

export const STRIPE_PUBLIC_KEY: string =
  (import.meta.env?.VITE_STRIPE_PUBLIC_KEY as string | undefined) ?? '';

// ============================================================================
// PRICE ID RESOLUTION
// ============================================================================

type PaidPlan = Exclude<TenantPlan, 'free' | 'enterprise'>;

interface PlanPriceIds {
  monthly: string;
  annual: string;
}

/**
 * Resolves a Stripe Price ID from the Vite env. Returns an empty string if the
 * env var isn't set so builds don't fail in environments where Stripe hasn't
 * been configured yet (e.g. a contributor running locally without billing).
 * Checkout calls guard against empty price IDs and show a clear error.
 */
function readEnv(name: string): string {
  return (import.meta.env?.[name] as string | undefined) ?? '';
}

export const PLAN_PRICE_IDS: Record<PaidPlan, PlanPriceIds> = {
  starter: {
    monthly: readEnv('VITE_STRIPE_PRICE_STARTER_MONTHLY'),
    annual: readEnv('VITE_STRIPE_PRICE_STARTER_ANNUAL'),
  },
  growth: {
    monthly: readEnv('VITE_STRIPE_PRICE_GROWTH_MONTHLY'),
    annual: readEnv('VITE_STRIPE_PRICE_GROWTH_ANNUAL'),
  },
  scale: {
    monthly: readEnv('VITE_STRIPE_PRICE_SCALE_MONTHLY'),
    annual: readEnv('VITE_STRIPE_PRICE_SCALE_ANNUAL'),
  },
};

export const ADDON_PRICE_IDS = {
  seatStarter: readEnv('VITE_STRIPE_PRICE_SEAT_STARTER'),
  seatGrowth: readEnv('VITE_STRIPE_PRICE_SEAT_GROWTH'),
  seatScale: readEnv('VITE_STRIPE_PRICE_SEAT_SCALE'),
  aiPolicyBlock50: readEnv('VITE_STRIPE_PRICE_AI_POLICY_BLOCK_50'),
  questionnaireBlock10: readEnv('VITE_STRIPE_PRICE_QUESTIONNAIRE_BLOCK_10'),
  vendorBlock25: readEnv('VITE_STRIPE_PRICE_VENDOR_BLOCK_25'),
  csm: readEnv('VITE_STRIPE_PRICE_CSM_MONTHLY'),
  auditBundle: readEnv('VITE_STRIPE_PRICE_AUDIT_BUNDLE'),
} as const;

/**
 * Reverse lookup: given a Stripe Price ID, find the plan + interval. Used by
 * the webhook when processing `customer.subscription.updated` to re-resolve
 * the tenant's plan state from the Price on the primary subscription item.
 */
export function resolvePlanFromPriceId(
  priceId: string
): { plan: PaidPlan; interval: BillingInterval } | null {
  for (const plan of Object.keys(PLAN_PRICE_IDS) as PaidPlan[]) {
    const ids = PLAN_PRICE_IDS[plan];
    if (ids.monthly && priceId === ids.monthly) return { plan, interval: 'monthly' };
    if (ids.annual && priceId === ids.annual) return { plan, interval: 'annual' };
  }
  return null;
}

// ============================================================================
// DISPLAY METADATA
// ============================================================================

export interface PlanDisplay {
  key: TenantPlan;
  name: string;
  tagline: string;
  targetBuyer: string;
  featureHighlights: string[];
  cta: 'start_free' | 'subscribe' | 'contact_sales';
}

export const PLAN_DISPLAY: Record<TenantPlan, PlanDisplay> = {
  free: {
    key: 'free',
    name: 'Free',
    tagline: 'Start your compliance journey — no card required.',
    targetBuyer: 'Founders exploring compliance pre-revenue',
    featureHighlights: [
      '1 framework',
      'Up to 3 users',
      'Public Trust Center',
      '3 AI policy generations / month',
    ],
    cta: 'start_free',
  },
  starter: {
    key: 'starter',
    name: 'Starter',
    tagline: 'Everything you need to get audit-ready on your first framework.',
    targetBuyer: '<50 employees, first SOC 2 or ISO 27001',
    featureHighlights: [
      '1 framework, all 236 controls',
      '10 users',
      'Cloud connectors (AWS/Azure/GCP)',
      'Incident Response engine',
      'Compliance certificate',
    ],
    cta: 'subscribe',
  },
  growth: {
    key: 'growth',
    name: 'Growth',
    tagline: 'Multi-framework compliance with AI-assisted remediation.',
    targetBuyer: '50–200 employees, multiple audits',
    featureHighlights: [
      '3 frameworks with cross-walk',
      '25 users',
      'Vendor Risk Management (25 vendors)',
      'AI Remediation Chat',
      'Questionnaire autofill',
      'Read-only API',
      'Audit-ready export',
    ],
    cta: 'subscribe',
  },
  scale: {
    key: 'scale',
    name: 'Scale',
    tagline: 'Enterprise-grade controls without the enterprise price tag.',
    targetBuyer: '200–500 employees, procurement heat',
    // Feature strings may reference glossary keys via the pattern `@sso` /
    // `@saml` / `@scim` / `@rbac` / `@mfa`. UpgradeGate renders those with a
    // tooltip so non-technical admins can see definitions inline.
    featureHighlights: [
      'All 6 frameworks',
      '75 users + @sso / @saml',
      'Real-time regulatory scanning',
      'White-label Trust Center + custom domain',
      'Full read/write API',
      '150 vendors',
    ],
    cta: 'subscribe',
  },
  enterprise: {
    key: 'enterprise',
    name: 'Enterprise',
    tagline: 'Custom frameworks, @scim, and a dedicated CSM.',
    targetBuyer: '500+ employees, FedRAMP / PCI L1 / on-prem',
    featureHighlights: [
      'Unlimited everything',
      '@scim provisioning',
      'Custom frameworks + mappings',
      'Dedicated CSM, 1-hour SLA',
      'DPA, MSA, custom terms',
      'On-prem deployment option',
    ],
    cta: 'contact_sales',
  },
};

// ============================================================================
// UPGRADE PATH HELPER
// ============================================================================

/**
 * Ordered list of plans from lowest to highest. Drives upgrade-path math in
 * the `useEntitlement` hook and upgrade modal.
 */
export const PLAN_ORDER: readonly TenantPlan[] = [
  'free',
  'starter',
  'growth',
  'scale',
  'enterprise',
] as const;

export function isUpgrade(from: TenantPlan, to: TenantPlan): boolean {
  return PLAN_ORDER.indexOf(to) > PLAN_ORDER.indexOf(from);
}

/** Returns the next paid tier up from `plan`, or null if `plan` is enterprise. */
export function nextPlan(plan: TenantPlan): TenantPlan | null {
  const idx = PLAN_ORDER.indexOf(plan);
  if (idx === -1 || idx === PLAN_ORDER.length - 1) return null;
  return PLAN_ORDER[idx + 1];
}

// ============================================================================
// TRIAL / COUPON CONSTANTS
// ============================================================================

export const TRIAL_DAYS = 14;

/** Stripe Coupon IDs — created manually in the Stripe dashboard. */
export const COUPON_IDS = {
  launch20: 'LAUNCH20',
  nonprofit30: 'NONPROFIT30',
  yc3months: 'YC_3MO_FREE',
  switcherCredit: 'SWITCHER_2K',
} as const;
