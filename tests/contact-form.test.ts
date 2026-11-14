import { afterEach, describe, expect, it, vi } from "vitest";
import { artworks } from "../src/data/artworks";
import { initContactForm } from "../src/scripts/contact-form";

const { sendContact } = vi.hoisted(() => ({ sendContact: vi.fn(async (_data: FormData) => ({})) }));
vi.mock("astro:actions", () => ({ actions: { sendContact } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function setup(query: string, locale: "es" | "ca" | "en" = "es") {
  const artworkInput = { value: "" };
  const artworkBox = { hidden: true };
  const artworkTitle = { textContent: "" };
  const artworkCaption = { textContent: "" };
  const elements: Record<string, object> = {
    "[data-contact-artwork-input]": artworkInput,
    "[data-contact-artwork-box]": artworkBox,
    "[data-contact-artwork-title]": artworkTitle,
    "[data-contact-artwork-caption]": artworkCaption,
  };
  const fields = ["name", "email", "message"].map((name) => ({
    value: name === "email" ? "visitor@example.com" : "Visitor enquiry",
    getAttribute: () => name,
    setCustomValidity: vi.fn(),
    addEventListener: vi.fn(),
  }));
  let submitHandler: (event: { preventDefault(): void }) => Promise<void>;
  const form = {
    dataset: {
      contactI18n: JSON.stringify({ success: "Sent", submit: "Send" }),
      contactArtworks: JSON.stringify(
        Object.fromEntries(
          artworks.map((art) => [art.slug, { title: art.title, caption: art.caption[locale] }]),
        ),
      ),
      contactArtworkAliases: JSON.stringify({
        "07-albufera": "albufera",
        "02-orient-60x60": "orient-cuadrado",
        "05-orient-100x40": "orient-panoramico",
        "01-tiestos": "tiestos-oleo",
        "16-tiestos-acrilico": "tiestos-acrilico",
      }),
    },
    querySelector: (selector: string) => elements[selector],
    querySelectorAll: () => fields,
    addEventListener: (_name: string, handler: typeof submitHandler) => {
      submitHandler = handler;
    },
    reportValidity: () => true,
    reset: () => {
      artworkInput.value = "";
    },
  };
  const status = { textContent: "", classList: { add: vi.fn(), remove: vi.fn() } };
  const submitButton = { textContent: "Send", disabled: false };
  vi.stubGlobal("document", {
    querySelector: (selector: string) =>
      ({
        "[data-contact-form]": form,
        "[data-contact-status]": status,
        "[data-contact-submit]": submitButton,
      })[selector],
  });
  vi.stubGlobal("window", { location: { search: query } });
  // Node has no browser form element. Capture the real hidden field in the
  // FormData boundary; the initializer and submit handler run unchanged.
  vi.stubGlobal(
    "FormData",
    class extends FormData {
      constructor() {
        super();
        this.set("artwork", artworkInput.value);
      }
    },
  );
  initContactForm();
  return {
    artworkInput,
    artworkBox,
    artworkTitle,
    artworkCaption,
    status,
    submit: () => submitHandler({ preventDefault: vi.fn() }),
  };
}

describe("artwork enquiry compatibility", () => {
  it.each(["es", "ca", "en"] as const)("preserves an old enquiry in %s", async (locale) => {
    const form = setup("?obra=07-albufera&utm_source=shared", locale);
    expect(form.artworkBox.hidden).toBe(false);
    expect(form.artworkTitle.textContent).toBe("Albufera");
    expect(form.artworkCaption.textContent).toBe(
      artworks.find((art) => art.id === 7)?.caption[locale],
    );
    expect(form.artworkInput.value).toBe("albufera");
    await form.submit();
    expect(sendContact.mock.calls[0][0].get("artwork")).toBe("albufera");
    expect(form.status.textContent).toBe("Sent");
    expect(form.artworkInput.value).toBe("albufera");
    await form.submit();
    expect(sendContact.mock.calls[1][0].get("artwork")).toBe("albufera");
  });

  it.each([
    ["02-orient-60x60", "orient-cuadrado"],
    ["05-orient-100x40", "orient-panoramico"],
    ["01-tiestos", "tiestos-oleo"],
    ["16-tiestos-acrilico", "tiestos-acrilico"],
    ["albufera", "albufera"],
  ])("resolves %s to %s", (old, canonical) => {
    const form = setup(`?obra=${old}`);
    expect(form.artworkInput.value).toBe(canonical);
    expect(form.artworkBox.hidden).toBe(false);
  });

  it.each(["", "?obra=unknown", "?obra=__proto__", "?obra=constructor"])(
    "does not select a painting for %s",
    (query) => {
      const form = setup(query);
      expect(form.artworkInput.value).toBe("");
      expect(form.artworkBox.hidden).toBe(true);
    },
  );
});
