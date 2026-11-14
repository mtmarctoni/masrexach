import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { artworks, getArtwork } from "../src/data/artworks";
import { numberedArtworkDestination } from "../src/lib/legacy-artwork-redirects";

function dataAttribute(html: string, name: string) {
  const raw = html.match(new RegExp(`${name}="([^"]*)"`))?.[1];
  expect(raw, name).toBeDefined();
  return JSON.parse(
    (raw ?? "").replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&amp;", "&"),
  );
}

describe.runIf(process.env.THUMBNAIL_VERIFY_BUILD === "1")("built enquiry artwork data", () => {
  it.each(["es", "ca", "en"] as const)(
    "preserves every historical artwork reference in %s",
    async (locale) => {
      const prefix = locale === "es" ? "" : `${locale}/`;
      const html = await readFile(`dist/client/${prefix}contacto/index.html`, "utf8");
      const index = dataAttribute(html, "data-contact-artworks");
      const aliases: Record<string, string> = dataAttribute(html, "data-contact-artwork-aliases");
      expect(Object.keys(aliases)).toHaveLength(artworks.length);
      expect(aliases["07-albufera"]).toBe("albufera");
      for (const [old, canonical] of Object.entries(aliases)) {
        const artwork = getArtwork(canonical);
        expect(artwork).toBeDefined();
        expect(index[canonical]).toEqual({
          title: artwork?.title,
          caption: artwork?.caption[locale],
        });
        expect(numberedArtworkDestination(new URL(`https://masrexach.com/catalogo/${old}/`))).toBe(
          `/catalogo/${canonical}/`,
        );
      }
    },
  );
});
