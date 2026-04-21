/**
 * ============================================================================
 * USE AUTH HOOK (Clerk-backed)
 * ============================================================================
 *
 * Thin compatibility layer over Clerk's hooks. Exposes the same surface the
 * rest of the app was using under Supabase Auth so callers don't have to be
 * touched: `user`, `loading`, `signIn/signUp/signOut`, etc.
 *
 * Notes:
 *   - `user.user_metadata` is empty here — org membership lives in the DB
 *     (organization_members). Use `useOrganization()` to access the caller's
 *     current org, not user_metadata.
 *   - signIn/signUp return a boolean; they use Clerk's `useSignIn()` /
 *     `useSignUp()` imperatively. Most callers should prefer Clerk's
 *     `<SignIn>` / `<SignUp>` components for a full OAuth + MFA UX.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useMemo,
  useRef,
} from 'react';
import {
  useAuth as useClerkAuth,
  useUser as useClerkUser,
  useSignIn,
  useSignUp,
  useClerk,
} from '@clerk/clerk-react';
import { db } from '../services/database.service';

// ============================================================================
// TYPES (shaped to match the previous Supabase User for drop-in compat)
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  session: null; // legacy — Clerk owns session state internally
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
  const { isLoaded: clerkAuthLoaded, isSignedIn } = useClerkAuth();
  const { isLoaded: userLoaded, user: clerkUser } = useClerkUser();
  const { signIn: clerkSignIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp: clerkSignUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();
  const clerk = useClerk();
  const [error, setError] = useState<string | null>(null);
  // Track a pending org name captured from the signup form. We can't create
  // the org until the user is signed in (their Clerk id is what gets written
  // to organization_members), so we stash it and let OrganizationContext pick
  // it up via sessionStorage.
  const pendingOrgNameRef = useRef<string | null>(null);

  const loading = !clerkAuthLoaded || !userLoaded;

  const user: AuthUser | null = useMemo(() => {
    if (!isSignedIn || !clerkUser) return null;
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ||
      clerkUser.emailAddresses[0]?.emailAddress ||
      '';
    return {
      id: clerkUser.id,
      email,
      user_metadata: {
        full_name: clerkUser.fullName || undefined,
        avatar_url: clerkUser.imageUrl || undefined,
      },
    };
  }, [isSignedIn, clerkUser]);

  // Keep database service's tenant/user context in sync.
  useEffect(() => {
    if (user) {
      db.setUser(user.id);
    }
  }, [user]);

  const clearError = useCallback(() => setError(null), []);

  // --------------------------------------------------------------------------
  // Programmatic auth (used by AuthScreen — optional, Clerk's built-in <SignIn>
  // component is usually preferable).
  // --------------------------------------------------------------------------

  const signIn = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      if (!signInLoaded || !clerkSignIn) return false;
      setError(null);
      try {
        const result = await clerkSignIn.create({ identifier: email, password });
        if (result.status === 'complete') {
          await setActiveSignIn({ session: result.createdSessionId });
          return true;
        }
        setError('Additional verification required. Check your email.');
        return false;
      } catch (err) {
        setError(extractClerkError(err));
        return false;
      }
    },
    [signInLoaded, clerkSignIn, setActiveSignIn]
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string, orgName?: string): Promise<boolean> => {
      if (!signUpLoaded || !clerkSignUp) return false;
      setError(null);
      try {
        const [firstName, ...rest] = (fullName || '').split(' ');
        const lastName = rest.join(' ') || undefined;
        const result = await clerkSignUp.create({
          emailAddress: email,
          password,
          firstName: firstName || undefined,
          lastName,
        });

        // Stash the org name so OrganizationContext can create it on first load.
        if (orgName) {
          try {
            sessionStorage.setItem('pending_org_name', orgName);
          } catch {
            /* storage unavailable in incognito — fall through */
          }
          pendingOrgNameRef.current = orgName;
        }

        if (result.status === 'complete') {
          await setActiveSignUp({ session: result.createdSessionId });
          return true;
        }

        // Email verification pending — Clerk sent a code.
        await clerkSignUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setError('Check your email to confirm your account.');
        return true;
      } catch (err) {
        setError(extractClerkError(err));
        return false;
      }
    },
    [signUpLoaded, clerkSignUp, setActiveSignUp]
  );

  const startOAuth = useCallback(
    async (strategy: 'oauth_google' | 'oauth_github'): Promise<boolean> => {
      if (!signInLoaded || !clerkSignIn) return false;
      setError(null);
      try {
        await clerkSignIn.authenticateWithRedirect({
          strategy,
          redirectUrl: `${window.location.origin}/sso-callback`,
          redirectUrlComplete: `${window.location.origin}/app`,
        });
        return true;
      } catch (err) {
        setError(extractClerkError(err));
        return false;
      }
    },
    [signInLoaded, clerkSignIn]
  );

  const signInWithGoogle = useCallback(() => startOAuth('oauth_google'), [startOAuth]);
  const signInWithGitHub = useCallback(() => startOAuth('oauth_github'), [startOAuth]);

  const signOut = useCallback(async () => {
    await clerk.signOut();
  }, [clerk]);

  const resetPassword = useCallback(
    async (email: string): Promise<boolean> => {
      if (!signInLoaded || !clerkSignIn) return false;
      setError(null);
      try {
        await clerkSignIn.create({
          strategy: 'reset_password_email_code',
          identifier: email,
        });
        return true;
      } catch (err) {
        setError(extractClerkError(err));
        return false;
      }
    },
    [signInLoaded, clerkSignIn]
  );

  const value: AuthContextType = {
    user,
    session: null,
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

// ============================================================================
// HELPERS
// ============================================================================

function extractClerkError(err: unknown): string {
  // Clerk errors come through as { errors: [{ longMessage, message, code }] }
  if (err && typeof err === 'object' && 'errors' in err) {
    const errors = (err as { errors?: Array<{ longMessage?: string; message?: string }> }).errors;
    if (errors?.[0]) return errors[0].longMessage || errors[0].message || 'Authentication failed';
  }
  if (err instanceof Error) return err.message;
  return 'Authentication failed';
}

export { AuthContext };
