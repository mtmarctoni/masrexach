import { describe, expect, it } from "vitest";
import { artworks } from "../src/data/artworks";
import { artistSchema, artworkSchema } from "../src/lib/structured-data";

const origin = "https://masrexach.com";
const photo = "https://masrexach.com/_astro/tiestos.webp";

describe("artist identity", () => {
  it("defines a stable factual Person", () => {
    expect(artistSchema(origin)).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": "https://masrexach.com/#artist",
      name: "Antoni Mas Rexach",
      url: "https://masrexach.com/",
      birthDate: "1953-09-06",
      deathDate: "2017-03-13",
      birthPlace: { "@type": "Place", name: "Palma de Mallorca" },
    });
  });

  it("omits identity URLs without a known origin", () => {
    const person = JSON.parse(JSON.stringify(artistSchema("")));
    expect(person["@id"]).toBeUndefined();
    expect(person.url).toBeUndefined();
    expect(person.name).toBe("Antoni Mas Rexach");
  });
});

describe("artwork structured data", () => {
  it.each(["es", "ca", "en"] as const)(
    "embeds the same complete artist definition in %s",
    (locale) => {
      const page = `${origin}/${locale}/catalogo/tiestos-oleo/`;
      const schema = artworkSchema(artworks[0], locale, page, photo, origin);
      expect(schema).toMatchObject({
        "@type": "VisualArtwork",
        "@id": `${page}#artwork`,
        url: page,
        name: "Tiestos",
        image: photo,
        artform: "Painting",
        artMedium: "Oil on board",
        inLanguage: locale,
        text: artworks[0].caption[locale],
        creator: {
          "@id": "https://masrexach.com/#artist",
          "@type": "Person",
          birthDate: "1953-09-06",
          deathDate: "2017-03-13",
        },
      });
      expect(schema.description).toContain("Antoni Mas Rexach");
      expect(schema.description).toContain(artworks[0].caption[locale]);
    },
  );

  it("provides a natural localized description", () => {
    expect(artworkSchema(artworks[0], "en", undefined, undefined, "").description).toBe(
      "Tiestos, by Antoni Mas Rexach. Oil on board 18x13 cm. Available.",
    );
  });

  it.each([
    [1, "Oil on board"],
    [2, "Oil on canvas"],
    [3, "Oil on panel"],
    [12, "Acrylic on paper"],
    [15, "Acrylic on board"],
  ] as const)("uses only the documented medium of artwork %s", (id, medium) => {
    const art = artworks.find((item) => item.id === id);
    expect(art).toBeDefined();
    if (!art) throw new Error("Missing fixture");
    const schema = artworkSchema(art, "en", undefined, undefined, "");
    expect(schema.artMedium).toBe(medium);
    expect(schema).not.toHaveProperty("width");
    expect(schema).not.toHaveProperty("height");
    expect(schema).not.toHaveProperty("offers");
  });

  it("does not guess an unknown medium", () => {
    const art = { ...artworks[0], caption: { ...artworks[0].caption, en: "Mixed media" } };
    expect(artworkSchema(art, "en", undefined, undefined, "").artMedium).toBeUndefined();
  });

  it("keeps preview data factual without relative identity or photo URLs", () => {
    const schema = JSON.parse(
      JSON.stringify(artworkSchema(artworks[0], "en", undefined, undefined, "")),
    );
    expect(schema.url).toBeUndefined();
    expect(schema["@id"]).toBeUndefined();
    expect(schema.image).toBeUndefined();
    expect(schema.creator["@id"]).toBeUndefined();
    expect(schema.creator.name).toBe("Antoni Mas Rexach");
  });
});
