/** `20261014T133858Z`: ISO-8601 basic format in UTC, safe in file names. */
export const basicTimestamp = (date: Date): string =>
  date
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[-:]/g, "");

/** Every export is named `idealo-hw_<kind>_<timestamp>.<ext>`, so files sort and never collide by accident. */
export const exportFilename = (kind: string, date: Date, extension = "json"): string =>
  `idealo-hw_${kind}_${basicTimestamp(date)}.${extension}`;

/**
 * Saves `payload` as JSON through a Blob link: no extra permission, works from popup and options.
 * The one place that stamps exports: top-level `exportedAt` is ISO-8601 UTC (`toISOString`).
 * Returns the file name used.
 */
export function downloadJson(
  kind: string,
  payload: Record<string, unknown>,
  now: Date = new Date(),
): string {
  const filename = exportFilename(kind, now);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ exportedAt: now.toISOString(), ...payload }, null, 2)], {
      type: "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // The download has started synchronously; revoking later keeps slow disks from racing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return filename;
}
