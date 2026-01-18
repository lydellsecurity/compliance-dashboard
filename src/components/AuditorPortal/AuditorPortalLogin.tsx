/**
 * Auditor Portal Login
 *
 * Password-protected entry point for external auditors.
 * Validates token and optional password before granting access.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, ArrowRight, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

interface AuditorPortalLoginProps {
  token: string;
  organizationName?: string;
  organizationLogo?: string;
  requiresPassword: boolean;
  onAuthenticate: (password?: string) => Promise<{ success: boolean; error?: string }>;
}

const AuditorPortalLogin: React.FC<AuditorPortalLoginProps> = ({
  token: _token,
  organizationName,
  organizationLogo,
  requiresPassword,
  onAuthenticate,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await onAuthenticate(requiresPassword ? password : undefined);
      if (!result.success) {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-steel-900 dark:to-steel-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white dark:bg-steel-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-steel-700">
          {/* Header with branding */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-8 text-center">
            {organizationLogo ? (
              <img
                src={organizationLogo}
                alt={organizationName || 'Organization'}
                className="h-12 mx-auto mb-4 object-contain filter brightness-0 invert"
              />
            ) : (
              <div className="w-16 h-16 bg-white/20 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
            )}
            <h1 className="text-xl font-bold text-white">
              {organizationName || 'Compliance'} Audit Portal
            </h1>
            <p className="text-indigo-200 text-sm mt-1">
              Secure Auditor Verification Access
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Info */}
            <div className="bg-slate-50 dark:bg-steel-750 rounded-lg p-4 border border-slate-200 dark:border-steel-600">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-slate-600 dark:text-steel-400">
                  <p className="font-medium text-slate-800 dark:text-steel-200 mb-1">
                    Read-Only Access
                  </p>
                  <p>
                    This portal provides auditors with read-only access to view compliance controls,
                    evidence artifacts, and framework requirements.
                  </p>
                </div>
              </div>
            </div>

            {/* Password field (if required) */}
            {requiresPassword && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
                  Access Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your access password"
                    className="w-full pl-10 pr-10 py-3 bg-white dark:bg-steel-700 border border-slate-200 dark:border-steel-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || (requiresPassword && !password)}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying Access...
                </>
              ) : (
                <>
                  Enter Audit Portal
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="px-8 py-4 bg-slate-50 dark:bg-steel-750 border-t border-slate-200 dark:border-steel-700 text-center">
            <p className="text-xs text-slate-500 dark:text-steel-400">
              Access is logged and monitored for security purposes.
              <br />
              Contact your account administrator if you need assistance.
            </p>
          </div>
        </div>

        {/* Branding footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500 dark:text-steel-500">
            Powered by <span className="font-semibold">Lydell Security</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuditorPortalLogin;
