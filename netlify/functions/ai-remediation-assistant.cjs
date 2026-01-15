// netlify/functions/ai-remediation-assistant.cjs
// AI-Powered Remediation Chat Assistant using Claude API
// Security: Uses origin-validated CORS and input sanitization

const Anthropic = require('@anthropic-ai/sdk');
const {
  getCorsHeaders,
  handleCorsPreflght,
  sanitizeString,
  parseJsonBody,
  errorResponse,
  checkRateLimit,
} = require('./utils/security.cjs');

// Remediation Expert System Prompt
const REMEDIATION_SYSTEM_PROMPT = `You are a Senior Security Engineer and Compliance Expert specializing in cloud infrastructure remediation. Your role is to help users implement security controls and fix compliance gaps.

**Your Expertise:**
- Cloud platforms: AWS, Azure, GCP
- Compliance frameworks: SOC 2, ISO 27001, HIPAA, NIST CSF 2.0
- Infrastructure as Code: Terraform, CloudFormation, ARM templates
- Security tools: IAM, KMS, WAF, CloudTrail, Security Hub

**Communication Style:**
1. Be concise and actionable - users need to fix things quickly
2. Lead with the most effective solution
3. Provide copy-paste CLI commands when appropriate
4. Use markdown formatting for code blocks
5. Reference the specific control ID when applicable
6. Explain WHY something is important for auditors

**When providing CLI commands:**
- Always use proper markdown code blocks with language tags
- Provide commands for the user's likely cloud provider (default to AWS)
- Include comments explaining each step
- Warn about any destructive operations

**When discussing evidence:**
- Be specific about what auditors look for
- Suggest screenshot locations or log exports
- Reference acceptance criteria

**Structure your responses:**
1. Brief explanation (1-2 sentences)
2. Solution/commands (if applicable)
3. Verification step (how to confirm it worked)
4. Evidence tip (optional, for audit preparation)

Keep responses focused and under 400 words unless the user asks for more detail.`;

// Input validation
function validatePayload(payload) {
  const errors = [];

  if (!payload.controlContext) {
    errors.push('controlContext is required');
  }
  if (!payload.userMessage) {
    errors.push('userMessage is required');
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
  const rateLimit = checkRateLimit(`ai-remediation:${clientIp}`);
  if (!rateLimit.allowed) {
    return {
      statusCode: 429,
      headers: {
        ...corsHeaders,
        'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
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

    // Extract data
    const controlContext = sanitizeString(payload.controlContext, 4000);
    const userMessage = sanitizeString(payload.userMessage, 2000);
    const companyName = sanitizeString(payload.companyName, 200) || 'the organization';
    const conversationHistory = Array.isArray(payload.conversationHistory)
      ? payload.conversationHistory.slice(-10) // Keep last 10 messages for context
      : [];

    // Build messages array
    const messages = [];

    // Add control context as first user message (for context)
    messages.push({
      role: 'user',
      content: `I need help with a compliance control. Here's the context:

${controlContext}

Company: ${companyName}

Please acknowledge that you understand this context and are ready to help.`,
    });

    // Add context acknowledgment
    messages.push({
      role: 'assistant',
      content: `I understand. I'm ready to help you with this compliance control. I have the full context including the control requirements, framework mappings, and current implementation status. What would you like help with?`,
    });

    // Add conversation history
    for (const msg of conversationHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: sanitizeString(msg.content, 2000),
        });
      }
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: REMEDIATION_SYSTEM_PROMPT,
      messages: messages,
    });

    // Extract response text
    const assistantResponse = response.content[0].type === 'text'
      ? response.content[0].text
      : 'I apologize, but I was unable to generate a response. Please try again.';

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        response: assistantResponse,
        metadata: {
          model: 'claude-sonnet-4-20250514',
          timestamp: new Date().toISOString(),
        },
      }),
    };

  } catch (error) {
    console.error('AI Remediation Assistant error:', error);

    // Handle specific Anthropic API errors
    if (error.status === 401) {
      return errorResponse(401, 'Invalid Anthropic API key', origin);
    }

    if (error.status === 429) {
      return errorResponse(429, 'Rate limit exceeded. Please try again later.', origin);
    }

    // Don't expose internal error details in production
    return errorResponse(500, 'Failed to process request', origin);
  }
};
