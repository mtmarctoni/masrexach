import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConfirmationStrings, ContactLead } from "../src/lib/email";
import {
  sendContactConfirmation,
  sendContactEmails,
  sendContactNotification,
} from "../src/lib/email";

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

const confirmStrings: ConfirmationStrings = {
  subject: "We received your inquiry",
  heading: "Your message has been sent",
  greeting: "Hello {name},",
  body: "Thank you for contacting us.",
  artworkLabel: "Artwork of interest:",
  messageLabel: "Your message:",
  signature: "— Antoni Mas Rexach",
};

let fetchSpy: ReturnType<typeof vi.fn>;

const bodyOf = (call: number) => JSON.parse(fetchSpy.mock.calls[call][1].body);

beforeEach(() => {
  fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sendContactNotification", () => {
  it("sends the owner notification with correct payload", async () => {
    await sendContactNotification(config, lead);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const body = bodyOf(0);

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

    const body = bodyOf(0);

    expect(body.subject).toContain("07-albufera");
    expect(body.text).toContain("Obra: 07-albufera");
    expect(body.html).toContain("07-albufera");
  });

  it("collapses newlines in user input before it reaches the subject", async () => {
    await sendContactNotification(config, {
      ...lead,
      name: "Jane\r\nBcc: victim@example.com",
    });

    const body = bodyOf(0);

    expect(body.subject).not.toMatch(/[\r\n]/);
    expect(body.subject).toBe("Mensaje de Jane Bcc: victim@example.com — masrexach.com");
  });

  it("escapes HTML-significant characters in the lead, including quotes", async () => {
    await sendContactNotification(config, {
      ...lead,
      name: "<script>alert(1)</script>",
      message: 'He said "hello" & left',
    });

    const body = bodyOf(0);

    expect(body.html).not.toContain("<script>");
    expect(body.html).toContain("&lt;script&gt;");
    expect(body.html).toContain("&quot;hello&quot;");
    expect(body.html).toContain("&amp;");
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

  it("stops after the second attempt without sleeping again", async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 502 });
    const sleepSpy = vi.spyOn(globalThis, "setTimeout");

    await expect(sendContactNotification(config, lead)).rejects.toThrow("502");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    // One backoff between the two attempts, none after the last failure.
    expect(sleepSpy).toHaveBeenCalledTimes(1);
  });
});

describe("sendContactConfirmation", () => {
  it("sends confirmation to the submitter with localized content", async () => {
    await sendContactConfirmation(config, lead, confirmStrings);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const body = bodyOf(0);

    expect(body.to).toEqual(["jane@example.com"]);
    expect(body.reply_to).toBeUndefined();
    expect(body.subject).toBe("We received your inquiry");
    expect(body.text).toContain("Your message has been sent");
    expect(body.text).toContain("Thank you for contacting us.");
    expect(body.html).toContain("Your message has been sent");
  });

  it("greets the submitter by name before the body", async () => {
    await sendContactConfirmation(config, lead, confirmStrings);

    const body = bodyOf(0);

    expect(body.text).toContain("Hello Jane Doe,");
    expect(body.html).toContain("Hello Jane Doe,");
    expect(body.text.indexOf("Hello Jane Doe,")).toBeLessThan(
      body.text.indexOf("Thank you for contacting us."),
    );
    // The signature closes the message, the submitter's name does not.
    expect(body.text.trimEnd().endsWith("— Antoni Mas Rexach")).toBe(true);
  });

  it("echoes the submitted message back to the sender", async () => {
    await sendContactConfirmation(config, lead, confirmStrings);

    const body = bodyOf(0);

    expect(body.text).toContain("Your message:");
    expect(body.text).toContain("> I am interested in a painting.");
    expect(body.html).toContain("I am interested in a painting.");
  });

  it("echoes the artwork reference when there is one", async () => {
    await sendContactConfirmation(config, { ...lead, artwork: "07-albufera" }, confirmStrings);

    const body = bodyOf(0);

    expect(body.text).toContain("Artwork of interest: 07-albufera");
    expect(body.html).toContain("07-albufera");
  });

  it("omits the artwork line for a general enquiry", async () => {
    await sendContactConfirmation(config, lead, confirmStrings);

    const body = bodyOf(0);

    expect(body.text).not.toContain("Artwork of interest:");
    expect(body.html).not.toContain("Artwork of interest:");
  });

  it("throws when Resend rejects the address", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 422 });

    await expect(sendContactConfirmation(config, lead, confirmStrings)).rejects.toThrow("422");
  });
});

describe("sendContactEmails", () => {
  it("sends the owner notification first, then the confirmation", async () => {
    await sendContactEmails(config, lead, confirmStrings);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(bodyOf(0).to).toEqual(["owner@example.com"]);
    expect(bodyOf(1).to).toEqual(["jane@example.com"]);
  });

  it("does not fail the submission when the confirmation bounces", async () => {
    fetchSpy
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValue({ ok: false, status: 422 });

    await expect(sendContactEmails(config, lead, confirmStrings)).resolves.toBeUndefined();
  });

  it("propagates a failed owner notification and skips the confirmation", async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 422 });

    await expect(sendContactEmails(config, lead, confirmStrings)).rejects.toThrow("422");
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("defers the confirmation to waitUntil when the platform provides one", async () => {
    const deferred: Promise<unknown>[] = [];

    await sendContactEmails(config, lead, confirmStrings, (p) => {
      deferred.push(p);
    });

    expect(deferred).toHaveLength(1);
    await Promise.all(deferred);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("swallows a deferred confirmation failure rather than rejecting the deferred promise", async () => {
    fetchSpy
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValue({ ok: false, status: 422 });

    const deferred: Promise<unknown>[] = [];
    await sendContactEmails(config, lead, confirmStrings, (p) => {
      deferred.push(p);
    });

    await expect(Promise.all(deferred)).resolves.toBeDefined();
  });
});
