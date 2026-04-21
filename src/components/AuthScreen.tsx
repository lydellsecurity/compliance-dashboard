/**
 * ============================================================================
 * AUTH SCREEN COMPONENT (Clerk)
 * ============================================================================
 *
 * Hosts Clerk's prebuilt <SignIn /> / <SignUp /> components inside our
 * branded shell. Preserves the pending-plan acknowledgement chip so users
 * coming from the landing-page pricing CTA keep their context.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { Shield, Sparkles } from 'lucide-react';
import { capturePendingCheckoutFromUrl, type PendingCheckout } from '../lib/pendingCheckout';
import { PLAN_DISPLAY } from '../constants/billing';

const AuthScreen: React.FC = () => {
  const location = useLocation();
  const mode: 'signin' | 'signup' = location.pathname.startsWith('/signup') ? 'signup' : 'signin';
  const [pendingPlan, setPendingPlan] = useState<PendingCheckout | null>(null);

  // Force light mode for auth screen (matches the previous visual language).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('light');
    root.classList.remove('dark');
  }, []);

  // Capture `?plan=<tier>&interval=<cycle>` — set by pricing CTAs.
  useEffect(() => {
    const captured = capturePendingCheckoutFromUrl();
    if (captured) setPendingPlan(captured);
  }, []);

  // Build the post-auth redirect URL. We carry the plan/interval in the query
  // string so the intent survives Clerk's email-verification round-trips (which
  // can land on a fresh URL without the original params) and localStorage
  // constraints (Safari / incognito / blocked third-party). The app root
  // (`usePendingCheckout`) prefers URL params over localStorage if both are
  // present.
  const afterAuthUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    const interval = params.get('interval');
    if (!plan || !interval) return '/app';
    return `/app?plan=${encodeURIComponent(plan)}&interval=${encodeURIComponent(interval)}`;
  }, []);

  const subtitle = mode === 'signup' ? 'Create your account' : 'Sign in to your account';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 via-violet-500 to-purple-500 rounded-2xl shadow-lg shadow-violet-500/30 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Engine</h1>
          <p className="text-slate-500 mt-1">{subtitle}</p>
        </div>

        {pendingPlan && (
          <div className="mb-5 p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" aria-hidden />
            </div>
            <div className="text-sm">
              <p className="font-semibold text-slate-900">
                {PLAN_DISPLAY[pendingPlan.plan].name} plan selected
              </p>
              <p className="text-slate-600 text-xs mt-0.5">
                {mode === 'signup'
                  ? "We'll take you to checkout right after you verify your email."
                  : "Sign in and we'll take you straight to checkout."}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          {mode === 'signup' ? (
            <SignUp
              routing="path"
              path="/signup"
              signInUrl="/login"
              afterSignUpUrl={afterAuthUrl}
              afterSignInUrl={afterAuthUrl}
            />
          ) : (
            <SignIn
              routing="path"
              path="/login"
              signUpUrl="/signup"
              afterSignInUrl={afterAuthUrl}
              afterSignUpUrl={afterAuthUrl}
            />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
};

export default AuthScreen;
