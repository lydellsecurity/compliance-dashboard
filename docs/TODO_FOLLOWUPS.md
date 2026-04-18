# Follow-ups — Monetization + UI/UX pass

**Last updated:** 2026-04-18
**Scope:** Open items from the Stripe/monetization rollout and the UI/UX review pass. The previous version of this doc had 21 items; most have shipped. What remains is below.

---

## External prerequisites (can't be done from code)

### 1. Provision Stripe Products and Prices in the Stripe dashboard
The code resolves `VITE_STRIPE_PRICE_*` env vars at runtime. Until set, Checkout surfaces a clear error in the UpgradeModal. Required env vars are listed in the header of [src/constants/billing.ts](../src/constants/billing.ts).

### 2. Register the Stripe webhook endpoint
Stripe dashboard → Developers → Webhooks → Add endpoint. Point at `https://<domain>/.netlify/functions/stripe-webhook`. Subscribe to `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.payment_succeeded|failed`, `customer.subscription.trial_will_end`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### 3. Stripe Portal custom flow for downgrade warnings
To fire the `<DowngradeWarning>` component, configure Stripe Portal:
Customer Portal → Subscriptions → Custom confirmation URL →
`https://<app>/settings/billing?downgrade=confirm&to={plan}`.

Until configured, the component is dormant (the query param is never present).

---

## Structural refactors (non-trivial, deferred intentionally)

### 4. Full Settings / Admin consolidation
Partial consolidation shipped: removed the duplicative "Cloud Integrations" sub-section from Settings; clarified descriptions. A full merge (kill the top-level Admin tab entirely, embed `OrgManagementSuite` inside Settings) was deferred because:
- OrgManagementSuite is a rich multi-tab surface — embedding it nests two levels of tabs, which is confusing.
- Existing bookmarks and external docs may link to `?tab=admin`.
- Product should decide: is Settings user-scoped prefs only, with Admin as the org surface? Or merge into a single Settings?

When ready: add a redirect in [App.tsx](../src/App.tsx) from `?tab=admin` → `?tab=settings&section=admin`, then move `OrgManagementSuite` to render inside the Settings admin section and delete the top-level Admin tab from the sidebar.

### 5. Hoist vendor + evidence stores into global state
Current implementation ([usePaletteIndex](../src/hooks/usePaletteIndex.ts)) fetches lightweight id+name index directly from Supabase for the command palette. This works for search but duplicates data that TPRMCenter and EvidenceVault already fetch on their own mount.

When those tabs are refactored to share a global store (via Zustand or a React context), wire the palette to read from that instead of re-fetching. Not urgent — the lightweight index is snappy.

---

## Nice-to-haves

### 6. Welcome checklist dynamics
Static copy shipped: "Invite team / Connect integration / Start assessment." Could become dynamic:
- Skip "Invite team" if >1 user already exists
- Show framework-specific next steps (e.g. "SOC 2 needs evidence for CC-series — connect AWS first")
- Tie Step 2 to the Growth plan sell ("Multi-cloud unlocks on Growth →")

Needs product/marketing input on the narrative. The component ([App.tsx WelcomeChecklist](../src/App.tsx)) is ready to accept config.

### 7. URL state for the remaining drawer surfaces
`?vendor=<id>` shipped. Similar work needed for:
- `?control=<id>` → opens ControlDetailDrawer. Currently requires lifting the drawer state up from ControlCard into AssessmentTab (comment at [App.tsx:2239](../src/App.tsx:2239) notes this).
- `?incident=<id>` → IncidentDetail. Requires IncidentCommandCenter to accept a URL-driven selection.

Use the existing [useUrlState](../src/hooks/useUrlState.ts) hook — the pattern is in place.

### 8. E2E test for the upgrade flow
The webhook internals have unit coverage now. A full Playwright flow (click Upgrade → mock Stripe → webhook → plan flips) would catch integration regressions. Needs stripe-mock or Playwright + webhook fixture. ~1 day.

### 9. axe-core CI snapshot tests
Spot-audit shipped. CI coverage via `@axe-core/playwright` snapshots on Landing, Dashboard, Assessment, Settings, UpgradeModal would catch regressions. Adds ~30s to CI.

### 10. Expand regulatory updates & notifications sections
These Settings sections exist but are placeholder-heavy. Product decision needed on:
- Notifications: which events trigger alerts, per-user or per-org preferences?
- Regulatory Updates: which frameworks track, update cadence, diff presentation?

---

## How to consume this list

- External prereqs (1–3): need Stripe dashboard access. Engineering can't ship these.
- Structural (4–5): engineering can ship, but waiting on product direction to avoid churn.
- Nice-to-haves (6–10): ship individually as time allows. Each is scoped to a few hours or a day.
- Delete items from this file in the PR that ships them. The value is in what's still open, not a changelog.
