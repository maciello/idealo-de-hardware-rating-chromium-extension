import type { Found, GpuExtractor } from "../model";

export const upper = (value: string | undefined): string => (value ?? "").toUpperCase();

export const titleCase = (value: string): string =>
  value.replace(
    /(^|\s)([a-z])/g,
    (_, space: string, letter: string) => space + letter.toUpperCase(),
  );

export const words = (...parts: readonly (string | undefined)[]): string =>
  parts.filter((part) => part !== undefined && part !== "").join(" ");

export const regexExtractor = (
  id: string,
  pattern: RegExp,
  build: (m: RegExpExecArray) => Omit<Found, "start" | "end"> | null,
): GpuExtractor => ({
  id,
  extract: (text) => {
    const m = pattern.exec(text);
    if (m === null) return null;
    const built = build(m);
    return built === null ? null : { start: m.index, end: m.index + m[0].length, ...built };
  },
});
