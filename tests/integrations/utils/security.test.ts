/**
 * Tests for netlify/functions/utils/security.cjs
 *
 * Pure-function utility suite — CORS, input sanitization, rate limit,
 * timestamp validation. No network, no mocks.
 */
import { describe, expect, it } from 'vitest';

type SecurityModule = {
  getCorsHeaders: (origin: string | undefined) => Record<string, string>;
  handleCorsPreflght: (event: {
    headers: Record<string, string>;
  }) => { statusCode: number; headers: Record<string, string>; body: string };
  isOriginAllowed: (origin: string | undefined) => boolean;
  sanitizeString: (str: unknown, maxLength?: number) => string;
  sanitizeObject: (obj: unknown) => unknown;
  isTimestampValid: (timestamp: string | number, maxAgeMs?: number) => boolean;
  parseJsonBody: (
    body: string | null | undefined
  ) => { valid: true; data: unknown } | { valid: false; error: string };
  checkRateLimit: (id: string) => {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  };
  ALLOWED_ORIGINS: string[];
};

async function loadModule(): Promise<SecurityModule> {
  const mod = await import('../../../netlify/functions/utils/security.cjs');
  return (mod as { default?: SecurityModule }).default ?? (mod as unknown as SecurityModule);
}

describe('utils/security: CORS', () => {
  it('getCorsHeaders echoes the allowed origin back', async () => {
    const { getCorsHeaders } = await loadModule();
    const h = getCorsHeaders('http://localhost:5173');
    expect(h['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    expect(h['Access-Control-Allow-Methods']).toMatch(/POST/);
    expect(h['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('getCorsHeaders falls back to the first allowed origin for an untrusted origin', async () => {
    const { getCorsHeaders, ALLOWED_ORIGINS } = await loadModule();
    const h = getCorsHeaders('https://evil.example.com');
    // Implementation picks ALLOWED_ORIGINS[0] (not null) when origin is not allowed.
    expect(h['Access-Control-Allow-Origin']).toBe(ALLOWED_ORIGINS[0]);
    expect(h['Access-Control-Allow-Origin']).not.toBe('https://evil.example.com');
  });

  it('handleCorsPreflght returns 204 with CORS headers', async () => {
    const { handleCorsPreflght } = await loadModule();
    const res = handleCorsPreflght({ headers: { origin: 'http://localhost:5173' } });
    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    expect(res.body).toBe('');
  });

  it('isOriginAllowed matches localhost and Netlify preview pattern', async () => {
    const { isOriginAllowed } = await loadModule();
    expect(isOriginAllowed('http://localhost:5173')).toBe(true);
    expect(isOriginAllowed('http://localhost:3000')).toBe(true);
    expect(
      isOriginAllowed('https://deploy-preview-42--extraordinary-truffle-4c58a0.netlify.app')
    ).toBe(true);
    expect(isOriginAllowed('https://evil.example.com')).toBe(false);
    expect(isOriginAllowed(undefined)).toBe(false);
  });
});

describe('utils/security: input sanitization', () => {
  it('sanitizeString strips control chars, script tags, and truncates', async () => {
    const { sanitizeString } = await loadModule();
    expect(sanitizeString('hello\x00world')).toBe('helloworld');
    expect(sanitizeString('a<script>alert(1)</script>b')).toBe('ab');
    expect(sanitizeString('javascript:alert(1)')).not.toMatch(/javascript:/i);
    expect(sanitizeString('aaaaaa', 3)).toBe('aaa');
    expect(sanitizeString(null as unknown as string)).toBe('');
  });
});

describe('utils/security: parseJsonBody', () => {
  it('returns {valid:false} for malformed JSON', async () => {
    const { parseJsonBody } = await loadModule();
    const r = parseJsonBody('bad json');
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toMatch(/Invalid JSON/i);
  });

  it('returns {valid:true, data} for a JSON object', async () => {
    const { parseJsonBody } = await loadModule();
    const r = parseJsonBody('{"a":1}');
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.data).toMatchObject({ a: 1 });
  });

  it('returns {valid:false} for missing body', async () => {
    const { parseJsonBody } = await loadModule();
    const r = parseJsonBody('');
    expect(r.valid).toBe(false);
  });
});

describe('utils/security: checkRateLimit', () => {
  it('allows first N requests and blocks further ones', async () => {
    const { checkRateLimit } = await loadModule();
    // Unique identifier per test run to avoid cross-test pollution.
    const id = `rl-test-${Date.now()}-${Math.random()}`;
    const RATE_LIMIT_MAX = 30; // mirror the constant in the module
    let lastAllowed = true;
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      const r = checkRateLimit(id);
      lastAllowed = lastAllowed && r.allowed;
    }
    expect(lastAllowed).toBe(true);
    const over = checkRateLimit(id);
    expect(over.allowed).toBe(false);
    expect(over.remaining).toBe(0);
  });
});

describe('utils/security: isTimestampValid', () => {
  it('accepts a current timestamp (ms)', async () => {
    const { isTimestampValid } = await loadModule();
    expect(isTimestampValid(Date.now())).toBe(true);
  });

  it('rejects a timestamp 1 hour old', async () => {
    const { isTimestampValid } = await loadModule();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    expect(isTimestampValid(oneHourAgo)).toBe(false);
  });

  it('rejects non-numeric timestamps', async () => {
    const { isTimestampValid } = await loadModule();
    expect(isTimestampValid('not-a-number')).toBe(false);
  });
});
