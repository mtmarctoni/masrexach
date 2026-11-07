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

## One-time activation

Do these in order, after this branch is reviewed. Each step is a manual,
owner-approved action.

1. **Recheck production.** `curl -s https://masrexach.com/api/health` must
   report commit `c24b7008ec2ec775c6e0d26e1fcc3f7eeababeee`. If it reports
   anything else, stop: the baseline in `release-please-config.json`
   (`bootstrap-sha`) must be reconfirmed first.
2. **Tag the baseline without deploying.** Create tag `v1.0.0` and a GitHub
   release at that commit:
   `gh release create v1.0.0 --target c24b7008ec2ec775c6e0d26e1fcc3f7eeababeee --title v1.0.0 --notes "Baseline: the site as deployed on 2026-11-06."`
   This triggers no workflow.
3. **Merge this branch** to `main`. Staging deploys. The **Release** workflow
   runs and should authenticate as the App and open the first release PR,
   listing only commits after the baseline.
4. **Check the release PR**: CI ran on it (proving App authentication), the
   version is what you expect, and the changelog starts after `v1.0.0`.
5. Merge it when you want the first versioned production deploy.

After the first release PR is merged, Release Please ignores `bootstrap-sha`.
It can be removed from `release-please-config.json` later.
