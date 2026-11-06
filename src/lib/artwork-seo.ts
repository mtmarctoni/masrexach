import type { Artwork } from "../data/artworks";
import { getDict, type Locale, statusLabels } from "../i18n";

export function artworkDescription(art: Artwork, locale: Locale): string {
  const by = { es: "de Antoni Mas Rexach", ca: "d'Antoni Mas Rexach", en: "by Antoni Mas Rexach" };
  const caption = art.caption[locale].trim().replace(/[.!?]+$/, "");
  const status = statusLabels(getDict(locale))[art.status];
  return `${art.title}, ${by[locale]}. ${caption}. ${status}.`;
}
