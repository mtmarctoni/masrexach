import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";
import { parse } from "yaml";

it.each([
  ["fast", "1", "1"],
  ["changed", "0", "1"],
  ["changed", "1", ""],
  ["changed", "", ""],
])("runs %s with selector %s and skip flag %s", (mode, selected, skip) => {
  const dir = mkdtempSync(join(tmpdir(), "test-runner-"));
  try {
    for (const [name, body] of Object.entries({
      node: 'printf "%s" "$SELECTED"',
      pnpm: 'printf "%s|%s" "$SKIP_OG_BROWSER_TESTS" "$*"; exit 42',
    })) {
      const file = join(dir, name);
      writeFileSync(file, `#!/bin/sh\n${body}\n`);
      chmodSync(file, 0o755);
    }
    const result = spawnSync(
      "/bin/bash",
      [resolve("scripts/test.sh"), mode, "tests/og-render.test.ts"],
      {
        encoding: "utf8",
        env: { ...process.env, PATH: dir, SELECTED: selected, SKIP_OG_BROWSER_TESTS: "1" },
      },
    );
    expect(result.status, result.stderr).toBe(42);
    expect(result.stdout).toBe(`${skip}|exec vitest run tests/og-render.test.ts`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("exposes reusable scripts and keeps CI orchestration out of YAML", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  expect(pkg.scripts["test:fast"]).toBe("bash scripts/test.sh fast");
  expect(pkg.scripts["test:changed"]).toBe("bash scripts/test.sh changed");
  expect(pkg.scripts.test).toBe("vitest run");
  const ci = parse(readFileSync(".github/workflows/ci.yml", "utf8"));
  expect(
    ci.jobs.quality.steps.find((step: { name: string }) => step.name === "Unit tests (Vitest)").run,
  ).toBe("pnpm test:changed");
});
