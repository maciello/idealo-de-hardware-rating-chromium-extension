// @vitest-environment jsdom
import { categoryId, emptyQuery, filterId, type Requirements } from "@idealo-hw/idealo-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAVE_DELAY_MS } from "../../../../src/features/filters/config";
import {
  type FilterBuilderInput,
  useFilterBuilder,
} from "../../../../src/features/filters/controller";
import { NO_CONTEXT } from "../../../../src/features/filters/model";
import { emptyRequirements, setNumeric } from "../../../../src/features/requirements/model";
import { catalog, group } from "../../requirements/catalog-fixtures";

const query = emptyQuery(categoryId("3751"));
const ram = catalog(group("RAM", ["8 GB", "16 GB", "32 GB"]));
const stored = setNumeric(emptyRequirements(), "ram_gb", { min: 8 });
const edit = (min: number): Requirements => setNumeric(emptyRequirements(), "ram_gb", { min });

const setup = (over: Partial<FilterBuilderInput> = {}) => {
  const save = vi.fn(async () => undefined);
  const input: FilterBuilderInput = {
    opened: true,
    onOpenedChange: vi.fn(),
    initialQuery: () => query,
    toUrl: (q) => `https://idealo.test/?f=${q.filterIds.join(",")}`,
    canFilter: true,
    loadCatalog: async () => ram,
    loadContext: async () => NO_CONTEXT,
    requirementsStore: { load: async () => stored, save },
    onApply: vi.fn(),
    onOpenSettings: vi.fn(),
    ...over,
  };
  const view = renderHook(() => useFilterBuilder(input));
  return { ...view, save, input };
};
const settle = () => act(async () => {});

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useFilterBuilder", () => {
  it("reads the catalog and the stored requirements when the panel opens", async () => {
    const { result } = setup();
    expect(result.current.model.requirements).toBeNull();
    await settle();
    expect(result.current.model.requirements?.catalog).toBe(ram);
    expect(result.current.model.requirements?.requirements).toEqual(stored);
  });

  it("does not read anything while the panel is closed", async () => {
    const loadCatalog = vi.fn(async () => ram);
    setup({ opened: false, loadCatalog });
    await settle();
    expect(loadCatalog).not.toHaveBeenCalled();
  });

  it("saves requirement edits once they settle, as one write of the last value", async () => {
    const { result, save } = setup();
    await settle();
    act(() => result.current.actions.changeRequirements(edit(16)));
    act(() => vi.advanceTimersByTime(SAVE_DELAY_MS - 1));
    act(() => result.current.actions.changeRequirements(edit(32)));
    act(() => vi.advanceTimersByTime(SAVE_DELAY_MS - 1));
    expect(save).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("3751", edit(32));
  });

  it("writes a pending edit when the panel unmounts", async () => {
    const { result, save, unmount } = setup();
    await settle();
    act(() => result.current.actions.changeRequirements(edit(16)));
    expect(save).not.toHaveBeenCalled();
    unmount();
    expect(save).toHaveBeenCalledWith("3751", edit(16));
  });

  it("keeps an edit made before the stored requirements arrived", async () => {
    let arrive: (value: Requirements) => void = () => undefined;
    const load = () => new Promise<Requirements>((resolve) => (arrive = resolve));
    const { result } = setup({ requirementsStore: { load, save: async () => undefined } });
    act(() => result.current.actions.changeRequirements(edit(16)));
    await act(async () => arrive(stored));
    expect(result.current.model.requirements?.requirements).toEqual(edit(16));
  });

  it("applies the url of the planned query", async () => {
    const { result, input } = setup({
      requirementsStore: { load: async () => emptyRequirements(), save: async () => undefined },
    });
    await settle();
    act(() => result.current.actions.toggleFilter(filterId("1000")));
    expect(result.current.model.applyDisabled).toBe(false);
    act(() => result.current.actions.apply());
    expect(input.onApply).toHaveBeenCalledWith("https://idealo.test/?f=1000");
  });

  it("resets the query and the requirements", async () => {
    const { result } = setup({
      requirementsStore: { load: async () => emptyRequirements(), save: async () => undefined },
    });
    await settle();
    act(() => result.current.actions.toggleFilter(filterId("1000")));
    expect(result.current.model.applyDisabled).toBe(false);
    act(() => result.current.actions.reset());
    expect(result.current.model.applyDisabled).toBe(true);
    expect(result.current.model.requirements?.requirements).toEqual(emptyRequirements());
  });
});
