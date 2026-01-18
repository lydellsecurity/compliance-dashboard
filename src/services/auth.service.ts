/**
 * ============================================================================
 * SUPABASE AUTH SERVICE
 * ============================================================================
 *
 * Handles authentication for the Compliance Engine.
 * Includes rate limiting, input validation, and audit logging.
 */

import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { rateLimiter, RateLimitError } from '../utils/rateLimiter';
import { isValidEmail, validatePassword, sanitizeEmail } from '../utils/validation';
import { auditLog } from './audit-log.service';
import { evidenceRepository } from './evidence-repository.service';

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

    // Rate limiting
    const rateCheck = rateLimiter.checkLimit('auth', data.email);
    if (!rateCheck.allowed) {
      auditLog.security.rateLimited('signup', data.email);
      throw new RateLimitError(rateCheck.message || 'Too many signup attempts', rateCheck.retryAfter || 0);
    }

    // Input validation
    const email = sanitizeEmail(data.email);
    if (!isValidEmail(email)) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.error };
    }

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          organization_name: data.organizationName,
        },
      },
    });

    if (error) {
      auditLog.auth.loginFailed(email, error.message);
      return { success: false, error: error.message };
    }

    auditLog.log('user.created', `New user signed up: ${email}`, {
      metadata: { organizationName: data.organizationName },
    });

    return {
      success: true,
      user: authData.user || undefined,
      session: authData.session || undefined,
    };
  }

  /**
   * Sign in with email and password
   */
  async signIn(data: SignInData): Promise<AuthResult> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    // Rate limiting - stricter for login attempts
    const rateCheck = rateLimiter.checkLimit('auth', data.email);
    if (!rateCheck.allowed) {
      auditLog.security.rateLimited('login', data.email);
      throw new RateLimitError(rateCheck.message || 'Too many login attempts', rateCheck.retryAfter || 0);
    }

    // Input validation
    const email = sanitizeEmail(data.email);
    if (!isValidEmail(email)) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (error) {
      auditLog.auth.loginFailed(email, error.message);
      return { success: false, error: error.message };
    }

    // Set audit log context for future logs
    auditLog.setContext(authData.user.id, email, authData.user.user_metadata?.organization_id);
    auditLog.auth.login(email);

    return {
      success: true,
      user: authData.user,
      session: authData.session,
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

    // Get current user email for audit log before signing out
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData?.user?.email || 'unknown';

    const { error } = await supabase.auth.signOut();

    if (error) return { success: false, error: error.message };

    auditLog.auth.logout(userEmail);
    auditLog.clearContext();
    evidenceRepository.clearContext();

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

    // Rate limiting for password reset
    const rateCheck = rateLimiter.checkLimit('auth', email);
    if (!rateCheck.allowed) {
      auditLog.security.rateLimited('password_reset', email);
      throw new RateLimitError(rateCheck.message || 'Too many reset attempts', rateCheck.retryAfter || 0);
    }

    const sanitizedEmail = sanitizeEmail(email);
    if (!isValidEmail(sanitizedEmail)) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) return { success: false, error: error.message };

    auditLog.auth.passwordReset(sanitizedEmail);

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
