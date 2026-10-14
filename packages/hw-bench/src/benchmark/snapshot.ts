import type { z } from "zod";
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

export interface SnapshotInput<R> {
  readonly sourceId: string;
  readonly kind: BenchmarkKind;
  readonly importedAt: string | null;
  readonly rows: readonly unknown[];
  readonly schema: z.ZodType<R>;
  readonly dedupeKey: (record: R) => string;
}

const describeIssues = (error: z.ZodError): string =>
  error.issues
    .slice(0, 3)
    .map((issue) => {
      const path = issue.path.join(".");
      return path === "" ? issue.message : `${path}: ${issue.message}`;
    })
    .join("; ");

/** Parses every row; rows that fail the schema or duplicate an earlier key are rejected, never thrown. */
export function buildSnapshot<R>(input: SnapshotInput<R>): BenchmarkSnapshot<R> {
  const records: R[] = [];
  const rejected: RejectedRow[] = [];
  const seen = new Set<string>();
  input.rows.forEach((row, index) => {
    const parsed = input.schema.safeParse(row);
    if (!parsed.success) {
      rejected.push({ index, reason: describeIssues(parsed.error) });
      return;
    }
    const key = input.dedupeKey(parsed.data);
    if (seen.has(key)) {
      rejected.push({ index, reason: `duplicate record ${key}` });
      return;
    }
    seen.add(key);
    records.push(parsed.data);
  });
  return {
    sourceId: input.sourceId,
    kind: input.kind,
    importedAt: input.importedAt,
    records,
    rejected,
  };
}
