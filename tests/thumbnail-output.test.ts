import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe.runIf(process.env.THUMBNAIL_VERIFY_BUILD === "1")("built thumbnails", () => {
  for (const prefix of ["", "ca/", "en/"]) {
    it(`serves responsive images and eagerly loads initial catalogue artwork in ${prefix || "es"}`, async () => {
      for (const path of ["", "catalogo/"]) {
        const html = await readFile(`dist/client/${prefix}${path}index.html`, "utf8");
        const images = [...html.matchAll(/<img\s[^>]*>/g)].map(([tag]) => tag);
        const thumbnails = path ? images : images.slice(1);
        expect(thumbnails.length).toBeGreaterThan(0);
        for (const tag of thumbnails) {
          expect(tag).toMatch(/srcset="[^"]+"/);
          expect(tag).toMatch(/sizes="[^"]+"/);
        }
        if (path) {
          for (const tag of thumbnails.slice(0, 2)) {
            expect(tag).toContain('loading="eager"');
            expect(tag).toContain('fetchpriority="high"');
          }
        }
      }
    });
  }
});
