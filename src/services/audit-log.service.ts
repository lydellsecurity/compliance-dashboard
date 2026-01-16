/**
 * Audit Logging Service
 *
 * Comprehensive audit logging for compliance and security.
 * Tracks all user actions, system events, and security-relevant activities.
 *
 * Features:
 * - Structured log entries with timestamps
 * - User attribution and context
 * - Action categorization
 * - Local buffer with batch sync to Supabase
 * - Export capabilities for compliance reporting
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type AuditAction =
  // Authentication
  | 'auth.login'
  | 'auth.logout'
  | 'auth.login_failed'
  | 'auth.password_reset'
  | 'auth.mfa_enabled'
  | 'auth.mfa_disabled'
  | 'auth.session_expired'
  // User Management
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.role_changed'
  | 'user.invited'
  | 'user.invite_accepted'
  // Organization
  | 'org.created'
  | 'org.updated'
  | 'org.deleted'
  | 'org.member_added'
  | 'org.member_removed'
  | 'org.member_role_changed'
  | 'org.settings_changed'
  // Compliance
  | 'control.answered'
  | 'control.updated'
  | 'control.custom_created'
  | 'control.custom_deleted'
  | 'evidence.uploaded'
  | 'evidence.updated'
  | 'evidence.deleted'
  | 'evidence.approved'
  | 'evidence.rejected'
  // Vendor Management
  | 'vendor.created'
  | 'vendor.updated'
  | 'vendor.deleted'
  | 'vendor.assessment_created'
  | 'vendor.assessment_completed'
  | 'vendor.risk_changed'
  // Integrations
  | 'integration.connected'
  | 'integration.disconnected'
  | 'integration.sync_started'
  | 'integration.sync_completed'
  | 'integration.sync_failed'
  // Reports & Exports
  | 'report.generated'
  | 'report.exported'
  | 'certificate.generated'
  | 'audit_bundle.downloaded'
  // Security Events
  | 'security.rate_limited'
  | 'security.suspicious_activity'
  | 'security.access_denied'
  | 'security.data_exported'
  // System
  | 'system.error'
  | 'system.maintenance'
  | 'system.config_changed';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AuditCategory =
  | 'authentication'
  | 'user_management'
  | 'organization'
  | 'compliance'
  | 'vendor'
  | 'integration'
  | 'report'
  | 'security'
  | 'system';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  category: AuditCategory;
  severity: AuditSeverity;
  userId: string | null;
  userEmail?: string;
  organizationId: string | null;
  resourceType?: string;
  resourceId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
}

export interface AuditLogFilter {
  startDate?: string;
  endDate?: string;
  actions?: AuditAction[];
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  success?: boolean;
}

// ============================================================================
// ACTION TO CATEGORY MAPPING
// ============================================================================

const ACTION_CATEGORIES: Record<string, AuditCategory> = {
  'auth.': 'authentication',
  'user.': 'user_management',
  'org.': 'organization',
  'control.': 'compliance',
  'evidence.': 'compliance',
  'vendor.': 'vendor',
  'integration.': 'integration',
  'report.': 'report',
  'certificate.': 'report',
  'audit_bundle.': 'report',
  'security.': 'security',
  'system.': 'system',
};

function getCategoryFromAction(action: AuditAction): AuditCategory {
  for (const [prefix, category] of Object.entries(ACTION_CATEGORIES)) {
    if (action.startsWith(prefix)) {
      return category;
    }
  }
  return 'system';
}

// ============================================================================
// ACTION SEVERITY MAPPING
// ============================================================================

const ACTION_SEVERITIES: Partial<Record<AuditAction, AuditSeverity>> = {
  'auth.login_failed': 'warning',
  'auth.session_expired': 'info',
  'user.deleted': 'warning',
  'org.deleted': 'critical',
  'org.member_removed': 'warning',
  'evidence.deleted': 'warning',
  'vendor.deleted': 'warning',
  'integration.sync_failed': 'error',
  'security.rate_limited': 'warning',
  'security.suspicious_activity': 'critical',
  'security.access_denied': 'warning',
  'system.error': 'error',
};

function getSeverityFromAction(action: AuditAction, success: boolean): AuditSeverity {
  if (!success) {
    return 'error';
  }
  return ACTION_SEVERITIES[action] || 'info';
}

// ============================================================================
// AUDIT LOG SERVICE
// ============================================================================

class AuditLogService {
  private buffer: AuditLogEntry[] = [];
  private bufferSize = 50;
  private flushInterval = 30000; // 30 seconds
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private userId: string | null = null;
  private userEmail: string | null = null;
  private organizationId: string | null = null;

  constructor() {
    // Start flush timer
    this.startFlushTimer();

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  /**
   * Set user context for audit logs
   */
  setContext(userId: string | null, userEmail?: string | null, organizationId?: string | null): void {
    this.userId = userId;
    this.userEmail = userEmail ?? null;
    this.organizationId = organizationId ?? null;
  }

  /**
   * Clear user context
   */
  clearContext(): void {
    this.userId = null;
    this.userEmail = null;
    this.organizationId = null;
  }

  /**
   * Generate unique ID for log entries
   */
  private generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Get client IP address (from headers if available)
   */
  private getIpAddress(): string | undefined {
    // In a browser context, we can't get the real IP
    // This would need to be set by a server-side component
    return undefined;
  }

  /**
   * Get user agent
   */
  private getUserAgent(): string | undefined {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }
    return undefined;
  }

  /**
   * Log an audit event
   */
  log(
    action: AuditAction,
    description: string,
    options: {
      resourceType?: string;
      resourceId?: string;
      metadata?: Record<string, unknown>;
      success?: boolean;
      severity?: AuditSeverity;
      userId?: string;
      organizationId?: string;
    } = {}
  ): AuditLogEntry {
    const success = options.success ?? true;
    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      action,
      category: getCategoryFromAction(action),
      severity: options.severity ?? getSeverityFromAction(action, success),
      userId: options.userId ?? this.userId,
      userEmail: this.userEmail ?? undefined,
      organizationId: options.organizationId ?? this.organizationId,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      description,
      metadata: options.metadata,
      ipAddress: this.getIpAddress(),
      userAgent: this.getUserAgent(),
      success,
    };

    // Add to buffer
    this.buffer.push(entry);

    // Log to console in development
    if (import.meta.env.DEV) {
      const logLevel = entry.severity === 'error' || entry.severity === 'critical' ? 'error' : 'log';
      console[logLevel](`[AUDIT] ${entry.action}:`, entry.description, entry.metadata);
    }

    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }

    return entry;
  }

  /**
   * Convenience method for logging successful actions
   */
  success(action: AuditAction, description: string, options?: Parameters<typeof this.log>[2]): AuditLogEntry {
    return this.log(action, description, { ...options, success: true });
  }

  /**
   * Convenience method for logging failed actions
   */
  failure(action: AuditAction, description: string, options?: Parameters<typeof this.log>[2]): AuditLogEntry {
    return this.log(action, description, { ...options, success: false });
  }

  /**
   * Log authentication events
   */
  auth = {
    login: (userEmail: string, metadata?: Record<string, unknown>) =>
      this.success('auth.login', `User ${userEmail} logged in`, { metadata }),

    logout: (userEmail: string) =>
      this.success('auth.logout', `User ${userEmail} logged out`),

    loginFailed: (userEmail: string, reason: string) =>
      this.failure('auth.login_failed', `Login failed for ${userEmail}: ${reason}`, {
        metadata: { reason },
      }),

    passwordReset: (userEmail: string) =>
      this.success('auth.password_reset', `Password reset requested for ${userEmail}`),
  };

  /**
   * Log compliance events
   */
  compliance = {
    controlAnswered: (controlId: string, answer: string) =>
      this.success('control.answered', `Control ${controlId} answered: ${answer}`, {
        resourceType: 'control',
        resourceId: controlId,
        metadata: { answer },
      }),

    evidenceUploaded: (evidenceId: string, filename: string) =>
      this.success('evidence.uploaded', `Evidence uploaded: ${filename}`, {
        resourceType: 'evidence',
        resourceId: evidenceId,
        metadata: { filename },
      }),

    evidenceApproved: (evidenceId: string, approverEmail: string) =>
      this.success('evidence.approved', `Evidence ${evidenceId} approved by ${approverEmail}`, {
        resourceType: 'evidence',
        resourceId: evidenceId,
      }),
  };

  /**
   * Log vendor events
   */
  vendor = {
    created: (vendorId: string, vendorName: string) =>
      this.success('vendor.created', `Vendor created: ${vendorName}`, {
        resourceType: 'vendor',
        resourceId: vendorId,
      }),

    riskChanged: (vendorId: string, vendorName: string, oldRisk: string, newRisk: string) =>
      this.success('vendor.risk_changed', `${vendorName} risk level changed from ${oldRisk} to ${newRisk}`, {
        resourceType: 'vendor',
        resourceId: vendorId,
        metadata: { oldRisk, newRisk },
      }),
  };

  /**
   * Log security events
   */
  security = {
    rateLimited: (action: string, identifier?: string) =>
      this.log('security.rate_limited', `Rate limit hit for ${action}`, {
        metadata: { action, identifier },
        severity: 'warning',
      }),

    accessDenied: (resource: string, reason: string) =>
      this.failure('security.access_denied', `Access denied to ${resource}: ${reason}`, {
        metadata: { resource, reason },
      }),

    suspiciousActivity: (description: string, metadata?: Record<string, unknown>) =>
      this.log('security.suspicious_activity', description, {
        metadata,
        severity: 'critical',
      }),
  };

  /**
   * Start the periodic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }

  /**
   * Flush buffered logs to Supabase
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logsToFlush = [...this.buffer];
    this.buffer = [];

    if (!isSupabaseConfigured() || !supabase) {
      // Store in localStorage as fallback
      this.storeLocally(logsToFlush);
      return;
    }

    try {
      const { error } = await supabase.from('audit_logs').insert(
        logsToFlush.map((log) => ({
          id: log.id,
          timestamp: log.timestamp,
          action: log.action,
          category: log.category,
          severity: log.severity,
          user_id: log.userId,
          user_email: log.userEmail,
          organization_id: log.organizationId,
          resource_type: log.resourceType,
          resource_id: log.resourceId,
          description: log.description,
          metadata: log.metadata,
          ip_address: log.ipAddress,
          user_agent: log.userAgent,
          success: log.success,
        }))
      );

      if (error) {
        console.error('Failed to flush audit logs:', error);
        // Put logs back in buffer for retry
        this.buffer = [...logsToFlush, ...this.buffer];
      }
    } catch (err) {
      console.error('Error flushing audit logs:', err);
      this.storeLocally(logsToFlush);
    }
  }

  /**
   * Store logs locally as fallback
   */
  private storeLocally(logs: AuditLogEntry[]): void {
    try {
      const existing = localStorage.getItem('audit_log_buffer');
      const existingLogs: AuditLogEntry[] = existing ? JSON.parse(existing) : [];
      const combined = [...existingLogs, ...logs].slice(-500); // Keep last 500 logs
      localStorage.setItem('audit_log_buffer', JSON.stringify(combined));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Query audit logs from Supabase
   */
  async query(filter: AuditLogFilter, limit = 100, offset = 0): Promise<AuditLogEntry[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return this.queryLocal(filter);
    }

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filter.startDate) {
      query = query.gte('timestamp', filter.startDate);
    }
    if (filter.endDate) {
      query = query.lte('timestamp', filter.endDate);
    }
    if (filter.actions?.length) {
      query = query.in('action', filter.actions);
    }
    if (filter.categories?.length) {
      query = query.in('category', filter.categories);
    }
    if (filter.severities?.length) {
      query = query.in('severity', filter.severities);
    }
    if (filter.userId) {
      query = query.eq('user_id', filter.userId);
    }
    if (filter.resourceType) {
      query = query.eq('resource_type', filter.resourceType);
    }
    if (filter.resourceId) {
      query = query.eq('resource_id', filter.resourceId);
    }
    if (filter.success !== undefined) {
      query = query.eq('success', filter.success);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to query audit logs:', error);
      return [];
    }

    return (data || []).map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      action: log.action as AuditAction,
      category: log.category as AuditCategory,
      severity: log.severity as AuditSeverity,
      userId: log.user_id,
      userEmail: log.user_email,
      organizationId: log.organization_id,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      description: log.description,
      metadata: log.metadata as Record<string, unknown>,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      success: log.success,
    }));
  }

  /**
   * Query logs from localStorage (fallback)
   */
  private queryLocal(filter: AuditLogFilter): AuditLogEntry[] {
    try {
      const stored = localStorage.getItem('audit_log_buffer');
      if (!stored) return [];

      let logs: AuditLogEntry[] = JSON.parse(stored);

      if (filter.startDate) {
        logs = logs.filter((l) => l.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        logs = logs.filter((l) => l.timestamp <= filter.endDate!);
      }
      if (filter.actions?.length) {
        logs = logs.filter((l) => filter.actions!.includes(l.action));
      }
      if (filter.categories?.length) {
        logs = logs.filter((l) => filter.categories!.includes(l.category));
      }
      if (filter.severities?.length) {
        logs = logs.filter((l) => filter.severities!.includes(l.severity));
      }
      if (filter.userId) {
        logs = logs.filter((l) => l.userId === filter.userId);
      }
      if (filter.success !== undefined) {
        logs = logs.filter((l) => l.success === filter.success);
      }

      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
      return [];
    }
  }

  /**
   * Export logs for compliance reporting
   */
  async export(filter: AuditLogFilter, format: 'json' | 'csv' = 'json'): Promise<string> {
    const logs = await this.query(filter, 10000, 0);

    // Log the export action
    this.success('security.data_exported', `Exported ${logs.length} audit log entries`, {
      metadata: { format, count: logs.length, filter },
    });

    if (format === 'csv') {
      const headers = [
        'ID',
        'Timestamp',
        'Action',
        'Category',
        'Severity',
        'User ID',
        'User Email',
        'Organization ID',
        'Resource Type',
        'Resource ID',
        'Description',
        'Success',
      ];

      const rows = logs.map((log) => [
        log.id,
        log.timestamp,
        log.action,
        log.category,
        log.severity,
        log.userId || '',
        log.userEmail || '',
        log.organizationId || '',
        log.resourceType || '',
        log.resourceId || '',
        `"${log.description.replace(/"/g, '""')}"`,
        log.success ? 'true' : 'false',
      ]);

      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    return JSON.stringify(logs, null, 2);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const auditLog = new AuditLogService();

export default auditLog;
