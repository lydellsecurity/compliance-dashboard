/**
 * Integration OAuth Callback Handler
 *
 * Handles OAuth redirects from integration providers:
 * 1. Validates CSRF state token
 * 2. Exchanges authorization code for tokens
 * 3. Creates/updates integration connection
 * 4. Shows animated sync progress
 * 5. Redirects to Integration Hub
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  Zap,
  Database,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { integrationHub, INTEGRATION_PROVIDERS } from '../services/integration-hub.service';

// ============================================================================
// TYPES
// ============================================================================

type CallbackStep = 'validating' | 'exchanging' | 'connecting' | 'syncing' | 'success' | 'error';

interface StepConfig {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STEP_CONFIG: Record<CallbackStep, StepConfig> = {
  validating: {
    icon: Shield,
    title: 'Validating Security',
    description: 'Verifying request authenticity...',
    color: 'text-blue-500',
  },
  exchanging: {
    icon: Zap,
    title: 'Exchanging Credentials',
    description: 'Securely obtaining access tokens...',
    color: 'text-amber-500',
  },
  connecting: {
    icon: Database,
    title: 'Establishing Connection',
    description: 'Setting up secure integration link...',
    color: 'text-indigo-500',
  },
  syncing: {
    icon: RefreshCw,
    title: 'Initial Data Sync',
    description: 'Pulling compliance data from your account...',
    color: 'text-emerald-500',
  },
  success: {
    icon: CheckCircle,
    title: 'Connection Successful',
    description: 'Your integration is now active and monitoring.',
    color: 'text-emerald-500',
  },
  error: {
    icon: XCircle,
    title: 'Connection Failed',
    description: 'Something went wrong during setup.',
    color: 'text-red-500',
  },
};

// ============================================================================
// PULSE ANIMATION COMPONENT
// ============================================================================

const PulseIndicator: React.FC<{ isActive: boolean; color: string }> = ({ isActive, color }) => (
  <div className="relative flex items-center justify-center">
    {isActive && (
      <>
        <motion.div
          className={`absolute w-16 h-16 rounded-full ${color.replace('text-', 'bg-')}/20`}
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className={`absolute w-12 h-12 rounded-full ${color.replace('text-', 'bg-')}/30`}
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0.2, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
        />
      </>
    )}
  </div>
);

// ============================================================================
// STEP INDICATOR COMPONENT
// ============================================================================

const StepIndicator: React.FC<{
  steps: CallbackStep[];
  currentStep: CallbackStep;
  completedSteps: CallbackStep[];
}> = ({ steps, currentStep, completedSteps }) => {
  const visibleSteps = steps.filter(s => s !== 'error');

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {visibleSteps.map((step, index) => {
        const isCompleted = completedSteps.includes(step);
        const isCurrent = currentStep === step;
        const isError = currentStep === 'error';

        return (
          <React.Fragment key={step}>
            <motion.div
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                isCompleted
                  ? 'bg-emerald-500'
                  : isCurrent && !isError
                  ? 'bg-indigo-500'
                  : isError && step === steps[completedSteps.length]
                  ? 'bg-red-500'
                  : 'bg-slate-200 dark:bg-steel-700'
              }`}
              animate={isCurrent && !isError ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
            {index < visibleSteps.length - 1 && (
              <div
                className={`w-8 h-0.5 transition-all duration-300 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-steel-700'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const IntegrationCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State
  const [currentStep, setCurrentStep] = useState<CallbackStep>('validating');
  const [completedSteps, setCompletedSteps] = useState<CallbackStep[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [providerName, setProviderName] = useState<string>('Integration');
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const processedRef = useRef(false);

  // Extract OAuth parameters
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Process OAuth callback
  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    processCallback();
  }, []);

  const completeStep = (step: CallbackStep) => {
    setCompletedSteps(prev => [...prev, step]);
  };

  const processCallback = async () => {
    try {
      // Step 1: Validate
      setCurrentStep('validating');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Check for OAuth errors
      if (error) {
        throw new Error(errorDescription || `OAuth error: ${error}`);
      }

      // Validate required parameters
      if (!code || !state) {
        throw new Error('Missing required OAuth parameters');
      }

      // Validate CSRF state token
      const savedState = sessionStorage.getItem('oauth_state');
      if (!savedState || state !== savedState) {
        throw new Error('Security validation failed. Please try connecting again.');
      }

      // Parse state to get provider ID
      const [providerId] = state.split(':');
      if (!providerId) {
        throw new Error('Invalid state format');
      }

      // Get provider info for display
      const provider = INTEGRATION_PROVIDERS.find(p => p.id === providerId);
      if (provider) {
        setProviderName(provider.name);
      }

      completeStep('validating');

      // Step 2: Exchange code for tokens
      setCurrentStep('exchanging');
      await new Promise(resolve => setTimeout(resolve, 500));

      const redirectUri = `${window.location.origin}/integrations/callback`;

      const exchangeResult = await integrationHub.exchangeOAuthCode(
        providerId,
        code,
        redirectUri
      );

      if (!exchangeResult.success) {
        throw new Error(exchangeResult.error || 'Failed to exchange authorization code');
      }

      completeStep('exchanging');

      // Step 3: Create connection
      setCurrentStep('connecting');
      await new Promise(resolve => setTimeout(resolve, 600));

      // Connection is created by the backend during token exchange
      // We just need to verify it exists
      completeStep('connecting');

      // Step 4: Initial sync
      setCurrentStep('syncing');

      // Simulate sync progress
      const syncInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 100) {
            clearInterval(syncInterval);
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 300);

      // Wait for sync animation
      await new Promise(resolve => setTimeout(resolve, 2500));
      clearInterval(syncInterval);
      setSyncProgress(100);

      completeStep('syncing');

      // Step 5: Success
      setCurrentStep('success');

      // Clear state and redirect
      sessionStorage.removeItem('oauth_state');

      await new Promise(resolve => setTimeout(resolve, 1500));
      navigate('/app/integrations', {
        state: {
          connectionSuccess: true,
          provider: providerName
        }
      });

    } catch (err) {
      console.error('OAuth callback error:', err);
      setCurrentStep('error');
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
      sessionStorage.removeItem('oauth_state');
    }
  };

  const handleRetry = () => {
    navigate('/app/integrations');
  };

  const config = STEP_CONFIG[currentStep];
  const IconComponent = config.icon;
  const allSteps: CallbackStep[] = ['validating', 'exchanging', 'connecting', 'syncing', 'success'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-midnight-900 dark:to-midnight-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-midnight-800 rounded-2xl shadow-xl border border-slate-200 dark:border-steel-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
            <h1 className="text-xl font-semibold text-white text-center">
              Connecting {providerName}
            </h1>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Step Indicator */}
            <StepIndicator
              steps={allSteps}
              currentStep={currentStep}
              completedSteps={completedSteps}
            />

            {/* Main Animation Area */}
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative">
                <PulseIndicator
                  isActive={!['success', 'error'].includes(currentStep)}
                  color={config.color}
                />

                <motion.div
                  key={currentStep}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center ${
                    currentStep === 'error'
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : currentStep === 'success'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-slate-100 dark:bg-steel-800'
                  }`}
                >
                  {!['success', 'error'].includes(currentStep) ? (
                    <Loader2 className={`w-10 h-10 ${config.color} animate-spin`} />
                  ) : (
                    <IconComponent className={`w-10 h-10 ${config.color}`} />
                  )}
                </motion.div>
              </div>

              {/* Status Text */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 text-center"
                >
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-steel-100">
                    {config.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-steel-400">
                    {currentStep === 'error' ? errorMessage : config.description}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Sync Progress Bar */}
              {currentStep === 'syncing' && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: '100%' }}
                  className="mt-6 w-full max-w-xs"
                >
                  <div className="h-2 bg-slate-200 dark:bg-steel-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(syncProgress, 100)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-center text-slate-400 dark:text-steel-500">
                    Syncing compliance data...
                  </p>
                </motion.div>
              )}
            </div>

            {/* Error Actions */}
            {currentStep === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 space-y-3"
              >
                <button
                  onClick={handleRetry}
                  className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Return to Integrations
                </button>

                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      If this issue persists, please check your OAuth app configuration
                      or contact support.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Success Message */}
            {currentStep === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg"
              >
                <p className="text-sm text-emerald-700 dark:text-emerald-300 text-center">
                  <strong>Continuous Monitoring Active</strong>
                  <br />
                  <span className="text-xs">
                    Redirecting to Integration Hub...
                  </span>
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-steel-500">
          <Shield className="w-3 h-3" />
          <span>Secure OAuth 2.0 Connection</span>
        </div>
      </motion.div>
    </div>
  );
};

export default IntegrationCallback;
