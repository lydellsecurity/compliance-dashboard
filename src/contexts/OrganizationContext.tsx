/**
 * OrganizationContext
 *
 * Provides multi-organization support with organization switching,
 * onboarding detection, and organization management.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../services/auth.service';
import type { Organization, UserRole } from '../lib/database.types';
import type {
  OrganizationWithRole,
  OrganizationContextValue,
  CreateOrganizationData,
} from '../types/branding.types';
import { generateSlug, ensureUniqueSlug } from '../utils/slug';

/**
 * Helper: call a server-side Netlify function with the caller's Clerk JWT.
 * Returns { ok, data, error } so callers can branch without wrapping a
 * try/catch per site. Kept inline because it's only used for the two
 * org-management endpoints.
 */
async function callServer<T>(
  path: string,
  body?: unknown
): Promise<{ ok: boolean; data?: T; error?: string; status?: number }> {
  try {
    // Retry up to 3 times if the Clerk session isn't ready yet. The symptom
    // is `auth.getAccessToken()` returning null immediately after signin
    // while Clerk is still hydrating — the user record resolves fractionally
    // before the session does, so the first fetch can race.
    let token: string | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      token = await auth.getAccessToken();
      if (token) break;
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
    }
    if (!token) {
      console.warn(
        `[org-ctx] ${path}: no Clerk token after 3 retries; skipping server call`
      );
      return { ok: false, error: 'Not authenticated (no session token)', status: 401 };
    }

    const res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body ?? {}),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(
        `[org-ctx] ${path} → HTTP ${res.status}:`,
        json.error || '(no error body)'
      );
      return {
        ok: false,
        error: json.error || `HTTP ${res.status}`,
        status: res.status,
      };
    }
    return { ok: true, data: json as T };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

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

function safeGetSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeRemoveSession(key: string): void {
  try {
    sessionStorage.removeItem(key);
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
    if (!user) {
      setUserOrganizations([]);
      setCurrentOrg(null);
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    try {
      // Try the server-side endpoint first — it uses the service role so it
      // works even when Supabase's Third-Party Auth with Clerk isn't fully
      // wired (in which case direct RLS reads return empty/403 and the user
      // would be mis-classified as "needsOnboarding").
      const server = await callServer<{ organizations: OrganizationWithRole[] }>(
        '/.netlify/functions/list-my-organizations'
      );

      let orgs: OrganizationWithRole[] = [];
      if (server.ok && server.data) {
        orgs = server.data.organizations;
      } else if (isSupabaseConfigured() && supabase) {
        // Fallback: direct Supabase query. Only runs if the Netlify function
        // is unavailable (local dev without netlify-dev, misrouted redirects).
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

        if (memberError) throw memberError;

        orgs = (memberships || [])
          .filter((m) => m.organizations)
          .map((m) =>
            toOrganizationWithRole(m.organizations as unknown as Organization, {
              role: m.role as UserRole,
              is_default: m.is_default,
              joined_at: m.joined_at,
            })
          );
      } else {
        throw new Error(server.error || 'Supabase not configured');
      }

      if (orgs.length === 0) {
        // User has no organizations - needs onboarding
        setUserOrganizations([]);
        setCurrentOrg(null);
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }

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

  // If signup stashed a pending org name, auto-create once the user is signed
  // in and we've confirmed they have no existing memberships. The form field
  // is the only hint we get — Clerk doesn't carry arbitrary metadata across
  // the verification step.
  useEffect(() => {
    if (authLoading || loading || !user || !needsOnboarding) return;
    const pendingName = safeGetSession('pending_org_name');
    if (!pendingName) return;

    createOrganization({ name: pendingName })
      .catch((err) => console.warn('pending org auto-create failed:', err))
      .finally(() => safeRemoveSession('pending_org_name'));
    // createOrganization is stable enough; omit to avoid re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, loading, user, needsOnboarding]);

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
      if (!user) throw new Error('Not authenticated');

      // Server-side create: bypasses the Supabase RLS dependency on
      // third-party-auth JWT resolution. Returns the created org already
      // shaped as OrganizationWithRole (minus the logo — we upload that
      // from the client below using storage RLS, which uses Clerk tokens
      // directly and isn't affected by the Postgres JWT issue).
      const server = await callServer<{
        organization: Omit<OrganizationWithRole, 'role' | 'isDefault' | 'joinedAt'>;
        role: UserRole;
        isDefault: boolean;
      }>('/.netlify/functions/create-organization', {
        name: data.name,
        slug: data.slug,
        description: data.description,
        contactEmail: data.contactEmail,
        primaryColor: data.primaryColor,
      });

      if (!server.ok || !server.data) {
        // Last-resort fallback: try the direct Supabase path. This only
        // works if Third-Party Auth is properly wired; otherwise it fails
        // with the same 42501 the server-side path was introduced to fix.
        if (!isSupabaseConfigured() || !supabase) {
          throw new Error(server.error || 'Failed to create organization');
        }

        try {
          let slug = data.slug || generateSlug(data.name);
          slug = await ensureUniqueSlug(slug, supabase);
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
          if (orgError || !newOrg) throw orgError || new Error('INSERT failed');
          const { error: memberError } = await supabase
            .from('organization_members')
            .insert({
              organization_id: newOrg.id,
              user_id: user.id,
              role: 'owner',
              is_default: userOrganizations.length === 0,
            });
          if (memberError) {
            await supabase.from('organizations').delete().eq('id', newOrg.id);
            throw memberError;
          }
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
          setUserOrganizations((prev) => [...prev, orgWithRole]);
          setCurrentOrg(orgWithRole);
          setStoredOrgId(orgWithRole.id);
          setNeedsOnboarding(false);
          return orgWithRole;
        } catch (fallbackErr) {
          console.error('Failed to create organization:', fallbackErr);
          throw fallbackErr;
        }
      }

      const { organization, role, isDefault } = server.data;

      // Upload logo if provided. Storage RLS uses a different path and
      // usually just needs the bearer token, so we try it but don't fail
      // the whole creation if the upload doesn't land.
      let logoUrl = organization.logoUrl;
      if (data.logoFile && isSupabaseConfigured() && supabase) {
        try {
          const ext = data.logoFile.name.split('.').pop() || 'png';
          const filename = `${organization.id}/logo.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('branding')
            .upload(filename, data.logoFile, { cacheControl: '3600', upsert: true });
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('branding')
              .getPublicUrl(filename);
            logoUrl = urlData.publicUrl;
          }
        } catch (err) {
          console.warn('Logo upload failed (non-blocking):', err);
        }
      }

      const orgWithRole: OrganizationWithRole = {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logoUrl,
        primaryColor: organization.primaryColor || '#6366f1',
        contactEmail: organization.contactEmail,
        description: organization.description,
        role,
        isDefault,
        joinedAt: new Date().toISOString(),
      };

      setUserOrganizations((prev) => [...prev, orgWithRole]);
      setCurrentOrg(orgWithRole);
      setStoredOrgId(orgWithRole.id);
      setNeedsOnboarding(false);

      return orgWithRole;
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
