import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("health endpoint", () => {
  it("identifies the build with a short SHA and prevents caching and indexing", async () => {
    vi.stubGlobal("__BUILD_SHA__", "1234567890abcdef1234567890abcdef12345678");
    const { GET, prerender } = await import("../src/pages/api/health");
    const response = GET();

    expect(prerender).toBe(false);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", commit: "1234567" });
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("keeps the local unknown build marker usable", async () => {
    vi.stubGlobal("__BUILD_SHA__", "unknown");
    const { GET } = await import("../src/pages/api/health");
    expect(await GET().json()).toEqual({ status: "ok", commit: "unknown" });
  });
});
