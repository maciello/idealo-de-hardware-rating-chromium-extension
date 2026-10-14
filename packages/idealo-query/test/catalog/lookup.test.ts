import { describe, expect, it } from "vitest";
import { filterId, indexCatalog, manufacturerId } from "../../src/index";
import { catalog } from "../fixtures";

const f = filterId;

describe("indexCatalog", () => {
  it("looks up filters, groups and manufacturers", () => {
    const index = indexCatalog(catalog);
    expect(index.filter(f("1263422"))?.group.name).toBe("Prozessor");
    expect(index.filter(f("1263422"))?.filter.label).toBe("AMD Ryzen 7");
    expect(index.filter(f("1"))).toBeUndefined();
    expect(index.group("6022")?.name).toBe("Arbeitsspeicher");
    expect(index.manufacturer(manufacturerId("88"))?.name).toBe("ASUS");
    expect(index.manufacturerBySearchFilterId(f("5550077"))?.name).toBe("Lenovo");
    expect(indexCatalog(catalog)).toBe(index);
  });
});
