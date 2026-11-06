import { artworks } from "../data/artworks";
import ca from "../i18n/ca";
import en from "../i18n/en";
import es from "../i18n/es";
import type { Locale } from "../i18n/types";

export interface OgImage {
  path: string;
  width: 1200;
  height: 630;
  type: "image/jpeg";
  alt: string;
}

export interface OgCard {
  key: string;
  locale: Locale;
  kind: "identity" | "biography" | "artwork";
  title: string;
  subtitle: string;
  /** Relative to src/assets/images. Never an AI-generated reference. */
  imageFile: string;
  alt: string;
}

const paintingLabel = { es: "pintura", ca: "pintura", en: "painting" };
const portraitLabel = { es: "Retrato", ca: "Retrat", en: "Portrait" };

export function resolveOgCard(locale: Locale, path: string): OgCard {
  const dict = { es, ca, en }[locale];
  const normalized = path.split("?")[0].replace(/\/+$/, "") || "/";
  if (normalized.startsWith("/catalogo/")) {
    const slug = normalized.slice("/catalogo/".length);
    const art = artworks.find((item) => item.slug === slug);
    if (!art) throw new Error(`Unknown Open Graph artwork: ${slug}`);
    return {
      key: `${locale}/artwork/${slug}`,
      locale,
      kind: "artwork",
      title: art.title,
      subtitle: "Antoni Mas Rexach",
      imageFile: `artwork/${art.image}`,
      alt: `${art.title} — ${paintingLabel[locale]} · Antoni Mas Rexach`,
    };
  }

  const biography = normalized === "/biografia";
  const section =
    normalized === "/catalogo"
      ? "catalog"
      : normalized === "/exposiciones"
        ? "exhibitions"
        : biography
          ? "biography"
          : "home";
  const subtitle =
    section === "home"
      ? dict.home.headline.map((part) => (typeof part === "string" ? part : part.em)).join("")
      : dict.nav[section];
  return {
    key: `${locale}/${section}`,
    locale,
    kind: biography ? "biography" : "identity",
    title: "Antoni Mas Rexach",
    subtitle,
    imageFile: biography ? "antoni-mas-rexach.jpg" : "artwork/07-albufera.jpg",
    alt: biography
      ? `${portraitLabel[locale]} · Antoni Mas Rexach (1953–2017)`
      : `Albufera — ${paintingLabel[locale]} · Antoni Mas Rexach`,
  };
}

export function ogImageFor(card: OgCard, manifest: Record<string, OgImage>): OgImage {
  const image = manifest[card.key];
  if (!image) throw new Error(`Missing generated Open Graph card: ${card.key}`);
  return image;
}

export function ogLocale(locale: Locale): string {
  return { es: "es_ES", ca: "ca_ES", en: "en_GB" }[locale];
}
