/**
 * ============================================================================
 * USE AUTH HOOK
 * ============================================================================
 * 
 * React hook for managing authentication state.
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { auth } from '../services/auth.service';
import { db } from '../services/database.service';

// ============================================================================
// TYPES
// ============================================================================

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, fullName?: string, orgName?: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signInWithGitHub: () => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  clearError: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextType | null>(null);

// ============================================================================
// HOOK
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentSession = await auth.getSession();
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Set user context in database service
          db.setUser(currentSession.user.id);
          
          // Get organization from user metadata or profile
          const orgId = currentSession.user.user_metadata?.organization_id;
          if (orgId) {
            db.setOrganization(orgId);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth changes
    const { unsubscribe } = auth.onAuthStateChange((newUser, newSession) => {
      setUser(newUser);
      setSession(newSession);
      
      if (newUser) {
        db.setUser(newUser.id);
        const orgId = newUser.user_metadata?.organization_id;
        if (orgId) {
          db.setOrganization(orgId);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Sign up
  const signUp = useCallback(async (
    email: string, 
    password: string, 
    fullName?: string,
    orgName?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    const result = await auth.signUp({ email, password, fullName, organizationName: orgName });
    
    setLoading(false);
    
    if (!result.success) {
      setError(result.error || 'Sign up failed');
      return false;
    }

    if (result.user) {
      setUser(result.user);
    }
    if (result.session) {
      setSession(result.session);
    }

    return true;
  }, []);

  // Sign in
  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    const result = await auth.signIn({ email, password });
    
    setLoading(false);
    
    if (!result.success) {
      setError(result.error || 'Sign in failed');
      return false;
    }

    if (result.user) {
      setUser(result.user);
      db.setUser(result.user.id);
    }
    if (result.session) {
      setSession(result.session);
    }

    return true;
  }, []);

  // Sign in with Google
  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    const result = await auth.signInWithProvider('google');
    
    if (!result.success) {
      setLoading(false);
      setError(result.error || 'Google sign in failed');
      return false;
    }

    // OAuth redirects, loading state will be reset on return
    return true;
  }, []);

  // Sign in with GitHub
  const signInWithGitHub = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    const result = await auth.signInWithProvider('github');
    
    if (!result.success) {
      setLoading(false);
      setError(result.error || 'GitHub sign in failed');
      return false;
    }

    // OAuth redirects, loading state will be reset on return
    return true;
  }, []);

  // Sign out
  const signOut = useCallback(async (): Promise<void> => {
    setLoading(true);
    
    await auth.signOut();
    
    setUser(null);
    setSession(null);
    setLoading(false);
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    const result = await auth.resetPassword(email);
    
    setLoading(false);
    
    if (!result.success) {
      setError(result.error || 'Password reset failed');
      return false;
    }

    return true;
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithGitHub,
    signOut,
    resetPassword,
    clearError,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export { AuthContext };
