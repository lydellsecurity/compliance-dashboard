/**
 * Installs the current Clerk session's token getter into the Supabase client so
 * RLS policies can read the Clerk user id from the JWT on every request.
 *
 * Clerk's native Supabase integration: supabase-js calls our accessToken
 * function, gets a freshly-minted Clerk session token, and sends it as the
 * Authorization header. Supabase verifies it because Clerk is configured as a
 * Third-Party Auth provider in the Supabase dashboard.
 */

import { useEffect } from 'react';
import { useSession } from '@clerk/clerk-react';
import { setSupabaseTokenGetter } from './supabase';

export const ClerkSupabaseBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useSession();

  useEffect(() => {
    if (!session) {
      setSupabaseTokenGetter(null);
      return;
    }

    // Clerk rotates tokens automatically; calling getToken() each request
    // returns a fresh JWT when the cached one is near expiry.
    setSupabaseTokenGetter(() => session.getToken());

    return () => setSupabaseTokenGetter(null);
  }, [session]);

  return <>{children}</>;
};
