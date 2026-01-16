// netlify/functions/get-trust-center-data.cjs
// Public Trust Center Data API - Validates tokens and returns org compliance data

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
const REQUIRED_ENV_VARS = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvVars = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Rate limiting: simple in-memory store (resets on cold start)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // max 30 requests per minute per IP

function checkRateLimit(identifier) {
  const now = Date.now();
  const requests = rateLimitStore.get(identifier) || [];

  // Clean old requests outside window
  const recentRequests = requests.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  recentRequests.push(now);
  rateLimitStore.set(identifier, recentRequests);
  return true;
}

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle OPTIONS for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Only allow GET
  if (event.httpMethod !== 'GET') {
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
    // Get client IP for rate limiting
    const clientIp = event.headers['x-forwarded-for'] ||
                     event.headers['x-real-ip'] ||
                     'unknown';

    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      };
    }

    // Get slug and token from query parameters
    const { slug, token } = event.queryStringParameters || {};

    if (!slug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Organization slug is required' }),
      };
    }

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Access token is required' }),
      };
    }

    // Validate slug format (alphanumeric, hyphens, 3-50 chars)
    if (!/^[a-z0-9-]{3,50}$/.test(slug)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid organization slug format' }),
      };
    }

    // Validate token format (alphanumeric, 32-64 chars)
    if (!/^[a-zA-Z0-9]{32,64}$/.test(token)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid token format' }),
      };
    }

    // Initialize Supabase with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find organization by slug
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, logo_url, primary_color, contact_email, description')
      .eq('slug', slug)
      .single();

    if (orgError || !organization) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Organization not found' }),
      };
    }

    // Validate token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('trust_center_tokens')
      .select('id, token, expires_at, is_active, name')
      .eq('organization_id', organization.id)
      .eq('token', token)
      .single();

    if (tokenError || !tokenRecord) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Access denied',
          message: 'Invalid access token. Please contact the organization for a valid link.',
          contactEmail: organization.contact_email,
        }),
      };
    }

    // Check if token is active
    if (!tokenRecord.is_active) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Access denied',
          message: 'This access link has been deactivated. Please contact the organization for a new link.',
          contactEmail: organization.contact_email,
        }),
      };
    }

    // Check if token is expired
    if (tokenRecord.expires_at) {
      const expiresAt = new Date(tokenRecord.expires_at);
      if (expiresAt < new Date()) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            error: 'Access denied',
            message: 'This access link has expired. Please contact the organization for a new link.',
            contactEmail: organization.contact_email,
          }),
        };
      }
    }

    // Token is valid! Fetch compliance data

    // Get control responses for this organization
    const { data: responses, error: responsesError } = await supabase
      .from('control_responses')
      .select('control_id, answer, notes, updated_at')
      .eq('organization_id', organization.id);

    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
    }

    // Get evidence records for this organization
    const { data: evidence, error: evidenceError } = await supabase
      .from('evidence_records')
      .select('control_id, notes, file_urls, created_at')
      .eq('organization_id', organization.id);

    if (evidenceError) {
      console.error('Error fetching evidence:', evidenceError);
    }

    // Calculate framework statistics
    const responseMap = {};
    (responses || []).forEach(r => {
      responseMap[r.control_id] = r;
    });

    const totalAnswered = Object.keys(responseMap).length;
    const compliant = Object.values(responseMap).filter(r => r.answer === 'yes').length;
    const partial = Object.values(responseMap).filter(r => r.answer === 'partial').length;
    const gaps = Object.values(responseMap).filter(r => r.answer === 'no').length;
    const notApplicable = Object.values(responseMap).filter(r => r.answer === 'na' || r.answer === 'n/a').length;

    const applicableAnswered = totalAnswered - notApplicable;
    const compliancePercentage = applicableAnswered > 0
      ? Math.round((compliant / applicableAnswered) * 100)
      : 0;

    // Calculate framework-specific stats (simplified)
    // In production, this would cross-reference with actual control definitions
    const frameworkStats = {
      SOC2: { total: 0, met: 0, percentage: 0 },
      ISO27001: { total: 0, met: 0, percentage: 0 },
      HIPAA: { total: 0, met: 0, percentage: 0 },
      NIST: { total: 0, met: 0, percentage: 0 },
    };

    // Simple pattern matching for framework identification
    Object.entries(responseMap).forEach(([controlId, response]) => {
      const isCompliant = response.answer === 'yes';

      // SOC2 patterns
      if (/^(CC|A|PI|C|P)\d/.test(controlId)) {
        frameworkStats.SOC2.total++;
        if (isCompliant) frameworkStats.SOC2.met++;
      }
      // ISO27001 patterns
      if (/^(A\.|ISO)/.test(controlId)) {
        frameworkStats.ISO27001.total++;
        if (isCompliant) frameworkStats.ISO27001.met++;
      }
      // HIPAA patterns
      if (/^(164|HP)/.test(controlId)) {
        frameworkStats.HIPAA.total++;
        if (isCompliant) frameworkStats.HIPAA.met++;
      }
      // NIST patterns
      if (/^(ID|PR|DE|RS|RC)\./.test(controlId)) {
        frameworkStats.NIST.total++;
        if (isCompliant) frameworkStats.NIST.met++;
      }
    });

    // Calculate percentages
    Object.keys(frameworkStats).forEach(fw => {
      frameworkStats[fw].percentage = frameworkStats[fw].total > 0
        ? Math.round((frameworkStats[fw].met / frameworkStats[fw].total) * 100)
        : 0;
    });

    // If no framework patterns matched, distribute evenly
    const hasAnyFramework = Object.values(frameworkStats).some(f => f.total > 0);
    if (!hasAnyFramework && totalAnswered > 0) {
      const perFramework = Math.ceil(totalAnswered / 4);
      const ratio = applicableAnswered > 0 ? compliant / applicableAnswered : 0;

      Object.keys(frameworkStats).forEach(fw => {
        frameworkStats[fw].total = perFramework;
        frameworkStats[fw].met = Math.round(perFramework * ratio);
        frameworkStats[fw].percentage = Math.round(ratio * 100);
      });
    }

    // Prepare public response (sanitized, no sensitive details)
    const trustCenterData = {
      organization: {
        name: organization.name,
        slug: organization.slug,
        logoUrl: organization.logo_url,
        primaryColor: organization.primary_color || '#6366f1',
        contactEmail: organization.contact_email,
        description: organization.description,
      },
      accessToken: {
        name: tokenRecord.name || 'Trust Center Access',
        expiresAt: tokenRecord.expires_at,
      },
      compliance: {
        overallPercentage: compliancePercentage,
        totalControls: totalAnswered,
        compliant,
        partial,
        gaps,
        notApplicable,
        evidenceCount: (evidence || []).length,
        lastUpdated: responses && responses.length > 0
          ? responses.reduce((latest, r) => {
              const updated = new Date(r.updated_at);
              return updated > latest ? updated : latest;
            }, new Date(0)).toISOString()
          : null,
      },
      frameworks: frameworkStats,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(trustCenterData),
    };

  } catch (error) {
    console.error('Trust Center data error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
