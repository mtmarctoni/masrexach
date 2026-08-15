> Part of the [masrexach — Astro Rebuild Implementation Plan](00-overview.md).

# Phase 5: contact

### Task 14: Zod schema + Astro Action (TDD)

**Files:**
- Create: `src/actions/index.ts`

**Interfaces:**
- Consumes: `astro/zod` (`astro:env` server secrets `RESEND_API_KEY` + `CONTACT_TO_EMAIL`, both optional), Resend REST API via `fetch` (`https://api.resend.com`)
- Produces: the `sendContact` Action consumed by the client form script

- [x] Step 1: Schema — `name`, `email` (z.email), `message` required; honeypot `important_field` optional string `.max(0)`.
- [x] Step 2: Handler guards env first ("Email service not configured." error without a key), honeypot rejects before any external call; env read via `ctx.locals.runtime.env`, never `process.env`.
- [x] Step 3: Verify (dev server running)

  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4321/_actions/sendContact \
    -H "Origin: http://localhost:4321" \
    -F name=Test -F email=test@example.com -F message="hello" -F important_field=spam
  ```

  Expected: `400` (honeypot) before Resend is ever reached; without `important_field` and without a key, an error response proving env-guarding.

- [x] Step 4: Commit — `feat(contact): add sendContact Action with honeypot and env guard`

### Task 15: form component + client RPC

**Files:**
- Create: `src/components/ContactForm.astro`, `src/scripts/contact-form.ts`
- Modify: `src/pages/[...locale]/contacto.astro`

**Interfaces:**
- Consumes: `sendContact` via `astro:actions` client RPC, dictionary `contact.form` strings (verbatim)
- Produces: the localized contact form with client validation, status messaging, and a no-JS fallback

- [x] Step 1: Form `action={Astro.url.pathname}` (no-JS fallback; the RPC path never performs a full submit), strings passed via `data-contact-i18n`.
- [x] Step 2: Client script validates (required, email pattern), submits via `actions.sendContact(new FormData(form))`, surfaces sending/success/error states from the dictionary.
- [x] Step 3: Verify — `pnpm build && grep -c "data-contact-form" dist/client/contacto/index.html` -> `1`; page carries the localized labels verbatim.
- [x] Step 4: Commit — `feat(contact): add localized form with Actions RPC`
