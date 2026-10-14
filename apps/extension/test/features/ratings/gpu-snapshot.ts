import { passmarkGpuSource } from "@idealo-hw/hw-bench";

export interface GpuSpec {
  readonly name: string;
  readonly cat: string;
  readonly g3d: number;
  readonly date?: string;
  /** PassMark's memory column as written there, "8192 MB"; absent means "NA". */
  readonly memSize?: string;
}

/** Synthetic GPU snapshot built through the real source; never PassMark data. */
export const gpuSnapshotOf = (...specs: readonly GpuSpec[]) =>
  passmarkGpuSource.parse(
    JSON.stringify({
      data: specs.map((spec, i) => ({
        id: String(8000 + i),
        name: spec.name,
        cat: spec.cat,
        g3d: String(spec.g3d),
        g2d: "500",
        date: spec.date ?? "Jun 2024",
        rank: String(100 + i),
        samples: "100",
        memSize: spec.memSize ?? "NA",
      })),
    }),
  );

/**
 * Laptop set: RTX 5060 Laptop 18,000, RTX 4060 Laptop 15,000, Radeon 780M 6,700, Arc 140V 2,900, Iris Xe 2,500
 * (integrated graphics compete with notebooks). Desktop set: RTX 4060 19,000 and the same iGPUs. The iGPU rows carry
 * the names of the PassMark GPU list, which the CPU table looks up exactly. The RTX 5060 Laptop has a memory size
 * (PassMark's typical), the RTX 4060 Laptop none.
 */
export const GPU_SPECS: readonly GpuSpec[] = [
  {
    name: "GeForce RTX 5060 Laptop GPU",
    cat: "Mobile",
    g3d: 18_000,
    date: "Jan 2025",
    memSize: "8192 MB",
  },
  { name: "GeForce RTX 4060 Laptop GPU", cat: "Mobile", g3d: 15_000 },
  { name: "GeForce RTX 4060", cat: "Desktop", g3d: 19_000 },
  { name: "Radeon 780M", cat: "Mobile", g3d: 6_700 },
  { name: "Intel Arc 140V GPU", cat: "Mobile", g3d: 2_900, date: "Sep 2024" },
  { name: "Intel Iris Xe", cat: "Unknown", g3d: 2_500 },
];
