import { z } from "zod";
import type { CpuSegment, GpuSegment, ReleaseDate } from "../../records";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const isMissing = (text: string): boolean => text === "" || /^n\/?a$/i.test(text);

/** "Mar 2024" -> {year: 2024, month: 3}; "NA"/empty -> null. */
export const releaseDate = z
  .preprocess((raw) => (raw === null || raw === undefined ? "" : String(raw)), z.string())
  .transform((text, ctx): ReleaseDate | null => {
    const trimmed = text.trim();
    if (isMissing(trimmed)) return null;
    const match = /^([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/.exec(trimmed);
    const month = match?.[1] === undefined ? -1 : MONTHS.indexOf(match[1].toLowerCase());
    if (match?.[2] === undefined || month < 0) {
      ctx.issues.push({ code: "custom", message: `unrecognised date "${trimmed}"`, input: text });
      return z.NEVER;
    }
    return { year: Number(match[2]), month: month + 1 };
  });

const parseSegments = <S extends string>(
  text: string,
  known: Readonly<Record<string, S>>,
  fallback: S,
): S[] => {
  const found = new Set<S>();
  for (const part of text.split(",")) {
    const token = part.trim().toLowerCase();
    if (token === "" || isMissing(token)) continue;
    found.add(known[token] ?? fallback);
  }
  return found.size === 0 ? [fallback] : [...found];
};

const segmentText = z.preprocess(
  (raw) => (raw === null || raw === undefined ? "" : String(raw)),
  z.string(),
);

const CPU_SEGMENTS: Readonly<Record<string, CpuSegment>> = {
  desktop: "desktop",
  laptop: "laptop",
  server: "server",
  "mobile/embedded": "mobile_embedded",
  unknown: "unknown",
};

const GPU_SEGMENTS: Readonly<Record<string, GpuSegment>> = {
  desktop: "desktop",
  mobile: "mobile",
  workstation: "workstation",
  unknown: "unknown",
};

/** Comma-joined PassMark `cat`; unrecognised tokens degrade to "unknown" instead of rejecting the row. */
export const cpuSegments = segmentText.transform((text) =>
  parseSegments(text, CPU_SEGMENTS, "unknown"),
);

export const gpuSegments = segmentText.transform((text) =>
  parseSegments(text, GPU_SEGMENTS, "unknown"),
);
