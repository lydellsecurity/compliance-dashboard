// netlify/functions/generate-ai-policy.js
// AI-Powered Policy Document Generator using Claude API

const Anthropic = require('@anthropic-ai/sdk');

// Input validation
function validatePayload(payload) {
  const errors = [];

  if (!payload.companyName || typeof payload.companyName !== 'string') {
    errors.push('companyName is required and must be a string');
  }
  if (!payload.controlID || typeof payload.controlID !== 'string') {
    errors.push('controlID is required and must be a string');
  }
  if (!payload.remediationData || typeof payload.remediationData !== 'object') {
    errors.push('remediationData is required and must be an object');
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

    // Extract and sanitize data
    const companyName = sanitizeString(payload.companyName, 200) || 'Organization';
    const controlID = sanitizeString(payload.controlID, 50);
    const remediationData = payload.remediationData;

    // Extract remediation details
    const controlTitle = sanitizeString(remediationData.controlTitle, 200);
    const controlDescription = sanitizeString(remediationData.controlDescription, 2000);
    const riskLevel = sanitizeString(remediationData.riskLevel, 20) || 'Medium';
    const frameworks = Array.isArray(remediationData.frameworks) ? remediationData.frameworks : [];
    const guidance = sanitizeString(remediationData.guidance, 2000);
    const evidenceExamples = Array.isArray(remediationData.evidenceExamples)
      ? remediationData.evidenceExamples.map(e => sanitizeString(e, 500))
      : [];
    const remediationTip = sanitizeString(remediationData.remediationTip, 1000);

    // Build framework context
    const frameworkList = frameworks.map(f =>
      typeof f === 'string' ? f : `${f.frameworkId} ${f.clauseId || ''}`
    ).join(', ');

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    // Generate policy using Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are a cybersecurity policy expert. Generate a comprehensive, professional security policy document in Markdown format for the following control.

**Company:** ${companyName}
**Control ID:** ${controlID}
**Control Title:** ${controlTitle}
**Risk Level:** ${riskLevel}
**Applicable Frameworks:** ${frameworkList || 'General Security Best Practices'}

**Control Description:**
${controlDescription || 'Not provided'}

**Security Guidance:**
${guidance || 'Not provided'}

**Remediation Tip:**
${remediationTip || 'Not provided'}

**Evidence Examples:**
${evidenceExamples.length > 0 ? evidenceExamples.map(e => `- ${e}`).join('\n') : 'Not provided'}

Generate a complete policy document with the following sections:

1. **Document Header** - Include company name, policy title, document version (1.0), effective date (today), and classification (Internal)

2. **Purpose** - Explain why this policy exists and its importance to the organization

3. **Scope** - Define who and what this policy applies to

4. **Policy Statement** - The core policy requirements written in clear, actionable language

5. **Definitions** - Key terms used in the policy

6. **Roles and Responsibilities** - Define responsibilities for:
   - Executive Leadership
   - Information Security Team
   - IT Operations
   - Department Managers
   - All Personnel

7. **Implementation Requirements** - Specific technical and procedural requirements (at least 5-7 detailed requirements)

8. **Compliance Monitoring** - How compliance will be measured and verified

9. **Exceptions** - Process for requesting policy exceptions

10. **Enforcement** - Consequences for non-compliance

11. **Related Documents** - Reference to related policies and standards

12. **Revision History** - Table for tracking document changes

13. **Approval Signatures** - Placeholder section for policy owner and executive approval

Format the document professionally with proper Markdown headers, bullet points, and tables where appropriate. Make the policy specific to the control being addressed and ensure all content is actionable and measurable.`
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
          controlID,
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
