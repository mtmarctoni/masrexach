> Part of the [masrexach — Astro Rebuild Implementation Plan](00-overview.md).

# Phase 4: sections (gallery)

### Task 11: artwork data + images

**Files:**
- Create: `src/data/artworks.ts`, `src/assets/images/artwork/*.jpg` (25 files)

**Interfaces:**
- Consumes: `docs/plan/source-snapshot/assets/artwork/` + `MANIFEST.csv` (titles/techniques/dimensions are copy — verbatim)
- Produces: the typed artwork list (title, per-locale caption, technique, dimensions, grid + large image refs) consumed by Gallery

- [x] Step 1: Import images via `astro:assets` (both a grid and a large variant per artwork where available).
- [x] Step 2: Verify — `pnpm astro check` -> `0 errors`.
- [x] Step 3: Commit — `feat(data): add artwork catalogue and images`

### Task 12: gallery grid

**Files:**
- Create: `src/components/Gallery.astro`

**Interfaces:**
- Consumes: `src/data/artworks.ts`, `getDict` gallery/a11y strings
- Produces: the responsive artwork grid (figure/button/figcaption per artwork) used on the home page

- [x] Step 1: Each tile is a `<button aria-label="Ampliar imagen: <title>">` wrapping the grid image — keyboard-openable lightbox.
- [x] Step 2: Captions verbatim per locale (`art.caption[locale]`).
- [x] Step 3: Verify — built `/` contains 25 `data-lightbox-trigger` buttons (grep count).
- [x] Step 4: Commit — `feat(gallery): add responsive artwork grid`

### Task 13: lightbox + zoom

**Files:**
- Create: `src/scripts/gallery.ts`
- Modify: `src/components/Gallery.astro`

**Interfaces:**
- Consumes: `data-lightbox-*` hooks, `dict.gallery` strings (close/prev/next/counter)
- Produces: native `<dialog>` lightbox with prev/next/close, counter, focus handling; scoped hover zoom

- [x] Step 1: `<dialog>` + `showModal()` (native focus trap + Esc); buttons carry the dictionary aria-labels.
- [x] Step 2: Hover zoom + lightbox arrows are scoped component CSS (`.zoom-img`, `.lightbox-nav`), not Tailwind transform/filter utilities — those unconditionally ship `.transform`/`.filter` compat rules and ~15 `@property` registrations (CSS-budget decision, recorded in the brief).
- [x] Step 3: `prefers-reduced-motion` disables zoom/nav transitions.
- [x] Step 4: Verify

  ```bash
  pnpm build && grep -c "data-lightbox-close" dist/client/index.html   # -> 1
  grep -rlE '<script[^>]+src="(http|//)' dist/client/ | wc -l          # -> 0
  ```

- [x] Step 5: Commit — `feat(gallery): add dialog lightbox with scoped zoom`
