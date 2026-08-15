> Part of the [masrexach — Astro Rebuild Implementation Plan](00-overview.md).

# Phase 2: content + i18n

### Task 4: typed dictionaries from the copy files

**Files:**
- Create: `src/i18n/types.ts`, `src/i18n/es.ts`, `src/i18n/ca.ts`, `src/i18n/en.ts`
- Test: `tests/i18n-parity.test.ts` (Task 5)

**Interfaces:**
- Consumes: `docs/plan/source-snapshot/copy/{es,ca,en}.md` (copy is law — verbatim, never rewritten or re-translated; the single injected spam paragraph excluded on the es source is documented in the brief)
- Produces: `TranslationContent` interface + one `const <locale>: TranslationContent` per locale, consumed by every component and page

- [x] Step 1: `types.ts` defines `Locale` and the full `TranslationContent` shape (nav, home, biography, exhibitions, contact incl. form strings, legal incl. sections, constants, gallery, a11y).
- [x] Step 2: Each locale file declares its dictionary against the shared type so a missing or extra key fails at compile time via `pnpm astro check`.
- [x] Step 3: Verify

  ```bash
  pnpm astro check
  ```

  Expected: `0 errors`.

- [x] Step 4: Commit — `feat(i18n): add typed dictionaries for es/ca/en from the copy files`

### Task 5: i18n helpers + parity test (TDD)

**Files:**
- Create: `src/i18n/index.ts`, `tests/i18n-parity.test.ts`

**Interfaces:**
- Consumes: dictionaries from Task 4
- Produces: `getDict`, `localizedPath`, `localizedUrl`, `alternatePaths`, `localeRoutes` — consumed by SEO, Header, Footer, LangSwitcher and all pages

- [x] Step 1: Write `tests/i18n-parity.test.ts` RED first — a recursive structural (key + value type + array length) comparison of `ca` and `en` against the default `es` dictionary.
- [x] Step 2: Run it, confirm the stated failure mode (`pnpm test` -> no suites / failing assertion), then implement `src/i18n/index.ts` (or fix whichever dictionary diverges — from the copy files, never by editing types).
- [x] Step 3: `localeRoutes()` maps the default locale to `params: { locale: undefined }` so es renders at the root (`/`, not `/es/`); pages read the locale from `Astro.props`.
- [x] Step 4: `localizedPath` emits trailing slashes to match `@astrojs/sitemap` output (`build.format` "directory"), keeping canonical/hreflang identical to sitemap entries.
- [x] Step 5: Verify

  ```bash
  pnpm test -- i18n-parity
  ```

  Expected: `2 passed` (ca, en).

- [x] Step 6: Commit — `feat(i18n): add locale helpers with dictionary parity test`
