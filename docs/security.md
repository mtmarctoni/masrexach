# Security runbook

## Vulnerability alerts and fix PRs

Policy: Dependabot may open security-fix PRs automatically. Review and merge
every PR manually; do not enable auto-merge or automatic approval.

### Verified repository state — 2026-11-06

Read-only GitHub API checks for `mtmarctoni/masrexach` confirmed:

| Control                    | Evidence                                                                              | Result                           |
| -------------------------- | ------------------------------------------------------------------------------------- | -------------------------------- |
| Dependabot alerts          | `GET /repos/mtmarctoni/masrexach/vulnerability-alerts`                                | HTTP 204: enabled                |
| Automatic security-fix PRs | `GET /repos/mtmarctoni/masrexach/automated-security-fixes`                            | `enabled: true`, `paused: false` |
| Open Dependabot alerts     | Paginated `GET /repos/mtmarctoni/masrexach/dependabot/alerts?state=open&per_page=100` | No open alerts                   |
| OSV exceptions             | `osv-scanner.toml`                                                                    | No exceptions configured         |

The repository is private. These checks demonstrate that the two Dependabot
features above are available here; they do not establish availability of other
GitHub security products. No hosted settings were changed.

`.github/dependabot.yml` schedules npm and GitHub Actions version updates
weekly. This schedule is distinct from vulnerability-driven security updates;
the npm minor/patch group applies to version updates only. No configuration
change is needed merely to enable the already-active security updates.

### Owner action: confirm personal notifications

1. Open [GitHub notification settings](https://github.com/settings/notifications).
2. Find **Dependabot alerts** and enable **Email** and **On GitHub**.
   GitHub documents these notifications for newly discovered high/critical
   vulnerabilities. Do not rely on the daily/weekly digest alone.
3. Confirm the selected email destination is verified and actively monitored;
   check spam rules. Optionally enable the digest for broader follow-up.
4. For additional urgency, configure a mail rule using GitHub's
   `X-GitHub-Severity` header. Check the actual header before defining the rule;
   never let it discard other security messages.
5. Confirm receipt of the next genuine alert and record the date below.
   Do not introduce a vulnerable dependency just to generate a notification.

Reference: [GitHub's Dependabot notification documentation](https://docs.github.com/en/code-security/dependabot/dependabot-alerts/configuring-notifications-for-dependabot-alerts).
GitHub notes that new-vulnerability notifications may aggregate repositories
and are not sent merely because an existing vulnerability is updated. This
is not a guaranteed real-time paging service.

### Remaining verification

- [x] Owner confirms Email and On GitHub preferences (2026-11-06).
- [ ] Owner verifies the destination email is monitored; actual alert delivery
  remains untested.
- [x] Review repository alert auto-triage/dismissal rules in
  [repository security settings](https://github.com/mtmarctoni/masrexach/settings/security_analysis).
  Owner confirmed no auto-triage rules automatically dismiss alerts
  (2026-11-06); this is owner-confirmed, not API-verified.
- [ ] Confirm actual notification delivery using a genuine alert or a supported
  test facility if available. No delivery test was performed; no open alert is
  currently available for this purpose.

### When a vulnerability appears

1. Open [Dependabot alerts](https://github.com/mtmarctoni/masrexach/security/dependabot)
   and assess severity, affected dependency path, and runtime/build exposure.
2. Review the suggested fix PR, release notes, lockfile changes, and CI results.
   An enabled setting does not guarantee Dependabot can produce every fix.
3. If no patched version or automatic PR exists, track the finding and assess
   temporary mitigation: remove/replace the dependency, disable the affected
   feature, or reduce exposure. Do not dismiss merely to make checks green.
4. Manually merge only after review and passing required checks, then verify
   the approved deployment and that GitHub resolves the alert.
5. Record any accepted exception with rationale, owner, and review/expiry date.

## Secret scanning and push protection

### Verified state — 2026-11-06

- GitHub's secret-scanning API returned HTTP 404 with the explicit message
  `Secret scanning is disabled on this repository.` This does not mean there
  are no exposed secrets.
- The repository is private and owned by a personal account. GitHub documents
  private-repository Secret Protection for eligible organization/enterprise
  configurations, not ordinary personal private repositories. No paid feature,
  ownership transfer, or hosted setting was enabled. Repository-level GitHub
  push protection has not been established as available here.
- `scripts/pre-commit-gitleaks.sh` scans staged changes, but deliberately exits
  successfully with a warning if Gitleaks is absent. Gitleaks was initially
  absent; the owner subsequently approved installation. Homebrew installed
  Gitleaks 8.30.1, verified on PATH, and a fresh all-history scan passed
  (127 commits, no findings). The frozen dependency install refreshed hooks.
- CI uses a full-SHA-pinned Gitleaks action with read-only token permissions
  and full checkout history. It runs on PRs and pushes to `main`, not every
  feature-branch push. Detection occurs after upload, not before it.
- Source inspection of the pinned action shows PR scans cover a selected
  commit range, not all history. Its PR-commit API request is not paginated,
  so long PRs can have incomplete coverage; first-parent/non-merge traversal
  also differs from an all-history scan. No hosted fork or Dependabot test was
  performed; both use the same `pull_request` trigger and require read access
  to PR commits. Comment writing is not permitted by the configured token;
  the action catches comment-write failures without treating a leak as clean.
- The action's default scanner binary is 8.24.3, distinct from the 8.30.1
  temporary binary tested below. Its installation happens after dependency
  installation and OSV scanning, so earlier failures prevent this scan.

### Safe local verification

Downloaded Gitleaks 8.30.1 into the approved temporary directory and verified
the archive SHA-256 against the upstream release checksum file. This checks
download integrity, not independent publisher authenticity. No global software
was installed and the real repository index was not modified.

Executed the actual pre-commit script against a disposable Git repository:

| Input                                                                   | Result                |
| ----------------------------------------------------------------------- | --------------------- |
| Clean staged file                                                       | Exit 0                |
| Synthetic GitHub-token-shaped value                                     | Exit 1: blocked       |
| Clean staged replacement                                                | Exit 0                |
| All locally available history, `gitleaks git --log-opts=--all --redact` | Exit 0; zero findings |

The synthetic value is not a real credential and was never pushed. The history
result covers locally available refs only, not all remote/deleted branches,
issues, logs, or unknown secret formats. It is not proof that no secret has
ever leaked.

### Remaining actions

- [x] Install Gitleaks locally (`brew install gitleaks`) and verify it on PATH.
  Installed 8.30.1 with owner approval on 2026-11-06. GUI clients or other
  environments with a different PATH must also be able to find the binary.
- [ ] Decide whether the missing-scanner hook should fail closed instead of
  warning. Any change needs regression tests for clean, leaking, and missing-
  scanner cases and a documented setup path for contributors.
- [ ] Harden CI scanning in a scoped follow-up: avoid incomplete PR commit
  enumeration, select an explicit scanner version, and ensure independent
  secret checks run even if dependency installation/OSV fails. Verify normal,
  fork, and Dependabot PRs without granting write tokens or deployment secrets.
- [ ] Revisit hosted push protection only if GitHub shows an eligible option;
  do not buy a plan, transfer ownership, or make this repository public merely
  to enable it without explicit approval.

### Responding to an exposed credential

1. Revoke/rotate the credential at its provider immediately, update legitimate
   consumers safely, and review provider access logs for misuse.
2. Remove it from current code and inspect PRs, artifacts, and logs. Deleting
   the file or commit alone does not revoke a copied credential.
3. Coordinate any history rewrite separately; never rewrite shared history
   automatically. Preserve incident evidence without retaining secret values.
4. Treat bypasses and scanner allowlists as reviewed exceptions: document why
   a match is false, narrowly scope it, and assign an owner/review date. Never
   suppress an active credential merely to pass CI.

Reference: [GitHub secret-scanning availability](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning).

## Local verification before publication — 2026-11-06

### Automatic checks before every push

The pre-push hook runs `pnpm verify` (`scripts/verify.sh`). It stops the push
on the first failed check or missing required executable. The gate runs Biome
CI, Astro Doctor, typechecking, Vitest, Knip, dependency-cruiser, Gitleaks over
all locally available Git history, OSV, actionlint, production build/Worker
tests, Lighthouse collect/assert, and staging build/Worker tests.

Setup on each machine:

1. Use the Node version in `.nvmrc` and pnpm version in `package.json`.
2. Install dependencies with `pnpm install --frozen-lockfile`; its prepare
   step installs hooks. After changing hook configuration in an existing
   checkout, run `pnpm exec simple-git-hooks` to refresh them.
3. Install `gitleaks`, `osv-scanner`, and `actionlint` on PATH (on macOS:
   `brew install gitleaks osv-scanner actionlint`). Lighthouse also needs a
   working Chrome/Chromium installation; use `CHROME_PATH` if not auto-detected.
4. Run `pnpm verify` to test setup without pushing.

The gate does not auto-format/fix source, install missing tools, deploy, send
mail, or upload Lighthouse reports. It writes normal ignored build/test
artifacts and leaves the staging build in `dist/`. OSV requires network access;
missing tools, network failures, or failed assertions block rather than skip.
Existing warning-level checks remain warnings, not blocking errors.

Commit intended changes before pushing and avoid editing while verification
runs: checks exercise the current checkout, not an isolated snapshot of every
ref supplied to an arbitrary multi-ref push. Gitleaks scans local history;
other checks validate the current worktree. Hooks are local and bypassable,
and don't cover GitHub UI edits or other machines without setup. GitHub CI and
required branch checks remain the server-side backstop. Linked worktrees may
share hook files, so each checked-out branch needs the `pnpm verify` command
before using the refreshed shared hook.

### Verification evidence

- Homebrew Gitleaks 8.30.1 installed and verified on PATH.
- Frozen dependency installation passed. A missing local `@emnapi/runtime`
  link initially prevented `@astrojs/check` from loading; a forced frozen
  reinstall with optimistic repeat installation disabled repaired it without
  changing dependencies or the lockfile. Real Astro checking then passed
  across 41 files with zero diagnostics.
- Biome CI passed after formatting this new document. Its existing schema
  version mismatch remains an informational notice, not a failed check.
- Vitest: 114 tests passed across nine files. Knip and dependency-cruiser
  passed; Knip reports an existing unused `cloudflare` ignore entry.
- Astro Doctor: no errors, three homepage warnings (two `set:html`, one image).
- OSV: 917 packages scanned, no issues. Actionlint passed. Gitleaks scanned
  127 commits with no findings.
- Production and staging builds and local built-Worker integration passed.
  Production harness smoke assertions passed all seven checks; an existing
  stale-build warning was nonfatal. These are local harness results, not proof
  of a new live deployment.
- Lighthouse collection and assertions passed across five URLs. Ran collect
  and assert only, deliberately skipping the configured public report upload.
- A repeat synthetic-fixture test using the globally installed binary was
  blocked by the safety layer and not retried. The earlier temporary-binary
  fixture test remains the synthetic-test evidence; the installed binary's
  history scan succeeded.
- No commit, push, deployment, account change, or auto-merge was performed.

Further improvements are tracked in the
[security improvement plan](superpowers/plans/2026-11-06-security-improvements.md).
