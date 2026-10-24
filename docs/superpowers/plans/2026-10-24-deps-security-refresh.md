# Dependency Security Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate Dependabot PRs #19 and #20 and fix all safely resolvable dependency vulnerabilities in one reviewed PR.

**Architecture:** Refresh direct dependencies and their lockfile, preferring upstream fixes over overrides. Validate any necessary cross-major transitive override against its consumers; retain explicit exceptions only for vulnerabilities without a safe available fix.

**Tech Stack:** Astro, Cloudflare Workers, pnpm 11, Biome, Vitest, Lighthouse CI, OSV Scanner.

**Spec:** User-approved scope in this session: isolated worktree/branch from latest main; include both open Dependabot updates; permit compatible major upgrades where needed; preserve the previous CVE fixes; review and pass local checks before pushing and opening one PR; do not merge.

## Global Constraints

- Work on `chore/deps-security-refresh`, never commit to main.
- Preserve existing security version floors and avoid obsolete Dependabot lockfile downgrades.
- No changes to unrelated open PRs and no production deployment.
- Do not claim zero CVEs if unfixable findings remain.
- Use the repository's pnpm version and frozen-lockfile verification.

## Review Focus

- Cross-major transitive changes must preserve consumer APIs; exercise relevant imports and Lighthouse execution.
- Existing Astro contact actions and Cloudflare adapter must still typecheck, test and build.
- Lighthouse must use the audited lockfile, not an independently resolved npx dependency tree.
- Security exceptions must match actual remaining findings and published package versions.
- Updated linters must not silently rewrite unrelated application behavior.

### Task 1: Establish baseline and refresh dependencies

**Files:** `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `biome.json` if required.

**Interfaces:** Consumes current main dependency floors; produces an installable, reviewed dependency graph.
- [x] Install using `pnpm install --frozen-lockfile` and run `pnpm test` for a clean baseline.
- [x] Record `pnpm audit --json` and an unfiltered OSV scan as the security regression baseline.
- [x] Check published versions and parent dependency constraints for each ignored advisory.
- [x] Upgrade supported direct dependencies, including versions at least as new as PR #20, without regressing the last security fix.
- [x] Resolve transitive vulnerabilities through upstream updates or narrowly scoped compatible overrides; check consumer APIs before cross-major overrides.
- [x] Match the Biome schema to its installed version if changed.
- [x] Run frozen installation, typecheck and tests; investigate regressions before proceeding.

### Task 2: Align scanning and Lighthouse with the secured graph

**Files:** `.github/workflows/ci.yml`, `.github/workflows/lighthouse.yml`, `osv-scanner.toml`; dependency regression tests under `tests/` if needed.

**Interfaces:** Consumes the refreshed lockfile; produces CI using that exact dependency graph and accurate security exceptions.
- [x] Update the OSV action to the current compatible stable version, covering PR #19.
- [x] Replace the independently resolved Lighthouse npx invocation with the installed `pnpm` command.
- [x] Remove fixed exceptions; document remaining findings with verified reasons and bounded review dates.
- [x] Exercise Lighthouse CLI and relevant overridden dependency consumer paths locally.
- [x] Run unfiltered OSV and pnpm audit again; confirm no production vulnerabilities and account for every remaining finding.

### Task 3: Verify, review and publish

**Files:** Final diff and PR description.

**Interfaces:** Consumes dependency and CI changes; produces one feature-branch PR with evidence and superseded PR links.
- [x] Run repository local checks (`pnpm check:all`), CI-equivalent Biome, production build and Lighthouse where available.
- [x] Review the full diff for unintended changes, dependency downgrades, incompatible overrides and hidden security findings; rerun checks after fixes.
- [x] Record exact passing checks, limitations and any unavoidable CVEs in the PR description.
- [x] Commit only reviewed files on the feature branch, push and open one PR referencing #19 and #20 as superseded; do not close or merge other PRs.

## Verification and decisions

- Baseline: 9 advisories in both pnpm audit and an OSV scan without exceptions.
- Updated graph: zero findings in full pnpm audit, production-only audit, and unfiltered OSV; no security exceptions remain.
- Frozen-lockfile installation and peer-dependency checks pass.
- `pnpm check:all` and `pnpm exec biome ci .` pass; all 24 unit tests pass. Astro check reports zero errors, warnings or hints.
- Production Cloudflare build passes. Lighthouse collection and unchanged assertions pass for all five configured URLs, with no report upload performed locally.
- Actual loopback FTP download through get-uri/basic-ftp 6 and LHCI HTTP fetch through ProxyAgent 8 passed.
- Independent whole-change review found no critical, important or minor issues.
- Local Gitleaks scan passes using a checksum-verified release in temporary tooling storage; no global tool installation was needed.
- Initial verification used the already-installed Node 24.21.0. The required Node floor is now 22.23.4, matching Astro. After CI reused cached Node 22.23.3 for the broad `22` selector, `.nvmrc` was pinned to `22.23.4` so every CI/deployment workflow selects a supported patch version.
- Follow-up verification on a checksum-verified Node 22.23.4 release passes frozen installation, `pnpm check:all` (24 tests), the production build and pnpm audit. The `.nvmrc`/Astro engine compatibility check failed before the pin and passes afterward.
- TypeScript stays on 6.0.3 because Astro's checker does not accept TypeScript 7 yet. There is no known vulnerability outstanding in that version.
- Prefer Lighthouse 13's upstream Puppeteer/BiDi updates over forcing Zod 4 underneath a Zod 3 consumer. Both LHCI engine consumers are overridden together; basic-ftp and ProxyAgent retain the consumer APIs exercised above.
- Dependency-only work uses security scans and existing application/consumer tests instead of adding artificial version-string unit tests.
- Biome's newly supported Markdown/YAML formatting requires whitespace-only changes in three existing planning files and the Astro Doctor workflow. No application source changed.
- Non-blocking warnings remain: Astro Doctor flags two static translation `set:html` uses and one existing homepage `<img>`; the production build emits its documented Shiki/CSP warning (the site renders no code blocks).
