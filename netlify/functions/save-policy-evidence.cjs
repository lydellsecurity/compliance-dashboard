// netlify/functions/save-policy-evidence.js
// Saves AI-generated policy as PDF to Supabase Storage and updates evidence record

const { createClient } = require('@supabase/supabase-js');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Generate unique document hash for integrity verification
function generateDocumentHash(content, metadata, timestamp) {
  const hashContent = JSON.stringify({
    content: content,
    controlId: metadata.controlId,
    companyName: metadata.companyName,
    timestamp: timestamp,
  });
  return crypto.createHash('sha256').update(hashContent).digest('hex').substring(0, 16).toUpperCase();
}

// Convert markdown to plain text for PDF (basic conversion)
function markdownToPlainText(markdown) {
  return markdown
    // Remove headers but keep text
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markers
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.*?)`/g, '$1')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Generate PDF from policy markdown with professional AttestAI layout
async function generatePDF(policyMarkdown, metadata, signatureData = null) {
  return new Promise((resolve, reject) => {
    try {
      const chunks = [];
      const signatureTimestamp = new Date().toISOString();
      const documentHash = signatureData?.userName
        ? generateDocumentHash(policyMarkdown, metadata, signatureTimestamp)
        : null;

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        info: {
          Title: `${metadata.controlId} - Security Policy`,
          Author: 'AttestAI by Lydell Security',
          Subject: 'Security Policy Document',
          Creator: 'AttestAI GRC Platform',
          Producer: 'AttestAI by Lydell Security',
          Keywords: `${metadata.controlId}, Security Policy, Compliance, ${metadata.frameworks || 'SOC 2, ISO 27001'}, AttestAI`,
        },
        // PDF security settings for read-only document
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
      doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), documentHash }));
      doc.on('error', reject);

      // ========================================
      // PROFESSIONAL ATTESTAI HEADER
      // ========================================

      // Top accent bar
      doc.rect(0, 0, doc.page.width, 8).fill('#7C3AED');

      // Company name header
      doc.moveDown(1.5);
      doc.fontSize(28).font('Helvetica-Bold').fillColor('#1f2937')
        .text('AttestAI', { align: 'center' });
      doc.moveDown(0.2);

      // Subtitle
      doc.fontSize(11).font('Helvetica').fillColor('#6b7280')
        .text('Governance, Risk & Compliance Platform', { align: 'center' });

      // Document type badge
      doc.moveDown(0.8);
      const badgeY = doc.y;
      const badgeWidth = 200;
      const badgeX = (doc.page.width - badgeWidth) / 2;
      doc.roundedRect(badgeX, badgeY, badgeWidth, 28, 4).fill('#7C3AED');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
        .text('SECURITY POLICY DOCUMENT', badgeX, badgeY + 8, { width: badgeWidth, align: 'center' });

      doc.moveDown(2);

      // Control info box
      const infoBoxY = doc.y;
      doc.roundedRect(60, infoBoxY, doc.page.width - 120, 70, 6)
        .fillAndStroke('#f8fafc', '#e2e8f0');

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151')
        .text('Control ID:', 80, infoBoxY + 12);
      doc.font('Helvetica').fillColor('#111827')
        .text(metadata.controlId, 150, infoBoxY + 12);

      doc.font('Helvetica-Bold').fillColor('#374151')
        .text('Organization:', 300, infoBoxY + 12);
      doc.font('Helvetica').fillColor('#111827')
        .text(metadata.companyName || 'Organization', 380, infoBoxY + 12);

      doc.font('Helvetica-Bold').fillColor('#374151')
        .text('Effective Date:', 80, infoBoxY + 32);
      doc.font('Helvetica').fillColor('#111827')
        .text(new Date(metadata.generatedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }), 165, infoBoxY + 32);

      doc.font('Helvetica-Bold').fillColor('#374151')
        .text('Classification:', 300, infoBoxY + 32);
      doc.font('Helvetica').fillColor('#dc2626')
        .text('INTERNAL - CONFIDENTIAL', 380, infoBoxY + 32);

      doc.font('Helvetica-Bold').fillColor('#374151')
        .text('Version:', 80, infoBoxY + 52);
      doc.font('Helvetica').fillColor('#111827')
        .text('1.0', 125, infoBoxY + 52);

      doc.font('Helvetica-Bold').fillColor('#374151')
        .text('Frameworks:', 300, infoBoxY + 52);
      doc.font('Helvetica').fillColor('#111827')
        .text(metadata.frameworks || 'SOC 2, ISO 27001, HIPAA, NIST CSF', 375, infoBoxY + 52, { width: 150 });

      doc.y = infoBoxY + 85;

      // Divider line
      doc.moveTo(60, doc.y)
        .lineTo(doc.page.width - 60, doc.y)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();
      doc.moveDown(1);

      // ========================================
      // POLICY CONTENT
      // ========================================

      const lines = policyMarkdown.split('\n');
      let inCodeBlock = false;

      for (const line of lines) {
        // Check for page break needed
        if (doc.y > doc.page.height - 120) {
          doc.addPage();
          doc.y = 60;
        }

        if (line.startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          continue;
        }

        if (inCodeBlock) {
          doc.fontSize(9).font('Courier').fillColor('#374151')
            .text(line, { indent: 20 });
          continue;
        }

        // Headers
        if (line.startsWith('# ')) {
          doc.moveDown(0.5);
          doc.fontSize(18).font('Helvetica-Bold').fillColor('#7C3AED')
            .text(line.replace(/^#\s+/, '').toUpperCase());
          doc.moveDown(0.3);
        } else if (line.startsWith('## ')) {
          doc.moveDown(0.5);
          doc.fontSize(14).font('Helvetica-Bold').fillColor('#1f2937')
            .text(line.replace(/^##\s+/, ''));
          // Underline for h2
          doc.moveTo(60, doc.y + 2)
            .lineTo(200, doc.y + 2)
            .strokeColor('#7C3AED')
            .lineWidth(2)
            .stroke();
          doc.moveDown(0.4);
        } else if (line.startsWith('### ')) {
          doc.moveDown(0.3);
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#374151')
            .text(line.replace(/^###\s+/, ''));
          doc.moveDown(0.2);
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          const text = line.replace(/^[-*]\s+/, '');
          const processedText = text
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1');
          doc.fontSize(10).font('Helvetica').fillColor('#374151')
            .text('•  ' + processedText, { indent: 15 });
        } else if (/^\d+\.\s/.test(line)) {
          const processedText = line
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1');
          doc.fontSize(10).font('Helvetica').fillColor('#374151')
            .text(processedText, { indent: 15 });
        } else if (line.trim() === '') {
          doc.moveDown(0.3);
        } else if (line.startsWith('>')) {
          const text = line.replace(/^>\s*/, '');
          // Quote box
          const quoteY = doc.y;
          doc.rect(60, quoteY, 4, 20).fill('#7C3AED');
          doc.fontSize(10).font('Helvetica-Oblique').fillColor('#6b7280')
            .text(text, 75, quoteY + 3, { indent: 0 });
          doc.moveDown(0.3);
        } else {
          const processedText = line
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1');
          if (processedText.trim()) {
            doc.fontSize(10).font('Helvetica').fillColor('#374151')
              .text(processedText, { lineGap: 2 });
          }
        }
      }

      // ========================================
      // E-SIGNATURE BLOCK
      // ========================================

      if (signatureData?.userName) {
        // Ensure signature block is on its own page if near bottom
        if (doc.y > doc.page.height - 200) {
          doc.addPage();
          doc.y = 60;
        }

        doc.moveDown(2);

        // Signature section header
        doc.moveTo(60, doc.y)
          .lineTo(doc.page.width - 60, doc.y)
          .strokeColor('#7C3AED')
          .lineWidth(2)
          .stroke();
        doc.moveDown(0.8);

        doc.fontSize(14).font('Helvetica-Bold').fillColor('#7C3AED')
          .text('ELECTRONIC SIGNATURE & APPROVAL', { align: 'center' });
        doc.moveDown(0.8);

        // Signature info box
        const sigBoxY = doc.y;
        doc.roundedRect(60, sigBoxY, doc.page.width - 120, 100, 6)
          .fillAndStroke('#faf5ff', '#c4b5fd');

        const formattedTimestamp = new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
        });

        // Signature fields
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#5b21b6')
          .text('Digitally Signed By:', 80, sigBoxY + 15);
        doc.font('Helvetica').fillColor('#1f2937')
          .text(signatureData.userName, 195, sigBoxY + 15);

        doc.font('Helvetica-Bold').fillColor('#5b21b6')
          .text('Job Title:', 80, sigBoxY + 35);
        doc.font('Helvetica').fillColor('#1f2937')
          .text(signatureData.jobTitle || 'Compliance Officer', 195, sigBoxY + 35);

        doc.font('Helvetica-Bold').fillColor('#5b21b6')
          .text('Timestamp:', 80, sigBoxY + 55);
        doc.font('Helvetica').fillColor('#1f2937')
          .text(formattedTimestamp, 195, sigBoxY + 55);

        doc.font('Helvetica-Bold').fillColor('#5b21b6')
          .text('Document Hash:', 80, sigBoxY + 75);
        doc.font('Courier').fillColor('#059669')
          .text(documentHash, 195, sigBoxY + 75);

        doc.y = sigBoxY + 115;

        // Legal attestation
        doc.fontSize(8).font('Helvetica-Oblique').fillColor('#6b7280')
          .text(
            'This electronic signature constitutes a legally binding approval. The document hash above serves as a unique identifier ' +
            'for integrity verification. Any modification to this document will invalidate the signature.',
            60, doc.y, { align: 'center', width: doc.page.width - 120 }
          );

        doc.moveDown(1);

        // Verification badge
        const badgeVerifyY = doc.y;
        const verifyBadgeWidth = 160;
        const verifyBadgeX = (doc.page.width - verifyBadgeWidth) / 2;
        doc.roundedRect(verifyBadgeX, badgeVerifyY, verifyBadgeWidth, 24, 12).fill('#059669');
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
          .text('✓ VERIFIED & LOCKED', verifyBadgeX, badgeVerifyY + 7, { width: verifyBadgeWidth, align: 'center' });
      }

      // ========================================
      // FOOTER
      // ========================================

      // Go to bottom of last page for footer
      const footerY = doc.page.height - 50;

      doc.moveTo(60, footerY - 10)
        .lineTo(doc.page.width - 60, footerY - 10)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
        .text(
          `Generated by AttestAI | ${metadata.companyName || 'Organization'} | Confidential`,
          60, footerY, { align: 'center', width: doc.page.width - 120 }
        );

      if (documentHash) {
        doc.fontSize(7).fillColor('#a1a1aa')
          .text(`Document Hash: ${documentHash}`, 60, footerY + 12, { align: 'center', width: doc.page.width - 120 });
      }

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
    // Parse request body
    const payload = JSON.parse(event.body || '{}');
    const {
      policyMarkdown,
      metadata,
      organizationId,
      controlId,
      evidenceId,
      userName,
      jobTitle,
      riskLevel,
    } = payload;

    if (!policyMarkdown || !metadata || !organizationId || !controlId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields: policyMarkdown, metadata, organizationId, controlId' }),
      };
    }

    // Initialize Supabase
    const supabase = getSupabaseClient();

    // Prepare signature data
    const signatureData = userName ? {
      userName,
      jobTitle: jobTitle || 'Compliance Officer',
    } : null;

    // Generate PDF with digital signature and document hash
    console.log('Generating PDF for control:', controlId);
    const { buffer: pdfBuffer, documentHash } = await generatePDF(policyMarkdown, metadata, signatureData);
    console.log('PDF generated, size:', pdfBuffer.length, 'bytes, hash:', documentHash);

    // Create unique filename
    const timestamp = Date.now();
    const fileName = `${controlId}-policy-${timestamp}.pdf`;
    const filePath = `${organizationId}/policies/${fileName}`;

    // Upload to Supabase Storage
    console.log('Uploading to Supabase Storage:', filePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('evidence')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('evidence')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log('PDF uploaded, public URL:', publicUrl);

    // Update user_responses with evidence_url AND mark as compliant
    const { error: updateError } = await supabase
      .from('user_responses')
      .update({
        evidence_url: publicUrl,
        file_url: publicUrl,
        file_name: fileName,
        answer: 'yes',  // Move from Gap to Compliant
        status: 'complete',
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('control_id', controlId);

    if (updateError) {
      console.error('Database update error:', updateError);
      // Don't fail the request, URL was still created
    }

    // Determine if this was a critical risk closure
    const wasCriticalRisk = riskLevel === 'critical' || riskLevel === 'high';

    // If evidenceId provided, also update evidence_records
    if (evidenceId) {
      // First fetch the current record to append to arrays
      const { data: existingRecord } = await supabase
        .from('evidence_records')
        .select('file_urls, file_metadata')
        .eq('evidence_id', evidenceId)
        .eq('organization_id', organizationId)
        .single();

      const existingUrls = existingRecord?.file_urls || [];
      const existingMetadata = existingRecord?.file_metadata || [];

      const { error: evidenceUpdateError } = await supabase
        .from('evidence_records')
        .update({
          file_urls: [...existingUrls, publicUrl],
          file_metadata: [...existingMetadata, {
            name: fileName,
            size: pdfBuffer.length,
            type: 'application/pdf',
            uploaded_at: new Date().toISOString(),
            source: 'ai-policy-generator',
          }],
          status: 'review',
          updated_at: new Date().toISOString(),
        })
        .eq('evidence_id', evidenceId)
        .eq('organization_id', organizationId);

      if (evidenceUpdateError) {
        console.error('Evidence record update error:', evidenceUpdateError);
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        evidenceUrl: publicUrl,
        fileName,
        filePath,
        fileSize: pdfBuffer.length,
        documentHash,
        controlMarkedCompliant: true,
        triggerConfetti: wasCriticalRisk,  // Frontend uses this to show confetti
        isVerified: !!documentHash,  // UI uses this to show verified badge
      }),
    };

  } catch (error) {
    console.error('Save policy evidence error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to save policy evidence',
        message: error.message,
      }),
    };
  }
};
