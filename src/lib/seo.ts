// Central noindex registry. Every path that must never be indexed — in any
// environment — lives here so the per-page robots <meta>, the production
// sitemap, and robots.txt all stay in sync. Add future noindex pages (draft
// catalogs, internal tooling, PII forms, …) to these lists only.
//
// Paths are written in "canonical form": the default-locale route path with no
// leading locale segment and no trailing slash (e.g. "/legal" matches the
// rendered /legal, /ca/legal and /en/legal after normalization).
//
// Keep the non-default locale prefixes in sync with src/i18n (the default
// locale "es" renders unprefixed; "ca"/"en" render under "/<locale>/").
const NON_DEFAULT_LOCALE_PREFIXES = ["ca", "en"];

/** Exact canonical paths that must never be indexed: error pages and boilerplate routes. */
const NOINDEX_PATHS = ["/404", "/500", "/legal"] as const;

/** Canonical path prefixes that must never be indexed: API endpoints, admin, internals. */
export const NOINDEX_PREFIXES = ["/api"] as const;

/** Normalizes a canonical path or URL pathname to canonical form (no locale, no trailing slash). */
function normalizePath(p: string): string {
  let path = p.trim().split(/[?#]/)[0];
  path = path.replace(/\/+$/, "") || "/";
  for (const prefix of NON_DEFAULT_LOCALE_PREFIXES) {
    if (path === `/${prefix}` || path.startsWith(`/${prefix}/`)) {
      path = path.slice(prefix.length + 1) || "/";
      break;
    }
  }
  return path;
}

function isNoindexPath(path: string): boolean {
  const normalized = normalizePath(path);
  return (
    NOINDEX_PATHS.some((entry) => entry === normalized) ||
    NOINDEX_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))
  );
}

/** True when a page in canonical-path form (as passed to Base's `path` prop) should be indexable. */
export function isIndexablePath(path: string): boolean {
  return !isNoindexPath(path);
}

/** True when a rendered/sitemap URL (e.g. "https://site/ca/legal/") should be indexable. */
export function isIndexableUrl(url: string): boolean {
  try {
    return isIndexablePath(new URL(url).pathname);
  } catch {
    return isIndexablePath(url);
  }
}
