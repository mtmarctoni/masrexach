import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parse } from "yaml";

const workflow = (name: string) => parse(readFileSync(`.github/workflows/${name}.yml`, "utf8"));

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

it("offers manual full Lighthouse and retains five Slow 4G audit URLs", () => {
  const config = JSON.parse(readFileSync(".lighthouserc.json", "utf8"));
  expect(config.ci.collect.url).toHaveLength(5);
  expect(config.ci.collect.settings.throttling.cpuSlowdownMultiplier).toBe(4);
  expect(workflow("lighthouse").on).toHaveProperty("workflow_dispatch");
  const routine = readFileSync("lighthouse-routine.cjs", "utf8");
  expect(routine).toContain('require("./.lighthouserc.json")');
  expect(routine).toContain("http://localhost/catalogo/07-albufera/");
});
