/**
 * Integrated App with Incident Response
 *
 * This wrapper adds IR functionality to the existing Compliance Engine.
 * Import this instead of the base App.tsx for the full AttestAI experience.
 */

import React, { useState, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ClipboardCheck, FolderOpen, Building2, Shield,
  AlertTriangle, FileText, Moon, Sun, Zap,
} from 'lucide-react';

import { useCompliance, useIncidentResponse } from './hooks';
import type { UseComplianceReturn } from './hooks/useCompliance';
import type { UseIncidentResponseReturn } from './hooks/useIncidentResponse';
import type { Incident } from './types/incident.types';

// Import components
import IncidentDashboard from './components/IncidentDashboard';
import IncidentDetail from './components/IncidentDetail';
import ClientReporting from './components/ClientReporting';

type TabId = 'dashboard' | 'assessment' | 'evidence' | 'company' | 'incidents' | 'reporting';

// ============================================================================
// CONTEXTS
// ============================================================================

interface AppContextValue {
  compliance: UseComplianceReturn;
  ir: UseIncidentResponseReturn;
}

const AppContext = createContext<AppContextValue | null>(null);

const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

// ============================================================================
// NAV COMPONENT
// ============================================================================

interface NavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  compliance: UseComplianceReturn;
  ir: UseIncidentResponseReturn;
}

const Navigation: React.FC<NavProps> = ({ activeTab, onTabChange, compliance, ir }) => {
  const { state, toggleDarkMode, syncNotifications } = compliance;
  const { darkMode } = state;
  const [showSidebar, setShowSidebar] = useState(false);

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'assessment', label: 'Assessment', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'incidents', label: 'Incidents', icon: <AlertTriangle className="w-4 h-4" />, badge: ir.stats.activeIncidents },
    { id: 'reporting', label: 'Reporting', icon: <FileText className="w-4 h-4" /> },
    { id: 'evidence', label: 'Evidence', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'company', label: 'Company', icon: <Building2 className="w-4 h-4" /> },
  ];

  return (
    <nav className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-200 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-slate-900 dark:text-white">AttestAI</span>
              <span className="text-xs text-slate-500 dark:text-white/50 ml-2">by Lydell Security</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 rounded-xl p-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.icon}
                <span className="hidden md:inline">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`relative p-2.5 rounded-xl transition-all ${
                showSidebar
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                  : 'text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Zap className="w-5 h-5" />
              {syncNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {Math.min(syncNotifications.length, 99)}
                </span>
              )}
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

// ============================================================================
// PLACEHOLDER TABS (Would import from original App.tsx in real implementation)
// ============================================================================

const PlaceholderTab: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-white/10 p-12 text-center">
    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
    <p className="text-slate-500 dark:text-white/60">{description}</p>
    <p className="text-sm text-slate-400 dark:text-white/40 mt-4">
      This tab uses the original Compliance Engine components from App.tsx
    </p>
  </div>
);

// ============================================================================
// MAIN APP
// ============================================================================

const IntegratedAppContent: React.FC = () => {
  const compliance = useCompliance();
  const ir = useIncidentResponse();
  
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Handle incident selection/deselection
  const handleSelectIncident = (incident: Incident) => {
    setSelectedIncident(incident);
  };

  const handleBackFromIncident = () => {
    setSelectedIncident(null);
  };

  return (
    <AppContext.Provider value={{ compliance, ir }}>
      <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors duration-300 ${compliance.state.darkMode ? 'dark' : ''}`}>
        <Navigation
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSelectedIncident(null);
          }}
          compliance={compliance}
          ir={ir}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatePresence mode="wait">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <PlaceholderTab
                  title="Compliance Command Center"
                  description="Framework compliance, domain progress, and critical gaps overview"
                />
              </motion.div>
            )}

            {/* Assessment Tab */}
            {activeTab === 'assessment' && (
              <motion.div
                key="assessment"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <PlaceholderTab
                  title="Control Assessment"
                  description="236 controls across 12 compliance domains"
                />
              </motion.div>
            )}

            {/* Incidents Tab */}
            {activeTab === 'incidents' && (
              <motion.div
                key="incidents"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {selectedIncident ? (
                  <IncidentDetail
                    incident={selectedIncident}
                    compliance={compliance}
                    ir={ir}
                    onBack={handleBackFromIncident}
                  />
                ) : (
                  <IncidentDashboard
                    compliance={compliance}
                    ir={ir}
                    onSelectIncident={handleSelectIncident}
                  />
                )}
              </motion.div>
            )}

            {/* Reporting Tab */}
            {activeTab === 'reporting' && (
              <motion.div
                key="reporting"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ClientReporting
                  compliance={compliance}
                  ir={ir}
                />
              </motion.div>
            )}

            {/* Evidence Tab */}
            {activeTab === 'evidence' && (
              <motion.div
                key="evidence"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <PlaceholderTab
                  title="Evidence Locker"
                  description="Manage evidence records with unique EvidenceIDs"
                />
              </motion.div>
            )}

            {/* Company Tab */}
            {activeTab === 'company' && (
              <motion.div
                key="company"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <PlaceholderTab
                  title="Company Controls"
                  description="Custom organization-specific controls"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </AppContext.Provider>
  );
};

// Wrapper to ensure dark mode is applied to document
const IntegratedApp: React.FC = () => {
  return <IntegratedAppContent />;
};

export default IntegratedApp;
export { useAppContext };
