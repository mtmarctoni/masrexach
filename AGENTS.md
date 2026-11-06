# Agent instructions

## Commits and releases

Commit messages decide the production version. Release Please reads the
[Conventional Commits](https://www.conventionalcommits.org) on `main` and
opens a release PR with the next version. See `docs/releases.md`.

Pick the type by what a visitor of the site gets:

| Type                                                               | Use for                                                                               | Version bump |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------ |
| `feat!:`                                                           | A breaking change (see below)                                                         | major        |
| `feat:`                                                            | New visible content or features: a page, an exhibition, a catalogue entry, a language | minor        |
| `fix:`                                                             | Corrections to what visitors see or use: wrong text, broken layout, a form bug        | patch        |
| `perf:`                                                            | Faster pages with no visible change                                                   | patch        |
| `chore:`, `docs:`, `ci:`, `test:`, `refactor:`, `style:`, `build:` | Everything else: tooling, dependencies, workflows, tests, internal code               | none         |

The highest bump since the last release wins. One stray `feat:` on a fix
branch makes the whole release minor, so do not use `feat:` for internal
work.

### Breaking changes

For this site, a change is breaking when it breaks something outside the
repository:

- A public URL is removed or renamed without a redirect (`/exposiciones/`,
  `/catalogo/...`, a locale prefix), which breaks inbound links and bookmarks.
- The contact form, or `/api/*`, changes what it accepts or returns.
- A locale is removed.

Mark it with `!` before the colon, and explain in the body what breaks and
what was done about it (redirects, notices):

```
feat(catalogo)!: move catalogue entries under /obra/

The /catalogo/<slug> URLs now redirect to /obra/<slug>. Links shared
before this release keep working through the redirects.
```

A URL change that ships with redirects is not breaking. Use `feat:` or
`fix:`.

### Pull requests

- PRs can be squash-merged, so the PR title must also be a valid
  conventional commit with the right type.
- With merge or rebase, every commit on the branch counts. Keep `feat:` and
  `fix:` only on commits that change what visitors get.

### Never edit by hand

Release Please owns these files. Do not change them in normal PRs:

- `CHANGELOG.md`
- `.release-please-manifest.json`
- `"version"` in `package.json`

To force a specific version, add a `Release-As: x.y.z` footer to a commit
instead, and only when the user asks.

## Browser tools

- Always use the Playwright skill for opening, inspecting, and controlling a browser.
- Project-local skill: `playwright-cli` from `microsoft/playwright-cli`; instructions are in `.agents/skills/playwright-cli/SKILL.md`.
- Do not use `terminal-browser`.
- If the Playwright skill is unavailable, locate it or ask the user before proceeding with browser work; do not silently substitute another browser tool.
