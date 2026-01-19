/**
 * Inherent Risk Questionnaire
 *
 * 5-question workflow to assess vendor inherent risk:
 * 1. Data Access - What type of data does this vendor access?
 * 2. System Access - What systems does this vendor have access to?
 * 3. Business Criticality - How critical is this vendor to operations?
 * 4. Data Volume - How much data does this vendor process?
 * 5. Geographic Risk - Where is the vendor located/processing data?
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Database,
  Server,
  Building2,
  BarChart3,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Loader2,
} from 'lucide-react';
import type { Vendor } from '../../services/vendor-risk.service';
import { vendorRiskService, calculateRiskScore, calculateRiskTier } from '../../services/vendor-risk.service';

interface InherentRiskQuestionnaireProps {
  vendor: Vendor;
  onClose: () => void;
  onComplete: (score: number) => void;
  organizationId: string;
  userId: string;
}

interface Question {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  options: {
    value: number;
    label: string;
    description: string;
  }[];
}

const QUESTIONS: Question[] = [
  {
    id: 'data_access',
    title: 'Data Access Level',
    description: 'What type of data does this vendor have access to?',
    icon: <Database className="w-6 h-6" />,
    options: [
      { value: 25, label: 'Restricted/PII', description: 'Customer PII, financial data, health records' },
      { value: 18, label: 'Confidential', description: 'Internal business data, employee information' },
      { value: 10, label: 'Internal', description: 'General business information, non-sensitive' },
      { value: 5, label: 'Public', description: 'Public information only, no sensitive data' },
      { value: 0, label: 'No Data Access', description: 'Vendor does not access any organizational data' },
    ],
  },
  {
    id: 'system_access',
    title: 'System Access Level',
    description: 'What level of access does this vendor have to your systems?',
    icon: <Server className="w-6 h-6" />,
    options: [
      { value: 25, label: 'Administrative', description: 'Full admin access to critical systems' },
      { value: 18, label: 'Privileged', description: 'Elevated access to specific systems' },
      { value: 10, label: 'Standard User', description: 'Normal user-level access' },
      { value: 5, label: 'Limited', description: 'Read-only or very restricted access' },
      { value: 0, label: 'No System Access', description: 'No direct access to any systems' },
    ],
  },
  {
    id: 'business_criticality',
    title: 'Business Criticality',
    description: 'How critical is this vendor to your business operations?',
    icon: <Building2 className="w-6 h-6" />,
    options: [
      { value: 25, label: 'Mission Critical', description: 'Business cannot operate without this vendor' },
      { value: 18, label: 'High Impact', description: 'Significant disruption if vendor fails' },
      { value: 10, label: 'Moderate Impact', description: 'Some disruption, workarounds available' },
      { value: 5, label: 'Low Impact', description: 'Minimal disruption, easily replaceable' },
      { value: 0, label: 'Non-Essential', description: 'No business impact if vendor is unavailable' },
    ],
  },
  {
    id: 'data_volume',
    title: 'Data Volume',
    description: 'What volume of data does this vendor process or store?',
    icon: <BarChart3 className="w-6 h-6" />,
    options: [
      { value: 15, label: 'Very High', description: 'Processes millions of records or TB of data' },
      { value: 10, label: 'High', description: 'Processes thousands of records regularly' },
      { value: 6, label: 'Moderate', description: 'Processes hundreds of records' },
      { value: 3, label: 'Low', description: 'Minimal data processing' },
      { value: 0, label: 'None', description: 'Does not process any data' },
    ],
  },
  {
    id: 'geographic_risk',
    title: 'Geographic Risk',
    description: 'Where is the vendor located or processing data?',
    icon: <MapPin className="w-6 h-6" />,
    options: [
      { value: 10, label: 'High-Risk Region', description: 'Countries with weak data protection laws' },
      { value: 6, label: 'Moderate Risk', description: 'Mixed data protection environment' },
      { value: 3, label: 'Low Risk', description: 'Strong data protection (EU, US, etc.)' },
      { value: 0, label: 'Same Jurisdiction', description: 'Same country with same regulations' },
    ],
  },
];

const InherentRiskQuestionnaire: React.FC<InherentRiskQuestionnaireProps> = ({
  vendor,
  onClose,
  onComplete,
  organizationId: _organizationId,
  userId: _userId,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const currentQuestion = QUESTIONS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === QUESTIONS.length - 1;
  const hasAnswered = answers[currentQuestion?.id] !== undefined;

  // Handle answer selection
  const handleAnswer = useCallback((value: number) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  }, [currentQuestion]);

  // Navigate to next step
  const handleNext = useCallback(() => {
    if (!hasAnswered) return;
    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [hasAnswered, isLastStep]);

  // Navigate to previous step
  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  }, [isFirstStep]);

  // Submit the questionnaire
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Calculate risk factors from answers
      const riskFactors = {
        dataAccess: answers.data_access || 0,
        systemAccess: answers.system_access || 0,
        businessCriticality: answers.business_criticality || 0,
        compliancePosture: 25 - ((answers.data_volume || 0) + (answers.geographic_risk || 0)) / 2,
      };

      const score = calculateRiskScore(riskFactors);
      const tier = calculateRiskTier(score);

      // Update vendor with new risk score
      await vendorRiskService.updateVendor(vendor.id, {
        riskScore: score,
        riskTier: tier,
        lastAssessmentAt: new Date().toISOString(),
        nextAssessmentAt: new Date(Date.now() + getAssessmentFrequency(tier) * 24 * 60 * 60 * 1000).toISOString(),
      });

      setFinalScore(score);
      setIsComplete(true);
    } catch (error) {
      console.error('Failed to submit assessment:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, vendor.id]);

  // Get assessment frequency based on tier
  function getAssessmentFrequency(tier: string): number {
    switch (tier) {
      case 'tier1': return 90;  // Quarterly
      case 'tier2': return 180; // Semi-annually
      case 'tier3': return 365; // Annually
      default: return 730;       // Bi-annually
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        {!isComplete ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-violet-600">
              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Inherent Risk Assessment</h2>
                  <p className="text-sm text-white/80">{vendor.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress */}
            <div className="px-6 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">
                  Question {currentStep + 1} of {QUESTIONS.length}
                </span>
                <span className="text-sm text-slate-500">
                  {Math.round(((currentStep + (hasAnswered ? 1 : 0)) / QUESTIONS.length) * 100)}% complete
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + (hasAnswered ? 1 : 0)) / QUESTIONS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      {currentQuestion.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{currentQuestion.title}</h3>
                      <p className="text-sm text-slate-500">{currentQuestion.description}</p>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    {currentQuestion.options.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleAnswer(option.value)}
                        className={`
                          w-full p-4 rounded-xl border-2 text-left transition-all
                          ${answers[currentQuestion.id] === option.value
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-medium ${
                              answers[currentQuestion.id] === option.value
                                ? 'text-indigo-900'
                                : 'text-slate-900'
                            }`}>
                              {option.label}
                            </p>
                            <p className="text-sm text-slate-500 mt-0.5">{option.description}</p>
                          </div>
                          <div className={`
                            w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                            ${answers[currentQuestion.id] === option.value
                              ? 'border-indigo-500 bg-indigo-500'
                              : 'border-slate-300'
                            }
                          `}>
                            {answers[currentQuestion.id] === option.value && (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={handlePrevious}
                disabled={isFirstStep}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={!hasAnswered || isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Calculating...
                  </>
                ) : isLastStep ? (
                  <>
                    Complete
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Completion State */}
            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className={`
                  w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center
                  ${finalScore! >= 75 ? 'bg-red-100' :
                    finalScore! >= 50 ? 'bg-orange-100' :
                    finalScore! >= 25 ? 'bg-amber-100' : 'bg-emerald-100'
                  }
                `}
              >
                {finalScore! >= 75 ? (
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                ) : (
                  <CheckCircle2 className={`w-10 h-10 ${
                    finalScore! >= 50 ? 'text-orange-500' :
                    finalScore! >= 25 ? 'text-amber-500' : 'text-emerald-500'
                  }`} />
                )}
              </motion.div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">Assessment Complete</h3>
              <p className="text-slate-500 mb-6">
                Risk assessment for {vendor.name} has been calculated
              </p>

              {/* Score Display */}
              <div className="bg-slate-50 rounded-2xl p-6 mb-6">
                <div className="text-6xl font-bold mb-2" style={{
                  color: finalScore! >= 75 ? '#DC2626' :
                         finalScore! >= 50 ? '#EA580C' :
                         finalScore! >= 25 ? '#D97706' : '#16A34A'
                }}>
                  {finalScore}
                </div>
                <div className="text-slate-500">Inherent Risk Score</div>

                <div className="mt-4 h-3 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${finalScore}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full rounded-full ${
                      finalScore! >= 75 ? 'bg-red-500' :
                      finalScore! >= 50 ? 'bg-orange-500' :
                      finalScore! >= 25 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-slate-600">Low (0-24)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-slate-600">Medium (25-49)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-slate-600">High (50-74)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-slate-600">Critical (75+)</span>
                  </div>
                </div>
              </div>

              {/* Risk Tier */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                <div className="text-sm text-slate-500 mb-1">Assigned Risk Tier</div>
                <div className={`text-lg font-semibold ${
                  finalScore! >= 75 ? 'text-red-600' :
                  finalScore! >= 50 ? 'text-orange-600' :
                  finalScore! >= 25 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {finalScore! >= 75 ? 'Tier 1 - Critical (Quarterly Review)' :
                   finalScore! >= 50 ? 'Tier 2 - High (Semi-Annual Review)' :
                   finalScore! >= 25 ? 'Tier 3 - Medium (Annual Review)' : 'Tier 4 - Low (Bi-Annual Review)'}
                </div>
              </div>

              <button
                onClick={() => {
                  onComplete(finalScore!);
                  onClose();
                }}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
              >
                Done
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default InherentRiskQuestionnaire;
