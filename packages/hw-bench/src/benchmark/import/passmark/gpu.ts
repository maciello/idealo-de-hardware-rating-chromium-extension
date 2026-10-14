import { z } from "zod";
import {
  coerceNumeric,
  integerOrNull,
  lenientNumberOrNull,
  numberOrNull,
  positiveOrNull,
  requiredInteger,
  requiredNumber,
  requiredText,
  textOrNull,
} from "../../numeric";
import type { GpuBenchmarkRecord } from "../../records";
import { type BenchmarkSource, createTableSource } from "../source";
import { gpuSegments, releaseDate } from "./columns";

/** PassMark writes "Insufficient data" instead of a rank for some cards. */
const rankOrNull = z.preprocess((raw) => {
  const value = coerceNumeric(raw);
  return typeof value === "string" && /^insufficient data$/i.test(value.trim()) ? null : value;
}, z.number().int().nullable());

/** One row of PassMark's GPU list (JSON or CSV). */
export const GpuRowSchema: z.ZodType<GpuBenchmarkRecord> = z
  .object({
    id: requiredInteger(),
    name: requiredText(),
    g3d: requiredNumber(),
    g2d: numberOrNull(),
    cat: gpuSegments,
    date: releaseDate,
    rank: rankOrNull,
    samples: integerOrNull(),
    tdp: numberOrNull(),
    price: numberOrNull(),
    bus: textOrNull(),
    memSize: numberOrNull("MB"),
    memClk: lenientNumberOrNull("MHz"),
    coreClk: lenientNumberOrNull("MHz"),
  })
  .transform(
    (row): GpuBenchmarkRecord => ({
      id: row.id,
      name: row.name,
      g3dMark: row.g3d,
      g2dMark: row.g2d,
      segments: row.cat,
      released: row.date,
      rank: row.rank,
      samples: row.samples,
      tdpWatts: row.tdp,
      priceUsd: row.price,
      bus: row.bus,
      memorySizeMb: positiveOrNull(row.memSize),
      memoryClockMhz: positiveOrNull(row.memClk),
      coreClockMhz: positiveOrNull(row.coreClk),
    }),
  );

export const gpuRecordKey = (record: GpuBenchmarkRecord): string => String(record.id);

/** PassMark GPU list, JSON or CSV. */
export const passmarkGpuSource: BenchmarkSource<GpuBenchmarkRecord> = createTableSource({
  id: "passmark_gpu",
  kind: "gpu",
  requiredColumns: ["id", "name", "g3d"],
  schema: GpuRowSchema,
  dedupeKey: gpuRecordKey,
});
