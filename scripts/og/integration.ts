import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { artworks } from "../../src/data/artworks";
import { type OgImage, resolveOgCard } from "../../src/lib/og";
import { renderOgCards } from "./render";

/** Build tooling only: the Worker receives plain descriptors, never Playwright. */
export function ogCardsIntegration(): AstroIntegration {
  let root: string;
  let staging: string;
  let generated: Promise<Record<string, OgImage>> | undefined;
  const generate = () => {
    generated ??= renderOgCards(
      (["es", "ca", "en"] as const).flatMap((locale) =>
        [
          "/",
          "/catalogo",
          "/biografia",
          "/exposiciones",
          ...artworks.map((art) => `/catalogo/${art.slug}`),
        ].map((path) => resolveOgCard(locale, path)),
      ),
      staging,
      { root },
    );
    return generated;
  };
  return {
    name: "gallery-open-graph-cards",
    hooks: {
      "astro:config:setup": ({ config, updateConfig, addWatchFile }) => {
        root = fileURLToPath(config.root);
        staging = fileURLToPath(new URL("og/", config.cacheDir));
        addWatchFile(new URL("src/assets/images/", config.root));
        addWatchFile(new URL("src/assets/fonts/", config.root));
        updateConfig({
          vite: {
            plugins: [
              {
                name: "gallery-og-manifest",
                resolveId(id) {
                  if (id === "virtual:og-manifest") return "\0virtual:og-manifest";
                },
                async load(id) {
                  if (id === "\0virtual:og-manifest")
                    return `export default ${JSON.stringify(await generate())}`;
                },
              },
            ],
          },
        });
      },
      "astro:build:start": async ({ logger }) => {
        const manifest = await generate();
        logger.info(`Generated ${Object.keys(manifest).length} original-asset social cards`);
      },
      "astro:build:done": async ({ dir }) => {
        // Astro 7 passes the resolved client asset output, including adapters.
        const output = fileURLToPath(dir);
        for (const image of Object.values(await generate())) {
          const destination = join(output, image.path);
          await mkdir(dirname(destination), { recursive: true });
          await copyFile(join(staging, image.path), destination);
        }
      },
      "astro:server:setup": ({ server }) => {
        server.middlewares.use(async (req, res, next) => {
          const path = req.url?.split("?")[0];
          if (!path?.startsWith("/assets/og/")) return next();
          try {
            const manifest = await generate();
            // Only serve generated manifest members, never arbitrary filesystem paths.
            if (!Object.values(manifest).some((image) => image.path === path)) return next();
            const { readFile } = await import("node:fs/promises");
            res.setHeader("Content-Type", "image/jpeg");
            res.end(await readFile(join(staging, path)));
          } catch (error) {
            next(error);
          }
        });
      },
    },
  };
}
