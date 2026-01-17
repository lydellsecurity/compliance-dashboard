// netlify/functions/generate-questionnaire-answer.cjs
// AI-Powered Security Questionnaire Answer Generator using Claude API
// Generates contextual answers based on organization's security posture

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

// Questionnaire Response System Prompt
const QUESTIONNAIRE_SYSTEM_PROMPT = `You are an expert Security Questionnaire Response Specialist. Your role is to generate accurate, professional responses to security assessment questionnaires based on the organization's actual security controls and compliance posture.

**Your Capabilities:**
1. Analyze security questionnaire questions and determine the most appropriate response
2. Map questions to relevant security controls (SOC 2, ISO 27001, HIPAA, NIST, PCI DSS, GDPR)
3. Provide evidence references and supporting documentation suggestions
4. Assess confidence levels based on available information

**Response Guidelines:**

1. **Accuracy First**: Only claim capabilities that are supported by the provided control information. If unsure, indicate medium or low confidence.

2. **Professional Tone**: Use clear, concise language appropriate for enterprise security assessments.

3. **Evidence-Based**: Reference specific controls, policies, and procedures when available.

4. **Compliance Mapping**: When applicable, reference relevant framework controls (e.g., "Per SOC 2 CC6.1 and ISO 27001 A.9.2.1...").

5. **Yes/No Questions**: For binary questions, provide a clear Yes, No, or N/A answer followed by a brief explanation.

6. **Text Questions**: Provide comprehensive but concise responses. Include:
   - Direct answer to the question
   - Relevant policies or procedures
   - Technical controls in place
   - Monitoring and review processes

7. **Confidence Assessment**:
   - HIGH: Direct evidence from controls, policies, or technical documentation
   - MEDIUM: Inferred from related controls or partial information
   - LOW: Limited information available, general industry practices applied

**Output Format:**
Respond with a JSON object containing:
{
  "answer": "The direct answer to the question",
  "confidence": "high" | "medium" | "low",
  "reasoning": "Brief explanation of why this answer was provided",
  "relatedControls": ["List of relevant control IDs"],
  "evidenceSuggestions": ["Suggested evidence documents to support this answer"]
}`;

// Input validation
function validatePayload(payload) {
  const errors = [];

  if (!payload.question) {
    errors.push('question is required');
  }
  if (!payload.organizationName) {
    errors.push('organizationName is required');
  }

  return errors;
}

// Build context from organization data
function buildOrganizationContext(payload) {
  let context = `**Organization Information:**
- Name: ${payload.organizationName}`;

  if (payload.industry) {
    context += `\n- Industry: ${payload.industry}`;
  }
  if (payload.companySize) {
    context += `\n- Company Size: ${payload.companySize}`;
  }
  if (payload.frameworks && payload.frameworks.length > 0) {
    context += `\n- Compliance Frameworks: ${payload.frameworks.join(', ')}`;
  }

  // Add control responses if available
  if (payload.controlResponses && payload.controlResponses.length > 0) {
    context += '\n\n**Implemented Security Controls:**';
    for (const control of payload.controlResponses.slice(0, 20)) { // Limit to 20 controls
      context += `\n- ${control.controlId}: ${control.controlTitle}`;
      if (control.answer) {
        context += ` - Status: ${control.answer}`;
      }
      if (control.evidenceNotes) {
        context += ` - Notes: ${control.evidenceNotes}`;
      }
    }
  }

  // Add existing answers if available
  if (payload.existingAnswers && payload.existingAnswers.length > 0) {
    context += '\n\n**Previously Answered Similar Questions:**';
    for (const answer of payload.existingAnswers.slice(0, 5)) { // Limit to 5 similar answers
      context += `\n- Q: ${answer.questionText}`;
      context += `\n  A: ${answer.standardAnswer}`;
    }
  }

  // Add custom context
  if (payload.customContext) {
    context += `\n\n**Additional Context:**\n${payload.customContext}`;
  }

  return context;
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
  const rateLimit = checkRateLimit(`questionnaire-ai:${clientIp}`);
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

  try {
    // Parse and validate request body
    const payload = parseJsonBody(event.body);
    if (!payload) {
      return errorResponse(400, 'Invalid JSON body', origin);
    }

    const validationErrors = validatePayload(payload);
    if (validationErrors.length > 0) {
      return errorResponse(400, `Validation failed: ${validationErrors.join(', ')}`, origin);
    }

    // Sanitize inputs
    const question = sanitizeString(payload.question, 2000);
    const questionType = payload.questionType || 'text';
    const categoryName = sanitizeString(payload.categoryName || 'General', 200);
    const helpText = payload.helpText ? sanitizeString(payload.helpText, 500) : '';

    // Build organization context
    const orgContext = buildOrganizationContext(payload);

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Build the user prompt
    let userPrompt = `${orgContext}

**Question to Answer:**
Category: ${categoryName}
Question Type: ${questionType}
Question: ${question}`;

    if (helpText) {
      userPrompt += `\nHelp Text: ${helpText}`;
    }

    if (questionType === 'yes_no') {
      userPrompt += '\n\nNote: This is a Yes/No question. Provide a clear Yes, No, or N/A response.';
    } else if (questionType === 'multiple_choice' && payload.options) {
      userPrompt += `\n\nOptions: ${payload.options.join(', ')}`;
    }

    userPrompt += '\n\nGenerate the appropriate response in JSON format.';

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: QUESTIONNAIRE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract the response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Try to parse as JSON
    let parsedResponse;
    try {
      // Extract JSON from response (in case it's wrapped in markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // If parsing fails, create a structured response from the text
      parsedResponse = {
        answer: responseText,
        confidence: 'medium',
        reasoning: 'Generated from AI analysis',
        relatedControls: [],
        evidenceSuggestions: [],
      };
    }

    // Validate and normalize the response
    const normalizedResponse = {
      answer: sanitizeString(parsedResponse.answer || '', 5000),
      confidence: ['high', 'medium', 'low'].includes(parsedResponse.confidence)
        ? parsedResponse.confidence
        : 'medium',
      reasoning: sanitizeString(parsedResponse.reasoning || '', 1000),
      relatedControls: Array.isArray(parsedResponse.relatedControls)
        ? parsedResponse.relatedControls.slice(0, 10).map(c => sanitizeString(c, 50))
        : [],
      evidenceSuggestions: Array.isArray(parsedResponse.evidenceSuggestions)
        ? parsedResponse.evidenceSuggestions.slice(0, 10).map(e => sanitizeString(e, 200))
        : [],
    };

    return successResponse(normalizedResponse, origin);
  } catch (error) {
    console.error('AI questionnaire answer generation error:', error);

    if (error.status === 401) {
      return errorResponse(500, 'AI service configuration error', origin);
    }
    if (error.status === 429) {
      return errorResponse(429, 'AI service rate limit exceeded. Please try again later.', origin);
    }

    return errorResponse(500, 'Failed to generate questionnaire answer', origin);
  }
};
