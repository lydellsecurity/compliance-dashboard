/**
 * Auditor Portal
 *
 * Standalone portal for external auditors to verify compliance.
 * Features:
 * - Framework-first navigation
 * - Official requirement hierarchy
 * - Requirement-to-control evidence linking
 * - Read-only access with audit bundle download
 * - Clarification request system
 * - SHA-256 hash verification
 * - Multi-tenant branding
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Hash,
  Building2,
  User,
  Calendar,
} from 'lucide-react';
import type { FrameworkId, MasterControl } from '../../constants/controls';
import { FRAMEWORKS, MASTER_CONTROLS } from '../../constants/controls';
import { controlMappingEngine } from '../../services/control-mapping-engine';
import type { AuditorAccessLink, ClarificationRequest, EvidenceArtifact } from '../../services/auditor-access.service';
import { auditorAccessService } from '../../services/auditor-access.service';
import FrameworkRequirementHierarchy, { type RequirementHierarchyItem, type RequirementCategory } from './FrameworkRequirementHierarchy';
import VerificationCard from './VerificationCard';
import ClarificationRequestForm from './ClarificationRequestForm';
import AuditBundleDownloader from './AuditBundleDownloader';

// ============================================================================
// TYPES
// ============================================================================

interface ControlStatusData {
  status: 'implemented' | 'in_progress' | 'not_started' | 'not_applicable';
  answer: 'yes' | 'no' | 'partial' | 'na' | null;
  hasEvidence: boolean;
  evidenceCount: number;
}

interface AuditorPortalProps {
  accessLink: AuditorAccessLink;
  controlStatuses: Map<string, ControlStatusData>;
  evidenceItems: EvidenceArtifact[];
  onLogout: () => void;
}

// ============================================================================
// FRAMEWORK SELECTOR
// ============================================================================

const FrameworkSelector: React.FC<{
  availableFrameworks: FrameworkId[];
  selectedFramework: FrameworkId;
  onSelect: (frameworkId: FrameworkId) => void;
  frameworkStats: Map<FrameworkId, { compliant: number; total: number }>;
}> = ({ availableFrameworks, selectedFramework, onSelect, frameworkStats }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {availableFrameworks.map((fwId) => {
        const framework = FRAMEWORKS.find(f => f.id === fwId);
        if (!framework) return null;

        const stats = frameworkStats.get(fwId);
        const percentage = stats && stats.total > 0
          ? Math.round((stats.compliant / stats.total) * 100)
          : 0;

        const isSelected = selectedFramework === fwId;

        return (
          <button
            key={fwId}
            onClick={() => onSelect(fwId)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all
              ${isSelected
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md'
                : 'border-slate-200 dark:border-steel-600 bg-white dark:bg-steel-750 hover:border-slate-300 dark:hover:border-steel-500'
              }
            `}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: `${framework.color}15` }}
            >
              {framework.icon}
            </div>
            <div className="text-left">
              <div className={`font-semibold ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-steel-200'}`}>
                {framework.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-steel-500 flex items-center gap-2">
                <span>{percentage}% compliant</span>
                {stats && (
                  <span className="text-slate-400">({stats.compliant}/{stats.total})</span>
                )}
              </div>
            </div>
            {isSelected && (
              <CheckCircle className="w-5 h-5 text-indigo-500 ml-2" />
            )}
          </button>
        );
      })}
    </div>
  );
};

// ============================================================================
// STATS BAR
// ============================================================================

const StatsBar: React.FC<{
  frameworkId: FrameworkId;
  compliant: number;
  partial: number;
  gaps: number;
  total: number;
  evidenceCount: number;
  pendingRequests: number;
}> = ({ frameworkId, compliant, partial, gaps, total, evidenceCount, pendingRequests }) => {
  const framework = FRAMEWORKS.find(f => f.id === frameworkId);
  const frameworkColor = framework?.color || '#6366F1';

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
      <div className="bg-white dark:bg-steel-750 rounded-lg p-4 border border-slate-200 dark:border-steel-600">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: frameworkColor }} />
          <span className="text-xs text-slate-500 dark:text-steel-500 uppercase tracking-wide">Total</span>
        </div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{total}</div>
        <div className="text-xs text-slate-500 dark:text-steel-500">Requirements</div>
      </div>

      <div className="bg-white dark:bg-steel-750 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800/30">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span className="text-xs text-slate-500 dark:text-steel-500 uppercase tracking-wide">Compliant</span>
        </div>
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{compliant}</div>
        <div className="text-xs text-emerald-600 dark:text-emerald-400">{total > 0 ? Math.round((compliant / total) * 100) : 0}%</div>
      </div>

      <div className="bg-white dark:bg-steel-750 rounded-lg p-4 border border-amber-200 dark:border-amber-800/30">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-slate-500 dark:text-steel-500 uppercase tracking-wide">Partial</span>
        </div>
        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{partial}</div>
        <div className="text-xs text-amber-600 dark:text-amber-400">{total > 0 ? Math.round((partial / total) * 100) : 0}%</div>
      </div>

      <div className="bg-white dark:bg-steel-750 rounded-lg p-4 border border-red-200 dark:border-red-800/30">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-xs text-slate-500 dark:text-steel-500 uppercase tracking-wide">Gaps</span>
        </div>
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{gaps}</div>
        <div className="text-xs text-red-600 dark:text-red-400">{total > 0 ? Math.round((gaps / total) * 100) : 0}%</div>
      </div>

      <div className="bg-white dark:bg-steel-750 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800/30">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-indigo-500" />
          <span className="text-xs text-slate-500 dark:text-steel-500 uppercase tracking-wide">Evidence</span>
        </div>
        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{evidenceCount}</div>
        <div className="text-xs text-indigo-600 dark:text-indigo-400">Artifacts</div>
      </div>

      <div className="bg-white dark:bg-steel-750 rounded-lg p-4 border border-purple-200 dark:border-purple-800/30">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="w-4 h-4 text-purple-500" />
          <span className="text-xs text-slate-500 dark:text-steel-500 uppercase tracking-wide">Requests</span>
        </div>
        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{pendingRequests}</div>
        <div className="text-xs text-purple-600 dark:text-purple-400">Pending</div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AuditorPortal: React.FC<AuditorPortalProps> = ({
  accessLink,
  controlStatuses,
  evidenceItems,
  onLogout,
}) => {
  const [selectedFramework, setSelectedFramework] = useState<FrameworkId>(accessLink.frameworks[0] || 'SOC2');
  const [selectedRequirement, setSelectedRequirement] = useState<RequirementHierarchyItem | null>(null);
  const [showClarificationForm, setShowClarificationForm] = useState(false);
  const [clarificationRequirement, setClarificationRequirement] = useState<string | null>(null);
  const [showBundleDownloader, setShowBundleDownloader] = useState(false);
  const [clarificationRequests, setClarificationRequests] = useState<ClarificationRequest[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load clarification requests
  useEffect(() => {
    const loadRequests = async () => {
      const requests = await auditorAccessService.getClarificationRequests(accessLink.id);
      setClarificationRequests(requests);
    };
    loadRequests();
  }, [accessLink.id]);

  // Build requirement hierarchy from control mappings
  const buildRequirementHierarchy = useCallback((frameworkId: FrameworkId): RequirementCategory[] => {
    const controls = MASTER_CONTROLS;
    const clauseMap = new Map<string, {
      clauseId: string;
      title: string;
      controls: MasterControl[];
    }>();

    // Collect all clauses for this framework
    for (const control of controls) {
      for (const mapping of control.frameworkMappings) {
        if (mapping.frameworkId === frameworkId) {
          const existing = clauseMap.get(mapping.clauseId);
          if (existing) {
            existing.controls.push(control);
          } else {
            clauseMap.set(mapping.clauseId, {
              clauseId: mapping.clauseId,
              title: mapping.clauseTitle,
              controls: [control],
            });
          }
        }
      }
    }

    // Convert to hierarchy items
    const requirements: RequirementHierarchyItem[] = [];
    for (const [clauseId, data] of clauseMap.entries()) {
      // Determine compliance status based on control statuses
      let status: RequirementHierarchyItem['status'] = 'not_started';
      let hasEvidence = false;
      let evidenceCount = 0;

      const controlStatuses_arr = data.controls.map(c => controlStatuses.get(c.id));
      const implementedCount = controlStatuses_arr.filter(s => s?.answer === 'yes').length;
      const partialCount = controlStatuses_arr.filter(s => s?.answer === 'partial').length;

      if (implementedCount === data.controls.length) {
        status = 'compliant';
      } else if (implementedCount > 0 || partialCount > 0) {
        status = 'partial';
      } else if (controlStatuses_arr.some(s => s?.answer === 'no')) {
        status = 'non_compliant';
      }

      // Check evidence
      for (const control of data.controls) {
        const cs = controlStatuses.get(control.id);
        if (cs?.hasEvidence) {
          hasEvidence = true;
          evidenceCount += cs.evidenceCount;
        }
      }

      // Get legal text from mapping engine
      const legalText = controlMappingEngine.getClauseText(frameworkId, clauseId);

      requirements.push({
        id: `${frameworkId}-${clauseId}`,
        clauseId,
        title: data.title,
        description: data.title,
        legalText,
        status,
        mappedControls: data.controls.map(c => c.id),
        hasEvidence,
        evidenceCount,
      });
    }

    // Sort requirements by clause ID
    requirements.sort((a, b) => a.clauseId.localeCompare(b.clauseId));

    // Group into a single category for now
    const category: RequirementCategory = {
      id: `${frameworkId}-all`,
      name: 'All Requirements',
      description: `${FRAMEWORKS.find(f => f.id === frameworkId)?.fullName || frameworkId} Requirements`,
      requirements,
      totalRequirements: requirements.length,
      compliantCount: requirements.filter(r => r.status === 'compliant').length,
      partialCount: requirements.filter(r => r.status === 'partial').length,
      nonCompliantCount: requirements.filter(r => r.status === 'non_compliant' || r.status === 'not_started').length,
    };

    return [category];
  }, [controlStatuses]);

  // Build categories for selected framework
  const categories = useMemo(() => {
    return buildRequirementHierarchy(selectedFramework);
  }, [selectedFramework, buildRequirementHierarchy]);

  // Calculate framework stats
  const frameworkStats = useMemo(() => {
    const stats = new Map<FrameworkId, { compliant: number; total: number }>();

    for (const fwId of accessLink.frameworks) {
      const cats = buildRequirementHierarchy(fwId);
      const total = cats.reduce((sum, c) => sum + c.totalRequirements, 0);
      const compliant = cats.reduce((sum, c) => sum + c.compliantCount, 0);
      stats.set(fwId, { compliant, total });
    }

    return stats;
  }, [accessLink.frameworks, buildRequirementHierarchy]);

  // Get mapped controls for selected requirement
  const getMappedControlsForRequirement = useCallback((requirement: RequirementHierarchyItem) => {
    return requirement.mappedControls.map(controlId => {
      const control = MASTER_CONTROLS.find(c => c.id === controlId);
      const status = controlStatuses.get(controlId);

      return {
        id: controlId,
        title: control?.title || controlId,
        description: control?.description || '',
        domain: control?.domain || 'unknown',
        status: status?.status || 'not_started',
        answer: status?.answer || null,
        hasEvidence: status?.hasEvidence || false,
        evidenceCount: status?.evidenceCount || 0,
      };
    });
  }, [controlStatuses]);

  // Get evidence for selected requirement
  const getEvidenceForRequirement = useCallback((requirement: RequirementHierarchyItem) => {
    return evidenceItems.filter(item =>
      requirement.mappedControls.includes(item.controlId) &&
      item.status === 'final'
    );
  }, [evidenceItems]);

  // Handle clarification request
  const handleClarificationRequest = (requirementId: string) => {
    setClarificationRequirement(requirementId);
    setShowClarificationForm(true);
  };

  const handleClarificationSubmit = async (data: { message: string; priority: 'low' | 'medium' | 'high' | 'critical'; relatedControlId?: string }) => {
    if (!clarificationRequirement || !selectedRequirement) return false;

    try {
      const request = await auditorAccessService.createClarificationRequest(accessLink.id, {
        organizationId: accessLink.organizationId,
        frameworkId: selectedFramework,
        requirementId: clarificationRequirement,
        requirementTitle: selectedRequirement.title,
        controlId: data.relatedControlId,
        auditorName: accessLink.auditorName,
        auditorEmail: accessLink.auditorEmail,
        message: data.message,
        priority: data.priority,
      });

      setClarificationRequests(prev => [request, ...prev]);
      return true;
    } catch (error) {
      console.error('Failed to create clarification request:', error);
      return false;
    }
  };

  // Calculate current framework stats
  const currentStats = frameworkStats.get(selectedFramework) || { compliant: 0, total: 0 };
  const currentCategories = categories;
  const partial = currentCategories.reduce((sum, c) => sum + c.partialCount, 0);
  const gaps = currentCategories.reduce((sum, c) => sum + c.nonCompliantCount, 0);
  const evidenceCount = evidenceItems.filter(e =>
    currentCategories.some(cat =>
      cat.requirements.some(req =>
        req.mappedControls.some(cid => e.controlId === cid)
      )
    )
  ).length;
  const pendingRequests = clarificationRequests.filter(r => r.status === 'pending').length;

  // Format expiry date
  const expiryDate = new Date(accessLink.expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const framework = FRAMEWORKS.find(f => f.id === selectedFramework);
  const frameworkColor = framework?.color || '#6366F1';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-steel-900">
      {/* Header */}
      <header className="bg-white dark:bg-steel-800 border-b border-slate-200 dark:border-steel-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Org Name */}
            <div className="flex items-center gap-4">
              {accessLink.organizationLogo ? (
                <img
                  src={accessLink.organizationLogo}
                  alt={accessLink.organizationName}
                  className="h-8 object-contain"
                />
              ) : (
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
              )}
              <div>
                <h1 className="font-semibold text-slate-900 dark:text-white">
                  {accessLink.organizationName || 'Compliance'} Audit Portal
                </h1>
                <p className="text-xs text-slate-500 dark:text-steel-500">
                  Read-Only Verification Access
                </p>
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-steel-400">
                <User className="w-4 h-4" />
                <span>{accessLink.auditorName}</span>
                {accessLink.auditorFirm && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span>{accessLink.auditorFirm}</span>
                  </>
                )}
              </div>
              <div className="w-px h-6 bg-slate-200 dark:bg-steel-700" />
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-steel-500">
                <Calendar className="w-4 h-4" />
                <span>Expires: {expiryDate}</span>
              </div>
              <button
                onClick={() => setShowBundleDownloader(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Download Bundle
              </button>
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-steel-300 transition-colors"
                title="Exit Portal"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-800"
            >
              <div className="px-4 py-4 space-y-4">
                <div className="text-sm text-slate-600 dark:text-steel-400">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4" />
                    <span>{accessLink.auditorName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Expires: {expiryDate}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowBundleDownloader(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg"
                >
                  <Download className="w-4 h-4" />
                  Download Bundle
                </button>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-slate-600 dark:text-steel-400 border border-slate-200 dark:border-steel-600 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  Exit Portal
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Framework Selector */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-slate-700 dark:text-steel-300 mb-3">
            Select Framework
          </h2>
          <FrameworkSelector
            availableFrameworks={accessLink.frameworks}
            selectedFramework={selectedFramework}
            onSelect={setSelectedFramework}
            frameworkStats={frameworkStats}
          />
        </div>

        {/* Stats Bar */}
        <div className="mb-6">
          <StatsBar
            frameworkId={selectedFramework}
            compliant={currentStats.compliant}
            partial={partial}
            gaps={gaps}
            total={currentStats.total}
            evidenceCount={evidenceCount}
            pendingRequests={pendingRequests}
          />
        </div>

        {/* Main Panel - Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Requirement Hierarchy */}
          <div className="bg-white dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700 overflow-hidden h-[calc(100vh-380px)] min-h-[500px]">
            <FrameworkRequirementHierarchy
              frameworkId={selectedFramework}
              categories={categories}
              onRequirementSelect={setSelectedRequirement}
              selectedRequirementId={selectedRequirement?.id}
            />
          </div>

          {/* Right: Verification Card */}
          <div className="h-[calc(100vh-380px)] min-h-[500px]">
            {selectedRequirement ? (
              <VerificationCard
                requirement={selectedRequirement}
                frameworkId={selectedFramework}
                frameworkColor={frameworkColor}
                mappedControls={getMappedControlsForRequirement(selectedRequirement)}
                evidenceArtifacts={getEvidenceForRequirement(selectedRequirement)}
                onRequestClarification={handleClarificationRequest}
                onDownloadEvidence={(_evidenceId, _fileId) => {
                  // Handle individual file download
                }}
              />
            ) : (
              <div className="bg-white dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700 h-full flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-steel-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-slate-400 dark:text-steel-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Select a Requirement
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-steel-400 max-w-xs mx-auto">
                    Click on a requirement from the hierarchy to view its mapped controls,
                    evidence artifacts, and compliance status.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Clarification Request Form Modal */}
      {showClarificationForm && selectedRequirement && (
        <ClarificationRequestForm
          isOpen={showClarificationForm}
          onClose={() => {
            setShowClarificationForm(false);
            setClarificationRequirement(null);
          }}
          requirementId={selectedRequirement.id}
          requirementTitle={selectedRequirement.title}
          clauseId={selectedRequirement.clauseId}
          frameworkId={selectedFramework}
          frameworkColor={frameworkColor}
          auditorName={accessLink.auditorName}
          auditorEmail={accessLink.auditorEmail}
          onSubmit={handleClarificationSubmit}
          relatedControls={getMappedControlsForRequirement(selectedRequirement).map(c => ({
            id: c.id,
            title: c.title,
          }))}
        />
      )}

      {/* Audit Bundle Downloader Modal */}
      <AuditBundleDownloader
        isOpen={showBundleDownloader}
        onClose={() => setShowBundleDownloader(false)}
        frameworkId={selectedFramework}
        organizationName={accessLink.organizationName || 'Organization'}
        files={evidenceItems.flatMap(item =>
          item.files.map(file => ({
            name: file.filename,
            url: file.url,
            hash: file.checksum_sha256,
            size: file.size,
            controlId: item.controlId,
            clauseId: categories[0]?.requirements.find(r =>
              r.mappedControls.includes(item.controlId)
            )?.clauseId || 'uncategorized',
          }))
        )}
        totalSize={evidenceItems.reduce((sum, item) =>
          sum + item.files.reduce((fSum, f) => fSum + f.size, 0), 0
        )}
        onGenerateBundle={async () => {
          // Server-side bundle generation could be implemented here
          return null;
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-800 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-steel-500">
            <div className="flex items-center gap-4">
              <span>Powered by <span className="font-semibold">Lydell Security</span></span>
              <span className="flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" />
                SHA-256 Verified Evidence
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span>Read-Only Access • All activity is logged</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AuditorPortal;
