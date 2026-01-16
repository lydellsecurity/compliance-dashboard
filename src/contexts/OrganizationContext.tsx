/**
 * OrganizationContext
 *
 * Provides multi-organization support with organization switching,
 * onboarding detection, and organization management.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Organization, UserRole } from '../lib/database.types';
import type {
  OrganizationWithRole,
  OrganizationContextValue,
  CreateOrganizationData,
} from '../types/branding.types';
import { generateSlug, ensureUniqueSlug } from '../utils/slug';

// Storage keys
const CURRENT_ORG_KEY = 'attestai_current_org_id';

/**
 * Convert database records to OrganizationWithRole
 */
function toOrganizationWithRole(
  org: Organization,
  member: { role: UserRole; is_default: boolean; joined_at: string }
): OrganizationWithRole {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logo_url,
    primaryColor: org.primary_color || '#6366f1',
    contactEmail: org.contact_email,
    description: org.description,
    role: member.role,
    isDefault: member.is_default,
    joinedAt: member.joined_at,
  };
}

/**
 * Get stored current org ID from localStorage
 */
function getStoredOrgId(): string | null {
  try {
    return localStorage.getItem(CURRENT_ORG_KEY);
  } catch {
    return null;
  }
}

/**
 * Store current org ID in localStorage
 */
function setStoredOrgId(orgId: string): void {
  try {
    localStorage.setItem(CURRENT_ORG_KEY, orgId);
  } catch {
    // Ignore storage errors
  }
}

// Create context with default values
const OrganizationContext = createContext<OrganizationContextValue>({
  currentOrg: null,
  userOrganizations: [],
  loading: true,
  error: null,
  needsOnboarding: false,
  switchOrganization: async () => {},
  createOrganization: async () => {
    throw new Error('Not implemented');
  },
  refreshOrganizations: async () => {},
});

/**
 * OrganizationProvider component
 */
export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [currentOrg, setCurrentOrg] = useState<OrganizationWithRole | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<OrganizationWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  /**
   * Fetch user's organizations from database
   */
  const fetchOrganizations = useCallback(async () => {
    if (!user || !isSupabaseConfigured() || !supabase) {
      setUserOrganizations([]);
      setCurrentOrg(null);
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    try {
      // Fetch memberships with organization data
      const { data: memberships, error: memberError } = await supabase
        .from('organization_members')
        .select(`
          role,
          is_default,
          joined_at,
          organization_id,
          organizations (*)
        `)
        .eq('user_id', user.id);

      if (memberError) {
        throw memberError;
      }

      if (!memberships || memberships.length === 0) {
        // User has no organizations - needs onboarding
        setUserOrganizations([]);
        setCurrentOrg(null);
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }

      // Convert to OrganizationWithRole[]
      const orgs: OrganizationWithRole[] = memberships
        .filter((m) => m.organizations)
        .map((m) =>
          toOrganizationWithRole(m.organizations as unknown as Organization, {
            role: m.role as UserRole,
            is_default: m.is_default,
            joined_at: m.joined_at,
          })
        );

      setUserOrganizations(orgs);
      setNeedsOnboarding(false);

      // Determine current org
      const storedOrgId = getStoredOrgId();
      let selectedOrg: OrganizationWithRole | null = null;

      // Try stored org first
      if (storedOrgId) {
        selectedOrg = orgs.find((o) => o.id === storedOrgId) || null;
      }

      // Fall back to default org
      if (!selectedOrg) {
        selectedOrg = orgs.find((o) => o.isDefault) || null;
      }

      // Fall back to first org
      if (!selectedOrg && orgs.length > 0) {
        selectedOrg = orgs[0];
      }

      if (selectedOrg) {
        setCurrentOrg(selectedOrg);
        setStoredOrgId(selectedOrg.id);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch organizations when user changes
  useEffect(() => {
    if (!authLoading) {
      fetchOrganizations();
    }
  }, [authLoading, fetchOrganizations]);

  /**
   * Switch to a different organization
   */
  const switchOrganization = useCallback(
    async (orgId: string) => {
      const org = userOrganizations.find((o) => o.id === orgId);
      if (!org) {
        throw new Error('Organization not found');
      }

      setCurrentOrg(org);
      setStoredOrgId(orgId);

      // Update is_default in database
      if (user && isSupabaseConfigured() && supabase) {
        // This triggers the database trigger to unset other defaults
        await supabase
          .from('organization_members')
          .update({ is_default: true })
          .eq('user_id', user.id)
          .eq('organization_id', orgId);
      }
    },
    [userOrganizations, user]
  );

  /**
   * Create a new organization
   */
  const createOrganization = useCallback(
    async (data: CreateOrganizationData): Promise<OrganizationWithRole> => {
      if (!user || !isSupabaseConfigured() || !supabase) {
        throw new Error('Not authenticated');
      }

      try {
        // Generate slug if not provided
        let slug = data.slug || generateSlug(data.name);
        slug = await ensureUniqueSlug(slug, supabase);

        // Create organization
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: data.name,
            slug,
            primary_color: data.primaryColor || '#6366f1',
            description: data.description || null,
            contact_email: data.contactEmail || null,
            settings: {},
          })
          .select()
          .single();

        if (orgError || !newOrg) {
          throw orgError || new Error('Failed to create organization');
        }

        // Add user as owner
        const { error: memberError } = await supabase.from('organization_members').insert({
          organization_id: newOrg.id,
          user_id: user.id,
          role: 'owner',
          is_default: userOrganizations.length === 0, // Default if first org
        });

        if (memberError) {
          // Rollback: delete the organization
          await supabase.from('organizations').delete().eq('id', newOrg.id);
          throw memberError;
        }

        // Upload logo if provided
        if (data.logoFile) {
          const ext = data.logoFile.name.split('.').pop() || 'png';
          const filename = `${newOrg.id}/logo.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('branding')
            .upload(filename, data.logoFile, {
              cacheControl: '3600',
              upsert: true,
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('branding').getPublicUrl(filename);

            await supabase
              .from('organizations')
              .update({ logo_url: urlData.publicUrl })
              .eq('id', newOrg.id);

            newOrg.logo_url = urlData.publicUrl;
          }
        }

        // Convert to OrganizationWithRole
        const orgWithRole: OrganizationWithRole = {
          id: newOrg.id,
          name: newOrg.name,
          slug: newOrg.slug,
          logoUrl: newOrg.logo_url,
          primaryColor: newOrg.primary_color || '#6366f1',
          contactEmail: newOrg.contact_email,
          description: newOrg.description,
          role: 'owner',
          isDefault: userOrganizations.length === 0,
          joinedAt: new Date().toISOString(),
        };

        // Update state
        setUserOrganizations((prev) => [...prev, orgWithRole]);
        setCurrentOrg(orgWithRole);
        setStoredOrgId(orgWithRole.id);
        setNeedsOnboarding(false);

        return orgWithRole;
      } catch (err) {
        console.error('Failed to create organization:', err);
        throw err;
      }
    },
    [user, userOrganizations.length]
  );

  /**
   * Refresh organizations list
   */
  const refreshOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchOrganizations();
  }, [fetchOrganizations]);

  // Memoize context value
  const contextValue = useMemo<OrganizationContextValue>(
    () => ({
      currentOrg,
      userOrganizations,
      loading: loading || authLoading,
      error,
      needsOnboarding,
      switchOrganization,
      createOrganization,
      refreshOrganizations,
    }),
    [
      currentOrg,
      userOrganizations,
      loading,
      authLoading,
      error,
      needsOnboarding,
      switchOrganization,
      createOrganization,
      refreshOrganizations,
    ]
  );

  return (
    <OrganizationContext.Provider value={contextValue}>{children}</OrganizationContext.Provider>
  );
};

/**
 * Hook to access organization context
 */
export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

export default OrganizationContext;
