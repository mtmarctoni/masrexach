import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { chromium, type Page } from "playwright";
import sharp from "sharp";
import type { OgCard, OgImage } from "../../src/lib/og";

interface RenderOptions {
  root?: string;
  templateRevision?: string;
}

// Bump when changing layout, fitting, encoding or other rendering behavior.
const TEMPLATE_REVISION = "gallery-v2";
const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char,
  );

export async function prepareOgCard(card: OgCard, options: RenderOptions = {}) {
  const root = options.root ?? process.cwd();
  const [headingFont, textFont] = await Promise.all([
    readFile(join(root, "src/assets/fonts/fraunces-latin-wght-normal.woff2")),
    readFile(join(root, "src/assets/fonts/instrument-sans-latin-wght-normal.woff2")),
  ]);
  const image = await readFile(join(root, "src/assets/images", card.imageFile));
  const hash = createHash("sha256")
    .update(options.templateRevision ?? TEMPLATE_REVISION)
    .update(JSON.stringify(card))
    .update(headingFont)
    .update(textFont)
    .update(image)
    .digest("hex")
    .slice(0, 16);
  const title = card.kind === "artwork" ? escapeHtml(card.title) : "Antoni<br>Mas Rexach";
  const html = `<!doctype html><html lang="${card.locale}"><head><meta charset="utf-8"><style>
    @font-face { font-family: Fraunces; src: url(data:font/woff2;base64,${headingFont.toString("base64")}); font-weight: 100 900; }
    @font-face { font-family: Instrument; src: url(data:font/woff2;base64,${textFont.toString("base64")}); font-weight: 400 700; }
    * { box-sizing: border-box; } html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
    body { background: #faf7f1; color: #211d17; font-family: Instrument; -webkit-font-smoothing: antialiased; }
    .copy { position: absolute; left: 60px; top: 120px; width: 520px; }
    h1 { font-family: Fraunces; font-size: ${card.kind === "artwork" ? 66 : 80}px; font-weight: 450; line-height: 1.08; letter-spacing: -2px; margin: 0; overflow-wrap: anywhere; }
    .subtitle { font-size: 30px; line-height: 1.35; margin: 28px 0 0; max-width: 500px; text-wrap: balance; }
    .dates { font-size: 23px; color: #8a5a33; margin: 16px 0 0; }
    .footer { position: absolute; left: 60px; bottom: 64px; font-size: 23px; }
    .footer::before { content: ''; display: block; width: 36px; height: 2px; margin-bottom: 36px; background: #8a5a33; }
    .frame { position: absolute; left: 640px; top: 60px; width: 500px; height: 510px; padding: 8px; display: flex; align-items: center; justify-content: center; }
    img { display: block; width: auto; height: auto; max-width: 100%; max-height: 100%; box-shadow: 0 0 0 8px white; object-fit: contain; }
  </style></head><body>
    <div class="copy"><h1>${title}</h1><p class="subtitle">${escapeHtml(card.subtitle)}</p>${card.kind === "artwork" ? "" : '<p class="dates">1953 — 2017</p>'}</div>
    <div class="footer">masrexach.com</div><div class="frame"><img src="data:image/jpeg;base64,${image.toString("base64")}" alt="${escapeHtml(card.alt)}"></div>
  </body></html>`;
  return { html, hash };
}

export async function fitOgCard(page: Page, card: OgCard) {
  await page
    .evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode()));
      const title = document.querySelector("h1");
      const copy = document.querySelector<HTMLElement>(".copy");
      if (!title || !copy) throw new Error("Card template is missing its text elements");
      // Keep the whole title and copy above the footer; never use ellipsis.
      let size = Number.parseFloat(getComputedStyle(title).fontSize);
      while (
        (copy.getBoundingClientRect().bottom > 456 || copy.scrollWidth > copy.clientWidth) &&
        size > 32
      ) {
        size -= 1;
        (title as HTMLElement).style.fontSize = `${size}px`;
      }
      if (copy.getBoundingClientRect().bottom > 456 || copy.scrollWidth > copy.clientWidth) {
        throw new Error("Card text exceeds its safe area");
      }
      if (
        !document.fonts.check('450 40px "Fraunces"') ||
        !document.fonts.check('400 30px "Instrument"')
      ) {
        throw new Error("Card fonts did not load");
      }
    })
    .catch((error) => {
      throw new Error(`Open Graph layout failed for ${card.key}: ${error.message}`, {
        cause: error,
      });
    });
}

export async function renderOgCards(
  cards: OgCard[],
  outputDir: string,
  options: RenderOptions = {},
): Promise<Record<string, OgImage>> {
  const manifest: Record<string, OgImage> = {};
  // One browser, at most two concurrent pages; never contact remote services.
  const browser = await chromium.launch();
  try {
    const queue = [...cards];
    await Promise.all(
      Array.from({ length: Math.min(2, cards.length) }, async () => {
        const page = await browser.newPage({
          viewport: { width: 1200, height: 630 },
          deviceScaleFactor: 1,
        });
        await page.route(/^https?:/, (route) => route.abort());
        for (let card = queue.shift(); card; card = queue.shift()) {
          const { html, hash } = await prepareOgCard(card, options);
          await page.setContent(html);
          await fitOgCard(page, card);
          const png = await page.screenshot({ type: "png", animations: "disabled" });
          let jpeg = Buffer.alloc(0);
          for (const quality of [85, 80, 75, 70]) {
            jpeg = await sharp(png)
              .toColourspace("srgb")
              .jpeg({ quality, chromaSubsampling: "4:4:4" })
              .toBuffer();
            if (jpeg.length <= 300_000) break;
          }
          if (jpeg.length > 500_000) throw new Error(`Open Graph card exceeds 500 KB: ${card.key}`);
          const path = `/assets/og/${card.key.replaceAll("/", "-")}-${hash}.jpg`;
          const filename = join(outputDir, path);
          await mkdir(dirname(filename), { recursive: true });
          await writeFile(filename, jpeg);
          manifest[card.key] = {
            path,
            width: 1200,
            height: 630,
            type: "image/jpeg",
            alt: card.alt,
          };
        }
      }),
    );
  } finally {
    await browser.close();
  }
  return Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
}
