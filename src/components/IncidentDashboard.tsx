/**
 * Incident Response Dashboard Component
 * Command Center Design - Midnight & Steel Theme
 *
 * Main dashboard for AttestAI's IR operations.
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
// CONSTANTS - Industrial Status Colors
// ============================================================================

const SEVERITY_CONFIG: Record<IncidentSeverity, { color: string; bg: string; border: string; label: string; dot: string }> = {
  critical: { color: 'text-status-risk', bg: 'bg-status-risk/10', border: 'border-status-risk/30', label: 'CRITICAL', dot: 'status-dot-risk' },
  high: { color: 'text-status-warning', bg: 'bg-status-warning/10', border: 'border-status-warning/30', label: 'HIGH', dot: 'status-dot-warning' },
  medium: { color: 'text-status-info', bg: 'bg-status-info/10', border: 'border-status-info/30', label: 'MEDIUM', dot: 'status-dot-neutral' },
  low: { color: 'text-slate-500 dark:text-steel-400', bg: 'bg-slate-100 dark:bg-steel-800', border: 'border-slate-300 dark:border-steel-700', label: 'LOW', dot: 'status-dot-neutral' },
};

const STATUS_CONFIG: Record<IncidentStatus, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  detected: { color: 'text-status-risk', bg: 'bg-status-risk/20', label: 'Detected', icon: <AlertTriangle className="w-3 h-3" /> },
  triaged: { color: 'text-status-warning', bg: 'bg-status-warning/20', label: 'Triaged', icon: <Target className="w-3 h-3" /> },
  containment: { color: 'text-status-info', bg: 'bg-status-info/20', label: 'Containment', icon: <Shield className="w-3 h-3" /> },
  eradication: { color: 'text-accent-400', bg: 'bg-accent-500/20', label: 'Eradication', icon: <Zap className="w-3 h-3" /> },
  recovery: { color: 'text-status-success', bg: 'bg-status-success/20', label: 'Recovery', icon: <TrendingUp className="w-3 h-3" /> },
  lessons_learned: { color: 'text-framework-soc2', bg: 'bg-framework-soc2/20', label: 'Lessons Learned', icon: <FileText className="w-3 h-3" /> },
  closed: { color: 'text-slate-500 dark:text-steel-400', bg: 'bg-slate-200/50 dark:bg-steel-700/50', label: 'Closed', icon: <CheckCircle2 className="w-3 h-3" /> },
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
// SUB-COMPONENTS - Command Center Design
// ============================================================================

const Card: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = '', style }) => (
  <div className={`card ${className}`} style={style}>
    {children}
  </div>
);

const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="stat-label">{label}</p>
        <p className="mt-2 stat-value">{value}</p>
      </div>
      <div className={`p-3 ${color}`}>
        {icon}
      </div>
    </div>
  </Card>
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
      whileHover={{ scale: 1.002 }}
      className={`w-full text-left p-4 border transition-all duration-200 ${severity.bg} ${severity.border} hover:shadow-card-hover`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`${severity.dot} status-dot`} />
            <span className={`badge ${severity.bg} ${severity.color} border ${severity.border}`}>
              {severity.label}
            </span>
            <span className={`badge ${status.bg} ${status.color}`}>
              {status.icon}
              <span className="ml-1">{status.label}</span>
            </span>
            <span className="text-xs font-mono text-steel-500">{incident.incidentNumber}</span>
          </div>

          <h3 className="font-semibold text-steel-100 truncate tracking-tight">{incident.title}</h3>

          <div className="flex items-center gap-4 mt-2 text-xs text-steel-500">
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
            <p className="text-xs text-steel-500">Affected Controls</p>
            <p className="text-lg font-bold text-steel-100">{incident.affectedControlIds.length}</p>
          </div>
          {affectedGaps > 0 && (
            <span className="badge-risk">
              {affectedGaps} pre-existing gaps
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
};

// ============================================================================
// CREATE INCIDENT MODAL - Glassmorphism
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
        className="modal-backdrop flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="modal-content w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6 border-b border-steel-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-status-risk/20">
                <AlertTriangle className="w-6 h-6 text-status-risk" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-steel-100 tracking-tight">Create Incident</h2>
                <p className="text-sm text-steel-500">Log a new security incident</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-steel-300 mb-2">
                Incident Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="input"
                placeholder="e.g., Ransomware Attack on Production Servers"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-steel-300 mb-2">
                Description *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input resize-none"
                placeholder="Describe the incident..."
              />
            </div>

            {/* Severity & Threat Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-steel-300 mb-2">
                  Severity *
                </label>
                <select
                  value={formData.severity}
                  onChange={e => setFormData(prev => ({ ...prev, severity: e.target.value as IncidentSeverity }))}
                  className="input"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-steel-300 mb-2">
                  Threat Category *
                </label>
                <select
                  value={formData.threatCategory}
                  onChange={e => setFormData(prev => ({ ...prev, threatCategory: e.target.value as ThreatCategory }))}
                  className="input"
                >
                  {Object.entries(THREAT_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Attack Vectors */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-steel-300 mb-2">
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
                    className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                      formData.attackVectors.includes(key as AttackVector)
                        ? 'bg-accent-500 text-white border-accent-500'
                        : 'bg-slate-100 dark:bg-midnight-900 text-slate-500 dark:text-steel-400 border-slate-300 dark:border-steel-700 hover:border-accent-500/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Affected Systems */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-steel-300 mb-2">
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
                  className="input flex-1"
                  placeholder="Add system and press Enter"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.affectedSystems.map((system, i) => (
                  <span key={i} className="badge-neutral">
                    {system}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, affectedSystems: prev.affectedSystems.filter((_, j) => j !== i) }))}
                      className="ml-1 hover:text-status-risk"
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
                  className="w-4 h-4 border-slate-400 dark:border-steel-600 bg-white dark:bg-midnight-900 text-accent-500 focus:ring-accent-500"
                />
                <span className="text-sm text-slate-600 dark:text-steel-300">Data was exposed/exfiltrated</span>
              </label>

              <input
                type="number"
                min="0"
                value={formData.affectedUsers}
                onChange={e => setFormData(prev => ({ ...prev, affectedUsers: parseInt(e.target.value) || 0 }))}
                className="input w-32"
                placeholder="Users affected"
              />
            </div>

            {/* Incident Commander */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-steel-300 mb-2">
                  Incident Commander *
                </label>
                <input
                  type="text"
                  required
                  value={formData.incidentCommander}
                  onChange={e => setFormData(prev => ({ ...prev, incidentCommander: e.target.value }))}
                  className="input"
                  placeholder="Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-steel-300 mb-2">
                  Client Contact
                </label>
                <input
                  type="text"
                  value={formData.clientContact}
                  onChange={e => setFormData(prev => ({ ...prev, clientContact: e.target.value }))}
                  className="input"
                  placeholder="Client POC"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-steel-700">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-danger flex items-center gap-2"
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
          <h1 className="page-title">Incident Response Center</h1>
          <p className="page-subtitle">Monitor and manage security incidents</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-danger"
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
          icon={<AlertTriangle className="w-5 h-5 text-status-risk" />}
          color="bg-status-risk/10"
        />
        <StatCard
          label="Critical Severity"
          value={ir.stats.incidentsBySeverity.critical}
          icon={<AlertCircle className="w-5 h-5 text-status-warning" />}
          color="bg-status-warning/10"
        />
        <StatCard
          label="Pending Assessments"
          value={ir.stats.pendingAssessments}
          icon={<FileText className="w-5 h-5 text-accent-400" />}
          color="bg-accent-500/10"
        />
        <StatCard
          label="Overdue Remediations"
          value={ir.stats.overdueRemediations}
          icon={<Clock className="w-5 h-5 text-status-warning" />}
          color="bg-status-warning/10"
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search incidents..."
                className="input-search w-full"
              />
            </div>
          </div>

          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value as IncidentSeverity | 'all')}
            className="input"
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
            className="input"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Incidents List */}
      <div className="space-y-3">
        {filteredIncidents.length === 0 ? (
          <Card className="p-12 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-steel-600" />
            <p className="text-steel-500">
              {ir.incidents.length === 0
                ? 'No incidents recorded. Click "New Incident" to create one.'
                : 'No incidents match your filters.'}
            </p>
          </Card>
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
        <Card className="p-4" style={{ borderLeftWidth: '4px', borderLeftColor: '#f59e0b' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-status-warning/20">
              <AlertTriangle className="w-5 h-5 text-status-warning" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-steel-100">
                {ir.stats.pendingNotifications} Regulatory Notification{ir.stats.pendingNotifications > 1 ? 's' : ''} Pending
              </p>
              <p className="text-sm text-steel-500">
                Review and send required breach notifications
              </p>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-status-warning hover:bg-status-warning/10 transition-colors">
              Review
            </button>
          </div>
        </Card>
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
