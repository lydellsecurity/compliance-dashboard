/**
 * Input Validation Service
 *
 * Provides comprehensive input validation and sanitization
 * to prevent injection attacks and ensure data integrity.
 *
 * Security Features:
 * - XSS prevention through sanitization
 * - SQL injection pattern detection
 * - Input length limits
 * - Format validation (email, URL, etc.)
 * - Schema-based validation
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: unknown;
}

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'uuid' | 'date' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  items?: ValidationRule;      // For arrays
  properties?: Record<string, ValidationRule>; // For objects
  custom?: (value: unknown) => boolean;
}

export type ValidationSchema = Record<string, ValidationRule>;

// ============================================================================
// CONSTANTS
// ============================================================================

// Common dangerous patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<form/gi,
  /data:/gi,
  /vbscript:/gi,
];

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi,
  /--/g,
  /;/g,
  /\/\*/g,
  /\*\//g,
  /xp_/gi,
  /0x[0-9a-f]+/gi,
];

const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$(){}[\]\\]/g,
  /\$\(/g,
  /`/g,
];

// Validation patterns
const PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  url: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
  controlId: /^[A-Z]{2,4}-\d{3}$/,
  phoneNumber: /^\+?[\d\s-()]+$/,
  ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  awsAccessKey: /^[A-Z0-9]{20}$/,
  awsSecretKey: /^[A-Za-z0-9/+=]{40}$/,
  awsRegion: /^[a-z]{2}-[a-z]+-\d$/,
};

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * HTML entity encoding for XSS prevention
 */
function encodeHtmlEntities(str: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  return str.replace(/[&<>"'`=/]/g, char => entities[char] || char);
}

/**
 * Remove potentially dangerous content from string
 */
function sanitizeString(input: string, maxLength: number = 10000): string {
  if (typeof input !== 'string') return '';

  let sanitized = input.trim();

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Encode HTML entities
  sanitized = encodeHtmlEntities(sanitized);

  return sanitized;
}

/**
 * Sanitize object recursively
 */
function sanitizeObject<T extends Record<string, unknown>>(obj: T, depth: number = 0): T {
  if (depth > 10) throw new Error('Object nesting too deep');

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key, 100);

    if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[sanitizedKey] = value.map(item =>
        typeof item === 'string' ? sanitizeString(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>, depth + 1) :
        item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[sanitizedKey] = sanitizeObject(value as Record<string, unknown>, depth + 1);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }

  return sanitized as T;
}

// ============================================================================
// VALIDATION SERVICE CLASS
// ============================================================================

export class ValidationService {
  /**
   * Check for XSS patterns in input
   */
  containsXSS(input: string): boolean {
    return XSS_PATTERNS.some(pattern => pattern.test(input));
  }

  /**
   * Check for SQL injection patterns
   */
  containsSQLInjection(input: string): boolean {
    return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
  }

  /**
   * Check for command injection patterns
   */
  containsCommandInjection(input: string): boolean {
    return COMMAND_INJECTION_PATTERNS.some(pattern => pattern.test(input));
  }

  /**
   * Validate a single value against a rule
   */
  validateValue(value: unknown, rule: ValidationRule): ValidationResult {
    const errors: string[] = [];

    // Check required
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push('Value is required');
      return { valid: false, errors };
    }

    // Skip further validation if value is empty and not required
    if (value === undefined || value === null || value === '') {
      return { valid: true, errors: [], sanitized: value };
    }

    // Type-specific validation
    switch (rule.type) {
      case 'string': {
        if (typeof value !== 'string') {
          errors.push('Value must be a string');
          break;
        }

        // Security checks
        if (this.containsXSS(value)) {
          errors.push('Value contains potentially dangerous content');
        }

        // Length validation
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          errors.push(`Value must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          errors.push(`Value must be at most ${rule.maxLength} characters`);
        }

        // Pattern validation
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push('Value does not match required pattern');
        }

        // Enum validation
        if (rule.enum && !rule.enum.includes(value)) {
          errors.push(`Value must be one of: ${rule.enum.join(', ')}`);
        }
        break;
      }

      case 'number': {
        const numValue = typeof value === 'number' ? value : parseFloat(value as string);
        if (isNaN(numValue)) {
          errors.push('Value must be a number');
          break;
        }

        if (rule.min !== undefined && numValue < rule.min) {
          errors.push(`Value must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && numValue > rule.max) {
          errors.push(`Value must be at most ${rule.max}`);
        }
        break;
      }

      case 'boolean': {
        if (typeof value !== 'boolean') {
          errors.push('Value must be a boolean');
        }
        break;
      }

      case 'email': {
        if (typeof value !== 'string' || !PATTERNS.email.test(value)) {
          errors.push('Invalid email format');
        }
        break;
      }

      case 'url': {
        if (typeof value !== 'string' || !PATTERNS.url.test(value)) {
          errors.push('Invalid URL format');
        }
        break;
      }

      case 'uuid': {
        if (typeof value !== 'string' || !PATTERNS.uuid.test(value)) {
          errors.push('Invalid UUID format');
        }
        break;
      }

      case 'date': {
        const dateValue = value instanceof Date ? value : new Date(value as string);
        if (isNaN(dateValue.getTime())) {
          errors.push('Invalid date format');
        }
        break;
      }

      case 'array': {
        if (!Array.isArray(value)) {
          errors.push('Value must be an array');
          break;
        }

        if (rule.minLength !== undefined && value.length < rule.minLength) {
          errors.push(`Array must have at least ${rule.minLength} items`);
        }
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          errors.push(`Array must have at most ${rule.maxLength} items`);
        }

        // Validate array items
        if (rule.items) {
          value.forEach((item, index) => {
            const itemResult = this.validateValue(item, rule.items!);
            if (!itemResult.valid) {
              errors.push(`Item ${index}: ${itemResult.errors.join(', ')}`);
            }
          });
        }
        break;
      }

      case 'object': {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push('Value must be an object');
          break;
        }

        // Validate object properties
        if (rule.properties) {
          for (const [propName, propRule] of Object.entries(rule.properties)) {
            const propValue = (value as Record<string, unknown>)[propName];
            const propResult = this.validateValue(propValue, propRule);
            if (!propResult.valid) {
              errors.push(`${propName}: ${propResult.errors.join(', ')}`);
            }
          }
        }
        break;
      }
    }

    // Custom validation
    if (rule.custom && !rule.custom(value)) {
      errors.push('Value failed custom validation');
    }

    // Sanitize if valid
    let sanitized: unknown = value;
    if (errors.length === 0 && typeof value === 'string') {
      sanitized = sanitizeString(value, rule.maxLength);
    } else if (errors.length === 0 && typeof value === 'object' && value !== null) {
      sanitized = sanitizeObject(value as Record<string, unknown>);
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized,
    };
  }

  /**
   * Validate an object against a schema
   */
  validate<T extends Record<string, unknown>>(
    data: T,
    schema: ValidationSchema
  ): ValidationResult & { sanitized?: T } {
    const errors: string[] = [];
    const sanitized: Record<string, unknown> = {};

    for (const [field, rule] of Object.entries(schema)) {
      const value = data[field];
      const result = this.validateValue(value, rule);

      if (!result.valid) {
        errors.push(...result.errors.map(e => `${field}: ${e}`));
      } else {
        sanitized[field] = result.sanitized;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized as T : undefined,
    };
  }

  /**
   * Validate AWS credentials format
   */
  validateAWSCredentials(credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  }): ValidationResult {
    const schema: ValidationSchema = {
      accessKeyId: {
        type: 'string',
        required: true,
        pattern: PATTERNS.awsAccessKey,
      },
      secretAccessKey: {
        type: 'string',
        required: true,
        pattern: PATTERNS.awsSecretKey,
      },
      region: {
        type: 'string',
        required: true,
        pattern: PATTERNS.awsRegion,
      },
    };

    return this.validate(credentials, schema);
  }

  /**
   * Validate control ID format
   */
  validateControlId(controlId: string): boolean {
    return PATTERNS.controlId.test(controlId);
  }

  /**
   * Sanitize user input
   */
  sanitize(input: string, maxLength?: number): string {
    return sanitizeString(input, maxLength);
  }

  /**
   * Sanitize an entire object
   */
  sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    return sanitizeObject(obj);
  }
}

// ============================================================================
// PRE-DEFINED SCHEMAS
// ============================================================================

export const SCHEMAS = {
  userProfile: {
    email: { type: 'email' as const, required: true },
    name: { type: 'string' as const, required: true, minLength: 1, maxLength: 100 },
    company: { type: 'string' as const, maxLength: 200 },
  },

  complianceResponse: {
    controlId: { type: 'string' as const, required: true, pattern: PATTERNS.controlId },
    answer: { type: 'string' as const, required: true, enum: ['yes', 'no', 'partial', 'not_applicable'] },
    notes: { type: 'string' as const, maxLength: 5000 },
    remediationPlan: { type: 'string' as const, maxLength: 10000 },
  },

  alertConfiguration: {
    severity: { type: 'string' as const, required: true, enum: ['critical', 'high', 'medium', 'low'] },
    enabled: { type: 'boolean' as const, required: true },
    threshold: { type: 'number' as const, min: 0, max: 100 },
  },
} as const;

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const validationService = new ValidationService();

export default validationService;
