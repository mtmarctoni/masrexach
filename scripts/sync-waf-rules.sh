#!/usr/bin/env bash
set -euo pipefail

# Reconcile the zone's rate-limiting rules with the ones declared here.
#
# The contact form sends a confirmation email to whatever address the submitter
# types. Without a cap, anyone can drive the form in a loop and use the Resend
# account to mail arbitrary people — burning quota and the sending domain's
# reputation. This rule caps the volume. It is NOT a bot defence: a slow or
# distributed attacker still gets through. Turnstile is the answer if that
# happens; this is the cheap floor.
#
# Why match on method rather than path: the contact form is the only POST
# endpoint on the site, and it posts to two different paths — /_actions/
# sendContact when the JS enhancement is active, and the page path (/contacto)
# when it is not. Matching POST covers both and cannot drift as routes change.
#
# Why the hosts are pinned: marctonimas.com is a shared zone. A zone-wide POST
# limit would apply to every other site on it.
#
# Required env:
#   CLOUDFLARE_API_TOKEN  — needs Zone > Rulesets: Edit on top of the
#                           permissions the deploy already requires
#   CLOUDFLARE_ZONE_ID    — the zone the hosts below belong to
#
# Optional env (defaults in the assignments below):
#   WAF_PROTECTED_HOSTS     — space-separated hostnames to protect
#   WAF_RATELIMIT_REQUESTS  — requests allowed per period, per client
#   WAF_RATELIMIT_PERIOD    — counting window, seconds (Cloudflare accepts a
#                             fixed set of values; 10/60/120/300/600/3600)
#   WAF_RATELIMIT_TIMEOUT   — how long a client stays blocked, seconds
#   WAF_RATELIMIT_ACTION    — block | managed_challenge | challenge | log
#
# Usage:
#   ./scripts/sync-waf-rules.sh
#   ./scripts/sync-waf-rules.sh --dry-run    # print the payload, send nothing

DRY_RUN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

# Keep in sync with the routes in wrangler.jsonc.
HOSTS="${WAF_PROTECTED_HOSTS:-masrexach.marctonimas.com masrexach-staging.marctonimas.com}"
REQUESTS="${WAF_RATELIMIT_REQUESTS:-5}"
PERIOD="${WAF_RATELIMIT_PERIOD:-60}"
TIMEOUT="${WAF_RATELIMIT_TIMEOUT:-600}"
ACTION="${WAF_RATELIMIT_ACTION:-block}"

# Rules carrying this marker are ours: the sync replaces them and leaves every
# other rule in the phase untouched. Without it, reconciling a shared zone
# would delete rate-limit rules belonging to the other sites on it.
MARKER="[masrexach-contact]"

# Overridable so the reconcile logic can be tested against a local stub
# (tests/waf-rules.test.ts) without touching the real account.
API="${CF_API_BASE:-https://api.cloudflare.com/client/v4}"
PHASE_PATH="rulesets/phases/http_ratelimit/entrypoint"

# Build the hostname set as a Cloudflare filter expression list:
#   {"a.example.com" "b.example.com"}
HOST_LIST=""
for host in $HOSTS; do
  HOST_LIST="$HOST_LIST \"$host\""
done
HOST_LIST="{${HOST_LIST# }}"

EXPRESSION="http.request.method eq \"POST\" and http.host in $HOST_LIST"

DESIRED=$(jq -n \
  --arg description "$MARKER contact form submissions, per IP" \
  --arg expression "$EXPRESSION" \
  --arg action "$ACTION" \
  --argjson requests "$REQUESTS" \
  --argjson period "$PERIOD" \
  --argjson timeout "$TIMEOUT" \
  '[{
     description: $description,
     expression: $expression,
     action: $action,
     ratelimit: {
       characteristics: ["ip.src", "cf.colo.id"],
       period: $period,
       requests_per_period: $requests,
       mitigation_timeout: $timeout
     }
   }]')

if [ "$DRY_RUN" -eq 1 ]; then
  # No credentials needed: the dry run exercises payload construction only,
  # which is what CI checks on every pull request.
  jq -n --argjson rules "$DESIRED" '{rules: $rules}'
  exit 0
fi

if [ -z "${CLOUDFLARE_ZONE_ID:-}" ]; then
  echo "WARNING: CLOUDFLARE_ZONE_ID is unset — skipping rate-limit rule sync." >&2
  echo "         The contact form deploys without a submission cap." >&2
  exit 0
fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN is unset but CLOUDFLARE_ZONE_ID is set." >&2
  exit 1
fi

BODY_FILE=$(mktemp)
trap 'rm -f "$BODY_FILE"' EXIT

# Writes the response body to $BODY_FILE and prints the HTTP status. The status
# is what drives the decisions below: Cloudflare's error codes are not stable
# enough to branch on, a status is.
cf_api() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-sS -o "$BODY_FILE" -w '%{http_code}'
    -X "$method" "$API/zones/$CLOUDFLARE_ZONE_ID/$path"
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
    -H "Content-Type: application/json")
  [ -n "$body" ] && args+=(--data "$body")
  curl "${args[@]}"
}

# Read the phase as it stands. A zone that has never had a rate-limit rule has
# no entry point ruleset and answers 404 — a fresh phase, not a failure.
STATUS=$(cf_api GET "$PHASE_PATH" || echo "000")

if [ "$STATUS" = "200" ]; then
  EXISTING_RULES=$(jq '.result.rules // []' "$BODY_FILE")
elif [ "$STATUS" = "404" ]; then
  EXISTING_RULES='[]'
else
  # Anything else — auth failure, a permissions gap, an outage — means we do
  # not know what is in the phase. Overwriting it blind could delete another
  # site's rules, so stop instead.
  echo "ERROR: could not read the current rate-limit phase (HTTP $STATUS);" >&2
  echo "       refusing to overwrite it." >&2
  jq -r '.errors[]? | "  - \(.code): \(.message)"' "$BODY_FILE" 2>/dev/null || true
  exit 1
fi

FOREIGN_RULES=$(echo "$EXISTING_RULES" | jq --arg marker "$MARKER" \
  '[.[] | select((.description // "") | startswith($marker) | not)]')

FOREIGN_COUNT=$(echo "$FOREIGN_RULES" | jq 'length')
if [ "$FOREIGN_COUNT" -gt 0 ]; then
  echo "Preserving $FOREIGN_COUNT rate-limit rule(s) not managed by this repo:"
  echo "$FOREIGN_RULES" | jq -r '.[] | "  - \(.description // "(no description)")"'
fi

PAYLOAD=$(jq -n \
  --argjson foreign "$FOREIGN_RULES" \
  --argjson desired "$DESIRED" \
  '{rules: ($foreign + $desired)}')

echo "Applying rate-limit rule: $REQUESTS POST requests / ${PERIOD}s per IP -> $ACTION for ${TIMEOUT}s"
echo "  hosts: $HOSTS"

STATUS=$(cf_api PUT "$PHASE_PATH" "$PAYLOAD" || echo "000")

if [ "$STATUS" != "200" ]; then
  echo "ERROR: rate-limit rule sync failed (HTTP $STATUS)." >&2
  jq -r '.errors[]? | "  - \(.code): \(.message)"' "$BODY_FILE" 2>/dev/null || cat "$BODY_FILE" >&2
  exit 1
fi

echo "Rate-limit rule sync complete."
