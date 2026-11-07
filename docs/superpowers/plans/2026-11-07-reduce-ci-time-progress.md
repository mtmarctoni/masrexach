# SDD ledger — plan: docs/superpowers/plans/2026-11-07-reduce-ci-time.md

- Baseline: 212 tests passed, 6 skipped. Existing linked feature worktree verified.
- Pre-flight: Tasks 1/2 share the conservative browser selector; Tasks 2/3 retain the full Lighthouse configuration.
- Ruling: Keep browser cases in the existing renderer test file with explicit skip conditions rather than duplicating fixture setup in a separate file — smaller change, identical coverage; risk is accidental skip selection, covered by selector tests.
- Tasks 1–3: implemented. No commits authorized.
- Final review: fresh reviewer identified missing workspace/runtime filter inputs; regression tests failed first, then filters were corrected. Full suite: 234 passed, 6 skipped.
- Verification: full gate exits 0, including production/staging builds, Worker integration, security checks and full Lighthouse collect/assert. Biome and actionlint pass. Selective suite: 228 passed, 8 skipped before four additional selector cases were added.
- Limitation: Astro check prompts to install its declared checker and exits without performing typechecking; do not treat its zero exit as successful type verification.
- Branch protection inspection returned HTTP 403 (private free-tier repository); documented requirement that optional Lighthouse not be a required check.
