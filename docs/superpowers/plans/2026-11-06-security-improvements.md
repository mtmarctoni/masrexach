# Security Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute only the task the owner selects; stop for review before starting the next.

**Goal:** Improve vulnerability response, supply-chain protection, and website security while keeping every merge manual.

**Architecture:** Strengthen the existing GitHub controls and Astro/Cloudflare protections rather than add overlapping tools. Each numbered task is an independently verifiable improvement; account settings require owner involvement and explicit approval.

**Tech Stack:** GitHub Dependabot, Actions, rulesets, CodeQL, OSV, Gitleaks, Astro, Cloudflare Workers, pnpm, Vitest.

**Spec:** The conversation requesting vulnerability notifications and security improvements, explicitly rejecting auto-merge, and requesting a plan to address improvements one by one. This is a backlog, not authorization to implement or change hosted settings.

## Global Constraints

- No auto-merge, automatic approvals, direct commits to main, or merging without explicit owner approval.
- Automatic fix PRs are allowed as a proposal; people review and merge them.
- Inspect current configuration first; existing protections are not presumed missing or broken.
- Verify GitHub feature availability for this repository's visibility and plan before selecting paid features. Do not enable paid services without approval.
- Never expose secret values, send real contact email, or deploy as part of routine tests.
- Keep public URLs, locales, and contact-action behavior compatible; obtain approval for externally breaking changes.
- Use feature branches and independent PRs for repository changes. Use the repository's conventional commit rules; security tooling normally uses `ci:` or `chore:`, visitor-facing corrections use `fix:`.
- Do not manually edit release-owned versions, manifest, or changelog.

## Current Evidence and Limits

- `.github/dependabot.yml` schedules npm and Actions version updates weekly; npm minor/patch grouping applies only to version updates. This file does not prove hosted security updates or notifications are enabled.
- `.github/workflows/ci.yml` already runs OSV against `pnpm-lock.yaml`, Gitleaks, lint, typechecking, tests, and production/staging Worker builds. Its inspected actions use full commit SHAs and its token has read permissions.
- `src/actions/index.ts` already validates form fields, rejects a populated honeypot, and applies a Cloudflare per-IP limiter. Missing limiter/IP currently bypasses throttling; review production assumptions rather than blindly changing local behavior.
- Earlier verification is documented in `docs/superpowers/plans/2026-10-24-security-hardening-verification.md`. Revalidate relevant protections against the current branch; historical checks are not fresh evidence.
- Hosted settings, credentials, account MFA, and live behavior have not been audited for this plan.

## Review Focus

1. A vulnerability disclosed while the repo is idle must still reach the owner (Tasks 1 and 9).
2. A fork or Dependabot PR must not gain deployment credentials or privileged workflow execution (Tasks 4 and 5).
3. Unavailable GitHub features must produce a documented alternative, not a silently missing control (Tasks 2, 5, and 6).
4. Malformed or abusive form submissions must not send email or expose internals (Task 8).
5. Browser-delivered assets and logs must not disclose server credentials; header changes must preserve the site (Tasks 7 and 8).

---

### Task 1: Vulnerability alerts and automatic fix PRs — first priority

**Files:** Create `docs/security.md` as the security runbook; inspect `.github/dependabot.yml` and `osv-scanner.toml`. Modify Dependabot configuration only if a confirmed gap requires it.

**Interfaces:** GitHub account notifications and repository security settings → prompt owner notifications and human-reviewed fix PRs.

- [x] Inventory open alerts and repository settings read-only; distinguish vulnerability alerts, security updates, and weekly version updates. 2026-11-06: alerts enabled (HTTP 204), security updates enabled and not paused, zero open alerts; evidence in `docs/security.md`.
- [x] With owner approval, enable the dependency graph, Dependabot alerts, and Dependabot security updates wherever supported and not already enabled. No enablement change needed: alert/security-update APIs confirm existing functionality; dependency-graph UI configuration was not separately inspected.
- [ ] Have the owner enable personal email notifications for new alerts, including high/critical alerts, and verify the destination email. 2026-11-06: owner confirmed Email and On GitHub are enabled; destination and actual delivery remain unverified. GitHub's documented notification behavior is recorded in `docs/security.md`.
- [x] Review alert dismissal/auto-triage rules so high/critical findings are not silently suppressed; review OSV exceptions and their expiry/rationale. 2026-11-06: owner confirmed no automatic dismissal rules; inspected OSV configuration contains no exceptions.
- [ ] Verify against an existing alert or supported notification test without intentionally introducing a vulnerable package; if delivery cannot be tested, record that limitation explicitly.
- [ ] Record evidence, exact settings, remaining limitations, and the manual merge policy in `docs/security.md`. If no fix exists, document temporary mitigation and tracking rather than promising automatic remediation.

### Task 2: Secret scanning and push protection

**Files:** Inspect `.github/workflows/ci.yml`, `scripts/pre-commit-gitleaks.sh`, and `scripts/managed-secrets.sh`; update `docs/security.md`. Change scanner configuration only for a verified gap.

**Interfaces:** Existing Gitleaks + available GitHub push protection → blocked or detected accidental credential commits.

- [ ] Verify Gitleaks covers intended PR changes and repository history, including fork/Dependabot behavior; document any gaps. 2026-11-06: source review found bounded/unpaginated PR range coverage; local all-history scan passed. Hosted fork/Dependabot verification remains pending; see `docs/security.md`.
- [ ] Check availability and obtain approval to enable GitHub secret scanning and push protection. Retain Gitleaks regardless; if unavailable, document its detective coverage and the absence of server-side blocking.
- [x] Test the local scanner against a disposable synthetic fixture outside tracked files. 2026-11-06: real hook with temporary checksum-verified Gitleaks 8.30.1 passed clean → synthetic leak blocked → clean; no remote test or real credential used.
- [x] Document bypass review, secret revocation/rotation, and why deleting a leaked file is not sufficient. Keep credential values out of evidence. Added to `docs/security.md`.

### Task 3: Require checks before every manual merge

**Files:** Inspect `.github/workflows/ci.yml`; update `docs/security.md`. Hosted target: default-branch ruleset.

**Interfaces:** Existing CI job names → required ruleset checks, with manual merging retained.

- [ ] Inspect existing rulesets, protections, bypass actors, merge methods, and actual completed check names.
- [ ] Propose an owner-approved ruleset requiring PRs and the existing CI `quality` check using its actual reported check context. Block force pushes and branch deletion; agree review requirements suitable for the number of maintainers.
- [ ] Verify release/deployment workflows remain compatible, including Release Please PRs; do not grant broad bypasses to make them work.
- [ ] Confirm a harmless failing-check PR is blocked and a passing PR is eligible for manual merge without merging it. Confirm auto-merge is not used.
- [ ] Record the final rules and any owner bypass explicitly.

### Task 4: Audit and harden all GitHub Actions workflows

**Files:** Review every file in `.github/workflows/`, `scripts/deploy.sh`, and `scripts/resolve-release.sh`; update only workflows with confirmed gaps and `docs/security.md`.

**Interfaces:** Workflow triggers, tokens, environments, and artifacts → trusted build/deploy boundary.

- [ ] Inventory action references, trigger events, token permissions, checkout behavior, artifacts, cache trust, and secrets per job. Preserve justified existing SHA pins and read-only defaults.
- [ ] Review `pull_request_target`/`workflow_run` if present; ensure untrusted PR code or artifacts cannot execute with write tokens or deployment secrets. Review preview-deploy behavior for forks and Dependabot explicitly.
- [ ] Add regression coverage for each confirmed workflow defect in `tests/deployment-config.test.ts` (using existing YAML-test patterns); observe failure before the smallest fix.
- [ ] Pin remaining third-party actions to reviewed full SHAs, scope write permissions to the jobs needing them, and disable checkout credential persistence where no later push is needed.
- [ ] Verify with `actionlint`, `pnpm test tests/deployment-config.test.ts`, and representative hosted PR runs. Untrusted PRs must still receive safe quality checks without credentials; production deploys must remain restricted to their approved release path.

### Task 5: Dependency review before merge

**Files:** Create `.github/workflows/dependency-review.yml` if supported; otherwise extend existing OSV CI only if necessary. Update `docs/security.md`.

**Interfaces:** PR dependency changes → blocking high/critical vulnerability check, independent of personal alerts.

- [ ] Verify Dependency Review availability for this repository and pnpm lockfile support. Propose high/critical as the initial blocking threshold; document how lower-severity findings are triaged.
- [ ] If supported, add a SHA-pinned dependency-review action on `pull_request`, with minimum permissions and no deployment secrets. If unavailable, document existing OSV coverage and implement a demonstrated missing check only, not a duplicate scanner.
- [ ] Verify a disposable test branch/fixture containing a known high/critical dependency is rejected, and a clean dependency update passes. Never merge the vulnerable fixture.
- [ ] After a successful hosted run, obtain approval to require the new check in the ruleset. Confirm normal, fork, and Dependabot PR behavior.

### Task 6: Code scanning for application vulnerabilities

**Files:** Prefer hosted CodeQL default setup if suitable; otherwise create `.github/workflows/codeql.yml`. Update `docs/security.md`.

**Interfaces:** Supported JavaScript/TypeScript application code → code-scanning alerts with owner triage.

- [ ] Verify CodeQL availability and language coverage for this Astro project; note that `.astro` templates and configuration may require separate manual review.
- [ ] With approval, configure default setup or a minimal SHA-pinned workflow for PRs, default-branch changes, and weekly scans; use the minimum required security-event permissions.
- [ ] Verify an initial successful analysis and inspect coverage/results. Do not enable a second conflicting CodeQL setup.
- [ ] Triage findings with file/line evidence, false-positive rationale, and owner assignment; fix confirmed findings in separate scoped tasks rather than expanding this configuration PR.

### Task 7: Account and deployment credential protection

**Files:** Inspect `scripts/sync-secrets.sh`, `scripts/managed-secrets.sh`, and deployment workflows; update `docs/security.md`. Account changes are owner-operated.

**Interfaces:** GitHub/Cloudflare/email-provider identities and tokens → least-privilege deployment and recoverable account access.

- [ ] Have the owner verify MFA/passkeys for GitHub, Cloudflare, and the email provider, recovery methods, active sessions, and authorized integrations without sharing codes or keys.
- [ ] Inventory token names, consumers, scopes, expiration, environment bindings, and last use—not values. Confirm repository/environment access matches the deployment workflow.
- [ ] Propose removal of unused credentials and least-privilege replacements; rotate only with explicit approval and a rollback/recovery procedure that preserves deployment access.
- [ ] Validate replacements in staging before production, revoke old credentials after success, and record rotation dates and ownership only. Document any provider constraint that prevents narrower scopes.

### Task 8: Verify website protections and fix confirmed gaps

**Files:** Inspect `src/actions/index.ts`, `src/lib/email.ts`, `src/components/ContactForm.astro`, `src/scripts/contact-form.ts`, `astro.config.mjs`, and `wrangler.jsonc`. Extend `scripts/test-worker.mjs`, `scripts/smoke.mjs`, and `tests/email.test.ts` where needed; update `docs/security.md`.

**Interfaces:** `/_actions/sendContact`, browser output, and response headers → validated submissions, bounded abuse, and no server-secret disclosure.

- [ ] Re-run existing security tests before proposing changes. Inspect generated header configuration and the existing CSP rather than adding competing rules.
- [ ] Add failing regression cases for confirmed gaps: malformed/overlong fields, populated honeypot, email-content escaping, rate-limit rejection before email, independent IP buckets, and safe errors. Use stubbed email/limiter integrations; never send real mail.
- [ ] Examine missing-IP/limiter behavior in production versus local development and preservation of Astro origin checks. Propose any behavior change explicitly before implementation.
- [ ] Assess spam evidence and confirmation-email abuse. Add Turnstile only if justified and separately approved; it would require server-side verification, accessible failure handling, and its own scoped implementation task.
- [ ] Inspect built public assets/source maps for server-only environment imports or secret exposure without printing secret values. Verify errors/logs exclude credentials and contact-message content.
- [ ] Verify CSP, framing protection, MIME sniffing protection, referrer policy, and applicable HTTPS/HSTS behavior against production, staging, and error responses. Stage any stricter CSP first and confirm scripts, fonts, images, and the contact form still work; do not enable HSTS preload casually.
- [ ] Run `pnpm test`, `pnpm check`, and `pnpm build && pnpm test:worker`, then repeat the staging build/Worker checks with CI's staging environment. Execute hosted smoke verification only after approved deployment.
- [ ] Split confirmed changes into independently reviewable fixes; preserve valid submissions and localized error behavior.

### Task 9: Ongoing response and maintenance

**Files:** Complete `docs/security.md`; create `.github/workflows/security-scan.yml` only if an idle-repository scanning gap remains after Tasks 1, 5, and 6.

**Interfaces:** Alerts and scan failures → owner triage, mitigation, manual update PR, verification, and closure.

- [ ] Agree response targets with the owner; proposed defaults are same-day triage for critical alerts and next-working-day triage for high alerts. These are response goals, not promises that a patch exists.
- [ ] Document the response checklist: assess runtime/build exposure and exploitability, identify patch or mitigation, review fix PR, run checks, manually merge/deploy with approval, then verify closure.
- [ ] If OSV still runs only on code changes, propose a daily scheduled scan plus manual dispatch using the same lockfile/config, full SHA pins, and read-only permissions. Keep Dependabot alerts as the primary notification path.
- [ ] Verify a manual scan run and its failure notification path. Scheduled Actions can be delayed or disabled; do not describe them as real-time monitoring or silently swallow scan failures.
- [ ] Record owner, notification destination category (not private addresses), monthly review of outstanding alerts/exceptions, and quarterly access/token review. Link this plan from the runbook and mark completed tasks with dated evidence.

## Execution and Completion Gate

- [ ] Owner selects and approves the next task before implementation; start with Task 1.
- [ ] Before closing each task, record what changed, verification output or hosted evidence, availability limitations, and any manual owner step still outstanding.
- [ ] For repository changes, review the diff for unintended changes and secret disclosure, run relevant checks, and propose a scoped conventional commit/PR. No commit, push, deploy, or merge is authorized by this plan alone.
- [ ] Do not mark all security work complete merely because tools are enabled; retain unresolved findings and unverified notification paths as explicit follow-ups.
