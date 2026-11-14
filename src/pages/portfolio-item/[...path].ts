import type { APIContext } from "astro";
import { artworks } from "../../data/artworks";

export const prerender = false;

// Only verified legacy URLs belong here. Names are not always enough to
// identify a painting (for example, there are two works titled Orient).
const legacyArtworks = new Map([
  ["nenufares", 17],
  ["311", 11],
  ["badaluc", 24],
  ["orient", 5],
  ["tiestos", 16],
  ["esporlas", 20],
  ["albufera", 7],
  ["225", 21],
  ["fonollasa", 4],
  ["atardecer", 25],
  ["cipreses-en-el-lago", 22],
]);

// A scoped rest endpoint also catches the section root and nested unknown
// paths, without changing unrelated 404s. Never derive a destination from
// untrusted input: unknown paths always go to the Spanish catalogue.
export function GET({ url }: APIContext): Response {
  const slug = /^\/portfolio-item\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  const id = slug ? legacyArtworks.get(slug) : undefined;
  const artwork = artworks.find((art) => art.id === id);
  const destination = artwork ? `/catalogo/${artwork.slug}/` : "/catalogo/";
  return new Response(null, {
    status: 301,
    headers: { Location: destination + url.search },
  });
}

export const HEAD = GET;
