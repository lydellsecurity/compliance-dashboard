/**
 * ============================================================================
 * USE REPORT GENERATION HOOK
 * ============================================================================
 * 
 * Hook for generating and downloading compliance reports.
 */

import { useState, useCallback } from 'react';
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
}

export interface ReportData {
  responses: Record<string, { answer: string; notes?: string }>;
  controls: Array<{ id: string; title?: string; question?: string; risk_level?: string }>;
  customControls?: Array<{ id: string; title: string }>;
  evidence?: Array<{ id: string; controlId: string; notes: string; status: string; title?: string }>;
}

export function useReportGeneration(): UseReportGenerationReturn {
  const { session } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const generateReport = useCallback(async (
    options: ReportOptions,
    data: ReportData
  ): Promise<void> => {
    if (!session?.access_token) {
      setError('You must be logged in to generate reports');
      return;
    }

    setGenerating(true);
    setError(null);
    setProgress(10);

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
      });

      setProgress(80);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate report: ${response.status}`);
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      setProgress(90);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance-report-${options.reportType}-${Date.now()}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      
      setProgress(100);

    } catch (err) {
      console.error('Report generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
      setTimeout(() => setProgress(0), 500);
    }
  }, [session]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generating,
    error,
    progress,
    generateReport,
    clearError,
  };
}
