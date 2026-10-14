// @vitest-environment jsdom

import { passmarkCpuSource } from "@idealo-hw/hw-bench";
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRatingEngine, type ItemRating, STRATEGY_CATALOG } from "../src/ratings/engine";
import { createGpuEngine } from "../src/ratings/gpu-engine";
import { RatingChip } from "../src/ratings/RatingChip";
import { GPU_SPECS, gpuSnapshotOf } from "./gpu-snapshot";

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

describe("RatingChip (GPU line)", () => {
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
  const cpuEngine = createRatingEngine(
    cpus,
    STRATEGY_CATALOG.map((s) => s.id),
  );
  const gpuEngine = createGpuEngine(gpuSnapshotOf(...GPU_SPECS));
  const query = (text: string) => ({
    title: "Intel Core i7-13700H Notebook",
    text,
    priceEur: 1500,
    formFactor: "laptop" as const,
  });

  const chipFor = (text: string, { cpu = true }: { cpu?: boolean } = {}) => {
    const [rating] = cpuEngine.rate([query(text)]);
    const [gpu] = gpuEngine.rate([query(text)]);
    render(
      <MantineProvider env="test">
        <RatingChip
          rating={cpu && rating?.status === "matched" ? rating : null}
          gpu={gpu ?? null}
          primaryId="raw_multithread_score"
          importedAt="2026-10-14T10:00:00.000Z"
          onOpenSettings={() => undefined}
        />
      </MantineProvider>,
    );
  };

  it("shows a GPU line with a 5-segment meter beneath the CPU line", () => {
    chipFor("Intel Core i7-13700H, NVIDIA GeForce RTX 4060");
    const lines = screen.getByTestId("rating-badge").querySelectorAll(".hw-chip__line");
    expect(lines).toHaveLength(2);
    expect(lines[0]?.getAttribute("data-testid")).toBe("chip-cpu");
    expect(lines[1]).toBe(screen.getByTestId("chip-gpu"));
    expect(screen.getByTestId("chip-gpu").textContent).toBe("15.000GPU");
    expect(screen.getByTestId("chip-gpu").getAttribute("title")).toBe("top 20% of laptop GPUs");
    const meter = screen.getByTestId("chip-gpu-meter");
    expect(meter.getAttribute("data-filled")).toBe("4");
    expect(meter.querySelectorAll("i")).toHaveLength(5);
    expect(meter.querySelectorAll("i[data-on]")).toHaveLength(4);
    expect(screen.getByTestId("chip-value").textContent).toBe("28.000");
    expect(screen.getByTestId("rating-badge").getAttribute("aria-label")).toBe(
      "CPU rating Multi-thread 28.000, top 1% of laptop CPUs. GPU rating G3D Mark 15.000, top 20% of laptop GPUs. Show details",
    );
  });

  it("rates integrated graphics too", () => {
    chipFor("Intel Core i7-13700H, Intel Iris Xe Graphics");
    expect(screen.getByTestId("chip-gpu-meter").getAttribute("data-filled")).toBe("1");
  });

  it("adds the GPU rows to the card, after the CPU rows", async () => {
    chipFor("Intel Core i7-13700H, NVIDIA GeForce RTX 4060");
    fireEvent.click(screen.getByTestId("rating-badge"));
    const card = await screen.findByTestId("rating-card");
    const gpu = screen.getByTestId("card-gpu");
    expect(card.contains(gpu)).toBe(true);
    expect(gpu.textContent).toContain("GeForce RTX 4060 Laptop GPU");
    expect(gpu.textContent).toContain("Matched to PassMark GPU entry");
    expect(screen.getByTestId("card-row-gpu_g3d_score").textContent).toContain("15.000");
    expect(screen.getByTestId("card-row-gpu_g3d_percentile").textContent).toContain(
      "top 20%of laptop GPUs",
    );
    expect(screen.getByTestId("card-row-gpu_value_per_euro").textContent).toContain("10,0 /€");
    const rows = [...card.querySelectorAll('[data-testid^="card-row-"]')].map((row) =>
      row.getAttribute("data-testid"),
    );
    expect(rows.indexOf("card-row-raw_multithread_score")).toBeLessThan(
      rows.indexOf("card-row-gpu_g3d_score"),
    );
  });

  it("has no GPU line and no GPU rows when the text names no known GPU", async () => {
    chipFor("Intel Core i7-13700H, 16 GB RAM");
    expect(screen.queryByTestId("chip-gpu")).toBeNull();
    expect(screen.queryByTestId("chip-gpu-meter")).toBeNull();
    expect(screen.getByTestId("rating-badge").querySelectorAll(".hw-chip__line")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("rating-badge"));
    await screen.findByTestId("rating-card");
    expect(screen.queryByTestId("card-gpu")).toBeNull();
  });

  it("shows the GPU line alone when only the GPU was recognised", async () => {
    chipFor("Intel Core i7-13700H, NVIDIA GeForce RTX 4060", { cpu: false });
    const chip = screen.getByTestId("rating-badge");
    expect(chip.getAttribute("data-status")).toBe("gpu");
    expect(screen.queryByTestId("chip-cpu")).toBeNull();
    expect(chip.getAttribute("aria-label")).toBe(
      "GPU rating G3D Mark 15.000, top 20% of laptop GPUs. Show details",
    );
    fireEvent.click(chip);
    await screen.findByTestId("rating-card");
    expect(screen.getByTestId("card-gpu")).toBeTruthy();
    expect(screen.queryByTestId("card-row-raw_multithread_score")).toBeNull();
  });

  it("keeps 'CPU ?' for an ambiguous CPU next to a recognised GPU", () => {
    render(
      <MantineProvider env="test">
        <RatingChip
          rating={ambiguous}
          gpu={gpuEngine.rate([query("NVIDIA GeForce RTX 4060")])[0] ?? null}
          primaryId="raw_multithread_score"
          importedAt={null}
          onOpenSettings={() => undefined}
        />
      </MantineProvider>,
    );
    expect(screen.getByTestId("chip-cpu").textContent).toBe("CPU ?");
    expect(screen.getByTestId("chip-gpu")).toBeTruthy();
  });

  it("renders nothing without a CPU line or a GPU line", () => {
    chipFor("no gpu here", { cpu: false });
    expect(screen.queryByTestId("rating-badge")).toBeNull();
  });
});
