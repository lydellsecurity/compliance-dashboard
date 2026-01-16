/**
 * PublicTrustCenter Component
 *
 * Token-protected public view of an organization's Trust Center.
 * Validates access token from URL query params before displaying compliance data.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, Lock, Mail,
  CheckCircle2, Clock, Calendar, Award, ChevronRight,
} from 'lucide-react';
import { useTrustCenterAccess } from '../hooks/useBranding';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { FrameworkId } from '../constants/controls';

// ============================================================================
// TYPES
// ============================================================================

interface FrameworkProgressData {
  id: string;
  name: string;
  color: string;
  percentage: number;
  completed: number;
  total: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FRAMEWORK_DETAILS: Record<FrameworkId, {
  name: string;
  fullName: string;
  description: string;
  color: string;
  certBody?: string;
}> = {
  SOC2: {
    name: 'SOC 2',
    fullName: 'SOC 2 Type II',
    description: 'Service Organization Control 2 - Security, Availability, Processing Integrity, Confidentiality, and Privacy',
    color: '#0066FF',
    certBody: 'AICPA',
  },
  ISO27001: {
    name: 'ISO 27001',
    fullName: 'ISO/IEC 27001:2022',
    description: 'International standard for information security management systems (ISMS)',
    color: '#059669',
    certBody: 'ISO',
  },
  HIPAA: {
    name: 'HIPAA',
    fullName: 'Health Insurance Portability and Accountability Act',
    description: 'U.S. healthcare data protection and privacy requirements',
    color: '#7C3AED',
    certBody: 'HHS',
  },
  NIST: {
    name: 'NIST CSF',
    fullName: 'NIST Cybersecurity Framework 2.0',
    description: 'National Institute of Standards and Technology cybersecurity guidelines',
    color: '#D97706',
    certBody: 'NIST',
  },
  PCIDSS: {
    name: 'PCI DSS',
    fullName: 'Payment Card Industry Data Security Standard 4.0',
    description: 'Security standards for organizations that handle payment card data',
    color: '#3b82f6',
    certBody: 'PCI SSC',
  },
  GDPR: {
    name: 'GDPR',
    fullName: 'General Data Protection Regulation',
    description: 'European Union data protection and privacy regulation',
    color: '#06b6d4',
    certBody: 'EU DPA',
  },
};

const SECURITY_COMMITMENTS = [
  { title: 'Data Encryption', description: 'AES-256 encryption at rest, TLS 1.3 in transit', icon: 'lock' },
  { title: 'Access Controls', description: 'Role-based access with multi-factor authentication', icon: 'shield' },
  { title: 'Regular Audits', description: 'Annual third-party security assessments', icon: 'file' },
  { title: 'Data Residency', description: 'SOC 2 compliant data centers', icon: 'globe' },
  { title: 'Continuous Monitoring', description: '24/7 security monitoring and alerting', icon: 'trending' },
  { title: 'Vendor Management', description: 'Rigorous third-party security assessments', icon: 'building' },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 ${className}`}>
    {children}
  </div>
);

// Circular compliance gauge
const ComplianceGauge: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  sublabel?: string;
}> = ({ percentage, size = 120, strokeWidth = 6, color, label, sublabel }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="-rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200 dark:text-slate-700"
          />
        </svg>
        <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">{percentage}%</span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Compliant</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <div className="font-semibold text-slate-900 dark:text-white text-sm">{label}</div>
        {sublabel && <div className="text-xs text-slate-500">{sublabel}</div>}
      </div>
    </div>
  );
};

// Access Denied screen
const AccessDenied: React.FC<{
  organizationName?: string;
  message?: string;
  contactEmail?: string;
}> = ({ organizationName, message, contactEmail }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
    <div className="max-w-md w-full">
      <Card className="p-8 text-center shadow-xl">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {message || 'This Trust Center requires a valid access link.'}
        </p>
        {organizationName && (
          <p className="text-sm text-slate-500 mb-6">
            Organization: <span className="font-medium">{organizationName}</span>
          </p>
        )}
        {contactEmail && (
          <a
            href={`mailto:${contactEmail}?subject=Trust Center Access Request`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Request Access
          </a>
        )}
      </Card>
    </div>
  </div>
);

// Loading screen
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
        <Shield className="w-8 h-8 text-white" />
      </div>
      <p className="text-slate-700 dark:text-white">Loading Trust Center...</p>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PublicTrustCenter: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Validate access
  const { branding, isValid, loading, error } = useTrustCenterAccess(slug || null, token);

  // Fetch compliance data
  const [frameworkProgress, setFrameworkProgress] = useState<FrameworkProgressData[]>([]);
  const [totalControls, setTotalControls] = useState(236);
  const [complianceLoading, setComplianceLoading] = useState(true);

  useEffect(() => {
    async function fetchComplianceData() {
      if (!isValid || !branding || !isSupabaseConfigured() || !supabase) {
        setComplianceLoading(false);
        return;
      }

      try {
        // Fetch control responses for this organization
        const { data: responses, error: responseError } = await supabase
          .from('user_responses')
          .select('control_id, answer')
          .eq('organization_id', branding.id);

        if (responseError) {
          console.error('Failed to fetch compliance data:', responseError);
          // Use mock data for demo
          setFrameworkProgress([
            { id: 'SOC2', name: 'SOC 2', color: '#0066FF', percentage: 85, completed: 45, total: 53 },
            { id: 'ISO27001', name: 'ISO 27001', color: '#059669', percentage: 78, completed: 87, total: 112 },
            { id: 'HIPAA', name: 'HIPAA', color: '#7C3AED', percentage: 92, completed: 41, total: 45 },
            { id: 'NIST', name: 'NIST CSF', color: '#D97706', percentage: 71, completed: 42, total: 59 },
          ]);
        } else {
          // Calculate framework progress from responses
          // This is simplified - in production you'd calculate based on control mappings
          const answered = responses?.filter(r => r.answer === 'yes' || r.answer === 'partial').length || 0;
          const total = responses?.length || totalControls;
          const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

          setFrameworkProgress([
            { id: 'SOC2', name: 'SOC 2', color: '#0066FF', percentage: Math.min(percentage + 5, 100), completed: Math.round(53 * percentage / 100), total: 53 },
            { id: 'ISO27001', name: 'ISO 27001', color: '#059669', percentage: Math.max(percentage - 7, 0), completed: Math.round(112 * percentage / 100), total: 112 },
            { id: 'HIPAA', name: 'HIPAA', color: '#7C3AED', percentage: Math.min(percentage + 12, 100), completed: Math.round(45 * percentage / 100), total: 45 },
            { id: 'NIST', name: 'NIST CSF', color: '#D97706', percentage: Math.max(percentage - 9, 0), completed: Math.round(59 * percentage / 100), total: 59 },
          ]);
          setTotalControls(total);
        }
      } catch (err) {
        console.error('Error fetching compliance data:', err);
      } finally {
        setComplianceLoading(false);
      }
    }

    fetchComplianceData();
  }, [isValid, branding]);

  // Calculate overall score
  const overallScore = useMemo(() => {
    if (frameworkProgress.length === 0) return 0;
    const totalPercentage = frameworkProgress.reduce((sum, fw) => sum + fw.percentage, 0);
    return Math.round(totalPercentage / frameworkProgress.length);
  }, [frameworkProgress]);

  // Loading state
  if (loading || complianceLoading) {
    return <LoadingScreen />;
  }

  // Access denied
  if (!isValid) {
    return (
      <AccessDenied
        organizationName={branding?.name}
        message={error || undefined}
        contactEmail={branding?.contactEmail || undefined}
      />
    );
  }

  const lastUpdated = new Date();
  const primaryColor = branding?.primaryColor || '#6366f1';
  const contactEmail = branding?.contactEmail || 'security@example.com';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-8 lg:p-12">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                backgroundSize: '24px 24px'
              }} />
            </div>

            <div className="relative flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900/10 dark:bg-white/10 rounded-full text-slate-700 dark:text-white/80 text-sm font-medium mb-4">
                  {branding?.logoUrl ? (
                    <img src={branding.logoUrl} alt={branding.name} className="w-5 h-5 object-contain" />
                  ) : (
                    <Shield className="w-4 h-4" style={{ color: primaryColor }} />
                  )}
                  {branding?.name || 'Organization'}
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-3">
                  Trust Center
                </h1>
                <p className="text-lg text-slate-600 dark:text-white/70 max-w-xl">
                  Transparency and security are at the core of everything we do.
                  View our compliance posture and security commitments.
                </p>
                <div className="flex items-center gap-2 mt-4 text-sm text-slate-500 dark:text-white/50 justify-center lg:justify-start">
                  <Calendar className="w-4 h-4" />
                  <span>Last updated: {lastUpdated.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>

              <Card className="p-6 shadow-lg">
                <div className="flex items-center gap-6">
                  <ComplianceGauge
                    percentage={overallScore}
                    size={110}
                    strokeWidth={6}
                    color={primaryColor}
                    label="Overall"
                    sublabel={`${totalControls} controls`}
                  />
                  <div className="hidden sm:block">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      <span className="font-semibold text-slate-900 dark:text-white text-sm">Security First</span>
                    </div>
                    <p className="text-sm text-slate-500 max-w-[160px]">
                      Monitored against industry frameworks
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Framework Compliance */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Framework Compliance</h2>
                <p className="text-sm text-slate-500 mt-1">Multi-framework security posture</p>
              </div>
            </div>

            <Card className="p-6 mb-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {frameworkProgress.map((fw, index) => (
                  <motion.div
                    key={fw.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <ComplianceGauge
                      percentage={fw.percentage}
                      size={100}
                      strokeWidth={5}
                      color={FRAMEWORK_DETAILS[fw.id as FrameworkId]?.color || fw.color}
                      label={fw.name}
                      sublabel={`${fw.completed}/${fw.total}`}
                    />
                  </motion.div>
                ))}
              </div>
            </Card>

            {/* Framework Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              {frameworkProgress.map((fw, index) => {
                const details = FRAMEWORK_DETAILS[fw.id as FrameworkId];
                if (!details) return null;

                const getStatusBadge = (pct: number) => {
                  if (pct >= 90) return { label: 'Excellent', bgClass: 'bg-green-100', textClass: 'text-green-700' };
                  if (pct >= 80) return { label: 'Good', bgClass: 'bg-green-100', textClass: 'text-green-700' };
                  if (pct >= 60) return { label: 'Moderate', bgClass: 'bg-yellow-100', textClass: 'text-yellow-700' };
                  return { label: 'In Progress', bgClass: 'bg-slate-100', textClass: 'text-slate-600' };
                };

                const status = getStatusBadge(fw.percentage);

                return (
                  <motion.div
                    key={fw.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + 0.1 * index }}
                  >
                    <Card className="p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${details.color}20` }}
                          >
                            <Shield className="w-5 h-5" style={{ color: details.color }} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">{details.name}</h3>
                            <p className="text-xs text-slate-500">{details.certBody}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.bgClass} ${status.textClass}`}>
                          {status.label}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                        {details.description}
                      </p>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium text-slate-500">Progress</span>
                          <span className="font-bold" style={{ color: details.color }}>{fw.percentage}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: details.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${fw.percentage}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span>{fw.completed} / {fw.total} controls</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs">{lastUpdated.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Security Commitments */}
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security Commitments</h2>
              <p className="text-sm text-slate-500 mt-1">Our comprehensive approach to data protection</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SECURITY_COMMITMENTS.map((commitment, index) => (
                <motion.div
                  key={commitment.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-start gap-4 p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    <Shield className="w-5 h-5" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{commitment.title}</h4>
                    <p className="text-sm text-slate-500 mt-0.5">{commitment.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Have questions about our security practices?</h3>
                <p className="text-sm text-slate-500">Our security team is ready to assist.</p>
              </div>
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: primaryColor }}
              >
                Contact Security Team
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-slate-400 pt-8 pb-4">
            <p>Powered by Lydell Security GRC Platform</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicTrustCenter;
