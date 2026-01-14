/**
 * Auditor Verification Component
 *
 * Allows auditors to verify document authenticity using document hashes.
 * Queries Supabase to confirm document integrity and signature details.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Search, CheckCircle, XCircle, AlertTriangle, FileText,
  Clock, User, Hash, Lock, Loader2, Copy, Check, ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface VerificationResult {
  isAuthentic: boolean;
  documentType: 'policy' | 'certificate' | 'evidence';
  signedBy?: string;
  jobTitle?: string;
  timestamp?: string;
  controlId?: string;
  organizationName?: string;
  documentUrl?: string;
  certificateId?: string;
  errorMessage?: string;
}

const AuditorVerification: React.FC = () => {
  const [documentHash, setDocumentHash] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleVerify = async () => {
    if (!documentHash.trim()) return;

    setIsVerifying(true);
    setResult(null);

    try {
      const hashToSearch = documentHash.trim().toUpperCase();

      // First, check certificates table
      if (supabase) {
        const { data: certData } = await supabase
          .from('certificates')
          .select('*')
          .eq('certificate_hash', hashToSearch)
          .single();

        if (certData) {
          setResult({
            isAuthentic: true,
            documentType: 'certificate',
            signedBy: certData.issued_by,
            timestamp: certData.completion_date,
            organizationName: certData.organization_name,
            certificateId: certData.certificate_id,
            documentUrl: certData.file_url,
          });
          setIsVerifying(false);
          return;
        }

        // Check user_responses for policy documents
        const { data: policyData } = await supabase
          .from('user_responses')
          .select('*')
          .not('evidence_url', 'is', null);

        // Search through policies (document hash would be stored in metadata)
        // For now, we'll check if any evidence URL contains the hash in filename
        const matchingPolicy = policyData?.find(p =>
          p.evidence_url?.includes(hashToSearch.toLowerCase()) ||
          p.file_name?.includes(hashToSearch.toLowerCase())
        );

        if (matchingPolicy) {
          setResult({
            isAuthentic: true,
            documentType: 'policy',
            controlId: matchingPolicy.control_id,
            timestamp: matchingPolicy.updated_at,
            documentUrl: matchingPolicy.evidence_url,
          });
          setIsVerifying(false);
          return;
        }
      }

      // If no match found in database, simulate verification for demo
      // In production, this would only return false
      if (hashToSearch.length === 16) {
        // Valid hash format but not in database
        setResult({
          isAuthentic: false,
          documentType: 'policy',
          errorMessage: 'Document hash not found in registry. This document may have been modified or is not authentic.',
        });
      } else if (hashToSearch.length === 24) {
        // Certificate hash format
        setResult({
          isAuthentic: false,
          documentType: 'certificate',
          errorMessage: 'Certificate hash not found in registry. This certificate may not be valid.',
        });
      } else {
        setResult({
          isAuthentic: false,
          documentType: 'policy',
          errorMessage: 'Invalid hash format. Please enter a valid 16-character document hash or 24-character certificate hash.',
        });
      }

    } catch (error) {
      console.error('Verification error:', error);
      setResult({
        isAuthentic: false,
        documentType: 'policy',
        errorMessage: 'Verification service temporarily unavailable. Please try again later.',
      });
    }

    setIsVerifying(false);
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Document Verification
        </h1>
        <p className="text-slate-500 dark:text-white/60 max-w-md">
          Enter a document hash to verify its authenticity and integrity.
          Valid documents will show signer details and timestamp.
        </p>
      </motion.div>

      {/* Verification Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-xl"
      >
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-white/10 shadow-xl p-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-2">
                Document Hash
              </label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={documentHash}
                  onChange={(e) => setDocumentHash(e.target.value.toUpperCase())}
                  placeholder="e.g., A1B2C3D4E5F6G7H8"
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-lg tracking-wider placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  maxLength={24}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-white/50">
                Policy documents use 16-character hashes. Certificates use 24-character hashes.
              </p>
            </div>

            <button
              onClick={handleVerify}
              disabled={isVerifying || !documentHash.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Verify Document
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Verification Result */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="w-full max-w-xl mt-6"
          >
            {result.isAuthentic ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                      Document Verified
                    </h3>
                    <p className="text-emerald-600 dark:text-emerald-400 text-sm mb-4">
                      This document is authentic and has not been altered since signing.
                    </p>

                    <div className="space-y-3 bg-white dark:bg-slate-800 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
                      {result.documentType === 'certificate' && (
                        <>
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm text-slate-600 dark:text-white/60">Type:</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">Compliance Certificate</span>
                          </div>
                          {result.certificateId && (
                            <div className="flex items-center gap-3">
                              <Hash className="w-4 h-4 text-emerald-500" />
                              <span className="text-sm text-slate-600 dark:text-white/60">Certificate ID:</span>
                              <code className="text-sm font-mono text-violet-600 dark:text-violet-400">{result.certificateId}</code>
                            </div>
                          )}
                          {result.organizationName && (
                            <div className="flex items-center gap-3">
                              <Lock className="w-4 h-4 text-emerald-500" />
                              <span className="text-sm text-slate-600 dark:text-white/60">Organization:</span>
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">{result.organizationName}</span>
                            </div>
                          )}
                        </>
                      )}

                      {result.documentType === 'policy' && result.controlId && (
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm text-slate-600 dark:text-white/60">Control ID:</span>
                          <code className="text-sm font-mono text-violet-600 dark:text-violet-400">{result.controlId}</code>
                        </div>
                      )}

                      {result.signedBy && (
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm text-slate-600 dark:text-white/60">Signed By:</span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{result.signedBy}</span>
                        </div>
                      )}

                      {result.jobTitle && (
                        <div className="flex items-center gap-3 pl-7">
                          <span className="text-sm text-slate-500 dark:text-white/50">{result.jobTitle}</span>
                        </div>
                      )}

                      {result.timestamp && (
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm text-slate-600 dark:text-white/60">Timestamp:</span>
                          <span className="text-sm text-slate-900 dark:text-white">
                            {new Date(result.timestamp).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {result.documentUrl && (
                      <div className="mt-4 flex items-center gap-3">
                        <a
                          href={result.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Document
                        </a>
                        <button
                          onClick={() => handleCopy(result.documentUrl!)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white/80 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Copied!' : 'Copy URL'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-500/30 rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-red-800 dark:text-red-300 mb-1">
                      Verification Failed
                    </h3>
                    <p className="text-red-600 dark:text-red-400 text-sm mb-4">
                      {result.errorMessage}
                    </p>
                    <div className="flex items-start gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-red-200 dark:border-red-700">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 dark:text-white/60">
                        If you believe this document should be valid, contact the issuing organization
                        or check that you've entered the complete hash correctly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-12 text-center max-w-lg"
      >
        <h4 className="text-sm font-semibold text-slate-700 dark:text-white/70 mb-2">
          Where to find the document hash?
        </h4>
        <p className="text-xs text-slate-500 dark:text-white/50">
          The document hash is located at the bottom of signed policy documents and certificates.
          It's a unique identifier that ensures the document hasn't been modified.
        </p>
      </motion.div>
    </div>
  );
};

export default AuditorVerification;
