import { describe, expect, it } from "vitest";
import ca from "../src/i18n/ca";
import en from "../src/i18n/en";
import es from "../src/i18n/es";

describe("safe homepage emphasis", () => {
  it.each([
    [es, "La luz de Mallorca, convertida en pintura.", ["luz", "pintura"], "no pintará más"],
    [ca, "La llum de Mallorca, convertida en pintura.", ["llum", "pintura"], "no pintarà més"],
    [
      en,
      "The light of Mallorca, turned into painting.",
      ["light", "painting"],
      "he will paint no more",
    ],
  ] as const)(
    "preserves localized copy as text and explicit emphasis",
    (dict, headline, emphasis, quote) => {
      expect(Array.isArray(dict.home.headline)).toBe(true);
      expect(Array.isArray(dict.home.finitaQuote)).toBe(true);
      for (const parts of [dict.home.headline, dict.home.finitaQuote]) {
        expect(parts.every((part) => typeof part === "string" || typeof part.em === "string")).toBe(
          true,
        );
        expect(
          parts.map((part) => (typeof part === "string" ? part : part.em)).join(""),
        ).not.toMatch(/[<>]/);
      }
      expect(
        dict.home.headline.map((part) => (typeof part === "string" ? part : part.em)).join(""),
      ).toBe(headline);
      expect(
        dict.home.headline.filter((part) => typeof part !== "string").map((part) => part.em),
      ).toEqual(emphasis);
      expect(
        dict.home.finitaQuote.filter((part) => typeof part !== "string").map((part) => part.em),
      ).toEqual([quote]);
    },
  );
});
