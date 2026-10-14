/**
 * Comparison groups for percentile ratings, defined by what a buyer on idealo can choose: PC client devices.
 * Phone, embedded, server and virtual silicon is outside that domain by definition, not by score and not by PassMark's
 * `cat` (which files a Celeron N5095 under Desktop and a Core Ultra 9 285H under Mobile/Embedded).
 *
 * The classes are SETS THAT MAY OVERLAP: a family belongs to every device class it ships in. idealo's PC-Systeme list
 * Apple M, Intel N-series and mobile H/HS/HX/U chips in mini PCs, so those are DesktopCpu as well as LaptopCpu.
 * A record is in zero, one or two sets; `status` says why it is in none: "excluded" (out of domain by definition, a
 * named rule) or "unclassified" (no rule names it yet). Unclassified is counted and reported by the data-backed tests,
 * never silently dropped and never guessed.
 *
 * Universe U = {r in snapshot : socketCount(r) = 1 and r passes the cohort's year cutoff}. Membership depends only on
 * the parsed identity (vendor, family, model suffix) from `extractCpuIdentity` / `extractGpuIdentity`; names those
 * parsers do not read (Xeon, EPYC, Atom, ARM SoCs, vGPU profiles...) go through the closed, named rule tables.
 * The CPU sets are defined in `./cpu/classify.ts`, the GPU sets in `./gpu/classify.ts`.
 */
export type DeviceClass = "laptop" | "desktop";

export interface DeviceMembership {
  readonly laptop: boolean;
  readonly desktop: boolean;
  /** "member" = in at least one set; "excluded" = out of domain by a named rule; "unclassified" = no rule names it. */
  readonly status: "member" | "excluded" | "unclassified";
  /** The named rule that decided; "none" when unclassified. */
  readonly rule: string;
}
