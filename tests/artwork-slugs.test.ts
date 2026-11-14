import { describe, expect, it } from "vitest";
import { artworks, getArtwork } from "../src/data/artworks";

// Public URLs are deliberately independent of numbered asset filenames.
const expectedSlugs = [
  "tiestos-oleo",
  "orient-cuadrado",
  "botellas",
  "fonollasa",
  "orient-panoramico",
  "tronco-olivera",
  "albufera",
  "paisaje-mallorquin",
  "rincon-casa",
  "tiesto-en-estanque",
  "fuente-y-canal",
  "son-angelats-soller",
  "silla-y-granadas",
  "granja-esporlas",
  "iglesia-valldemossa",
  "tiestos-acrilico",
  "nenufares",
  "amapolas",
  "trastos-granja-esporlas",
  "esporlas",
  "rincon-jardin",
  "cipreses-en-el-lago",
  "casa-y-bugambilia",
  "badaluc",
  "atardecer",
];

describe("artwork public slugs", () => {
  it("uses stable descriptive slugs without asset numbers or dimensions", () => {
    expect(artworks.map((art) => art.slug)).toEqual(expectedSlugs);
    for (const art of artworks) {
      expect(art.slug).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
      expect(getArtwork(art.slug)).toBe(art);
      expect(art.image).toMatch(/^\d{2}-.+\.jpg$/);
    }
  });

  it("assigns every painting a unique URL even when titles repeat", () => {
    expect(new Set(artworks.map((art) => art.slug)).size).toBe(artworks.length);
    expect(getArtwork("tiestos-oleo")?.caption.es).toContain("Óleo");
    expect(getArtwork("tiestos-acrilico")?.caption.es).toContain("Acrílico");
    expect(getArtwork("orient-cuadrado")?.id).toBe(2);
    expect(getArtwork("orient-panoramico")?.id).toBe(5);
  });
});
