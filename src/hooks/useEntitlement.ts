/**
 * useEntitlement
 *
 * Client-side entitlement hook. Reads the caller's tenant once, caches it,
 * and exposes helpers for feature gating + upgrade CTAs.
 *
 * IMPORTANT: this hook is for UX only. Every gated *action* (policy generation,
 * report generation, VRM write, etc.) must also call the `entitlements-check`
 * Netlify function server-side so that a tampered client can't bypass limits.
 * See netlify/functions/entitlements-check.cjs.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  multiTenant,
  PLAN_CONFIGS,
  type Tenant,
  type TenantFeatures,
  type TenantLimits,
  type TenantPlan,
} from '../services/multi-tenant.service';
import { PLAN_ORDER, isUpgrade, nextPlan } from '../constants/billing';

// ============================================================================
// TYPES
// ============================================================================

export type LimitKey = keyof TenantLimits;
export type FeatureKey = keyof TenantFeatures;

export interface EntitlementResult {
  allowed: boolean;
  reason?: 'not_authenticated' | 'feature_not_enabled' | 'limit_reached' | 'ai_credits_exhausted' | 'unknown';
  /**
   * Concrete gate key the check failed on — either a FeatureKey (e.g.
   * 'vendorRisk'), a LimitKey (e.g. 'maxUsers'), or a virtual key like
   * 'maxAiCredits'. Used by UpgradeModal to render context-aware copy.
   */
  gate?: string;
  /** Minimum plan that enables the gate. */
  requiredPlan?: TenantPlan;
  /** Current plan at call time. */
  currentPlan?: TenantPlan;
  /** For limit checks: current usage and cap. */
  used?: number;
  cap?: number;
}

export interface UseEntitlementReturn {
  tenant: Tenant | null;
  plan: TenantPlan;
  loading: boolean;
  /** True if the tenant's `features[feature]` is enabled. */
  hasFeature: (feature: FeatureKey) => boolean;
  /** True if the tenant is within `limits[limit]` (or limit is -1/unlimited). */
  withinLimit: (limit: LimitKey, currentUsage?: number) => boolean;
  /** Single-call gate: checks feature + limit together. */
  check: (opts: { feature?: FeatureKey; limit?: LimitKey; currentUsage?: number }) => EntitlementResult;
  /** Minimum plan that enables a feature, or `null` if none of the paid plans do. */
  minimumPlanFor: (feature: FeatureKey) => TenantPlan | null;
  /** Next upgrade tier from the current plan. */
  suggestedUpgrade: TenantPlan | null;
  /** Force refresh of the cached tenant (call after a successful checkout). */
  refresh: () => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useEntitlement(): UseEntitlementReturn {
  const { currentOrg } = useOrganization();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const orgId = currentOrg?.id;
    if (!orgId) {
      console.log('[useEntitlement] no currentOrg yet; tenant stays null');
      setTenant(null);
      setLoading(false);
      return;
    }
    console.log(`[useEntitlement] loading tenant for org ${orgId}`);
    setLoading(true);
    const t = await multiTenant.getTenant(orgId);
    if (!t) {
      console.warn(
        `[useEntitlement] getTenant(${orgId}) returned null — Stripe checkout handoff will not fire until this resolves`
      );
    } else {
      console.log(`[useEntitlement] tenant loaded:`, { id: t.id, plan: t.plan });
    }
    setTenant(t);
    setLoading(false);
  }, [currentOrg?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const plan: TenantPlan = tenant?.plan ?? 'free';

  const hasFeature = useCallback(
    (feature: FeatureKey): boolean => {
      if (!tenant) return false;
      return tenant.features[feature] === true;
    },
    [tenant]
  );

  const withinLimit = useCallback(
    (limit: LimitKey, currentUsage?: number): boolean => {
      if (!tenant) return false;
      const cap = tenant.limits[limit];
      if (cap === -1) return true;
      const used = currentUsage ?? resolveUsageFromTenant(tenant, limit);
      return used < cap;
    },
    [tenant]
  );

  const minimumPlanFor = useCallback((feature: FeatureKey): TenantPlan | null => {
    for (const p of PLAN_ORDER) {
      if (PLAN_CONFIGS[p].features[feature] === true) return p;
    }
    return null;
  }, []);

  const check = useCallback<UseEntitlementReturn['check']>(
    ({ feature, limit, currentUsage }) => {
      if (!tenant) {
        return { allowed: false, reason: 'not_authenticated' };
      }
      if (feature && !hasFeature(feature)) {
        const required = minimumPlanFor(feature) ?? 'enterprise';
        return {
          allowed: false,
          reason: 'feature_not_enabled',
          gate: feature,
          currentPlan: plan,
          requiredPlan: isUpgrade(plan, required) ? required : plan,
        };
      }
      if (limit) {
        const cap = tenant.limits[limit];
        const used = currentUsage ?? resolveUsageFromTenant(tenant, limit);
        if (cap !== -1 && used >= cap) {
          // Required plan is the next tier up that has a larger (or unlimited) cap.
          const required = findNextTierWithHigherLimit(plan, limit, cap) ?? 'enterprise';
          return {
            allowed: false,
            reason: 'limit_reached',
            gate: limit,
            currentPlan: plan,
            requiredPlan: required,
            used,
            cap,
          };
        }
      }
      return { allowed: true, currentPlan: plan };
    },
    [tenant, hasFeature, minimumPlanFor, plan]
  );

  const suggestedUpgrade = useMemo(() => nextPlan(plan), [plan]);

  return {
    tenant,
    plan,
    loading,
    hasFeature,
    withinLimit,
    check,
    minimumPlanFor,
    suggestedUpgrade,
    refresh: load,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function resolveUsageFromTenant(tenant: Tenant, limit: LimitKey): number {
  switch (limit) {
    case 'maxUsers':        return tenant.usage.usersCount;
    case 'maxControls':     return tenant.usage.controlsCount;
    case 'maxEvidence':     return tenant.usage.evidenceCount;
    case 'maxIntegrations': return tenant.usage.integrationsCount;
    case 'maxStorageGb':    return Math.round(tenant.usage.storageUsedMb / 1024);
    default:                return 0;
  }
}

function findNextTierWithHigherLimit(
  currentPlan: TenantPlan,
  limit: LimitKey,
  currentCap: number
): TenantPlan | null {
  const idx = PLAN_ORDER.indexOf(currentPlan);
  for (let i = idx + 1; i < PLAN_ORDER.length; i++) {
    const p = PLAN_ORDER[i];
    const cap = PLAN_CONFIGS[p].limits[limit];
    if (cap === -1 || cap > currentCap) return p;
  }
  return null;
}
