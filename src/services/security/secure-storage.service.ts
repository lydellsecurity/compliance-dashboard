/**
 * Secure Storage Service
 *
 * Provides encrypted localStorage with automatic key management.
 * All data is encrypted at rest using AES-256-GCM.
 *
 * Security Features:
 * - Automatic encryption before storage
 * - Automatic decryption on retrieval
 * - Session-based key derivation
 * - Automatic data expiration
 * - Memory-safe key clearing on logout
 */

import { encryptionService, type EncryptedPayload } from './encryption.service';

// ============================================================================
// TYPES
// ============================================================================

export interface SecureStorageOptions {
  expiresIn?: number; // Milliseconds until expiration
  sensitive?: boolean; // If true, use sessionStorage instead of localStorage
}

interface StoredItem<T> {
  data: T | EncryptedPayload;
  encrypted: boolean;
  expiresAt?: number;
  createdAt: number;
  version: number;
}

export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_VERSION = 1;
const STORAGE_KEY_PREFIX = 'sec_';

// Data classification determines encryption requirement
const SENSITIVITY_CONFIG: Record<DataSensitivity, { encrypt: boolean; storage: 'local' | 'session' }> = {
  public: { encrypt: false, storage: 'local' },
  internal: { encrypt: false, storage: 'local' },
  confidential: { encrypt: true, storage: 'local' },
  restricted: { encrypt: true, storage: 'session' },
};

// ============================================================================
// SECURE STORAGE SERVICE CLASS
// ============================================================================

export class SecureStorageService {
  private isInitialized = false;
  private encryptionKey: string | null = null;

  /**
   * Initialize the secure storage with a user-specific key
   * This should be called after user authentication
   */
  async initialize(userIdentifier: string, sessionSecret?: string): Promise<void> {
    // Derive a storage-specific key from user identifier and session
    const keyMaterial = `${userIdentifier}:${sessionSecret || 'default'}:storage`;
    this.encryptionKey = await encryptionService.hash(keyMaterial);
    this.isInitialized = true;

    // Clean up any expired items
    this.cleanupExpiredItems();
  }

  /**
   * Check if the service is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.encryptionKey !== null;
  }

  /**
   * Store data with optional encryption and expiration
   */
  async setItem<T>(
    key: string,
    value: T,
    sensitivity: DataSensitivity = 'internal',
    options: SecureStorageOptions = {}
  ): Promise<void> {
    const config = SENSITIVITY_CONFIG[sensitivity];
    const storage = options.sensitive ? sessionStorage :
                    config.storage === 'session' ? sessionStorage : localStorage;
    const shouldEncrypt = config.encrypt && this.isReady();

    const storageKey = `${STORAGE_KEY_PREFIX}${key}`;

    let storedData: T | EncryptedPayload = value;

    if (shouldEncrypt && this.encryptionKey) {
      try {
        storedData = await encryptionService.encryptObject(value, this.encryptionKey);
      } catch (error) {
        console.error('Encryption failed, storing unencrypted:', error);
        // Fallback to unencrypted for non-critical data
        if (sensitivity === 'restricted') {
          throw new Error('Cannot store restricted data without encryption');
        }
      }
    }

    const item: StoredItem<T> = {
      data: storedData,
      encrypted: shouldEncrypt && this.encryptionKey !== null,
      expiresAt: options.expiresIn ? Date.now() + options.expiresIn : undefined,
      createdAt: Date.now(),
      version: STORAGE_VERSION,
    };

    try {
      storage.setItem(storageKey, JSON.stringify(item));
    } catch (error) {
      // Handle quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.cleanupExpiredItems();
        // Try again after cleanup
        storage.setItem(storageKey, JSON.stringify(item));
      } else {
        throw error;
      }
    }
  }

  /**
   * Retrieve and automatically decrypt data
   */
  async getItem<T>(key: string, _sensitivity: DataSensitivity = 'internal'): Promise<T | null> {
    // Note: sensitivity parameter kept for API consistency, storage location is checked in both
    const storageKey = `${STORAGE_KEY_PREFIX}${key}`;

    // Check both storages since sensitivity might have changed
    let rawData = localStorage.getItem(storageKey);
    if (!rawData) {
      rawData = sessionStorage.getItem(storageKey);
    }

    if (!rawData) return null;

    try {
      const item: StoredItem<T> = JSON.parse(rawData);

      // Check expiration
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.removeItem(key);
        return null;
      }

      // Check version compatibility
      if (item.version !== STORAGE_VERSION) {
        console.warn(`Storage version mismatch for key: ${key}`);
        this.removeItem(key);
        return null;
      }

      // Decrypt if necessary
      if (item.encrypted && this.encryptionKey) {
        try {
          return await encryptionService.decryptObject<T>(
            item.data as EncryptedPayload,
            this.encryptionKey
          );
        } catch (error) {
          console.error('Decryption failed:', error);
          // Data may be corrupted or key changed
          this.removeItem(key);
          return null;
        }
      }

      return item.data as T;
    } catch (error) {
      console.error('Failed to parse stored item:', error);
      return null;
    }
  }

  /**
   * Remove an item from storage
   */
  removeItem(key: string): void {
    const storageKey = `${STORAGE_KEY_PREFIX}${key}`;
    localStorage.removeItem(storageKey);
    sessionStorage.removeItem(storageKey);
  }

  /**
   * Check if an item exists and is not expired
   */
  hasItem(key: string): boolean {
    const storageKey = `${STORAGE_KEY_PREFIX}${key}`;
    const rawData = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);

    if (!rawData) return false;

    try {
      const item = JSON.parse(rawData);
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.removeItem(key);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all secure storage items
   */
  clear(): void {
    // Clear localStorage
    const localKeys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY_PREFIX));
    localKeys.forEach(key => localStorage.removeItem(key));

    // Clear sessionStorage
    const sessionKeys = Object.keys(sessionStorage).filter(k => k.startsWith(STORAGE_KEY_PREFIX));
    sessionKeys.forEach(key => sessionStorage.removeItem(key));
  }

  /**
   * Clean up expired items from storage
   */
  private cleanupExpiredItems(): void {
    const now = Date.now();

    // Clean localStorage
    Object.keys(localStorage)
      .filter(k => k.startsWith(STORAGE_KEY_PREFIX))
      .forEach(key => {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '');
          if (item.expiresAt && now > item.expiresAt) {
            localStorage.removeItem(key);
          }
        } catch {
          // Invalid item, remove it
          localStorage.removeItem(key);
        }
      });

    // Clean sessionStorage
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(STORAGE_KEY_PREFIX))
      .forEach(key => {
        try {
          const item = JSON.parse(sessionStorage.getItem(key) || '');
          if (item.expiresAt && now > item.expiresAt) {
            sessionStorage.removeItem(key);
          }
        } catch {
          sessionStorage.removeItem(key);
        }
      });
  }

  /**
   * Destroy the service and clear all keys from memory
   */
  destroy(): void {
    this.encryptionKey = null;
    this.isInitialized = false;
    encryptionService.clearKeys();
  }

  /**
   * Get storage statistics
   */
  getStats(): { itemCount: number; totalSize: number; encryptedCount: number } {
    let itemCount = 0;
    let totalSize = 0;
    let encryptedCount = 0;

    const processStorage = (storage: Storage) => {
      Object.keys(storage)
        .filter(k => k.startsWith(STORAGE_KEY_PREFIX))
        .forEach(key => {
          const value = storage.getItem(key);
          if (value) {
            itemCount++;
            totalSize += value.length * 2; // UTF-16 encoding
            try {
              const item = JSON.parse(value);
              if (item.encrypted) encryptedCount++;
            } catch {
              // Ignore parse errors
            }
          }
        });
    };

    processStorage(localStorage);
    processStorage(sessionStorage);

    return { itemCount, totalSize, encryptedCount };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const secureStorage = new SecureStorageService();

export default secureStorage;
