import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { artworks } from "../src/data/artworks";

describe.runIf(process.env.THUMBNAIL_VERIFY_BUILD === "1")("built homepage hero", () => {
  it.each(["es", "ca", "en"] as const)("identifies the featured painting in %s", async (locale) => {
    const artwork = artworks.find((art) => art.id === 7);
    expect(artwork).toBeDefined();
    const prefix = locale === "es" ? "" : `${locale}/`;
    const html = await readFile(`dist/client/${prefix}index.html`, "utf8");
    const caption = html.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/)?.[1] ?? "";
    expect(caption).toContain(artwork?.title);
    expect(caption).toContain(artwork?.caption[locale]);
    const image = html.match(/<img\s[^>]*>/)?.[0] ?? "";
    expect(image).toContain(`alt="${artwork?.title} — ${artwork?.caption[locale]}"`);
  });
});
