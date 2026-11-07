import { describe, expect, it } from "vitest";
import { validateRelease } from "../scripts/validate-release-pr.mjs";

const before = { name: "site", version: "1.2.0", private: true };
const after = { ...before, version: "1.3.0" };
const files = ["package.json", ".release-please-manifest.json", "CHANGELOG.md"];
const validate = (overrides = {}) =>
  validateRelease({
    files,
    before,
    after,
    manifest: { ".": "1.3.0" },
    changelog: "# Changelog\n\n## [1.3.0](https://example.com) (2026-11-07)\n",
    ...overrides,
  });

describe("release PR validation", () => {
  it("accepts a version-only release", () => {
    expect(() => validate()).not.toThrow();
  });
  it("rejects unexpected files and missing release files", () => {
    expect(() => validate({ files: [...files, "src/index.ts"] })).toThrow();
    expect(() => validate({ files: ["package.json"] })).toThrow();
  });
  it("rejects dependency changes hidden in package.json", () => {
    expect(() => validate({ after: { ...after, dependencies: { astro: "*" } } })).toThrow();
  });
  it("rejects mismatched versions, unchanged versions, and missing changelog entries", () => {
    expect(() => validate({ manifest: { ".": "1.2.0" } })).toThrow();
    expect(() => validate({ after: before })).toThrow();
    expect(() => validate({ changelog: "# Changelog\n" })).toThrow();
    expect(() => validate({ after: { ...before, version: "invalid" } })).toThrow();
  });
});
