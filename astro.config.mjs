// @ts-check

import { writeFileSync } from "node:fs";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField, fontProviders } from "astro/config";

// Build-time environment selector, injected by CI from GitHub environment
// variables ("Preview" | "Staging" | "Production"). Anything not exactly
// "Production" is treated as non-indexable (fail-safe).
const BUILD_TYPE = process.env.PUBLIC_BUILD_TYPE ?? "";
const IS_PRODUCTION = BUILD_TYPE === "Production";

// _headers is generated here rather than kept in public/ so non-production
// builds can add X-Robots-Tag: noindex, nofollow (header-level hardening on
// top of the robots <meta>). The static security headers stay in all envs.
function envAwareHeaders() {
  return {
    name: "env-aware-headers",
    hooks: {
      "astro:build:done": ({ dir }) => {
        const headers = [
          "/*",
          "  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
          "  X-Frame-Options: DENY",
          "  X-Content-Type-Options: nosniff",
          "  Referrer-Policy: strict-origin-when-cross-origin",
          "  Permissions-Policy: camera=(), microphone=(), geolocation=()",
          "  X-XSS-Protection: 1; mode=block",
          "  Cross-Origin-Opener-Policy: same-origin",
          "  Cross-Origin-Resource-Policy: same-origin",
          ...(IS_PRODUCTION ? [] : ["  X-Robots-Tag: noindex, nofollow"]),
          "",
          "/*",
          "  Cache-Control: public, max-age=3600",
          "",
          "/_astro/*",
          "  Cache-Control: public, max-age=31536000, immutable",
          "",
          "/assets/*",
          "  Cache-Control: public, max-age=31536000, immutable",
          "",
        ];
        writeFileSync(new URL("_headers", dir), headers.join("\n"));
      },
    },
  };
}

export default defineConfig({
  site: "https://masrexach.marctonimas.com",
  adapter: cloudflare({ imageService: "compile" }),
  env: {
    schema: {
      RESEND_API_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      CONTACT_TO_EMAIL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https://api.resend.com",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
      ],
      scriptDirective: {
        resources: ["'self'"],
      },
    },
  },
  i18n: {
    locales: ["es", "ca", "en"],
    defaultLocale: "es",
    routing: { prefixDefaultLocale: false },
  },
  image: {
    quality: 72,
    format: ["webp", "jpeg"],
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "hover",
  },
  vite: {
    plugins: [tailwindcss()],
    define: {
      // Baked into the bundle at build time so the deployed Worker can report
      // the exact commit it was built from (src/pages/api/health.ts).
      __BUILD_SHA__: JSON.stringify(process.env.GITHUB_SHA ?? "unknown"),
    },
  },
  integrations: [
    // Sitemap only exists in production: it advertises indexable pages and is
    // referenced by robots.txt. Non-production robots.txt is Disallow: /, so no
    // sitemap. Legal pages (and /api/) are excluded even from the production
    // sitemap — they are noindex pages.
    ...(IS_PRODUCTION
      ? [
          sitemap({
            i18n: {
              defaultLocale: "es",
              locales: {
                es: "es",
                ca: "ca",
                en: "en",
              },
            },
            filter: (page) => !page.includes("/api/") && !page.includes("/legal"),
          }),
        ]
      : []),
    envAwareHeaders(),
  ],
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Fraunces",
      cssVariable: "--font-heading",
      fallbacks: ["Georgia", "serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/fraunces-latin-wght-normal.woff2"],
            weight: "100 900",
            style: "normal",
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Instrument Sans",
      cssVariable: "--font-text",
      fallbacks: ["system-ui", "sans-serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/instrument-sans-latin-wght-normal.woff2"],
            weight: "400 700",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/instrument-sans-latin-wght-italic.woff2"],
            weight: "400 700",
            style: "italic",
          },
        ],
      },
    },
  ],
});
