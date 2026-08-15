// @ts-check

import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
  site: "https://masrexach.marctonimas.com",
  adapter: cloudflare({ imageService: "compile" }),
  env: {
    schema: {
      RESEND_API_KEY: {
        type: "string",
        context: "server",
        access: "secret",
        optional: true,
      },
      CONTACT_TO_EMAIL: {
        type: "string",
        context: "server",
        access: "secret",
        optional: true,
      },
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
    sitemap({
      i18n: {
        defaultLocale: "es",
        locales: {
          es: "es",
          ca: "ca",
          en: "en",
        },
      },
      filter: (page) => !page.includes("/api/"),
    }),
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
