// netlify/functions/generate-ai-policy.js
// AI-Powered Policy Document Generator using Claude API with Streaming

const Anthropic = require('@anthropic-ai/sdk');

// GRC Consultant System Prompt
const GRC_SYSTEM_PROMPT = `You are a senior Governance, Risk, and Compliance (GRC) consultant with 20+ years of experience advising Fortune 500 companies on information security policies. You have deep expertise in SOC 2, ISO 27001, HIPAA, NIST CSF, and other major compliance frameworks.

Your writing style is:
- Professional and authoritative, suitable for board-level review
- Clear and actionable, avoiding unnecessary jargon
- Precise in defining responsibilities and requirements
- Consistent with industry best practices and regulatory expectations

When generating policy documents, you MUST include these mandatory sections:

1. **PURPOSE** - A clear statement explaining why this policy exists and its importance to the organization's security posture

2. **SCOPE** - Explicit definition of who and what this policy applies to, including systems, personnel, and data

3. **POLICY STATEMENT** - The core requirements written in clear, measurable, and enforceable language. Each requirement should be specific and auditable.

4. **ENFORCEMENT** - Clear consequences for non-compliance and the process for addressing violations

Additionally, include these supporting sections as appropriate:
- Definitions of key terms
- Roles and Responsibilities
- Implementation Requirements
- Exceptions Process
- Related Documents
- Review Cycle and Approval

Format the document professionally with proper Markdown headers. Use bullet points for lists and ensure all requirements are numbered for easy reference during audits.`;

// Input validation
function validatePayload(payload) {
  const errors = [];

  if (!payload.control_id && !payload.controlID) {
    errors.push('control_id is required');
  }
  if (!payload.company_name && !payload.companyName) {
    errors.push('company_name is required');
  }

  return errors;
}

function sanitizeString(str, maxLength = 2000) {
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

  // Check for API key
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Anthropic API key not configured' }),
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

    // Extract and normalize data (support both naming conventions)
    const controlId = sanitizeString(payload.control_id || payload.controlID, 50);
    const companyName = sanitizeString(payload.company_name || payload.companyName, 200) || 'Organization';
    const frameworkContext = payload.framework_context || payload.remediationData || {};

    // Extract details from framework context
    const controlTitle = sanitizeString(frameworkContext.controlTitle || frameworkContext.title, 200);
    const controlDescription = sanitizeString(frameworkContext.controlDescription || frameworkContext.description, 2000);
    const riskLevel = sanitizeString(frameworkContext.riskLevel, 20) || 'Medium';
    const frameworks = Array.isArray(frameworkContext.frameworks) ? frameworkContext.frameworks :
                       Array.isArray(frameworkContext.frameworkMappings) ? frameworkContext.frameworkMappings : [];
    const guidance = sanitizeString(frameworkContext.guidance, 2000);
    const evidenceExamples = Array.isArray(frameworkContext.evidenceExamples)
      ? frameworkContext.evidenceExamples.map(e => sanitizeString(e, 500))
      : [];
    const remediationTip = sanitizeString(frameworkContext.remediationTip, 1000);

    // Build framework list string
    const frameworkList = frameworks.map(f =>
      typeof f === 'string' ? f : `${f.frameworkId || ''} ${f.clauseId || ''}`.trim()
    ).filter(Boolean).join(', ');

    // Build the user prompt
    const userPrompt = `Generate a comprehensive security policy document for the following control:

**Organization:** ${companyName}
**Control ID:** ${controlId}
**Control Title:** ${controlTitle || 'Security Control'}
**Risk Level:** ${riskLevel}
**Applicable Compliance Frameworks:** ${frameworkList || 'General Security Best Practices'}

**Control Description:**
${controlDescription || 'Implement appropriate security controls to protect organizational assets.'}

**Security Guidance:**
${guidance || 'Follow industry best practices for implementation.'}

**Remediation Recommendations:**
${remediationTip || 'Address identified gaps through documented procedures and technical controls.'}

**Evidence Examples for Compliance:**
${evidenceExamples.length > 0 ? evidenceExamples.map(e => `- ${e}`).join('\n') : '- Policy documentation\n- Implementation evidence\n- Audit logs'}

Generate a formal, board-ready policy document that:
1. Clearly addresses the control requirements
2. Is specific to ${companyName}'s context
3. Includes measurable and auditable requirements
4. Maps to the applicable frameworks (${frameworkList || 'general best practices'})
5. Can be immediately adopted with minimal customization

Use proper Markdown formatting with clear section headers.`;

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    // Check if streaming is requested
    const useStreaming = payload.stream === true;

    if (useStreaming) {
      // For streaming, we need to return chunks - but Netlify Functions don't support true streaming
      // So we'll simulate it by returning the full response with a streaming flag
      // The frontend will handle the "typing" effect

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: GRC_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          }
        ]
      });

      const generatedPolicy = message.content[0].type === 'text'
        ? message.content[0].text
        : 'Failed to generate policy content';

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          streaming: true,
          policy: generatedPolicy,
          metadata: {
            companyName,
            controlId,
            controlTitle,
            riskLevel,
            frameworks: frameworkList,
            generatedAt: new Date().toISOString(),
            model: 'claude-sonnet-4-20250514',
          }
        }),
      };
    }

    // Non-streaming request
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: GRC_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        }
      ]
    });

    // Extract the generated policy text
    const generatedPolicy = message.content[0].type === 'text'
      ? message.content[0].text
      : 'Failed to generate policy content';

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        policy: generatedPolicy,
        metadata: {
          companyName,
          controlId,
          controlTitle,
          riskLevel,
          frameworks: frameworkList,
          generatedAt: new Date().toISOString(),
          model: 'claude-sonnet-4-20250514',
        }
      }),
    };

  } catch (error) {
    console.error('AI Policy generation error:', error);

    // Handle specific Anthropic API errors
    if (error.status === 401) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid Anthropic API key' }),
      };
    }

    if (error.status === 429) {
      return {
        statusCode: 429,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
      };
    }

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to generate AI policy',
        message: error.message,
      }),
    };
  }
};
