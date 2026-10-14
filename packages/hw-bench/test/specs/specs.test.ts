import { describe, expect, it } from "vitest";
import { parseSpecBlock, productContextFromSpecs, SPEC_LABELS } from "../../src";

describe("parseSpecBlock", () => {
  it("parses tab-separated idealo lines", () => {
    const specs = parseSpecBlock(
      "Prozessor\tIntel Core Ultra 9 275HX\nGrafikkarte\tNVIDIA GeForce RTX 5080\nNotebook-Typ\tGaming Notebook\n",
    );
    expect([...specs]).toEqual([
      ["Prozessor", "Intel Core Ultra 9 275HX"],
      ["Grafikkarte", "NVIDIA GeForce RTX 5080"],
      ["Notebook-Typ", "Gaming Notebook"],
    ]);
  });

  it("tolerates 'Label: Value', CRLF, blank lines, padding and trailing colons", () => {
    const specs = parseSpecBlock(
      "Prozessor: AMD Ryzen 7 8845HS\r\n\r\n  Arbeitsspeicher :  32 GB  \r\nGrafikkarte:\tRadeon 780M\r\nohne Trenner\r\n",
    );
    expect(specs.get("Prozessor")).toBe("AMD Ryzen 7 8845HS");
    expect(specs.get("Arbeitsspeicher")).toBe("32 GB");
    expect(specs.get("Grafikkarte")).toBe("Radeon 780M");
    expect(specs.size).toBe(3);
  });

  it("keeps colons inside values and the first occurrence of a repeated label", () => {
    const specs = parseSpecBlock("Display\t16:9 IPS\nDisplay\tOLED\nTakt: 3:2 Turbo");
    expect(specs.get("Display")).toBe("16:9 IPS");
    expect(specs.get("Takt")).toBe("3:2 Turbo");
  });

  it("joins extra tab-separated cells into the value and skips empty values", () => {
    const specs = parseSpecBlock("Prozessor\tIntel Core i5\t12400F\nLeer\t\n");
    expect(specs.get("Prozessor")).toBe("Intel Core i5 12400F");
    expect(specs.has("Leer")).toBe(false);
  });

  it("returns an empty map for empty text", () => {
    expect(parseSpecBlock("").size).toBe(0);
  });
});

describe("productContextFromSpecs", () => {
  const ctx = (text: string, title?: string) =>
    productContextFromSpecs(parseSpecBlock(text), title === undefined ? {} : { title });

  it("reads CPU and GPU text and treats Notebook-Typ as laptop", () => {
    expect(
      ctx(
        "Prozessor\tIntel Core Ultra 9 275HX\nGrafikkarte\tNVIDIA GeForce RTX 5080\nNotebook-Typ\tGaming Notebook",
      ),
    ).toEqual({
      cpuText: "Intel Core Ultra 9 275HX",
      gpuText: "NVIDIA GeForce RTX 5080",
      formFactor: "laptop",
    });
  });

  it("treats PC-Typ as desktop", () => {
    expect(ctx("PC-Typ\tGaming PC\nProzessor\tAMD Ryzen 5 7600X").formFactor).toBe("desktop");
  });

  it("is unknown without markers or title words, and omits missing texts", () => {
    expect(ctx("Prozessor\tAMD Ryzen 5 7600X")).toEqual({
      cpuText: "AMD Ryzen 5 7600X",
      formFactor: "unknown",
    });
    expect(ctx("")).toEqual({ formFactor: "unknown" });
  });

  it.each([
    ["Notebook 15 Zoll", "laptop"],
    ['OneXPlayer Super X 14" Tablet & Laptop 2-In-1', "laptop"],
    ["Foo 2-in-1 Convertible", "laptop"],
    ["Testcorp Desktop PC", "desktop"],
    ["Testcorp Gaming-PC Tower", "desktop"],
    ["Testcorp Laptop PC", "laptop"],
    ["Testcorp Widget", "unknown"],
  ] as const)("title %s -> %s", (title, expected) => {
    expect(ctx("Prozessor\tX", title).formFactor).toBe(expected);
  });

  it("lets a marker label beat the title", () => {
    expect(ctx("PC-Typ\tMini PC", "Notebook-Style Mini PC").formFactor).toBe("desktop");
    expect(ctx("Notebook-Typ\tGaming", "Desktop Replacement").formFactor).toBe("laptop");
  });

  it("matches labels ignoring case, spacing and hyphens, and ignores generic GPU values", () => {
    expect(ctx("notebook typ\tGaming\nPROZESSOR\tIntel N100").formFactor).toBe("laptop");
    expect(ctx("Prozessor\tIntel N100").cpuText).toBe("Intel N100");
    expect(ctx("Grafikkarte\tIntegriert").gpuText).toBeUndefined();
    expect(ctx("Grafikkartentyp\tDediziert\nGrafikkarte\tRadeon 780M").gpuText).toBe("Radeon 780M");
  });

  it("exports the German labels", () => {
    expect(SPEC_LABELS.cpu).toContain("Prozessor");
    expect(SPEC_LABELS.gpu).toContain("Grafikkarte");
    expect(SPEC_LABELS.laptopMarker).toContain("Notebook-Typ");
    expect(SPEC_LABELS.desktopMarker).toContain("PC-Typ");
  });
});
