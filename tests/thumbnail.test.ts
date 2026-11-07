import { describe, expect, it } from "vitest";
import { thumbnailOptions } from "../src/lib/thumbnail";

describe("thumbnailOptions", () => {
  it("limits tall homepage artwork to the height of its contained display box", () => {
    const options = thumbnailOptions({ width: 720, height: 1920 }, "featured");
    expect(options.width).toBe(90);
    expect(options.widths).toEqual([90, 180, 270]);
    expect(options.sizes).toContain("90px");
  });

  it("keeps landscape artwork sharp without exceeding its original resolution", () => {
    const options = thumbnailOptions({ width: 600, height: 300 }, "featured");
    expect(options.width).toBe(480);
    expect(options.widths).toEqual([480, 600]);
  });

  it("offers smaller catalogue sources and a high-density desktop source", () => {
    const options = thumbnailOptions({ width: 1600, height: 2000 }, "catalogue");
    expect(options.widths).toEqual([180, 240, 360, 480, 720, 960]);
    expect(options.sizes).toContain("349.34px");
  });

  it("never upscales a small catalogue original", () => {
    const options = thumbnailOptions({ width: 300, height: 400 }, "catalogue");
    expect(options.width).toBe(300);
    expect(options.widths).toEqual([180, 240, 300]);
  });
});
