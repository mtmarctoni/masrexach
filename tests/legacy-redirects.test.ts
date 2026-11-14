import type { APIContext } from "astro";
import { describe, expect, it } from "vitest";
import { getArtwork } from "../src/data/artworks";
import { GET, HEAD, prerender } from "../src/pages/portfolio-item/[...path]";

const known = [
  ["nenufares", "nenufares"],
  ["311", "fuente-y-canal"],
  ["badaluc", "badaluc"],
  ["orient", "orient-panoramico"],
  ["tiestos", "tiestos-acrilico"],
  ["esporlas", "esporlas"],
  ["albufera", "albufera"],
  ["225", "rincon-jardin"],
  ["fonollasa", "fonollasa"],
  ["atardecer", "atardecer"],
  ["cipreses-en-el-lago", "cipreses-en-el-lago"],
];

function context(path: string, host = "masrexach.com") {
  return { url: new URL(`https://${host}${path}`) } as APIContext;
}

describe("legacy painting redirects", () => {
  it("runs on demand", () => expect(prerender).toBe(false));

  it.each(known)("redirects %s directly to an existing artwork", (old, slug) => {
    expect(getArtwork(slug)).toBeDefined();
    for (const host of ["masrexach.com", "www.masrexach.com"]) {
      for (const suffix of ["", "/"]) {
        const response = GET(context(`/portfolio-item/${old}${suffix}`, host));
        expect(response.status).toBe(301);
        expect(response.headers.get("Location")).toBe(`/catalogo/${slug}/`);
      }
    }
  });

  it.each([
    "/portfolio-item",
    "/portfolio-item/",
    "/portfolio-item/unknown",
    "/portfolio-item/unknown/",
    "/portfolio-item/unknown/nested/",
    "/portfolio-item/nenufares/extra/",
    "/portfolio-item/__proto__/",
    "/portfolio-item/constructor/",
    "/portfolio-item/%E0%A4%A/",
    "/portfolio-item/https://evil.example/",
  ])("falls back safely for %s", (path) => {
    const response = GET(context(path));
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("/catalogo/");
  });

  it.each(["nenufares", "unknown"])("preserves query strings for %s", (slug) => {
    const query = "?utm_source=google&redirect=https%3A%2F%2Fevil.example";
    const response = GET(context(`/portfolio-item/${slug}/${query}`));
    const destination = slug === "nenufares" ? "/catalogo/nenufares/" : "/catalogo/";
    expect(response.headers.get("Location")).toBe(destination + query);
    expect(new URL(response.headers.get("Location") ?? "", "https://masrexach.com").host).toBe(
      "masrexach.com",
    );
  });

  it("supports HEAD without a body", async () => {
    const response = HEAD(context("/portfolio-item/nenufares/"));
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("/catalogo/nenufares/");
    expect(await response.text()).toBe("");
  });
});
