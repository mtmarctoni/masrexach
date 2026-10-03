/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />

// The Cloudflare adapter resolves Worker bindings through the `cloudflare:workers`
// module (the same import its own server entry uses). The worker types are not
// part of this project, so declare the bindings this app reads instead of
// pulling in a second copy of the platform types: they must stay in sync with
// `wrangler.jsonc`.
declare module "cloudflare:workers" {
  /** Cloudflare rate-limit binding (see the "ratelimits" block in wrangler.jsonc). */
  interface RateLimiter {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  }

  export const env: {
    /** Per-IP cap on contact submissions; absent when deployed without the binding. */
    CONTACT_RATE_LIMITER?: RateLimiter;
  };
}

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
