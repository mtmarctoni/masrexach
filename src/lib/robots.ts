const PRODUCTION_SITE_URL = "https://masrexach.marctonimas.com";

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
      `Sitemap: ${PRODUCTION_SITE_URL}/sitemap-index.xml`,
      "",
    ].join("\n");
  }
  return ["User-agent: *", "Disallow: /", ""].join("\n");
}
