# Reduce CI Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce routine Actions minutes and pre-push latency without deleting tests or weakening critical checks.

**Architecture:** Keep a fast default verification path and an explicit full path. Select browser-based social-card tests using changed inputs, filter optional workflows by relevant paths, and provide manual full Lighthouse execution.

**Tech Stack:** GitHub Actions, Bash, pnpm, Vitest, Playwright, Lighthouse CI.

**Spec:** User-approved proposal in this conversation: selective Lighthouse and preview execution, selective browser social-card tests, retain cheap output checks and critical quality/security/Worker checks, expose `pnpm verify:full`.

## Global Constraints

- Retain every existing test; do not change visitor-facing output.
- Preserve mobile Slow 4G Lighthouse settings.
- Keep lint, typecheck, non-browser unit tests, secret scanning and Worker integration checks in the default gate.
- Chromium remains required for builds that generate social images.
- Never modify release-owned versions or changelogs; do not commit or push without approval.
- Keep the required CI quality job present even when optional checks are skipped.

## Review Focus

- Missing comparison refs or first pushes must conservatively enable browser tests.
- Renamed/deleted renderer inputs must enable browser tests.
- Font, image, translation, artwork-data and dependency changes must enable browser tests.
- Documentation-only PRs must skip optional preview/Lighthouse work without blocking required CI.
- Manual/full execution must retain all browser cases and all five Lighthouse URLs.

---

### Task 1: Select social-card browser tests safely

**Files:** `tests/og-render.test.ts`, a focused new browser test file under `tests/`, a new change-selection helper under `scripts/`, regression tests under `tests/`, `.github/workflows/ci.yml`.

**Interfaces:** The selector returns whether browser coverage is needed from changed paths; ambiguous Git comparisons require full coverage. Ordinary `pnpm test` continues to run every test unless explicitly told to skip browser cases by the selective gate.

- [ ] Write failing selector tests for unrelated documentation, renderer/template changes, fonts/images, artwork data, translations, dependency/config changes, renames/deletions and unknown comparison state.
- [ ] Run the focused tests and confirm failure before implementation.
- [ ] Separate only the two browser-dependent cases from `og-render.test.ts`, retaining hashing, missing-input and escaping tests in the default suite.
- [ ] Implement conservative change detection using PR base in CI and a documented merge-base comparison locally; fail open to full coverage if unavailable. Include helper/test/workflow changes among relevant inputs.
- [ ] Wire CI to skip only browser cases on unrelated changes; retain build-time rendering, `test:og`, Worker integration and security checks.
- [ ] Run focused selector tests and unit tests with browser coverage both enabled and disabled; confirm only the browser cases differ.

### Task 2: Fast pre-push and explicit full verification

**Files:** `scripts/verify.sh`, `package.json`, regression tests under `tests/`, existing developer documentation.

**Interfaces:** `pnpm verify` runs the current quality/security/build/Worker checks without Lighthouse and with selective browser tests. `pnpm verify:full` forces browser tests and runs the existing five-URL Lighthouse collect/assert checks without uploading reports.

- [ ] Write failing regression tests asserting command selection for default/full modes and conservative browser selection.
- [ ] Run the regression tests and confirm failure.
- [ ] Add explicit full-mode argument handling and the `verify:full` package script. Keep both production and staging builds and Worker checks. Reject unsupported arguments rather than silently choosing a weaker mode.
- [ ] Document the fast/full distinction and how to force full coverage before high-risk changes.
- [ ] Run regression tests, shell syntax checks and the available full local verification; report any missing tooling or other blockers explicitly.

### Task 3: Select optional Actions workflows

**Files:** `.github/workflows/lighthouse.yml`, `.github/workflows/deploy-preview.yml`, Lighthouse configuration (existing and a new focused routine configuration), workflow regression tests and existing developer documentation.

**Interfaces:** Routine Lighthouse uses homepage, catalogue and artwork URLs; manual full Lighthouse uses the existing five URLs. Preview runs only for deploy-relevant changes while preserving current draft/actor restrictions.

- [ ] Write failing workflow/config tests covering relevant source/assets/public/config/lockfile/build-script changes, documentation-only exclusions, preview event types, manual Lighthouse execution and unchanged Slow 4G settings.
- [ ] Run tests and confirm failure.
- [ ] Add conservative workflow path filters and `workflow_dispatch` for full Lighthouse runs. Keep the existing five-URL configuration for full/local verification; derive routine configuration with three representative URLs and identical audit settings/assertions.
- [ ] Preserve preview permissions, environment, concurrency and upload behavior. Include workflow/config changes themselves in their respective filters.
- [ ] Run workflow/config tests, `actionlint`, Biome and unit tests. Inspect the final diff for accidental changes to deployment behavior or required checks.
- [ ] Record expected savings as estimates from observed timings, not measured post-change results; actual Actions savings require subsequent runs.

## Execution and completion

- [ ] Review plan coverage against the approved proposal.
- [ ] Execute tasks in order in the existing clean `perf/reduce-ci-time` worktree.
- [ ] Review the complete diff and verification evidence before claiming completion.
- [ ] Summarize changed defaults, retained coverage and verification limitations. Do not commit, push or open a PR automatically.
