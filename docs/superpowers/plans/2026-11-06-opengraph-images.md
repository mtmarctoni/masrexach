# Open Graph Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give shared website and painting links recognizable, readable gallery-style previews without altering the artist's work.

**Architecture:** Render static JPEG cards during the Astro build using original photographs and local fonts. A centralized card resolver supplies the same image descriptor to Open Graph and Twitter metadata. No browser-side generation or runtime image service.

**Tech Stack:** Existing Astro, TypeScript, pnpm and Vitest; proposed build-only Playwright renderer and Sharp JPEG encoder, added as explicit devDependencies after checking compatibility with the repository's supply-chain policies.

**Spec:** The approved design and implementation defaults below form the design specification for this plan. The user approved the supplied gallery-card visual direction; technical details and section mappings below are recommendations, not separately approved decisions.

## Approved Design

- Reference: the user-supplied `masrexach-social.png` (currently `/Users/mtm/Downloads/masrexach-social.png`). Use as a composition reference only, never as the source of the finished painting pixels.
- Landscape gallery card with text on the left and the original painting on the right, cream background, prominent artist name, understated brown accents and discreet domain.
- Preserve original artwork proportions and complete composition. No cropping, stretching, AI reconstruction, retouching or text over paintings.
- Reproduce the direction with the actual site fonts: Fraunces and Instrument Sans. Wrap supporting copy for thumbnail readability.

## Implementation Status (2026-11-06)

- [x] Card selection and localized copy for all 25 paintings and three languages.
- [x] Build-only Playwright/Sharp renderer with original photos, local fonts, safe fitting, content-versioned filenames and 87 generated JPEGs.
- [x] Structured OG/Twitter metadata and unchanged environment/indexing behavior.
- [x] Production, Staging and Preview build/output verification; local Worker and Playwright visual checks at full and thumbnail sizes.
- [x] Fresh read-only code review; its tall-image and accented-title fixture gaps corrected, with all four image edges and text bounds tested.
- [ ] User's final visual approval and authorized deployment/platform unfurl validation.
- [x] User authorized the four-commit plan; push and PR creation remain outside this request.

**Local setup:** `pnpm install --frozen-lockfile`, then `pnpm exec playwright install chromium` before building or running renderer tests. CI installs Chromium and its Linux system dependencies. `pnpm test:og` verifies the existing `dist/client` output; pass the same `PUBLIC_BUILD_TYPE` and `PUBLIC_BASE_URL` used for that build (defaults are Production / `https://masrexach.com`). Ordinary `pnpm test` deliberately skips built-output checks.

**Development:** restart the Astro dev server after changing source photos, fonts or localized card copy. Always rebuild and restart preview when reviewing a new output tree; preview asset lists and browser caches can otherwise retain the old hashed URLs.

**Source data note:** some supplied digital paintings are tall despite landscape dimensions in their captions (notably Granja Esporlas). Cards preserve the actual supplied photo; this branch does not reinterpret dimensions or rotate originals.

**Environment repair (resolved):** the local installation had skipped the required `@emnapi/runtime@1.11.3` and lacked its dependency links. pnpm 11's optimistic repeat-install shortcut returned early even with `--force`. Rebuilding the local installation with `pnpm install --frozen-lockfile --offline --force --config.optimisticRepeatInstall=false` restored the package and links without changing locked versions. The normal `pnpm check` now reports zero errors/warnings/hints across 43 files. This was an installation repair, not an application-code or dependency-version change.

## Implementation Defaults to Review

- Canvas: 1200 × 630 pixels; JPEG, sRGB, target at most 300 KB and hard maximum 500 KB per card.
- Colours: background `#faf7f1`, main text `#211d17`, accent `#8a5a33`.
- Layout: 60 px outer safe margin; left text area approximately 510 px wide, right image area approximately 500 × 510 px. Fit image with `object-fit: contain`; allow whitespace for extreme ratios. Fit text by measured bounds rather than truncating titles.
- Homepage: Albufera, artist name, localized existing homepage headline rendered as plain text, dates `1953 — 2017`, domain `masrexach.com`.
- Catalogue and exhibitions: the same Albufera-based identity with localized section heading. No collage in this first version.
- Biography: original existing portrait, localized section heading, artist name and dates.
- Individual paintings: the corresponding original image, complete artwork title and artist name. Do not bake price, availability or dimensions into cards.
- Contact, legal and error pages: localized homepage fallback. Their indexing policy remains unchanged.
- Generate locale-specific cards for `es`, `ca`, `en`; preserve original artwork titles. Reuse existing translated headings; strip markup from homepage headlines through an explicit text conversion, not by rendering arbitrary HTML.
- Version filenames by a content hash that includes artwork bytes, font bytes, template revision and localized copy. Serve under `/assets/og/` to match existing immutable asset caching.
- Keep `public/og.jpg` as a legacy fallback in this branch; do not delete it merely because new cards supersede it.

## Global Constraints

- No implementation until the user reviews this plan and chooses execution.
- Use pnpm; do not install globally.
- Browser inspection and visual review must use `.agents/skills/playwright-cli/SKILL.md`, never terminal-browser.
- Preserve the current Production/Staging/Preview URL and robots policy. Preview builds continue omitting absolute social-image URLs when `siteUrl` is empty.
- Original artwork only; generated reference image is not production artwork.
- Do not commit on main, push, deploy or merge without the required authorization.
- Do not modify unrelated existing work or run auto-fix commands merely to verify this feature.

## Review Focus

1. Very tall and panoramic source files: fit the actual digital file, not the catalogue's physical dimensions; no crop or distortion.
2. Long titles and accented Catalan/Spanish text: no clipping, missing glyphs or overflowing bounds.
3. Stale social caches: changed image/copy/font/template produces a different URL; identical inputs remain stable.
4. Missing artwork or font file: fail the build clearly rather than silently shipping a blank or substituted artwork.
5. Non-production builds: preserve existing noindex and absolute-URL omission behavior.

## File Map

- `src/lib/og.ts`: pure card selection, descriptor types, locale mapping and localized plain-text card content.
- `scripts/og/render.ts`: build-only HTML rendering, local font/image loading, hashing and JPEG encoding.
- `scripts/og/integration.ts`: Astro build hook; generate cards into the client asset output directory before build completion.
- `astro.config.mjs`: register the generation integration; retain current security and caching headers.
- `src/layouts/Base.astro`, `src/components/SEO.astro`: replace string-only image overrides with structured descriptors.
- `src/pages/[...locale]/catalogo/[slug].astro`: select a dedicated artwork card; retain the existing page image and VisualArtwork schema image.
- `package.json`, `pnpm-lock.yaml`: explicit build-only renderer dependencies and verification command.
- `tests/og.test.ts`, `tests/og-render.test.ts`, `tests/og-output.test.ts`: selection, rendering and built-output coverage.
- `.github/workflows/`: modify only the existing workflows that actually build the site to install the pinned renderer's Chromium before building.

## Task 1: Define card selection and localized content

**Interfaces:** In `src/lib/og.ts`, export `OgImage = { path: string; width: 1200; height: 630; type: 'image/jpeg'; alt: string }` and `OgCard = { key: string; locale: Locale; kind: 'identity' | 'biography' | 'artwork'; title: string; subtitle: string; imageFile: string; alt: string }`. Export `resolveOgCard(locale: Locale, path: string): OgCard`, `ogImageFor(card: OgCard): OgImage`, and `ogLocale(locale: Locale): string`. Keep font/image hashing in the build renderer; pass its generated manifest into the descriptor lookup rather than importing Node or Playwright into page code.

- [ ] Write `tests/og.test.ts` covering all 25 artwork slugs × three locales, homepage, biography, catalogue, exhibitions and fallback paths. Assert the selected image filename, nonempty localized alt, unchanged artwork titles, markup-free headline, and no availability in image copy.
- [ ] Assert OG locale values `es_ES`, `ca_ES`, `en_GB`; these are renderer metadata choices, not changes to HTML language tags.
- [ ] Run `pnpm exec vitest run tests/og.test.ts`; confirm failure from missing implementation.
- [ ] Implement the resolver and types. The final signature is `ogImageFor(card: OgCard, manifest: Record<string, OgImage>): OgImage` (superseding the shorthand above); the manifest is keyed by `card.key`. Missing keys throw an actionable error. No hidden filesystem lookup in page code.
- [ ] Run the targeted tests; expect PASS. Review and commit this unit only if authorized.

## Task 2: Build deterministic original-asset cards

**Interfaces:** `renderOgCards(cards: OgCard[], outputDir: string): Promise<Record<string, OgImage>>` in `scripts/og/render.ts`. `ogCardsIntegration(): AstroIntegration` in `scripts/og/integration.ts`. Emit a generated manifest before page rendering and final JPEGs into the adapter's actual client asset directory; inspect Astro 7's hook lifecycle and Cloudflare output structure before choosing hook timing. Keep generated files untracked and ensure clean builds cannot reuse a stale manifest.

- [ ] Inspect existing CI build jobs, ignore rules and Astro 7 integration documentation. Confirm a single coherent lifecycle for preparing the manifest before prerendering and copying images to the final output; do not assume `dist/` is the client root.
- [ ] Write `tests/og-render.test.ts`: output decodes as JPEG at 1200 × 630; repeated inputs hash identically; changing image, font, copy or template revision changes the path; missing source/font throws with filename; all output paths are under `/assets/og/`.
- [ ] Add visual-layout assertions using portrait, square and panoramic actual source files: image bounds stay within the canvas, source ratio is preserved, and text bounding boxes do not overlap or overflow. Include the longest artwork title and accented text in each locale.
- [ ] Run the tests and confirm failure before implementing the renderer.
- [ ] Add explicit compatible devDependencies using pnpm. Render local HTML with local WOFF2 fonts and original image files in headless Chromium; wait for `document.fonts.ready` and image decoding. Capture PNG then use Sharp to emit sRGB JPEG at quality 85, reducing quality down to 70 if needed to meet 500 KB; fail with the card key if still too large. No remote font/image requests.
- [ ] Implement integration and untracked manifest handling; wire it into `astro.config.mjs`. Use actual source image dimensions, not caption dimensions. Bound concurrency to two cards and close the browser in `finally`.
- [ ] Update existing CI build jobs to install Chromium using the pinned Playwright dependency. Verify Knip and dependency-cruiser recognize build scripts without weakening application dependency rules.
- [ ] Run `pnpm exec vitest run tests/og.test.ts tests/og-render.test.ts`; expect PASS. Review and commit this unit only if authorized.

## Task 3: Publish complete metadata

**Interfaces:** `Base.astro` and `SEO.astro` accept `ogImage?: OgImage`. Base resolves the default from locale and path; explicit overrides use the same descriptor type. `SEO.astro` resolves descriptor paths against the existing trusted `siteUrl` policy.

- [ ] Write built-output tests in `tests/og-output.test.ts` for homepage, biography and every artwork in all locales. Assert matching OG/Twitter image URLs, width `1200`, height `630`, MIME `image/jpeg`, nonempty matching `og:image:alt`/`twitter:image:alt`, `summary_large_image`, and region-qualified OG locale.
- [ ] Add assertions that each referenced local image exists, JPEG paths are unique where card content differs, and no artwork page still uses its page WebP as the social image. Keep VisualArtwork JSON-LD referencing the painting photo, not the text-bearing card.
- [ ] Add production/staging/preview environment cases using the repository's existing SEO test patterns; previews omit absolute image tags and preserve robots behavior.
- [ ] Run targeted tests to confirm the current markup fails the new assertions.
- [ ] Implement descriptor plumbing and metadata fields. Remove the artwork page's `ogImage={image?.src}` override; resolve its dedicated card by slug. Preserve page image rendering and all canonical/indexability behavior.
- [ ] Run targeted tests and existing `tests/seo.test.ts`, `tests/robots.test.ts`, `tests/i18n-parity.test.ts`; expect PASS.
- [ ] Review and commit this unit only if authorized.

## Task 4: Verify build and review actual previews

- [ ] Run `pnpm exec biome check .`, `pnpm check`, `pnpm knip`, `pnpm depcruise` and `pnpm test`; expect no new failures. Do not use `check:all` for read-only verification because it runs auto-fixes.
- [ ] Run `PUBLIC_BUILD_TYPE=Production PUBLIC_BASE_URL=https://masrexach.com pnpm build`; expect success, complete manifest coverage and all cards below 500 KB. Run built-output verification with `pnpm exec vitest run tests/og-output.test.ts` against the resulting actual client output.
- [ ] Build once with Preview settings and verify omitted absolute social tags and existing noindex behavior. Ensure the output test command documents which build environment it expects.
- [ ] Serve locally through the existing preview command. Use the Playwright skill to inspect the homepage, biography, longest-title card, portrait card, panoramic card and all three localized homepage cards. Compare at full size and approximately 360 × 189 thumbnail size; check legibility and original artwork fidelity.
- [ ] Present sample cards to the user for final visual approval. If the original source file has an unexpected orientation or incorrect catalogue association, report it separately; never silently rotate, replace or crop the artwork to match its caption.
- [ ] After explicit deployment authorization, verify public card GET responses are `200` with `Content-Type: image/jpeg`, no authentication or HTML fallback, and expected caching. Use available platform preview debuggers and a real messaging share to check cropping and cache refresh; local screenshots alone do not prove platform unfurl behavior.
- [ ] Summarize verified checks and remaining external validation. No automatic push, deployment or merge.

## Self-review

- Approved composition, original-asset preservation, localization, metadata, cache versioning and deployment policy each map to a task.
- Renderer lifecycle must be confirmed against current Astro documentation before implementation; the manifest and JPEG output must be produced by one build, not a manually run pre-step.
- Task 1's final public signature is `ogImageFor(card: OgCard, manifest: Record<string, OgImage>): OgImage`; all callers use this explicit manifest.
- All five Review Focus conditions have owning tests in Tasks 1–3 and visual/external checks in Task 4.
- No production code or generated images are implemented by this planning document.
