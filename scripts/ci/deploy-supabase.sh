#!/usr/bin/env bash
# Called by .github/workflows/deploy-supabase.yml.
#
# Deploys the database migrations and Edge Functions only when everything they
# need is in place, and otherwise deploys nothing and exits cleanly, so the
# checkout already live keeps running exactly as it is:
#   1. GitHub secrets SUPABASE_ACCESS_TOKEN and SUPABASE_DB_PASSWORD,
#   2. every function secret a paying customer depends on, checked by name in
#      Supabase (values are never read or printed).
# Migrations go first; if they fail, no function is deployed.
set -euo pipefail
PROJECT_REF="${PROJECT_REF:-zqomzteaeiqtnipkgyuo}"
FUNCTIONS=(create-checkout stripe-webhook delivery-approve birthday-book enquiry house-cron)
REQUIRED=(STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET PRINTFUL_API_KEY ANTHROPIC_API_KEY RESEND_API_KEY MAIL_FROM APPROVAL_SECRET HOUSE_CRON_KEY)

skip() {
  echo "::notice::Skipped: $1 Nothing was deployed; the checkout already live keeps running unchanged. See docs/SHOPKEEPER.md, section 5."
  exit 0
}

missing=()
[ -n "${SUPABASE_ACCESS_TOKEN:-}" ] || missing+=(SUPABASE_ACCESS_TOKEN)
[ -n "${SUPABASE_DB_PASSWORD:-}" ] || missing+=(SUPABASE_DB_PASSWORD)
[ ${#missing[@]} -eq 0 ] || skip "GitHub secret(s) not set: ${missing[*]}."

cmp js/house-core.js supabase/functions/_shared/house-core.js

names="$(supabase secrets list --project-ref "$PROJECT_REF")"
for name in "${REQUIRED[@]}"; do
  grep -qw -- "$name" <<<"$names" || missing+=("$name")
done
[ ${#missing[@]} -eq 0 ] || skip "Supabase function secret(s) not set: ${missing[*]}."

supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
supabase db push --password "$SUPABASE_DB_PASSWORD"
for fn in "${FUNCTIONS[@]}"; do
  supabase functions deploy "$fn" --project-ref "$PROJECT_REF" --no-verify-jwt
done
echo "Deployed migrations and ${#FUNCTIONS[@]} functions to $PROJECT_REF."
