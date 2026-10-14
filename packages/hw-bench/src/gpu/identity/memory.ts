/** A memory size directly after the model: "6GB", "(8 GB)", "16384 MB". Sizes followed by system-memory words are not VRAM. */
const MEMORY_AFTER_MODEL =
  /^\s*[([]?\s*(?:(\d{1,3})\s*gb|(\d{3,6})\s*mb)\b\s*[)\]]?(?!\s*(?:ram\b|ddr\d|ssd|hdd|nvme|arbeitsspeicher))/;

/** Reads the VRAM size right behind the model at `from`; returns where the size ends. */
export function memoryAfter(text: string, from: number): { end: number; memoryGb: number | null } {
  const m = MEMORY_AFTER_MODEL.exec(text.slice(from));
  if (m === null) return { end: from, memoryGb: null };
  const gigabytes = m[1] !== undefined ? Number(m[1]) : Math.round(Number(m[2]) / 1024);
  return { end: from + m[0].length, memoryGb: gigabytes > 0 ? gigabytes : null };
}
