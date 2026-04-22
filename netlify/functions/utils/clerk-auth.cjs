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
    const err = new Error('Missing or invalid authorization header');
    err.statusCode = 401;
    throw err;
  }
  const token = authHeader.slice('Bearer '.length).trim();

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    if (!clerkKeyWarned) {
      console.error(
        '[clerk-auth] CLERK_SECRET_KEY is not configured for this Netlify context (production vs deploy-preview vs branch-deploy each have their own env scope). Set it under Netlify → Environment for every context you deploy to.'
      );
      clerkKeyWarned = true;
    }
    const err = new Error('Server auth not configured: CLERK_SECRET_KEY missing');
    err.statusCode = 500;
    throw err;
  }

  // Optional hardening — if CLERK_AUTHORIZED_PARTIES is set, verifyToken
  // checks the JWT's `azp` claim against the list. Unset by default so
  // deploy previews work without per-branch env changes.
  const authorizedParties = process.env.CLERK_AUTHORIZED_PARTIES
    ? process.env.CLERK_AUTHORIZED_PARTIES.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

  try {
    const payload = await verifyToken(token, {
      secretKey,
      ...(authorizedParties ? { authorizedParties } : {}),
    });
    if (!payload?.sub) {
      const err = new Error('Invalid token payload (no subject)');
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
    // Surface the specific verifyToken failure in function logs so operators
    // can tell "secret from a different Clerk instance" from "token expired"
    // from "azp mismatch" without having to diff the JWT by hand.
    const reason =
      err?.reason ||
      err?.code ||
      err?.message ||
      'unknown verification error';
    console.error(`[clerk-auth] verifyToken failed: ${reason}`, {
      name: err?.name,
      clerkTraceId: err?.clerkTraceId,
      tokenPrefix: token.slice(0, 16),
    });
    const e = new Error(`Invalid or expired token (${reason})`);
    e.statusCode = 401;
    throw e;
  }
}

module.exports = { verifyClerkToken };
