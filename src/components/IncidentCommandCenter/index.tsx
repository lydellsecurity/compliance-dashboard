/**
 * Incident Command Center - Main Component
 *
 * Interactive "War Room" for incident response operations.
 * Features:
 * - Bento Grid layout with MTTR metrics and Incident Heatmap
 * - Guided incident reporting wizard
 * - AI-powered playbook generation
 * - Evidence attachment system
 * - Tabletop Exercise (Drill) mode
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Shield,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Target,
  Zap,
  Activity,
  Download,
  Play,
  BookOpen,
  RefreshCw,
  ChevronRight,
  Timer,
  Flame,
  Eye,
  ClipboardList,
} from 'lucide-react';
import type { UseComplianceReturn } from '../../hooks/useCompliance';
import type { UseIncidentResponseReturn } from '../../hooks/useIncidentResponse';
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  ThreatCategory,
} from '../../types/incident.types';

// Sub-components
import NewIncidentWizard from './NewIncidentWizard';
import IncidentDetailView from './IncidentDetailView';
import AIPlaybookGenerator from './AIPlaybookGenerator';

// ============================================================================
// TYPES
// ============================================================================

interface IncidentCommandCenterProps {
  compliance: UseComplianceReturn;
  ir: UseIncidentResponseReturn;
  organizationId: string;
  userId: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const SEVERITY_CONFIG: Record<IncidentSeverity, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}> = {
  critical: {
    label: 'Critical',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FECACA',
    dotColor: '#DC2626',
  },
  high: {
    label: 'High',
    color: '#EA580C',
    bgColor: '#FFEDD5',
    borderColor: '#FED7AA',
    dotColor: '#EA580C',
  },
  medium: {
    label: 'Medium',
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
    dotColor: '#D97706',
  },
  low: {
    label: 'Low',
    color: '#16A34A',
    bgColor: '#DCFCE7',
    borderColor: '#BBF7D0',
    dotColor: '#16A34A',
  },
};

export const STATUS_CONFIG: Record<IncidentStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}> = {
  detected: { label: 'Detected', color: '#DC2626', bgColor: '#FEE2E2', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  triaged: { label: 'Triaged', color: '#EA580C', bgColor: '#FFEDD5', icon: <Target className="w-3.5 h-3.5" /> },
  containment: { label: 'Containment', color: '#0066FF', bgColor: '#EFF6FF', icon: <Shield className="w-3.5 h-3.5" /> },
  eradication: { label: 'Eradication', color: '#7C3AED', bgColor: '#F5F3FF', icon: <Zap className="w-3.5 h-3.5" /> },
  recovery: { label: 'Recovery', color: '#059669', bgColor: '#ECFDF5', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  lessons_learned: { label: 'Lessons Learned', color: '#0891B2', bgColor: '#ECFEFF', icon: <BookOpen className="w-3.5 h-3.5" /> },
  closed: { label: 'Closed', color: '#64748B', bgColor: '#F1F5F9', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

export const THREAT_LABELS: Record<ThreatCategory, string> = {
  ransomware: 'Ransomware',
  data_exfiltration: 'Data Exfiltration',
  credential_compromise: 'Credential Compromise',
  lateral_movement: 'Lateral Movement',
  privilege_escalation: 'Privilege Escalation',
  supply_chain: 'Supply Chain',
  insider_threat: 'Insider Threat',
  ddos: 'DDoS',
  malware: 'Malware',
  phishing: 'Phishing',
  zero_day: 'Zero-Day',
  apt: 'APT',
  cryptojacking: 'Cryptojacking',
  other: 'Other',
};

export const THREAT_COLORS: Record<ThreatCategory, string> = {
  ransomware: '#DC2626',
  data_exfiltration: '#EA580C',
  credential_compromise: '#D97706',
  lateral_movement: '#CA8A04',
  privilege_escalation: '#65A30D',
  supply_chain: '#16A34A',
  insider_threat: '#0D9488',
  ddos: '#0891B2',
  malware: '#0284C7',
  phishing: '#2563EB',
  zero_day: '#4F46E5',
  apt: '#7C3AED',
  cryptojacking: '#9333EA',
  other: '#64748B',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const IncidentCommandCenter: React.FC<IncidentCommandCenterProps> = ({
  compliance,
  ir,
  organizationId,
  userId,
}) => {
  // State
  const [showNewIncidentWizard, setShowNewIncidentWizard] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showPlaybook, setShowPlaybook] = useState(false);
  const [playbookIncident, setPlaybookIncident] = useState<Incident | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<IncidentSeverity | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | 'all'>('all');
  const [filterDrillMode, setFilterDrillMode] = useState<'all' | 'real' | 'drill'>('all');

  // Calculate MTTR (Mean Time to Resolution) in hours
  const mttrStats = useMemo(() => {
    const closedIncidents = ir.incidents.filter(i => i.status === 'closed' && i.closedAt);
    if (closedIncidents.length === 0) return { mttr: 0, trend: 0, count: 0 };

    const resolutionTimes = closedIncidents.map(i => {
      const detected = new Date(i.detectedAt).getTime();
      const closed = new Date(i.closedAt!).getTime();
      return (closed - detected) / (1000 * 60 * 60); // hours
    });

    const avgMttr = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;

    // Calculate trend (compare last 5 vs previous 5)
    const sorted = [...closedIncidents].sort((a, b) =>
      new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime()
    );
    const recent = sorted.slice(0, 5);
    const previous = sorted.slice(5, 10);

    let trend = 0;
    if (recent.length > 0 && previous.length > 0) {
      const recentAvg = recent.reduce((acc, i) => {
        const detected = new Date(i.detectedAt).getTime();
        const closed = new Date(i.closedAt!).getTime();
        return acc + (closed - detected) / (1000 * 60 * 60);
      }, 0) / recent.length;

      const prevAvg = previous.reduce((acc, i) => {
        const detected = new Date(i.detectedAt).getTime();
        const closed = new Date(i.closedAt!).getTime();
        return acc + (closed - detected) / (1000 * 60 * 60);
      }, 0) / previous.length;

      trend = ((prevAvg - recentAvg) / prevAvg) * 100; // positive = improvement
    }

    return { mttr: avgMttr, trend, count: closedIncidents.length };
  }, [ir.incidents]);

  // Incident heatmap data (by threat category)
  const heatmapData = useMemo(() => {
    const counts: Record<ThreatCategory, number> = {} as Record<ThreatCategory, number>;
    Object.keys(THREAT_LABELS).forEach(cat => {
      counts[cat as ThreatCategory] = 0;
    });

    ir.incidents.forEach(incident => {
      counts[incident.threatCategory]++;
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({
        category: category as ThreatCategory,
        count,
        label: THREAT_LABELS[category as ThreatCategory],
        color: THREAT_COLORS[category as ThreatCategory],
      }));
  }, [ir.incidents]);

  // Filter incidents
  const filteredIncidents = useMemo(() => {
    return ir.incidents.filter(incident => {
      const matchesSearch = searchTerm === '' ||
        incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.incidentNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSeverity = filterSeverity === 'all' || incident.severity === filterSeverity;
      const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;

      // Check drill mode - incidents with "drill" or "exercise" in title are drills
      const isDrill = incident.title.toLowerCase().includes('drill') ||
        incident.title.toLowerCase().includes('exercise') ||
        incident.title.toLowerCase().includes('tabletop');
      const matchesDrillMode = filterDrillMode === 'all' ||
        (filterDrillMode === 'drill' && isDrill) ||
        (filterDrillMode === 'real' && !isDrill);

      return matchesSearch && matchesSeverity && matchesStatus && matchesDrillMode;
    });
  }, [ir.incidents, searchTerm, filterSeverity, filterStatus, filterDrillMode]);

  // Severity distribution
  const severityDistribution = useMemo(() => {
    const active = ir.incidents.filter(i => i.status !== 'closed');
    return {
      critical: active.filter(i => i.severity === 'critical').length,
      high: active.filter(i => i.severity === 'high').length,
      medium: active.filter(i => i.severity === 'medium').length,
      low: active.filter(i => i.severity === 'low').length,
    };
  }, [ir.incidents]);

  // Handle opening playbook for an incident
  const handleOpenPlaybook = useCallback((incident: Incident) => {
    setPlaybookIncident(incident);
    setShowPlaybook(true);
  }, []);

  // Handle incident creation from wizard
  const handleIncidentCreated = useCallback((incident: Incident) => {
    setShowNewIncidentWizard(false);
    setSelectedIncident(incident);
  }, []);

  // If viewing an incident detail, show that view
  if (selectedIncident) {
    return (
      <IncidentDetailView
        incident={selectedIncident}
        compliance={compliance}
        ir={ir}
        organizationId={organizationId}
        userId={userId}
        onBack={() => setSelectedIncident(null)}
        onOpenPlaybook={handleOpenPlaybook}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-steel-100">Incident Command Center</h1>
          <p className="text-slate-500 dark:text-steel-400 mt-1">Real-time incident response operations & war room</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewIncidentWizard(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium shadow-lg shadow-red-500/25 hover:bg-red-700 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            New Incident
          </button>
          <button
            onClick={() => {
              // Create a drill incident
              const drillIncident = ir.createIncident({
                title: '[DRILL] Tabletop Exercise - ' + new Date().toLocaleDateString(),
                description: 'This is a tabletop exercise for testing incident response procedures.',
                severity: 'medium',
                threatCategory: 'other',
                attackVectors: [],
                affectedSystems: [],
                affectedUsers: 0,
                dataExposed: false,
                dataTypes: [],
                incidentCommander: 'Security Team',
                responders: [],
                clientContact: '',
              });
              setSelectedIncident(drillIncident);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <Play className="w-4 h-4" />
            Start Drill
          </button>
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-12 gap-4">
        {/* MTTR Card */}
        <div className="col-span-12 md:col-span-4 bg-white dark:bg-midnight-900 rounded-2xl border border-slate-200 dark:border-steel-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Timer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-steel-100">Mean Time to Resolution</h3>
                <p className="text-xs text-slate-500 dark:text-steel-400">Based on {mttrStats.count} closed incidents</p>
              </div>
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <span className="text-4xl font-bold text-slate-900 dark:text-steel-100">
                {mttrStats.mttr < 24
                  ? `${mttrStats.mttr.toFixed(1)}h`
                  : `${(mttrStats.mttr / 24).toFixed(1)}d`}
              </span>
            </div>
            {mttrStats.trend !== 0 && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${
                mttrStats.trend > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                <TrendingUp className={`w-4 h-4 ${mttrStats.trend < 0 ? 'rotate-180' : ''}`} />
                {Math.abs(mttrStats.trend).toFixed(0)}%
              </div>
            )}
          </div>
          <div className="mt-4 h-2 bg-slate-100 dark:bg-steel-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (mttrStats.mttr / 72) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400 dark:text-steel-500">
            <span>0h</span>
            <span>Target: 24h</span>
            <span>72h</span>
          </div>
        </div>

        {/* Active Incidents by Severity */}
        <div className="col-span-12 md:col-span-4 bg-white dark:bg-midnight-900 rounded-2xl border border-slate-200 dark:border-steel-700 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-steel-100">Active Incidents</h3>
              <p className="text-xs text-slate-500 dark:text-steel-400">By severity level</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(['critical', 'high', 'medium', 'low'] as IncidentSeverity[]).map(severity => {
              const config = SEVERITY_CONFIG[severity];
              const count = severityDistribution[severity];
              return (
                <div
                  key={severity}
                  className="text-center p-3 rounded-xl"
                  style={{ backgroundColor: config.bgColor }}
                >
                  <div className="text-2xl font-bold" style={{ color: config.color }}>
                    {count}
                  </div>
                  <div className="text-xs font-medium" style={{ color: config.color }}>
                    {config.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-12 md:col-span-4 bg-white dark:bg-midnight-900 rounded-2xl border border-slate-200 dark:border-steel-700 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-steel-100">Quick Actions</h3>
              <p className="text-xs text-slate-500 dark:text-steel-400">Common operations</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowNewIncidentWizard(true)}
              className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-midnight-800 rounded-xl hover:bg-slate-100 dark:hover:bg-steel-700 transition-colors text-sm font-medium text-slate-700 dark:text-steel-200"
            >
              <Plus className="w-4 h-4" />
              Log Incident
            </button>
            <button
              onClick={() => setFilterStatus('detected')}
              className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-midnight-800 rounded-xl hover:bg-slate-100 dark:hover:bg-steel-700 transition-colors text-sm font-medium text-slate-700 dark:text-steel-200"
            >
              <Eye className="w-4 h-4" />
              Review New
            </button>
            <button
              onClick={() => setFilterDrillMode('drill')}
              className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-midnight-800 rounded-xl hover:bg-slate-100 dark:hover:bg-steel-700 transition-colors text-sm font-medium text-slate-700 dark:text-steel-200"
            >
              <ClipboardList className="w-4 h-4" />
              View Drills
            </button>
            <button className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-midnight-800 rounded-xl hover:bg-slate-100 dark:hover:bg-steel-700 transition-colors text-sm font-medium text-slate-700 dark:text-steel-200">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* Incident Heatmap */}
        <div className="col-span-12 lg:col-span-8 bg-white dark:bg-midnight-900 rounded-2xl border border-slate-200 dark:border-steel-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-steel-100">Incident Heatmap</h3>
                <p className="text-xs text-slate-500 dark:text-steel-400">Distribution by threat category</p>
              </div>
            </div>
          </div>

          {heatmapData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-steel-500">
              <Shield className="w-12 h-12 mb-3 opacity-50" />
              <p>No incidents recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {heatmapData.slice(0, 6).map(item => {
                const maxCount = Math.max(...heatmapData.map(d => d.count));
                const percentage = (item.count / maxCount) * 100;
                return (
                  <div key={item.category} className="flex items-center gap-3">
                    <div className="w-32 text-sm font-medium text-slate-600 dark:text-steel-300 truncate">
                      {item.label}
                    </div>
                    <div className="flex-1 h-6 bg-slate-100 dark:bg-steel-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="h-full rounded-full flex items-center justify-end pr-2"
                        style={{ backgroundColor: item.color }}
                      >
                        {percentage > 20 && (
                          <span className="text-xs font-bold text-white">{item.count}</span>
                        )}
                      </motion.div>
                    </div>
                    {percentage <= 20 && (
                      <span className="text-sm font-bold text-slate-600 dark:text-steel-300 w-8">{item.count}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="col-span-12 lg:col-span-4 bg-white dark:bg-midnight-900 rounded-2xl border border-slate-200 dark:border-steel-700 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-steel-100">Recent Activity</h3>
              <p className="text-xs text-slate-500 dark:text-steel-400">Latest updates</p>
            </div>
          </div>
          <div className="space-y-3">
            {ir.incidents.slice(0, 4).map(incident => {
              const config = SEVERITY_CONFIG[incident.severity];
              const statusConfig = STATUS_CONFIG[incident.status];
              return (
                <button
                  key={incident.id}
                  onClick={() => setSelectedIncident(incident)}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.dotColor }}
                    />
                    <span className="text-xs font-mono text-slate-500">
                      {incident.incidentNumber}
                    </span>
                    <span
                      className="text-xs font-medium px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-steel-100 truncate">
                    {incident.title}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-midnight-900 rounded-2xl border border-slate-200 dark:border-steel-700 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-steel-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search incidents..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-midnight-800 border border-slate-200 dark:border-steel-600 rounded-xl text-sm text-slate-900 dark:text-steel-100 placeholder-slate-400 dark:placeholder-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value as IncidentSeverity | 'all')}
            className="px-4 py-2.5 bg-slate-50 dark:bg-midnight-800 border border-slate-200 dark:border-steel-600 rounded-xl text-sm text-slate-900 dark:text-steel-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as IncidentStatus | 'all')}
            className="px-4 py-2.5 bg-slate-50 dark:bg-midnight-800 border border-slate-200 dark:border-steel-600 rounded-xl text-sm text-slate-900 dark:text-steel-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          <select
            value={filterDrillMode}
            onChange={e => setFilterDrillMode(e.target.value as 'all' | 'real' | 'drill')}
            className="px-4 py-2.5 bg-slate-50 dark:bg-midnight-800 border border-slate-200 dark:border-steel-600 rounded-xl text-sm text-slate-900 dark:text-steel-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="real">Real Incidents</option>
            <option value="drill">Drills Only</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setFilterSeverity('all');
              setFilterStatus('all');
              setFilterDrillMode('all');
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-600 dark:text-steel-300 hover:text-slate-800 dark:hover:text-steel-100 hover:bg-slate-100 dark:hover:bg-steel-700 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white dark:bg-midnight-900 rounded-2xl border border-slate-200 dark:border-steel-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-midnight-800 border-b border-slate-200 dark:border-steel-700">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase tracking-wider">
                  Incident
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase tracking-wider">
                  Severity
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase tracking-wider">
                  Threat Type
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase tracking-wider">
                  Detected
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-steel-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-steel-700">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-steel-600" />
                    <p className="text-slate-500 dark:text-steel-400">
                      {ir.incidents.length === 0
                        ? 'No incidents recorded. Click "New Incident" to create one.'
                        : 'No incidents match your filters.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredIncidents.map(incident => {
                  const severityConfig = SEVERITY_CONFIG[incident.severity];
                  const statusConfig = STATUS_CONFIG[incident.status];
                  const isDrill = incident.title.toLowerCase().includes('drill') ||
                    incident.title.toLowerCase().includes('exercise');

                  return (
                    <motion.tr
                      key={incident.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50 dark:hover:bg-midnight-800 transition-colors cursor-pointer"
                      onClick={() => setSelectedIncident(incident)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: severityConfig.dotColor }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-400 dark:text-steel-500">
                                {incident.incidentNumber}
                              </span>
                              {isDrill && (
                                <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-medium rounded">
                                  DRILL
                                </span>
                              )}
                            </div>
                            <p className="font-medium text-slate-900 dark:text-steel-100">{incident.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{
                            backgroundColor: severityConfig.bgColor,
                            color: severityConfig.color,
                          }}
                        >
                          {severityConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{
                            backgroundColor: statusConfig.bgColor,
                            color: statusConfig.color,
                          }}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 dark:text-steel-300">
                          {THREAT_LABELS[incident.threatCategory]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500 dark:text-steel-400">
                          {new Date(incident.detectedAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenPlaybook(incident)}
                            className="p-2 text-slate-400 dark:text-steel-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                            title="Generate Playbook"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedIncident(incident)}
                            className="p-2 text-slate-400 dark:text-steel-500 hover:text-slate-600 dark:hover:text-steel-200 hover:bg-slate-100 dark:hover:bg-steel-700 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Notifications Alert */}
      {ir.stats.pendingNotifications > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                {ir.stats.pendingNotifications} Regulatory Notification{ir.stats.pendingNotifications > 1 ? 's' : ''} Pending
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Review and send required breach notifications
              </p>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-xl transition-colors">
              Review
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showNewIncidentWizard && (
          <NewIncidentWizard
            ir={ir}
            organizationId={organizationId}
            userId={userId}
            onClose={() => setShowNewIncidentWizard(false)}
            onIncidentCreated={handleIncidentCreated}
          />
        )}

        {showPlaybook && playbookIncident && (
          <AIPlaybookGenerator
            incident={playbookIncident}
            onClose={() => {
              setShowPlaybook(false);
              setPlaybookIncident(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default IncidentCommandCenter;
