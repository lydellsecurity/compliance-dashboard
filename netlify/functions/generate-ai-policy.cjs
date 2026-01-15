// netlify/functions/generate-ai-policy.cjs
// AI-Powered Policy Document Generator using Claude API with Streaming
// Security: Uses origin-validated CORS and input sanitization

const Anthropic = require('@anthropic-ai/sdk');
const {
  getCorsHeaders,
  handleCorsPreflght,
  sanitizeString,
  parseJsonBody,
  errorResponse,
  successResponse,
  checkRateLimit,
} = require('./utils/security.cjs');

// GRC Auditor System Prompt
const GRC_SYSTEM_PROMPT = `You are a Senior GRC (Governance, Risk, and Compliance) Auditor. Your goal is to generate formal, legally-defensible security policies.

**Operational Constraints:**

1. **Tone**: Professional, mandatory, and concise. Use "must" instead of "should."

2. **Alignment**: Ensure the policy satisfies requirements for SOC 2, ISO 27001, HIPAA, and NIST CSF 2.0.

3. **Context**: Reference specific control IDs (e.g., AM-008 for Endpoint Security, DP-002 for Encryption) when applicable.

4. **No Fluff**: Do not include introductory "Here is your policy" text. Start immediately with the Document Header.

**Document Sections:**

## HEADER
- **Policy Name**: Clear, descriptive title
- **Version**: 1.0
- **Effective Date**: Current date

## PURPOSE
Define the objective of the control. Be specific about what security outcome this policy achieves.

## SCOPE
Define the systems and personnel covered:
- Which employees, contractors, and third parties are subject to this policy
- Which systems, applications, networks, and data are covered
- Any exclusions or exceptions

## POLICY REQUIREMENTS
Bulleted list of technical and administrative mandates. Each requirement must:
- Use mandatory language ("must", "shall", "is required to")
- Be specific and measurable
- Be auditable and enforceable
- Reference applicable framework controls where relevant

## COMPLIANCE
Statement on the consequences of policy violation:
- Disciplinary actions for non-compliance
- Reporting procedures for violations
- Exception request process
- Review and audit frequency

Format using proper Markdown. All requirements must be numbered for audit traceability.`;

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

exports.handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.Origin;
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleCorsPreflght(event);
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed', origin);
  }

  // Rate limiting by IP
  const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  const rateLimit = checkRateLimit(`ai-policy:${clientIp}`);
  if (!rateLimit.allowed) {
    return {
      statusCode: 429,
      headers: {
        ...corsHeaders,
        'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
        'X-RateLimit-Remaining': '0',
      },
      body: JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
    };
  }

  // Check for API key
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    return errorResponse(500, 'Anthropic API key not configured', origin);
  }

  try {
    // Parse and validate payload with sanitization
    const parseResult = parseJsonBody(event.body);
    if (!parseResult.valid) {
      return errorResponse(400, parseResult.error, origin);
    }
    const payload = parseResult.data;

    const validationErrors = validatePayload(payload);
    if (validationErrors.length > 0) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const userPrompt = `Generate a formal, legally-defensible security policy for ${companyName}.

**Control Details:**
- **Control ID:** ${controlId}
- **Control Title:** ${controlTitle || 'Security Control'}
- **Risk Level:** ${riskLevel}
- **Applicable Frameworks:** ${frameworkList || 'SOC 2, ISO 27001, HIPAA, NIST CSF 2.0'}

**Control Description:**
${controlDescription || 'Implement appropriate security controls to protect organizational assets.'}

**Implementation Guidance:**
${guidance || 'Follow industry best practices for implementation.'}

**Remediation Context:**
${remediationTip || 'Address identified gaps through documented procedures and technical controls.'}

**Evidence Requirements:**
${evidenceExamples.length > 0 ? evidenceExamples.map(e => `- ${e}`).join('\n') : '- Policy documentation\n- Implementation evidence\n- Audit logs'}

**Instructions:**
1. Use Effective Date: ${currentDate}
2. Reference Control ID ${controlId} throughout the document
3. Use mandatory language ("must", "shall") - never use "should"
4. Make all requirements specific, measurable, and auditable
5. Map requirements to ${frameworkList || 'SOC 2, ISO 27001, HIPAA, NIST CSF 2.0'} controls
6. Start immediately with the HEADER section - no introduction text

Generate the policy now.`;

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
      return errorResponse(401, 'Invalid Anthropic API key', origin);
    }

    if (error.status === 429) {
      return errorResponse(429, 'Rate limit exceeded. Please try again later.', origin);
    }

    // Don't expose internal error details in production
    return errorResponse(500, 'Failed to generate AI policy', origin);
  }
};
