import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContactLead } from "../src/lib/email";
import { sendContactConfirmation, sendContactNotification } from "../src/lib/email";

const config = {
  apiKey: "re_test_key",
  from: "Site <noreply@example.com>",
  to: "owner@example.com",
};

const lead: ContactLead = {
  name: "Jane Doe",
  email: "jane@example.com",
  message: "I am interested in a painting.",
};

const confirmStrings = {
  subject: "We received your inquiry",
  heading: "Your message has been sent",
  body: "Thank you for contacting us.",
  signature: "— Antoni Mas Rexach",
};

describe("sendContactNotification", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the owner notification with correct payload", async () => {
    await sendContactNotification(config, lead);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, options] = fetchSpy.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.from).toBe("Site <noreply@example.com>");
    expect(body.to).toEqual(["owner@example.com"]);
    expect(body.reply_to).toEqual(["jane@example.com"]);
    expect(body.subject).toBe("Mensaje de Jane Doe — masrexach.com");
    expect(body.text).toContain("jane@example.com");
    expect(body.text).toContain("I am interested in a painting.");
    expect(body.html).toContain("Jane Doe");
  });

  it("includes artwork reference in subject and body", async () => {
    await sendContactNotification(config, { ...lead, artwork: "07-albufera" });

    const [, options] = fetchSpy.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.subject).toContain("07-albufera");
    expect(body.text).toContain("Obra: 07-albufera");
    expect(body.html).toContain("07-albufera");
  });

  it("retries once on 5xx then succeeds", async () => {
    fetchSpy
      .mockResolvedValueOnce({ ok: false, status: 502 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    await sendContactNotification(config, lead);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("retries once on 429 then succeeds", async () => {
    fetchSpy
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    await sendContactNotification(config, lead);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 4xx (non-429)", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 422 });

    await expect(sendContactNotification(config, lead)).rejects.toThrow("422");
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});

describe("sendContactConfirmation", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends confirmation to the submitter with localized content", async () => {
    await sendContactConfirmation(config, lead, confirmStrings);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, options] = fetchSpy.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.to).toEqual(["jane@example.com"]);
    expect(body.reply_to).toBeUndefined();
    expect(body.subject).toBe("We received your inquiry");
    expect(body.text).toContain("Your message has been sent");
    expect(body.text).toContain("Thank you for contacting us.");
    expect(body.html).toContain("Your message has been sent");
  });

  it("throws when Resend rejects the address", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 422 });

    await expect(sendContactConfirmation(config, lead, confirmStrings)).rejects.toThrow("422");
  });
});
