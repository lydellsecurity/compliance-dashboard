/**
 * Shared email utility for Netlify functions.
 *
 * Supports Resend, SendGrid, and Mailgun — whichever has its API key set in
 * the Netlify environment wins (Resend → SendGrid → Mailgun). If none are
 * configured, send() logs and returns false so the caller can decide whether
 * to treat that as a failure.
 *
 * The transactional templates here are intentionally plain — a single column
 * layout, inlined styles, and a shared brand header — so they render correctly
 * across email clients without a templating engine.
 */

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@lydellsecurity.com';
const FROM_NAME = process.env.FROM_NAME || 'AttestAI by Lydell Security';
const APP_URL =
  process.env.APP_URL ||
  process.env.URL ||
  process.env.DEPLOY_URL ||
  'https://lydellsecurity.com';

function hasAnyProvider() {
  return !!(
    process.env.RESEND_API_KEY ||
    process.env.SENDGRID_API_KEY ||
    (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN)
  );
}

async function sendViaResend(to, subject, html, text) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
  return true;
}

async function sendViaSendGrid(to, subject, html, text) {
  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: recipients }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  });
  if (!res.ok) throw new Error(`SendGrid error: ${await res.text()}`);
  return true;
}

async function sendViaMailgun(to, subject, html, text) {
  const form = new URLSearchParams();
  form.append('from', `${FROM_NAME} <${FROM_EMAIL}>`);
  (Array.isArray(to) ? to : [to]).forEach((addr) => form.append('to', addr));
  form.append('subject', subject);
  form.append('text', text);
  form.append('html', html);

  const res = await fetch(
    `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `api:${process.env.MAILGUN_API_KEY}`
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    }
  );
  if (!res.ok) throw new Error(`Mailgun error: ${await res.text()}`);
  return true;
}

/**
 * Send an email via the configured provider. Never throws — logs and returns
 * false on failure so a webhook handler never rolls back a billing write just
 * because SMTP is down.
 */
async function send({ to, subject, html, text }) {
  if (!to || (Array.isArray(to) && to.length === 0)) {
    console.warn('email.send called with no recipient; skipping');
    return false;
  }
  if (!hasAnyProvider()) {
    console.warn(
      `[email] No provider configured; would send to ${to}: ${subject}`
    );
    return false;
  }
  try {
    if (process.env.RESEND_API_KEY) return await sendViaResend(to, subject, html, text);
    if (process.env.SENDGRID_API_KEY) return await sendViaSendGrid(to, subject, html, text);
    return await sendViaMailgun(to, subject, html, text);
  } catch (err) {
    console.error('email.send failed:', err);
    return false;
  }
}

// ============================================================================
// TEMPLATE HELPERS
// ============================================================================

function layout(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 40px;border-radius:12px 12px 0 0;">
          <div style="display:inline-block;background:#3b82f6;border-radius:8px;padding:6px 10px;">
            <span style="color:#fff;font-size:16px;font-weight:700;">🛡️ AttestAI</span>
          </div>
          <h1 style="margin:20px 0 0;color:#fff;font-size:24px;font-weight:600;">${escapeHtml(title)}</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;color:#334155;font-size:15px;line-height:1.6;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;border-radius:0 0 12px 12px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;">
          <p style="margin:0;">You're receiving this because you're the billing contact for your AttestAI organization.</p>
          <p style="margin:8px 0 0;">© ${new Date().getFullYear()} Lydell Security.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function cta(label, url) {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:8px 0 0;">
      <tr><td style="border-radius:8px;background:#3b82f6;">
        <a href="${escapeAttr(url)}" style="display:inline-block;padding:14px 24px;color:#fff;text-decoration:none;font-weight:600;font-size:15px;">${escapeHtml(label)}</a>
      </td></tr>
    </table>`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(str) {
  return escapeHtml(str);
}

function money(amount, currency = 'USD') {
  if (amount == null) return '';
  const n = typeof amount === 'number' ? amount / 100 : Number(amount);
  try {
    return n.toLocaleString('en-US', { style: 'currency', currency });
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return String(d);
  }
}

// ============================================================================
// RECIPIENT RESOLUTION
// ============================================================================

/**
 * Resolve the best billing-contact emails for an organization:
 *   1. org.billing.billingEmail (set via Stripe customer.email or portal)
 *   2. profile.email of every owner of the org
 * Returns a de-duplicated array of lowercase emails.
 */
async function getBillingRecipients(supabase, org) {
  const out = new Set();

  const contact = org?.billing?.billingEmail;
  if (contact && typeof contact === 'string') out.add(contact.toLowerCase());

  try {
    const { data: owners } = await supabase
      .from('organization_members')
      .select('user_id, profiles(email)')
      .eq('organization_id', org.id)
      .eq('role', 'owner');

    for (const m of owners || []) {
      const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      const e = p?.email;
      if (e) out.add(String(e).toLowerCase());
    }
  } catch (err) {
    console.error('getBillingRecipients: owner lookup failed:', err);
  }

  return Array.from(out);
}

// ============================================================================
// TEMPLATES
// ============================================================================

const portalCta = (path = '/settings/billing') =>
  cta('Open billing portal', `${APP_URL}${path}`);

function paymentFailedTemplate({ orgName, amount, currency, invoiceUrl, attemptCount, nextRetryAt }) {
  const retryCopy = nextRetryAt
    ? `Stripe will automatically retry on ${formatDate(nextRetryAt)}. `
    : '';
  const body = `
    <p>Hi there,</p>
    <p>We couldn't charge the payment method on file for <strong>${escapeHtml(orgName)}</strong>${amount ? ` (${money(amount, currency)})` : ''}.</p>
    <p>${escapeHtml(retryCopy)}Your paid features stay active for <strong>10 days</strong> from the first failed charge — after that, paid features are temporarily blocked until billing is restored. Your data is never deleted.</p>
    ${attemptCount ? `<p style="color:#64748b;font-size:13px;">Attempt ${attemptCount} of 4</p>` : ''}
    ${portalCta()}
    ${invoiceUrl ? `<p style="margin-top:16px;font-size:13px;color:#64748b;">Or pay the invoice directly: <a href="${escapeAttr(invoiceUrl)}" style="color:#3b82f6;">view invoice</a></p>` : ''}
  `;
  return {
    subject: `Payment failed for ${orgName}`,
    html: layout('Payment failed', body),
    text: `Payment failed for ${orgName}${amount ? ` (${money(amount, currency)})` : ''}. ${retryCopy}Paid features stay active for 10 days then block until billing is restored. Update your payment method: ${APP_URL}/settings/billing`,
  };
}

function paymentRecoveredTemplate({ orgName, amount, currency, periodEnd }) {
  const body = `
    <p>Hi there,</p>
    <p>Good news — we received your payment${amount ? ` of <strong>${money(amount, currency)}</strong>` : ''} for <strong>${escapeHtml(orgName)}</strong>.</p>
    <p>All paid features are restored.${periodEnd ? ` Your next renewal is on <strong>${formatDate(periodEnd)}</strong>.` : ''}</p>
    ${portalCta()}
  `;
  return {
    subject: `Payment received — ${orgName}`,
    html: layout('Payment received', body),
    text: `Payment received for ${orgName}. Paid features restored.${periodEnd ? ` Next renewal: ${formatDate(periodEnd)}.` : ''} Billing portal: ${APP_URL}/settings/billing`,
  };
}

function trialEndingTemplate({ orgName, trialEndsAt, planName }) {
  const body = `
    <p>Hi there,</p>
    <p>Your trial of <strong>${escapeHtml(planName)}</strong> for <strong>${escapeHtml(orgName)}</strong> ends on <strong>${formatDate(trialEndsAt)}</strong>.</p>
    <p>We'll charge the card on file automatically so you don't lose access. If you'd prefer to cancel before the trial ends, you can do so in the billing portal.</p>
    ${portalCta()}
  `;
  return {
    subject: `Your trial ends on ${formatDate(trialEndsAt)}`,
    html: layout('Your trial is ending soon', body),
    text: `Your ${planName} trial for ${orgName} ends on ${formatDate(trialEndsAt)}. Manage billing: ${APP_URL}/settings/billing`,
  };
}

function refundTemplate({ orgName, amount, currency, reason }) {
  const body = `
    <p>Hi there,</p>
    <p>We've processed a refund of <strong>${money(amount, currency)}</strong> for <strong>${escapeHtml(orgName)}</strong>. It should land on your original payment method within 5–10 business days.</p>
    ${reason ? `<p style="color:#64748b;font-size:13px;">Reason: ${escapeHtml(reason)}</p>` : ''}
    <p>If this wasn't expected, reply to this email and we'll investigate.</p>
  `;
  return {
    subject: `Refund processed — ${money(amount, currency)}`,
    html: layout('Refund processed', body),
    text: `Refund of ${money(amount, currency)} processed for ${orgName}. Refund will land on your original payment method in 5–10 business days.`,
  };
}

function invoiceUpcomingTemplate({ orgName, amount, currency, periodEnd, planName, invoiceUrl }) {
  const body = `
    <p>Hi there,</p>
    <p>Heads up: your next invoice for <strong>${escapeHtml(orgName)}</strong> (${escapeHtml(planName)}) is <strong>${money(amount, currency)}</strong>, scheduled for <strong>${formatDate(periodEnd)}</strong>.</p>
    <p style="color:#64748b;font-size:13px;">This may include metered usage or add-ons accrued during the current period.</p>
    ${invoiceUrl ? cta('View upcoming invoice', invoiceUrl) : portalCta()}
  `;
  return {
    subject: `Upcoming invoice: ${money(amount, currency)} on ${formatDate(periodEnd)}`,
    html: layout('Your upcoming invoice', body),
    text: `Upcoming ${planName} invoice for ${orgName}: ${money(amount, currency)} on ${formatDate(periodEnd)}. Review: ${APP_URL}/settings/billing`,
  };
}

function disputeCreatedTemplate({ orgName, amount, currency, reason }) {
  const body = `
    <p>Hi there,</p>
    <p>A payment dispute has been opened for <strong>${escapeHtml(orgName)}</strong>${amount ? ` (${money(amount, currency)})` : ''}${reason ? ` citing "${escapeHtml(reason)}"` : ''}.</p>
    <p>If this was unintended, please contact <a href="mailto:support@lydellsecurity.com" style="color:#3b82f6;">support@lydellsecurity.com</a> as soon as possible. We'll work with you to resolve it before the dispute is finalized.</p>
  `;
  return {
    subject: `Payment dispute opened — ${orgName}`,
    html: layout('Payment dispute opened', body),
    text: `A payment dispute was opened for ${orgName}${amount ? ` (${money(amount, currency)})` : ''}. Contact support@lydellsecurity.com to resolve.`,
  };
}

function subscriptionCanceledTemplate({ orgName, periodEnd }) {
  const body = `
    <p>Hi there,</p>
    <p>Your subscription for <strong>${escapeHtml(orgName)}</strong> has been canceled${periodEnd ? ` and will end on <strong>${formatDate(periodEnd)}</strong>` : ''}. After that, your org reverts to the Free plan.</p>
    <p>Your compliance data stays intact for <strong>90 days</strong>. You can resubscribe any time to restore full access.</p>
    ${portalCta()}
  `;
  return {
    subject: `Subscription canceled — ${orgName}`,
    html: layout('Subscription canceled', body),
    text: `Subscription canceled for ${orgName}${periodEnd ? ` — ends ${formatDate(periodEnd)}` : ''}. Data retained for 90 days. Resubscribe: ${APP_URL}/settings/billing`,
  };
}

module.exports = {
  send,
  hasAnyProvider,
  getBillingRecipients,
  templates: {
    paymentFailed: paymentFailedTemplate,
    paymentRecovered: paymentRecoveredTemplate,
    trialEnding: trialEndingTemplate,
    refund: refundTemplate,
    invoiceUpcoming: invoiceUpcomingTemplate,
    disputeCreated: disputeCreatedTemplate,
    subscriptionCanceled: subscriptionCanceledTemplate,
  },
  APP_URL,
};
