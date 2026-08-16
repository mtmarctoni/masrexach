#!/usr/bin/env bash
set -euo pipefail

# Local secret scan on staged files (gitleaks). CI enforces the same scan via
# gitleaks/gitleaks-action — this hook catches leaks before they reach a branch.
#
# Skipped (with a warning) when gitleaks is not installed, so the hook never
# blocks commits on machines without it; CI remains the enforcement backstop.
#
# Install: brew install gitleaks

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "WARNING: gitleaks not installed — skipping local secret scan (brew install gitleaks). CI will still enforce it." >&2
  exit 0
fi

exec gitleaks protect --staged --no-banner
