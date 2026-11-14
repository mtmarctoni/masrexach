import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fitOgCard, prepareOgCard, renderOgCards } from "../scripts/og/render";
import { resolveOgCard } from "../src/lib/og";

let root: string;
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "masrexach-og-"));
  await mkdir(join(root, "src/assets"), { recursive: true });
  await cp("src/assets/fonts", join(root, "src/assets/fonts"), { recursive: true });
  await cp("src/assets/images", join(root, "src/assets/images"), { recursive: true });
});
afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("original-asset card renderer", () => {
  it("versions images by copy, original image, fonts and template, not output directory", async () => {
    const card = resolveOgCard("es", "/");
    const original = await prepareOgCard(card, { root });
    expect((await prepareOgCard(card, { root })).hash).toBe(original.hash);
    expect((await prepareOgCard({ ...card, subtitle: "Different" }, { root })).hash).not.toBe(
      original.hash,
    );
    expect((await prepareOgCard(card, { root, templateRevision: "next" })).hash).not.toBe(
      original.hash,
    );
    const image = join(root, "src/assets/images", card.imageFile);
    const imageBytes = await readFile(image);
    await writeFile(
      image,
      await sharp(imageBytes).modulate({ brightness: 0.99 }).jpeg().toBuffer(),
    );
    expect((await prepareOgCard(card, { root })).hash).not.toBe(original.hash);
    await writeFile(image, imageBytes);
    const font = join(root, "src/assets/fonts/fraunces-latin-wght-normal.woff2");
    const fontBytes = await readFile(font);
    await writeFile(font, Buffer.concat([fontBytes, Buffer.from("changed")]));
    expect((await prepareOgCard(card, { root })).hash).not.toBe(original.hash);
    await writeFile(font, fontBytes);
  });

  it("reports missing image and font paths instead of producing substitutes", async () => {
    const card = resolveOgCard("en", "/");
    await expect(prepareOgCard({ ...card, imageFile: "missing.jpg" }, { root })).rejects.toThrow(
      "missing.jpg",
    );
    // Leave exactly one font missing: parallel reads may otherwise report
    // either missing file first, making an assertion on its name race-prone.
    const missingFontRoot = join(root, "missing-font");
    await mkdir(join(missingFontRoot, "src/assets/fonts"), { recursive: true });
    await cp(
      join(root, "src/assets/fonts/instrument-sans-latin-wght-normal.woff2"),
      join(missingFontRoot, "src/assets/fonts/instrument-sans-latin-wght-normal.woff2"),
    );
    await expect(prepareOgCard(card, { root: missingFontRoot })).rejects.toThrow("fraunces");
  });

  it("escapes titles as text, never injected HTML", async () => {
    const card = {
      ...resolveOgCard("en", "/catalogo/albufera"),
      title: '<img src=x onerror="alert(1)">',
    };
    const { html } = await prepareOgCard(card, { root });
    expect(html).toContain("&lt;img");
    expect(html).not.toContain('onerror="alert(1)"');
  });

  it.skipIf(process.env.SKIP_OG_BROWSER_TESTS === "1")(
    "fits portrait, square, wide, longest and accented titles without cropping",
    async () => {
      const browser = await chromium.launch();
      try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
        for (const path of [
          "/catalogo/botellas",
          "/catalogo/granja-esporlas",
          "/catalogo/albufera",
          "/catalogo/orient-panoramico",
          "/catalogo/trastos-granja-esporlas",
          "/catalogo/nenufares",
          "/",
          "/biografia",
        ]) {
          for (const locale of ["es", "ca", "en"] as const) {
            const card = resolveOgCard(locale, path);
            const { html } = await prepareOgCard(card, { root });
            await page.setContent(html);
            await fitOgCard(page, card);
            await page.evaluate(async () => {
              await document.fonts.ready;
              await Promise.all([...document.images].map((img) => img.decode()));
            });
            const bounds = await page.evaluate(() => {
              const img = document.querySelector("img");
              const copy = document.querySelector(".copy");
              if (!img || !copy) throw new Error("Missing card content");
              const rect = img.getBoundingClientRect();
              return {
                ratio: rect.width / rect.height,
                naturalRatio: img.naturalWidth / img.naturalHeight,
                right: rect.right,
                bottom: rect.bottom,
                left: rect.left,
                top: rect.top,
                textRight: copy.getBoundingClientRect().right,
                textBottom: copy.getBoundingClientRect().bottom,
                textOverflow: copy.scrollWidth > copy.clientWidth,
              };
            });
            expect(bounds.ratio).toBeCloseTo(bounds.naturalRatio, 2);
            // Include the white 8px frame inside the 60px canvas safe area.
            expect(bounds.left).toBeGreaterThanOrEqual(648);
            expect(bounds.top).toBeGreaterThanOrEqual(68);
            expect(bounds.right).toBeLessThanOrEqual(1132);
            expect(bounds.bottom).toBeLessThanOrEqual(562);
            expect(bounds.textRight).toBeLessThanOrEqual(600);
            expect(bounds.textBottom).toBeLessThanOrEqual(456);
            expect(bounds.textOverflow).toBe(false);
          }
        }
      } finally {
        await browser.close();
      }
    },
    30_000,
  );

  it.skipIf(process.env.SKIP_OG_BROWSER_TESTS === "1")(
    "renders public, hashed 1200 × 630 JPEGs within the size budget",
    async () => {
      const output = join(root, "output");
      const cards = [
        resolveOgCard("es", "/"),
        resolveOgCard("ca", "/biografia"),
        resolveOgCard("en", "/catalogo/botellas"),
      ];
      const manifest = await renderOgCards(cards, output, { root });
      for (const card of cards) {
        const image = manifest[card.key];
        expect(image.path).toMatch(/^\/assets\/og\/[a-z0-9-]+-[a-f0-9]{16}\.jpg$/);
        expect(image.alt).toBe(card.alt);
        const bytes = await readFile(join(output, image.path));
        const metadata = await sharp(bytes).metadata();
        expect([metadata.width, metadata.height, metadata.format, metadata.space]).toEqual([
          1200,
          630,
          "jpeg",
          "srgb",
        ]);
        expect(bytes.length).toBeLessThanOrEqual(500_000);
      }
    },
    30_000,
  );
});
