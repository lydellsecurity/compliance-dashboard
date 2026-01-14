// netlify/functions/generate-certificate.js
// Generates compliance completion certificate when score reaches 100%

const { createClient } = require('@supabase/supabase-js');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null; // Allow function to work without Supabase for local testing
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Generate unique certificate ID
function generateCertificateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part3 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CERT-${part1}-${part2}-${part3}`;
}

// Generate certificate hash for verification
function generateCertificateHash(certificateId, organizationName, completionDate) {
  const hashContent = JSON.stringify({
    certificateId,
    organizationName,
    completionDate,
    issuer: 'LYDELL SECURITY',
  });
  return crypto.createHash('sha256').update(hashContent).digest('hex').substring(0, 24).toUpperCase();
}

// Generate the certificate PDF
async function generateCertificatePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const {
        certificateId,
        organizationName,
        completionDate,
        frameworks,
        totalControls,
        compliantControls,
        issuedBy,
        certificateHash,
      } = data;

      const chunks = [];

      // Create landscape A4 document
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 40, bottom: 40, left: 50, right: 50 },
        info: {
          Title: `Compliance Certificate - ${organizationName}`,
          Author: 'LYDELL SECURITY',
          Subject: 'Compliance Completion Certificate',
          Creator: 'Lydell Security GRC Platform',
          Keywords: 'Compliance, Certificate, SOC2, ISO27001, HIPAA, NIST',
        },
        // Read-only permissions
        pdfVersion: '1.7',
        permissions: {
          printing: 'highResolution',
          modifying: false,
          copying: true,
          annotating: false,
          fillingForms: false,
          contentAccessibility: true,
          documentAssembly: false,
        },
      });

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // ========================================
      // PARCHMENT BACKGROUND WITH BORDER
      // ========================================

      // Outer border frame
      doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
        .lineWidth(3)
        .strokeColor('#7C3AED')
        .stroke();

      // Inner decorative border
      doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
        .lineWidth(1)
        .strokeColor('#C4B5FD')
        .stroke();

      // Corner accents (top-left)
      doc.moveTo(20, 60).lineTo(60, 60).lineTo(60, 20)
        .lineWidth(3).strokeColor('#7C3AED').stroke();

      // Corner accents (top-right)
      doc.moveTo(pageWidth - 20, 60).lineTo(pageWidth - 60, 60).lineTo(pageWidth - 60, 20)
        .lineWidth(3).strokeColor('#7C3AED').stroke();

      // Corner accents (bottom-left)
      doc.moveTo(20, pageHeight - 60).lineTo(60, pageHeight - 60).lineTo(60, pageHeight - 20)
        .lineWidth(3).strokeColor('#7C3AED').stroke();

      // Corner accents (bottom-right)
      doc.moveTo(pageWidth - 20, pageHeight - 60).lineTo(pageWidth - 60, pageHeight - 60).lineTo(pageWidth - 60, pageHeight - 20)
        .lineWidth(3).strokeColor('#7C3AED').stroke();

      // ========================================
      // HEADER SECTION
      // ========================================

      let yPos = 60;

      // Company logo/name
      doc.fontSize(14).font('Helvetica').fillColor('#7C3AED')
        .text('LYDELL SECURITY', 0, yPos, { align: 'center', width: pageWidth });

      yPos += 20;
      doc.fontSize(10).fillColor('#6B7280')
        .text('Governance, Risk & Compliance Platform', 0, yPos, { align: 'center', width: pageWidth });

      // ========================================
      // CERTIFICATE TITLE
      // ========================================

      yPos += 40;
      doc.fontSize(36).font('Helvetica-Bold').fillColor('#1F2937')
        .text('CERTIFICATE OF COMPLIANCE', 0, yPos, { align: 'center', width: pageWidth });

      yPos += 50;
      doc.fontSize(12).font('Helvetica').fillColor('#6B7280')
        .text('This is to certify that', 0, yPos, { align: 'center', width: pageWidth });

      // ========================================
      // ORGANIZATION NAME
      // ========================================

      yPos += 30;
      doc.fontSize(32).font('Helvetica-Bold').fillColor('#7C3AED')
        .text(organizationName, 0, yPos, { align: 'center', width: pageWidth });

      // Underline
      const nameWidth = doc.widthOfString(organizationName);
      const nameX = (pageWidth - nameWidth) / 2;
      doc.moveTo(nameX, yPos + 42).lineTo(nameX + nameWidth, yPos + 42)
        .lineWidth(2).strokeColor('#C4B5FD').stroke();

      // ========================================
      // ACHIEVEMENT TEXT
      // ========================================

      yPos += 60;
      doc.fontSize(12).font('Helvetica').fillColor('#374151')
        .text('has successfully achieved 100% compliance across all security controls', 0, yPos, { align: 'center', width: pageWidth });

      yPos += 20;
      doc.text('and has demonstrated adherence to the following frameworks:', 0, yPos, { align: 'center', width: pageWidth });

      // ========================================
      // FRAMEWORK BADGES
      // ========================================

      yPos += 35;
      const frameworkColors = {
        SOC2: '#3B82F6',
        ISO27001: '#10B981',
        HIPAA: '#F59E0B',
        NIST: '#8B5CF6',
      };

      const badgeWidth = 120;
      const badgeHeight = 30;
      const badgeGap = 20;
      const totalBadgeWidth = (frameworks.length * badgeWidth) + ((frameworks.length - 1) * badgeGap);
      let badgeX = (pageWidth - totalBadgeWidth) / 2;

      frameworks.forEach(fw => {
        const color = frameworkColors[fw.id] || '#6B7280';

        // Badge background
        doc.roundedRect(badgeX, yPos, badgeWidth, badgeHeight, 4)
          .fill(color);

        // Framework name
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF')
          .text(fw.name, badgeX, yPos + 9, { width: badgeWidth, align: 'center' });

        // Percentage below badge
        doc.fontSize(9).font('Helvetica').fillColor('#6B7280')
          .text(`${fw.percentage}%`, badgeX, yPos + badgeHeight + 5, { width: badgeWidth, align: 'center' });

        badgeX += badgeWidth + badgeGap;
      });

      // ========================================
      // CONTROLS SUMMARY
      // ========================================

      yPos += 80;
      doc.fontSize(11).font('Helvetica').fillColor('#374151')
        .text(`${compliantControls} of ${totalControls} Security Controls Verified`, 0, yPos, { align: 'center', width: pageWidth });

      // ========================================
      // SIGNATURE SECTION
      // ========================================

      yPos += 50;

      // Left signature block
      const sigBlockWidth = 200;
      const leftSigX = (pageWidth / 2) - sigBlockWidth - 60;
      const rightSigX = (pageWidth / 2) + 60;

      // Completion Date
      doc.moveTo(leftSigX, yPos + 20).lineTo(leftSigX + sigBlockWidth, yPos + 20)
        .lineWidth(1).strokeColor('#D1D5DB').stroke();

      doc.fontSize(12).font('Helvetica').fillColor('#1F2937')
        .text(completionDate, leftSigX, yPos, { width: sigBlockWidth, align: 'center' });

      doc.fontSize(9).fillColor('#6B7280')
        .text('Completion Date', leftSigX, yPos + 25, { width: sigBlockWidth, align: 'center' });

      // Authorized Signatory
      doc.moveTo(rightSigX, yPos + 20).lineTo(rightSigX + sigBlockWidth, yPos + 20)
        .lineWidth(1).strokeColor('#D1D5DB').stroke();

      doc.fontSize(12).font('Helvetica').fillColor('#1F2937')
        .text(issuedBy || 'Compliance Officer', rightSigX, yPos, { width: sigBlockWidth, align: 'center' });

      doc.fontSize(9).fillColor('#6B7280')
        .text('Authorized Signatory', rightSigX, yPos + 25, { width: sigBlockWidth, align: 'center' });

      // ========================================
      // CERTIFICATE ID & VERIFICATION
      // ========================================

      yPos = pageHeight - 90;

      // Certificate ID badge
      const certBadgeWidth = 280;
      const certBadgeX = (pageWidth - certBadgeWidth) / 2;

      doc.roundedRect(certBadgeX, yPos, certBadgeWidth, 35, 4)
        .fillAndStroke('#F3F4F6', '#E5E7EB');

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#6B7280')
        .text('CERTIFICATE ID', certBadgeX, yPos + 6, { width: certBadgeWidth, align: 'center' });

      doc.fontSize(11).font('Courier').fillColor('#1F2937')
        .text(certificateId, certBadgeX, yPos + 18, { width: certBadgeWidth, align: 'center' });

      // Verification info
      yPos += 45;
      doc.fontSize(8).font('Helvetica').fillColor('#9CA3AF')
        .text(`Verification Hash: ${certificateHash}`, 0, yPos, { align: 'center', width: pageWidth });

      yPos += 12;
      doc.text('Verify this certificate at verify.lydellsecurity.com', 0, yPos, { align: 'center', width: pageWidth });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const {
      organizationId,
      organizationName,
      totalScore,
      frameworks,
      totalControls,
      compliantControls,
      issuedBy,
    } = payload;

    // Validate required fields
    if (!organizationName || totalScore === undefined) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields: organizationName, totalScore' }),
      };
    }

    // Verify 100% compliance
    if (totalScore !== 100) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Certificate not available',
          message: `Compliance score must be 100% to generate certificate. Current score: ${totalScore}%`,
          currentScore: totalScore,
        }),
      };
    }

    // Generate certificate metadata
    const certificateId = generateCertificateId();
    const completionDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const certificateHash = generateCertificateHash(certificateId, organizationName, completionDate);

    // Generate PDF
    console.log('Generating certificate for:', organizationName);
    const pdfBuffer = await generateCertificatePDF({
      certificateId,
      organizationName,
      completionDate,
      frameworks: frameworks || [
        { id: 'SOC2', name: 'SOC 2 Type II', percentage: 100 },
        { id: 'ISO27001', name: 'ISO 27001', percentage: 100 },
        { id: 'HIPAA', name: 'HIPAA', percentage: 100 },
        { id: 'NIST', name: 'NIST CSF', percentage: 100 },
      ],
      totalControls: totalControls || 236,
      compliantControls: compliantControls || 236,
      issuedBy: issuedBy || 'Compliance Officer',
      certificateHash,
    });

    console.log('Certificate generated, size:', pdfBuffer.length, 'bytes');

    // Optionally save to Supabase Storage
    const supabase = getSupabaseClient();
    let publicUrl = null;

    if (supabase && organizationId) {
      const fileName = `${certificateId}.pdf`;
      const filePath = `${organizationId}/certificates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: false,
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('evidence')
          .getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;

        // Store certificate record in database
        await supabase.from('certificates').upsert({
          certificate_id: certificateId,
          organization_id: organizationId,
          organization_name: organizationName,
          certificate_hash: certificateHash,
          completion_date: new Date().toISOString(),
          issued_by: issuedBy,
          total_controls: totalControls,
          compliant_controls: compliantControls,
          file_url: publicUrl,
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'certificate_id'
        });
      }
    }

    // Return PDF as base64 if no storage, or URL if stored
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        certificateId,
        certificateHash,
        completionDate,
        fileUrl: publicUrl,
        pdfBase64: publicUrl ? null : pdfBuffer.toString('base64'),
        message: 'Certificate generated successfully',
      }),
    };

  } catch (error) {
    console.error('Certificate generation error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to generate certificate',
        message: error.message,
      }),
    };
  }
};
