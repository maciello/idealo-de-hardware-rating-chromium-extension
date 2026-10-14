// @vitest-environment jsdom

import { passmarkCpuSource } from "@idealo-hw/hw-bench";
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConnectedRatingChip as RatingChip } from "../../../src/features/ratings/connected";
import {
  createRatingEngine,
  type ItemRating,
  type RatingQuery,
  STRATEGY_CATALOG,
  signalsOf,
} from "../../../src/features/ratings/model";

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

const engine = createRatingEngine(
  passmarkCpuSource.parse(
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
  ),
  STRATEGY_CATALOG.map((s) => s.id),
);

const NOW = { year: 2026 };

const show = (extra: Partial<RatingQuery>, title = "Intel Core i7-13700H Notebook") => {
  const query: RatingQuery = { title, text: "", formFactor: "laptop", ...extra };
  const [found] = engine.rate([query]);
  const rating: ItemRating = found ?? { status: "no_match" };
  render(
    <MantineProvider env="test">
      <RatingChip
        rating={rating.status === "no_match" ? null : rating}
        signals={signalsOf(query, rating, NOW)}
        primaryId="raw_multithread_score"
        importedAt={null}
        onOpenSettings={() => undefined}
      />
    </MantineProvider>,
  );
};

describe("chip flags indicator", () => {
  it("counts red and amber flags and takes the worst severity", () => {
    show({ characteristics: ["4 GB RAM", "128 GB SSD-Speicher", "Windows 11 Home"] });
    const flags = screen.getByTestId("chip-flags");
    expect(flags.textContent).toBe("2");
    expect(flags.getAttribute("data-severity")).toBe("red");
    expect(flags.getAttribute("aria-label")).toBe(
      "2 flags, worst red: Very little RAM, Very little storage",
    );
    expect(screen.getByTestId("rating-badge").getAttribute("aria-label")).toContain(
      "2 flags, worst red: Very little RAM, Very little storage",
    );
  });

  it("is amber when no flag is red", () => {
    show({ characteristics: ["8 GB RAM", "512 GB SSD-Speicher"] });
    const flags = screen.getByTestId("chip-flags");
    expect(flags.textContent).toBe("1");
    expect(flags.getAttribute("data-severity")).toBe("amber");
  });

  it("is absent for a product with only info signals, and for one with no facts", () => {
    show({ characteristics: ["16 GB RAM", "512 GB SSD-Speicher", "Wi-Fi 5"] });
    expect(screen.queryByTestId("chip-flags")).toBeNull();
    expect(screen.getByTestId("rating-badge").getAttribute("data-status")).toBe("matched");
  });

  it("sits on the chip of a product whose CPU is unmatched", () => {
    show({ characteristics: ["4 GB RAM"] }, "Notebook ohne bekannte CPU");
    const chip = screen.getByTestId("rating-badge");
    expect(chip.getAttribute("data-status")).toBe("signals");
    expect(within(chip).getByTestId("chip-flags").textContent).toBe("1");
    expect(within(chip).queryByTestId("chip-cpu")).toBeNull();
  });

  it("leaves the older-memory tag alone instead of counting it twice", () => {
    show({ text: "Intel Core i7-13700H, DDR4", characteristics: ["8 GB RAM"] });
    expect(screen.getByTestId("chip-memory").textContent).toBe("DDR4");
    expect(screen.getByTestId("chip-flags").textContent).toBe("1");
  });
});

describe("card sections", () => {
  const open = async () => {
    fireEvent.click(screen.getByTestId("rating-badge"));
    return screen.findByTestId("rating-card");
  };

  it("lists every flag worst first, info ones included, each with its label and detail", async () => {
    show({
      characteristics: ["8 GB RAM", "128 GB SSD-Speicher", "Wi-Fi 5"],
    });
    const flags = within(await open()).getByTestId("card-flags");
    const items = within(flags).getAllByRole("listitem");
    expect(
      items.map((li) => [li.getAttribute("data-flag-id"), li.getAttribute("data-severity")]),
    ).toEqual([
      ["red_flags.storage_tiny", "red"],
      ["red_flags.ram_low", "amber"],
      ["red_flags.wifi_old", "info"],
    ]);
    expect(items[0]?.textContent).toContain("Very little storage");
    expect(items[0]?.textContent).toContain("128 GB fills up quickly with the system and updates.");
    expect(within(flags).getByText("Red flags")).toBeTruthy();
  });

  it("shows the webcam badges as features, not as flags", async () => {
    show({ datasheet: "Kameraauflösung\t1920 x 1080 Pixel\nRAM\t16 GB" });
    expect(screen.queryByTestId("chip-flags")).toBeNull();
    const card = await open();
    const features = within(card).getByTestId("card-features");
    expect(features.textContent).toBe("Features1080p+ webcam");
    expect(within(card).queryByTestId("card-flags")).toBeNull();
  });

  it("has neither section for a product with nothing to report", async () => {
    show({ characteristics: ["16 GB RAM", "512 GB SSD-Speicher"] });
    const card = await open();
    expect(within(card).queryByTestId("card-flags")).toBeNull();
    expect(within(card).queryByTestId("card-features")).toBeNull();
  });
});
