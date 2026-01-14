// netlify/functions/generate-report.js
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

  // CORS headers
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
      organizationName = 'Organization',
      reportType = 'full', // 'full', 'gaps', 'evidence'
      frameworkFilter = null, // null = all, or 'SOC2', 'ISO27001', etc.
      responses = {},
      controls = [],
      customControls = [],
      evidence = [],
    } = payload;

    // Generate the PDF using our template
    const pdfBuffer = await generatePDF({
      organizationName,
      reportType,
      frameworkFilter,
      responses,
      controls,
      customControls,
      evidence,
      generatedBy: user.email,
      generatedAt: new Date().toISOString(),
    });

    // Return the PDF
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="compliance-report-${Date.now()}.pdf"`,
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
// PDF GENERATION (Using PDFKit for serverless compatibility)
// ============================================================================

const PDFDocument = require('pdfkit');

async function generatePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Compliance Report - ${data.organizationName}`,
          Author: 'Compliance Engine by Lydell Security',
          Subject: 'Compliance Assessment Report',
          Creator: 'Compliance Engine',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Calculate statistics
      const stats = calculateStats(data.responses, data.controls);
      const frameworkStats = calculateFrameworkStats(data.responses, data.controls);
      const gaps = getGaps(data.responses, data.controls);

      // Generate PDF sections
      generateCoverPage(doc, data);
      doc.addPage();
      generateTableOfContents(doc);
      doc.addPage();
      generateExecutiveSummary(doc, stats, frameworkStats);
      doc.addPage();
      generateFrameworkAnalysis(doc, frameworkStats);
      doc.addPage();
      generateGapAnalysis(doc, gaps);
      
      if (data.reportType === 'full' || data.reportType === 'evidence') {
        doc.addPage();
        generateEvidenceSummary(doc, data.evidence, data.responses);
      }

      doc.addPage();
      generateRemediationPlan(doc, gaps);
      doc.addPage();
      generateAppendix(doc, data);

      // Add page numbers
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        if (i > 0) { // Skip cover page
          doc.fontSize(9)
             .fillColor('#64748b')
             .text(
               `Page ${i} of ${pageCount - 1}`,
               50,
               doc.page.height - 30,
               { align: 'center', width: doc.page.width - 100 }
             );
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================================
// PDF SECTIONS
// ============================================================================

function generateCoverPage(doc, data) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Background gradient effect (approximated with rectangles)
  doc.rect(0, 0, pageWidth, pageHeight).fill('#0f172a');
  
  // Decorative elements
  doc.circle(pageWidth * 0.8, pageHeight * 0.2, 150)
     .fill('#3b82f620');
  doc.circle(pageWidth * 0.2, pageHeight * 0.8, 120)
     .fill('#8b5cf620');

  // Logo placeholder
  doc.fontSize(24)
     .fillColor('#3b82f6')
     .text('◈', pageWidth / 2 - 15, 150);

  // Title
  doc.fontSize(36)
     .fillColor('#ffffff')
     .text('COMPLIANCE', 0, 220, { align: 'center', width: pageWidth });
  
  doc.fontSize(36)
     .fillColor('#3b82f6')
     .text('ASSESSMENT REPORT', 0, 265, { align: 'center', width: pageWidth });

  // Organization name
  doc.fontSize(18)
     .fillColor('#94a3b8')
     .text(data.organizationName, 0, 340, { align: 'center', width: pageWidth });

  // Divider
  doc.moveTo(pageWidth * 0.3, 400)
     .lineTo(pageWidth * 0.7, 400)
     .strokeColor('#3b82f6')
     .lineWidth(2)
     .stroke();

  // Report details
  const details = [
    { label: 'Report Type', value: formatReportType(data.reportType) },
    { label: 'Generated', value: formatDate(data.generatedAt) },
    { label: 'Generated By', value: data.generatedBy },
  ];

  let yPos = 440;
  details.forEach(({ label, value }) => {
    doc.fontSize(11)
       .fillColor('#64748b')
       .text(label + ':', pageWidth * 0.3, yPos);
    doc.fontSize(11)
       .fillColor('#e2e8f0')
       .text(value, pageWidth * 0.5, yPos);
    yPos += 25;
  });

  // Footer
  doc.fontSize(10)
     .fillColor('#475569')
     .text('Powered by Compliance Engine', 0, pageHeight - 80, { align: 'center', width: pageWidth });
  
  doc.fontSize(9)
     .fillColor('#334155')
     .text('© ' + new Date().getFullYear() + ' Lydell Security. All rights reserved.', 0, pageHeight - 60, { align: 'center', width: pageWidth });
}

function generateTableOfContents(doc) {
  doc.fontSize(24)
     .fillColor('#1e293b')
     .text('Table of Contents', 50, 50);

  doc.moveTo(50, 85)
     .lineTo(200, 85)
     .strokeColor('#3b82f6')
     .lineWidth(3)
     .stroke();

  const tocItems = [
    { title: 'Executive Summary', page: 3 },
    { title: 'Framework Compliance Analysis', page: 4 },
    { title: 'Gap Analysis', page: 5 },
    { title: 'Evidence Summary', page: 6 },
    { title: 'Remediation Plan', page: 7 },
    { title: 'Appendix', page: 8 },
  ];

  let yPos = 130;
  tocItems.forEach((item, index) => {
    doc.fontSize(12)
       .fillColor('#334155')
       .text(`${index + 1}.`, 60, yPos);
    
    doc.fontSize(12)
       .fillColor('#1e293b')
       .text(item.title, 85, yPos);
    
    // Dotted line
    const dotsStart = 300;
    const dotsEnd = 480;
    doc.fontSize(10)
       .fillColor('#cbd5e1')
       .text('.'.repeat(40), dotsStart, yPos, { width: dotsEnd - dotsStart });
    
    doc.fontSize(12)
       .fillColor('#3b82f6')
       .text(item.page.toString(), 500, yPos);
    
    yPos += 35;
  });
}

function generateExecutiveSummary(doc, stats, frameworkStats) {
  doc.fontSize(24)
     .fillColor('#1e293b')
     .text('Executive Summary', 50, 50);

  doc.moveTo(50, 85)
     .lineTo(250, 85)
     .strokeColor('#3b82f6')
     .lineWidth(3)
     .stroke();

  // Overall compliance score
  const score = stats.compliancePercentage;
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  doc.fontSize(14)
     .fillColor('#475569')
     .text('Overall Compliance Score', 50, 120);

  doc.fontSize(48)
     .fillColor(scoreColor)
     .text(`${score}%`, 50, 145);

  // Stats grid
  const statsGrid = [
    { label: 'Total Controls', value: stats.total, color: '#3b82f6' },
    { label: 'Compliant', value: stats.compliant, color: '#10b981' },
    { label: 'Gaps Identified', value: stats.gaps, color: '#ef4444' },
    { label: 'In Progress', value: stats.partial, color: '#f59e0b' },
  ];

  let xPos = 50;
  statsGrid.forEach((stat) => {
    doc.roundedRect(xPos, 220, 115, 70, 5)
       .fillAndStroke('#f8fafc', '#e2e8f0');
    
    doc.fontSize(24)
       .fillColor(stat.color)
       .text(stat.value.toString(), xPos + 10, 235);
    
    doc.fontSize(9)
       .fillColor('#64748b')
       .text(stat.label, xPos + 10, 265);
    
    xPos += 130;
  });

  // Framework summary
  doc.fontSize(14)
     .fillColor('#475569')
     .text('Framework Coverage', 50, 320);

  let fwYPos = 350;
  Object.entries(frameworkStats).forEach(([framework, fwStats]) => {
    const pct = fwStats.percentage;
    const barColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';

    doc.fontSize(11)
       .fillColor('#334155')
       .text(framework, 50, fwYPos);
    
    doc.fontSize(11)
       .fillColor('#64748b')
       .text(`${pct}%`, 480, fwYPos);

    // Progress bar background
    doc.roundedRect(150, fwYPos + 2, 320, 12, 3)
       .fill('#e2e8f0');
    
    // Progress bar fill
    if (pct > 0) {
      doc.roundedRect(150, fwYPos + 2, 320 * (pct / 100), 12, 3)
         .fill(barColor);
    }

    fwYPos += 35;
  });

  // Key findings
  doc.fontSize(14)
     .fillColor('#475569')
     .text('Key Findings', 50, fwYPos + 20);

  const findings = [
    stats.gaps > 0 ? `${stats.gaps} control gaps require immediate attention` : 'No critical gaps identified',
    stats.partial > 0 ? `${stats.partial} controls are partially implemented` : 'All answered controls are fully implemented',
    `Assessment is ${stats.assessmentPercentage}% complete`,
  ];

  let findingYPos = fwYPos + 50;
  findings.forEach((finding) => {
    doc.fontSize(10)
       .fillColor('#3b82f6')
       .text('•', 55, findingYPos);
    doc.fontSize(10)
       .fillColor('#475569')
       .text(finding, 70, findingYPos);
    findingYPos += 20;
  });
}

function generateFrameworkAnalysis(doc, frameworkStats) {
  doc.fontSize(24)
     .fillColor('#1e293b')
     .text('Framework Compliance Analysis', 50, 50);

  doc.moveTo(50, 85)
     .lineTo(350, 85)
     .strokeColor('#3b82f6')
     .lineWidth(3)
     .stroke();

  const frameworks = {
    'SOC2': { name: 'SOC 2 Type II', color: '#3b82f6', description: 'Service Organization Control' },
    'ISO27001': { name: 'ISO 27001:2022', color: '#10b981', description: 'Information Security Management' },
    'HIPAA': { name: 'HIPAA Security Rule', color: '#f59e0b', description: 'Healthcare Information Protection' },
    'NIST': { name: 'NIST CSF 2.0', color: '#8b5cf6', description: 'Cybersecurity Framework' },
  };

  let yPos = 120;

  Object.entries(frameworkStats).forEach(([fw, stats]) => {
    const framework = frameworks[fw] || { name: fw, color: '#64748b', description: '' };
    const pct = stats.percentage;

    // Framework card
    doc.roundedRect(50, yPos, 495, 100, 8)
       .fillAndStroke('#ffffff', '#e2e8f0');

    // Color bar on left
    doc.rect(50, yPos, 6, 100)
       .fill(framework.color);

    // Framework name
    doc.fontSize(14)
       .fillColor('#1e293b')
       .text(framework.name, 70, yPos + 15);

    doc.fontSize(9)
       .fillColor('#64748b')
       .text(framework.description, 70, yPos + 35);

    // Progress
    doc.fontSize(28)
       .fillColor(framework.color)
       .text(`${pct}%`, 420, yPos + 20);

    // Stats
    doc.fontSize(9)
       .fillColor('#64748b')
       .text(`${stats.met} of ${stats.total} requirements met`, 70, yPos + 60);

    // Progress bar
    doc.roundedRect(70, yPos + 80, 400, 8, 2)
       .fill('#e2e8f0');
    
    if (pct > 0) {
      doc.roundedRect(70, yPos + 80, 400 * (pct / 100), 8, 2)
         .fill(framework.color);
    }

    yPos += 120;
  });
}

function generateGapAnalysis(doc, gaps) {
  doc.fontSize(24)
     .fillColor('#1e293b')
     .text('Gap Analysis', 50, 50);

  doc.moveTo(50, 85)
     .lineTo(180, 85)
     .strokeColor('#ef4444')
     .lineWidth(3)
     .stroke();

  if (gaps.length === 0) {
    doc.fontSize(14)
       .fillColor('#10b981')
       .text('✓ No compliance gaps identified', 50, 120);
    return;
  }

  doc.fontSize(11)
     .fillColor('#64748b')
     .text(`${gaps.length} gaps identified requiring remediation`, 50, 110);

  // Table header
  let yPos = 145;
  doc.roundedRect(50, yPos, 495, 25, 3)
     .fill('#f1f5f9');

  doc.fontSize(9)
     .fillColor('#475569')
     .text('Control ID', 60, yPos + 8)
     .text('Control Title', 140, yPos + 8)
     .text('Risk', 400, yPos + 8)
     .text('Status', 460, yPos + 8);

  yPos += 30;

  // Table rows
  const maxRows = 15;
  gaps.slice(0, maxRows).forEach((gap, index) => {
    const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    doc.rect(50, yPos, 495, 25)
       .fill(bgColor);

    const riskColor = gap.risk === 'critical' ? '#ef4444' : 
                      gap.risk === 'high' ? '#f59e0b' : '#64748b';
    const statusColor = gap.status === 'no' ? '#ef4444' : '#f59e0b';

    doc.fontSize(8)
       .fillColor('#3b82f6')
       .text(gap.id, 60, yPos + 8);

    doc.fontSize(8)
       .fillColor('#334155')
       .text(truncate(gap.title, 45), 140, yPos + 8);

    doc.fontSize(8)
       .fillColor(riskColor)
       .text(capitalize(gap.risk), 400, yPos + 8);

    doc.fontSize(8)
       .fillColor(statusColor)
       .text(gap.status === 'no' ? 'Gap' : 'Partial', 460, yPos + 8);

    yPos += 25;
  });

  if (gaps.length > maxRows) {
    doc.fontSize(9)
       .fillColor('#64748b')
       .text(`... and ${gaps.length - maxRows} more gaps (see Appendix)`, 50, yPos + 10);
  }
}

function generateEvidenceSummary(doc, evidence, responses) {
  doc.fontSize(24)
     .fillColor('#1e293b')
     .text('Evidence Summary', 50, 50);

  doc.moveTo(50, 85)
     .lineTo(220, 85)
     .strokeColor('#10b981')
     .lineWidth(3)
     .stroke();

  const evidenceCount = evidence.length;
  const controlsWithEvidence = new Set(evidence.map(e => e.controlId)).size;

  // Evidence stats
  const statsData = [
    { label: 'Total Evidence Records', value: evidenceCount },
    { label: 'Controls with Evidence', value: controlsWithEvidence },
    { label: 'Draft', value: evidence.filter(e => e.status === 'draft').length },
    { label: 'Approved', value: evidence.filter(e => e.status === 'approved' || e.status === 'final').length },
  ];

  let xPos = 50;
  statsData.forEach((stat) => {
    doc.roundedRect(xPos, 110, 115, 60, 5)
       .fillAndStroke('#f8fafc', '#e2e8f0');
    
    doc.fontSize(20)
       .fillColor('#3b82f6')
       .text(stat.value.toString(), xPos + 10, 125);
    
    doc.fontSize(8)
       .fillColor('#64748b')
       .text(stat.label, xPos + 10, 150);
    
    xPos += 125;
  });

  // Recent evidence
  doc.fontSize(14)
     .fillColor('#475569')
     .text('Recent Evidence', 50, 200);

  if (evidence.length === 0) {
    doc.fontSize(11)
       .fillColor('#94a3b8')
       .text('No evidence records found', 50, 230);
    return;
  }

  let yPos = 230;
  evidence.slice(0, 8).forEach((ev) => {
    const statusColor = ev.status === 'approved' || ev.status === 'final' ? '#10b981' : 
                        ev.status === 'review' ? '#f59e0b' : '#64748b';

    doc.fontSize(9)
       .fillColor('#3b82f6')
       .text(ev.id || 'EV-XXXXX', 50, yPos);

    doc.fontSize(9)
       .fillColor('#334155')
       .text(truncate(ev.title || ev.notes || 'Untitled', 50), 130, yPos);

    doc.fontSize(9)
       .fillColor(statusColor)
       .text(capitalize(ev.status), 450, yPos);

    yPos += 22;
  });
}

function generateRemediationPlan(doc, gaps) {
  doc.fontSize(24)
     .fillColor('#1e293b')
     .text('Remediation Plan', 50, 50);

  doc.moveTo(50, 85)
     .lineTo(220, 85)
     .strokeColor('#f59e0b')
     .lineWidth(3)
     .stroke();

  if (gaps.length === 0) {
    doc.fontSize(14)
       .fillColor('#10b981')
       .text('✓ No remediation required - all controls compliant', 50, 120);
    return;
  }

  // Priority breakdown
  const critical = gaps.filter(g => g.risk === 'critical').length;
  const high = gaps.filter(g => g.risk === 'high').length;
  const medium = gaps.filter(g => g.risk === 'medium').length;
  const low = gaps.filter(g => g.risk === 'low').length;

  doc.fontSize(11)
     .fillColor('#64748b')
     .text('Priority Breakdown:', 50, 110);

  const priorities = [
    { label: 'Critical', count: critical, color: '#ef4444' },
    { label: 'High', count: high, color: '#f59e0b' },
    { label: 'Medium', count: medium, color: '#3b82f6' },
    { label: 'Low', count: low, color: '#10b981' },
  ];

  let xPos = 50;
  priorities.forEach((p) => {
    doc.roundedRect(xPos, 130, 115, 50, 5)
       .fillAndStroke('#ffffff', p.color);
    
    doc.fontSize(18)
       .fillColor(p.color)
       .text(p.count.toString(), xPos + 15, 140);
    
    doc.fontSize(9)
       .fillColor('#64748b')
       .text(p.label, xPos + 15, 162);
    
    xPos += 125;
  });

  // Action items
  doc.fontSize(14)
     .fillColor('#475569')
     .text('Recommended Actions', 50, 210);

  let yPos = 240;
  const actionItems = gaps.slice(0, 10).map((gap, i) => ({
    priority: i + 1,
    control: gap.id,
    action: `Implement ${gap.title}`,
    risk: gap.risk,
  }));

  actionItems.forEach((item) => {
    const riskColor = item.risk === 'critical' ? '#ef4444' : 
                      item.risk === 'high' ? '#f59e0b' : '#3b82f6';

    doc.roundedRect(50, yPos, 495, 35, 5)
       .fillAndStroke('#f8fafc', '#e2e8f0');

    doc.circle(70, yPos + 17, 10)
       .fill(riskColor);
    
    doc.fontSize(10)
       .fillColor('#ffffff')
       .text(item.priority.toString(), 66, yPos + 12);

    doc.fontSize(9)
       .fillColor('#3b82f6')
       .text(item.control, 90, yPos + 8);

    doc.fontSize(9)
       .fillColor('#334155')
       .text(truncate(item.action, 55), 90, yPos + 20);

    yPos += 42;
  });
}

function generateAppendix(doc, data) {
  doc.fontSize(24)
     .fillColor('#1e293b')
     .text('Appendix', 50, 50);

  doc.moveTo(50, 85)
     .lineTo(140, 85)
     .strokeColor('#64748b')
     .lineWidth(3)
     .stroke();

  // Report metadata
  doc.fontSize(14)
     .fillColor('#475569')
     .text('Report Metadata', 50, 120);

  const metadata = [
    { label: 'Organization', value: data.organizationName },
    { label: 'Report Type', value: formatReportType(data.reportType) },
    { label: 'Generated At', value: formatDate(data.generatedAt) },
    { label: 'Generated By', value: data.generatedBy },
    { label: 'Total Controls Assessed', value: data.controls.length.toString() },
    { label: 'Custom Controls', value: data.customControls.length.toString() },
    { label: 'Evidence Records', value: data.evidence.length.toString() },
  ];

  let yPos = 150;
  metadata.forEach(({ label, value }) => {
    doc.fontSize(10)
       .fillColor('#64748b')
       .text(label + ':', 50, yPos);
    doc.fontSize(10)
       .fillColor('#334155')
       .text(value, 200, yPos);
    yPos += 20;
  });

  // Disclaimer
  doc.fontSize(14)
     .fillColor('#475569')
     .text('Disclaimer', 50, yPos + 30);

  doc.fontSize(9)
     .fillColor('#64748b')
     .text(
       'This report is generated based on self-assessment data provided by the organization. ' +
       'It does not constitute a formal audit or certification. Organizations should engage ' +
       'qualified auditors for official compliance certifications. The accuracy of this report ' +
       'depends on the accuracy and completeness of the input data.',
       50, yPos + 55, { width: 495, align: 'justify' }
     );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

  // Estimate based on compliant controls
  const compliantCount = Object.values(responses).filter(r => r.answer === 'yes').length;
  const ratio = compliantCount / (controls.length || 236);

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
        risk: control.risk_level || 'medium',
        status: response.answer,
      });
    }
  });

  // Sort by risk level
  const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  gaps.sort((a, b) => (riskOrder[a.risk] || 2) - (riskOrder[b.risk] || 2));

  return gaps;
}

function formatReportType(type) {
  const types = {
    full: 'Full Compliance Report',
    gaps: 'Gap Analysis Report',
    evidence: 'Evidence Summary Report',
  };
  return types[type] || 'Compliance Report';
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

function truncate(str, length) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
