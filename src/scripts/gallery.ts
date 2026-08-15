interface GalleryItem {
  index: number;
  largeSrc: string;
  title: string;
  caption: string;
  alt: string;
}

export interface GallerySettings {
  counterTemplate: string;
}

export function initGallery(settings: GallerySettings): void {
  const triggers = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-lightbox-trigger]"),
  );
  const dialog = document.querySelector<HTMLDialogElement>("[data-lightbox]");
  if (!dialog || triggers.length === 0) return;

  const image = dialog.querySelector<HTMLImageElement>("[data-lightbox-image]");
  const titleEl = dialog.querySelector<HTMLElement>("[data-lightbox-title]");
  const captionEl = dialog.querySelector<HTMLElement>("[data-lightbox-caption]");
  const counterEl = dialog.querySelector<HTMLElement>("[data-lightbox-counter]");
  const closeBtn = dialog.querySelector<HTMLButtonElement>("[data-lightbox-close]");
  const prevBtn = dialog.querySelector<HTMLButtonElement>("[data-lightbox-prev]");
  const nextBtn = dialog.querySelector<HTMLButtonElement>("[data-lightbox-next]");

  const items: GalleryItem[] = triggers.map((trigger) => ({
    index: Number(trigger.dataset.index ?? 0),
    largeSrc: trigger.dataset.largeSrc ?? "",
    title: trigger.dataset.title ?? "",
    caption: trigger.dataset.caption ?? "",
    alt: trigger.dataset.alt ?? "",
  }));

  let current = 0;
  let lastTrigger: HTMLElement | null = null;

  const renderCounter = (): string =>
    settings.counterTemplate
      .replace("{current}", String(current + 1))
      .replace("{total}", String(items.length));

  const show = (index: number): void => {
    current = (index + items.length) % items.length;
    const item = items[current];
    if (image) {
      image.src = item.largeSrc;
      image.alt = item.alt;
    }
    if (titleEl) titleEl.textContent = item.title;
    if (captionEl) captionEl.textContent = item.caption;
    if (counterEl) counterEl.textContent = renderCounter();
  };

  const open = (index: number, trigger: HTMLElement): void => {
    lastTrigger = trigger;
    show(index);
    dialog.showModal();
    closeBtn?.focus();
  };

  const close = (): void => {
    dialog.close();
    lastTrigger?.focus();
  };

  triggers.forEach((trigger, index) => {
    trigger.addEventListener("click", () => open(index, trigger));
  });

  closeBtn?.addEventListener("click", close);
  prevBtn?.addEventListener("click", () => show(current - 1));
  nextBtn?.addEventListener("click", () => show(current + 1));

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(current - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      show(current + 1);
    }
  });
}
