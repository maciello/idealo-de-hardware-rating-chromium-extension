import { categoryId, emptyQuery, emptyRequirements, setNumeric } from "@idealo-hw/idealo-query";
import { describe, expect, it } from "vitest";
import { planOf, safeUrl } from "../../../../src/features/filters/model";
import { catalog, group } from "../../requirements/catalog-fixtures";

const query = emptyQuery(categoryId("3751"));

describe("safeUrl", () => {
  it("returns the url the page type builds", () => {
    expect(safeUrl(() => "https://www.idealo.de/x", query)).toBe("https://www.idealo.de/x");
  });

  it("is empty when the query cannot be expressed", () => {
    expect(
      safeUrl(() => {
        throw new Error("not expressible");
      }, query),
    ).toBe("");
  });
});

describe("planOf", () => {
  const ram = catalog(group("RAM", ["8 GB", "16 GB", "32 GB"]));
  const wanted = setNumeric(emptyRequirements(), "ram_gb", { min: 16 });

  it("plans the requirements against the catalog", () => {
    const plan = planOf(ram, query, wanted, () => null);
    expect(plan?.query.filterIds.length).toBeGreaterThan(0);
  });

  it("has nothing to plan without a catalog or without requirements", () => {
    expect(planOf(null, query, wanted, () => null)).toBeNull();
    expect(planOf(ram, query, emptyRequirements(), () => null)).toBeNull();
  });

  it("ignores a catalog of another category", () => {
    expect(planOf(ram, emptyQuery(categoryId("999")), wanted, () => null)).toBeNull();
  });
});
