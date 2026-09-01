import { ActionError, defineAction } from "astro:actions";
import { CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL, RESEND_API_KEY } from "astro:env/server";
import { z } from "astro/zod";
import { getDict, type Locale } from "../i18n";
import { type ContactLead, sendContactConfirmation, sendContactNotification } from "../lib/email";

const DEFAULT_FROM = "Antoni Mas Rexach <masrexach@marctonimas.com>";

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
    handler: async (input) => {
      if (input.company) {
        return { ok: true as const };
      }

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
