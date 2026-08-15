> Part of the [masrexach — Astro Rebuild Implementation Plan](00-overview.md).

# Phase 6: hardening

### Task 16: security headers + CSP

**Files:**
- Create: `public/_headers`
- Modify: `astro.config.mjs` (`security.csp`)

**Interfaces:**
- Consumes: Resend API host for `connect-src`
- Produces: edge security headers (HSTS, X-Frame-Options DENY, nosniff, referrer/permissions policies, COOP/CORP) + CSP matching the app's needs

- [x] Step 1: `public/_headers` — strict CSP (`default-src 'self'`, `connect-src 'self' https://api.resend.com`, `form-action 'self'`, `frame-src 'none'`), immutable cache for `/_astro/*`, mirrored by `security.csp` in astro.config.
- [x] Step 2: Verify — `pnpm build && cat dist/client/_headers` contains the CSP; smoke test asserts `x-content-type-options` + CSP on a real page.
- [x] Step 3: Commit — `feat(security): add strict headers and CSP`

### Task 17: sitemap + robots.txt + og image

**Files:**
- Create: `public/robots.txt`, `public/og.jpg`
- Modify: `astro.config.mjs` (sitemap integration)

**Interfaces:**
- Consumes: `@astrojs/sitemap` (i18n, default es at root, filters `/api/`); an artwork source image for the OG card
- Produces: `sitemap-index.xml` + `sitemap-0.xml`, robots rules, `/og.jpg` referenced by the SEO component default

- [x] Step 1: `robots.txt` — allow all, `Disallow: /api/`, `Sitemap: https://www.masrexach.com/sitemap-index.xml`.
- [x] Step 2: `og.jpg` generated from an artwork via `sips -Z 1200` (1200px JPEG).
- [x] Step 3: Verify

  ```bash
  pnpm build && ls dist/client/robots.txt dist/client/sitemap-index.xml dist/client/og.jpg
  grep -c "/es/" dist/client/sitemap-0.xml   # -> 0
  ```

- [x] Step 4: Commit — `feat(seo): add sitemap, robots.txt and og image`

### Task 18: health endpoint + full DoD audit

**Files:**
- Create: `src/pages/api/health.ts`
- Modify: `astro.config.mjs` (`vite.define` `__BUILD_SHA__`), `src/env.d.ts` (declare the global)

**Interfaces:**
- Consumes: `__BUILD_SHA__` baked at build time from `GITHUB_SHA`
- Produces: `GET /api/health` -> 200, `Cache-Control: no-store`, `{ "status": "ok", "commit": "<sha>" }` — the stale-deploy probe used by the smoke test

- [x] Step 1: Endpoint sets `prerender = false` (the one sanctioned server route; sitemap filter already excludes `/api/`).
- [x] Step 2: Run the full DoD sweep from [00-overview.md](00-overview.md) — typecheck, tests, artifacts, server bundle, no third-party scripts, canonical=1, hreflang=4 + absolute, `<html lang>` per locale, CSS <= 17408 bytes.
- [x] Step 3: Verify — every DoD check exits clean (last audit: 0 errors / 2 tests passed / CSS 17,161 bytes / hreflang=4 on all 15 pages).
- [x] Step 4: Commit — `feat(ops): add health endpoint and pass full DoD audit`
