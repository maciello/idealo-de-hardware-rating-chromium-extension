import { type CohortPolicy, type GpuBenchmarkRecord, passmarkGpuSource } from "../../../src";
import { asJson, gpuRow } from "../../fixtures";

export interface Spec {
  readonly name: string;
  readonly cat: string;
  readonly g3d: number;
  readonly date?: string;
}

export const snapshotOf = (...specs: readonly Spec[]) =>
  passmarkGpuSource.parse(
    asJson(
      specs.map((spec, i) =>
        gpuRow({
          id: String(8000 + i),
          name: spec.name,
          cat: spec.cat,
          g3d: String(spec.g3d),
          date: spec.date ?? "Jun 2024",
        }),
      ),
    ),
  );

export const recordNamed = (specs: readonly Spec[], name: string): GpuBenchmarkRecord => {
  const record = snapshotOf(...specs).records.find((r) => r.name === name);
  if (record === undefined) throw new Error(`${name} missing`);
  return record;
};

export const NO_CUTOFF: CohortPolicy = { yearCutoff: { kind: "none" }, minScore: null };

/**
 * Reference sets (sinceYear 2020, anchored to the newest record, 2024):
 * LaptopGpu  = RTX 9080 Laptop 26,000, RTX 9060 Laptop 16,000, Iris Xe 2,500, Radeon 780M 6,700
 * DesktopGpu = RTX 9080 36,000, RTX 9060 19,000, Radeon RX 9999 30,000, UHD 770 1,900, and the two iGPUs that ship in
 *              mini PCs too (Iris Xe, Radeon 780M)
 * In neither: a vGPU profile, a virtual display driver, and a laptop card from 2017 (past the year cutoff).
 */
export const specs: readonly Spec[] = [
  { name: "GeForce RTX 9080 Laptop GPU", cat: "Mobile", g3d: 26_000 },
  { name: "GeForce RTX 9060 Laptop GPU", cat: "Mobile", g3d: 16_000 },
  { name: "GeForce GTX 1050 Laptop GPU", cat: "Mobile", g3d: 6_000, date: "Jan 2017" },
  { name: "Intel Iris Xe", cat: "Unknown", g3d: 2_500 },
  { name: "Radeon 780M", cat: "Mobile", g3d: 6_700 },
  { name: "GeForce RTX 9080", cat: "Desktop", g3d: 36_000 },
  { name: "GeForce RTX 9060", cat: "Desktop", g3d: 19_000 },
  { name: "Radeon RX 9999", cat: "Desktop", g3d: 30_000 },
  { name: "Intel UHD Graphics 770", cat: "Unknown", g3d: 1_900 },
  { name: "A40-12Q", cat: "Unknown", g3d: 5_000 },
  { name: "Mirage Driver", cat: "Unknown", g3d: 90 },
];
