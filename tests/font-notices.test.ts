import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("distributes the complete bundled-font notices as a public static asset", () => {
  const notice = readFileSync("src/assets/fonts/OFL.txt", "utf8");
  expect(readFileSync("public/fonts/OFL.txt", "utf8")).toBe(notice);
});

it.runIf(process.env.FONT_VERIFY_BUILD === "1")("includes font notices in the built site", () => {
  expect(readFileSync("dist/client/fonts/OFL.txt", "utf8")).toBe(
    readFileSync("src/assets/fonts/OFL.txt", "utf8"),
  );
});
