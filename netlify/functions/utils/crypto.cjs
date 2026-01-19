/**
 * Shared Encryption/Decryption Utilities
 * AES-256-GCM encryption for secure token storage
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 * @throws {Error} If TOKEN_ENCRYPTION_KEY is not set
 */
function getEncryptionKey() {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required for token encryption');
  }
  if (key.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a plaintext string
 * @param {string} plaintext - The text to encrypt
 * @returns {{ encrypted: string, iv: string, authTag: string }} Encrypted data with IV and auth tag
 */
function encrypt(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt an encrypted string
 * @param {string} encryptedHex - The encrypted data in hex format
 * @param {string} ivHex - The initialization vector in hex format
 * @param {string} authTagHex - The authentication tag in hex format
 * @returns {string} The decrypted plaintext
 * @throws {Error} If decryption fails (wrong key, tampered data, etc.)
 */
function decrypt(encryptedHex, ivHex, authTagHex) {
  if (!encryptedHex || !ivHex || !authTagHex) {
    throw new Error('Missing required decryption parameters (encrypted, iv, or authTag)');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Safely attempt to decrypt, returning null on failure
 * @param {string} encryptedHex - The encrypted data in hex format
 * @param {string} ivHex - The initialization vector in hex format
 * @param {string} authTagHex - The authentication tag in hex format
 * @returns {string|null} The decrypted plaintext or null if decryption fails
 */
function tryDecrypt(encryptedHex, ivHex, authTagHex) {
  try {
    return decrypt(encryptedHex, ivHex, authTagHex);
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return null;
  }
}

/**
 * Generate a new encryption key (for initial setup)
 * @returns {string} A 64-character hex string suitable for TOKEN_ENCRYPTION_KEY
 */
function generateKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a webhook secret for storage (one-way)
 * @param {string} secret - The webhook secret
 * @returns {string} SHA-256 hash of the secret
 */
function hashSecret(secret) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

/**
 * Verify HMAC signature (for webhook verification)
 * @param {string} payload - The request body
 * @param {string} signature - The signature to verify
 * @param {string} secret - The shared secret
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {boolean} True if signature is valid
 */
function verifyHmacSignature(payload, signature, secret, algorithm = 'sha256') {
  const expectedSignature = crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

module.exports = {
  encrypt,
  decrypt,
  tryDecrypt,
  generateKey,
  hashSecret,
  verifyHmacSignature,
  ALGORITHM,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
};
