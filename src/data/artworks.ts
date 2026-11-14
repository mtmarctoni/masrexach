export type ArtworkStatus = "available" | "sold" | "nfs";

export interface Artwork {
  id: number;
  /** Stable public URL slug, independent of the title and image filename. */
  slug: string;
  title: string;
  caption: { es: string; ca: string; en: string };
  /** Filename under src/assets/images/artwork/. */
  image: string;
  /** Sales status. "nfs" = not for sale (family keepsake). */
  status: ArtworkStatus;
  /** Shown in the home page's featured section. */
  featured: boolean;
}

type ArtworkBase = Omit<Artwork, "image" | "status" | "featured">;

const a = (
  id: number,
  title: string,
  slug: string,
  captionEs: string,
  captionCa: string,
  captionEn: string,
): ArtworkBase => ({ id, title, slug, caption: { es: captionEs, ca: captionCa, en: captionEn } });

const artworkImages = new Map<number, string>([
  [1, "01-tiestos.jpg"],
  [2, "02-orient-60x60.jpg"],
  [3, "03-botellas.jpg"],
  [4, "04-fonollasa.jpg"],
  [5, "05-orient-100x40.jpg"],
  [6, "06-tronco-olivera.jpg"],
  [7, "07-albufera.jpg"],
  [8, "08-paisaje-mallorquin.jpg"],
  [9, "09-rincon-casa.jpg"],
  [10, "10-tiesto-en-estanque.jpg"],
  [11, "11-fuente-y-canal.jpg"],
  [12, "12-son-angelats-soller.jpg"],
  [13, "13-silla-y-granadas.jpg"],
  [14, "14-granja-esporlas.jpg"],
  [15, "15-iglesia-valldemossa.jpg"],
  [16, "16-tiestos-acrilico.jpg"],
  [17, "17-nenufares.jpg"],
  [18, "18-amapolas.jpg"],
  [19, "19-trastos-granja-esporlas.jpg"],
  [20, "20-esporlas.jpg"],
  [21, "21-rincon-jardin.jpg"],
  [22, "22-cipreses-en-el-lago.jpg"],
  [23, "23-casa-y-bugambilia.jpg"],
  [24, "24-badaluc.jpg"],
  [25, "25-atardecer.jpg"],
]);

/** Home page featured works (id order): Tronco olivera, Albufera, Granja
 *  Esporlas, Nenúfares, Cipreses en el lago, Atardecer. */
const FEATURED_IDS = new Set([6, 7, 14, 17, 22, 25]);

const base: ArtworkBase[] = [
  a(
    1,
    "Tiestos",
    "tiestos-oleo",
    "Óleo sobre tablilla 18x13 cm.",
    "Oli sobre tabil·la 18x13 cm.",
    "Oil on board 18x13 cm.",
  ),
  a(
    2,
    "Orient",
    "orient-cuadrado",
    "Óleo sobre tela 60 x 60 cm.",
    "Oli sobre tela 60 x 60 cm.",
    "Oil on canvas 60 x 60 cm.",
  ),
  a(
    3,
    "Botellas",
    "botellas",
    "Óleo sobre tabla 55 x 20 cm.",
    "Oli sobre taula 55 x 20 cm.",
    "Oil on panel 55 x 20 cm.",
  ),
  a(
    4,
    "Fonollasa",
    "fonollasa",
    "Óleo sobre tela 61 x 50 cm.",
    "Oli sobre tela 61 x 50 cm.",
    "Oil on canvas 61 x 50 cm.",
  ),
  a(
    5,
    "Orient",
    "orient-panoramico",
    "Óleo sobre tela 100 x 40 cm.",
    "Oli sobre tela 100 x 40 cm.",
    "Oil on canvas 100 x 40 cm.",
  ),
  a(
    6,
    "Tronco olivera",
    "tronco-olivera",
    "Óleo sobre tela 65 x 54 cm.",
    "Oli sobre tela 65 x 54 cm.",
    "Oil on canvas 65 x 54 cm.",
  ),
  a(
    7,
    "Albufera",
    "albufera",
    "Òleo sobre tela 92 x 92 cm.",
    "Oli sobre tela 92 x 92 cm.",
    "Oil on canvas 92 x 92 cm.",
  ),
  a(
    8,
    "Paisaje mallorquín",
    "paisaje-mallorquin",
    "Óleo sobre tela 80 x 30 cm.",
    "Oli sobre tela 80 x 30 cm.",
    "Oil on canvas 80 x 30 cm.",
  ),
  a(
    9,
    "Rincón casa",
    "rincon-casa",
    "Óleo sobre tela 80 x 30 cm.",
    "Oli sobre tela 80 x 30 cm.",
    "Oil on canvas 80 x 30 cm.",
  ),
  a(
    10,
    "Tiesto en estanque",
    "tiesto-en-estanque",
    "Óleo sobre tablilla 23x19 cm.",
    "Oli sobre tabil·la 23x19 cm.",
    "Oil on board 23x19 cm.",
  ),
  a(
    11,
    "Fuente y canal",
    "fuente-y-canal",
    "Óleo sobre tela 61x50 cm.",
    "Oli sobre tela 61x50 cm.",
    "Oil on canvas 61x50 cm.",
  ),
  a(
    12,
    "Son Angelats – Soller",
    "son-angelats-soller",
    "Acrílico sobre papel 20x15 cm.",
    "Acrílic sobre paper 20x15 cm.",
    "Acrylic on paper 20x15 cm.",
  ),
  a(
    13,
    "Silla y granadas",
    "silla-y-granadas",
    "Óleo sobre tela 61x50 cm.",
    "Oli sobre tela 61x50 cm.",
    "Oil on canvas 61x50 cm.",
  ),
  a(
    14,
    "Granja Esporlas",
    "granja-esporlas",
    "Óleo sobre tela 30x80 cm.",
    "Oli sobre tela 30x80 cm.",
    "Oil on canvas 30x80 cm.",
  ),
  a(
    15,
    "Iglesia Valldemossa",
    "iglesia-valldemossa",
    "Acrílico sobre tablilla 14x19 cm.",
    "Acrílic sobre tabil·la 14x19 cm.",
    "Acrylic on board 14x19 cm.",
  ),
  a(
    16,
    "Tiestos",
    "tiestos-acrilico",
    "Acrílico sobre tablilla 18 x 13 cm.",
    "Acrílic sobre tabil·la 18 x 13 cm.",
    "Acrylic on board 18 x 13 cm.",
  ),
  a(
    17,
    "Nenúfares",
    "nenufares",
    "Óleo sobre tela 92 x 92 cm.",
    "Oli sobre tela 92 x 92 cm.",
    "Oil on canvas 92 x 92 cm.",
  ),
  a(
    18,
    "Amapolas",
    "amapolas",
    "Óleo sobre tela 46 x 38 cm.",
    "Oli sobre tela 46 x 38 cm.",
    "Oil on canvas 46 x 38 cm.",
  ),
  a(
    19,
    "Trastos Granja Esporlas",
    "trastos-granja-esporlas",
    "Óleo sobre tela 73 x 60 cm.",
    "Oli sobre tela 73 x 60 cm.",
    "Oil on canvas 73 x 60 cm.",
  ),
  a(
    20,
    "Esporlas",
    "esporlas",
    "Óleo sobre tela 55 x 46 cm.",
    "Oli sobre tela 55 x 46 cm.",
    "Oil on canvas 55 x 46 cm.",
  ),
  a(
    21,
    "RINCÓN JARDÍN",
    "rincon-jardin",
    "Óleo sobre tela 60 x 60 cm.",
    "Oli sobre tela 60 x 60 cm.",
    "Oil on canvas 60 x 60 cm.",
  ),
  a(
    22,
    "CIPRESES EN EL LAGO",
    "cipreses-en-el-lago",
    "Óleo sobre tela 40 x 100 cm.",
    "Oli sobre tela 40 x 100 cm.",
    "Oil on canvas 40 x 100 cm.",
  ),
  a(
    23,
    "CASA Y BUGAMBILIA",
    "casa-y-bugambilia",
    "Óleo sobre tela 61 x 50 cm.",
    "Oli sobre tela 61 x 50 cm.",
    "Oil on canvas 61 x 50 cm.",
  ),
  a(
    24,
    "BADALUC",
    "badaluc",
    "Óleo sobre tela 60 x 60 cm.",
    "Oli sobre tela 60 x 60 cm.",
    "Oil on canvas 60 x 60 cm.",
  ),
  a(
    25,
    "ATARDECER",
    "atardecer",
    "Óleo sobre tela 73 x 60 cm.",
    "Oli sobre tela 73 x 60 cm.",
    "Oil on canvas 73 x 60 cm.",
  ),
];

export const artworks: Artwork[] = base.map((art) => {
  const image = artworkImages.get(art.id);
  if (!image) {
    throw new Error(`Missing image for artwork ${art.id}`);
  }
  return {
    ...art,
    image,
    status: "available",
    featured: FEATURED_IDS.has(art.id),
  };
});

export function getArtwork(slug: string): Artwork | undefined {
  return artworks.find((art) => art.slug === slug);
}

export function availableArtworks(): Artwork[] {
  return artworks.filter((art) => art.status === "available");
}

export function soldArtworks(): Artwork[] {
  return artworks.filter((art) => art.status === "sold");
}

export function featuredArtworks(): Artwork[] {
  return artworks.filter((art) => art.featured);
}

/** Previous/next artwork in id order, wrapping around the catalog. */
export function adjacentArtworks(slug: string): { prev: Artwork; next: Artwork } | undefined {
  const index = artworks.findIndex((art) => art.slug === slug);
  if (index === -1) {
    return undefined;
  }
  return {
    prev: artworks[(index - 1 + artworks.length) % artworks.length],
    next: artworks[(index + 1) % artworks.length],
  };
}
