#!/usr/bin/env bash
set -euo pipefail

# Deploy the Worker, injecting GitHub Variables as runtime `var` bindings.
#
# Non-secret runtime config (read at runtime through the adapter env, e.g.
# CONTACT_FROM_EMAIL) is passed with `wrangler deploy --var KEY:VALUE`. This
# is atomic with the deploy and reconciles deletions for free: `keep_vars`
# defaults to false, so a variable removed from GitHub is simply not passed and
# disappears from the Worker on the next deploy.
#
# Managed secrets (scripts/managed-secrets.sh) that have a value in GitHub are
# uploaded with the same deploy via --secrets-file, so new code never runs
# against old secrets. --secrets-file only adds and updates; deleting a stale
# managed secret is left to `sync-secrets.sh --prune`, which CI runs after this.
# Secrets not passed are inherited from the previous deployment.
#
# PUBLIC_* variables are excluded: those are build-time (baked into the static
# output via .env / import.meta.env), not runtime Worker vars. CLOUDFLARE_* and
# GITHUB_TOKEN are workflow infrastructure, never app config.
#
# Any variable whose name collides with a secret is dropped. Verified live:
# `wrangler deploy --var NAME:x` silently overwrites — destroys — an existing
# secret named NAME with a plaintext var. No error, no warning. Secrets always
# win; a colliding variable is a leftover/mistake in GitHub, not intent.
#
# Env:
#   VARS_CONTEXT    — ${{ toJSON(vars) }} (JSON object of all GitHub Variables)
#   SECRETS_CONTEXT — ${{ toJSON(secrets) }} (builds the collision exclusion
#                     list above, and supplies the managed secrets' values)
#   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
# Optional:
#   WRANGLER_BIN       — wrangler invocation (default: "pnpm exec wrangler")
#   ALLOW_LOCAL_DEPLOY — set to 1 to run outside GitHub Actions (emergencies only)
#
# Extra args ("$@") are forwarded to `wrangler deploy`.

# CI only. A local run has no VARS_CONTEXT, and wrangler drops every var not
# passed on deploy (keep_vars is false), so it would silently strip the
# CONTACT_* vars and break the contact form. Deploy with the GitHub workflows;
# to undo a bad deploy, use `wrangler rollback`. ALLOW_LOCAL_DEPLOY=1 overrides
# this for a real emergency, with VARS_CONTEXT/SECRETS_CONTEXT set by hand.
if [ "${GITHUB_ACTIONS:-}" != "true" ] && [ "${ALLOW_LOCAL_DEPLOY:-}" != "1" ]; then
  echo "ERROR: deploy.sh only runs in GitHub Actions. Trigger the deploy workflow instead," >&2
  echo "       or roll back with 'wrangler rollback'. Set ALLOW_LOCAL_DEPLOY=1 to override." >&2
  exit 1
fi

# shellcheck source=scripts/managed-secrets.sh
source "$(dirname "${BASH_SOURCE[0]}")/managed-secrets.sh"

run_wrangler() {
  # shellcheck disable=SC2086 # WRANGLER_BIN is intentionally word-split.
  ${WRANGLER_BIN:-pnpm exec wrangler} --config dist/server/wrangler.json "$@"
}

SECRETS_JSON="${SECRETS_CONTEXT:-}"
[ -n "$SECRETS_JSON" ] || SECRETS_JSON='{}'
SECRET_NAMES=$(echo "$SECRETS_JSON" | jq -r '
  to_entries
  | map(select(.key | ascii_upcase | (startswith("CLOUDFLARE_") or . == "GITHUB_TOKEN") | not))
  | map(select(.value | length > 0))
  | .[].key
')

VAR_ARGS=()
if [ -n "${VARS_CONTEXT:-}" ]; then
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    key="${line%%:*}"
    if [ -n "$SECRET_NAMES" ] && echo "$SECRET_NAMES" | grep -qx "$key"; then
      echo "WARNING: skipping GitHub Variable '$key' — a secret with the same name exists. A --var deploy would silently overwrite (destroy) it; secrets always take precedence. Rename one of them in GitHub." >&2
      continue
    fi
    VAR_ARGS+=("--var" "$line")
  done < <(echo "$VARS_CONTEXT" | jq -r '
    to_entries[]
    | select(.key | ascii_upcase | (startswith("CLOUDFLARE_") or . == "GITHUB_TOKEN" or startswith("PUBLIC_")) | not)
    # --var uses KEY:VALUE and the deploy command is one shell line, so skip
    # multi-line values (none expected for runtime config like email addresses).
    | select(.value | type == "string" and length > 0 and (contains("\n") | not))
    | "\(.key):\(.value)"
  ')
fi

if [ "${#VAR_ARGS[@]}" -gt 0 ]; then
  echo "Injecting GitHub Variables as Worker vars:"
  printf '  - %s\n' "${VAR_ARGS[@]}" | grep -v -- '--var' || true
fi

# Managed secrets go in a private temp file (JSON, so no $VAR expansion),
# removed on exit. Wrangler lets process env values override file values; CI
# sets no env var named after a managed secret, so the file is what applies.
SECRET_ARGS=()
MANAGED_VALUES=$(echo "$SECRETS_JSON" | managed_secrets_from_context)
if [ "$MANAGED_VALUES" != "{}" ]; then
  SECRETS_FILE=$(umask 077 && mktemp "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/worker-secrets.XXXXXX")
  trap 'rm -f "$SECRETS_FILE"' EXIT
  printf '%s' "$MANAGED_VALUES" >"$SECRETS_FILE"
  SECRET_ARGS=(--secrets-file "$SECRETS_FILE")
  echo "Uploading managed secrets with the deploy:"
  echo "$MANAGED_VALUES" | jq -r 'keys[] | "  - \(.)"'
fi

# Empty-array expansion is unsafe under `set -u` on bash 3.x (macOS local runs).
run_wrangler deploy ${VAR_ARGS[@]+"${VAR_ARGS[@]}"} ${SECRET_ARGS[@]+"${SECRET_ARGS[@]}"} "$@"
