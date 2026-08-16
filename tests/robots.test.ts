import { afterEach, describe, expect, it, vi } from "vitest";
import { robotsDirective, robotsTxt } from "../src/lib/robots";

afterEach(() => vi.unstubAllEnvs());

describe("robotsDirective", () => {
  it("indexes indexable pages only in production", () => {
    vi.stubEnv("PUBLIC_BUILD_TYPE", "Production");
    expect(robotsDirective(true)).toBe("index, follow");
  });

  it("noindexes non-indexable pages even in production", () => {
    vi.stubEnv("PUBLIC_BUILD_TYPE", "Production");
    expect(robotsDirective(false)).toBe("noindex, nofollow");
  });

  it.each(["Preview", "Staging", undefined])(
    "noindexes everything outside production (%s)",
    (buildType) => {
      if (buildType !== undefined) vi.stubEnv("PUBLIC_BUILD_TYPE", buildType);
      expect(robotsDirective(true)).toBe("noindex, nofollow");
    },
  );
});

describe("robotsTxt", () => {
  it("production allows crawling and references the sitemap", () => {
    const txt = robotsTxt(true);
    expect(txt).toContain("Disallow: /api/");
    expect(txt).toContain("Sitemap: https://masrexach.marctonimas.com/sitemap-index.xml");
  });

  it("non-production blocks all crawling and omits the sitemap", () => {
    expect(robotsTxt(false)).toBe("User-agent: *\nDisallow: /\n");
  });
});
