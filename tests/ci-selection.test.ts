import { expect, it } from "vitest";
import { needsBrowserTests } from "../scripts/ci-selection.mjs";

it("skips browser coverage only for known unrelated paths", () => {
  expect(needsBrowserTests(["docs/security.md", "src/pages/api/health.ts"])).toBe(false);
  expect(needsBrowserTests([])).toBe(true);
  expect(needsBrowserTests(null)).toBe(true);
});

it.each([
  ".nvmrc",
  ".npmrc",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "scripts/og/render.ts",
  "src/assets/fonts/a.woff2",
  "src/assets/images/a.jpg",
  "src/data/artworks.ts",
  "src/i18n/en.ts",
  "src/lib/og.ts",
  "package.json",
  "pnpm-lock.yaml",
  "astro.config.mjs",
  "tests/og-render.test.ts",
  ".github/workflows/ci.yml",
  "scripts/ci-selection.mjs",
])("enables browser coverage for changed, deleted or renamed input %s", (path) => {
  expect(needsBrowserTests(["docs/security.md", path])).toBe(true);
});
