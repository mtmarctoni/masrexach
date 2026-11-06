import type { Artwork } from "../data/artworks";
import type { Locale } from "../i18n";
import { artworkDescription } from "./artwork-seo";

export function artistSchema(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": origin ? `${origin}/#artist` : undefined,
    name: "Antoni Mas Rexach",
    url: origin ? `${origin}/` : undefined,
    birthDate: "1953-09-06",
    deathDate: "2017-03-13",
    birthPlace: { "@type": "Place", name: "Palma de Mallorca" },
    nationality: { "@type": "Country", name: "ES" },
    jobTitle: "Painter",
    knowsAbout: "Mallorcan landscape painting",
  };
}

// Whitelist only documented caption prefixes; unknown media stay unstructured.
const media = [
  "Oil on board",
  "Oil on canvas",
  "Oil on panel",
  "Acrylic on paper",
  "Acrylic on board",
];

export function artworkSchema(
  art: Artwork,
  locale: Locale,
  pageUrl: string | undefined,
  imageUrl: string | undefined,
  origin: string,
) {
  const { "@context": _context, ...creator } = artistSchema(origin);
  return {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    "@id": pageUrl ? `${pageUrl}#artwork` : undefined,
    url: pageUrl,
    name: art.title,
    description: artworkDescription(art, locale),
    image: imageUrl,
    artform: "Painting",
    artMedium: media.find((medium) => art.caption.en.startsWith(`${medium} `)),
    text: art.caption[locale],
    inLanguage: locale,
    creator,
  };
}
