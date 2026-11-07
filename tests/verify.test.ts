import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";

const dirs: string[] = [];
const commands = [
  "pnpm exec biome ci .",
  "pnpm astro:doctor",
  "pnpm check",
  "pnpm test",
  "pnpm knip",
  "pnpm depcruise",
  "gitleaks git --redact --no-banner --log-opts=--all",
  "pnpm osv",
  "actionlint",
  "pnpm build",
  "pnpm exec vitest run tests/thumbnail-output.test.ts tests/artwork-image-output.test.ts",
  "pnpm test:worker",
  "pnpm exec lhci collect",
  "pnpm exec lhci assert",
  "pnpm build",
  "pnpm test:worker",
];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// The shell orchestration is real; external tools are replaced to test order,
// build environments, and failure propagation without recursively running Vitest.
function run(fail = "", missing = "", failBuildType = "", args = ["--full"]) {
  const dir = mkdtempSync(join(tmpdir(), "verify-test-"));
  dirs.push(dir);
  mkdirSync(join(dir, "scripts"));
  mkdirSync(join(dir, "bin"));
  copyFileSync(new URL("../scripts/verify.sh", import.meta.url), join(dir, "scripts/verify.sh"));
  const log = join(dir, "calls");
  for (const name of ["pnpm", "node", "git", "gitleaks", "osv-scanner", "actionlint"]) {
    if (name === missing) continue;
    writeFileSync(
      join(dir, "bin", name),
      `#!/bin/sh
call='${name}'
if [ "$call" = node ] && [ "$1" = scripts/ci-selection.mjs ]; then echo 1; exit 0; fi
if [ "$#" -gt 0 ]; then call="$call $*"; fi
printf '%s|%s|%s|%s|%s\\n' "$call" "$PUBLIC_BUILD_TYPE" "$PUBLIC_BASE_URL" "$CLOUDFLARE_ENV" "$THUMBNAIL_VERIFY_BUILD" >> "$VERIFY_LOG"
if [ "$call" = "$FAIL_COMMAND" ] && { [ -z "$FAIL_BUILD_TYPE" ] || [ "$PUBLIC_BUILD_TYPE" = "$FAIL_BUILD_TYPE" ]; }; then exit 42; fi
`,
      { mode: 0o755 },
    );
  }
  const result = spawnSync("/bin/bash", [join(dir, "scripts/verify.sh"), ...args], {
    cwd: "/",
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: join(dir, "bin"),
      VERIFY_LOG: log,
      FAIL_COMMAND: fail,
      FAIL_BUILD_TYPE: failBuildType,
      PUBLIC_BUILD_TYPE: "Wrong",
      PUBLIC_BASE_URL: "https://wrong.invalid",
      CLOUDFLARE_ENV: "wrong",
    },
  });
  let calls: string[] = [];
  try {
    calls = readFileSync(log, "utf8").trim().split("\n");
  } catch {
    // Preflight failure must not execute a check.
  }
  return { ...result, calls };
}

it("runs every read-only check with explicit production/staging build environments", () => {
  const result = run();
  expect(result.status, result.stderr).toBe(0);
  expect(result.calls.map((line) => line.split("|")[0])).toEqual(commands);
  expect(result.calls[10].split("|")[4]).toBe("1");
  for (const line of result.calls.slice(9, 14)) {
    expect(line.split("|").slice(1, 4)).toEqual(["Production", "https://masrexach.com", ""]);
  }
  for (const line of result.calls.slice(14)) {
    expect(line.split("|").slice(1, 4)).toEqual([
      "Staging",
      "https://masrexach-staging.marctonimas.com",
      "staging",
    ]);
  }
});

it.each([...new Set(commands)])("blocks and stops after failing check: %s", (command) => {
  const result = run(command);
  expect(result.status).toBe(42);
  expect(result.calls.map((line) => line.split("|")[0])).toEqual(
    commands.slice(0, commands.indexOf(command) + 1),
  );
});

it.each(["pnpm", "node", "git", "gitleaks", "osv-scanner", "actionlint"])(
  "fails before checks when %s is missing",
  (tool) => {
    const result = run("", tool);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(tool);
    expect(result.calls).toEqual([]);
  },
);

it.each(["pnpm build", "pnpm test:worker"])("blocks staging failure: %s", (command) => {
  const result = run(command, "", "Staging");
  expect(result.status).toBe(42);
  expect(result.calls.map((line) => line.split("|")[0])).toEqual(
    commands.slice(0, commands.lastIndexOf(command) + 1),
  );
});

it("wires the pre-push hook to the fast gate and exposes full verification", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  expect(pkg.scripts.verify).toBe("bash scripts/verify.sh");
  expect(pkg.scripts["verify:full"]).toBe("bash scripts/verify.sh --full");
  expect(pkg["simple-git-hooks"]["pre-push"]).toBe("pnpm verify");
});

it("omits Lighthouse from the default pre-push gate", () => {
  const result = run("", "", "", []);
  expect(result.status, result.stderr).toBe(0);
  expect(result.calls.map((line) => line.split("|")[0])).toEqual(
    commands
      .filter((command) => !command.startsWith("pnpm exec lhci"))
      .map((command) => (command === "pnpm test" ? "pnpm test:changed" : command)),
  );
});

it("propagates selective test failures in the default gate", () => {
  expect(run("pnpm test:changed", "", "", []).status).toBe(42);
});

it("rejects unknown verification modes before running checks", () => {
  const result = run("", "", "", ["--unknown"]);
  expect(result.status).not.toBe(0);
  expect(result.calls).toEqual([]);
});
