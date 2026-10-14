// @vitest-environment jsdom

import { passmarkCpuSource } from "@idealo-hw/hw-bench";
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
  const query = (text: string, title = "Intel Core i7-13700H Notebook") => ({
    title,
    text,
    priceEur: 1500,
    formFactor: "laptop" as const,
  });

  /** `gpuText` and `gpuTitle` swap what the GPU engine reads; the CPU named there decides the iGPU. */
  const chipFor = (
    text: string,
    {
      cpu = true,
      gpuText = text,
      gpuTitle,
    }: { cpu?: boolean; gpuText?: string; gpuTitle?: string } = {},
  ) => {
    const [rating] = cpuEngine.rate([query(text)]);
    const [gpu] = gpuEngine.rate([query(gpuText, gpuTitle)]);
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

  it("labels the CPU's graphics iGPU and rates them when the tile names no card", () => {
    chipFor("Intel Core i7-13700H, 16 GB RAM");
    expect(screen.getByTestId("chip-gpu-meter").getAttribute("data-filled")).toBe("1");
    expect(screen.getByTestId("chip-gpu-label").textContent).toBe("iGPU");
    expect(screen.getByTestId("chip-gpu").getAttribute("data-kind")).toBe("iGPU");
    expect(screen.getByTestId("chip-gpu-value").textContent).toBe("2.500");
    expect(screen.getByTestId("chip-gpu-memory").textContent).toBe("shared");
    expect(screen.getByTestId("rating-badge").getAttribute("aria-label")).toContain(
      "iGPU rating G3D Mark 2.500",
    );
  });

  it("never labels an iGPU as GPU: a tile that names a card says GPU", () => {
    chipFor("Intel Core i7-13700H, Intel Iris Xe Graphics, NVIDIA GeForce RTX 4060");
    expect(screen.getByTestId("chip-gpu-label").textContent).toBe("GPU");
    expect(screen.getByTestId("chip-gpu-value").textContent).toBe("15.000");
  });

  it("shows the name and an unrated state, not a score, for graphics PassMark does not list", () => {
    chipFor("Apple M3, 16 GB RAM", { cpu: false, gpuTitle: "Notebook" });
    const line = screen.getByTestId("chip-gpu");
    expect(line.getAttribute("data-state")).toBe("unrated");
    expect(line.getAttribute("title")).toBe(
      "Apple M-series GPU: PassMark has no rating for this GPU",
    );
    expect(screen.getByTestId("chip-gpu-value").textContent).toBe("Apple M-series GPU");
    expect(screen.getByTestId("chip-gpu-label").textContent).toBe("iGPU");
    expect(screen.queryByTestId("chip-gpu-meter")).toBeNull();
  });

  it("shows the graphics memory on the GPU line: stated, typical or shared", () => {
    chipFor("NVIDIA GeForce RTX 5060, Grafikspeicher 16 GB, Grafikspeichertyp GDDR7");
    expect(screen.getByTestId("chip-gpu-memory").textContent).toBe("16 GB GDDR7");
    cleanup();
    chipFor("NVIDIA GeForce RTX 5060");
    expect(screen.getByTestId("chip-gpu-memory").textContent).toBe("8 GB typical");
    expect(screen.getByTestId("chip-gpu-memory").getAttribute("title")).toContain("PassMark");
    cleanup();
    chipFor("Intel Core i7-13700H, Grafikspeicher Shared Memory");
    expect(screen.getByTestId("chip-gpu-memory").textContent).toBe("shared");
  });

  it("shows the CPU's iGPU in the card beside a dedicated card, not on the chip", async () => {
    chipFor("Intel Core i7-13700H, NVIDIA GeForce RTX 4060");
    expect(screen.getAllByTestId("chip-gpu")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("rating-badge"));
    await screen.findByTestId("rating-card");
    const igpu = screen.getByTestId("card-igpu");
    expect(igpu.textContent).toContain("Intel Iris Xe");
    expect(igpu.textContent).toContain("Integrated graphics of the CPU");
    expect(screen.getByTestId("card-igpu-memory").textContent).toContain("shared");
    expect(screen.getByTestId("card-gpu").textContent).toContain("GeForce RTX 4060 Laptop GPU");
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

  it("has no GPU line and no GPU rows for a CPU without graphics and no card", async () => {
    chipFor("Intel Core i7-13700H, 16 GB RAM", {
      gpuText: "Intel Core i5-13400F, 16 GB RAM",
      gpuTitle: "Notebook",
    });
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
    chipFor("no gpu here", { cpu: false, gpuTitle: "Notebook" });
    expect(screen.queryByTestId("rating-badge")).toBeNull();
  });
});
