# Follow-up — pending human decisions and placeholders

Everything that could not be resolved without the user, in one place. Each item
names where the placeholder lives and what unblocks it.

## Contact form

- [ ] `CONTACT_TO_EMAIL` — currently `artista@PLACEHOLDER.example` (`.dev.vars.example`,
  `astro.config.mjs` env schema). Needs the real destination inbox before deploy.
- [ ] Resend `from` domain (`contacto@masrexach.com` assumed) — requires SPF/DKIM
  verification of masrexach.com in the Resend account before any send works.
- [ ] Decide whether a Turnstile widget should gate the form post-launch (the Action
  is Turnstile-ready; CSP already allows only self + Resend).

## Deploy (Gate 3 — manual, requires the user)

Architecture (live since the `fix/worker-envs-deploy` branch): **two Workers** —
`masrexach` (production, `masrexach.marctonimas.com`) and `masrexach-staging`
(`masrexach-staging.marctonimas.com`). Two is the minimum: a Worker's active
deployment is global, so one Worker cannot serve different content per domain.
PR previews are **not** separate Workers — they are non-serving _versions_ of
the staging Worker (`wrangler versions upload --preview-alias pr-<N>`), so the
Worker count stays at two forever.
- [ ] Cloudflare account: `deploy_account: "PLACEHOLDER"` in the brief. Needed for
  the `masrexach` (prod) / `masrexach-staging` targets.
- [ ] GitHub environments `production`, `staging`, `preview` (Settings →
  Environments). Put `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in each;
  app secrets (`RESEND_API_KEY`, `CONTACT_TO_EMAIL`) and runtime vars in
  `staging` and `production` with per-env values. Environment entries override
  repo-level ones automatically; `deploy.sh` / `sync-secrets.sh` consume the
  merged `vars` / `secrets` contexts and need no changes. Preview uploads
  intentionally inherit the staging Worker's live vars/secrets via
  `--keep-vars`, so the `preview` environment only needs the Cloudflare creds.
- [ ] Optional: required reviewers on the `production` environment as an extra
  gate on top of `workflow_dispatch`.
- [ ] DNS cutover for www.masrexach.com to Cloudflare; TLS termination via Cloudflare
  (the old host's certificate expired 2026-03-15 — one of the defects this rebuild fixes).

Note: workflows triggered by `dependabot[bot]` receive **no** Actions secrets
(repo- or environment-level), so Dependabot PRs skip the Cloudflare preview and
post an explanatory comment instead. A maintainer re-running such a run gets a
preview, because the re-run executes under the maintainer's identity.

## Content

- [ ] CA/EN translations were drafted by us from the es source
  (`docs/plan/source-snapshot/copy/{ca,en}.md`) — pending client review before
  considering copy final for those locales.
- [ ] 20 of 25 artwork images are ~460px wide (see
  `docs/plan/source-snapshot/assets/artwork/MANIFEST.csv`). Acceptable for the grid;
  the lightbox shows them 1:1 and will not upscale. Re-shooting higher-res scans is a
  future enhancement — swap files in `src/assets/images/artwork/` and rebuild.

## Metrics

- [ ] Old-site Lighthouse baseline could not be captured (expired TLS blocks trusted
  capture; `docs/plan/lighthouse-old/` is empty). If measurable post-cutover (e.g. via
  archive.org), backfill for the site comparison; otherwise the comparison cites the
  security/hygiene facts instead of estimated perf numbers.
- [ ] CSS budget raised 15 KB -> 17 KB (brief, with justification): all discretionary CSS
  eliminated (22,588 -> 17,161 bytes, -24%); remainder includes ~2.6 KB of Tailwind
  v4.3.3 unconditional `.transition`/`.transform`/`.filter` compat rules + 22
  `@property` registrations that no configuration removes. Gzipped: ~4.5 KB. Revisit
  on Tailwind upgrades — if a future release stops emitting the compat chain, tighten
  back to 15 KB.

## Known benign warnings

- Shiki inline-style/CSP warning in build output: cosmetic; the site renders no code
  blocks, nothing ships.
