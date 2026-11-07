# Maintaining responsive artwork thumbnails

A thumbnail is a painting preview linking to its artwork page. The shared
`thumbnailOptions()` helper in `src/lib/thumbnail.ts` supplies responsive image
settings for two layouts:

- **`featured`**: the homepage's featured artwork cards.
- **`catalogue`**: available and sold artwork in the catalogue listing.

It does not apply to the homepage hero, artwork detail images, biography portrait,
or social-sharing images. Those have different display requirements.

## What Astro handles, and what the helper handles

Astro's `<Image>` generates optimized WebP files at build time. The helper does
not process images; it tells Astro and the browser which dimensions these layouts
need, through three props:

| Prop     | Meaning                                                                                               |
| -------- | ----------------------------------------------------------------------------------------------------- |
| `width`  | Default generated image width; not a CSS layout instruction.                                          |
| `widths` | Alternative widths Astro generates and advertises in `srcset`.                                        |
| `sizes`  | Expected displayed width, allowing the browser to choose a source for its viewport and pixel density. |

The browser selects a source rather than downloading every advertised variant.
`sizes` describes the layout; it does not create or change it. Astro cannot infer
our exact Tailwind grid geometry or how much of an `object-fit: contain` box a
painting actually occupies.

Usage in the page templates:

```astro
<Image
  src={image}
  {...thumbnailOptions(image, "featured")}
  quality={72}
  format="webp"
  class="h-60 w-full object-contain"
/>
```

## Featured cards: account for the painted image, not just its box

`src/pages/[...locale]/index.astro` displays previews in 240px-tall boxes
(`h-60`) with `object-contain`. A tall painting fills the height, but leaves
unused space on either side.

For example, a 720 × 1920 painting displayed at 240px tall is only 90px wide:

```text
painted width = 240 × original width / original height
              = 240 × 720 / 1920
              = 90px
```

The helper rounds up and proposes 1×, 2×, and 3× versions of that width. Its
`sizes` expression uses the smaller of the available card width and the painted
width. This also accounts for landscape paintings constrained by the card width.

## Catalogue: account for fluid column widths

`src/pages/[...locale]/catalogo.astro` displays paintings at full column width
with their natural aspect ratios. It uses two columns below `lg` and three above.

The helper proposes widths of 180, 240, 360, 480, 720, and 960px, with a default
of 720px. Both layouts cap requested widths at the original image width and remove
duplicates, avoiding enlargement that adds bytes without adding detail.

## Layout assumptions that must stay synchronized

These values reflect the current templates and the shared container in
`src/layouts/Base.astro`. Recalculate them if the corresponding CSS changes.

| Assumption            | Current value                                 | Where it affects the helper                            |
| --------------------- | --------------------------------------------- | ------------------------------------------------------ |
| Shared container      | `max-w-6xl` = 1152px; `px-6` = 24px each side | Both layouts' available width and maximum column width |
| Breakpoints           | `sm` = 640px; `lg` = 1024px                   | `sizes` media conditions                               |
| Featured grid         | 1 / 2 / 3 columns; `gap-7` = 28px             | Featured width formulas                                |
| Featured card inset   | `p-3` = 12px plus 1px border on each side     | Subtract 26px from each card's width                   |
| Featured image height | `h-60` = 240px                                | Aspect-ratio calculation and generated widths          |
| Catalogue columns     | 2 / 3 columns; gaps 24px / 28px               | Catalogue width formulas                               |

The resulting widths, where `V` is viewport width in CSS pixels:

| Layout    | Viewport        | Available width before the featured aspect-ratio limit   |
| --------- | --------------- | -------------------------------------------------------- |
| Featured  | Below 640px     | `V - 74` (48px outer padding + 26px card inset)          |
| Featured  | 640–1023px      | `(V - 128) / 2` (48px padding + 28px gap + 52px insets)  |
| Featured  | 1024–1151px     | `(V - 182) / 3` (48px padding + 56px gaps + 78px insets) |
| Featured  | At least 1152px | Approximately 323.34px                                   |
| Catalogue | Below 1024px    | `(V - 72) / 2` (48px padding + 24px gap)                 |
| Catalogue | 1024–1151px     | `(V - 104) / 3` (48px padding + 56px gaps)               |
| Catalogue | At least 1152px | Approximately 349.34px                                   |

Changing Tailwind's spacing scale, breakpoints, or the root font size can also
invalidate these pixel equivalents. Do not copy these settings to a new layout
without checking its geometry.

## Loading priority and fonts

The catalogue's first two available artworks load eagerly with high fetch priority
because they can be visible in the initial mobile viewport and become Largest
Contentful Paint (LCP). Other featured catalogue artworks retain eager loading;
remaining artwork stays lazy-loaded. Recheck this policy if ordering, columns,
or content above the grid changes. Do not make every thumbnail high priority.

The heading font is preloaded in `src/components/SEO.astro`. Preloading the normal
body font was tested during this optimization and not retained because it showed
no measurable benefit. A shorter request chain alone is not proof of faster
rendering; repeat measurements before changing font preload policy.

## Verification after a layout or sizing change

1. Update the helper alongside the layout. Preserve artwork aspect ratios and
   avoid changing compression quality merely to hide a sizing problem.
2. Update `tests/thumbnail.test.ts` for any intentional sizing changes. Include
   tall and landscape artwork and small originals.
3. Build, then run the complete suite with built-output checks enabled:

   ```sh
   pnpm build
   THUMBNAIL_VERIFY_BUILD=1 pnpm test
   ```

   `tests/thumbnail-output.test.ts` checks responsive markup and initial catalogue
   image priority in Spanish, Catalan, and English. It is opt-in because ordinary
   unit tests must not depend on potentially stale build output.

4. Use Playwright to check the homepage and catalogue on mobile, tablet, and
   desktop, especially around 640px, 1024px, and 1152px. Check for overflow,
   cropping, layout shifts, and sharpness on high-density screens. Scroll to lazy
   images before inspecting their `currentSrc` and downloaded dimensions.
5. Compare production builds using **mobile Slow 4G** Lighthouse settings. Run at
   least three times per page and variant, sequentially under comparable machine
   load. `.lighthouserc.json` explicitly sets simulated Slow 4G: 150ms RTT,
   1638.4 Kbps throughput, and 4× CPU slowdown, with Lighthouse's adjusted request
   latency and throughput values for network emulation.
6. Compare image bytes, LCP, and CLS, not just the score or dependency-tree
   warning. Check the actual LCP element: smaller thumbnails can change which
   element becomes LCP and expose a loading-priority issue. Local static-server
   results do not measure production CDN latency or cache behavior.

The CI configuration currently collects one run per URL. Use a temporary local
configuration with `numberOfRuns: 3` for comparisons; do not mistake a single CI
run for a repeated performance experiment.
