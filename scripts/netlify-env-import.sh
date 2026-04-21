#!/usr/bin/env bash
# =============================================================================
# scripts/netlify-env-import.sh
# =============================================================================
# Bulk-imports every environment variable the Compliance Dashboard needs into
# a Netlify site, scoped to a single deploy context.
#
# Usage:
#   1. Fill in every FIXME value below (or better: export them in your shell
#      and delete the inline placeholders).
#   2. Link the repo to the Netlify site once:   netlify link
#   3. Run against production:                   ./scripts/netlify-env-import.sh production
#      Or against a deploy preview (test keys):  ./scripts/netlify-env-import.sh deploy-preview
#
# Flags:
#   --dry-run   Prints the commands that would run; does not call Netlify.
#
# Requires: netlify-cli (npm i -g netlify-cli) and an authenticated session
# (netlify login).
# =============================================================================

set -euo pipefail

CONTEXT="${1:-production}"
DRY_RUN="${2:-}"

if [[ "$CONTEXT" != "production" && "$CONTEXT" != "deploy-preview" && "$CONTEXT" != "branch-deploy" && "$CONTEXT" != "dev" ]]; then
  echo "Error: context must be one of: production | deploy-preview | branch-deploy | dev"
  exit 1
fi

# -----------------------------------------------------------------------------
# Values — override via shell env or edit inline. Anything left as FIXME will
# abort the run so you don't silently ship a blank var to Netlify.
# -----------------------------------------------------------------------------

# Supabase
: "${VITE_SUPABASE_URL:=FIXME}"
: "${VITE_SUPABASE_ANON_KEY:=FIXME}"
: "${SUPABASE_SERVICE_ROLE_KEY:=FIXME}"

# App
: "${APP_URL:=https://app.lydellsecurity.com}"

# Stripe keys
: "${VITE_STRIPE_PUBLIC_KEY:=FIXME}"
: "${STRIPE_SECRET_KEY:=FIXME}"
: "${STRIPE_WEBHOOK_SECRET:=FIXME}"

# Stripe base plans — client
: "${VITE_STRIPE_PRICE_STARTER_MONTHLY:=FIXME}"
: "${VITE_STRIPE_PRICE_STARTER_ANNUAL:=FIXME}"
: "${VITE_STRIPE_PRICE_GROWTH_MONTHLY:=FIXME}"
: "${VITE_STRIPE_PRICE_GROWTH_ANNUAL:=FIXME}"
: "${VITE_STRIPE_PRICE_SCALE_MONTHLY:=FIXME}"
: "${VITE_STRIPE_PRICE_SCALE_ANNUAL:=FIXME}"

# Stripe base plans — server mirror (values match the VITE_ ones)
: "${STRIPE_PRICE_STARTER_MONTHLY:=$VITE_STRIPE_PRICE_STARTER_MONTHLY}"
: "${STRIPE_PRICE_STARTER_ANNUAL:=$VITE_STRIPE_PRICE_STARTER_ANNUAL}"
: "${STRIPE_PRICE_GROWTH_MONTHLY:=$VITE_STRIPE_PRICE_GROWTH_MONTHLY}"
: "${STRIPE_PRICE_GROWTH_ANNUAL:=$VITE_STRIPE_PRICE_GROWTH_ANNUAL}"
: "${STRIPE_PRICE_SCALE_MONTHLY:=$VITE_STRIPE_PRICE_SCALE_MONTHLY}"
: "${STRIPE_PRICE_SCALE_ANNUAL:=$VITE_STRIPE_PRICE_SCALE_ANNUAL}"

# Stripe add-ons — client
: "${VITE_STRIPE_PRICE_SEAT_STARTER:=FIXME}"
: "${VITE_STRIPE_PRICE_SEAT_GROWTH:=FIXME}"
: "${VITE_STRIPE_PRICE_SEAT_SCALE:=FIXME}"
: "${VITE_STRIPE_PRICE_AI_POLICY_BLOCK_50:=FIXME}"
: "${VITE_STRIPE_PRICE_QUESTIONNAIRE_BLOCK_10:=FIXME}"
: "${VITE_STRIPE_PRICE_VENDOR_BLOCK_25:=FIXME}"
: "${VITE_STRIPE_PRICE_CSM_MONTHLY:=FIXME}"
: "${VITE_STRIPE_PRICE_AUDIT_BUNDLE:=FIXME}"

# Stripe add-ons — server mirror
: "${STRIPE_ADDON_SEAT_STARTER:=$VITE_STRIPE_PRICE_SEAT_STARTER}"
: "${STRIPE_ADDON_SEAT_GROWTH:=$VITE_STRIPE_PRICE_SEAT_GROWTH}"
: "${STRIPE_ADDON_SEAT_SCALE:=$VITE_STRIPE_PRICE_SEAT_SCALE}"
: "${STRIPE_ADDON_AI_POLICY_BLOCK_50:=$VITE_STRIPE_PRICE_AI_POLICY_BLOCK_50}"
: "${STRIPE_ADDON_QUESTIONNAIRE_BLOCK_10:=$VITE_STRIPE_PRICE_QUESTIONNAIRE_BLOCK_10}"
: "${STRIPE_ADDON_VENDOR_BLOCK_25:=$VITE_STRIPE_PRICE_VENDOR_BLOCK_25}"
: "${STRIPE_ADDON_CSM_MONTHLY:=$VITE_STRIPE_PRICE_CSM_MONTHLY}"
: "${STRIPE_ADDON_AUDIT_BUNDLE:=$VITE_STRIPE_PRICE_AUDIT_BUNDLE}"

# Cron / misc
: "${USAGE_REPORT_CRON_SECRET:=FIXME}"
: "${ANTHROPIC_API_KEY:=FIXME}"

# -----------------------------------------------------------------------------
# Keys to import, in order. Keep this aligned with .env.example.
# -----------------------------------------------------------------------------

VARS=(
  VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  APP_URL

  VITE_STRIPE_PUBLIC_KEY
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET

  VITE_STRIPE_PRICE_STARTER_MONTHLY
  VITE_STRIPE_PRICE_STARTER_ANNUAL
  VITE_STRIPE_PRICE_GROWTH_MONTHLY
  VITE_STRIPE_PRICE_GROWTH_ANNUAL
  VITE_STRIPE_PRICE_SCALE_MONTHLY
  VITE_STRIPE_PRICE_SCALE_ANNUAL

  STRIPE_PRICE_STARTER_MONTHLY
  STRIPE_PRICE_STARTER_ANNUAL
  STRIPE_PRICE_GROWTH_MONTHLY
  STRIPE_PRICE_GROWTH_ANNUAL
  STRIPE_PRICE_SCALE_MONTHLY
  STRIPE_PRICE_SCALE_ANNUAL

  VITE_STRIPE_PRICE_SEAT_STARTER
  VITE_STRIPE_PRICE_SEAT_GROWTH
  VITE_STRIPE_PRICE_SEAT_SCALE
  VITE_STRIPE_PRICE_AI_POLICY_BLOCK_50
  VITE_STRIPE_PRICE_QUESTIONNAIRE_BLOCK_10
  VITE_STRIPE_PRICE_VENDOR_BLOCK_25
  VITE_STRIPE_PRICE_CSM_MONTHLY
  VITE_STRIPE_PRICE_AUDIT_BUNDLE

  STRIPE_ADDON_SEAT_STARTER
  STRIPE_ADDON_SEAT_GROWTH
  STRIPE_ADDON_SEAT_SCALE
  STRIPE_ADDON_AI_POLICY_BLOCK_50
  STRIPE_ADDON_QUESTIONNAIRE_BLOCK_10
  STRIPE_ADDON_VENDOR_BLOCK_25
  STRIPE_ADDON_CSM_MONTHLY
  STRIPE_ADDON_AUDIT_BUNDLE

  USAGE_REPORT_CRON_SECRET
  ANTHROPIC_API_KEY
)

# -----------------------------------------------------------------------------
# Pre-flight: refuse to run if any required value is still "FIXME".
# -----------------------------------------------------------------------------

missing=()
for key in "${VARS[@]}"; do
  val="${!key}"
  if [[ "$val" == "FIXME" || -z "$val" ]]; then
    missing+=("$key")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "Refusing to run — the following vars are unset or FIXME:"
  printf '  - %s\n' "${missing[@]}"
  echo ""
  echo "Export them in your shell or edit this script, then re-run."
  exit 1
fi

# -----------------------------------------------------------------------------
# Apply.
# -----------------------------------------------------------------------------

echo "Importing ${#VARS[@]} variables into context: $CONTEXT"
echo ""

for key in "${VARS[@]}"; do
  val="${!key}"
  cmd=(netlify env:set "$key" "$val" --context "$CONTEXT")
  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    # Mask the value in dry-run output.
    echo "netlify env:set $key '***' --context $CONTEXT"
  else
    "${cmd[@]}" >/dev/null
    echo "  set $key"
  fi
done

echo ""
echo "Done. Trigger a redeploy for env changes to take effect:"
echo "  netlify deploy --prod   # or push a commit"
