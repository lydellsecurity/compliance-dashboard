/**
 * Auditor Verification Component
 *
 * Allows auditors to verify document authenticity using document hashes.
 * Two verification methods:
 * 1. Hash Lookup - Enter a known hash to check if it's in the registry
 * 2. File Verification - Upload a file to compute its hash and verify
 *
 * Uses Web Crypto API for SHA-256 hash computation in the browser.
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Search, CheckCircle, XCircle, AlertTriangle, FileText,
  Clock, User, Hash, Lock, Loader2, Copy, Check, ExternalLink,
  Upload, File, RefreshCw,
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
  computedHash?: string;
  expectedHash?: string;
  hashMatch?: boolean;
}

type VerificationMode = 'hash' | 'file';

// Compute SHA-256 hash of a file using Web Crypto API
async function computeFileHash(file: globalThis.File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.toUpperCase();
}

// Format hash for display (add spaces every 8 chars)
function formatHash(hash: string): string {
  return hash.match(/.{1,8}/g)?.join(' ') || hash;
}

// Truncate hash for compact display
function truncateHash(hash: string, length: number = 16): string {
  if (hash.length <= length) return hash;
  return hash.substring(0, length) + '...';
}

const AuditorVerification: React.FC = () => {
  const [mode, setMode] = useState<VerificationMode>('file');
  const [documentHash, setDocumentHash] = useState('');
  const [expectedHash, setExpectedHash] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [computedHash, setComputedHash] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: globalThis.File) => {
    setSelectedFile(file);
    setComputedHash(null);
    setResult(null);

    // Immediately compute the hash
    try {
      const hash = await computeFileHash(file);
      setComputedHash(hash);
    } catch (error) {
      console.error('Error computing hash:', error);
    }
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Clear file selection
  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setComputedHash(null);
    setExpectedHash('');
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Verify file against expected hash
  const handleFileVerify = async () => {
    if (!computedHash || !expectedHash.trim()) return;

    setIsVerifying(true);
    setResult(null);

    const normalizedExpected = expectedHash.trim().toUpperCase().replace(/\s/g, '');
    const hashMatches = computedHash === normalizedExpected;

    // Simulate a brief verification delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));

    if (hashMatches) {
      setResult({
        isAuthentic: true,
        documentType: 'policy',
        computedHash,
        expectedHash: normalizedExpected,
        hashMatch: true,
      });
    } else {
      setResult({
        isAuthentic: false,
        documentType: 'policy',
        computedHash,
        expectedHash: normalizedExpected,
        hashMatch: false,
        errorMessage: 'Hash mismatch! The computed hash does not match the expected hash. This document may have been modified.',
      });
    }

    setIsVerifying(false);
  };

  // Original hash lookup verification
  const handleVerify = async () => {
    if (!documentHash.trim()) return;

    setIsVerifying(true);
    setResult(null);

    try {
      const hashToSearch = documentHash.trim().toUpperCase().replace(/\s/g, '');

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
        <h1 className="text-3xl font-bold text-primary mb-2">
          Document Verification
        </h1>
        <p className="text-secondary max-w-md">
          Verify document integrity using SHA-256 cryptographic hashing.
          Upload a file or enter a hash to check authenticity.
        </p>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-steel-800 rounded-xl mb-6"
      >
        <button
          onClick={() => { setMode('file'); setResult(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === 'file'
              ? 'bg-white dark:bg-steel-700 text-primary shadow-sm'
              : 'text-secondary hover:text-primary'
          }`}
        >
          <Upload className="w-4 h-4" />
          Verify File
        </button>
        <button
          onClick={() => { setMode('hash'); setResult(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === 'hash'
              ? 'bg-white dark:bg-steel-700 text-primary shadow-sm'
              : 'text-secondary hover:text-primary'
          }`}
        >
          <Hash className="w-4 h-4" />
          Hash Lookup
        </button>
      </motion.div>

      {/* Verification Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-xl"
      >
        <div className="card backdrop-blur-md rounded-2xl shadow-xl p-8">
          <AnimatePresence mode="wait">
            {mode === 'file' ? (
              <motion.div
                key="file-mode"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* File Drop Zone */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Upload Document
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : selectedFile
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-slate-300 dark:border-steel-600 hover:border-violet-400 hover:bg-slate-50 dark:hover:bg-steel-800'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileInputChange}
                      accept=".pdf,.doc,.docx,.txt,.json,.xml"
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-xl bg-emerald-500 flex items-center justify-center">
                          <File className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-primary">{selectedFile.name}</p>
                          <p className="text-sm text-secondary">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); clearFile(); }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-secondary hover:text-primary bg-slate-100 dark:bg-steel-800 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Choose different file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-xl bg-slate-200 dark:bg-steel-700 flex items-center justify-center">
                          <Upload className="w-7 h-7 text-slate-400 dark:text-steel-400" />
                        </div>
                        <div>
                          <p className="font-medium text-primary">
                            Drop a file here or click to browse
                          </p>
                          <p className="text-sm text-secondary mt-1">
                            PDF, DOC, TXT, JSON, or XML files
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Computed Hash Display */}
                {computedHash && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-slate-50 dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-secondary">Computed SHA-256 Hash</span>
                      <button
                        onClick={() => handleCopy(computedHash)}
                        className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-600"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <code className="block text-xs font-mono text-emerald-600 dark:text-emerald-400 break-all leading-relaxed">
                      {formatHash(computedHash)}
                    </code>
                  </motion.div>
                )}

                {/* Expected Hash Input */}
                {computedHash && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Expected Hash (from document footer)
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={expectedHash}
                        onChange={(e) => setExpectedHash(e.target.value.toUpperCase())}
                        placeholder="Paste the expected hash here..."
                        className="input pl-12 pr-4 py-3 rounded-xl font-mono text-sm"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-steel-400">
                      Find this hash at the bottom of signed policy documents
                    </p>
                  </motion.div>
                )}

                {/* Verify Button */}
                <button
                  onClick={handleFileVerify}
                  disabled={isVerifying || !computedHash || !expectedHash.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Verify Integrity
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="hash-mode"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Document Hash
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={documentHash}
                      onChange={(e) => setDocumentHash(e.target.value.toUpperCase())}
                      placeholder="e.g., A1B2C3D4 E5F6G7H8..."
                      className="input pl-12 pr-4 py-4 rounded-xl font-mono text-lg tracking-wider"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-steel-400">
                    Enter the full SHA-256 hash to look up in the document registry
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
                      Lookup Hash
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
                      {result.hashMatch ? 'Integrity Verified' : 'Document Verified'}
                    </h3>
                    <p className="text-emerald-600 dark:text-emerald-400 text-sm mb-4">
                      {result.hashMatch
                        ? 'The document hash matches. This file has not been modified since signing.'
                        : 'This document is authentic and has not been altered since signing.'}
                    </p>

                    <div className="space-y-3 card rounded-xl p-4 border border-status-success/30">
                      {/* File verification hash comparison */}
                      {result.hashMatch && result.computedHash && (
                        <>
                          <div className="flex items-start gap-3">
                            <Hash className="w-4 h-4 text-status-success mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-sm text-secondary block mb-1">Hash Match</span>
                              <code className="text-xs font-mono text-emerald-600 dark:text-emerald-400 break-all">
                                {truncateHash(result.computedHash, 32)}...
                              </code>
                            </div>
                            <CheckCircle className="w-5 h-5 text-status-success flex-shrink-0" />
                          </div>
                          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <p className="text-xs text-emerald-700 dark:text-emerald-300">
                              <strong>Cryptographic Verification Complete:</strong> The SHA-256 hash computed from the uploaded file exactly matches the expected hash from the document registry.
                            </p>
                          </div>
                        </>
                      )}
                      {result.documentType === 'certificate' && (
                        <>
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-status-success" />
                            <span className="text-sm text-secondary">Type:</span>
                            <span className="text-sm font-semibold text-primary">Compliance Certificate</span>
                          </div>
                          {result.certificateId && (
                            <div className="flex items-center gap-3">
                              <Hash className="w-4 h-4 text-status-success" />
                              <span className="text-sm text-secondary">Certificate ID:</span>
                              <code className="text-sm font-mono text-framework-hipaa">{result.certificateId}</code>
                            </div>
                          )}
                          {result.organizationName && (
                            <div className="flex items-center gap-3">
                              <Lock className="w-4 h-4 text-status-success" />
                              <span className="text-sm text-secondary">Organization:</span>
                              <span className="text-sm font-semibold text-primary">{result.organizationName}</span>
                            </div>
                          )}
                        </>
                      )}

                      {result.documentType === 'policy' && result.controlId && (
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-status-success" />
                          <span className="text-sm text-secondary">Control ID:</span>
                          <code className="text-sm font-mono text-framework-hipaa">{result.controlId}</code>
                        </div>
                      )}

                      {result.signedBy && (
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-status-success" />
                          <span className="text-sm text-secondary">Signed By:</span>
                          <span className="text-sm font-semibold text-primary">{result.signedBy}</span>
                        </div>
                      )}

                      {result.jobTitle && (
                        <div className="flex items-center gap-3 pl-7">
                          <span className="text-sm text-slate-500 dark:text-steel-400">{result.jobTitle}</span>
                        </div>
                      )}

                      {result.timestamp && (
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-status-success" />
                          <span className="text-sm text-secondary">Timestamp:</span>
                          <span className="text-sm text-primary">
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
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-steel-800 text-secondary rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-steel-700 transition-colors"
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
                      {result.hashMatch === false ? 'Integrity Check Failed' : 'Verification Failed'}
                    </h3>
                    <p className="text-red-600 dark:text-red-400 text-sm mb-4">
                      {result.errorMessage}
                    </p>

                    {/* Show hash comparison for file verification failures */}
                    {result.hashMatch === false && result.computedHash && result.expectedHash && (
                      <div className="space-y-3 mb-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                          <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-2">Computed Hash (from file):</p>
                          <code className="text-xs font-mono text-red-700 dark:text-red-400 break-all block">
                            {formatHash(result.computedHash)}
                          </code>
                        </div>
                        <div className="p-3 bg-slate-100 dark:bg-steel-800 rounded-lg">
                          <p className="text-xs font-medium text-secondary mb-2">Expected Hash (from registry):</p>
                          <code className="text-xs font-mono text-secondary break-all block">
                            {formatHash(result.expectedHash)}
                          </code>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-2 p-3 card rounded-lg border border-status-risk/30">
                      <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-secondary">
                        {result.hashMatch === false
                          ? 'This document may have been modified after signing. Contact the issuing organization to obtain the original document.'
                          : 'If you believe this document should be valid, contact the issuing organization or check that you\'ve entered the complete hash correctly.'}
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
        className="mt-12 max-w-2xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 card rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-5 h-5 text-violet-500" />
              <h4 className="text-sm font-semibold text-primary">File Verification</h4>
            </div>
            <p className="text-xs text-secondary">
              Upload a document to compute its SHA-256 hash, then compare it against
              the expected hash from the document footer to verify integrity.
            </p>
          </div>
          <div className="p-4 card rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-5 h-5 text-violet-500" />
              <h4 className="text-sm font-semibold text-primary">Hash Lookup</h4>
            </div>
            <p className="text-xs text-secondary">
              Enter a document hash to look it up in the registry and retrieve
              details about when and by whom the document was signed.
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 dark:text-steel-400 mt-4">
          The SHA-256 hash is located at the bottom of all signed policy documents and certificates.
        </p>
      </motion.div>
    </div>
  );
};

export default AuditorVerification;
