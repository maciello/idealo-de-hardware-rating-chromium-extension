import { describe, expect, it } from "vitest";
import { CPU_EXTRACTORS } from "../../../src/identity/cpu/registry";

describe("CPU_EXTRACTORS", () => {
  it("keeps the evaluation order, which decides ties between matches at the same span", () => {
    expect(CPU_EXTRACTORS.map((extractor) => extractor.id)).toEqual([
      "intel-core-ultra",
      "intel-core-i",
      "intel-bare-i",
      "intel-core-numbered",
      "intel-n",
      "intel-branded-n",
      "intel-core-n",
      "intel-entry",
      "ryzen-threadripper",
      "ryzen",
      "athlon",
      "apple",
      "snapdragon-x",
      "mediatek-kompanio",
    ]);
  });

  it("gives every extractor a unique id", () => {
    const ids = CPU_EXTRACTORS.map((extractor) => extractor.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
