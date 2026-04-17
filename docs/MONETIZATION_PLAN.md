# AttestAI Monetization Plan

**Product:** Lydell Security — AttestAI Compliance Dashboard
**Payment processor:** Stripe (Checkout + Billing + Customer Portal)
**Plan authored:** 2026-04-17
**Owner:** GTM + Engineering
**Supersedes:** Inline `PLAN_CONFIGS` in `src/services/multi-tenant.service.ts` and the pricing recommendation in `docs/COMPETITOR_ANALYSIS.md`

---

## 1. Executive Summary

The GRC market reached ~$51B in 2025 and is projected to exceed $86B by 2029. Vanta, Drata, and Secureframe dominate mid-market and enterprise at $7.5K–$100K+ ACV but are criticized for opaque pricing, steep renewal hikes, and heavy manual setup. AttestAI's monetization wedge is:

1. **Transparent, self-serve SMB pricing** published on the marketing site.
2. **AI-native features as a durable differentiator** (real-time regulatory scanning, remediation chat, questionnaire autofill) — bundled, not nickel-and-dimed.
3. **Land-and-expand seat + framework model** — low friction at $0 and $499/mo, meaningful jumps at Growth and Scale when compliance needs mature.
4. **Annual billing incentives** (~17% discount, i.e. 2 months free) align cash flow with typical GRC audit cycles.

Target steady-state mix: 15% Free → Starter conversion, 30% Starter → Growth, 10% Growth → Scale, Enterprise sourced via outbound.

---

## 2. Industry Pricing Benchmarks (2026)

| Vendor | Entry | Mid | Enterprise | Notes |
|---|---|---|---|---|
| **Vanta** | ~$8K/yr (SOC 2 Starter) | $25K–$50K (Growth) | $50K+ | Per-framework upcharges, integration caps |
| **Drata** | ~$15K/yr | $25K–$60K | $100K+ | Steep renewals, dev-first |
| **Secureframe** | $7.5K/yr (Fundamentals) | $15K–$30K (Complete) | $45K+ | White-glove, fewer integrations |
| **Sprinto** | $10K/yr | $15K–$25K | Custom | Hands-off, limited integrations |
| **Thoropass** | $30K/yr | $40K–$60K | Custom | Bundled auditor network |
| **Comp AI** | $5K/yr | $10K–$15K | N/A | Newer AI-first entrant |
| **Risk Cognizance / Eramba** | $400–$5K | — | — | Budget/open-source tier |

**Takeaway:** The $6K–$12K ACV band (SMB → lower mid-market) is the most underserved and highest-intent segment. AttestAI's recommended tiers anchor here, with a Scale tier that captures expansion without forcing Enterprise sales.

---

## 3. Recommended Pricing Tiers

All prices below **supersede** the values currently hardcoded in `PLAN_CONFIGS` (`src/services/multi-tenant.service.ts:180`). The code currently ships `startup: $299`, `business: $799`. Update to the table below once Stripe products are provisioned.

| Plan | Monthly | Annual (billed yearly) | Effective /mo annual | Target buyer |
|---|---|---|---|---|
| **Free** | $0 | $0 | $0 | Founders exploring, pre-revenue |
| **Starter** | $599 | $5,988 | $499 | <50 employees, 1 framework (usually SOC 2) |
| **Growth** ⭐ | $1,199 | $11,988 | $999 | 50–200 employees, multi-framework, first real audit |
| **Scale** | $2,399 | $23,988 | $1,999 | 200–500 employees, multiple audits/yr, procurement heat |
| **Enterprise** | Custom | Custom ($36K–$72K typical) | — | 500+ employees, FedRAMP/PCI/on-prem/SLAs |

**Annual discount:** ~17% (two months free). Monthly pricing set ~20% above the effective annual rate to make annual the obvious default in Stripe Checkout.

**Free tier rationale:** keeps the acquisition funnel open and seeds the Trust Center (public-facing) — every Free tenant that publishes a Trust Center creates inbound brand surface for AttestAI.

---

## 4. Feature Gate Matrix

Gates map 1:1 to the existing `TenantFeatures` and `TenantLimits` interfaces in `src/services/multi-tenant.service.ts:24-46`. No new schema needed; update `PLAN_CONFIGS` values.

### 4.1 Quota limits (`TenantLimits`)

| Limit | Free | Starter | Growth | Scale | Enterprise |
|---|---|---|---|---|---|
| `maxUsers` | 3 | 10 | 25 | 75 | Unlimited (-1) |
| `maxControls` | 50 | 236 (all master) | 500 | 1,500 | Unlimited |
| `maxEvidence` | 100 | 750 | 3,000 | 10,000 | Unlimited |
| `maxIntegrations` | 1 (AWS only) | 5 | 15 | 40 | Unlimited |
| `maxStorageGb` | 1 | 10 | 50 | 200 | Unlimited |
| `retentionDays` | 30 | 180 | 365 | 730 | Unlimited |
| `auditLogDays` | 7 | 30 | 90 | 365 | Unlimited |
| `apiRateLimit` (req/min) | 0 | 60 | 300 | 1,200 | Custom |

### 4.2 Feature flags (`TenantFeatures` + new flags)

Flags marked **(new)** require adding to the `TenantFeatures` interface in `src/services/multi-tenant.service.ts:35`.

| Feature | Free | Starter | Growth | Scale | Ent | Code hook |
|---|---|---|---|---|---|---|
| Multi-framework assessment | 1 fw | 1 fw | 3 fw | 6 fw | Unlimited | `frameworks` allowlist (new) |
| `trustCenter` | ✅ read-only branded "Powered by AttestAI" | ✅ | ✅ | ✅ | ✅ custom domain | `TrustCenter.tsx` |
| `customControls` | ❌ | ✅ (10 max) | ✅ (50 max) | ✅ | ✅ | `CompanyTab` |
| `cloudIntegrations` | AWS only | AWS + 1 | AWS+Azure+GCP | All | All + custom | Connector services |
| `incidentResponse` | ❌ | ✅ | ✅ | ✅ | ✅ | `useIncidentResponse` |
| AI Policy Generator | 3/mo trial | 25/mo | 100/mo | Unlimited* | Unlimited | `AIPolicyGenerator.tsx` |
| AI Remediation Chat | ❌ | ❌ | ✅ (100 msgs/mo) | ✅ (unlimited) | ✅ | `RemediationEngine.tsx` |
| Real-time Regulatory Scan | Digest only | Weekly | Daily | Real-time | Real-time + API | `regulatory-update.types` |
| `vendorRisk` | ❌ | ❌ | 25 vendors | 150 vendors | Unlimited | VRM module (roadmap) |
| `questionnaireAutomation` | ❌ | ❌ | 5/mo | 25/mo | Unlimited | New module |
| `advancedReporting` (PDF reports) | 1/mo | 10/mo | 50/mo | Unlimited | Unlimited + WL | `generate-report.js` |
| Certificate + Auditor Verify | ❌ | ✅ | ✅ | ✅ | ✅ | `CertificateGenerator.tsx` |
| Audit Bundle export | ❌ | ❌ | ✅ | ✅ | ✅ | `AuditBundle.tsx` |
| `apiAccess` | ❌ | ❌ | Read-only | Read+Write | Full + webhooks | New REST surface |
| `ssoEnabled` (SAML/OIDC) | ❌ | ❌ | ❌ | ✅ | ✅ + SCIM | Auth service |
| `customBranding` | ❌ | Logo only | Logo + colors | Full theme | White-label | `TenantBranding` |
| Custom domain (Trust Center) | ❌ | ❌ | ❌ | ✅ | ✅ | DNS |
| Support SLA | Community | Email 48h | Email 24h | Priority 4h | Dedicated CSM + 1h |
| Audit-ready export for external auditors | ❌ | ❌ | ✅ | ✅ | ✅ + read-only auditor seats |

*"Unlimited" on AI features is subject to a fair-use soft cap (see §6 overage).

### 4.3 Enforcement pattern (code)

Create a single hook `useEntitlement(featureOrLimit)` that reads from the tenant's resolved `features`/`limits` and short-circuits UI before network calls. Every gated action must do a server-side re-check in the corresponding Netlify Function — client gates are for UX only.

Recommended precedence when a user hits a gate:
1. **Soft-block UI**: greyed button + tooltip `"Available on Growth →"`.
2. **Inline upgrade modal**: shows target plan, price diff, feature unlocked.
3. **Server enforcement**: 402 `PAYMENT_REQUIRED` with `{ required_plan, current_plan, upgrade_url }`.

---

## 5. Upgrade Paths & Triggers

Each tier is designed so predictable compliance milestones push buyers to the next step. These are the telemetry events that should fire in-product upgrade prompts.

### 5.1 Free → Starter ($499/mo)

| Trigger | Message | CTA |
|---|---|---|
| 3rd user invited | "Starter unlocks 10 seats." | Inline upgrade |
| First AWS connector beyond the single free slot | "Connect unlimited AWS accounts on Starter." | Upgrade + keep progress |
| Hits 50 control / 100 evidence cap | "You're filling up — Starter raises limits 3–7×." | Upgrade |
| Tries to generate a 4th AI policy in a month | "Trial usage reached." | Upgrade or wait for reset |

### 5.2 Starter → Growth ($999/mo)

| Trigger | Message | CTA |
|---|---|---|
| Enables 2nd framework | "Cross-framework crosswalk is a Growth feature." | Upgrade |
| First vendor added in VRM | "Unlock full vendor risk for 25 vendors." | Upgrade |
| First questionnaire received via Trust Center | "Auto-fill SIG/CAIQ with AI on Growth." | Upgrade |
| Adds Azure or GCP connector | "Multi-cloud ships with Growth." | Upgrade |
| API key requested | "Read-only API unlocks on Growth." | Upgrade |

### 5.3 Growth → Scale ($1,999/mo)

| Trigger | Message | CTA |
|---|---|---|
| SSO/SAML configuration attempt | "SSO is part of Scale." | Upgrade or book call |
| 6th framework activated | "Full framework library lives on Scale." | Upgrade |
| Custom domain on Trust Center | "White-label Trust Center on Scale." | Upgrade |
| Real-time regulatory scan toggled | "Real-time scan is a Scale feature." | Upgrade |
| Crosses 25 users | "Scale fits teams up to 75." | Upgrade |

### 5.4 Scale → Enterprise (custom)

No self-serve upgrade. Trigger **"Talk to sales"** when:
- 60+ users provisioned (approaching the 75 cap).
- FedRAMP, CMMC, or PCI-DSS Level 1 requested.
- SCIM or on-prem deployment requested.
- Procurement asks for MSA, DPA addenda, or custom SLAs.
- Annual contract value would exceed $25K based on add-ons.

### 5.5 Downgrade rules

- **Scheduled at period end** (never immediate, to avoid data loss disputes).
- If moving to a tier with a lower `maxUsers`: tenant must deactivate excess users first — block the downgrade until quota fits.
- Features that would be lost are listed and confirmed; tenant data is **retained read-only for 90 days** after downgrade before enforcement (grace period) so they can export.
- Cancellation = downgrade to Free, same retention rules.

---

## 6. Add-Ons & Usage-Based Revenue

Add-ons are separate Stripe Products attached to the subscription. Charged monthly regardless of plan cadence (except when the base plan is annual, in which case true-ups bill monthly in arrears).

| Add-on | Price | Applies to |
|---|---|---|
| **Extra user seat** | $29/mo per seat (Starter), $39 (Growth), $49 (Scale) | Beyond plan `maxUsers` |
| **Extra framework** (beyond plan count) | $200/mo per framework | Starter, Growth |
| **Extra vendor (VRM)** block of 25 | $150/mo | Growth, Scale |
| **Extra AI policy generations** block of 50 | $75/mo | Starter, Growth |
| **Extra questionnaire autofills** block of 10 | $99/mo | Growth, Scale |
| **On-demand auditor-ready bundle** | $499 one-time | Any |
| **Dedicated Customer Success Manager** | $750/mo | Growth, Scale |
| **Priority incident response consultation** | $250/hr retained, or $2K/mo retainer | Any paid |
| **Custom framework mapping (non-standard)** | $5,000 one-time | Growth+ |

**Fair-use soft caps (abuse prevention):**
- AI policy generation: hard throttle at 500/month even on "unlimited" tiers — beyond that, contact for custom.
- API rate limit: plan-level; bursts get 429 with upgrade CTA in error body.

---

## 7. Stripe Integration Architecture

### 7.1 Stripe object model

```
Customer (1 per Tenant)
 └── Subscription (1 active)
      ├── SubscriptionItem: base_plan (Starter|Growth|Scale recurring)
      ├── SubscriptionItem: extra_seats (metered, price_per_unit)
      ├── SubscriptionItem: ai_policy_overage (metered)
      ├── SubscriptionItem: vendor_overage (metered)
      └── SubscriptionItem: addon_csm (flat recurring, optional)
```

Stripe Products to create (one price per billing period):
- `prod_starter` → `price_starter_monthly`, `price_starter_annual`
- `prod_growth` → `price_growth_monthly`, `price_growth_annual`
- `prod_scale` → `price_scale_monthly`, `price_scale_annual`
- `prod_seat_starter`, `prod_seat_growth`, `prod_seat_scale` (per-unit metered)
- `prod_framework_addon` (per-unit)
- `prod_vendor_block_25` (per-unit)
- `prod_ai_policy_block_50` (per-unit)
- `prod_questionnaire_block_10` (per-unit)
- `prod_audit_bundle` (one-time)
- `prod_csm` (flat)

### 7.2 Data model (Supabase)

Existing `TenantBilling` already carries `customerId` and `subscriptionId` (`src/services/multi-tenant.service.ts:105-121`). Add:

```sql
ALTER TABLE organizations ADD COLUMN stripe_price_id TEXT;
ALTER TABLE organizations ADD COLUMN billing_interval TEXT CHECK (billing_interval IN ('monthly','annual'));
ALTER TABLE organizations ADD COLUMN trial_ends_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT false;

CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  stripe_event_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE usage_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  meter TEXT NOT NULL,          -- 'ai_policy', 'vendors', 'seats', 'questionnaire'
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  reported_to_stripe BOOLEAN DEFAULT false,
  UNIQUE(organization_id, meter, period_start)
);
```

### 7.3 Netlify Functions to add

All under `netlify/functions/`:

| Function | Purpose | Auth |
|---|---|---|
| `stripe-create-checkout.js` | Returns a Checkout Session URL for plan select or add-on | Supabase JWT |
| `stripe-create-portal.js` | Returns a Billing Portal URL (manage card, invoices, cancel) | Supabase JWT |
| `stripe-webhook.js` | Handles all Stripe events (see §7.4). Idempotent by `event.id` | Stripe signature |
| `stripe-report-usage.js` | Daily cron: aggregates `usage_meters` rows, reports to Stripe `/subscription_items/{id}/usage_records` | Scheduled function (internal) |
| `entitlements-check.js` | Server-side gate used by gated endpoints (policy gen, report gen, VRM writes) | Supabase JWT |

### 7.4 Webhook events to handle

Implement as a switch in `stripe-webhook.js`, always verifying signature and deduping on `event.id`:

| Event | Action |
|---|---|
| `checkout.session.completed` | Create/update `organizations.billing.customerId`, `subscriptionId`, set plan, set `status = 'active'`, clear `trial_ends_at` |
| `customer.subscription.updated` | Re-resolve plan from `price_id`, update `limits`/`features` in place, write `PLAN_CONFIGS` snapshot |
| `customer.subscription.deleted` | Downgrade tenant to `free` at `current_period_end`; email owner |
| `invoice.payment_succeeded` | Mark period; reset monthly-usage counters (`resetMonthlyApiCalls` path already exists at `multi-tenant.service.ts:855`) |
| `invoice.payment_failed` | Enter dunning state; notify owner + block paid features after 7 days (see §8.4) |
| `customer.subscription.trial_will_end` | Email owner 3 days before trial end |
| `invoice.upcoming` | Preview on Billing tab, surface any overage |

### 7.5 Frontend flow

1. User clicks **Upgrade** → frontend calls `stripe-create-checkout` with `price_id` + `tenant_id`.
2. Redirect to Stripe Checkout (hosted). Return URL = `/settings/billing?checkout=success`.
3. Webhook arrives independent of redirect; frontend shows provisional "Upgrading…" state until webhook flips `plan` field (poll or use Supabase realtime).
4. **Manage billing** button opens the Stripe Billing Portal via `stripe-create-portal` — Stripe handles card updates, invoice download, plan changes, cancellation.

### 7.6 Tax & compliance

- **Stripe Tax enabled** from day one. US sales-tax nexus will be hit quickly with SaaS.
- Collect **VAT/GST** for EU/UK/CA customers via Stripe Tax.
- Require `billingAddress` at Checkout (already modeled in `TenantBilling`).
- DPA + signed order form for all Scale+ customers (out-of-band; Stripe Checkout unchecked collects PO fields via custom metadata).

### 7.7 Security

- Stripe secret key in Netlify env (`STRIPE_SECRET_KEY`), never shipped to client.
- Webhook endpoint verifies `Stripe-Signature` against `STRIPE_WEBHOOK_SECRET`.
- All entitlement checks re-validated server-side even though the client caches `features`/`limits`.
- No PAN data ever touches AttestAI servers — Checkout + Portal are Stripe-hosted (SAQ-A scope).

---

## 8. Billing Lifecycle

### 8.1 Trial

- **14-day free trial on any paid plan** without credit card for Starter, with card for Growth/Scale (reduces tire-kicking on higher tiers).
- `trial_ends_at` set at Checkout; `status = 'trial'` (already supported in `TenantStatus`).
- Full feature access at trial plan level.
- Day-11 email: "3 days left." Day-14 email: auto-converts or reverts to Free.

### 8.2 Proration

- Upgrades mid-cycle: Stripe default proration, charged immediately.
- Downgrades: scheduled at `current_period_end`, no refund. Surface this explicitly in the UI to avoid support tickets.
- Annual → monthly: scheduled at renewal only (prevents gaming the 2-months-free).

### 8.3 Promotions & discounts

| Offer | Mechanism |
|---|---|
| **20% off annual, year 1** (launch promo) | Stripe Coupon `LAUNCH20`, 12-month duration |
| **Non-profit / early-stage (<$1M ARR)** | 30% off any tier, verified via Parallel Economy or manual email |
| **YC/Techstars/portfolio partner** | 3 months free on Starter/Growth |
| **Switcher credit from Vanta/Drata/Secureframe** | $2,000 account credit on proof of prior invoice — one-time, Growth+ |
| **Annual prepay discount** | Already baked into annual pricing (~17%) |

All coupons created in Stripe, tracked via `metadata.promo_source` on Customer for LTV attribution.

### 8.4 Dunning / failed payments

Stripe Smart Retries: 3 retries over 7 days. On day 7, Stripe fires `invoice.payment_failed` with `next_payment_attempt=null`. Our webhook:

1. Email owner + billing contact immediately.
2. Show banner in-app: "Your payment failed — update card to avoid service interruption."
3. Day 10: soft-block new paid-feature writes (reads stay open, so their audit doesn't blow up).
4. Day 14: auto-downgrade to Free, 90-day data retention starts.

### 8.5 Refunds

- Annual subscription cancelled within first 30 days: **full refund**, no questions.
- Annual cancelled after 30 days: **prorated refund minus 15% early-termination fee** (protects against seasonal audit prep customers).
- Monthly: **no refunds**, service through period end.

Written into ToS. Refund actions go through Stripe Dashboard; the webhook updates our records on the resulting `charge.refunded` event.

---

## 9. Telemetry & Metrics

Must-have dashboards before GA:

| Metric | Source | Target (12 mo) |
|---|---|---|
| MRR, ARR | Stripe | ARR $1.5M |
| Free → Paid conversion | Funnel analytics | 12–18% |
| Logo churn (monthly) | Stripe subs canceled / active | <2% |
| Net revenue retention | Stripe expansion − contraction | >110% |
| ACV by tier | Stripe | Starter $6K, Growth $12K, Scale $24K |
| Upgrade trigger → conversion | In-product event → subscription update | >25% within 14 days |
| Gross margin | Stripe − Anthropic + infra | >75% |

Report weekly to a `#revenue` Slack channel via a scheduled task.

---

## 10. Implementation Roadmap

### Phase 1 — Foundation (Weeks 1–3)

- [ ] Update `PLAN_CONFIGS` in `src/services/multi-tenant.service.ts:180` to the prices and limits in §3–§4.
- [ ] Add new fields to `TenantFeatures` (see §4.2).
- [ ] Schema migration for `stripe_price_id`, `billing_interval`, `trial_ends_at`, `cancel_at_period_end`, `billing_events`, `usage_meters`.
- [ ] Provision Stripe Products + Prices in both test and live modes; commit price IDs to `src/constants/billing.ts`.
- [ ] Build `useEntitlement(featureOrLimit)` hook; wrap gated UI entry points.

### Phase 2 — Checkout + webhooks (Weeks 4–6)

- [ ] Implement `stripe-create-checkout.js`, `stripe-create-portal.js`, `stripe-webhook.js`.
- [ ] Billing settings page in `src/components/Settings.tsx` (current plan, seats, invoices link → Portal).
- [ ] Upgrade modals for each trigger in §5.
- [ ] Enable Stripe Tax.

### Phase 3 — Metering + overage (Weeks 7–9)

- [ ] `usage_meters` writes from: AI policy generator, questionnaire autofill, vendor add, seat add.
- [ ] `stripe-report-usage.js` scheduled function (daily).
- [ ] Dunning banner + soft-block logic.
- [ ] Trial expiration emails.

### Phase 4 — Launch (Week 10)

- [ ] Publish pricing page on marketing site with exact numbers.
- [ ] Enable `LAUNCH20` coupon.
- [ ] Turn on real-time revenue dashboard.
- [ ] Start outbound for Enterprise tier.

### Phase 5 — Expansion (Months 4–6)

- [ ] Add-ons marketplace UI.
- [ ] Switcher credit program with Vanta/Drata invoice upload.
- [ ] Partner referral program (auditors, MSPs).

---

## 11. Open Questions / Decisions for Leadership

1. **Card-required trial on Growth/Scale?** Recommended yes — qualifies intent, but may reduce top-of-funnel by ~25%.
2. **Seat pricing vs. flat tier caps?** Current plan uses seat caps per tier + overage seats. Alternative: pure per-seat pricing (e.g. $39/user at Growth). Flat tiers are simpler to communicate and price-anchor better; recommend staying with capped tiers.
3. **Free tier: keep indefinitely or 30-day limited?** Recommend indefinite — Trust Center SEO and word-of-mouth justify it.
4. **Enterprise floor price?** Suggest $36K annual minimum to protect against Scale cannibalization.
5. **"AttestAI for Auditors" read-only seats?** Could be a $0 / revenue-neutral lever if it shortens audit cycles and drives referrals — worth a scoped pilot in Phase 5.

---

## Appendix A — Competitive price-per-feature positioning

| Feature unlocked at | AttestAI tier | Cheapest competitor tier unlocking it |
|---|---|---|
| First framework | Free ($0) | Comp AI Starter (~$5K/yr) |
| Multi-cloud (AWS+Azure+GCP) | Growth ($999/mo) | Vanta Growth ($25K+/yr) |
| SSO/SAML | Scale ($1,999/mo) | Secureframe Complete ($15K+/yr), Vanta Growth ($25K+) |
| Vendor Risk Management | Growth ($999/mo) | Drata VRM add-on ($10K+/yr on top of $25K base) |
| AI Questionnaire autofill | Growth ($999/mo) | Vanta add-on ($5K+/yr on top of Growth) |
| White-label Trust Center | Scale ($1,999/mo) | Vanta Enterprise ($50K+/yr) |

The positioning statement holds: **enterprise features at mid-market prices, no per-feature surprise invoicing.**
