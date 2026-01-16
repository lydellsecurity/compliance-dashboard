// netlify/functions/send-invite.cjs
// Team Invitation Email Sender - Creates invite record and sends email

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Optional: Email service configuration
// Supports SendGrid, Resend, or Mailgun
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;

// From email address
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@lydellsecurity.com';
const FROM_NAME = process.env.FROM_NAME || 'Lydell Security';

// Base URL for invite links
const BASE_URL = process.env.URL || process.env.DEPLOY_URL || 'https://localhost:5173';

// Validate required environment variables
const REQUIRED_ENV_VARS = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvVars = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Rate limiting: prevent spam
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 3600000; // 1 hour
const RATE_LIMIT_MAX_INVITES = 20; // max 20 invites per hour per org

function checkRateLimit(orgId) {
  const now = Date.now();
  const invites = rateLimitStore.get(orgId) || [];

  // Clean old invites outside window
  const recentInvites = invites.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (recentInvites.length >= RATE_LIMIT_MAX_INVITES) {
    return false;
  }

  recentInvites.push(now);
  rateLimitStore.set(orgId, recentInvites);
  return true;
}

// Generate a secure random token
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
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
  // Try available email services in order of preference
  if (RESEND_API_KEY) {
    return await sendEmailViaResend(to, subject, htmlContent, textContent);
  }

  if (SENDGRID_API_KEY) {
    return await sendEmailViaSendGrid(to, subject, htmlContent, textContent);
  }

  if (MAILGUN_API_KEY && MAILGUN_DOMAIN) {
    return await sendEmailViaMailgun(to, subject, htmlContent, textContent);
  }

  // No email service configured - log the invite link instead
  console.log('No email service configured. Invite link:', textContent);
  return false;
}

// Generate invitation email content
function generateInviteEmail(inviterName, orgName, role, inviteLink, expiresAt) {
  const roleDescriptions = {
    owner: 'full administrative access including billing and team management',
    admin: 'administrative access to manage compliance data and team members',
    member: 'access to view and edit compliance data',
    viewer: 'read-only access to view compliance reports',
  };

  const roleDescription = roleDescriptions[role] || roleDescriptions.member;
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Join ${orgName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px; border-radius: 12px 12px 0 0;">
              <table width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; background: #3b82f6; border-radius: 8px; padding: 8px 12px;">
                      <span style="color: white; font-size: 18px; font-weight: bold;">🛡️ AttestAI</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 24px;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">You're Invited!</h1>
                    <p style="margin: 8px 0 0; color: #94a3b8; font-size: 16px;">Join ${orgName} on the compliance platform</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #334155; font-size: 16px; line-height: 1.6;">
                <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on AttestAI,
                the compliance management platform by Lydell Security.
              </p>

              <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <table width="100%">
                  <tr>
                    <td style="color: #64748b; font-size: 14px;">Your Role</td>
                    <td style="color: #1e293b; font-size: 14px; font-weight: 600; text-transform: capitalize;">${role}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-size: 14px; padding-top: 12px;">Access Level</td>
                    <td style="color: #475569; font-size: 14px; padding-top: 12px;">${roleDescription}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-size: 14px; padding-top: 12px;">Expires</td>
                    <td style="color: #475569; font-size: 14px; padding-top: 12px;">${expiryDate}</td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 24px 0;">
                    <a href="${inviteLink}"
                       style="display: inline-block; background: #3b82f6; color: white; text-decoration: none;
                              padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;
                              box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0; word-break: break-all;">
                <a href="${inviteLink}" style="color: #3b82f6; font-size: 14px;">${inviteLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                This invitation was sent by ${inviterName} from ${orgName}. If you didn't expect this invitation,
                you can safely ignore this email.
              </p>
              <p style="margin: 16px 0 0; color: #94a3b8; font-size: 12px;">
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
You're Invited to Join ${orgName}!

${inviterName} has invited you to join ${orgName} on AttestAI, the compliance management platform by Lydell Security.

Your Role: ${role}
Access Level: ${roleDescription}
Invitation Expires: ${expiryDate}

Accept your invitation here:
${inviteLink}

If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} Lydell Security. All rights reserved.
  `.trim();

  return { htmlContent, textContent };
}

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle OPTIONS for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Check for missing environment variables
  if (missingEnvVars.length > 0) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };

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

    // Verify the JWT with Supabase
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
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    // Validate required fields
    const { organizationId, email, role } = payload;

    if (!organizationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Organization ID is required' }),
      };
    }

    if (!email || !isValidEmail(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid email address is required' }),
      };
    }

    const validRoles = ['admin', 'member', 'viewer'];
    if (!role || !validRoles.includes(role)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid role is required (admin, member, or viewer)' }),
      };
    }

    // Check rate limit
    if (!checkRateLimit(organizationId)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Too many invitations sent. Please try again later.' }),
      };
    }

    // Verify user has permission to invite (admin or owner)
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

    if (!['owner', 'admin'].includes(membership.role)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins and owners can invite team members' }),
      };
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Organization not found' }),
      };
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', (
        await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .single()
      ).data?.id)
      .single();

    if (existingMember) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'This user is already a member of the organization' }),
      };
    }

    // Check for existing pending invite
    const { data: existingInvite } = await supabase
      .from('organization_invites')
      .select('id, expires_at')
      .eq('organization_id', organizationId)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)
      .single();

    if (existingInvite) {
      const expiresAt = new Date(existingInvite.expires_at);
      if (expiresAt > new Date()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'An invitation has already been sent to this email' }),
        };
      }

      // Delete expired invite
      await supabase
        .from('organization_invites')
        .delete()
        .eq('id', existingInvite.id);
    }

    // Get inviter's profile
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const inviterName = inviterProfile?.full_name || inviterProfile?.email || user.email;

    // Generate invite token
    const inviteToken = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: organizationId,
        email: email.toLowerCase(),
        role,
        token: inviteToken,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invite:', inviteError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create invitation' }),
      };
    }

    // Generate invite link
    const inviteLink = `${BASE_URL}/invite/${inviteToken}`;

    // Generate and send email
    const { htmlContent, textContent } = generateInviteEmail(
      inviterName,
      organization.name,
      role,
      inviteLink,
      expiresAt.toISOString()
    );

    const emailSent = await sendEmail(
      email,
      `You're invited to join ${organization.name} on AttestAI`,
      htmlContent,
      textContent
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        inviteId: invite.id,
        email: email.toLowerCase(),
        role,
        expiresAt: expiresAt.toISOString(),
        emailSent,
        inviteLink: emailSent ? undefined : inviteLink, // Only return link if email wasn't sent
      }),
    };

  } catch (error) {
    console.error('Send invite error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
