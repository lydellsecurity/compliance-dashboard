/**
 * Upload Wizard
 *
 * Handles Excel/CSV file upload and parsing:
 * - Drag & drop or click to upload
 * - Auto-detect question columns
 * - Preview parsed questions
 * - Column mapping configuration
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  FileText,
  Loader2,
  Settings,
  Eye,
  Zap,
  Table,
} from 'lucide-react';
import type { KnowledgeBaseContext, ParsedQuestion } from './index';

// ============================================================================
// TYPES
// ============================================================================

interface UploadWizardProps {
  onUpload: (questions: ParsedQuestion[], fileName: string) => void;
  knowledgeBase: KnowledgeBaseContext | null;
  isLoadingKB: boolean;
}

interface ColumnMapping {
  question: number;
  category?: number;
  questionType?: number;
  required?: number;
}

interface ParsedRow {
  rowNumber: number;
  values: string[];
}

// ============================================================================
// COMPONENT
// ============================================================================

const UploadWizard: React.FC<UploadWizardProps> = ({
  onUpload,
  knowledgeBase,
  isLoadingKB,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ question: 0 });
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV content
  const parseCSV = useCallback((content: string): { headers: string[]; rows: ParsedRow[] } => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('File is empty');
    }

    // Simple CSV parsing (handles quoted fields)
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headerRow = parseLine(lines[0]);
    const dataRows = lines.slice(1).map((line, idx) => ({
      rowNumber: idx + 2,
      values: parseLine(line),
    }));

    return { headers: headerRow, rows: dataRows };
  }, []);

  // Handle file selection
  const handleFile = useCallback(async (selectedFile: File) => {
    setError(null);
    setIsProcessing(true);

    try {
      const fileName = selectedFile.name.toLowerCase();

      if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        throw new Error('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      }

      setFile(selectedFile);

      // Read file content
      const content = await selectedFile.text();

      if (fileName.endsWith('.csv')) {
        const { headers: parsedHeaders, rows } = parseCSV(content);
        setHeaders(parsedHeaders);
        setParsedRows(rows);

        // Auto-detect question column
        const questionColIndex = parsedHeaders.findIndex(h =>
          /question|query|item|requirement|criteria/i.test(h)
        );
        const categoryColIndex = parsedHeaders.findIndex(h =>
          /category|section|domain|area|topic/i.test(h)
        );

        setColumnMapping({
          question: questionColIndex >= 0 ? questionColIndex : 0,
          category: categoryColIndex >= 0 ? categoryColIndex : undefined,
        });

        setStep('mapping');
      } else {
        // For Excel files, show a message to convert to CSV
        // In a full implementation, we would use xlsx library
        setError('Excel files (.xlsx) are supported. For now, please save as CSV and re-upload.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, [parseCSV]);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  }, [handleFile]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  }, [handleFile]);

  // Process and submit questions
  const processQuestions = useCallback(() => {
    if (!file) return;

    const questions: ParsedQuestion[] = parsedRows
      .filter(row => row.values[columnMapping.question]?.trim())
      .map((row, idx) => {
        const questionText = row.values[columnMapping.question]?.trim() || '';
        const category = columnMapping.category !== undefined
          ? row.values[columnMapping.category]?.trim()
          : undefined;

        // Detect question type based on text
        let questionType: ParsedQuestion['questionType'] = 'text';
        if (/^(do you|does your|is there|are there|have you|has your|can you|will you)/i.test(questionText)) {
          questionType = 'yes_no';
        }

        return {
          id: `q-${idx + 1}`,
          rowNumber: row.rowNumber,
          originalQuestion: questionText,
          category,
          questionType,
          required: true,
          status: 'pending' as const,
        };
      });

    onUpload(questions, file.name);
  }, [file, parsedRows, columnMapping, onUpload]);

  // Reset wizard
  const resetWizard = useCallback(() => {
    setFile(null);
    setStep('upload');
    setParsedRows([]);
    setHeaders([]);
    setError(null);
    setColumnMapping({ question: 0 });
  }, []);

  return (
    <div className="space-y-6">
      {/* Knowledge Base Status */}
      <div className={`rounded-xl border p-4 ${
        isLoadingKB
          ? 'bg-blue-50 border-blue-200'
          : knowledgeBase
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-3">
          {isLoadingKB ? (
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          ) : knowledgeBase ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600" />
          )}
          <div className="flex-1">
            <p className={`font-medium ${
              isLoadingKB ? 'text-blue-900' : knowledgeBase ? 'text-emerald-900' : 'text-amber-900'
            }`}>
              {isLoadingKB
                ? 'Loading Knowledge Base...'
                : knowledgeBase
                ? 'Knowledge Base Ready'
                : 'Knowledge Base Not Available'}
            </p>
            <p className={`text-sm ${
              isLoadingKB ? 'text-blue-700' : knowledgeBase ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {isLoadingKB
                ? 'Aggregating compliance data for AI context'
                : knowledgeBase
                ? `${knowledgeBase.totalCompliant} compliant controls • ${knowledgeBase.totalWithEvidence} evidence items • ${knowledgeBase.frameworks.length} frameworks`
                : 'Complete compliance assessments to enable AI-powered responses'}
            </p>
          </div>
        </div>
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-violet-500 bg-violet-50'
                : 'border-slate-300 bg-white hover:border-violet-400 hover:bg-violet-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {isProcessing ? (
              <div>
                <Loader2 className="w-16 h-16 text-violet-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Processing File...</h3>
                <p className="text-slate-500">Parsing questionnaire data</p>
              </div>
            ) : (
              <div>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="w-10 h-10 text-violet-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Upload Security Questionnaire
                </h3>
                <p className="text-slate-500 mb-4">
                  Drag & drop your Excel or CSV file, or click to browse
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    .csv
                  </span>
                  <span className="flex items-center gap-1">
                    <FileSpreadsheet className="w-4 h-4" />
                    .xlsx
                  </span>
                  <span className="flex items-center gap-1">
                    <Table className="w-4 h-4" />
                    .xls
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 inline-block mr-2" />
                {error}
              </div>
            )}
          </div>

          {/* Supported Formats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <h4 className="font-medium text-slate-900">SIG / SIG Lite</h4>
              </div>
              <p className="text-sm text-slate-500">
                Standardized Information Gathering questionnaires
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="font-medium text-slate-900">CAIQ / VSA</h4>
              </div>
              <p className="text-sm text-slate-500">
                Cloud security and vendor assessment formats
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-violet-600" />
                </div>
                <h4 className="font-medium text-slate-900">Custom Formats</h4>
              </div>
              <p className="text-sm text-slate-500">
                Any spreadsheet with question columns
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step: Column Mapping */}
      {step === 'mapping' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Settings className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Configure Column Mapping</h3>
                <p className="text-sm text-slate-500">
                  {file?.name} • {parsedRows.length} rows detected
                </p>
              </div>
            </div>
            <button
              onClick={resetWizard}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mapping Options */}
          <div className="p-6 space-y-6">
            {/* Header Row Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="hasHeader"
                checked={hasHeaderRow}
                onChange={e => setHasHeaderRow(e.target.checked)}
                className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
              />
              <label htmlFor="hasHeader" className="text-sm text-slate-700">
                First row contains column headers
              </label>
            </div>

            {/* Column Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Question Column <span className="text-red-500">*</span>
                </label>
                <select
                  value={columnMapping.question}
                  onChange={e => setColumnMapping(prev => ({ ...prev, question: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {headers.map((header, idx) => (
                    <option key={idx} value={idx}>
                      Column {idx + 1}: {header || `(unnamed)`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Category Column (Optional)
                </label>
                <select
                  value={columnMapping.category ?? ''}
                  onChange={e => setColumnMapping(prev => ({
                    ...prev,
                    category: e.target.value ? parseInt(e.target.value) : undefined,
                  }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">None</option>
                  {headers.map((header, idx) => (
                    <option key={idx} value={idx}>
                      Column {idx + 1}: {header || `(unnamed)`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview */}
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview (First 5 Questions)
              </h4>
              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-4 py-2 text-left text-slate-600 font-medium">Row</th>
                      {columnMapping.category !== undefined && (
                        <th className="px-4 py-2 text-left text-slate-600 font-medium">Category</th>
                      )}
                      <th className="px-4 py-2 text-left text-slate-600 font-medium">Question</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {parsedRows.slice(0, 5).map(row => (
                      <tr key={row.rowNumber} className="hover:bg-white">
                        <td className="px-4 py-2 text-slate-500">{row.rowNumber}</td>
                        {columnMapping.category !== undefined && (
                          <td className="px-4 py-2 text-slate-700">
                            {row.values[columnMapping.category] || '-'}
                          </td>
                        )}
                        <td className="px-4 py-2 text-slate-900">
                          {row.values[columnMapping.question] || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
            <button
              onClick={resetWizard}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={processQuestions}
              disabled={!knowledgeBase}
              className="px-6 py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Process {parsedRows.length} Questions
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* How It Works */}
      {step === 'upload' && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200 p-6">
          <h4 className="font-semibold text-violet-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            How AI-Powered Questionnaire Automation Works
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 text-violet-700 font-semibold text-sm">
                1
              </div>
              <div>
                <p className="font-medium text-violet-900">Upload</p>
                <p className="text-sm text-violet-700">Upload your customer&apos;s security questionnaire</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 text-violet-700 font-semibold text-sm">
                2
              </div>
              <div>
                <p className="font-medium text-violet-900">AI Analysis</p>
                <p className="text-sm text-violet-700">AI maps questions to your compliant controls</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 text-violet-700 font-semibold text-sm">
                3
              </div>
              <div>
                <p className="font-medium text-violet-900">Review</p>
                <p className="text-sm text-violet-700">Approve, edit, or reject AI suggestions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 text-violet-700 font-semibold text-sm">
                4
              </div>
              <div>
                <p className="font-medium text-violet-900">Export</p>
                <p className="text-sm text-violet-700">Download completed questionnaire</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadWizard;
