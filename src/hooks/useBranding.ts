/**
 * useBranding Hook
 *
 * Manages organization branding state including logo, colors, and company info.
 * Supports both authenticated (by org_id) and public (by slug) access for Trust Center.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Organization } from '../lib/database.types';
import type {
  OrganizationBranding,
  BrandingContextValue,
} from '../types/branding.types';

// Storage key for caching branding
const BRANDING_CACHE_KEY = 'attestai_branding_cache';

/**
 * Generate a unique filename for logo uploads
 */
function generateLogoFilename(orgId: string, file: File): string {
  const ext = file.name.split('.').pop() || 'png';
  const timestamp = Date.now();
  return `${orgId}/logo_${timestamp}.${ext}`;
}

/**
 * Load cached branding from localStorage
 */
function loadCachedBranding(orgId: string): OrganizationBranding | null {
  try {
    const cached = localStorage.getItem(`${BRANDING_CACHE_KEY}_${orgId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

/**
 * Save branding to localStorage cache
 */
function saveBrandingCache(orgId: string, branding: OrganizationBranding): void {
  try {
    localStorage.setItem(`${BRANDING_CACHE_KEY}_${orgId}`, JSON.stringify(branding));
  } catch {
    // Ignore cache errors
  }
}

/**
 * Convert database organization to branding object
 */
function dbToBranding(org: Organization): OrganizationBranding {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logo_url,
    primaryColor: org.primary_color || '#6366f1',
    contactEmail: org.contact_email,
    description: org.description,
  };
}

/**
 * Hook for fetching and managing organization branding by org ID (authenticated)
 */
export function useBranding(organizationId: string | null): BrandingContextValue {
  const [branding, setBranding] = useState<OrganizationBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch branding from Supabase
  const fetchBranding = useCallback(async () => {
    if (!organizationId) {
      setBranding(null);
      setLoading(false);
      return;
    }

    // Try cache first
    const cached = loadCachedBranding(organizationId);
    if (cached) {
      setBranding(cached);
    }

    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        const brandingData = dbToBranding(data);
        setBranding(brandingData);
        saveBrandingCache(organizationId, brandingData);
      }
    } catch (err) {
      console.error('Failed to fetch branding:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch branding');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Initial fetch
  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  // Update branding
  const updateBranding = useCallback(
    async (updates: Partial<OrganizationBranding>): Promise<boolean> => {
      if (!organizationId || !isSupabaseConfigured() || !supabase) {
        return false;
      }

      try {
        const dbUpdates: Partial<Organization> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
        if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;
        if (updates.primaryColor !== undefined) dbUpdates.primary_color = updates.primaryColor;
        if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        dbUpdates.updated_at = new Date().toISOString();

        const { error: updateError } = await supabase
          .from('organizations')
          .update(dbUpdates)
          .eq('id', organizationId);

        if (updateError) {
          throw updateError;
        }

        // Update local state
        setBranding((prev) =>
          prev ? { ...prev, ...updates } : null
        );

        // Update cache
        if (branding) {
          saveBrandingCache(organizationId, { ...branding, ...updates });
        }

        return true;
      } catch (err) {
        console.error('Failed to update branding:', err);
        setError(err instanceof Error ? err.message : 'Failed to update branding');
        return false;
      }
    },
    [organizationId, branding]
  );

  // Upload logo
  const uploadLogo = useCallback(
    async (file: File): Promise<string | null> => {
      if (!organizationId || !isSupabaseConfigured() || !supabase) {
        return null;
      }

      try {
        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error('Invalid file type. Please upload PNG, JPEG, SVG, or WebP.');
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('File too large. Maximum size is 5MB.');
        }

        const filename = generateLogoFilename(organizationId, file);

        // Delete old logo if exists
        if (branding?.logoUrl) {
          const oldPath = branding.logoUrl.split('/branding/')[1];
          if (oldPath) {
            await supabase.storage.from('branding').remove([oldPath]);
          }
        }

        // Upload new logo
        const { data, error: uploadError } = await supabase.storage
          .from('branding')
          .upload(filename, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from('branding').getPublicUrl(data.path);

        const logoUrl = urlData.publicUrl;

        // Update organization with new logo URL
        await updateBranding({ logoUrl });

        return logoUrl;
      } catch (err) {
        console.error('Failed to upload logo:', err);
        setError(err instanceof Error ? err.message : 'Failed to upload logo');
        return null;
      }
    },
    [organizationId, branding, updateBranding]
  );

  // Refresh branding
  const refreshBranding = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchBranding();
  }, [fetchBranding]);

  return {
    branding,
    loading,
    error,
    updateBranding,
    uploadLogo,
    refreshBranding,
  };
}

/**
 * Hook for fetching organization branding by slug (public, for Trust Center)
 */
export function useBrandingBySlug(slug: string | null): {
  branding: OrganizationBranding | null;
  loading: boolean;
  error: string | null;
} {
  const [branding, setBranding] = useState<OrganizationBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBrandingBySlug() {
      if (!slug) {
        setBranding(null);
        setLoading(false);
        return;
      }

      if (!isSupabaseConfigured() || !supabase) {
        setLoading(false);
        setError('Database not configured');
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('organizations')
          .select('*')
          .eq('slug', slug)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            setError('Organization not found');
          } else {
            throw fetchError;
          }
          return;
        }

        if (data) {
          setBranding(dbToBranding(data));
        }
      } catch (err) {
        console.error('Failed to fetch branding by slug:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch organization');
      } finally {
        setLoading(false);
      }
    }

    fetchBrandingBySlug();
  }, [slug]);

  return { branding, loading, error };
}

/**
 * Hook for validating Trust Center token and fetching branding
 */
export function useTrustCenterAccess(
  slug: string | null,
  token: string | null
): {
  branding: OrganizationBranding | null;
  isValid: boolean;
  loading: boolean;
  error: string | null;
} {
  const [branding, setBranding] = useState<OrganizationBranding | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function validateAccess() {
      if (!slug || !token) {
        setIsValid(false);
        setLoading(false);
        setError('Missing access credentials');
        return;
      }

      if (!isSupabaseConfigured() || !supabase) {
        setLoading(false);
        setError('Database not configured');
        return;
      }

      try {
        // Fetch organization and validate token in one query
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('slug', slug)
          .single();

        if (orgError || !org) {
          setError('Organization not found');
          setIsValid(false);
          return;
        }

        // Validate token
        const { data: tokenData, error: tokenError } = await supabase
          .from('trust_center_tokens')
          .select('*')
          .eq('organization_id', org.id)
          .eq('token', token)
          .eq('is_active', true)
          .single();

        if (tokenError || !tokenData) {
          setError('Invalid or expired access link');
          setIsValid(false);
          setBranding(dbToBranding(org)); // Still set branding for error display
          return;
        }

        // Check expiration
        if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
          setError('This access link has expired');
          setIsValid(false);
          setBranding(dbToBranding(org));
          return;
        }

        // Update view count (fire and forget)
        supabase
          .from('trust_center_tokens')
          .update({
            view_count: (tokenData.view_count || 0) + 1,
            last_viewed_at: new Date().toISOString(),
          })
          .eq('id', tokenData.id)
          .then(() => {});

        setBranding(dbToBranding(org));
        setIsValid(true);
      } catch (err) {
        console.error('Failed to validate Trust Center access:', err);
        setError(err instanceof Error ? err.message : 'Failed to validate access');
        setIsValid(false);
      } finally {
        setLoading(false);
      }
    }

    validateAccess();
  }, [slug, token]);

  return { branding, isValid, loading, error };
}

export default useBranding;
