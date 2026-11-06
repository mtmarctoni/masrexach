import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const script = new URL("../scripts/sync-secrets.sh", import.meta.url).pathname;
const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// Runs the real script with a fake wrangler: `secret list` prints the given
// Worker secrets, `secret bulk` records the JSON it was sent.
function sync(github: Record<string, string>, worker: string[]) {
  const dir = mkdtempSync(join(tmpdir(), "sync-secrets-"));
  dirs.push(dir);
  const bulk = join(dir, "bulk.json");
  const fake = join(dir, "wrangler");
  writeFileSync(
    fake,
    `#!/usr/bin/env bash
case "$*" in
  *"secret list"*) echo '${JSON.stringify(worker.map((name) => ({ name, type: "secret_text" })))}' ;;
  *"secret bulk"*) cat > "${bulk}" ;;
esac
`,
  );
  chmodSync(fake, 0o755);
  const result = spawnSync("bash", [script], {
    encoding: "utf8",
    env: { ...process.env, WRANGLER_BIN: fake, SECRETS_CONTEXT: JSON.stringify(github) },
  });
  let sent: Record<string, string | null> | undefined;
  try {
    sent = JSON.parse(readFileSync(bulk, "utf8"));
  } catch {
    sent = undefined;
  }
  return { status: result.status, stderr: result.stderr, sent };
}

describe("sync-secrets.sh", () => {
  it("sends only managed secrets, ignoring other GitHub secrets", () => {
    const { status, sent } = sync(
      {
        RESEND_API_KEY: "re_123",
        NPM_TOKEN: "npm",
        CLOUDFLARE_API_TOKEN: "cf",
        GITHUB_TOKEN: "gh",
      },
      [],
    );
    expect(status).toBe(0);
    expect(sent).toEqual({ RESEND_API_KEY: "re_123" });
  });

  it("leaves unmanaged Worker secrets alone and warns about them", () => {
    const { status, sent, stderr } = sync({ RESEND_API_KEY: "re_123" }, [
      "RESEND_API_KEY",
      "HAND_SET_SECRET",
    ]);
    expect(status).toBe(0);
    expect(sent).toEqual({ RESEND_API_KEY: "re_123" });
    expect(stderr).toContain("HAND_SET_SECRET");
  });

  it("skips the sync when no managed secret is in the context", () => {
    const { status, sent, stderr } = sync({ NPM_TOKEN: "npm" }, ["RESEND_API_KEY"]);
    expect(status).toBe(0);
    expect(sent).toBeUndefined();
    expect(stderr).toContain("skipping sync");
  });
});
