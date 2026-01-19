/**
 * Security Artifacts Component
 *
 * Repository for vendor security documentation:
 * - SOC 2 Reports
 * - ISO 27001 Certificates
 * - Privacy Policies
 * - Penetration Test Reports
 * - Business Continuity Plans
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Shield,
  Award,
  Lock,
  Upload,
  Download,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Eye,
  Plus,
  Filter,
  Search,
} from 'lucide-react';

interface SecurityArtifact {
  id: string;
  vendorId: string;
  vendorName: string;
  type: ArtifactType;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  expiresAt?: string;
  status: 'valid' | 'expiring_soon' | 'expired';
}

type ArtifactType = 'soc2' | 'iso27001' | 'privacy_policy' | 'pentest' | 'bcp' | 'other';

const ARTIFACT_CONFIG: Record<ArtifactType, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  soc2: {
    label: 'SOC 2 Report',
    icon: <Shield className="w-5 h-5" />,
    color: '#0066FF',
    bgColor: '#EFF6FF',
  },
  iso27001: {
    label: 'ISO 27001',
    icon: <Award className="w-5 h-5" />,
    color: '#059669',
    bgColor: '#ECFDF5',
  },
  privacy_policy: {
    label: 'Privacy Policy',
    icon: <Lock className="w-5 h-5" />,
    color: '#7C3AED',
    bgColor: '#F5F3FF',
  },
  pentest: {
    label: 'Penetration Test',
    icon: <Shield className="w-5 h-5" />,
    color: '#DC2626',
    bgColor: '#FEF2F2',
  },
  bcp: {
    label: 'Business Continuity',
    icon: <FileText className="w-5 h-5" />,
    color: '#D97706',
    bgColor: '#FFFBEB',
  },
  other: {
    label: 'Other Document',
    icon: <FileText className="w-5 h-5" />,
    color: '#64748B',
    bgColor: '#F8FAFC',
  },
};

// Mock data
const MOCK_ARTIFACTS: SecurityArtifact[] = [
  {
    id: '1',
    vendorId: 'v1',
    vendorName: 'AWS',
    type: 'soc2',
    fileName: 'AWS_SOC2_Type2_2024.pdf',
    fileSize: 2400000,
    uploadedAt: '2024-01-15T10:00:00Z',
    uploadedBy: 'John Doe',
    expiresAt: '2025-01-15T10:00:00Z',
    status: 'valid',
  },
  {
    id: '2',
    vendorId: 'v2',
    vendorName: 'Salesforce',
    type: 'iso27001',
    fileName: 'Salesforce_ISO27001_Certificate.pdf',
    fileSize: 1200000,
    uploadedAt: '2024-02-20T10:00:00Z',
    uploadedBy: 'Jane Smith',
    expiresAt: '2024-03-01T10:00:00Z',
    status: 'expiring_soon',
  },
  {
    id: '3',
    vendorId: 'v3',
    vendorName: 'Datadog',
    type: 'pentest',
    fileName: 'Datadog_Pentest_Report_Q4.pdf',
    fileSize: 3500000,
    uploadedAt: '2024-01-05T10:00:00Z',
    uploadedBy: 'Security Team',
    status: 'valid',
  },
];

interface SecurityArtifactsProps {
  vendorId?: string;
  vendorName?: string;
}

const SecurityArtifacts: React.FC<SecurityArtifactsProps> = ({ vendorId, vendorName }) => {
  const [artifacts, _setArtifacts] = useState<SecurityArtifact[]>(MOCK_ARTIFACTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<ArtifactType | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  // Filter artifacts
  const filteredArtifacts = artifacts.filter(a => {
    const matchesSearch = !searchTerm ||
      a.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || a.type === filterType;
    const matchesVendor = !vendorId || a.vendorId === vendorId;
    return matchesSearch && matchesType && matchesVendor;
  });

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Valid
          </span>
        );
      case 'expiring_soon':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">
            <Clock className="w-3 h-3" />
            Expiring Soon
          </span>
        );
      case 'expired':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-medium">
            <AlertTriangle className="w-3 h-3" />
            Expired
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Security Artifacts
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {vendorName ? `Documents for ${vendorName}` : 'All vendor security documents'}
          </p>
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterType || ''}
            onChange={(e) => setFilterType(e.target.value as ArtifactType || null)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            {Object.entries(ARTIFACT_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Artifacts List */}
      <div className="divide-y divide-slate-100">
        {filteredArtifacts.length > 0 ? (
          filteredArtifacts.map((artifact) => {
            const config = ARTIFACT_CONFIG[artifact.type];
            return (
              <div
                key={artifact.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: config.bgColor }}
                  >
                    <div style={{ color: config.color }}>{config.icon}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{artifact.fileName}</p>
                      {getStatusBadge(artifact.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span>{artifact.vendorName}</span>
                      <span>•</span>
                      <span>{config.label}</span>
                      <span>•</span>
                      <span>{formatFileSize(artifact.fileSize)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <p className="text-slate-600">
                      {new Date(artifact.uploadedAt).toLocaleDateString()}
                    </p>
                    {artifact.expiresAt && (
                      <p className="text-slate-400 text-xs flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3" />
                        Expires {new Date(artifact.expiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No documents found</h3>
            <p className="text-slate-500 mb-4">
              {searchTerm || filterType
                ? 'Try adjusting your search or filters'
                : 'Upload your first security document'}
            </p>
            {!searchTerm && !filterType && (
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Upload Document
              </button>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Upload Document</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Document Type
                  </label>
                  <select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {Object.entries(ARTIFACT_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>

                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                  <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-600 mb-1">
                    Drag & drop or click to upload
                  </p>
                  <p className="text-xs text-slate-400">PDF files only, max 25MB</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowUpload(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                  Upload
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SecurityArtifacts;
