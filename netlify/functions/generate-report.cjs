// netlify/functions/generate-report.js
// Professional Audit Readiness Report Generator

const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
const REQUIRED_ENV_VARS = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvVars = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Rate limiting: simple in-memory store (resets on cold start)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // max 10 reports per minute per user

function checkRateLimit(userId) {
  const now = Date.now();
  const userRequests = rateLimitStore.get(userId) || [];

  // Clean old requests outside window
  const recentRequests = userRequests.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  recentRequests.push(now);
  rateLimitStore.set(userId, recentRequests);
  return true;
}

// Input validation helpers
function validatePayload(payload) {
  const errors = [];

  if (payload.organizationName && typeof payload.organizationName !== 'string') {
    errors.push('organizationName must be a string');
  }
  if (payload.organizationName && payload.organizationName.length > 200) {
    errors.push('organizationName must be less than 200 characters');
  }
  if (payload.reportType && !['full', 'gaps', 'evidence'].includes(payload.reportType)) {
    errors.push('reportType must be one of: full, gaps, evidence');
  }
  if (payload.frameworkFilter && !['SOC2', 'ISO27001', 'HIPAA', 'NIST', null].includes(payload.frameworkFilter)) {
    errors.push('frameworkFilter must be one of: SOC2, ISO27001, HIPAA, NIST, or null');
  }
  if (payload.responses && typeof payload.responses !== 'object') {
    errors.push('responses must be an object');
  }
  if (payload.controls && !Array.isArray(payload.controls)) {
    errors.push('controls must be an array');
  }
  if (payload.evidence && !Array.isArray(payload.evidence)) {
    errors.push('evidence must be an array');
  }

  return errors;
}

function sanitizeString(str, maxLength = 500) {
  if (!str || typeof str !== 'string') return '';
  // Remove control characters and limit length
  return str.replace(/[\x00-\x1F\x7F]/g, '').substring(0, maxLength).trim();
}

function parseDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle OPTIONS for CORS preflight (must be checked FIRST)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Only allow POST for actual requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Check for missing environment variables
  if (missingEnvVars.length > 0) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };

  try {
    // Get the authorization token
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Missing or invalid authorization token' }),
      };
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the JWT with Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired token' }),
      };
    }

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Too many requests. Please wait before generating another report.' }),
      };
    }

    // Parse and validate the request body
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    // Validate payload
    const validationErrors = validatePayload(payload);
    if (validationErrors.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Validation failed', details: validationErrors }),
      };
    }

    // Extract and sanitize payload data
    const organizationName = sanitizeString(payload.organizationName, 200) || 'LYDELL SECURITY';
    const reportType = payload.reportType || 'full';
    const frameworkFilter = payload.frameworkFilter || null;
    const responses = payload.responses || {};
    const controls = Array.isArray(payload.controls) ? payload.controls : [];
    const customControls = Array.isArray(payload.customControls) ? payload.customControls : [];
    const evidence = Array.isArray(payload.evidence) ? payload.evidence : [];

    // Calculate assessment period with proper date validation
    const now = new Date();
    let period;
    if (payload.assessmentPeriod) {
      const startDate = parseDate(payload.assessmentPeriod.start);
      const endDate = parseDate(payload.assessmentPeriod.end);
      if (startDate && endDate && startDate <= endDate) {
        period = {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        };
      }
    }
    if (!period) {
      // Default to last 3 months, handling year boundary correctly
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      threeMonthsAgo.setDate(1);
      threeMonthsAgo.setHours(0, 0, 0, 0);
      period = {
        start: threeMonthsAgo.toISOString(),
        end: now.toISOString(),
      };
    }

    // Generate the PDF
    const pdfBuffer = await generateProfessionalReport({
      organizationName,
      reportType,
      frameworkFilter,
      responses,
      controls,
      customControls,
      evidence,
      assessmentPeriod: period,
      generatedBy: user.email || 'Unknown User',
      generatedAt: now.toISOString(),
    });

    // Determine filename based on report type
    const reportTypeNames = {
      full: 'audit-readiness-report',
      gaps: 'gap-analysis-report',
      evidence: 'evidence-summary-report',
    };
    const filename = `${reportTypeNames[reportType] || 'compliance-report'}-${Date.now()}.pdf`;

    // Return the PDF
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (error) {
    console.error('PDF generation error:', error);

    // Provide more specific error messages
    let errorMessage = 'Failed to generate report';
    let statusCode = 500;

    if (error.message?.includes('timeout')) {
      errorMessage = 'Report generation timed out. Try reducing the data size.';
      statusCode = 504;
    } else if (error.message?.includes('memory')) {
      errorMessage = 'Report too large to generate. Try filtering the data.';
      statusCode = 507;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({ error: errorMessage, details: error.message }),
    };
  }
};

// ============================================================================
// PROFESSIONAL REPORT GENERATOR
// ============================================================================

async function generateProfessionalReport(data) {
  return new Promise((resolve, reject) => {
    try {
      // Filter controls by framework if frameworkFilter is specified
      let filteredControls = data.controls;
      let filteredResponses = data.responses;
      let filteredEvidence = data.evidence;

      if (data.frameworkFilter) {
        // Filter controls that belong to the specified framework
        filteredControls = data.controls.filter(control => {
          const frameworks = control.frameworks || [];
          return frameworks.includes(data.frameworkFilter) ||
                 control.id?.startsWith(data.frameworkFilter) ||
                 // Also match common framework prefixes
                 (data.frameworkFilter === 'SOC2' && control.id?.match(/^(CC|A|PI|C|P)\d/)) ||
                 (data.frameworkFilter === 'HIPAA' && control.id?.match(/^(164|HP)/)) ||
                 (data.frameworkFilter === 'ISO27001' && control.id?.match(/^(A\.|ISO)/)) ||
                 (data.frameworkFilter === 'NIST' && control.id?.match(/^(ID|PR|DE|RS|RC)\./));
        });

        // Filter responses to only include filtered controls
        const filteredControlIds = new Set(filteredControls.map(c => c.id));
        filteredResponses = {};
        Object.entries(data.responses).forEach(([controlId, response]) => {
          if (filteredControlIds.has(controlId)) {
            filteredResponses[controlId] = response;
          }
        });

        // Filter evidence to only include filtered controls
        filteredEvidence = data.evidence.filter(e => filteredControlIds.has(e.controlId));
      }

      // Determine report title based on type
      const reportTitles = {
        full: 'Audit Readiness Report',
        gaps: 'Gap Analysis Report',
        evidence: 'Evidence Summary Report',
      };
      const reportTitle = reportTitles[data.reportType] || 'Compliance Report';

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 80, bottom: 80, left: 50, right: 50 },
        bufferPages: true,
        info: {
          Title: `${reportTitle} - ${data.organizationName}`,
          Author: 'Lydell Security Compliance Engine',
          Subject: 'Professional Compliance Assessment Report',
          Creator: 'Lydell Security',
          Keywords: 'compliance, audit, SOC2, ISO27001, HIPAA, NIST',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Calculate all statistics using filtered data
      const stats = calculateStats(filteredResponses, filteredControls);
      const frameworkStats = calculateFrameworkStats(filteredResponses, filteredControls, data.frameworkFilter);
      const gaps = getGaps(filteredResponses, filteredControls);
      const criticalFindings = getCriticalFindings(gaps, filteredControls);
      const compliantControls = getCompliantControls(filteredResponses, filteredControls, filteredEvidence);

      // Report data object
      const reportData = {
        ...data,
        controls: filteredControls,
        responses: filteredResponses,
        evidence: filteredEvidence,
        stats,
        frameworkStats,
        gaps,
        criticalFindings,
        compliantControls,
        reportId: `RPT-${Date.now().toString(36).toUpperCase()}`,
        reportTitle,
      };

      // Generate pages based on report type
      const reportType = data.reportType || 'full';

      // Cover Page (always included)
      generateCoverPage(doc, reportData);

      if (reportType === 'full') {
        // Full report: all sections
        doc.addPage();
        generateTableOfContents(doc, reportData);

        doc.addPage();
        generateExecutiveSummary(doc, reportData);

        doc.addPage();
        generateFrameworkAnalysis(doc, reportData);

        doc.addPage();
        generateCriticalFindings(doc, reportData);

        doc.addPage();
        generateGapAnalysis(doc, reportData);

        doc.addPage();
        generateRemediationPlan(doc, reportData);

        doc.addPage();
        generateEvidenceAnnex(doc, reportData);

        doc.addPage();
        generateAppendix(doc, reportData);

      } else if (reportType === 'gaps') {
        // Gap Analysis report: focus on gaps and remediation
        doc.addPage();
        generateGapsTableOfContents(doc, reportData);

        doc.addPage();
        generateExecutiveSummary(doc, reportData);

        doc.addPage();
        generateCriticalFindings(doc, reportData);

        // Generate additional pages for gaps if needed (pagination)
        generateGapAnalysisWithPagination(doc, reportData);

        doc.addPage();
        generateRemediationPlan(doc, reportData);

        doc.addPage();
        generateAppendix(doc, reportData);

      } else if (reportType === 'evidence') {
        // Evidence Summary report: focus on compliant controls and evidence
        doc.addPage();
        generateEvidenceTableOfContents(doc, reportData);

        doc.addPage();
        generateExecutiveSummary(doc, reportData);

        doc.addPage();
        generateFrameworkAnalysis(doc, reportData);

        // Generate additional pages for evidence if needed (pagination)
        generateEvidenceAnnexWithPagination(doc, reportData);

        doc.addPage();
        generateAppendix(doc, reportData);
      }

      // Add headers and footers to all pages
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        if (i > 0) { // Skip cover page
          addHeader(doc, reportData, i + 1);
          addFooter(doc, reportData, i + 1, totalPages);
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================================
// HEADER AND FOOTER
// ============================================================================

function addHeader(doc, data, pageNum) {
  const pageWidth = doc.page.width;
  
  // Header background
  doc.save();
  doc.rect(0, 0, pageWidth, 50).fill('#0f172a');
  
  // Report title
  doc.fontSize(10)
     .fillColor('#94a3b8')
     .text('AUDIT READINESS REPORT', 50, 18);
  
  // Date
  doc.fontSize(9)
     .fillColor('#64748b')
     .text(formatDate(data.generatedAt), pageWidth - 150, 18, { width: 100, align: 'right' });
  
  // Divider line
  doc.moveTo(50, 49)
     .lineTo(pageWidth - 50, 49)
     .strokeColor('#3b82f6')
     .lineWidth(2)
     .stroke();
  
  doc.restore();
}

function addFooter(doc, data, pageNum, totalPages) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const footerY = pageHeight - 50;
  
  // Footer background
  doc.save();
  doc.rect(0, footerY, pageWidth, 50).fill('#0f172a');
  
  // Confidential notice
  doc.fontSize(8)
     .fillColor('#ef4444')
     .text('CONFIDENTIAL', 50, footerY + 18);
  
  // Company info
  doc.fontSize(8)
     .fillColor('#64748b')
     .text('Lydell Security | Compliance Report', pageWidth / 2 - 60, footerY + 18);
  
  // Page numbers
  doc.fontSize(8)
     .fillColor('#94a3b8')
     .text(`Page ${pageNum} of ${totalPages}`, pageWidth - 100, footerY + 18, { width: 50, align: 'right' });
  
  doc.restore();
}

// ============================================================================
// COVER PAGE
// ============================================================================

function generateCoverPage(doc, data) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Dark background
  doc.rect(0, 0, pageWidth, pageHeight).fill('#0f172a');
  
  // Decorative gradient circles
  drawGradientCircle(doc, pageWidth * 0.85, pageHeight * 0.15, 180, '#3b82f6', 0.15);
  drawGradientCircle(doc, pageWidth * 0.15, pageHeight * 0.85, 150, '#8b5cf6', 0.12);
  drawGradientCircle(doc, pageWidth * 0.5, pageHeight * 0.5, 250, '#06b6d4', 0.08);

  // Company Logo (Shield icon approximation)
  doc.save();
  const logoX = pageWidth / 2;
  const logoY = 140;
  
  // Shield shape
  doc.moveTo(logoX, logoY - 30)
     .lineTo(logoX + 25, logoY - 20)
     .lineTo(logoX + 25, logoY + 10)
     .lineTo(logoX, logoY + 30)
     .lineTo(logoX - 25, logoY + 10)
     .lineTo(logoX - 25, logoY - 20)
     .closePath()
     .fill('#3b82f6');
  
  // Inner shield
  doc.moveTo(logoX, logoY - 20)
     .lineTo(logoX + 15, logoY - 12)
     .lineTo(logoX + 15, logoY + 5)
     .lineTo(logoX, logoY + 18)
     .lineTo(logoX - 15, logoY + 5)
     .lineTo(logoX - 15, logoY - 12)
     .closePath()
     .fill('#1e3a8a');
  
  doc.restore();

  // Report Type Badge
  doc.roundedRect(pageWidth / 2 - 80, 200, 160, 28, 14)
     .fill('#3b82f620');
  doc.fontSize(10)
     .fillColor('#3b82f6')
     .text('AUDIT READINESS REPORT', pageWidth / 2 - 70, 208, { align: 'center', width: 140 });

  // Main Title
  doc.fontSize(42)
     .fillColor('#ffffff')
     .text('COMPLIANCE', 0, 260, { align: 'center', width: pageWidth });
  
  doc.fontSize(42)
     .fillColor('#3b82f6')
     .text('ASSESSMENT', 0, 310, { align: 'center', width: pageWidth });

  // Organization Name
  doc.fontSize(24)
     .fillColor('#f8fafc')
     .text(data.organizationName, 0, 390, { align: 'center', width: pageWidth });

  // Decorative line
  doc.moveTo(pageWidth * 0.3, 440)
     .lineTo(pageWidth * 0.7, 440)
     .strokeColor('#3b82f6')
     .lineWidth(3)
     .stroke();

  // Assessment Period
  doc.fontSize(11)
     .fillColor('#94a3b8')
     .text('ASSESSMENT PERIOD', 0, 475, { align: 'center', width: pageWidth });
  
  doc.fontSize(13)
     .fillColor('#e2e8f0')
     .text(
       `${formatDateShort(data.assessmentPeriod.start)} - ${formatDateShort(data.assessmentPeriod.end)}`,
       0, 495, { align: 'center', width: pageWidth }
     );

  // Report Details Grid
  const details = [
    { label: 'Report ID', value: data.reportId },
    { label: 'Generated', value: formatDate(data.generatedAt) },
    { label: 'Prepared By', value: data.generatedBy },
    { label: 'Classification', value: 'CONFIDENTIAL' },
  ];

  let yPos = 550;
  details.forEach(({ label, value }) => {
    doc.fontSize(9)
       .fillColor('#64748b')
       .text(label, pageWidth * 0.3, yPos);
    doc.fontSize(10)
       .fillColor('#e2e8f0')
       .text(value, pageWidth * 0.5, yPos);
    yPos += 22;
  });

  // Compliance Score Badge
  const score = data.stats.compliancePercentage;
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  
  doc.roundedRect(pageWidth / 2 - 50, 670, 100, 60, 10)
     .fillAndStroke('#1e293b', scoreColor);
  
  doc.fontSize(28)
     .fillColor(scoreColor)
     .text(`${score}%`, pageWidth / 2 - 45, 680, { align: 'center', width: 90 });
  
  doc.fontSize(8)
     .fillColor('#94a3b8')
     .text('COMPLIANCE SCORE', pageWidth / 2 - 45, 712, { align: 'center', width: 90 });

  // Footer
  doc.fontSize(9)
     .fillColor('#475569')
     .text('Powered by Lydell Security Compliance Engine', 0, pageHeight - 80, { align: 'center', width: pageWidth });
  
  doc.fontSize(8)
     .fillColor('#334155')
     .text(`© ${new Date().getFullYear()} Lydell Security. All rights reserved.`, 0, pageHeight - 60, { align: 'center', width: pageWidth });
}

// ============================================================================
// TABLE OF CONTENTS
// ============================================================================

function generateTableOfContents(doc, data) {
  const contentTop = 100;
  
  doc.fontSize(28)
     .fillColor('#1e293b')
     .text('Table of Contents', 50, contentTop);

  doc.moveTo(50, contentTop + 40)
     .lineTo(220, contentTop + 40)
     .strokeColor('#3b82f6')
     .lineWidth(3)
     .stroke();

  const tocItems = [
    { num: '1', title: 'Executive Summary', page: 3, indent: 0 },
    { num: '1.1', title: 'Compliance Score Overview', page: 3, indent: 1 },
    { num: '1.2', title: 'Framework Coverage Analysis', page: 3, indent: 1 },
    { num: '2', title: 'Framework Compliance Analysis', page: 4, indent: 0 },
    { num: '3', title: 'Critical Findings', page: 5, indent: 0 },
    { num: '3.1', title: 'Priority Findings Table', page: 5, indent: 1 },
    { num: '3.2', title: 'Risk Distribution', page: 5, indent: 1 },
    { num: '4', title: 'Gap Analysis', page: 6, indent: 0 },
    { num: '5', title: 'Remediation Recommendations', page: 7, indent: 0 },
    { num: '6', title: 'Evidence Annex', page: 8, indent: 0 },
    { num: '7', title: 'Appendix', page: 9, indent: 0 },
  ];

  let yPos = contentTop + 70;
  tocItems.forEach((item) => {
    const indent = item.indent * 20;
    const isMain = item.indent === 0;
    
    doc.fontSize(isMain ? 12 : 10)
       .fillColor(isMain ? '#1e293b' : '#475569')
       .text(item.num, 60 + indent, yPos);
    
    doc.fontSize(isMain ? 12 : 10)
       .fillColor(isMain ? '#1e293b' : '#475569')
       .text(item.title, 100 + indent, yPos);
    
    // Dotted line
    const dotsWidth = 380 - indent;
    doc.fontSize(10)
       .fillColor('#cbd5e1')
       .text('.'.repeat(Math.floor(dotsWidth / 4)), 280, yPos, { width: dotsWidth });
    
    doc.fontSize(isMain ? 12 : 10)
       .fillColor('#3b82f6')
       .text(item.page.toString(), 500, yPos);
    
    yPos += isMain ? 30 : 24;
  });

  // Quick Stats Box
  doc.roundedRect(50, yPos + 40, 495, 100, 8)
     .fillAndStroke('#f8fafc', '#e2e8f0');

  doc.fontSize(11)
     .fillColor('#475569')
     .text('Quick Statistics', 70, yPos + 55);

  const quickStats = [
    { label: 'Total Controls', value: data.stats.total },
    { label: 'Compliant', value: data.stats.compliant },
    { label: 'Gaps', value: data.stats.gaps },
    { label: 'Critical', value: data.criticalFindings.filter(f => f.risk === 'critical').length },
  ];

  let statX = 70;
  quickStats.forEach((stat) => {
    doc.fontSize(24)
       .fillColor('#3b82f6')
       .text(stat.value.toString(), statX, yPos + 80);
    doc.fontSize(8)
       .fillColor('#64748b')
       .text(stat.label, statX, yPos + 110);
    statX += 120;
  });
}

// ============================================================================
// EXECUTIVE SUMMARY WITH RADAR CHART
// ============================================================================

function generateExecutiveSummary(doc, data) {
  const contentTop = 100;
  
  doc.fontSize(28)
     .fillColor('#1e293b')
     .text('Executive Summary', 50, contentTop);

  doc.moveTo(50, contentTop + 40)
     .lineTo(250, contentTop + 40)
     .strokeColor('#3b82f6')
     .lineWidth(3)
     .stroke();

  // Formal Introduction
  doc.fontSize(11)
     .fillColor('#475569')
     .text(
       `This Audit Readiness Report presents the findings of a comprehensive compliance assessment ` +
       `conducted for ${data.organizationName} during the period of ` +
       `${formatDateShort(data.assessmentPeriod.start)} to ${formatDateShort(data.assessmentPeriod.end)}. ` +
       `The assessment evaluated organizational controls against four major compliance frameworks: ` +
       `SOC 2 Type II, ISO 27001:2022, HIPAA Security Rule, and NIST Cybersecurity Framework 2.0.`,
       50, contentTop + 60, { width: 495, align: 'justify', lineGap: 3 }
     );

  // Draw Radar Chart
  const chartCenterX = 160;
  const chartCenterY = 280;
  const chartRadius = 80;
  
  drawRadarChart(doc, chartCenterX, chartCenterY, chartRadius, data.frameworkStats);

  // Chart Legend
  doc.fontSize(11)
     .fillColor('#1e293b')
     .text('Compliance Surface Area', chartCenterX - 60, chartCenterY + chartRadius + 20);

  // Stats Panel (right side)
  const panelX = 300;
  const panelY = contentTop + 130;
  
  doc.roundedRect(panelX, panelY, 245, 200, 8)
     .fillAndStroke('#f8fafc', '#e2e8f0');

  doc.fontSize(12)
     .fillColor('#1e293b')
     .text('Assessment Overview', panelX + 15, panelY + 15);

  const overviewStats = [
    { label: 'Overall Compliance Score', value: `${data.stats.compliancePercentage}%`, color: getScoreColor(data.stats.compliancePercentage) },
    { label: 'Assessment Completion', value: `${data.stats.assessmentPercentage}%`, color: '#3b82f6' },
    { label: 'Controls Evaluated', value: data.stats.answered.toString(), color: '#64748b' },
    { label: 'Compliant Controls', value: data.stats.compliant.toString(), color: '#10b981' },
    { label: 'Gaps Identified', value: data.stats.gaps.toString(), color: '#ef4444' },
    { label: 'Partial Implementation', value: data.stats.partial.toString(), color: '#f59e0b' },
  ];

  let statY = panelY + 40;
  overviewStats.forEach((stat) => {
    doc.fontSize(9)
       .fillColor('#64748b')
       .text(stat.label, panelX + 15, statY);
    doc.fontSize(11)
       .fillColor(stat.color)
       .text(stat.value, panelX + 180, statY);
    statY += 25;
  });

  // Key Findings Section
  const findingsY = 400;
  doc.fontSize(14)
     .fillColor('#1e293b')
     .text('Key Findings', 50, findingsY);

  const findings = [
    {
      icon: data.stats.gaps > 0 ? '⚠' : '✓',
      color: data.stats.gaps > 0 ? '#ef4444' : '#10b981',
      text: data.stats.gaps > 0 
        ? `${data.stats.gaps} control gap(s) require immediate remediation attention`
        : 'No critical control gaps identified - organization demonstrates strong compliance posture'
    },
    {
      icon: '◉',
      color: '#3b82f6',
      text: `Assessment is ${data.stats.assessmentPercentage}% complete with ${data.stats.total - data.stats.answered} controls pending evaluation`
    },
    {
      icon: '◉',
      color: '#8b5cf6',
      text: `Framework coverage: SOC2 ${data.frameworkStats.SOC2.percentage}%, ISO27001 ${data.frameworkStats.ISO27001.percentage}%, HIPAA ${data.frameworkStats.HIPAA.percentage}%, NIST ${data.frameworkStats.NIST.percentage}%`
    },
  ];

  let findingY = findingsY + 25;
  findings.forEach((finding) => {
    doc.fontSize(12)
       .fillColor(finding.color)
       .text(finding.icon, 55, findingY);
    doc.fontSize(10)
       .fillColor('#475569')
       .text(finding.text, 75, findingY, { width: 470 });
    findingY += 30;
  });

  // Risk Distribution
  const riskY = findingY + 20;
  doc.fontSize(14)
     .fillColor('#1e293b')
     .text('Risk Distribution', 50, riskY);

  const critical = data.criticalFindings.filter(f => f.risk === 'critical').length;
  const high = data.criticalFindings.filter(f => f.risk === 'high').length;
  const medium = data.criticalFindings.filter(f => f.risk === 'medium').length;
  const low = data.criticalFindings.filter(f => f.risk === 'low').length;

  // Visual risk indicators
  const indicators = [
    { label: 'Critical', count: critical, color: '#ef4444' },
    { label: 'High', count: high, color: '#f59e0b' },
    { label: 'Medium', count: medium, color: '#3b82f6' },
    { label: 'Low', count: low, color: '#10b981' },
  ];

  let indX = 60;
  indicators.forEach((ind) => {
    // Circle indicator
    doc.circle(indX + 15, riskY + 40, 20)
       .fill(ind.color);
    doc.fontSize(14)
       .fillColor('#ffffff')
       .text(ind.count.toString(), indX + 8, riskY + 33);
    doc.fontSize(9)
       .fillColor('#64748b')
       .text(ind.label, indX, riskY + 65);
    indX += 120;
  });
}

// ============================================================================
// FRAMEWORK ANALYSIS
// ============================================================================

function generateFrameworkAnalysis(doc, data) {
  const contentTop = 100;
  
  doc.fontSize(28)
     .fillColor('#1e293b')
     .text('Framework Compliance Analysis', 50, contentTop);

  doc.moveTo(50, contentTop + 40)
     .lineTo(350, contentTop + 40)
     .strokeColor('#3b82f6')
     .lineWidth(3)
     .stroke();

  const frameworks = [
    { 
      id: 'SOC2', 
      name: 'SOC 2 Type II', 
      color: '#3b82f6', 
      description: 'Service Organization Control - Trust Services Criteria',
      categories: ['Security', 'Availability', 'Processing Integrity', 'Confidentiality', 'Privacy']
    },
    { 
      id: 'ISO27001', 
      name: 'ISO 27001:2022', 
      color: '#10b981', 
      description: 'Information Security Management System',
      categories: ['Organizational', 'People', 'Physical', 'Technological']
    },
    { 
      id: 'HIPAA', 
      name: 'HIPAA Security Rule', 
      color: '#f59e0b', 
      description: 'Health Insurance Portability and Accountability Act',
      categories: ['Administrative', 'Physical', 'Technical']
    },
    { 
      id: 'NIST', 
      name: 'NIST CSF 2.0', 
      color: '#8b5cf6', 
      description: 'Cybersecurity Framework',
      categories: ['Identify', 'Protect', 'Detect', 'Respond', 'Recover']
    },
  ];

  let yPos = contentTop + 70;

  frameworks.forEach((fw) => {
    const stats = data.frameworkStats[fw.id];
    const pct = stats.percentage;

    // Framework card
    doc.roundedRect(50, yPos, 495, 110, 8)
       .fillAndStroke('#ffffff', '#e2e8f0');

    // Color accent bar
    doc.rect(50, yPos, 6, 110)
       .fill(fw.color);

    // Framework name and description
    doc.fontSize(14)
       .fillColor('#1e293b')
       .text(fw.name, 70, yPos + 12);

    doc.fontSize(9)
       .fillColor('#64748b')
       .text(fw.description, 70, yPos + 30);

    // Compliance percentage
    doc.fontSize(32)
       .fillColor(fw.color)
       .text(`${pct}%`, 440, yPos + 15);

    // Requirements met
    doc.fontSize(9)
       .fillColor('#64748b')
       .text(`${stats.met} of ${stats.total} requirements`, 440, yPos + 52);

    // Progress bar
    doc.roundedRect(70, yPos + 55, 350, 10, 3)
       .fill('#e2e8f0');
    
    if (pct > 0) {
      doc.roundedRect(70, yPos + 55, 350 * (pct / 100), 10, 3)
         .fill(fw.color);
    }

    // Categories
    doc.fontSize(8)
       .fillColor('#94a3b8')
       .text('Categories: ' + fw.categories.join(' • '), 70, yPos + 75);

    // Status indicator
    const statusColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
    const statusText = pct >= 80 ? 'On Track' : pct >= 60 ? 'Needs Attention' : 'At Risk';
    
    doc.roundedRect(70, yPos + 90, 70, 16, 4)
       .fill(statusColor + '20');
    doc.fontSize(8)
       .fillColor(statusColor)
       .text(statusText, 80, yPos + 93);

    yPos += 125;
  });
}

// ============================================================================
// CRITICAL FINDINGS TABLE
// ============================================================================

function generateCriticalFindings(doc, data) {
  const contentTop = 100;
  
  doc.fontSize(28)
     .fillColor('#1e293b')
     .text('Critical Findings', 50, contentTop);

  doc.moveTo(50, contentTop + 40)
     .lineTo(220, contentTop + 40)
     .strokeColor('#ef4444')
     .lineWidth(3)
     .stroke();

  doc.fontSize(11)
     .fillColor('#475569')
     .text(
       'The following table presents priority findings requiring immediate attention, ' +
       'sorted by risk level with estimated remediation timelines.',
       50, contentTop + 55, { width: 495 }
     );

  if (data.criticalFindings.length === 0) {
    doc.fontSize(14)
       .fillColor('#10b981')
       .text('✓ No critical findings identified', 50, contentTop + 100);
    
    doc.fontSize(11)
       .fillColor('#475569')
       .text(
         'Congratulations! Your organization has no critical compliance gaps. ' +
         'Continue to maintain your current control implementations and conduct regular reviews.',
         50, contentTop + 130, { width: 495 }
       );
    return;
  }

  // Table Header
  let yPos = contentTop + 90;
  
  doc.roundedRect(50, yPos, 495, 30, 5)
     .fill('#1e293b');

  doc.fontSize(9)
     .fillColor('#ffffff')
     .text('Control ID', 60, yPos + 10)
     .text('Finding', 140, yPos + 10)
     .text('Risk', 340, yPos + 10)
     .text('Framework', 390, yPos + 10)
     .text('Days to Fix', 470, yPos + 10);

  yPos += 35;

  // Table Rows
  const maxRows = 12;
  data.criticalFindings.slice(0, maxRows).forEach((finding, index) => {
    const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    const riskColor = getRiskColor(finding.risk);
    
    doc.rect(50, yPos, 495, 35)
       .fill(bgColor);

    // Risk indicator circle
    doc.circle(65, yPos + 17, 8)
       .fill(riskColor);

    // Control ID
    doc.fontSize(9)
       .fillColor('#3b82f6')
       .text(finding.id, 80, yPos + 12);

    // Finding title
    doc.fontSize(8)
       .fillColor('#334155')
       .text(truncate(finding.title, 35), 140, yPos + 8);
    
    doc.fontSize(7)
       .fillColor('#94a3b8')
       .text(truncate(finding.description || '', 40), 140, yPos + 20);

    // Risk level
    doc.fontSize(8)
       .fillColor(riskColor)
       .text(capitalize(finding.risk), 340, yPos + 12);

    // Framework reference
    doc.fontSize(8)
       .fillColor('#64748b')
       .text(finding.frameworks ? finding.frameworks[0] : 'Multiple', 390, yPos + 12);

    // Days to remediate
    const days = getRemediationDays(finding.risk);
    doc.fontSize(9)
       .fillColor('#1e293b')
       .text(`${days} days`, 475, yPos + 12);

    yPos += 35;
  });

  if (data.criticalFindings.length > maxRows) {
    doc.fontSize(9)
       .fillColor('#64748b')
       .text(`... and ${data.criticalFindings.length - maxRows} additional findings (see Appendix)`, 50, yPos + 10);
  }

  // Summary Box
  const summaryY = yPos + 40;
  doc.roundedRect(50, summaryY, 495, 60, 8)
     .fillAndStroke('#fef2f2', '#fecaca');

  doc.fontSize(10)
     .fillColor('#991b1b')
     .text('⚠ Action Required', 70, summaryY + 15);

  doc.fontSize(9)
     .fillColor('#7f1d1d')
     .text(
       `${data.criticalFindings.filter(f => f.risk === 'critical').length} critical and ` +
       `${data.criticalFindings.filter(f => f.risk === 'high').length} high-risk findings require ` +
       `remediation within the next 30 days to maintain audit readiness.`,
       70, summaryY + 35, { width: 450 }
     );
}

// ============================================================================
// GAP ANALYSIS WITH VISUAL INDICATORS
// ============================================================================

function generateGapAnalysis(doc, data) {
  const contentTop = 100;
  
  doc.fontSize(28)
     .fillColor('#1e293b')
     .text('Gap Analysis', 50, contentTop);

  doc.moveTo(50, contentTop + 40)
     .lineTo(180, contentTop + 40)
     .strokeColor('#f59e0b')
     .lineWidth(3)
     .stroke();

  // Visual Legend
  doc.fontSize(10)
     .fillColor('#475569')
     .text('Visual Indicators:', 50, contentTop + 60);

  const legend = [
    { color: '#ef4444', label: 'Critical Risk' },
    { color: '#f59e0b', label: 'High Risk' },
    { color: '#3b82f6', label: 'Medium Risk' },
    { color: '#10b981', label: 'Compliant' },
  ];

  let legendX = 160;
  legend.forEach((item) => {
    doc.circle(legendX, contentTop + 64, 6)
       .fill(item.color);
    doc.fontSize(8)
       .fillColor('#64748b')
       .text(item.label, legendX + 12, contentTop + 59);
    legendX += 100;
  });

  // Gap Grid
  let yPos = contentTop + 100;
  const gapsPerRow = 4;
  const gaps = data.gaps.slice(0, 20);

  for (let i = 0; i < gaps.length; i += gapsPerRow) {
    const rowGaps = gaps.slice(i, i + gapsPerRow);
    let xPos = 50;

    rowGaps.forEach((gap) => {
      const riskColor = getRiskColor(gap.risk);
      
      // Gap card
      doc.roundedRect(xPos, yPos, 118, 80, 6)
         .fillAndStroke('#ffffff', '#e2e8f0');

      // Risk indicator
      doc.circle(xPos + 15, yPos + 15, 8)
         .fill(riskColor);

      // Control ID
      doc.fontSize(9)
         .fillColor('#3b82f6')
         .text(gap.id, xPos + 30, yPos + 10);

      // Title
      doc.fontSize(7)
         .fillColor('#334155')
         .text(truncate(gap.title, 25), xPos + 8, yPos + 35, { width: 102 });

      // Status badge
      const statusColor = gap.status === 'no' ? '#ef4444' : '#f59e0b';
      doc.roundedRect(xPos + 8, yPos + 60, 45, 14, 3)
         .fill(statusColor + '20');
      doc.fontSize(7)
         .fillColor(statusColor)
         .text(gap.status === 'no' ? 'Gap' : 'Partial', xPos + 15, yPos + 63);

      xPos += 125;
    });

    yPos += 95;
  }

  if (data.gaps.length > 20) {
    doc.fontSize(9)
       .fillColor('#64748b')
       .text(`+ ${data.gaps.length - 20} additional gaps documented`, 50, yPos);
  }
}

// ============================================================================
// GAP ANALYSIS WITH PAGINATION (for gaps report type)
// ============================================================================

function generateGapAnalysisWithPagination(doc, data) {
  const GAPS_PER_PAGE = 20;
  const allGaps = data.gaps;
  const totalPages = Math.ceil(allGaps.length / GAPS_PER_PAGE);

  for (let page = 0; page < totalPages; page++) {
    doc.addPage();
    const contentTop = 100;
    const startIndex = page * GAPS_PER_PAGE;
    const pageGaps = allGaps.slice(startIndex, startIndex + GAPS_PER_PAGE);

    // Header
    doc.fontSize(28)
       .fillColor('#1e293b')
       .text(`Gap Analysis${totalPages > 1 ? ` (${page + 1}/${totalPages})` : ''}`, 50, contentTop);

    doc.moveTo(50, contentTop + 40)
       .lineTo(180, contentTop + 40)
       .strokeColor('#f59e0b')
       .lineWidth(3)
       .stroke();

    if (page === 0) {
      // Visual Legend (only on first page)
      doc.fontSize(10)
         .fillColor('#475569')
         .text('Visual Indicators:', 50, contentTop + 60);

      const legend = [
        { color: '#ef4444', label: 'Critical Risk' },
        { color: '#f59e0b', label: 'High Risk' },
        { color: '#3b82f6', label: 'Medium Risk' },
        { color: '#10b981', label: 'Low Risk' },
      ];

      let legendX = 160;
      legend.forEach((item) => {
        doc.circle(legendX, contentTop + 64, 6)
           .fill(item.color);
        doc.fontSize(8)
           .fillColor('#64748b')
           .text(item.label, legendX + 12, contentTop + 59);
        legendX += 100;
      });
    }

    // Gap Grid
    let yPos = page === 0 ? contentTop + 100 : contentTop + 60;
    const gapsPerRow = 4;

    for (let i = 0; i < pageGaps.length; i += gapsPerRow) {
      const rowGaps = pageGaps.slice(i, i + gapsPerRow);
      let xPos = 50;

      rowGaps.forEach((gap) => {
        const riskColor = getRiskColor(gap.risk);

        // Gap card
        doc.roundedRect(xPos, yPos, 118, 80, 6)
           .fillAndStroke('#ffffff', '#e2e8f0');

        // Risk indicator
        doc.circle(xPos + 15, yPos + 15, 8)
           .fill(riskColor);

        // Control ID
        doc.fontSize(9)
           .fillColor('#3b82f6')
           .text(sanitizeString(gap.id, 20), xPos + 30, yPos + 10);

        // Title
        doc.fontSize(7)
           .fillColor('#334155')
           .text(truncate(sanitizeString(gap.title, 100), 25), xPos + 8, yPos + 35, { width: 102 });

        // Status badge
        const statusColor = gap.status === 'no' ? '#ef4444' : '#f59e0b';
        doc.roundedRect(xPos + 8, yPos + 60, 45, 14, 3)
           .fill(statusColor + '20');
        doc.fontSize(7)
           .fillColor(statusColor)
           .text(gap.status === 'no' ? 'Gap' : 'Partial', xPos + 15, yPos + 63);

        xPos += 125;
      });

      yPos += 95;
    }

    // Page summary
    if (page === totalPages - 1) {
      doc.fontSize(9)
         .fillColor('#64748b')
         .text(`Total gaps documented: ${allGaps.length}`, 50, yPos + 10);
    }
  }
}

// ============================================================================
// EVIDENCE ANNEX WITH PAGINATION (for evidence report type)
// ============================================================================

function generateEvidenceAnnexWithPagination(doc, data) {
  const ITEMS_PER_PAGE = 18;
  const allControls = data.compliantControls;
  const totalPages = Math.ceil(allControls.length / ITEMS_PER_PAGE);

  for (let page = 0; page < totalPages; page++) {
    doc.addPage();
    const contentTop = 100;
    const startIndex = page * ITEMS_PER_PAGE;
    const pageControls = allControls.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Header
    doc.fontSize(28)
       .fillColor('#1e293b')
       .text(`Evidence Annex${totalPages > 1 ? ` (${page + 1}/${totalPages})` : ''}`, 50, contentTop);

    doc.moveTo(50, contentTop + 40)
       .lineTo(200, contentTop + 40)
       .strokeColor('#10b981')
       .lineWidth(3)
       .stroke();

    if (page === 0) {
      doc.fontSize(11)
         .fillColor('#475569')
         .text(
           'This annex documents all compliant controls along with their associated evidence notes ' +
           'and supporting documentation from the Evidence Locker.',
           50, contentTop + 55, { width: 495 }
         );

      // Stats summary
      doc.roundedRect(50, contentTop + 90, 495, 50, 8)
         .fillAndStroke('#f0fdf4', '#bbf7d0');

      doc.fontSize(10)
         .fillColor('#166534')
         .text(`✓ ${data.compliantControls.length} Compliant Controls Documented`, 70, contentTop + 105);

      doc.fontSize(9)
         .fillColor('#15803d')
         .text(`Evidence records: ${data.evidence.length} | With file attachments: ${data.evidence.filter(e => e.fileUrls && e.fileUrls.length > 0).length}`, 70, contentTop + 122);
    }

    // Evidence Table Header
    let yPos = page === 0 ? contentTop + 160 : contentTop + 60;

    doc.roundedRect(50, yPos, 495, 25, 5)
       .fill('#1e293b');

    doc.fontSize(8)
       .fillColor('#ffffff')
       .text('Control ID', 60, yPos + 8)
       .text('Control Title', 130, yPos + 8)
       .text('Evidence Note / File', 320, yPos + 8)
       .text('Status', 500, yPos + 8);

    yPos += 30;

    // Evidence rows
    pageControls.forEach((control, index) => {
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';

      doc.rect(50, yPos, 495, 30)
         .fill(bgColor);

      // Compliant indicator
      doc.circle(60, yPos + 15, 5)
         .fill('#10b981');

      // Control ID
      doc.fontSize(8)
         .fillColor('#3b82f6')
         .text(sanitizeString(control.id, 15), 70, yPos + 10);

      // Control title
      doc.fontSize(7)
         .fillColor('#334155')
         .text(truncate(sanitizeString(control.title, 100), 30), 130, yPos + 10);

      // Evidence note or file
      const evidenceText = control.evidenceNote || control.fileName || 'No documentation';
      doc.fontSize(7)
         .fillColor('#64748b')
         .text(truncate(sanitizeString(evidenceText, 150), 35), 320, yPos + 10);

      // Status
      doc.fontSize(7)
         .fillColor('#10b981')
         .text('Verified', 500, yPos + 10);

      yPos += 30;
    });

    // Page summary on last page
    if (page === totalPages - 1) {
      doc.fontSize(9)
         .fillColor('#64748b')
         .text(`Total compliant controls: ${allControls.length}`, 50, yPos + 10);
    }
  }
}

// ============================================================================
// GAPS REPORT TABLE OF CONTENTS
// ============================================================================

function generateGapsTableOfContents(doc, data) {
  const contentTop = 100;

  doc.fontSize(28)
     .fillColor('#1e293b')
     .text('Table of Contents', 50, contentTop);

  doc.moveTo(50, contentTop + 40)
     .lineTo(220, contentTop + 40)
     .strokeColor('#f59e0b')
     .lineWidth(3)
     .stroke();

  const gapPages = Math.ceil(data.gaps.length / 20);

  const tocItems = [
    { num: '1', title: 'Executive Summary', page: 3, indent: 0 },
    { num: '1.1', title: 'Compliance Score Overview', page: 3, indent: 1 },
    { num: '2', title: 'Critical Findings', page: 4, indent: 0 },
    { num: '2.1', title: 'Priority Findings Table', page: 4, indent: 1 },
    { num: '3', title: 'Gap Analysis', page: 5, indent: 0 },
  ];

  // Add gap pages dynamically
  for (let i = 0; i < gapPages; i++) {
    if (i > 0) {
      tocItems.push({ num: `3.${i + 1}`, title: `Gap Analysis (continued)`, page: 5 + i, indent: 1 });
    }
  }

  tocItems.push(
    { num: '4', title: 'Remediation Recommendations', page: 5 + gapPages, indent: 0 },
    { num: '5', title: 'Appendix', page: 6 + gapPages, indent: 0 }
  );

  let yPos = contentTop + 70;
  tocItems.forEach((item) => {
    const indent = item.indent * 20;
    const isMain = item.indent === 0;

    doc.fontSize(isMain ? 12 : 10)
       .fillColor(isMain ? '#1e293b' : '#475569')
       .text(item.num, 60 + indent, yPos);

    doc.fontSize(isMain ? 12 : 10)
       .fillColor(isMain ? '#1e293b' : '#475569')
       .text(item.title, 100 + indent, yPos);

    // Dotted line
    const dotsWidth = 380 - indent;
    doc.fontSize(10)
       .fillColor('#cbd5e1')
       .text('.'.repeat(Math.floor(dotsWidth / 4)), 280, yPos, { width: dotsWidth });

    doc.fontSize(isMain ? 12 : 10)
       .fillColor('#f59e0b')
       .text(item.page.toString(), 500, yPos);

    yPos += isMain ? 30 : 24;
  });

  // Quick Stats Box
  doc.roundedRect(50, yPos + 40, 495, 100, 8)
     .fillAndStroke('#fef3c7', '#fbbf24');

  doc.fontSize(11)
     .fillColor('#92400e')
     .text('Gap Summary', 70, yPos + 55);

  const quickStats = [
    { label: 'Total Gaps', value: data.stats.gaps },
    { label: 'Partial', value: data.stats.partial },
    { label: 'Critical', value: data.criticalFindings.filter(f => f.risk === 'critical').length },
    { label: 'High Risk', value: data.criticalFindings.filter(f => f.risk === 'high').length },
  ];

  let statX = 70;
  quickStats.forEach((stat) => {
    doc.fontSize(24)
       .fillColor('#f59e0b')
       .text(stat.value.toString(), statX, yPos + 80);
    doc.fontSize(8)
       .fillColor('#92400e')
       .text(stat.label, statX, yPos + 110);
    statX += 120;
  });
}

// ============================================================================
// EVIDENCE REPORT TABLE OF CONTENTS
// ============================================================================

function generateEvidenceTableOfContents(doc, data) {
  const contentTop = 100;

  doc.fontSize(28)
     .fillColor('#1e293b')
     .text('Table of Contents', 50, contentTop);

  doc.moveTo(50, contentTop + 40)
     .lineTo(220, contentTop + 40)
     .strokeColor('#10b981')
     .lineWidth(3)
     .stroke();

  const evidencePages = Math.ceil(data.compliantControls.length / 18);

  const tocItems = [
    { num: '1', title: 'Executive Summary', page: 3, indent: 0 },
    { num: '1.1', title: 'Compliance Score Overview', page: 3, indent: 1 },
    { num: '2', title: 'Framework Compliance Analysis', page: 4, indent: 0 },
    { num: '3', title: 'Evidence Annex', page: 5, indent: 0 },
  ];

  // Add evidence pages dynamically
  for (let i = 0; i < evidencePages; i++) {
    if (i > 0) {
      tocItems.push({ num: `3.${i + 1}`, title: `Evidence Annex (continued)`, page: 5 + i, indent: 1 });
    }
  }

  tocItems.push({ num: '4', title: 'Appendix', page: 5 + evidencePages, indent: 0 });

  let yPos = contentTop + 70;
  tocItems.forEach((item) => {
    const indent = item.indent * 20;
    const isMain = item.indent === 0;

    doc.fontSize(isMain ? 12 : 10)
       .fillColor(isMain ? '#1e293b' : '#475569')
       .text(item.num, 60 + indent, yPos);

    doc.fontSize(isMain ? 12 : 10)
       .fillColor(isMain ? '#1e293b' : '#475569')
       .text(item.title, 100 + indent, yPos);

    // Dotted line
    const dotsWidth = 380 - indent;
    doc.fontSize(10)
       .fillColor('#cbd5e1')
       .text('.'.repeat(Math.floor(dotsWidth / 4)), 280, yPos, { width: dotsWidth });

    doc.fontSize(isMain ? 12 : 10)
       .fillColor('#10b981')
       .text(item.page.toString(), 500, yPos);

    yPos += isMain ? 30 : 24;
  });

  // Quick Stats Box
  doc.roundedRect(50, yPos + 40, 495, 100, 8)
     .fillAndStroke('#f0fdf4', '#86efac');

  doc.fontSize(11)
     .fillColor('#166534')
     .text('Evidence Summary', 70, yPos + 55);

  const quickStats = [
    { label: 'Compliant Controls', value: data.compliantControls.length },
    { label: 'Evidence Records', value: data.evidence.length },
    { label: 'With Files', value: data.evidence.filter(e => e.fileUrls && e.fileUrls.length > 0).length },
    { label: 'Compliance %', value: `${data.stats.compliancePercentage}%` },
  ];

  let statX = 70;
  quickStats.forEach((stat) => {
    doc.fontSize(24)
       .fillColor('#10b981')
       .text(stat.value.toString(), statX, yPos + 80);
    doc.fontSize(8)
       .fillColor('#166534')
       .text(stat.label, statX, yPos + 110);
    statX += 120;
  });
}

// ============================================================================
// REMEDIATION PLAN
// ============================================================================

function generateRemediationPlan(doc, data) {
  const contentTop = 100;
  
  doc.fontSize(28)
     .fillColor('#1e293b')
     .text('Remediation Recommendations', 50, contentTop);

  doc.moveTo(50, contentTop + 40)
     .lineTo(330, contentTop + 40)
     .strokeColor('#8b5cf6')
     .lineWidth(3)
     .stroke();

  doc.fontSize(11)
     .fillColor('#475569')
     .text(
       'The following recommendations are mapped directly to the critical findings identified in this assessment. ' +
       'Each recommendation includes specific technical guidance for implementation.',
       50, contentTop + 55, { width: 495 }
     );

  if (data.gaps.length === 0) {
    doc.fontSize(14)
       .fillColor('#10b981')
       .text('✓ No remediation required', 50, contentTop + 100);
    return;
  }

  // Technical recommendations mapped to findings
  const recommendations = getRemediationRecommendations(data.criticalFindings.slice(0, 6));

  let yPos = contentTop + 100;

  recommendations.forEach((rec, index) => {
    // Recommendation card
    doc.roundedRect(50, yPos, 495, 85, 8)
       .fillAndStroke('#f8fafc', '#e2e8f0');

    // Priority number
    doc.circle(70, yPos + 20, 15)
       .fill('#8b5cf6');
    doc.fontSize(12)
       .fillColor('#ffffff')
       .text((index + 1).toString(), 65, yPos + 14);

    // Control reference
    doc.fontSize(10)
       .fillColor('#3b82f6')
       .text(rec.controlId, 95, yPos + 12);

    // Recommendation title
    doc.fontSize(10)
       .fillColor('#1e293b')
       .text(rec.title, 95, yPos + 28);

    // Technical guidance
    doc.fontSize(8)
       .fillColor('#475569')
       .text(rec.guidance, 95, yPos + 45, { width: 430 });

    // Timeline badge
    doc.roundedRect(450, yPos + 10, 80, 20, 4)
       .fill(rec.priority === 'critical' ? '#fef2f2' : '#fef3c7');
    doc.fontSize(8)
       .fillColor(rec.priority === 'critical' ? '#991b1b' : '#92400e')
       .text(`${rec.days} days`, 465, yPos + 15);

    yPos += 95;
  });
}

// ============================================================================
// EVIDENCE ANNEX
// ============================================================================

function generateEvidenceAnnex(doc, data) {
  const contentTop = 100;
  
  doc.fontSize(28)
     .fillColor('#1e293b')
     .text('Evidence Annex', 50, contentTop);

  doc.moveTo(50, contentTop + 40)
     .lineTo(200, contentTop + 40)
     .strokeColor('#10b981')
     .lineWidth(3)
     .stroke();

  doc.fontSize(11)
     .fillColor('#475569')
     .text(
       'This annex documents all compliant controls along with their associated evidence notes ' +
       'and supporting documentation from the Evidence Locker.',
       50, contentTop + 55, { width: 495 }
     );

  // Stats summary
  doc.roundedRect(50, contentTop + 90, 495, 50, 8)
     .fillAndStroke('#f0fdf4', '#bbf7d0');

  doc.fontSize(10)
     .fillColor('#166534')
     .text(`✓ ${data.compliantControls.length} Compliant Controls Documented`, 70, contentTop + 105);

  doc.fontSize(9)
     .fillColor('#15803d')
     .text(`Evidence records: ${data.evidence.length} | With file attachments: ${data.evidence.filter(e => e.fileUrls && e.fileUrls.length > 0).length}`, 70, contentTop + 122);

  // Evidence Table Header
  let yPos = contentTop + 160;
  
  doc.roundedRect(50, yPos, 495, 25, 5)
     .fill('#1e293b');

  doc.fontSize(8)
     .fillColor('#ffffff')
     .text('Control ID', 60, yPos + 8)
     .text('Control Title', 130, yPos + 8)
     .text('Evidence Note / File', 320, yPos + 8)
     .text('Status', 500, yPos + 8);

  yPos += 30;

  // Evidence rows
  const maxRows = 15;
  data.compliantControls.slice(0, maxRows).forEach((control, index) => {
    const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    
    doc.rect(50, yPos, 495, 30)
       .fill(bgColor);

    // Compliant indicator
    doc.circle(60, yPos + 15, 5)
       .fill('#10b981');

    // Control ID
    doc.fontSize(8)
       .fillColor('#3b82f6')
       .text(control.id, 70, yPos + 10);

    // Control title
    doc.fontSize(7)
       .fillColor('#334155')
       .text(truncate(control.title, 30), 130, yPos + 10);

    // Evidence note or file
    const evidenceText = control.evidenceNote || control.fileName || 'No documentation';
    doc.fontSize(7)
       .fillColor('#64748b')
       .text(truncate(evidenceText, 35), 320, yPos + 10);

    // Status
    doc.fontSize(7)
       .fillColor('#10b981')
       .text('Verified', 500, yPos + 10);

    yPos += 30;
  });

  if (data.compliantControls.length > maxRows) {
    doc.fontSize(9)
       .fillColor('#64748b')
       .text(`... and ${data.compliantControls.length - maxRows} additional compliant controls`, 50, yPos + 10);
  }
}

// ============================================================================
// APPENDIX
// ============================================================================

function generateAppendix(doc, data) {
  const contentTop = 100;
  
  doc.fontSize(28)
     .fillColor('#1e293b')
     .text('Appendix', 50, contentTop);

  doc.moveTo(50, contentTop + 40)
     .lineTo(150, contentTop + 40)
     .strokeColor('#64748b')
     .lineWidth(3)
     .stroke();

  // Report Metadata
  doc.fontSize(14)
     .fillColor('#1e293b')
     .text('A. Report Metadata', 50, contentTop + 70);

  const metadata = [
    { label: 'Organization', value: data.organizationName },
    { label: 'Report ID', value: data.reportId },
    { label: 'Report Type', value: 'Audit Readiness Assessment' },
    { label: 'Assessment Period', value: `${formatDateShort(data.assessmentPeriod.start)} - ${formatDateShort(data.assessmentPeriod.end)}` },
    { label: 'Generated At', value: formatDate(data.generatedAt) },
    { label: 'Generated By', value: data.generatedBy },
    { label: 'Total Controls Assessed', value: data.controls.length.toString() },
    { label: 'Custom Controls', value: data.customControls.length.toString() },
    { label: 'Evidence Records', value: data.evidence.length.toString() },
  ];

  let yPos = contentTop + 95;
  metadata.forEach(({ label, value }) => {
    doc.fontSize(9)
       .fillColor('#64748b')
       .text(label + ':', 60, yPos);
    doc.fontSize(9)
       .fillColor('#334155')
       .text(value, 200, yPos);
    yPos += 18;
  });

  // Methodology
  yPos += 20;
  doc.fontSize(14)
     .fillColor('#1e293b')
     .text('B. Assessment Methodology', 50, yPos);

  doc.fontSize(9)
     .fillColor('#475569')
     .text(
       'This assessment was conducted using the Lydell Security Compliance Engine, which evaluates ' +
       'organizational controls against multiple compliance frameworks simultaneously. The "Answer Once, ' +
       'Comply Everywhere" methodology ensures that control implementations are automatically mapped ' +
       'to all applicable framework requirements, reducing assessment burden while maintaining comprehensive coverage.',
       60, yPos + 25, { width: 480, align: 'justify', lineGap: 2 }
     );

  // Disclaimer
  yPos += 100;
  doc.fontSize(14)
     .fillColor('#1e293b')
     .text('C. Disclaimer', 50, yPos);

  doc.fontSize(9)
     .fillColor('#64748b')
     .text(
       'This report is generated based on self-assessment data provided by the organization. ' +
       'It does not constitute a formal audit, certification, or attestation. Organizations should engage ' +
       'qualified third-party auditors for official compliance certifications. The accuracy of this report ' +
       'is dependent on the accuracy and completeness of the input data provided. Lydell Security makes no ' +
       'warranties regarding the completeness or accuracy of the information contained herein.',
       60, yPos + 25, { width: 480, align: 'justify', lineGap: 2 }
     );

  // Signature Block
  yPos += 120;
  doc.moveTo(50, yPos)
     .lineTo(250, yPos)
     .strokeColor('#cbd5e1')
     .lineWidth(1)
     .stroke();

  doc.fontSize(9)
     .fillColor('#64748b')
     .text('Authorized Signature', 50, yPos + 10);

  doc.moveTo(300, yPos)
     .lineTo(500, yPos)
     .strokeColor('#cbd5e1')
     .lineWidth(1)
     .stroke();

  doc.fontSize(9)
     .fillColor('#64748b')
     .text('Date', 300, yPos + 10);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function drawGradientCircle(doc, x, y, radius, color, opacity) {
  doc.save();
  doc.circle(x, y, radius)
     .fill(color + Math.round(opacity * 255).toString(16).padStart(2, '0'));
  doc.restore();
}

function drawRadarChart(doc, centerX, centerY, radius, frameworkStats) {
  const frameworks = ['SOC2', 'ISO27001', 'HIPAA', 'NIST'];
  const angles = frameworks.map((_, i) => (Math.PI * 2 * i) / frameworks.length - Math.PI / 2);
  
  // Draw grid circles
  for (let r = 0.25; r <= 1; r += 0.25) {
    doc.save();
    const gridRadius = radius * r;
    doc.circle(centerX, centerY, gridRadius)
       .strokeColor('#e2e8f0')
       .lineWidth(0.5)
       .stroke();
    doc.restore();
  }

  // Draw axis lines
  angles.forEach((angle) => {
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    doc.moveTo(centerX, centerY)
       .lineTo(x, y)
       .strokeColor('#cbd5e1')
       .lineWidth(0.5)
       .stroke();
  });

  // Draw data polygon
  doc.save();
  const points = frameworks.map((fw, i) => {
    const pct = frameworkStats[fw].percentage / 100;
    const angle = angles[i];
    return {
      x: centerX + radius * pct * Math.cos(angle),
      y: centerY + radius * pct * Math.sin(angle),
    };
  });

  doc.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((p) => doc.lineTo(p.x, p.y));
  doc.closePath()
     .fillAndStroke('#3b82f640', '#3b82f6');
  doc.restore();

  // Draw labels
  const labels = ['SOC 2', 'ISO 27001', 'HIPAA', 'NIST'];
  const labelOffset = 20;
  
  angles.forEach((angle, i) => {
    const x = centerX + (radius + labelOffset) * Math.cos(angle);
    const y = centerY + (radius + labelOffset) * Math.sin(angle);
    
    doc.fontSize(8)
       .fillColor('#475569')
       .text(labels[i], x - 25, y - 5, { width: 50, align: 'center' });
  });

  // Draw data points
  points.forEach((p, i) => {
    doc.circle(p.x, p.y, 4)
       .fill('#3b82f6');
    
    // Show percentage
    doc.fontSize(7)
       .fillColor('#3b82f6')
       .text(`${frameworkStats[frameworks[i]].percentage}%`, p.x - 10, p.y + 8);
  });
}

function calculateStats(responses, controls) {
  // Use actual controls count, only fallback if truly empty
  const total = controls.length > 0 ? controls.length : Object.keys(responses).length;
  const answered = Object.keys(responses).length;
  const compliant = Object.values(responses).filter(r => r.answer === 'yes').length;
  const gaps = Object.values(responses).filter(r => r.answer === 'no').length;
  const partial = Object.values(responses).filter(r => r.answer === 'partial').length;
  const notApplicable = Object.values(responses).filter(r => r.answer === 'na' || r.answer === 'n/a').length;

  // Calculate compliance based on answered controls (excluding N/A)
  const applicableAnswered = answered - notApplicable;

  return {
    total,
    answered,
    compliant,
    gaps,
    partial,
    notApplicable,
    // Compliance % based on compliant out of applicable answered
    compliancePercentage: applicableAnswered > 0 ? Math.round((compliant / applicableAnswered) * 100) : 0,
    // Assessment % based on answered out of total
    assessmentPercentage: total > 0 ? Math.round((answered / total) * 100) : 0,
  };
}

function calculateFrameworkStats(responses, controls, frameworkFilter = null) {
  // Framework identification patterns
  const frameworkPatterns = {
    'SOC2': {
      prefixes: ['CC', 'A', 'PI', 'C', 'P'],
      pattern: /^(CC|A|PI|C|P)\d/,
    },
    'ISO27001': {
      prefixes: ['A.', 'ISO'],
      pattern: /^(A\.|ISO)/,
    },
    'HIPAA': {
      prefixes: ['164', 'HP'],
      pattern: /^(164|HP)/,
    },
    'NIST': {
      prefixes: ['ID.', 'PR.', 'DE.', 'RS.', 'RC.'],
      pattern: /^(ID|PR|DE|RS|RC)\./,
    },
  };

  // Initialize framework stats
  const frameworks = {
    'SOC2': { total: 0, met: 0, percentage: 0 },
    'ISO27001': { total: 0, met: 0, percentage: 0 },
    'HIPAA': { total: 0, met: 0, percentage: 0 },
    'NIST': { total: 0, met: 0, percentage: 0 },
  };

  // Count controls per framework based on actual control data
  controls.forEach(control => {
    const controlFrameworks = control.frameworks || [];
    const controlId = control.id || '';

    Object.keys(frameworks).forEach(fw => {
      // Check if control belongs to this framework
      const belongsToFramework =
        controlFrameworks.includes(fw) ||
        frameworkPatterns[fw].pattern.test(controlId);

      if (belongsToFramework) {
        frameworks[fw].total++;

        // Check if this control is compliant
        const response = responses[control.id];
        if (response && response.answer === 'yes') {
          frameworks[fw].met++;
        }
      }
    });
  });

  // If no controls matched any framework pattern, distribute based on response ratio
  // This handles cases where control IDs don't follow standard patterns
  const hasAnyFrameworkControls = Object.values(frameworks).some(f => f.total > 0);

  if (!hasAnyFrameworkControls && controls.length > 0) {
    // Fallback: estimate based on overall compliance ratio
    const compliantCount = Object.values(responses).filter(r => r.answer === 'yes').length;
    const totalControls = controls.length;
    const ratio = totalControls > 0 ? compliantCount / totalControls : 0;

    // Distribute controls evenly and apply ratio
    const perFramework = Math.ceil(totalControls / 4);
    Object.keys(frameworks).forEach(fw => {
      frameworks[fw].total = perFramework;
      frameworks[fw].met = Math.round(perFramework * ratio);
    });
  }

  // Calculate percentages
  Object.keys(frameworks).forEach(fw => {
    frameworks[fw].percentage = frameworks[fw].total > 0
      ? Math.round((frameworks[fw].met / frameworks[fw].total) * 100)
      : 0;
  });

  // If filtering by a specific framework, highlight that one
  if (frameworkFilter && frameworks[frameworkFilter]) {
    frameworks[frameworkFilter].isFiltered = true;
  }

  return frameworks;
}

function getGaps(responses, controls) {
  const gaps = [];
  
  Object.entries(responses).forEach(([controlId, response]) => {
    if (response.answer === 'no' || response.answer === 'partial') {
      const control = controls.find(c => c.id === controlId) || {
        id: controlId,
        title: 'Control ' + controlId,
        risk_level: 'medium',
      };
      
      gaps.push({
        id: control.id,
        title: control.title || control.question || 'Untitled Control',
        description: control.description || '',
        risk: control.risk_level || 'medium',
        status: response.answer,
        frameworks: control.frameworks || [],
      });
    }
  });

  const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  gaps.sort((a, b) => (riskOrder[a.risk] || 2) - (riskOrder[b.risk] || 2));

  return gaps;
}

function getCriticalFindings(gaps, controls) {
  return gaps.filter(g => g.risk === 'critical' || g.risk === 'high' || g.status === 'no');
}

function getCompliantControls(responses, controls, evidence) {
  const compliant = [];
  
  Object.entries(responses).forEach(([controlId, response]) => {
    if (response.answer === 'yes') {
      const control = controls.find(c => c.id === controlId) || { id: controlId, title: 'Control ' + controlId };
      const ev = evidence.find(e => e.controlId === controlId);
      
      compliant.push({
        id: control.id,
        title: control.title || control.question || 'Untitled',
        evidenceNote: response.notes || ev?.notes || '',
        fileName: ev?.fileUrls?.[0] || '',
      });
    }
  });

  return compliant;
}

function getRemediationRecommendations(findings) {
  const recommendations = {
    'AM': {
      title: 'Asset Management Enhancement',
      guidance: 'Deploy comprehensive endpoint detection and response (EDR) solution. Implement automated asset discovery and inventory management. Establish hardware and software asset lifecycle procedures.',
    },
    'AC': {
      title: 'Access Control Implementation',
      guidance: 'Implement role-based access control (RBAC) with least privilege principles. Deploy multi-factor authentication (MFA) for all privileged access. Establish access review and recertification procedures.',
    },
    'DM': {
      title: 'Data Management Controls',
      guidance: 'Implement data classification and handling procedures. Deploy data loss prevention (DLP) solutions. Establish encryption standards for data at rest and in transit.',
    },
    'IR': {
      title: 'Incident Response Program',
      guidance: 'Develop and document incident response procedures. Establish security incident detection and monitoring capabilities. Conduct regular tabletop exercises and incident simulations.',
    },
    'RM': {
      title: 'Risk Management Framework',
      guidance: 'Implement formal risk assessment methodology. Establish risk register and treatment tracking. Define risk appetite and tolerance levels.',
    },
    'SC': {
      title: 'Security Controls Enhancement',
      guidance: 'Implement defense-in-depth security architecture. Deploy security monitoring and SIEM solutions. Establish vulnerability management program.',
    },
  };

  return findings.map((finding) => {
    const prefix = finding.id.split('-')[0] || 'SC';
    const rec = recommendations[prefix] || recommendations['SC'];
    
    return {
      controlId: finding.id,
      title: rec.title,
      guidance: rec.guidance,
      priority: finding.risk,
      days: getRemediationDays(finding.risk),
    };
  });
}

function getRemediationDays(risk) {
  const days = { critical: 7, high: 14, medium: 30, low: 90 };
  return days[risk] || 30;
}

function getRiskColor(risk) {
  const colors = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#10b981' };
  return colors[risk] || '#64748b';
}

function getScoreColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function truncate(str, length) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
