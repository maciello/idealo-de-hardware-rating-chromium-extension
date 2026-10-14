import { z } from "zod";
import { cpuSegments, releaseDate } from "./fields";
import {
  integerOrNull,
  numberOrNull,
  positiveOrNull,
  requiredInteger,
  requiredNumber,
  requiredText,
  textOrNull,
} from "./numeric";
import type { CpuBenchmarkRecord } from "./records";

/** One row of PassMark's CPU list (JSON or CSV). Parses cells into typed values; unknown columns are ignored. */
export const CpuRowSchema: z.ZodType<CpuBenchmarkRecord> = z
  .object({
    id: requiredInteger(),
    name: requiredText(),
    cpumark: requiredNumber(),
    thread: numberOrNull(),
    cores: integerOrNull(),
    logicals: integerOrNull(),
    secondaryCores: integerOrNull(),
    secondaryLogicals: integerOrNull(),
    cpuCount: integerOrNull(),
    speed: numberOrNull(),
    turbo: numberOrNull(),
    tdp: numberOrNull(),
    price: numberOrNull(),
    socket: textOrNull("Unknown"),
    cat: cpuSegments,
    date: releaseDate,
    rank: integerOrNull(),
    samples: integerOrNull(),
  })
  .transform(
    (row): CpuBenchmarkRecord => ({
      id: row.id,
      name: row.name,
      cpuMark: row.cpumark,
      singleThreadMark: row.thread,
      cores: row.cores,
      threadsPerCore: row.logicals,
      efficiencyCores: row.secondaryCores,
      efficiencyThreadsPerCore: row.secondaryLogicals,
      socketCount: row.cpuCount !== null && row.cpuCount > 0 ? row.cpuCount : 1,
      baseClockMhz: positiveOrNull(row.speed),
      turboClockMhz: positiveOrNull(row.turbo),
      tdpWatts: row.tdp,
      priceUsd: row.price,
      socket: row.socket,
      segments: row.cat,
      released: row.date,
      rank: row.rank,
      samples: row.samples,
    }),
  );

export const cpuRecordKey = (record: CpuBenchmarkRecord): string =>
  `${record.id}x${record.socketCount}`;
