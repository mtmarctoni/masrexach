#!/usr/bin/env bash
# Full local pre-push gate. Never formats source, deploys, or uploads reports.
set -euo pipefail

cd "${BASH_SOURCE[0]%/*}/.."

for tool in pnpm node git gitleaks osv-scanner actionlint; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing required tool: $tool. See docs/security.md for setup." >&2
    exit 1
  fi
done

# Do not inherit a staging/preview build selection from the caller's shell.
unset CLOUDFLARE_ENV PUBLIC_BUILD_TYPE PUBLIC_BASE_URL

run() {
  printf '\nChecking: %s\n' "$*"
  "$@"
}

run pnpm exec biome ci .
run pnpm astro:doctor
run pnpm check
run pnpm test
run pnpm knip
run pnpm depcruise
run gitleaks git --redact --no-banner --log-opts=--all
run pnpm osv
run actionlint

export PUBLIC_BUILD_TYPE=Production
export PUBLIC_BASE_URL=https://masrexach.com
run pnpm build
run pnpm test:worker
# Deliberately avoid `lhci autorun`: it includes a public report upload.
run pnpm exec lhci collect
run pnpm exec lhci assert

export CLOUDFLARE_ENV=staging
export PUBLIC_BUILD_TYPE=Staging
export PUBLIC_BASE_URL=https://masrexach-staging.marctonimas.com
run pnpm build
run pnpm test:worker

printf '\nAll pre-push checks passed.\n'
