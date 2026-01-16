/**
 * Storage Migration Utility
 *
 * Handles migration of localStorage data from old non-org-specific keys
 * to new org-prefixed keys for multi-tenant support.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

// Old storage keys (pre-multi-tenant)
export const OLD_STORAGE_KEYS = {
  // Compliance data
  RESPONSES: 'attestai-responses',
  EVIDENCE: 'attestai-evidence',
  CUSTOM_CONTROLS: 'attestai-custom-controls',
  ATTESTATIONS: 'attestai-attestations',

  // Incident response data
  IR_INCIDENTS: 'attestai-ir-incidents',
  IR_ESCALATION_PATHS: 'attestai-ir-escalation-paths',
  IR_PLAYBOOKS: 'attestai-ir-playbooks',
  IR_CONTACTS: 'attestai-ir-contacts',
  IR_COMMUNICATION_LOG: 'attestai-ir-communication-log',

  // Vendor data
  VENDORS: 'attestai-vendors',

  // User preferences
  SETTINGS: 'attestai-settings',
  LAST_REPORT: 'attestai-last-report',
} as const;

// New key pattern: attestai_{orgId}_{keyName}
export const getOrgStorageKey = (orgId: string, keyName: string): string => {
  return `attestai_${orgId}_${keyName}`;
};

// New storage key generators
export const getOrgStorageKeys = (orgId: string) => ({
  // Compliance data
  RESPONSES: getOrgStorageKey(orgId, 'responses'),
  EVIDENCE: getOrgStorageKey(orgId, 'evidence'),
  CUSTOM_CONTROLS: getOrgStorageKey(orgId, 'custom-controls'),
  ATTESTATIONS: getOrgStorageKey(orgId, 'attestations'),

  // Incident response data
  IR_INCIDENTS: getOrgStorageKey(orgId, 'ir-incidents'),
  IR_ESCALATION_PATHS: getOrgStorageKey(orgId, 'ir-escalation-paths'),
  IR_PLAYBOOKS: getOrgStorageKey(orgId, 'ir-playbooks'),
  IR_CONTACTS: getOrgStorageKey(orgId, 'ir-contacts'),
  IR_COMMUNICATION_LOG: getOrgStorageKey(orgId, 'ir-communication-log'),

  // Vendor data
  VENDORS: getOrgStorageKey(orgId, 'vendors'),

  // User preferences (per-org)
  SETTINGS: getOrgStorageKey(orgId, 'settings'),
  LAST_REPORT: getOrgStorageKey(orgId, 'last-report'),
  LAST_SYNCED: getOrgStorageKey(orgId, 'last-synced'),
});

// Global keys that don't need org prefix
export const GLOBAL_STORAGE_KEYS = {
  CURRENT_ORG_ID: 'attestai-current-org-id',
  USER_PREFERENCES: 'attestai-user-preferences',
  THEME: 'attestai-theme',
  SIDEBAR_COLLAPSED: 'attestai-sidebar-collapsed',
  MIGRATION_VERSION: 'attestai-migration-version',
} as const;

// Current migration version
const CURRENT_MIGRATION_VERSION = 1;

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

interface MigrationResult {
  success: boolean;
  migratedKeys: string[];
  errors: string[];
}

/**
 * Check if migration is needed for a given organization
 */
export function needsMigration(orgId: string): boolean {
  const versionKey = `${GLOBAL_STORAGE_KEYS.MIGRATION_VERSION}_${orgId}`;
  const version = localStorage.getItem(versionKey);
  return !version || parseInt(version, 10) < CURRENT_MIGRATION_VERSION;
}

/**
 * Check if there's legacy data that hasn't been migrated
 */
export function hasLegacyData(): boolean {
  return Object.values(OLD_STORAGE_KEYS).some(
    (key) => localStorage.getItem(key) !== null
  );
}

/**
 * Migrate legacy localStorage data to org-specific keys
 * This is a one-time operation for existing users
 */
export async function migrateLocalStorage(orgId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migratedKeys: [],
    errors: [],
  };

  if (!orgId) {
    result.success = false;
    result.errors.push('Organization ID is required for migration');
    return result;
  }

  const newKeys = getOrgStorageKeys(orgId);

  try {
    // Map old keys to new keys
    const keyMappings: [string, string][] = [
      [OLD_STORAGE_KEYS.RESPONSES, newKeys.RESPONSES],
      [OLD_STORAGE_KEYS.EVIDENCE, newKeys.EVIDENCE],
      [OLD_STORAGE_KEYS.CUSTOM_CONTROLS, newKeys.CUSTOM_CONTROLS],
      [OLD_STORAGE_KEYS.ATTESTATIONS, newKeys.ATTESTATIONS],
      [OLD_STORAGE_KEYS.IR_INCIDENTS, newKeys.IR_INCIDENTS],
      [OLD_STORAGE_KEYS.IR_ESCALATION_PATHS, newKeys.IR_ESCALATION_PATHS],
      [OLD_STORAGE_KEYS.IR_PLAYBOOKS, newKeys.IR_PLAYBOOKS],
      [OLD_STORAGE_KEYS.IR_CONTACTS, newKeys.IR_CONTACTS],
      [OLD_STORAGE_KEYS.IR_COMMUNICATION_LOG, newKeys.IR_COMMUNICATION_LOG],
      [OLD_STORAGE_KEYS.VENDORS, newKeys.VENDORS],
      [OLD_STORAGE_KEYS.SETTINGS, newKeys.SETTINGS],
      [OLD_STORAGE_KEYS.LAST_REPORT, newKeys.LAST_REPORT],
    ];

    for (const [oldKey, newKey] of keyMappings) {
      try {
        const oldData = localStorage.getItem(oldKey);

        if (oldData !== null) {
          // Check if new key already has data (don't overwrite)
          const existingNewData = localStorage.getItem(newKey);

          if (existingNewData === null) {
            // Migrate the data
            localStorage.setItem(newKey, oldData);
            result.migratedKeys.push(oldKey);
          }
        }
      } catch (error) {
        result.errors.push(`Failed to migrate ${oldKey}: ${error}`);
      }
    }

    // Mark migration as complete for this org
    const versionKey = `${GLOBAL_STORAGE_KEYS.MIGRATION_VERSION}_${orgId}`;
    localStorage.setItem(versionKey, CURRENT_MIGRATION_VERSION.toString());

    // Log migration summary
    console.log(`Storage migration complete for org ${orgId}:`, {
      migratedKeys: result.migratedKeys.length,
      errors: result.errors.length,
    });

  } catch (error) {
    result.success = false;
    result.errors.push(`Migration failed: ${error}`);
  }

  return result;
}

/**
 * Clean up legacy keys after successful migration
 * Only call this after verifying the new data is intact
 */
export function cleanupLegacyKeys(): void {
  Object.values(OLD_STORAGE_KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove legacy key ${key}:`, error);
    }
  });
}

/**
 * Export all org data for backup
 */
export function exportOrgData(orgId: string): Record<string, any> {
  const keys = getOrgStorageKeys(orgId);
  const data: Record<string, any> = {};

  Object.entries(keys).forEach(([name, key]) => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      try {
        data[name] = JSON.parse(value);
      } catch {
        data[name] = value;
      }
    }
  });

  return data;
}

/**
 * Import org data from backup
 */
export function importOrgData(orgId: string, data: Record<string, any>): boolean {
  const keys = getOrgStorageKeys(orgId);

  try {
    Object.entries(data).forEach(([name, value]) => {
      const key = keys[name as keyof typeof keys];
      if (key) {
        localStorage.setItem(
          key,
          typeof value === 'string' ? value : JSON.stringify(value)
        );
      }
    });
    return true;
  } catch (error) {
    console.error('Failed to import org data:', error);
    return false;
  }
}

/**
 * Clear all data for an organization
 */
export function clearOrgData(orgId: string): void {
  const keys = getOrgStorageKeys(orgId);

  Object.values(keys).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove key ${key}:`, error);
    }
  });

  // Also remove the migration version marker
  const versionKey = `${GLOBAL_STORAGE_KEYS.MIGRATION_VERSION}_${orgId}`;
  localStorage.removeItem(versionKey);
}

/**
 * Get current organization ID from storage
 */
export function getCurrentOrgId(): string | null {
  return localStorage.getItem(GLOBAL_STORAGE_KEYS.CURRENT_ORG_ID);
}

/**
 * Set current organization ID in storage
 */
export function setCurrentOrgId(orgId: string): void {
  localStorage.setItem(GLOBAL_STORAGE_KEYS.CURRENT_ORG_ID, orgId);
}

/**
 * Clear current organization ID
 */
export function clearCurrentOrgId(): void {
  localStorage.removeItem(GLOBAL_STORAGE_KEYS.CURRENT_ORG_ID);
}

// ============================================================================
// HOOKS HELPER
// ============================================================================

/**
 * Create a storage wrapper for hooks that handles org-prefixed keys
 */
export function createOrgStorage(orgId: string) {
  const keys = getOrgStorageKeys(orgId);

  return {
    keys,

    get<T>(key: string): T | null {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch {
        return null;
      }
    },

    set<T>(key: string, value: T): void {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Failed to save to ${key}:`, error);
      }
    },

    remove(key: string): void {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Failed to remove ${key}:`, error);
      }
    },
  };
}

export default {
  migrateLocalStorage,
  hasLegacyData,
  needsMigration,
  cleanupLegacyKeys,
  exportOrgData,
  importOrgData,
  clearOrgData,
  getCurrentOrgId,
  setCurrentOrgId,
  clearCurrentOrgId,
  getOrgStorageKeys,
  getOrgStorageKey,
  createOrgStorage,
  OLD_STORAGE_KEYS,
  GLOBAL_STORAGE_KEYS,
};
