/**
 * ============================================================================
 * APP WITH AUTH WRAPPER
 * ============================================================================
 * 
 * Wraps the main App component with authentication.
 * Shows login screen if not authenticated, otherwise shows the app.
 */

import React from 'react';
import { useAuth } from './hooks/useAuth';
import App from './App';
import AuthScreen from './components/AuthScreen';
import { Shield, Loader2 } from 'lucide-react';

const AppWithAuth: React.FC = () => {
  const { user, loading } = useAuth();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 via-violet-500 to-purple-500 rounded-2xl shadow-lg shadow-violet-500/30 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center gap-2 text-white">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!user) {
    return <AuthScreen />;
  }

  // Authenticated - show app
  return <App />;
};

export default AppWithAuth;
