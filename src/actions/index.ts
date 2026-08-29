import { ActionError, defineAction } from "astro:actions";
import { CONTACT_TO_EMAIL, RESEND_API_KEY } from "astro:env/server";
import { z } from "astro/zod";

export const server = {
  sendContact: defineAction({
    accept: "form",
    input: z.object({
      name: z.string().trim().min(1).max(200),
      email: z.email().trim().max(320),
      message: z.string().trim().min(1).max(4000),
      company: z.string().max(0).optional(),
      artwork: z.string().trim().max(100).optional(),
    }),
    handler: async (input) => {
      if (input.company) {
        return { ok: true as const };
      }

      if (!RESEND_API_KEY || !CONTACT_TO_EMAIL) {
        throw new ActionError({ code: "UNPROCESSABLE_CONTENT" });
      }

      const artworkReference = input.artwork ? `Obra: ${input.artwork}\n\n` : "";
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Antoni Mas Rexach <contacto@masrexach.com>",
          to: [CONTACT_TO_EMAIL],
          reply_to: [input.email],
          subject: input.artwork
            ? `Consulta obra ${input.artwork} — ${input.name} — masrexach.com`
            : `Mensaje de ${input.name} — masrexach.com`,
          text: `${input.name} (${input.email})\n\n${artworkReference}${input.message}`,
        }),
      });

      if (!response.ok) {
        throw new ActionError({ code: "UNPROCESSABLE_CONTENT" });
      }

      return { ok: true };
    },
  }),
};
