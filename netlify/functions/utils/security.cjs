/**
 * Security Utilities for Netlify Functions
 *
 * Provides common security functionality:
 * - CORS configuration with origin validation
 * - Input sanitization
 * - Rate limiting helpers
 * - Request validation
 */

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

/**
 * Allowed origins for CORS
 * Add production domains here
 */
const ALLOWED_ORIGINS = [
  'http://localhost:5173',      // Vite dev server
  'http://localhost:3000',      // Alternative dev server
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  // Add production domains
  'https://extraordinary-truffle-4c58a0.netlify.app',
  // Netlify deploy previews match this pattern
];

// Pattern for Netlify deploy previews
const NETLIFY_PREVIEW_PATTERN = /^https:\/\/[a-z0-9-]+--extraordinary-truffle-4c58a0\.netlify\.app$/;

/**
 * Validate if origin is allowed
 */
function isOriginAllowed(origin) {
  if (!origin) return false;

  // Check exact match
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  // Check Netlify preview pattern
  if (NETLIFY_PREVIEW_PATTERN.test(origin)) return true;

  return false;
}

/**
 * Get CORS headers with origin validation
 */
function getCorsHeaders(requestOrigin) {
  const origin = isOriginAllowed(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Timestamp, X-Request-Nonce, X-Request-Signature',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Handle CORS preflight request
 */
function handleCorsPreflght(event) {
  const origin = event.headers.origin || event.headers.Origin;
  return {
    statusCode: 204,
    headers: getCorsHeaders(origin),
    body: '',
  };
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize string input
 */
function sanitizeString(str, maxLength = 2000) {
  if (!str || typeof str !== 'string') return '';

  return str
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '')    // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '')      // Remove event handlers
    .substring(0, maxLength)
    .trim();
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj, depth = 0) {
  if (depth > 10) return {}; // Prevent deep recursion

  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key, 100);
    if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[sanitizedKey] = sanitizeObject(value, depth + 1);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }
  return sanitized;
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

/**
 * Validate request timestamp to prevent replay attacks
 */
function isTimestampValid(timestamp, maxAgeMs = 300000) {
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;

  const now = Date.now();
  return Math.abs(now - ts) <= maxAgeMs;
}

/**
 * Parse and validate JSON body
 */
function parseJsonBody(body) {
  if (!body) return { valid: false, error: 'Missing request body' };

  try {
    const parsed = JSON.parse(body);
    if (typeof parsed !== 'object' || parsed === null) {
      return { valid: false, error: 'Request body must be an object' };
    }
    return { valid: true, data: sanitizeObject(parsed) };
  } catch (e) {
    return { valid: false, error: 'Invalid JSON payload' };
  }
}

/**
 * Create error response
 */
function errorResponse(statusCode, message, origin) {
  return {
    statusCode,
    headers: {
      ...getCorsHeaders(origin),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ error: message }),
  };
}

/**
 * Create success response
 */
function successResponse(data, origin) {
  return {
    statusCode: 200,
    headers: {
      ...getCorsHeaders(origin),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  };
}

// ============================================================================
// RATE LIMITING (Simple in-memory, for production use Redis/DynamoDB)
// ============================================================================

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;

/**
 * Check rate limit for an identifier (e.g., IP address)
 */
function checkRateLimit(identifier) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Get or create entry
  let entry = rateLimitStore.get(identifier);
  if (!entry) {
    entry = { requests: [], blocked: false };
    rateLimitStore.set(identifier, entry);
  }

  // Remove old requests
  entry.requests = entry.requests.filter(ts => ts > windowStart);

  // Check if blocked
  if (entry.requests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: entry.requests[0] + RATE_LIMIT_WINDOW_MS };
  }

  // Add current request
  entry.requests.push(now);

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - entry.requests.length,
    resetAt: now + RATE_LIMIT_WINDOW_MS,
  };
}

/**
 * Clean up old rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS * 2;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.requests.every(ts => ts < windowStart)) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  getCorsHeaders,
  handleCorsPreflght,
  isOriginAllowed,
  sanitizeString,
  sanitizeObject,
  isTimestampValid,
  parseJsonBody,
  errorResponse,
  successResponse,
  checkRateLimit,
  ALLOWED_ORIGINS,
};
