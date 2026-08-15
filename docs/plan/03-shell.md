> Part of the [masrexach — Astro Rebuild Implementation Plan](00-overview.md).

# Phase 3: shell

### Task 6: SEO component

**Files:**
- Create: `src/components/SEO.astro`

**Interfaces:**
- Consumes: `getDict`-independent props (`title`, `description`, `path`, `locale`, optional `ogImage` default `/og.jpg`), `alternatePaths`, `localizedUrl`, `siteUrl`, `<Font>` from `astro:assets`
- Produces: the `<html>`/`<head>` shell with canonical, hreflang (plain codes + `x-default` -> root, absolute URLs), OG/Twitter cards, robots meta

- [x] Step 1: One `<link rel="canonical">` per page; `hreflang` set = `es`, `ca`, `en`, `x-default` (4 links, all `https://www.masrexach.com/...`).
- [x] Step 2: `<Font cssVariable="--font-heading" preload />` (preload only the heading font) + `<Font cssVariable="--font-text" />`.
- [x] Step 3: Verify (after Task 10's first build)

  ```bash
  grep -c '<link rel="canonical"' dist/client/index.html   # -> 1
  grep -o hreflang dist/client/index.html | wc -l          # -> 4
  ```

- [x] Step 4: Commit — `feat(seo): add head component with canonical, hreflang and OG`

### Task 7: Base layout

**Files:**
- Create: `src/layouts/Base.astro`

**Interfaces:**
- Consumes: `SEO.astro`, `Header.astro`, `Footer.astro`, `src/styles/global.css`
- Produces: the page frame (skip link, header, `<main id="main">`, footer) all pages render through

- [x] Step 1: Layout wires SEO props through, renders the a11y skip link, and loads `global.css`.
- [x] Step 2: Verify — `pnpm astro check` -> `0 errors`.
- [x] Step 3: Commit — `feat(layout): add Base layout`

### Task 8: header + language switcher

**Files:**
- Create: `src/components/Header.astro`, `src/components/LangSwitcher.astro`, `src/scripts/header.ts`

**Interfaces:**
- Consumes: `getDict`, `localizedPath`, dictionary `nav` + `a11y` strings
- Produces: sticky header with nav + per-page language switcher (copy: verbatim nav labels)

- [x] Step 1: Sticky header, solid `bg-surface` (no backdrop-filter: `backdrop-blur-*` utilities ship the entire filter `@property` family for one frosted effect — CSS-budget decision recorded in the brief).
- [x] Step 2: Switcher anchors use `lang` attributes; `hreflang` stays ONLY on `<link rel="alternate">` so the DoD hreflang count stays exactly `locales + 1`.
- [x] Step 3: Verify — built header links point at `/`, `/ca`, `/en` roots from every page.
- [x] Step 4: Commit — `feat(shell): add header with language switcher`

### Task 9: footer + legal pages

**Files:**
- Create: `src/components/Footer.astro`, `src/pages/[...locale]/legal.astro`, `src/pages/404.astro`

**Interfaces:**
- Consumes: dictionary `constants` + `legal` sections, `nav`
- Produces: footer with exhibition/studio/gallery constants and the legal page per locale

- [x] Step 1: Footer copy verbatim from the copy files (next exhibition, permanent gallery, studio, copyright lines).
- [x] Step 2: Legal page renders `dict.legal.sections` (headings + paragraphs, verbatim).
- [x] Step 3: Verify — `pnpm build && ls dist/client/legal/index.html dist/client/ca/legal/index.html dist/client/en/legal/index.html` -> all exist.
- [x] Step 4: Commit — `feat(shell): add footer, legal pages and 404`

### Task 10: locale routing + first full build verification

**Files:**
- Create: `src/pages/[...locale]/{index,biografia,contacto,exposiciones}.astro`

**Interfaces:**
- Consumes: `localeRoutes()` (default locale -> `params.locale = undefined`), `getDict`
- Produces: all localized routes; es at root, ca/en prefixed

- [x] Step 1: Pages live under `[...locale]/` (rest param) — a required `[locale]` segment cannot render the root path on the adapter's prerender server (`TypeError: Missing parameter: locale`), while a rest param accepts `undefined`.
- [x] Step 2: Verify

  ```bash
  pnpm build
  ls dist/client/index.html dist/client/biografia/index.html
  ls dist/client/ca/index.html dist/client/en/exposiciones/index.html
  ls dist/client/es 2>/dev/null | wc -l   # -> 0 (no /es/ prefix anywhere)
  ```

  Expected: root + deep es routes exist, ca/en trees exist, no `es/` directory.

- [x] Step 3: Commit — `feat(pages): route default locale at root via rest params`
