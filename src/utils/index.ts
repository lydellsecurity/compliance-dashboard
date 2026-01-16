/**
 * Utils Index
 *
 * Centralized exports for all utility modules.
 */

// Rate limiting
export {
  rateLimiter,
  useRateLimit,
  withRateLimit,
  RateLimitError,
  RATE_LIMIT_CONFIGS,
} from './rateLimiter';

// Validation & sanitization
export {
  // Sanitization
  sanitizeString,
  sanitizeForDisplay,
  sanitizeSearchQuery,
  sanitizeFilename,
  sanitizeUrl,
  sanitizeEmail,
  // Validation
  isValidEmail,
  isValidUrl,
  isValidUuid,
  isValidSlug,
  isValidPhone,
  isValidJson,
  isValidIsoDate,
  validatePassword,
  containsMaliciousContent,
  // Form validation
  validateField,
  validateForm,
  COMMON_SCHEMAS,
} from './validation';
export type { ValidationResult, FieldValidation, ValidationSchema } from './validation';

// Slug utilities
export { generateSlug, ensureUniqueSlug } from './slug';

// Storage migration
export {
  getOrgStorageKeys,
  migrateLocalStorage,
  needsMigration,
  hasLegacyData,
} from './storageMigration';
