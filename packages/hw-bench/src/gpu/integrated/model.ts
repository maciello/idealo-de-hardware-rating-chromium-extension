/** What a rule says about the graphics inside the CPU it matches. */
export type IgpuTarget =
  /** The CPU has no integrated graphics (F/KF parts, Threadripper, server Xeons). */
  | { readonly kind: "none" }
  /** The iGPU is this exact PassMark GPU list name. */
  | { readonly kind: "passmark"; readonly name: string }
  /** The iGPU is known but PassMark lists no row for it (Apple M-series, Mali): shown by name, never rated. */
  | { readonly kind: "unrated"; readonly name: string };

/**
 * The keys a rule can test; all given keys must hold (AND). Keys ending in `In` test membership. Every key but
 * `labelKeyIn` reads a CpuIdentity or `cpuModelParts` of it, so a CPU without an identity only meets `labelKeyIn`.
 */
export interface IgpuMatch {
  readonly vendor?: string;
  readonly family?: string;
  readonly familyIn?: readonly string[];
  readonly modelIn?: readonly string[];
  readonly numberIn?: readonly number[];
  /** Inclusive [lowest, highest] model number. */
  readonly numberRange?: readonly [number, number];
  /** "" matches a model without suffix letters. */
  readonly suffixIn?: readonly string[];
  readonly prefix?: string;
  readonly prefixIn?: readonly string[];
  /** Core i generation. */
  readonly genIn?: readonly number[];
  readonly pro?: boolean;
  /** One of these tier words stands in front of the number ("MAX", "MAX+"). */
  readonly wordsIncludeAny?: readonly string[];
  /** Slug of the CPU text itself, for the CPUs no identity extractor reads yet (Xeon, embedded, Snapdragon X2). */
  readonly labelKeyIn?: readonly string[];
}

/** One row of the CPU-to-iGPU table. Data only: the matcher is generic over the keys. */
export interface IgpuRule {
  /** Stable name, e.g. "intel-core-i-f-kf-none". */
  readonly id: string;
  readonly match: IgpuMatch;
  readonly igpu: IgpuTarget;
  /** Machine-readable "key=value; key=value" notes: dual-channel requirement, proxy rows, thin evidence. */
  readonly caveat: string;
  /** Vendor or review pages the assignment rests on. */
  readonly evidence: readonly string[];
  /** 0..1, the researcher's confidence in the assignment. */
  readonly confidence: number;
}
