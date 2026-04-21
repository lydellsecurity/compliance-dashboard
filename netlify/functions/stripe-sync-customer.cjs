/**
 * stripe-sync-customer
 *
 * POST /.netlify/functions/stripe-sync-customer
 * Body: { billingEmail?: string, billingAddress?: {...}, name?: string }
 * Auth: Supabase JWT.
 *
 * Owner/admin-only. Updates the Stripe customer with the given email, address,
 * and/or org name, and mirrors the same fields into org.billing so the app
 * and Stripe stay in sync without waiting for the next webhook.
 *
 * The inverse direction (Stripe → app) is handled by the
 * `customer.updated` webhook in stripe-webhook.cjs.
 */

const {
  handleCorsPreflght,
  errorResponse,
  successResponse,
  parseJsonBody,
  sanitizeString,
  checkRateLimit,
} = require('./utils/security.cjs');
const {
  getStripe,
  getSupabase,
  requireAuthedOrg,
  getOrganization,
} = require('./utils/stripe.cjs');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;

  if (event.httpMethod === 'OPTIONS') return handleCorsPreflght(event);
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed', origin);
  }

  try {
    const { user, organizationId, role } = await requireAuthedOrg(
      event.headers.authorization || event.headers.Authorization
    );

    if (role !== 'owner' && role !== 'admin') {
      return errorResponse(403, 'Only owners or admins can change billing', origin);
    }

    const rate = checkRateLimit(`sync:${user.id}`);
    if (!rate.allowed) {
      return errorResponse(429, 'Too many requests', origin);
    }

    const parsed = parseJsonBody(event.body);
    if (!parsed.valid) return errorResponse(400, parsed.error, origin);

    const { billingEmail, billingAddress, name } = parsed.data;

    if (
      billingEmail !== undefined &&
      (typeof billingEmail !== 'string' ||
        (billingEmail && !EMAIL_RE.test(billingEmail)))
    ) {
      return errorResponse(400, 'Invalid email address', origin);
    }

    const org = await getOrganization(organizationId);
    const customerId = org.billing?.customerId;
    const supabase = getSupabase();
    const stripe = getStripe();

    const normalizedAddress = normalizeAddress(billingAddress);
    const nextBilling = { ...(org.billing || {}) };
    if (billingEmail !== undefined)
      nextBilling.billingEmail = billingEmail ? billingEmail.toLowerCase() : null;
    if (normalizedAddress !== undefined) nextBilling.billingAddress = normalizedAddress;

    // Persist to the org first — even if Stripe push fails, the app state is
    // authoritative for UI and will reconcile via the next webhook.
    await supabase
      .from('organizations')
      .update({
        billing: nextBilling,
        ...(name && typeof name === 'string'
          ? { name: sanitizeString(name, 200) }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (customerId) {
      const update = {};
      if (billingEmail !== undefined) update.email = billingEmail || null;
      if (normalizedAddress !== undefined) update.address = normalizedAddress
        ? {
            line1: normalizedAddress.line1,
            line2: normalizedAddress.line2 || null,
            city: normalizedAddress.city,
            state: normalizedAddress.state,
            postal_code: normalizedAddress.postalCode,
            country: normalizedAddress.country,
          }
        : null;
      if (name && typeof name === 'string') update.name = sanitizeString(name, 200);

      if (Object.keys(update).length > 0) {
        try {
          await stripe.customers.update(customerId, update);
        } catch (stripeErr) {
          console.error('stripe.customers.update failed:', stripeErr);
          return errorResponse(502, 'Saved locally, but Stripe update failed. It will re-sync automatically.', origin);
        }
      }
    }

    return successResponse({ ok: true, billing: nextBilling }, origin);
  } catch (err) {
    const status = err.statusCode || 500;
    const message = status >= 500 ? 'Internal server error' : err.message;
    if (status >= 500) console.error('stripe-sync-customer error:', err);
    return errorResponse(status, message, origin);
  }
};

function normalizeAddress(input) {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (typeof input !== 'object') return undefined;
  return {
    line1: sanitizeString(input.line1 || '', 200),
    line2: input.line2 ? sanitizeString(input.line2, 200) : undefined,
    city: sanitizeString(input.city || '', 120),
    state: sanitizeString(input.state || '', 60),
    postalCode: sanitizeString(input.postalCode || input.postal_code || '', 32),
    country: sanitizeString(input.country || '', 2).toUpperCase(),
  };
}
