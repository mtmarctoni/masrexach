# SEO Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve multilingual search metadata and connect the artist's identity to the artwork catalogue without changing the design or removing public URLs.

**Architecture:** Keep the existing centralized Astro SEO component, dictionaries, and build-time metadata. Add small pure helpers for artwork descriptions and JSON-LD, then verify their rendered output alongside canonical URLs and sitemap entries.

**Tech Stack:** Astro, TypeScript, pnpm, Vitest; existing Playwright and build tooling. No new dependencies.

**Spec:** User-approved scope in this conversation: improve painting/exhibition descriptions in es/ca/en; connect artist/artwork structured data; verify canonical/sitemap/hreflang consistency; enable large search-image previews; add regression tests. Preserve design, public URLs, indexing safeguards, and original artwork images. OG deduplication is excluded.

## Global Constraints

- No invented subjects, dates, prices, offers, dimensions, or external identity links.
- Leave release-owned files and package version untouched.
- No commits, pushes, merges, or deployments without authorization.
- Preserve Production/Staging/Preview indexability and absolute-URL policies.
- Preserve every existing public route; canonical normalization is not route removal.
- Use existing captions as the authority for media and dimensions; do not infer physical orientation from photographs or parse ambiguous measurements into width/height.

## Review Focus

- Sold and family-keepsake paintings must not be described as available to buy.
- Translated metadata must retain accents and the original artwork title.
- Preview builds must not emit relative URLs as globally stable JSON-LD identities.
- Canonical normalization must not create broken internal links or redirect loops.
- Production noindex routes and all non-production pages must stay noindex.

---

### Task 1: Improve localized search descriptions

**Files:** Create `src/lib/artwork-seo.ts`, `tests/artwork-seo.test.ts`; modify `src/pages/[...locale]/catalogo/[slug].astro`, `src/i18n/{es,ca,en}.ts`, and `src/i18n/types.ts` if dictionary fields are required.

**Interfaces:** `artworkDescription(art: Artwork, locale: Locale): string` returns localized, natural copy containing the artwork title, artist name, existing caption, and accurate localized status. Existing page title format remains unchanged.

- [x] Add table-driven tests covering all 25 artworks in all three languages, including available/sold/nfs, accents, and captions with terminal punctuation. Assert the artist name and original title are retained, captions are not duplicated, and punctuation does not become `..`.
- [x] Run `pnpm exec vitest run tests/artwork-seo.test.ts`; confirm failures before implementation.
- [x] Implement the description helper using the existing localized status labels and captions; wire it into the artwork page. Do not add speculative subject descriptions.
- [x] Replace generic exhibition descriptions in all three dictionaries with natural copy naming venues already documented on the exhibition page. Tests assert these descriptions mention the artist and an actual documented venue.
- [x] Run the focused tests and `pnpm exec vitest run tests/i18n-parity.test.ts`.

### Task 2: Connect artist and artwork structured data

**Files:** Create `src/lib/structured-data.ts`, `tests/structured-data.test.ts`; modify `src/components/PersonJsonLd.astro` and `src/pages/[...locale]/catalogo/[slug].astro`.

**Interfaces:** `artistSchema(origin: string)` returns the existing factual Person data with a stable `${origin}/#artist` identity when an origin exists. `artworkSchema(art: Artwork, locale: Locale, pageUrl: string | undefined, imageUrl: string | undefined, origin: string)` returns a VisualArtwork with localized description, original photo, page URL, and the artist object/reference sharing that identity. Reuse Task 1's description helper.

- [x] Add failing tests for stable artist identity across locales, factual dates, artwork URL and description, original image URLs, and absent origin/image. Preview output must omit absolute-identity fields rather than produce `/...` identifiers.
- [x] Implement the helpers and replace duplicated inline schema construction. Retain `artform: Painting` and the complete localized caption; add `artMedium` only when directly supported by an explicit deterministic caption mapping. Do not add structured width/height from ambiguous caption ordering.
- [x] Retain a resolvable Person definition on artwork pages, not a dangling reference to an undefined local graph node. Do not replace the painting photograph with its OG card.
- [x] Run `pnpm exec vitest run tests/structured-data.test.ts tests/artwork-seo.test.ts`.

### Task 3: Align canonical signals and preview directives

**Files:** Modify `src/i18n/index.ts`, `src/lib/robots.ts`, `tests/robots.test.ts`; create `tests/i18n-urls.test.ts`. Change `astro.config.mjs` only if required by verified serving behavior.

**Interfaces:** Preserve `localizedPath`, `localizedUrl`, `alternatePaths`, and `robotsDirective` signatures. Production indexable directive becomes `index, follow, max-image-preview:large`; other directives remain exactly `noindex, nofollow`.

- [x] Verify actual directory-build/sitemap and local Worker trailing-slash behavior for Spanish, Catalan, and English before choosing canonical spelling. Preferred spelling is the sitemap's directory URLs, ending in `/`, without removing slashless routes. Do not add redirect policy without evidence it is needed.
- [x] Add failing URL tests covering roots, section/artwork paths, already-slashed input, all three locales, and reciprocal x-default/hreflang values. Assert no doubled slash in paths.
- [x] Normalize public page links/canonical/hreflang through the shared helper to the verified sitemap spelling; leave API routes untouched.
- [x] Update robots tests to assert the large-preview directive only on production indexable pages and retain negative cases for legal/errors, staging, preview, unset, and unknown build types.
- [x] Run `pnpm exec vitest run tests/i18n-urls.test.ts tests/robots.test.ts tests/seo.test.ts`.

### Task 4: Verify rendered metadata across build environments

**Files:** Extend `tests/og-output.test.ts`; update this plan with results. Reuse the existing `OG_VERIFY_BUILD` opt-in and `pnpm test:og` command rather than introducing another test workflow.

- [x] Update the existing exact robots assertion to the new production directive.
- [x] Add rendered assertions for unique/nonempty titles and descriptions per locale, artist name in artwork descriptions, canonical/og:url equality, reciprocal language links, and parsed JSON-LD identity/image/description fields. Account for HTML entity encoding when comparing metadata.
- [x] In production, compare every indexable page's canonical and alternate URLs against sitemap entries. Verify legal pages stay excluded and original artwork photos remain schema images.
- [x] In staging and preview, assert noindex remains; preview must omit canonical/absolute social URLs and avoid relative stable JSON-LD IDs. Do not silently skip schema assertions on preview pages.
- [x] Run `pnpm check`, `pnpm test`, `pnpm exec biome check .`, `pnpm knip`, `pnpm depcruise`, and `git diff --check`.
- [x] Build Production with `PUBLIC_BASE_URL=https://masrexach.com`, then run matching `pnpm test:og` and local built-Worker checks. Repeat build/output verification with Staging and Preview settings. Install Chromium with the existing Playwright dependency if required.
- [x] Review the complete diff for unsupported factual claims, route changes, changed image counts, and accidental release-file edits. Record evidence and any deployment-only checks still outstanding. Do not claim ranking or rich-result improvements are guaranteed.

## Baseline

- Worktree: `/Users/mtm/.local/share/opencode/worktree/99fbde/fix-seo-metadata`.
- Branch: `fix/seo-metadata`, based on merged `main` at `e134ec1`.
- `pnpm install --frozen-lockfile` succeeded without dependency changes.
- `pnpm test`: 129 passed; two built-output tests intentionally skipped.

## Implementation results

- Tasks 1–4 implemented on `fix/seo-metadata`; independent review found no actionable issues. User approved six focused commits; pushes and deployment are not authorized.
- Painting descriptions retain original titles, documented captions and accurate status, introduce the artist naturally in es/ca/en, and avoid duplicate terminal punctuation.
- Exhibition descriptions now name documented venues in all three languages.
- Artist and artwork JSON-LD share a stable artist identity, with a complete Person definition embedded on artwork pages. Media are drawn from a whitelist of documented English caption prefixes; ambiguous width/height and invented offers remain omitted.
- Preview JSON-LD omits unknown absolute identity/image URLs, while retaining factual artist/artwork fields.
- Confirmed before changing URL helpers: the existing local Worker redirects slashless section/artwork paths with 307 to their slashed spelling in all three languages, matching the production sitemap. No routing or redirect configuration changes were needed.
- Production indexable pages allow `max-image-preview:large`; legal/errors and all non-production pages retain noindex.
- Updated the smoke CLI's advisory to recognize the new robots metadata without falsely reporting a stale page; legacy production metadata remains accepted for release-tag rollback.
- Original artwork titles are preserved even where two paintings share a title (Orient and Tiestos). Section titles and all page descriptions are unique within each locale; repeated painting titles are differentiated by their descriptions and URLs.

### Verification

- `pnpm check`: 50 files, zero errors/warnings/hints.
- `pnpm test`: 177 passed; three built-output tests intentionally skipped outside opt-in verification.
- Production, Staging and Preview: builds passed and all three `pnpm test:og` output checks passed for each environment with matching environment variables.
- Local built-Worker checks passed for each build; Preview uses the staging Worker configuration, as in preview deployments. No real email credentials or external deployment used.
- Built metadata checks cover all 93 localized pages: descriptions, social copy, canonical URLs, reciprocal language alternates, sitemap equality, JSON-LD and original photo assets; they also check internal page links resolve to generated directory paths.
- OG assets remain 87 JPEGs; image deduplication is not part of this branch.
- Biome, Knip, dependency-cruiser and whitespace checks pass. Existing informational notices remain: Biome's schema version and Knip's ignored Cloudflare dependency.
- No release-owned file changes or dependency additions.
- Independent review confirmed the diff and all new source/tests, passed 177 unit tests and independently verified all three Preview output tests. No Critical, Important or Minor findings. The executor uses Node v22.23.4, matching `.nvmrc` and the package engine requirement.
- Deployment-only validation (Search Console, live canonical redirects, search/social crawler caches) remains for an authorized release; rankings or rich-result eligibility are not guaranteed.
