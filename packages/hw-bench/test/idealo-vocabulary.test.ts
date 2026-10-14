import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type CpuBenchmarkRecord,
  cpuScoreBounds,
  createCanonicalKeyMatcher,
  createGpuMatcher,
  type FormFactor,
  type GpuBenchmarkRecord,
  gpuScoreBounds,
  passmarkCpuSource,
  passmarkGpuSource,
} from "../src";
import vocabulary from "./fixtures/idealo-vocabulary.json";

const dataDir = resolve(import.meta.dirname, "../../../data");
const cpuPath = resolve(dataDir, "passmark_cpu.json");
const gpuPath = resolve(dataDir, "passmark_gpu.csv");
/** idealo MCP filter labels; trial terms forbid storing MCP data, so the list stays local (ADR 0008, mcp-2026-10-14). */
const mcpLabelsPath = resolve(dataDir, "idealo-mcp-labels.json");

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
 *
 * gpuLabels was 152 and is 138 since the matcher stopped returning records of the other form factor. The 13 labels
 * below were false matches (a desktop-only card handed to a laptop; PassMark lists no Laptop GPU for them) and
 * "NVIDIA GeForce RTX 3050" is now ambiguous between the 4GB and 6GB laptop cards instead of resolving to a plain
 * "Laptop GPU" record with 4 samples:
 * GT 710, GT 730, GT 1030, RTX 2080 Ti, RTX 3060 Ti, RTX 3090, RTX 4060 Ti, RTX 4070 Super, RTX 4070 Ti,
 * RTX 4070 Ti Super, RTX 4080 Super (all "NVIDIA GeForce ..."), "NVIDIA RTX A400", "NVIDIA RTX PRO 4500 Blackwell".
 */
const FLOOR = { cpuLabels: 232, gpuLabels: 138, tileCpus: 53, tileGpus: 48 } as const;

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
        const result = cpus.matchText(text);
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
      // PassMark's GPU list also holds integrated GPUs named after their CPU ("Ryzen 7 6800H"); CPU fragments are not GPU text.
      const resolved = tiles.filter((tile) =>
        tile.characteristics.some(
          (text) => cpuRecordFor(text) === null && gpuRecordFor(text, formFactorOf(tile)) !== null,
        ),
      );
      expect(resolved.length).toBeGreaterThanOrEqual(FLOOR.tileGpus);
    });
  },
);

/**
 * Precision on a hand-checked sample: every 8th CPU filter label and every 6th GPU filter label (index 0, 8, 16, ...),
 * with the PassMark record a person would pick written out. null means PassMark has no single record for the label
 * (absent, generic or ambiguous), so a match would be a false positive. GPU labels are read as laptop GPUs.
 */
const CPU_SAMPLE: readonly (readonly [string, string | null])[] = [
  ["AMD Ryzen 3 3200G", "AMD Ryzen 3 3200G"],
  ["AMD Ryzen 5 4600G", "AMD Ryzen 5 4600G"],
  ["AMD Ryzen 5 7430U", "AMD Ryzen 5 7430U"],
  ["AMD Ryzen 5 7600X", "AMD Ryzen 5 7600X"],
  ["AMD Ryzen 5 9600X", "AMD Ryzen 5 9600X"],
  ["AMD Ryzen 7 5700X3D", "AMD Ryzen 7 5700X3D"],
  ["AMD Ryzen 7 7730U", "AMD Ryzen 7 7730U"],
  ["AMD Ryzen 7 8745HX", "AMD Ryzen 7 8745HX"],
  ["AMD Ryzen 9 5900X", "AMD Ryzen 9 5900X"],
  ["AMD Ryzen 9 9900X3D", "AMD Ryzen 9 9900X3D"],
  ["AMD Ryzen AI 5 430", "AMD Ryzen AI 5 430"],
  ["AMD Ryzen AI 9 HX 375", "AMD Ryzen AI 9 HX 375"],
  ["Apple M4 Pro", null],
  ["Intel Core 3 100U", "Intel Core 3 100U"],
  ["Intel Core Ultra 5 125U", "Intel Core Ultra 5 125U"],
  ["Intel Core Ultra 5 235T", "Intel Core Ultra 5 235T"],
  ["Intel Core Ultra 7 155U", "Intel Core Ultra 7 155U"],
  ["Intel Core Ultra 7 265K", "Intel Core Ultra 7 265K"],
  ["Intel Core Ultra 9 185H", "Intel Core Ultra 9 185H"],
  ["Intel Core Ultra 9 386H", "Intel Core Ultra 9 386H"],
  ["Intel Core i3-N305", "Intel Core i3-N305"],
  ["Intel Core i5-12400", "Intel Core i5-12400"],
  ["Intel Core i5-13400T", "Intel Core i5-13400T"],
  ["Intel Core i5-14600", "Intel Core i5-14600"],
  ["Intel Core i5-9500", "Intel Core i5-9500 @ 3.00GHz"],
  ["Intel Core i7-12700", "Intel Core i7-12700"],
  ["Intel Core i7-13700", "Intel Core i7-13700"],
  ["Intel Core i7-14700KF", "Intel Core i7-14700KF"],
  ["Intel Core i7-8700T", "Intel Core i7-8700T @ 2.40GHz"],
  ["Intel Core i9-13900K", "Intel Core i9-13900K"],
  ["Intel N150", "Intel N150"],
  ["Qualcomm Snapdragon X2 Plus X2P-42-100", null],
];
const GPU_SAMPLE: readonly (readonly [string, string | null])[] = [
  ["AMD Radeon 540X", "Radeon 540X"],
  ["AMD Radeon 780M", "Radeon 780M"],
  ["AMD Radeon 840M", "Radeon 840M"],
  ["AMD Radeon Pro 5300M", "Radeon Pro 5300M"],
  ["AMD Radeon RX 6600 XT", "Radeon RX 6600 XT"],
  ["AMD Radeon RX 7900 XT", "Radeon RX 7900 XT"],
  ["AMD Radeon RX 9070 XT", "Radeon RX 9070 XT"],
  ["AMD Radeon RX Vega 7", null],
  ["Apple M4 Max 40-Core GPU", null],
  ["Apple M5 Pro 16-Core GPU", null],
  ["Intel Arc B580", "Intel Arc B580"],
  ["Intel Arc Graphics B390", "Intel Arc B390 GPU"],
  ["Intel HD Graphics 4600", "Intel HD 4600"],
  ["Intel HD Graphics 620", "Intel HD Graphics 620"],
  ["Intel Iris Plus Graphics 655", "Intel Iris Plus 655"],
  ["Intel UHD Graphics 620", "Intel UHD Graphics 620"],
  ["NVIDIA Blackwell RTX", null],
  ["NVIDIA GeForce GTX 1050 Ti", "GeForce GTX 1050 Ti (Mobile)"],
  ["NVIDIA GeForce MX330", "GeForce MX330"],
  ["NVIDIA GeForce RTX 2070 Super", null],
  ["NVIDIA GeForce RTX 3070", "GeForce RTX 3070 Laptop GPU"],
  ["NVIDIA GeForce RTX 4060", "GeForce RTX 4060 Laptop GPU"],
  ["NVIDIA GeForce RTX 4080", "GeForce RTX 4080 Laptop GPU"],
  ["NVIDIA GeForce RTX 5070", "GeForce RTX 5070 Laptop GPU"],
  ["NVIDIA Quadro P1000", "Quadro P1000"],
  ["NVIDIA Quadro P620", "Quadro P620"],
  ["NVIDIA Quadro T2000", "Quadro T2000"],
  ["NVIDIA RTX 3000 Ada", "RTX 3000 Ada Generation Laptop GPU"],
  ["NVIDIA RTX A2000", "RTX A2000 Laptop GPU"],
  ["NVIDIA RTX PRO 2000", "RTX PRO 2000 Blackwell Generation Laptop GPU"],
  ["NVIDIA RTX Pro 1000", "RTX PRO 1000 Blackwell Generation Laptop GPU"],
  ["NVIDIA T1000", "Quadro T1000"],
  ["Qualcomm Adreno X2 Elite", null],
];

describe.skipIf(!existsSync(cpuPath) || !existsSync(gpuPath))(
  "idealo vocabulary precision on a fixed sample",
  () => {
    const cpus = () =>
      createCanonicalKeyMatcher(passmarkCpuSource.parse(readFileSync(cpuPath, "utf8")));
    const gpus = () => createGpuMatcher(passmarkGpuSource.parse(readFileSync(gpuPath, "utf8")));

    it("samples the labels by the stated rule", () => {
      expect(CPU_SAMPLE.map(([label]) => label)).toEqual(
        vocabulary.cpuFilterLabels.filter((_, i) => i % 8 === 0),
      );
      expect(GPU_SAMPLE.map(([label]) => label)).toEqual(
        vocabulary.gpuFilterLabels.filter((_, i) => i % 6 === 0),
      );
    });

    it("returns exactly the expected CPU record for every sampled label", () => {
      const matcher = cpus();
      const got = CPU_SAMPLE.map(([label]) => {
        const result = matcher.matchText(label);
        return [label, result.status === "matched" ? result.record.name : null];
      });
      expect(got).toEqual(CPU_SAMPLE);
    });

    it("returns exactly the expected GPU record for every sampled label", () => {
      const matcher = gpus();
      const got = GPU_SAMPLE.map(([label]) => {
        const result = matcher.match(label, { formFactor: "laptop" });
        return [label, result.status === "matched" ? result.record.name : null];
      });
      expect(got).toEqual(GPU_SAMPLE);
    });

    it("bounds the variant families the matcher leaves ambiguous", () => {
      const apple = cpuScoreBounds(cpus().matchText("Apple M4 Pro"));
      expect(apple?.variants).toEqual(["Apple M4 Pro 12 Core", "Apple M4 Pro 14 Core"]);
      expect(apple?.cpuMark.min).toBeLessThan(apple?.cpuMark.max ?? 0);
      const rtx = gpuScoreBounds(
        gpus().match("NVIDIA GeForce RTX 5060 Ti", { formFactor: "desktop" }),
      );
      expect(rtx?.variants).toEqual(["GeForce RTX 5060 Ti 16GB", "GeForce RTX 5060 Ti 8GB"]);
      expect(rtx?.g3dMark.min).toBeLessThanOrEqual(rtx?.g3dMark.max ?? 0);
    });
  },
);

/**
 * Holdout defects: form-factor fallback and VRAM. The text of a desktop PC names the GPU in the title; the
 * characteristics fragment "NVIDIA GeForce RTX 3050" says no size, and PassMark has no plain desktop record for it.
 */
describe.skipIf(!existsSync(gpuPath))("RTX 3050 against PassMark data", () => {
  const matcher = () => createGpuMatcher(passmarkGpuSource.parse(readFileSync(gpuPath, "utf8")));
  const outcome = (text: string, formFactor: FormFactor) => {
    const result = matcher().match(text, { formFactor });
    return result.status === "matched"
      ? result.record.name
      : result.status === "ambiguous"
        ? result.candidates.map((c) => c.name)
        : result.status;
  };
  const DESKTOP_3050 = ["GeForce RTX 3050 6GB", "GeForce RTX 3050 8GB"];
  const XEON_PC =
    "PC Store NCA Triorama Gaming-PC Intel Xeon E5-2678v3, RTX 3050 6GB, 16GB RAM, 240GB SSD, Wasserkühlung, weiß";
  const GREED_PC =
    "GREED MK2 Lite - Entry Gaming PC - i5 10400F - RTX 3050 - 16GB DDR4 - 512GB SSD - RGB - WLAN";

  it("takes the stated 6GB from a desktop title, ignoring the 16GB of RAM", () => {
    expect(outcome(XEON_PC, "desktop")).toBe("GeForce RTX 3050 6GB");
  });

  it("leaves a desktop with an unsized RTX 3050 ambiguous across the desktop cards, never the laptop one", () => {
    expect(outcome("NVIDIA GeForce RTX 3050", "desktop")).toEqual(DESKTOP_3050);
    expect(outcome(GREED_PC, "desktop")).toEqual(DESKTOP_3050);
  });

  it("leaves a laptop's RTX 3050 ambiguous across the sized laptop cards", () => {
    // PassMark's unsized "GeForce RTX 3050 Laptop GPU" has 4 samples (4GB: 21179, 6GB: 7510) and a G3D mark above
    // both sized cards, so it is an outlier rather than the model's default.
    expect(outcome("NVIDIA GeForce RTX 3050", "laptop")).toEqual([
      "GeForce RTX 3050 4GB Laptop GPU",
      "GeForce RTX 3050 6GB Laptop GPU",
    ]);
  });

  it("never offers a record of the other form factor", () => {
    const records = passmarkGpuSource.parse(readFileSync(gpuPath, "utf8")).records;
    const byName = new Map(records.map((r) => [r.name, r]));
    const namesOf = (value: string | string[]) => (typeof value === "string" ? [value] : value);
    for (const text of ["NVIDIA GeForce RTX 3050", XEON_PC, GREED_PC]) {
      for (const name of namesOf(outcome(text, "desktop"))) {
        expect(byName.get(name)?.segments).not.toEqual(["mobile"]);
        expect(name).not.toContain("Laptop");
      }
    }
    for (const name of namesOf(outcome("NVIDIA GeForce RTX 3050", "laptop"))) {
      expect(byName.get(name)?.segments).not.toContain("desktop");
    }
    expect(outcome("NVIDIA GeForce RTX 3090", "laptop")).toBe("no_match");
    expect(outcome("NVIDIA GeForce RTX 4050", "desktop")).toBe("no_match");
  });
});

/**
 * Blind test: filter labels of the idealo MCP lists (Notebooks 3751, PC-Systeme 3020) that were collected after the
 * matcher was tuned and never looked at while tuning it. Raise the floors when matching improves, never lower them.
 * Before the naming conventions of `naming-conventions.test.ts`: CPU 215 matched / 3 ambiguous / 29 no_match (of 247
 * distinct labels), GPU 32 matched / 29 no_match (of 61). Zero visibly wrong matches in that run, which the table below
 * keeps: every label that is expected to stay unmatched, and every record a person would pick, written out.
 */
const UNSEEN_FLOOR = { cpuMatched: 220, gpuMatched: 38 } as const;

type Expected = string | readonly string[] | null;

const UNSEEN_CPU: readonly (readonly [string, Expected])[] = [
  ["Intel Pentium N6000", "Intel Pentium Silver N6000 @ 1.10GHz"],
  ["Intel Pentium N5030", "Intel Pentium Silver N5030 @ 1.10GHz"],
  ["Intel Pentium 8505", "Intel Pentium Gold 8505"],
  ["MediaTek Kompanio 838", "Mediatek Kompanio 838 MT8188"],
  ["MediaTek Kompanio 520", "MediaTek Kompanio 520-528 (MT8186-MT8186T)"],
  ["Qualcomm Snapdragon 7c", ["Snapdragon 7c @ 1.96 GHz", "Snapdragon 7c @ 2.40 GHz"]],
  ["AMD Ryzen 5 230 Pro", "AMD Ryzen 5 PRO 230"],
  // PassMark has only "AMD Ryzen AI 5 PRO 435 with Radeon 840M"; PRO is part of the identity, so the plain label abstains.
  ["AMD Ryzen AI 5 435", null],
  ["Intel Core i7-1335U", null],
  ["Intel Core Ultra 9 285KF", null],
  ["Intel Core 5 320", null],
  ["Intel Core 7 350", null],
  ["AMD Ryzen 5 130", null],
  ["NVIDIA RTX Spark N1X 650", null],
  ["AMD Athlon", null],
  ["Intel Core 2 Duo", null],
];

const UNSEEN_GPU: readonly (readonly [string, FormFactor, Expected])[] = [
  ["AMD Radeon RX 570", "desktop", "Radeon RX 470/570"],
  ["Qualcomm Adreno 618", "laptop", "Qualcomm Adreno 618 GPU"],
  ["NVIDIA Quadro M2200M", "laptop", "Quadro M2200"],
  ["NVIDIA Quadro M520M", "laptop", "Quadro M520"],
  ["AMD Radeon Pro WX3100", "laptop", "Radeon Pro WX 3100"],
  ["AMD Radeon Pro WX3200", "laptop", "Radeon Pro WX 3200"],
  ["Apple M5 Pro Graphics", "laptop", null],
];

describe.skipIf(!existsSync(cpuPath) || !existsSync(gpuPath) || !existsSync(mcpLabelsPath))(
  "idealo MCP labels the matcher was not tuned on",
  () => {
    const cpus = () =>
      createCanonicalKeyMatcher(passmarkCpuSource.parse(readFileSync(cpuPath, "utf8")));
    const gpus = () => createGpuMatcher(passmarkGpuSource.parse(readFileSync(gpuPath, "utf8")));
    const names = (result: {
      status: string;
      record?: { name: string };
      candidates?: readonly { name: string }[];
    }): Expected =>
      result.status === "matched"
        ? (result.record?.name ?? null)
        : result.status === "ambiguous"
          ? (result.candidates?.map((c) => c.name) ?? null)
          : null;
    let unseen: Readonly<Record<string, { cpu: string[]; gpu: string[] }>>;
    beforeAll(() => {
      unseen = JSON.parse(readFileSync(mcpLabelsPath, "utf8")).categories;
    });
    const formFactorOfCategory = (category: string): FormFactor =>
      FORM_FACTOR_BY_CATEGORY[category] ?? "unknown";

    it("returns the record a person would pick for the labels that used to miss, and abstains on the rest", () => {
      const matcher = cpus();
      const got = UNSEEN_CPU.map(([label]) => [label, names(matcher.matchText(label))]);
      expect(got).toEqual(UNSEEN_CPU);
    });

    it("returns the record a person would pick for the GPU labels that used to miss, and abstains on the rest", () => {
      const matcher = gpus();
      const got = UNSEEN_GPU.map(([label, formFactor]) => [
        label,
        formFactor,
        names(matcher.match(label, { formFactor })),
      ]);
      expect(got).toEqual(UNSEEN_GPU);
    });

    it("matches at least the floor of the unseen CPU labels", () => {
      const matcher = cpus();
      const labels = new Set(Object.values(unseen).flatMap((category) => category.cpu));
      const matched = [...labels].filter((l) => matcher.matchText(l).status === "matched");
      expect(labels.size).toBe(247);
      expect(matched.length).toBeGreaterThanOrEqual(UNSEEN_FLOOR.cpuMatched);
    });

    it("matches at least the floor of the unseen GPU labels with the category's form factor", () => {
      const matcher = gpus();
      const matched = Object.entries(unseen).flatMap(([category, { gpu }]) =>
        gpu.filter(
          (label) =>
            matcher.match(label, { formFactor: formFactorOfCategory(category) }).status ===
            "matched",
        ),
      );
      expect(matched.length).toBeGreaterThanOrEqual(UNSEEN_FLOOR.gpuMatched);
    });
  },
);
