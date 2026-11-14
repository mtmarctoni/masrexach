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
    vars?: Record<string, unknown>;
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
    stdout: result.stdout,
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
  // Characterizes Wrangler's real output: config vars are visible, CLI vars
  // are hidden. No remote API calls or actual deployment occur in a dry run.
  it("hides CLI runtime variables in Wrangler's binding summary", () => {
    const dir = mkdtempSync(join(tmpdir(), "wrangler-output-test-"));
    dirs.push(dir);
    writeFileSync(
      join(dir, "worker.mjs"),
      'export default { fetch() { return new Response("ok"); } };',
    );
    writeFileSync(
      join(dir, "wrangler.json"),
      JSON.stringify({ name: "output-test", main: "worker.mjs", compatibility_date: "2026-08-04" }),
    );
    const value = "synthetic-private-recipient@example.com";
    const result = spawnSync(
      process.execPath,
      [
        scriptPath("../node_modules/wrangler/bin/wrangler.js"),
        "deploy",
        "--dry-run",
        "--config",
        join(dir, "wrangler.json"),
        "--var",
        `CONTACT_TO_EMAIL:${value}`,
      ],
      { encoding: "utf8", env: { ...process.env, CI: "true", WRANGLER_SEND_METRICS: "false" } },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("CONTACT_TO_EMAIL");
    expect(result.stdout).toContain("(hidden)");
    expect(result.stdout + result.stderr).not.toContain(value);
  }, 30_000);

  it("logs runtime variable names without values", () => {
    const vars = {
      CONTACT_FROM_EMAIL: "Synthetic Sender <sender@example.com>",
      CONTACT_TO_EMAIL: "private-recipient@example.com",
    };
    const { status, stdout, stderr, deployArgs } = run("deploy.sh", [], {
      github: allSecrets,
      vars,
    });
    expect(status).toBe(0);
    for (const [key, value] of Object.entries(vars)) {
      expect(deployArgs).toContain(`${key}:${value}`);
      expect(stdout).toContain(key);
      expect(stdout + stderr).not.toContain(value);
    }
  });

  it("does not deploy unrelated GitHub variables", () => {
    const { status, deployArgs, stdout, stderr } = run("deploy.sh", [], {
      github: allSecrets,
      vars: { CONTACT_TO_EMAIL: "owner@example.com", INTERNAL_SETTING: "private-config" },
    });
    expect(status).toBe(0);
    expect(deployArgs).toContain("CONTACT_TO_EMAIL:owner@example.com");
    expect(deployArgs).not.toContain("INTERNAL_SETTING");
    expect(stdout + stderr).not.toContain("private-config");
  });

  it("never overwrites a populated secret with a runtime variable", () => {
    const { status, deployArgs, stderr } = run("deploy.sh", [], {
      github: { ...allSecrets, CONTACT_TO_EMAIL: "secret@example.com" },
      vars: { CONTACT_TO_EMAIL: "plain@example.com", CONTACT_FROM_EMAIL: "from@example.com" },
    });
    expect(status).toBe(0);
    expect(deployArgs).not.toContain("CONTACT_TO_EMAIL:");
    expect(deployArgs).toContain("CONTACT_FROM_EMAIL:from@example.com");
    expect(stderr).toContain("same name");
  });

  it.each(["", "first\nsecond", 12, null, { private: true }])(
    "ignores an unsupported runtime variable value %j",
    (value) => {
      const { status, deployArgs } = run("deploy.sh", [], {
        github: allSecrets,
        vars: { CONTACT_TO_EMAIL: value },
      });
      expect(status).toBe(0);
      expect(deployArgs).not.toContain("--var");
    },
  );

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
