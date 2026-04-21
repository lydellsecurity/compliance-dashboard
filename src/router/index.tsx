/**
 * React Router Configuration
 *
 * Defines all application routes including:
 * - Public routes (landing, login, signup)
 * - Protected routes (app)
 * - Public Trust Center with token validation
 * - Team invite acceptance
 *
 * Auth: Clerk + Supabase. Clerk owns session; Supabase validates Clerk JWTs
 * via Third-Party Auth and enforces org-scoped RLS. The provider tree is:
 *
 *   ClerkProvider
 *     └── ClerkSupabaseBridge   (installs token getter into supabase-js)
 *           └── AuthServiceBridge (imperative token fetch for non-React modules)
 *                 └── AuthProvider   (compat-shim over useClerkAuth/useUser)
 *                       └── [OrganizationProvider for app routes]
 */

import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { OrganizationProvider } from '../contexts/OrganizationContext';
import { ToastProvider, ErrorBoundary } from '../components/ui';
import { ClerkSupabaseBridge } from '../lib/ClerkSupabaseBridge';
import { AuthServiceBridge } from '../lib/AuthServiceBridge';
import { Shield, Loader2 } from 'lucide-react';

// Lazy load components for better performance
const LandingPage = lazy(() => import('../components/LandingPage'));
const AuthScreen = lazy(() => import('../components/AuthScreen'));
const App = lazy(() => import('../App'));
const PublicTrustCenter = lazy(() => import('../components/PublicTrustCenter'));
const InviteAcceptPage = lazy(() => import('../components/InviteAcceptPage'));
const AuditorPortalPage = lazy(() => import('../pages/AuditorPortalPage'));
const IntegrationCallback = lazy(() => import('../components/IntegrationCallback'));

// Loading component
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 via-violet-500 to-purple-500 rounded-2xl shadow-lg shadow-violet-500/30 mb-4">
        <Shield className="w-8 h-8 text-white" />
      </div>
      <div className="flex items-center gap-2 text-slate-700 dark:text-white">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading...</span>
      </div>
    </div>
  </div>
);

// Guard: only allow signed-in callers. Clerk drives the check.
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/login" replace />
      </SignedOut>
    </>
  );
};

// Guard: only show public screens to signed-out callers. Preserves the
// `?plan=&interval=` params that pricing CTAs set, so a signed-in user who
// clicks "Subscribe" on the landing page (or a shared link) still ends up
// at Stripe Checkout via usePendingCheckout.
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return (
    <>
      <SignedOut>{children}</SignedOut>
      <SignedIn>
        <PreservingAppRedirect />
      </SignedIn>
    </>
  );
};

// Redirects to /app carrying any pricing-intent query params forward.
const PreservingAppRedirect: React.FC = () => {
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const params = new URLSearchParams(search);
  const plan = params.get('plan');
  const interval = params.get('interval');
  const target =
    plan && interval
      ? `/app?plan=${encodeURIComponent(plan)}&interval=${encodeURIComponent(interval)}`
      : '/app';
  return <Navigate to={target} replace />;
};

// Clerk publishable key — required, fail fast if missing.
const CLERK_PUBLISHABLE_KEY = (import.meta as any).env.VITE_CLERK_PUBLISHABLE_KEY;
if (!CLERK_PUBLISHABLE_KEY) {
  console.error('VITE_CLERK_PUBLISHABLE_KEY is not set. Auth will not work.');
}

// Root layout with all providers wired in dependency order.
const RootLayout: React.FC = () => {
  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY || 'pk_test_placeholder'}>
        <ClerkSupabaseBridge>
          <AuthServiceBridge>
            <AuthProvider>
              <OrganizationProvider>
                <ToastProvider>
                  <Suspense fallback={<LoadingScreen />}>
                    <ErrorBoundary>
                      <Outlet />
                    </ErrorBoundary>
                  </Suspense>
                </ToastProvider>
              </OrganizationProvider>
            </AuthProvider>
          </AuthServiceBridge>
        </ClerkSupabaseBridge>
      </ClerkProvider>
    </ErrorBoundary>
  );
};

// Public layout (no OrganizationProvider — Trust Center, invites).
const PublicLayout: React.FC = () => {
  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY || 'pk_test_placeholder'}>
        <ClerkSupabaseBridge>
          <AuthServiceBridge>
            <AuthProvider>
              <ToastProvider>
                <Suspense fallback={<LoadingScreen />}>
                  <ErrorBoundary>
                    <Outlet />
                  </ErrorBoundary>
                </Suspense>
              </ToastProvider>
            </AuthProvider>
          </AuthServiceBridge>
        </ClerkSupabaseBridge>
      </ClerkProvider>
    </ErrorBoundary>
  );
};

// OAuth callback target — Clerk completes the redirect flow here.
const SSOCallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <AuthenticateWithRedirectCallback />
  </div>
);

// Router configuration
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // Landing page (public)
      {
        index: true,
        element: (
          <PublicOnlyRoute>
            <LandingPage />
          </PublicOnlyRoute>
        ),
      },
      // Auth routes — Clerk's <SignIn>/<SignUp> handle subpaths like /login/factor-one.
      {
        path: 'login/*',
        element: (
          <PublicOnlyRoute>
            <AuthScreen />
          </PublicOnlyRoute>
        ),
      },
      {
        path: 'signup/*',
        element: (
          <PublicOnlyRoute>
            <AuthScreen />
          </PublicOnlyRoute>
        ),
      },
      {
        path: 'sso-callback',
        element: <SSOCallback />,
      },
      // Protected app
      {
        path: 'app',
        element: (
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        ),
      },
      {
        path: 'app/*',
        element: (
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        ),
      },
      // OAuth Integration Callback (requires authentication)
      {
        path: 'integrations/callback',
        element: (
          <ProtectedRoute>
            <IntegrationCallback />
          </ProtectedRoute>
        ),
      },
    ],
  },
  // Public Trust Center (token-protected, no auth required)
  {
    path: '/trust/:slug',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <PublicTrustCenter />,
      },
    ],
  },
  // Team invite acceptance
  {
    path: '/invite/:token',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <InviteAcceptPage />,
      },
    ],
  },
  // Auditor Portal (token-protected, no auth required)
  {
    path: '/auditor-portal/:token',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <AuditorPortalPage />,
      },
    ],
  },
  // Catch-all redirect
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
