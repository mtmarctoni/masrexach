/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />

// Baked in at build time via vite.define (see astro.config.mjs); reports the
// commit the deployed Worker was built from (see src/pages/api/health.ts).
declare const __BUILD_SHA__: string;
