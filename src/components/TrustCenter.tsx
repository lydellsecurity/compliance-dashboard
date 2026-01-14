/**
 * Trust Center Component
 *
 * Public-facing, read-only dashboard showcasing framework compliance scores.
 * Designed for transparency and building stakeholder trust.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, CheckCircle2, Clock, Award, ExternalLink, Lock,
  FileCheck, Building2, Calendar, TrendingUp, Globe,
} from 'lucide-react';
import type { UseComplianceReturn } from '../hooks/useCompliance';
import type { FrameworkId } from '../constants/controls';

// ============================================================================
// TYPES
// ============================================================================

interface TrustCenterProps {
  compliance: UseComplianceReturn;
  organizationName?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FRAMEWORK_DETAILS: Record<FrameworkId, {
  name: string;
  fullName: string;
  description: string;
  icon: string;
  color: string;
  certBody?: string;
}> = {
  SOC2: {
    name: 'SOC 2',
    fullName: 'SOC 2 Type II',
    description: 'Service Organization Control 2 - Security, Availability, Processing Integrity, Confidentiality, and Privacy',
    icon: '🛡️',
    color: '#3B82F6',
    certBody: 'AICPA',
  },
  ISO27001: {
    name: 'ISO 27001',
    fullName: 'ISO/IEC 27001:2022',
    description: 'International standard for information security management systems (ISMS)',
    icon: '🌐',
    color: '#10B981',
    certBody: 'ISO',
  },
  HIPAA: {
    name: 'HIPAA',
    fullName: 'Health Insurance Portability and Accountability Act',
    description: 'U.S. healthcare data protection and privacy requirements',
    icon: '🏥',
    color: '#8B5CF6',
    certBody: 'HHS',
  },
  NIST: {
    name: 'NIST CSF',
    fullName: 'NIST Cybersecurity Framework 2.0',
    description: 'National Institute of Standards and Technology cybersecurity guidelines',
    icon: '🔒',
    color: '#F59E0B',
    certBody: 'NIST',
  },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const GlassPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 shadow-xl ${className}`}>
    {children}
  </div>
);

// High-fidelity circular gauge component
const ComplianceGauge: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  sublabel?: string;
  animate?: boolean;
}> = ({ percentage, size = 160, strokeWidth = 12, color, label, sublabel, animate = true }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getStatusColor = (pct: number) => {
    if (pct >= 80) return '#10B981';
    if (pct >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const statusColor = getStatusColor(percentage);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Outer glow */}
        <div
          className="absolute inset-2 rounded-full blur-2xl opacity-30"
          style={{ backgroundColor: color }}
        />

        {/* Background ring */}
        <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200 dark:text-white/10"
          />
        </svg>

        {/* Progress ring */}
        <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
          <defs>
            <linearGradient id={`gauge-gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={statusColor} />
            </linearGradient>
          </defs>
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#gauge-gradient-${label})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={animate ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-4xl font-bold text-slate-900 dark:text-white"
            initial={animate ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {percentage}%
          </motion.span>
          <span className="text-xs font-medium text-slate-500 dark:text-white/50 uppercase tracking-wider">
            Compliant
          </span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <div className="font-bold text-slate-900 dark:text-white text-lg">{label}</div>
        {sublabel && (
          <div className="text-sm text-slate-500 dark:text-white/50">{sublabel}</div>
        )}
      </div>
    </div>
  );
};

// Framework card for detailed view
const FrameworkCard: React.FC<{
  frameworkId: FrameworkId;
  percentage: number;
  completed: number;
  total: number;
  lastUpdated?: Date;
}> = ({ frameworkId, percentage, completed, total, lastUpdated }) => {
  const details = FRAMEWORK_DETAILS[frameworkId];

  const getStatusBadge = (pct: number) => {
    if (pct >= 90) return { label: 'Excellent', color: '#10B981', bg: 'bg-emerald-100 dark:bg-emerald-900/30' };
    if (pct >= 80) return { label: 'Good', color: '#22C55E', bg: 'bg-green-100 dark:bg-green-900/30' };
    if (pct >= 60) return { label: 'Moderate', color: '#F59E0B', bg: 'bg-amber-100 dark:bg-amber-900/30' };
    return { label: 'Needs Work', color: '#EF4444', bg: 'bg-red-100 dark:bg-red-900/30' };
  };

  const status = getStatusBadge(percentage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <GlassPanel className="p-6 hover:shadow-2xl transition-shadow duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${details.color}15` }}
            >
              {details.icon}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">{details.name}</h3>
              <p className="text-sm text-slate-500 dark:text-white/50">{details.certBody}</p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bg}`}
            style={{ color: status.color }}
          >
            {status.label}
          </span>
        </div>

        <p className="text-sm text-slate-600 dark:text-white/70 mb-4 line-clamp-2">
          {details.description}
        </p>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-slate-700 dark:text-white/80">Compliance Progress</span>
            <span className="font-bold" style={{ color: details.color }}>{percentage}%</span>
          </div>
          <div className="h-3 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: details.color }}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-white/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{completed} / {total} controls</span>
            </div>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-white/50">
              <Clock className="w-4 h-4" />
              <span>Updated {lastUpdated.toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </GlassPanel>
    </motion.div>
  );
};

// Security badge component
const SecurityBadge: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
      {icon}
    </div>
    <div>
      <h4 className="font-semibold text-slate-900 dark:text-white">{title}</h4>
      <p className="text-sm text-slate-600 dark:text-white/60">{description}</p>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TrustCenter: React.FC<TrustCenterProps> = ({
  compliance,
  organizationName = 'LYDELL SECURITY',
}) => {
  const { frameworkProgress, stats } = compliance;

  // Calculate overall compliance score
  const overallScore = useMemo(() => {
    if (frameworkProgress.length === 0) return 0;
    const totalPercentage = frameworkProgress.reduce((sum, fw) => sum + fw.percentage, 0);
    return Math.round(totalPercentage / frameworkProgress.length);
  }, [frameworkProgress]);

  const lastUpdated = new Date();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

        <div className="relative max-w-7xl mx-auto px-6 py-16 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            {/* Organization badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
              <Shield className="w-5 h-5 text-white" />
              <span className="text-white font-medium">{organizationName}</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Trust Center
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
              Transparency and security are at the core of everything we do.
              View our compliance posture and security commitments.
            </p>

            {/* Overall compliance score */}
            <div className="inline-block">
              <GlassPanel className="p-8 bg-white/95 dark:bg-slate-800/95">
                <div className="flex items-center gap-8">
                  <ComplianceGauge
                    percentage={overallScore}
                    size={140}
                    color="#3B82F6"
                    label="Overall Compliance"
                    sublabel={`${stats.totalControls} controls assessed`}
                  />
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      <span className="font-semibold text-slate-900 dark:text-white">Security First</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-white/60 max-w-xs">
                      Continuously monitored against industry-leading security frameworks
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-sm text-slate-500 dark:text-white/50">
                      <Calendar className="w-4 h-4" />
                      <span>Last updated: {lastUpdated.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Framework Compliance Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Framework Compliance
            </h2>
            <p className="text-lg text-slate-600 dark:text-white/60 max-w-2xl mx-auto">
              We maintain compliance with multiple security frameworks to ensure
              comprehensive protection for your data.
            </p>
          </div>

          {/* Framework gauges */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {frameworkProgress.map((fw, index) => (
              <motion.div
                key={fw.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <GlassPanel className="p-6 text-center">
                  <ComplianceGauge
                    percentage={fw.percentage}
                    size={120}
                    color={fw.color}
                    label={fw.name}
                    sublabel={`${fw.completed}/${fw.total} controls`}
                  />
                </GlassPanel>
              </motion.div>
            ))}
          </div>

          {/* Detailed framework cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {frameworkProgress.map((fw, index) => (
              <motion.div
                key={fw.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + 0.1 * index }}
              >
                <FrameworkCard
                  frameworkId={fw.id as FrameworkId}
                  percentage={fw.percentage}
                  completed={fw.completed}
                  total={fw.total}
                  lastUpdated={lastUpdated}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Security Commitments Section */}
      <div className="bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Our Security Commitments
              </h2>
              <p className="text-lg text-slate-600 dark:text-white/60 max-w-2xl mx-auto">
                We take security seriously. Here are the measures we have in place
                to protect your data.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SecurityBadge
                icon={<Lock className="w-5 h-5" />}
                title="Data Encryption"
                description="All data is encrypted at rest using AES-256 and in transit using TLS 1.3"
              />
              <SecurityBadge
                icon={<Shield className="w-5 h-5" />}
                title="Access Controls"
                description="Role-based access control with multi-factor authentication required"
              />
              <SecurityBadge
                icon={<FileCheck className="w-5 h-5" />}
                title="Regular Audits"
                description="Annual third-party security audits and penetration testing"
              />
              <SecurityBadge
                icon={<Globe className="w-5 h-5" />}
                title="Data Residency"
                description="Data stored in SOC 2 compliant data centers with geographic options"
              />
              <SecurityBadge
                icon={<TrendingUp className="w-5 h-5" />}
                title="Continuous Monitoring"
                description="24/7 security monitoring and incident response capabilities"
              />
              <SecurityBadge
                icon={<Building2 className="w-5 h-5" />}
                title="Vendor Management"
                description="Rigorous third-party vendor security assessment program"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <p className="text-slate-500 dark:text-white/50 mb-4">
            Have questions about our security practices?
          </p>
          <a
            href="mailto:security@lydellsecurity.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Contact Security Team
          </a>
        </div>
      </div>
    </div>
  );
};

export default TrustCenter;
