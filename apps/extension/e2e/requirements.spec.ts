import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { extensionIdOf, launchWithExtension } from "./launch";
import {
  importCpuFixture,
  importGpuFixture,
  installSite,
  SSR_CPU_FIXTURE,
  SSR_DESKTOP_URL,
  SSR_GPU_FIXTURE,
  SSR_LISTING_URL,
  shot,
} from "./site";
import { captureBaseline, resetToBaseline, type StorageBaseline, storedValue } from "./state";

let context: BrowserContext;
let extensionId: string;
let baseline: StorageBaseline;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  context = await launchWithExtension();
  await installSite(context);
  extensionId = await extensionIdOf(context);
  await importCpuFixture(context, extensionId, SSR_CPU_FIXTURE, "6");
  await importGpuFixture(context, extensionId, SSR_GPU_FIXTURE, "6");
  baseline = await captureBaseline(context, extensionId);
});

test.beforeEach(() => resetToBaseline(context, extensionId, baseline));

test.afterAll(async () => {
  await context.close();
});

const slider = (page: Page, id: string) => page.getByTestId(`req-${id}`).getByRole("slider");
const target = (page: Page) => page.getByTestId("target-url");

async function press(page: Page, id: string, key: string, times = 1): Promise<void> {
  const thumb = slider(page, id).first();
  await thumb.focus();
  for (let i = 0; i < times; i++) await thumb.press(key);
}

async function openPanel(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.getByTestId("filter-fab").click();
  await expect(page.getByTestId("requirements")).toBeVisible();
}

test("requirements: sliders become filter ids and an upper bound on the hits", async () => {
  const page = await context.newPage();
  await openPanel(page, SSR_LISTING_URL);

  await expect(page.getByTestId("req-value-cpu_mark")).toHaveText("any");
  await expect(page.getByTestId("hits")).toHaveCount(0);

  // 30.000 is the strongest listed CPU; 18 steps of 500 down is 21.000.
  await press(page, "cpu_mark", "End");
  await expect(page.getByTestId("req-value-cpu_mark")).toHaveText("30.000");
  await expect(page.getByTestId("req-status-cpu_model")).toHaveText("1 option");
  await expect(page.getByTestId("hits")).toHaveText("≤ 50 products");
  await press(page, "cpu_mark", "ArrowLeft", 18);
  await expect(page.getByTestId("req-value-cpu_mark")).toHaveText("21.000");
  await expect(page.getByTestId("req-status-cpu_model")).toHaveText("3 options");
  await expect(page.getByTestId("hits")).toHaveText("≤ 230 products");

  // RAM >= 32 GB: the slider snaps to the listed sizes (8, 16, 24, 32, 64).
  await press(page, "ram_gb", "End");
  await expect(page.getByTestId("req-value-ram_gb")).toHaveText("64 GB");
  await press(page, "ram_gb", "ArrowLeft");
  await expect(page.getByTestId("req-value-ram_gb")).toHaveText("32 GB");
  await expect(page.getByTestId("req-status-ram_gb")).toHaveText("2 options");

  await expect(page.getByTestId("hits")).toHaveText("≤ 230 products");
  await page.getByTestId("details-toggle").click();
  await expect(target(page)).toHaveText(
    "https://www.idealo.de/preisvergleich/ProductCategory/3751F27570032-27570064-105000001-105000003-105000005.html",
  );
  await page.getByTestId("details-toggle").click();

  await page.waitForTimeout(400);
  const panel = await page.getByTestId("requirements").boundingBox();
  const footer = await page.getByTestId("apply").boundingBox();
  expect((panel?.x ?? 0) + (panel?.width ?? 0)).toBeLessThanOrEqual(1280);
  expect((footer?.y ?? 0) + (footer?.height ?? 0)).toBeLessThanOrEqual(900);
  await shot(page, "filter-requirements-end");
  await page.getByTestId("query-text").scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await shot(page, "filter-requirements");

  const open = page.getByTestId("apply");
  await open.click();
  await page.waitForURL("**/3751F27570032-27570064-105000001-105000003-105000005.html");
  await page.close();
});

test("requirements: the last settings come back on the next visit", async () => {
  const first = await context.newPage();
  await openPanel(first, SSR_LISTING_URL);
  await expect(first.getByTestId("req-value-cpu_mark")).toHaveText("any");
  await press(first, "cpu_mark", "End");
  await press(first, "cpu_mark", "ArrowLeft", 18);
  await press(first, "ram_gb", "End");
  await press(first, "ram_gb", "ArrowLeft");
  await expect(first.getByTestId("req-value-cpu_mark")).toHaveText("21.000");
  await expect(first.getByTestId("req-value-ram_gb")).toHaveText("32 GB");
  // Saved once the edits settle; a tab closed sooner would lose them.
  await expect
    .poll(async () => JSON.stringify(await storedValue(context, extensionId, "requirements")))
    .toContain("21000");
  await first.close();

  const page = await context.newPage();
  await openPanel(page, SSR_LISTING_URL);
  await expect(page.getByTestId("req-value-cpu_mark")).toHaveText("21.000");
  await expect(page.getByTestId("req-value-ram_gb")).toHaveText("32 GB");
  await expect(page.getByTestId("hits")).toHaveText("≤ 230 products");
  await page.getByTestId("apply").waitFor();
  await expect(page.getByTestId("apply")).toBeEnabled();

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByTestId("req-value-cpu_mark")).toHaveText("any");
  await page.waitForTimeout(600);
  await page.close();

  const again = await context.newPage();
  await openPanel(again, SSR_LISTING_URL);
  await expect(again.getByTestId("req-value-cpu_mark")).toHaveText("any");
  await again.close();
});

test("requirements: CPU minimums combine with and/or, GPU and single-thread sliders work", async () => {
  const page = await context.newPage();
  await openPanel(page, SSR_LISTING_URL);

  await expect(page.getByTestId("req-combine")).toBeVisible();
  await press(page, "cpu_mark", "End");
  await press(page, "cpu_single", "ArrowRight", 1);
  const single = await page.getByTestId("req-value-cpu_single").textContent();
  expect(single).not.toBe("any");
  await page.getByTestId("req-combine").getByText("or").click();
  const either = await page.getByTestId("req-status-cpu_model").textContent();
  await page.getByTestId("req-combine").getByText("and").click();
  const both = await page.getByTestId("req-status-cpu_model").textContent();
  expect(either).toMatch(/\d+ options?/);
  expect(both).toMatch(/\d+ options?/);

  await press(page, "g3d", "End");
  await expect(page.getByTestId("req-value-g3d")).toHaveText("18.000");
  await expect(page.getByTestId("req-status-g3d")).toHaveText("1 option");
  await page.close();
});

test("requirements: price slider sets the price range from the page's bounds", async () => {
  const page = await context.newPage();
  await openPanel(page, SSR_LISTING_URL);
  await expect(page.getByTestId("req-value-price")).toHaveText("any");
  await press(page, "price", "ArrowRight", 7);
  await expect(page.getByTestId("req-value-price")).toHaveText("from 500 €");
  await page.getByTestId("details-toggle").click();
  await expect(target(page)).toHaveText(
    "https://www.idealo.de/preisvergleich/ProductCategory/3751.html?p=500.0-",
  );
  await page.close();
});

test("requirements: a price limit alone is sent with a zero minimum", async () => {
  const page = await context.newPage();
  await openPanel(page, SSR_LISTING_URL);
  const upper = slider(page, "price").nth(1);
  await upper.focus();
  await upper.press("ArrowLeft");
  await upper.press("ArrowLeft");
  await expect(page.getByTestId("req-value-price")).toHaveText("up to 3.400 €");
  await page.getByTestId("details-toggle").click();
  await expect(target(page)).toHaveText(
    "https://www.idealo.de/preisvergleich/ProductCategory/3751.html?p=0.0-3400.0",
  );
  await page.close();
});

test("requirements: RAM type chips are disabled where idealo has no such filter", async () => {
  const page = await context.newPage();
  await openPanel(page, SSR_LISTING_URL);
  const chips = page.getByTestId("req-ram_type");
  await expect(chips).toContainText("idealo has no RAM-type filter here");
  await expect(chips.getByRole("checkbox", { name: "DDR5", exact: true })).toBeDisabled();
  await page.close();
});

test("requirements: RAM type chips select the listed types where the category has them", async () => {
  const page = await context.newPage();
  await openPanel(page, SSR_DESKTOP_URL);
  const chips = page.getByTestId("req-ram_type");
  await chips.getByText("DDR5", { exact: true }).click();
  await chips.getByText("LPDDR5X", { exact: true }).click();
  await expect(page.getByTestId("req-status-ram_type")).toHaveText("2 options");
  await expect(page.getByTestId("hits")).toHaveText("≤ 4.500 products");
  await page.getByTestId("details-toggle").click();
  await expect(target(page)).toHaveText(
    "https://www.idealo.de/preisvergleich/ProductCategory/3020F19540002-19540003.html",
  );
  await page.close();
});
