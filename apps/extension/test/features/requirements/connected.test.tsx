// @vitest-environment jsdom
import {
  categoryId,
  emptyRequirements,
  type FilterCatalog,
  filterId,
  planRequirements,
  setNumeric,
} from "@idealo-hw/idealo-query";
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RequirementsSection } from "../../../src/features/requirements/connected";

window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
    onchange: null,
  }) as MediaQueryList;
window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);

const group = (name: string, labels: string[], start: number) => ({
  attributeId: name,
  name,
  filters: labels.map((label, i) => ({
    filterId: filterId(String(start + i)),
    label,
    count: 10,
  })),
});
const base = (...groups: ReturnType<typeof group>[]): FilterCatalog => ({
  categoryId: categoryId("3751"),
  groups,
  manufacturers: [],
});

const view = (catalog: FilterCatalog, onChange = vi.fn()) => {
  const requirements = setNumeric(emptyRequirements(), "ram_gb", { min: 16 });
  const plan = planRequirements(
    requirements,
    catalog,
    { categoryId: catalog.categoryId, filterIds: [], manufacturerIds: [] },
    () => null,
  );
  render(
    <MantineProvider env="test">
      <RequirementsSection
        catalog={catalog}
        requirements={requirements}
        plan={plan}
        scorer={() => null}
        hasData={{ cpu: false, gpu: false }}
        priceBounds={null}
        pagePrice={undefined}
        onChange={onChange}
        onPriceChange={() => undefined}
      />
    </MantineProvider>,
  );
  return onChange;
};

describe("RequirementsSection", () => {
  it("shows only the controls the category has, with the plan's status under each", () => {
    view(
      base(
        group("RAM", ["8 GB", "16 GB", "32 GB"], 100),
        group("Gewicht", ["1,2 kg", "1,8 kg"], 200),
      ),
    );
    expect(screen.getByTestId("req-value-ram_gb").textContent).toBe("16 GB");
    expect(screen.getByTestId("req-status-ram_gb").textContent).toBe("2 options");
    expect(screen.getByTestId("req-value-weight_kg").textContent).toBe("any");
    expect(screen.queryByTestId("req-ssd_gb")).toBeNull();
    expect(screen.queryByTestId("req-cpu_mark")).toBeNull();
  });

  it("disables the RAM-type chips with a note where the category has no such group", () => {
    view(base(group("RAM", ["8 GB", "16 GB"], 100)));
    expect(screen.getByTestId("req-ram_type").textContent).toContain(
      "idealo has no RAM-type filter here",
    );
    expect(screen.getByRole("checkbox", { name: "DDR5" }).hasAttribute("disabled")).toBe(true);
  });

  it("offers the category's own RAM types, newest generation first, and reports the choice", () => {
    const onChange = view(base(group("RAM Typ", ["DDR4", "LPDDR5X", "DDR5"], 300)));
    const chips = screen.getAllByRole("checkbox").map((chip) => chip.getAttribute("value"));
    expect(chips).toEqual(["DDR5", "LPDDR5X", "DDR4"]);
    fireEvent.click(screen.getByRole("checkbox", { name: "DDR5" }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0]?.[0].labels).toEqual({ ram_type: ["DDR5"] });
  });

  it("renders nothing for a category without any requirement facet", () => {
    view(base(group("Prozessor-Hersteller", ["Intel", "AMD"], 400)));
    expect(screen.queryByTestId("requirements")).toBeNull();
  });
});
