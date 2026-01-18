/**
 * Auditor Portal Page
 *
 * Standalone page for external auditor access.
 * Handles token validation, authentication, and portal rendering.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { AuditorPortal, AuditorPortalLogin } from '../components/AuditorPortal';
import { auditorAccessService, type AuditorAccessLink, type EvidenceArtifact } from '../services/auditor-access.service';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

interface ControlStatusData {
  status: 'implemented' | 'in_progress' | 'not_started' | 'not_applicable';
  answer: 'yes' | 'no' | 'partial' | 'na' | null;
  hasEvidence: boolean;
  evidenceCount: number;
}

type PageState = 'loading' | 'login' | 'authenticated' | 'error' | 'expired';

// ============================================================================
// MOCK DATA (for development/demo)
// ============================================================================

function generateMockData(): {
  controlStatuses: Map<string, ControlStatusData>;
  evidenceItems: EvidenceArtifact[];
} {
  const controlStatuses = new Map<string, ControlStatusData>();

  // Generate some sample control statuses
  const sampleControls = [
    'AC-001', 'AC-002', 'AC-003', 'AC-004', 'AC-005',
    'AM-001', 'AM-002', 'AM-003',
    'RA-001', 'RA-002', 'RA-003',
    'SO-001', 'SO-002', 'SO-003', 'SO-004',
    'IR-001', 'IR-002', 'IR-003',
    'DP-001', 'DP-002', 'DP-003', 'DP-004',
  ];

  for (const controlId of sampleControls) {
    const rand = Math.random();
    let answer: ControlStatusData['answer'];
    let status: ControlStatusData['status'];

    if (rand < 0.5) {
      answer = 'yes';
      status = 'implemented';
    } else if (rand < 0.7) {
      answer = 'partial';
      status = 'in_progress';
    } else if (rand < 0.9) {
      answer = 'no';
      status = 'not_started';
    } else {
      answer = null;
      status = 'not_started';
    }

    controlStatuses.set(controlId, {
      status,
      answer,
      hasEvidence: answer === 'yes' && Math.random() > 0.3,
      evidenceCount: answer === 'yes' ? Math.floor(Math.random() * 5) + 1 : 0,
    });
  }

  // Generate some sample evidence items
  const evidenceItems: EvidenceArtifact[] = [];
  let evidenceId = 1;

  for (const [controlId, status] of controlStatuses.entries()) {
    if (status.hasEvidence && status.evidenceCount > 0) {
      const count = status.evidenceCount;
      for (let i = 0; i < count; i++) {
        evidenceItems.push({
          id: `evidence-${evidenceId++}`,
          controlId,
          controlTitle: `Control ${controlId}`,
          title: `Evidence Document ${i + 1} for ${controlId}`,
          description: `Supporting documentation for control ${controlId}`,
          type: ['policy', 'screenshot', 'log', 'report'][Math.floor(Math.random() * 4)],
          status: 'final',
          files: [
            {
              id: `file-${evidenceId}`,
              filename: `${controlId}_evidence_${i + 1}.pdf`,
              url: `https://example.com/evidence/${controlId}/${i + 1}`,
              size: Math.floor(Math.random() * 500000) + 10000,
              mimeType: 'application/pdf',
              checksum_sha256: generateMockHash(),
              uploadedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
          frameworkMappings: ['SOC2', 'ISO27001'],
          collectedAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
          approvedAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
          approvedBy: 'Admin User',
        });
      }
    }
  }

  return { controlStatuses, evidenceItems };
}

function generateMockHash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AuditorPortalPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [accessLink, setAccessLink] = useState<AuditorAccessLink | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controlStatuses, setControlStatuses] = useState<Map<string, ControlStatusData>>(new Map());
  const [evidenceItems, setEvidenceItems] = useState<EvidenceArtifact[]>([]);

  // Initial token validation
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid access link');
        setPageState('error');
        return;
      }

      try {
        // Check if token exists and get basic info
        const result = await auditorAccessService.validateAccessToken(token);

        if (!result.valid) {
          if (result.error === 'Password required') {
            // Token valid but needs password
            setRequiresPassword(true);
            setAccessLink(result.link || null);
            setPageState('login');
          } else if (result.error?.includes('expired')) {
            setError('This access link has expired. Please contact the organization for a new link.');
            setPageState('expired');
          } else {
            setError(result.error || 'Invalid access link');
            setPageState('error');
          }
          return;
        }

        // Token valid without password
        setAccessLink(result.link!);
        await loadPortalData(result.link!);
        setPageState('authenticated');
      } catch (err) {
        console.error('Token validation error:', err);
        setError('Failed to validate access link. Please try again.');
        setPageState('error');
      }
    };

    validateToken();
  }, [token]);

  // Load compliance data for the portal
  const loadPortalData = useCallback(async (link: AuditorAccessLink) => {
    // In a real implementation, this would fetch from Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        // Fetch control responses for the organization
        const { data: responses, error: responsesError } = await supabase
          .from('user_responses')
          .select('*')
          .eq('organization_id', link.organizationId);

        if (!responsesError && responses) {
          const statusMap = new Map<string, ControlStatusData>();
          for (const response of responses) {
            statusMap.set(response.control_id, {
              status: response.answer === 'yes' ? 'implemented'
                : response.answer === 'partial' ? 'in_progress'
                : 'not_started',
              answer: response.answer,
              hasEvidence: Boolean(response.evidence_url || response.evidence_urls?.length),
              evidenceCount: response.evidence_urls?.length || (response.evidence_url ? 1 : 0),
            });
          }
          setControlStatuses(statusMap);
        }

        // Fetch evidence items
        const { data: evidence, error: evidenceError } = await supabase
          .from('evidence_items')
          .select(`
            *,
            evidence_versions (
              *,
              evidence_files (*)
            )
          `)
          .eq('organization_id', link.organizationId)
          .eq('status', 'final');

        if (!evidenceError && evidence) {
          const items: EvidenceArtifact[] = evidence.map(item => {
            const latestVersion = item.evidence_versions
              ?.sort((a: { version: number }, b: { version: number }) => b.version - a.version)[0];

            return {
              id: item.id,
              controlId: item.control_id,
              controlTitle: item.control_title || '',
              title: item.title,
              description: item.description,
              type: item.type,
              status: item.status,
              files: latestVersion?.evidence_files?.map((f: { id: string; filename: string; url: string; size: number; mime_type: string; checksum_sha256: string; uploaded_at: string }) => ({
                id: f.id,
                filename: f.filename,
                url: f.url,
                size: f.size,
                mimeType: f.mime_type,
                checksum_sha256: f.checksum_sha256,
                uploadedAt: f.uploaded_at,
              })) || [],
              frameworkMappings: item.framework_mappings || [],
              collectedAt: item.collected_at,
              approvedAt: latestVersion?.approved_at,
              approvedBy: latestVersion?.approved_by,
            };
          });
          setEvidenceItems(items);
        }
      } catch (err) {
        console.error('Failed to load portal data:', err);
        // Fall back to mock data
        const mockData = generateMockData();
        setControlStatuses(mockData.controlStatuses);
        setEvidenceItems(mockData.evidenceItems);
      }
    } else {
      // Use mock data for development
      const mockData = generateMockData();
      setControlStatuses(mockData.controlStatuses);
      setEvidenceItems(mockData.evidenceItems);
    }
  }, []);

  // Handle password authentication
  const handleAuthenticate = async (password?: string): Promise<{ success: boolean; error?: string }> => {
    if (!token) {
      return { success: false, error: 'Invalid access link' };
    }

    try {
      const result = await auditorAccessService.validateAccessToken(token, password);

      if (!result.valid) {
        return { success: false, error: result.error };
      }

      setAccessLink(result.link!);
      await loadPortalData(result.link!);
      setPageState('authenticated');
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Authentication failed' };
    }
  };

  // Handle logout
  const handleLogout = () => {
    navigate('/');
  };

  // Render based on state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-steel-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-steel-400">Validating access...</p>
        </div>
      </div>
    );
  }

  if (pageState === 'login') {
    return (
      <AuditorPortalLogin
        token={token || ''}
        organizationName={accessLink?.organizationName}
        organizationLogo={accessLink?.organizationLogo}
        requiresPassword={requiresPassword}
        onAuthenticate={handleAuthenticate}
      />
    );
  }

  if (pageState === 'error' || pageState === 'expired') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-steel-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-steel-800 rounded-xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            pageState === 'expired'
              ? 'bg-amber-100 dark:bg-amber-900/30'
              : 'bg-red-100 dark:bg-red-900/30'
          }`}>
            <AlertTriangle className={`w-8 h-8 ${
              pageState === 'expired'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
            }`} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {pageState === 'expired' ? 'Link Expired' : 'Access Error'}
          </h1>
          <p className="text-slate-600 dark:text-steel-400 mb-6">
            {error || 'Unable to access the audit portal.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-steel-700 text-slate-700 dark:text-steel-300 rounded-lg hover:bg-slate-200 dark:hover:bg-steel-600 transition-colors mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Home
          </button>
        </motion.div>
      </div>
    );
  }

  if (pageState === 'authenticated' && accessLink) {
    return (
      <AuditorPortal
        accessLink={accessLink}
        controlStatuses={controlStatuses}
        evidenceItems={evidenceItems}
        onLogout={handleLogout}
      />
    );
  }

  return null;
};

export default AuditorPortalPage;
