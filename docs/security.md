# Security runbook

For private vulnerability reports, use the [security policy](../SECURITY.md).
This document contains maintained procedures. Past checks and their limitations
are preserved separately in the [2026-11-06 audit record](security-audit-2026-11-06.md);
they do not establish current repository settings or delivery of notifications.

## Vulnerability alerts and fix PRs

Dependabot may open security-fix PRs automatically. Review every PR manually;
do not enable auto-merge or automatic approval. Merge only with explicit owner
approval and passing required checks.

The weekly version-update schedule in `.github/dependabot.yml` is distinct from
vulnerability-driven security updates. Recheck current alert and security-fix
settings in GitHub rather than relying on a dated audit. Availability of one
security feature does not establish availability of another.

### Notifications

1. Open [GitHub notification settings](https://github.com/settings/notifications).
2. Enable **Email** and **On GitHub** for Dependabot alerts and confirm the
   destination is verified, monitored, and not filtered into spam.
3. Confirm delivery using a genuine alert or a supported test facility. Do not
   introduce a vulnerable dependency to trigger a notification.
4. Review repository auto-triage/dismissal rules; do not silently dismiss alerts
   merely to make checks green.

Notifications can aggregate repositories and are not a guaranteed real-time
paging service. See [GitHub's notification documentation](https://docs.github.com/en/code-security/dependabot/dependabot-alerts/configuring-notifications-for-dependabot-alerts).

### When a vulnerability appears

1. Assess severity, affected dependency path, and runtime/build exposure.
2. Review the suggested fix, release notes, lockfile changes, and CI results.
   Enabled automatic fixes do not guarantee Dependabot can produce every fix.
3. If no fix exists, assess temporary mitigation: remove or replace the
   dependency, disable the affected feature, or reduce exposure.
4. After an approved merge and deployment, verify that the alert resolves.
5. Record accepted exceptions with rationale, owner, and review/expiry date.

## Local verification

The pre-push hook runs `pnpm verify` (`scripts/verify.sh`). It stops on the first
failed check or missing required executable. The gate runs Biome CI, Astro
Doctor, typechecking, change-selected Vitest coverage, Knip, dependency-cruiser,
Gitleaks over all locally available Git history, OSV, actionlint, and production
and staging build/Worker tests. `pnpm verify:full` additionally forces all browser
tests and runs Lighthouse collect/assert, without uploading reports.

Setup on each machine:

1. Use the Node version in `.nvmrc` and pnpm version in `package.json`.
2. Run `pnpm install --frozen-lockfile`; its prepare step installs hooks. Run
   `pnpm exec simple-git-hooks` after changing hook configuration.
3. Install `gitleaks`, `osv-scanner`, and `actionlint` on PATH (on macOS:
   `brew install gitleaks osv-scanner actionlint`). Install Playwright Chromium
   with `pnpm exec playwright install chromium` for builds and browser tests.
   Lighthouse also needs Chrome/Chromium; set `CHROME_PATH` if not auto-detected.
4. Run `pnpm verify` to test setup without pushing.

The gate does not auto-fix source, install missing tools, deploy, or send mail.
It writes ignored build/test artifacts and leaves the staging build in `dist/`.
OSV requires network access; missing tools, network failures, and failed
assertions block rather than skip. Warning-level checks remain warnings.

Commit intended changes before pushing and do not edit during verification:
checks exercise the current checkout, not an isolated snapshot of every ref in
a multi-ref push. Hooks are local and bypassable; they do not cover GitHub UI
edits or other machines without setup. Linked worktrees can share hook files,
so each branch needs `pnpm verify` before using refreshed hooks. GitHub CI and
configured required branch checks remain the server-side backstop.

## Secret scanning and limitations

The staged pre-commit Gitleaks scan warns and succeeds if Gitleaks is missing;
the pre-push gate requires it. Local history scans cover available refs, not
deleted branches, logs, issues, or every possible secret format. CI scanning
happens after upload and is not push protection.

The pinned Gitleaks action's PR commit enumeration is not paginated, and earlier
dependency/OSV failures can prevent its scan. Follow-up hardening should verify
ordinary, fork, and Dependabot PRs without write tokens or deployment secrets.
Changing the missing-scanner hook to fail closed needs clean, leaking, and
missing-scanner regression tests and contributor setup instructions.

Check hosted feature availability separately. Do not buy a plan, transfer
ownership, or change visibility merely to enable a security feature.

### Responding to an exposed credential

1. Revoke or rotate it at the provider immediately; update legitimate consumers
   and review provider logs for misuse.
2. Remove it from current code and inspect PRs, artifacts, and logs. Deleting
   a file or commit does not revoke copied credentials.
3. Coordinate any history rewrite separately; never rewrite shared history
   automatically. Preserve incident evidence without retaining secret values.
4. Scope false-positive exceptions narrowly, with rationale, owner, and review
   date. Never suppress an active credential merely to pass CI.
