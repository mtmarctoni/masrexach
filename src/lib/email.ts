const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface ContactLead {
  name: string;
  email: string;
  message: string;
  artwork?: string;
}

interface EmailConfig {
  apiKey: string;
  from: string;
  to: string;
}

interface EmailPayload {
  from: string;
  to: string[];
  reply_to?: string[];
  subject: string;
  text: string;
  html: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function sendEmail(config: EmailConfig, payload: EmailPayload): Promise<void> {
  let lastStatus: number | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) return;

    lastStatus = res.status;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable) break;

    await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
  }

  throw new Error(lastStatus ? `Resend returned ${lastStatus}` : "Resend request failed");
}

export function sendContactNotification(config: EmailConfig, lead: ContactLead): Promise<void> {
  const artworkLine = lead.artwork ? `\nObra: ${lead.artwork}\n\n` : "";
  const artworkHtml = lead.artwork
    ? `<p style="margin:12px 0 0"><strong>Obra:</strong> ${esc(lead.artwork)}</p>`
    : "";
  const subject = lead.artwork
    ? `Consulta obra ${lead.artwork} — ${lead.name} — masrexach.com`
    : `Mensaje de ${lead.name} — masrexach.com`;
  const text = `${lead.name} (${lead.email})\n\n${artworkLine}${lead.message}`;
  const html = [
    `<h2 style="font-size:14px;color:#333;margin:0 0 8px">Nuevo mensaje de contacto</h2>`,
    `<p style="margin:4px 0"><strong>Nombre:</strong> ${esc(lead.name)}</p>`,
    `<p style="margin:4px 0"><strong>Email:</strong> <a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a></p>`,
    artworkHtml,
    lead.message
      .split("\n")
      .map((l) => `<p style="margin:12px 0 0">${esc(l) || "&nbsp;"}</p>`)
      .join("\n"),
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail(config, {
    from: config.from,
    to: [config.to],
    reply_to: [lead.email],
    subject,
    text,
    html,
  });
}

export function sendContactConfirmation(
  config: EmailConfig,
  lead: ContactLead,
  strings: { subject: string; heading: string; body: string; signature: string },
): Promise<void> {
  const text = [strings.heading, "", strings.body, "", lead.name, "", strings.signature].join("\n");
  const html = [
    `<p style="margin:0 0 12px">${esc(strings.heading)}</p>`,
    `<p style="margin:0 0 12px">${esc(strings.body)}</p>`,
    `<p style="margin:0 0 12px">${esc(lead.name)}</p>`,
    `<p style="margin:0;font-style:italic">${esc(strings.signature)}</p>`,
  ].join("\n");

  return sendEmail(config, {
    from: config.from,
    to: [lead.email],
    subject: strings.subject,
    text,
    html,
  });
}
