import { artworks } from "../data/artworks";

// Historical public slugs are frozen here: changing an image filename must
// never remove an existing redirect. IDs resolve to the current source of truth.
const numberedArtworkIds = new Map([
  ["01-tiestos", 1],
  ["02-orient-60x60", 2],
  ["03-botellas", 3],
  ["04-fonollasa", 4],
  ["05-orient-100x40", 5],
  ["06-tronco-olivera", 6],
  ["07-albufera", 7],
  ["08-paisaje-mallorquin", 8],
  ["09-rincon-casa", 9],
  ["10-tiesto-en-estanque", 10],
  ["11-fuente-y-canal", 11],
  ["12-son-angelats-soller", 12],
  ["13-silla-y-granadas", 13],
  ["14-granja-esporlas", 14],
  ["15-iglesia-valldemossa", 15],
  ["16-tiestos-acrilico", 16],
  ["17-nenufares", 17],
  ["18-amapolas", 18],
  ["19-trastos-granja-esporlas", 19],
  ["20-esporlas", 20],
  ["21-rincon-jardin", 21],
  ["22-cipreses-en-el-lago", 22],
  ["23-casa-y-bugambilia", 23],
  ["24-badaluc", 24],
  ["25-atardecer", 25],
]);

/** Shared enquiry links used these same historical slugs in ?obra=. */
export function numberedArtworkAliases(): Record<string, string> {
  const aliases: Record<string, string> = {};
  for (const [old, id] of numberedArtworkIds) {
    const artwork = artworks.find((art) => art.id === id);
    if (artwork) aliases[old] = artwork.slug;
  }
  return aliases;
}

export function numberedArtworkDestination(url: URL): string | undefined {
  const match = /^(\/(?:ca|en))?\/catalogo\/([^/]+)\/?$/.exec(url.pathname);
  const id = match ? numberedArtworkIds.get(match[2]) : undefined;
  const art = id === undefined ? undefined : artworks.find((item) => item.id === id);
  if (!art) return undefined;

  return `${match?.[1] ?? ""}/catalogo/${art.slug}/${url.search}`;
}
