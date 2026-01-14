/**
 * Incident Response Dashboard Component
 * 
 * Main dashboard for Lydell Security's IR operations.
 * Integrates with both useCompliance and useIncidentResponse hooks.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Shield, Clock, Users, FileText,
  Plus, Search, CheckCircle2, AlertCircle,
  TrendingUp, Target, Zap,
} from 'lucide-react';
import type { UseComplianceReturn } from '../hooks/useCompliance';
import type { UseIncidentResponseReturn, CreateIncidentData } from '../hooks/useIncidentResponse';
import type { 
  Incident, 
  IncidentSeverity, 
  IncidentStatus, 
  ThreatCategory,
  AttackVector,
} from '../types/incident.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const SEVERITY_CONFIG: Record<IncidentSeverity, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'CRITICAL' },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'HIGH' },
  medium: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'MEDIUM' },
  low: { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'LOW' },
};

const STATUS_CONFIG: Record<IncidentStatus, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  detected: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Detected', icon: <AlertTriangle className="w-3 h-3" /> },
  triaged: { color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Triaged', icon: <Target className="w-3 h-3" /> },
  containment: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Containment', icon: <Shield className="w-3 h-3" /> },
  eradication: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Eradication', icon: <Zap className="w-3 h-3" /> },
  recovery: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Recovery', icon: <TrendingUp className="w-3 h-3" /> },
  lessons_learned: { color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Lessons Learned', icon: <FileText className="w-3 h-3" /> },
  closed: { color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'Closed', icon: <CheckCircle2 className="w-3 h-3" /> },
};

const THREAT_LABELS: Record<ThreatCategory, string> = {
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

const ATTACK_VECTOR_LABELS: Record<AttackVector, string> = {
  email_phishing: 'Email Phishing',
  spear_phishing: 'Spear Phishing',
  drive_by_download: 'Drive-by Download',
  watering_hole: 'Watering Hole',
  supply_chain_compromise: 'Supply Chain Compromise',
  credential_stuffing: 'Credential Stuffing',
  brute_force: 'Brute Force',
  zero_day_exploit: 'Zero-Day Exploit',
  social_engineering: 'Social Engineering',
  insider_access: 'Insider Access',
  physical_access: 'Physical Access',
  misconfiguration: 'Misconfiguration',
  unpatched_vulnerability: 'Unpatched Vulnerability',
  third_party_breach: 'Third-Party Breach',
  unknown: 'Unknown',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const GlassPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative rounded-2xl overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-lg ${className}`}>
    {children}
  </div>
);

const StatCard: React.FC<{ 
  label: string; 
  value: number | string; 
  icon: React.ReactNode; 
  color: string;
  trend?: { value: number; isPositive: boolean };
}> = ({ label, value, icon, color, trend }) => (
  <GlassPanel className="p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-white/50 uppercase tracking-wider">{label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
        {trend && (
          <p className={`mt-1 text-xs font-medium ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend.isPositive ? '↓' : '↑'} {Math.abs(trend.value)}% from last month
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        {icon}
      </div>
    </div>
  </GlassPanel>
);

const IncidentCard: React.FC<{ 
  incident: Incident; 
  onClick: () => void;
  compliance: UseComplianceReturn;
}> = ({ incident, onClick, compliance }) => {
  const severity = SEVERITY_CONFIG[incident.severity];
  const status = STATUS_CONFIG[incident.status];
  
  const timeSinceDetection = useMemo(() => {
    const detected = new Date(incident.detectedAt);
    const now = new Date();
    const hours = Math.floor((now.getTime() - detected.getTime()) / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }, [incident.detectedAt]);

  // Get compliance impact
  const affectedGaps = incident.affectedControlIds.filter(id => {
    const response = compliance.getResponse(id);
    return response?.answer === 'no';
  }).length;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      className={`w-full text-left p-4 rounded-xl border transition-all ${severity.bg} ${severity.border} hover:shadow-lg`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${severity.bg} ${severity.color}`}>
              {severity.label}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded ${status.bg} ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-white/50">{incident.incidentNumber}</span>
          </div>
          
          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{incident.title}</h3>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-white/50">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeSinceDetection}
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              {THREAT_LABELS[incident.threatCategory]}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {incident.responders.length} responders
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-white/50">Affected Controls</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{incident.affectedControlIds.length}</p>
          </div>
          {affectedGaps > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-red-500/10 text-red-500 rounded">
              {affectedGaps} pre-existing gaps
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
};

// ============================================================================
// CREATE INCIDENT MODAL
// ============================================================================

const CreateIncidentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateIncidentData) => void;
}> = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState<CreateIncidentData>({
    title: '',
    description: '',
    severity: 'high',
    threatCategory: 'ransomware',
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
  // responder input removed

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
    onClose();
    // Reset form
    setFormData({
      title: '',
      description: '',
      severity: 'high',
      threatCategory: 'ransomware',
      attackVectors: [],
      affectedSystems: [],
      affectedUsers: 0,
      dataExposed: false,
      dataTypes: [],
      incidentCommander: '',
      responders: [],
      clientContact: '',
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl"
        >
          <div className="p-6 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Incident</h2>
                <p className="text-sm text-slate-500 dark:text-white/50">Log a new security incident</p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-2">
                Incident Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Ransomware Attack on Production Servers"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-2">
                Description *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe the incident..."
              />
            </div>

            {/* Severity & Threat Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-2">
                  Severity *
                </label>
                <select
                  value={formData.severity}
                  onChange={e => setFormData(prev => ({ ...prev, severity: e.target.value as IncidentSeverity }))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-2">
                  Threat Category *
                </label>
                <select
                  value={formData.threatCategory}
                  onChange={e => setFormData(prev => ({ ...prev, threatCategory: e.target.value as ThreatCategory }))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(THREAT_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Attack Vectors */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-2">
                Attack Vectors
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ATTACK_VECTOR_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      const vectors = formData.attackVectors.includes(key as AttackVector)
                        ? formData.attackVectors.filter(v => v !== key)
                        : [...formData.attackVectors, key as AttackVector];
                      setFormData(prev => ({ ...prev, attackVectors: vectors }));
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      formData.attackVectors.includes(key as AttackVector)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 border-slate-200 dark:border-white/10 hover:border-blue-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Affected Systems */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-2">
                Affected Systems
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={systemInput}
                  onChange={e => setSystemInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && systemInput.trim()) {
                      e.preventDefault();
                      setFormData(prev => ({ ...prev, affectedSystems: [...prev.affectedSystems, systemInput.trim()] }));
                      setSystemInput('');
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  placeholder="Add system and press Enter"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.affectedSystems.map((system, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white/70 rounded">
                    {system}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, affectedSystems: prev.affectedSystems.filter((_, j) => j !== i) }))}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Data Exposure */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.dataExposed}
                  onChange={e => setFormData(prev => ({ ...prev, dataExposed: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-white/70">Data was exposed/exfiltrated</span>
              </label>
              
              <input
                type="number"
                min="0"
                value={formData.affectedUsers}
                onChange={e => setFormData(prev => ({ ...prev, affectedUsers: parseInt(e.target.value) || 0 }))}
                className="w-32 px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                placeholder="Users affected"
              />
            </div>

            {/* Incident Commander */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-2">
                  Incident Commander *
                </label>
                <input
                  type="text"
                  required
                  value={formData.incidentCommander}
                  onChange={e => setFormData(prev => ({ ...prev, incidentCommander: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-2">
                  Client Contact
                </label>
                <input
                  type="text"
                  value={formData.clientContact}
                  onChange={e => setFormData(prev => ({ ...prev, clientContact: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Client POC"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Create Incident
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface IncidentDashboardProps {
  compliance: UseComplianceReturn;
  ir: UseIncidentResponseReturn;
  onSelectIncident: (incident: Incident) => void;
}

const IncidentDashboard: React.FC<IncidentDashboardProps> = ({ compliance, ir, onSelectIncident }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<IncidentSeverity | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | 'all'>('all');

  const filteredIncidents = useMemo(() => {
    return ir.incidents.filter(incident => {
      const matchesSearch = searchQuery === '' || 
        incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.incidentNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSeverity = filterSeverity === 'all' || incident.severity === filterSeverity;
      const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;
      
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [ir.incidents, searchQuery, filterSeverity, filterStatus]);

  const handleCreateIncident = (data: CreateIncidentData) => {
    const incident = ir.createIncident(data);
    onSelectIncident(incident);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Incident Response Center</h1>
          <p className="text-slate-500 dark:text-white/60">Monitor and manage security incidents</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Incident
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Incidents"
          value={ir.stats.activeIncidents}
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          color="bg-red-500/10"
        />
        <StatCard
          label="Critical Severity"
          value={ir.stats.incidentsBySeverity.critical}
          icon={<AlertCircle className="w-5 h-5 text-orange-500" />}
          color="bg-orange-500/10"
        />
        <StatCard
          label="Pending Assessments"
          value={ir.stats.pendingAssessments}
          icon={<FileText className="w-5 h-5 text-blue-500" />}
          color="bg-blue-500/10"
        />
        <StatCard
          label="Overdue Remediations"
          value={ir.stats.overdueRemediations}
          icon={<Clock className="w-5 h-5 text-yellow-500" />}
          color="bg-yellow-500/10"
        />
      </div>

      {/* Filters */}
      <GlassPanel className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search incidents..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value as IncidentSeverity | 'all')}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
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
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      </GlassPanel>

      {/* Incidents List */}
      <div className="space-y-3">
        {filteredIncidents.length === 0 ? (
          <GlassPanel className="p-12 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-white/20" />
            <p className="text-slate-500 dark:text-white/50">
              {ir.incidents.length === 0 
                ? 'No incidents recorded. Click "New Incident" to create one.'
                : 'No incidents match your filters.'}
            </p>
          </GlassPanel>
        ) : (
          filteredIncidents.map(incident => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onClick={() => onSelectIncident(incident)}
              compliance={compliance}
            />
          ))
        )}
      </div>

      {/* Pending Notifications Alert */}
      {ir.stats.pendingNotifications > 0 && (
        <GlassPanel className="p-4 border-l-4 border-l-yellow-500">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-white">
                {ir.stats.pendingNotifications} Regulatory Notification{ir.stats.pendingNotifications > 1 ? 's' : ''} Pending
              </p>
              <p className="text-sm text-slate-500 dark:text-white/50">
                Review and send required breach notifications
              </p>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-yellow-600 hover:bg-yellow-500/10 rounded-lg transition-colors">
              Review
            </button>
          </div>
        </GlassPanel>
      )}

      {/* Create Modal */}
      <CreateIncidentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateIncident}
      />
    </div>
  );
};

export default IncidentDashboard;
