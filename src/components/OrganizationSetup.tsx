/**
 * OrganizationSetup Component
 *
 * Onboarding modal shown when a user has no organization memberships.
 * Guides users through creating their first organization with branding.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Building2, Check, ArrowRight, ArrowLeft,
  Upload, X, Loader2, Globe, AlertCircle,
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { generateSlug } from '../utils/slug';
import { BRAND_COLORS } from '../types/branding.types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

interface OrganizationSetupProps {
  isOpen: boolean;
  onComplete?: () => void;
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  contactEmail: string;
  primaryColor: string;
  logoFile: File | null;
  logoPreview: string | null;
}

type Step = 'name' | 'branding' | 'review';

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS: { id: Step; title: string; description: string }[] = [
  { id: 'name', title: 'Organization', description: 'Basic information' },
  { id: 'branding', title: 'Branding', description: 'Visual identity' },
  { id: 'review', title: 'Review', description: 'Confirm details' },
];

const INITIAL_FORM: FormData = {
  name: '',
  slug: '',
  description: '',
  contactEmail: '',
  primaryColor: '#6366f1',
  logoFile: null,
  logoPreview: null,
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const StepIndicator: React.FC<{ currentStep: Step }> = ({ currentStep }) => {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
              </div>
              <span
                className={`text-xs mt-1.5 ${
                  isCurrent ? 'text-blue-600 font-medium' : 'text-slate-500'
                }`}
              >
                {step.title}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`w-16 h-0.5 mb-6 ${
                  index < currentIndex ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const LogoUploader: React.FC<{
  logoPreview: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  primaryColor: string;
}> = ({ logoPreview, onUpload, onRemove, primaryColor }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        onUpload(file);
      }
    },
    [onUpload]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Logo (optional)
      </label>
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          logoPreview
            ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {logoPreview ? (
          <div className="flex items-center justify-center gap-4">
            <img
              src={logoPreview}
              alt="Logo preview"
              className="w-16 h-16 object-contain rounded-lg"
            />
            <div className="text-left">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Logo uploaded
              </p>
              <button
                type="button"
                onClick={onRemove}
                className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1 mt-1"
              >
                <X className="w-3 h-3" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <Upload className="w-6 h-6" style={{ color: primaryColor }} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Drag and drop your logo, or{' '}
              <label className="text-blue-600 cursor-pointer hover:underline">
                browse
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </p>
            <p className="text-xs text-slate-400">PNG, JPG, SVG up to 2MB</p>
          </>
        )}
      </div>
    </div>
  );
};

const ColorPicker: React.FC<{
  value: string;
  onChange: (color: string) => void;
}> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Primary Color
      </label>
      <div className="flex flex-wrap gap-2">
        {BRAND_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-9 h-9 rounded-lg transition-transform hover:scale-110 ${
              value === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-9 h-9 rounded-lg cursor-pointer border-2 border-dashed border-slate-300"
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const OrganizationSetup: React.FC<OrganizationSetupProps> = ({ isOpen, onComplete }) => {
  const { createOrganization, refreshOrganizations } = useOrganization();
  const [step, setStep] = useState<Step>('name');
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name
  const updateName = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugTouched ? prev.slug : generateSlug(name),
    }));
    if (!slugTouched) {
      checkSlugAvailability(generateSlug(name));
    }
  };

  // Check slug availability
  const checkSlugAvailability = async (slug: string) => {
    if (!slug || !isSupabaseConfigured() || !supabase) {
      setSlugAvailable(null);
      return;
    }

    setCheckingSlug(true);
    try {
      // Use maybeSingle() instead of single() to handle 0 rows gracefully
      const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      // If no error and no data, slug is available
      // If data exists, slug is taken
      if (error) {
        console.warn('Slug check error:', error);
        setSlugAvailable(true); // Assume available on error
      } else {
        setSlugAvailable(!data);
      }
    } catch {
      setSlugAvailable(true); // Assume available if error (likely means not found)
    } finally {
      setCheckingSlug(false);
    }
  };

  // Handle slug change
  const updateSlug = (slug: string) => {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlugTouched(true);
    setForm((prev) => ({ ...prev, slug: cleanSlug }));
    checkSlugAvailability(cleanSlug);
  };

  // Handle logo upload
  const handleLogoUpload = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setForm((prev) => ({
        ...prev,
        logoFile: file,
        logoPreview: e.target?.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Navigation
  const canProceed = () => {
    switch (step) {
      case 'name':
        return form.name.length >= 2 && form.slug.length >= 2 && slugAvailable !== false;
      case 'branding':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1].id);
    }
  };

  const goBack = () => {
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx > 0) {
      setStep(STEPS[idx - 1].id);
    }
  };

  // Create organization
  const handleCreate = async () => {
    setCreating(true);
    setError(null);

    try {
      await createOrganization({
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        contactEmail: form.contactEmail || undefined,
        primaryColor: form.primaryColor,
        logoFile: form.logoFile || undefined,
      });

      await refreshOrganizations();
      onComplete?.();
    } catch (err) {
      console.error('Failed to create organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Welcome to Lydell Security
              </h2>
              <p className="text-sm text-slate-500">Set up your organization to get started</p>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-6">
          <StepIndicator currentStep={step} />
        </div>

        {/* Form Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Name */}
            {step === 'name' && (
              <motion.div
                key="name"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Organization Name *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => updateName(e.target.value)}
                      placeholder="Acme Corporation"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    URL Slug *
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => updateSlug(e.target.value)}
                      placeholder="acme-corp"
                      className="w-full pl-10 pr-10 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {checkingSlug && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
                    )}
                    {!checkingSlug && slugAvailable === true && form.slug && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                    {!checkingSlug && slugAvailable === false && (
                      <X className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Your Trust Center will be at: <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">/trust/{form.slug || 'your-slug'}</code>
                  </p>
                  {slugAvailable === false && (
                    <p className="text-xs text-red-500 mt-1">This slug is already taken</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Description (optional)
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of your organization..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Branding */}
            {step === 'branding' && (
              <motion.div
                key="branding"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <LogoUploader
                  logoPreview={form.logoPreview}
                  onUpload={handleLogoUpload}
                  onRemove={() => setForm((prev) => ({ ...prev, logoFile: null, logoPreview: null }))}
                  primaryColor={form.primaryColor}
                />

                <ColorPicker
                  value={form.primaryColor}
                  onChange={(color) => setForm((prev) => ({ ...prev, primaryColor: color }))}
                />

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Contact Email (optional)
                  </label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="security@company.com"
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    Displayed on your Trust Center for security inquiries
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 3: Review */}
            {step === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    {form.logoPreview ? (
                      <img
                        src={form.logoPreview}
                        alt="Logo"
                        className="w-14 h-14 object-contain rounded-lg"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${form.primaryColor}15` }}
                      >
                        <Building2 className="w-7 h-7" style={{ color: form.primaryColor }} />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                        {form.name}
                      </h3>
                      <p className="text-sm text-slate-500">/trust/{form.slug}</p>
                    </div>
                    <div
                      className="ml-auto w-6 h-6 rounded-full"
                      style={{ backgroundColor: form.primaryColor }}
                    />
                  </div>
                </div>

                {form.description && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Description
                    </label>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                      {form.description}
                    </p>
                  </div>
                )}

                {form.contactEmail && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Contact Email
                    </label>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                      {form.contactEmail}
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm">
                        What happens next
                      </h4>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                        <li>• Your organization will be created</li>
                        <li>• You'll be added as the owner</li>
                        <li>• 236 security controls will be initialized</li>
                        <li>• You can invite team members anytime</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 'name'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              step === 'name'
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {step === 'review' ? (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create Organization
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default OrganizationSetup;
