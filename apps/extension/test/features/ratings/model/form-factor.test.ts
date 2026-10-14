import { describe, expect, it } from "vitest";
import { productFormFactor } from "../../../../src/features/ratings/model/form-factor";

describe("productFormFactor", () => {
  it("reads the datasheet's marker rows", () => {
    expect(
      productFormFactor({ title: "X", specText: "Notebook-Typ\tGaming Notebook\nRAM\t32 GB" }),
    ).toBe("laptop");
    expect(productFormFactor({ title: "X", specText: "PC-Typ\tGaming PC\nRAM\t32 GB" })).toBe(
      "desktop",
    );
  });

  it("falls back to title words, then unknown", () => {
    expect(productFormFactor({ title: "Honor MagicBook Notebook", specText: "RAM\t32 GB" })).toBe(
      "laptop",
    );
    expect(productFormFactor({ title: "Honor 14", specText: "RAM\t32 GB" })).toBe("unknown");
  });
});
