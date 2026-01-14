/**
 * ============================================================================
 * SUPABASE AUTH SERVICE
 * ============================================================================
 * 
 * Handles authentication for the Compliance Engine.
 */

import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// ============================================================================
// TYPES
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

class AuthService {
  
  /**
   * Sign up a new user
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          organization_name: data.organizationName,
        }
      }
    });

    if (error) return { success: false, error: error.message };
    
    return { 
      success: true, 
      user: authData.user || undefined,
      session: authData.session || undefined
    };
  }

  /**
   * Sign in with email and password
   */
  async signIn(data: SignInData): Promise<AuthResult> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) return { success: false, error: error.message };

    return { 
      success: true, 
      user: authData.user,
      session: authData.session
    };
  }

  /**
   * Sign in with OAuth provider (Google, GitHub, etc.)
   */
  async signInWithProvider(provider: 'google' | 'github'): Promise<AuthResult> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) return { success: false, error: error.message };

    // OAuth redirects, so we won't have data here
    return { success: true };
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<AuthResult> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    const { error } = await supabase.auth.signOut();

    if (error) return { success: false, error: error.message };

    return { success: true };
  }

  /**
   * Get the current session
   */
  async getSession(): Promise<Session | null> {
    if (!supabase) return null;

    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  /**
   * Get the current user
   */
  async getUser(): Promise<User | null> {
    if (!supabase) return null;

    const { data } = await supabase.auth.getUser();
    return data.user;
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<AuthResult> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) return { success: false, error: error.message };

    return { success: true };
  }

  /**
   * Update password (after reset)
   */
  async updatePassword(newPassword: string): Promise<AuthResult> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) return { success: false, error: error.message };

    return { success: true, user: data.user };
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
    if (!supabase) return { unsubscribe: () => {} };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        callback(session?.user || null, session);
      }
    );

    return { unsubscribe: () => subscription.unsubscribe() };
  }
}

export const auth = new AuthService();
