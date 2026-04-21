/**
 * Clerk JWT verification for Netlify Functions.
 *
 * The browser sends `Authorization: Bearer <clerk-session-jwt>`. We validate
 * it via @clerk/backend's networkless verifier (uses Clerk's JWKS cached in
 * process memory) and return the decoded payload. Supabase is then called
 * with the service-role key because Clerk's JWT isn't for Supabase's
 * GoTrue — we enforce tenancy ourselves here by resolving the caller's org
 * membership and trusting nothing client-supplied.
 */

const { verifyToken } = require('@clerk/backend');

let clerkKeyWarned = false;

/**
 * Verify a Clerk session JWT and return { userId, sessionId, claims } or throw.
 */
async function verifyClerkToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Missing or invalid authorization token');
    err.statusCode = 401;
    throw err;
  }
  const token = authHeader.slice('Bearer '.length).trim();

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    if (!clerkKeyWarned) {
      console.error('CLERK_SECRET_KEY is not configured');
      clerkKeyWarned = true;
    }
    const err = new Error('Server auth not configured');
    err.statusCode = 500;
    throw err;
  }

  try {
    const payload = await verifyToken(token, {
      secretKey,
      // Optional: audience/issuer can be tightened via env when needed.
    });
    if (!payload?.sub) {
      const err = new Error('Invalid token payload');
      err.statusCode = 401;
      throw err;
    }
    return {
      userId: payload.sub,
      sessionId: payload.sid,
      claims: payload,
    };
  } catch (err) {
    if (err.statusCode) throw err;
    const e = new Error('Invalid or expired token');
    e.statusCode = 401;
    throw e;
  }
}

module.exports = { verifyClerkToken };
