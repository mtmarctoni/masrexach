# Legacy painting URLs

## Public artwork slugs

Each artwork defines its stable `slug` in `src/data/artworks.ts`, independently
of its image filename. Slugs contain names, not asset numbers or dimensions.
Duplicate titles use descriptive qualifiers: `tiestos-oleo`, `tiestos-acrilico`,
`orient-cuadrado`, and `orient-panoramico`. Images and displayed titles are
unchanged. New slugs must be unique; `tests/artwork-slugs.test.ts` checks this.

`src/lib/legacy-artwork-redirects.ts` retains a frozen map of the 25 previously
published numbered slugs to artwork IDs. The runtime catalogue rest route
redirects GET and HEAD directly to the current slug with HTTP 301, preserving
Spanish, Catalan, and English prefixes, query strings,
and support for either trailing-slash form. Unknown catalogue paths still use
normal routing (404); they do not inherit the WordPress catalogue fallback.
Do not regenerate the historical map if image filenames change.

The same frozen map supplies aliases for historical contact links such as
`/contacto/?obra=07-albufera`. The form resolves these to the current slug before
showing the artwork or submitting its reference, including follow-up messages
after a form reset. Aliases and captions are generated for all three locales.
The homepage hero selects its artwork by stable ID rather than a public slug.

## WordPress URLs

The old WordPress `/portfolio-item/` URLs are handled by
`src/pages/portfolio-item/[...path].ts`. Known paintings permanently redirect
(HTTP 301) to their individual Spanish artwork pages. The section root and all
other paths inside that section redirect to `/catalogo/`. Query strings are
preserved; they never control the destination. Unrelated missing URLs remain
404s. Both GET and HEAD are supported.

The initial mappings came from legacy search results, including numeric slugs
`311` (Fuente y canal) and `225` (Rincón jardín). Orient was identified by its
100 × 40 cm dimensions, and Tiestos by its acrylic medium (not the oil painting
with the same title). Add explicit mappings only when the artwork is known;
do not guess from similar titles.

Legacy WordPress mappings resolve by artwork ID to the current slug, avoiding
redirect chains through numbered catalogue URLs.

The catch-all is a visitor-friendly fallback, not an equivalent replacement for
every old painting. Search engines may treat these generic redirects as soft
404s. Keep the redirects for at least a year, ideally indefinitely, and do not
block the legacy paths in robots.txt.

Responses use relative Location headers, so this works on any hostname routed
to the Worker, without redirecting staging to production. Production's `www`
hostname must separately be routed to this Worker or redirected to the apex by
Cloudflare; application code cannot handle a hostname that never reaches it.

Verification: `pnpm test`, then `pnpm build && pnpm test:worker`. The Worker
checks verify real routing, one-hop destinations, query strings, section roots,
nested fallbacks, and unrelated 404s.
