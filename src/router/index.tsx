/**
 * React Router Configuration
 *
 * Defines all application routes including:
 * - Public routes (landing, login, signup)
 * - Protected routes (app)
 * - Public Trust Center with token validation
 * - Team invite acceptance
 */

import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { OrganizationProvider } from '../contexts/OrganizationContext';
import { ToastProvider } from '../components/ui';
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

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public route wrapper (redirects to app if already logged in)
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

// Root layout with providers
const RootLayout: React.FC = () => {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <ToastProvider>
          <Suspense fallback={<LoadingScreen />}>
            <Outlet />
          </Suspense>
        </ToastProvider>
      </OrganizationProvider>
    </AuthProvider>
  );
};

// Public layout without organization provider (for Trust Center, invites)
const PublicLayout: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  );
};

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
      // Auth routes
      {
        path: 'login',
        element: (
          <PublicOnlyRoute>
            <AuthScreen />
          </PublicOnlyRoute>
        ),
      },
      {
        path: 'signup',
        element: (
          <PublicOnlyRoute>
            <AuthScreen />
          </PublicOnlyRoute>
        ),
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
