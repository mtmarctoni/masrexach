# masrexach — Astro Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking. Execute plan files in numeric order: `01` -> `08`.
> Tasks are numbered continuously (Task 1 ... Task 24) across files.

**Goal:** Recreate `https://www.masrexach.com` faithfully as a 3-locale (es/ca/en) Astro
static site deployed on Cloudflare, with i18n routing, a gallery with lightbox, a contact
form backed by an Astro Action + Resend, and legal pages.

**Architecture:** Every page is prerendered (100% static HTML). The one dynamic capability —
the contact form — POSTs to an Astro Action (server code running on a Cloudflare Worker)
from a small client script, so no page ever needs `prerender = false` (the health endpoint
at `src/pages/api/health.ts` is the only other server route).

**Tech Stack:** Latest stable Astro (static output + `@astrojs/cloudflare` adapter for
Actions), Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first `@theme`), `@astrojs/sitemap`,
Astro Fonts API (local provider), Astro Actions + Zod (`astro/zod`), Resend API, Vitest, pnpm.

## Global Constraints

- Package manager: pnpm only. Never npm or yarn.
- Node pinned via .nvmrc (latest stable LTS satisfying Astro).
- All work on branch feat/<slug>-astro. NEVER commit to main. No push/merge without approval.
- site set in astro.config.mjs to the production URL.
- Locales per brief; default locale served at root (prefixDefaultLocale: false);
  hreflang = plain codes + x-default -> root.
- All routes prerendered. Never set `export const prerender = false`. Only src/actions/ (and,
  on adapter builds with the ops module, the `/api/health` endpoint at `src/pages/api/health.ts`)
  runs server-side.
- CSP-clean output: no CDNs, no Google Fonts, no third-party runtime requests, no executable
  inline scripts. JSON-LD only as is:inline (non-executable). Astro <script> tags bundle to external files.
- Copy is law: all visible text is verbatim from source-snapshot/copy/<locale>.md (recreate) or the
  discovery copy files (new). Never rewrite, re-translate, or "fix" it. Deliberate source typos are preserved.
- Zod from astro/zod. Env via ctx.locals.runtime.env, never process.env.
- No emojis anywhere in code, copy, or commits.
- TypeScript strict (astro/tsconfigs/strict). `pnpm astro check` = 0 errors before every commit.
- Tailwind v4 utilities-first; @theme holds only used tokens; global.css near-empty; CSS budget enforced (DoD).
- Verify before claiming done: each task ends with an executable verification step with stated expected output.

Deviation notes (recorded, deliberate):

- The first branch of this repo is `main` by explicit user instruction (fresh private repo,
  no prior history); the initial landing commit goes there and all later work uses feature
  branches and PRs.
- `src/pages/api/health.ts` sets `prerender = false`: it is the one sanctioned exception —
  a server endpoint required by the ops-module smoke test, not a page.

## Phase table

| File | Phase | Contents |
|---|---|---|
| [01-scaffold.md](01-scaffold.md) | scaffold | repo skeleton, configs, ops tooling, Tailwind + fonts wiring |
| [02-content-i18n.md](02-content-i18n.md) | content/i18n | typed dictionaries from the copy files, i18n helpers, parity test |
| [03-shell.md](03-shell.md) | shell | SEO component, Base layout, header/nav/lang switcher, footer, locale routing |
| [04-sections.md](04-sections.md) | sections | artwork data + images, gallery grid, lightbox |
| [05-contact.md](05-contact.md) | contact | Zod schema, Astro Action, form component, integration verification |
| [06-hardening.md](06-hardening.md) | hardening | security headers, CSP, sitemap, robots.txt, og.jpg, health endpoint, DoD audit |
| [07-deploy-ops.md](07-deploy-ops.md) | deploy + ops | CI, Dependabot, LHCI, smoke test, deploy scripts, manual deploy (Gate 3) |
| [08-final-audit.md](08-final-audit.md) | final audit / comparison | post-deploy smoke, Lighthouse re-run, site-comparison.md |

## Definition of Done

Path convention: the `@astrojs/cloudflare` adapter is configured (contact module on), so
the build emits static output under `dist/client/` and the server bundle under
`dist/server/`.

- **Type check**

  ```bash
  pnpm astro check
  ```

  Expected: `0 errors, 0 warnings`.

- **Unit tests**

  ```bash
  pnpm test
  ```

  Expected: all Vitest suites pass (exit code `0`).

- **Build produces the expected `dist/client/` artifacts**

  ```bash
  pnpm build
  ls dist/client/index.html dist/client/_headers dist/client/robots.txt
  ls dist/client/sitemap-index.xml 2>/dev/null || ls dist/client/sitemap.xml
  ls dist/client/ca/index.html dist/client/en/index.html
  ```

  Expected: every listed file exists.

- **Server bundle present iff `modules.contact` is on**

  ```bash
  test -d dist/server && [ -n "$(ls -A dist/server)" ]
  ```

  Expected: exit `0`.

- **No third-party runtime scripts**

  ```bash
  grep -rlE '<script[^>]+src="(http|//)' dist/client/ | wc -l
  ```

  Expected: `0`. Every `<script ... src="http...">` or protocol-relative
  `src="//..."` pointing at an external host is forbidden — Astro bundles all
  first-party scripts to same-origin files.

- **Exactly one canonical link per page**

  ```bash
  for f in $(find dist/client -name 'index.html'); do
    c=$(grep -c '<link rel="canonical"' "$f")
    [ "$c" -eq 1 ] || echo "FAIL: $f has $c canonical tags"
  done
  ```

  Expected: no output — every `index.html` under `dist/client/` has exactly
  one `<link rel="canonical">`.

- **CSS budget**

  ```bash
  find dist -name '*.css' -exec cat {} + | wc -c
  ```

  Expected: the byte count is `<=` `css_budget_kb * 1024` (`css_budget_kb: 17`
  from the brief -> `<= 17408` bytes; the default 15 KB was raised with
  justification recorded in [00-brief.md](00-brief.md) after all discretionary
  CSS was eliminated — 22,588 -> 17,161 bytes).

- **Lighthouse CI (LHCI) assertions**

  `.lighthouserc.json`'s `assert.assertions` block must be exactly:

  ```json
  {
    "categories:accessibility": ["error", { "minScore": 1 }],
    "categories:best-practices": ["error", { "minScore": 1 }],
    "categories:seo": ["error", { "minScore": 1 }],
    "categories:performance": ["warn", { "minScore": 0.95 }]
  }
  ```

  Run over every locale root (`http://localhost/`, `http://localhost/ca/`,
  `http://localhost/en/`) plus one deep route (`/exposiciones/`).
  Expected: `pnpm lhci autorun` (or equivalent CI step) exits `0` — no
  `error`-level assertion fails; `warn`-level performance dips are logged but
  do not fail the run.

- **Hreflang count on every page**

  ```bash
  for f in $(find dist/client -name 'index.html'); do
    n=$(grep -o hreflang "$f" | wc -l | tr -d ' ')
    echo "$f hreflang=$n"
  done
  ```

  Expected: every file reports `hreflang=4` (one link per locale code plus one
  `x-default` pointing at the root).

- **Hreflang `href` values are absolute URLs**

  ```bash
  for f in $(find dist/client -name index.html); do
    grep -o '<link[^>]*hreflang[^>]*>' "$f" | grep -o 'href="[^"]*"' | grep -cv 'href="https\?://'
  done
  ```

  Expected: `0` for every file.

- **`<html lang>` matches the page's locale**

  ```bash
  grep -o '<html lang="[a-z]*"' dist/client/index.html
  grep -o '<html lang="[a-z]*"' dist/client/ca/index.html
  grep -o '<html lang="[a-z]*"' dist/client/en/index.html
  ```

  Expected: `lang="es"` at the root, `lang="ca"` / `lang="en"` on their pages.

- **Dictionary parity test**

  ```bash
  pnpm test -- i18n-parity
  ```

  Expected: the Vitest parity suite passes — a structural (recursive
  key-and-type) comparison of every non-default locale's dictionary against
  the default locale's dictionary reports identical shapes.

- **Honeypot-filled submission is rejected before any external call**

  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4321/_actions/contact \
    -H "Origin: http://localhost:4321" \
    -F name=Test -F surname=Bot -F email=test@example.com -F message="hello there" \
    -F important_field=spam
  ```

  Expected: `400`. The honeypot field (Zod `.max(0)`) rejects any non-empty
  value before the handler — and before Resend — ever runs.

- **Valid submission without `RESEND_API_KEY` configured**

  ```bash
  curl -s -X POST http://localhost:4321/_actions/sendContact \
    -H "Origin: http://localhost:4321" \
    -F name=Test -F email=test@example.com -F message="hello there" \
    -F important_field=
  ```

  Expected: HTTP `4xx/5xx` with an Astro Actions error response — proves
  routing and env-guarding without needing a real Resend key. Run against
  `pnpm dev` (or `astro preview` after `pnpm build`) and stop the server
  afterward; substitute `site_url`'s host for `localhost:4321` when
  re-running post-deploy.

- **Full CI check set green**

  ```bash
  pnpm exec biome ci .
  pnpm astro check
  pnpm test
  pnpm knip
  pnpm depcruise
  pnpm build
  ```

  Expected: every command exits `0`.

- **LHCI job green**

  Reuses the Core LHCI assertions as its own CI job. Expected: the job exits `0`.

- **Health endpoint (adapter builds)**

  `src/pages/api/health.ts` is a server endpoint on the Worker returning HTTP
  200, `Cache-Control: no-store`, and a JSON body
  `{ "status": "ok", "commit": "<sha>" }` (baked in at build time via
  `vite.define` -> `__BUILD_SHA__`). Verified by the smoke test below.

- **Post-deploy smoke test**

  ```bash
  node scripts/smoke.mjs <site_url>
  ```

  Expected: exit code `0`; the script prints `ok   <check>` for every check
  (health endpoint, homepage + security headers, every locale root, one deep
  route) with zero `FAIL` lines.

## Phase files

1. [01-scaffold.md](01-scaffold.md)
2. [02-content-i18n.md](02-content-i18n.md)
3. [03-shell.md](03-shell.md)
4. [04-sections.md](04-sections.md)
5. [05-contact.md](05-contact.md)
6. [06-hardening.md](06-hardening.md)
7. [07-deploy-ops.md](07-deploy-ops.md)
8. [08-final-audit.md](08-final-audit.md)
