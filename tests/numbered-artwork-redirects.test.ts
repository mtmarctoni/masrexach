import { describe, expect, it } from "vitest";
import { artworks } from "../src/data/artworks";
import { numberedArtworkDestination } from "../src/lib/legacy-artwork-redirects";

// Freeze the previously published URLs; don't regenerate these from filenames.
const numbered = [
  "01-tiestos",
  "02-orient-60x60",
  "03-botellas",
  "04-fonollasa",
  "05-orient-100x40",
  "06-tronco-olivera",
  "07-albufera",
  "08-paisaje-mallorquin",
  "09-rincon-casa",
  "10-tiesto-en-estanque",
  "11-fuente-y-canal",
  "12-son-angelats-soller",
  "13-silla-y-granadas",
  "14-granja-esporlas",
  "15-iglesia-valldemossa",
  "16-tiestos-acrilico",
  "17-nenufares",
  "18-amapolas",
  "19-trastos-granja-esporlas",
  "20-esporlas",
  "21-rincon-jardin",
  "22-cipreses-en-el-lago",
  "23-casa-y-bugambilia",
  "24-badaluc",
  "25-atardecer",
];

describe("numbered artwork URL migration", () => {
  it.each(numbered)("permanently redirects %s in every locale", async (old) => {
    const art = artworks.find((item) => item.id === Number(old.slice(0, 2)));
    expect(art).toBeDefined();
    for (const prefix of ["", "/ca", "/en"]) {
      for (const slash of ["", "/"]) {
        const url = new URL(
          `https://masrexach.com${prefix}/catalogo/${old}${slash}?utm_source=google`,
        );
        expect(numberedArtworkDestination(url)).toBe(
          `${prefix}/catalogo/${art?.slug}/?utm_source=google`,
        );
      }
    }
  });

  it.each([
    "/catalogo/nenufares/",
    "/ca/catalogo/orient-cuadrado/",
    "/catalogo/",
    "/catalogo/99-unknown/",
    "/catalogo/17-nenufares/extra/",
    "/fr/catalogo/17-nenufares/",
    "/catalogo-spam/17-nenufares/",
    "/unrelated/",
    "/portfolio-item/nenufares/",
  ])("leaves %s to normal routing", async (path) => {
    const url = new URL(path, "https://masrexach.com");
    expect(numberedArtworkDestination(url)).toBeUndefined();
  });
});
