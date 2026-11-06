import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("release configuration", () => {
  it.each(["production", "staging", "preview"])(
    "%s reads the account ID from GitHub variables",
    (environment) => {
      const workflow = read(`.github/workflows/deploy-${environment}.yml`);
      // biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression
      expect(workflow).toContain("CLOUDFLARE_ACCOUNT_ID: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}");
      expect(workflow).not.toContain("secrets.CLOUDFLARE_ACCOUNT_ID");
    },
  );

  it("targets the apex in production smoke and CI builds", () => {
    expect(read(".github/workflows/deploy-production.yml")).toContain(
      "node scripts/smoke.mjs https://masrexach.com",
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

  it("serializes release maintenance in its own concurrency group", () => {
    expect(wf().concurrency.group).not.toBe("deploy-production");
    expect(wf().concurrency["cancel-in-progress"]).toBe(false);
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
