import { execFile } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

const SCRIPT = fileURLToPath(new URL("../scripts/sync-waf-rules.sh", import.meta.url));

interface StubRequest {
  method: string;
  url: string;
  body: unknown;
}

interface Stub {
  server: Server;
  base: string;
  requests: StubRequest[];
}

/** Stands in for the Cloudflare rulesets API so the reconcile logic is exercised end to end. */
async function startStub(handler: (req: StubRequest) => { status: number; body: unknown }) {
  const requests: StubRequest[] = [];

  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString();
      const entry: StubRequest = {
        method: req.method ?? "",
        url: req.url ?? "",
        body: raw ? JSON.parse(raw) : undefined,
      };
      requests.push(entry);

      const { status, body } = handler(entry);
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return { server, base: `http://127.0.0.1:${port}/client/v4`, requests } satisfies Stub;
}

const run = (env: NodeJS.ProcessEnv, args: string[] = []) =>
  execFileAsync("bash", [SCRIPT, ...args], {
    env: { PATH: process.env.PATH, ...env },
  });

interface RuleShape {
  description?: string;
  expression?: string;
  action?: string;
  ratelimit?: Record<string, unknown>;
}

/** The rules the script actually tried to write, or a failure if it wrote nothing. */
function writtenRules(requests: StubRequest[]): RuleShape[] {
  const put = requests.find((r) => r.method === "PUT");
  if (!put) {
    throw new Error("the script made no PUT request");
  }
  return (put.body as { rules: RuleShape[] }).rules;
}

const okEnv = (base: string) => ({
  CF_API_BASE: base,
  CLOUDFLARE_ZONE_ID: "zone123",
  CLOUDFLARE_API_TOKEN: "token123",
});

let stub: Stub | undefined;

beforeEach(() => {
  stub = undefined;
});

afterEach(async () => {
  if (stub) {
    await new Promise<void>((resolve) => stub?.server.close(() => resolve()));
  }
});

describe("--dry-run", () => {
  it("builds the payload without credentials or network access", async () => {
    const { stdout } = await run({}, ["--dry-run"]);
    const payload = JSON.parse(stdout);

    expect(payload.rules).toHaveLength(1);
    const [rule] = payload.rules;

    expect(rule.action).toBe("block");
    expect(rule.ratelimit).toEqual({
      characteristics: ["ip.src", "cf.colo.id"],
      period: 60,
      requests_per_period: 5,
      mitigation_timeout: 600,
    });
  });

  it("matches POST on both the production and staging hosts", async () => {
    const { stdout } = await run({}, ["--dry-run"]);
    const { expression } = JSON.parse(stdout).rules[0];

    expect(expression).toContain('http.request.method eq "POST"');
    expect(expression).toContain("masrexach.marctonimas.com");
    expect(expression).toContain("masrexach-staging.marctonimas.com");
    // Pinned hosts: marctonimas.com is a shared zone.
    expect(expression).toContain("http.host in");
  });

  it("honours threshold and host overrides", async () => {
    const { stdout } = await run(
      {
        WAF_PROTECTED_HOSTS: "a.example.com b.example.com",
        WAF_RATELIMIT_REQUESTS: "2",
        WAF_RATELIMIT_PERIOD: "600",
        WAF_RATELIMIT_TIMEOUT: "3600",
        WAF_RATELIMIT_ACTION: "managed_challenge",
      },
      ["--dry-run"],
    );
    const [rule] = JSON.parse(stdout).rules;

    expect(rule.action).toBe("managed_challenge");
    expect(rule.ratelimit.requests_per_period).toBe(2);
    expect(rule.ratelimit.period).toBe(600);
    expect(rule.ratelimit.mitigation_timeout).toBe(3600);
    expect(rule.expression).toBe(
      'http.request.method eq "POST" and http.host in {"a.example.com" "b.example.com"}',
    );
  });
});

describe("configuration guards", () => {
  it("skips without failing the deploy when the zone is unconfigured", async () => {
    const { stderr } = await run({ CLOUDFLARE_API_TOKEN: "token123" });

    expect(stderr).toContain("CLOUDFLARE_ZONE_ID is unset");
    expect(stderr).toContain("without a submission cap");
  });

  it("fails when a zone is configured but the token is missing", async () => {
    await expect(run({ CLOUDFLARE_ZONE_ID: "zone123" })).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("CLOUDFLARE_API_TOKEN is unset"),
    });
  });

  it("rejects unknown arguments", async () => {
    await expect(run({}, ["--force"])).rejects.toMatchObject({ code: 2 });
  });
});

describe("reconciling the rate-limit phase", () => {
  it("creates the rule on a zone that has no rate-limit ruleset yet", async () => {
    stub = await startStub((req) =>
      req.method === "GET"
        ? { status: 404, body: { success: false, errors: [], result: null } }
        : { status: 200, body: { success: true, errors: [], result: {} } },
    );

    const { stdout } = await run(okEnv(stub.base));

    expect(stdout).toContain("Rate-limit rule sync complete.");

    const rules = writtenRules(stub.requests);
    expect(rules).toHaveLength(1);
    expect(rules[0].description).toContain("[masrexach-contact]");
  });

  it("preserves rate-limit rules belonging to other sites on the shared zone", async () => {
    const foreign = {
      description: "other-project login throttle",
      expression: 'http.request.uri.path eq "/login"',
      action: "block",
    };

    stub = await startStub((req) =>
      req.method === "GET"
        ? { status: 200, body: { success: true, errors: [], result: { rules: [foreign] } } }
        : { status: 200, body: { success: true, errors: [], result: {} } },
    );

    const { stdout } = await run(okEnv(stub.base));

    expect(stdout).toContain("Preserving 1 rate-limit rule(s) not managed by this repo");

    const rules = writtenRules(stub.requests);

    expect(rules).toHaveLength(2);
    expect(rules[0]).toMatchObject(foreign);
    expect(rules[1].description).toContain("[masrexach-contact]");
  });

  it("replaces its own previous rule rather than appending a duplicate", async () => {
    const stale = {
      description: "[masrexach-contact] contact form submissions, per IP",
      expression: 'http.request.method eq "POST"',
      action: "log",
      ratelimit: { requests_per_period: 999 },
    };

    stub = await startStub((req) =>
      req.method === "GET"
        ? { status: 200, body: { success: true, errors: [], result: { rules: [stale] } } }
        : { status: 200, body: { success: true, errors: [], result: {} } },
    );

    await run(okEnv(stub.base));

    const rules = writtenRules(stub.requests);

    expect(rules).toHaveLength(1);
    expect(rules[0].action).toBe("block");
  });

  it("refuses to overwrite the phase when it cannot be read", async () => {
    stub = await startStub(() => ({
      status: 403,
      body: { success: false, errors: [{ code: 10000, message: "Authentication error" }] },
    }));

    await expect(run(okEnv(stub.base))).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("refusing to overwrite it"),
    });

    // The critical assertion: a failed read must never lead to a write.
    expect(stub.requests.every((r) => r.method !== "PUT")).toBe(true);
  });

  it("fails loudly when the write is rejected", async () => {
    stub = await startStub((req) =>
      req.method === "GET"
        ? { status: 404, body: { success: false, errors: [], result: null } }
        : {
            status: 400,
            body: { success: false, errors: [{ code: 20001, message: "Invalid period" }] },
          },
    );

    await expect(run(okEnv(stub.base))).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("HTTP 400"),
    });
  });
});
