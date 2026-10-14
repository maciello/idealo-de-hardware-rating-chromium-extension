import Papa from "papaparse";
import type { z } from "zod";
import { CpuRowSchema, cpuRecordKey } from "./cpu-row";
import { GpuRowSchema, gpuRecordKey } from "./gpu-row";
import type { BenchmarkKind, CpuBenchmarkRecord, GpuBenchmarkRecord } from "./records";
import { type BenchmarkSnapshot, buildSnapshot } from "./snapshot";

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

/** Thrown when the whole input is unrecognisable (not when single rows are bad). */
export class BenchmarkFormatError extends Error {
  override readonly name = "BenchmarkFormatError";
}

type Table = readonly unknown[];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function readJsonRows(text: string): Table {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new BenchmarkFormatError(`invalid JSON: ${(error as Error).message}`);
  }
  const rows = Array.isArray(json) ? json : isObject(json) ? json.data : undefined;
  if (!Array.isArray(rows)) {
    throw new BenchmarkFormatError('JSON must be {"data": [...]} or an array of rows');
  }
  return rows;
}

function readCsvRows(text: string, requiredColumns: readonly string[]): Table {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter: ",",
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
  if (result.errors.some((error) => error.type === "Quotes")) {
    throw new BenchmarkFormatError("CSV has unbalanced quotes");
  }
  const columns = new Set(result.meta.fields ?? []);
  const missing = requiredColumns.filter((column) => !columns.has(column));
  if (missing.length > 0) {
    throw new BenchmarkFormatError(`CSV is missing columns: ${missing.join(", ")}`);
  }
  return result.data;
}

/** Sniffs JSON vs CSV and returns the raw rows; throws only when nothing usable is found. */
export function readRows(text: string, requiredColumns: readonly string[]): Table {
  const body = text.replace(/^﻿/, "").trim();
  if (body === "") throw new BenchmarkFormatError("input is empty");
  const rows =
    body.startsWith("{") || body.startsWith("[")
      ? readJsonRows(body)
      : readCsvRows(body, requiredColumns);
  if (rows.length === 0) throw new BenchmarkFormatError("input contains no rows");
  const recognisable = rows.some(
    (row) => isObject(row) && requiredColumns.every((column) => column in row),
  );
  if (!recognisable) {
    throw new BenchmarkFormatError(`no row has the columns: ${requiredColumns.join(", ")}`);
  }
  return rows;
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

/** PassMark CPU list, JSON (`{data: []}`) or CSV. Duplicates are keyed by (id, cpuCount). */
export const passmarkCpuSource: BenchmarkSource<CpuBenchmarkRecord> = createTableSource({
  id: "passmark_cpu",
  kind: "cpu",
  requiredColumns: ["id", "name", "cpumark"],
  schema: CpuRowSchema,
  dedupeKey: cpuRecordKey,
});

/** PassMark GPU list, JSON or CSV. */
export const passmarkGpuSource: BenchmarkSource<GpuBenchmarkRecord> = createTableSource({
  id: "passmark_gpu",
  kind: "gpu",
  requiredColumns: ["id", "name", "g3d"],
  schema: GpuRowSchema,
  dedupeKey: gpuRecordKey,
});
