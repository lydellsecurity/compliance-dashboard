/**
 * Vitest global setup.
 *
 * These tests exercise integration adapters without talking to real providers.
 * We pin deterministic env vars so crypto/webhook signature tests reproduce.
 */
import { beforeAll } from 'vitest';

beforeAll(() => {
  // Stable test key (32 bytes hex) used by utils/crypto.cjs.
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    process.env.TOKEN_ENCRYPTION_KEY =
      '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
  }
  // Avoid accidental live calls if a test forgets to mock.
  // Treat empty-string env vars as unset — some shells export empty
  // ANTHROPIC_API_KEY which would slip past `??=` and break handlers that
  // reject empty keys up front.
  if (!process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = 'https://example.supabase.co';
  if (!process.env.SUPABASE_SERVICE_KEY) process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  if (!process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  if (!process.env.URL) process.env.URL = 'https://example.netlify.app';
  process.env.NODE_ENV = 'test';
});
