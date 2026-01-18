/**
 * Onboarding Wizard Component
 *
 * First-run experience that asks 5 simple questions to auto-configure
 * the dashboard with relevant compliance frameworks.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Heart,
  CreditCard,
  Globe,
  Users,
  ChevronLeft,
  Check,
  Sparkles,
  Shield,
  ArrowRight,
} from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: (config: OnboardingConfig) => void;
  onSkip?: () => void;
}

export interface OnboardingConfig {
  industry: string;
  handlesHealthData: boolean;
  processesPayments: boolean;
  servesEU: boolean;
  companySize: string;
  recommendedFrameworks: string[];
}

interface Step {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  { id: 1, title: 'Industry', subtitle: 'What industry is your company in?', icon: <Building2 className="w-6 h-6" /> },
  { id: 2, title: 'Health Data', subtitle: 'Do you handle protected health information?', icon: <Heart className="w-6 h-6" /> },
  { id: 3, title: 'Payments', subtitle: 'Do you process credit card payments?', icon: <CreditCard className="w-6 h-6" /> },
  { id: 4, title: 'EU Customers', subtitle: 'Do you serve customers in the European Union?', icon: <Globe className="w-6 h-6" /> },
  { id: 5, title: 'Company Size', subtitle: 'How many employees does your company have?', icon: <Users className="w-6 h-6" /> },
];

const INDUSTRIES = [
  { id: 'healthcare', label: 'Healthcare', description: 'Hospitals, clinics, health tech' },
  { id: 'finance', label: 'Financial Services', description: 'Banking, insurance, fintech' },
  { id: 'technology', label: 'Technology', description: 'SaaS, software, IT services' },
  { id: 'retail', label: 'Retail & E-commerce', description: 'Online stores, marketplaces' },
  { id: 'government', label: 'Government', description: 'Public sector, contractors' },
  { id: 'other', label: 'Other', description: 'Manufacturing, education, etc.' },
];

const COMPANY_SIZES = [
  { id: '1-50', label: '1-50 employees', description: 'Small business / Startup' },
  { id: '51-200', label: '51-200 employees', description: 'Growing company' },
  { id: '201-500', label: '201-500 employees', description: 'Mid-size company' },
  { id: '500+', label: '500+ employees', description: 'Enterprise' },
];

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<OnboardingConfig>({
    industry: '',
    handlesHealthData: false,
    processesPayments: false,
    servesEU: false,
    companySize: '',
    recommendedFrameworks: [],
  });

  const calculateRecommendedFrameworks = (finalConfig: OnboardingConfig): string[] => {
    const frameworks: string[] = ['SOC2']; // Always recommend SOC2

    if (finalConfig.handlesHealthData || finalConfig.industry === 'healthcare') {
      frameworks.push('HIPAA');
    }

    if (finalConfig.processesPayments || finalConfig.industry === 'finance' || finalConfig.industry === 'retail') {
      frameworks.push('PCIDSS');
    }

    if (finalConfig.servesEU) {
      frameworks.push('GDPR');
    }

    // Always include ISO27001 and NIST for comprehensive coverage
    frameworks.push('ISO27001', 'NIST');

    return [...new Set(frameworks)]; // Remove duplicates
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      const recommendedFrameworks = calculateRecommendedFrameworks(config);
      onComplete({ ...config, recommendedFrameworks });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return config.industry !== '';
      case 2: return true; // Boolean, always valid
      case 3: return true;
      case 4: return true;
      case 5: return config.companySize !== '';
      default: return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="grid grid-cols-2 gap-3">
            {INDUSTRIES.map((industry) => (
              <button
                key={industry.id}
                onClick={() => setConfig({ ...config, industry: industry.id })}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  config.industry === industry.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-steel-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <div className="font-medium text-slate-900 dark:text-steel-100">{industry.label}</div>
                <div className="text-sm text-slate-500 dark:text-steel-400">{industry.description}</div>
              </button>
            ))}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-slate-600 dark:text-steel-400 mb-6">
              Protected Health Information (PHI) includes medical records, health insurance data,
              and any information that can identify a patient.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfig({ ...config, handlesHealthData: true })}
                className={`flex-1 p-6 rounded-xl border-2 transition-all duration-200 ${
                  config.handlesHealthData
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-steel-700 hover:border-indigo-300'
                }`}
              >
                <div className="text-2xl mb-2">Yes</div>
                <div className="text-sm text-slate-500 dark:text-steel-400">We handle health data</div>
              </button>
              <button
                onClick={() => setConfig({ ...config, handlesHealthData: false })}
                className={`flex-1 p-6 rounded-xl border-2 transition-all duration-200 ${
                  !config.handlesHealthData
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-steel-700 hover:border-indigo-300'
                }`}
              >
                <div className="text-2xl mb-2">No</div>
                <div className="text-sm text-slate-500 dark:text-steel-400">We don't handle health data</div>
              </button>
            </div>
            {config.handlesHealthData && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800"
              >
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">HIPAA compliance will be enabled</span>
                </div>
              </motion.div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-slate-600 dark:text-steel-400 mb-6">
              This includes processing, storing, or transmitting credit card numbers,
              even through third-party payment processors.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfig({ ...config, processesPayments: true })}
                className={`flex-1 p-6 rounded-xl border-2 transition-all duration-200 ${
                  config.processesPayments
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-steel-700 hover:border-indigo-300'
                }`}
              >
                <div className="text-2xl mb-2">Yes</div>
                <div className="text-sm text-slate-500 dark:text-steel-400">We process payments</div>
              </button>
              <button
                onClick={() => setConfig({ ...config, processesPayments: false })}
                className={`flex-1 p-6 rounded-xl border-2 transition-all duration-200 ${
                  !config.processesPayments
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-steel-700 hover:border-indigo-300'
                }`}
              >
                <div className="text-2xl mb-2">No</div>
                <div className="text-sm text-slate-500 dark:text-steel-400">We don't process payments</div>
              </button>
            </div>
            {config.processesPayments && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
              >
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">PCI-DSS compliance will be enabled</span>
                </div>
              </motion.div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-slate-600 dark:text-steel-400 mb-6">
              If you collect personal data from EU residents (customers, users, or employees),
              GDPR requirements apply to your organization.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfig({ ...config, servesEU: true })}
                className={`flex-1 p-6 rounded-xl border-2 transition-all duration-200 ${
                  config.servesEU
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-steel-700 hover:border-indigo-300'
                }`}
              >
                <div className="text-2xl mb-2">Yes</div>
                <div className="text-sm text-slate-500 dark:text-steel-400">We serve EU customers</div>
              </button>
              <button
                onClick={() => setConfig({ ...config, servesEU: false })}
                className={`flex-1 p-6 rounded-xl border-2 transition-all duration-200 ${
                  !config.servesEU
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-steel-700 hover:border-indigo-300'
                }`}
              >
                <div className="text-2xl mb-2">No</div>
                <div className="text-sm text-slate-500 dark:text-steel-400">No EU presence</div>
              </button>
            </div>
            {config.servesEU && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">GDPR compliance will be enabled</span>
                </div>
              </motion.div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="grid grid-cols-2 gap-3">
            {COMPANY_SIZES.map((size) => (
              <button
                key={size.id}
                onClick={() => setConfig({ ...config, companySize: size.id })}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  config.companySize === size.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-steel-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <div className="font-medium text-slate-900 dark:text-steel-100">{size.label}</div>
                <div className="text-sm text-slate-500 dark:text-steel-400">{size.description}</div>
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  const step = STEPS[currentStep - 1];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl bg-white dark:bg-midnight-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Welcome to Lydell Security</h1>
              <p className="text-indigo-100 text-sm">Let's set up your compliance dashboard</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    s.id < currentStep
                      ? 'bg-white text-indigo-600'
                      : s.id === currentStep
                      ? 'bg-white/30 text-white ring-2 ring-white'
                      : 'bg-white/10 text-white/50'
                  }`}
                >
                  {s.id < currentStep ? <Check className="w-4 h-4" /> : s.id}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 ${s.id < currentStep ? 'bg-white' : 'bg-white/20'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              {step.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-steel-100">{step.subtitle}</h2>
              <p className="text-sm text-slate-500 dark:text-steel-400">Step {currentStep} of 5</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-50 dark:bg-midnight-800 border-t border-slate-200 dark:border-steel-800 flex items-center justify-between">
          <div>
            {onSkip && currentStep === 1 && (
              <button
                onClick={onSkip}
                className="text-sm text-slate-500 dark:text-steel-400 hover:text-slate-700 dark:hover:text-steel-200"
              >
                Skip setup
              </button>
            )}
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-slate-600 dark:text-steel-400 hover:text-slate-900 dark:hover:text-steel-200"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
              canProceed()
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-steel-700 dark:text-steel-500'
            }`}
          >
            {currentStep === 5 ? (
              <>
                Complete Setup
                <Sparkles className="w-4 h-4" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default OnboardingWizard;
