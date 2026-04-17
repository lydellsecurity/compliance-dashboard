/**
 * stripe-report-usage
 *
 * Scheduled function (run daily via netlify.toml or an external cron). Reads
 * unreported rows from `usage_meters` and reports them to Stripe as
 * `usage_record` events against the matching metered subscription item.
 *
 * Meter → Stripe item mapping is carried on the subscription itself: when the
 * Stripe Product for a metered add-on is created, we tag the Price with
 * `metadata.meter = 'ai_policy' | 'vendors' | ...`. This function finds the
 * matching SubscriptionItem by scanning `subscription.items.data` for a price
 * whose metadata.meter equals the row's meter.
 *
 * Invocation: can also be triggered manually via POST (any authenticated call).
 */

const { getStripe, getSupabase } = require('./utils/stripe.cjs');
const {
  handleCorsPreflght,
  errorResponse,
  successResponse,
} = require('./utils/security.cjs');

exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  if (event.httpMethod === 'OPTIONS') return handleCorsPreflght(event);

  // Simple shared-secret gate for manual invocations and cron.
  const providedSecret = event.headers?.['x-cron-secret'] || event.headers?.['X-Cron-Secret'];
  const expectedSecret = process.env.USAGE_REPORT_CRON_SECRET;
  if (expectedSecret && providedSecret !== expectedSecret) {
    return errorResponse(401, 'Unauthorized', origin);
  }

  try {
    const supabase = getSupabase();
    const stripe = getStripe();

    const { data: pending, error } = await supabase
      .from('usage_meters')
      .select('id, organization_id, meter, period_start, period_end, quantity')
      .eq('reported_to_stripe', false)
      .limit(500);

    if (error) throw error;

    const reported = [];
    const failed = [];

    for (const row of pending || []) {
      try {
        const { data: org } = await supabase
          .from('organizations')
          .select('billing')
          .eq('id', row.organization_id)
          .single();

        const subscriptionId = org?.billing?.subscriptionId;
        if (!subscriptionId) {
          failed.push({ id: row.id, reason: 'no_subscription' });
          continue;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ['items.data.price'],
        });

        const item = subscription.items.data.find(
          (i) => i.price?.metadata?.meter === row.meter
        );
        if (!item) {
          failed.push({ id: row.id, reason: 'no_metered_item_for_meter' });
          continue;
        }

        await stripe.subscriptionItems.createUsageRecord(
          item.id,
          {
            quantity: row.quantity,
            timestamp: Math.floor(new Date(row.period_end).getTime() / 1000),
            action: 'set',
          },
          {
            idempotencyKey: `usage:${row.id}`,
          }
        );

        await supabase
          .from('usage_meters')
          .update({ reported_to_stripe: true, reported_at: new Date().toISOString() })
          .eq('id', row.id);

        reported.push(row.id);
      } catch (rowErr) {
        console.error(`usage report failed for ${row.id}:`, rowErr);
        failed.push({ id: row.id, reason: rowErr.message });
      }
    }

    return successResponse(
      { reported: reported.length, failed: failed.length, failures: failed },
      origin
    );
  } catch (err) {
    console.error('stripe-report-usage error:', err);
    return errorResponse(500, 'Internal server error', origin);
  }
};
