import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { extensionIdOf, launchWithExtension } from "./launch";
import {
  CPU_FIXTURE,
  importCpuFixture,
  importGpuFixture,
  installSite,
  SSR_CPU_FIXTURE,
  SSR_DESKTOP_URL,
  SSR_GPU_FIXTURE,
  SSR_LISTING_URL,
  shot,
} from "./site";

let context: BrowserContext;
let extensionId: string;

const ARC_TILE = "205984319";
const NO_GPU_TILE = "212702771";
const RTX_TILE = "207096746";

const tileOf = (page: Page, productId: string) =>
  page.locator(`[class^="sr-resultItemTile_B0odU"]:has([data-wishlist-heart*="${productId}"])`);
const chipOf = (page: Page, productId: string) =>
  tileOf(page, productId).locator("idealo-hw-badge");

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  context = await launchWithExtension();
  await installSite(context);
  extensionId = await extensionIdOf(context);
  await importCpuFixture(context, extensionId, SSR_CPU_FIXTURE, "6");
});

test.afterAll(async () => {
  await context.close();
});

test("gpu line: absent without a GPU snapshot, appears live once one is imported", async () => {
  const page = await context.newPage();
  await page.goto(SSR_LISTING_URL);
  await expect(page.locator("idealo-hw-badge")).toHaveCount(4);
  await expect(page.getByTestId("chip-gpu")).toHaveCount(0);
  await expect(chipOf(page, ARC_TILE).getByTestId("chip-value")).toHaveText("21.000");

  await importGpuFixture(context, extensionId, SSR_GPU_FIXTURE, "6");
  // Every tile gets a GPU line now: the cards, and the CPU's iGPU for the tiles that name no card.
  await expect(page.getByTestId("chip-gpu")).toHaveCount(4);
  await expect(page.locator("idealo-hw-badge")).toHaveCount(4);
  await page.close();
});

test("gpu line: beneath the CPU line on tiles whose GPU the snapshot knows", async () => {
  const page = await context.newPage();
  await page.goto(SSR_LISTING_URL);
  await expect(page.locator("idealo-hw-badge")).toHaveCount(4);

  // The Core Ultra 7 258V's iGPU (Arc 140V) is integrated: labelled iGPU, ranked among the laptop GPUs of a
  // Notebooks page, with shared memory.
  const arc = chipOf(page, ARC_TILE);
  await expect(arc.getByTestId("chip-gpu-label")).toHaveText("iGPU");
  await expect(arc.getByTestId("chip-gpu-memory")).toHaveText("shared");
  await expect(arc.getByTestId("chip-gpu-value")).toHaveText("2.900");
  await expect(arc.getByTestId("chip-gpu-meter")).toHaveAttribute("data-filled", "3");
  await expect(arc.getByTestId("chip-gpu")).toHaveAttribute("title", "top 50% of laptop GPUs");
  await expect(arc.getByTestId("rating-badge")).toHaveAttribute(
    "aria-label",
    /CPU rating .* of laptop CPUs\. iGPU rating G3D Mark 2\.900, top 50% of laptop GPUs/,
  );
  await expect(arc.getByTestId("chip-value")).toHaveText("21.000");
  const cpuBox = await arc.getByTestId("chip-cpu").boundingBox();
  const gpuBox = await arc.getByTestId("chip-gpu").boundingBox();
  expect(gpuBox?.y ?? 0).toBeGreaterThanOrEqual((cpuBox?.y ?? 0) + (cpuBox?.height ?? 0) - 1);

  // The tile names an RTX 5060: the line says GPU, and shows the tile's own memory figure.
  const rtx = chipOf(page, RTX_TILE);
  await expect(rtx.getByTestId("chip-gpu-label")).toHaveText("GPU");
  await expect(rtx.getByTestId("chip-gpu-memory")).toHaveText("8 GB GDDR6");
  await expect(rtx.getByTestId("chip-gpu-value")).toHaveText("18.000");
  await expect(rtx.getByTestId("chip-gpu-meter")).toHaveAttribute("data-filled", "5");
  await expect(rtx.getByTestId("chip-value")).toHaveText("26.000");

  // The i5-10210U's iGPU (UHD Graphics) has no row in the imported snapshot: named, unrated, no score.
  const noGpu = chipOf(page, NO_GPU_TILE);
  await expect(noGpu.getByTestId("chip-gpu")).toHaveAttribute("data-state", "unrated");
  await expect(noGpu.getByTestId("chip-gpu-label")).toHaveText("iGPU");
  await expect(noGpu.getByTestId("chip-gpu-value")).toHaveText("Intel UHD Graphics");
  await expect(noGpu.getByTestId("chip-gpu-meter")).toHaveCount(0);
  await expect(noGpu.getByTestId("chip-value")).toHaveText("6.300");

  await rtx.getByTestId("rating-badge").hover();
  const card = page.getByTestId("card-gpu");
  await expect(card).toBeVisible();
  await expect(card).toContainText("GeForce RTX 5060 Laptop GPU");
  await expect(card.getByTestId("card-row-gpu_g3d_score")).toContainText("18.000");
  await expect(card.getByTestId("card-row-gpu_g3d_percentile")).toContainText("of laptop GPUs");
  await expect(card.getByTestId("card-gpu-memory")).toContainText("8 GB GDDR6");
  // The CPU's own iGPU rides along in the card, below the card; unrated here (the snapshot has no row).
  const igpuSection = page.getByTestId("card-igpu");
  await expect(igpuSection).toContainText("Radeon 780M");
  await expect(igpuSection).toContainText("Unrated");
  await expect(page.getByTestId("card-igpu-memory")).toContainText("shared");
  await page.waitForTimeout(400);
  await shot(page, "chip-gpu-line");
  await page.close();
});

test("gpu line: the page's device class picks the card and the comparison group", async () => {
  const page = await context.newPage();
  await page.goto(SSR_DESKTOP_URL);
  await expect(page.locator("idealo-hw-badge")).toHaveCount(4);
  // The RTX 5060 exists in the snapshot as a laptop card only: a desktop page never offers it, so the line falls
  // back to the CPU's iGPU, labelled as such, and the tile's card memory is not carried over to it.
  const rtxDesktop = chipOf(page, RTX_TILE);
  await expect(rtxDesktop.getByTestId("chip-gpu-label")).toHaveText("iGPU");
  await expect(rtxDesktop.getByTestId("chip-gpu-memory")).toHaveText("shared");
  await expect(chipOf(page, ARC_TILE).getByTestId("rating-badge")).toHaveAttribute(
    "aria-label",
    /of desktop GPUs/,
  );
  await page.close();
});

test("gpu line: shown alone when the tile's CPU is not in the CPU snapshot", async () => {
  await importCpuFixture(context, extensionId, CPU_FIXTURE, "3");
  const page = await context.newPage();
  await page.goto(SSR_LISTING_URL);
  // Every tile still has a GPU line (card or iGPU), so every tile keeps a chip, without a CPU line.
  await expect(page.locator("idealo-hw-badge")).toHaveCount(4);
  for (const [id, label] of [
    [ARC_TILE, /^iGPU rating /],
    [RTX_TILE, /^GPU rating /],
    [NO_GPU_TILE, /^iGPU Intel UHD Graphics, unrated/],
  ] as const) {
    await expect(chipOf(page, id).getByTestId("chip-gpu")).toBeVisible();
    await expect(chipOf(page, id).getByTestId("chip-cpu")).toHaveCount(0);
    await expect(chipOf(page, id).getByTestId("rating-badge")).toHaveAttribute("aria-label", label);
  }
  await page.close();
});
