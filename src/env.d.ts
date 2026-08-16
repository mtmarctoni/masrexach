/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />

// Baked in at build time via vite.define (see astro.config.mjs); reports the
// commit the deployed Worker was built from (see src/pages/api/health.ts).
declare const __BUILD_SHA__: string;

// Build-time environment selector ("Preview" | "Staging" | "Production"),
// injected by CI from GitHub environment variables. Unset → non-indexable.
// PUBLIC_BASE_URL carries the canonical origin per environment
// (staging/production custom domains; preview leaves it unset).
interface ImportMetaEnv {
  readonly PUBLIC_BUILD_TYPE?: string;
  readonly PUBLIC_BASE_URL?: string;
}
