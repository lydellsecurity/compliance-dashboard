/**
 * Evidence Panel
 *
 * Allows users to attach evidence to an incident:
 * - Screenshots
 * - Log files
 * - Chat transcripts
 * - Documents
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Paperclip,
  Upload,
  Image,
  FileText,
  File,
  MessageSquare,
  Trash2,
  Download,
  Eye,
  User,
  Clock,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface EvidencePanelProps {
  incidentId: string;
  onClose: () => void;
}

interface EvidenceItem {
  id: string;
  type: 'screenshot' | 'log' | 'transcript' | 'document' | 'other';
  name: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  description: string;
  url?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EVIDENCE_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  screenshot: {
    icon: <Image className="w-5 h-5" />,
    color: '#0066FF',
    bgColor: '#EFF6FF',
    label: 'Screenshot',
  },
  log: {
    icon: <FileText className="w-5 h-5" />,
    color: '#059669',
    bgColor: '#ECFDF5',
    label: 'Log File',
  },
  transcript: {
    icon: <MessageSquare className="w-5 h-5" />,
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    label: 'Chat Transcript',
  },
  document: {
    icon: <File className="w-5 h-5" />,
    color: '#EA580C',
    bgColor: '#FFEDD5',
    label: 'Document',
  },
  other: {
    icon: <Paperclip className="w-5 h-5" />,
    color: '#64748B',
    bgColor: '#F1F5F9',
    label: 'Other',
  },
};

// Mock evidence data
const MOCK_EVIDENCE: EvidenceItem[] = [
  {
    id: 'ev-1',
    type: 'screenshot',
    name: 'ransom_note_screenshot.png',
    size: 245000,
    uploadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    uploadedBy: 'John Smith',
    description: 'Screenshot of ransom message displayed on infected system',
  },
  {
    id: 'ev-2',
    type: 'log',
    name: 'firewall_logs_2026-01-18.log',
    size: 1240000,
    uploadedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    uploadedBy: 'Jane Doe',
    description: 'Firewall logs showing suspicious outbound connections',
  },
  {
    id: 'ev-3',
    type: 'transcript',
    name: 'slack_security_channel.txt',
    size: 45000,
    uploadedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    uploadedBy: 'Mike Johnson',
    description: 'Export of Slack conversation from #security-incident channel',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EvidencePanel: React.FC<EvidencePanelProps> = ({
  incidentId: _incidentId,
  onClose,
}) => {
  const [evidence, setEvidence] = useState<EvidenceItem[]>(MOCK_EVIDENCE);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newEvidence, setNewEvidence] = useState({
    type: 'other' as EvidenceItem['type'],
    description: '',
    file: null as File | null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      setNewEvidence(prev => ({ ...prev, file }));
      setShowUploadForm(true);
    }
  }, []);

  // Handle file select
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewEvidence(prev => ({ ...prev, file }));
      setShowUploadForm(true);
    }
  }, []);

  // Handle upload
  const handleUpload = useCallback(() => {
    if (!newEvidence.file) return;

    setIsUploading(true);

    // Simulate upload
    setTimeout(() => {
      const newItem: EvidenceItem = {
        id: `ev-${Date.now()}`,
        type: newEvidence.type,
        name: newEvidence.file!.name,
        size: newEvidence.file!.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'Current User',
        description: newEvidence.description,
      };

      setEvidence(prev => [newItem, ...prev]);
      setNewEvidence({ type: 'other', description: '', file: null });
      setShowUploadForm(false);
      setIsUploading(false);
    }, 1500);
  }, [newEvidence]);

  // Delete evidence
  const handleDelete = useCallback((id: string) => {
    setEvidence(prev => prev.filter(e => e.id !== id));
  }, []);

  // Filter evidence
  const filteredEvidence = selectedType === 'all'
    ? evidence
    : evidence.filter(e => e.type === selectedType);

  return (
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
        className="bg-white dark:bg-midnight-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-steel-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Paperclip className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-steel-100">Evidence & Attachments</h2>
              <p className="text-sm text-slate-500 dark:text-steel-400">{evidence.length} files attached</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 dark:text-steel-500 hover:text-slate-600 dark:hover:text-steel-200 hover:bg-slate-100 dark:hover:bg-steel-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Area */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`mx-6 mt-4 p-6 border-2 border-dashed rounded-xl text-center transition-colors ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-slate-200 dark:border-steel-600 hover:border-slate-300 dark:hover:border-steel-500'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragOver ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-steel-500'}`} />
          <p className="text-slate-600 dark:text-steel-300 mb-1">
            Drag and drop files here, or{' '}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              browse
            </button>
          </p>
          <p className="text-sm text-slate-400 dark:text-steel-500">
            Screenshots, logs, transcripts, or any relevant documents
          </p>
        </div>

        {/* Upload Form */}
        <AnimatePresence>
          {showUploadForm && newEvidence.file && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-6 mt-4 p-4 bg-slate-50 dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white dark:bg-steel-700 rounded-lg border border-slate-200 dark:border-steel-600">
                  <File className="w-5 h-5 text-slate-500 dark:text-steel-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-steel-100 truncate">{newEvidence.file.name}</p>
                  <p className="text-sm text-slate-500 dark:text-steel-400">{formatSize(newEvidence.file.size)}</p>
                </div>
                <button
                  onClick={() => {
                    setNewEvidence({ type: 'other', description: '', file: null });
                    setShowUploadForm(false);
                  }}
                  className="p-2 text-slate-400 dark:text-steel-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-200 mb-1">
                    Evidence Type
                  </label>
                  <select
                    value={newEvidence.type}
                    onChange={e => setNewEvidence(prev => ({ ...prev, type: e.target.value as EvidenceItem['type'] }))}
                    className="w-full px-3 py-2 bg-white dark:bg-midnight-900 border border-slate-200 dark:border-steel-600 rounded-lg text-sm text-slate-900 dark:text-steel-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="screenshot">Screenshot</option>
                    <option value="log">Log File</option>
                    <option value="transcript">Chat Transcript</option>
                    <option value="document">Document</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-steel-200 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newEvidence.description}
                    onChange={e => setNewEvidence(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description..."
                    className="w-full px-3 py-2 bg-white dark:bg-midnight-900 border border-slate-200 dark:border-steel-600 rounded-lg text-sm text-slate-900 dark:text-steel-100 placeholder-slate-400 dark:placeholder-steel-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Evidence
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Tabs */}
        <div className="px-6 mt-4 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              selectedType === 'all'
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                : 'text-slate-500 dark:text-steel-400 hover:bg-slate-100 dark:hover:bg-steel-700'
            }`}
          >
            All ({evidence.length})
          </button>
          {Object.entries(EVIDENCE_TYPE_CONFIG).map(([type, config]) => {
            const count = evidence.filter(e => e.type === type).length;
            if (count === 0) return null;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  selectedType === type
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-steel-400 hover:bg-slate-100 dark:hover:bg-steel-700'
                }`}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Evidence List */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {filteredEvidence.length === 0 ? (
            <div className="text-center py-12">
              <Paperclip className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-steel-600" />
              <p className="text-slate-500 dark:text-steel-400">No evidence attached yet</p>
              <p className="text-sm text-slate-400 dark:text-steel-500 mt-1">
                Upload screenshots, logs, or documents to document the incident
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvidence.map(item => {
                const config = EVIDENCE_TYPE_CONFIG[item.type];
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-midnight-800 rounded-xl border border-slate-200 dark:border-steel-700 hover:bg-slate-100 dark:hover:bg-steel-800 transition-colors"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: config.bgColor, color: config.color }}
                    >
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-slate-900 dark:text-steel-100 truncate">{item.name}</p>
                        <span
                          className="px-2 py-0.5 text-xs font-medium rounded"
                          style={{ backgroundColor: config.bgColor, color: config.color }}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-steel-400 mb-2">{item.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-steel-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {item.uploadedBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTimeAgo(item.uploadedAt)}
                        </span>
                        <span>{formatSize(item.size)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-2 text-slate-400 dark:text-steel-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-slate-400 dark:text-steel-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-slate-400 dark:text-steel-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-steel-700 bg-slate-50 dark:bg-midnight-800">
          <p className="text-sm text-slate-500 dark:text-steel-400">
            {evidence.reduce((acc, e) => acc + e.size, 0) > 1024 * 1024
              ? `${(evidence.reduce((acc, e) => acc + e.size, 0) / (1024 * 1024)).toFixed(1)} MB total`
              : `${(evidence.reduce((acc, e) => acc + e.size, 0) / 1024).toFixed(1)} KB total`}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-steel-700 text-slate-700 dark:text-steel-200 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-steel-600 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EvidencePanel;
