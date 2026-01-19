/**
 * Add Vendor Modal
 *
 * Form for creating new vendor profiles with:
 * - Basic information
 * - Category and criticality
 * - Contact details
 * - Contract information
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Mail,
  Phone,
  Globe,
  Calendar,
  DollarSign,
  RefreshCw,
  Plus,
  Shield,
} from 'lucide-react';
import type { Vendor } from '../../services/vendor-risk.service';
import { CRITICALITY_CONFIG, CATEGORY_LABELS } from './index';

interface AddVendorModalProps {
  onClose: () => void;
  onSave: (vendor: Partial<Vendor>) => Promise<void>;
}

const AddVendorModal: React.FC<AddVendorModalProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Vendor>>({
    name: '',
    description: '',
    category: 'software',
    criticality: 'medium',
    dataClassification: 'internal',
    status: 'pending',
    website: '',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    certifications: [],
    complianceFrameworks: [],
  });
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update field
  const updateField = useCallback((field: keyof Vendor, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [errors]);

  // Validate form
  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Vendor name is required';
    }

    if (formData.primaryContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryContactEmail)) {
      newErrors.primaryContactEmail = 'Invalid email address';
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Failed to save vendor:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to save vendor' });
    } finally {
      setSaving(false);
    }
  }, [formData, validate, onSave]);

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
        className="bg-white dark:bg-midnight-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-violet-600">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Add New Vendor</h2>
              <p className="text-sm text-white/80">Step {currentStep} of 3</p>
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
        <div className="px-6 py-3 bg-slate-50 dark:bg-midnight-800 border-b border-slate-200 dark:border-steel-700">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <button
                  onClick={() => setCurrentStep(step as 1 | 2 | 3)}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                    ${currentStep >= step
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-steel-700 text-slate-500 dark:text-steel-400'
                    }
                  `}
                >
                  {step}
                </button>
                {step < 3 && (
                  <div className={`flex-1 h-1 rounded-full ${
                    currentStep > step ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-steel-700'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-steel-400">
            <span>Basic Info</span>
            <span>Contact</span>
            <span>Contract</span>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 placeholder:text-slate-400 dark:placeholder:text-steel-500 ${
                    errors.name ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20' : 'border-slate-200 dark:border-steel-600'
                  }`}
                  placeholder="Enter vendor name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-steel-600 rounded-xl bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 placeholder:text-slate-400 dark:placeholder:text-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Brief description of the vendor's services"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">
                    Category
                  </label>
                  <select
                    value={formData.category || 'software'}
                    onChange={(e) => updateField('category', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-steel-600 rounded-xl bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 placeholder:text-slate-400 dark:placeholder:text-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">
                    Criticality
                  </label>
                  <select
                    value={formData.criticality || 'medium'}
                    onChange={(e) => updateField('criticality', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-steel-600 rounded-xl bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 placeholder:text-slate-400 dark:placeholder:text-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {Object.entries(CRITICALITY_CONFIG).map(([value, config]) => (
                      <option key={value} value={value}>{config.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">
                  Website
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => updateField('website', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 placeholder:text-slate-400 dark:placeholder:text-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      errors.website ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-steel-600'
                    }`}
                    placeholder="https://vendor.com"
                  />
                </div>
                {errors.website && (
                  <p className="mt-1 text-sm text-red-600">{errors.website}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Contact */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">
                  Primary Contact Name
                </label>
                <input
                  type="text"
                  value={formData.primaryContactName || ''}
                  onChange={(e) => updateField('primaryContactName', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-steel-600 rounded-xl bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 placeholder:text-slate-400 dark:placeholder:text-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">
                  Contact Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={formData.primaryContactEmail || ''}
                    onChange={(e) => updateField('primaryContactEmail', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 placeholder:text-slate-400 dark:placeholder:text-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      errors.primaryContactEmail ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-steel-600'
                    }`}
                    placeholder="contact@vendor.com"
                  />
                </div>
                {errors.primaryContactEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.primaryContactEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">
                  Contact Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    value={formData.primaryContactPhone || ''}
                    onChange={(e) => updateField('primaryContactPhone', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-steel-600 rounded-xl bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 placeholder:text-slate-400 dark:placeholder:text-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">
                  Certifications
                </label>
                <div className="flex flex-wrap gap-2">
                  {['SOC 2 Type II', 'ISO 27001', 'HIPAA', 'PCI DSS', 'FedRAMP'].map((cert) => (
                    <button
                      key={cert}
                      type="button"
                      onClick={() => {
                        const certs = formData.certifications || [];
                        if (certs.includes(cert)) {
                          updateField('certifications', certs.filter(c => c !== cert));
                        } else {
                          updateField('certifications', [...certs, cert]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        (formData.certifications || []).includes(cert)
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-400 dark:border-emerald-600'
                          : 'bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-300 border-2 border-transparent hover:bg-slate-200 dark:hover:bg-steel-600'
                      }`}
                    >
                      <Shield className="w-3 h-3 inline mr-1" />
                      {cert}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Contract */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">
                    Contract Start Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="date"
                      value={formData.contractStartDate?.split('T')[0] || ''}
                      onChange={(e) => updateField('contractStartDate', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-steel-600 rounded-xl bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 placeholder:text-slate-400 dark:placeholder:text-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">
                    Contract End Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="date"
                      value={formData.contractEndDate?.split('T')[0] || ''}
                      onChange={(e) => updateField('contractEndDate', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-steel-600 rounded-xl bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 placeholder:text-slate-400 dark:placeholder:text-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">
                  Contract Value (Annual)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    value={formData.contractValue || ''}
                    onChange={(e) => updateField('contractValue', parseFloat(e.target.value) || undefined)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-steel-600 rounded-xl bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 placeholder:text-slate-400 dark:placeholder:text-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="50000"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoRenewal || false}
                    onChange={(e) => updateField('autoRenewal', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                </label>
                <span className="text-sm text-slate-700 dark:text-steel-300">Auto-renewal enabled</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-1.5">
                  Data Classification
                </label>
                <select
                  value={formData.dataClassification || 'internal'}
                  onChange={(e) => updateField('dataClassification', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-steel-600 rounded-xl bg-white dark:bg-midnight-800 text-slate-900 dark:text-steel-100 placeholder:text-slate-400 dark:placeholder:text-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="public">Public</option>
                  <option value="internal">Internal</option>
                  <option value="confidential">Confidential</option>
                  <option value="restricted">Restricted</option>
                </select>
              </div>

              {errors.submit && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {errors.submit}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-steel-700 bg-slate-50 dark:bg-midnight-800">
          <button
            onClick={() => currentStep > 1 ? setCurrentStep((currentStep - 1) as 1 | 2) : onClose()}
            className="px-4 py-2 text-slate-600 dark:text-steel-300 hover:text-slate-800 dark:hover:text-steel-100 transition-colors"
          >
            {currentStep > 1 ? 'Back' : 'Cancel'}
          </button>

          <button
            onClick={() => {
              if (currentStep < 3) {
                setCurrentStep((currentStep + 1) as 2 | 3);
              } else {
                handleSave();
              }
            }}
            disabled={saving || (currentStep === 1 && !formData.name?.trim())}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : currentStep < 3 ? (
              'Next'
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Vendor
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AddVendorModal;
