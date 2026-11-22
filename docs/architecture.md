# Architecture and feature guide

This guide describes the current implementation, not the sequence used to build
it. Source code and tests are the final authority. See the [README](../README.md)
for setup and the [verification guide](ci-verification.md) for checks.

## Rendering and entry points

Astro prerenders the content pages. The Cloudflare adapter emits static files in
`dist/client/` and a Worker in `dist/server/`; image processing happens at build
time (`imageService: "compile"`). The dynamic application entry points are the
contact Action in `src/actions/index.ts` and `/api/health` in
`src/pages/api/health.ts`. The health endpoint reports the build commit and uses
`Cache-Control: no-store`. It does not verify email delivery.

`astro.config.mjs` owns the adapter, CSP, generated headers, sitemap integration,
local fonts, and Tailwind's Vite plugin. Keep Tailwind under `vite.plugins`, not
Astro integrations. `src/layouts/Base.astro` provides the shared page shell.
Scripts and fonts are served locally; contact email goes from the Worker to
Resend, not directly from a visitor's browser.

## Languages and public URLs

`src/i18n/{es,ca,en}.ts` are the current content dictionaries, checked against
`src/i18n/types.ts` and parity tests. Pages under `src/pages/[...locale]/` use
`localeRoutes()` from `src/i18n/index.ts`: Spanish is unprefixed, Catalan uses
`/ca/`, and English `/en/`. Use `localizedPath()` for directory-style URLs with
trailing slashes; use the existing helpers for canonical and alternate-language
links. Do not introduce `/es/` as the default-locale prefix.

The main sections are home, biography, catalogue, exhibitions, contact, and legal.
Changes to public URLs need redirects or an explicitly reviewed breaking release;
see [release conventions](releases.md).

## Catalogue and artwork images

`src/data/artworks.ts` owns the 25 artwork records, localized captions, featured
selection, status (`available`, `sold`, `nfs`), and adjacent-artwork helpers.
Slugs derive from image basenames: `07-albufera.jpg` produces
`/catalogo/07-albufera/` (and localized equivalents). Renaming a source image can
therefore change a public URL; treat it as a routing change, not file cleanup.

The homepage links featured works to individual artwork pages. The catalogue
groups works by availability; detail pages show the image, caption, status,
previous/next links, and an enquiry link for available work. This is page-based
navigation, not the lightbox from the original implementation plan.

An enquiry uses `/contacto/?obra=<slug>` with its locale prefix. The contact
script resolves known slugs to localized labels; arbitrary query values are not
trusted artwork metadata. Preserve original paintings and photographs: do not
replace them with generated recreations. Follow [asset rights](../ASSET_RIGHTS.md)
and [image performance](image-performance.md), including synchronization of
`src/lib/thumbnail.ts` with the homepage/catalogue layouts.

## Contact and email boundary

`src/components/ContactForm.astro` and `src/scripts/contact-form.ts` submit to
the `sendContact` Astro Action. The server validates name (1–200 characters),
email (at most 320), message (1–4000), optional artwork (at most 100), and locale.
The `company` honeypot must be empty. Server checks, not client validation, are
the security boundary.

The Cloudflare `CONTACT_RATE_LIMITER` binding permits five submissions per IP per
minute. Its counters are per-location/eventually consistent. Missing binding or
client-IP header currently bypasses throttling; verify production bindings rather
than relying on that development fallback. Turnstile is not implemented.

`RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, and `CONTACT_TO_EMAIL` are required to
send, but optional during builds/local browsing. They resolve server-side at
runtime. `src/lib/email.ts` sends an owner notification and a localized courtesy
confirmation, escapes user content in HTML, and normalizes subject whitespace.
Notification failure fails the submission; confirmation failure does not.
Configured manual testing sends real email; use a test inbox and isolated keys.

## SEO, indexing, and social cards

Only an exact `PUBLIC_BUILD_TYPE=Production` enables indexing. Non-production
builds are noindex and omit the production sitemap. `src/lib/seo.ts` centralizes
paths excluded from indexing in all environments (legal/error pages and APIs);
keep robots metadata, robots.txt, and sitemap filtering synchronized through it.
Noindex is a search preference, not access control.

The SEO component uses the locale helpers and `PUBLIC_BASE_URL` for absolute
metadata where the build type permits it. `src/lib/structured-data.ts` owns the
structured-data builders. `scripts/og/` renders localized 1200×630 JPEG sharing
cards using Chromium and the original artwork/portrait. `src/lib/og.ts` resolves
cards; built-output tests check metadata and generated assets in each environment.
Lighthouse settings and warning/error thresholds live in `.lighthouserc.json`.

## CI, deployment, and trust

Keep hosted CI as the backstop to bypassable local hooks. Production and staging
are separate Workers; PR previews are versions of the staging Worker, inheriting
its bindings. Only trusted same-repository, non-draft, non-Dependabot PRs may
upload previews. Builds execute repository code, so a same-repository preview is
not a sandbox for untrusted contributors. Never share production keys with it.
The preview workflow runs for every PR change so its required check is always
reported; excluded PRs skip the upload job rather than leave a missing check
pending. Dependabot author and triggering actor are both excluded.

Merges to main deploy staging and maintain the Release Please PR. Merging the
release PR creates a release and deploys that exact commit to production. Manual
production dispatch accepts a validated published release tag for retry/rollback,
not arbitrary main HEAD. See [releases](releases.md) for full procedures and
[security](security.md) for credentials, logging, and publication precautions.

## Outstanding work and decisions

These items were carried forward from retired plans; they are not current pass
claims or permission to change production:

- **Owner confirmation:** editorial/native-language review of Catalan and English
  translations was recorded as pending. Confirm whether review has since happened.
- **Owner decision:** consider Turnstile if honeypot/rate limiting is insufficient;
  adding it requires server-side verification, not just a widget.
- **Future enhancement:** review low-resolution artwork originals with the rights
  holders; do not upscale or invent detail as a substitute for better scans.
- **Owner confirmation:** validate current sender-domain verification, recipient
  inbox/forwarding, DNS/TLS (including any legacy hosts), and actual email delivery.
  Successful build/deployment logs do not establish these external facts.
- **Owner decision:** production approval rules and staging-secret isolation need
  provider/settings evidence. Optional environment reviewers are not assumed enabled.
- **Measurement:** repeat approved live smoke/Lighthouse checks before claiming a
  current production audit. An old/new-site comparison remains optional and must
  not invent the unavailable old-site baseline.
- **Performance:** the initial rebuild used a 17 KiB uncompressed CSS target after
  reducing Tailwind fallback overhead. That historical measurement is not a current
  enforced budget; reassess payloads and optional tighter budgets on framework updates.

Initial deployment placeholders and the old manual-main production procedure are
superseded by the current workflows. Source snapshots remain for provenance, not
as instructions. Retired plans remain in Git history; new disposable agent plans
stay ignored under `docs/superpowers/`.
