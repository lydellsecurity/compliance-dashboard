/**
 * Trust Center Component
 *
 * Public-facing, read-only dashboard showcasing framework compliance scores.
 * Professional corporate design for enterprise stakeholders.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, CheckCircle2, Clock, Award, Lock,
  FileCheck, Building2, Calendar, TrendingUp, Globe, ChevronRight,
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
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`card ${className}`}>
    {children}
  </div>
);

// Corporate circular gauge
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
            className="text-steel-700 dark:text-steel-700 light:text-slate-200"
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
          <span className="text-2xl font-bold text-primary">{percentage}%</span>
          <span className="text-[10px] font-semibold text-steel-400 uppercase tracking-wider">Compliant</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <div className="font-semibold text-primary text-sm">{label}</div>
        {sublabel && <div className="text-xs text-secondary">{sublabel}</div>}
      </div>
    </div>
  );
};

// Framework card
const FrameworkCard: React.FC<{
  frameworkId: FrameworkId;
  percentage: number;
  completed: number;
  total: number;
  lastUpdated?: Date;
}> = ({ frameworkId, percentage, completed, total, lastUpdated }) => {
  const details = FRAMEWORK_DETAILS[frameworkId];

  const getStatusBadge = (pct: number) => {
    if (pct >= 90) return { label: 'Excellent', bgClass: 'bg-status-success/10', textClass: 'text-status-success' };
    if (pct >= 80) return { label: 'Good', bgClass: 'bg-status-success/10', textClass: 'text-status-success' };
    if (pct >= 60) return { label: 'Moderate', bgClass: 'bg-status-warning/10', textClass: 'text-status-warning' };
    return { label: 'In Progress', bgClass: 'bg-steel-700 dark:bg-steel-700 light:bg-slate-100', textClass: 'text-steel-400' };
  };

  const status = getStatusBadge(percentage);

  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${details.color}10` }}
          >
            <Shield className="w-5 h-5" style={{ color: details.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-primary">{details.name}</h3>
            <p className="text-xs text-secondary">{details.certBody}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.bgClass} ${status.textClass}`}>
          {status.label}
        </span>
      </div>

      <p className="text-sm text-secondary mb-4 line-clamp-2">
        {details.description}
      </p>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-secondary">Progress</span>
          <span className="font-bold" style={{ color: details.color }}>{percentage}%</span>
        </div>
        <div className="h-2 bg-steel-700 dark:bg-steel-700 light:bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: details.color }}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-secondary">
          <CheckCircle2 className="w-4 h-4 text-status-success" />
          <span>{completed} / {total} controls</span>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-steel-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs">{lastUpdated.toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

// Security commitment item
const SecurityItem: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon, title, description,
}) => (
  <div className="flex items-start gap-4 p-4 rounded-lg bg-steel-800 dark:bg-steel-800 light:bg-slate-50 border border-steel-700 dark:border-steel-700 light:border-slate-200">
    <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center text-accent-400 flex-shrink-0">
      {icon}
    </div>
    <div>
      <h4 className="font-semibold text-primary text-sm">{title}</h4>
      <p className="text-sm text-secondary mt-0.5">{description}</p>
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

  const overallScore = useMemo(() => {
    if (frameworkProgress.length === 0) return 0;
    const totalPercentage = frameworkProgress.reduce((sum, fw) => sum + fw.percentage, 0);
    return Math.round(totalPercentage / frameworkProgress.length);
  }, [frameworkProgress]);

  const lastUpdated = new Date();

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 p-8 lg:p-12">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
        </div>

        <div className="relative flex flex-col lg:flex-row items-center gap-8">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-white/80 text-sm font-medium mb-4">
              <Shield className="w-4 h-4" />
              {organizationName}
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
              Trust Center
            </h1>
            <p className="text-lg text-white/70 max-w-xl">
              Transparency and security are at the core of everything we do.
              View our compliance posture and security commitments.
            </p>
            <div className="flex items-center gap-2 mt-4 text-sm text-white/50 justify-center lg:justify-start">
              <Calendar className="w-4 h-4" />
              <span>Last updated: {lastUpdated.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          <Card className="p-6 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-6">
              <ComplianceGauge
                percentage={overallScore}
                size={110}
                strokeWidth={6}
                color="#0066FF"
                label="Overall"
                sublabel={`${stats.totalControls} controls`}
              />
              <div className="hidden sm:block">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">Security First</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[160px]">
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
            <h2 className="text-xl font-bold text-primary">Framework Compliance</h2>
            <p className="text-sm text-secondary mt-1">Multi-framework security posture</p>
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

        <div className="grid md:grid-cols-2 gap-4">
          {frameworkProgress.map((fw, index) => (
            <motion.div
              key={fw.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + 0.1 * index }}
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
      </div>

      {/* Security Commitments */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-primary">Security Commitments</h2>
          <p className="text-sm text-secondary mt-1">Our comprehensive approach to data protection</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SecurityItem
            icon={<Lock className="w-5 h-5" />}
            title="Data Encryption"
            description="AES-256 encryption at rest, TLS 1.3 in transit"
          />
          <SecurityItem
            icon={<Shield className="w-5 h-5" />}
            title="Access Controls"
            description="Role-based access with multi-factor authentication"
          />
          <SecurityItem
            icon={<FileCheck className="w-5 h-5" />}
            title="Regular Audits"
            description="Annual third-party security assessments"
          />
          <SecurityItem
            icon={<Globe className="w-5 h-5" />}
            title="Data Residency"
            description="SOC 2 compliant data centers"
          />
          <SecurityItem
            icon={<TrendingUp className="w-5 h-5" />}
            title="Continuous Monitoring"
            description="24/7 security monitoring and alerting"
          />
          <SecurityItem
            icon={<Building2 className="w-5 h-5" />}
            title="Vendor Management"
            description="Rigorous third-party security assessments"
          />
        </div>
      </div>

      {/* Contact */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-primary">Have questions about our security practices?</h3>
            <p className="text-sm text-secondary">Our security team is ready to assist.</p>
          </div>
          <a
            href="mailto:security@lydellsecurity.com"
            className="btn-primary"
          >
            Contact Security Team
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </Card>
    </div>
  );
};

export default TrustCenter;
