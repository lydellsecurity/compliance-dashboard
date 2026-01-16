/**
 * AttestAI Landing Page
 *
 * Product: AttestAI - AI-Powered Compliance Platform
 * Parent Company: Lydell Security
 *
 * High-converting, enterprise-grade landing page with:
 * - Hero section with outcome-focused headline
 * - Logo cloud trust signals
 * - Bento grid feature showcase
 * - Comparison table
 * - Live compliance pulse ticker
 * - Social proof and verified signature sections
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Shield, CheckCircle2, Clock, Zap, Lock, Globe,
  ArrowRight, Play, ChevronRight, Sparkles, Activity, Award,
  Users, AlertTriangle, Database, Eye, Server,
  CheckCheck, X, ExternalLink, Github, Cloud,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

// ============================================================================
// TYPES
// ============================================================================

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: string;
  delay?: number;
}

interface ComparisonRow {
  feature: string;
  legacy: string;
  attestai: string;
  legacyBad?: boolean;
}

interface StatProps {
  value: string;
  label: string;
  delay?: number;
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

// ============================================================================
// FRAMEWORK LOGOS DATA
// ============================================================================

const frameworks = [
  { name: 'SOC 2', icon: <Shield className="w-6 h-6" /> },
  { name: 'ISO 27001', icon: <Globe className="w-6 h-6" /> },
  { name: 'HIPAA', icon: <Lock className="w-6 h-6" /> },
  { name: 'NIST CSF', icon: <Server className="w-6 h-6" /> },
  { name: 'GDPR', icon: <Eye className="w-6 h-6" /> },
  { name: 'PCI DSS', icon: <Database className="w-6 h-6" /> },
];

// ============================================================================
// COMPARISON DATA
// ============================================================================

const comparisonData: ComparisonRow[] = [
  { feature: 'Time to Compliance', legacy: '6-12 months', attestai: '2-4 weeks', legacyBad: true },
  { feature: 'Policy Generation', legacy: 'Manual writing', attestai: 'AI-generated in seconds', legacyBad: true },
  { feature: 'Evidence Collection', legacy: 'Screenshots & emails', attestai: 'Automated integrations', legacyBad: true },
  { feature: 'Auditor Access', legacy: 'Shared folders', attestai: 'Dedicated verification portal', legacyBad: true },
  { feature: 'Control Monitoring', legacy: 'Quarterly reviews', attestai: 'Real-time continuous', legacyBad: true },
  { feature: 'Cost', legacy: '$50K-150K+ consultants', attestai: 'Fraction of the cost', legacyBad: true },
];

// ============================================================================
// LIVE PULSE DATA (Simulated)
// ============================================================================

const pulseActions = [
  'AC-001 verified for TechCorp',
  'Policy generated for HealthFirst',
  'Evidence uploaded for FinanceCloud',
  'DP-003 compliance confirmed',
  'Audit report exported',
  'SO-002 gap remediated',
  'Certificate issued for DataSecure',
  'Control verification complete',
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const ScrollReveal: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={fadeInUp}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, highlight, delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={scaleIn}
      transition={{ duration: 0.5, delay }}
      className="group relative bg-steel-900/50 dark:bg-steel-900/50 light:bg-white border border-steel-800 dark:border-steel-800 light:border-steel-200 p-6 hover:border-accent-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-accent-500/10"
    >
      {highlight && (
        <div className="absolute -top-3 left-4 px-3 py-1 bg-accent-500 text-white text-xs font-bold uppercase tracking-wide">
          {highlight}
        </div>
      )}
      <div className="w-12 h-12 bg-accent-500/10 flex items-center justify-center mb-4 group-hover:bg-accent-500/20 transition-colors">
        <div className="text-accent-400">{icon}</div>
      </div>
      <h3 className="text-lg font-bold text-primary mb-2">{title}</h3>
      <p className="text-secondary text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
};

const StatCard: React.FC<StatProps> = ({ value, label, delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={fadeInUp}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <div className="text-4xl md:text-5xl font-bold text-accent-400 mb-2">{value}</div>
      <div className="text-sm text-secondary uppercase tracking-wide">{label}</div>
    </motion.div>
  );
};

const LivePulseTicker: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [controlCount, setControlCount] = useState(147829);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % pulseActions.length);
      setControlCount((prev) => prev + Math.floor(Math.random() * 5) + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-steel-900/80 dark:bg-steel-900/80 light:bg-steel-100 border-y border-steel-800 dark:border-steel-800 light:border-steel-200 py-3 overflow-hidden">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span className="text-sm text-secondary">Live Compliance Pulse:</span>
          <motion.span
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm font-medium text-emerald-400"
          >
            {pulseActions[currentIndex]}
          </motion.span>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm text-secondary">Controls verified globally:</span>
          <span className="font-mono text-accent-400 font-bold">{controlCount.toLocaleString()}</span>
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
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 300], [1, 0.95]);
  const [showMobileCTA, setShowMobileCTA] = useState(false);

  // Show mobile sticky CTA after scrolling past hero
  useEffect(() => {
    const handleScroll = () => {
      setShowMobileCTA(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-midnight dark:bg-midnight light:bg-[#F8F9FA] transition-colors duration-300">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-midnight/80 dark:bg-midnight/80 light:bg-white/80 backdrop-blur-xl border-b border-steel-800/50 dark:border-steel-800/50 light:border-steel-200/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-primary">AttestAI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-secondary hover:text-primary transition-colors">Features</a>
            <a href="#compare" className="text-sm text-secondary hover:text-primary transition-colors">Compare</a>
            <a href="#proof" className="text-sm text-secondary hover:text-primary transition-colors">Social Proof</a>
            <ThemeToggle />
            <Link to="/login" className="btn-primary">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="md:hidden flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-steel-900/0 via-midnight/50 to-midnight dark:from-steel-900/0 dark:via-midnight/50 dark:to-midnight light:from-white/0 light:via-[#F8F9FA]/50 light:to-[#F8F9FA]" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500/10 border border-accent-500/30 mb-8"
            >
              <Sparkles className="w-4 h-4 text-accent-400" />
              <span className="text-sm font-medium text-accent-400">Powered by Claude AI</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-primary mb-6 leading-tight"
            >
              Close Enterprise Deals{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-emerald-400">
                10x Faster
              </span>{' '}
              with Automated Compliance
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-secondary mb-10 max-w-3xl mx-auto leading-relaxed"
            >
              Stop wasting <span className="text-status-risk font-semibold">400+ hours</span> on manual evidence.
              AttestAI uses Claude-powered AI to bridge your audit gaps, generate binding policies,
              and verify your <span className="text-accent-400 font-semibold">236 controls</span> in days, not months.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 bg-accent-500 hover:bg-accent-600 text-white font-bold text-lg transition-all duration-200 shadow-lg shadow-accent-500/25 hover:shadow-xl hover:shadow-accent-500/30 flex items-center justify-center gap-2 group"
              >
                Get Your Free Audit Gap Analysis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-transparent border border-steel-700 dark:border-steel-700 light:border-steel-300 text-primary font-semibold hover:border-accent-500/50 transition-all duration-200 flex items-center justify-center gap-2">
                <Play className="w-5 h-5 text-accent-400" />
                Watch 60s Demo
              </button>
            </motion.div>

            {/* Trust Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-12 flex items-center justify-center gap-6 text-sm text-secondary"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>SOC 2 Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>ISO 27001 Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>HIPAA Ready</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Logo Cloud */}
      <section className="py-12 border-y border-steel-800/50 dark:border-steel-800/50 light:border-steel-200/50 bg-steel-900/30 dark:bg-steel-900/30 light:bg-steel-50">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-secondary uppercase tracking-wider mb-8">
            Trusted by companies achieving compliance with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {frameworks.map((framework, index) => (
              <motion.div
                key={framework.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex items-center gap-3 text-steel-400 dark:text-steel-400 light:text-steel-600 hover:text-accent-400 transition-colors"
              >
                {framework.icon}
                <span className="font-semibold">{framework.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Pulse Ticker */}
      <LivePulseTicker />

      {/* Stats Section */}
      <section className="py-20 bg-steel-900/20 dark:bg-steel-900/20 light:bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard value="236" label="Controls Covered" delay={0} />
            <StatCard value="10x" label="Faster Compliance" delay={0.1} />
            <StatCard value="400+" label="Hours Saved" delay={0.2} />
            <StatCard value="100%" label="Audit Ready" delay={0.3} />
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500/10 border border-accent-500/30 mb-6">
                <Zap className="w-4 h-4 text-accent-400" />
                <span className="text-sm font-medium text-accent-400">Powerful Features</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-primary mb-4">
                Everything You Need to Get Compliant
              </h2>
              <p className="text-lg text-secondary max-w-2xl mx-auto">
                From policy generation to evidence collection to auditor verification —
                all automated, all in one platform.
              </p>
            </div>
          </ScrollReveal>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Large Feature Card */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={scaleIn}
              transition={{ duration: 0.5 }}
              className="md:col-span-2 lg:col-span-2 bg-gradient-to-br from-accent-500/20 to-accent-600/10 border border-accent-500/30 p-8 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-accent-500/20 flex items-center justify-center mb-6">
                  <Sparkles className="w-7 h-7 text-accent-400" />
                </div>
                <div className="absolute -top-2 left-20 px-3 py-1 bg-emerald-500 text-white text-xs font-bold uppercase tracking-wide">
                  AI-Powered
                </div>
                <h3 className="text-2xl font-bold text-primary mb-3">AI Policy Architect</h3>
                <p className="text-secondary mb-6 max-w-xl">
                  Stop writing from scratch. Our Claude-powered AI generates audit-ready,
                  legally-defensible policies in seconds. Each policy is mapped to your specific
                  framework requirements and control objectives.
                </p>
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 text-accent-400 font-semibold hover:text-accent-300 transition-colors">
                    See it in action
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Regular Feature Cards */}
            <FeatureCard
              icon={<Database className="w-6 h-6" />}
              title="Continuous Evidence Locker"
              description="Automated GitHub & AWS hooks pull proof while you sleep. Never scramble for screenshots again."
              highlight="Auto-Sync"
              delay={0.1}
            />

            <FeatureCard
              icon={<Eye className="w-6 h-6" />}
              title="Auditor-First Dashboard"
              description="A unique verification portal that gives auditors 100% confidence. No more back-and-forth emails."
              delay={0.2}
            />

            <FeatureCard
              icon={<Activity className="w-6 h-6" />}
              title="Real-Time Monitoring"
              description="Continuous compliance monitoring with instant alerts when controls drift out of compliance."
              delay={0.3}
            />

            <FeatureCard
              icon={<Award className="w-6 h-6" />}
              title="Verified Certificates"
              description="Generate cryptographically signed compliance certificates that auditors can verify independently."
              delay={0.4}
            />

            {/* Wide Feature Card */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={scaleIn}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="md:col-span-2 lg:col-span-3 bg-steel-900/50 dark:bg-steel-900/50 light:bg-white border border-steel-800 dark:border-steel-800 light:border-steel-200 p-8"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="w-14 h-14 bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Cloud className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-primary mb-2">Cloud-Native Integrations</h3>
                  <p className="text-secondary">
                    Connect your AWS, Azure, and GCP accounts for automated control verification.
                    We check your actual infrastructure against compliance requirements.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-steel-800 dark:bg-steel-800 light:bg-steel-100 flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-[#FF9900]" />
                  </div>
                  <div className="w-10 h-10 bg-steel-800 dark:bg-steel-800 light:bg-steel-100 flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-[#0078D4]" />
                  </div>
                  <div className="w-10 h-10 bg-steel-800 dark:bg-steel-800 light:bg-steel-100 flex items-center justify-center">
                    <Github className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section id="compare" className="py-20 md:py-32 bg-steel-900/30 dark:bg-steel-900/30 light:bg-steel-50">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-status-risk/10 border border-status-risk/30 mb-6">
                <AlertTriangle className="w-4 h-4 text-status-risk" />
                <span className="text-sm font-medium text-status-risk">Stop Wasting Time</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-primary mb-4">
                AttestAI vs. Legacy Compliance
              </h2>
              <p className="text-lg text-secondary max-w-2xl mx-auto">
                See why forward-thinking companies are abandoning spreadsheets and
                expensive consultants for automated compliance.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="max-w-4xl mx-auto overflow-hidden border border-steel-800 dark:border-steel-800 light:border-steel-200">
              {/* Header */}
              <div className="grid grid-cols-3 bg-steel-900 dark:bg-steel-900 light:bg-steel-100">
                <div className="p-4 font-semibold text-secondary border-r border-steel-800 dark:border-steel-800 light:border-steel-200">
                  Feature
                </div>
                <div className="p-4 font-semibold text-status-risk text-center border-r border-steel-800 dark:border-steel-800 light:border-steel-200">
                  Legacy / Spreadsheets
                </div>
                <div className="p-4 font-semibold text-emerald-400 text-center">
                  AttestAI
                </div>
              </div>

              {/* Rows */}
              {comparisonData.map((row, index) => (
                <motion.div
                  key={row.feature}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="grid grid-cols-3 border-t border-steel-800 dark:border-steel-800 light:border-steel-200 bg-midnight dark:bg-midnight light:bg-white"
                >
                  <div className="p-4 text-primary border-r border-steel-800 dark:border-steel-800 light:border-steel-200">
                    {row.feature}
                  </div>
                  <div className="p-4 text-center border-r border-steel-800 dark:border-steel-800 light:border-steel-200">
                    <div className="flex items-center justify-center gap-2">
                      <X className="w-4 h-4 text-status-risk" />
                      <span className="text-status-risk/80">{row.legacy}</span>
                    </div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">{row.attestai}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Social Proof */}
      <section id="proof" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 mb-6">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Trusted Worldwide</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-primary mb-4">
                Companies Trust AttestAI
              </h2>
            </div>
          </ScrollReveal>

          {/* Testimonial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              {
                quote: "We went from zero to SOC 2 Type II in 6 weeks. Our previous attempt took 8 months and failed.",
                author: "Sarah Chen",
                role: "CTO, TechFlow",
                metric: "6 weeks to compliance"
              },
              {
                quote: "The AI policy generation alone saved us $40,000 in consultant fees. The ROI was immediate.",
                author: "Marcus Johnson",
                role: "VP Engineering, DataScale",
                metric: "$40K saved"
              },
              {
                quote: "Auditors were impressed by our verification portal. They said it was the smoothest audit they've done.",
                author: "Emily Rodriguez",
                role: "Security Lead, HealthFirst",
                metric: "Smoothest audit ever"
              }
            ].map((testimonial, index) => (
              <ScrollReveal key={index} delay={index * 0.1}>
                <div className="bg-steel-900/50 dark:bg-steel-900/50 light:bg-white border border-steel-800 dark:border-steel-800 light:border-steel-200 p-6 h-full">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-secondary mb-6 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-primary">{testimonial.author}</p>
                      <p className="text-sm text-secondary">{testimonial.role}</p>
                    </div>
                    <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                      {testimonial.metric}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Verified Signature Block */}
          <ScrollReveal>
            <div className="max-w-3xl mx-auto bg-gradient-to-br from-steel-900 to-steel-800 dark:from-steel-900 dark:to-steel-800 light:from-steel-100 light:to-white border border-steel-700 dark:border-steel-700 light:border-steel-200 p-8">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-accent-500/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-8 h-8 text-accent-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary mb-2">Verified & Legally Binding</h3>
                  <p className="text-secondary mb-4">
                    Every policy, certificate, and compliance document generated by AttestAI
                    is cryptographically signed and timestamped. Auditors can independently verify
                    the authenticity of your compliance documentation through our public verification portal.
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <Lock className="w-4 h-4" />
                      <span>SHA-256 Signed</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <Clock className="w-4 h-4" />
                      <span>RFC 3161 Timestamped</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <Globe className="w-4 h-4" />
                      <span>Public Verification</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-accent-500/20 via-midnight to-emerald-500/10 dark:from-accent-500/20 dark:via-midnight dark:to-emerald-500/10 light:from-accent-500/10 light:via-white light:to-emerald-500/5">
        <div className="container mx-auto px-4 text-center">
          <ScrollReveal>
            <h2 className="text-3xl md:text-5xl font-bold text-primary mb-6">
              Ready to Transform Your Compliance?
            </h2>
            <p className="text-lg text-secondary max-w-2xl mx-auto mb-10">
              Join hundreds of companies who closed enterprise deals faster with
              automated, AI-powered compliance. Start your free audit gap analysis today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="w-full sm:w-auto px-10 py-5 bg-accent-500 hover:bg-accent-600 text-white font-bold text-lg transition-all duration-200 shadow-lg shadow-accent-500/25 hover:shadow-xl hover:shadow-accent-500/30 flex items-center justify-center gap-2 group"
              >
                Get Your Free Audit Gap Analysis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="w-full sm:w-auto px-10 py-5 bg-transparent border border-steel-700 dark:border-steel-700 light:border-steel-300 text-primary font-semibold hover:border-accent-500/50 transition-all duration-200 flex items-center justify-center gap-2">
                Schedule a Demo
                <ExternalLink className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-8 text-sm text-secondary">
              No credit card required • Free forever for up to 10 controls • Cancel anytime
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-steel-800/50 dark:border-steel-800/50 light:border-steel-200/50 bg-steel-900/30 dark:bg-steel-900/30 light:bg-steel-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent-500 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-primary">AttestAI</span>
              <span className="text-xs text-secondary">by Lydell Security</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-secondary">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Security</a>
              <a href="#" className="hover:text-primary transition-colors">Contact</a>
            </div>
            <p className="text-sm text-secondary">
              © 2025 Lydell Security. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: showMobileCTA ? 0 : 100 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-midnight/95 dark:bg-midnight/95 light:bg-white/95 backdrop-blur-xl border-t border-steel-800/50 dark:border-steel-800/50 light:border-steel-200/50 md:hidden"
      >
        <Link
          to="/login"
          className="w-full py-4 bg-accent-500 hover:bg-accent-600 text-white font-bold transition-all duration-200 flex items-center justify-center gap-2"
        >
          Get Free Audit Analysis
          <ArrowRight className="w-5 h-5" />
        </Link>
      </motion.div>
    </div>
  );
};

export default LandingPage;
