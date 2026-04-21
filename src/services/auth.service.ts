/**
 * ============================================================================
 * AUTH SERVICE (Clerk-backed)
 * ============================================================================
 *
 * Clerk owns the session; this service only exposes a handful of helpers that
 * non-React modules (background jobs, imperative flows) still need.
 *
 * Interactive auth (signIn/signUp/OAuth/reset) lives in hooks/useAuth.ts so it
 * can use Clerk's React hooks.
 */

import type { User, Session } from '@supabase/supabase-js';

// ============================================================================
// TYPES (kept for backward-compat with old imports)
// ============================================================================

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName?: string;
  organizationName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

// ============================================================================
// AUTH SERVICE
// ============================================================================

type ClerkLike = {
  signOut: () => Promise<void>;
  user?: { id: string; primaryEmailAddress?: { emailAddress?: string } | null } | null;
  session?: { getToken: () => Promise<string | null> } | null;
};

class AuthService {
  // Populated by <AuthServiceBridge /> (mounted inside <ClerkProvider />) so
  // that non-React callers can still fetch a token or sign out imperatively.
  private clerkRef: ClerkLike | null = null;

  attachClerk(clerk: ClerkLike | null) {
    this.clerkRef = clerk;
  }

  /**
   * Get a fresh Clerk session JWT. Used when calling Netlify Functions.
   */
  async getAccessToken(): Promise<string | null> {
    return (await this.clerkRef?.session?.getToken()) ?? null;
  }

  /**
   * Return a shape compatible with the old Supabase Session consumers.
   */
  async getSession(): Promise<{ access_token: string; user: { id: string; email: string } } | null> {
    const token = await this.getAccessToken();
    const user = this.clerkRef?.user;
    if (!token || !user) return null;
    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
      },
    };
  }

  /**
   * Sign the caller out of Clerk.
   */
  async signOut(): Promise<AuthResult> {
    await this.clerkRef?.signOut();
    return { success: true };
  }
}

export const auth = new AuthService();
