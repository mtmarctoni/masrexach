#!/usr/bin/env bash
# Local pre-push gate; --full includes browser tests and Lighthouse.
set -euo pipefail

cd "${BASH_SOURCE[0]%/*}/.."

full=0
if [[ $# -eq 1 && "$1" == "--full" ]]; then
  full=1
elif [[ $# -ne 0 ]]; then
  echo "usage: pnpm verify [--full]" >&2
  exit 2
fi

for tool in pnpm node git gitleaks osv-scanner actionlint; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing required tool: $tool. See docs/security.md for setup." >&2
    exit 1
  fi
done

# Do not inherit a staging/preview build selection from the caller's shell.
unset CLOUDFLARE_ENV PUBLIC_BUILD_TYPE PUBLIC_BASE_URL
unset SKIP_OG_BROWSER_TESTS

run() {
  printf '\nChecking: %s\n' "$*"
  "$@"
}

run pnpm exec biome ci .
run pnpm astro:doctor
run pnpm check
if [[ "$full" == 1 ]]; then
  run pnpm test
else
  run pnpm test:changed
fi
run pnpm knip
run pnpm depcruise
run gitleaks git --redact --no-banner --log-opts=--all
run pnpm osv
run actionlint

export PUBLIC_BUILD_TYPE=Production
export PUBLIC_BASE_URL=https://masrexach.com
run pnpm build
THUMBNAIL_VERIFY_BUILD=1 run pnpm exec vitest run tests/thumbnail-output.test.ts tests/artwork-image-output.test.ts
run pnpm test:worker
# Deliberately avoid `lhci autorun`: it includes a public report upload.
if [[ "$full" == 1 ]]; then
  run pnpm exec lhci collect
  run pnpm exec lhci assert
fi

export CLOUDFLARE_ENV=staging
export PUBLIC_BUILD_TYPE=Staging
export PUBLIC_BASE_URL=https://masrexach-staging.marctonimas.com
run pnpm build
run pnpm test:worker

printf '\nAll pre-push checks passed.\n'
