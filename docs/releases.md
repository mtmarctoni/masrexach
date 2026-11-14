# Releases

The site uses [Semantic Versioning](https://semver.org) and
[Release Please](https://github.com/googleapis/release-please). Merging a
**release PR** is how production gets deployed. Nothing else deploys production
on its own.

| Event                                           | What happens                                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| A PR is merged to `main`                        | Staging deploys (`deploy-staging.yml`). Release Please opens or updates the release PR. Production does not change. |
| The release PR is merged                        | Release Please tags `vX.Y.Z`, creates the GitHub release, and deploys exactly that commit to production.            |
| You dispatch **Deploy (production)** with a tag | That existing release is deployed again (retry or rollback).                                                        |

## How the version is chosen

Release Please reads the [Conventional Commits](https://www.conventionalcommits.org)
merged since the last release:

| Commit                                                   | Version change       | Example                                   |
| -------------------------------------------------------- | -------------------- | ----------------------------------------- |
| `fix: …`                                                 | patch, 1.0.0 → 1.0.1 | `fix(contact): trim the reply-to address` |
| `feat: …`                                                | minor, 1.0.0 → 1.1.0 | `feat(gallery): add the 2026 exhibition`  |
| `feat!: …` or a `BREAKING CHANGE:` footer                | major, 1.0.0 → 2.0.0 | `feat!: drop the /exposiciones/ URLs`     |
| `chore:`, `docs:`, `ci:`, `test:`, `refactor:`, `style:` | none on their own    | `chore(deps): bump astro`                 |

A release PR only appears once there is at least one `fix` or `feat` since the
last release. `chore`/`docs`-only changes ride along in the next release.

**Squash merges:** the squashed commit takes the PR title (or the single
commit's title), so the PR title must be a conventional commit. With merge or
rebase merges, every commit on the branch counts.

## Releasing to production

1. Merge normal PRs to `main` as usual. Each one deploys staging; check it there.
2. Open the release PR (titled like `chore(main): release 1.1.0`). Review the
   version and the `CHANGELOG.md` entry. To change what goes in, merge or
   revert PRs on `main`; the release PR updates itself.
3. Merge the release PR. That is the production approval.
4. The **Release** workflow tags the release and runs **Deploy release to
   production**, which builds that exact commit, deploys it, and smoke-tests
   `https://masrexach.com/api/health` against the release commit.

If the `production` environment gets required reviewers later, step 4 waits
for an approval in the Actions tab before deploying.

### Release PR checks

Release PRs run a lightweight **Release validation** gate instead of application
tests, builds, preview deployments, Astro Doctor, and Lighthouse. The gate checks
the actual diff: only `CHANGELOG.md`, `.release-please-manifest.json`, and the
version in `package.json` may change. Versions must match, the changelog must
include the release heading, and JSON formatting and diff whitespace must pass.
Unexpected changes fail validation; they do not silently bypass CI.

Normal PRs and pushes to `main` keep their existing checks. Production still
builds and smoke-tests the released commit. Make the CI workflow's
`release-validation / Release validation` check required in branch protection
alongside existing required checks. The expensive jobs report skipped on valid
release PRs.

Avoid merging a second release PR while a production deploy is still running.
Queued deploys are not cancelled, but GitHub keeps only one pending run per
concurrency group and does not guarantee order.

## Retrying or rolling back

Use **Actions → Deploy (production) → Run workflow**, on branch `main`, with
`release_tag` set to an existing release (for example `v1.2.0`).

- **Retry** a failed deploy: re-run the failed job, or dispatch the same tag.
  On a manual dispatch, the run deploys the tag's commit, never `main` HEAD.
- **Roll back**: dispatch an earlier tag.
- The tag must be a published, non-draft, non-prerelease `vX.Y.Z` release
  whose commit is in `main`'s history. Anything else fails before anything is
  built or deployed.
- **Fastest undo:** `wrangler rollback` (or Workers → Deployments in the
  Cloudflare dashboard) reactivates a previous Worker version without a
  rebuild.

Rollback caveats:

- Rolling back rebuilds the old code. It does not restore old Worker vars or
  secrets: the current GitHub values are deployed with it.
- The deploy tooling (`deploy.sh`, `sync-secrets.sh`, `smoke.mjs`) always comes
  from `main`, not from the old release, so old releases still get the current
  secret and var safeguards.

## Runtime configuration and public logs

`deploy.sh` forwards only `CONTACT_FROM_EMAIL` and `CONTACT_TO_EMAIL` from
GitHub Variables as runtime Worker vars. New runtime variables must be explicitly
added to its allowlist. Build-time `PUBLIC_*` values and workflow credentials are
not forwarded. Populated same-name secrets take precedence over vars.

Deployment summaries log variable names, not values. Values stay in CLI `--var`
arguments, which the pinned Wrangler version hides in its binding summary; a
local dry-run regression test checks that behavior. Do not move contact values
into committed Wrangler config or enable debug logging in deployment jobs.
Confirm the complete logs after an approved deployment before publication.
Existing logs are not sanitized retroactively: review them separately before
making the repository public.

## The release GitHub App

Release Please authenticates as a GitHub App instead of `GITHUB_TOKEN`. PRs
created with `GITHUB_TOKEN` do not trigger workflows, so the release PR would
get no CI.

| Setting                   | Where               | Value                          |
| ------------------------- | ------------------- | ------------------------------ |
| `RELEASE_APP_ID`          | Repository variable | The App's numeric ID           |
| `RELEASE_APP_PRIVATE_KEY` | Repository secret   | The App's private key (`.pem`) |

App permissions (repository): **Contents: read and write**, **Pull requests:
read and write**, **Metadata: read**. Install it on this repository only.

The workflow requests a token limited to this repository with only contents
and pull-request write access. Release Please's docs also list **Issues: read
and write**, which it uses for the `autorelease: pending` / `autorelease:
tagged` labels. If the first run fails on labels, grant the App Issues: read
and write and add `permission-issues: write` to the token step in
`.github/workflows/release-please.yml`.

The App credentials never reach the Worker: `deploy.sh` skips `RELEASE_APP_*`
variables, only the secrets in `scripts/managed-secrets.sh` are uploaded, and
the production deploy receives secrets explicitly, never `secrets: inherit`.

## Historical bootstrap

Release automation has already been activated; published releases and tags exist.
Do not recreate the baseline tag or require production to report the original
bootstrap commit. Use the normal release and rollback procedures above.

`bootstrap-sha` in `release-please-config.json` was the initial history boundary.
Release Please ignores it after the first release PR; removing it is optional
maintenance, not a prerequisite for releasing or making the repository public.
