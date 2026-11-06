import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { artworks } from "../src/data/artworks";

// Explicit opt-in: ordinary unit tests must not depend on a stale dist/ tree.
// pnpm test:og runs after a build with the same PUBLIC_* environment values.
const output = "dist/client";
const origin = process.env.PUBLIC_BASE_URL || "https://masrexach.com";
const buildType = process.env.PUBLIC_BUILD_TYPE || "Production";
const absoluteTags = buildType === "Production" || buildType === "Staging";
const locales = ["es", "ca", "en"] as const;
const sections = ["", "biografia", "catalogo", "exposiciones", "contacto", "legal"];
const paths = [...sections, ...artworks.map((art) => `catalogo/${art.slug}`)];

function decodeHtml(text: string) {
  const entities: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" };
  return text.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (entity, code: string) => {
    if (code.startsWith("#x")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    return entities[code] ?? entity;
  });
}

function attributes(tag: string) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decodeHtml(value)]),
  );
}

function metadata(html: string) {
  const result: Record<string, string> = {};
  for (const tag of html.matchAll(/<meta\s[^>]*>/g)) {
    const name = /(?:property|name)="([^"]+)"/.exec(tag[0])?.[1];
    const content = /content="([^"]*)"/.exec(tag[0])?.[1];
    if (name && content !== undefined) result[name] = decodeHtml(content);
  }
  return result;
}

describe.runIf(process.env.OG_VERIFY_BUILD === "1")("built sharing cards", () => {
  it("publishes every card with complete, matching metadata and original schema photos", async () => {
    const artworkUrls = new Set<string>();
    for (const locale of locales) {
      const prefix = locale === "es" ? "" : locale;
      for (const path of paths) {
        const html = await readFile(join(output, prefix, path, "index.html"), "utf8");
        const meta = metadata(html);
        expect(meta["og:locale"]).toBe({ es: "es_ES", ca: "ca_ES", en: "en_GB" }[locale]);
        expect(meta.robots).toBe(
          buildType === "Production" && path !== "legal"
            ? "index, follow, max-image-preview:large"
            : "noindex, nofollow",
        );
        if (!absoluteTags) {
          expect(meta["og:image"]).toBeUndefined();
          expect(meta["twitter:image"]).toBeUndefined();
          expect(meta["og:url"]).toBeUndefined();
          continue;
        }
        expect(meta["og:image"]).toMatch(
          new RegExp(`^${origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/assets/og/.+\\.jpg$`),
        );
        expect(meta["twitter:image"]).toBe(meta["og:image"]);
        expect(meta["og:image:width"]).toBe("1200");
        expect(meta["og:image:height"]).toBe("630");
        expect(meta["og:image:type"]).toBe("image/jpeg");
        expect(meta["og:image:alt"]).toBeTruthy();
        expect(meta["twitter:image:alt"]).toBe(meta["og:image:alt"]);
        expect(meta["twitter:card"]).toBe("summary_large_image");
        const file = await readFile(join(output, new URL(meta["og:image"]).pathname));
        const image = await sharp(file).metadata();
        expect([image.width, image.height, image.format]).toEqual([1200, 630, "jpeg"]);
        expect(file.length).toBeLessThanOrEqual(500_000);
        if (path.startsWith("catalogo/")) {
          artworkUrls.add(meta["og:image"]);
          expect(html).toMatch(/"image":"https:[^"]+\.webp"/);
          expect(html).toContain('"@type":"VisualArtwork"');
        }
      }
    }
    if (absoluteTags) expect(artworkUrls.size).toBe(75);
  });

  it("ships all 87 generated JPEGs with immutable-path caching", async () => {
    const files = await readdir(join(output, "assets/og"));
    expect(files.filter((file) => file.endsWith(".jpg"))).toHaveLength(87);
    const headers = await readFile(join(output, "_headers"), "utf8");
    expect(headers).toContain("/assets/*\n  Cache-Control: public, max-age=31536000, immutable");
    if (buildType !== "Production") expect(headers).toContain("X-Robots-Tag: noindex, nofollow");
  });

  it("aligns localized search metadata, artwork identity and canonical signals", async () => {
    const sitemap = new Set<string>();
    const sitemapAlternates = new Map<string, Record<string, string>>();
    if (buildType === "Production") {
      for (const file of (await readdir(output)).filter((name) =>
        /^sitemap-\d+\.xml$/.test(name),
      )) {
        const xml = await readFile(join(output, file), "utf8");
        for (const [, entry] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
          const url = /<loc>([^<]+)<\/loc>/.exec(entry)?.[1];
          if (!url) throw new Error("Sitemap entry missing URL");
          sitemap.add(decodeHtml(url));
          const alternates = Object.fromEntries(
            [...entry.matchAll(/<xhtml:link\s[^>]*>/g)].map(([tag]) => {
              const attrs = attributes(tag);
              return [attrs.hreflang, attrs.href];
            }),
          );
          sitemapAlternates.set(url, alternates);
        }
      }
      expect(sitemap.size).toBe((paths.length - 1) * 3);
    } else {
      expect((await readdir(output)).filter((name) => /^sitemap.*\.xml$/.test(name))).toEqual([]);
    }

    const indexableCanonicals = new Set<string>();
    const documents = new Map<string, string>();
    for (const locale of locales) {
      const descriptions = new Set<string>();
      const sectionTitles = new Set<string>();
      const prefix = locale === "es" ? "" : locale;
      for (const path of paths) {
        const publicPath = `/${[prefix, path].filter(Boolean).join("/")}${prefix || path ? "/" : ""}`;
        const html = await readFile(join(output, prefix, path, "index.html"), "utf8");
        documents.set(publicPath, html);
        const meta = metadata(html);
        const titleMatches = [...html.matchAll(/<title>([\s\S]*?)<\/title>/g)];
        expect(titleMatches, publicPath).toHaveLength(1);
        const title = decodeHtml(titleMatches[0][1]);
        expect(title).toContain("Antoni Mas Rexach");
        expect(meta.description).toBeTruthy();
        descriptions.add(meta.description);
        if (sections.includes(path)) sectionTitles.add(title);
        expect(meta["og:title"]).toBe(title);
        expect(meta["twitter:title"]).toBe(title);
        expect(meta["og:description"]).toBe(meta.description);
        expect(meta["twitter:description"]).toBe(meta.description);
        expect(html).toContain(`<html lang="${locale}"`);

        const links = [...html.matchAll(/<link\s[^>]*>/g)].map(([tag]) => attributes(tag));
        const canonicals = links.filter((link) => link.rel === "canonical");
        const alternates = links.filter((link) => link.rel === "alternate" && link.hreflang);
        if (absoluteTags) {
          expect(canonicals).toHaveLength(1);
          expect(canonicals[0].href).toBe(`${origin}${publicPath}`);
          expect(meta["og:url"]).toBe(canonicals[0].href);
          expect(alternates).toHaveLength(4);
          for (const language of [...locales, "x-default"]) {
            const targetPrefix = language === "es" || language === "x-default" ? "" : language;
            const targetPath = `/${[targetPrefix, path].filter(Boolean).join("/")}${targetPrefix || path ? "/" : ""}`;
            expect(alternates.find((link) => link.hreflang === language)?.href).toBe(
              `${origin}${targetPath}`,
            );
          }
          if (buildType === "Production" && path !== "legal") {
            indexableCanonicals.add(canonicals[0].href);
            expect(sitemap.has(canonicals[0].href)).toBe(true);
            for (const alternate of alternates) expect(sitemap.has(alternate.href)).toBe(true);
            for (const language of locales) {
              expect(sitemapAlternates.get(canonicals[0].href)?.[language]).toBe(
                alternates.find((link) => link.hreflang === language)?.href,
              );
            }
          }
          if (path === "legal") expect(sitemap.has(canonicals[0].href)).toBe(false);
        } else {
          expect(canonicals).toHaveLength(0);
          expect(alternates).toHaveLength(0);
          expect(meta["og:url"]).toBeUndefined();
        }

        // Parse JSON-LD in all build types, including previews without an origin.
        const schemas = [
          ...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
        ].map(([, json]) => JSON.parse(json));
        if (path === "" || path === "biografia") {
          const artist = schemas.find((schema) => schema["@type"] === "Person");
          expect(artist?.name).toBe("Antoni Mas Rexach");
          expect(artist["@id"]).toBe(absoluteTags ? `${origin}/#artist` : undefined);
          expect(artist.url).toBe(absoluteTags ? `${origin}/` : undefined);
        }
        if (path.startsWith("catalogo/")) {
          const art = artworks.find((item) => path === `catalogo/${item.slug}`);
          if (!art) throw new Error(`Missing artwork: ${path}`);
          const schema = schemas.find((item) => item["@type"] === "VisualArtwork");
          expect(schema?.name).toBe(art.title);
          expect(schema.text).toBe(art.caption[locale]);
          expect(schema.description).toBe(meta.description);
          expect(schema.inLanguage).toBe(locale);
          expect(schema.creator.name).toBe("Antoni Mas Rexach");
          expect(schema.creator["@type"]).toBe("Person");
          expect(schema.creator.birthDate).toBe("1953-09-06");
          expect(schema.creator.deathDate).toBe("2017-03-13");
          expect(meta.description).toContain("Antoni Mas Rexach");
          expect(meta.description).toContain(art.caption[locale]);
          expect(meta.description).not.toContain("..");
          expect(schema).not.toHaveProperty("offers");
          expect(schema).not.toHaveProperty("width");
          expect(schema).not.toHaveProperty("height");
          if (absoluteTags) {
            expect(schema.url).toBe(canonicals[0].href);
            expect(schema["@id"]).toBe(`${canonicals[0].href}#artwork`);
            expect(schema.creator["@id"]).toBe(`${origin}/#artist`);
            expect(schema.image).not.toBe(meta["og:image"]);
            const imagePath = new URL(schema.image).pathname;
            const imageSources = [...html.matchAll(/<img\b[^>]*>/g)].map(
              ([tag]) => attributes(tag).src,
            );
            expect(imageSources).toContain(imagePath);
            expect((await readFile(join(output, imagePath))).length).toBeGreaterThan(0);
          } else {
            expect(schema.url).toBeUndefined();
            expect(schema["@id"]).toBeUndefined();
            expect(schema.image).toBeUndefined();
            expect(schema.creator["@id"]).toBeUndefined();
          }
        }
      }
      // Distinct paintings may intentionally share their original title (Orient, Tiestos).
      expect(sectionTitles.size).toBe(sections.length);
      expect(descriptions.size).toBe(paths.length);
    }
    if (buildType === "Production") expect(indexableCanonicals).toEqual(sitemap);

    // Internal page links (including language switches) should resolve directly,
    // not add redirect hops or point at a nonexistent directory spelling.
    for (const [page, html] of documents) {
      for (const [tag] of html.matchAll(/<a\b[^>]*>/g)) {
        const href = attributes(tag).href;
        if (!href?.startsWith("/") || href.startsWith("//")) continue;
        const pathname = new URL(href, "https://example.test").pathname;
        expect(documents.has(pathname), `${page} links to ${href}`).toBe(true);
      }
    }
  });
});
