/**
 * Export Service
 *
 * Professional PDF and CSV export functionality for compliance reports.
 * Supports tenant branding with company logos.
 *
 * Features:
 * - PDF export with professional formatting
 * - CSV export for data analysis
 * - Tenant logo integration
 * - Multiple report types support
 */

import type { FrameworkId } from '../constants/controls';
import type { ComplianceReport } from '../types/incident.types';
import type { OrganizationBranding } from '../types/branding.types';

// ============================================================================
// TYPES
// ============================================================================

export interface ExportOptions {
  /** Organization branding info including logo */
  organization: OrganizationBranding | null;
  /** Report title override */
  title?: string;
  /** Include detailed breakdown */
  includeDetails?: boolean;
  /** Include recommendations section */
  includeRecommendations?: boolean;
  /** Include findings section */
  includeFindings?: boolean;
  /** Date format for display */
  dateFormat?: 'short' | 'long';
  /** Page orientation for PDF */
  orientation?: 'portrait' | 'landscape';
}

export interface FrameworkScore {
  frameworkId: FrameworkId;
  score: number;
  controlsAssessed: number;
  controlsCompliant: number;
  gaps: number;
}

export interface ComplianceData {
  overallScore: number;
  frameworkScores: FrameworkScore[];
  criticalFindings: string[];
  recommendations: string[];
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
}

export interface ControlExportData {
  id: string;
  frameworkId: FrameworkId;
  name: string;
  description: string;
  status: 'compliant' | 'non-compliant' | 'partial' | 'not-assessed';
  evidenceCount: number;
  lastAssessed: string | null;
  assignee: string | null;
  notes: string | null;
}

export interface VendorExportData {
  id: string;
  name: string;
  category: string;
  riskTier: 'critical' | 'high' | 'medium' | 'low';
  overallScore: number;
  lastAssessment: string | null;
  status: string;
  certifications: string[];
}

export interface EvidenceExportData {
  id: string;
  name: string;
  type: string;
  framework: string;
  controlId: string;
  uploadedAt: string;
  uploadedBy: string;
  fileSize: string;
  status: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FRAMEWORK_CONFIG: Record<FrameworkId, { name: string; color: string }> = {
  SOC2: { name: 'SOC 2 Type II', color: '#0066FF' },
  ISO27001: { name: 'ISO 27001:2022', color: '#059669' },
  HIPAA: { name: 'HIPAA Security', color: '#7C3AED' },
  NIST: { name: 'NIST CSF 2.0', color: '#D97706' },
  PCIDSS: { name: 'PCI DSS 4.0', color: '#3b82f6' },
  GDPR: { name: 'GDPR', color: '#06b6d4' },
};

const STATUS_COLORS: Record<string, string> = {
  compliant: '#10B981',
  'non-compliant': '#EF4444',
  partial: '#F59E0B',
  'not-assessed': '#6B7280',
};

// ============================================================================
// PDF EXPORT
// ============================================================================

/**
 * Generate professional PDF for compliance report
 */
export function generateCompliancePDF(
  report: ComplianceReport,
  options: ExportOptions
): void {
  const { organization, includeFindings = true, includeRecommendations = true } = options;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please allow popups.');
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Build logo HTML - use tenant logo if available
  const logoHtml = organization?.logoUrl
    ? `<img src="${organization.logoUrl}" alt="${organization.name}" style="max-height: 50px; max-width: 200px; object-fit: contain;" crossorigin="anonymous" />`
    : `<div class="company-name">${organization?.name || 'Compliance Report'}</div>`;

  const frameworkRows = report.frameworkScores
    .map(
      (fs) => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${FRAMEWORK_CONFIG[fs.frameworkId].color};"></span>
          <span style="font-weight: 500;">${FRAMEWORK_CONFIG[fs.frameworkId].name}</span>
        </div>
      </td>
      <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: center;">
        <span style="font-weight: 700; font-size: 18px; color: ${getScoreColor(fs.score)};">${fs.score}%</span>
      </td>
      <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">${fs.controlsAssessed}</td>
      <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #10B981; font-weight: 500;">${fs.controlsCompliant}</td>
      <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #EF4444; font-weight: 500;">${fs.gaps}</td>
    </tr>
  `
    )
    .join('');

  const findingsHtml =
    includeFindings && report.criticalFindings.length > 0
      ? `
    <div class="section">
      <h2 style="color: #991b1b;">
        <span style="display: inline-block; width: 8px; height: 8px; background: #EF4444; border-radius: 50%; margin-right: 8px;"></span>
        Critical Findings (${report.criticalFindings.length})
      </h2>
      <div class="findings-list">
        ${report.criticalFindings.map((f, i) => `<div class="finding-item"><span class="finding-number">${i + 1}</span><span>${f}</span></div>`).join('')}
      </div>
    </div>
  `
      : '';

  const recommendationsHtml =
    includeRecommendations && report.recommendations.length > 0
      ? `
    <div class="section">
      <h2 style="color: #166534;">
        <span style="display: inline-block; width: 8px; height: 8px; background: #10B981; border-radius: 50%; margin-right: 8px;"></span>
        Recommendations (${report.recommendations.length})
      </h2>
      <div class="recommendations-list">
        ${report.recommendations.map((r, i) => `<div class="recommendation-item"><span class="rec-number">${i + 1}</span><span>${r}</span></div>`).join('')}
      </div>
    </div>
  `
      : '';

  const primaryColor = organization?.primaryColor || '#6366f1';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${report.title}</title>
      <style>
        @page {
          size: A4;
          margin: 0.75in;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #1e293b;
          line-height: 1.6;
          background: white;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 24px;
          margin-bottom: 32px;
          border-bottom: 3px solid ${primaryColor};
        }
        .header-left { }
        .company-name {
          font-size: 24px;
          font-weight: 700;
          color: ${primaryColor};
        }
        .report-title {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin-top: 16px;
        }
        .report-meta {
          color: #64748b;
          font-size: 14px;
          margin-top: 8px;
        }
        .header-right {
          text-align: right;
        }
        .generated-date {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 8px;
        }

        /* Score Section */
        .score-section {
          display: flex;
          justify-content: center;
          margin: 40px 0;
        }
        .score-card {
          text-align: center;
          padding: 32px 48px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }
        .score-circle {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          border: 8px solid ${getScoreColor(report.overallScore)};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          background: white;
        }
        .score-value {
          font-size: 48px;
          font-weight: 800;
          color: ${getScoreColor(report.overallScore)};
        }
        .score-label {
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .score-title {
          font-size: 14px;
          font-weight: 600;
          color: #475569;
        }

        /* Sections */
        .section {
          margin-bottom: 32px;
          page-break-inside: avoid;
        }
        .section h2 {
          font-size: 18px;
          color: #334155;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e2e8f0;
        }

        /* Table */
        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th {
          background: #f8fafc;
          padding: 14px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          border-bottom: 2px solid #e2e8f0;
        }
        th:not(:first-child) {
          text-align: center;
        }

        /* Findings */
        .findings-list {
          background: #fef2f2;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #fecaca;
        }
        .finding-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #fecaca;
          color: #991b1b;
          font-size: 14px;
        }
        .finding-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .finding-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: #EF4444;
          color: white;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }

        /* Recommendations */
        .recommendations-list {
          background: #f0fdf4;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #bbf7d0;
        }
        .recommendation-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #bbf7d0;
          color: #166534;
          font-size: 14px;
        }
        .recommendation-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .rec-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: #10B981;
          color: white;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }

        /* Footer */
        .footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #94a3b8;
          font-size: 11px;
        }
        .footer-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .confidential-badge {
          background: #fef3c7;
          color: #92400e;
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          ${logoHtml}
          <h1 class="report-title">${report.title}</h1>
          <p class="report-meta">
            Assessment Period: ${formatDate(report.periodStart)} - ${formatDate(report.periodEnd)}
          </p>
        </div>
        <div class="header-right">
          <p class="generated-date">Generated: ${formatDate(report.generatedAt)}</p>
          <p class="generated-date">Report ID: ${report.id}</p>
        </div>
      </div>

      <div class="score-section">
        <div class="score-card">
          <div class="score-circle">
            <div class="score-value">${report.overallScore}</div>
            <div class="score-label">/ 100</div>
          </div>
          <div class="score-title">Overall Compliance Score</div>
        </div>
      </div>

      <div class="section">
        <h2>Framework Compliance Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Framework</th>
              <th>Score</th>
              <th>Controls Assessed</th>
              <th>Compliant</th>
              <th>Gaps</th>
            </tr>
          </thead>
          <tbody>
            ${frameworkRows}
          </tbody>
        </table>
      </div>

      ${findingsHtml}
      ${recommendationsHtml}

      <div class="footer">
        <div class="footer-left">
          <span class="confidential-badge">Confidential</span>
          <span>${organization?.name || 'Compliance Report'}</span>
        </div>
        <span>Generated by AttestAI Compliance Platform</span>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Generate professional PDF for controls data
 */
export function generateControlsPDF(
  controls: ControlExportData[],
  options: ExportOptions
): void {
  const { organization, title = 'Controls Assessment Report' } = options;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please allow popups.');
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Not assessed';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const color = STATUS_COLORS[status] || '#6B7280';
    const label = status.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    return `<span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: ${color}15; color: ${color};">${label}</span>`;
  };

  const logoHtml = organization?.logoUrl
    ? `<img src="${organization.logoUrl}" alt="${organization.name}" style="max-height: 40px; max-width: 160px; object-fit: contain;" crossorigin="anonymous" />`
    : `<div style="font-size: 20px; font-weight: 700; color: ${organization?.primaryColor || '#6366f1'};">${organization?.name || 'Controls Report'}</div>`;

  // Group by framework
  const grouped = controls.reduce(
    (acc, c) => {
      if (!acc[c.frameworkId]) acc[c.frameworkId] = [];
      acc[c.frameworkId].push(c);
      return acc;
    },
    {} as Record<string, ControlExportData[]>
  );

  const frameworkSections = Object.entries(grouped)
    .map(([fw, ctrls]) => {
      const config = FRAMEWORK_CONFIG[fw as FrameworkId] || { name: fw, color: '#6B7280' };
      const rows = ctrls
        .map(
          (c) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${c.id}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${c.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${getStatusBadge(c.status)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${c.evidenceCount}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">${formatDate(c.lastAssessed)}</td>
        </tr>
      `
        )
        .join('');

      return `
      <div class="section" style="page-break-inside: avoid;">
        <h2 style="font-size: 16px; color: ${config.color}; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid ${config.color}20;">
          ${config.name}
          <span style="font-weight: 400; font-size: 14px; color: #64748b; margin-left: 8px;">(${ctrls.length} controls)</span>
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Control ID</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Name</th>
              <th style="padding: 10px 12px; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Status</th>
              <th style="padding: 10px 12px; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Evidence</th>
              <th style="padding: 10px 12px; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Last Assessed</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
    })
    .join('');

  const primaryColor = organization?.primaryColor || '#6366f1';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page { size: A4 landscape; margin: 0.5in; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #1e293b;
          line-height: 1.5;
          background: white;
          padding: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          margin-bottom: 24px;
          border-bottom: 3px solid ${primaryColor};
        }
        .section { margin-bottom: 24px; }
        .footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #94a3b8;
        }
        @media print {
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoHtml}
        <div style="text-align: right;">
          <h1 style="font-size: 22px; color: #0f172a;">${title}</h1>
          <p style="font-size: 12px; color: #64748b;">Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      ${frameworkSections}

      <div class="footer">
        <span>Confidential - ${organization?.name || 'Organization'}</span>
        <span>Generated by AttestAI Compliance Platform</span>
      </div>

      <script>window.onload = () => setTimeout(() => window.print(), 500);</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Generate professional PDF for vendor risk data
 */
export function generateVendorRiskPDF(
  vendors: VendorExportData[],
  options: ExportOptions
): void {
  const { organization, title = 'Vendor Risk Assessment Report' } = options;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please allow popups.');
  }

  const getRiskColor = (tier: string) => {
    switch (tier) {
      case 'critical':
        return '#DC2626';
      case 'high':
        return '#EA580C';
      case 'medium':
        return '#CA8A04';
      case 'low':
        return '#16A34A';
      default:
        return '#6B7280';
    }
  };

  const logoHtml = organization?.logoUrl
    ? `<img src="${organization.logoUrl}" alt="${organization.name}" style="max-height: 40px; max-width: 160px; object-fit: contain;" crossorigin="anonymous" />`
    : `<div style="font-size: 20px; font-weight: 700; color: ${organization?.primaryColor || '#6366f1'};">${organization?.name || 'Vendor Report'}</div>`;

  const vendorRows = vendors
    .map(
      (v) => `
    <tr>
      <td style="padding: 14px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${v.name}</td>
      <td style="padding: 14px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${v.category}</td>
      <td style="padding: 14px; border-bottom: 1px solid #e2e8f0; text-align: center;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: ${getRiskColor(v.riskTier)}15; color: ${getRiskColor(v.riskTier)}; text-transform: uppercase;">${v.riskTier}</span>
      </td>
      <td style="padding: 14px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: ${v.overallScore >= 80 ? '#10B981' : v.overallScore >= 60 ? '#F59E0B' : '#EF4444'};">${v.overallScore}%</td>
      <td style="padding: 14px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">${v.lastAssessment ? new Date(v.lastAssessment).toLocaleDateString() : 'N/A'}</td>
      <td style="padding: 14px; border-bottom: 1px solid #e2e8f0; font-size: 12px;">${v.certifications.slice(0, 3).join(', ') || 'None'}</td>
    </tr>
  `
    )
    .join('');

  const summary = {
    total: vendors.length,
    critical: vendors.filter((v) => v.riskTier === 'critical').length,
    high: vendors.filter((v) => v.riskTier === 'high').length,
    medium: vendors.filter((v) => v.riskTier === 'medium').length,
    low: vendors.filter((v) => v.riskTier === 'low').length,
    avgScore: Math.round(vendors.reduce((sum, v) => sum + v.overallScore, 0) / vendors.length) || 0,
  };

  const primaryColor = organization?.primaryColor || '#6366f1';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page { size: A4 landscape; margin: 0.5in; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #1e293b;
          line-height: 1.5;
          padding: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          margin-bottom: 24px;
          border-bottom: 3px solid ${primaryColor};
        }
        .summary-cards {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }
        .summary-card {
          flex: 1;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          text-align: center;
        }
        .summary-value { font-size: 28px; font-weight: 700; }
        .summary-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #94a3b8;
        }
        @media print {
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoHtml}
        <div style="text-align: right;">
          <h1 style="font-size: 22px; color: #0f172a;">${title}</h1>
          <p style="font-size: 12px; color: #64748b;">Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div class="summary-cards">
        <div class="summary-card">
          <div class="summary-value" style="color: ${primaryColor};">${summary.total}</div>
          <div class="summary-label">Total Vendors</div>
        </div>
        <div class="summary-card">
          <div class="summary-value" style="color: #DC2626;">${summary.critical}</div>
          <div class="summary-label">Critical Risk</div>
        </div>
        <div class="summary-card">
          <div class="summary-value" style="color: #EA580C;">${summary.high}</div>
          <div class="summary-label">High Risk</div>
        </div>
        <div class="summary-card">
          <div class="summary-value" style="color: #CA8A04;">${summary.medium}</div>
          <div class="summary-label">Medium Risk</div>
        </div>
        <div class="summary-card">
          <div class="summary-value" style="color: #16A34A;">${summary.low}</div>
          <div class="summary-label">Low Risk</div>
        </div>
        <div class="summary-card">
          <div class="summary-value" style="color: ${summary.avgScore >= 80 ? '#10B981' : summary.avgScore >= 60 ? '#F59E0B' : '#EF4444'};">${summary.avgScore}%</div>
          <div class="summary-label">Avg Score</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 12px 14px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Vendor Name</th>
            <th style="padding: 12px 14px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Category</th>
            <th style="padding: 12px 14px; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Risk Tier</th>
            <th style="padding: 12px 14px; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Score</th>
            <th style="padding: 12px 14px; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Last Assessment</th>
            <th style="padding: 12px 14px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Certifications</th>
          </tr>
        </thead>
        <tbody>
          ${vendorRows}
        </tbody>
      </table>

      <div class="footer">
        <span>Confidential - ${organization?.name || 'Organization'}</span>
        <span>Generated by AttestAI Compliance Platform</span>
      </div>

      <script>window.onload = () => setTimeout(() => window.print(), 500);</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ============================================================================
// CSV EXPORT
// ============================================================================

/**
 * Convert data to CSV string
 */
function toCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: { key: keyof T; label: string }[]
): string {
  const headerRow = headers.map((h) => `"${h.label}"`).join(',');

  const rows = data.map((item) =>
    headers
      .map((h) => {
        const value = item[h.key];
        if (value === null || value === undefined) return '""';
        if (Array.isArray(value)) return `"${value.join('; ')}"`;
        const str = String(value).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );

  return [headerRow, ...rows].join('\n');
}

/**
 * Download CSV file
 */
function downloadCSV(content: string, filename: string): void {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export compliance report to CSV
 */
export function exportComplianceCSV(
  report: ComplianceReport,
  options: ExportOptions
): void {
  const { organization } = options;
  const filename = `${organization?.name || 'compliance'}_report_${new Date().toISOString().split('T')[0]}.csv`;

  const data = report.frameworkScores.map((fs) => ({
    framework: FRAMEWORK_CONFIG[fs.frameworkId]?.name || fs.frameworkId,
    score: fs.score,
    controlsAssessed: fs.controlsAssessed,
    controlsCompliant: fs.controlsCompliant,
    gaps: fs.gaps,
    complianceRate: Math.round((fs.controlsCompliant / fs.controlsAssessed) * 100) || 0,
  }));

  const headers: { key: keyof (typeof data)[0]; label: string }[] = [
    { key: 'framework', label: 'Framework' },
    { key: 'score', label: 'Score (%)' },
    { key: 'controlsAssessed', label: 'Controls Assessed' },
    { key: 'controlsCompliant', label: 'Controls Compliant' },
    { key: 'gaps', label: 'Gaps' },
    { key: 'complianceRate', label: 'Compliance Rate (%)' },
  ];

  const csv = toCSV(data, headers);
  downloadCSV(csv, filename);
}

/**
 * Export controls data to CSV
 */
export function exportControlsCSV(
  controls: ControlExportData[],
  options: ExportOptions
): void {
  const { organization } = options;
  const filename = `${organization?.name || 'controls'}_export_${new Date().toISOString().split('T')[0]}.csv`;

  const data = controls.map((c) => ({
    controlId: c.id,
    framework: FRAMEWORK_CONFIG[c.frameworkId]?.name || c.frameworkId,
    name: c.name,
    description: c.description,
    status: c.status.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    evidenceCount: c.evidenceCount,
    lastAssessed: c.lastAssessed || 'Not assessed',
    assignee: c.assignee || 'Unassigned',
    notes: c.notes || '',
  }));

  const headers: { key: keyof (typeof data)[0]; label: string }[] = [
    { key: 'controlId', label: 'Control ID' },
    { key: 'framework', label: 'Framework' },
    { key: 'name', label: 'Control Name' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
    { key: 'evidenceCount', label: 'Evidence Count' },
    { key: 'lastAssessed', label: 'Last Assessed' },
    { key: 'assignee', label: 'Assignee' },
    { key: 'notes', label: 'Notes' },
  ];

  const csv = toCSV(data, headers);
  downloadCSV(csv, filename);
}

/**
 * Export vendor risk data to CSV
 */
export function exportVendorRiskCSV(
  vendors: VendorExportData[],
  options: ExportOptions
): void {
  const { organization } = options;
  const filename = `${organization?.name || 'vendor'}_risk_export_${new Date().toISOString().split('T')[0]}.csv`;

  const data = vendors.map((v) => ({
    name: v.name,
    category: v.category,
    riskTier: v.riskTier.toUpperCase(),
    overallScore: v.overallScore,
    status: v.status,
    lastAssessment: v.lastAssessment || 'Not assessed',
    certifications: v.certifications.join('; '),
  }));

  const headers: { key: keyof (typeof data)[0]; label: string }[] = [
    { key: 'name', label: 'Vendor Name' },
    { key: 'category', label: 'Category' },
    { key: 'riskTier', label: 'Risk Tier' },
    { key: 'overallScore', label: 'Score (%)' },
    { key: 'status', label: 'Status' },
    { key: 'lastAssessment', label: 'Last Assessment' },
    { key: 'certifications', label: 'Certifications' },
  ];

  const csv = toCSV(data, headers);
  downloadCSV(csv, filename);
}

/**
 * Export evidence data to CSV
 */
export function exportEvidenceCSV(
  evidence: EvidenceExportData[],
  options: ExportOptions
): void {
  const { organization } = options;
  const filename = `${organization?.name || 'evidence'}_export_${new Date().toISOString().split('T')[0]}.csv`;

  const data = evidence.map((e) => ({
    name: e.name,
    type: e.type,
    framework: e.framework,
    controlId: e.controlId,
    uploadedAt: e.uploadedAt,
    uploadedBy: e.uploadedBy,
    fileSize: e.fileSize,
    status: e.status,
  }));

  const headers: { key: keyof (typeof data)[0]; label: string }[] = [
    { key: 'name', label: 'Evidence Name' },
    { key: 'type', label: 'Type' },
    { key: 'framework', label: 'Framework' },
    { key: 'controlId', label: 'Control ID' },
    { key: 'uploadedAt', label: 'Uploaded At' },
    { key: 'uploadedBy', label: 'Uploaded By' },
    { key: 'fileSize', label: 'File Size' },
    { key: 'status', label: 'Status' },
  ];

  const csv = toCSV(data, headers);
  downloadCSV(csv, filename);
}

/**
 * Generic data export to CSV
 */
export function exportGenericCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: { key: keyof T; label: string }[],
  filename: string
): void {
  const csv = toCSV(data, headers);
  downloadCSV(csv, filename);
}

// ============================================================================
// EXPORT SERVICE SINGLETON
// ============================================================================

export const exportService = {
  // PDF exports
  compliancePDF: generateCompliancePDF,
  controlsPDF: generateControlsPDF,
  vendorRiskPDF: generateVendorRiskPDF,

  // CSV exports
  complianceCSV: exportComplianceCSV,
  controlsCSV: exportControlsCSV,
  vendorRiskCSV: exportVendorRiskCSV,
  evidenceCSV: exportEvidenceCSV,
  genericCSV: exportGenericCSV,
};

export default exportService;
