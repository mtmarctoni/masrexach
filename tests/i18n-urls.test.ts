import { afterEach, describe, expect, it, vi } from "vitest";
import { alternatePaths, localizedPath } from "../src/i18n";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("canonical page paths", () => {
  it.each([
    ["es", "/", "/"],
    ["ca", "/", "/ca/"],
    ["en", "/", "/en/"],
    ["es", "/catalogo", "/catalogo/"],
    ["ca", "/catalogo", "/ca/catalogo/"],
    ["en", "/catalogo", "/en/catalogo/"],
    ["es", "/catalogo/", "/catalogo/"],
    ["ca", "/catalogo/", "/ca/catalogo/"],
    ["en", "/catalogo/", "/en/catalogo/"],
    ["es", "/catalogo/01-tiestos", "/catalogo/01-tiestos/"],
    ["ca", "/catalogo/01-tiestos", "/ca/catalogo/01-tiestos/"],
    ["en", "/catalogo/01-tiestos", "/en/catalogo/01-tiestos/"],
  ] as const)("links %s %s directly to the directory URL", (locale, path, expected) => {
    expect(localizedPath(locale, path)).toBe(expected);
    expect(localizedPath(locale, path)).not.toContain("//");
  });

  it.each(["es", "ca", "en"] as const)("returns reciprocal alternate URLs from %s", (locale) => {
    expect(alternatePaths(locale, "/biografia")).toEqual({
      "x-default": "/biografia/",
      es: "/biografia/",
      ca: "/ca/biografia/",
      en: "/en/biografia/",
    });
  });

  it("uses the known build origin for absolute canonical URLs", async () => {
    vi.stubEnv("PUBLIC_BUILD_TYPE", "Production");
    vi.stubEnv("PUBLIC_BASE_URL", "https://masrexach.com");
    const { localizedUrl } = await import("../src/i18n");
    expect(localizedUrl("es", "/catalogo")).toBe("https://masrexach.com/catalogo/");
    expect(localizedUrl("en", "/catalogo")).toBe("https://masrexach.com/en/catalogo/");
  });
});
