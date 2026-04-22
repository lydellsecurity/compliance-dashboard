/**
 * create-organization
 *
 * POST /.netlify/functions/create-organization
 * Body: { name, slug?, description?, contactEmail?, primaryColor? }
 * Auth: Clerk JWT in Authorization header.
 *
 * Authenticated Clerk users call this to create their first organization.
 * The flow:
 *
 *   1. Verify the Clerk JWT (networklessly via JWKS).
 *   2. Using the Supabase service-role key, INSERT the organization row and
 *      the creator's membership as the owner.
 *   3. Return the created org so the client can update local state without
 *      needing to re-read through RLS.
 *
 * Why server-side instead of direct Supabase INSERT from the browser?
 *
 * When Supabase's Third-Party Auth with Clerk isn't fully wired (dashboard
 * setup prerequisite), `auth.jwt()` inside Postgres returns NULL and every
 * RLS policy that calls `public.clerk_user_id()` fails. A brand-new user
 * then can't create their first org (the only path that would make them
 * visible via RLS). Routing through the service role eliminates that class
 * of failure — we verify the Clerk JWT ourselves and trust it, the same
 * pattern used by stripe-*.cjs, send-invite.cjs, etc.
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyClerkToken } = require('./utils/clerk-auth.cjs');
const {
  handleCorsPreflght,
  errorResponse,
  successResponse,
  parseJsonBody,
  sanitizeString,
  checkRateLimit,
} = require('./utils/security.cjs');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseClient = null;
function getSupabase() {
  if (supabaseClient) return supabaseClient;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase env vars missing');
  }
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseClient;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 48);
}

async function ensureUniqueSlug(base, supabase) {
  let slug = base;
  let attempt = 0;
  while (attempt < 10) {
    const { data } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!data) return slug;
    attempt += 1;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  throw new Error('Could not generate a unique slug');
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;

  if (event.httpMethod === 'OPTIONS') return handleCorsPreflght(event);
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed', origin);
  }

  try {
    // Verify Clerk JWT.
    const authHeader = event.headers.authorization || event.headers.Authorization;
    let userId;
    let userEmail = null;
    try {
      const verified = await verifyClerkToken(authHeader);
      userId = verified.userId;
      userEmail = verified.claims?.email || null;
    } catch (err) {
      return errorResponse(err.statusCode || 401, err.message || 'Unauthorized', origin);
    }

    const rate = checkRateLimit(`org-create:${userId}`);
    if (!rate.allowed) {
      return errorResponse(429, 'Too many requests. Try again in a minute.', origin);
    }

    const parsed = parseJsonBody(event.body);
    if (!parsed.valid) return errorResponse(400, parsed.error, origin);

    const name = sanitizeString(parsed.data.name || '', 120).trim();
    if (!name) {
      return errorResponse(400, 'Organization name is required', origin);
    }

    const rawSlug = parsed.data.slug
      ? sanitizeString(parsed.data.slug, 48).toLowerCase().trim()
      : generateSlug(name);
    if (!SLUG_RE.test(rawSlug)) {
      return errorResponse(
        400,
        'Slug may only contain lowercase letters, digits, and hyphens',
        origin
      );
    }

    const description = parsed.data.description
      ? sanitizeString(parsed.data.description, 1000)
      : null;
    const contactEmail = parsed.data.contactEmail
      ? sanitizeString(parsed.data.contactEmail, 255)
      : userEmail;
    const primaryColor =
      parsed.data.primaryColor && /^#[0-9a-fA-F]{6}$/.test(parsed.data.primaryColor)
        ? parsed.data.primaryColor
        : '#6366f1';

    const supabase = getSupabase();

    const slug = await ensureUniqueSlug(rawSlug, supabase);

    // Insert organization with the default Free-tier config. The webhook will
    // re-apply the right limits/features if the user subsequently subscribes.
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        primary_color: primaryColor,
        description,
        contact_email: contactEmail,
        settings: {},
        plan: 'free',
        status: 'active',
        limits: {
          maxUsers: 1,
          maxControls: 15,
          maxEvidence: 25,
          maxIntegrations: 0,
          maxStorageGb: 0.25,
          retentionDays: 14,
          auditLogDays: 7,
          apiRateLimit: 0,
          maxVendors: 0,
        },
        features: {
          cloudIntegrations: false,
          customControls: false,
          apiAccess: false,
          ssoEnabled: false,
          customBranding: false,
          advancedReporting: false,
          trustCenter: true,
          incidentResponse: false,
          vendorRisk: false,
          questionnaireAutomation: false,
          aiRemediationChat: false,
          realTimeRegulatoryScan: false,
          auditBundleExport: false,
          customDomain: false,
          scimProvisioning: false,
        },
        billing: {
          customerId: null,
          subscriptionId: null,
          currentPeriodEnd: null,
          seats: 1,
          seatsUsed: 1,
          mrr: 0,
          billingEmail: contactEmail,
          billingAddress: null,
        },
        usage: {
          usersCount: 1,
          controlsCount: 0,
          evidenceCount: 0,
          integrationsCount: 0,
          storageUsedMb: 0,
          apiCallsThisMonth: 0,
          lastActivityAt: new Date().toISOString(),
        },
        created_by: userId,
      })
      .select()
      .single();

    if (orgError) {
      console.error('create-organization: INSERT organizations failed:', orgError);
      return errorResponse(500, orgError.message || 'Failed to create organization', origin);
    }

    // Create the owner membership atomically with the org. On failure, roll
    // back the org so we never leave an owner-less org.
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: newOrg.id,
        user_id: userId,
        role: 'owner',
        is_default: true,
      });

    if (memberError) {
      console.error('create-organization: INSERT membership failed:', memberError);
      await supabase.from('organizations').delete().eq('id', newOrg.id);
      return errorResponse(500, 'Failed to record ownership; rolled back', origin);
    }

    // Reverse-trial: provision a 14-day Growth trial for first-time users.
    // Gated on user_billing_flags.trial_consumed so spinning up a second
    // org doesn't grant a second trial. Non-fatal on error — org creation
    // succeeded either way, user can still upgrade manually.
    let trialInfo = { trialStarted: false };
    try {
      const { data: flag } = await supabase
        .from('user_billing_flags')
        .select('trial_consumed')
        .eq('user_id', userId)
        .maybeSingle();

      if (!flag?.trial_consumed) {
        const { startReverseTrial } = require('./start-reverse-trial.cjs');
        trialInfo = await startReverseTrial({
          organizationId: newOrg.id,
          userId,
          userEmail,
          organizationName: name,
        });
      } else {
        console.log(
          `[create-organization] user ${userId} already consumed trial; skipping reverse-trial provisioning`
        );
      }
    } catch (trialErr) {
      console.error('[create-organization] reverse-trial provisioning failed (non-fatal):', trialErr);
    }

    return successResponse(
      {
        organization: {
          id: newOrg.id,
          name: newOrg.name,
          slug: newOrg.slug,
          logoUrl: newOrg.logo_url,
          primaryColor: newOrg.primary_color || '#6366f1',
          contactEmail: newOrg.contact_email,
          description: newOrg.description,
        },
        role: 'owner',
        isDefault: true,
        trial: trialInfo,
      },
      origin
    );
  } catch (err) {
    console.error('create-organization error:', err);
    return errorResponse(500, 'Internal server error', origin);
  }
};
