#!/usr/bin/env bash
# Called by .github/workflows/house-cron.yml: the house sweep and keep-alive.
# Skips cleanly (exit 0, with a notice) when HOUSE_CRON_KEY is not set or the
# house-cron function has not been deployed yet. Fails only when the function
# is deployed and refuses or errors, which needs looking at.
set -uo pipefail
URL="${HOUSE_CRON_URL:-https://zqomzteaeiqtnipkgyuo.supabase.co/functions/v1/house-cron}"

if [ -z "${HOUSE_CRON_KEY:-}" ]; then
  echo "::notice::Skipped: HOUSE_CRON_KEY is not set, so the sweep and keep-alive did not run. Nothing else is affected. To turn it on, follow docs/SHOPKEEPER.md, section 5."
  exit 0
fi

body="$(mktemp)"
status=$(curl -sS -o "$body" -w '%{http_code}' --max-time 140 -X POST -H "x-house-key: $HOUSE_CRON_KEY" "$URL") || status=000
case "$status" in
  200)
    cat "$body"; echo
    ;;
  404)
    echo "::notice::Skipped: the house-cron function is not deployed yet (it is deployed by the Deploy checkout functions workflow once its secrets are set)."
    ;;
  000)
    echo "::warning::Could not reach Supabase; the next run will try again."
    ;;
  403)
    echo "::error::house-cron refused the key: HOUSE_CRON_KEY in GitHub must match HOUSE_CRON_KEY in Supabase."
    exit 1
    ;;
  *)
    cat "$body"; echo
    echo "::error::house-cron answered HTTP $status."
    exit 1
    ;;
esac
