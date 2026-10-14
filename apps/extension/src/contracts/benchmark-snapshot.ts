import type {
  BenchmarkSnapshot,
  CpuBenchmarkRecord,
  GpuBenchmarkRecord,
} from "@idealo-hw/hw-bench";
import { z } from "zod";

export type CpuSnapshot = BenchmarkSnapshot<CpuBenchmarkRecord>;
export type GpuSnapshot = BenchmarkSnapshot<GpuBenchmarkRecord>;

const nullableNumber = z.number().nullable();
const releaseDate = z.object({ year: z.number(), month: z.number() }).nullable();

const CpuRecordSchema = z.object({
  id: z.number(),
  name: z.string(),
  cpuMark: z.number(),
  singleThreadMark: nullableNumber,
  cores: nullableNumber,
  threadsPerCore: nullableNumber,
  efficiencyCores: nullableNumber,
  efficiencyThreadsPerCore: nullableNumber,
  socketCount: z.number(),
  baseClockMhz: nullableNumber,
  turboClockMhz: nullableNumber,
  tdpWatts: nullableNumber,
  priceUsd: nullableNumber,
  socket: z.string().nullable(),
  segments: z.array(z.enum(["desktop", "laptop", "server", "mobile_embedded", "unknown"])),
  released: releaseDate,
  rank: nullableNumber,
  samples: nullableNumber,
});

const GpuRecordSchema = z.object({
  id: z.number(),
  name: z.string(),
  g3dMark: z.number(),
  g2dMark: nullableNumber,
  segments: z.array(z.enum(["desktop", "mobile", "workstation", "unknown"])),
  released: releaseDate,
  rank: nullableNumber,
  samples: nullableNumber,
  tdpWatts: nullableNumber,
  priceUsd: nullableNumber,
  bus: z.string().nullable(),
  memorySizeMb: nullableNumber,
  memoryClockMhz: nullableNumber,
  coreClockMhz: nullableNumber,
});

const snapshotSchema = <R extends z.ZodType>(kind: "cpu" | "gpu", record: R) =>
  z.object({
    sourceId: z.string(),
    kind: z.literal(kind),
    importedAt: z.string().nullable(),
    records: z.array(record),
    rejected: z.array(z.object({ index: z.number(), reason: z.string() })),
  });

/** Stored snapshots are re-validated on read: storage is a trust boundary (older versions, manual edits). */
export const CpuSnapshotSchema: z.ZodType<CpuSnapshot> = snapshotSchema("cpu", CpuRecordSchema);
export const GpuSnapshotSchema: z.ZodType<GpuSnapshot> = snapshotSchema("gpu", GpuRecordSchema);
