#!/usr/bin/env node
// Post-deploy smoke test. Usage: node scripts/smoke.mjs <baseURL> [expectedSHA]
// Exits non-zero if any check fails, failing the calling CI job.

const [baseArg, expectedSha] = process.argv.slice(2);

if (!baseArg) {
  console.error("usage: node scripts/smoke.mjs <baseURL> [expectedSHA]");
  process.exit(2);
}

const base = baseArg.replace(/\/$/, "");
// "/", "/ca/", "/en/", "/exposiciones/", "/legal/": comma-separated quoted paths - root, each non-default locale root, one deep route, one noindex route.
// Example: "/", "/es/", "/en/", "/blog/<slug>/"
const PATHS = ["/", "/ca/", "/en/", "/exposiciones/", "/legal/"];
// Preview (workers.dev) and staging hosts both contain "staging"; production
// (masrexach.marctonimas.com) does not. Non-production builds are noindex.
const IS_STAGING_HOST = /staging/i.test(new URL(base).hostname);
// Adapter-less (contact-off) builds have no Worker and no /api/health route:
// run smoke with SMOKE_EXPECT_HEALTH=0 to skip the health check.
const EXPECT_HEALTH = process.env.SMOKE_EXPECT_HEALTH !== "0";
// Worker version propagation is usually seconds but has been observed to take
// over 15s; give it a full minute before declaring the deploy stale.
const HEALTH_RETRIES = 10;
const HEALTH_RETRY_DELAY_MS = 6000;
const failures = [];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function check(label, fn) {
  try {
    await fn();
    console.log(`ok   ${label}`);
  } catch (err) {
    failures.push(`${label}: ${err.message}`);
    console.error(`FAIL ${label}: ${err.message}`);
  }
}

// /api/health is served by the Worker script (never prerendered, never
// edge-cached), so its commit SHA flips atomically with the deploy. Retries
// only cover the seconds-scale global propagation of a new Worker version.
async function assertHealth() {
  const res = await fetch(`${base}/api/health`);
  if (res.status !== 200) throw new Error(`status ${res.status}`);
  if (res.headers.get("cache-control") !== "no-store") {
    throw new Error("health response must be Cache-Control: no-store (is it prerendered again?)");
  }
  const body = await res.json();
  if (body.status !== "ok") throw new Error(`status field "${body.status}"`);
  if (expectedSha && body.commit !== expectedSha) {
    throw new Error(`commit ${body.commit} != expected ${expectedSha} (stale deploy?)`);
  }
}

async function main() {
  if (EXPECT_HEALTH)
    await check("GET /api/health", async () => {
      let lastErr;
      for (let i = 0; i < HEALTH_RETRIES; i++) {
        try {
          await assertHealth();
          return;
        } catch (err) {
          lastErr = err;
          if (i < HEALTH_RETRIES - 1) {
            console.log(`  retry ${i + 1}/${HEALTH_RETRIES} after ${HEALTH_RETRY_DELAY_MS}ms...`);
            await sleep(HEALTH_RETRY_DELAY_MS);
          }
        }
      }
      throw lastErr;
    });

  let homeHtml = "";
  let robotsTxtBody = "";
  await check("GET / (with security headers)", async () => {
    const res = await fetch(`${base}/`);
    if (res.status !== 200) throw new Error(`status ${res.status}`);
    // Static pages get their headers from _headers via Workers Assets;
    // assert them here, on a real page, where they protect actual users.
    if (res.headers.get("x-content-type-options") !== "nosniff") {
      throw new Error("missing X-Content-Type-Options: nosniff");
    }
    if (!res.headers.get("content-security-policy")) {
      throw new Error("missing Content-Security-Policy");
    }
    homeHtml = await res.text();
  });

  await check("GET /robots.txt", async () => {
    const res = await fetch(`${base}/robots.txt`);
    if (res.status !== 200) throw new Error(`status ${res.status}`);
    robotsTxtBody = await res.text();
    // Production robots.txt always references the sitemap, whose URL is built
    // from PUBLIC_BASE_URL at build time. Guard against a misconfigured var:
    // a trailing slash would yield "//sitemap-index.xml" and a wrong host
    // would advertise the staging/preview domain — both deploy silently
    // otherwise. Staging/preview correctly have no sitemap line.
    if (!IS_STAGING_HOST) {
      const sitemapUrl = robotsTxtBody.match(/Sitemap:\s*(\S+)/)?.[1];
      if (!sitemapUrl)
        throw new Error("missing Sitemap line (is PUBLIC_BASE_URL set for production?)");
      if (sitemapUrl.includes("//"))
        throw new Error(`malformed sitemap URL "${sitemapUrl}" (PUBLIC_BASE_URL trailing slash?)`);
      if (new URL(sitemapUrl).hostname !== "masrexach.marctonimas.com") {
        throw new Error(`sitemap URL host mismatch "${sitemapUrl}"`);
      }
    }
  });

  for (const path of PATHS.slice(1)) {
    await check(`GET ${path}`, async () => {
      const res = await fetch(`${base}${path}`);
      if (res.status !== 200) throw new Error(`status ${res.status}`);
    });
  }

  // Advisory only: static assets revalidate through the edge cache, so pages
  // can lag a deploy by a few minutes at any given location. Not a failure --
  // the cache converges on its own -- but worth surfacing in the deploy log.
  if (expectedSha && homeHtml && !homeHtml.includes(`content="${expectedSha}"`)) {
    console.log("warn / still serves a previous build (edge cache converging, not fatal)");
  }
  if (robotsTxtBody) {
    const expectedRobots = IS_STAGING_HOST
      ? "Disallow: /"
      : "Sitemap: https://masrexach.marctonimas.com/sitemap-index.xml";
    if (!robotsTxtBody.includes(expectedRobots)) {
      console.log(
        `warn / robots.txt does not reflect this build yet (expected "${expectedRobots}", edge cache converging, not fatal)`,
      );
    }
  }
  if (homeHtml) {
    const expectedMeta = IS_STAGING_HOST ? "noindex, nofollow" : "index, follow";
    if (!homeHtml.includes(`content="${expectedMeta}"`)) {
      console.log(
        `warn / robots meta does not reflect this build yet (expected "${expectedMeta}", edge cache converging, not fatal)`,
      );
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${PATHS.length + (EXPECT_HEALTH ? 1 : 0) + 1} checks passed against ${base}`);
}

main();
