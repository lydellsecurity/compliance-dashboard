/**
 * Assessment Labels — single source of truth for control-answer terminology.
 *
 * Prevents drift (e.g. "N/A" vs "Not Applicable", "Yes" vs "Implemented")
 * across dashboards, reports, and auditor views.
 */

export type AssessmentAnswer = 'yes' | 'no' | 'partial' | 'na';
export type AssessmentStatus = AssessmentAnswer | 'unassessed';

export interface AssessmentLabel {
  /** Canonical short label (badges, small chips) */
  short: string;
  /** Auditor/report-ready long form */
  long: string;
  /** Past-tense verb form for history/audit log ("user marked control Yes") */
  verb: string;
  /** Screen-reader-friendly full description */
  aria: string;
}

export const ASSESSMENT_LABELS: Record<AssessmentStatus, AssessmentLabel> = {
  yes: {
    short: 'Implemented',
    long: 'Implemented',
    verb: 'marked as implemented',
    aria: 'Control is implemented',
  },
  partial: {
    short: 'In Progress',
    long: 'Partially Implemented',
    verb: 'marked as in progress',
    aria: 'Control is partially implemented',
  },
  no: {
    short: 'Not Started',
    long: 'Not Implemented',
    verb: 'marked as not implemented',
    aria: 'Control is not implemented — gap',
  },
  na: {
    short: 'N/A',
    long: 'Not Applicable',
    verb: 'marked as not applicable',
    aria: 'Control is not applicable',
  },
  unassessed: {
    short: 'Not Assessed',
    long: 'Not Assessed',
    verb: 'unassessed',
    aria: 'Control has not been assessed yet',
  },
};

/** Resolve a possibly-null answer to a stable status key. */
export const statusFor = (answer: AssessmentAnswer | null | undefined): AssessmentStatus =>
  answer ?? 'unassessed';

/** How many days before a previously-answered control is considered stale. */
export const STALE_ANSWER_DAYS = 90;

/**
 * Compute staleness from an ISO timestamp. Returns { isStale, days } where
 * days is the integer number of days since the answer was last reviewed.
 * Returns null for controls that have never been answered.
 */
export function computeStaleness(
  lastReviewedAt: string | null | undefined,
  now: Date = new Date(),
  threshold: number = STALE_ANSWER_DAYS,
): { isStale: boolean; days: number } | null {
  if (!lastReviewedAt) return null;
  const then = new Date(lastReviewedAt).getTime();
  if (Number.isNaN(then)) return null;
  const days = Math.floor((now.getTime() - then) / (1000 * 60 * 60 * 24));
  return { isStale: days >= threshold, days };
}
