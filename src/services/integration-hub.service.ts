/**
 * Integration Hub Service
 *
 * Centralized API integration management for third-party services:
 * - Identity Providers (Okta, Azure AD, Google Workspace)
 * - HR Systems (BambooHR, Gusto, Rippling)
 * - Code Repositories (GitHub, GitLab, Bitbucket)
 * - Project Management (Jira, Asana, Monday)
 * - MDM/Endpoint (Jamf, Kandji, Intune)
 *
 * Features:
 * - OAuth 2.0 connection flows
 * - API key management
 * - Webhook handling
 * - Data sync scheduling
 * - Health monitoring
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type IntegrationCategory =
  | 'identity'
  | 'hr'
  | 'code_repository'
  | 'project_management'
  | 'endpoint_mdm'
  | 'cloud'
  | 'security'
  | 'communication';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export type AuthMethod = 'oauth2' | 'api_key' | 'service_account' | 'webhook';

export interface IntegrationProvider {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  icon: string;
  authMethod: AuthMethod;
  scopes?: string[];
  documentationUrl: string;
  features: string[];
  controlsMapped: string[];
  isAvailable: boolean;
  setupInstructions?: string;
  apiKeyUrl?: string; // Direct link to generate API keys
  requiredPermissions?: string[]; // Human-readable permissions needed
}

export interface IntegrationConnection {
  id: string;
  organizationId: string;
  providerId: string;
  providerName: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  authMethod: AuthMethod;
  credentials: Record<string, unknown>;
  settings: IntegrationSettings;
  metadata: IntegrationMetadata;
  createdAt: string;
  updatedAt: string;
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'error' | null;
  lastSyncError: string | null;
}

export interface IntegrationSettings {
  syncEnabled: boolean;
  syncIntervalMinutes: number;
  autoEvidenceCollection: boolean;
  notifyOnError: boolean;
  webhookEnabled: boolean;
  webhookUrl?: string;
  customFields?: Record<string, unknown>;
}

export interface IntegrationMetadata {
  connectedAt: string;
  connectedBy: string;
  accountId?: string;
  accountName?: string;
  apiVersion?: string;
  rateLimitRemaining?: number;
  rateLimitReset?: string;
}

export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  errors: string[];
  duration: number;
  nextSyncAt: string;
}

export interface IntegrationDataItem {
  id: string;
  integrationId: string;
  dataType: string;
  externalId: string;
  data: Record<string, unknown>;
  syncedAt: string;
  controlMappings: string[];
}

export interface WebhookEvent {
  id: string;
  integrationId: string;
  eventType: string;
  payload: Record<string, unknown>;
  processedAt: string | null;
  status: 'pending' | 'processed' | 'failed';
  error?: string;
}

// ============================================================================
// INTEGRATION PROVIDERS REGISTRY
// ============================================================================

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  // Identity Providers
  {
    id: 'okta',
    name: 'Okta',
    category: 'identity',
    description: 'Enterprise identity and access management',
    icon: 'okta',
    authMethod: 'oauth2',
    scopes: ['okta.users.read', 'okta.groups.read', 'okta.apps.read', 'okta.logs.read'],
    documentationUrl: 'https://developer.okta.com/docs/',
    features: ['SSO Verification', 'MFA Status', 'User Directory Sync', 'Access Reviews'],
    controlsMapped: ['AC-001', 'AC-002', 'AC-003', 'AC-004'],
    isAvailable: true,
    setupInstructions: 'Sign in as an Okta admin. You will be asked to authorize read-only access to users, groups, apps, and audit logs.',
    requiredPermissions: ['Read users and groups', 'Read applications', 'Read system logs'],
  },
  {
    id: 'azure_ad',
    name: 'Azure Active Directory',
    category: 'identity',
    description: 'Microsoft cloud identity platform',
    icon: 'microsoft',
    authMethod: 'oauth2',
    scopes: ['User.Read.All', 'Group.Read.All', 'AuditLog.Read.All', 'Directory.Read.All'],
    documentationUrl: 'https://docs.microsoft.com/en-us/azure/active-directory/',
    features: ['SSO Verification', 'MFA Status', 'Conditional Access', 'User Sync'],
    controlsMapped: ['AC-001', 'AC-002', 'AC-003', 'AC-004', 'AC-005'],
    isAvailable: true,
    setupInstructions: 'Sign in with a Microsoft work account that has Global Reader or equivalent admin role.',
    requiredPermissions: ['Read all users', 'Read all groups', 'Read audit logs', 'Read directory data'],
  },
  {
    id: 'google_workspace',
    name: 'Google Workspace',
    category: 'identity',
    description: 'Google cloud identity and productivity',
    icon: 'google',
    authMethod: 'oauth2',
    scopes: ['admin.directory.user.readonly', 'admin.directory.group.readonly'],
    documentationUrl: 'https://developers.google.com/admin-sdk',
    features: ['User Directory Sync', 'MFA Status', 'Security Audit'],
    controlsMapped: ['AC-001', 'AC-002', 'AC-003'],
    isAvailable: true,
    setupInstructions: 'Sign in with a Google Workspace Super Admin account to grant read access to your organization directory.',
    requiredPermissions: ['Read users', 'Read groups'],
  },

  // HR Systems
  {
    id: 'bamboohr',
    name: 'BambooHR',
    category: 'hr',
    description: 'HR management and employee data',
    icon: 'bamboohr',
    authMethod: 'api_key',
    documentationUrl: 'https://documentation.bamboohr.com/docs',
    features: ['Employee Directory', 'Onboarding Tracking', 'Offboarding Alerts', 'Background Checks'],
    controlsMapped: ['HR-001', 'HR-002', 'HR-003', 'AC-007'],
    isAvailable: true,
    setupInstructions: 'In BambooHR, go to Account → API Keys to generate a new key. Use your company subdomain (e.g., "acme" from acme.bamboohr.com).',
    apiKeyUrl: 'https://help.bamboohr.com/hc/en-us/articles/115001741187-Create-an-API-key',
    requiredPermissions: ['Employee read access'],
  },
  {
    id: 'gusto',
    name: 'Gusto',
    category: 'hr',
    description: 'Payroll and HR platform',
    icon: 'gusto',
    authMethod: 'oauth2',
    documentationUrl: 'https://docs.gusto.com/',
    features: ['Employee Directory', 'Onboarding Status', 'Payroll Data'],
    controlsMapped: ['HR-001', 'HR-002'],
    isAvailable: true,
    setupInstructions: 'Sign in as a Gusto company admin to authorize read access to employee data.',
    requiredPermissions: ['Read employees', 'Read company info'],
  },
  {
    id: 'rippling',
    name: 'Rippling',
    category: 'hr',
    description: 'Unified workforce platform',
    icon: 'rippling',
    authMethod: 'api_key',
    documentationUrl: 'https://developer.rippling.com/',
    features: ['Employee Sync', 'Device Management', 'App Provisioning'],
    controlsMapped: ['HR-001', 'HR-002', 'AM-002'],
    isAvailable: true,
    setupInstructions: 'In Rippling, go to Settings → API Access to create an API key with employee read permissions.',
    apiKeyUrl: 'https://app.rippling.com/settings/api-access',
    requiredPermissions: ['Read employees', 'Read devices'],
  },

  // Code Repositories
  {
    id: 'github',
    name: 'GitHub',
    category: 'code_repository',
    description: 'Code hosting and collaboration',
    icon: 'github',
    authMethod: 'oauth2',
    scopes: ['repo', 'read:org', 'read:user', 'admin:org_hook'],
    documentationUrl: 'https://docs.github.com/en/rest',
    features: ['Branch Protection', 'Code Reviews', 'Security Alerts', 'SDLC Evidence'],
    controlsMapped: ['SD-001', 'SD-002', 'SD-003', 'CM-001'],
    isAvailable: true,
    setupInstructions: 'Sign in with a GitHub account that has admin access to your organization. We request read-only access to repos and organization data.',
    requiredPermissions: ['Read repositories', 'Read organization members', 'Read security alerts'],
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    category: 'code_repository',
    description: 'DevOps lifecycle platform',
    icon: 'gitlab',
    authMethod: 'oauth2',
    scopes: ['api', 'read_user', 'read_repository'],
    documentationUrl: 'https://docs.gitlab.com/ee/api/',
    features: ['Branch Protection', 'CI/CD Pipeline', 'Security Scanning'],
    controlsMapped: ['SD-001', 'SD-002', 'SD-003', 'CM-001'],
    isAvailable: true,
    setupInstructions: 'Sign in with a GitLab account that has Maintainer or Owner access to your group/project.',
    requiredPermissions: ['Read API', 'Read user info', 'Read repositories'],
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    category: 'code_repository',
    description: 'Atlassian code management',
    icon: 'bitbucket',
    authMethod: 'oauth2',
    scopes: ['repository', 'pullrequest', 'webhook'],
    documentationUrl: 'https://developer.atlassian.com/cloud/bitbucket/',
    features: ['Branch Rules', 'Pull Requests', 'Pipeline Status'],
    controlsMapped: ['SD-001', 'SD-002', 'CM-001'],
    isAvailable: true,
    setupInstructions: 'Sign in with an Atlassian account that has admin access to your Bitbucket workspace.',
    requiredPermissions: ['Read repositories', 'Read pull requests'],
  },

  // Project Management
  {
    id: 'jira',
    name: 'Jira',
    category: 'project_management',
    description: 'Project and issue tracking',
    icon: 'jira',
    authMethod: 'oauth2',
    scopes: ['read:jira-work', 'read:jira-user'],
    documentationUrl: 'https://developer.atlassian.com/cloud/jira/platform/',
    features: ['Issue Tracking', 'Sprint Progress', 'Vulnerability Tracking'],
    controlsMapped: ['PM-001', 'IR-002', 'VM-001'],
    isAvailable: true,
    setupInstructions: 'Sign in with an Atlassian account that has project admin or site admin access to your Jira instance.',
    requiredPermissions: ['Read projects and issues', 'Read users'],
  },
  {
    id: 'asana',
    name: 'Asana',
    category: 'project_management',
    description: 'Work management platform',
    icon: 'asana',
    authMethod: 'oauth2',
    documentationUrl: 'https://developers.asana.com/docs',
    features: ['Task Tracking', 'Project Status', 'Team Workload'],
    controlsMapped: ['PM-001'],
    isAvailable: true,
    setupInstructions: 'Sign in with an Asana account that has access to the workspaces and projects you want to sync.',
    requiredPermissions: ['Read tasks and projects'],
  },

  // Endpoint/MDM
  {
    id: 'jamf',
    name: 'Jamf Pro',
    category: 'endpoint_mdm',
    description: 'Apple device management',
    icon: 'jamf',
    authMethod: 'api_key',
    documentationUrl: 'https://developer.jamf.com/',
    features: ['Device Inventory', 'Encryption Status', 'Software Updates', 'Compliance Policies'],
    controlsMapped: ['AM-001', 'AM-002', 'DP-004', 'EP-001'],
    isAvailable: true,
    setupInstructions: 'In Jamf Pro, go to Settings → System → API Roles and Clients. Create an API client with Read Computer and Read Mobile Device privileges.',
    apiKeyUrl: 'https://developer.jamf.com/jamf-pro/docs/client-credentials',
    requiredPermissions: ['Read computers', 'Read mobile devices', 'Read policies'],
  },
  {
    id: 'kandji',
    name: 'Kandji',
    category: 'endpoint_mdm',
    description: 'Apple MDM platform',
    icon: 'kandji',
    authMethod: 'api_key',
    documentationUrl: 'https://api.kandji.io/',
    features: ['Device Compliance', 'Auto Patching', 'Security Baselines'],
    controlsMapped: ['AM-001', 'AM-002', 'EP-001'],
    isAvailable: true,
    setupInstructions: 'In Kandji, go to Settings → Access → API Token. Create a token with Devices read scope.',
    apiKeyUrl: 'https://support.kandji.io/support/solutions/articles/72000560412',
    requiredPermissions: ['Read devices', 'Read compliance status'],
  },
  {
    id: 'intune',
    name: 'Microsoft Intune',
    category: 'endpoint_mdm',
    description: 'Microsoft endpoint management',
    icon: 'microsoft',
    authMethod: 'oauth2',
    scopes: ['DeviceManagementManagedDevices.Read.All'],
    documentationUrl: 'https://docs.microsoft.com/en-us/mem/intune/',
    features: ['Device Compliance', 'Conditional Access', 'App Protection'],
    controlsMapped: ['AM-001', 'AM-002', 'EP-001', 'EP-002'],
    isAvailable: true,
    setupInstructions: 'Sign in with an Intune admin or Global Reader account to grant read access to managed devices.',
    requiredPermissions: ['Read managed devices'],
  },

  // Security Tools
  {
    id: 'crowdstrike',
    name: 'CrowdStrike',
    category: 'security',
    description: 'Endpoint security platform',
    icon: 'crowdstrike',
    authMethod: 'api_key',
    documentationUrl: 'https://falcon.crowdstrike.com/documentation/',
    features: ['Threat Detection', 'Incident Response', 'Vulnerability Management'],
    controlsMapped: ['SO-001', 'SO-002', 'IR-001', 'VM-001'],
    isAvailable: true,
    setupInstructions: 'In Falcon Console, go to Support and resources → API clients and keys. Create a new API client with Read-only permissions for Hosts, Detections, and Spotlight.',
    apiKeyUrl: 'https://falcon.crowdstrike.com/api-clients-and-keys/',
    requiredPermissions: ['Read hosts', 'Read detections', 'Read vulnerabilities'],
  },
  {
    id: 'snyk',
    name: 'Snyk',
    category: 'security',
    description: 'Developer security platform',
    icon: 'snyk',
    authMethod: 'api_key',
    documentationUrl: 'https://docs.snyk.io/',
    features: ['Code Scanning', 'Dependency Analysis', 'Container Security'],
    controlsMapped: ['SD-003', 'VM-001', 'VM-002'],
    isAvailable: true,
    setupInstructions: 'In Snyk, go to Account Settings → Auth Token to generate or view your API token.',
    apiKeyUrl: 'https://app.snyk.io/account',
    requiredPermissions: ['Read organization projects', 'View vulnerabilities'],
  },

  // Communication
  {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    description: 'Team communication platform',
    icon: 'slack',
    authMethod: 'oauth2',
    scopes: ['users:read', 'channels:read', 'chat:write'],
    documentationUrl: 'https://api.slack.com/docs',
    features: ['Alert Notifications', 'Audit Logs', 'DLP Monitoring'],
    controlsMapped: ['SO-003', 'CM-002'],
    isAvailable: true,
    setupInstructions: 'Sign in as a Slack workspace admin to authorize access to user directory and channel information.',
    requiredPermissions: ['Read users', 'Read channels', 'Send notifications'],
  },
];

// ============================================================================
// INTEGRATION HUB SERVICE
// ============================================================================

class IntegrationHubService {
  private organizationId: string | null = null;
  private userId: string | null = null;

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  setContext(organizationId: string, userId: string): void {
    this.organizationId = organizationId;
    this.userId = userId;
  }

  isAvailable(): boolean {
    return isSupabaseConfigured();
  }

  // ---------------------------------------------------------------------------
  // PROVIDER REGISTRY
  // ---------------------------------------------------------------------------

  /**
   * Get all available integration providers
   */
  getProviders(category?: IntegrationCategory): IntegrationProvider[] {
    if (category) {
      return INTEGRATION_PROVIDERS.filter((p) => p.category === category);
    }
    return INTEGRATION_PROVIDERS;
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): IntegrationProvider | null {
    return INTEGRATION_PROVIDERS.find((p) => p.id === providerId) || null;
  }

  /**
   * Get providers by category
   */
  getProvidersByCategory(): Record<IntegrationCategory, IntegrationProvider[]> {
    const byCategory: Record<IntegrationCategory, IntegrationProvider[]> = {
      identity: [],
      hr: [],
      code_repository: [],
      project_management: [],
      endpoint_mdm: [],
      cloud: [],
      security: [],
      communication: [],
    };

    for (const provider of INTEGRATION_PROVIDERS) {
      byCategory[provider.category].push(provider);
    }

    return byCategory;
  }

  // ---------------------------------------------------------------------------
  // CONNECTION MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Get all connections for the organization
   */
  async getConnections(): Promise<IntegrationConnection[]> {
    if (!supabase || !this.organizationId) return [];

    try {
      const { data, error } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('organization_id', this.organizationId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((conn) => this.mapToConnection(conn));
    } catch {
      return [];
    }
  }

  /**
   * Get connection by ID
   */
  async getConnection(connectionId: string): Promise<IntegrationConnection | null> {
    if (!supabase || !this.organizationId) return null;

    try {
      const { data, error } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('organization_id', this.organizationId)
        .single();

      if (error || !data) return null;

      return this.mapToConnection(data);
    } catch {
      return null;
    }
  }

  /**
   * Get connection by provider ID
   */
  async getConnectionByProvider(providerId: string): Promise<IntegrationConnection | null> {
    if (!supabase || !this.organizationId) return null;

    try {
      const { data, error } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('provider_id', providerId)
        .eq('organization_id', this.organizationId)
        .single();

      if (error || !data) return null;

      return this.mapToConnection(data);
    } catch {
      return null;
    }
  }

  /**
   * Create a new integration connection
   */
  async createConnection(
    providerId: string,
    credentials: Record<string, unknown>,
    settings?: Partial<IntegrationSettings>
  ): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    if (!supabase || !this.organizationId || !this.userId) {
      return { success: false, error: 'Service not initialized' };
    }

    const provider = this.getProvider(providerId);
    if (!provider) {
      return { success: false, error: 'Unknown provider' };
    }

    try {
      const defaultSettings: IntegrationSettings = {
        syncEnabled: true,
        syncIntervalMinutes: 60,
        autoEvidenceCollection: true,
        notifyOnError: true,
        webhookEnabled: false,
        ...settings,
      };

      const metadata: IntegrationMetadata = {
        connectedAt: new Date().toISOString(),
        connectedBy: this.userId,
      };

      // Calculate initial next_sync_at based on sync interval
      const syncIntervalMinutes = defaultSettings.syncIntervalMinutes || 60;
      const nextSyncAt = new Date(Date.now() + syncIntervalMinutes * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('integration_connections')
        .insert({
          organization_id: this.organizationId,
          provider_id: providerId,
          provider_name: provider.name,
          category: provider.category,
          status: 'pending',
          auth_method: provider.authMethod,
          credentials,
          settings: defaultSettings,
          metadata,
          // Set initial sync scheduling
          sync_enabled: defaultSettings.syncEnabled,
          sync_frequency_minutes: syncIntervalMinutes,
          next_sync_at: nextSyncAt,
          health_status: 'unknown',
        })
        .select()
        .single();

      if (error) throw error;

      // Test the connection
      const testResult = await this.testConnection(data.id);
      if (!testResult.success) {
        // Update status to error
        await supabase
          .from('integration_connections')
          .update({ status: 'error' })
          .eq('id', data.id);

        return { success: false, connectionId: data.id, error: testResult.error };
      }

      return { success: true, connectionId: data.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create connection',
      };
    }
  }

  /**
   * Update connection credentials or settings
   */
  async updateConnection(
    connectionId: string,
    updates: {
      credentials?: Record<string, unknown>;
      settings?: Partial<IntegrationSettings>;
    }
  ): Promise<boolean> {
    if (!supabase || !this.organizationId) return false;

    try {
      const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.credentials) {
        dbUpdates.credentials = updates.credentials;
      }

      if (updates.settings) {
        // Merge with existing settings
        const { data: existing } = await supabase
          .from('integration_connections')
          .select('settings')
          .eq('id', connectionId)
          .single();

        dbUpdates.settings = {
          ...(existing?.settings || {}),
          ...updates.settings,
        };
      }

      const { error } = await supabase
        .from('integration_connections')
        .update(dbUpdates)
        .eq('id', connectionId)
        .eq('organization_id', this.organizationId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Delete/disconnect an integration
   */
  async deleteConnection(connectionId: string): Promise<boolean> {
    if (!supabase || !this.organizationId) return false;

    try {
      const { error } = await supabase
        .from('integration_connections')
        .delete()
        .eq('id', connectionId)
        .eq('organization_id', this.organizationId);

      return !error;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // CONNECTION TESTING
  // ---------------------------------------------------------------------------

  /**
   * Test an integration connection
   */
  async testConnection(connectionId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase || !this.organizationId) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      const connection = await this.getConnection(connectionId);
      if (!connection) {
        return { success: false, error: 'Connection not found' };
      }

      // Call the test endpoint via Netlify function
      const response = await fetch('/.netlify/functions/integration-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: connection.providerId,
          credentials: connection.credentials,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Test failed' }));
        return { success: false, error: error.error };
      }

      const result = await response.json();

      // Update connection status
      await supabase
        .from('integration_connections')
        .update({
          status: 'connected',
          metadata: {
            ...connection.metadata,
            accountId: result.accountId,
            accountName: result.accountName,
            apiVersion: result.apiVersion,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // DATA SYNC
  // ---------------------------------------------------------------------------

  /**
   * Trigger a sync for an integration
   */
  async triggerSync(connectionId: string): Promise<SyncResult> {
    if (!supabase || !this.organizationId) {
      return {
        success: false,
        itemsSynced: 0,
        errors: ['Service not initialized'],
        duration: 0,
        nextSyncAt: new Date().toISOString(),
      };
    }

    const startTime = Date.now();
    const errors: string[] = [];
    let itemsSynced = 0;

    try {
      const connection = await this.getConnection(connectionId);
      if (!connection) {
        return {
          success: false,
          itemsSynced: 0,
          errors: ['Connection not found'],
          duration: 0,
          nextSyncAt: new Date().toISOString(),
        };
      }

      // Call sync endpoint via Netlify function
      const response = await fetch('/.netlify/functions/integration-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          providerId: connection.providerId,
          credentials: connection.credentials,
          settings: connection.settings,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Sync failed' }));
        errors.push(error.error || 'Sync failed');
      } else {
        const result = await response.json();
        itemsSynced = result.itemsSynced || 0;

        // Store synced data
        if (result.data && Array.isArray(result.data)) {
          for (const item of result.data) {
            await this.storeIntegrationData(connectionId, item);
          }
        }
      }

      const duration = Date.now() - startTime;
      const nextSyncAt = new Date(
        Date.now() + (connection.settings.syncIntervalMinutes || 60) * 60 * 1000
      ).toISOString();

      // Update connection sync status
      await supabase
        .from('integration_connections')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: errors.length > 0 ? 'error' : 'success',
          last_sync_error: errors.length > 0 ? errors.join('; ') : null,
        })
        .eq('id', connectionId);

      return {
        success: errors.length === 0,
        itemsSynced,
        errors,
        duration,
        nextSyncAt,
      };
    } catch (error) {
      return {
        success: false,
        itemsSynced: 0,
        errors: [error instanceof Error ? error.message : 'Sync failed'],
        duration: Date.now() - startTime,
        nextSyncAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Store integration data
   */
  private async storeIntegrationData(
    connectionId: string,
    item: {
      dataType: string;
      externalId: string;
      data: Record<string, unknown>;
      controlMappings?: string[];
    }
  ): Promise<void> {
    if (!supabase || !this.organizationId) return;

    await supabase.from('integration_data').upsert(
      {
        organization_id: this.organizationId,
        integration_id: connectionId,
        data_type: item.dataType,
        external_id: item.externalId,
        data: item.data,
        control_mappings: item.controlMappings || [],
        synced_at: new Date().toISOString(),
      },
      {
        onConflict: 'organization_id,integration_id,external_id',
      }
    );
  }

  /**
   * Get synced data for an integration
   */
  async getIntegrationData(
    connectionId: string,
    dataType?: string
  ): Promise<IntegrationDataItem[]> {
    if (!supabase || !this.organizationId) return [];

    try {
      let query = supabase
        .from('integration_data')
        .select('*')
        .eq('organization_id', this.organizationId)
        .eq('integration_id', connectionId);

      if (dataType) {
        query = query.eq('data_type', dataType);
      }

      const { data, error } = await query.order('synced_at', { ascending: false });

      if (error || !data) return [];

      return data.map((item) => ({
        id: item.id,
        integrationId: item.integration_id,
        dataType: item.data_type,
        externalId: item.external_id,
        data: item.data,
        syncedAt: item.synced_at,
        controlMappings: item.control_mappings || [],
      }));
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // WEBHOOKS
  // ---------------------------------------------------------------------------

  /**
   * Generate a webhook URL for an integration
   */
  generateWebhookUrl(connectionId: string): string {
    const baseUrl =
      typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    return `${baseUrl}/.netlify/functions/integration-webhook?connectionId=${connectionId}`;
  }

  /**
   * Get pending webhook events
   */
  async getWebhookEvents(connectionId: string): Promise<WebhookEvent[]> {
    if (!supabase || !this.organizationId) return [];

    try {
      const { data, error } = await supabase
        .from('integration_webhooks')
        .select('*')
        .eq('integration_id', connectionId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data) return [];

      return data.map((event) => ({
        id: event.id,
        integrationId: event.integration_id,
        eventType: event.event_type,
        payload: event.payload,
        processedAt: event.processed_at,
        status: event.status,
        error: event.error,
      }));
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // OAUTH FLOWS
  // ---------------------------------------------------------------------------

  /**
   * Get OAuth authorization URL for a provider
   */
  getOAuthAuthorizationUrl(
    providerId: string,
    redirectUri: string,
    state: string
  ): string | null {
    const provider = this.getProvider(providerId);
    if (!provider || provider.authMethod !== 'oauth2') return null;

    const scopes = provider.scopes?.join(' ') || '';
    const clientId = this.getClientId(providerId);

    // Build authorization URL based on provider
    switch (providerId) {
      case 'okta':
        return `https://{your-okta-domain}/oauth2/v1/authorize?client_id=${clientId}&response_type=code&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      case 'azure_ad':
        return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      case 'google_workspace':
        return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=code&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&access_type=offline`;
      case 'github':
        return `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      case 'slack':
        return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      default:
        return null;
    }
  }

  /**
   * Exchange OAuth code for tokens
   */
  async exchangeOAuthCode(
    providerId: string,
    code: string,
    redirectUri: string
  ): Promise<{ success: boolean; credentials?: Record<string, unknown>; error?: string }> {
    try {
      const response = await fetch('/.netlify/functions/oauth-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, code, redirectUri }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'OAuth exchange failed' }));
        return { success: false, error: error.error };
      }

      const credentials = await response.json();
      return { success: true, credentials };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth exchange failed',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // HEALTH MONITORING
  // ---------------------------------------------------------------------------

  /**
   * Get health status for all connections
   */
  async getHealthStatus(): Promise<
    Array<{
      connectionId: string;
      providerName: string;
      status: IntegrationStatus;
      lastSyncAt: string | null;
      lastSyncStatus: 'success' | 'error' | null;
      errorMessage: string | null;
    }>
  > {
    const connections = await this.getConnections();

    return connections.map((conn) => ({
      connectionId: conn.id,
      providerName: conn.providerName,
      status: conn.status,
      lastSyncAt: conn.lastSyncAt,
      lastSyncStatus: conn.lastSyncStatus,
      errorMessage: conn.lastSyncError,
    }));
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private getClientId(providerId: string): string {
    // In production, these would come from environment variables
    const clientIds: Record<string, string> = {
      okta: import.meta.env.VITE_OKTA_CLIENT_ID || '',
      azure_ad: import.meta.env.VITE_AZURE_AD_CLIENT_ID || '',
      google_workspace: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      github: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
      slack: import.meta.env.VITE_SLACK_CLIENT_ID || '',
    };
    return clientIds[providerId] || '';
  }

  private mapToConnection(data: Record<string, unknown>): IntegrationConnection {
    return {
      id: data.id as string,
      organizationId: data.organization_id as string,
      providerId: data.provider_id as string,
      providerName: data.provider_name as string,
      category: data.category as IntegrationCategory,
      status: data.status as IntegrationStatus,
      authMethod: data.auth_method as AuthMethod,
      credentials: (data.credentials as Record<string, unknown>) || {},
      settings: (data.settings as IntegrationSettings) || {
        syncEnabled: true,
        syncIntervalMinutes: 60,
        autoEvidenceCollection: true,
        notifyOnError: true,
        webhookEnabled: false,
      },
      metadata: (data.metadata as IntegrationMetadata) || {
        connectedAt: data.created_at as string,
        connectedBy: '',
      },
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      lastSyncAt: data.last_sync_at as string | null,
      lastSyncStatus: data.last_sync_status as 'success' | 'error' | null,
      lastSyncError: data.last_sync_error as string | null,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const integrationHub = new IntegrationHubService();
export default integrationHub;
