// biome-ignore-all lint/suspicious/noTemplateCurlyInString: GitHub Actions expressions are literal strings here
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("release configuration", () => {
  it.each(["production", "staging", "preview"])(
    "%s reads the account ID from GitHub variables",
    (environment) => {
      const workflow = read(`.github/workflows/deploy-${environment}.yml`);
      expect(workflow).toContain("CLOUDFLARE_ACCOUNT_ID: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}");
      expect(workflow).not.toContain("secrets.CLOUDFLARE_ACCOUNT_ID");
    },
  );

  it("targets the apex in production smoke and CI builds", () => {
    expect(read(".github/workflows/deploy-production.yml")).toContain(
      "scripts/smoke.mjs https://masrexach.com",
    );
    expect(read(".github/workflows/ci.yml")).toContain("PUBLIC_BASE_URL: https://masrexach.com");
  });
});

// biome-ignore lint/suspicious/noExplicitAny: parsed workflow YAML is untyped
type Workflow = any;
const workflow = (name: string): Workflow => parse(read(`.github/workflows/${name}.yml`));
const json = (path: string) => JSON.parse(read(path));
const BASELINE_SHA = "c24b7008ec2ec775c6e0d26e1fcc3f7eeababeee";
const PINNED = /^[\w.-]+\/[\w.-]+(\/[\w./-]+)?@[0-9a-f]{40}$/;

describe("release please configuration", () => {
  it("starts the root package at 1.0.0", () => {
    expect(json(".release-please-manifest.json")).toEqual({ ".": "1.0.0" });
  });

  it("uses the node strategy with unprefixed vX.Y.Z tags", () => {
    const config = json("release-please-config.json");
    expect(config.packages["."]["release-type"]).toBe("node");
    expect(config["include-component-in-tag"]).toBe(false);
    expect(config["include-v-in-tag"]).not.toBe(false);
    expect(config.packages["."]["release-as"]).toBeUndefined();
    expect(config["release-as"]).toBeUndefined();
  });

  it("excludes history up to the approved baseline commit", () => {
    expect(json("release-please-config.json")["bootstrap-sha"]).toBe(BASELINE_SHA);
  });
});

describe("release please workflow", () => {
  const exists = existsSync(new URL("../.github/workflows/release-please.yml", import.meta.url));
  const wf = () => workflow("release-please");

  it("exists", () => {
    expect(exists).toBe(true);
  });

  it("runs only on pushes to main, read-only by default", () => {
    expect(wf().on).toEqual({ push: { branches: ["main"] } });
    expect(wf().permissions).toEqual({ contents: "read" });
  });

  it("serializes release maintenance in its own job-level concurrency group", () => {
    // Job-level, so a production deploy (or its approval wait) in the same run
    // never holds up release-PR maintenance, and vice versa.
    expect(wf().concurrency).toBeUndefined();
    expect(wf().jobs.release.concurrency).toEqual({
      group: "release-please",
      "cancel-in-progress": false,
    });
  });

  it("authenticates with a repository-scoped App token from RELEASE_APP_*", () => {
    const steps = wf().jobs.release.steps;
    const token = steps.find((s: Workflow) =>
      String(s.uses).startsWith("actions/create-github-app-token@"),
    );
    expect(token.uses).toMatch(PINNED);
    expect(token.with["app-id"]).toBe("${{ vars.RELEASE_APP_ID }}");
    expect(token.with["private-key"]).toBe("${{ secrets.RELEASE_APP_PRIVATE_KEY }}");
    expect(token.with.repositories).toBe("${{ github.event.repository.name }}");
    const rp = steps.find((s: Workflow) =>
      String(s.uses).startsWith("googleapis/release-please-action@"),
    );
    expect(rp.uses).toMatch(PINNED);
    expect(rp.with.token).toBe(`\${{ steps.${token.id}.outputs.token }}`);
  });

  it("exports release_created, tag_name and sha from the root component", () => {
    const job = wf().jobs.release;
    const rp = job.steps.find((s: Workflow) =>
      String(s.uses).startsWith("googleapis/release-please-action@"),
    );
    expect(job.outputs).toEqual({
      release_created: `\${{ steps.${rp.id}.outputs.release_created }}`,
      tag_name: `\${{ steps.${rp.id}.outputs.tag_name }}`,
      sha: `\${{ steps.${rp.id}.outputs.sha }}`,
    });
  });

  it("guards any production call on release_created", () => {
    const jobs = wf().jobs;
    const callers = Object.values(jobs).filter((j: Workflow) =>
      String(j.uses ?? "").includes("deploy-production.yml"),
    );
    for (const caller of callers) {
      expect((caller as Workflow).if).toBe(
        "${{ needs.release.outputs.release_created == 'true' }}",
      );
    }
  });
});

describe("release to production wiring", () => {
  const wf = () => workflow("release-please");
  const caller = () =>
    Object.values(wf().jobs).filter((j: Workflow) =>
      String(j.uses ?? "").includes("deploy-production.yml"),
    ) as Workflow[];

  it("calls the production workflow exactly once, guarded on release_created", () => {
    expect(caller()).toHaveLength(1);
    expect(caller()[0].uses).toBe("./.github/workflows/deploy-production.yml");
    expect(caller()[0].needs).toBe("release");
    expect(caller()[0].if).toBe("${{ needs.release.outputs.release_created == 'true' }}");
  });

  it("passes the released tag and commit", () => {
    expect(caller()[0].with).toEqual({
      release_tag: "${{ needs.release.outputs.tag_name }}",
      release_sha: "${{ needs.release.outputs.sha }}",
    });
  });

  it("passes only the deploy secrets, never inherit (keeps the App key out)", () => {
    expect(caller()[0].secrets).toEqual({
      CLOUDFLARE_API_TOKEN: "${{ secrets.CLOUDFLARE_API_TOKEN }}",
      RESEND_API_KEY: "${{ secrets.RESEND_API_KEY }}",
    });
  });
});

describe("production deploy workflow", () => {
  const wf = () => workflow("deploy-production");
  const raw = () => read(".github/workflows/deploy-production.yml");
  const steps = (job: string): Workflow[] => wf().jobs[job].steps;
  const step = (job: string, pred: (s: Workflow) => boolean) => steps(job).find(pred);
  const SHA = "${{ needs.resolve.outputs.sha }}";

  it("is triggered only manually (by tag) or by the release workflow", () => {
    const on = wf().on;
    expect(Object.keys(on).sort()).toEqual(["workflow_call", "workflow_dispatch"]);
    expect(on.workflow_dispatch.inputs).toEqual({
      release_tag: expect.objectContaining({ required: true, type: "string" }),
    });
    expect(on.workflow_call.inputs).toEqual({
      release_tag: expect.objectContaining({ required: true, type: "string" }),
      release_sha: expect.objectContaining({ required: true, type: "string" }),
    });
    expect(on.workflow_call.secrets.CLOUDFLARE_API_TOKEN.required).toBe(true);
  });

  it("resolves the tag with the resolver, passing inputs only through env", () => {
    const resolve = step("resolve", (s) => s.run === "./scripts/resolve-release.sh");
    expect(resolve.env).toEqual(
      expect.objectContaining({
        RELEASE_TAG: "${{ inputs.release_tag }}",
        EXPECTED_SHA: "${{ inputs.release_sha }}",
      }),
    );
    expect(wf().jobs.resolve.outputs.sha).toBe(`\${{ steps.${resolve.id}.outputs.sha }}`);
    for (const job of Object.values(wf().jobs) as Workflow[]) {
      for (const s of job.steps) expect(String(s.run ?? "")).not.toMatch(/\$\{\{\s*inputs\./);
    }
  });

  it("refuses to run outside main before resolving", () => {
    const first = steps("resolve")[0];
    expect(first.if).toBe("github.ref != 'refs/heads/main'");
  });

  it("never persists checkout credentials", () => {
    for (const job of Object.values(wf().jobs) as Workflow[]) {
      for (const s of job.steps.filter((x: Workflow) =>
        String(x.uses).startsWith("actions/checkout@"),
      )) {
        expect(s.with?.["persist-credentials"]).toBe(false);
      }
    }
  });

  it("deploys in the production environment, serialized without cancellation", () => {
    const deploy = wf().jobs.deploy;
    expect(deploy.needs).toBe("resolve");
    expect(deploy.environment).toBe("production");
    expect(deploy.concurrency).toEqual({ group: "deploy-production", "cancel-in-progress": false });
  });

  it("builds the resolved release commit and stamps it into the build", () => {
    const checkout = step(
      "deploy",
      (s) => String(s.uses).startsWith("actions/checkout@") && !s.with?.path,
    );
    expect(checkout.with.ref).toBe(SHA);
    expect(step("deploy", (s) => s.name === "Build").env.BUILD_SHA).toBe(SHA);
    expect(read("astro.config.mjs")).toContain("process.env.BUILD_SHA ?? process.env.GITHUB_SHA");
  });

  it("runs deploy tooling from the trusted triggering commit, not the release", () => {
    const tools = step(
      "deploy",
      (s) => String(s.uses).startsWith("actions/checkout@") && s.with?.path,
    );
    expect(tools.with.ref).toBe("${{ github.sha }}");
    const dir = tools.with.path;
    expect(step("deploy", (s) => s.name === "Deploy Worker").run).toBe(`${dir}/scripts/deploy.sh`);
    expect(step("deploy", (s) => s.name === "Remove stale secrets").run).toBe(
      `${dir}/scripts/sync-secrets.sh --prune`,
    );
  });

  it("smoke-tests against the resolved release commit", () => {
    const smoke = step("deploy", (s) => s.name === "Smoke test");
    expect(smoke.env.RELEASE_SHA).toBe(SHA);
    expect(smoke.run).toContain('"$RELEASE_SHA"');
    expect(smoke.run).not.toContain("GITHUB_SHA");
    expect(smoke["continue-on-error"]).toBeUndefined();
    expect(raw()).toContain("scripts/smoke.mjs https://masrexach.com");
  });
});
