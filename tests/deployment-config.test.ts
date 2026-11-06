import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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
