import { describe, expect, it } from "vitest";
import { isIndexablePath, isIndexableUrl } from "../src/lib/seo";

describe("isIndexablePath", () => {
  it("indexes regular routes", () => {
    expect(isIndexablePath("/")).toBe(true);
    expect(isIndexablePath("/catalogo")).toBe(true);
    expect(isIndexablePath("/catalogo/una-obra")).toBe(true);
    expect(isIndexablePath("/contacto")).toBe(true);
  });

  it("never indexes centralized noindex paths", () => {
    expect(isIndexablePath("/404")).toBe(false);
    expect(isIndexablePath("/500")).toBe(false);
    expect(isIndexablePath("/legal")).toBe(false);
  });

  it("never indexes noindex prefixes", () => {
    expect(isIndexablePath("/api")).toBe(false);
    expect(isIndexablePath("/api/health")).toBe(false);
    expect(isIndexablePath("/api/some/deep/route")).toBe(false);
  });

  it("normalizes trailing slashes and query strings", () => {
    expect(isIndexablePath("/legal/")).toBe(false);
    expect(isIndexablePath("/legal?utm_source=x")).toBe(false);
    expect(isIndexablePath("/catalogo/")).toBe(true);
  });
});

describe("isIndexableUrl", () => {
  it("matches sitemap URLs including localized variants", () => {
    expect(isIndexableUrl("https://masrexach.test/legal")).toBe(false);
    expect(isIndexableUrl("https://masrexach.test/ca/legal/")).toBe(false);
    expect(isIndexableUrl("https://masrexach.test/en/legal/")).toBe(false);
    expect(isIndexableUrl("https://masrexach.test/api/health")).toBe(false);
  });

  it("keeps composed sitemap URLs indexable", () => {
    expect(isIndexableUrl("https://masrexach.test/")).toBe(true);
    expect(isIndexableUrl("https://masrexach.test/ca/")).toBe(true);
    expect(isIndexableUrl("https://masrexach.test/catalogo/")).toBe(true);
    expect(isIndexableUrl("https://masrexach.test/en/catalogo/una-obra/")).toBe(true);
  });
});
