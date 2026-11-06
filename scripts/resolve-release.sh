#!/usr/bin/env bash
set -euo pipefail

# Resolve a release tag to the exact commit production should deploy, and
# refuse anything that is not a published stable release on main.
#
# Inputs come only from env (never interpolated into workflow shell source):
#   RELEASE_TAG        — vMAJOR.MINOR.PATCH (required)
#   EXPECTED_SHA       — optional; the commit Release Please tagged. When set,
#                        the tag must resolve to exactly this commit.
#   GITHUB_REPOSITORY  — owner/repo (set by Actions)
#   GH_TOKEN           — token with contents:read (set by the workflow)
#   GH_BIN             — gh invocation (default "gh"; tests use a fake)
#   GITHUB_OUTPUT      — optional; receives sha=<commit>
#
# Prints sha=<40-hex commit> on success; exits 1 with a reason otherwise.
# A manual rollback validates against current main history but deploys the
# tag's commit, never main HEAD.

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

gh_api() {
  # shellcheck disable=SC2086 # GH_BIN is intentionally word-split.
  ${GH_BIN:-gh} api "$@"
}

TAG="${RELEASE_TAG:-}"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"

# Validated before any API call, so the tag is safe to use in URL paths.
if ! [[ "$TAG" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  fail "release tag '$TAG' is not a stable vMAJOR.MINOR.PATCH tag"
fi

RELEASE=$(gh_api "repos/$REPO/releases/tags/$TAG" --jq '{draft, prerelease}' 2>/dev/null) ||
  fail "no GitHub release found for tag $TAG"
if ! echo "$RELEASE" | jq -e '.draft == false and .prerelease == false' >/dev/null; then
  fail "the GitHub release for $TAG is a draft or prerelease"
fi

# commits/<ref> peels annotated tags to the commit they point at.
SHA=$(gh_api "repos/$REPO/commits/$TAG" --jq .sha) || fail "could not resolve tag $TAG to a commit"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || fail "tag $TAG did not resolve to a full commit SHA (got '$SHA')"

if [ -n "${EXPECTED_SHA:-}" ] && [ "$SHA" != "$EXPECTED_SHA" ]; then
  fail "tag $TAG points at $SHA, not the expected release commit $EXPECTED_SHA"
fi

# <sha>...main is "ahead" or "identical" only when the commit is in main's history.
STATUS=$(gh_api "repos/$REPO/compare/$SHA...main" --jq .status) || fail "could not compare $SHA with main"
case "$STATUS" in
  ahead | identical) ;;
  *) fail "release commit $SHA is not in main's history (compare status: $STATUS)" ;;
esac

echo "sha=$SHA"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "sha=$SHA" >>"$GITHUB_OUTPUT"
fi
