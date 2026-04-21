/**
 * stripe-preview-upgrade
 *
 * POST /.netlify/functions/stripe-preview-upgrade
 * Body: { priceId: string }
 * Auth: Supabase JWT.
 *
 * For an org that already has an active subscription, returns what Stripe
 * would charge for switching the base plan to the new price. Uses the
 * upcoming-invoice preview to calculate prorations ("you'll be charged $X;
 * $Y will be credited from the current period").
 *
 * Returns:
 *   { immediateAmount, creditApplied, nextInvoiceAmount, currency, periodEnd }
 *
 * Callers (UpgradeGate) show this copy before redirecting to Stripe Checkout
 * so the charge is never a surprise.
 *
 * Orgs without an existing subscription (Free → paid) return zeros — there's
 * no proration to preview; the trial and first-month charge are the normal
 * checkout flow.
 */

const {
  handleCorsPreflght,
  errorResponse,
  successResponse,
  parseJsonBody,
  checkRateLimit,
} = require('./utils/security.cjs');
const {
  getStripe,
  requireAuthedOrg,
  getOrganization,
  resolvePlanFromPriceId,
} = require('./utils/stripe.cjs');

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;

  if (event.httpMethod === 'OPTIONS') return handleCorsPreflght(event);
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed', origin);
  }

  try {
    const { user, organizationId } = await requireAuthedOrg(
      event.headers.authorization || event.headers.Authorization
    );

    const rate = checkRateLimit(`preview:${user.id}`);
    if (!rate.allowed) {
      return errorResponse(429, 'Too many requests', origin);
    }

    const parsed = parseJsonBody(event.body);
    if (!parsed.valid) return errorResponse(400, parsed.error, origin);

    const { priceId } = parsed.data;
    if (!priceId || typeof priceId !== 'string') {
      return errorResponse(400, 'priceId is required', origin);
    }
    if (!resolvePlanFromPriceId(priceId)) {
      return errorResponse(400, 'Unknown priceId', origin);
    }

    const org = await getOrganization(organizationId);
    const customerId = org.billing?.customerId;
    const subscriptionId = org.billing?.subscriptionId;

    if (!customerId || !subscriptionId) {
      // No existing subscription — no proration preview possible.
      return successResponse(
        {
          hasExistingSubscription: false,
          immediateAmount: 0,
          creditApplied: 0,
          nextInvoiceAmount: 0,
          currency: 'usd',
          periodEnd: null,
        },
        origin
      );
    }

    const stripe = getStripe();

    // Retrieve current subscription, identify the base-plan item to swap.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price'],
    });
    const baseItem =
      subscription.items.data.find(
        (i) => i.price?.recurring?.usage_type !== 'metered'
      ) || subscription.items.data[0];

    if (!baseItem) {
      return errorResponse(500, 'Subscription has no base item', origin);
    }

    // Preview what swapping the base item's price would cost, billed now.
    const preview = await stripe.invoices.retrieveUpcoming({
      customer: customerId,
      subscription: subscriptionId,
      subscription_items: [
        {
          id: baseItem.id,
          price: priceId,
        },
      ],
      subscription_proration_behavior: 'create_prorations',
      subscription_proration_date: Math.floor(Date.now() / 1000),
    });

    // Prorations — Stripe emits them as negative amounts for credits and
    // positive amounts for newly-prorated charges. Sum both for the UI.
    let creditApplied = 0;
    let immediateAmount = 0;
    for (const line of preview.lines?.data || []) {
      if (line.proration) {
        if (line.amount < 0) creditApplied += Math.abs(line.amount);
        else immediateAmount += line.amount;
      }
    }

    return successResponse(
      {
        hasExistingSubscription: true,
        immediateAmount,
        creditApplied,
        // `amount_due` on the preview is what would post right now if the
        // change were applied. Stripe returns 0 for "bill at next period".
        netDue: Math.max(0, immediateAmount - creditApplied),
        nextInvoiceAmount: preview.amount_due,
        currency: preview.currency,
        periodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
      },
      origin
    );
  } catch (err) {
    const status = err.statusCode || 500;
    const message = status >= 500 ? 'Internal server error' : err.message;
    if (status >= 500) console.error('stripe-preview-upgrade error:', err);
    return errorResponse(status, message, origin);
  }
};
