// netlify/functions/generate-policy.js
// Professional Policy Document Generator

const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Input validation
function validatePayload(payload) {
  const errors = [];

  if (!payload.controlId || typeof payload.controlId !== 'string') {
    errors.push('controlId is required and must be a string');
  }
  if (!payload.controlTitle || typeof payload.controlTitle !== 'string') {
    errors.push('controlTitle is required and must be a string');
  }
  if (payload.organizationName && typeof payload.organizationName !== 'string') {
    errors.push('organizationName must be a string');
  }
  if (payload.organizationName && payload.organizationName.length > 200) {
    errors.push('organizationName must be less than 200 characters');
  }

  return errors;
}

function sanitizeString(str, maxLength = 1000) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\x00-\x1F\x7F]/g, '').substring(0, maxLength).trim();
}

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse and validate payload
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON payload' }),
      };
    }

    const validationErrors = validatePayload(payload);
    if (validationErrors.length > 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Validation failed', details: validationErrors }),
      };
    }

    // Extract and sanitize data
    const organizationName = sanitizeString(payload.organizationName) || 'LYDELL SECURITY';
    const controlId = sanitizeString(payload.controlId, 50);
    const controlTitle = sanitizeString(payload.controlTitle, 200);
    const controlDescription = sanitizeString(payload.controlDescription, 2000);
    const remediationSteps = Array.isArray(payload.remediationSteps)
      ? payload.remediationSteps.map(s => sanitizeString(s, 500))
      : [];
    const securityPrinciple = sanitizeString(payload.securityPrinciple, 500);
    const frameworks = Array.isArray(payload.frameworks) ? payload.frameworks : [];
    const riskLevel = sanitizeString(payload.riskLevel, 20) || 'Medium';

    // Create PDF document
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      info: {
        Title: `${controlId} - Security Policy`,
        Author: organizationName,
        Subject: controlTitle,
        Keywords: 'security, policy, compliance',
        CreationDate: new Date(),
      },
    });

    // Collect PDF chunks
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    // Colors
    const colors = {
      primary: '#1E40AF',
      secondary: '#3B82F6',
      text: '#1F2937',
      textLight: '#6B7280',
      border: '#E5E7EB',
      success: '#059669',
      warning: '#D97706',
      danger: '#DC2626',
      background: '#F9FAFB',
    };

    // Helper functions
    const drawHorizontalLine = (y, width = 468) => {
      doc.moveTo(72, y).lineTo(72 + width, y).stroke(colors.border);
    };

    const getRiskColor = (risk) => {
      const lower = risk.toLowerCase();
      if (lower === 'critical' || lower === 'high') return colors.danger;
      if (lower === 'medium') return colors.warning;
      return colors.success;
    };

    // ========================================
    // PAGE 1: COVER PAGE
    // ========================================

    // Header bar
    doc.rect(0, 0, 612, 120).fill(colors.primary);

    // Organization name
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#FFFFFF')
       .text(organizationName, 72, 40, { align: 'left' });

    // Document type badge
    doc.fontSize(10)
       .font('Helvetica')
       .text('SECURITY POLICY DOCUMENT', 72, 60, { align: 'left' });

    // Control ID badge
    doc.rect(440, 35, 100, 30).fill('#FFFFFF');
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text(controlId, 450, 45, { width: 80, align: 'center' });

    // Main title
    doc.fontSize(28)
       .font('Helvetica-Bold')
       .fillColor(colors.text)
       .text(controlTitle, 72, 160, { width: 468 });

    // Subtitle / Security Principle
    if (securityPrinciple) {
      doc.fontSize(14)
         .font('Helvetica')
         .fillColor(colors.secondary)
         .text(`Security Principle: ${securityPrinciple}`, 72, doc.y + 20, { width: 468 });
    }

    // Risk level badge
    doc.y = 280;
    const riskColor = getRiskColor(riskLevel);
    doc.rect(72, doc.y, 120, 30).fill(riskColor);
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('#FFFFFF')
       .text(`${riskLevel.toUpperCase()} RISK`, 82, doc.y - 22, { width: 100, align: 'center' });

    // Framework badges
    if (frameworks.length > 0) {
      doc.y = 330;
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(colors.textLight)
         .text('APPLICABLE FRAMEWORKS:', 72, doc.y);

      let xPos = 72;
      frameworks.forEach((fw, i) => {
        const fwText = typeof fw === 'string' ? fw : `${fw.frameworkId} ${fw.clauseId || ''}`;
        const textWidth = doc.widthOfString(fwText) + 20;
        doc.rect(xPos, doc.y + 15, textWidth, 24).fill(colors.background);
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor(colors.text)
           .text(fwText, xPos + 10, doc.y + 22);
        xPos += textWidth + 10;
        if (xPos > 450 && i < frameworks.length - 1) {
          xPos = 72;
          doc.y += 35;
        }
      });
    }

    // Document metadata
    doc.y = 450;
    drawHorizontalLine(doc.y);

    doc.y += 20;
    const metadataY = doc.y;

    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor(colors.textLight)
       .text('DOCUMENT VERSION', 72, metadataY);
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(colors.text)
       .text('1.0', 72, metadataY + 15);

    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor(colors.textLight)
       .text('EFFECTIVE DATE', 200, metadataY);
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(colors.text)
       .text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 200, metadataY + 15);

    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor(colors.textLight)
       .text('REVIEW CYCLE', 350, metadataY);
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(colors.text)
       .text('Annual', 350, metadataY + 15);

    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor(colors.textLight)
       .text('CLASSIFICATION', 450, metadataY);
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(colors.text)
       .text('Internal', 450, metadataY + 15);

    // Footer
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor(colors.textLight)
       .text(`${organizationName} - Confidential`, 72, 700, { align: 'center', width: 468 });

    // ========================================
    // PAGE 2: POLICY CONTENT
    // ========================================

    doc.addPage();

    // Header
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text(organizationName, 72, 50);

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(colors.textLight)
       .text(`${controlId} - Security Policy`, 350, 50, { width: 190, align: 'right' });

    drawHorizontalLine(70);

    // Section 1: Purpose
    doc.y = 100;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('1. Purpose', 72, doc.y);

    doc.fontSize(11)
       .font('Helvetica')
       .fillColor(colors.text)
       .text(
         `This policy establishes the requirements and guidelines for implementing ${controlTitle.toLowerCase()} within ${organizationName}. ` +
         'It defines the standards, procedures, and responsibilities necessary to maintain compliance with applicable security frameworks and regulatory requirements.',
         72, doc.y + 25, { width: 468, lineGap: 4 }
       );

    // Section 2: Scope
    doc.y += 80;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('2. Scope', 72, doc.y);

    doc.fontSize(11)
       .font('Helvetica')
       .fillColor(colors.text)
       .text(
         `This policy applies to all employees, contractors, and third-party personnel who access ${organizationName} systems, data, or facilities. ` +
         'It covers all information systems, network infrastructure, and data processing activities within the organization.',
         72, doc.y + 25, { width: 468, lineGap: 4 }
       );

    // Section 3: Policy Statement
    doc.y += 80;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('3. Policy Statement', 72, doc.y);

    if (controlDescription) {
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor(colors.text)
         .text(controlDescription, 72, doc.y + 25, { width: 468, lineGap: 4 });
    } else {
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor(colors.text)
         .text(
           `${organizationName} is committed to maintaining robust security controls to protect organizational assets and stakeholder interests. ` +
           `This policy mandates the implementation and maintenance of ${controlTitle.toLowerCase()} as a critical component of our security program.`,
           72, doc.y + 25, { width: 468, lineGap: 4 }
         );
    }

    // Section 4: Implementation Requirements
    doc.y += 100;
    if (doc.y > 600) doc.addPage();

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('4. Implementation Requirements', 72, doc.y);

    doc.y += 25;

    if (remediationSteps.length > 0) {
      remediationSteps.forEach((step, index) => {
        if (doc.y > 680) {
          doc.addPage();
          doc.y = 100;
        }

        // Step number box
        doc.rect(72, doc.y, 24, 24).fill(colors.secondary);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#FFFFFF')
           .text(`${index + 1}`, 72, doc.y + 6, { width: 24, align: 'center' });

        // Step text
        doc.fontSize(11)
           .font('Helvetica')
           .fillColor(colors.text)
           .text(step, 108, doc.y + 4, { width: 420, lineGap: 3 });

        doc.y += Math.max(35, doc.heightOfString(step, { width: 420 }) + 15);
      });
    } else {
      const defaultSteps = [
        'Assess current state and identify gaps in existing controls',
        'Develop implementation plan with timeline and resource allocation',
        'Deploy technical controls and configure systems according to standards',
        'Document procedures and train relevant personnel',
        'Monitor effectiveness and perform regular compliance reviews',
      ];

      defaultSteps.forEach((step, index) => {
        doc.rect(72, doc.y, 24, 24).fill(colors.secondary);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#FFFFFF')
           .text(`${index + 1}`, 72, doc.y + 6, { width: 24, align: 'center' });

        doc.fontSize(11)
           .font('Helvetica')
           .fillColor(colors.text)
           .text(step, 108, doc.y + 4, { width: 420 });

        doc.y += 40;
      });
    }

    // ========================================
    // PAGE 3: ROLES & SIGNATURE
    // ========================================

    doc.addPage();

    // Header
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text(organizationName, 72, 50);

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(colors.textLight)
       .text(`${controlId} - Security Policy`, 350, 50, { width: 190, align: 'right' });

    drawHorizontalLine(70);

    // Section 5: Roles and Responsibilities
    doc.y = 100;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('5. Roles and Responsibilities', 72, doc.y);

    const roles = [
      {
        title: 'Executive Leadership',
        responsibility: 'Provides strategic direction, allocates resources, and ensures organizational commitment to security policy implementation.',
      },
      {
        title: 'Information Security Team',
        responsibility: 'Develops, implements, and monitors security controls. Conducts risk assessments and ensures compliance with this policy.',
      },
      {
        title: 'IT Operations',
        responsibility: 'Implements technical controls, maintains security configurations, and supports incident response activities.',
      },
      {
        title: 'All Personnel',
        responsibility: 'Adheres to security policies and procedures. Reports security incidents and participates in security awareness training.',
      },
    ];

    doc.y += 25;
    roles.forEach((role) => {
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(colors.text)
         .text(role.title, 72, doc.y);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.textLight)
         .text(role.responsibility, 72, doc.y + 15, { width: 468, lineGap: 3 });

      doc.y += 55;
    });

    // Section 6: Compliance
    doc.y += 10;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('6. Compliance and Enforcement', 72, doc.y);

    doc.fontSize(11)
       .font('Helvetica')
       .fillColor(colors.text)
       .text(
         'Compliance with this policy is mandatory for all personnel. Violations may result in disciplinary action, up to and including termination of employment or contract. ' +
         'Compliance will be monitored through regular audits, assessments, and automated controls where applicable.',
         72, doc.y + 25, { width: 468, lineGap: 4 }
       );

    // Signature Section
    doc.y += 100;
    drawHorizontalLine(doc.y);

    doc.y += 30;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('Authorization', 72, doc.y);

    doc.y += 30;

    // Signature boxes
    const sigY = doc.y;

    // Left signature
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor(colors.text)
       .text('Policy Owner', 72, sigY);

    doc.moveTo(72, sigY + 50).lineTo(270, sigY + 50).stroke(colors.border);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(colors.textLight)
       .text('Signature', 72, sigY + 55);

    doc.moveTo(72, sigY + 90).lineTo(270, sigY + 90).stroke(colors.border);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(colors.textLight)
       .text('Name / Title', 72, sigY + 95);

    doc.moveTo(72, sigY + 130).lineTo(170, sigY + 130).stroke(colors.border);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(colors.textLight)
       .text('Date', 72, sigY + 135);

    // Right signature
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor(colors.text)
       .text('Executive Approval', 310, sigY);

    doc.moveTo(310, sigY + 50).lineTo(540, sigY + 50).stroke(colors.border);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(colors.textLight)
       .text('Signature', 310, sigY + 55);

    doc.moveTo(310, sigY + 90).lineTo(540, sigY + 90).stroke(colors.border);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(colors.textLight)
       .text('Name / Title', 310, sigY + 95);

    doc.moveTo(310, sigY + 130).lineTo(410, sigY + 130).stroke(colors.border);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(colors.textLight)
       .text('Date', 310, sigY + 135);

    // Footer
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor(colors.textLight)
       .text(
         `This document is the property of ${organizationName}. Unauthorized distribution is prohibited.`,
         72, 700, { align: 'center', width: 468 }
       );

    // Finalize PDF
    doc.end();

    // Wait for PDF to complete
    const pdfBuffer = await new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${controlId}-policy.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (error) {
    console.error('Policy generation error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to generate policy document',
        message: error.message,
      }),
    };
  }
};
