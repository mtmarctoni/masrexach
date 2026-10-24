#!/usr/bin/env node
// Integration test for the built Worker. No Cloudflare account or email
// credentials are used. Run after `pnpm build`, for each build environment.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
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
    assert.match(robots, /Sitemap: https:\/\/masrexach\.marctonimas\.com\/sitemap-index\.xml/);
    const { stdout } = await promisify(execFile)(process.execPath, [
      "scripts/smoke.mjs",
      url.href,
      process.env.GITHUB_SHA ?? "unknown",
    ]);
    process.stdout.write(stdout);
  }
  console.log(`Built Worker checks passed (${staging ? "staging" : "production"}).`);
} finally {
  await server.close();
  await rm(root, { recursive: true, force: true });
}
