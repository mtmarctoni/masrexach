type Dimensions = { width: number; height: number };

/** Match the fixed-height featured cards and the catalogue's fluid columns. */
export function thumbnailOptions(image: Dimensions, layout: "featured" | "catalogue") {
  const width = Math.min(
    image.width,
    layout === "featured" ? Math.ceil((240 * image.width) / image.height) : 720,
  );
  const candidates =
    layout === "featured" ? [width, width * 2, width * 3] : [180, 240, 360, 480, 720, 960];
  const widths = [...new Set(candidates.map((candidate) => Math.min(candidate, image.width)))];

  return {
    width,
    widths,
    sizes:
      layout === "featured"
        ? `(min-width: 1152px) min(323.34px, ${width}px), (min-width: 1024px) min(calc((100vw - 182px) / 3), ${width}px), (min-width: 640px) min(calc((100vw - 128px) / 2), ${width}px), min(calc(100vw - 74px), ${width}px)`
        : "(min-width: 1152px) 349.34px, (min-width: 1024px) calc((100vw - 104px) / 3), calc((100vw - 72px) / 2)",
  };
}
