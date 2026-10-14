import type { z } from "zod";
import type { BenchmarkSnapshot } from "../model";
import type { BenchmarkKind } from "../records";
import { buildSnapshot, readRows } from "./table";

export interface ParseOptions {
  /** ISO-8601 import time, supplied by the caller (the core never reads the clock). */
  readonly importedAt?: string;
}

/** Port: turns an external benchmark file into a typed snapshot. */
export interface BenchmarkSource<R> {
  readonly id: string;
  readonly kind: BenchmarkKind;
  parse(text: string, options?: ParseOptions): BenchmarkSnapshot<R>;
}

interface TableSourceConfig<R> {
  readonly id: string;
  readonly kind: BenchmarkKind;
  readonly requiredColumns: readonly string[];
  readonly schema: z.ZodType<R>;
  readonly dedupeKey: (record: R) => string;
}

export function createTableSource<R>(config: TableSourceConfig<R>): BenchmarkSource<R> {
  return {
    id: config.id,
    kind: config.kind,
    parse: (text, options) =>
      buildSnapshot({
        sourceId: config.id,
        kind: config.kind,
        importedAt: options?.importedAt ?? null,
        rows: readRows(text, config.requiredColumns),
        schema: config.schema,
        dedupeKey: config.dedupeKey,
      }),
  };
}
