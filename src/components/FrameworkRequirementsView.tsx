/**
 * Framework Requirements View Component
 *
 * Displays ALL requirements for a specific compliance framework in a hierarchical view.
 * Shows the framework's native structure (not control-centric) and indicates which
 * controls map to each requirement.
 */

import React, { useState, useMemo, useRef } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, AlertCircle, Shield, Upload, FileText, Trash2, Plus, X } from 'lucide-react';
import type { FrameworkId, MasterControl } from '../constants/controls';
import { FRAMEWORKS } from '../constants/controls';
import { PCI_DSS_V4_REQUIREMENTS, countPCIDSSRequirements } from '../constants/pci-dss-requirements';
import { SOC2_TRUST_SERVICES_CRITERIA, countSOC2Criteria } from '../constants/soc2-requirements';
import { ISO27001_2022_CONTROLS, countISO27001Controls } from '../constants/iso27001-requirements';
import { HIPAA_SECURITY_RULE, countHIPAASpecifications } from '../constants/hipaa-requirements';
import { NIST_CSF_2_0, countNISTSubcategories } from '../constants/nist-csf-requirements';
import { GDPR_REQUIREMENTS, countGDPRProvisions } from '../constants/gdpr-requirements';

type ControlAnswer = 'yes' | 'no' | 'partial' | 'na' | null;

// Evidence types for requirements view
interface RequirementEvidence {
  id: string;
  requirementId: string;
  frameworkId: FrameworkId;
  name: string;
  description: string;
  evidenceType: string;
  files: EvidenceFile[];
  createdAt: string;
  status: 'pending' | 'verified' | 'rejected';
}

interface EvidenceFile {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

// Local storage key for evidence
const EVIDENCE_STORAGE_KEY = 'framework-requirements-evidence';

// Type for stored evidence (keyed by framework, then by requirement)
type StoredEvidence = Partial<Record<FrameworkId, Record<string, RequirementEvidence[]>>>;

// Load evidence from localStorage
function loadEvidence(): StoredEvidence {
  try {
    const stored = localStorage.getItem(EVIDENCE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save evidence to localStorage
function saveEvidence(evidence: StoredEvidence) {
  try {
    localStorage.setItem(EVIDENCE_STORAGE_KEY, JSON.stringify(evidence));
  } catch (e) {
    console.error('Failed to save evidence:', e);
  }
}

// Format file size helper
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface FrameworkRequirementsViewProps {
  frameworkId: FrameworkId;
  controls: MasterControl[];
  getControlAnswer: (controlId: string) => ControlAnswer;
  onControlClick?: (controlId: string) => void;
}

// Color configuration for framework styling
const FRAMEWORK_COLORS: Record<FrameworkId, string> = {
  'PCIDSS': '#DC2626',
  'SOC2': '#3B82F6',
  'ISO27001': '#10B981',
  'HIPAA': '#8B5CF6',
  'NIST': '#F59E0B',
  'GDPR': '#2563EB',
};

// Generic requirement item for display
interface RequirementItem {
  id: string;
  title: string;
  description?: string;
  required?: boolean;
  children?: RequirementItem[];
}

// Get control status for a requirement
function getRequirementStatus(
  requirementId: string,
  frameworkId: FrameworkId,
  controls: MasterControl[],
  getControlAnswer: (controlId: string) => ControlAnswer
): { status: 'implemented' | 'partial' | 'not_started' | 'unmapped'; mappedControls: MasterControl[] } {
  // Find controls mapped to this requirement
  const mappedControls = controls.filter(c =>
    c.frameworkMappings.some((m: { frameworkId: string; clauseId: string }) =>
      m.frameworkId === frameworkId &&
      (m.clauseId === requirementId || m.clauseId.startsWith(requirementId + '.'))
    )
  );

  if (mappedControls.length === 0) {
    return { status: 'unmapped', mappedControls: [] };
  }

  // Check answers for each mapped control
  const implementedCount = mappedControls.filter(c => {
    const answer = getControlAnswer(c.id);
    return answer === 'yes';
  }).length;
  const partialCount = mappedControls.filter(c => {
    const answer = getControlAnswer(c.id);
    return answer === 'partial';
  }).length;
  const totalCount = mappedControls.length;

  if (implementedCount === totalCount) {
    return { status: 'implemented', mappedControls };
  } else if (implementedCount > 0 || partialCount > 0) {
    return { status: 'partial', mappedControls };
  }
  return { status: 'not_started', mappedControls };
}

// Status icon component
const StatusIcon: React.FC<{ status: 'implemented' | 'partial' | 'not_started' | 'unmapped' }> = ({ status }) => {
  switch (status) {
    case 'implemented':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'partial':
      return <AlertCircle className="w-4 h-4 text-amber-500" />;
    case 'not_started':
      return <Circle className="w-4 h-4 text-slate-400" />;
    case 'unmapped':
      return <Circle className="w-4 h-4 text-slate-300 dark:text-steel-600" />;
  }
};

// Evidence Panel Component
const EvidencePanel: React.FC<{
  requirementId: string;
  frameworkId: FrameworkId;
  evidence: RequirementEvidence[];
  onAddEvidence: (evidence: Omit<RequirementEvidence, 'id' | 'createdAt'>) => void;
  onRemoveEvidence: (evidenceId: string) => void;
  onClose: () => void;
}> = ({ requirementId, frameworkId, evidence, onAddEvidence, onRemoveEvidence, onClose }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvidence, setNewEvidence] = useState({
    name: '',
    description: '',
    evidenceType: 'Documentation',
  });
  const [uploadedFiles, setUploadedFiles] = useState<EvidenceFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
  ];

  const EVIDENCE_TYPES = [
    'Documentation',
    'Policy',
    'Procedure',
    'Screenshot',
    'Configuration Export',
    'Audit Log',
    'Test Results',
    'Certificate',
    'Report',
    'Other',
  ];

  const processFiles = async (files: FileList | File[]) => {
    setUploadError(null);
    const fileArray = Array.from(files);
    const newFiles: EvidenceFile[] = [];

    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`File "${file.name}" exceeds 10MB limit`);
        continue;
      }

      if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.csv')) {
        setUploadError(`File type "${file.type || 'unknown'}" is not supported`);
        continue;
      }

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

        newFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
        });
      } catch {
        setUploadError(`Failed to read file "${file.name}"`);
      }
    }

    if (newFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...newFiles]);
      if (!newEvidence.name && newFiles.length === 1) {
        setNewEvidence(prev => ({ ...prev, name: newFiles[0].name.replace(/\.[^/.]+$/, '') }));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!newEvidence.name) return;

    onAddEvidence({
      requirementId,
      frameworkId,
      name: newEvidence.name,
      description: newEvidence.description,
      evidenceType: newEvidence.evidenceType,
      files: uploadedFiles,
      status: 'pending',
    });

    setNewEvidence({ name: '', description: '', evidenceType: 'Documentation' });
    setUploadedFiles([]);
    setShowAddForm(false);
  };

  const handleCancel = () => {
    setNewEvidence({ name: '', description: '', evidenceType: 'Documentation' });
    setUploadedFiles([]);
    setUploadError(null);
    setShowAddForm(false);
  };

  return (
    <div className="bg-slate-50 dark:bg-steel-800/50 border-t border-slate-200 dark:border-steel-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-steel-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600 dark:text-accent-400" />
          Evidence for {requirementId}
        </h4>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 dark:text-steel-500 dark:hover:text-steel-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Existing Evidence */}
      {evidence.length > 0 && (
        <div className="space-y-2 mb-4">
          {evidence.map(ev => (
            <div
              key={ev.id}
              className="p-3 bg-white dark:bg-steel-800 rounded-lg border border-slate-200 dark:border-steel-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-steel-100">{ev.name}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-steel-700 text-slate-500 dark:text-steel-400 rounded">
                      {ev.evidenceType}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      ev.status === 'verified' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      ev.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}>
                      {ev.status}
                    </span>
                  </div>
                  {ev.description && (
                    <p className="text-xs text-slate-500 dark:text-steel-400 mt-1">{ev.description}</p>
                  )}
                  {ev.files.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {ev.files.map((file, idx) => {
                        const isImage = file.dataUrl.startsWith('data:image/');
                        return (
                          <a
                            key={idx}
                            href={file.dataUrl}
                            download={file.name}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 dark:bg-steel-700 rounded text-indigo-600 dark:text-accent-400 hover:bg-slate-200 dark:hover:bg-steel-600"
                          >
                            {isImage ? (
                              <img src={file.dataUrl} alt="" className="w-4 h-4 object-cover rounded" />
                            ) : (
                              <FileText className="w-3 h-3" />
                            )}
                            {file.name}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onRemoveEvidence(ev.id)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Evidence Form */}
      {showAddForm ? (
        <div className="p-4 bg-white dark:bg-steel-800 rounded-lg border border-indigo-200 dark:border-accent-500/30 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newEvidence.name}
              onChange={e => setNewEvidence(prev => ({ ...prev, name: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100 text-sm"
              placeholder="Evidence name..."
            />
            <select
              value={newEvidence.evidenceType}
              onChange={e => setNewEvidence(prev => ({ ...prev, evidenceType: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100 text-sm"
            >
              {EVIDENCE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <textarea
            value={newEvidence.description}
            onChange={e => setNewEvidence(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100 text-sm"
            placeholder="Description (optional)..."
          />

          {/* File Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                : 'border-slate-300 dark:border-steel-600 hover:border-indigo-400 dark:hover:border-accent-500'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="text-center">
              <Upload className={`w-6 h-6 mx-auto mb-1 ${
                isDragging ? 'text-indigo-500' : 'text-slate-400 dark:text-steel-500'
              }`} />
              <p className="text-xs font-medium text-slate-700 dark:text-steel-300">
                {isDragging ? 'Drop files here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-slate-500 dark:text-steel-400">
                PDF, Word, Excel, CSV, images (max 10MB)
              </p>
            </div>
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-xs">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {uploadError}
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div className="space-y-1">
              {uploadedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-steel-900 rounded-lg text-xs"
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="flex-1 truncate text-slate-700 dark:text-steel-300">{file.name}</span>
                  <span className="text-slate-400">{formatFileSize(file.size)}</span>
                  <button
                    onClick={() => removeUploadedFile(idx)}
                    className="p-0.5 text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!newEvidence.name}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Evidence{uploadedFiles.length > 0 ? ` (${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''})` : ''}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-slate-600 dark:text-steel-400 hover:text-slate-800 dark:hover:text-steel-200 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-steel-600 rounded-lg text-slate-500 dark:text-steel-400 hover:border-indigo-400 dark:hover:border-accent-500 hover:text-indigo-600 dark:hover:text-accent-400 transition-colors text-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Evidence
        </button>
      )}
    </div>
  );
};

// Collapsible requirement item component
const RequirementItemComponent: React.FC<{
  item: RequirementItem;
  depth: number;
  frameworkId: FrameworkId;
  controls: MasterControl[];
  getControlAnswer: (controlId: string) => ControlAnswer;
  onControlClick?: (controlId: string) => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  evidencePanelId: string | null;
  setEvidencePanelId: (id: string | null) => void;
  evidence: Record<string, RequirementEvidence[]>;
  onAddEvidence: (evidence: Omit<RequirementEvidence, 'id' | 'createdAt'>) => void;
  onRemoveEvidence: (evidenceId: string) => void;
}> = ({ item, depth, frameworkId, controls, getControlAnswer, onControlClick, expandedIds, toggleExpanded, evidencePanelId, setEvidencePanelId, evidence, onAddEvidence, onRemoveEvidence }) => {
  const isExpanded = expandedIds.has(item.id);
  const hasChildren = item.children && item.children.length > 0;
  const isLeafNode = !hasChildren;
  const { status, mappedControls } = getRequirementStatus(item.id, frameworkId, controls, getControlAnswer);
  const frameworkColor = FRAMEWORK_COLORS[frameworkId];
  const requirementEvidence = evidence[item.id] || [];
  const showEvidencePanel = evidencePanelId === item.id;

  return (
    <div className="border-b border-slate-100 dark:border-steel-700 last:border-b-0">
      <div
        className={`flex items-start gap-2 py-2.5 px-3 hover:bg-slate-50 dark:hover:bg-steel-800/50 cursor-pointer transition-colors ${
          hasChildren ? '' : 'pl-8'
        }`}
        style={{ paddingLeft: `${depth * 20 + (hasChildren ? 12 : 28)}px` }}
        onClick={() => hasChildren && toggleExpanded(item.id)}
      >
        {hasChildren && (
          <button className="flex-shrink-0 mt-0.5 text-slate-400 hover:text-slate-600 dark:text-steel-500 dark:hover:text-steel-300">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}

        <StatusIcon status={status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${frameworkColor}15`,
                color: frameworkColor
              }}
            >
              {item.id}
            </span>
            <span className="text-sm text-slate-700 dark:text-steel-200">{item.title}</span>
            {item.required === false && (
              <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-steel-700 text-slate-500 dark:text-steel-400 rounded">
                Optional
              </span>
            )}
            {/* Evidence badge for leaf nodes */}
            {isLeafNode && requirementEvidence.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {requirementEvidence.length}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-slate-500 dark:text-steel-400 mt-1">{item.description}</p>
          )}

          {/* Show mapped controls */}
          {mappedControls.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {mappedControls.slice(0, 5).map(c => (
                <button
                  key={c.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onControlClick?.(c.id);
                  }}
                  className="text-xs px-1.5 py-0.5 bg-indigo-50 dark:bg-accent-500/10 text-indigo-600 dark:text-accent-400 rounded hover:bg-indigo-100 dark:hover:bg-accent-500/20 flex items-center gap-1"
                  title={c.title}
                >
                  <Shield className="w-3 h-3" />
                  {c.id}
                </button>
              ))}
              {mappedControls.length > 5 && (
                <span className="text-xs px-1.5 py-0.5 text-slate-500 dark:text-steel-400">
                  +{mappedControls.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Add Evidence button for leaf nodes */}
          {isLeafNode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEvidencePanelId(showEvidencePanel ? null : item.id);
              }}
              className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                showEvidencePanel
                  ? 'bg-indigo-100 dark:bg-accent-500/20 text-indigo-700 dark:text-accent-300'
                  : 'bg-slate-100 dark:bg-steel-700 text-slate-500 dark:text-steel-400 hover:bg-indigo-50 dark:hover:bg-accent-500/10 hover:text-indigo-600 dark:hover:text-accent-400'
              }`}
              title="Add evidence"
            >
              <Upload className="w-3 h-3" />
              Evidence
            </button>
          )}
          <div className="text-xs text-slate-400 dark:text-steel-500">
            {mappedControls.length > 0 ? (
              <span className={status === 'implemented' ? 'text-green-500' : status === 'partial' ? 'text-amber-500' : ''}>
                {mappedControls.filter(c => getControlAnswer(c.id) === 'yes').length}/{mappedControls.length}
              </span>
            ) : (
              <span className="text-slate-300 dark:text-steel-600">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Evidence Panel */}
      {showEvidencePanel && (
        <EvidencePanel
          requirementId={item.id}
          frameworkId={frameworkId}
          evidence={requirementEvidence}
          onAddEvidence={onAddEvidence}
          onRemoveEvidence={onRemoveEvidence}
          onClose={() => setEvidencePanelId(null)}
        />
      )}

      {/* Render children when expanded */}
      {hasChildren && isExpanded && (
        <div className="border-t border-slate-50 dark:border-steel-700/50">
          {item.children!.map(child => (
            <RequirementItemComponent
              key={child.id}
              item={child}
              depth={depth + 1}
              frameworkId={frameworkId}
              controls={controls}
              getControlAnswer={getControlAnswer}
              onControlClick={onControlClick}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              evidencePanelId={evidencePanelId}
              setEvidencePanelId={setEvidencePanelId}
              evidence={evidence}
              onAddEvidence={onAddEvidence}
              onRemoveEvidence={onRemoveEvidence}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Transform framework-specific data to generic RequirementItem structure
function getFrameworkRequirements(frameworkId: FrameworkId): { requirements: RequirementItem[]; totalCount: number } {
  switch (frameworkId) {
    case 'PCIDSS':
      return {
        requirements: PCI_DSS_V4_REQUIREMENTS.map(pr => ({
          id: pr.id,
          title: pr.name,
          children: pr.subRequirements.map(sr => ({
            id: sr.id,
            title: sr.name,
            children: sr.requirements.map(r => ({
              id: r.id,
              title: r.title,
              description: r.description,
            })),
          })),
        })),
        totalCount: countPCIDSSRequirements().total,
      };

    case 'SOC2':
      return {
        requirements: SOC2_TRUST_SERVICES_CRITERIA.map(tsc => ({
          id: tsc.id,
          title: tsc.name,
          required: tsc.required,
          children: tsc.categories.map(cat => ({
            id: cat.id,
            title: cat.name,
            description: cat.description,
            children: cat.criteria.map(c => ({
              id: c.id,
              title: c.title,
              description: c.description,
            })),
          })),
        })),
        totalCount: countSOC2Criteria().criteria,
      };

    case 'ISO27001':
      return {
        requirements: ISO27001_2022_CONTROLS.map(theme => ({
          id: theme.id,
          title: theme.name,
          children: theme.controls.map(c => ({
            id: c.id,
            title: c.title,
            description: c.description,
          })),
        })),
        totalCount: countISO27001Controls(),
      };

    case 'HIPAA':
      return {
        requirements: HIPAA_SECURITY_RULE.map(safeguard => ({
          id: safeguard.id,
          title: safeguard.name,
          description: `Section ${safeguard.section}`,
          children: safeguard.standards.map(std => ({
            id: std.id,
            title: std.name,
            children: std.specifications?.map(spec => ({
              id: spec.id,
              title: spec.title,
              required: spec.type === 'required',
            })) || [],
          })),
        })),
        totalCount: countHIPAASpecifications().total,
      };

    case 'NIST':
      return {
        requirements: NIST_CSF_2_0.map(fn => ({
          id: fn.id,
          title: fn.name,
          description: fn.description,
          children: fn.categories.map(cat => ({
            id: cat.id,
            title: cat.name,
            children: cat.subcategories.map(sub => ({
              id: sub.id,
              title: sub.title,
            })),
          })),
        })),
        totalCount: countNISTSubcategories(),
      };

    case 'GDPR':
      return {
        requirements: GDPR_REQUIREMENTS.map(chapter => ({
          id: `Chapter ${chapter.id}`,
          title: chapter.name,
          children: chapter.articles.map(art => ({
            id: art.id,
            title: art.name,
            children: art.provisions.map(p => ({
              id: p.id,
              title: p.title,
              description: p.description,
            })),
          })),
        })),
        totalCount: countGDPRProvisions(),
      };
  }
}

// Calculate overall progress for the framework
function calculateProgress(
  requirements: RequirementItem[],
  frameworkId: FrameworkId,
  controls: MasterControl[],
  getControlAnswer: (controlId: string) => ControlAnswer
): { implemented: number; partial: number; notStarted: number; unmapped: number; total: number } {
  let implemented = 0;
  let partial = 0;
  let notStarted = 0;
  let unmapped = 0;
  let total = 0;

  function countLeaves(items: RequirementItem[]) {
    for (const item of items) {
      if (!item.children || item.children.length === 0) {
        total++;
        const { status } = getRequirementStatus(item.id, frameworkId, controls, getControlAnswer);
        switch (status) {
          case 'implemented': implemented++; break;
          case 'partial': partial++; break;
          case 'not_started': notStarted++; break;
          case 'unmapped': unmapped++; break;
        }
      } else {
        countLeaves(item.children);
      }
    }
  }

  countLeaves(requirements);
  return { implemented, partial, notStarted, unmapped, total };
}

export const FrameworkRequirementsView: React.FC<FrameworkRequirementsViewProps> = ({
  frameworkId,
  controls,
  getControlAnswer,
  onControlClick,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const [evidencePanelId, setEvidencePanelId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Record<string, RequirementEvidence[]>>(() => {
    const all = loadEvidence();
    return all[frameworkId] || {};
  });

  const frameworkMeta = FRAMEWORKS.find(f => f.id === frameworkId);
  const frameworkColor = FRAMEWORK_COLORS[frameworkId];
  const { requirements, totalCount } = useMemo(() => getFrameworkRequirements(frameworkId), [frameworkId]);

  const progress = useMemo(
    () => calculateProgress(requirements, frameworkId, controls, getControlAnswer),
    [requirements, frameworkId, controls, getControlAnswer]
  );

  // Evidence handlers
  const handleAddEvidence = (newEvidence: Omit<RequirementEvidence, 'id' | 'createdAt'>) => {
    const evidenceItem: RequirementEvidence = {
      ...newEvidence,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    setEvidence(prev => {
      const reqEvidence = prev[newEvidence.requirementId] || [];
      const updated = {
        ...prev,
        [newEvidence.requirementId]: [...reqEvidence, evidenceItem],
      };

      // Save to localStorage
      const all = loadEvidence();
      all[frameworkId] = updated;
      saveEvidence(all);

      return updated;
    });
  };

  const handleRemoveEvidence = (evidenceId: string) => {
    setEvidence(prev => {
      const updated: Record<string, RequirementEvidence[]> = {};
      for (const [reqId, items] of Object.entries(prev)) {
        updated[reqId] = items.filter(e => e.id !== evidenceId);
      }

      // Save to localStorage
      const all = loadEvidence();
      all[frameworkId] = updated;
      saveEvidence(all);

      return updated;
    });
  };

  // Count total evidence items
  const totalEvidenceCount = useMemo(() => {
    return Object.values(evidence).reduce((sum, items) => sum + items.length, 0);
  }, [evidence]);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    if (expandAll) {
      setExpandedIds(new Set());
    } else {
      // Collect all IDs that have children
      const allIds = new Set<string>();
      function collectIds(items: RequirementItem[]) {
        for (const item of items) {
          if (item.children && item.children.length > 0) {
            allIds.add(item.id);
            collectIds(item.children);
          }
        }
      }
      collectIds(requirements);
      setExpandedIds(allIds);
    }
    setExpandAll(!expandAll);
  };

  const implementedPercent = progress.total > 0 ? Math.round((progress.implemented / progress.total) * 100) : 0;
  const partialPercent = progress.total > 0 ? Math.round((progress.partial / progress.total) * 100) : 0;

  return (
    <div className="bg-white dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700 overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-4 border-b border-slate-200 dark:border-steel-700"
        style={{ backgroundColor: `${frameworkColor}08` }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{frameworkMeta?.icon}</span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {frameworkMeta?.fullName}
              </h2>
              <p className="text-sm text-slate-500 dark:text-steel-400">
                {totalCount} requirements • Framework-centric view
                {totalEvidenceCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                    <FileText className="w-3 h-3" />
                    {totalEvidenceCount} evidence
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleExpandAll}
            className="text-sm px-3 py-1.5 bg-white dark:bg-steel-700 border border-slate-200 dark:border-steel-600 rounded-lg hover:bg-slate-50 dark:hover:bg-steel-600 text-slate-600 dark:text-steel-300"
          >
            {expandAll ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 bg-slate-100 dark:bg-steel-700 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${implementedPercent}%` }}
            />
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${partialPercent}%` }}
            />
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-slate-600 dark:text-steel-300">Implemented: {progress.implemented}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-slate-600 dark:text-steel-300">Partial: {progress.partial}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Circle className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-600 dark:text-steel-300">Not Started: {progress.notStarted}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Circle className="w-3.5 h-3.5 text-slate-300 dark:text-steel-600" />
              <span className="text-slate-500 dark:text-steel-400">Unmapped: {progress.unmapped}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Requirements list */}
      <div className="max-h-[600px] overflow-y-auto">
        {requirements.map(item => (
          <RequirementItemComponent
            key={item.id}
            item={item}
            depth={0}
            frameworkId={frameworkId}
            controls={controls}
            getControlAnswer={getControlAnswer}
            onControlClick={onControlClick}
            expandedIds={expandedIds}
            toggleExpanded={toggleExpanded}
            evidencePanelId={evidencePanelId}
            setEvidencePanelId={setEvidencePanelId}
            evidence={evidence}
            onAddEvidence={handleAddEvidence}
            onRemoveEvidence={handleRemoveEvidence}
          />
        ))}
      </div>
    </div>
  );
};

export default FrameworkRequirementsView;
