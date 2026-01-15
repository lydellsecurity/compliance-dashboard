/**
 * End-to-End Encryption Service
 *
 * Provides client-side encryption for sensitive data using Web Crypto API.
 * Implements AES-GCM for symmetric encryption with secure key derivation.
 *
 * Security Features:
 * - AES-256-GCM authenticated encryption
 * - PBKDF2 key derivation with 100,000 iterations
 * - Cryptographically secure random IV generation
 * - Constant-time comparison for integrity checks
 */

// ============================================================================
// TYPES
// ============================================================================

export interface EncryptedPayload {
  ciphertext: string; // Base64 encoded
  iv: string;         // Base64 encoded
  salt: string;       // Base64 encoded (for key derivation)
  algorithm: 'AES-GCM';
  version: number;
}

export interface EncryptionConfig {
  keyLength: 256;
  ivLength: 12;      // 96 bits for GCM
  saltLength: 16;    // 128 bits
  iterations: number; // PBKDF2 iterations
  hash: 'SHA-256';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: EncryptionConfig = {
  keyLength: 256,
  ivLength: 12,
  saltLength: 16,
  iterations: 100000,
  hash: 'SHA-256',
};

const ENCRYPTION_VERSION = 1;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

/**
 * Generate cryptographically secure random bytes
 */
function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Constant-time comparison to prevent timing attacks
 */
function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// ============================================================================
// ENCRYPTION SERVICE CLASS
// ============================================================================

export class EncryptionService {
  private config: EncryptionConfig;
  private masterKey: CryptoKey | null = null;
  private keyCache: Map<string, CryptoKey> = new Map();

  constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if Web Crypto API is available
   */
  isSupported(): boolean {
    return !!(
      typeof crypto !== 'undefined' &&
      crypto.subtle &&
      typeof crypto.getRandomValues === 'function'
    );
  }

  /**
   * Derive an encryption key from a password/passphrase using PBKDF2
   */
  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    // Create a proper ArrayBuffer from the Uint8Array
    const saltBuffer = new ArrayBuffer(salt.length);
    new Uint8Array(saltBuffer).set(salt);

    const cacheKey = `${password}:${arrayBufferToBase64(saltBuffer)}`;

    // Check cache first
    const cached = this.keyCache.get(cacheKey);
    if (cached) return cached;

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive the actual encryption key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: this.config.iterations,
        hash: this.config.hash,
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: this.config.keyLength,
      },
      false, // Not extractable for security
      ['encrypt', 'decrypt']
    );

    // Cache for performance (limit cache size)
    if (this.keyCache.size > 10) {
      const firstKey = this.keyCache.keys().next().value;
      if (firstKey) this.keyCache.delete(firstKey);
    }
    this.keyCache.set(cacheKey, key);

    return key;
  }

  /**
   * Initialize with a master password for session-based encryption
   */
  async initializeWithPassword(password: string): Promise<void> {
    const salt = generateRandomBytes(this.config.saltLength);
    this.masterKey = await this.deriveKey(password, salt);
  }

  /**
   * Encrypt plaintext data
   */
  async encrypt(plaintext: string, password?: string): Promise<EncryptedPayload> {
    if (!this.isSupported()) {
      throw new Error('Web Crypto API not supported');
    }

    // Generate random salt and IV
    const salt = generateRandomBytes(this.config.saltLength);
    const iv = generateRandomBytes(this.config.ivLength);

    // Get or derive key
    let key: CryptoKey;
    if (password) {
      key = await this.deriveKey(password, salt);
    } else if (this.masterKey) {
      key = this.masterKey;
    } else {
      throw new Error('No password provided and no master key initialized');
    }

    // Create proper ArrayBuffers for IV and salt
    const ivBuffer = new ArrayBuffer(iv.length);
    new Uint8Array(ivBuffer).set(iv);
    const saltBuffer = new ArrayBuffer(salt.length);
    new Uint8Array(saltBuffer).set(salt);

    // Encrypt the data
    const encodedData = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      key,
      encodedData
    );

    return {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(ivBuffer),
      salt: arrayBufferToBase64(saltBuffer),
      algorithm: 'AES-GCM',
      version: ENCRYPTION_VERSION,
    };
  }

  /**
   * Decrypt encrypted data
   */
  async decrypt(payload: EncryptedPayload, password?: string): Promise<string> {
    if (!this.isSupported()) {
      throw new Error('Web Crypto API not supported');
    }

    if (payload.version !== ENCRYPTION_VERSION) {
      throw new Error(`Unsupported encryption version: ${payload.version}`);
    }

    // Decode components
    const ciphertext = base64ToArrayBuffer(payload.ciphertext);
    const iv = new Uint8Array(base64ToArrayBuffer(payload.iv));
    const salt = new Uint8Array(base64ToArrayBuffer(payload.salt));

    // Get or derive key
    let key: CryptoKey;
    if (password) {
      key = await this.deriveKey(password, salt);
    } else if (this.masterKey) {
      key = this.masterKey;
    } else {
      throw new Error('No password provided and no master key initialized');
    }

    // Decrypt the data
    try {
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        key,
        ciphertext
      );

      return new TextDecoder().decode(decryptedData);
    } catch {
      throw new Error('Decryption failed: Invalid password or corrupted data');
    }
  }

  /**
   * Encrypt an object (serializes to JSON first)
   */
  async encryptObject<T>(data: T, password?: string): Promise<EncryptedPayload> {
    const jsonString = JSON.stringify(data);
    return this.encrypt(jsonString, password);
  }

  /**
   * Decrypt to an object (deserializes from JSON)
   */
  async decryptObject<T>(payload: EncryptedPayload, password?: string): Promise<T> {
    const jsonString = await this.decrypt(payload, password);
    return JSON.parse(jsonString) as T;
  }

  /**
   * Generate a cryptographically secure random password
   */
  generateSecurePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const randomBytes = generateRandomBytes(length);
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }
    return password;
  }

  /**
   * Hash data using SHA-256 (for integrity checks, not encryption)
   */
  async hash(data: string): Promise<string> {
    const encoded = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return arrayBufferToBase64(hashBuffer);
  }

  /**
   * Verify data integrity using hash comparison
   */
  async verifyIntegrity(data: string, expectedHash: string): Promise<boolean> {
    const actualHash = await this.hash(data);
    const a = new TextEncoder().encode(actualHash);
    const b = new TextEncoder().encode(expectedHash);
    return constantTimeCompare(a, b);
  }

  /**
   * Clear all cached keys and master key from memory
   */
  clearKeys(): void {
    this.masterKey = null;
    this.keyCache.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const encryptionService = new EncryptionService();

export default encryptionService;
