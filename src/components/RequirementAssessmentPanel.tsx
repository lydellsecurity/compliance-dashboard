/**
 * Requirement Assessment Panel
 *
 * Detailed panel for assessing a single framework requirement.
 * Shows mapped controls, assessment questions, evidence requirements,
 * and handles framework-specific nuances like HIPAA addressable specs.
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  XCircle,
  Shield,
  FileText,
  Upload,
  Trash2,
  Plus,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Minus,
} from 'lucide-react';
import type { MasterControl } from '../constants/controls';
import type {
  RequirementDetail,
  RequirementAssessment,
  RequirementComplianceStatus,
  ComplianceMethod,
  DirectAssessment,
  DirectAssessmentQuestion,
  RequirementEvidence,
  AddressableDecision,
  ControlMappingAssessment,
} from '../types/requirement-assessment.types';

// ============================================
// TYPES
// ============================================

interface RequirementAssessmentPanelProps {
  requirement: RequirementDetail;
  assessment: RequirementAssessment | null;
  controls: MasterControl[];
  getControlAnswer: (controlId: string) => 'yes' | 'no' | 'partial' | 'na' | null;
  onControlClick?: (controlId: string) => void;
  onUpdateStatus: (
    requirementId: string,
    status: RequirementComplianceStatus,
    method: ComplianceMethod
  ) => void;
  onSaveDirectAssessment: (requirementId: string, assessment: DirectAssessment) => void;
  onAddEvidence: (
    requirementId: string,
    evidence: Omit<RequirementEvidence, 'id' | 'requirementAssessmentId'>
  ) => void;
  onRemoveEvidence: (requirementId: string, evidenceId: string) => void;
  onSaveAddressableDecision: (requirementId: string, decision: AddressableDecision) => void;
  onAddNote: (requirementId: string, note: string) => void;
}

// ============================================
// STATUS HELPERS
// ============================================

const STATUS_CONFIG = {
  compliant: { label: 'Compliant', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', icon: CheckCircle2 },
  partially_compliant: { label: 'Partially Compliant', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', icon: AlertCircle },
  non_compliant: { label: 'Non-Compliant', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: XCircle },
  not_applicable: { label: 'Not Applicable', color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-steel-800', border: 'border-slate-200 dark:border-steel-700', icon: Minus },
  not_assessed: { label: 'Not Assessed', color: 'text-slate-400', bg: 'bg-white dark:bg-steel-800', border: 'border-slate-200 dark:border-steel-700', icon: Circle },
};

// ============================================
// CONTROL MAPPING DISPLAY
// ============================================

const ControlMappingCard: React.FC<{
  mapping: ControlMappingAssessment;
  control: MasterControl | undefined;
  onClick?: () => void;
}> = ({ mapping, control, onClick }) => {
  const coverageColor = mapping.coveragePercentage >= 70
    ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
    : mapping.coveragePercentage >= 40
      ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
      : 'text-slate-500 bg-slate-50 dark:bg-steel-800';

  const answerIcon = {
    yes: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    no: <XCircle className="w-4 h-4 text-red-500" />,
    partial: <AlertCircle className="w-4 h-4 text-amber-500" />,
    na: <Minus className="w-4 h-4 text-slate-400" />,
    null: <Circle className="w-4 h-4 text-slate-300 dark:text-steel-600" />,
  };

  return (
    <div
      className={`p-3 rounded-lg border border-slate-200 dark:border-steel-700 ${onClick ? 'cursor-pointer hover:border-indigo-300 dark:hover:border-accent-500/50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {answerIcon[mapping.controlAnswer || 'null']}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-indigo-600 dark:text-accent-400">
              {mapping.controlId}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${coverageColor}`}>
              {mapping.mappingType === 'direct' ? 'Direct' : mapping.mappingType === 'partial' ? 'Partial' : 'Supportive'}
            </span>
          </div>
          <p className="text-sm text-slate-700 dark:text-steel-300 mt-1">
            {control?.title || 'Unknown Control'}
          </p>
          {mapping.gapDescription && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-start gap-1">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {mapping.gapDescription}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <div className="text-right">
            <div className="text-sm font-medium text-slate-700 dark:text-steel-300">
              {mapping.coveragePercentage}%
            </div>
            <div className="text-xs text-slate-500 dark:text-steel-500">coverage</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// DIRECT ASSESSMENT QUESTIONS
// ============================================

const DirectAssessmentSection: React.FC<{
  questions: string[];
  existingAssessment?: DirectAssessment;
  onSave: (assessment: DirectAssessment) => void;
}> = ({ questions, existingAssessment, onSave }) => {
  const [answers, setAnswers] = useState<Record<string, 'yes' | 'no' | 'partial' | 'na' | null>>(
    () => {
      const initial: Record<string, 'yes' | 'no' | 'partial' | 'na' | null> = {};
      if (existingAssessment) {
        for (const q of existingAssessment.questions) {
          initial[q.id] = q.answer;
        }
      }
      return initial;
    }
  );
  const [justification, setJustification] = useState(existingAssessment?.justification || '');

  const handleSave = () => {
    const assessmentQuestions: DirectAssessmentQuestion[] = questions.map((q, i) => ({
      id: `q_${i}`,
      question: q,
      answer: answers[`q_${i}`] || null,
    }));

    const yesCount = Object.values(answers).filter(a => a === 'yes').length;
    const noCount = Object.values(answers).filter(a => a === 'no').length;
    const totalAnswered = Object.values(answers).filter(a => a !== null).length;

    let overallAnswer: 'yes' | 'no' | 'partial' | 'na' = 'partial';
    if (totalAnswered > 0) {
      if (noCount === 0 && yesCount === totalAnswered) {
        overallAnswer = 'yes';
      } else if (noCount === totalAnswered) {
        overallAnswer = 'no';
      }
    }

    onSave({
      questions: assessmentQuestions,
      overallAnswer,
      justification,
      assessedAt: new Date().toISOString(),
      assessedBy: 'current_user',
    });
  };

  const answerOptions: Array<{ value: 'yes' | 'no' | 'partial' | 'na'; label: string; color: string }> = [
    { value: 'yes', label: 'Yes', color: 'text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20' },
    { value: 'partial', label: 'Partial', color: 'text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20' },
    { value: 'no', label: 'No', color: 'text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20' },
    { value: 'na', label: 'N/A', color: 'text-slate-500 border-slate-300 bg-slate-50 dark:bg-steel-800' },
  ];

  return (
    <div className="space-y-4">
      {questions.map((question, idx) => {
        const qId = `q_${idx}`;
        const currentAnswer = answers[qId];

        return (
          <div key={qId} className="p-4 bg-slate-50 dark:bg-steel-800/50 rounded-lg">
            <p className="text-sm font-medium text-slate-700 dark:text-steel-300 mb-3">
              {idx + 1}. {question}
            </p>
            <div className="flex gap-2">
              {answerOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAnswers(prev => ({ ...prev, [qId]: opt.value }))}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                    currentAnswer === opt.value
                      ? opt.color + ' border-2'
                      : 'text-slate-500 dark:text-steel-400 border-slate-200 dark:border-steel-700 hover:border-slate-300 dark:hover:border-steel-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
          Justification / Notes
        </label>
        <textarea
          value={justification}
          onChange={e => setJustification(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100 placeholder-slate-400 dark:placeholder-steel-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-accent-500 focus:border-transparent"
          placeholder="Provide any additional context or justification..."
        />
      </div>

      <button
        onClick={handleSave}
        className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
      >
        Save Assessment
      </button>
    </div>
  );
};

// ============================================
// HIPAA ADDRESSABLE HANDLER
// ============================================

const AddressableSpecificationHandler: React.FC<{
  requirementId: string;
  existingDecision?: AddressableDecision;
  onSave: (decision: AddressableDecision) => void;
}> = ({ existingDecision, onSave }) => {
  const [decision, setDecision] = useState<AddressableDecision['decision']>(
    existingDecision?.decision || 'implemented'
  );
  const [implementationDesc, setImplementationDesc] = useState(
    existingDecision?.implementationDescription || ''
  );
  const [alternativeDesc, setAlternativeDesc] = useState(
    existingDecision?.alternativeDescription || ''
  );
  const [reasonNotImpl, setReasonNotImpl] = useState(
    existingDecision?.reasonNotImplemented || ''
  );
  const [riskAnalysisRef, setRiskAnalysisRef] = useState(
    existingDecision?.riskAnalysisReference || ''
  );

  const handleSave = () => {
    onSave({
      specificationType: 'addressable',
      decision,
      implementationDescription: decision === 'implemented' ? implementationDesc : undefined,
      alternativeDescription: decision === 'alternative_implemented' ? alternativeDesc : undefined,
      reasonNotImplemented: decision === 'not_reasonable' ? reasonNotImpl : undefined,
      riskAnalysisReference: riskAnalysisRef,
      documentedAt: new Date().toISOString(),
      documentedBy: 'current_user',
    });
  };

  return (
    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <h4 className="font-semibold text-purple-900 dark:text-purple-300">
          HIPAA Addressable Specification
        </h4>
      </div>

      <p className="text-sm text-purple-700 dark:text-purple-400 mb-4">
        This is an addressable specification. You must implement it, implement an alternative measure,
        or document why implementation is not reasonable or appropriate (with risk acceptance).
      </p>

      <div className="space-y-3 mb-4">
        <label className="flex items-start gap-3 p-3 bg-white dark:bg-steel-800 rounded-lg border border-purple-200 dark:border-purple-800 cursor-pointer">
          <input
            type="radio"
            name="addressable_decision"
            checked={decision === 'implemented'}
            onChange={() => setDecision('implemented')}
            className="mt-1"
          />
          <div>
            <span className="font-medium text-slate-900 dark:text-steel-100">
              Implemented as Specified
            </span>
            <p className="text-sm text-slate-500 dark:text-steel-400">
              The specification is implemented as written
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 bg-white dark:bg-steel-800 rounded-lg border border-purple-200 dark:border-purple-800 cursor-pointer">
          <input
            type="radio"
            name="addressable_decision"
            checked={decision === 'alternative_implemented'}
            onChange={() => setDecision('alternative_implemented')}
            className="mt-1"
          />
          <div>
            <span className="font-medium text-slate-900 dark:text-steel-100">
              Alternative Measure Implemented
            </span>
            <p className="text-sm text-slate-500 dark:text-steel-400">
              An equivalent alternative measure is in place
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 bg-white dark:bg-steel-800 rounded-lg border border-purple-200 dark:border-purple-800 cursor-pointer">
          <input
            type="radio"
            name="addressable_decision"
            checked={decision === 'not_reasonable'}
            onChange={() => setDecision('not_reasonable')}
            className="mt-1"
          />
          <div>
            <span className="font-medium text-slate-900 dark:text-steel-100">
              Not Reasonable/Appropriate
            </span>
            <p className="text-sm text-slate-500 dark:text-steel-400">
              Implementation is not reasonable; risk is documented and accepted
            </p>
          </div>
        </label>
      </div>

      {decision === 'implemented' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
            Implementation Description
          </label>
          <textarea
            value={implementationDesc}
            onChange={e => setImplementationDesc(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
            placeholder="Describe how this specification is implemented..."
          />
        </div>
      )}

      {decision === 'alternative_implemented' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
            Alternative Measure Description
          </label>
          <textarea
            value={alternativeDesc}
            onChange={e => setAlternativeDesc(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
            placeholder="Describe the alternative measure and how it achieves the same objective..."
          />
        </div>
      )}

      {decision === 'not_reasonable' && (
        <div className="mb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
              Reason Not Implemented <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reasonNotImpl}
              onChange={e => setReasonNotImpl(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
              placeholder="Explain why implementation is not reasonable or appropriate..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
              Risk Analysis Reference
            </label>
            <input
              type="text"
              value={riskAnalysisRef}
              onChange={e => setRiskAnalysisRef(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
              placeholder="Reference to supporting risk analysis documentation..."
            />
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={decision === 'not_reasonable' && !reasonNotImpl}
        className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save Decision
      </button>
    </div>
  );
};

// ============================================
// FILE UPLOAD HELPERS
// ============================================

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string): React.ReactNode => {
  if (type.startsWith('image/')) {
    return <FileText className="w-5 h-5 text-purple-500" />;
  } else if (type === 'application/pdf') {
    return <FileText className="w-5 h-5 text-red-500" />;
  } else if (type.includes('spreadsheet') || type.includes('excel') || type.endsWith('.csv')) {
    return <FileText className="w-5 h-5 text-green-500" />;
  } else if (type.includes('document') || type.includes('word')) {
    return <FileText className="w-5 h-5 text-blue-500" />;
  }
  return <FileText className="w-5 h-5 text-slate-400 dark:text-steel-500" />;
};

// ============================================
// EVIDENCE SECTION
// ============================================

const EvidenceSection: React.FC<{
  evidenceTypes: string[];
  existingEvidence: RequirementEvidence[];
  onAdd: (evidence: Omit<RequirementEvidence, 'id' | 'requirementAssessmentId'>) => void;
  onRemove: (evidenceId: string) => void;
}> = ({ evidenceTypes, existingEvidence, onAdd, onRemove }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvidence, setNewEvidence] = useState({
    evidenceType: '',
    name: '',
    description: '',
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max
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

  const processFiles = async (files: FileList | File[]) => {
    setUploadError(null);
    const fileArray = Array.from(files);
    const newFiles: UploadedFile[] = [];

    for (const file of fileArray) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`File "${file.name}" exceeds 10MB limit`);
        continue;
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.csv')) {
        setUploadError(`File type "${file.type || 'unknown'}" is not supported`);
        continue;
      }

      // Read file as data URL
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
      // Auto-fill name from first file if empty
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

  const handleAdd = () => {
    if (!newEvidence.name || !newEvidence.evidenceType) return;

    onAdd({
      evidenceType: newEvidence.evidenceType,
      name: newEvidence.name,
      description: newEvidence.description,
      fileUrls: uploadedFiles.map(f => f.dataUrl),
      verificationMethod: 'documentation',
      verifiedAt: null,
      verifiedBy: null,
      status: 'pending',
    });

    setNewEvidence({ evidenceType: '', name: '', description: '' });
    setUploadedFiles([]);
    setShowAddForm(false);
  };

  const handleCancel = () => {
    setNewEvidence({ evidenceType: '', name: '', description: '' });
    setUploadedFiles([]);
    setUploadError(null);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-slate-900 dark:text-steel-100">
          Evidence
        </h4>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 text-sm text-indigo-600 dark:text-accent-400 hover:text-indigo-700 dark:hover:text-accent-300"
        >
          <Plus className="w-4 h-4" />
          Add Evidence
        </button>
      </div>

      {/* Required Evidence Types */}
      <div className="p-3 bg-slate-50 dark:bg-steel-800/50 rounded-lg">
        <p className="text-xs font-medium text-slate-500 dark:text-steel-400 uppercase tracking-wider mb-2">
          Required Evidence Types
        </p>
        <div className="flex flex-wrap gap-2">
          {evidenceTypes.map((type, idx) => (
            <span
              key={idx}
              className="px-2 py-1 text-xs bg-white dark:bg-steel-700 border border-slate-200 dark:border-steel-600 rounded-md text-slate-600 dark:text-steel-300"
            >
              {type}
            </span>
          ))}
        </div>
      </div>

      {/* Add Evidence Form */}
      {showAddForm && (
        <div className="p-4 bg-indigo-50 dark:bg-accent-500/10 rounded-lg border border-indigo-200 dark:border-accent-500/30 space-y-3">
          <select
            value={newEvidence.evidenceType}
            onChange={e => setNewEvidence(prev => ({ ...prev, evidenceType: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
          >
            <option value="">Select evidence type...</option>
            {evidenceTypes.map((type, idx) => (
              <option key={idx} value={type}>{type}</option>
            ))}
            <option value="Other">Other</option>
          </select>

          <input
            type="text"
            value={newEvidence.name}
            onChange={e => setNewEvidence(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
            placeholder="Evidence name..."
          />

          <textarea
            value={newEvidence.description}
            onChange={e => setNewEvidence(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
            placeholder="Description..."
          />

          {/* File Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
              isDragging
                ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/30'
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
              <Upload className={`w-8 h-8 mx-auto mb-2 ${
                isDragging ? 'text-indigo-500' : 'text-slate-400 dark:text-steel-500'
              }`} />
              <p className="text-sm font-medium text-slate-700 dark:text-steel-300">
                {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
              </p>
              <p className="text-xs text-slate-500 dark:text-steel-400 mt-1">
                PDF, Word, Excel, CSV, images up to 10MB
              </p>
            </div>
          </div>

          {/* Upload Error */}
          {uploadError && (
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {uploadError}
            </div>
          )}

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-steel-400 uppercase tracking-wider">
                Attached Files ({uploadedFiles.length})
              </p>
              {uploadedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 bg-white dark:bg-steel-800 rounded-lg border border-slate-200 dark:border-steel-700"
                >
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-steel-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-steel-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeUploadedFile(idx)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newEvidence.name || !newEvidence.evidenceType}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Evidence{uploadedFiles.length > 0 ? ` with ${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''}` : ''}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-slate-600 dark:text-steel-400 hover:text-slate-800 dark:hover:text-steel-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing Evidence */}
      {existingEvidence.length > 0 && (
        <div className="space-y-2">
          {existingEvidence.map(evidence => (
            <div
              key={evidence.id}
              className="p-3 bg-white dark:bg-steel-800 rounded-lg border border-slate-200 dark:border-steel-700"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-400 dark:text-steel-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-steel-100 truncate">
                    {evidence.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-steel-400">
                    {evidence.evidenceType} • {evidence.status}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(evidence.id)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {/* Show attached files */}
              {evidence.fileUrls && evidence.fileUrls.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-steel-700">
                  <p className="text-xs text-slate-500 dark:text-steel-400 mb-1">
                    {evidence.fileUrls.length} file{evidence.fileUrls.length > 1 ? 's' : ''} attached
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {evidence.fileUrls.map((url, idx) => {
                      // Extract filename from data URL or use generic name
                      const isImage = url.startsWith('data:image/');
                      return (
                        <a
                          key={idx}
                          href={url}
                          download={`evidence-${idx + 1}`}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 dark:bg-steel-700 rounded text-indigo-600 dark:text-accent-400 hover:bg-slate-200 dark:hover:bg-steel-600"
                        >
                          {isImage ? (
                            <img src={url} alt="" className="w-4 h-4 object-cover rounded" />
                          ) : (
                            <FileText className="w-3 h-3" />
                          )}
                          File {idx + 1}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {existingEvidence.length === 0 && !showAddForm && (
        <p className="text-sm text-slate-500 dark:text-steel-400 text-center py-4">
          No evidence attached yet
        </p>
      )}
    </div>
  );
};

// ============================================
// MAIN PANEL COMPONENT
// ============================================

export const RequirementAssessmentPanel: React.FC<RequirementAssessmentPanelProps> = ({
  requirement,
  assessment,
  controls,
  onControlClick,
  onUpdateStatus,
  onSaveDirectAssessment,
  onAddEvidence,
  onRemoveEvidence,
  onSaveAddressableDecision,
  onAddNote,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['controls', 'assessment'])
  );
  const [noteText, setNoteText] = useState('');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const currentStatus = assessment?.status || 'not_assessed';
  const statusConfig = STATUS_CONFIG[currentStatus];
  const StatusIcon = statusConfig.icon;

  // Determine if this is a HIPAA addressable specification
  const isAddressable = requirement.hipaaSpecificationType === 'addressable';

  // Calculate total control coverage
  const totalCoverage = requirement.mappedControls.length > 0
    ? Math.round(
        requirement.mappedControls.reduce((sum, m) => sum + m.coveragePercentage, 0) /
        requirement.mappedControls.length
      )
    : 0;

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    onAddNote(requirement.id, noteText);
    setNoteText('');
  };

  return (
    <div className="space-y-6">
      {/* Requirement Header */}
      <div className="bg-white dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg ${statusConfig.bg} ${statusConfig.border} border`}>
            <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-lg font-semibold text-indigo-600 dark:text-accent-400">
                {requirement.id}
              </span>
              {!requirement.isRequired && (
                <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-steel-700 text-slate-600 dark:text-steel-400 rounded">
                  Optional
                </span>
              )}
              {isAddressable && (
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                  Addressable
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-steel-100 mb-2">
              {requirement.title}
            </h2>
            {requirement.description && (
              <p className="text-slate-600 dark:text-steel-400">
                {requirement.description}
              </p>
            )}
          </div>
        </div>

        {/* Quick Status Selector */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-steel-700">
          <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-3">
            Compliance Status
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const Icon = config.icon;
              const isActive = currentStatus === status;

              return (
                <button
                  key={status}
                  onClick={() =>
                    onUpdateStatus(
                      requirement.id,
                      status as RequirementComplianceStatus,
                      assessment?.complianceMethod || 'direct_assessment'
                    )
                  }
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    isActive
                      ? `${config.bg} ${config.border} border-2`
                      : 'bg-white dark:bg-steel-800 border-slate-200 dark:border-steel-700 hover:border-slate-300 dark:hover:border-steel-600'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className={`text-sm font-medium ${isActive ? config.color : 'text-slate-600 dark:text-steel-400'}`}>
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mapped Controls Section */}
      <div className="bg-white dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700 overflow-hidden">
        <button
          onClick={() => toggleSection('controls')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-steel-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-accent-400" />
            <span className="font-semibold text-slate-900 dark:text-steel-100">
              Mapped Controls
            </span>
            <span className="text-sm text-slate-500 dark:text-steel-400">
              ({requirement.mappedControls.length})
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${
              totalCoverage >= 70 ? 'text-green-600' : totalCoverage >= 40 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {totalCoverage}% coverage
            </span>
            {expandedSections.has('controls') ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </button>

        {expandedSections.has('controls') && (
          <div className="p-4 pt-0 space-y-3">
            {requirement.mappedControls.length > 0 ? (
              requirement.mappedControls.map(mapping => {
                const control = controls.find(c => c.id === mapping.controlId);
                return (
                  <ControlMappingCard
                    key={mapping.controlId}
                    mapping={mapping}
                    control={control}
                    onClick={() => onControlClick?.(mapping.controlId)}
                  />
                );
              })
            ) : (
              <div className="text-center py-6 text-slate-500 dark:text-steel-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                <p className="font-medium">No controls mapped to this requirement</p>
                <p className="text-sm mt-1">
                  Direct assessment is required to verify compliance
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* HIPAA Addressable Section */}
      {isAddressable && (
        <AddressableSpecificationHandler
          requirementId={requirement.id}
          existingDecision={assessment?.addressableDecision}
          onSave={(decision) => onSaveAddressableDecision(requirement.id, decision)}
        />
      )}

      {/* Direct Assessment Section */}
      {!isAddressable && (
        <div className="bg-white dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700 overflow-hidden">
          <button
            onClick={() => toggleSection('assessment')}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-steel-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-accent-400" />
              <span className="font-semibold text-slate-900 dark:text-steel-100">
                Direct Assessment
              </span>
            </div>
            {expandedSections.has('assessment') ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.has('assessment') && (
            <div className="p-4 pt-0">
              <DirectAssessmentSection
                questions={requirement.assessmentQuestions}
                existingAssessment={assessment?.directAssessment}
                onSave={(da) => onSaveDirectAssessment(requirement.id, da)}
              />
            </div>
          )}
        </div>
      )}

      {/* Evidence Section */}
      <div className="bg-white dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700 overflow-hidden">
        <button
          onClick={() => toggleSection('evidence')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-steel-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-indigo-600 dark:text-accent-400" />
            <span className="font-semibold text-slate-900 dark:text-steel-100">
              Evidence
            </span>
            <span className="text-sm text-slate-500 dark:text-steel-400">
              ({assessment?.evidenceRefs?.length || 0})
            </span>
          </div>
          {expandedSections.has('evidence') ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {expandedSections.has('evidence') && (
          <div className="p-4 pt-0">
            <EvidenceSection
              evidenceTypes={requirement.requiredEvidenceTypes}
              existingEvidence={assessment?.evidenceRefs || []}
              onAdd={(evidence) => onAddEvidence(requirement.id, evidence)}
              onRemove={(evidenceId) => onRemoveEvidence(requirement.id, evidenceId)}
            />
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="bg-white dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700 overflow-hidden">
        <button
          onClick={() => toggleSection('notes')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-steel-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-accent-400" />
            <span className="font-semibold text-slate-900 dark:text-steel-100">
              Notes
            </span>
          </div>
          {expandedSections.has('notes') ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {expandedSections.has('notes') && (
          <div className="p-4 pt-0 space-y-4">
            {assessment?.notes && (
              <div className="p-3 bg-slate-50 dark:bg-steel-800/50 rounded-lg">
                <pre className="text-sm text-slate-700 dark:text-steel-300 whitespace-pre-wrap font-sans">
                  {assessment.notes}
                </pre>
              </div>
            )}

            <div className="flex gap-2">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={2}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
                placeholder="Add a note..."
              />
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim()}
                className="px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Auditor Guidance */}
      {requirement.auditorTestingGuidance && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
                Auditor Testing Guidance
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                {requirement.auditorTestingGuidance}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementAssessmentPanel;
