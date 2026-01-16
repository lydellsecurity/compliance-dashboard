/**
 * Organization Service
 *
 * Centralized service for organization-related operations.
 * Handles CRUD, member management, invitations, and Trust Center tokens.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateSlug, ensureUniqueSlug } from '../utils/slug';
import type { Database } from '../lib/database.types';
import type {
  OrganizationBranding,
  OrganizationWithRole,
  TrustCenterTokenInfo,
  OrganizationInviteInfo,
  OrganizationMemberInfo,
  CreateOrganizationData,
  InviteUserData,
} from '../types/branding.types';
import type { UserRole } from '../lib/database.types';

// ============================================================================
// TYPES
// ============================================================================

type Organization = Database['public']['Tables']['organizations']['Row'];

interface CreateOrgResult {
  organization: OrganizationWithRole;
  error: string | null;
}

interface InviteResult {
  success: boolean;
  inviteId?: string;
  error?: string;
}

// ============================================================================
// ORGANIZATION SERVICE CLASS
// ============================================================================

class OrganizationService {
  /**
   * Create a new organization and add the creator as owner
   */
  async createOrganization(
    userId: string,
    data: CreateOrganizationData
  ): Promise<CreateOrgResult> {
    if (!isSupabaseConfigured() || !supabase) {
      return { organization: null as any, error: 'Supabase not configured' };
    }

    try {
      // Generate unique slug
      const baseSlug = data.slug || generateSlug(data.name);
      const uniqueSlug = await ensureUniqueSlug(baseSlug, supabase);

      // Upload logo if provided
      let logoUrl: string | null = null;
      if (data.logoFile) {
        logoUrl = await this.uploadLogo(data.logoFile, uniqueSlug);
      }

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: data.name,
          slug: uniqueSlug,
          logo_url: logoUrl,
          primary_color: data.primaryColor || '#6366f1',
          contact_email: data.contactEmail || null,
          description: data.description || null,
          settings: {},
        })
        .select()
        .single();

      if (orgError || !org) {
        throw new Error(orgError?.message || 'Failed to create organization');
      }

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: userId,
          role: 'owner',
          is_default: true,
        });

      if (memberError) {
        // Rollback: delete the org if member creation fails
        await supabase.from('organizations').delete().eq('id', org.id);
        throw new Error(memberError.message);
      }

      // Initialize baseline controls (236 controls)
      await this.initializeOrgBaseline(org.id, userId);

      return {
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logoUrl: org.logo_url,
          primaryColor: org.primary_color,
          contactEmail: org.contact_email,
          description: org.description,
          role: 'owner',
          isDefault: true,
          joinedAt: new Date().toISOString(),
        },
        error: null,
      };
    } catch (error) {
      console.error('Create organization error:', error);
      return {
        organization: null as any,
        error: error instanceof Error ? error.message : 'Failed to create organization',
      };
    }
  }

  /**
   * Get organization by slug (public access for Trust Center)
   */
  async getOrganizationBySlug(slug: string): Promise<OrganizationBranding | null> {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, primary_color, contact_email, description')
        .eq('slug', slug)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        logoUrl: data.logo_url,
        primaryColor: data.primary_color,
        contactEmail: data.contact_email,
        description: data.description,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get all organizations for a user
   */
  async getUserOrganizations(userId: string): Promise<OrganizationWithRole[]> {
    if (!isSupabaseConfigured() || !supabase) return [];

    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          is_default,
          joined_at,
          organizations (
            id,
            name,
            slug,
            logo_url,
            primary_color,
            contact_email,
            description
          )
        `)
        .eq('user_id', userId);

      if (error || !data) return [];

      return data
        .filter((m) => m.organizations)
        .map((m) => {
          const org = m.organizations as any;
          return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            logoUrl: org.logo_url,
            primaryColor: org.primary_color,
            contactEmail: org.contact_email,
            description: org.description,
            role: m.role as UserRole,
            isDefault: m.is_default,
            joinedAt: m.joined_at,
          };
        });
    } catch {
      return [];
    }
  }

  /**
   * Switch user's default organization
   */
  async setDefaultOrganization(userId: string, orgId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return false;

    try {
      // Unset all defaults for this user
      await supabase
        .from('organization_members')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Set new default
      const { error } = await supabase
        .from('organization_members')
        .update({ is_default: true })
        .eq('user_id', userId)
        .eq('organization_id', orgId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Update organization branding
   */
  async updateBranding(
    orgId: string,
    updates: Partial<OrganizationBranding>
  ): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return false;

    try {
      const dbUpdates: Partial<Organization> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.primaryColor !== undefined) dbUpdates.primary_color = updates.primaryColor;
      if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;

      const { error } = await supabase
        .from('organizations')
        .update(dbUpdates)
        .eq('id', orgId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Upload organization logo
   */
  async uploadLogo(file: File, slugOrOrgId: string): Promise<string | null> {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${slugOrOrgId}/logo.${ext}`;

      const { error } = await supabase.storage
        .from('branding')
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('branding')
        .getPublicUrl(path);

      return urlData.publicUrl;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // TEAM MEMBERS
  // ============================================================================

  /**
   * Get all members of an organization
   */
  async getOrganizationMembers(orgId: string): Promise<OrganizationMemberInfo[]> {
    if (!isSupabaseConfigured() || !supabase) return [];

    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles (
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('organization_id', orgId);

      if (error || !data) return [];

      return data.map((m) => {
        const profile = m.profiles as any;
        return {
          id: m.id,
          userId: m.user_id,
          email: profile?.email || '',
          fullName: profile?.full_name || null,
          avatarUrl: profile?.avatar_url || null,
          role: m.role as UserRole,
          joinedAt: m.joined_at,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(
    memberId: string,
    newRole: UserRole
  ): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return false;

    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Remove a member from organization
   */
  async removeMember(memberId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return false;

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      return !error;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // INVITATIONS
  // ============================================================================

  /**
   * Send an invitation to join organization
   */
  async inviteUser(
    orgId: string,
    invitedBy: string,
    data: InviteUserData
  ): Promise<InviteResult> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', orgId)
        .eq('user_id', (
          await supabase
            .from('profiles')
            .select('id')
            .eq('email', data.email)
            .single()
        ).data?.id || '')
        .single();

      if (existingMember) {
        return { success: false, error: 'User is already a member' };
      }

      // Check for existing pending invite
      const { data: existingInvite } = await supabase
        .from('organization_invites')
        .select('id')
        .eq('organization_id', orgId)
        .eq('email', data.email)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existingInvite) {
        return { success: false, error: 'An active invitation already exists for this email' };
      }

      // Generate token
      const token = this.generateToken(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Create invite
      const { data: invite, error } = await supabase
        .from('organization_invites')
        .insert({
          organization_id: orgId,
          email: data.email,
          role: data.role,
          token,
          invited_by: invitedBy,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error || !invite) {
        throw new Error(error?.message || 'Failed to create invitation');
      }

      // TODO: Send email via Netlify function
      // await fetch('/.netlify/functions/send-invite', { ... })

      return { success: true, inviteId: invite.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send invitation',
      };
    }
  }

  /**
   * Get pending invitations for an organization
   */
  async getPendingInvites(orgId: string): Promise<OrganizationInviteInfo[]> {
    if (!isSupabaseConfigured() || !supabase) return [];

    try {
      const { data, error } = await supabase
        .from('organization_invites')
        .select(`
          id,
          email,
          role,
          expires_at,
          accepted_at,
          created_at,
          invited_by,
          profiles!organization_invites_invited_by_fkey (full_name)
        `)
        .eq('organization_id', orgId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role as UserRole,
        expiresAt: inv.expires_at,
        acceptedAt: inv.accepted_at,
        createdAt: inv.created_at,
        invitedByName: (inv.profiles as any)?.full_name || undefined,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Cancel/revoke an invitation
   */
  async revokeInvite(inviteId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return false;

    try {
      const { error } = await supabase
        .from('organization_invites')
        .delete()
        .eq('id', inviteId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Accept an invitation
   */
  async acceptInvite(token: string, userId: string): Promise<OrganizationWithRole | null> {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      // Find the invite
      const { data: invite, error: inviteError } = await supabase
        .from('organization_invites')
        .select(`
          id,
          organization_id,
          email,
          role,
          expires_at,
          accepted_at,
          organizations (
            id, name, slug, logo_url, primary_color, contact_email, description
          )
        `)
        .eq('token', token)
        .single();

      if (inviteError || !invite) {
        throw new Error('Invalid invitation token');
      }

      if (invite.accepted_at) {
        throw new Error('This invitation has already been used');
      }

      if (new Date(invite.expires_at) < new Date()) {
        throw new Error('This invitation has expired');
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', invite.organization_id)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        throw new Error('You are already a member of this organization');
      }

      // Add user as member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: invite.organization_id,
          user_id: userId,
          role: invite.role,
          is_default: false,
        });

      if (memberError) {
        throw new Error(memberError.message);
      }

      // Mark invite as accepted
      await supabase
        .from('organization_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id);

      const org = invite.organizations as any;
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: org.logo_url,
        primaryColor: org.primary_color,
        contactEmail: org.contact_email,
        description: org.description,
        role: invite.role as UserRole,
        isDefault: false,
        joinedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Accept invite error:', error);
      return null;
    }
  }

  // ============================================================================
  // TRUST CENTER TOKENS
  // ============================================================================

  /**
   * Create a Trust Center access token
   */
  async createTrustCenterToken(
    orgId: string,
    createdBy: string,
    name?: string,
    expiresInDays?: number
  ): Promise<TrustCenterTokenInfo | null> {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const token = this.generateToken(32);
      let expiresAt: string | null = null;

      if (expiresInDays) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + expiresInDays);
        expiresAt = expiry.toISOString();
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', orgId)
        .single();

      const { data, error } = await supabase
        .from('trust_center_tokens')
        .insert({
          organization_id: orgId,
          token,
          name: name || null,
          expires_at: expiresAt,
          created_by: createdBy,
          is_active: true,
        })
        .select()
        .single();

      if (error || !data) return null;

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

      return {
        id: data.id,
        name: data.name,
        token: data.token,
        expiresAt: data.expires_at,
        isActive: data.is_active,
        viewCount: data.view_count || 0,
        lastViewedAt: data.last_viewed_at,
        createdAt: data.created_at,
        shareableUrl: `${baseUrl}/trust/${org?.slug}?token=${data.token}`,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get all Trust Center tokens for an organization
   */
  async getTrustCenterTokens(orgId: string): Promise<TrustCenterTokenInfo[]> {
    if (!isSupabaseConfigured() || !supabase) return [];

    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', orgId)
        .single();

      const { data, error } = await supabase
        .from('trust_center_tokens')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

      return data.map((t) => ({
        id: t.id,
        name: t.name,
        token: t.token,
        expiresAt: t.expires_at,
        isActive: t.is_active,
        viewCount: t.view_count || 0,
        lastViewedAt: t.last_viewed_at,
        createdAt: t.created_at,
        shareableUrl: `${baseUrl}/trust/${org?.slug}?token=${t.token}`,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Revoke/deactivate a Trust Center token
   */
  async revokeTrustCenterToken(tokenId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return false;

    try {
      const { error } = await supabase
        .from('trust_center_tokens')
        .update({ is_active: false })
        .eq('id', tokenId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Delete a Trust Center token
   */
  async deleteTrustCenterToken(tokenId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return false;

    try {
      const { error } = await supabase
        .from('trust_center_tokens')
        .delete()
        .eq('id', tokenId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Validate a Trust Center token (public)
   */
  async validateTrustCenterToken(
    slug: string,
    token: string
  ): Promise<{ isValid: boolean; organization: OrganizationBranding | null }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { isValid: false, organization: null };
    }

    try {
      // Get org by slug
      const org = await this.getOrganizationBySlug(slug);
      if (!org) {
        return { isValid: false, organization: null };
      }

      // Validate token
      const { data: tokenData, error } = await supabase
        .from('trust_center_tokens')
        .select('id, is_active, expires_at')
        .eq('organization_id', org.id)
        .eq('token', token)
        .single();

      if (error || !tokenData) {
        return { isValid: false, organization: null };
      }

      if (!tokenData.is_active) {
        return { isValid: false, organization: null };
      }

      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        return { isValid: false, organization: null };
      }

      // Update view count
      await supabase
        .from('trust_center_tokens')
        .update({
          view_count: (await supabase
            .from('trust_center_tokens')
            .select('view_count')
            .eq('id', tokenData.id)
            .single()).data?.view_count + 1 || 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', tokenData.id);

      return { isValid: true, organization: org };
    } catch {
      return { isValid: false, organization: null };
    }
  }

  // ============================================================================
  // BASELINE INITIALIZATION
  // ============================================================================

  /**
   * Initialize baseline controls for a new organization
   */
  async initializeOrgBaseline(orgId: string, userId: string): Promise<void> {
    // This would copy the 236 controls to the organization's control_responses
    // For now, this is a placeholder - the actual implementation would
    // copy default control responses and settings
    console.log(`Initializing baseline for org ${orgId} by user ${userId}`);

    // In a full implementation, this would:
    // 1. Create default control_responses entries for all 236 controls
    // 2. Set initial compliance status
    // 3. Create any default evidence_records
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private generateToken(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
    return result;
  }
}

// Export singleton instance
export const organizationService = new OrganizationService();
export default organizationService;
