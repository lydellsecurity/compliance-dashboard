/**
 * Tests for netlify/functions/utils/crypto.cjs
 *
 * No network. No Supabase. Pure AES-256-GCM round-trip + HMAC helpers.
 * TOKEN_ENCRYPTION_KEY is pinned by tests/setup.ts.
 */
import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';

type CryptoModule = {
  encrypt: (plaintext: string) => { encrypted: string; iv: string; authTag: string };
  decrypt: (encryptedHex: string, ivHex: string, authTagHex: string) => string;
  tryDecrypt: (encryptedHex: string, ivHex: string, authTagHex: string) => string | null;
  generateKey: () => string;
  hashSecret: (secret: string) => string;
  verifyHmacSignature: (
    payload: string,
    signature: string,
    secret: string,
    algorithm?: string
  ) => boolean;
};

async function loadModule(): Promise<CryptoModule> {
  const mod = await import('../../../netlify/functions/utils/crypto.cjs');
  return (mod as { default?: CryptoModule }).default ?? (mod as unknown as CryptoModule);
}

describe('utils/crypto: encrypt / decrypt round-trip', () => {
  it('recovers the plaintext after encrypt + decrypt', async () => {
    const { encrypt, decrypt } = await loadModule();
    const plaintext = 'ghp_SuperSecretAccessToken_12345!@#';
    const { encrypted, iv, authTag } = encrypt(plaintext);
    expect(encrypted).toMatch(/^[0-9a-f]+$/);
    expect(iv).toMatch(/^[0-9a-f]{32}$/); // 16 bytes hex
    expect(authTag).toMatch(/^[0-9a-f]{32}$/); // 16 bytes hex
    expect(decrypt(encrypted, iv, authTag)).toBe(plaintext);
  });

  it('produces a different ciphertext/iv each call (IV randomness)', async () => {
    const { encrypt } = await loadModule();
    const a = encrypt('same-plaintext');
    const b = encrypt('same-plaintext');
    expect(a.iv).not.toBe(b.iv);
    expect(a.encrypted).not.toBe(b.encrypted);
  });

  it('decrypt throws when authTag is tampered', async () => {
    const { encrypt, decrypt } = await loadModule();
    const { encrypted, iv, authTag } = encrypt('tamper-me');
    // Flip a byte in the auth tag
    const flipped =
      (parseInt(authTag[0], 16) ^ 0xf).toString(16) + authTag.slice(1);
    expect(() => decrypt(encrypted, iv, flipped)).toThrow();
  });

  it('tryDecrypt returns null (does not throw) on wrong auth tag', async () => {
    const { encrypt, tryDecrypt } = await loadModule();
    const { encrypted, iv, authTag } = encrypt('tamper-me');
    const flipped =
      (parseInt(authTag[0], 16) ^ 0xf).toString(16) + authTag.slice(1);
    expect(tryDecrypt(encrypted, iv, flipped)).toBeNull();
  });
});

describe('utils/crypto: generateKey', () => {
  it('returns 64 hex characters (32 bytes)', async () => {
    const { generateKey } = await loadModule();
    const key = generateKey();
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns a different key each call', async () => {
    const { generateKey } = await loadModule();
    expect(generateKey()).not.toBe(generateKey());
  });
});

describe('utils/crypto: hashSecret', () => {
  it('is deterministic for the same input', async () => {
    const { hashSecret } = await loadModule();
    const a = hashSecret('my-webhook-secret');
    const b = hashSecret('my-webhook-secret');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
  });

  it('yields different hashes for different inputs', async () => {
    const { hashSecret } = await loadModule();
    expect(hashSecret('a')).not.toBe(hashSecret('b'));
  });
});

describe('utils/crypto: verifyHmacSignature', () => {
  it('accepts a signature it would generate for payload+secret', async () => {
    const { verifyHmacSignature } = await loadModule();
    const secret = 'shared-webhook-secret';
    const payload = '{"hello":"world"}';
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    expect(verifyHmacSignature(payload, sig, secret)).toBe(true);
  });

  it('rejects a signature when payload is altered', async () => {
    const { verifyHmacSignature } = await loadModule();
    const secret = 'shared-webhook-secret';
    const payload = '{"hello":"world"}';
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    expect(verifyHmacSignature('{"hello":"tampered"}', sig, secret)).toBe(false);
  });

  it('rejects signatures of the wrong length without throwing', async () => {
    const { verifyHmacSignature } = await loadModule();
    // timingSafeEqual throws on length mismatch; the wrapper must catch it.
    expect(verifyHmacSignature('payload', 'deadbeef', 'secret')).toBe(false);
  });
});
