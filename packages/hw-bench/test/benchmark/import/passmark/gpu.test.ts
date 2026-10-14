import { describe, expect, it } from "vitest";
import { BenchmarkFormatError, passmarkGpuSource } from "../../../../src/benchmark";
import { asCsv, asJson, gpuRow } from "../../../fixtures";

describe("passmarkGpuSource", () => {
  it("parses a PassMark-shaped row into a typed record", () => {
    const { records, rejected } = passmarkGpuSource.parse(asJson([gpuRow()]));
    expect(rejected).toEqual([]);
    expect(records).toEqual([
      {
        id: 7001,
        name: "Testcorp Graphics G100",
        g3dMark: 12345,
        g2dMark: 1050,
        segments: ["desktop"],
        released: { year: 2023, month: 6 },
        rank: 321,
        samples: 88,
        tdpWatts: 180,
        priceUsd: 299.99,
        bus: "PCIe 4.0 x16",
        memorySizeMb: 8192,
        memoryClockMhz: 2000,
        coreClockMhz: 1500,
      },
    ]);
  });

  it("turns the text rank 'Insufficient data' into null", () => {
    const [record] = passmarkGpuSource.parse(
      asJson([gpuRow({ rank: "Insufficient data" })]),
    ).records;
    expect(record?.rank).toBeNull();
  });

  it("maps NA and empty-unit cells to null and splits segments", () => {
    const [record] = passmarkGpuSource.parse(
      asJson([
        gpuRow({
          bus: "NA",
          coreClk: "NA",
          memClk: " MHz",
          memSize: "NA",
          tdp: "NA",
          price: "NA",
          g2d: "NA",
          cat: "Mobile, Workstation",
        }),
      ]),
    ).records;
    expect(record).toMatchObject({
      bus: null,
      coreClockMhz: null,
      memoryClockMhz: null,
      memorySizeMb: null,
      tdpWatts: null,
      priceUsd: null,
      g2dMark: null,
      segments: ["mobile", "workstation"],
    });
  });

  it("does not reject a card because a clock cell holds free text", () => {
    const { records, rejected } = passmarkGpuSource.parse(
      asJson([
        gpuRow({ id: "1", memClk: "700-810 MHz", coreClk: "400? MHz" }),
        gpuRow({ id: "2", memClk: "Unknown MHz", coreClk: "350Mhz MHz" }),
      ]),
    );
    expect(rejected).toEqual([]);
    expect(records.map((r) => [r.coreClockMhz, r.memoryClockMhz])).toEqual([
      [null, null],
      [null, null],
    ]);
  });

  it("rejects rows without a G3D mark and duplicate ids", () => {
    const { records, rejected } = passmarkGpuSource.parse(
      asJson([gpuRow({ id: "1" }), gpuRow({ id: "2", g3d: "NA" }), gpuRow({ id: "1" })]),
    );
    expect(records.map((r) => r.id)).toEqual([1]);
    expect(rejected.map((r) => r.index)).toEqual([1, 2]);
  });

  it("produces identical records from JSON and CSV", () => {
    const rows = [gpuRow({ id: "1" }), gpuRow({ id: "2", rank: "Insufficient data", g3d: "9" })];
    expect(passmarkGpuSource.parse(asCsv(rows)).records).toEqual(
      passmarkGpuSource.parse(asJson(rows)).records,
    );
  });

  it("throws when handed a CPU file", () => {
    expect(() => passmarkGpuSource.parse("id,name,cpumark\n1,x,2")).toThrow(BenchmarkFormatError);
  });
});
