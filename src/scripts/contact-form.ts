import { actions } from "astro:actions";

type StatusKind = "sending" | "success" | "error" | "idle";

interface ContactStrings {
  required: string;
  invalidEmail: string;
  sending: string;
  success: string;
  error: string;
  submit: string;
}

export function initContactForm(): void {
  const form = document.querySelector<HTMLFormElement>("[data-contact-form]");
  const status = document.querySelector<HTMLElement>("[data-contact-status]");
  const submit = document.querySelector<HTMLButtonElement>("[data-contact-submit]");
  if (!form || !status || !submit) return;

  const strings = JSON.parse(form.dataset.contactI18n ?? "{}") as Partial<ContactStrings>;

  const fields: Record<string, HTMLInputElement | HTMLTextAreaElement> = {};
  form
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-contact-field]")
    .forEach((el) => {
      fields[el.getAttribute("data-contact-field") ?? ""] = el;
    });

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = (): boolean => {
    let valid = true;
    const name = fields.name;
    const email = fields.email;
    const message = fields.message;

    if (!name.value.trim()) {
      name.setCustomValidity(strings.required ?? "");
      valid = false;
    } else {
      name.setCustomValidity("");
    }

    if (!email.value.trim() || !emailPattern.test(email.value)) {
      email.setCustomValidity(strings.invalidEmail ?? strings.required ?? "");
      valid = false;
    } else {
      email.setCustomValidity("");
    }

    if (!message.value.trim()) {
      message.setCustomValidity(strings.required ?? "");
      valid = false;
    } else {
      message.setCustomValidity("");
    }

    return valid;
  };

  Object.values(fields).forEach((field) => {
    field.addEventListener("input", () => field.setCustomValidity(""));
  });

  const setStatus = (kind: StatusKind): void => {
    if (kind === "sending") {
      status.textContent = strings.sending ?? "";
      submit.disabled = true;
      submit.textContent = strings.sending ?? "";
      return;
    }
    if (kind === "success") {
      status.textContent = strings.success ?? "";
      status.classList.add("text-accent-strong");
    } else if (kind === "error") {
      status.textContent = strings.error ?? "";
      status.classList.add("text-red-700");
    } else {
      status.textContent = "";
      status.classList.remove("text-accent-strong", "text-red-700");
    }
    submit.disabled = false;
    submit.textContent = strings.submit ?? "";
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validate() || !form.reportValidity()) return;
    setStatus("sending");
    try {
      const { error: actionError } = await actions.sendContact(new FormData(form));
      if (actionError) throw new Error("send failed");
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  });
}
