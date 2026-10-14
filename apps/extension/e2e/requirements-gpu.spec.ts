import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { extensionIdOf, launchWithExtension } from "./launch";
import {
  importCpuFixture,
  importGpuFixture,
  installSite,
  SSR_CPU_FIXTURE,
  SSR_GPU_FIXTURE,
  SSR_LISTING_URL,
  shot,
} from "./site";
import { captureBaseline, resetToBaseline, type StorageBaseline } from "./state";

let context: BrowserContext;
let extensionId: string;
let baseline: StorageBaseline;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  context = await launchWithExtension();
  await installSite(context);
  extensionId = await extensionIdOf(context);
  await importCpuFixture(context, extensionId, SSR_CPU_FIXTURE, "6");
  baseline = await captureBaseline(context, extensionId);
});

test.beforeEach(() => resetToBaseline(context, extensionId, baseline));

test.afterAll(async () => {
  await context.close();
});

const target = (page: Page) => page.getByTestId("target-url");

async function openPanel(page: Page): Promise<void> {
  await page.goto(SSR_LISTING_URL);
  await page.getByTestId("filter-fab").click();
  await expect(page.getByTestId("requirements")).toBeVisible();
}

async function press(page: Page, id: string, key: string, times = 1): Promise<void> {
  const thumb = page.getByTestId(`req-${id}`).getByRole("slider").first();
  await thumb.focus();
  for (let i = 0; i < times; i++) await thumb.press(key);
}

test("gpu requirement: without GPU data the block says so and opens the settings", async () => {
  const page = await context.newPage();
  await openPanel(page);

  const hint = page.getByTestId("req-no-gpu-data");
  await expect(hint).toBeVisible();
  await expect(hint).toContainText("Import PassMark GPU data in the settings");
  await expect(page.getByTestId("req-g3d")).toHaveCount(0);
  await expect(page.getByTestId("req-no-cpu-data")).toHaveCount(0);
  await hint.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, "filter-requirements-no-gpu-data");

  const opened = context.waitForEvent("page");
  await page.getByTestId("req-no-gpu-data-open-settings").click();
  expect((await opened).url()).toContain(extensionId);
  await page.close();
});

test("gpu requirement: with GPU data the 3D slider replaces the hint", async () => {
  await importGpuFixture(context, extensionId, SSR_GPU_FIXTURE, "6");
  const page = await context.newPage();
  await openPanel(page);

  await expect(page.getByTestId("req-no-gpu-data")).toHaveCount(0);
  await expect(page.getByTestId("req-value-g3d")).toHaveText("any");
  await press(page, "g3d", "End");
  await expect(page.getByTestId("req-value-g3d")).toHaveText("18.000");
  await page.getByTestId("req-g3d").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, "filter-requirements-gpu");
  await page.close();
});

test("graphics memory: a minimum of 8 GB selects dedicated sizes of one group only", async () => {
  await importGpuFixture(context, extensionId, SSR_GPU_FIXTURE, "6");
  const page = await context.newPage();
  await openPanel(page);

  const gpuBox = await page.getByTestId("req-g3d").boundingBox();
  const vramBox = await page.getByTestId("req-vram_gb").boundingBox();
  expect(vramBox?.y ?? 0).toBeGreaterThan(gpuBox?.y ?? Number.POSITIVE_INFINITY);

  await expect(page.getByTestId("req-value-vram_gb")).toHaveText("any");
  await press(page, "vram_gb", "End");
  await expect(page.getByTestId("req-value-vram_gb")).toHaveText("24 GB");
  await press(page, "vram_gb", "ArrowLeft", 3);
  await expect(page.getByTestId("req-value-vram_gb")).toHaveText("8 GB");
  await expect(page.getByTestId("req-status-vram_gb")).toHaveText("4 options");

  await page.getByTestId("details-toggle").click();
  await expect(target(page)).toHaveText(
    "https://www.idealo.de/preisvergleich/ProductCategory/3751F106351684-106351686-106351687-106585584.html",
  );
  await page.getByTestId("details-toggle").click();
  await page.getByTestId("req-vram_gb").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, "filter-requirements-vram");

  await page.getByTestId("apply").click();
  await page.waitForURL("**/3751F106351684-106351686-106351687-106585584.html");
  await page.close();
});

test("graphics memory: the second visit still lists both groups", async () => {
  const first = await context.newPage();
  await openPanel(first);
  await expect(first.getByTestId("req-value-vram_gb")).toHaveText("any");
  await first.close();

  const page = await context.newPage();
  await openPanel(page);
  await press(page, "vram_gb", "End");
  await press(page, "vram_gb", "ArrowLeft", 3);
  await expect(page.getByTestId("req-status-vram_gb")).toHaveText("4 options");
  await page.close();
});
