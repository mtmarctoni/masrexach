import { describe, expect, it } from "vitest";
import { artworks } from "../src/data/artworks";
import { getDict } from "../src/i18n";
import { artworkDescription } from "../src/lib/artwork-seo";

describe("artwork search descriptions", () => {
  it.each([
    ["es", "Tiestos, de Antoni Mas Rexach. Óleo sobre tablilla 18x13 cm. Disponible."],
    ["ca", "Tiestos, d'Antoni Mas Rexach. Oli sobre tabil·la 18x13 cm. Disponible."],
    ["en", "Tiestos, by Antoni Mas Rexach. Oil on board 18x13 cm. Available."],
  ] as const)(
    "introduces the artist naturally in %s without doubled punctuation",
    (locale, text) => {
      expect(artworkDescription({ ...artworks[0], status: "available" }, locale)).toBe(text);
    },
  );

  it.each([
    ["es", { available: "Disponible", sold: "Vendida", nfs: "No disponible" }],
    ["ca", { available: "Disponible", sold: "Venuda", nfs: "No disponible" }],
    ["en", { available: "Available", sold: "Sold", nfs: "Not available" }],
  ] as const)(
    "preserves titles, captions and accurate status throughout %s",
    (locale, statuses) => {
      for (const art of artworks) {
        for (const status of ["available", "sold", "nfs"] as const) {
          const text = artworkDescription({ ...art, status }, locale);
          expect(text).toContain(art.title);
          expect(text).toContain("Antoni Mas Rexach");
          expect(text.split(art.caption[locale])).toHaveLength(2);
          expect(text).toContain(`${statuses[status]}.`);
          expect(text).not.toContain("..");
        }
      }
    },
  );

  it("adds punctuation when a caption has none", () => {
    const art = {
      ...artworks[0],
      status: "sold" as const,
      caption: { ...artworks[0].caption, en: "Oil on board" },
    };
    expect(artworkDescription(art, "en")).toBe(
      "Tiestos, by Antoni Mas Rexach. Oil on board. Sold.",
    );
  });
});

describe("exhibition descriptions", () => {
  it.each(["es", "ca", "en"] as const)("names a documented venue in %s", (locale) => {
    const { description, collective } = getDict(locale).exhibitions;
    expect(description).toContain("Antoni Mas Rexach");
    expect(description).toContain("Casal Solleric");
    expect(collective.some((entry) => entry.includes("Casal Solleric"))).toBe(true);
  });
});
