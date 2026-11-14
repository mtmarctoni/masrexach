#!/usr/bin/env node
// Integration test for the built Worker. No Cloudflare account or email
// credentials are used. Run after `pnpm build`, for each build environment.
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { createTestHarness } from "wrangler";

const config = JSON.parse(await readFile("dist/server/wrangler.json", "utf8"));
const staging = config.name === "masrexach-staging";
assert.ok(staging || config.name === "masrexach", `unexpected Worker name: ${config.name}`);
assert.deepEqual(config.ratelimits, [
  {
    name: "CONTACT_RATE_LIMITER",
    namespace_id: staging ? "1002" : "1001",
    simple: { limit: 5, period: 60 },
  },
]);

// Isolate the harness from .env/.dev.vars files and all real bindings. Only
// local sessions, assets and rate-limit bindings from the build are used.
const root = await mkdtemp(join(tmpdir(), "masrexach-worker-test-"));
const server = createTestHarness({
  root,
  workers: [
    {
      config: {
        name: config.name,
        main: resolve("dist/server", config.main),
        compatibility_date: config.compatibility_date,
        compatibility_flags: config.compatibility_flags,
        rules: config.rules,
        no_bundle: true,
        assets: { ...config.assets, directory: resolve("dist/server", config.assets.directory) },
        kv_namespaces: config.kv_namespaces,
        ratelimits: config.ratelimits,
        vars: { RESEND_API_KEY: "", CONTACT_TO_EMAIL: "", CONTACT_FROM_EMAIL: "" },
      },
    },
  ],
});

try {
  const { url } = await server.listen();
  const health = await server.fetch("/api/health");
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    status: "ok",
    commit: (process.env.GITHUB_SHA ?? "unknown").slice(0, 7),
  });
  assert.equal(health.headers.get("Cache-Control"), "no-store");
  assert.equal(health.headers.get("X-Robots-Tag"), "noindex");

  const { artworks } = await import("../src/data/artworks.ts");
  // All 75 previously published catalogue URLs must reach a real page in one
  // hop. Also exercise slashless requests, HEAD, and query preservation.
  for (const art of artworks) {
    const oldSlug = art.image.replace(/\.jpg$/, "");
    for (const prefix of ["", "/ca", "/en"]) {
      const destination = `${prefix}/catalogo/${art.slug}/`;
      for (const slash of ["", "/"]) {
        for (const method of ["GET", "HEAD"]) {
          const path = `${prefix}/catalogo/${oldSlug}${slash}?utm_source=google`;
          const response = await server.fetch(path, { method, redirect: "manual" });
          assert.equal(response.status, 301, path);
          assert.equal(response.headers.get("Location"), `${destination}?utm_source=google`, path);
        }
      }
      const target = await server.fetch(destination, { redirect: "manual" });
      assert.equal(target.status, 200, destination);
      const html = await target.text();
      assert.ok(html.includes(`/catalogo/${art.slug}/`), `clean URL missing: ${destination}`);
      assert.ok(!html.includes(`/catalogo/${oldSlug}/`), `old URL in page: ${destination}`);
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      if (canonical) assert.equal(new URL(canonical).pathname, destination);
    }
  }
  for (const path of ["/catalogo/99-unknown/", "/fr/catalogo/17-nenufares/"]) {
    const response = await server.fetch(path, { redirect: "manual" });
    assert.equal(response.status, 404, `${path}: ${await response.text()}`);
  }
  if (!staging) {
    const sitemap = await server.fetch("/sitemap-0.xml");
    assert.equal(sitemap.status, 200);
    const xml = await sitemap.text();
    assert.doesNotMatch(xml, /\/catalogo\/\d{2}-/);
    for (const art of artworks) {
      for (const prefix of ["", "/ca", "/en"]) {
        assert.ok(
          xml.includes(`${prefix}/catalogo/${art.slug}/`),
          `missing sitemap URL: ${art.slug}`,
        );
      }
    }
  }

  for (const path of ["/", "/ca/"]) {
    const page = await server.fetch(path);
    assert.equal(page.headers.get("X-Content-Type-Options"), "nosniff", path);
    assert.equal(page.headers.get("X-Frame-Options"), "DENY", path);
    assert.equal(page.headers.get("Cache-Control"), "public, max-age=3600", path);
    assert.equal(page.headers.get("X-Robots-Tag"), staging ? "noindex, nofollow" : null, path);
  }

  async function submit(ip) {
    const response = await server.fetch("/_actions/sendContact", {
      method: "POST",
      headers: { "CF-Connecting-IP": ip, Origin: url.origin },
      body: new URLSearchParams({
        name: "Local integration test",
        email: "nobody@example.com",
        message: "No email should be sent: credentials are deliberately absent.",
        company: "",
        lang: "es",
      }),
    });
    const body = await response.text();
    return { status: response.status, body };
  }

  // Missing credentials are checked *after* throttling. An allowed request
  // therefore returns 422, not a successful email; the sixth must return 429.
  for (let attempt = 1; attempt <= 5; attempt++) {
    const result = await submit("192.0.2.1");
    assert.equal(result.status, 422, `allowed attempt ${attempt}: ${result.body}`);
    assert.match(result.body, /UNPROCESSABLE_CONTENT/);
  }
  const blocked = await submit("192.0.2.1");
  assert.equal(blocked.status, 429, blocked.body);
  assert.match(blocked.body, /TOO_MANY_REQUESTS/);

  const otherClient = await submit("192.0.2.2");
  assert.equal(otherClient.status, 422, otherClient.body);
  assert.match(otherClient.body, /UNPROCESSABLE_CONTENT/);

  const robots = await (await server.fetch("/robots.txt")).text();
  if (staging) {
    assert.match(robots, /Disallow: \//);
    assert.doesNotMatch(robots, /Sitemap:/);
  } else {
    assert.match(robots, /Sitemap: https:\/\/masrexach\.com\/sitemap-index\.xml/);
    // Run the real smoke CLI against the local Worker, retaining the public
    // origin in argv so sitemap validation checks the actual production SEO.
    await runInNewContext(await readFile("scripts/smoke.mjs", "utf8"), {
      URL,
      console,
      setTimeout,
      process: {
        argv: [
          "node",
          "scripts/smoke.mjs",
          "https://masrexach.com",
          process.env.GITHUB_SHA ?? "unknown",
        ],
        env: {},
        exit: (code) => assert.fail(`smoke exited with ${code}`),
      },
      fetch: (input) => server.fetch(new URL(input).pathname),
    });
  }
  console.log(`Built Worker checks passed (${staging ? "staging" : "production"}).`);
} finally {
  await server.close();
  await rm(root, { recursive: true, force: true });
}
