/**
 * Rate Limiter Utility
 *
 * Client-side rate limiting for API calls and actions.
 * Implements token bucket algorithm for flexible rate limiting.
 *
 * Features:
 * - Configurable rate limits per action type
 * - Automatic token replenishment
 * - Burst handling with max tokens
 * - Persistent state across page reloads (optional)
 */

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitConfig {
  /** Maximum tokens in the bucket */
  maxTokens: number;
  /** Tokens replenished per interval */
  refillRate: number;
  /** Refill interval in milliseconds */
  refillInterval: number;
  /** Whether to persist state to localStorage */
  persist?: boolean;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  retryAfter: number | null; // milliseconds until next token available
  message?: string;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // API calls - 60 requests per minute
  api: {
    maxTokens: 60,
    refillRate: 1,
    refillInterval: 1000, // 1 token per second
    persist: false,
  },

  // Authentication attempts - 5 per minute
  auth: {
    maxTokens: 5,
    refillRate: 1,
    refillInterval: 12000, // 1 token per 12 seconds
    persist: true,
  },

  // Form submissions - 10 per minute
  form: {
    maxTokens: 10,
    refillRate: 1,
    refillInterval: 6000, // 1 token per 6 seconds
    persist: false,
  },

  // File uploads - 20 per minute
  upload: {
    maxTokens: 20,
    refillRate: 1,
    refillInterval: 3000, // 1 token per 3 seconds
    persist: false,
  },

  // Search queries - 30 per minute
  search: {
    maxTokens: 30,
    refillRate: 1,
    refillInterval: 2000, // 1 token per 2 seconds
    persist: false,
  },

  // Export/download operations - 5 per minute
  export: {
    maxTokens: 5,
    refillRate: 1,
    refillInterval: 12000, // 1 token per 12 seconds
    persist: false,
  },

  // Webhook triggers - 100 per minute
  webhook: {
    maxTokens: 100,
    refillRate: 2,
    refillInterval: 1000, // 2 tokens per second
    persist: false,
  },
};

// ============================================================================
// RATE LIMITER CLASS
// ============================================================================

class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();
  private storagePrefix = 'rl_';

  constructor() {
    // Initialize with default configs
    Object.entries(RATE_LIMIT_CONFIGS).forEach(([key, config]) => {
      this.configs.set(key, config);
    });
  }

  /**
   * Register a custom rate limit configuration
   */
  registerConfig(name: string, config: RateLimitConfig): void {
    this.configs.set(name, config);
  }

  /**
   * Get or create a token bucket for the given key
   */
  private getBucket(key: string, config: RateLimitConfig): TokenBucket {
    const storageKey = `${this.storagePrefix}${key}`;

    // Try to load from localStorage if persistence is enabled
    if (config.persist) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const bucket = JSON.parse(stored) as TokenBucket;
          // Validate stored data
          if (typeof bucket.tokens === 'number' && typeof bucket.lastRefill === 'number') {
            this.buckets.set(key, bucket);
          }
        }
      } catch {
        // Ignore storage errors
      }
    }

    // Return existing bucket or create new one
    if (!this.buckets.has(key)) {
      this.buckets.set(key, {
        tokens: config.maxTokens,
        lastRefill: Date.now(),
      });
    }

    return this.buckets.get(key)!;
  }

  /**
   * Save bucket to localStorage if persistence is enabled
   */
  private saveBucket(key: string, bucket: TokenBucket, config: RateLimitConfig): void {
    if (config.persist) {
      try {
        localStorage.setItem(`${this.storagePrefix}${key}`, JSON.stringify(bucket));
      } catch {
        // Ignore storage errors
      }
    }
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(bucket: TokenBucket, config: RateLimitConfig): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const intervalsElapsed = Math.floor(elapsed / config.refillInterval);

    if (intervalsElapsed > 0) {
      bucket.tokens = Math.min(
        config.maxTokens,
        bucket.tokens + intervalsElapsed * config.refillRate
      );
      bucket.lastRefill = now - (elapsed % config.refillInterval);
    }
  }

  /**
   * Check if an action is allowed and consume a token if so
   */
  checkLimit(actionType: string, identifier?: string): RateLimitResult {
    const config = this.configs.get(actionType);
    if (!config) {
      // Unknown action type - allow by default
      return {
        allowed: true,
        remainingTokens: Infinity,
        retryAfter: null,
      };
    }

    const key = identifier ? `${actionType}:${identifier}` : actionType;
    const bucket = this.getBucket(key, config);

    // Refill tokens based on elapsed time
    this.refillTokens(bucket, config);

    if (bucket.tokens >= 1) {
      // Consume a token
      bucket.tokens -= 1;
      this.saveBucket(key, bucket, config);

      return {
        allowed: true,
        remainingTokens: bucket.tokens,
        retryAfter: null,
      };
    }

    // Calculate time until next token
    const timeSinceLastRefill = Date.now() - bucket.lastRefill;
    const timeUntilNextToken = config.refillInterval - timeSinceLastRefill;

    return {
      allowed: false,
      remainingTokens: 0,
      retryAfter: Math.max(0, timeUntilNextToken),
      message: `Rate limit exceeded. Try again in ${Math.ceil(timeUntilNextToken / 1000)} seconds.`,
    };
  }

  /**
   * Check limit without consuming a token (peek)
   */
  peekLimit(actionType: string, identifier?: string): RateLimitResult {
    const config = this.configs.get(actionType);
    if (!config) {
      return {
        allowed: true,
        remainingTokens: Infinity,
        retryAfter: null,
      };
    }

    const key = identifier ? `${actionType}:${identifier}` : actionType;
    const bucket = this.getBucket(key, config);

    // Refill tokens (but don't consume)
    this.refillTokens(bucket, config);

    if (bucket.tokens >= 1) {
      return {
        allowed: true,
        remainingTokens: bucket.tokens,
        retryAfter: null,
      };
    }

    const timeSinceLastRefill = Date.now() - bucket.lastRefill;
    const timeUntilNextToken = config.refillInterval - timeSinceLastRefill;

    return {
      allowed: false,
      remainingTokens: 0,
      retryAfter: Math.max(0, timeUntilNextToken),
    };
  }

  /**
   * Reset rate limit for a specific action/identifier
   */
  reset(actionType: string, identifier?: string): void {
    const key = identifier ? `${actionType}:${identifier}` : actionType;
    const config = this.configs.get(actionType);

    if (config) {
      const bucket: TokenBucket = {
        tokens: config.maxTokens,
        lastRefill: Date.now(),
      };
      this.buckets.set(key, bucket);
      this.saveBucket(key, bucket, config);
    } else {
      this.buckets.delete(key);
    }
  }

  /**
   * Clear all rate limit data
   */
  clearAll(): void {
    this.buckets.clear();

    // Clear persisted data
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(this.storagePrefix));
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore storage errors
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const rateLimiter = new RateLimiter();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Decorator/wrapper for rate-limited async functions
 */
export function withRateLimit<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  actionType: string,
  identifier?: string | ((...args: Parameters<T>) => string)
): T {
  return (async (...args: Parameters<T>) => {
    const id = typeof identifier === 'function' ? identifier(...args) : identifier;
    const result = rateLimiter.checkLimit(actionType, id);

    if (!result.allowed) {
      throw new RateLimitError(result.message || 'Rate limit exceeded', result.retryAfter || 0);
    }

    return fn(...args);
  }) as T;
}

/**
 * Custom error class for rate limit violations
 */
export class RateLimitError extends Error {
  public retryAfter: number;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * React hook for rate limiting
 */
export function useRateLimit(actionType: string, identifier?: string) {
  const checkLimit = () => rateLimiter.checkLimit(actionType, identifier);
  const peekLimit = () => rateLimiter.peekLimit(actionType, identifier);
  const reset = () => rateLimiter.reset(actionType, identifier);

  return { checkLimit, peekLimit, reset };
}

export default rateLimiter;
