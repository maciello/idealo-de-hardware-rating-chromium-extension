import { extractGpuIdentity } from "../identity";
import { IGPU_RULES } from "./rules";

/** Every PassMark GPU name the table can hand out as an iGPU. */
const TABLE_NAMES: ReadonlySet<string> = new Set(
  IGPU_RULES.flatMap(({ igpu }) => (igpu.kind === "passmark" ? [igpu.name] : [])),
);

/** Families that only exist inside a CPU package. "Arc" counts only without a model: "Arc A770" is a card. */
const INTEGRATED_FAMILIES: ReadonlySet<string> = new Set([
  "Radeon",
  "Iris",
  "Iris Xe",
  "Iris Plus",
  "Iris Pro",
  "HD Graphics",
  "UHD Graphics",
]);

/**
 * Whether a PassMark GPU list name is integrated graphics. Decided by name, because PassMark's own columns do not
 * say: `cat` files the Radeon 780M under Mobile and Vega 8 under Desktop and Mobile, and `memSize` is empty for
 * many old discrete cards (GeForce 920M) while some old iGPU rows (Intel HD 4400) carry one.
 *
 * 1. a name the iGPU table can return is integrated;
 * 2. else a name that is exactly one integrated-only model ("Radeon 660M", "Intel UHD Graphics 770") is integrated;
 * 3. everything else is discrete.
 */
export function isIntegratedGpu(name: string): boolean {
  if (TABLE_NAMES.has(name)) return true;
  const identity = extractGpuIdentity(name);
  if (identity === null || identity.residual !== "") return false;
  return (
    INTEGRATED_FAMILIES.has(identity.family) || (identity.family === "Arc" && identity.model === "")
  );
}
