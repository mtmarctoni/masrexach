# CI verification

`pnpm verify` is the pre-push gate: lint, Astro Doctor, types, unit tests,
dependency rules, secrets, vulnerabilities, workflow linting, and production
and staging builds with Worker integration checks. It does not run Lighthouse.

Browser-dependent social-card tests run when renderer inputs change relative
to `origin/main` (including local changes), or when the comparison is unavailable.
Set `CI_BASE_REF` to use another comparison ref. CI compares against the PR base
or the previous main commit. Plain `pnpm test` still runs all browser cases.
Builds always render social images with Chromium; built-card checks in CI remain.

Test commands:

- `pnpm test`: full suite, including browser cases.
- `pnpm test:fast`: always skip the two browser-dependent social-card cases.
- `pnpm test:changed`: choose browser coverage from changed inputs; shared by CI
  and the default pre-push gate. Missing comparisons retain full coverage.

Both named modes clear inherited browser-skip flags and accept Vitest arguments,
for example `pnpm test:fast tests/og-render.test.ts`.

Run `pnpm verify:full` before high-risk layout, image, SEO or deployment changes:
it forces all browser tests and audits all five Lighthouse URLs, without uploading
reports. Install Playwright Chromium and the security/workflow tools first as
described in the existing security documentation.

Optional preview and Lighthouse workflows skip documentation-only changes.
Routine Lighthouse audits three representative layouts. Use the Lighthouse
workflow's **Run workflow** action for the full five-URL audit. Both use identical
mobile Slow 4G settings and assertions. If Lighthouse is currently a required
branch-protection check, make it optional before relying on path filtering:
GitHub leaves filtered required workflows pending.

Observed baseline medians: Lighthouse 157 seconds, preview 90 seconds. Skipping
both avoids roughly four runner-minutes per documentation-only update; this is
an estimate, not a post-change measurement. Browser test selection saves only a
small part of the roughly eight-second unit suite; it does not avoid Chromium
installation, which builds still require.
