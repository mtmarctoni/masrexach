// Canonical origin for the production sitemap reference. CI injects
// PUBLIC_BASE_URL per GitHub environment (staging/production custom domains).
// The fallback keeps local production builds valid without the var.
const DEFAULT_SITE_URL = "https://masrexach.marctonimas.com";

function siteUrl(): string {
  // "" (unset var passed through as empty) falls back, not just undefined —
  // otherwise robots.txt would advertise "Sitemap: /sitemap-index.xml".
  return import.meta.env.PUBLIC_BASE_URL || DEFAULT_SITE_URL;
}

/** True only for production builds. Anything else (unset, "Preview", "Staging", typos) is non-indexable. */
export function isProductionBuild(): boolean {
  return import.meta.env.PUBLIC_BUILD_TYPE === "Production";
}

/** robots <meta> content. Indexable pages are only "index, follow" in production. */
export function robotsDirective(indexable: boolean): string {
  return isProductionBuild() && indexable ? "index, follow" : "noindex, nofollow";
}

/** robots.txt body. Non-production blocks all crawling and omits the sitemap reference. */
export function robotsTxt(isProduction: boolean): string {
  if (isProduction) {
    return [
      "User-agent: *",
      "Allow: /",
      "Disallow: /api/",
      "",
      `Sitemap: ${siteUrl()}/sitemap-index.xml`,
      "",
    ].join("\n");
  }
  return ["User-agent: *", "Disallow: /", ""].join("\n");
}
