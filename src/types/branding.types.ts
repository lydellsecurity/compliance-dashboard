/**
 * Branding Types
 *
 * Types for organization branding and multi-tenant configuration.
 */

import type { Organization, UserRole } from '../lib/database.types';

/**
 * Organization branding data for UI rendering
 */
export interface OrganizationBranding {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  contactEmail: string | null;
  description: string | null;
}

/**
 * Full organization with membership info
 */
export interface OrganizationWithRole extends OrganizationBranding {
  role: UserRole;
  isDefault: boolean;
  joinedAt: string;
}

/**
 * Trust Center token for shareable links
 */
export interface TrustCenterTokenInfo {
  id: string;
  name: string | null;
  token: string;
  expiresAt: string | null;
  isActive: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  shareableUrl: string;
}

/**
 * Organization invite for team management
 */
export interface OrganizationInviteInfo {
  id: string;
  email: string;
  role: UserRole;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  invitedByName?: string;
}

/**
 * Organization member for team display
 */
export interface OrganizationMemberInfo {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  joinedAt: string;
}

/**
 * Branding context value provided to components
 */
export interface BrandingContextValue {
  branding: OrganizationBranding | null;
  loading: boolean;
  error: string | null;
  updateBranding: (updates: Partial<OrganizationBranding>) => Promise<boolean>;
  uploadLogo: (file: File) => Promise<string | null>;
  refreshBranding: () => Promise<void>;
}

/**
 * Organization context value for multi-org support
 */
export interface OrganizationContextValue {
  currentOrg: OrganizationWithRole | null;
  userOrganizations: OrganizationWithRole[];
  loading: boolean;
  error: string | null;
  needsOnboarding: boolean;
  switchOrganization: (orgId: string) => Promise<void>;
  createOrganization: (data: CreateOrganizationData) => Promise<OrganizationWithRole>;
  refreshOrganizations: () => Promise<void>;
}

/**
 * Data for creating a new organization
 */
export interface CreateOrganizationData {
  name: string;
  slug?: string; // Auto-generated if not provided
  primaryColor?: string;
  description?: string;
  contactEmail?: string;
  logoFile?: File;
}

/**
 * Data for inviting a user to an organization
 */
export interface InviteUserData {
  email: string;
  role: UserRole;
}

/**
 * Result of validating a Trust Center token
 */
export interface TrustCenterValidationResult {
  isValid: boolean;
  organization: OrganizationBranding | null;
  errorMessage?: string;
}

/**
 * Public compliance data for Trust Center
 */
export interface PublicComplianceData {
  organization: OrganizationBranding;
  frameworkProgress: {
    id: string;
    name: string;
    color: string;
    percentage: number;
    completed: number;
    total: number;
  }[];
  overallScore: number;
  lastUpdated: string;
  securityCommitments: {
    title: string;
    description: string;
    icon: string;
  }[];
}

/**
 * Convert database Organization to OrganizationBranding
 */
export function toOrganizationBranding(org: Organization): OrganizationBranding {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logo_url,
    primaryColor: org.primary_color,
    contactEmail: org.contact_email,
    description: org.description,
  };
}

/**
 * Default branding for fallback
 */
export const DEFAULT_BRANDING: OrganizationBranding = {
  id: '',
  name: 'Lydell Security',
  slug: '',
  logoUrl: null,
  primaryColor: '#6366f1',
  contactEmail: null,
  description: null,
};

/**
 * Default primary colors for color picker
 */
export const BRAND_COLORS = [
  '#6366f1', // Indigo (default)
  '#3b82f6', // Blue
  '#0ea5e9', // Sky
  '#14b8a6', // Teal
  '#22c55e', // Green
  '#eab308', // Yellow
  '#f97316', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#64748b', // Slate
  '#171717', // Black
];
