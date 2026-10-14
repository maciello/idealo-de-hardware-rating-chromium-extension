// @vitest-environment jsdom

import { passmarkCpuSource } from "@idealo-hw/hw-bench";
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRatingEngine, type ItemRating, STRATEGY_CATALOG } from "../src/ratings/engine";
import { RatingChip } from "../src/ratings/RatingChip";

// jsdom lacks matchMedia and ResizeObserver, which Mantine's provider and Popover probe for.
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

afterEach(cleanup);

const ambiguous: Extract<ItemRating, { status: "ambiguous" }> = {
  status: "ambiguous",
  candidates: [
    { id: 4, name: "Intel Core i3-1115G4" },
    { id: 5, name: "Intel Core i3-1115G4 @ 3.00GHz" },
  ] as never,
};

const view = (onOpenSettings = () => undefined) =>
  render(
    <MantineProvider env="test">
      <RatingChip
        rating={ambiguous}
        primaryId="raw_multithread_score"
        importedAt="2026-10-14T10:00:00.000Z"
        onOpenSettings={onOpenSettings}
      />
    </MantineProvider>,
  );

describe("RatingChip (ambiguous)", () => {
  it("shows 'CPU ?' and lists the candidates on demand", async () => {
    view();
    const chip = screen.getByTestId("rating-badge");
    expect(chip.textContent).toBe("CPU ?");
    expect(chip.getAttribute("data-status")).toBe("ambiguous");
    fireEvent.click(chip);
    expect(await screen.findByText("Several PassMark CPUs match")).toBeTruthy();
    expect(screen.getByText("Intel Core i3-1115G4")).toBeTruthy();
    expect(screen.getByText("Intel Core i3-1115G4 @ 3.00GHz")).toBeTruthy();
    expect(screen.getByText("PassMark import 14.10.2026")).toBeTruthy();
  });

  it("opens the settings from the card and closes on Escape", async () => {
    const onOpenSettings = vi.fn();
    view(onOpenSettings);
    const chip = screen.getByTestId("rating-badge");
    fireEvent.click(chip);
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
    fireEvent.keyDown(chip, { key: "Escape" });
    await vi.waitFor(() => expect(screen.queryByText("Several PassMark CPUs match")).toBeNull());
  });
});

describe("RatingChip (memory tag)", () => {
  const cpus = passmarkCpuSource.parse(
    JSON.stringify({
      data: [
        {
          id: "1",
          name: "Intel Core i7-13700H",
          cpumark: "28,000",
          thread: "3,700",
          cat: "Laptop",
        },
      ],
    }),
  );
  const engine = createRatingEngine(
    cpus,
    STRATEGY_CATALOG.map((s) => s.id),
  );
  const chipFor = (text: string) => {
    const [rating] = engine.rate([{ title: "Intel Core i7-13700H Notebook", text }]);
    if (rating?.status !== "matched") throw new Error("expected a match");
    render(
      <MantineProvider env="test">
        <RatingChip
          rating={rating}
          primaryId="raw_multithread_score"
          importedAt={null}
          onOpenSettings={() => undefined}
        />
      </MantineProvider>,
    );
  };

  it("flags DDR4 with a tag that explains itself", () => {
    chipFor("Intel Core i7-13700H, DDR4");
    const tag = screen.getByTestId("chip-memory");
    expect(tag.textContent).toBe("DDR4");
    expect(tag.getAttribute("title")).toBe("Older memory generation");
    expect(screen.getByTestId("rating-badge").getAttribute("aria-label")).toContain(
      "DDR4: older memory generation",
    );
  });

  it.each([
    ["DDR5", "Intel Core i7-13700H, DDR5"],
    ["LPDDR5X", "Intel Core i7-13700H, LPDDR5X"],
    ["graphics memory only", "Intel Core i7-13700H, Grafikspeichertyp GDDR6"],
    ["no type", "Intel Core i7-13700H, 16 GB RAM"],
  ])("shows no tag for %s", (_name, text) => {
    chipFor(text);
    expect(screen.queryByTestId("chip-memory")).toBeNull();
  });
});
