#!/usr/bin/env bash
set -euo pipefail

# Sync the Worker's secrets from GitHub secrets to the Cloudflare Worker.
#
# Only the names in MANAGED_SECRETS are touched. GitHub's secrets context holds
# every secret the job can see (repo, environment and org level), so syncing
# "everything except a denylist" would push unrelated org secrets into the
# Worker and delete Worker secrets whenever a GitHub secret moved scope. An
# explicit list keeps both directions predictable:
#   - a managed name with a value in GitHub  -> created/updated on the Worker
#   - a managed name missing/empty in GitHub -> deleted from the Worker
#   - any other Worker secret                -> left alone (warned about)
#
# To add a secret: declare it in astro.config.mjs (env.schema), add it to
# MANAGED_SECRETS below, then set it in the GitHub environment.
MANAGED_SECRETS=(
  RESEND_API_KEY
)
#
# Required env:
#   SECRETS_CONTEXT  — ${{ toJSON(secrets) }} (JSON object of all available secrets)
#   CLOUDFLARE_API_TOKEN
#   CLOUDFLARE_ACCOUNT_ID
#
# Optional env:
#   WRANGLER_BIN — wrangler invocation (default: "pnpm exec wrangler";
#                  node_modules/.bin is not on PATH in CI run steps)
#
# Usage:
#   SECRETS_CONTEXT='{"KEY":"val",...}' ./scripts/sync-secrets.sh
#   SECRETS_CONTEXT='{"KEY":"val",...}' ./scripts/sync-secrets.sh --env preview

run_wrangler() {
  # shellcheck disable=SC2086 — WRANGLER_BIN is intentionally word-split.
  ${WRANGLER_BIN:-pnpm exec wrangler} --config dist/server/wrangler.json "$@"
}

ENV_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --env) ENV_ARGS+=("--env" "$2"); shift 2 ;;
    *) shift ;;
  esac
done
# Empty-array expansion under `set -u` breaks on bash 3.x (macOS); this form is safe.
ENV_ARGS=(${ENV_ARGS[@]+"${ENV_ARGS[@]}"})

MANAGED_JSON=$(printf '%s\n' "${MANAGED_SECRETS[@]}" | jq -R . | jq -sc .)

# Managed secrets that have a value in GitHub.
GITHUB_SECRETS=$(echo "$SECRETS_CONTEXT" | jq -c --argjson managed "$MANAGED_JSON" '
  with_entries(select(.key as $k | $managed | index($k)))
  | with_entries(select(.value | type == "string" and length > 0))
')

# Existing Worker secrets (may fail on first deploy or when none exist).
EXISTING=$(run_wrangler secret list ${ENV_ARGS[@]+"${ENV_ARGS[@]}"} 2>/dev/null || echo '[]')
if ! echo "$EXISTING" | jq -e 'type == "array"' >/dev/null 2>&1; then
  EXISTING='[]'
fi

UNMANAGED=$(echo "$EXISTING" | jq -r --argjson managed "$MANAGED_JSON" \
  '.[].name | select(. as $n | $managed | index($n) | not)')
if [ -n "$UNMANAGED" ]; then
  echo "WARNING: the Worker has secrets this script does not manage (left untouched):" >&2
  while IFS= read -r name; do echo "  - $name" >&2; done <<<"$UNMANAGED"
  echo "         Add them to MANAGED_SECRETS, or delete them with 'wrangler secret delete'." >&2
fi

# Safety valve: no managed secret in context while the Worker has managed ones
# almost always means the secrets context was withheld (Dependabot-triggered
# run, permissions change), not a deliberate deletion. Never mass-delete.
EXISTING_MANAGED=$(echo "$EXISTING" | jq -c --argjson managed "$MANAGED_JSON" \
  '[.[].name | select(. as $n | $managed | index($n))]')
if [ "$GITHUB_SECRETS" = "{}" ]; then
  if [ "$(echo "$EXISTING_MANAGED" | jq 'length')" -gt 0 ]; then
    echo "WARNING: no managed secrets in the GitHub context but the Worker has some — skipping sync." >&2
    echo "         To really delete them, run 'wrangler secret delete' manually." >&2
  else
    echo "No secrets to sync."
  fi
  exit 0
fi

# Build sync JSON:
# - managed secrets with a GitHub value -> their values (create/update)
# - managed secrets on the Worker but not in GitHub -> null (delete)
SYNC_JSON=$(jq -n \
  --argjson github "$GITHUB_SECRETS" \
  --argjson existing "$EXISTING_MANAGED" \
  'reduce $existing[] as $n ($github;
     if has($n) then . else .[$n] = null end)')

echo "Syncing secrets to Cloudflare Worker..."
echo "$SYNC_JSON" | jq -r 'to_entries | map(if .value == null then "  - \(.key) (delete)" else "  - \(.key) (set)" end)[]'
echo "$SYNC_JSON" | run_wrangler secret bulk ${ENV_ARGS[@]+"${ENV_ARGS[@]}"}
echo "Secret sync complete."
