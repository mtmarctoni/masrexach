> Part of the [masrexach — Astro Rebuild Implementation Plan](00-overview.md).

# Phase 8: final audit / comparison

### Task 24: post-deploy smoke + Lighthouse re-run

**Files:**
- Create: none (operational; requires the Gate 3 deploy from Phase 7)

**Interfaces:**
- Consumes: `scripts/smoke.mjs`, `.lighthouserc.json`, the live `https://www.masrexach.com`
- Produces: green smoke + LHCI runs against production

- [ ] Step 1: `node scripts/smoke.mjs https://www.masrexach.com` -> exit `0`, all checks ok (health, headers, locale roots, deep route).
- [ ] Step 2: Re-run LHCI against production URLs; a11y/BP/SEO = 100, perf >= 0.95.
- [ ] Step 3: Record results in `site-comparison.md` (Task 25).

### Task 25: site-comparison.md (recreate mode)

**Files:**
- Create: `docs/plan/site-comparison.md`

**Interfaces:**
- Consumes: the old-site snapshot (`docs/plan/source-snapshot/`), the new production metrics from Task 24
- Produces: the before/after proof-of-value artifact

- [ ] Step 1: Compare old (WordPress 6.7.7 + Total theme + WPBakery + RevSlider + Contact Form 7 + Yoast; hacked with injected SEO spam; TLS certificate expired 2026-03-15) against the new build on: security (hacked content gone, valid TLS, strict CSP + security headers), performance (Lighthouse mobile, payload weight), SEO (canonical/hreflang/sitemap vs Yoast), accessibility (Lighthouse a11y + keyboard/zoom lightbox), maintainability (static Astro repo vs plugin stack).
- [ ] Step 2: Verify — the document states measured numbers from Tasks 24 and the old-site baseline (where the expired-cert site permits capture; note anything uncapturable rather than estimating).
- [ ] Step 3: Commit — `docs(plan): add old/new site comparison`
