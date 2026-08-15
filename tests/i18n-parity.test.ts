import { describe, expect, it } from "vitest";
import ca from "../src/i18n/ca";
import en from "../src/i18n/en";
import es from "../src/i18n/es";

type ShapeKind = "string" | "string[]" | "object";

interface ShapeEntry {
  kind: ShapeKind;
  length?: number;
}

type Shape = Map<string, ShapeEntry>;

function shapeOf(value: unknown): ShapeKind {
  if (typeof value === "string") return "string";
  if (Array.isArray(value)) return "string[]";
  return "object";
}

function collectShape(value: unknown, path = "", out: Shape = new Map()): Shape {
  const kind = shapeOf(value);
  if (kind === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const nextPath = path ? `${path}.${key}` : key;
      collectShape(child, nextPath, out);
    }
  } else if (kind === "string[]") {
    out.set(path, { kind, length: (value as string[]).length });
  } else {
    out.set(path, { kind });
  }
  return out;
}

describe("i18n dictionary parity", () => {
  const esShape = collectShape(es);

  const locales: Array<[string, typeof ca]> = [
    ["ca", ca],
    ["en", en],
  ];

  it.each(locales)(
    "%s has the same keys and value types as the default (es) dictionary",
    (_locale, dict) => {
      const shape = collectShape(dict);

      const esKeys = [...esShape.keys()].sort();
      const keys = [...shape.keys()].sort();
      expect(keys).toEqual(esKeys);

      for (const [path, expected] of esShape) {
        const actual = shape.get(path);
        expect(actual, `missing key "${path}"`).toBeDefined();
        expect(actual?.kind, `type mismatch at "${path}"`).toBe(expected.kind);
        if (expected.length !== undefined) {
          expect(actual?.length, `array length mismatch at "${path}"`).toBe(expected.length);
        }
      }
    },
  );
});
