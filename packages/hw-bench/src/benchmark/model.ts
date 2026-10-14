import type { BenchmarkKind } from "./records";

export interface RejectedRow {
  /** Zero-based index of the row in the source table. */
  readonly index: number;
  readonly reason: string;
}

export interface BenchmarkSnapshot<R> {
  readonly sourceId: string;
  readonly kind: BenchmarkKind;
  /** ISO-8601 timestamp supplied by the caller; the core never reads the clock. */
  readonly importedAt: string | null;
  readonly records: readonly R[];
  readonly rejected: readonly RejectedRow[];
}
