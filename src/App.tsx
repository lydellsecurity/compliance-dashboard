import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { RequirementComparisonViewer, ComplianceDriftAlert } from './components/VersionControlUI';
import { 
  HIPAA_MFA_2024, 
  HIPAA_MFA_2026, 
  EU_AI_ACT_TRANSPARENCY,
  NIST_PQC_MIGRATION,
  SAMPLE_CONTROLS,
  FRAMEWORK_VERSIONS,
} from './data/sample-requirements-2026';
import type { ComplianceDrift, RequirementComparison } from './types/compliance.types';

// ============================================================================
// DASHBOARD PAGE
// ============================================================================

const DashboardPage: React.FC = () => {
  const stats = {
    totalControls: 236,
    frameworksCovered: 4,
    pendingUpdates: 3,
    criticalDrifts: 1,
    complianceScore: 87,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Compliance Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400">Live regulatory monitoring for your 236 controls</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Total Controls" value={stats.totalControls} color="blue" />
        <StatCard label="Frameworks" value={stats.frameworksCovered} color="slate" />
        <StatCard label="Pending Updates" value={stats.pendingUpdates} color="amber" />
        <StatCard label="Critical Drift" value={stats.criticalDrifts} color="red" />
        <StatCard label="Compliance Score" value={`${stats.complianceScore}%`} color="green" />
      </div>

      {/* Framework Coverage */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Framework Coverage</h2>
        <div className="space-y-4">
          {[
            { name: 'SOC 2 Type II', version: '2024', controls: 89, score: 92 },
            { name: 'ISO 27001', version: '2022', controls: 114, score: 88 },
            { name: 'HIPAA Security', version: '2026 Update', controls: 45, score: 76, alert: true },
            { name: 'EU AI Act', version: '2026', controls: 23, score: 65, alert: true },
          ].map((fw) => (
            <div key={fw.name} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-white">{fw.name}</span>
                    {fw.alert && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800">
                        UPDATE AVAILABLE
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-slate-500">v{fw.version} • {fw.controls} controls</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      fw.score >= 90 ? 'bg-green-500' : 
                      fw.score >= 80 ? 'bg-blue-500' : 
                      fw.score >= 70 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${fw.score}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-12">
                  {fw.score}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2026 Readiness */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">2026 Readiness</h2>
        <div className="grid grid-cols-3 gap-4">
          <ReadinessCard 
            title="AI Transparency" 
            subtitle="EU AI Act Compliance"
            status="in_progress"
            progress={45}
          />
          <ReadinessCard 
            title="Quantum Readiness" 
            subtitle="Post-Quantum Cryptography"
            status="assessment"
            progress={20}
          />
          <ReadinessCard 
            title="Zero Trust" 
            subtitle="Continuous Authentication"
            status="in_progress"
            progress={72}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// REGULATORY UPDATES PAGE
// ============================================================================

const RegulatoryUpdatesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'drift' | 'changelog'>('pending');

  // Sample pending update comparison
  const hipaaComparison: RequirementComparison = {
    requirementId: 'REQ-HIPAA-SEC-164.312.d-2026',
    current: {
      version: FRAMEWORK_VERSIONS.HIPAA_SECURITY_2024,
      sectionCode: '164.312(d)',
      requirementText: HIPAA_MFA_2024.requirementText,
      implementationGuidance: HIPAA_MFA_2024.implementationGuidance,
    },
    new: {
      version: FRAMEWORK_VERSIONS.HIPAA_SECURITY_2026,
      sectionCode: '164.312(d)',
      requirementText: HIPAA_MFA_2026.requirementText,
      implementationGuidance: HIPAA_MFA_2026.implementationGuidance,
    },
    textDiff: [],
    significantChanges: [
      'MFA now MANDATORY for all ePHI access (was optional)',
      'Phishing-resistant MFA (FIDO2) required for privileged accounts',
      'Continuous authentication required for high-risk sessions',
      'SMS-only OTP no longer acceptable as sole second factor',
    ],
    impactAssessment: 'This is a CRITICAL change requiring immediate action. Organizations must implement MFA for all users accessing ePHI before the June 2026 compliance deadline.',
    affectedControls: [
      {
        controlId: 'CTRL-AC-001',
        controlTitle: 'Multi-Factor Authentication',
        currentMappingStatus: 'partial',
        requiredUpdates: ['Enable MFA enforcement for all users', 'Deploy FIDO2 for admins'],
      },
      {
        controlId: 'CTRL-AC-005',
        controlTitle: 'Session Management',
        currentMappingStatus: 'needs_review',
        requiredUpdates: ['Implement continuous authentication', 'Add risk-based step-up'],
      },
    ],
    adminActions: {},
  };

  // Sample drift alert
  const sampleDrift: ComplianceDrift = {
    id: 'DRIFT-2026-001',
    detectedAt: new Date().toISOString(),
    requirementId: 'REQ-HIPAA-SEC-164.312.d-2026',
    previousRequirementVersion: '2024',
    newRequirementVersion: '2026_update',
    changeType: 'requirement_strengthened',
    changeSummary: 'HIPAA 2026 mandates MFA for all ePHI access - previous optional implementation no longer sufficient',
    affectedControlIds: ['CTRL-AC-001', 'CTRL-AC-005'],
    impactLevel: 'critical',
    complianceGapDescription: '2 of 3 existing responses do not meet updated requirements for mandatory multi-factor authentication.',
    status: 'detected',
    previousUserResponses: [
      {
        questionId: 'Q-AUTH-001',
        questionText: 'Describe your authentication implementation for systems containing PHI',
        userAnswer: 'We use password-based authentication with optional MFA available for users who request it.',
        answeredAt: '2025-06-15',
        meetsNewRequirement: false,
        gapAnalysis: 'Response indicates MFA is optional; new requirement mandates MFA for ALL users.',
      },
      {
        questionId: 'Q-AUTH-002',
        questionText: 'What MFA methods are supported?',
        userAnswer: 'SMS-based OTP and Microsoft Authenticator app.',
        answeredAt: '2025-06-15',
        meetsNewRequirement: false,
        gapAnalysis: 'No phishing-resistant option (FIDO2) available for privileged access as now required.',
      },
    ],
    requiredActions: [
      {
        id: 'ACT-001',
        actionType: 'update_control',
        description: 'Enable mandatory MFA enforcement for all users accessing ePHI',
        priority: 'critical',
        deadline: '2026-06-01',
        status: 'pending',
      },
      {
        id: 'ACT-002',
        actionType: 'implement_new',
        description: 'Deploy FIDO2/WebAuthn for privileged accounts',
        priority: 'high',
        deadline: '2026-04-01',
        status: 'pending',
      },
      {
        id: 'ACT-003',
        actionType: 'reassess',
        description: 'Re-answer compliance questions with updated implementation details',
        priority: 'high',
        status: 'pending',
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Regulatory Updates</h1>
        <p className="text-slate-500 dark:text-slate-400">Review and accept framework updates, manage compliance drift</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {[
          { id: 'pending', label: 'Pending Updates', count: 3 },
          { id: 'drift', label: 'Compliance Drift', count: 1 },
          { id: 'changelog', label: 'Change Log', count: 12 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
              activeTab === tab.id ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          <RequirementComparisonViewer
            comparison={hipaaComparison}
            onAccept={(id) => alert(`Accepted update: ${id}`)}
            onReject={(id, reason) => alert(`Rejected: ${id} - ${reason}`)}
            onDefer={(id) => alert(`Deferred: ${id}`)}
          />
        </div>
      )}

      {activeTab === 'drift' && (
        <div className="space-y-4">
          <ComplianceDriftAlert
            drift={sampleDrift}
            onAcknowledge={(id) => alert(`Acknowledged: ${id}`)}
            onRemediate={(id) => alert(`Starting remediation: ${id}`)}
          />
        </div>
      )}

      {activeTab === 'changelog' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Framework</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Change</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Impact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {[
                { date: '2026-01-10', framework: 'HIPAA_SECURITY', change: 'MFA requirement strengthened', impact: 'critical', status: 'pending' },
                { date: '2026-01-08', framework: 'EU_AI_ACT', change: 'High-risk AI registration deadline clarified', impact: 'high', status: 'accepted' },
                { date: '2026-01-05', framework: 'NIST_800_53', change: 'PQC migration guidance updated', impact: 'medium', status: 'accepted' },
                { date: '2025-12-20', framework: 'ISO_27001', change: 'Minor clarification on A.8.24', impact: 'low', status: 'implemented' },
              ].map((log, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 text-sm text-slate-600">{log.date}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs font-mono rounded bg-slate-100 dark:bg-slate-700">
                      {log.framework}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{log.change}</td>
                  <td className="px-4 py-3">
                    <span className={`w-2 h-2 inline-block rounded-full mr-2 ${
                      log.impact === 'critical' ? 'bg-red-500' :
                      log.impact === 'high' ? 'bg-orange-500' :
                      log.impact === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    {log.impact}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${
                      log.status === 'implemented' ? 'bg-green-100 text-green-800' :
                      log.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// REQUIREMENTS PAGE
// ============================================================================

const RequirementsPage: React.FC = () => {
  const requirements = [
    HIPAA_MFA_2026,
    EU_AI_ACT_TRANSPARENCY,
    NIST_PQC_MIGRATION,
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Master Requirement Library</h1>
          <p className="text-slate-500 dark:text-slate-400">Browse all regulatory requirements across frameworks</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
            <option>All Frameworks</option>
            <option>HIPAA Security</option>
            <option>EU AI Act</option>
            <option>ISO 27001</option>
            <option>NIST 800-53</option>
          </select>
          <select className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
            <option>All Categories</option>
            <option>AI Transparency</option>
            <option>Quantum Readiness</option>
            <option>Zero Trust</option>
            <option>Traditional</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {requirements.map((req) => (
          <div key={req.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-1 text-xs font-mono rounded bg-slate-100 dark:bg-slate-700">
                    {req.sectionCode}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    req.category === 'ZERO_TRUST' ? 'bg-purple-100 text-purple-800' :
                    req.category === 'AI_TRANSPARENCY' ? 'bg-blue-100 text-blue-800' :
                    req.category === 'QUANTUM_READINESS' ? 'bg-cyan-100 text-cyan-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {req.category.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    req.riskLevel === 'critical' ? 'bg-red-100 text-red-800' :
                    req.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {req.riskLevel.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {req.sectionTitle}
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                {req.frameworkId} v{req.frameworkVersion.version}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
              {req.requirementText}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500">
                {req.implementationGuidance.length} guidance items
              </span>
              <span className="text-slate-500">
                {req.keywords.length} keywords
              </span>
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                View Details →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// CONTROLS PAGE
// ============================================================================

const ControlsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Control Library</h1>
          <p className="text-slate-500 dark:text-slate-400">Your 236 internal controls mapped to requirements</p>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
          + Add Control
        </button>
      </div>

      <div className="space-y-4">
        {SAMPLE_CONTROLS.map((control) => (
          <div key={control.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-1 text-xs font-mono rounded bg-blue-100 text-blue-800">
                    {control.controlNumber}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    control.status === 'operational' ? 'bg-green-100 text-green-800' :
                    control.status === 'implemented' ? 'bg-blue-100 text-blue-800' :
                    control.status === 'needs_review' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {control.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {control.title}
                </h3>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500">Effectiveness</div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className={`w-4 h-4 rounded ${
                        n <= control.effectivenessRating ? 'bg-green-500' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {control.description}
            </p>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-slate-500">
                  Owner: <span className="text-slate-700 dark:text-slate-300">{control.owner}</span>
                </span>
                <span className="text-slate-500">
                  Family: <span className="text-slate-700 dark:text-slate-300">{control.controlFamily}</span>
                </span>
              </div>
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                View Mappings →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const StatCard: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/30',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800',
  };

  return (
    <div className={`p-4 rounded-xl ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
};

const ReadinessCard: React.FC<{ title: string; subtitle: string; status: string; progress: number }> = ({
  title,
  subtitle,
  status,
  progress,
}) => (
  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
    <div className="flex items-center justify-between mb-2">
      <span className={`px-2 py-0.5 text-xs rounded ${
        status === 'complete' ? 'bg-green-100 text-green-800' :
        status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
        'bg-amber-100 text-amber-800'
      }`}>
        {status.replace('_', ' ')}
      </span>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{progress}%</span>
    </div>
    <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
    <p className="text-sm text-slate-500">{subtitle}</p>
    <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }} />
    </div>
  </div>
);

// ============================================================================
// MAIN APP
// ============================================================================

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
        {/* Navigation */}
        <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">CE</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">Compliance Engine</span>
                </div>
                <div className="flex items-center gap-1">
                  {[
                    { to: '/', label: 'Dashboard' },
                    { to: '/updates', label: 'Updates' },
                    { to: '/requirements', label: 'Requirements' },
                    { to: '/controls', label: 'Controls' },
                  ].map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/updates" element={<RegulatoryUpdatesPage />} />
            <Route path="/requirements" element={<RequirementsPage />} />
            <Route path="/controls" element={<ControlsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
