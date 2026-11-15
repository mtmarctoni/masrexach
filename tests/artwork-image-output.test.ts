import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { artworks } from "../src/data/artworks";

describe.runIf(process.env.THUMBNAIL_VERIFY_BUILD === "1")("built artwork images", () => {
  for (const locale of ["es", "ca", "en"] as const) {
    for (const art of artworks) {
      it(`delivers bounded responsive artwork for ${locale}/${art.slug}`, async () => {
        const prefix = locale === "es" ? "" : `${locale}/`;
        const html = await readFile(`dist/client/${prefix}catalogo/${art.slug}/index.html`, "utf8");
        const tag = html.match(/<img\s[^>]*>/)?.[0] ?? "";
        const attrs = Object.fromEntries(
          [...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]),
        );
        expect(attrs.srcset).toBeTruthy();
        expect(attrs.sizes).toBeTruthy();
        expect(attrs.sizes).toBe("(min-width: 548px) 448px, calc(100vw - 100px)");
        expect(html.match(/class="artwork-frame__rail /g)).toHaveLength(4);
        expect(attrs.alt).toBe(`${art.title} — ${art.caption[locale]}`);
        expect(attrs.loading).toBe("eager");
        expect(attrs.fetchpriority).toBe("high");
        expect(Number(attrs.width)).toBeGreaterThan(0);
        expect(Number(attrs.height)).toBeGreaterThan(0);
        const original = await sharp(`src/assets/images/artwork/${art.image}`).metadata();
        const maximum = Math.min(Number(original.width), 960);
        const candidates = attrs.srcset.split(",").map((entry) => {
          const match = entry.trim().match(/^(\S+) (\d+)w$/);
          expect(match).not.toBeNull();
          if (!match) throw new Error(`Invalid srcset entry: ${entry}`);
          return { src: match[1], width: Number(match[2]) };
        });
        const widths = candidates.map(({ width }) => width);
        expect(new Set(widths).size).toBe(widths.length);
        expect(Math.max(...widths)).toBe(maximum);
        if (art.id === 1 || art.id === 6) expect(Math.min(...widths)).toBeLessThanOrEqual(400);
        for (const candidate of candidates) {
          expect(candidate.width).toBeGreaterThan(0);
          expect(candidate.width).toBeLessThanOrEqual(maximum);
          const metadata = await sharp(await readFile(`dist/client${candidate.src}`)).metadata();
          expect(metadata.format).toBe("webp");
          expect(metadata.width).toBe(candidate.width);
          expect(
            Math.abs(
              Number(metadata.height) -
                (candidate.width * Number(original.height)) / Number(original.width),
            ),
          ).toBeLessThanOrEqual(1);
        }
        const fallback = await sharp(await readFile(`dist/client${attrs.src}`)).metadata();
        expect(fallback.width).toBe(maximum);
        const schemas = [
          ...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g),
        ].map(([, json]) => JSON.parse(json));
        const artwork = schemas.find((schema) => schema["@type"] === "VisualArtwork");
        expect(artwork).toBeTruthy();
        if (process.env.PUBLIC_BUILD_TYPE === "Production") {
          expect(artwork.image).toBe(new URL(attrs.src, "https://masrexach.com").href);
        }
      });
    }
  }
});
