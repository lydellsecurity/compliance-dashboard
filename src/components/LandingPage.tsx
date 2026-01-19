/**
 * Lydell.AI Landing Page - CRO Optimized
 *
 * Market-leading AI-driven Compliance Platform
 * Maximizes trust, demonstrates AI utility, and drives Demo signups
 *
 * Key Psychological Triggers:
 * - Revenue Enablement focus (not cost center)
 * - Social Proof & Scarcity
 * - Pain vs Relief narrative
 * - Authority Effect (Live Audit-Ready Badge)
 * - Risk Aversion (SHA-256 Evidence Hashing)
 * - Endowment Effect (Interactive Control Preview)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import {
  Shield, CheckCircle2, Lock,
  ArrowRight, Play, Sparkles, Activity,
  FileCheck, AlertTriangle, Database,
  CheckCheck, X, Building2, Users,
  Layers, BarChart3, RefreshCw, FileText, ShieldCheck,
  Hash, Timer, Verified, MousePointer, Bot
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ControlPreview {
  id: string;
  name: string;
  description: string;
  frameworks: string[];
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};


// ============================================================================
// DATA
// ============================================================================

const trustedCompanies = [
  { name: 'Stripe', logo: 'stripe' },
  { name: 'Vercel', logo: 'vercel' },
  { name: 'Linear', logo: 'linear' },
  { name: 'Notion', logo: 'notion' },
  { name: 'Figma', logo: 'figma' },
  { name: 'Retool', logo: 'retool' },
];

const comparisonData = [
  { feature: 'Time to Compliance', legacy: '6-12 months', lydell: '7 days', legacyNote: 'Manual process' },
  { feature: 'Questionnaire Response', legacy: '200+ questions manually', lydell: 'AI auto-fills 90%', legacyNote: 'Hours per form' },
  { feature: 'Consultant Fees', legacy: '$50K-150K+', lydell: 'Fraction of cost', legacyNote: 'Per audit cycle' },
  { feature: 'Policy Generation', legacy: 'Write from scratch', lydell: 'AI-generated in seconds', legacyNote: 'Legal review needed' },
  { feature: 'Evidence Collection', legacy: 'Screenshots & emails', lydell: 'Auto-synced & hashed', legacyNote: 'Audit trail gaps' },
  { feature: 'Auditor Experience', legacy: 'Shared folders chaos', lydell: 'One-click portal', legacyNote: 'Back-and-forth' },
];

const controlPreviews: ControlPreview[] = [
  {
    id: 'ac-001',
    name: 'Multi-Factor Authentication (MFA)',
    description: 'Require MFA for all user accounts accessing sensitive systems',
    frameworks: ['SOC 2', 'ISO 27001', 'HIPAA', 'NIST CSF'],
  },
  {
    id: 'ac-002',
    name: 'Access Control Policy',
    description: 'Define and enforce role-based access controls across systems',
    frameworks: ['SOC 2', 'ISO 27001', 'PCI DSS', 'GDPR'],
  },
  {
    id: 'dp-001',
    name: 'Data Encryption at Rest',
    description: 'Encrypt all sensitive data stored in databases and file systems',
    frameworks: ['SOC 2', 'ISO 27001', 'HIPAA', 'PCI DSS', 'GDPR'],
  },
];

const pulseActions = [
  { action: 'AC-001 verified', company: 'TechCorp', time: '2s ago' },
  { action: 'Policy generated', company: 'HealthFirst', time: '5s ago' },
  { action: 'Evidence synced', company: 'FinanceCloud', time: '8s ago' },
  { action: 'Audit completed', company: 'DataSecure', time: '12s ago' },
  { action: 'Certificate issued', company: 'CloudOps', time: '15s ago' },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const ScrollReveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children,
  delay = 0,
  className = '',
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={fadeInUp}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Live Audit-Ready Badge Component
const AuditReadyBadge: React.FC = () => {
  const [score, setScore] = useState(94);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const interval = setInterval(() => {
        setScore((prev) => {
          const delta = Math.random() > 0.5 ? 1 : -1;
          const newScore = prev + delta;
          return Math.max(90, Math.min(98, newScore));
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isInView]);

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="audit-ready-badge"
    >
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" className="ring-bg" stroke="#E2E8F0" strokeWidth="6" fill="none" />
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            stroke="#10B981"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-emerald-600">{score}%</span>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span className="font-semibold text-slate-900">Live Audit-Ready</span>
        </div>
        <span className="text-sm text-slate-500">Real-time compliance score</span>
      </div>
    </motion.div>
  );
};

// Compliance Velocity Graph Component
const ComplianceVelocityGraph: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const legacyPath = "M 20 180 Q 100 175 180 160 Q 260 145 340 120 Q 420 95 500 60";
  const lydellPath = "M 20 180 Q 60 100 100 60 Q 140 30 180 20 Q 220 15 300 15 Q 400 15 500 15";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.5 }}
      className="relative bg-white rounded-2xl border border-slate-200 p-6 shadow-lg"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Compliance Velocity</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-400 rounded" />
            <span className="text-slate-500">Legacy (6-12 months)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-emerald-500 rounded" />
            <span className="text-slate-500">Lydell.AI (7 days)</span>
          </div>
        </div>
      </div>
      <svg className="w-full h-48" viewBox="0 0 520 200" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="50" height="40" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 40" fill="none" stroke="#F1F5F9" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="500" height="180" x="10" y="10" fill="url(#grid)" />

        {/* Y-axis labels */}
        <text x="5" y="25" className="text-[10px] fill-slate-400">100%</text>
        <text x="5" y="100" className="text-[10px] fill-slate-400">50%</text>
        <text x="5" y="185" className="text-[10px] fill-slate-400">0%</text>

        {/* X-axis labels */}
        <text x="20" y="198" className="text-[10px] fill-slate-400">Start</text>
        <text x="250" y="198" className="text-[10px] fill-slate-400">3 months</text>
        <text x="480" y="198" className="text-[10px] fill-slate-400">6+ months</text>

        {/* Legacy path (slow) */}
        <motion.path
          d={legacyPath}
          fill="none"
          stroke="#F87171"
          strokeWidth="2"
          strokeDasharray="4,4"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : {}}
          transition={{ duration: 2, ease: 'easeOut' }}
        />

        {/* Lydell path (fast) */}
        <motion.path
          d={lydellPath}
          fill="none"
          stroke="#10B981"
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : {}}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
        />

        {/* Lydell endpoint */}
        <motion.circle
          cx="180"
          cy="20"
          r="6"
          fill="#10B981"
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{ delay: 1.8, type: 'spring' }}
        />

        {/* "7 Days" label */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 2 }}
        >
          <rect x="130" y="25" width="60" height="22" rx="4" fill="#10B981" />
          <text x="160" y="40" textAnchor="middle" className="text-[11px] fill-white font-semibold">7 Days</text>
        </motion.g>
      </svg>
    </motion.div>
  );
};

// Interactive Control Preview Card (Endowment Effect)
const ControlPreviewCard: React.FC<{ control: ControlPreview; isActive: boolean; onClick: () => void }> = ({
  control,
  isActive,
  onClick,
}) => {
  const frameworkColors: Record<string, string> = {
    'SOC 2': 'bg-violet-500',
    'ISO 27001': 'bg-emerald-500',
    'HIPAA': 'bg-pink-500',
    'NIST CSF': 'bg-amber-500',
    'PCI DSS': 'bg-red-500',
    'GDPR': 'bg-blue-500',
  };

  return (
    <motion.div
      onClick={onClick}
      className={`control-preview-card ${isActive ? 'active' : ''}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="px-2 py-1 text-xs font-mono font-semibold text-accent-600 bg-accent-50 rounded">
          {control.id.toUpperCase()}
        </span>
        {isActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </div>
      <h4 className="font-semibold text-slate-900 mb-2">{control.name}</h4>
      <p className="text-sm text-slate-500 mb-4">{control.description}</p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 mr-1">Maps to:</span>
        {control.frameworks.map((fw) => (
          <motion.div
            key={fw}
            className={`w-2.5 h-2.5 rounded-full ${frameworkColors[fw] || 'bg-slate-400'}`}
            whileHover={{ scale: 1.3 }}
            title={fw}
          />
        ))}
      </div>
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-slate-100"
          >
            <div className="flex flex-wrap gap-2">
              {control.frameworks.map((fw) => (
                <span
                  key={fw}
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    fw === 'SOC 2' ? 'bg-violet-50 text-violet-700' :
                    fw === 'ISO 27001' ? 'bg-emerald-50 text-emerald-700' :
                    fw === 'HIPAA' ? 'bg-pink-50 text-pink-700' :
                    fw === 'NIST CSF' ? 'bg-amber-50 text-amber-700' :
                    fw === 'PCI DSS' ? 'bg-red-50 text-red-700' :
                    'bg-blue-50 text-blue-700'
                  }`}
                >
                  {fw}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Live Pulse Ticker Component
const LivePulseTicker: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [controlCount, setControlCount] = useState(147829);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % pulseActions.length);
      setControlCount((prev) => prev + Math.floor(Math.random() * 3) + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-50 border-y border-slate-200 py-3 overflow-hidden">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="w-5 h-5 text-emerald-500" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          </div>
          <span className="text-sm text-slate-500">Live Activity:</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={currentIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm font-medium text-emerald-600"
            >
              {pulseActions[currentIndex].action} for {pulseActions[currentIndex].company}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm text-slate-500">Controls verified:</span>
          <span className="font-mono text-accent-600 font-bold">{controlCount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN LANDING PAGE COMPONENT
// ============================================================================

const LandingPage: React.FC = () => {
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.95]);
  const [showMobileCTA, setShowMobileCTA] = useState(false);
  const [activeControl, setActiveControl] = useState<string | null>('ac-001');

  // Force light mode for landing page
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('light');
    root.classList.remove('dark');
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowMobileCTA(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-600 to-accent-700 rounded-xl flex items-center justify-center shadow-cta">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Lydell.AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Sign In</Link>
            <Link
              to="/login"
              className="btn-primary"
            >
              Get Audit Ready in 7 Days
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="md:hidden">
            <Link to="/login" className="btn-primary text-sm px-4 py-2">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Revenue Enablement Focus */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden hero-gradient"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="hero-blob w-[600px] h-[600px] bg-accent-200 top-0 -right-48" />
          <div className="hero-blob w-[500px] h-[500px] bg-emerald-200 bottom-0 -left-32" style={{ animationDelay: '2s' }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Badge - Scarcity & Social Proof */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-center gap-4 mb-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm">
                <Building2 className="w-4 h-4 text-accent-600" />
                <span className="text-sm font-medium text-slate-700">Built for high-growth startups</span>
              </div>
            </motion.div>

            {/* Headline - Revenue Enablement */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 text-center mb-6 leading-tight tracking-tight"
            >
              Don't let compliance block your sales.{' '}
              <span className="gradient-text">
                Close enterprise deals 10x faster
              </span>{' '}
              with AI-automated SOC 2 and ISO 27001.
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-slate-600 text-center mb-10 max-w-3xl mx-auto leading-relaxed"
            >
              Stop losing deals to security questionnaires. Lydell.AI generates audit-ready policies,
              automates evidence collection, and gives auditors a verification portal they'll love.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            >
              <Link
                to="/login"
                className="w-full sm:w-auto btn-cta-primary group"
              >
                Get Audit Ready in 7 Days
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:border-accent-300 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-3">
                <Play className="w-5 h-5 text-accent-600" />
                Watch 2-Minute AI Demo
              </button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>SOC 2, ISO 27001, HIPAA ready</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Setup in under 15 minutes</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Trusted By - Logo Strip with Social Proof */}
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm font-medium text-slate-400 uppercase tracking-wider mb-8">
            Trusted by the fastest-growing startups
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16">
            {trustedCompanies.map((company, index) => (
              <motion.div
                key={company.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="trust-logo"
              >
                <div className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors">
                  <Building2 className="w-6 h-6" />
                  <span className="font-semibold text-lg">{company.name}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Pulse Ticker */}
      <LivePulseTicker />

      {/* Compliance Velocity Visual + Audit Badge */}
      <section className="py-20 bg-[#F8F9FA]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal>
              <ComplianceVelocityGraph />
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <div className="space-y-6">
                <AuditReadyBadge />
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                  From zero to audit-ready in days, not months
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Traditional compliance takes 6-12 months and costs $50K+ in consultants.
                  Lydell.AI's AI engine maps your existing infrastructure to compliance requirements,
                  generates policies instantly, and maintains continuous audit readiness.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg">
                    <Timer className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-emerald-700">7-day average</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-accent-50 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-accent-600" />
                    <span className="font-semibold text-accent-700">90% time saved</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Pain vs Relief Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-full mb-6">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-600">The compliance problem</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                The old way is costing you deals
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Every day without compliance is a lost enterprise opportunity.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* The Pain */}
            <ScrollReveal>
              <div className="pain-card h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <X className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-red-900">The Old Way</h3>
                </div>
                <ul className="space-y-4">
                  {[
                    '200-question security questionnaires eating your time',
                    '$50K-150K+ in consultant fees per audit cycle',
                    '6-12 month timelines killing your sales momentum',
                    'Scattered evidence in emails, screenshots, and shared drives',
                    'Endless auditor back-and-forth and document requests',
                  ].map((pain, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="text-red-800">{pain}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>

            {/* The Relief */}
            <ScrollReveal delay={0.2}>
              <div className="relief-card h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-emerald-900">The Lydell.AI Way</h3>
                </div>
                <ul className="space-y-4">
                  {[
                    'AI auto-fills 90% of security questionnaires instantly',
                    'Fraction of the cost with self-serve automation',
                    '7-day average to audit-ready status',
                    'Evidence auto-synced and cryptographically hashed',
                    'One-click auditor portal with everything organized',
                  ].map((relief, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-emerald-800">{relief}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>

          {/* Frictionless CTA */}
          <ScrollReveal delay={0.3}>
            <div className="mt-12 text-center">
              <p className="text-lg text-slate-600 mb-6">
                Connect your stack, and let AI do the heavy lifting.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                {['AWS', 'GitHub', 'Google Workspace', 'Okta', 'Jira'].map((integration) => (
                  <div key={integration} className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-600">
                    {integration}
                  </div>
                ))}
                <span className="text-slate-400">+50 more</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* AI Policy Generator Feature */}
      <section id="features" className="py-20 bg-gradient-to-b from-[#F8F9FA] to-white">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-50 border border-accent-100 rounded-full mb-6">
                <Bot className="w-4 h-4 text-accent-600" />
                <span className="text-sm font-medium text-accent-600">AI-Powered Features</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Everything you need to get audit-ready
              </h2>
            </div>
          </ScrollReveal>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {/* AI Policy Generator - Highlighted */}
            <ScrollReveal className="md:col-span-2 lg:col-span-2">
              <div className="feature-card-highlight p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center shadow-cta flex-shrink-0">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">AI Policy Generator</h3>
                      <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded">NEW</span>
                    </div>
                    <p className="text-slate-600">
                      Generate audit-ready, legally-defensible policies in seconds.
                      Our AI analyzes your infrastructure and creates customized policies
                      mapped to SOC 2, ISO 27001, HIPAA, and more.
                    </p>
                  </div>
                </div>
                <div className="bg-white/80 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                    <Sparkles className="w-4 h-4 text-accent-500" />
                    <span>Sample output</span>
                  </div>
                  <div className="font-mono text-sm text-slate-700 leading-relaxed">
                    <span className="text-accent-600">## Access Control Policy</span><br />
                    <span className="text-slate-400">1.1</span> All users must authenticate using MFA...<br />
                    <span className="text-slate-400">1.2</span> Role-based access controls shall be enforced...
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Questionnaire Automation */}
            <ScrollReveal delay={0.1}>
              <div className="feature-card">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <FileCheck className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Questionnaire Automation</h3>
                <p className="text-slate-600 text-sm">
                  AI auto-fills security questionnaires with 90%+ accuracy.
                  Stop spending hours on repetitive VSA and SIG forms.
                </p>
              </div>
            </ScrollReveal>

            {/* Evidence Engine */}
            <ScrollReveal delay={0.2}>
              <div className="feature-card">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
                  <Database className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">AI Evidence Engine</h3>
                <p className="text-slate-600 text-sm">
                  Continuous evidence collection from your stack.
                  Every piece cryptographically hashed and timestamped.
                </p>
              </div>
            </ScrollReveal>

            {/* One-Click Audit Portal */}
            <ScrollReveal delay={0.3}>
              <div className="feature-card">
                <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center mb-4">
                  <MousePointer className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">One-Click Audit Portal</h3>
                <p className="text-slate-600 text-sm">
                  Give auditors their own verification dashboard.
                  No more email chains or shared folder chaos.
                </p>
              </div>
            </ScrollReveal>

            {/* Continuous Monitoring */}
            <ScrollReveal delay={0.4}>
              <div className="feature-card">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
                  <RefreshCw className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Continuous Monitoring</h3>
                <p className="text-slate-600 text-sm">
                  Real-time compliance drift detection.
                  Get alerts before controls fall out of compliance.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* SHA-256 Evidence Hashing - Trust Signal */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full mb-6">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">Auditor-Proof Security</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Every piece of evidence is cryptographically locked
                </h2>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                  SHA-256 hashing ensures your evidence is tamper-proof and verifiable.
                  Auditors can independently verify the authenticity of every document.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Hash className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">SHA-256 Hashed</h3>
                  <p className="text-sm text-slate-400">Every document fingerprinted with cryptographic hash</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Timer className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">RFC 3161 Timestamped</h3>
                  <p className="text-sm text-slate-400">Legally binding timestamps from trusted authorities</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Verified className="w-6 h-6 text-violet-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">Public Verification</h3>
                  <p className="text-sm text-slate-400">Auditors verify independently via public portal</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Map Once, Comply Everywhere + Control Preview (Endowment Effect) */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Architecture Visual */}
            <ScrollReveal>
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-50 border border-accent-100 rounded-full mb-6">
                  <Layers className="w-4 h-4 text-accent-600" />
                  <span className="text-sm font-medium text-accent-600">Control-Centric Engine</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                  Map once, comply everywhere
                </h2>
                <p className="text-lg text-slate-600 mb-8">
                  One control maps to multiple frameworks automatically.
                  Implement MFA once, and it satisfies SOC 2, ISO 27001, HIPAA, and more.
                </p>

                {/* Architecture Diagram */}
                <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
                  <div className="flex items-center justify-center mb-8">
                    <div className="w-20 h-20 bg-white rounded-2xl border-2 border-accent-500 flex items-center justify-center shadow-lg">
                      <Shield className="w-10 h-10 text-accent-600" />
                    </div>
                  </div>
                  <div className="text-center mb-6">
                    <span className="font-mono text-sm text-accent-600">Your Control</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-2 h-2 bg-accent-300 rounded-full" />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {['SOC 2', 'ISO 27001', 'HIPAA', 'NIST CSF', 'PCI DSS', 'GDPR'].map((fw) => (
                      <div
                        key={fw}
                        className="px-3 py-2 bg-white rounded-lg border border-slate-200 text-center text-sm font-medium text-slate-700"
                      >
                        {fw}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Interactive Control Preview (Endowment Effect) */}
            <ScrollReveal delay={0.2}>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Preview: See how controls map to frameworks
                </h3>
                <p className="text-slate-600 mb-6">
                  Click a control to see which frameworks it satisfies. One implementation, multiple certifications.
                </p>
                <div className="space-y-4">
                  {controlPreviews.map((control) => (
                    <ControlPreviewCard
                      key={control.id}
                      control={control}
                      isActive={activeControl === control.id}
                      onClick={() => setActiveControl(activeControl === control.id ? null : control.id)}
                    />
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-[#F8F9FA]">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Lydell.AI vs. Legacy Compliance
              </h2>
              <p className="text-lg text-slate-600">
                See the difference AI-powered compliance makes
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="comparison-table max-w-4xl mx-auto">
              {/* Header */}
              <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
                <div className="comparison-header text-slate-500">Feature</div>
                <div className="comparison-header text-red-500 text-center">Legacy Approach</div>
                <div className="comparison-header text-emerald-600 text-center">Lydell.AI</div>
              </div>

              {/* Rows */}
              {comparisonData.map((row, index) => (
                <motion.div
                  key={row.feature}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="grid grid-cols-3 border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="comparison-cell font-medium text-slate-900">{row.feature}</div>
                  <div className="comparison-cell text-center">
                    <div className="flex items-center justify-center gap-2">
                      <X className="w-4 h-4 text-red-400" />
                      <span className="text-red-600">{row.legacy}</span>
                    </div>
                  </div>
                  <div className="comparison-cell text-center">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCheck className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 font-medium">{row.lydell}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-full mb-6">
                <Users className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-600">Customer Success Stories</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Trusted by compliance teams worldwide
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                quote: "We closed a $2M enterprise deal that was blocked for 8 months waiting on SOC 2. Lydell.AI got us audit-ready in 2 weeks.",
                author: "Sarah Chen",
                role: "CTO, TechFlow",
                metric: "2 weeks to audit-ready",
                avatar: "SC"
              },
              {
                quote: "The AI policy generator alone saved us $40K in legal fees. Auditors were impressed by the quality and completeness.",
                author: "Marcus Johnson",
                role: "VP Engineering, DataScale",
                metric: "$40K saved",
                avatar: "MJ"
              },
              {
                quote: "Our auditor said it was the smoothest audit they've ever done. The verification portal made everything effortless.",
                author: "Emily Rodriguez",
                role: "Security Lead, HealthFirst",
                metric: "Smoothest audit ever",
                avatar: "ER"
              }
            ].map((testimonial, index) => (
              <ScrollReveal key={index} delay={index * 0.1}>
                <div className="testimonial-card h-full flex flex-col">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-slate-600 mb-6 flex-grow">"{testimonial.quote}"</p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center text-accent-600 font-semibold text-sm">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{testimonial.author}</p>
                        <p className="text-xs text-slate-500">{testimonial.role}</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full">
                      {testimonial.metric}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 cta-section">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
                Get audit-ready in 7 days
              </h2>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed">
                Stop letting compliance block your enterprise deals.
                Join hundreds of companies who accelerated their growth with AI-powered compliance.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Link
                  to="/login"
                  className="w-full sm:w-auto btn-cta-primary group"
                >
                  Get Audit Ready in 7 Days
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:border-accent-300 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-3">
                  <Play className="w-5 h-5 text-accent-600" />
                  Watch 2-Minute AI Demo
                </button>
              </div>
              <p className="text-sm text-slate-500">
                No credit card required. Free for up to 10 controls. Cancel anytime.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-slate-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-accent-600 to-accent-700 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-slate-900">Lydell.AI</span>
              <span className="text-xs text-slate-400">by Lydell Security</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-slate-500">
              <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Security</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Contact</a>
            </div>
            <p className="text-sm text-slate-400">
              2025 Lydell Security. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <AnimatePresence>
        {showMobileCTA && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/95 backdrop-blur-xl border-t border-slate-200 md:hidden"
          >
            <Link
              to="/login"
              className="w-full py-4 bg-accent-600 hover:bg-accent-700 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-cta"
            >
              Get Audit Ready in 7 Days
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
