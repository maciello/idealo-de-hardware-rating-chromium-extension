import { describe, expect, it } from "vitest";
import { BenchmarkFormatError, passmarkCpuSource } from "../../../../src/benchmark";
import { asCsv, asJson, cpuRow } from "../../../fixtures";

describe("passmarkCpuSource", () => {
  it("parses a PassMark-shaped row into a typed record", () => {
    const { records, rejected } = passmarkCpuSource.parse(
      asJson([
        cpuRow({
          id: "5001",
          name: "  Testcorp Core X1-2000 @ 2.10GHz ",
          cpumark: "28,501",
          thread: "3,566",
          cores: "6",
          logicals: "2",
          secondaryCores: "8",
          secondaryLogicals: "1",
          tdp: "45",
          price: "$502.00*",
          cat: "Desktop, Laptop",
          date: "Feb 2023",
          socket: "FCBGA0000",
          speed: "2400",
          turbo: "5000",
          rank: 646,
          samples: "3,811",
        }),
      ]),
    );
    expect(rejected).toEqual([]);
    expect(records).toEqual([
      {
        id: 5001,
        name: "Testcorp Core X1-2000 @ 2.10GHz",
        cpuMark: 28501,
        singleThreadMark: 3566,
        cores: 6,
        threadsPerCore: 2,
        efficiencyCores: 8,
        efficiencyThreadsPerCore: 1,
        socketCount: 1,
        baseClockMhz: 2400,
        turboClockMhz: 5000,
        tdpWatts: 45,
        priceUsd: 502,
        socket: "FCBGA0000",
        segments: ["desktop", "laptop"],
        released: { year: 2023, month: 2 },
        rank: 646,
        samples: 3811,
      },
    ]);
  });

  it("maps NA, -1 and Unknown sentinels to null", () => {
    const [record] = passmarkCpuSource.parse(
      asJson([
        cpuRow({
          thread: "NA",
          tdp: "NA",
          price: "NA",
          speed: "-1",
          turbo: "NA",
          socket: "Unknown",
          cat: "Unknown",
          date: "NA",
          secondaryCores: "NA",
          secondaryLogicals: "NA",
        }),
      ]),
    ).records;
    expect(record).toMatchObject({
      singleThreadMark: null,
      tdpWatts: null,
      priceUsd: null,
      baseClockMhz: null,
      turboClockMhz: null,
      socket: null,
      segments: ["unknown"],
      released: null,
      efficiencyCores: null,
      efficiencyThreadsPerCore: null,
    });
  });

  it("accepts int-or-string for cpuCount, samples and secondary core fields", () => {
    const { records } = passmarkCpuSource.parse(
      asJson([
        cpuRow({ id: "1", cpuCount: 1, samples: 7, secondaryCores: 4, secondaryLogicals: 1 }),
        cpuRow({
          id: "2",
          cpuCount: "2",
          samples: "7",
          secondaryCores: "4",
          secondaryLogicals: "1",
        }),
      ]),
    );
    const [a, b] = records;
    expect(a).toMatchObject({ socketCount: 1, samples: 7, efficiencyCores: 4 });
    expect(b).toMatchObject({ socketCount: 2, samples: 7, efficiencyCores: 4 });
  });

  it("splits comma-joined categories and degrades unknown tokens", () => {
    const parse = (cat: string) =>
      passmarkCpuSource.parse(asJson([cpuRow({ cat })])).records[0]?.segments;
    expect(parse("Desktop")).toEqual(["desktop"]);
    expect(parse("Laptop, Mobile/Embedded")).toEqual(["laptop", "mobile_embedded"]);
    expect(parse("Desktop, Laptop, Server")).toEqual(["desktop", "laptop", "server"]);
    expect(parse("Desktop, Desktop")).toEqual(["desktop"]);
    expect(parse("Desktop, Wearable")).toEqual(["desktop", "unknown"]);
    expect(parse("")).toEqual(["unknown"]);
  });

  it("keeps (id, cpuCount) pairs distinct and rejects exact duplicates", () => {
    const { records, rejected } = passmarkCpuSource.parse(
      asJson([
        cpuRow({ id: "10", cpuCount: 1 }),
        cpuRow({ id: "10", cpuCount: "2" }),
        cpuRow({ id: "10", cpuCount: 1 }),
      ]),
    );
    expect(records.map((r) => [r.id, r.socketCount])).toEqual([
      [10, 1],
      [10, 2],
    ]);
    expect(rejected).toEqual([{ index: 2, reason: "duplicate record 10x1" }]);
  });

  it("rejects bad rows with an index and reason and keeps the rest", () => {
    const { records, rejected } = passmarkCpuSource.parse(
      asJson([
        cpuRow({ id: "1" }),
        cpuRow({ id: "2", cpumark: "NA" }),
        cpuRow({ id: "3", date: "sometime" }),
        null,
        "not an object",
        cpuRow({ id: "x" }),
        cpuRow({ id: "4", name: "  " }),
        cpuRow({ id: "5", tdp: "lots" }),
        cpuRow({ id: "6" }),
      ]),
    );
    expect(records.map((r) => r.id)).toEqual([1, 6]);
    expect(rejected.map((r) => r.index)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(rejected.find((r) => r.index === 1)?.reason).toMatch(/cpumark/);
    expect(rejected.find((r) => r.index === 2)?.reason).toMatch(/date.*sometime/);
    expect(rejected.every((r) => r.reason.length > 0)).toBe(true);
  });

  it("produces identical records from JSON and CSV (quoted thousands, CRLF, empty family column)", () => {
    const rows = [
      cpuRow({
        id: "1",
        cpumark: "175,022",
        price: "$1,299.00*",
        cat: "Desktop, Server",
        cpuCount: 2,
      }),
      cpuRow({ id: "2", thread: "NA", speed: "-1", socket: "Unknown" }),
      cpuRow({ id: "3", name: 'Testcorp "Quoted", Edition' }),
    ];
    const fromJson = passmarkCpuSource.parse(asJson(rows));
    const csv = asCsv(rows);
    expect(csv).toContain("\r\n");
    expect(csv).toContain('"175,022"');
    const fromCsv = passmarkCpuSource.parse(csv);
    expect(fromCsv.rejected).toEqual([]);
    expect(fromCsv.records).toEqual(fromJson.records);
    expect(fromCsv.records[0]?.priceUsd).toBe(1299);
  });

  it("accepts a bare JSON array, a BOM and surrounding whitespace", () => {
    const text = `﻿  \n${JSON.stringify([cpuRow()])}\n`;
    expect(passmarkCpuSource.parse(text).records).toHaveLength(1);
  });

  it("carries the caller-supplied importedAt and never invents one", () => {
    const text = asJson([cpuRow()]);
    expect(passmarkCpuSource.parse(text).importedAt).toBeNull();
    expect(passmarkCpuSource.parse(text, { importedAt: "2026-10-14T12:00:00Z" })).toMatchObject({
      importedAt: "2026-10-14T12:00:00Z",
      sourceId: "passmark_cpu",
      kind: "cpu",
    });
  });

  it("throws only when the whole input is unrecognisable", () => {
    const bad = [
      "",
      "   ",
      "{not json",
      '{"rows": []}',
      '{"data": []}',
      '{"data": [{"foo": 1}]}',
      "a,b,c\n1,2,3",
      '"unterminated\nid,name',
    ];
    for (const text of bad) {
      expect(() => passmarkCpuSource.parse(text), text).toThrow(BenchmarkFormatError);
    }
  });
});
