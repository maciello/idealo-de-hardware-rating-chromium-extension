import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { extensionIdOf, launchWithExtension } from "./launch";
import { importCpuFixture, installSite, SSR_CPU_FIXTURE, SSR_LISTING_URL, shot } from "./site";

let context: BrowserContext;
let extensionId: string;

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
  await importCpuFixture(context, extensionId, SSR_CPU_FIXTURE, "4");
});

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

test("real markup: the filter builder offers the embedded payload's filters", async () => {
  const page = await context.newPage();
  await page.goto(SSR_LISTING_URL);
  await page.getByTestId("filter-fab").click();
  await expect(page.getByTestId("no-catalog-note")).toHaveCount(0);
  await page.getByTestId("filter-107301240").check();
  await page.getByTestId("filter-471878").check();
  await expect(page.getByTestId("target-url")).toHaveText(
    "https://www.idealo.de/preisvergleich/ProductCategory/3751F107301240-471878.html",
  );
  await page.close();
});
