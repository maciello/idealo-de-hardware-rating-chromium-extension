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
  await expect(page.getByTestId("chip-gpu")).toHaveCount(2);
  await expect(page.locator("idealo-hw-badge")).toHaveCount(4);
  await page.close();
});

test("gpu line: beneath the CPU line on tiles whose GPU the snapshot knows", async () => {
  const page = await context.newPage();
  await page.goto(SSR_LISTING_URL);
  await expect(page.locator("idealo-hw-badge")).toHaveCount(4);

  // Intel Arc Graphics 140V is integrated: it competes with the laptop GPUs of a Notebooks page.
  const arc = chipOf(page, ARC_TILE);
  await expect(arc.getByTestId("chip-gpu-value")).toHaveText("2.900");
  await expect(arc.getByTestId("chip-gpu-meter")).toHaveAttribute("data-filled", "3");
  await expect(arc.getByTestId("chip-gpu")).toHaveAttribute("title", "top 50% of laptop GPUs");
  await expect(arc.getByTestId("rating-badge")).toHaveAttribute(
    "aria-label",
    /CPU rating .* of laptop CPUs\. GPU rating G3D Mark 2\.900, top 50% of laptop GPUs\./,
  );
  await expect(arc.getByTestId("chip-value")).toHaveText("21.000");
  const cpuBox = await arc.getByTestId("chip-cpu").boundingBox();
  const gpuBox = await arc.getByTestId("chip-gpu").boundingBox();
  expect(gpuBox?.y ?? 0).toBeGreaterThanOrEqual((cpuBox?.y ?? 0) + (cpuBox?.height ?? 0) - 1);

  const rtx = chipOf(page, RTX_TILE);
  await expect(rtx.getByTestId("chip-gpu-value")).toHaveText("18.000");
  await expect(rtx.getByTestId("chip-gpu-meter")).toHaveAttribute("data-filled", "5");
  await expect(rtx.getByTestId("chip-value")).toHaveText("26.000");

  await expect(chipOf(page, NO_GPU_TILE).getByTestId("chip-gpu")).toHaveCount(0);
  await expect(chipOf(page, NO_GPU_TILE).getByTestId("chip-value")).toHaveText("6.300");

  await rtx.getByTestId("rating-badge").hover();
  const card = page.getByTestId("card-gpu");
  await expect(card).toBeVisible();
  await expect(card).toContainText("GeForce RTX 5060 Laptop GPU");
  await expect(card.getByTestId("card-row-gpu_g3d_score")).toContainText("18.000");
  await expect(card.getByTestId("card-row-gpu_g3d_percentile")).toContainText("of laptop GPUs");
  await page.waitForTimeout(400);
  await shot(page, "chip-gpu-line");
  await page.close();
});

test("gpu line: the page's device class picks the card and the comparison group", async () => {
  const page = await context.newPage();
  await page.goto(SSR_DESKTOP_URL);
  await expect(page.locator("idealo-hw-badge")).toHaveCount(4);
  // The RTX 5060 exists in the snapshot as a laptop card only: a desktop page never offers it.
  await expect(chipOf(page, RTX_TILE).getByTestId("chip-gpu")).toHaveCount(0);
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
  await expect(page.locator("idealo-hw-badge")).toHaveCount(2);
  for (const id of [ARC_TILE, RTX_TILE]) {
    await expect(chipOf(page, id).getByTestId("chip-gpu")).toBeVisible();
    await expect(chipOf(page, id).getByTestId("chip-cpu")).toHaveCount(0);
    await expect(chipOf(page, id).getByTestId("rating-badge")).toHaveAttribute(
      "aria-label",
      /^GPU rating /,
    );
  }
  await expect(chipOf(page, NO_GPU_TILE)).toHaveCount(0);
  await page.close();
});
