# Security Hardening Verification Implementation Plan

> **For agentic workers:** Use `executing-plans` to implement this plan task-by-task. Track progress with the checkboxes below.

**Goal:** Address the review findings and push PR #22 only after local CI-equivalent checks pass.

**Architecture:** Keep the existing Cloudflare rate-limit binding. Test the smoke script with controlled HTTP responses, test the health route directly, and exercise the built Worker locally without email credentials. Do not deploy or merge during verification.

**Tech Stack:** Astro, Cloudflare Workers/Wrangler, pnpm 11.17.0, Vitest, Node satisfying the project's >=22.23.4 floor.

**Spec:** The review and user's approval in this conversation: fix the sitemap smoke check, add rate-limit/health regression coverage, resolve verification blockers, then push and inspect the first GitHub run.

## Global Constraints

- Work only on `autopilot/fix-security-hardening`; never push to `main` or merge.
- Do not change PR #18 or PR #21 as part of this task.
- Do not send real email, deploy Workers, or expose credentials in tests.
- Do not read `.npmrc`: the safety layer blocked access.
- Report any checks that cannot be reproduced locally; do not claim guaranteed CI success.

## Review Focus

- Valid `https://` sitemap URLs must pass; duplicated path slashes and wrong hosts must fail.
- A stale health commit must fail smoke verification; the expected full SHA must match its seven-character response prefix.
- Rate-limited requests must return 429 before sending email.
- Different client IPs must not share a local limiter bucket.
- Astro must actually run typechecking, not silently skip after a failed checker import.

## Task 1: Smoke-test regression

**Files:** Modify `scripts/smoke.mjs`; create `tests/smoke.test.ts`.

**Interface:** Preserve `node scripts/smoke.mjs <baseURL> [expectedSHA]` and its nonzero failure exit code.
- [x] Add tests executing the real script with controlled responses: valid production sitemap succeeds; duplicate path slash and wrong host fail; short health SHA matches a full expected SHA; stale SHA fails.
- [x] Run `pnpm test tests/smoke.test.ts` and observe the valid sitemap case fail for the reported reason.
- [x] Validate the parsed URL's pathname instead of searching the entire URL for `//`.
- [x] Run the smoke tests and full suite; require no failures.

## Task 2: Health and rate-limit coverage

**Files:** Create `tests/health.test.ts` and `scripts/test-worker.mjs`; modify `package.json` and `.github/workflows/ci.yml` to run built-Worker verification after build if needed.

**Interfaces:** `/api/health` returns `{status:"ok",commit:<7-character prefix>}` with `Cache-Control: no-store` and `X-Robots-Tag: noindex`. Valid form posts to `/_actions/sendContact` reach the limiter before email configuration is checked.
- [x] Test the health response body and headers with a literal full build SHA.
- [x] Exercise the built Worker locally with no email credentials: allowed requests reach the missing-config error, excess requests return 429, and a second IP remains allowed.
- [x] Check both production and staging generated configurations retain their respective limiter bindings.
- [x] Confirm tests catch deliberate temporary mutations of limiter enforcement and health SHA truncation; restore only those temporary edits.
- [x] Run the full suite and built-Worker verification.

## Task 3: Verification and publication

**Files:** Change dependencies/configuration only if investigation proves a repository-level defect; update this checklist with verified outcomes.
- [x] Diagnose the `@astrojs/check` import failure, beginning with the missing `@emnapi/runtime` peer link; repair the local installation or make the smallest justified dependency fix.
- [x] Run frozen installation, Biome CI, real Astro typecheck, Vitest, Knip, dependency-cruiser, Astro Doctor, OSV, secret scan, workflow validation, and production/staging builds.
- [x] Run smoke verification against a local built Worker; distinguish production and staging behavior explicitly.
- [x] Review the final diff and ensure no unintended changes or credentials.
- [ ] Commit on the feature branch after presenting the commit scope for approval if required by the commit workflow.
- [ ] Push only after every required local check passes, using a lease if the existing rebased history requires a force update.
- [ ] Inspect the first GitHub run; report exact results and any remaining draft/approval requirements without merging.

## Verified before publication (2026-10-24)

- Node 22.23.4 (matching `.nvmrc`) and pnpm 11.17.0.
- Frozen install, Biome CI, Astro check (zero diagnostics), 34 unit tests, Knip, dependency-cruiser, OSV, Gitleaks, and actionlint passed.
- Production and staging builds and local built-Worker integration passed. Production's real smoke CLI passed all seven checks. Tests verify health headers, retained security headers, noindex behavior, limiter bindings, five allowed attempts, a blocked sixth attempt, and independent IP buckets.
- Deliberate temporary mutations proved that health tests reject untruncated SHAs and integration tests reject bypassed throttling. Both mutations were restored before the green runs.
- Runtime verification exposed duplicate global `_headers` rules discarding security headers. Merging those rules restored the headers; integration tests cover the result.
- Astro's static CSP uses a meta tag; smoke now accepts that or a CSP header and still rejects a page with neither.
- Lighthouse collection and assertions passed across five URLs. The catalog listing scored 0.93 for performance, below the advisory 0.95 threshold; all error-level assertions passed. Astro Doctor passed with three existing homepage warnings.
- An independent read-only whole-branch review found no critical, important, or minor issues.
- No dependency/lockfile changes were required: the checker import failure was a broken local installation, repaired with a forced frozen reinstall and optimistic repeat installation disabled.
- Live Cloudflare propagation and real email delivery were deliberately not exercised. Local verification cannot guarantee hosted CI success; the remaining publication steps are tracked above and reported in the session.
