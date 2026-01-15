/**
 * Security Services Module
 *
 * Centralized export for all security-related services.
 * Implements industry best practices for:
 * - End-to-end encryption (AES-256-GCM)
 * - Secure storage with encryption at rest
 * - Request signing and integrity verification
 * - Input validation and sanitization
 */

// Encryption Service
export {
  encryptionService,
  EncryptionService,
  type EncryptedPayload,
  type EncryptionConfig,
} from './encryption.service';

// Secure Storage Service
export {
  secureStorage,
  SecureStorageService,
  type SecureStorageOptions,
  type DataSensitivity,
} from './secure-storage.service';

// Secure API Service
export {
  secureApi,
  SecureApiService,
  type SecureRequestOptions,
  type SecureResponse,
} from './secure-api.service';

// Validation Service
export {
  validationService,
  ValidationService,
  SCHEMAS,
  type ValidationResult,
  type ValidationRule,
  type ValidationSchema,
} from './validation.service';

// ============================================================================
// SECURITY INITIALIZATION
// ============================================================================

/**
 * Initialize all security services with user context
 * Call this after user authentication
 */
export async function initializeSecurity(
  userId: string,
  sessionToken?: string
): Promise<void> {
  const { secureStorage } = await import('./secure-storage.service');
  const { secureApi } = await import('./secure-api.service');
  const { encryptionService } = await import('./encryption.service');

  // Initialize secure storage with user-specific key
  await secureStorage.initialize(userId, sessionToken);

  // Generate signing key from user context
  const signingKey = await encryptionService.hash(`${userId}:${sessionToken}:signing`);
  const encryptionKey = await encryptionService.hash(`${userId}:${sessionToken}:encryption`);

  // Initialize secure API with keys
  await secureApi.initialize(signingKey, encryptionKey);
}

/**
 * Clean up all security services
 * Call this on user logout
 */
export function destroySecurity(): void {
  import('./secure-storage.service').then(m => m.secureStorage.destroy());
  import('./secure-api.service').then(m => m.secureApi.destroy());
  import('./encryption.service').then(m => m.encryptionService.clearKeys());
}

// ============================================================================
// SECURITY HEADERS CONFIGURATION
// ============================================================================

/**
 * Recommended security headers for the application
 * Configure these in your deployment platform (Netlify, etc.)
 */
export const SECURITY_HEADERS = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable XSS filter
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy (formerly Feature-Policy)
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',

  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for React in dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co https://*.netlify.app https://api.anthropic.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),

  // Strict Transport Security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

// ============================================================================
// SECURITY BEST PRACTICES CONSTANTS
// ============================================================================

export const SECURITY_CONFIG = {
  // Session timeout (30 minutes of inactivity)
  SESSION_TIMEOUT_MS: 30 * 60 * 1000,

  // Maximum failed login attempts before lockout
  MAX_LOGIN_ATTEMPTS: 5,

  // Lockout duration (15 minutes)
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,

  // Password requirements
  PASSWORD_MIN_LENGTH: 12,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBER: true,
  PASSWORD_REQUIRE_SPECIAL: true,

  // Token expiration
  ACCESS_TOKEN_EXPIRY_MS: 15 * 60 * 1000,  // 15 minutes
  REFRESH_TOKEN_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Rate limiting
  API_RATE_LIMIT_PER_MINUTE: 60,
  API_RATE_LIMIT_PER_HOUR: 1000,

  // Data retention
  AUDIT_LOG_RETENTION_DAYS: 90,
  SENSITIVE_DATA_RETENTION_DAYS: 30,
};
