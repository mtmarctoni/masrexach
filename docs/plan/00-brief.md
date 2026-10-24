---

mode: "recreate"
site_slug: "masrexach"
site_url: "https://www.masrexach.com"
prod_host: "masrexach" # Cloudflare Pages project (deploy later — placeholder)
staging_host: "masrexach-preview" # Cloudflare Pages preview (deploy later — placeholder)
locales: ["es", "ca", "en"]
default_locale: "es"
deploy_account: "PLACEHOLDER" # user's Cloudflare account — TBD, see follow-up.md
css_budget_kb: 17
modules:
i18n: true
blog: false
contact: true
gallery: true
legal: true
analytics: false
ops: true
---

# Mas Rexach — intake brief

Rebuild of the live site https://www.masrexach.com (Antoni Mas Rexach, Mallorcan
painter) as a 3-locale (es/ca/en) Astro static site. Default locale `es` served
at the root. Build only — deployment happens later (see follow-up.md).

## Content sources

- **Live URL(s) to snapshot:** `https://www.masrexach.com` (accessed with `curl -k`
  — the TLS certificate is expired; that's one of the defects being fixed).
- **Snapshot output path:** `docs/plan/source-snapshot/`
- **Locales present on the live site:** only `es`. `ca` and `en` are translations
  drafted by us (see `source-snapshot/copy/ca.md`, `source-snapshot/copy/en.md`)
  and pending client review.

## Notes / decisions

- The current site is WordPress (6.7.7) + Total theme + WPBakery + RevSlider +
  Contact Form 7 + Yoast. It is hacked (SEO-spam injected into the Biografía page)
  and its SSL certificate expired on 2026-03-15. All of this is being replaced.
- A single spam paragraph on the Biografía page was **excluded** from the copy
  (see `source-snapshot/copy/es.md` header note) — it is injected third-party
  content, not the artist's own text.
- Contact form: destination email **placeholder** (Resend). See follow-up.md.
- 20 of 25 artwork images are ~460px wide (see MANIFEST). Acceptable for a
  gallery site; re-shooting higher-res versions is a future enhancement. See
  follow-up.md.

## Success metrics

> LHCI a11y/BP/SEO = 100, perf >= 95; CSS <= css_budget_kb (17 KB)

CSS budget note: raised from the 15 KB default after the initial build audit.
All discretionary CSS was eliminated (alpha-color `color-mix()` fallbacks,
backdrop-filter/box-shadow utility families, `space-y` margin-trim fallbacks —
22,588 -> 17,161 bytes, -24%); the remainder includes ~2.6 KB of Tailwind
v4.3.3 unconditional emissions (`.transition`/`.transform`/`.filter` compat
rules plus 22 `@property` registrations) that no user-level configuration
removes. Gzipped payload is ~4.5 KB.
