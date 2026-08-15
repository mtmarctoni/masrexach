import ca from "./ca";
import en from "./en";
import es from "./es";
import type { Locale, TranslationContent } from "./types";

export type { Locale, TranslationContent };

const locales: Locale[] = ["es", "ca", "en"];

const defaultLocale: Locale = "es";

export const siteUrl = "https://www.masrexach.com";

const dictionaries: Record<Locale, TranslationContent> = { es, ca, en };

/**
 * Static paths for [locale] pages. The default locale renders at the site root
 * (params.locale = undefined -> "/", not "/es/"); the others at "/<locale>/".
 * Page components read the locale from Astro.props, not Astro.params.
 */
export function localeRoutes(): Array<{
  params: { locale: string | undefined };
  props: { locale: Locale };
}> {
  return locales.map((locale) => ({
    params: { locale: locale === defaultLocale ? undefined : locale },
    props: { locale },
  }));
}

export function getDict(locale: Locale): TranslationContent {
  return dictionaries[locale] ?? es;
}

/** Path for a locale without the host, e.g. ("ca", "/biografia") → "/ca/biografia". */
export function localizedPath(locale: Locale, path: string): string {
  if (locale === defaultLocale) {
    return path === "/" ? "/" : path;
  }
  const trimmed = path === "/" ? "" : path;
  // Trailing slash matches @astrojs/sitemap output (build.format "directory"),
  // keeping canonical/hreflang URLs identical to the sitemap entries.
  return `/${locale}${trimmed}/`;
}

/** Absolute URL for a page in a given locale. */
export function localizedUrl(locale: Locale, path: string): string {
  return `${siteUrl}${localizedPath(locale, path)}`;
}

/** Alternative-language URLs for the current page (relative paths). */
export function alternatePaths(_currentLocale: Locale, path: string): Record<string, string> {
  const result: Record<string, string> = { "x-default": localizedPath(defaultLocale, path) };
  for (const locale of locales) {
    result[locale] = localizedPath(locale, path);
  }
  return result;
}
