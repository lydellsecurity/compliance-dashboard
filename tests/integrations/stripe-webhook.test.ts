/**
 * Integration tests for netlify/functions/stripe-webhook.cjs
 *
 * Rather than drive the handler through Stripe's signature-verification
 * entry point (which is painful to mock from CommonJS), we import the
 * dispatch handlers directly via the `_test` export and pass a hand-rolled
 * in-memory Supabase client. That isolates the business logic — idempotency
 * dedup, plan application, dunning state — from the transport layer.
 *
 * The entry-point guards (method, signature, idempotency short-circuit)
 * are covered separately via the `handler` export where they can run
 * without the Stripe SDK at all.
 *
 * Covered:
 *   - Method guard: non-POST → 405.
 *   - customer.subscription.deleted → downgrade to free.
 *   - invoice.payment_failed → status=suspended, suspended_at preserved on
 *     Smart Retry duplicates.
 *   - invoice.payment_succeeded → status cleared, suspended_at cleared,
 *     monthly usage counter reset.
 */

import { describe, expect, it, beforeEach } from 'vitest';

// ============================================================================
// FAKE SUPABASE CLIENT
// ============================================================================

interface FakeSeed {
  organizationRow?: Record<string, unknown> | null;
}

function buildSupabase(seed: FakeSeed, calls: Array<{ op: string; table: string; payload?: unknown }>) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => {
            calls.push({ op: 'select.single', table });
            if (table === 'organizations') return { data: seed.organizationRow ?? null, error: null };
            return { data: null, error: null };
          },
          maybeSingle: async () => {
            calls.push({ op: 'select.maybeSingle', table });
            return { data: null, error: null };
          },
        }),
      }),
      update: (row: unknown) => {
        calls.push({ op: 'update', table, payload: row });
        return { eq: () => Promise.resolve({ data: null, error: null }) };
      },
      insert: (row: unknown) => {
        calls.push({ op: 'insert', table, payload: row });
        return Promise.resolve({ data: null, error: null });
      },
    }),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

// ============================================================================
// LOAD WEBHOOK INTERNALS
// ============================================================================

process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock';
process.env.VITE_SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_key';

// Lazy-load the handlers so test-time env is set before the module reads it.
async function loadTestExports(): Promise<{
  handleSubscriptionDeleted: (sub: unknown, sb: SupabaseLike) => Promise<string | null>;
  handleInvoicePaid: (inv: unknown, sb: SupabaseLike) => Promise<string | null>;
  handleInvoiceFailed: (inv: unknown, sb: SupabaseLike) => Promise<string | null>;
}> {
  const mod = await import('../../netlify/functions/stripe-webhook.cjs');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exported = (mod as any)._test ?? (mod as any).default?._test;
  return exported;
}

async function loadHandler(): Promise<
  (event: unknown) => Promise<{ statusCode: number; body: string }>
> {
  const mod = await import('../../netlify/functions/stripe-webhook.cjs');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (mod as any).handler ?? (mod as any).default;
}

// ============================================================================
// TEST STATE
// ============================================================================

const calls: Array<{ op: string; table: string; payload?: unknown }> = [];
const seed: FakeSeed = {};

beforeEach(() => {
  calls.length = 0;
  seed.organizationRow = null;
});

function findUpdate(table: string) {
  return calls.find((c) => c.op === 'update' && c.table === table);
}

// ============================================================================
// ENTRY-POINT GUARDS (no Stripe SDK involvement)
// ============================================================================

describe('stripe-webhook: entry-point guards', () => {
  it('rejects non-POST with 405', async () => {
    const handler = await loadHandler();
    const res = await handler({ httpMethod: 'GET', headers: {}, body: null });
    expect(res.statusCode).toBe(405);
  });

  it('rejects missing signature with 400', async () => {
    const handler = await loadHandler();
    const res = await handler({ httpMethod: 'POST', headers: {}, body: '{}' });
    expect(res.statusCode).toBe(400);
  });
});

// ============================================================================
// SUBSCRIPTION LIFECYCLE
// ============================================================================

describe('stripe-webhook: customer.subscription.deleted', () => {
  it('downgrades the tenant to free and clears Stripe linkage', async () => {
    const { handleSubscriptionDeleted } = await loadTestExports();
    seed.organizationRow = {
      id: 'org_1',
      billing: { customerId: 'cus_1', subscriptionId: 'sub_1', mrr: 999 },
    };

    const subscription = {
      id: 'sub_1',
      customer: 'cus_1',
      metadata: { organization_id: 'org_1' },
    };

    const sb = buildSupabase(seed, calls);
    const orgId = await handleSubscriptionDeleted(subscription, sb);
    expect(orgId).toBe('org_1');

    const update = findUpdate('organizations');
    expect(update).toBeTruthy();
    const payload = update!.payload as Record<string, unknown>;
    expect(payload.plan).toBe('free');
    expect(payload.stripe_price_id).toBeNull();
    expect((payload.billing as { subscriptionId: string | null }).subscriptionId).toBeNull();
    expect((payload.billing as { mrr: number }).mrr).toBe(0);
  });
});

// ============================================================================
// DUNNING
// ============================================================================

describe('stripe-webhook: invoice.payment_failed', () => {
  it('preserves suspended_at across Smart Retry duplicates', async () => {
    const { handleInvoiceFailed } = await loadTestExports();
    const firstSuspendedAt = '2026-04-10T00:00:00Z';
    seed.organizationRow = { id: 'org_1', suspended_at: firstSuspendedAt };

    const invoice = {
      customer: 'cus_1',
      metadata: { organization_id: 'org_1' },
    };

    const sb = buildSupabase(seed, calls);
    // First payment failed at day 10; Smart Retry fires another failed event
    // today. Must not reset the clock.
    // handleInvoiceFailed ignores the metadata → relies on customer lookup;
    // we short-circuit by returning the seeded organization row regardless.
    // Use a helper that simulates resolveOrgFromCustomerId finding this org.
    sb.from = (table: string) => {
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => {
                calls.push({ op: 'select.single', table });
                return { data: seed.organizationRow, error: null };
              },
              maybeSingle: async () => {
                calls.push({ op: 'select.maybeSingle', table });
                return { data: { id: 'org_1' }, error: null };
              },
            }),
          }),
          update: (row: unknown) => {
            calls.push({ op: 'update', table, payload: row });
            return { eq: () => Promise.resolve({ data: null, error: null }) };
          },
          insert: () => Promise.resolve({ data: null, error: null }),
        };
      }
      return { select: () => ({}), update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }), insert: () => Promise.resolve({}) };
    };

    await handleInvoiceFailed(invoice, sb);

    const update = findUpdate('organizations');
    expect(update).toBeTruthy();
    const payload = update!.payload as Record<string, unknown>;
    expect(payload.suspended_at).toBe(firstSuspendedAt);
    expect(payload.status).toBe('suspended');
  });
});

describe('stripe-webhook: invoice.payment_succeeded', () => {
  it('clears suspended_at, restores active status, resets monthly usage', async () => {
    const { handleInvoicePaid } = await loadTestExports();
    seed.organizationRow = {
      id: 'org_1',
      status: 'suspended',
      usage: { apiCallsThisMonth: 9001, usersCount: 3 },
    };

    const invoice = {
      customer: 'cus_1',
      metadata: { organization_id: 'org_1' },
    };

    const sb = buildSupabase(seed, calls);
    sb.from = (table: string) => {
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => {
                calls.push({ op: 'select.single', table });
                return { data: seed.organizationRow, error: null };
              },
              maybeSingle: async () => {
                calls.push({ op: 'select.maybeSingle', table });
                return { data: { id: 'org_1' }, error: null };
              },
            }),
          }),
          update: (row: unknown) => {
            calls.push({ op: 'update', table, payload: row });
            return { eq: () => Promise.resolve({ data: null, error: null }) };
          },
          insert: () => Promise.resolve({ data: null, error: null }),
        };
      }
      return { select: () => ({}), update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }), insert: () => Promise.resolve({}) };
    };

    await handleInvoicePaid(invoice, sb);

    const update = findUpdate('organizations');
    expect(update).toBeTruthy();
    const payload = update!.payload as Record<string, unknown>;
    expect(payload.suspended_at).toBeNull();
    expect(payload.status).toBe('active');
    // usersCount should pass through; apiCallsThisMonth resets.
    const usage = payload.usage as { apiCallsThisMonth: number; usersCount: number };
    expect(usage.apiCallsThisMonth).toBe(0);
    expect(usage.usersCount).toBe(3);
  });
});
