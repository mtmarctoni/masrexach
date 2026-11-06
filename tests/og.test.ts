import { describe, expect, it } from "vitest";
import { artworks } from "../src/data/artworks";
import { ogImageFor, ogLocale, resolveOgCard } from "../src/lib/og";

describe("social card selection", () => {
  it.each(["es", "ca", "en"] as const)("selects every original artwork in %s", (locale) => {
    for (const art of artworks) {
      const card = resolveOgCard(locale, `/catalogo/${art.slug}`);
      expect(card.kind).toBe("artwork");
      expect(card.imageFile).toBe(`artwork/${art.image}`);
      expect(card.title).toBe(art.title);
      expect(card.alt).toContain(art.title);
      expect(card.subtitle).toBe("Antoni Mas Rexach");
      expect(card.key).toBe(`${locale}/artwork/${art.slug}`);
    }
  });

  it.each([
    ["es", "La luz de Mallorca, convertida en pintura.", "Biografía", "Pintura", "Exposiciones"],
    ["ca", "La llum de Mallorca, convertida en pintura.", "Biografia", "Pintura", "Exposicions"],
    ["en", "The light of Mallorca, turned into painting.", "Biography", "Paintings", "Exhibitions"],
  ] as const)("localizes section cards in %s", (locale, headline, bio, catalogue, exhibitions) => {
    const home = resolveOgCard(locale, "/");
    expect(home.imageFile).toBe("artwork/07-albufera.jpg");
    expect(home.subtitle).toBe(headline);
    expect(home.subtitle).not.toMatch(/[<>]/);
    expect(resolveOgCard(locale, "/biografia").imageFile).toBe("antoni-mas-rexach.jpg");
    expect(resolveOgCard(locale, "/biografia").subtitle).toBe(bio);
    expect(resolveOgCard(locale, "/catalogo/").subtitle).toBe(catalogue);
    expect(resolveOgCard(locale, "/exposiciones").subtitle).toBe(exhibitions);
    for (const path of ["/contacto", "/legal", "/404", "/500", "/unknown"]) {
      expect(resolveOgCard(locale, path)).toEqual(home);
    }
    expect(home.alt).not.toBe("");
  });

  it("uses descriptive English and Catalan image alternatives", () => {
    expect(resolveOgCard("en", "/").alt).toContain("painting");
    expect(resolveOgCard("ca", "/biografia").alt).toContain("Retrat");
  });

  it("does not silently fall back for an unknown artwork", () => {
    expect(() => resolveOgCard("es", "/catalogo/missing")).toThrow("missing");
  });

  it("requires a generated image descriptor", () => {
    const card = resolveOgCard("es", "/");
    expect(() => ogImageFor(card, {})).toThrow(card.key);
    const descriptor = {
      path: "/assets/og/home-abc.jpg",
      width: 1200,
      height: 630,
      type: "image/jpeg",
      alt: card.alt,
    } as const;
    expect(ogImageFor(card, { [card.key]: descriptor })).toEqual(descriptor);
  });

  it("provides region-qualified Open Graph locales without changing HTML languages", () => {
    expect([ogLocale("es"), ogLocale("ca"), ogLocale("en")]).toEqual(["es_ES", "ca_ES", "en_GB"]);
  });
});
