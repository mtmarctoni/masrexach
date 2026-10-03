import { ActionError, defineAction } from "astro:actions";
import { CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL, RESEND_API_KEY } from "astro:env/server";
import { env } from "cloudflare:workers";
import { z } from "astro/zod";
import { getDict, type Locale } from "../i18n";
import { type ContactLead, sendContactConfirmation, sendContactNotification } from "../lib/email";

const DEFAULT_FROM = "Antoni Mas Rexach <masrexach@marctonimas.com>";

/**
 * Per-IP throttle for the contact action: it relays email to a caller-supplied
 * address, so without a cap the endpoint is a spam relay and burns the Resend
 * quota. Backed by the Cloudflare rate-limit binding declared in
 * `wrangler.jsonc` (5 submissions / 60s / IP), which counts at the edge and so
 * survives cold starts and isolate churn. Its counters are per-location and
 * eventually consistent — fine for abuse prevention, not for accounting.
 *
 * Fails open when the binding or the client IP is unavailable: Cloudflare only
 * attaches `CF-Connecting-IP` to requests that reach the edge, so a missing
 * header means local/dev — throttling every such client under one shared key
 * would lock out local testing without protecting anything.
 *
 * The honeypot field (`company`) is the other half of the defence: its schema
 * allows only the empty string, so a bot that fills it fails input validation
 * and never reaches the mail path.
 */
async function enforceRateLimit(request: Request): Promise<void> {
  const limiter = env.CONTACT_RATE_LIMITER;
  const ip = request.headers.get("CF-Connecting-IP");
  if (!limiter || !ip) return;

  const { success } = await limiter.limit({ key: ip });
  if (!success) {
    throw new ActionError({ code: "TOO_MANY_REQUESTS" });
  }
}

export const server = {
  sendContact: defineAction({
    accept: "form",
    input: z.object({
      name: z.string().trim().min(1).max(200),
      email: z.email().trim().max(320),
      message: z.string().trim().min(1).max(4000),
      company: z.string().max(0).optional(),
      artwork: z.string().trim().max(100).optional(),
      lang: z.enum(["es", "ca", "en"]).optional(),
    }),
    handler: async (input, context) => {
      if (input.company) {
        return { ok: true as const };
      }

      await enforceRateLimit(context.request);

      if (!RESEND_API_KEY || !CONTACT_TO_EMAIL) {
        throw new ActionError({ code: "UNPROCESSABLE_CONTENT" });
      }

      const config = {
        apiKey: RESEND_API_KEY,
        from: CONTACT_FROM_EMAIL || DEFAULT_FROM,
        to: CONTACT_TO_EMAIL,
      };

      const lead: ContactLead = {
        name: input.name,
        email: input.email,
        message: input.message,
        artwork: input.artwork || undefined,
      };

      await sendContactNotification(config, lead);

      const locale: Locale = input.lang ?? "es";
      const f = getDict(locale).contact.form;

      try {
        await sendContactConfirmation(config, lead, {
          subject: f.confirmationSubject,
          heading: f.confirmationHeading,
          body: f.confirmationBody,
          signature: f.confirmationSignature,
        });
      } catch {
        // Best-effort: do not fail the action if the confirmation email bounces.
      }

      return { ok: true };
    },
  }),
};
