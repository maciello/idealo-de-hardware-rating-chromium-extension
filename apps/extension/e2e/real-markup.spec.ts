import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { ARTIFACTS_DIR, extensionIdOf, launchWithExtension } from "./launch";
import {
  importCpuFixture,
  installSite,
  SSR_CPU_FIXTURE,
  SSR_DESKTOP_URL,
  SSR_LISTING_URL,
  SSR_PRODUCT_URL,
  shot,
  ssrProductUrl,
} from "./site";
import { captureBaseline, resetToBaseline, type StorageBaseline } from "./state";

let context: BrowserContext;
let extensionId: string;
let baseline: StorageBaseline;

const PRODUCT_IDS = ["205984319", "212702771", "207096746"];

/** Tiles are matched by class prefix, like the adapter does: descendants share a longer prefix. */
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
  baseline = await captureBaseline(context, extensionId);
});

test.beforeEach(() => resetToBaseline(context, extensionId, baseline));

test.afterAll(async () => {
  await context.close();
});

test("real markup: chips sit on the tiles of a server-rendered idealo listing", async () => {
  const page = await context.newPage();
  await page.goto(SSR_LISTING_URL);
  await expect(page.locator("idealo-hw-badge")).toHaveCount(4);

  for (const id of PRODUCT_IDS) {
    await expect(chipOf(page, id)).toHaveCount(1);
    await expect(chipOf(page, id).getByTestId("rating-badge")).toBeVisible();
  }
  const value = (id: string) => chipOf(page, id).getByTestId("chip-value");
  await expect(value("205984319")).toHaveText("21.000");
  await expect(value("212702771")).toHaveText("6.300");
  // The Nitro title names no CPU; its spec line (payload, then markup) does.
  await expect(value("207096746")).toHaveText("26.000");

  const offerTile = page.locator(
    '[class^="sr-resultItemTile_B0odU"]:has([data-wishlist-heart*="OFFER"])',
  );
  await expect(offerTile.locator("idealo-hw-badge")).toHaveCount(1);

  await shot(page, "chip-real-markup");
  await page.close();
});

test("real markup: the percentile compares against the page's device class", async () => {
  const notebooks = await context.newPage();
  await notebooks.goto(SSR_LISTING_URL);
  await expect(chipOf(notebooks, "205984319")).toHaveCount(1);
  await expect(chipOf(notebooks, "205984319").getByTestId("rating-badge")).toHaveAttribute(
    "aria-label",
    /of laptop CPUs/,
  );
  await notebooks.close();

  // Same markup and CPUs served as the PC-Systeme category: the page decides, not PassMark's own tag.
  const desktops = await context.newPage();
  await desktops.goto(SSR_DESKTOP_URL);
  await expect(chipOf(desktops, "205984319")).toHaveCount(1);
  await expect(chipOf(desktops, "205984319").getByTestId("rating-badge")).toHaveAttribute(
    "aria-label",
    /of desktop CPUs/,
  );
  await desktops.close();
});

test("real markup: DDR4 gets an amber tag, current and graphics memory get none", async () => {
  const page = await context.newPage();
  await page.goto(SSR_LISTING_URL);
  await expect(page.locator("idealo-hw-badge")).toHaveCount(4);
  const tag = (id: string) => chipOf(page, id).getByTestId("chip-memory");
  await expect(tag("212702771")).toHaveText("DDR4");
  await expect(tag("212702771")).toHaveAttribute("title", "Older memory generation");
  await expect(chipOf(page, "212702771").getByTestId("rating-badge")).toHaveAttribute(
    "aria-label",
    /DDR4: older memory generation/,
  );
  // LPDDR5X (baseline), and DDR5 with a GDDR6 graphics fragment beside it: no tag.
  await expect(tag("205984319")).toHaveCount(0);
  await expect(tag("207096746")).toHaveCount(0);
  await shot(page, "chip-memory-tag");
  await chipOf(page, "212702771").screenshot({
    path: resolve(ARTIFACTS_DIR, "chip-memory-tag-closeup.png"),
  });
  await page.close();
});

test("real markup: the product page reads the datasheet's RAM-type row", async () => {
  const old = await context.newPage();
  await old.goto(ssrProductUrl("DDR4"));
  const chip = old.locator("h1#oopStage-title idealo-hw-badge");
  await expect(chip.getByTestId("chip-value")).toHaveText("30.000");
  await expect(chip.getByTestId("chip-memory")).toHaveText("DDR4");
  await old.close();

  const current = await context.newPage();
  await current.goto(ssrProductUrl("LPDDR5X"));
  await expect(
    current.locator("h1#oopStage-title idealo-hw-badge").getByTestId("chip-value"),
  ).toHaveText("30.000");
  await expect(current.getByTestId("chip-memory")).toHaveCount(0);
  await current.close();

  const none = await context.newPage();
  await none.goto(SSR_PRODUCT_URL);
  await expect(none.getByTestId("chip-value")).toHaveCount(1);
  await expect(none.getByTestId("chip-memory")).toHaveCount(0);
  await none.close();
});

test("real markup: the filter builder offers the embedded payload's filters", async () => {
  const page = await context.newPage();
  await page.goto(SSR_LISTING_URL);
  await page.getByTestId("filter-fab").click();
  await expect(page.getByTestId("no-catalog-note")).toHaveCount(0);
  await page.getByTestId("options-toggle").click();
  await page.getByTestId("filter-107301240").check();
  await page.getByTestId("filter-471878").check();
  await page.getByTestId("details-toggle").click();
  await expect(page.getByTestId("target-url")).toHaveText(
    "https://www.idealo.de/preisvergleich/ProductCategory/3751F107301240-471878.html",
  );
  await page.close();
});

test("real markup: the product page gets a chip next to the title and a card", async () => {
  const page = await context.newPage();
  await page.goto(SSR_PRODUCT_URL);
  const chip = page.locator("h1#oopStage-title idealo-hw-badge");
  await expect(chip).toHaveCount(1);
  await expect(chip.getByTestId("chip-value")).toHaveText("30.000");
  await chip.getByTestId("rating-badge").click();
  const card = page.locator('[role="dialog"]').filter({ hasText: "PassMark" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Intel Core Ultra 9 285H");
  await expect(card.getByTestId("card-row-raw_multithread_score")).toContainText("laptop CPUs");
  await page.waitForTimeout(400);
  await shot(page, "chip-product-page");
  await page.close();
});

test("debug report: the popup downloads page counts for the open listing, without secrets", async () => {
  const listing = await context.newPage();
  await listing.goto(SSR_LISTING_URL);
  await expect(listing.locator("idealo-hw-badge")).toHaveCount(4);

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  const download = popup.waitForEvent("download");
  await popup.getByTestId("popup-debug-report").click();
  const saved = await download;
  expect(saved.suggestedFilename()).toMatch(/^idealo-hw_debug-report_\d{8}T\d{6}Z\.json$/);
  const text = readFileSync(await saved.path(), "utf8");
  const report = JSON.parse(text);

  expect(report.page).toEqual({
    url: SSR_LISTING_URL,
    kind: "listing",
    adapterId: "idealo_ssr",
    tiles: 4,
    tilesWithProductId: 3,
    tilesMatchedToPayload: 3,
    tilesRated: 4,
    unrated: [],
    payload: { present: true, categoryId: "3751", resultCount: 53609, error: null },
  });
  expect(report.pageNote).toBeNull();
  expect(report.exportedAt).toMatch(/Z$/);
  expect(report.benchmarkData.cpu).toMatchObject({ records: 6 });
  expect(report.ai).toEqual({ connected: false, lastTest: null });
  expect(report.settings.captureMode).toBe(false);
  expect(text).not.toMatch(/sk-or-|session.?info/i);
  await expect(popup.getByTestId("popup-debug-note")).toContainText("idealo-hw_debug-report_");
  await popup.close();
  await listing.close();
});

test("debug report: options export works without an idealo tab and says so", async () => {
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  const download = options.waitForEvent("download");
  await options.getByTestId("debug-report-export").click();
  const report = JSON.parse(readFileSync(await (await download).path(), "utf8"));
  expect(report.page).toBeNull();
  expect(report.pageNote).toBe("No idealo tab was open.");
  await options.close();
});
