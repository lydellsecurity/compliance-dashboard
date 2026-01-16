/**
 * ============================================================================
 * APP WITH AUTH WRAPPER
 * ============================================================================
 *
 * Wraps the main App component with authentication.
 * Shows landing page by default, login screen on demand, or the app if authenticated.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import App from './App';
import AuthScreen from './components/AuthScreen';
import LandingPage from './components/LandingPage';
import { Shield, Loader2 } from 'lucide-react';

// Check for URL hash to determine initial view
const getInitialView = (): 'landing' | 'auth' | 'app' => {
  const hash = window.location.hash;
  if (hash === '#login' || hash === '#signup') return 'auth';
  if (hash === '#app') return 'app';
  return 'landing';
};

const AppWithAuth: React.FC = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState<'landing' | 'auth' | 'app'>(getInitialView());

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#login' || hash === '#signup') {
        setView('auth');
      } else if (hash === '#app') {
        setView('app');
      } else if (hash === '' || hash === '#') {
        setView('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // If user is authenticated, always show app
  useEffect(() => {
    if (user && !loading) {
      setView('app');
    }
  }, [user, loading]);

  // Loading state
  if (loading) {
    return (
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
  }

  // Show landing page
  if (view === 'landing' && !user) {
    return <LandingPage />;
  }

  // Show auth screen
  if (view === 'auth' && !user) {
    return <AuthScreen />;
  }

  // Not authenticated but trying to access app - show auth
  if (!user) {
    return <AuthScreen />;
  }

  // Authenticated - show app
  return <App />;
};

export default AppWithAuth;
