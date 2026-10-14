// @vitest-environment jsdom

import { passmarkCpuSource } from "@idealo-hw/hw-bench";
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConnectedRatingChip as RatingChip } from "../../../src/features/ratings/connected";
import {
  createRatingEngine,
  STRATEGY_CATALOG,
  signalsOf,
} from "../../../src/features/ratings/model";
import { cardRows, chipModel } from "../../../src/features/ratings/view-model";

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

const row = (id: number, name: string, tdp: string, cat: string) => ({
  id: String(id),
  name,
  cpumark: "30,000",
  thread: "3,000",
  tdp,
  cat,
});

const engine = createRatingEngine(
  passmarkCpuSource.parse(
    JSON.stringify({
      data: [
        row(1, "Intel Core i7-1250U", "9", "Laptop"),
        row(2, "Intel Core i9-13900HX", "55", "Laptop"),
        row(3, "Intel Core i7-13700H", "45", "Laptop"),
        row(4, "Intel Core i5-13400", "65", "Desktop"),
        row(5, "Intel Core i9-14900K", "125", "Desktop"),
        row(6, "Intel Core i3-12100T", "35", "Desktop"),
        row(7, "Qualcomm Snapdragon X Elite X1E-78-100", "80", "Laptop"),
      ],
    }),
  ),
  STRATEGY_CATALOG.map((s) => s.id),
);

const NOW = { year: 2026 };

const rate = (title: string, formFactor?: "laptop" | "desktop") => {
  const query = { title, text: "", ...(formFactor ? { formFactor } : {}) };
  const [rating] = engine.rate([query]);
  if (rating?.status !== "matched") throw new Error("expected a match");
  return { rating, signals: signalsOf(query, rating, NOW) };
};

describe("power signals", () => {
  it("raises a very high power signal for a laptop CPU at the threshold", () => {
    expect(rate("Notebook Intel Core i9-13900HX", "laptop").signals.map((s) => s.id)).toEqual([
      "power.very_high",
    ]);
  });

  it("takes the device class from the CPU itself when the page does not say", () => {
    expect(rate("Notebook Snapdragon X Elite X1E-78-100").signals.map((s) => s.id)).toEqual([
      "power.very_high",
    ]);
    expect(rate("PC Intel Core i3-12100T").signals.map((s) => s.id)).toEqual(["power.very_low"]);
  });

  it("raises nothing without a page class for a CPU both device classes use", () => {
    expect(rate("Notebook Intel Core i9-13900HX").signals).toEqual([]);
  });

  it("lets the page's device class change the verdict for the same CPU", () => {
    expect(rate("Intel Core i5-13400", "laptop").signals.map((s) => s.id)).toEqual([
      "power.very_high",
    ]);
    expect(rate("Intel Core i5-13400", "desktop").signals).toEqual([]);
    expect(rate("Intel Core i7-1250U", "desktop").signals.map((s) => s.id)).toEqual([
      "power.very_low",
    ]);
  });

  it("raises nothing in the middle", () => {
    expect(rate("Notebook Intel Core i7-13700H", "laptop").signals).toEqual([]);
    expect(rate("PC Intel Core i9-14900K", "desktop").signals).toEqual([]);
  });
});

describe("power signal presentation", () => {
  it("puts the label on the chip model and label plus detail in a card row", () => {
    const { rating, signals } = rate("Notebook Intel Core i7-1250U", "laptop");
    expect(chipModel(rating, "raw_multithread_score", signals)?.power).toEqual({
      level: "low",
      label: "Very low power",
    });
    expect(cardRows(rating, signals).at(-1)).toEqual({
      id: "power",
      label: "Very low power",
      value: "9 W TDP · 3,333 CPU Mark per W",
      title: "TDP: 9 W · TDP source: benchmark",
      meter: null,
    });
  });

  it("adds neither a chip icon nor a row for the middle", () => {
    const { rating, signals } = rate("Notebook Intel Core i7-13700H", "laptop");
    expect(chipModel(rating, "raw_multithread_score", signals)?.power).toBeNull();
    expect(cardRows(rating, signals).some((r) => r.id === "power")).toBe(false);
  });
});

describe("RatingChip power icon", () => {
  const show = (title: string, formFactor: "laptop" | "desktop") => {
    const { rating, signals } = rate(title, formFactor);
    return render(
      <MantineProvider env="test">
        <RatingChip
          rating={rating}
          signals={signals}
          primaryId="raw_multithread_score"
          importedAt={null}
          onOpenSettings={() => undefined}
        />
      </MantineProvider>,
    );
  };

  it("shows a labelled leaf for very low power", () => {
    show("Notebook Intel Core i7-1250U", "laptop");
    const icon = screen.getByTestId("chip-power");
    expect(icon.getAttribute("aria-label")).toBe("Very low power");
    expect(icon.getAttribute("title")).toBe("Very low power");
    expect(icon.getAttribute("data-level")).toBe("low");
    expect(screen.getByTestId("rating-badge").getAttribute("aria-label")).toContain(
      "very low power",
    );
  });

  it("shows a labelled flame for very high power and a card row with the detail", async () => {
    show("Notebook Intel Core i9-13900HX", "laptop");
    const icon = screen.getByTestId("chip-power");
    expect(icon.getAttribute("aria-label")).toBe("Very high power");
    expect(icon.getAttribute("data-level")).toBe("high");
    fireEvent.click(screen.getByTestId("rating-badge"));
    const powerRow = await screen.findByTestId("card-row-power");
    expect(powerRow.textContent).toBe("Very high power55 W TDP · 545 CPU Mark per W");
  });

  it("shows no icon for the middle", () => {
    show("Notebook Intel Core i7-13700H", "laptop");
    expect(screen.queryByTestId("chip-power")).toBeNull();
  });
});
