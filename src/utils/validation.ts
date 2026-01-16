/**
 * Input Validation & Sanitization Utilities
 *
 * Provides comprehensive input validation and sanitization for security.
 * Prevents XSS, SQL injection, and other common vulnerabilities.
 *
 * Features:
 * - Type-safe validators with TypeScript
 * - Sanitization functions for user input
 * - Common validation patterns (email, URL, etc.)
 * - Form validation helpers
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedValue?: unknown;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => ValidationResult;
  sanitize?: boolean;
}

export interface ValidationSchema {
  [field: string]: FieldValidation;
}

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitize string input - remove/escape potentially dangerous characters
 */
export function sanitizeString(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }

  const str = String(input);

  // Remove null bytes
  let sanitized = str.replace(/\0/g, '');

  // Escape HTML entities to prevent XSS
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
}

/**
 * Sanitize string for display (lighter sanitization)
 */
export function sanitizeForDisplay(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }

  const str = String(input);

  // Only escape the most dangerous characters
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sanitize SQL-like input (for search queries etc.)
 */
export function sanitizeSearchQuery(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }

  const str = String(input);

  // Remove SQL injection characters
  return str
    .replace(/[;'"\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .trim();
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(input: unknown): string {
  if (input === null || input === undefined) {
    return 'unnamed';
  }

  const str = String(input);

  // Remove path separators and dangerous characters
  return str
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\./, '_')
    .trim()
    .slice(0, 255) || 'unnamed';
}

/**
 * Sanitize URL - ensure it's a valid, safe URL
 */
export function sanitizeUrl(input: unknown): string | null {
  if (input === null || input === undefined) {
    return null;
  }

  const str = String(input).trim();

  // Check for javascript: or data: URLs (XSS vectors)
  if (/^(javascript|data|vbscript):/i.test(str)) {
    return null;
  }

  try {
    const url = new URL(str);
    // Only allow http and https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url.href;
  } catch {
    // If it's not a valid URL, try prepending https://
    if (!str.startsWith('http://') && !str.startsWith('https://')) {
      try {
        const url = new URL(`https://${str}`);
        return url.href;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }

  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[<>'"]/g, '');
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate email address
 */
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate URL
 */
export function isValidUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate UUID
 */
export function isValidUuid(uuid: unknown): boolean {
  if (typeof uuid !== 'string') return false;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate slug (URL-friendly string)
 */
export function isValidSlug(slug: unknown): boolean {
  if (typeof slug !== 'string') return false;

  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length >= 2 && slug.length <= 100;
}

/**
 * Validate phone number (basic international format)
 */
export function isValidPhone(phone: unknown): boolean {
  if (typeof phone !== 'string') return false;

  // Remove common separators for validation
  const cleaned = phone.replace(/[\s\-().]/g, '');
  const phoneRegex = /^\+?[1-9]\d{6,14}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Validate password strength
 */
export function validatePassword(password: unknown): ValidationResult {
  if (typeof password !== 'string') {
    return { valid: false, error: 'Password must be a string' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }

  return { valid: true };
}

/**
 * Validate JSON string
 */
export function isValidJson(str: unknown): boolean {
  if (typeof str !== 'string') return false;

  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate date string (ISO 8601)
 */
export function isValidIsoDate(date: unknown): boolean {
  if (typeof date !== 'string') return false;

  const parsed = Date.parse(date);
  if (isNaN(parsed)) return false;

  // Check if it's a reasonable date (not in far past or future)
  const minDate = new Date('1900-01-01').getTime();
  const maxDate = new Date('2100-12-31').getTime();
  return parsed >= minDate && parsed <= maxDate;
}

/**
 * Check for potentially malicious content
 */
export function containsMaliciousContent(input: unknown): boolean {
  if (typeof input !== 'string') return false;

  const maliciousPatterns = [
    /<script\b[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /expression\s*\(/i, // CSS expression
    /url\s*\(\s*['"]?\s*javascript:/i,
    /data:\s*text\/html/i,
  ];

  return maliciousPatterns.some((pattern) => pattern.test(input));
}

// ============================================================================
// FORM VALIDATION
// ============================================================================

/**
 * Validate a single field
 */
export function validateField(
  value: unknown,
  validation: FieldValidation
): ValidationResult {
  // Required check
  if (validation.required) {
    if (value === null || value === undefined || value === '') {
      return { valid: false, error: 'This field is required' };
    }
  }

  // Skip further validation if empty and not required
  if (value === null || value === undefined || value === '') {
    return { valid: true };
  }

  const strValue = String(value);

  // Length checks
  if (validation.minLength !== undefined && strValue.length < validation.minLength) {
    return {
      valid: false,
      error: `Must be at least ${validation.minLength} characters`,
    };
  }

  if (validation.maxLength !== undefined && strValue.length > validation.maxLength) {
    return {
      valid: false,
      error: `Must be no more than ${validation.maxLength} characters`,
    };
  }

  // Pattern check
  if (validation.pattern && !validation.pattern.test(strValue)) {
    return { valid: false, error: 'Invalid format' };
  }

  // Custom validation
  if (validation.custom) {
    const customResult = validation.custom(value);
    if (!customResult.valid) {
      return customResult;
    }
  }

  // Sanitize if requested
  let sanitizedValue = value;
  if (validation.sanitize) {
    sanitizedValue = sanitizeString(value);
  }

  return { valid: true, sanitizedValue };
}

/**
 * Validate form data against a schema
 */
export function validateForm(
  data: Record<string, unknown>,
  schema: ValidationSchema
): { valid: boolean; errors: Record<string, string>; sanitized: Record<string, unknown> } {
  const errors: Record<string, string> = {};
  const sanitized: Record<string, unknown> = {};

  for (const [field, validation] of Object.entries(schema)) {
    const result = validateField(data[field], validation);

    if (!result.valid && result.error) {
      errors[field] = result.error;
    }

    sanitized[field] = result.sanitizedValue ?? data[field];
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

export const COMMON_SCHEMAS: Record<string, ValidationSchema> = {
  login: {
    email: {
      required: true,
      maxLength: 254,
      custom: (v) => ({
        valid: isValidEmail(v),
        error: 'Please enter a valid email address',
      }),
    },
    password: {
      required: true,
      minLength: 8,
      maxLength: 128,
    },
  },

  signup: {
    email: {
      required: true,
      maxLength: 254,
      custom: (v) => ({
        valid: isValidEmail(v),
        error: 'Please enter a valid email address',
      }),
    },
    password: {
      required: true,
      custom: validatePassword,
    },
    fullName: {
      required: true,
      minLength: 2,
      maxLength: 100,
      sanitize: true,
    },
  },

  organization: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 100,
      sanitize: true,
    },
    slug: {
      required: false,
      custom: (v) =>
        v ? { valid: isValidSlug(v), error: 'Slug must be lowercase letters, numbers, and hyphens' } : { valid: true },
    },
    contactEmail: {
      required: false,
      custom: (v) =>
        v ? { valid: isValidEmail(v), error: 'Please enter a valid email address' } : { valid: true },
    },
  },

  vendor: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 200,
      sanitize: true,
    },
    website: {
      required: false,
      custom: (v) =>
        v ? { valid: isValidUrl(String(v)), error: 'Please enter a valid URL' } : { valid: true },
    },
    contactEmail: {
      required: false,
      custom: (v) =>
        v ? { valid: isValidEmail(v), error: 'Please enter a valid email address' } : { valid: true },
    },
  },
};

export default {
  sanitizeString,
  sanitizeForDisplay,
  sanitizeSearchQuery,
  sanitizeFilename,
  sanitizeUrl,
  sanitizeEmail,
  isValidEmail,
  isValidUrl,
  isValidUuid,
  isValidSlug,
  isValidPhone,
  isValidJson,
  isValidIsoDate,
  validatePassword,
  containsMaliciousContent,
  validateField,
  validateForm,
  COMMON_SCHEMAS,
};
