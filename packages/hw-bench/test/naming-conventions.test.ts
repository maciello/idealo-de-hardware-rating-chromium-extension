import { describe, expect, it } from "vitest";
import {
  createCanonicalKeyMatcher,
  createGpuMatcher,
  extractCpuIdentity,
  type FormFactor,
  passmarkGpuSource,
} from "../src";
import { asJson, gpuRow, namedCpus } from "./fixtures";

/**
 * Naming conventions behind the blind-test misses (ADR 0007: exact after normalization, never fuzzy). Each rule is
 * stated as a convention and tested on PassMark-shaped names with invented numbers; a near-miss model number
 * (i7 vs i5, 285KF vs 285) never matches.
 */

const cpuOutcome = (matcher: ReturnType<typeof createCanonicalKeyMatcher>, text: string) => {
  const result = matcher.matchText(text);
  return result.status === "matched"
    ? result.record.name
    : result.status === "ambiguous"
      ? result.candidates.map((c) => c.name)
      : result.status;
};

describe("CPU naming conventions", () => {
  const matcher = createCanonicalKeyMatcher(
    namedCpus(
      "Intel Pentium Silver N6000 @ 1.10GHz",
      "Intel Pentium Silver N5030 @ 1.10GHz",
      "Intel Pentium Gold 8505",
      "Intel Pentium Gold G7400",
      "Intel Pentium G7400",
      "AMD Athlon Silver 3050U",
      "AMD Athlon Gold 3150U",
      "Mediatek Kompanio 838 MT8188",
      "MediaTek Kompanio 520-528 (MT8186-MT8186T)",
      "Mediatek Kompanio 540",
      "Mediatek Kompanio Ultra 910",
      "Snapdragon 7c @ 1.96 GHz",
      "Snapdragon 7c @ 2.40 GHz",
      "Snapdragon 7c Gen 2 @ 2.55 GHz",
      "Snapdragon 8cx Gen 3 @ 3.0 GHz",
      "Qualcomm Snapdragon X Elite - X1E-80-100",
      "AMD Ryzen 5 230",
      "AMD Ryzen 5 PRO 230",
      "AMD Ryzen AI 5 340",
      "AMD Ryzen AI 5 PRO 340",
      "AMD Ryzen AI 5 PRO 435 with Radeon 840M",
      "AMD Ryzen AI 9 HX PRO 370",
      "AMD Ryzen Threadripper PRO 5995WX",
      "AMD Sempron 130",
      "AMD Ryzen AI 7 350",
      "Intel Core i5-1335U",
      "Intel Core Ultra 9 285",
      "Intel Core 5 120",
      "Intel Core i5-650 @ 3.20GHz",
      "Intel Celeron N5095 @ 2.00GHz",
      "Intel Celeron @ 1.30GHz",
      "Intel Celeron @ 1.70GHz",
    ),
  );
  const outcome = (text: string) => cpuOutcome(matcher, text);

  describe("sub-brand words are optional when the model number names one record", () => {
    it("reads Intel Pentium without Silver/Gold as the sub-branded record", () => {
      expect(outcome("Intel Pentium N6000")).toBe("Intel Pentium Silver N6000 @ 1.10GHz");
      expect(outcome("Intel Pentium N5030")).toBe("Intel Pentium Silver N5030 @ 1.10GHz");
      expect(outcome("Intel Pentium 8505")).toBe("Intel Pentium Gold 8505");
    });

    it("keeps the sub-brand when it is stated and does not swap Silver for Gold", () => {
      expect(outcome("Intel Pentium Silver N6000")).toBe("Intel Pentium Silver N6000 @ 1.10GHz");
      expect(outcome("Intel Pentium Gold 8505")).toBe("Intel Pentium Gold 8505");
      expect(outcome("Intel Pentium Gold N6000")).toBe("no_match");
      expect(outcome("Intel Pentium Silver 8505")).toBe("no_match");
    });

    it("lets a record that is named without a sub-brand win over the sub-branded one", () => {
      expect(outcome("Intel Pentium G7400")).toBe("Intel Pentium G7400");
      expect(outcome("Intel Pentium Gold G7400")).toBe("Intel Pentium Gold G7400");
    });

    it("is ambiguous when two sub-brands carry the same model number", () => {
      const twins = createCanonicalKeyMatcher(
        namedCpus("Intel Pentium Silver X1234", "Intel Pentium Gold X1234"),
      );
      expect(cpuOutcome(twins, "Intel Pentium X1234")).toEqual([
        "Intel Pentium Gold X1234",
        "Intel Pentium Silver X1234",
      ]);
    });

    it("does the same for AMD Athlon Silver/Gold, never for another model number", () => {
      expect(outcome("AMD Athlon 3050U")).toBe("AMD Athlon Silver 3050U");
      expect(outcome("AMD Athlon 3150U")).toBe("AMD Athlon Gold 3150U");
      expect(outcome("AMD Athlon 3050E")).toBe("no_match");
    });
  });

  describe("PRO is read the same before and after the model number, and stays part of the model", () => {
    it("reads a trailing Pro like a leading PRO", () => {
      expect(outcome("AMD Ryzen 5 230 Pro")).toBe("AMD Ryzen 5 PRO 230");
      expect(outcome("AMD Ryzen 5 PRO 230")).toBe("AMD Ryzen 5 PRO 230");
      expect(outcome("AMD Ryzen 5 230")).toBe("AMD Ryzen 5 230");
      expect(outcome("AMD Ryzen AI 5 340 PRO")).toBe("AMD Ryzen AI 5 PRO 340");
      expect(outcome("AMD Ryzen AI 9 HX 370 Pro")).toBe("AMD Ryzen AI 9 HX PRO 370");
      expect(outcome("AMD Ryzen Threadripper 5995WX Pro")).toBe(
        "AMD Ryzen Threadripper PRO 5995WX",
      );
    });

    it("gives both spellings one identity key", () => {
      const key = (text: string) => extractCpuIdentity(text)?.key;
      expect(key("AMD Ryzen 5 230 Pro")).toBe(key("AMD Ryzen 5 PRO 230"));
      expect(key("AMD Ryzen 5 230 Pro")).not.toBe(key("AMD Ryzen 5 230"));
      expect(key("AMD Ryzen AI 9 HX 370 Pro")).toBe("amd-ryzen-ai-9-hx-pro-370");
    });

    it("does not read a word that merely starts with pro", () => {
      expect(outcome("AMD Ryzen 5 230 Prozessor")).toBe("AMD Ryzen 5 230");
      expect(outcome("AMD Ryzen 5 230 Pro-Edition")).toBe("AMD Ryzen 5 PRO 230");
    });

    it("never crosses between PRO and non-PRO: a PRO-only part is not its plain sibling", () => {
      // PassMark lists only "Ryzen AI 5 PRO 435"; the plain "Ryzen AI 5 435" is another part, as 340 / PRO 340 are.
      expect(outcome("AMD Ryzen AI 5 435")).toBe("no_match");
      expect(outcome("AMD Ryzen AI 5 PRO 435")).toBe("AMD Ryzen AI 5 PRO 435 with Radeon 840M");
      expect(outcome("AMD Ryzen AI 5 340")).toBe("AMD Ryzen AI 5 340");
      expect(outcome("AMD Ryzen AI 5 Pro 340")).toBe("AMD Ryzen AI 5 PRO 340");
    });
  });

  describe("a record may only start with the model, and a range covers its two listed numbers", () => {
    it("ignores the SoC code PassMark appends to a MediaTek marketing name", () => {
      expect(outcome("MediaTek Kompanio 838")).toBe("Mediatek Kompanio 838 MT8188");
      expect(outcome("MediaTek Kompanio Ultra 910")).toBe("Mediatek Kompanio Ultra 910");
      expect(outcome("MediaTek Kompanio 540")).toBe("Mediatek Kompanio 540");
    });

    it("matches a name written as a range for both listed numbers, not for the numbers in between", () => {
      // "520-528 (MT8186-MT8186T)": PassMark itself folds the two parts (one SoC, two clock bins) into one record.
      expect(outcome("MediaTek Kompanio 520")).toBe("MediaTek Kompanio 520-528 (MT8186-MT8186T)");
      expect(outcome("MediaTek Kompanio 528")).toBe("MediaTek Kompanio 520-528 (MT8186-MT8186T)");
      expect(outcome("MediaTek Kompanio 524")).toBe("no_match");
      expect(outcome("MediaTek Kompanio 52")).toBe("no_match");
      expect(outcome("MediaTek Kompanio 5200")).toBe("no_match");
    });

    it("does not extend a range to model numbers with suffix letters", () => {
      const suffixed = createCanonicalKeyMatcher(namedCpus("MediaTek Kompanio 520-528X"));
      expect(cpuOutcome(suffixed, "MediaTek Kompanio 528")).toBe("no_match");
    });
  });

  describe("a leading vendor word is optional when PassMark omits it", () => {
    it("is ambiguous across the clock variants of Snapdragon 7c, never the Gen 2 chip", () => {
      expect(outcome("Qualcomm Snapdragon 7c")).toEqual([
        "Snapdragon 7c @ 1.96 GHz",
        "Snapdragon 7c @ 2.40 GHz",
      ]);
      expect(outcome("Qualcomm Snapdragon 7c Gen 2")).toBe("Snapdragon 7c Gen 2 @ 2.55 GHz");
      expect(outcome("Qualcomm Snapdragon 8cx Gen 3")).toBe("Snapdragon 8cx Gen 3 @ 3.0 GHz");
    });

    it("never turns a bare family name into a model", () => {
      expect(outcome("Qualcomm Snapdragon")).toBe("no_match");
      expect(outcome("Qualcomm Snapdragon 7")).toBe("no_match");
    });
  });
});

describe("CPU near-misses and generic names stay unmatched", () => {
  const matcher = createCanonicalKeyMatcher(
    namedCpus(
      "Intel Pentium Silver N6000 @ 1.10GHz",
      "Intel Core i5-1335U",
      "Intel Core Ultra 9 285",
      "Intel Core 5 120",
      "Intel Core 7 150U",
      "AMD Ryzen AI 7 350",
      "AMD Ryzen AI 7 PRO 350",
      "AMD Sempron 130",
      "Intel Core i5-650 @ 3.20GHz",
      "AMD Athlon II X4 650",
      "AMD Athlon 64 X2 Dual Core BE-230",
      "AMD Athlon MP",
      "AMD Athlon 4",
      "Nvidia Tegra T210",
      "Intel Celeron 1.70GHz",
      "Intel Core2 Duo E6550 @ 2.33GHz",
    ),
  );
  const outcome = (text: string) => cpuOutcome(matcher, text);

  it("does not read a near-miss model number as the record next to it", () => {
    expect(outcome("Intel Core i7-1335U")).toBe("no_match");
    expect(outcome("Intel Core Ultra 9 285KF")).toBe("no_match");
    expect(outcome("Intel Core Ultra 9 285K")).toBe("no_match");
    expect(outcome("Intel Core 5 320")).toBe("no_match");
  });

  it("never hands one vendor's number to another vendor's family", () => {
    expect(outcome("Intel Core 7 350")).toBe("no_match");
    expect(outcome("AMD Ryzen 5 130")).toBe("no_match");
    expect(outcome("NVIDIA RTX Spark N1X 650")).toBe("no_match");
    expect(outcome("AMD Ryzen 5 230 Pro")).toBe("no_match");
  });

  it("does not match a family name that names no model", () => {
    expect(outcome("AMD Athlon")).toBe("no_match");
    expect(outcome("Intel Core 2 Duo")).toBe("no_match");
    expect(outcome("Intel Pentium")).toBe("no_match");
    expect(outcome("Intel Pentium Silver")).toBe("no_match");
    expect(outcome("Intel Pentium Dual Core")).toBe("no_match");
    expect(outcome("Intel Celeron")).not.toBe("Intel Celeron 1.70GHz");
  });
});

const gpuMatcher = (...rows: readonly { name: string; cat: string }[]) =>
  createGpuMatcher(
    passmarkGpuSource.parse(
      asJson(rows.map((row, i) => gpuRow({ id: String(7500 + i), name: row.name, cat: row.cat }))),
    ),
  );

describe("GPU naming conventions", () => {
  const matcher = gpuMatcher(
    { name: "Radeon RX 470/570", cat: "Desktop" },
    { name: "Radeon RX 460", cat: "Desktop" },
    { name: "Radeon RX 560", cat: "Desktop" },
    { name: "Radeon Pro 570", cat: "Mobile" },
    { name: "GeForce GTX 570", cat: "Desktop" },
    { name: "Qualcomm Adreno 618 GPU", cat: "Unknown" },
    { name: "Qualcomm Adreno 8cx Gen 3", cat: "Unknown" },
    { name: "Qualcomm Adreno 8cx Gen 3 GPU", cat: "Desktop" },
    { name: "Qualcomm Adreno GPU", cat: "Desktop" },
    { name: "Quadro M2200", cat: "Mobile, Workstation" },
    { name: "Quadro M520", cat: "Mobile, Workstation" },
    { name: "Quadro M2000", cat: "Workstation" },
    { name: "Quadro M2000M", cat: "Mobile, Workstation" },
    { name: "Quadro M5000", cat: "Workstation" },
    { name: "Quadro M1000", cat: "Desktop" },
    { name: "Radeon Pro WX 3100", cat: "Workstation" },
    { name: "Radeon Pro WX 3200", cat: "Mobile" },
    { name: "Radeon Pro WX 2100", cat: "Mobile" },
    { name: "Intel Iris Pro Graphics 6200", cat: "Unknown" },
  );
  const outcome = (text: string, formFactor: FormFactor) => {
    const result = matcher.match(text, { formFactor });
    return result.status === "matched"
      ? result.record.name
      : result.status === "ambiguous"
        ? result.candidates.map((c) => c.name)
        : result.status;
  };

  describe("a slash-combined record name covers each model it lists", () => {
    it("matches RX 570 and RX 470 to the combined record", () => {
      expect(outcome("AMD Radeon RX 570", "desktop")).toBe("Radeon RX 470/570");
      expect(outcome("AMD Radeon RX 470", "desktop")).toBe("Radeon RX 470/570");
      expect(outcome("Radeon RX 470/570", "desktop")).toBe("Radeon RX 470/570");
    });

    it("keeps a model that is not listed, and the suffixed cards, apart", () => {
      expect(outcome("AMD Radeon RX 670", "desktop")).toBe("no_match");
      expect(outcome("AMD Radeon RX 570X", "desktop")).toBe("no_match");
      expect(outcome("AMD Radeon RX 560", "desktop")).toBe("Radeon RX 560");
      expect(outcome("AMD Radeon RX 47", "desktop")).toBe("no_match");
    });

    it("lets a record of exactly the model win over the combined one", () => {
      const both = gpuMatcher(
        { name: "Radeon RX 470/570", cat: "Desktop" },
        { name: "Radeon RX 570", cat: "Desktop" },
      );
      const result = both.match("AMD Radeon RX 570", { formFactor: "desktop" });
      expect(result).toMatchObject({ status: "matched", record: { name: "Radeon RX 570" } });
      expect(both.match("AMD Radeon RX 470", { formFactor: "desktop" })).toMatchObject({
        status: "matched",
        record: { name: "Radeon RX 470/570" },
      });
    });
  });

  describe("PassMark's trailing noun GPU is not part of the model", () => {
    it("matches Adreno 618 to Adreno 618 GPU", () => {
      expect(outcome("Qualcomm Adreno 618", "laptop")).toBe("Qualcomm Adreno 618 GPU");
      expect(outcome("Qualcomm Adreno 618 GPU", "laptop")).toBe("Qualcomm Adreno 618 GPU");
    });

    it("prefers the record named exactly like the text", () => {
      expect(outcome("Qualcomm Adreno 8cx Gen 3", "laptop")).toBe("Qualcomm Adreno 8cx Gen 3");
      expect(outcome("Qualcomm Adreno 8cx Gen 3 GPU", "laptop")).toBe(
        "Qualcomm Adreno 8cx Gen 3 GPU",
      );
    });

    it("does not give a family word the model-less record", () => {
      expect(outcome("Qualcomm Adreno", "laptop")).toBe("no_match");
      expect(outcome("Qualcomm Adreno 619", "laptop")).toBe("no_match");
      expect(outcome("Qualcomm Adreno X Plus", "laptop")).toBe("no_match");
    });
  });

  describe("the mobile M of a Quadro model may be missing in PassMark", () => {
    it("matches Quadro M2200M and M520M to the Mobile records without the M", () => {
      expect(outcome("NVIDIA Quadro M2200M", "laptop")).toBe("Quadro M2200");
      expect(outcome("NVIDIA Quadro M520M", "laptop")).toBe("Quadro M520");
      expect(outcome("NVIDIA Quadro M520M", "unknown")).toBe("Quadro M520");
    });

    it("takes the record named with the M when there is one", () => {
      expect(outcome("NVIDIA Quadro M2000M", "laptop")).toBe("Quadro M2000M");
    });

    it("never hands a laptop label a desktop-only card, nor a desktop one a mobile part", () => {
      expect(outcome("NVIDIA Quadro M5000M", "laptop")).toBe("no_match");
      expect(outcome("NVIDIA Quadro M1000M", "laptop")).toBe("no_match");
      expect(outcome("NVIDIA Quadro M2200M", "desktop")).toBe("no_match");
    });
  });

  describe("letters written apart from their number are one name", () => {
    it("matches WX3100 to Radeon Pro WX 3100", () => {
      expect(outcome("AMD Radeon Pro WX3100", "laptop")).toBe("Radeon Pro WX 3100");
      expect(outcome("AMD Radeon Pro WX3200", "laptop")).toBe("Radeon Pro WX 3200");
      expect(outcome("AMD Radeon Pro WX 3200", "laptop")).toBe("Radeon Pro WX 3200");
    });

    it("keeps different numbers apart", () => {
      expect(outcome("AMD Radeon Pro WX3300", "laptop")).toBe("no_match");
      expect(outcome("AMD Radeon Pro WX310", "laptop")).toBe("no_match");
      expect(outcome("AMD Radeon Pro WX31000", "laptop")).toBe("no_match");
    });
  });

  it("keeps Apple and ARM graphics away from every Intel or AMD record", () => {
    for (const text of ["Apple M5 Pro Graphics", "Apple M2 Max Graphics", "ARM Mali-G57 MC2"]) {
      expect(outcome(text, "laptop")).toBe("no_match");
    }
  });
});
