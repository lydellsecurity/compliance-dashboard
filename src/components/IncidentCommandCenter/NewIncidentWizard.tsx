/**
 * New Incident Wizard
 *
 * Guided wizard for incident reporting:
 * - What happened?
 * - Who is affected?
 * - Is PII involved?
 *
 * Automatically calculates severity based on answers.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Users,
  Database,
  Shield,
  CheckCircle2,
  Loader2,
  HelpCircle,
  Server,
  Lock,
  UserX,
  Globe,
  Zap,
} from 'lucide-react';
import type { UseIncidentResponseReturn, CreateIncidentData } from '../../hooks/useIncidentResponse';
import type {
  Incident,
  IncidentSeverity,
  ThreatCategory,
  AttackVector,
} from '../../types/incident.types';
import { SEVERITY_CONFIG, THREAT_LABELS } from './index';

// ============================================================================
// TYPES
// ============================================================================

interface NewIncidentWizardProps {
  ir: UseIncidentResponseReturn;
  organizationId: string;
  userId: string;
  onClose: () => void;
  onIncidentCreated: (incident: Incident) => void;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'what_happened',
    title: 'What Happened?',
    description: 'Describe the security incident',
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  {
    id: 'who_affected',
    title: 'Who is Affected?',
    description: 'Identify impacted systems and users',
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 'data_impact',
    title: 'Is PII Involved?',
    description: 'Assess data exposure and sensitivity',
    icon: <Database className="w-5 h-5" />,
  },
  {
    id: 'response_team',
    title: 'Response Team',
    description: 'Assign incident commander and responders',
    icon: <Shield className="w-5 h-5" />,
  },
  {
    id: 'review',
    title: 'Review & Create',
    description: 'Confirm details and create incident',
    icon: <CheckCircle2 className="w-5 h-5" />,
  },
];

const THREAT_CATEGORY_OPTIONS: { value: ThreatCategory; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'ransomware', label: 'Ransomware', description: 'Systems encrypted, ransom demanded', icon: <Lock className="w-5 h-5" /> },
  { value: 'phishing', label: 'Phishing', description: 'Fraudulent emails or messages', icon: <Globe className="w-5 h-5" /> },
  { value: 'data_exfiltration', label: 'Data Exfiltration', description: 'Unauthorized data transfer', icon: <Database className="w-5 h-5" /> },
  { value: 'credential_compromise', label: 'Credential Compromise', description: 'Stolen or exposed credentials', icon: <UserX className="w-5 h-5" /> },
  { value: 'malware', label: 'Malware', description: 'Malicious software detected', icon: <Zap className="w-5 h-5" /> },
  { value: 'insider_threat', label: 'Insider Threat', description: 'Malicious or negligent insider', icon: <Users className="w-5 h-5" /> },
  { value: 'ddos', label: 'DDoS Attack', description: 'Service disruption attack', icon: <Server className="w-5 h-5" /> },
  { value: 'other', label: 'Other', description: 'Other security incident', icon: <HelpCircle className="w-5 h-5" /> },
];

const ATTACK_VECTOR_OPTIONS: { value: AttackVector; label: string }[] = [
  { value: 'email_phishing', label: 'Email Phishing' },
  { value: 'spear_phishing', label: 'Spear Phishing' },
  { value: 'credential_stuffing', label: 'Credential Stuffing' },
  { value: 'brute_force', label: 'Brute Force' },
  { value: 'social_engineering', label: 'Social Engineering' },
  { value: 'misconfiguration', label: 'Misconfiguration' },
  { value: 'unpatched_vulnerability', label: 'Unpatched Vulnerability' },
  { value: 'insider_access', label: 'Insider Access' },
  { value: 'third_party_breach', label: 'Third-Party Breach' },
  { value: 'unknown', label: 'Unknown' },
];

const DATA_TYPE_OPTIONS = [
  { value: 'pii', label: 'PII (Personal Identifiable Information)' },
  { value: 'phi', label: 'PHI (Protected Health Information)' },
  { value: 'pci', label: 'PCI (Payment Card Data)' },
  { value: 'financial', label: 'Financial Records' },
  { value: 'credentials', label: 'User Credentials' },
  { value: 'intellectual_property', label: 'Intellectual Property' },
  { value: 'customer_data', label: 'Customer Data' },
  { value: 'employee_data', label: 'Employee Data' },
];

// ============================================================================
// SEVERITY CALCULATION
// ============================================================================

function calculateSeverity(data: Partial<CreateIncidentData>): IncidentSeverity {
  let score = 0;

  // Threat category severity
  const highSeverityThreats: ThreatCategory[] = ['ransomware', 'data_exfiltration', 'apt', 'zero_day'];
  const mediumSeverityThreats: ThreatCategory[] = ['credential_compromise', 'malware', 'insider_threat'];

  if (highSeverityThreats.includes(data.threatCategory!)) {
    score += 40;
  } else if (mediumSeverityThreats.includes(data.threatCategory!)) {
    score += 25;
  } else {
    score += 10;
  }

  // Data exposure
  if (data.dataExposed) {
    score += 30;
  }

  // Sensitive data types
  const sensitiveTypes = ['pii', 'phi', 'pci', 'credentials'];
  const hasSensitiveData = data.dataTypes?.some(type => sensitiveTypes.includes(type));
  if (hasSensitiveData) {
    score += 20;
  }

  // Number of affected users
  if (data.affectedUsers && data.affectedUsers > 1000) {
    score += 15;
  } else if (data.affectedUsers && data.affectedUsers > 100) {
    score += 10;
  } else if (data.affectedUsers && data.affectedUsers > 10) {
    score += 5;
  }

  // Number of affected systems
  if (data.affectedSystems && data.affectedSystems.length > 10) {
    score += 10;
  } else if (data.affectedSystems && data.affectedSystems.length > 5) {
    score += 5;
  }

  // Determine severity
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const NewIncidentWizard: React.FC<NewIncidentWizardProps> = ({
  ir,
  organizationId: _organizationId,
  userId: _userId,
  onClose,
  onIncidentCreated,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateIncidentData>>({
    title: '',
    description: '',
    severity: 'medium',
    threatCategory: 'other',
    attackVectors: [],
    affectedSystems: [],
    affectedUsers: 0,
    dataExposed: false,
    dataTypes: [],
    incidentCommander: '',
    responders: [],
    clientContact: '',
  });

  const [systemInput, setSystemInput] = useState('');
  const [responderInput, setResponderInput] = useState('');

  // Calculate severity based on answers
  const calculatedSeverity = useMemo(() => {
    return calculateSeverity(formData);
  }, [formData]);

  // Update form data
  const updateField = useCallback(<K extends keyof CreateIncidentData>(
    field: K,
    value: CreateIncidentData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Navigate steps
  const goNext = useCallback(() => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Validate current step
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 0: // What happened
        return formData.title && formData.title.length >= 5 && formData.threatCategory;
      case 1: // Who affected
        return true; // Optional
      case 2: // Data impact
        return true; // Optional
      case 3: // Response team
        return formData.incidentCommander && formData.incidentCommander.length >= 2;
      case 4: // Review
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Set calculated severity
      const incidentData: CreateIncidentData = {
        ...(formData as CreateIncidentData),
        severity: calculatedSeverity,
      };

      const incident = ir.createIncident(incidentData);
      onIncidentCreated(incident);
    } catch (error) {
      console.error('Failed to create incident:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, calculatedSeverity, ir, onIncidentCreated]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // What happened
        return (
          <div className="space-y-6">
            {/* Incident Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-steel-200 mb-2">
                What happened? <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={e => updateField('title', e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-midnight-800 border border-slate-200 dark:border-steel-600 rounded-xl text-slate-900 dark:text-steel-100 placeholder-slate-400 dark:placeholder-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Brief description of the incident (e.g., 'Ransomware detected on file server')"
              />
            </div>

            {/* Threat Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-steel-200 mb-3">
                What type of incident is this? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {THREAT_CATEGORY_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField('threatCategory', option.value)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      formData.threatCategory === option.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-slate-200 dark:border-steel-600 hover:border-slate-300 dark:hover:border-steel-500 bg-white dark:bg-midnight-800'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      formData.threatCategory === option.value
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        : 'bg-slate-100 dark:bg-steel-700 text-slate-500 dark:text-steel-400'
                    }`}>
                      {option.icon}
                    </div>
                    <div>
                      <p className={`font-medium ${
                        formData.threatCategory === option.value ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-900 dark:text-steel-100'
                      }`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-steel-400 mt-0.5">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-steel-200 mb-2">
                Provide more details (optional)
              </label>
              <textarea
                value={formData.description || ''}
                onChange={e => updateField('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-white dark:bg-midnight-800 border border-slate-200 dark:border-steel-600 rounded-xl text-slate-900 dark:text-steel-100 placeholder-slate-400 dark:placeholder-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                placeholder="Describe what was observed, initial indicators, timeline of events..."
              />
            </div>

            {/* Attack Vectors */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-steel-200 mb-2">
                How did this happen? (Attack vectors)
              </label>
              <div className="flex flex-wrap gap-2">
                {ATTACK_VECTOR_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const vectors = formData.attackVectors?.includes(option.value)
                        ? formData.attackVectors.filter(v => v !== option.value)
                        : [...(formData.attackVectors || []), option.value];
                      updateField('attackVectors', vectors);
                    }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                      formData.attackVectors?.includes(option.value)
                        ? 'bg-indigo-500 text-white border-indigo-500'
                        : 'bg-white dark:bg-midnight-800 text-slate-600 dark:text-steel-300 border-slate-200 dark:border-steel-600 hover:border-indigo-300 dark:hover:border-indigo-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 1: // Who affected
        return (
          <div className="space-y-6">
            {/* Affected Systems */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-steel-200 mb-2">
                Which systems are affected?
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={systemInput}
                  onChange={e => setSystemInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && systemInput.trim()) {
                      e.preventDefault();
                      updateField('affectedSystems', [...(formData.affectedSystems || []), systemInput.trim()]);
                      setSystemInput('');
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-white dark:bg-midnight-800 border border-slate-200 dark:border-steel-600 rounded-xl text-slate-900 dark:text-steel-100 placeholder-slate-400 dark:placeholder-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Enter system name and press Enter"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.affectedSystems?.map((system, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-steel-700 text-slate-700 dark:text-steel-200 rounded-lg text-sm"
                  >
                    <Server className="w-3.5 h-3.5" />
                    {system}
                    <button
                      type="button"
                      onClick={() => {
                        updateField(
                          'affectedSystems',
                          formData.affectedSystems?.filter((_, i) => i !== index) || []
                        );
                      }}
                      className="ml-1 text-slate-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Affected Users Count */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-steel-200 mb-2">
                Approximately how many users are affected?
              </label>
              <div className="grid grid-cols-4 gap-3">
                {[0, 10, 100, 1000].map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => updateField('affectedUsers', count)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.affectedUsers === count
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-slate-200 dark:border-steel-600 hover:border-slate-300 dark:hover:border-steel-500 bg-white dark:bg-midnight-800'
                    }`}
                  >
                    <div className="text-2xl font-bold text-slate-900 dark:text-steel-100">
                      {count === 0 ? '0' : count === 1000 ? '1000+' : `${count}+`}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-steel-400 mt-1">
                      {count === 0 ? 'None' : count === 10 ? 'Few' : count === 100 ? 'Many' : 'Mass'}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <input
                  type="number"
                  min="0"
                  value={formData.affectedUsers || ''}
                  onChange={e => updateField('affectedUsers', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-white dark:bg-midnight-800 border border-slate-200 dark:border-steel-600 rounded-xl text-slate-900 dark:text-steel-100 placeholder-slate-400 dark:placeholder-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Or enter exact number"
                />
              </div>
            </div>
          </div>
        );

      case 2: // Data impact
        return (
          <div className="space-y-6">
            {/* Data Exposed */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-steel-200 mb-3">
                Was any data exposed or exfiltrated?
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => updateField('dataExposed', true)}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    formData.dataExposed === true
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-slate-200 dark:border-steel-600 hover:border-slate-300 dark:hover:border-steel-500 bg-white dark:bg-midnight-800'
                  }`}
                >
                  <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${
                    formData.dataExposed === true ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-steel-500'
                  }`} />
                  <div className={`font-medium ${
                    formData.dataExposed === true ? 'text-red-900 dark:text-red-200' : 'text-slate-900 dark:text-steel-100'
                  }`}>
                    Yes, data was exposed
                  </div>
                  <div className="text-xs text-slate-500 dark:text-steel-400 mt-1">
                    Data may have been accessed or exfiltrated
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('dataExposed', false)}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    formData.dataExposed === false
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-slate-200 dark:border-steel-600 hover:border-slate-300 dark:hover:border-steel-500 bg-white dark:bg-midnight-800'
                  }`}
                >
                  <Shield className={`w-8 h-8 mx-auto mb-2 ${
                    formData.dataExposed === false ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-steel-500'
                  }`} />
                  <div className={`font-medium ${
                    formData.dataExposed === false ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-900 dark:text-steel-100'
                  }`}>
                    No data exposure
                  </div>
                  <div className="text-xs text-slate-500 dark:text-steel-400 mt-1">
                    No evidence of data access
                  </div>
                </button>
              </div>
            </div>

            {/* Data Types (if exposed) */}
            {formData.dataExposed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-medium text-slate-700 dark:text-steel-200 mb-3">
                  What types of data were potentially affected?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {DATA_TYPE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        const types = formData.dataTypes?.includes(option.value)
                          ? formData.dataTypes.filter(t => t !== option.value)
                          : [...(formData.dataTypes || []), option.value];
                        updateField('dataTypes', types);
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.dataTypes?.includes(option.value)
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-slate-200 dark:border-steel-600 hover:border-slate-300 dark:hover:border-steel-500 bg-white dark:bg-midnight-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          formData.dataTypes?.includes(option.value)
                            ? 'bg-red-500 border-red-500'
                            : 'border-slate-300 dark:border-steel-500'
                        }`}>
                          {formData.dataTypes?.includes(option.value) && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className={`text-sm font-medium ${
                          formData.dataTypes?.includes(option.value) ? 'text-red-900 dark:text-red-200' : 'text-slate-700 dark:text-steel-200'
                        }`}>
                          {option.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Calculated Severity Preview */}
            <div className="p-4 bg-slate-50 dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-steel-200">Calculated Severity</p>
                  <p className="text-xs text-slate-500 dark:text-steel-400 mt-0.5">Based on your answers</p>
                </div>
                <div
                  className="px-4 py-2 rounded-lg text-sm font-bold"
                  style={{
                    backgroundColor: SEVERITY_CONFIG[calculatedSeverity].bgColor,
                    color: SEVERITY_CONFIG[calculatedSeverity].color,
                  }}
                >
                  {SEVERITY_CONFIG[calculatedSeverity].label}
                </div>
              </div>
            </div>
          </div>
        );

      case 3: // Response team
        return (
          <div className="space-y-6">
            {/* Incident Commander */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-steel-200 mb-2">
                Who is the Incident Commander? <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.incidentCommander || ''}
                onChange={e => updateField('incidentCommander', e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-midnight-800 border border-slate-200 dark:border-steel-600 rounded-xl text-slate-900 dark:text-steel-100 placeholder-slate-400 dark:placeholder-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Name of the person leading the response"
              />
              <p className="text-xs text-slate-500 dark:text-steel-400 mt-2">
                The Incident Commander has overall authority and responsibility for managing the incident.
              </p>
            </div>

            {/* Responders */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-steel-200 mb-2">
                Who else is responding?
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={responderInput}
                  onChange={e => setResponderInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && responderInput.trim()) {
                      e.preventDefault();
                      updateField('responders', [...(formData.responders || []), responderInput.trim()]);
                      setResponderInput('');
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-white dark:bg-midnight-800 border border-slate-200 dark:border-steel-600 rounded-xl text-slate-900 dark:text-steel-100 placeholder-slate-400 dark:placeholder-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Enter name and press Enter"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.responders?.map((responder, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {responder}
                    <button
                      type="button"
                      onClick={() => {
                        updateField(
                          'responders',
                          formData.responders?.filter((_, i) => i !== index) || []
                        );
                      }}
                      className="ml-1 text-indigo-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Client Contact */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-steel-200 mb-2">
                Client Contact (if applicable)
              </label>
              <input
                type="text"
                value={formData.clientContact || ''}
                onChange={e => updateField('clientContact', e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-midnight-800 border border-slate-200 dark:border-steel-600 rounded-xl text-slate-900 dark:text-steel-100 placeholder-slate-400 dark:placeholder-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Primary contact at the client organization"
              />
            </div>
          </div>
        );

      case 4: // Review
        return (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-slate-50 dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-steel-700">
                <h4 className="font-semibold text-slate-900 dark:text-steel-100">Incident Summary</h4>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-steel-400">Title</p>
                    <p className="font-medium text-slate-900 dark:text-steel-100">{formData.title}</p>
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-lg text-sm font-bold"
                    style={{
                      backgroundColor: SEVERITY_CONFIG[calculatedSeverity].bgColor,
                      color: SEVERITY_CONFIG[calculatedSeverity].color,
                    }}
                  >
                    {SEVERITY_CONFIG[calculatedSeverity].label}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-steel-400">Threat Type</p>
                    <p className="font-medium text-slate-900 dark:text-steel-100">
                      {THREAT_LABELS[formData.threatCategory!]}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-steel-400">Incident Commander</p>
                    <p className="font-medium text-slate-900 dark:text-steel-100">{formData.incidentCommander}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-steel-400">Affected Systems</p>
                    <p className="font-medium text-slate-900 dark:text-steel-100">
                      {formData.affectedSystems?.length || 0} systems
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-steel-400">Affected Users</p>
                    <p className="font-medium text-slate-900 dark:text-steel-100">{formData.affectedUsers || 0}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-500 dark:text-steel-400">Data Exposure</p>
                  <p className={`font-medium ${formData.dataExposed ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formData.dataExposed ? 'Yes - Data was exposed' : 'No data exposure'}
                  </p>
                </div>

                {formData.dataTypes && formData.dataTypes.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-500 dark:text-steel-400">Data Types Affected</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.dataTypes.map(type => (
                        <span
                          key={type}
                          className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-medium"
                        >
                          {type.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Warning for critical/high */}
            {(calculatedSeverity === 'critical' || calculatedSeverity === 'high') && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-200">
                      This is a {calculatedSeverity === 'critical' ? 'critical' : 'high'} severity incident
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      Regulatory notification may be required. An AI-generated response playbook will be available after creation.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

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
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-midnight-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-red-600 to-orange-600">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Report New Incident</h2>
              <p className="text-sm text-white/80">Guided incident reporting wizard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-steel-700 bg-slate-50 dark:bg-midnight-800">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => index < currentStep && setCurrentStep(index)}
                  disabled={index > currentStep}
                  className={`flex items-center gap-2 ${
                    index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index < currentStep
                      ? 'bg-emerald-500 text-white'
                      : index === currentStep
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-steel-700 text-slate-500 dark:text-steel-400'
                  }`}>
                    {index < currentStep ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className={`text-sm font-medium hidden md:block ${
                    index === currentStep ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-steel-400'
                  }`}>
                    {step.title}
                  </span>
                </button>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-steel-700'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                {WIZARD_STEPS[currentStep].icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-steel-100">
                  {WIZARD_STEPS[currentStep].title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-steel-400">
                  {WIZARD_STEPS[currentStep].description}
                </p>
              </div>
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-steel-700 bg-slate-50 dark:bg-midnight-800">
          <button
            onClick={goBack}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-steel-300 hover:text-slate-800 dark:hover:text-steel-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {currentStep < WIZARD_STEPS.length - 1 ? (
            <button
              onClick={goNext}
              disabled={!isStepValid}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !isStepValid}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium shadow-lg shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Create Incident
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default NewIncidentWizard;
