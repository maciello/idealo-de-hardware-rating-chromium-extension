import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type BenchmarkSnapshot,
  type CpuBenchmarkRecord,
  createCanonicalKeyMatcher,
  createStrategies,
  type GpuBenchmarkRecord,
  passmarkCpuSource,
  passmarkGpuSource,
  readRows,
} from "../src";
import { cpuNameKeys } from "../src/identity";

/** Real PassMark exports live in the gitignored data/ dir (docs/adr/0006); these tests skip without them. */
const dataDir = resolve(import.meta.dirname, "../../../data");
const cpuJsonPath = resolve(dataDir, "passmark_cpu.json");
const cpuCsvPath = resolve(dataDir, "passmark_cpu.csv");
const gpuCsvPath = resolve(dataDir, "passmark_gpu.csv");

/** Families with a structured extractor; exotic vendors only match through exact or whole-name keys. */
const MAINSTREAM = /^(Intel Core |Intel N\d|AMD Ryzen |Apple M\d|Qualcomm Snapdragon X)/;

const read = (path: string) => readFileSync(path, "utf8");

describe.skipIf(!existsSync(cpuJsonPath) || !existsSync(cpuCsvPath))("PassMark CPU files", () => {
  let fromJson: BenchmarkSnapshot<CpuBenchmarkRecord>;
  let fromCsv: BenchmarkSnapshot<CpuBenchmarkRecord>;

  beforeAll(() => {
    fromJson = passmarkCpuSource.parse(read(cpuJsonPath));
    fromCsv = passmarkCpuSource.parse(read(cpuCsvPath));
  });

  it("JSON and CSV yield the same records", () => {
    expect(fromJson.records.length).toBeGreaterThan(0);
    expect(fromCsv.records.length).toBe(fromJson.records.length);
    expect(fromCsv.records.map((r) => [r.id, r.socketCount])).toEqual(
      fromJson.records.map((r) => [r.id, r.socketCount]),
    );
    expect(fromCsv.records).toEqual(fromJson.records);
  });

  it("rejects fewer than 1% of rows and accounts for every row", () => {
    for (const [text, snapshot] of [
      [read(cpuJsonPath), fromJson],
      [read(cpuCsvPath), fromCsv],
    ] as const) {
      const total = readRows(text, ["id", "name", "cpumark"]).length;
      expect(snapshot.records.length + snapshot.rejected.length).toBe(total);
      expect(snapshot.rejected.length / total).toBeLessThan(0.01);
    }
  });

  describe("matching", () => {
    let match: ReturnType<typeof createCanonicalKeyMatcher>["match"];

    beforeAll(() => {
      match = createCanonicalKeyMatcher(fromJson).match;
    });

    it.each([
      ["Intel Core i7-13700H, 14x 2.40GHz", "Intel Core i7-13700H"],
      ["Intel® Core™ i7-13700HX", "Intel Core i7-13700HX"],
      ["AMD Ryzen 7 7840HS (8x 3.80GHz)", "AMD Ryzen 7 7840HS"],
      ["Apple M3 Pro (11-Core CPU)", "Apple M3 Pro 11 Core"],
      ["Apple M3 Pro 12-Core", "Apple M3 Pro 12 Core"],
      ["Intel Core Ultra 7 155H", "Intel Core Ultra 7 155H"],
      ["Intel Core Ultra 7 258V", "Intel Core Ultra 7 258V"],
      ["Intel N100", "Intel N100"],
      ["AMD Ryzen AI 9 HX 370", "AMD Ryzen AI 9 HX 370"],
      ["Intel Core i5-1335U", "Intel Core i5-1335U"],
      ["AMD Ryzen 9 7950X3D", "AMD Ryzen 9 7950X3D"],
      ["Intel Core i5-12400F", "Intel Core i5-12400F"],
      ["Qualcomm Snapdragon X Elite X1E-78-100", "Qualcomm Snapdragon X Elite - X1E-78-100"],
      ["Intel Core i7-4770", "Intel Core i7-4770 @ 3.40GHz"],
    ])("%s -> %s", (input, expected) => {
      const result = match(input);
      expect(result.status).toBe("matched");
      if (result.status === "matched") expect(result.record.name).toBe(expected);
    });

    it("keeps suffix variants apart and prefers single-socket records", () => {
      const record = (text: string) => {
        const result = match(text);
        return result.status === "matched" ? result.record : null;
      };
      expect(record("Intel Core i7-13700H")?.id).not.toBe(record("Intel Core i7-13700HX")?.id);
      expect(record("Intel Core i5-1335U")?.id).not.toBe(record("Intel Core i5-1335UE")?.id);
      expect(record("AMD Ryzen 5 7600X")?.id).not.toBe(record("AMD Ryzen 5 7600X3D")?.id);
      expect(record("Intel Core i5-12400F")?.socketCount).toBe(1);
    });

    it("reports a core-less Apple M4 as ambiguous", () => {
      const result = match("Apple M4");
      expect(result.status).toBe("ambiguous");
      if (result.status === "ambiguous") {
        expect(result.candidates.map((c) => c.name)).toEqual(
          expect.arrayContaining(["Apple M4 8 Core", "Apple M4 10 Core"]),
        );
      }
    });

    it("matches at least 99% of PassMark names to themselves", () => {
      const hits = fromJson.records.filter((record) => {
        const result = match(record.name);
        return result.status === "matched" && result.record.name === record.name;
      }).length;
      expect(hits / fromJson.records.length).toBeGreaterThanOrEqual(0.99);
    });

    it("finds every mainstream record with unique index keys by its lowercased, clock-free name", () => {
      const owners = new Map<string, Set<number>>();
      for (const record of fromJson.records) {
        for (const { key } of cpuNameKeys(record.name)) {
          const set = owners.get(key) ?? new Set<number>();
          set.add(record.id);
          owners.set(key, set);
        }
      }
      const failures = fromJson.records.filter((record) => {
        if (!MAINSTREAM.test(record.name)) return false;
        const unique = cpuNameKeys(record.name).every(({ key }) => owners.get(key)?.size === 1);
        if (!unique) return false;
        const result = match(record.name.toLowerCase().replace(/\s*@.*$/, ""));
        return !(result.status === "matched" && result.record.id === record.id);
      });
      expect(failures.map((r) => r.name)).toEqual([]);
    });

    it("rates every CPU without throwing", () => {
      const strategies = createStrategies(fromJson);
      for (const cpu of fromJson.records) {
        for (const strategy of strategies) {
          const rating = strategy.rate({
            cpu,
            priceEur: 500,
            peers: [{ cpuMark: 1 }, { cpuMark: 99_999 }],
          });
          if (rating !== null) expect(Number.isFinite(rating.value)).toBe(true);
        }
      }
    });
  });
});

describe.skipIf(!existsSync(gpuCsvPath))("PassMark GPU file", () => {
  it("parses with fewer than 1% rejected rows and accounts for every row", () => {
    const text = read(gpuCsvPath);
    const snapshot: BenchmarkSnapshot<GpuBenchmarkRecord> = passmarkGpuSource.parse(text);
    const total = readRows(text, ["id", "name", "g3d"]).length;
    expect(snapshot.records.length + snapshot.rejected.length).toBe(total);
    expect(snapshot.records.length).toBeGreaterThan(0);
    expect(snapshot.rejected.length / total).toBeLessThan(0.01);
    expect(snapshot.records.some((r) => r.rank === null)).toBe(true);
    expect(snapshot.records.some((r) => r.segments.length > 1)).toBe(true);
  });
});
