import Papa from "papaparse";
import type { CpuBenchmarkRecord } from "../src";
import { passmarkCpuSource } from "../src";

export type Row = Record<string, unknown>;

/** Hand-written, invented values in PassMark's shape (all numerics as strings, NA for missing). */
let nextId = 9000;

export const cpuRow = (overrides: Row = {}): Row => ({
  id: String(nextId++),
  name: "Testcorp Core X1-1000",
  price: "NA",
  cpumark: "10,500",
  thread: "2,500",
  value: "NA",
  threadValue: "NA",
  tdp: "65",
  powerPerf: "NA",
  date: "Mar 2022",
  socket: "LGA9999",
  cat: "Desktop",
  speed: "3400",
  turbo: "4600",
  cpuCount: 1,
  cores: "8",
  logicals: "2",
  secondaryCores: "0",
  secondaryLogicals: "0",
  rank: 1200,
  samples: "431",
  href: "cpu.php?cpu=Testcorp+Core+X1-1000&amp;id=9001",
  output: true,
  ...overrides,
});

export const gpuRow = (overrides: Row = {}): Row => ({
  id: "7001",
  name: "Testcorp Graphics G100",
  bus: "PCIe 4.0 x16",
  cat: "Desktop",
  coreClk: "1500 MHz",
  date: "Jun 2023",
  g2d: "1,050",
  g3d: "12,345",
  href: "gpu.php?gpu=G100&amp;id=7001",
  memClk: "2000 MHz",
  memSize: "8192 MB",
  output: true,
  powerPerf: "NA",
  price: "$299.99*",
  rank: "321",
  samples: "88",
  tdp: "180",
  value: "NA",
  ...overrides,
});

export const asJson = (rows: readonly unknown[]): string => JSON.stringify({ data: rows });

/** CSV in PassMark's export shape: union of keys plus an empty `family` column, CRLF line ends. */
export const asCsv = (rows: readonly Row[]): string => {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row))), "family"].sort();
  return Papa.unparse(
    {
      fields: columns,
      data: rows.map((row) => columns.map((c) => (c === "family" ? "" : String(row[c] ?? "NA")))),
    },
    { newline: "\r\n" },
  );
};

/** Builds a CPU snapshot by running hand-written rows through the real source. */
export const cpuSnapshotOf = (...rows: readonly Row[]) => passmarkCpuSource.parse(asJson(rows));

export const namedCpus = (...names: readonly string[]) =>
  cpuSnapshotOf(...names.map((name) => cpuRow({ name })));

export const cpuRecord = (overrides: Partial<CpuBenchmarkRecord> = {}): CpuBenchmarkRecord => ({
  id: 1,
  name: "Testcorp Core X1-1000",
  cpuMark: 10_000,
  singleThreadMark: 2_500,
  cores: 8,
  threadsPerCore: 2,
  efficiencyCores: 0,
  efficiencyThreadsPerCore: 0,
  socketCount: 1,
  baseClockMhz: 3_400,
  turboClockMhz: 4_600,
  tdpWatts: 65,
  priceUsd: null,
  socket: "LGA9999",
  segments: ["desktop"],
  released: { year: 2022, month: 3 },
  rank: 100,
  samples: 10,
  ...overrides,
});
