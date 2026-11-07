#!/usr/bin/env bash
# Shared local/CI test modes; unknown selection always keeps browser coverage.
set -euo pipefail
cd "${BASH_SOURCE[0]%/*}/.."

mode="${1:-}"
if [[ "$mode" != fast && "$mode" != changed ]]; then
  echo "usage: bash scripts/test.sh <fast|changed> [vitest arguments...]" >&2
  exit 2
fi
shift
unset SKIP_OG_BROWSER_TESTS
if [[ "$mode" == fast ]]; then
  export SKIP_OG_BROWSER_TESTS=1
elif [[ "$(node scripts/ci-selection.mjs)" == 0 ]]; then
  export SKIP_OG_BROWSER_TESTS=1
fi
exec pnpm exec vitest run "$@"
