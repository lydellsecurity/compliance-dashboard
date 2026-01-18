/**
 * Auditor Access Service
 *
 * Manages secure, time-limited auditor access links for external auditors.
 * Features:
 * - Generate unique, password-protected access tokens
 * - Token expiration (default 30 days)
 * - Organization branding support
 * - Audit logging of access attempts
 * - Clarification request management
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { FrameworkId } from '../constants/controls';

// Helper to get supabase client with null check
const getSupabase = () => {
  if (!supabase) throw new Error('Supabase client not initialized');
  return supabase;
};

// ============================================================================
// TYPES
// ============================================================================

export interface AuditorAccessLink {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationLogo?: string;
  token: string;
  passwordHash?: string; // Hashed password for additional security
  auditorEmail: string;
  auditorName: string;
  auditorFirm?: string;
  frameworks: FrameworkId[]; // Which frameworks the auditor can access
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  lastAccessedAt?: string;
  accessCount: number;
  isActive: boolean;
  auditType: 'annual' | 'quarterly' | 'special' | 'certification';
  notes?: string;
}

export interface AuditorAccessAttempt {
  id: string;
  linkId: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
}

export interface ClarificationRequest {
  id: string;
  linkId: string;
  organizationId: string;
  frameworkId: FrameworkId;
  requirementId: string;
  requirementTitle: string;
  controlId?: string;
  auditorName: string;
  auditorEmail: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  response?: string;
  attachments?: string[];
}

export interface AuditorPortalData {
  link: AuditorAccessLink;
  organization: {
    id: string;
    name: string;
    logo?: string;
    primaryColor?: string;
  };
  frameworks: FrameworkId[];
  controlStatuses: Map<string, {
    status: 'implemented' | 'in_progress' | 'not_started' | 'not_applicable';
    answer: 'yes' | 'no' | 'partial' | 'na' | null;
    hasEvidence: boolean;
    evidenceCount: number;
  }>;
  evidenceItems: EvidenceArtifact[];
  clarificationRequests: ClarificationRequest[];
}

export interface EvidenceArtifact {
  id: string;
  controlId: string;
  controlTitle: string;
  title: string;
  description: string;
  type: string;
  status: 'draft' | 'review' | 'final';
  files: {
    id: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
    checksum_sha256: string;
    uploadedAt: string;
  }[];
  frameworkMappings: string[];
  collectedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface CreateAuditorLinkParams {
  organizationId: string;
  auditorEmail: string;
  auditorName: string;
  auditorFirm?: string;
  frameworks: FrameworkId[];
  expirationDays?: number;
  password?: string;
  auditType: 'annual' | 'quarterly' | 'special' | 'certification';
  notes?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a password using SHA-256
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a password against its hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

// ============================================================================
// LOCAL STORAGE FALLBACK
// ============================================================================

const STORAGE_KEYS = {
  AUDITOR_LINKS: 'lydell_auditor_links',
  CLARIFICATION_REQUESTS: 'lydell_clarification_requests',
  ACCESS_LOG: 'lydell_auditor_access_log',
};

function getLocalLinks(): AuditorAccessLink[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUDITOR_LINKS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalLinks(links: AuditorAccessLink[]): void {
  localStorage.setItem(STORAGE_KEYS.AUDITOR_LINKS, JSON.stringify(links));
}

function getLocalClarifications(): ClarificationRequest[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CLARIFICATION_REQUESTS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalClarifications(requests: ClarificationRequest[]): void {
  localStorage.setItem(STORAGE_KEYS.CLARIFICATION_REQUESTS, JSON.stringify(requests));
}

// ============================================================================
// AUDITOR ACCESS SERVICE
// ============================================================================

class AuditorAccessService {
  /**
   * Create a new auditor access link
   */
  async createAuditorLink(params: CreateAuditorLinkParams): Promise<AuditorAccessLink> {
    const token = generateSecureToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (params.expirationDays || 30) * 24 * 60 * 60 * 1000);

    const link: AuditorAccessLink = {
      id: crypto.randomUUID(),
      organizationId: params.organizationId,
      organizationName: '', // Will be populated from org data
      token,
      passwordHash: params.password ? await hashPassword(params.password) : undefined,
      auditorEmail: params.auditorEmail,
      auditorName: params.auditorName,
      auditorFirm: params.auditorFirm,
      frameworks: params.frameworks,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      createdBy: 'current-user', // Would come from auth context
      accessCount: 0,
      isActive: true,
      auditType: params.auditType,
      notes: params.notes,
    };

    if (isSupabaseConfigured()) {
      try {
        // Get organization name
        const { data: orgData } = await getSupabase()
          .from('organizations')
          .select('name, logo_url')
          .eq('id', params.organizationId)
          .single();

        if (orgData) {
          link.organizationName = orgData.name;
          link.organizationLogo = orgData.logo_url;
        }

        // Store in database
        const { error } = await getSupabase()
          .from('auditor_access_links')
          .insert({
            id: link.id,
            organization_id: link.organizationId,
            token: link.token,
            password_hash: link.passwordHash,
            auditor_email: link.auditorEmail,
            auditor_name: link.auditorName,
            auditor_firm: link.auditorFirm,
            frameworks: link.frameworks,
            expires_at: link.expiresAt,
            created_at: link.createdAt,
            created_by: link.createdBy,
            access_count: 0,
            is_active: true,
            audit_type: link.auditType,
            notes: link.notes,
          });

        if (error) throw error;
      } catch (error) {
        console.error('Failed to create auditor link in Supabase:', error);
        // Fall back to local storage
        const links = getLocalLinks();
        links.push(link);
        saveLocalLinks(links);
      }
    } else {
      const links = getLocalLinks();
      links.push(link);
      saveLocalLinks(links);
    }

    return link;
  }

  /**
   * Validate an auditor access token
   */
  async validateAccessToken(
    token: string,
    password?: string
  ): Promise<{ valid: boolean; link?: AuditorAccessLink; error?: string }> {
    let link: AuditorAccessLink | undefined;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getSupabase()
          .from('auditor_access_links')
          .select('*')
          .eq('token', token)
          .single();

        if (error || !data) {
          return { valid: false, error: 'Invalid access link' };
        }

        link = {
          id: data.id,
          organizationId: data.organization_id,
          organizationName: data.organization_name || '',
          organizationLogo: data.organization_logo,
          token: data.token,
          passwordHash: data.password_hash,
          auditorEmail: data.auditor_email,
          auditorName: data.auditor_name,
          auditorFirm: data.auditor_firm,
          frameworks: data.frameworks,
          expiresAt: data.expires_at,
          createdAt: data.created_at,
          createdBy: data.created_by,
          lastAccessedAt: data.last_accessed_at,
          accessCount: data.access_count,
          isActive: data.is_active,
          auditType: data.audit_type,
          notes: data.notes,
        };
      } catch (error) {
        console.error('Supabase validation error:', error);
      }
    }

    // Fallback to local storage
    if (!link) {
      const links = getLocalLinks();
      link = links.find(l => l.token === token);
    }

    if (!link) {
      return { valid: false, error: 'Invalid access link' };
    }

    // Check if active
    if (!link.isActive) {
      return { valid: false, error: 'This access link has been deactivated' };
    }

    // Check expiration
    if (new Date(link.expiresAt) < new Date()) {
      return { valid: false, error: 'This access link has expired' };
    }

    // Check password if required
    if (link.passwordHash) {
      if (!password) {
        return { valid: false, error: 'Password required' };
      }
      const passwordValid = await verifyPassword(password, link.passwordHash);
      if (!passwordValid) {
        return { valid: false, error: 'Invalid password' };
      }
    }

    // Log successful access
    await this.logAccessAttempt(link.id, true);

    // Update access count and timestamp
    link.accessCount++;
    link.lastAccessedAt = new Date().toISOString();

    if (isSupabaseConfigured()) {
      await getSupabase()
        .from('auditor_access_links')
        .update({
          access_count: link.accessCount,
          last_accessed_at: link.lastAccessedAt,
        })
        .eq('id', link.id);
    } else {
      const links = getLocalLinks();
      const idx = links.findIndex(l => l.id === link!.id);
      if (idx !== -1) {
        links[idx] = link;
        saveLocalLinks(links);
      }
    }

    return { valid: true, link };
  }

  /**
   * Log an access attempt
   */
  async logAccessAttempt(
    linkId: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    const attempt: AuditorAccessAttempt = {
      id: crypto.randomUUID(),
      linkId,
      timestamp: new Date().toISOString(),
      success,
      failureReason,
    };

    if (isSupabaseConfigured()) {
      try {
        await getSupabase().from('auditor_access_log').insert({
          id: attempt.id,
          link_id: attempt.linkId,
          timestamp: attempt.timestamp,
          success: attempt.success,
          failure_reason: attempt.failureReason,
        });
      } catch (error) {
        console.error('Failed to log access attempt:', error);
      }
    }

    // Also store locally
    try {
      const log = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCESS_LOG) || '[]');
      log.push(attempt);
      // Keep only last 1000 entries
      if (log.length > 1000) {
        log.splice(0, log.length - 1000);
      }
      localStorage.setItem(STORAGE_KEYS.ACCESS_LOG, JSON.stringify(log));
    } catch {
      // Ignore local storage errors
    }
  }

  /**
   * Get all auditor links for an organization
   */
  async getOrganizationLinks(organizationId: string): Promise<AuditorAccessLink[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getSupabase()
          .from('auditor_access_links')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map(d => ({
            id: d.id,
            organizationId: d.organization_id,
            organizationName: d.organization_name || '',
            organizationLogo: d.organization_logo,
            token: d.token,
            passwordHash: d.password_hash,
            auditorEmail: d.auditor_email,
            auditorName: d.auditor_name,
            auditorFirm: d.auditor_firm,
            frameworks: d.frameworks,
            expiresAt: d.expires_at,
            createdAt: d.created_at,
            createdBy: d.created_by,
            lastAccessedAt: d.last_accessed_at,
            accessCount: d.access_count,
            isActive: d.is_active,
            auditType: d.audit_type,
            notes: d.notes,
          }));
        }
      } catch (error) {
        console.error('Failed to get auditor links:', error);
      }
    }

    return getLocalLinks().filter(l => l.organizationId === organizationId);
  }

  /**
   * Deactivate an auditor link
   */
  async deactivateLink(linkId: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await getSupabase()
          .from('auditor_access_links')
          .update({ is_active: false })
          .eq('id', linkId);

        if (!error) return true;
      } catch (error) {
        console.error('Failed to deactivate link:', error);
      }
    }

    const links = getLocalLinks();
    const idx = links.findIndex(l => l.id === linkId);
    if (idx !== -1) {
      links[idx].isActive = false;
      saveLocalLinks(links);
      return true;
    }

    return false;
  }

  /**
   * Create a clarification request
   */
  async createClarificationRequest(
    linkId: string,
    params: {
      organizationId: string;
      frameworkId: FrameworkId;
      requirementId: string;
      requirementTitle: string;
      controlId?: string;
      auditorName: string;
      auditorEmail: string;
      message: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
    }
  ): Promise<ClarificationRequest> {
    const request: ClarificationRequest = {
      id: crypto.randomUUID(),
      linkId,
      organizationId: params.organizationId,
      frameworkId: params.frameworkId,
      requirementId: params.requirementId,
      requirementTitle: params.requirementTitle,
      controlId: params.controlId,
      auditorName: params.auditorName,
      auditorEmail: params.auditorEmail,
      message: params.message,
      status: 'pending',
      priority: params.priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { error } = await getSupabase()
          .from('clarification_requests')
          .insert({
            id: request.id,
            link_id: request.linkId,
            organization_id: request.organizationId,
            framework_id: request.frameworkId,
            requirement_id: request.requirementId,
            requirement_title: request.requirementTitle,
            control_id: request.controlId,
            auditor_name: request.auditorName,
            auditor_email: request.auditorEmail,
            message: request.message,
            status: request.status,
            priority: request.priority,
            created_at: request.createdAt,
            updated_at: request.updatedAt,
          });

        if (error) throw error;
      } catch (error) {
        console.error('Failed to create clarification request:', error);
      }
    }

    const requests = getLocalClarifications();
    requests.push(request);
    saveLocalClarifications(requests);

    return request;
  }

  /**
   * Get clarification requests for a link
   */
  async getClarificationRequests(linkId: string): Promise<ClarificationRequest[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getSupabase()
          .from('clarification_requests')
          .select('*')
          .eq('link_id', linkId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map(d => ({
            id: d.id,
            linkId: d.link_id,
            organizationId: d.organization_id,
            frameworkId: d.framework_id,
            requirementId: d.requirement_id,
            requirementTitle: d.requirement_title,
            controlId: d.control_id,
            auditorName: d.auditor_name,
            auditorEmail: d.auditor_email,
            message: d.message,
            status: d.status,
            priority: d.priority,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
            resolvedAt: d.resolved_at,
            resolvedBy: d.resolved_by,
            response: d.response,
            attachments: d.attachments,
          }));
        }
      } catch (error) {
        console.error('Failed to get clarification requests:', error);
      }
    }

    return getLocalClarifications().filter(r => r.linkId === linkId);
  }

  /**
   * Update a clarification request (admin response)
   */
  async updateClarificationRequest(
    requestId: string,
    updates: {
      status?: ClarificationRequest['status'];
      response?: string;
      resolvedBy?: string;
    }
  ): Promise<boolean> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      try {
        const { error } = await getSupabase()
          .from('clarification_requests')
          .update({
            status: updates.status,
            response: updates.response,
            resolved_by: updates.resolvedBy,
            resolved_at: updates.status === 'resolved' ? now : null,
            updated_at: now,
          })
          .eq('id', requestId);

        if (!error) return true;
      } catch (error) {
        console.error('Failed to update clarification request:', error);
      }
    }

    const requests = getLocalClarifications();
    const idx = requests.findIndex(r => r.id === requestId);
    if (idx !== -1) {
      requests[idx] = {
        ...requests[idx],
        ...updates,
        updatedAt: now,
        resolvedAt: updates.status === 'resolved' ? now : requests[idx].resolvedAt,
      };
      saveLocalClarifications(requests);
      return true;
    }

    return false;
  }

  /**
   * Generate the full portal URL for an auditor
   */
  getPortalUrl(token: string): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/auditor-portal/${token}`;
  }
}

export const auditorAccessService = new AuditorAccessService();
export default auditorAccessService;
