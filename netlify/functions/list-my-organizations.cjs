/**
 * list-my-organizations
 *
 * POST (or GET) /.netlify/functions/list-my-organizations
 * Auth: Clerk JWT in Authorization header.
 *
 * Returns the organizations the caller is a member of, by querying through
 * the service-role key. This is the server-side twin of the direct
 * `supabase.from('organization_members').select(..., organizations(*))` the
 * client does in OrganizationContext. The client prefers this endpoint
 * because Supabase Third-Party Auth with Clerk may not be fully configured
 * in every environment — without it, RLS returns empty/403 for direct reads.
 *
 * Shape mirrors what `toOrganizationWithRole` expects so the client can
 * setState directly with minimal mapping.
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyClerkToken } = require('./utils/clerk-auth.cjs');
const {
  handleCorsPreflght,
  errorResponse,
  successResponse,
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

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;

  if (event.httpMethod === 'OPTIONS') return handleCorsPreflght(event);
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return errorResponse(405, 'Method not allowed', origin);
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    let userId;
    try {
      const verified = await verifyClerkToken(authHeader);
      userId = verified.userId;
    } catch (err) {
      return errorResponse(err.statusCode || 401, err.message || 'Unauthorized', origin);
    }

    const supabase = getSupabase();

    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select(
        `
          role,
          is_default,
          joined_at,
          organization_id,
          organizations (
            id,
            name,
            slug,
            logo_url,
            primary_color,
            contact_email,
            description,
            features
          )
        `
      )
      .eq('user_id', userId);

    if (error) {
      console.error('list-my-organizations: select failed:', error);
      return errorResponse(500, 'Failed to load organizations', origin);
    }

    const orgs = (memberships || [])
      .filter((m) => m.organizations)
      .map((m) => {
        // Supabase returns nested rows as either an object or a single-item
        // array depending on query-planner choice; normalise both here.
        const org = Array.isArray(m.organizations)
          ? m.organizations[0]
          : m.organizations;
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logoUrl: org.logo_url,
          primaryColor: org.primary_color || '#6366f1',
          contactEmail: org.contact_email,
          description: org.description,
          customBranding: org.features?.customBranding === true,
          role: m.role,
          isDefault: !!m.is_default,
          joinedAt: m.joined_at,
        };
      });

    return successResponse({ organizations: orgs }, origin);
  } catch (err) {
    console.error('list-my-organizations error:', err);
    return errorResponse(500, 'Internal server error', origin);
  }
};
