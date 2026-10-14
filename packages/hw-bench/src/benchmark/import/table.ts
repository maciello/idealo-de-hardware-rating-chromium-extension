import Papa from "papaparse";
import type { z } from "zod";
import type { BenchmarkSnapshot, RejectedRow } from "../model";
import type { BenchmarkKind } from "../records";

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
