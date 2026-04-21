# Follow-ups — Monetization + UI/UX pass

**Last updated:** 2026-04-21
**Scope:** Open items from the Stripe/monetization rollout and the UI/UX review pass. The previous version of this doc had 21 items; most have shipped. What remains is below.

---

## External prerequisites (can't be done from code)

### 1. Provision Stripe Products and Prices in the Stripe dashboard
The code resolves `VITE_STRIPE_PRICE_*` (client) and `STRIPE_PRICE_*` (server) env vars at runtime. Until set, Checkout surfaces a clear error in the UpgradeModal. Required env vars are documented in the header of [src/constants/billing.ts](../src/constants/billing.ts). You must create:

- 6 base-plan prices: `starter|growth|scale × monthly|annual`
- 3 seat add-on prices: `SEAT_STARTER`, `SEAT_GROWTH`, `SEAT_SCALE`
- Metered prices: `AI_POLICY_BLOCK_50`, `QUESTIONNAIRE_BLOCK_10`, `VENDOR_BLOCK_25`
- Flat add-ons: `CSM_MONTHLY`, `AUDIT_BUNDLE`

Each metered add-on's Price should have `metadata.meter = 'ai_policy'` / `'questionnaire'` / `'vendors'` so [stripe-report-usage.cjs](../netlify/functions/stripe-report-usage.cjs) can find the subscription item to post usage records against.

### 2. Register the Stripe webhook endpoint
Stripe dashboard → Developers → Webhooks → Add endpoint. Point at `https://<domain>/.netlify/functions/stripe-webhook`. Subscribe to:

- `checkout.session.completed`
- `customer.subscription.created|updated|deleted`
- `customer.subscription.trial_will_end`
- `invoice.payment_succeeded|failed|upcoming`
- `charge.refunded`
- `charge.dispute.created`
- `customer.updated`
- `customer.deleted`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### 3. Stripe Portal custom flow for downgrade warnings
Customer Portal → Subscriptions → Custom confirmation URL →
`https://<app>/settings/billing?downgrade=confirm&to={plan}`.

Until configured, the DowngradeWarning component is dormant (the query param is never present).

### 4. Enable Stripe Smart Retries
Settings → Billing → Subscriptions and emails → Smart Retries → **Retry on card updated**. Without this, a customer who updates their card mid-dunning isn't retried until the next scheduled cycle. The app's [dunning banner](../src/components/BillingStatusBar.tsx) already routes users to the portal, but Stripe needs to be the one re-running the charge.

### 5. Configure an email provider
At least one of:

- `RESEND_API_KEY` *(preferred — simplest setup)*
- `SENDGRID_API_KEY`
- `MAILGUN_API_KEY` + `MAILGUN_DOMAIN`

Plus `FROM_EMAIL` (e.g. `billing@lydellsecurity.com`) and `FROM_NAME`. Without a provider, [utils/email.cjs](../netlify/functions/utils/email.cjs) logs and returns false — webhook handlers still succeed, but billing emails don't go out.

### 6. Set cron secret
`USAGE_REPORT_CRON_SECRET` — shared secret used by both [stripe-report-usage.cjs](../netlify/functions/stripe-report-usage.cjs) and [stripe-subscription-audit.cjs](../netlify/functions/stripe-subscription-audit.cjs). Netlify's scheduled-function runner doesn't send this header; set it anyway so manual triggers (curl/postman) can be restricted.

### 7. Configure Supabase Third-Party Auth with Clerk
Supabase dashboard → Authentication → Sign In / Providers → **Third-Party Auth** → Add Clerk, paste your Clerk **Frontend API URL** (visible in Clerk dashboard → API Keys → "Frontend API URL").

Without this, Supabase rejects Clerk-signed JWTs as unverifiable, `auth.jwt()` returns NULL server-side, `public.clerk_user_id()` returns NULL, and every RLS policy that depends on it fails:

- `organizations.SELECT` and `organizations.INSERT` return 403 / 42501.
- Brand-new users can't create their first organization.
- Existing users hit `organizations?select=*` 403 on app load.

The app has a server-side fallback ([create-organization.cjs](../netlify/functions/create-organization.cjs), [list-my-organizations.cjs](../netlify/functions/list-my-organizations.cjs)) that bypasses RLS via the service-role key, so org CRUD works even without this configured — but dozens of other RLS policies (evidence, controls, vendors, integrations, etc.) still depend on `public.clerk_user_id()` working. Setting up Third-Party Auth is **not optional for production**; the fallback just keeps onboarding unstuck while you do.

To validate it's working, open the browser console while signed in and run:
```js
window.supabase_test = await fetch('https://<project>.supabase.co/rest/v1/organizations?select=id', {
  headers: {
    apikey: '<anon-key>',
    Authorization: `Bearer ${await window.Clerk.session.getToken()}`,
  },
}).then(r => r.json());
```
If you see a list of orgs you belong to (even empty `[]` for a new user), Third-Party Auth is working. If you see `{ code: "42501" }` or `{ message: "permission denied" }`, it isn't.

---

## Known limitations (intentional)

### Multi-currency
All prices are USD. Stripe can hold multi-currency Prices on the same Product, but surfacing currency in the UpgradeModal needs product decisions on FX, local copy ("Prices in USD"), and regional plan differences. Out of scope for the current pass — the modal footer now clarifies "Prices exclude VAT where applicable" so EU customers aren't surprised.

### White-label portal
Stripe Billing Portal uses Stripe's default branding/domain. A custom domain and brand color require Stripe's White-Label Pages add-on and aren't wired here. Enterprise conversations should go through sales for now.

### Invoice in-app preview
[invoice.upcoming](../netlify/functions/stripe-webhook.cjs) emails the customer with the forecasted amount. An in-app "Next invoice: $X" block isn't built — the Stripe Portal "Invoices" tab is the source of truth.

---

## Structural refactors (non-trivial, deferred intentionally)

### 7. Full Settings / Admin consolidation
Partial consolidation shipped: removed the duplicative "Cloud Integrations" sub-section from Settings; clarified descriptions. A full merge (kill the top-level Admin tab entirely, embed `OrgManagementSuite` inside Settings) was deferred because:
- OrgManagementSuite is a rich multi-tab surface — embedding it nests two levels of tabs, which is confusing.
- Existing bookmarks and external docs may link to `?tab=admin`.
- Product should decide: is Settings user-scoped prefs only, with Admin as the org surface? Or merge into a single Settings?

When ready: add a redirect in [App.tsx](../src/App.tsx) from `?tab=admin` → `?tab=settings&section=admin`, then move `OrgManagementSuite` to render inside the Settings admin section and delete the top-level Admin tab from the sidebar.

### 8. Hoist vendor + evidence stores into global state
Current implementation ([usePaletteIndex](../src/hooks/usePaletteIndex.ts)) fetches lightweight id+name index directly from Supabase for the command palette. This works for search but duplicates data that TPRMCenter and EvidenceVault already fetch on their own mount.

When those tabs are refactored to share a global store (via Zustand or a React context), wire the palette to read from that instead of re-fetching. Not urgent — the lightweight index is snappy.

---

## Nice-to-haves

### 9. Welcome checklist dynamics
Static copy shipped: "Invite team / Connect integration / Start assessment." Could become dynamic:
- Skip "Invite team" if >1 user already exists
- Show framework-specific next steps (e.g. "SOC 2 needs evidence for CC-series — connect AWS first")
- Tie Step 2 to the Growth plan sell ("Multi-cloud unlocks on Growth →")

Needs product/marketing input on the narrative. The component ([App.tsx WelcomeChecklist](../src/App.tsx)) is ready to accept config.

### 10. URL state for the remaining drawer surfaces
`?vendor=<id>` shipped. Similar work needed for:
- `?control=<id>` → opens ControlDetailDrawer. Currently requires lifting the drawer state up from ControlCard into AssessmentTab (comment at [App.tsx:2239](../src/App.tsx:2239) notes this).
- `?incident=<id>` → IncidentDetail. Requires IncidentCommandCenter to accept a URL-driven selection.

Use the existing [useUrlState](../src/hooks/useUrlState.ts) hook — the pattern is in place.

### 11. E2E test for the upgrade flow
The webhook internals have unit coverage now. A full Playwright flow (click Upgrade → mock Stripe → webhook → plan flips) would catch integration regressions. Needs stripe-mock or Playwright + webhook fixture. ~1 day.

### 12. axe-core CI snapshot tests
Spot-audit shipped. CI coverage via `@axe-core/playwright` snapshots on Landing, Dashboard, Assessment, Settings, UpgradeModal would catch regressions. Adds ~30s to CI.

### 13. Expand regulatory updates & notifications sections
These Settings sections exist but are placeholder-heavy. Product decision needed on:
- Notifications: which events trigger alerts, per-user or per-org preferences?
- Regulatory Updates: which frameworks track, update cadence, diff presentation?

---

## How to consume this list

- External prereqs (1–6): need Stripe / provider dashboard access. Engineering can't ship these.
- Known limitations: documented so sales/support can set expectations; revisit when there's demand.
- Structural (7–8): engineering can ship, but waiting on product direction to avoid churn.
- Nice-to-haves (9–13): ship individually as time allows. Each is scoped to a few hours or a day.
- Delete items from this file in the PR that ships them. The value is in what's still open, not a changelog.
