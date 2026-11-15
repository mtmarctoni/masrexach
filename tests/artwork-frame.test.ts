import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("oak frame textures", () => {
  for (const [name, width, height] of [
    ["horizontal", 560, 21],
    ["vertical", 21, 560],
  ] as const) {
    it(`fills the entire ${name} rail with grain, without letterboxing`, async () => {
      const svg = await readFile(`public/images/frame/oak-${name}.svg`);
      expect(svg.toString()).toContain('preserveAspectRatio="none"');
      // Render into the rail's actual aspect ratio, not a post-render resize.
      const sized = svg
        .toString()
        .replace(/width="\d+" height="\d+"/, `width="${width}" height="${height}"`);
      const { data, info } = await sharp(Buffer.from(sized))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      for (const fraction of [0.05, 0.5, 0.95]) {
        const values = [];
        for (let offset = 0; offset < 12; offset++) {
          const x = name === "horizontal" ? Math.floor(width * fraction) + offset : 5 + offset;
          const y = name === "vertical" ? Math.floor(height * fraction) + offset : 5 + offset;
          const pixel = (y * info.width + x) * info.channels;
          expect(data[pixel + 3]).toBe(255);
          values.push(data[pixel]);
        }
        expect(new Set(values).size).toBeGreaterThan(2);
      }
    });
  }
});
