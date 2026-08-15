> Part of the [masrexach — Astro Rebuild Implementation Plan](00-overview.md).

# Phase 1: scaffold

### Task 1: repo skeleton + core configs

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.nvmrc`, `tsconfig.json`, `astro.config.mjs`, `.gitignore`, `.dev.vars.example`

**Interfaces:**
- Consumes: brief fields (`site_slug`, `site_url`, `locales`, `default_locale`)
- Produces: installable pnpm project; Astro config consumed by every later task

- [x] Step 1: `package.json` — name `masrexach`, `"type": "module"`, `packageManager` pinned, `engines.node >= 22`, scripts (`dev`, `build` (clears `node_modules/.vite` first), `preview`, `check`, `lint`, `lint:fix`, `format`, `knip`, `depcruise`, `test`, `clean`, `prepare`), `simple-git-hooks` pre-commit running `pnpm exec biome check --staged --no-errors-on-unmatched --files-ignore-unknown=true`.
- [x] Step 2: `pnpm-workspace.yaml` — `overrides: { rolldown: 1.2.3, "@types/node": 26.1.2 }` (vite 8 pulls `rolldown ~1.2.1`; 1.2.4 references never-published native bindings; `@types/node@26.2.0` was yanked) plus `allowBuilds` for esbuild, workerd, simple-git-hooks.
- [x] Step 3: `.nvmrc` = `22`; `tsconfig.json` extends `astro/tsconfigs/strict`; `.gitignore` ignores `dist/`, `node_modules/`, `.dev.vars`, `.wrangler/`, `.env*`.
- [x] Step 4: `astro.config.mjs` — `site: "https://www.masrexach.com"`, `@astrojs/cloudflare` adapter (`imageService: "compile"`), `env.schema` for `RESEND_API_KEY` + `CONTACT_TO_EMAIL` (server secrets, optional), `security.csp`, `i18n` (`locales: ["es","ca","en"]`, `defaultLocale: "es"`, `routing.prefixDefaultLocale: false`), `image.quality 72` + webp/jpeg, sitemap integration (i18n, filters `/api/`), `fonts` (local provider; Roboto Slab -> `--font-heading`, Inter -> `--font-text`; single variable variant `weight: "100 900"` each), `vite.plugins: [tailwindcss()]` (see Task 3) and `vite.define: { __BUILD_SHA__: JSON.stringify(process.env.GITHUB_SHA ?? "unknown") }`.
- [x] Step 5: Verify

  ```bash
  pnpm install && pnpm astro --version
  ```

  Expected: install succeeds, prints an Astro 7.x version.

- [x] Step 6: Commit — `chore(repo): scaffold Astro 7 project skeleton`

### Task 2: ops tooling from templates

**Files:**
- Create: `biome.json`, `knip.jsonc`, `osv-scanner.toml`, `.dependency-cruiser.cjs`, `.lighthouserc.json`, `scripts/deploy.sh`, `scripts/sync-secrets.sh`, `.dev.vars.example`

**Interfaces:**
- Consumes: `templates/*` from the astro-site-builder skill
- Produces: quality gates (`pnpm lint`, `pnpm knip`, `pnpm depcruise`), LHCI config, deploy scripts used in Phase 7

- [x] Step 1: Copy the battle-tested configs. `knip.jsonc` ignores `@lhci/cli` (invoked via `npx`, never imported) and notes `cloudflare:workers` is a runtime module, not the npm package. `.lighthouserc.json` collects `dist/client` over `/`, `/ca/`, `/en/`, `/exposiciones/` with assertions a11y/BP/SEO `error 1` and perf `warn 0.95`.
- [x] Step 2: `scripts/deploy.sh` + `scripts/sync-secrets.sh` — wrangler deploy/secrets with GitHub Variables/Contexts injection; both must pass `--config dist/server/wrangler.json` because the adapter emits its wrangler config into `dist/server/` (see Phase 7).
- [x] Step 3: Verify

  ```bash
  bash -n scripts/deploy.sh && bash -n scripts/sync-secrets.sh && pnpm exec biome ci scripts/
  ```

  Expected: no output / exit `0`.

- [x] Step 4: Commit — `chore(ops): add quality, Lighthouse and deploy tooling`

### Task 3: Tailwind v4 wiring + fonts

**Files:**
- Create: `src/styles/global.css`, `src/assets/fonts/*.woff2` (Roboto Slab + Inter variable, latin)
- Modify: `astro.config.mjs`

**Interfaces:**
- Consumes: `@tailwindcss/vite` 4.3.x, Astro Fonts API (local provider)
- Produces: `--font-heading`/`--font-text` cssVariables + `@theme` color tokens + `font-display`/`font-body` utilities used across all components

- [x] Step 1: Register `tailwindcss()` under `vite.plugins` — NOT under `integrations`. Astro 7 ships Vite 8 (Rolldown); as an integration the plugin's transform never runs on CSS imported in component frontmatter and the raw `@import "tailwindcss"` is inlined unprocessed (symptom: literal `@theme`/`@utility`/`@tailwind utilities;` in the built CSS and zero utilities generated).
- [x] Step 2: `global.css` — `@import "tailwindcss"`; `@theme` holds only the used color tokens (surface/surface-alt/ink/ink-soft/ink-faint/accent/accent-strong/accent-soft/border/paper-dark + the precomputed blend tokens `paper-80`/`paper-70`/`paper-60`/`ink-line` that replace alpha-suffixed colors, which would otherwise ship `color-mix()` fallback duplicates); `@utility font-display`/`@utility font-body` (custom `@theme` font keys referencing `var()` do NOT generate utilities in v4); `@layer base` body/selection/focus rules.
- [x] Step 3: Fonts via the Astro Fonts API in `astro.config.mjs` with `<Font cssVariable="--font-heading" preload />` + `<Font cssVariable="--font-text" />` rendered in the head (Phase 3).
- [x] Step 4: Verify

  ```bash
  pnpm build && grep -o "\.font-display{font-family:var(--font-heading)}" dist/client/_astro/*.css | wc -l
  ```

  Expected: `1`, and no `@theme`/`@utility`/`@tailwind utilities;` strings remain in the built CSS.

- [x] Step 5: Commit — `feat(styles): wire Tailwind v4 via vite.plugins with local variable fonts`
