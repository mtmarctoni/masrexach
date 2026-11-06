#!/usr/bin/env bash
set -euo pipefail

# Sync the managed Worker secrets (scripts/managed-secrets.sh) from GitHub
# secrets to the Cloudflare Worker:
#   - a managed name with a value in GitHub  -> created/updated on the Worker
#   - a managed name missing/empty in GitHub -> deleted from the Worker
#   - any other Worker secret                -> left alone (warned about)
#
# CI deploys set secrets atomically with the code (deploy.sh passes
# --secrets-file), which only adds and updates. CI then runs this script with
# --prune to delete stale managed secrets; when there is nothing to delete it
# makes no write, so no extra deployment is created. Without --prune it does a
# full sync, for updating secrets without a deploy.
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
#   SECRETS_CONTEXT='{"KEY":"val",...}' ./scripts/sync-secrets.sh [--prune] [--env staging]

# shellcheck source=scripts/managed-secrets.sh
source "$(dirname "${BASH_SOURCE[0]}")/managed-secrets.sh"

run_wrangler() {
  # shellcheck disable=SC2086 # WRANGLER_BIN is intentionally word-split.
  ${WRANGLER_BIN:-pnpm exec wrangler} --config dist/server/wrangler.json "$@"
}

PRUNE=false
ENV_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --env) ENV_ARGS+=("--env" "$2"); shift 2 ;;
    --prune) PRUNE=true; shift ;;
    *) shift ;;
  esac
done
# Empty-array expansion under `set -u` breaks on bash 3.x (macOS); this form is safe.
ENV_ARGS=(${ENV_ARGS[@]+"${ENV_ARGS[@]}"})

MANAGED_JSON=$(managed_secrets_names_json)
GITHUB_SECRETS=$(echo "$SECRETS_CONTEXT" | managed_secrets_from_context)

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
  echo "         Add them to scripts/managed-secrets.sh, or delete them with 'wrangler secret delete'." >&2
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
# - managed secrets with a GitHub value -> their values (create/update), unless pruning
# - managed secrets on the Worker but not in GitHub -> null (delete)
SYNC_JSON=$(jq -n \
  --argjson github "$GITHUB_SECRETS" \
  --argjson existing "$EXISTING_MANAGED" \
  --argjson prune "$PRUNE" \
  '(if $prune then {} else $github end) as $base
   | reduce $existing[] as $n ($base;
       if $github | has($n) then . else .[$n] = null end)')

if [ "$SYNC_JSON" = "{}" ]; then
  echo "No stale secrets to remove."
  exit 0
fi

echo "Syncing secrets to Cloudflare Worker..."
echo "$SYNC_JSON" | jq -r 'to_entries | map(if .value == null then "  - \(.key) (delete)" else "  - \(.key) (set)" end)[]'
echo "$SYNC_JSON" | run_wrangler secret bulk ${ENV_ARGS[@]+"${ENV_ARGS[@]}"}
echo "Secret sync complete."
