/** JSON with object keys sorted, so equal values always serialize to equal text. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** SHA-256 as lowercase hex via WebCrypto (browsers, service workers and Node 20+; no dependency). */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Deterministic pseudo-random order: items sorted by SHA-256(seed, key). The same seed always gives the
 * same order, a different seed gives an unrelated one, and the input order is irrelevant.
 *
 * Why: candidates arrive ranked best-first, and Jev (like most classifiers over option lists) has a
 * first-option bias. Sending them in rank order would make that bias agree with our own ranking and hide
 * itself in the results. A seeded shuffle decorrelates position from rank, yet stays reproducible, which
 * the cache, idempotent reruns and tests depend on.
 */
export async function orderBySeed<T>(
  items: readonly T[],
  seed: string,
  keyOf: (item: T) => string,
): Promise<T[]> {
  const keyed = await Promise.all(
    items.map(async (item) => ({ item, rank: await sha256Hex(`${seed}\u0000${keyOf(item)}`) })),
  );
  keyed.sort((a, b) => (a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0));
  return keyed.map((entry) => entry.item);
}
