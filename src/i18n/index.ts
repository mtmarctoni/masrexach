import type { ArtworkStatus } from "../data/artworks";
import ca from "./ca";
import en from "./en";
import es from "./es";
import type { Locale, TranslationContent } from "./types";

export type { Locale, TranslationContent };

const locales: Locale[] = ["es", "ca", "en"];

const defaultLocale: Locale = "es";

// Canonical/hreflang/OG origin. PUBLIC_BASE_URL is injected by CI from the
// staging and production GitHub environments (their stable custom domains).
// Preview builds leave it unset -> siteUrl is "" and absolute SEO tags are
// skipped (those pages are noindex anyway). Only trusted for indexable build
// types, so a stray var can never enable canonical tags on a preview build.
const buildType: string | undefined = import.meta.env.PUBLIC_BUILD_TYPE;
const baseUrl: string | undefined = import.meta.env.PUBLIC_BASE_URL;

export const siteUrl = buildType === "Production" || buildType === "Staging" ? (baseUrl ?? "") : "";

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

/** Localized label for each artwork sales status. */
export function statusLabels(dict: TranslationContent): Record<ArtworkStatus, string> {
  return {
    available: dict.catalog.statusAvailable,
    sold: dict.catalog.statusSold,
    nfs: dict.catalog.statusNfs,
  };
}

/** Public page path matching the directory URL served by the Worker and sitemap. */
export function localizedPath(locale: Locale, path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  return `${prefix}${trimmed}/`;
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
