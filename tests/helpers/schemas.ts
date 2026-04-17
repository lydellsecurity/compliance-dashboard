import { z } from 'zod';

/**
 * Shared response schemas. Every integration handler is supposed to return
 * { statusCode, headers, body } where body is a JSON-serialized payload.
 *
 * Contract-testing against these shapes catches the most common class of
 * "my code assumed a field that the vendor stopped returning" bugs — they
 * surface as a zod parse failure rather than an `undefined` at runtime.
 */

export const netlifyResponseSchema = z.object({
  statusCode: z.number(),
  headers: z.record(z.string(), z.unknown()).optional(),
  body: z.string(),
});

export const providerSyncResultSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  // Each provider normalizes into a different object of summaries — keep this
  // permissive; the point is to catch type regressions at the envelope level.
  normalized: z.record(z.string(), z.unknown()),
  errors: z.array(z.unknown()),
  recordCount: z.number(),
});

export const providerTestConnectionSchema = z.object({
  success: z.boolean(),
  // Each provider attaches provider-specific metadata under different keys.
  // We keep the schema permissive on extras.
}).passthrough();

export const cloudVerifyTestConnectionBodySchema = z.object({
  success: z.boolean().optional(),
  message: z.string().optional(),
  accountId: z.string().optional(),
  tenantId: z.string().optional(),
  projectId: z.string().optional(),
  error: z.string().optional(),
}).passthrough();

export const cloudVerifyControlBodySchema = z.object({
  status: z.enum(['pass', 'partial', 'fail', 'error']).optional(),
  details: z.string().optional(),
  evidence: z.unknown().optional(),
  recommendations: z.array(z.string()).optional(),
  error: z.string().optional(),
}).passthrough();

export const aiPolicyResponseSchema = z.object({
  success: z.boolean(),
  policy: z.string().optional(),
  metadata: z
    .object({
      companyName: z.string().optional(),
      controlId: z.string().optional(),
      controlTitle: z.string().optional(),
      generatedAt: z.string().optional(),
      model: z.string().optional(),
    })
    .passthrough()
    .optional(),
  error: z.string().optional(),
}).passthrough();

export const questionnaireAnswerSchema = z.object({
  answer: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  reasoning: z.string().optional(),
  relatedControls: z.array(z.string()).optional(),
  evidenceSuggestions: z.array(z.string()).optional(),
}).passthrough();

export const oauthExchangeBodySchema = z.object({
  success: z.boolean(),
  action: z.string().optional(),
  expiresIn: z.number().optional(),
  tokenType: z.string().optional(),
  scope: z.string().optional(),
  hasAccessToken: z.boolean().optional(),
  hasRefreshToken: z.boolean().optional(),
  error: z.string().optional(),
}).passthrough();

export const webhookAcceptedSchema = z.object({
  status: z.enum(['accepted', 'duplicate', 'rejected', 'challenge']).optional(),
  eventId: z.string().optional(),
  eventType: z.string().optional(),
  error: z.string().optional(),
}).passthrough();
