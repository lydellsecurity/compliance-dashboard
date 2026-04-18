# Follow-ups — Monetization + UI/UX pass

**Authored:** 2026-04-17
**Scope:** Open items from the Stripe/monetization rollout and the UI/UX review pass. Each item names the files involved and what's blocking it (product decision, more data, or just mechanical work).

---

## Stripe / Monetization

### 1. Provision Stripe Products and Prices in the Stripe dashboard
- **Why:** The code resolves `VITE_STRIPE_PRICE_*` env vars at runtime. Until those are set, Checkout fails with "Stripe is not configured in this environment."
- **Where:** [src/constants/billing.ts](../src/constants/billing.ts), [netlify/functions/utils/stripe.cjs](../netlify/functions/utils/stripe.cjs)
- **Need:** Create Products/Prices in Stripe (dashboard or API), copy Price IDs to env in Netlify + `.env.local`. List of required env vars is in the header of `src/constants/billing.ts`.
- **Status:** Blocked on GTM — once pricing is committed, ~1 hour of work.

### 2. Register the Stripe webhook endpoint
- **Why:** Without it, subscription lifecycle events don't reach the app — tenants stay on their pre-checkout plan forever.
- **Where:** Stripe dashboard → Developers → Webhooks → Add endpoint → point at `https://<domain>/.netlify/functions/stripe-webhook`, subscribe to the events in [stripe-webhook.cjs:95-120](../netlify/functions/stripe-webhook.cjs). Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
- **Status:** Mechanical.

### 3. Wire usage-meter increments at the AI-policy and questionnaire call sites
- **Why:** The `usage_meters` table exists and `stripe-report-usage` reports daily, but nothing currently *increments* meters. Metered overage add-ons never bill.
- **Where:**
  - AI policy generation: [netlify/functions/generate-ai-policy.cjs](../netlify/functions/generate-ai-policy.cjs) — after a successful generation, POST to `/entitlements-check` with `{ feature: 'advancedReporting', incrementMeter: 'ai_policy' }` *or* call the Supabase RPC `increment_usage_meter` directly from the server.
  - Questionnaire autofill: [netlify/functions/generate-questionnaire-answer.cjs](../netlify/functions/generate-questionnaire-answer.cjs) — increment `questionnaire` meter.
  - Vendor add: [src/components/TPRMCenter/index.tsx](../src/components/TPRMCenter/index.tsx) `handleVendorCreated` — increment `vendors`.
- **Status:** Mechanical (~2-3 hours).

### 4. Day-10 soft-block on payment-failed dunning
- **Why:** The webhook sets `status='suspended'` on `invoice.payment_failed`, and the banner surfaces that, but paid-feature *writes* are not actually blocked. Per monetization plan §8.4, day 10 should soft-block paid-feature writes.
- **Where:** `entitlements-check.cjs` at [netlify/functions/entitlements-check.cjs](../netlify/functions/entitlements-check.cjs) — add a check that if `tenant.status === 'suspended'` and it's been >10 days since the failed invoice, return 402 even for features the tenant's *plan* would allow.
- **Need:** Track days-in-suspension on the org row (add column, set on `invoice.payment_failed`, clear on `invoice.payment_succeeded`).
- **Status:** Small migration + logic tweak.

### 5. Pre-downgrade loss warning
- **Why:** When a user downgrades via Stripe Portal, Growth-only data (vendors, multi-framework assessments) becomes inaccessible at period end with no warning inside our UI.
- **Where:** Stripe Portal Configuration → enable custom confirmation URL → point at `/settings/billing?downgrade=confirm` and intercept in [src/components/Settings.tsx BillingCard](../src/components/Settings.tsx). Show a loss summary with counts of each affected resource before the user leaves the portal.
- **Need:** Portal config change + new downgrade-warning component.
- **Status:** Moderate.

---

## UI / UX

### 6. Fuller Settings IA refactor
- **Why:** [Settings.tsx](../src/components/Settings.tsx), [OrgManagementSuite.tsx](../src/components/OrgManagementSuite.tsx), and the deprecated [TenantAdmin.tsx](../src/components/TenantAdmin.tsx) still have overlap: notification preferences, monitoring, security settings exist in multiple places. The deprecation note + copy tightening this session was a patch, not the fix.
- **Where:** Product-owned. Decide canonical home for each category (notifications, monitoring, regulatory updates, branding). Likely outcome: all org-level config moves into `OrgManagementSuite`; `Settings` becomes app-level prefs (theme, shortcuts).
- **Need:** Design review + migration plan for bookmarks. Not a mechanical fix.
- **Status:** Blocked on product.

### 7. Command palette — real vendor/evidence indexing
- **Why:** The palette's `useCommandPalette` accepts `vendors` and `evidence` arrays, but App.tsx currently passes empty arrays and falls back to tab navigation on selection. Users can't jump to "vendor X" by name.
- **Where:** Need tenant-scoped vendor + evidence stores hoisted out of per-tab components and into a global hook (e.g. `useVendors()`, `useEvidenceIndex()`). Wire them at [App.tsx:2175](../src/App.tsx:2175).
- **Status:** Moderate refactor — touches TPRMCenter and EvidenceVault data paths.

### 8. Welcome checklist content
- **Why:** The first-run card ([App.tsx WelcomeChecklist](../src/App.tsx)) has three reasonable default steps, but product owns the onboarding narrative.
- **Where:** Same component. Could be dynamic (based on integrations connected, framework selected) or tied into Stripe plan (nudge toward Growth features early).
- **Status:** Blocked on product/marketing copy.

### 9. Migrate remaining modal-ish surfaces to `<Modal>` primitive
- **Why:** Seven modals migrated this session. Others still exist with ad-hoc implementations.
- **Where (unmigrated as of this session):**
  - `IncidentDetail.tsx` — full-screen modal pattern.
  - `IncidentCommandCenter/NewIncidentWizard.tsx`
  - `QuestionnaireCenter/UploadWizard.tsx`
  - `CertificateGenerator.tsx` — download flow
  - `AuditBundle.tsx` — has its own modal shell
  - `TPRMCenter/InherentRiskQuestionnaire.tsx`
  - Any remaining `fixed inset-0 z-50 ... modal-content` patterns (grep for the class).
- **Status:** Mechanical. Same recipe as the seven done this session.

### 10. Complete the contrast audit with axe-core in CI
- **Why:** Hand-audited a handful of slate-400 offenders; there are certainly more in components not reviewed line-by-line.
- **Where:** Add `@axe-core/react` to the Vite dev server in dev mode; add `vitest-axe` or Playwright with axe snapshots in CI.
- **Status:** ~1 hour setup + follow-up fixes.

### 11. `aria-live` for remaining async flows
- **Why:** AI policy + remediation chat + toasts are covered. Evidence upload progress, report generation status, and integration test results still run silently to screen readers.
- **Where:**
  - [src/components/EvidenceVault.tsx](../src/components/EvidenceVault.tsx) — upload progress area.
  - [src/components/ClientReporting.tsx](../src/components/ClientReporting.tsx) — generation status.
  - [src/components/IntegrationHub.tsx](../src/components/IntegrationHub.tsx) — test-connection status.
- **Status:** Mechanical.

### 12. Touch-target audit beyond the sidebar
- **Why:** Sidebar bumped to 44×44 this session. Icon-only buttons in tables, card actions, and inline toggles likely still land <44px on mobile.
- **Where:** Grep for `<button` with only a lucide icon child and no `min-h-` or `p-3+`. Good hit list:
  - Close buttons inside drawers (now handled by Modal's built-in close).
  - Action menus in tables (OrgManagementSuite, EvidenceVault).
  - Inline edit/delete icons (TPRMCenter vendor cards).
- **Status:** Mechanical.

### 13. Landing-page blob overflow check on real devices
- **Why:** [LandingPage.tsx:473](../src/components/LandingPage.tsx:473) uses `w-[600px]` decorative blobs inside an `overflow-hidden` container. Should be fine, but worth visual QA on 320px viewports.
- **Status:** Trivial check.

### 14. Jargon tooltips for SSO / SAML / SCIM / MFA / RBAC
- **Why:** Called out in the UX review. These terms appear across Settings, UpgradeGate, and admin surfaces without inline help. Non-technical admins bounce.
- **Where:** Lightweight `<Tooltip>` primitive + a domain-terms glossary. Apply at first mention per page.
- **Need:** Copy + short definitions.
- **Status:** Moderate.

### 15. URL state for deep objects (beyond tabs)
- **Why:** `?tab=X` works now. Sharing a link to a specific control, incident, or vendor does not.
- **Where:** Add `?id=` query params and wire to opening the matching drawer on load. Files: `ControlDetailDrawer`, `VendorProfileModal`, `IncidentDetail`.
- **Status:** Moderate.

### 16. Skeleton adoption on main tabs
- **Why:** The `Skeleton` primitives exist but load-time placeholders are only used on lazy tabs. Dashboard / Assessment / TPRM show spinners or blank space during slow fetches.
- **Where:** [src/App.tsx DashboardTab](../src/App.tsx), [AssessmentTab](../src/App.tsx), [TPRMCenter/index.tsx:240](../src/components/TPRMCenter/index.tsx:240).
- **Status:** Mechanical.

### 17. Post-checkout provisional banner
- **Why:** Implemented on the Billing card ([BillingCard](../src/components/Settings.tsx) polls after `?checkout=success`), but a user who lands on `/dashboard` after checkout instead of billing sees no "Upgrading…" indicator.
- **Where:** Lift the provisioning detection into [BillingStatusBar.tsx](../src/components/BillingStatusBar.tsx) so the banner shows globally, not just on Settings.
- **Status:** Small refactor.

---

## Testing / CI

### 18. Integration tests for the Stripe webhook
- **Why:** `stripe-webhook.cjs` has substantial branching logic (6 event types, org resolution, idempotency dedup). No current tests.
- **Where:** `tests/netlify-functions/stripe-webhook.test.ts` using MSW or stripe-mock. Validate:
  - Idempotency on duplicate `event.id`.
  - `checkout.session.completed` → plan/limits/features applied.
  - `customer.subscription.deleted` → downgrade to free at period end.
  - Signature verification rejects tampered bodies.
- **Status:** 2-3 hours.

### 19. E2E test for the upgrade flow
- **Why:** The full journey (click "Upgrade" → Stripe Checkout → webhook → plan reflect) has no end-to-end coverage.
- **Where:** Playwright with a mocked Stripe (stripe-mock) + webhook injection.
- **Status:** 1 day.

### 20. Axe-core snapshot tests on key surfaces
- **Why:** No automated a11y regressions today.
- **Where:** Playwright + `@axe-core/playwright` on Landing, Dashboard, Assessment, Settings, UpgradeModal.
- **Status:** See item 10.

---

## Bundle / Performance

### 21. Code-split the index chunk
- **Why:** Main bundle is 548 kB (165 kB gzipped). Vite warns at 500 kB.
- **Where:** `vite.config.ts` — add `build.rollupOptions.output.manualChunks` for `@supabase/supabase-js`, `framer-motion`, `recharts`, `pdfkit`.
- **Status:** 1-2 hours.

---

## How to consume this list

- Items flagged **Blocked on product** need a decision meeting first. Don't merge speculative implementations.
- Items flagged **Mechanical** are safe for any contributor to pick up.
- When completing an item, delete it from this file in the same PR. Don't let this doc grow stale — the value is in what's still open.
