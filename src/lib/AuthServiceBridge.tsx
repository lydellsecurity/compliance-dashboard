/**
 * Bridges Clerk's React context into our imperative auth service so
 * non-React modules (e.g. fetch-wrappers inside services/) can still grab a
 * fresh token without needing to plumb Clerk hooks everywhere.
 */

import { useEffect } from 'react';
import { useClerk, useSession, useUser } from '@clerk/clerk-react';
import { auth } from '../services/auth.service';

export const AuthServiceBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const clerk = useClerk();
  const { session } = useSession();
  const { user } = useUser();

  useEffect(() => {
    auth.attachClerk({
      signOut: () => clerk.signOut(),
      user: user
        ? { id: user.id, primaryEmailAddress: user.primaryEmailAddress || null }
        : null,
      session: session ? { getToken: () => session.getToken() } : null,
    });

    return () => auth.attachClerk(null);
  }, [clerk, session, user]);

  return <>{children}</>;
};
