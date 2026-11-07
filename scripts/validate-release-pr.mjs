import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function validateRelease({ files, before, after, manifest, changelog }) {
  assert.deepEqual([...files].sort(), [
    ".release-please-manifest.json",
    "CHANGELOG.md",
    "package.json",
  ]);
  const { version: oldVersion, ...oldPackage } = before;
  const { version, ...newPackage } = after;
  assert.deepEqual(newPackage, oldPackage, "Only package.json version may change");
  assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  assert.notEqual(version, oldVersion, "Version must change");
  assert.deepEqual(manifest, { ".": version });
  assert.ok(
    changelog.split("\n").some((line) => line.startsWith(`## [${version}](`)),
    "Missing release changelog heading",
  );
  assert.ok(changelog.endsWith("\n"), "Changelog must end with a newline");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [base, head] = process.argv.slice(2);
  const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
  const ancestor = git("merge-base", base, head).trim();
  const read = (ref, file) => git("show", `${ref}:${file}`);
  const json = (file) => {
    const raw = read(head, file);
    const value = JSON.parse(raw);
    assert.equal(
      raw,
      `${JSON.stringify(value, null, 2)}\n`,
      `${file} must use two-space JSON formatting`,
    );
    return value;
  };
  validateRelease({
    files: git("diff", "--name-only", "-z", ancestor, head).split("\0").filter(Boolean),
    before: JSON.parse(read(ancestor, "package.json")),
    after: json("package.json"),
    manifest: json(".release-please-manifest.json"),
    changelog: read(head, "CHANGELOG.md"),
  });
  git("diff", "--check", ancestor, head);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "is_release=true\n");
  console.log("Release metadata is valid.");
}
