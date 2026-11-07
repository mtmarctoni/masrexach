# Artwork Detail Image Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This document is a proposal: do not implement, commit, or push until the user approves the plan and the relevant operations.

**Goal:** Reduce unnecessary image downloads and improve mobile artwork-detail LCP without changing artwork quality, layout, or search metadata.

**Architecture:** Keep the existing Astro `getImage()` pipeline and its default image URL. Generate responsive alternatives and expose them through the existing `<img>`; the browser selects a suitable variant. Verify every artwork and language at build-output level, then compare representative pages under repeated Slow 4G measurements.

**Tech Stack:** Astro 7, TypeScript, Sharp, Vitest, Playwright, Lighthouse CI, pnpm.

**Spec:** The scope and acceptance criteria below capture the user's request following the image-delivery audit. Layout background: [image-performance.md](../../image-performance.md).

## Scope and acceptance criteria

- Implement responsive delivery for all 25 artwork detail pages in Spanish, Catalan, and English through their shared template.
- Keep WebP quality at 80. Do not introduce AVIF, change fonts, preload additional resources, or alter layout in this pass.
- Preserve the existing default image URL used by `VisualArtwork.image`; social-sharing cards remain separate and unchanged.
- Do not upscale originals. Keep the existing 960px maximum for detail-image variants.
- Success means fewer downloaded image bytes on oversized examples, with no repeatable LCP regression or new layout shift. A perfect score or removal of all compression warnings is not required.
- Leave the biography portrait unchanged: the audit found 100 performance and zero estimated image savings. Revisit only if a later measurement identifies a meaningful benefit.
- Previously optimized homepage and catalogue images are regression checks, not another redesign target.

## Evidence to recheck before implementation

The local production-build audit used three simulated Slow 4G mobile runs per page:

| Page                            | Performance | LCP      | Downloaded artwork        | Lighthouse finding                                                         |
| ------------------------------- | ----------- | -------- | ------------------------- | -------------------------------------------------------------------------- |
| `/catalogo/01-tiestos/`         | 97–98       | 2.4–2.6s | 123,002 bytes, 800px wide | Oversized; combined sizing/compression estimate includes 450ms LCP savings |
| `/catalogo/06-tronco-olivera/`  | 96          | 2.7–2.9s | 194,008 bytes, 960px wide | Oversized; combined estimate includes 750ms LCP savings                    |
| `/catalogo/14-granja-esporlas/` | 98–99       | 2.3–2.4s | 93,780 bytes, 460px wide  | No image-delivery savings flagged                                          |
| `/biografia/`                   | 100         | 1.8s     | Small portrait            | No image-delivery savings flagged                                          |

These are local lab results, not production CDN measurements or guaranteed savings. All audited runs had zero CLS. Smaller originals may already be appropriate on high-density displays.

## Global constraints

- Use mobile Slow 4G for every Lighthouse run: simulated 150ms RTT, 1638.4 Kbps throughput, 4× CPU slowdown; preserve the adjusted network-emulation values in `.lighthouserc.json`.
- Run at least three sequential measurements per page/variant under comparable machine load. Compare medians and ranges, not a single favorable result.
- Follow `AGENTS.md` for browser work and consult the project-local Playwright instructions. If unavailable, stop browser work and ask rather than substitute a browser tool.
- Do not modify release-owned files, public URLs, image originals, translations, or contact/API behavior.
- Use a feature branch. No automatic commits, pushes, PR updates, or merges; obtain the user's approval for those operations.
- Allow `pnpm verify` and push hooks to finish; do not bypass hooks or add a short timeout.

## Review focus

1. Tiny originals: generated variants must not exceed original width or repeat identical descriptors.
2. High-density displays: the browser must retain access to the existing largest variant, not be forced to a mobile-only source.
3. Tall and wide paintings: preserve aspect ratios, natural height, eager loading, and high priority without cropping.
4. Metadata: JSON-LD must reference the stable default artwork image, not a small selected variant or social card.
5. Locale/fallback behavior: every translated route must receive responsive markup; missing-image fallback and existing alt text remain intact.

---

## File map

| File                                          | Responsibility                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/pages/[...locale]/catalogo/[slug].astro` | Generate detail-image alternatives; emit `srcset` and layout-accurate `sizes`       |
| `tests/artwork-image-output.test.ts` (new)    | Opt-in checks against the built output for all 75 detail routes and generated files |
| `scripts/verify.sh`                           | Run image-output checks after the production build                                  |
| `.lighthouserc.json`                          | Include the larger artwork examples in the performance gate                         |
| `docs/image-performance.md`                   | Document detail-page geometry, variant limits, and measured outcome                 |

No new runtime dependency, shared image component, or expansion of `thumbnailOptions()` is necessary: detail images are not thumbnails and use a different layout.

### Task 1: Capture a reproducible baseline

**Files:** No product changes. Save raw reports outside the repository in the session scratch directory.

**Interfaces:** Consumes the current production build and existing Lighthouse settings; produces a before/after comparison keyed by URL, viewport, pixel density, and Lighthouse version.

- [ ] Record the branch SHA and working-tree status; preserve unfamiliar changes. Inspect original image dimensions and current generated default URLs before modifying the template.
- [ ] Build with `PUBLIC_BUILD_TYPE=Production PUBLIC_BASE_URL=https://masrexach.com pnpm build`; serve `dist/client` locally using a dedicated port.
- [ ] Collect three sequential Slow 4G mobile Lighthouse reports each for Tiestos, Tronco olivera, Granja Esporlas, Albufera detail, biography, homepage, and catalogue. Keep the complete reports and record the Lighthouse version and pixel density.
- [ ] Record image resource bytes, selected image URL, actual LCP element, LCP, FCP, CLS, score, and image-delivery suggestions. Do not equate combined compression/sizing estimates with guaranteed responsive-only savings.

### Task 2: Add responsive detail images with regression coverage

**Files:** Modify `src/pages/[...locale]/catalogo/[slug].astro`; create `tests/artwork-image-output.test.ts`.

**Interfaces:** Keep `image: GetImageResult | undefined`, `image.src`, intrinsic width/height attributes, and schema construction unchanged. Add responsive candidates through `getImage({ widths, ...existingOptions })`; render `image.srcSet.attribute` as the `<img>`'s `srcset`.

- [ ] Write an opt-in Vitest suite enabled by `THUMBNAIL_VERIFY_BUILD=1`. For all `artworks` and prefixes `""`, `"ca/"`, `"en/"`, read the built detail HTML and assert that the artwork `<img>` has nonempty `srcset`/`sizes`, existing localized alt text, `loading="eager"`, `fetchpriority="high"`, and positive intrinsic width/height.
- [ ] Parse each `srcset`: descriptors must be unique, include the largest existing variant `min(originalWidth, 960)`, and never exceed that bound. Resolve each candidate to a real built WebP and use Sharp metadata to verify descriptor width and aspect ratio (allow 1px rounding). For Tiestos and Tronco, require at least one candidate no wider than 400px.
- [ ] For production output, assert `VisualArtwork.image` equals the absolute default `<img src>` URL and resolves to the largest existing variant. Keep the existing OG suite as an independent check on sharing metadata.
- [ ] Run `THUMBNAIL_VERIFY_BUILD=1 pnpm exec vitest run tests/artwork-image-output.test.ts` against the baseline build. Expect failures for missing responsive markup, not missing files or invalid test setup.
- [ ] In the shared template, pass widths `[240, 320, 400, 480, 640, 800, 960]` to `getImage`, capping each at `min(originalWidth, 960)` and removing duplicates. Keep `src`, default width `min(originalWidth, 960)`, quality 80, and WebP format unchanged. Preserve the undefined-image branch.
- [ ] Add `srcset={image.srcSet.attribute}` and `sizes="(min-width: 548px) 458px, calc(100vw - 90px)"` to the existing artwork `<img>`. Geometry: 48px shared outer padding; 500px figure maximum; 42px inner frame padding/borders. Thus the painted width is `min(V - 90, 458)` and reaches its maximum at viewport 548px.
- [ ] Rebuild production and rerun the new suite. Expect all 75 routes and candidate files to pass. Run `THUMBNAIL_VERIFY_BUILD=1 pnpm test` and `PUBLIC_BUILD_TYPE=Production pnpm test:og`; investigate failures without weakening metadata or no-upscaling checks.
- [ ] Check desktop/mobile layout and source selection using fresh browser contexts at widths 320, 390, 548, 768, and 1440px and pixel densities 1, 2, and 3. Cover Tiestos, Tronco, the wide Botellas, tall Granja Esporlas, and the 325px-wide Cipreses original. Confirm no overflow/cropping, preserved aspect ratios, and access to the largest source on high-density screens. Visually compare artwork detail, not only DOM attributes.

### Task 3: Make regressions visible in the verification gate

**Files:** Modify `scripts/verify.sh` and `.lighthouserc.json`.

**Interfaces:** Consume Task 2's opt-in suite and the existing thumbnail suite after `pnpm build`; retain the current security/build/Worker/Lighthouse checks and no-upload behavior.

- [ ] After the production `run pnpm build`, add `run env THUMBNAIL_VERIFY_BUILD=1 pnpm exec vitest run tests/thumbnail-output.test.ts tests/artwork-image-output.test.ts`. Do not run built-output tests against stale output before the build.
- [ ] Add `/catalogo/01-tiestos/` and `/catalogo/06-tronco-olivera/` to Lighthouse CI's existing localhost URL list. Preserve mobile Slow 4G settings and all existing score thresholds. Keep routine CI at one run per URL; use a temporary three-run configuration for comparisons.
- [ ] Run `pnpm exec biome check` for changed files and `pnpm verify` with no short timeout. Confirm the new output suites actually execute after the production build, both new URLs are audited, and staging verification still completes. If the local Astro checker dependency issue recurs, diagnose it and report the exact blocker; never silently skip type-checking.

### Task 4: Measure the outcome and document maintenance

**Files:** Modify `docs/image-performance.md` only after recording the results.

**Interfaces:** Compare Task 1's baseline with the same build mode, server, Lighthouse version, viewport, density, and throttling; produce a short measured report and maintenance guidance.

- [ ] Repeat Task 1's three-run measurements after implementation, sequentially with other heavy checks stopped. Also compare fresh 1× mobile source selection; label density-specific savings separately.
- [ ] Accept responsive delivery only if larger examples download fewer bytes at matching settings and show no repeatable LCP regression beyond baseline run-to-run variation. Require zero new CLS; remeasure outliers and inspect the LCP element before attributing changes. Expect tiny originals and biography to show little or no change.
- [ ] Verify homepage, catalogue, portrait, social cards, default schema image URLs, and locale routing did not regress. Do not lower compression quality to force a Lighthouse pass.
- [ ] Document the detail-page `sizes` formula, 548px transition, 458px painted-width maximum, candidate bounds, schema-URL constraint, and verification commands. Add a before/after table including bytes and median/range of LCP; distinguish local measurements from production evidence.
- [ ] Format changed Markdown with Biome and run `git diff --check`. Present the diff and measured results for approval. Suggested later commits: `perf(site): use smaller artwork detail images on mobile`, a separate CI/test-gate commit, then a documentation commit. Use the commit skill and obtain approval before creating them.

## Deferred work

- Biography responsive variants: no measured benefit in this audit.
- Stronger compression/AVIF: separate visual-quality experiment only if responsive delivery leaves a meaningful measured bottleneck.
- Font preload or CSS/JavaScript changes: outside this image-focused plan.
- Production confirmation: after an explicitly authorized deploy, repeat representative Slow 4G runs on staging/production to include CDN behavior. Local success alone is not proof of production gains.
