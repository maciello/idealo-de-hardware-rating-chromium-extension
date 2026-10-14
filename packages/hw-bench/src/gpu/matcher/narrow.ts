import type { GpuIdentity } from "../identity";
import type { Entry } from "./types";

/**
 * A memoryless record below this share of its model's samples is noise, not the model's default: PassMark files
 * a handful of unsized submissions next to the sized cards ("RTX 3050 Laptop GPU": 4 samples beside 21179 and 7510).
 */
const NEGLIGIBLE_SAMPLE_SHARE = 0.01;

export const preferSingleModel = (entries: Entry[]): Entry[] =>
  entries.some((e) => !e.combined) ? entries.filter((e) => !e.combined) : entries;

/** Max-Q is a power variant: say it and get it; do not say it and get the plain mobile record when there is one. */
export function narrowByMaxQ(entries: readonly Entry[], maxQ: boolean): Entry[] {
  const preferred = entries.filter((e) => e.maxQ === maxQ);
  return preferred.length > 0 ? preferred : [...entries];
}

const samplesOf = (entries: readonly Entry[]): number =>
  entries.reduce((sum, e) => sum + (e.record.samples ?? 0), 0);

/** True when the plain records carry so few samples next to the sized siblings that they cannot stand for the model. */
export function isNegligible(plain: readonly Entry[], sized: readonly Entry[]): boolean {
  if (sized.length === 0 || plain.some((e) => e.record.samples === null)) return false;
  const plainSamples = samplesOf(plain);
  return plainSamples < NEGLIGIBLE_SAMPLE_SHARE * (plainSamples + samplesOf(sized));
}

/** PassMark lists some GPUs twice ("Intel UHD 770", "Intel UHD Graphics 770"); an exact name settles it. */
export function collapseByExactName(
  entries: readonly Entry[],
  query: string | GpuIdentity,
): Entry[] {
  if (typeof query !== "string" || entries.length < 2) return [...entries];
  const exact = entries.filter((e) => e.record.name.trim() === query.trim());
  return exact.length === 1 ? exact : [...entries];
}
