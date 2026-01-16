/**
 * Multi-Tenant Architecture Service
 *
 * Provides comprehensive multi-tenancy support:
 * - Tenant isolation and data partitioning
 * - Tenant-specific configurations
 * - Cross-tenant admin capabilities
 * - Tenant billing and subscription management
 * - Tenant analytics and usage tracking
 * - White-label / custom domain support
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserRole } from '../lib/database.types';

// ============================================================================
// TYPES
// ============================================================================

export type TenantPlan = 'free' | 'startup' | 'business' | 'enterprise';
export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled';
export type FeatureFlag = string;

export interface TenantLimits {
  maxUsers: number;
  maxControls: number;
  maxEvidence: number;
  maxIntegrations: number;
  maxStorageGb: number;
  retentionDays: number;
  auditLogDays: number;
  apiRateLimit: number;
}

export interface TenantFeatures {
  cloudIntegrations: boolean;
  customControls: boolean;
  apiAccess: boolean;
  ssoEnabled: boolean;
  customBranding: boolean;
  advancedReporting: boolean;
  trustCenter: boolean;
  incidentResponse: boolean;
  vendorRisk: boolean;
  questionnaireAutomation: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  limits: TenantLimits;
  features: TenantFeatures;
  settings: TenantSettings;
  branding: TenantBranding;
  billing: TenantBilling;
  usage: TenantUsage;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  timezone: string;
  dateFormat: string;
  defaultFramework: string;
  notificationPreferences: {
    emailDigest: 'daily' | 'weekly' | 'none';
    slackAlerts: boolean;
    complianceDeadlines: boolean;
  };
  securitySettings: {
    mfaRequired: boolean;
    sessionTimeoutMinutes: number;
    ipWhitelist: string[];
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
      expirationDays: number;
    };
  };
  complianceSettings: {
    autoAssignOwners: boolean;
    requireEvidenceApproval: boolean;
    evidenceExpirationDays: number;
    assessmentSchedule: 'monthly' | 'quarterly' | 'annually';
  };
}

export interface TenantBranding {
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  customDomain: string | null;
  emailFromName: string;
  emailFooter: string;
  trustCenterTitle: string;
  trustCenterDescription: string;
}

export interface TenantBilling {
  customerId: string | null;
  subscriptionId: string | null;
  currentPeriodEnd: string | null;
  seats: number;
  seatsUsed: number;
  mrr: number;
  billingEmail: string | null;
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
}

export interface TenantUsage {
  usersCount: number;
  controlsCount: number;
  evidenceCount: number;
  integrationsCount: number;
  storageUsedMb: number;
  apiCallsThisMonth: number;
  lastActivityAt: string | null;
}

export interface TenantMember {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  department?: string;
  isDefault: boolean;
  lastActiveAt: string | null;
  joinedAt: string;
}

export interface TenantAuditLog {
  id: string;
  tenantId: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface TenantAnalytics {
  complianceScore: number;
  controlsCompleted: number;
  controlsTotal: number;
  evidenceCollected: number;
  evidenceApproved: number;
  openIncidents: number;
  overdueControls: number;
  frameworkProgress: Record<string, number>;
  trendData: {
    date: string;
    complianceScore: number;
    controlsCompleted: number;
  }[];
}

// ============================================================================
// PLAN CONFIGURATIONS
// ============================================================================

export const PLAN_CONFIGS: Record<TenantPlan, { limits: TenantLimits; features: TenantFeatures; price: number }> = {
  free: {
    limits: {
      maxUsers: 3,
      maxControls: 50,
      maxEvidence: 100,
      maxIntegrations: 1,
      maxStorageGb: 1,
      retentionDays: 30,
      auditLogDays: 7,
      apiRateLimit: 100,
    },
    features: {
      cloudIntegrations: false,
      customControls: false,
      apiAccess: false,
      ssoEnabled: false,
      customBranding: false,
      advancedReporting: false,
      trustCenter: true,
      incidentResponse: false,
      vendorRisk: false,
      questionnaireAutomation: false,
    },
    price: 0,
  },
  startup: {
    limits: {
      maxUsers: 10,
      maxControls: 150,
      maxEvidence: 500,
      maxIntegrations: 5,
      maxStorageGb: 10,
      retentionDays: 90,
      auditLogDays: 30,
      apiRateLimit: 1000,
    },
    features: {
      cloudIntegrations: true,
      customControls: true,
      apiAccess: false,
      ssoEnabled: false,
      customBranding: false,
      advancedReporting: true,
      trustCenter: true,
      incidentResponse: true,
      vendorRisk: false,
      questionnaireAutomation: false,
    },
    price: 299,
  },
  business: {
    limits: {
      maxUsers: 50,
      maxControls: 500,
      maxEvidence: 2000,
      maxIntegrations: 20,
      maxStorageGb: 50,
      retentionDays: 365,
      auditLogDays: 90,
      apiRateLimit: 10000,
    },
    features: {
      cloudIntegrations: true,
      customControls: true,
      apiAccess: true,
      ssoEnabled: true,
      customBranding: true,
      advancedReporting: true,
      trustCenter: true,
      incidentResponse: true,
      vendorRisk: true,
      questionnaireAutomation: false,
    },
    price: 799,
  },
  enterprise: {
    limits: {
      maxUsers: -1, // Unlimited
      maxControls: -1,
      maxEvidence: -1,
      maxIntegrations: -1,
      maxStorageGb: -1,
      retentionDays: -1,
      auditLogDays: -1,
      apiRateLimit: -1,
    },
    features: {
      cloudIntegrations: true,
      customControls: true,
      apiAccess: true,
      ssoEnabled: true,
      customBranding: true,
      advancedReporting: true,
      trustCenter: true,
      incidentResponse: true,
      vendorRisk: true,
      questionnaireAutomation: true,
    },
    price: -1, // Custom pricing
  },
};

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  timezone: 'America/New_York',
  dateFormat: 'MM/dd/yyyy',
  defaultFramework: 'SOC2',
  notificationPreferences: {
    emailDigest: 'weekly',
    slackAlerts: false,
    complianceDeadlines: true,
  },
  securitySettings: {
    mfaRequired: false,
    sessionTimeoutMinutes: 480,
    ipWhitelist: [],
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: false,
      expirationDays: 90,
    },
  },
  complianceSettings: {
    autoAssignOwners: true,
    requireEvidenceApproval: true,
    evidenceExpirationDays: 365,
    assessmentSchedule: 'quarterly',
  },
};

const DEFAULT_BRANDING: TenantBranding = {
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  customDomain: null,
  emailFromName: 'AttestAI Compliance',
  emailFooter: '',
  trustCenterTitle: 'Trust Center',
  trustCenterDescription: 'Our commitment to security and compliance',
};

// ============================================================================
// MULTI-TENANT SERVICE
// ============================================================================

class MultiTenantService {
  private currentTenantId: string | null = null;
  private currentUserId: string | null = null;
  private tenantCache: Map<string, Tenant> = new Map();

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  setContext(tenantId: string, userId: string): void {
    this.currentTenantId = tenantId;
    this.currentUserId = userId;
  }

  isAvailable(): boolean {
    return isSupabaseConfigured();
  }

  getCurrentTenantId(): string | null {
    return this.currentTenantId;
  }

  // ---------------------------------------------------------------------------
  // TENANT CRUD
  // ---------------------------------------------------------------------------

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId: string): Promise<Tenant | null> {
    // Check cache first
    if (this.tenantCache.has(tenantId)) {
      return this.tenantCache.get(tenantId)!;
    }

    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error || !data) return null;

      const tenant = this.mapToTenant(data);
      this.tenantCache.set(tenantId, tenant);
      return tenant;
    } catch {
      return null;
    }
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) return null;

      return this.mapToTenant(data);
    } catch {
      return null;
    }
  }

  /**
   * Get tenant by custom domain
   */
  async getTenantByDomain(domain: string): Promise<Tenant | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('custom_domain', domain)
        .single();

      if (error || !data) return null;

      return this.mapToTenant(data);
    } catch {
      return null;
    }
  }

  /**
   * Create a new tenant
   */
  async createTenant(
    name: string,
    slug: string,
    plan: TenantPlan = 'free',
    creatorUserId: string
  ): Promise<{ success: boolean; tenant?: Tenant; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Service not available' };
    }

    try {
      const planConfig = PLAN_CONFIGS[plan];

      const { data, error } = await supabase
        .from('tenants')
        .insert({
          name,
          slug,
          plan,
          status: plan === 'free' ? 'active' : 'trial',
          limits: planConfig.limits,
          features: planConfig.features,
          settings: DEFAULT_TENANT_SETTINGS,
          branding: DEFAULT_BRANDING,
          billing: {
            customerId: null,
            subscriptionId: null,
            currentPeriodEnd: null,
            seats: planConfig.limits.maxUsers,
            seatsUsed: 1,
            mrr: planConfig.price,
            billingEmail: null,
            billingAddress: null,
          },
          usage: {
            usersCount: 1,
            controlsCount: 0,
            evidenceCount: 0,
            integrationsCount: 0,
            storageUsedMb: 0,
            apiCallsThisMonth: 0,
            lastActivityAt: new Date().toISOString(),
          },
          created_by: creatorUserId,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as owner
      await supabase.from('tenant_members').insert({
        tenant_id: data.id,
        user_id: creatorUserId,
        role: 'owner',
        is_default: true,
      });

      const tenant = this.mapToTenant(data);
      return { success: true, tenant };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tenant',
      };
    }
  }

  /**
   * Update tenant settings
   */
  async updateTenantSettings(
    tenantId: string,
    settings: Partial<TenantSettings>
  ): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { data: current } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', tenantId)
        .single();

      const { error } = await supabase
        .from('tenants')
        .update({
          settings: { ...(current?.settings || DEFAULT_TENANT_SETTINGS), ...settings },
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenantId);

      if (!error) {
        this.tenantCache.delete(tenantId);
      }
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Update tenant branding
   */
  async updateTenantBranding(
    tenantId: string,
    branding: Partial<TenantBranding>
  ): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { data: current } = await supabase
        .from('tenants')
        .select('branding')
        .eq('id', tenantId)
        .single();

      const { error } = await supabase
        .from('tenants')
        .update({
          branding: { ...(current?.branding || DEFAULT_BRANDING), ...branding },
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenantId);

      if (!error) {
        this.tenantCache.delete(tenantId);
      }
      return !error;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // PLAN & SUBSCRIPTION
  // ---------------------------------------------------------------------------

  /**
   * Upgrade/downgrade tenant plan
   */
  async changePlan(tenantId: string, newPlan: TenantPlan): Promise<boolean> {
    if (!supabase) return false;

    try {
      const planConfig = PLAN_CONFIGS[newPlan];

      const { error } = await supabase
        .from('tenants')
        .update({
          plan: newPlan,
          limits: planConfig.limits,
          features: planConfig.features,
          'billing.mrr': planConfig.price,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenantId);

      if (!error) {
        this.tenantCache.delete(tenantId);
        await this.logAuditEvent(tenantId, 'plan_changed', 'tenant', tenantId, { newPlan });
      }
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Check if tenant can use a feature
   */
  async canUseFeature(tenantId: string, feature: keyof TenantFeatures): Promise<boolean> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) return false;
    return tenant.features[feature] === true;
  }

  /**
   * Check if tenant is within limits
   */
  async checkLimit(
    tenantId: string,
    limitType: keyof TenantLimits,
    currentValue?: number
  ): Promise<{ withinLimit: boolean; current: number; max: number }> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      return { withinLimit: false, current: 0, max: 0 };
    }

    const max = tenant.limits[limitType];
    if (max === -1) {
      return { withinLimit: true, current: currentValue || 0, max: -1 };
    }

    let current = currentValue;
    if (current === undefined) {
      // Get current usage
      switch (limitType) {
        case 'maxUsers':
          current = tenant.usage.usersCount;
          break;
        case 'maxControls':
          current = tenant.usage.controlsCount;
          break;
        case 'maxEvidence':
          current = tenant.usage.evidenceCount;
          break;
        case 'maxIntegrations':
          current = tenant.usage.integrationsCount;
          break;
        case 'maxStorageGb':
          current = tenant.usage.storageUsedMb / 1024;
          break;
        default:
          current = 0;
      }
    }

    return { withinLimit: current < max, current, max };
  }

  // ---------------------------------------------------------------------------
  // MEMBER MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Get all members of a tenant
   */
  async getTenantMembers(tenantId: string): Promise<TenantMember[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('tenant_members')
        .select(`
          id,
          user_id,
          role,
          department,
          is_default,
          last_active_at,
          joined_at,
          profiles (
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('tenant_id', tenantId);

      if (error || !data) return [];

      return data.map((m) => {
        // profiles could be an array or object depending on Supabase query result
        const profileData = m.profiles as unknown;
        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        const profileObj = profile as Record<string, unknown> | undefined;
        return {
          id: m.id,
          userId: m.user_id,
          email: (profileObj?.email as string) || '',
          fullName: profileObj?.full_name as string | null,
          avatarUrl: profileObj?.avatar_url as string | null,
          role: m.role as UserRole,
          department: m.department,
          isDefault: m.is_default,
          lastActiveAt: m.last_active_at,
          joinedAt: m.joined_at,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Add member to tenant
   */
  async addMember(
    tenantId: string,
    userId: string,
    role: UserRole,
    department?: string
  ): Promise<boolean> {
    if (!supabase) return false;

    // Check user limit
    const limitCheck = await this.checkLimit(tenantId, 'maxUsers');
    if (!limitCheck.withinLimit) {
      return false;
    }

    try {
      const { error } = await supabase.from('tenant_members').insert({
        tenant_id: tenantId,
        user_id: userId,
        role,
        department,
        is_default: false,
      });

      if (!error) {
        await this.incrementUsage(tenantId, 'usersCount', 1);
        await this.logAuditEvent(tenantId, 'member_added', 'user', userId, { role });
      }
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Remove member from tenant
   */
  async removeMember(tenantId: string, memberId: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { data: member } = await supabase
        .from('tenant_members')
        .select('user_id, role')
        .eq('id', memberId)
        .single();

      if (member?.role === 'owner') {
        return false; // Cannot remove owner
      }

      const { error } = await supabase
        .from('tenant_members')
        .delete()
        .eq('id', memberId)
        .eq('tenant_id', tenantId);

      if (!error) {
        await this.incrementUsage(tenantId, 'usersCount', -1);
        await this.logAuditEvent(tenantId, 'member_removed', 'user', member?.user_id, {});
      }
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(memberId: string, newRole: UserRole): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('tenant_members')
        .update({ role: newRole })
        .eq('id', memberId);

      return !error;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // USAGE TRACKING
  // ---------------------------------------------------------------------------

  /**
   * Increment usage counter
   */
  async incrementUsage(
    tenantId: string,
    field: keyof TenantUsage,
    amount: number
  ): Promise<void> {
    if (!supabase) return;

    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('usage')
        .eq('id', tenantId)
        .single();

      if (!tenant) return;

      const usage = tenant.usage as TenantUsage;
      const currentValue = (usage[field] as number) || 0;

      await supabase
        .from('tenants')
        .update({
          usage: {
            ...usage,
            [field]: Math.max(0, currentValue + amount),
            lastActivityAt: new Date().toISOString(),
          },
        })
        .eq('id', tenantId);

      this.tenantCache.delete(tenantId);
    } catch {
      // Silently fail usage tracking
    }
  }

  /**
   * Record API call
   */
  async recordApiCall(tenantId: string): Promise<void> {
    await this.incrementUsage(tenantId, 'apiCallsThisMonth', 1);
  }

  /**
   * Reset monthly API calls (for billing cycle)
   */
  async resetMonthlyApiCalls(tenantId: string): Promise<void> {
    if (!supabase) return;

    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('usage')
        .eq('id', tenantId)
        .single();

      if (!tenant) return;

      await supabase
        .from('tenants')
        .update({
          usage: {
            ...(tenant.usage as TenantUsage),
            apiCallsThisMonth: 0,
          },
        })
        .eq('id', tenantId);
    } catch {
      // Silently fail
    }
  }

  // ---------------------------------------------------------------------------
  // ANALYTICS
  // ---------------------------------------------------------------------------

  /**
   * Get tenant analytics
   */
  async getTenantAnalytics(tenantId: string): Promise<TenantAnalytics | null> {
    if (!supabase) return null;

    try {
      // Get control responses
      const { data: responses } = await supabase
        .from('control_responses')
        .select('control_id, answer')
        .eq('organization_id', tenantId);

      // Get evidence
      const { data: evidence } = await supabase
        .from('evidence_items')
        .select('id, status')
        .eq('organization_id', tenantId);

      // Get incidents
      const { data: incidents } = await supabase
        .from('incidents')
        .select('id, status')
        .eq('organization_id', tenantId)
        .in('status', ['open', 'investigating']);

      const totalControls = responses?.length || 0;
      const completedControls = responses?.filter((r) => r.answer === 'yes').length || 0;
      const overdueControls = responses?.filter((r) => r.answer === 'no').length || 0;
      const evidenceCollected = evidence?.length || 0;
      const evidenceApproved = evidence?.filter((e) => e.status === 'final').length || 0;
      const openIncidents = incidents?.length || 0;

      const complianceScore = totalControls > 0
        ? Math.round((completedControls / totalControls) * 100)
        : 0;

      return {
        complianceScore,
        controlsCompleted: completedControls,
        controlsTotal: totalControls,
        evidenceCollected,
        evidenceApproved,
        openIncidents,
        overdueControls,
        frameworkProgress: {
          SOC2: complianceScore,
          ISO27001: complianceScore,
          HIPAA: complianceScore,
          NIST: complianceScore,
        },
        trendData: [], // Would be populated with historical data
      };
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // AUDIT LOGGING
  // ---------------------------------------------------------------------------

  /**
   * Log audit event
   */
  async logAuditEvent(
    tenantId: string,
    action: string,
    resource: string,
    resourceId: string | null,
    details: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    if (!supabase) return;

    try {
      await supabase.from('tenant_audit_logs').insert({
        tenant_id: tenantId,
        user_id: this.currentUserId,
        action,
        resource,
        resource_id: resourceId,
        details,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    } catch {
      // Silently fail audit logging
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(
    tenantId: string,
    options?: {
      action?: string;
      resource?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<TenantAuditLog[]> {
    if (!supabase) return [];

    try {
      let query = supabase
        .from('tenant_audit_logs')
        .select(`
          id,
          tenant_id,
          user_id,
          action,
          resource,
          resource_id,
          details,
          ip_address,
          user_agent,
          created_at,
          profiles (email)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (options?.action) query = query.eq('action', options.action);
      if (options?.resource) query = query.eq('resource', options.resource);
      if (options?.userId) query = query.eq('user_id', options.userId);
      if (options?.startDate) query = query.gte('created_at', options.startDate);
      if (options?.endDate) query = query.lte('created_at', options.endDate);
      if (options?.limit) query = query.limit(options.limit);
      if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);

      const { data, error } = await query;

      if (error || !data) return [];

      return data.map((log) => {
        // profiles could be an array or object depending on Supabase query result
        const profileData = log.profiles as unknown;
        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        const profileObj = profile as Record<string, unknown> | undefined;
        return {
          id: log.id,
          tenantId: log.tenant_id,
          userId: log.user_id,
          userEmail: profileObj?.email as string | null,
          action: log.action,
          resource: log.resource,
          resourceId: log.resource_id,
          details: log.details as Record<string, unknown>,
          ipAddress: log.ip_address,
          userAgent: log.user_agent,
          createdAt: log.created_at,
        };
      });
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // DATA ISOLATION HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Get tenant-scoped Supabase query builder
   * This ensures all queries are automatically filtered by tenant
   */
  getIsolatedQuery<T extends string>(table: T) {
    if (!supabase || !this.currentTenantId) {
      throw new Error('Tenant context not set');
    }

    return supabase.from(table).select('*').eq('organization_id', this.currentTenantId);
  }

  /**
   * Validate tenant access
   */
  async validateAccess(tenantId: string, userId: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { data } = await supabase
        .from('tenant_members')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .single();

      return !!data;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private mapToTenant(data: Record<string, unknown>): Tenant {
    return {
      id: data.id as string,
      name: data.name as string,
      slug: data.slug as string,
      plan: data.plan as TenantPlan,
      status: data.status as TenantStatus,
      limits: (data.limits as TenantLimits) || PLAN_CONFIGS.free.limits,
      features: (data.features as TenantFeatures) || PLAN_CONFIGS.free.features,
      settings: (data.settings as TenantSettings) || DEFAULT_TENANT_SETTINGS,
      branding: (data.branding as TenantBranding) || DEFAULT_BRANDING,
      billing: (data.billing as TenantBilling) || {
        customerId: null,
        subscriptionId: null,
        currentPeriodEnd: null,
        seats: 0,
        seatsUsed: 0,
        mrr: 0,
        billingEmail: null,
        billingAddress: null,
      },
      usage: (data.usage as TenantUsage) || {
        usersCount: 0,
        controlsCount: 0,
        evidenceCount: 0,
        integrationsCount: 0,
        storageUsedMb: 0,
        apiCallsThisMonth: 0,
        lastActivityAt: null,
      },
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }

  clearCache(): void {
    this.tenantCache.clear();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const multiTenant = new MultiTenantService();
export default multiTenant;
