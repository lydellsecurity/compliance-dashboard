// netlify/functions/send-notification.cjs
// General Notification Email Sender - Sends compliance alerts, reminders, etc.

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Email service configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;

// From email address
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@lydellsecurity.com';
const FROM_NAME = process.env.FROM_NAME || 'Lydell Security';

// Base URL for action links
const BASE_URL = process.env.URL || process.env.DEPLOY_URL || 'https://localhost:5173';

// Validate required environment variables
const REQUIRED_ENV_VARS = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvVars = REQUIRED_ENV_VARS.filter(v => !process.env[v]);

// Rate limiting
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 3600000; // 1 hour
const RATE_LIMIT_MAX_NOTIFICATIONS = 100; // max 100 notifications per hour per org

function checkRateLimit(orgId) {
  const now = Date.now();
  const notifications = rateLimitStore.get(orgId) || [];
  const recentNotifications = notifications.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (recentNotifications.length >= RATE_LIMIT_MAX_NOTIFICATIONS) {
    return false;
  }

  recentNotifications.push(now);
  rateLimitStore.set(orgId, recentNotifications);
  return true;
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

// Send email via SendGrid
async function sendEmailViaSendGrid(to, subject, htmlContent, textContent) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [
        { type: 'text/plain', value: textContent },
        { type: 'text/html', value: htmlContent },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid error: ${error}`);
  }
  return true;
}

// Send email via Resend
async function sendEmailViaResend(to, subject, htmlContent, textContent) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html: htmlContent,
      text: textContent,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }
  return true;
}

// Send email via Mailgun
async function sendEmailViaMailgun(to, subject, htmlContent, textContent) {
  const formData = new URLSearchParams();
  formData.append('from', `${FROM_NAME} <${FROM_EMAIL}>`);
  formData.append('to', to);
  formData.append('subject', subject);
  formData.append('text', textContent);
  formData.append('html', htmlContent);

  const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mailgun error: ${error}`);
  }
  return true;
}

// Main email sending function
async function sendEmail(to, subject, htmlContent, textContent) {
  if (RESEND_API_KEY) {
    return await sendEmailViaResend(to, subject, htmlContent, textContent);
  }
  if (SENDGRID_API_KEY) {
    return await sendEmailViaSendGrid(to, subject, htmlContent, textContent);
  }
  if (MAILGUN_API_KEY && MAILGUN_DOMAIN) {
    return await sendEmailViaMailgun(to, subject, htmlContent, textContent);
  }
  console.log('No email service configured. Would send:', { to, subject });
  return false;
}

// Severity colors and icons
const SEVERITY_CONFIG = {
  critical: { color: '#DC2626', bgColor: '#FEF2F2', icon: '🚨' },
  high: { color: '#EA580C', bgColor: '#FFF7ED', icon: '⚠️' },
  medium: { color: '#CA8A04', bgColor: '#FEFCE8', icon: '⚡' },
  low: { color: '#16A34A', bgColor: '#F0FDF4', icon: 'ℹ️' },
};

// Generate compliance alert email
function generateComplianceAlertEmail(orgName, data) {
  const severity = SEVERITY_CONFIG[data.severity] || SEVERITY_CONFIG.medium;
  const actionLink = `${BASE_URL}/dashboard`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compliance Alert: ${data.alertTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Alert Banner -->
          <tr>
            <td style="background: ${severity.color}; padding: 20px 40px; border-radius: 12px 12px 0 0;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="color: white; font-size: 24px; margin-right: 12px;">${severity.icon}</span>
                    <span style="color: white; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      ${data.severity} Severity Alert
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px;">
              <div style="display: inline-block; background: #3b82f6; border-radius: 8px; padding: 8px 12px; margin-bottom: 16px;">
                <span style="color: white; font-size: 16px; font-weight: bold;">🛡️ AttestAI</span>
              </div>
              <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 600;">${data.alertTitle}</h1>
              <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Organization: ${orgName}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="background: ${severity.bgColor}; border: 1px solid ${severity.color}20; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6;">
                  ${data.alertDescription}
                </p>
              </div>

              ${data.framework || data.controlId ? `
              <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <table width="100%">
                  ${data.framework ? `
                  <tr>
                    <td style="color: #64748b; font-size: 13px; padding-bottom: 8px;">Framework</td>
                    <td style="color: #1e293b; font-size: 13px; font-weight: 600; padding-bottom: 8px;">${data.framework}</td>
                  </tr>
                  ` : ''}
                  ${data.controlId ? `
                  <tr>
                    <td style="color: #64748b; font-size: 13px;">Control ID</td>
                    <td style="color: #1e293b; font-size: 13px; font-weight: 600;">${data.controlId}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              ` : ''}

              ${data.actionRequired ? `
              <div style="background: #EFF6FF; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 4px; color: #1e40af; font-size: 12px; font-weight: 600; text-transform: uppercase;">Action Required</p>
                <p style="margin: 0; color: #1e293b; font-size: 14px;">${data.actionRequired}</p>
              </div>
              ` : ''}

              ${data.dueDate ? `
              <p style="margin: 0 0 24px; color: #64748b; font-size: 14px;">
                <strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              ` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${actionLink}"
                       style="display: inline-block; background: #3b82f6; color: white; text-decoration: none;
                              padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                      View in Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                This is an automated notification from AttestAI by Lydell Security.
              </p>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 11px;">
                © ${new Date().getFullYear()} Lydell Security. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textContent = `
${severity.icon} ${data.severity.toUpperCase()} COMPLIANCE ALERT

${data.alertTitle}
Organization: ${orgName}

${data.alertDescription}

${data.framework ? `Framework: ${data.framework}` : ''}
${data.controlId ? `Control ID: ${data.controlId}` : ''}
${data.actionRequired ? `\nAction Required: ${data.actionRequired}` : ''}
${data.dueDate ? `Due Date: ${new Date(data.dueDate).toLocaleDateString()}` : ''}

View in Dashboard: ${actionLink}

---
This is an automated notification from AttestAI by Lydell Security.
  `.trim();

  return { htmlContent, textContent };
}

// Generate contract renewal reminder email
function generateContractRenewalEmail(orgName, data) {
  const urgency = data.daysUntilExpiry <= 7 ? 'critical' : data.daysUntilExpiry <= 30 ? 'high' : 'medium';
  const config = SEVERITY_CONFIG[urgency];
  const actionLink = `${BASE_URL}/vendors`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contract Renewal Reminder: ${data.vendorName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px; border-radius: 12px 12px 0 0;">
              <div style="display: inline-block; background: #3b82f6; border-radius: 8px; padding: 8px 12px; margin-bottom: 16px;">
                <span style="color: white; font-size: 16px; font-weight: bold;">🛡️ AttestAI</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">📅 Contract Renewal Reminder</h1>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">${orgName}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="background: ${config.bgColor}; border: 1px solid ${config.color}30; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; color: ${config.color}; font-size: 14px; font-weight: 600;">
                  ${config.icon} ${data.daysUntilExpiry} Days Until Expiry
                </p>
                <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 600;">${data.vendorName}</h2>
              </div>

              <table width="100%" style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td style="color: #64748b; font-size: 13px; padding: 8px 16px;">Contract End Date</td>
                  <td style="color: #1e293b; font-size: 13px; font-weight: 600; padding: 8px 16px;">
                    ${new Date(data.contractEndDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </td>
                </tr>
                ${data.contractValue ? `
                <tr>
                  <td style="color: #64748b; font-size: 13px; padding: 8px 16px;">Contract Value</td>
                  <td style="color: #1e293b; font-size: 13px; font-weight: 600; padding: 8px 16px;">
                    $${data.contractValue.toLocaleString()}
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="color: #64748b; font-size: 13px; padding: 8px 16px;">Auto-Renewal</td>
                  <td style="color: #1e293b; font-size: 13px; font-weight: 600; padding: 8px 16px;">
                    ${data.autoRenewal ? '✅ Enabled' : '❌ Disabled'}
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${actionLink}"
                       style="display: inline-block; background: #3b82f6; color: white; text-decoration: none;
                              padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                      Review Vendor Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                This is an automated reminder from AttestAI by Lydell Security.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textContent = `
📅 CONTRACT RENEWAL REMINDER

Vendor: ${data.vendorName}
Organization: ${orgName}

Contract End Date: ${new Date(data.contractEndDate).toLocaleDateString()}
Days Until Expiry: ${data.daysUntilExpiry}
${data.contractValue ? `Contract Value: $${data.contractValue.toLocaleString()}` : ''}
Auto-Renewal: ${data.autoRenewal ? 'Enabled' : 'Disabled'}

Review Vendor: ${actionLink}

---
This is an automated reminder from AttestAI by Lydell Security.
  `.trim();

  return { htmlContent, textContent };
}

// Generate assessment due reminder email
function generateAssessmentDueEmail(orgName, data) {
  const urgency = data.daysUntilDue <= 3 ? 'critical' : data.daysUntilDue <= 7 ? 'high' : 'medium';
  const config = SEVERITY_CONFIG[urgency];
  const actionLink = `${BASE_URL}/vendors`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assessment Due: ${data.vendorName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px; border-radius: 12px 12px 0 0;">
              <div style="display: inline-block; background: #3b82f6; border-radius: 8px; padding: 8px 12px; margin-bottom: 16px;">
                <span style="color: white; font-size: 16px; font-weight: bold;">🛡️ AttestAI</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">📋 Assessment Due Reminder</h1>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">${orgName}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="background: ${config.bgColor}; border: 1px solid ${config.color}30; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; color: ${config.color}; font-size: 14px; font-weight: 600;">
                  ${config.icon} Due in ${data.daysUntilDue} Days
                </p>
                <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 600;">${data.vendorName}</h2>
                <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">${data.assessmentType} Assessment</p>
              </div>

              <table width="100%" style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td style="color: #64748b; font-size: 13px; padding: 8px 16px;">Due Date</td>
                  <td style="color: #1e293b; font-size: 13px; font-weight: 600; padding: 8px 16px;">
                    ${new Date(data.dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </td>
                </tr>
                ${data.lastAssessmentDate ? `
                <tr>
                  <td style="color: #64748b; font-size: 13px; padding: 8px 16px;">Last Assessment</td>
                  <td style="color: #1e293b; font-size: 13px; font-weight: 600; padding: 8px 16px;">
                    ${new Date(data.lastAssessmentDate).toLocaleDateString()}
                  </td>
                </tr>
                ` : ''}
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${actionLink}"
                       style="display: inline-block; background: #3b82f6; color: white; text-decoration: none;
                              padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                      Start Assessment
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                This is an automated reminder from AttestAI by Lydell Security.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textContent = `
📋 ASSESSMENT DUE REMINDER

Vendor: ${data.vendorName}
Assessment Type: ${data.assessmentType}
Organization: ${orgName}

Due Date: ${new Date(data.dueDate).toLocaleDateString()}
Days Until Due: ${data.daysUntilDue}
${data.lastAssessmentDate ? `Last Assessment: ${new Date(data.lastAssessmentDate).toLocaleDateString()}` : ''}

Start Assessment: ${actionLink}

---
This is an automated reminder from AttestAI by Lydell Security.
  `.trim();

  return { htmlContent, textContent };
}

// Generate custom notification email
function generateCustomEmail(orgName, subject, data) {
  const actionLink = data.actionLink || `${BASE_URL}/dashboard`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px; border-radius: 12px 12px 0 0;">
              <div style="display: inline-block; background: #3b82f6; border-radius: 8px; padding: 8px 12px; margin-bottom: 16px;">
                <span style="color: white; font-size: 16px; font-weight: bold;">🛡️ AttestAI</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${subject}</h1>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">${orgName}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${data.message ? `
              <p style="margin: 0 0 24px; color: #334155; font-size: 15px; line-height: 1.6;">
                ${data.message}
              </p>
              ` : ''}

              ${data.details ? `
              <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <pre style="margin: 0; white-space: pre-wrap; font-family: inherit; font-size: 14px; color: #475569;">
${typeof data.details === 'string' ? data.details : JSON.stringify(data.details, null, 2)}
                </pre>
              </div>
              ` : ''}

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${actionLink}"
                       style="display: inline-block; background: #3b82f6; color: white; text-decoration: none;
                              padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                      ${data.actionLabel || 'View in Dashboard'}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                This is an automated notification from AttestAI by Lydell Security.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textContent = `
${subject}
Organization: ${orgName}

${data.message || ''}

${data.details ? (typeof data.details === 'string' ? data.details : JSON.stringify(data.details, null, 2)) : ''}

${data.actionLabel || 'View in Dashboard'}: ${actionLink}

---
This is an automated notification from AttestAI by Lydell Security.
  `.trim();

  return { htmlContent, textContent };
}

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  if (missingEnvVars.length > 0) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    // Verify authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Missing or invalid authorization token' }),
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired token' }),
      };
    }

    // Parse request body
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const { type, organizationId, recipients, subject, data } = payload;

    // Validate required fields
    if (!type || !organizationId || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'type, organizationId, and recipients array are required' }),
      };
    }

    // Validate recipients
    const validRecipients = recipients.filter(isValidEmail);
    if (validRecipients.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No valid email addresses provided' }),
      };
    }

    // Check rate limit
    if (!checkRateLimit(organizationId)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Too many notifications sent. Please try again later.' }),
      };
    }

    // Verify user has access to organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'You do not have access to this organization' }),
      };
    }

    // Get organization name
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    const orgName = organization?.name || 'Your Organization';

    // Generate email content based on type
    let emailContent;
    let emailSubject = subject;

    switch (type) {
      case 'compliance_alert':
        emailContent = generateComplianceAlertEmail(orgName, data);
        break;
      case 'contract_renewal':
        emailContent = generateContractRenewalEmail(orgName, data);
        break;
      case 'assessment_due':
        emailContent = generateAssessmentDueEmail(orgName, data);
        break;
      case 'custom':
      default:
        emailContent = generateCustomEmail(orgName, subject, data);
        break;
    }

    // Send emails to all recipients
    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const recipient of validRecipients) {
      try {
        const result = await sendEmail(
          recipient,
          emailSubject,
          emailContent.htmlContent,
          emailContent.textContent
        );
        if (result) {
          sent++;
        } else {
          failed++;
          errors.push(`${recipient}: No email service configured`);
        }
      } catch (err) {
        failed++;
        errors.push(`${recipient}: ${err.message}`);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: sent > 0,
        sent,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      }),
    };

  } catch (error) {
    console.error('Send notification error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
