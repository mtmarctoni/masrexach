import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, it } from "vitest";
import { parse } from "yaml";

const workflow = (name: string) => parse(readFileSync(`.github/workflows/${name}.yml`, "utf8"));

it("pins all external actions and keeps untrusted PR triggers secret-free", () => {
  for (const file of readdirSync(".github/workflows").filter((file) => file.endsWith(".yml"))) {
    const config = parse(readFileSync(`.github/workflows/${file}`, "utf8"));
    expect(config.on, file).not.toHaveProperty("pull_request_target");
    for (const job of Object.values(config.jobs) as {
      uses?: string;
      secrets?: unknown;
      steps?: { uses?: string }[];
    }[]) {
      expect(job.secrets, file).not.toBe("inherit");
      for (const action of [job, ...(job.steps ?? [])]) {
        if (action.uses && !action.uses.startsWith("./")) {
          expect(action.uses, file).toMatch(/@[a-f0-9]{40}$/);
        }
      }
    }
  }
});

it("excludes the font license after including source paths in Lighthouse triggers", () => {
  const paths: string[] = workflow("lighthouse").on.pull_request.paths;
  expect(paths).toContain("!src/assets/fonts/OFL.txt");
  expect(paths.indexOf("!src/assets/fonts/OFL.txt")).toBeGreaterThan(paths.indexOf("src/**"));
  // Keep the exception narrow: real font, content and image changes still trigger audits.
  expect(paths.filter((path) => path.startsWith("!"))).toEqual(["!src/assets/fonts/OFL.txt"]);
});

it("keeps optional link-check setup failures non-blocking but Lighthouse failures blocking", () => {
  const steps = workflow("lighthouse").jobs.lighthouse.steps;
  const links = steps.find(
    (step: { name: string }) => step.name === "Internal link check (non-blocking)",
  );
  expect(links["continue-on-error"]).toBe(true);
  expect(links.with.fail).toBe(false);
  const audit = steps.find(
    (step: { name: string }) => step.name === "Lighthouse CI (mobile emulation)",
  );
  expect(audit["continue-on-error"]).not.toBe(true);
  expect(workflow("lighthouse").jobs.lighthouse["continue-on-error"]).not.toBe(true);
});

it.each(["lighthouse", "deploy-preview"])(
  "filters optional %s jobs to deploy-relevant changes",
  (name) => {
    const paths = workflow(name).on.pull_request.paths;
    for (const path of [
      "pnpm-workspace.yaml",
      "tsconfig.json",
      "src/**",
      "public/**",
      "scripts/**",
      "package.json",
      "pnpm-lock.yaml",
      "astro.config.*",
    ]) {
      expect(paths).toContain(path);
    }
    expect(paths).not.toContain("docs/**");
    expect(paths).toContain(`.github/workflows/${name}.yml`);
  },
);

it("offers the configured full Lighthouse audit and shares Slow 4G settings with routine runs", () => {
  const config = JSON.parse(readFileSync(".lighthouserc.json", "utf8"));
  expect(config.ci.collect.settings.throttling.cpuSlowdownMultiplier).toBe(4);
  expect(workflow("lighthouse").on).toHaveProperty("workflow_dispatch");
  const require = createRequire(import.meta.url);
  const routine = require("../lighthouse-routine.cjs");
  expect(routine.ci.collect.url).toEqual([
    "http://localhost/",
    "http://localhost/catalogo/",
    "http://localhost/catalogo/07-albufera/",
  ]);
  expect(config.ci.collect.url).toEqual(expect.arrayContaining(routine.ci.collect.url));
  expect(routine.ci.collect.settings).toEqual(config.ci.collect.settings);
  expect(routine.ci.assert).toEqual(config.ci.assert);
  const auditStep = workflow("lighthouse").jobs.lighthouse.steps.find(
    (step: { name: string }) => step.name === "Lighthouse CI (mobile emulation)",
  );
  expect(auditStep.run).toContain(
    'if [ "$EVENT_NAME" = "workflow_dispatch" ]; then\n  pnpm lighthouse',
  );
  // Reading the routine configuration must not change the on-disk full audit.
  expect(JSON.parse(readFileSync(".lighthouserc.json", "utf8"))).toEqual(config);
});
