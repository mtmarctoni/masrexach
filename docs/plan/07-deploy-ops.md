> Part of the [masrexach — Astro Rebuild Implementation Plan](00-overview.md).

# Phase 7: deploy + ops

### Task 19: CI + Dependabot

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/lighthouse.yml`, `.github/dependabot.yml`

**Interfaces:**
- Consumes: package.json scripts (check/test/knip/depcruise/build), osv-scanner.toml, gitleaks
- Produces: CI (lint, typecheck, tests, knip, depcruise, build + vuln/secret scans) and weekly Dependabot updates; the Lighthouse job reusing the Core assertions

- [x] Step 1: CI job mirrors the local command set exactly; Lighthouse job builds then `npx --yes @lhci/cli@0.15.x autorun`; lychee link check runs offline against `--base ./dist/client` (non-blocking).
- [x] Step 2: Verify — every CI step's command passes locally (`pnpm exec biome ci . && pnpm check && pnpm test && pnpm knip && pnpm depcruise && pnpm build`), exit `0`.
- [x] Step 3: Commit — `ci: add quality, lighthouse workflows and dependabot`

### Task 20: smoke test + deploy script wiring

**Files:**
- Create: `scripts/smoke.mjs`
- Modify: `scripts/deploy.sh`, `scripts/sync-secrets.sh` (pass `--config dist/server/wrangler.json`), `package.json` (`smoke` script)

**Interfaces:**
- Consumes: the adapter-generated `dist/server/wrangler.json`; PATHS `"/", "/ca/", "/en/", "/exposiciones/"`
- Produces: `node scripts/smoke.mjs <baseURL> [sha]` — health (with stale-SHA retry), homepage + security headers, locale roots, deep route

- [x] Step 1: Smoke paths substitute the template token with the four quoted paths above; EXPECT_HEALTH stays on (adapter build ships the Worker).
- [x] Step 2: Deploy/secrets scripts target `dist/server/wrangler.json` (the adapter emits it at build; there is no root wrangler config).
- [x] Step 3: Verify — `node --check scripts/smoke.mjs` exit `0`; `bash -n scripts/deploy.sh scripts/sync-secrets.sh` exit `0`.
- [x] Step 4: Commit — `feat(ops): add post-deploy smoke test and wire wrangler config path`

### Task 21: deploy (MANUAL — Gate 3)

**Files:**
- Modify: none (operational)

**Interfaces:**
- Consumes: GitHub secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`), Cloudflare account for `masrexach.com` DNS
- Produces: the site live at `https://www.masrexach.com`

- [ ] Step 1: USER ACTION — resolve the placeholders in [follow-up.md](follow-up.md) (Cloudflare account, Resend domain SPF/DKIM, destination email), set GitHub secrets/variables.
- [ ] Step 2: USER ACTION — run `scripts/deploy.sh` (or wire it into a deploy workflow), point DNS at Cloudflare.
- [ ] Step 3: USER ACTION — run `scripts/sync-secrets.sh` once secrets exist.
- [ ] Step 4: Verify — `node scripts/smoke.mjs https://www.masrexach.com` exits `0` with all checks ok.

### Task 22: CI deploy workflow (optional, after first manual deploy)

- [ ] Step 1: Add a deploy job invoking `scripts/deploy.sh` on merge to `main` with the Gate 3 secrets in place.
- [ ] Step 2: Verify — merge a no-op change; smoke test green in CI.

### Task 23: LHCI in CI

- [x] Step 1: `.lighthouserc.json` assertions locked to the DoD block; Lighthouse workflow runs on PRs.
- [x] Step 2: Verify — `pnpm build && npx @lhci/cli autorun` locally exits `0` (a11y/BP/SEO errors gate; perf warns).
- [x] Step 3: Commit — covered by Task 19.
