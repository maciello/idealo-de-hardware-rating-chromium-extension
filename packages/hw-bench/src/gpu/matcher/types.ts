import type { GpuBenchmarkRecord } from "../../benchmark";
import type { FormFactor } from "../../identity";
import type { MatchResult } from "../../matcher";
import type { GpuIdentity } from "../identity";

export interface GpuMatchOptions {
  /** Where the product is used; defaults to "unknown". Text that says "Laptop GPU" overrides it. */
  readonly formFactor?: FormFactor;
}

/** Port: maps GPU text to a PassMark record, taking the product's form factor into account. */
export interface GpuMatcher {
  match(query: string | GpuIdentity, options?: GpuMatchOptions): MatchResult<GpuBenchmarkRecord>;
}

/** What a record says about where it is used. "neutral" fits both: integrated graphics, workstation and uncategorised cards. */
export type RecordForm = "laptop" | "desktop" | "neutral";

export interface Entry {
  readonly record: GpuBenchmarkRecord;
  readonly maxQ: boolean;
  readonly form: RecordForm;
  /** The record is named after several models ("Radeon RX 470/570"); a record of exactly this model outranks it. */
  readonly combined: boolean;
}

export interface Group {
  readonly entries: Entry[];
}
