/**
 * ============================================================================
 * USE REPORT GENERATION HOOK
 * ============================================================================
 *
 * Hook for generating and downloading compliance reports.
 * Includes timeout handling and retry logic.
 */

import { useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

export type ReportType = 'full' | 'gaps' | 'evidence';
export type FrameworkFilter = 'SOC2' | 'ISO27001' | 'HIPAA' | 'NIST' | null;

export interface ReportOptions {
  reportType: ReportType;
  frameworkFilter?: FrameworkFilter;
  organizationName?: string;
}

export interface UseReportGenerationReturn {
  generating: boolean;
  error: string | null;
  progress: number;
  generateReport: (options: ReportOptions, data: ReportData) => Promise<void>;
  clearError: () => void;
  cancelGeneration: () => void;
}

export interface ReportData {
  responses: Record<string, { answer: string; notes?: string }>;
  controls: Array<{ id: string; title?: string; question?: string; risk_level?: string; frameworks?: string[] }>;
  customControls?: Array<{ id: string; title: string }>;
  evidence?: Array<{ id: string; controlId: string; notes: string; status: string; title?: string; fileUrls?: string[] }>;
}

// Request timeout in milliseconds (2 minutes for large reports)
const REQUEST_TIMEOUT_MS = 120000;

export function useReportGeneration(): UseReportGenerationReturn {
  const { session } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateReport = useCallback(async (
    options: ReportOptions,
    data: ReportData
  ): Promise<void> => {
    if (!session?.access_token) {
      setError('You must be logged in to generate reports');
      return;
    }

    // Prevent concurrent generations
    if (generating) {
      setError('A report is already being generated. Please wait.');
      return;
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setGenerating(true);
    setError(null);
    setProgress(10);

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, REQUEST_TIMEOUT_MS);

    try {
      setProgress(30);

      const payload = {
        reportType: options.reportType,
        frameworkFilter: options.frameworkFilter || null,
        organizationName: options.organizationName || 'Organization',
        responses: data.responses,
        controls: data.controls,
        customControls: data.customControls || [],
        evidence: data.evidence || [],
      };

      setProgress(50);

      const response = await fetch('/.netlify/functions/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
        signal,
      });

      clearTimeout(timeoutId);
      setProgress(80);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle specific error codes
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment before generating another report.');
        }
        if (response.status === 401) {
          throw new Error('Your session has expired. Please log in again.');
        }
        if (response.status === 504) {
          throw new Error('Report generation timed out. Try generating a smaller report.');
        }

        throw new Error(errorData.error || `Failed to generate report: ${response.status}`);
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Verify we got a valid PDF
      if (blob.size === 0) {
        throw new Error('Generated report was empty. Please try again.');
      }

      setProgress(90);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Use report type in filename
      const reportTypeNames: Record<ReportType, string> = {
        full: 'audit-readiness-report',
        gaps: 'gap-analysis-report',
        evidence: 'evidence-summary-report',
      };
      link.download = `${reportTypeNames[options.reportType] || 'compliance-report'}-${Date.now()}.pdf`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup after a short delay to ensure download starts
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

      setProgress(100);

    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Report generation error:', err);

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Report generation was cancelled or timed out. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to generate report. Please try again.');
      }
    } finally {
      setGenerating(false);
      abortControllerRef.current = null;
      setTimeout(() => setProgress(0), 500);
    }
  }, [session, generating]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setGenerating(false);
      setProgress(0);
      setError('Report generation cancelled.');
    }
  }, []);

  return {
    generating,
    error,
    progress,
    generateReport,
    clearError,
    cancelGeneration,
  };
}
