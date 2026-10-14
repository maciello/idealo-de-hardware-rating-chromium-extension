import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type CpuBenchmarkRecord,
  createCanonicalKeyMatcher,
  createGpuMatcher,
  type FormFactor,
  type GpuBenchmarkRecord,
  passmarkCpuSource,
  passmarkGpuSource,
} from "../src";
import vocabulary from "./fixtures/idealo-vocabulary.json";

const dataDir = resolve(import.meta.dirname, "../../../data");
const cpuPath = resolve(dataDir, "passmark_cpu.json");
const gpuPath = resolve(dataDir, "passmark_gpu.csv");

interface Tile {
  readonly categoryId: string;
  readonly title: string;
  readonly characteristics: readonly string[];
}

/** idealo category ids of the captured listings. */
const FORM_FACTOR_BY_CATEGORY: Readonly<Record<string, FormFactor>> = {
  "3751": "laptop",
  "3020": "desktop",
};

const tiles: readonly Tile[] = vocabulary.tiles;
const formFactorOf = (tile: Tile): FormFactor =>
  FORM_FACTOR_BY_CATEGORY[tile.categoryId] ?? "unknown";

/**
 * Yardstick over real idealo vocabulary (docs/adr/0007): filter labels of the Prozessor and Grafikkarte groups
 * and listing tiles. Counts are a ratchet: raise the floors when matching improves, never lower them.
 * Many tiles name no CPU at all (workstations, barebones), so the tile floor stays well below the tile count.
 *
 * Floors at the time the yardstick was introduced: CPU labels 231/250, GPU labels 121/195, tile CPUs 52/106, tile GPUs 44/106.
 */
const FLOOR = { cpuLabels: 231, gpuLabels: 121, tileCpus: 52, tileGpus: 44 } as const;

describe.skipIf(!existsSync(cpuPath) || !existsSync(gpuPath))(
  "idealo vocabulary against PassMark data",
  () => {
    let cpuRecordFor: (text: string) => CpuBenchmarkRecord | null;
    let gpuRecordFor: (text: string, formFactor: FormFactor) => GpuBenchmarkRecord | null;

    beforeAll(() => {
      const cpus = createCanonicalKeyMatcher(
        passmarkCpuSource.parse(readFileSync(cpuPath, "utf8")),
      );
      const gpus = createGpuMatcher(passmarkGpuSource.parse(readFileSync(gpuPath, "utf8")));
      cpuRecordFor = (text) => {
        const result = cpus.match(text);
        return result.status === "matched" ? result.record : null;
      };
      gpuRecordFor = (text, formFactor) => {
        const result = gpus.match(text, { formFactor });
        return result.status === "matched" ? result.record : null;
      };
    });

    it("matches CPU filter labels", () => {
      const matched = vocabulary.cpuFilterLabels.filter((label) => cpuRecordFor(label) !== null);
      expect(matched.length).toBeGreaterThanOrEqual(FLOOR.cpuLabels);
    });

    it("matches GPU filter labels as laptop GPUs", () => {
      const matched = vocabulary.gpuFilterLabels.filter(
        (label) => gpuRecordFor(label, "laptop") !== null,
      );
      expect(matched.length).toBeGreaterThanOrEqual(FLOOR.gpuLabels);
    });

    it("resolves tile CPUs from a characteristics fragment, else from the title", () => {
      const resolved = tiles.filter((tile) =>
        [...tile.characteristics, tile.title].some((text) => cpuRecordFor(text) !== null),
      );
      expect(resolved.length).toBeGreaterThanOrEqual(FLOOR.tileCpus);
    });

    it("resolves tile GPUs from a characteristics fragment with the category's form factor", () => {
      const resolved = tiles.filter((tile) =>
        tile.characteristics.some((text) => gpuRecordFor(text, formFactorOf(tile)) !== null),
      );
      expect(resolved.length).toBeGreaterThanOrEqual(FLOOR.tileGpus);
    });
  },
);
