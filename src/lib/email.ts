const RESEND_ENDPOINT = "https://api.resend.com/emails";

const MAX_ATTEMPTS = 2;
const RETRY_BASE_MS = 300;

export interface ContactLead {
  name: string;
  email: string;
  message: string;
  artwork?: string;
}

export interface EmailConfig {
  apiKey: string;
  from: string;
  to: string;
}

/** Localized copy for the courtesy email sent back to the submitter. */
export interface ConfirmationStrings {
  subject: string;
  heading: string;
  /** Contains a {name} placeholder, e.g. "Hola {name},". */
  greeting: string;
  body: string;
  artworkLabel: string;
  messageLabel: string;
  signature: string;
}

interface EmailPayload {
  from: string;
  to: string[];
  reply_to?: string[];
  subject: string;
  text: string;
  html: string;
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Subjects are a single header line. Zod trims the ends but leaves interior
// newlines, so collapse them before interpolating user input into a subject.
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

const paragraphs = (text: string) =>
  text
    .split("\n")
    .map((line) => `<p style="margin:12px 0 0">${esc(line) || "&nbsp;"}</p>`)
    .join("\n");

async function sendEmail(config: EmailConfig, payload: EmailPayload): Promise<void> {
  let lastStatus: number | undefined;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
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
    const isLastAttempt = attempt === MAX_ATTEMPTS - 1;
    if (!retryable || isLastAttempt) break;

    await new Promise((r) => setTimeout(r, RETRY_BASE_MS * (attempt + 1)));
  }

  throw new Error(lastStatus ? `Resend returned ${lastStatus}` : "Resend request failed");
}

/** The lead itself, to the site owner. Replying goes straight to the sender. */
export function sendContactNotification(config: EmailConfig, lead: ContactLead): Promise<void> {
  const artworkLine = lead.artwork ? `\nObra: ${lead.artwork}\n\n` : "";
  const artworkHtml = lead.artwork
    ? `<p style="margin:12px 0 0"><strong>Obra:</strong> ${esc(lead.artwork)}</p>`
    : "";
  const subject = lead.artwork
    ? `Consulta obra ${oneLine(lead.artwork)} — ${oneLine(lead.name)} — masrexach.com`
    : `Mensaje de ${oneLine(lead.name)} — masrexach.com`;
  const text = `${lead.name} (${lead.email})\n\n${artworkLine}${lead.message}`;
  const html = [
    `<h2 style="font-size:14px;color:#333;margin:0 0 8px">Nuevo mensaje de contacto</h2>`,
    `<p style="margin:4px 0"><strong>Nombre:</strong> ${esc(lead.name)}</p>`,
    `<p style="margin:4px 0"><strong>Email:</strong> <a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a></p>`,
    artworkHtml,
    paragraphs(lead.message),
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

/**
 * Courtesy copy back to the submitter, in their own language. Echoes the
 * message and the artwork reference so they keep a record of what they sent.
 */
export function sendContactConfirmation(
  config: EmailConfig,
  lead: ContactLead,
  strings: ConfirmationStrings,
): Promise<void> {
  const greeting = strings.greeting.replace("{name}", lead.name);
  const artwork = lead.artwork ? `${strings.artworkLabel} ${lead.artwork}` : "";

  const text = [
    strings.heading,
    "",
    greeting,
    "",
    strings.body,
    "",
    ...(artwork ? [artwork, ""] : []),
    strings.messageLabel,
    lead.message
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n"),
    "",
    strings.signature,
  ].join("\n");

  const html = [
    `<h2 style="font-size:14px;color:#333;margin:0 0 12px">${esc(strings.heading)}</h2>`,
    `<p style="margin:0 0 12px">${esc(greeting)}</p>`,
    `<p style="margin:0 0 12px">${esc(strings.body)}</p>`,
    artwork
      ? `<p style="margin:0 0 12px"><strong>${esc(strings.artworkLabel)}</strong> ${esc(lead.artwork ?? "")}</p>`
      : "",
    `<p style="margin:0 0 4px"><strong>${esc(strings.messageLabel)}</strong></p>`,
    `<blockquote style="margin:0 0 12px;padding-left:12px;border-left:2px solid #ddd;color:#555">${paragraphs(lead.message)}</blockquote>`,
    `<p style="margin:0;font-style:italic">${esc(strings.signature)}</p>`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail(config, {
    from: config.from,
    to: [lead.email],
    subject: oneLine(strings.subject),
    text,
    html,
  });
}

/**
 * Both contact emails for one submission.
 *
 * The owner notification carries the lead, so it is awaited and its failure
 * propagates — the submitter sees the error and can retry. The confirmation is
 * a courtesy: it never fails the submission, and when the platform gives us a
 * `waitUntil` it finishes after the response is sent instead of delaying it.
 */
export async function sendContactEmails(
  config: EmailConfig,
  lead: ContactLead,
  strings: ConfirmationStrings,
  waitUntil?: (promise: Promise<unknown>) => void,
): Promise<void> {
  await sendContactNotification(config, lead);

  const confirmation = sendContactConfirmation(config, lead, strings).catch(() => {});

  if (waitUntil) {
    waitUntil(confirmation);
    return;
  }

  await confirmation;
}
