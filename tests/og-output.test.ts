import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { artworks } from "../src/data/artworks";

// Explicit opt-in: ordinary unit tests must not depend on a stale dist/ tree.
// pnpm test:og runs after a build with the same PUBLIC_* environment values.
const output = "dist/client";
const origin = process.env.PUBLIC_BASE_URL || "https://masrexach.com";
const buildType = process.env.PUBLIC_BUILD_TYPE || "Production";
const absoluteTags = buildType === "Production" || buildType === "Staging";
function metadata(html: string) {
  const result: Record<string, string> = {};
  for (const tag of html.matchAll(/<meta\s[^>]*>/g)) {
    const name = /(?:property|name)="([^"]+)"/.exec(tag[0])?.[1];
    const content = /content="([^"]*)"/.exec(tag[0])?.[1];
    if (name && content !== undefined) result[name] = content;
  }
  return result;
}

describe.runIf(process.env.OG_VERIFY_BUILD === "1")("built sharing cards", () => {
  it("publishes every card with complete, matching metadata and original schema photos", async () => {
    const artworkUrls = new Set<string>();
    for (const locale of ["es", "ca", "en"] as const) {
      const prefix = locale === "es" ? "" : locale;
      const paths = [
        "",
        "biografia",
        "catalogo",
        "exposiciones",
        "contacto",
        "legal",
        ...artworks.map((art) => `catalogo/${art.slug}`),
      ];
      for (const path of paths) {
        const html = await readFile(join(output, prefix, path, "index.html"), "utf8");
        const meta = metadata(html);
        expect(meta["og:locale"]).toBe({ es: "es_ES", ca: "ca_ES", en: "en_GB" }[locale]);
        expect(meta.robots).toBe(
          buildType === "Production" && path !== "legal"
            ? "index, follow, max-image-preview:large"
            : "noindex, nofollow",
        );
        if (!absoluteTags) {
          expect(meta["og:image"]).toBeUndefined();
          expect(meta["twitter:image"]).toBeUndefined();
          expect(meta["og:url"]).toBeUndefined();
          continue;
        }
        expect(meta["og:image"]).toMatch(
          new RegExp(`^${origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/assets/og/.+\\.jpg$`),
        );
        expect(meta["twitter:image"]).toBe(meta["og:image"]);
        expect(meta["og:image:width"]).toBe("1200");
        expect(meta["og:image:height"]).toBe("630");
        expect(meta["og:image:type"]).toBe("image/jpeg");
        expect(meta["og:image:alt"]).toBeTruthy();
        expect(meta["twitter:image:alt"]).toBe(meta["og:image:alt"]);
        expect(meta["twitter:card"]).toBe("summary_large_image");
        const file = await readFile(join(output, new URL(meta["og:image"]).pathname));
        const image = await sharp(file).metadata();
        expect([image.width, image.height, image.format]).toEqual([1200, 630, "jpeg"]);
        expect(file.length).toBeLessThanOrEqual(500_000);
        if (path.startsWith("catalogo/")) {
          artworkUrls.add(meta["og:image"]);
          expect(html).toMatch(/"image":"https:[^"]+\.webp"/);
          expect(html).toContain('"@type":"VisualArtwork"');
        }
      }
    }
    if (absoluteTags) expect(artworkUrls.size).toBe(75);
  });

  it("ships all 87 generated JPEGs with immutable-path caching", async () => {
    const files = await readdir(join(output, "assets/og"));
    expect(files.filter((file) => file.endsWith(".jpg"))).toHaveLength(87);
    const headers = await readFile(join(output, "_headers"), "utf8");
    expect(headers).toContain("/assets/*\n  Cache-Control: public, max-age=31536000, immutable");
    if (buildType !== "Production") expect(headers).toContain("X-Robots-Tag: noindex, nofollow");
  });
});
