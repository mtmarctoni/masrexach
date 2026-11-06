import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const scriptPath = (name: string) => new URL(`../scripts/${name}`, import.meta.url).pathname;
const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const readJson = (path: string) =>
  existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>)
    : undefined;

// Runs a real script with a fake wrangler that records what it was asked to do:
// `secret list` prints the given Worker secrets, `secret bulk` saves the JSON
// it was sent, and `deploy` saves its arguments plus the --secrets-file content
// (copied while the script still has it, since the script deletes it on exit).
function run(
  script: string,
  args: string[],
  {
    github,
    worker = [],
    vars = {},
    env = { GITHUB_ACTIONS: "true" },
  }: {
    github: Record<string, string>;
    worker?: string[];
    vars?: Record<string, string>;
    env?: Record<string, string>;
  },
) {
  const dir = mkdtempSync(join(tmpdir(), "worker-secrets-test-"));
  dirs.push(dir);
  const fake = join(dir, "wrangler");
  writeFileSync(
    fake,
    `#!/usr/bin/env bash
case "$*" in
  *"secret list"*) echo '${JSON.stringify(worker.map((name) => ({ name, type: "secret_text" })))}' ;;
  *"secret bulk"*) cat > "${dir}/bulk.json" ;;
  *deploy*)
    printf '%s\\n' "$@" > "${dir}/deploy-args"
    while [ $# -gt 0 ]; do
      if [ "$1" = "--secrets-file" ]; then cp "$2" "${dir}/secrets.json"; fi
      shift
    done ;;
esac
`,
  );
  chmodSync(fake, 0o755);
  const result = spawnSync("bash", [scriptPath(script), ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_ACTIONS: "",
      ALLOW_LOCAL_DEPLOY: "",
      ...env,
      WRANGLER_BIN: fake,
      TMPDIR: dir,
      RUNNER_TEMP: "",
      SECRETS_CONTEXT: JSON.stringify(github),
      VARS_CONTEXT: JSON.stringify(vars),
    },
  });
  const deployArgsPath = join(dir, "deploy-args");
  return {
    status: result.status,
    stderr: result.stderr,
    bulk: readJson(join(dir, "bulk.json")),
    uploaded: readJson(join(dir, "secrets.json")),
    deployArgs: existsSync(deployArgsPath) ? readFileSync(deployArgsPath, "utf8") : undefined,
    leftovers: spawnSync("ls", [dir], { encoding: "utf8" }).stdout,
  };
}

const allSecrets = {
  RESEND_API_KEY: "re_123",
  NPM_TOKEN: "npm",
  CLOUDFLARE_API_TOKEN: "cf",
  GITHUB_TOKEN: "gh",
};

describe("sync-secrets.sh", () => {
  it("sends only managed secrets, ignoring other GitHub secrets", () => {
    const { status, bulk } = run("sync-secrets.sh", [], { github: allSecrets });
    expect(status).toBe(0);
    expect(bulk).toEqual({ RESEND_API_KEY: "re_123" });
  });

  it("leaves unmanaged Worker secrets alone and warns about them", () => {
    const { status, bulk, stderr } = run("sync-secrets.sh", [], {
      github: { RESEND_API_KEY: "re_123" },
      worker: ["RESEND_API_KEY", "HAND_SET_SECRET"],
    });
    expect(status).toBe(0);
    expect(bulk).toEqual({ RESEND_API_KEY: "re_123" });
    expect(stderr).toContain("HAND_SET_SECRET");
  });

  it("skips the sync when no managed secret is in the context", () => {
    const { status, bulk, stderr } = run("sync-secrets.sh", [], {
      github: { NPM_TOKEN: "npm" },
      worker: ["RESEND_API_KEY"],
    });
    expect(status).toBe(0);
    expect(bulk).toBeUndefined();
    expect(stderr).toContain("skipping sync");
  });

  it("makes no write with --prune when nothing is stale", () => {
    const { status, bulk } = run("sync-secrets.sh", ["--prune"], {
      github: { RESEND_API_KEY: "re_123" },
      worker: ["RESEND_API_KEY"],
    });
    expect(status).toBe(0);
    expect(bulk).toBeUndefined();
  });
});

describe("deploy.sh", () => {
  it("uploads only managed secrets with the deploy and removes the file", () => {
    const { status, uploaded, deployArgs, leftovers } = run("deploy.sh", [], {
      github: allSecrets,
    });
    expect(status).toBe(0);
    expect(deployArgs).toContain("--secrets-file");
    expect(uploaded).toEqual({ RESEND_API_KEY: "re_123" });
    expect(leftovers).not.toContain("worker-secrets.");
  });

  it("deploys without a secrets file when no managed secret is set", () => {
    const { status, deployArgs } = run("deploy.sh", [], { github: { NPM_TOKEN: "npm" } });
    expect(status).toBe(0);
    expect(deployArgs).not.toContain("--secrets-file");
  });
});

describe("outside GitHub Actions", () => {
  const local = { GITHUB_ACTIONS: "" };

  it("deploy.sh refuses to deploy", () => {
    const { status, deployArgs, stderr } = run("deploy.sh", [], {
      github: allSecrets,
      env: local,
    });
    expect(status).toBe(1);
    expect(deployArgs).toBeUndefined();
    expect(stderr).toContain("only runs in GitHub Actions");
  });

  it("sync-secrets.sh refuses a full sync", () => {
    const { status, bulk } = run("sync-secrets.sh", [], { github: allSecrets, env: local });
    expect(status).toBe(1);
    expect(bulk).toBeUndefined();
  });

  it("sync-secrets.sh still allows --prune", () => {
    const { status } = run("sync-secrets.sh", ["--prune"], {
      github: { RESEND_API_KEY: "re_123" },
      worker: ["RESEND_API_KEY"],
      env: local,
    });
    expect(status).toBe(0);
  });

  it("ALLOW_LOCAL_DEPLOY=1 overrides the check", () => {
    const { status, deployArgs } = run("deploy.sh", [], {
      github: allSecrets,
      env: { ...local, ALLOW_LOCAL_DEPLOY: "1" },
    });
    expect(status).toBe(0);
    expect(deployArgs).toContain("--secrets-file");
  });
});

// The release GitHub App's credentials (RELEASE_APP_ID variable,
// RELEASE_APP_PRIVATE_KEY secret) are workflow infrastructure and must never
// reach the Worker, as a secret or as a var.
describe("release automation credentials", () => {
  const github = { ...allSecrets, RELEASE_APP_PRIVATE_KEY: "-----BEGIN KEY-----" };
  const vars = { CONTACT_TO_EMAIL: "to@example.com", RELEASE_APP_ID: "123", release_app_x: "y" };

  it("deploy.sh passes app vars but not RELEASE_APP_* vars", () => {
    const { status, deployArgs } = run("deploy.sh", [], { github, vars });
    expect(status).toBe(0);
    expect(deployArgs).toContain("CONTACT_TO_EMAIL:to@example.com");
    expect(deployArgs).not.toMatch(/release_app/i);
  });

  it("deploy.sh never uploads the App key as a secret", () => {
    const { uploaded } = run("deploy.sh", [], { github, vars });
    expect(uploaded).toEqual({ RESEND_API_KEY: "re_123" });
  });

  it("sync-secrets.sh never sends the App key", () => {
    const { bulk } = run("sync-secrets.sh", [], { github, worker: ["RESEND_API_KEY"] });
    expect(bulk).toEqual({ RESEND_API_KEY: "re_123" });
  });
});
