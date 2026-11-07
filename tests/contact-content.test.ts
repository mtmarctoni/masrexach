import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CONTACT_EMAIL } from "../src/data/site";
import ca from "../src/i18n/ca";
import en from "../src/i18n/en";
import es from "../src/i18n/es";

function textFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? textFiles(path)
      : /\.(astro|ts|js|json|md|html|txt|svg)$/.test(path)
        ? [path]
        : [];
  });
}

describe("contact privacy", () => {
  it("offers the official email as a direct contact link", () => {
    const page = readFileSync("src/pages/[...locale]/contacto.astro", "utf8");
    expect(CONTACT_EMAIL).toBe("masrexach@masrexach.com");
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Assert the literal Astro expression, not an interpolated email.
    expect(page).toContain("href={`mailto:${CONTACT_EMAIL}`}");
    expect(page).toContain(">{CONTACT_EMAIL}</a>");
    expect(page).not.toContain(CONTACT_EMAIL);
  });

  it("keeps the cellphone and telephone links out of website sources", () => {
    for (const file of [...textFiles("src"), ...textFiles("public")]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/670[\s.-]*831[\s.-]*743|tel:/i);
    }
  });

  it.each([es, ca, en])("provides a localized invitation instead of a phone label", (dict) => {
    expect(dict.contact).toHaveProperty("invitation");
    expect(dict.contact).not.toHaveProperty("phoneTitle");
  });
});
