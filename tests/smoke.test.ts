import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../scripts/smoke.mjs", import.meta.url), "utf8");
const sha = "1234567890abcdef1234567890abcdef12345678";

// Execute the real CLI with only its external boundaries replaced. Timers run
// immediately so stale-build retries do not add a minute to the unit suite.
async function smoke({
  sitemap = "https://masrexach.marctonimas.com/sitemap-index.xml",
  commit = "1234567",
  base = "https://masrexach.marctonimas.com",
  cacheControl = "no-store",
  cspHeader = true,
  cspMeta = false,
} = {}) {
  const errors: string[] = [];
  let exitCode = 0;
  await runInNewContext(source, {
    URL,
    console: { log() {}, error: (message: string) => errors.push(message) },
    process: {
      argv: ["node", "scripts/smoke.mjs", base, sha],
      env: {},
      exit: (code: number) => {
        exitCode = code;
      },
    },
    setTimeout: (callback: () => void) => callback(),
    fetch: async (url: string) => {
      switch (new URL(url).pathname) {
        case "/api/health":
          return Response.json(
            { status: "ok", commit },
            { headers: { "Cache-Control": cacheControl } },
          );
        case "/robots.txt":
          return new Response(
            base.includes("staging") ? "User-agent: *\nDisallow: /\n" : `Sitemap: ${sitemap}\n`,
          );
        default:
          return new Response(
            cspMeta
              ? '<html><head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'"></head></html>'
              : "<html></html>",
            {
              headers: {
                "X-Content-Type-Options": "nosniff",
                ...(cspHeader ? { "Content-Security-Policy": "default-src 'self'" } : {}),
              },
            },
          );
      }
    },
  });
  return { exitCode, errors: errors.join("\n") };
}

describe("deployment smoke CLI", () => {
  it("accepts an HTTPS production sitemap and a short commit matching the full build SHA", async () => {
    expect(await smoke()).toEqual({ exitCode: 0, errors: "" });
  });

  it("rejects duplicate slashes in the sitemap path", async () => {
    const result = await smoke({ sitemap: "https://masrexach.marctonimas.com//sitemap-index.xml" });
    expect(result.exitCode).toBe(1);
    expect(result.errors).toContain("malformed sitemap URL");
  });

  it("accepts Astro's meta CSP when there is no CSP response header", async () => {
    expect(await smoke({ cspHeader: false, cspMeta: true })).toEqual({ exitCode: 0, errors: "" });
  });

  it("rejects a page with neither a CSP header nor a CSP meta tag", async () => {
    const result = await smoke({ cspHeader: false });
    expect(result.exitCode).toBe(1);
    expect(result.errors).toContain("missing Content-Security-Policy");
  });

  it("rejects a sitemap on the wrong host", async () => {
    const result = await smoke({ sitemap: "https://example.com/sitemap-index.xml" });
    expect(result.exitCode).toBe(1);
    expect(result.errors).toContain("sitemap URL host mismatch");
  });

  it("rejects a stale build after retries", async () => {
    const result = await smoke({ commit: "abcdef0" });
    expect(result.exitCode).toBe(1);
    expect(result.errors).toContain("commit abcdef0 != expected 1234567");
  });

  it("rejects a cacheable health response", async () => {
    const result = await smoke({ cacheControl: "public, max-age=3600" });
    expect(result.exitCode).toBe(1);
    expect(result.errors).toContain("health response must be Cache-Control: no-store");
  });

  it("accepts staging robots without a sitemap", async () => {
    expect(await smoke({ base: "https://masrexach-staging.marctonimas.com" })).toEqual({
      exitCode: 0,
      errors: "",
    });
  });
});
