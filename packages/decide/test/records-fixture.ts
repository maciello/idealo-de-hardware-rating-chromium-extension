import {
  type BenchmarkSnapshot,
  type CpuBenchmarkRecord,
  type GpuBenchmarkRecord,
  passmarkCpuSource,
  passmarkGpuSource,
} from "@idealo-hw/hw-bench";

/** Hand-written, invented rows in PassMark's shape (no real PassMark data in git, docs/adr/0006). */
let nextId = 100;

const cpuRow = (name: string, cpuCount = 1) => ({
  id: String(nextId++),
  name,
  price: "NA",
  cpumark: "10,500",
  thread: "2,500",
  value: "NA",
  threadValue: "NA",
  tdp: "65",
  powerPerf: "NA",
  date: "Mar 2022",
  socket: "LGA9999",
  cat: "Laptop",
  speed: "3400",
  turbo: "4600",
  cpuCount,
  cores: "8",
  logicals: "2",
  secondaryCores: "0",
  secondaryLogicals: "0",
  rank: 1200,
  samples: "431",
  href: "cpu.php",
  output: true,
});

const gpuRow = (name: string, cat: "Desktop" | "Mobile", g3d: string) => ({
  id: String(nextId++),
  name,
  bus: "NA",
  cat,
  coreClk: "NA",
  date: "Jun 2023",
  g2d: "1,050",
  g3d,
  href: "gpu.php",
  memClk: "NA",
  memSize: "NA",
  output: true,
  powerPerf: "NA",
  price: "NA",
  rank: "321",
  samples: "88",
  tdp: "NA",
  value: "NA",
});

export const cpuSnapshot = (...names: readonly string[]): BenchmarkSnapshot<CpuBenchmarkRecord> =>
  passmarkCpuSource.parse(JSON.stringify({ data: names.map((n) => cpuRow(n)) }));

export const gpuSnapshot = (
  ...rows: readonly (readonly [name: string, cat: "Desktop" | "Mobile", g3d: string])[]
): BenchmarkSnapshot<GpuBenchmarkRecord> =>
  passmarkGpuSource.parse(JSON.stringify({ data: rows.map(([n, c, g]) => gpuRow(n, c, g)) }));
