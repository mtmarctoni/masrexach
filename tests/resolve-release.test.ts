import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const script = new URL("../scripts/resolve-release.sh", import.meta.url).pathname;
const SHA = "a".repeat(40);
const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

type Remote = {
  release?: { draft: boolean; prerelease: boolean } | null;
  commit?: string;
  compare?: string;
};

// Runs the real resolver against a fake `gh` that answers the three API calls
// from `remote`, and logs every argument list it receives.
function resolve(
  tag: string,
  { release = { draft: false, prerelease: false }, commit = SHA, compare = "ahead" }: Remote = {},
  expectedSha?: string,
) {
  const dir = mkdtempSync(join(tmpdir(), "resolve-release-test-"));
  dirs.push(dir);
  const fake = join(dir, "gh");
  const log = join(dir, "calls");
  writeFileSync(
    fake,
    `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "${log}"
case "$*" in
  *releases/tags/*) ${release ? `echo '${JSON.stringify(release)}'` : 'echo "HTTP 404" >&2; exit 1'} ;;
  *commits/*) echo '${commit}' ;;
  *compare/*) echo '${compare}' ;;
  *) exit 2 ;;
esac
`,
  );
  chmodSync(fake, 0o755);
  const output = join(dir, "github-output");
  const result = spawnSync("bash", [script], {
    encoding: "utf8",
    env: {
      ...process.env,
      GH_BIN: fake,
      GITHUB_REPOSITORY: "owner/repo",
      GITHUB_OUTPUT: output,
      RELEASE_TAG: tag,
      EXPECTED_SHA: expectedSha ?? "",
    },
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    output: existsSync(output) ? readFileSync(output, "utf8") : "",
    calls: existsSync(log) ? readFileSync(log, "utf8") : "",
  };
}

describe("resolve-release.sh", () => {
  it("resolves a stable release on main to its commit", () => {
    const { status, stdout, output } = resolve("v1.2.3");
    expect(status).toBe(0);
    expect(stdout.trim()).toBe(`sha=${SHA}`);
    expect(output.trim()).toBe(`sha=${SHA}`);
  });

  it("accepts the release commit when it is main HEAD", () => {
    expect(resolve("v1.0.0", { compare: "identical" }).status).toBe(0);
  });

  it.each(["1.2.3", "v1.2", "v01.2.3", "v1.2.3-rc.1", "v1.2.3 ", "v1.2.3;id", "$(id)", "main", ""])(
    "rejects tag %j before calling GitHub",
    (tag) => {
      const { status, stderr, calls } = resolve(tag);
      expect(status).toBe(1);
      expect(stderr).toMatch(/tag/i);
      expect(calls).toBe("");
    },
  );

  it("rejects a tag with no GitHub release", () => {
    const { status, stderr } = resolve("v1.2.3", { release: null });
    expect(status).toBe(1);
    expect(stderr).toMatch(/release/i);
  });

  it.each([
    { draft: true, prerelease: false },
    { draft: false, prerelease: true },
  ])("rejects a release that is %o", (release) => {
    expect(resolve("v1.2.3", { release }).status).toBe(1);
  });

  it("rejects a tag that does not resolve to a full commit", () => {
    expect(resolve("v1.2.3", { commit: "abc123" }).status).toBe(1);
  });

  it("rejects a commit that differs from the expected release SHA", () => {
    const { status, stderr } = resolve("v1.2.3", {}, "b".repeat(40));
    expect(status).toBe(1);
    expect(stderr).toMatch(/expected/i);
  });

  it("accepts a commit equal to the expected release SHA", () => {
    expect(resolve("v1.2.3", {}, SHA).status).toBe(0);
  });

  it.each(["behind", "diverged"])("rejects a commit outside main history (%s)", (compare) => {
    const { status, stderr } = resolve("v1.2.3", { compare });
    expect(status).toBe(1);
    expect(stderr).toMatch(/main/i);
  });
});
