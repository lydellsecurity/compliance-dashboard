/**
 * AI credit costs — one source of truth for both client (display/preview) and
 * server (enforcement). Every AI action debits `cost` credits from the org's
 * per-period `ai_credits` meter via the `debit_ai_credits` RPC.
 *
 * Tuning philosophy:
 *   - Calibrated so a typical Growth customer stays at ~60% utilization with
 *     headroom for bursty months. Review quarterly against the usage_meters
 *     distribution.
 *   - Costs reflect approximate Anthropic token spend plus an operational
 *     margin. A policy generation (100 credits) ≈ 20× a remediation chat
 *     turn (5 credits), which matches their actual latency/token envelopes.
 *
 * Any new AI endpoint MUST:
 *   1. Add its action name here.
 *   2. Call `debit_ai_credits` before starting the upstream LLM call.
 *   3. Surface the cost in user-facing copy when pre-empting the action
 *      (e.g. "Generate policy — 100 credits").
 */

export const CREDIT_COSTS = {
  /** Full policy document generation from control selection. */
  policy_generation: 100,

  /** Regenerate a single section of an existing policy. */
  policy_section: 30,

  /** One message in the AI Remediation Chat. */
  remediation_message: 5,

  /** One SIG / CAIQ / bespoke questionnaire autofill answer. */
  questionnaire_answer: 10,

  /** A single vendor's AI risk scan (public posture + VRM enrichment). */
  vendor_risk_scan: 25,

  /** AI-extracted key points + hashes for an evidence item. */
  evidence_summary: 15,

  /** Cross-framework control mapping (one control ↔ its crosswalk). */
  control_mapping: 8,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

/**
 * Human-readable labels for credit actions. Used by the CreditMeter tooltip
 * and in exceeded-cap upgrade modals so users see what they were trying to do
 * when they ran out.
 */
export const CREDIT_ACTION_LABELS: Record<CreditAction, string> = {
  policy_generation: 'Policy generation',
  policy_section: 'Policy section regeneration',
  remediation_message: 'Remediation chat message',
  questionnaire_answer: 'Questionnaire autofill',
  vendor_risk_scan: 'Vendor risk scan',
  evidence_summary: 'Evidence summary',
  control_mapping: 'Control mapping',
};

export function creditCost(action: CreditAction): number {
  return CREDIT_COSTS[action];
}
