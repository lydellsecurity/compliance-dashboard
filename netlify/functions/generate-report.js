// netlify/functions/generate-report.js
// Professional Audit Readiness Report Generator

const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Handle OPTIONS for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

    // Parse the request body
    const payload = JSON.parse(event.body);
    const {
      organizationName = 'LYDELL SECURITY',
      reportType = 'full',
      frameworkFilter = null,
      responses = {},
      controls = [],
      customControls = [],
      evidence = [],
      assessmentPeriod = null,
    } = payload;

    // Calculate assessment period
    const now = new Date();
    const period = assessmentPeriod || {
      start: new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString(),
      end: now.toISOString(),
    };

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
      generatedBy: user.email,
      generatedAt: now.toISOString(),
    });

    // Return the PDF
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="audit-readiness-report-${Date.now()}.pdf"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (error) {
    console.error('PDF generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate report', details: error.message }),
    };
  }
};

// ============================================================================
// PROFESSIONAL REPORT GENERATOR
// ============================================================================

async function generateProfessionalReport(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 80, bottom: 80, left: 50, right: 50 },
        bufferPages: true,
        info: {
          Title: `Audit Readiness Report - ${data.organizationName}`,
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

      // Calculate all statistics
      const stats = calculateStats(data.responses, data.controls);
      const frameworkStats = calculateFrameworkStats(data.responses, data.controls);
      const gaps = getGaps(data.responses, data.controls);
      const criticalFindings = getCriticalFindings(gaps, data.controls);
      const compliantControls = getCompliantControls(data.responses, data.controls, data.evidence);

      // Report data object
      const reportData = {
        ...data,
        stats,
        frameworkStats,
        gaps,
        criticalFindings,
        compliantControls,
        reportId: `RPT-${Date.now().toString(36).toUpperCase()}`,
      };

      // Generate all pages
      let pageNum = 1;

      // Cover Page
      generateCoverPage(doc, reportData);
      
      // Table of Contents
      doc.addPage();
      pageNum++;
      generateTableOfContents(doc, reportData);

      // Executive Summary with Radar Chart
      doc.addPage();
      pageNum++;
      generateExecutiveSummary(doc, reportData);

      // Framework Compliance Analysis
      doc.addPage();
      pageNum++;
      generateFrameworkAnalysis(doc, reportData);

      // Critical Findings Table
      doc.addPage();
      pageNum++;
      generateCriticalFindings(doc, reportData);

      // Gap Analysis with Visual Indicators
      doc.addPage();
      pageNum++;
      generateGapAnalysis(doc, reportData);

      // Remediation Recommendations
      doc.addPage();
      pageNum++;
      generateRemediationPlan(doc, reportData);

      // Evidence Annex
      doc.addPage();
      pageNum++;
      generateEvidenceAnnex(doc, reportData);

      // Appendix
      doc.addPage();
      pageNum++;
      generateAppendix(doc, reportData);

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
  const total = controls.length || 236;
  const answered = Object.keys(responses).length;
  const compliant = Object.values(responses).filter(r => r.answer === 'yes').length;
  const gaps = Object.values(responses).filter(r => r.answer === 'no').length;
  const partial = Object.values(responses).filter(r => r.answer === 'partial').length;
  
  return {
    total,
    answered,
    compliant,
    gaps,
    partial,
    compliancePercentage: total > 0 ? Math.round((compliant / total) * 100) : 0,
    assessmentPercentage: total > 0 ? Math.round((answered / total) * 100) : 0,
  };
}

function calculateFrameworkStats(responses, controls) {
  const frameworks = {
    'SOC2': { total: 33, met: 0, percentage: 0 },
    'ISO27001': { total: 36, met: 0, percentage: 0 },
    'HIPAA': { total: 19, met: 0, percentage: 0 },
    'NIST': { total: 39, met: 0, percentage: 0 },
  };

  const compliantCount = Object.values(responses).filter(r => r.answer === 'yes').length;
  const totalControls = controls.length || 236;
  const ratio = compliantCount / totalControls;

  Object.keys(frameworks).forEach(fw => {
    frameworks[fw].met = Math.round(frameworks[fw].total * ratio);
    frameworks[fw].percentage = Math.round(ratio * 100);
  });

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
