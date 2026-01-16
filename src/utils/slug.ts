/**
 * Slug Utilities
 *
 * Functions for generating and validating URL-friendly slugs.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Reserved slugs that cannot be used for organizations
 */
const RESERVED_SLUGS = [
  'admin',
  'api',
  'app',
  'auth',
  'dashboard',
  'help',
  'invite',
  'login',
  'logout',
  'settings',
  'signup',
  'trust',
  'verify',
  'www',
];

/**
 * Generate a URL-friendly slug from a name
 *
 * @param name - The name to convert to a slug
 * @returns A lowercase, hyphenated slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

/**
 * Check if a slug is reserved
 *
 * @param slug - The slug to check
 * @returns True if the slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}

/**
 * Validate a slug format
 *
 * @param slug - The slug to validate
 * @returns True if the slug is valid
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length < 2 || slug.length > 50) {
    return false;
  }

  // Must be lowercase alphanumeric with hyphens
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug)) {
    return false;
  }

  // No consecutive hyphens
  if (/--/.test(slug)) {
    return false;
  }

  return !isReservedSlug(slug);
}

/**
 * Check if a slug exists in the database
 *
 * @param slug - The slug to check
 * @param supabase - Supabase client instance
 * @returns True if the slug exists
 */
export async function slugExists(
  slug: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .single();

  return !error && !!data;
}

/**
 * Ensure a slug is unique by appending a number if needed
 *
 * @param baseSlug - The base slug to make unique
 * @param supabase - Supabase client instance
 * @returns A unique slug
 */
export async function ensureUniqueSlug(
  baseSlug: string,
  supabase: SupabaseClient
): Promise<string> {
  let slug = generateSlug(baseSlug);

  // Handle reserved slugs
  if (isReservedSlug(slug)) {
    slug = `${slug}-org`;
  }

  // Check if exists
  const exists = await slugExists(slug, supabase);
  if (!exists) {
    return slug;
  }

  // Try with incrementing numbers
  for (let i = 2; i <= 100; i++) {
    const numberedSlug = `${slug}-${i}`;
    const numberedExists = await slugExists(numberedSlug, supabase);
    if (!numberedExists) {
      return numberedSlug;
    }
  }

  // Fallback: append random string
  const random = Math.random().toString(36).substring(2, 8);
  return `${slug}-${random}`;
}

/**
 * Format a slug for display (capitalize words)
 *
 * @param slug - The slug to format
 * @returns A formatted display name
 */
export function formatSlugForDisplay(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
