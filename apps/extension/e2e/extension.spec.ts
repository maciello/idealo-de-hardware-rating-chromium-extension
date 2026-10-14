import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { ARTIFACTS_DIR, extensionIdOf, launchWithExtension } from "./launch";
import { importCpuFixture, importGpuFixture, LISTING_HTML, PRODUCT_HTML } from "./site";
import { captureBaseline, resetToBaseline, type StorageBaseline } from "./state";

const here = import.meta.dirname;
const CPU_FIXTURE = resolve(here, "fixtures/passmark-cpu.synthetic.json");
const GPU_FIXTURE = resolve(here, "fixtures/passmark-gpu.synthetic.csv");
const FILTERS_JSON = JSON.stringify({ filters: [{ id: 1234, name: "Intel" }] });

const LISTING_URL = "https://www.idealo.de/preisvergleich/ProductCategory/19116.html";
/** Same synthetic listing as Notebooks (3751): the page's category names the device class the segment percentile needs. */
const NOTEBOOKS_LISTING_URL = "https://www.idealo.de/preisvergleich/ProductCategory/3751.html";
const PRODUCT_URL = "https://www.idealo.de/preisvergleich/OffersOfProduct/1001_alpha-book-15.html";

/** The slice of the extension API used inside `page.evaluate` on extension pages. */
declare const chrome: {
  scripting: { getRegisteredContentScripts: () => Promise<{ id: string }[]> };
};

let context: BrowserContext;
let extensionId: string;
let baseline: StorageBaseline;

const shot = (page: Page, name: string) =>
  page.screenshot({ path: resolve(ARTIFACTS_DIR, `${name}.png`) });

const badgeOf = (page: Page, productId: string) =>
  page.locator(`li:has(a[href*="/OffersOfProduct/${productId}_"]) idealo-hw-badge`);

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  context = await launchWithExtension();
  await context.route("https://www.idealo.de/**", (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/api/filters.json") {
      return route.fulfill({ contentType: "application/json", body: FILTERS_JSON });
    }
    if (pathname.includes("/ProductCategory/")) {
      return route.fulfill({ contentType: "text/html; charset=utf-8", body: LISTING_HTML });
    }
    if (pathname.includes("/OffersOfProduct/")) {
      return route.fulfill({ contentType: "text/html; charset=utf-8", body: PRODUCT_HTML });
    }
    return route.fulfill({ status: 404, body: "" });
  });
  extensionId = await extensionIdOf(context);
  await importCpuFixture(context, extensionId);
  await importGpuFixture(context, extensionId);
  baseline = await captureBaseline(context, extensionId);
});

test.beforeEach(() => resetToBaseline(context, extensionId, baseline));

test.afterAll(async () => {
  await context.close();
});

test("options: import synthetic PassMark data, enable capture mode", async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);

  await page.locator('[data-testid="dropzone-cpu"] input[type="file"]').setInputFiles(CPU_FIXTURE);
  await expect(page.getByTestId("count-cpu")).toHaveText("3");
  await expect(page.getByTestId("rejected-cpu")).toHaveText("1");

  await page.getByTestId("capture-mode").check({ force: true });
  await expect(page.getByTestId("capture-mode")).toBeChecked();
  // The background registers the network tap only now.
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await chrome.scripting.getRegisteredContentScripts()).map((script) => script.id),
      ),
    )
    .toContain("idealo-hw-network-tap");

  await page.locator('[data-testid="dropzone-cpu"] input[type="file"]').setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("not json"),
  });
  await expect(page.getByTestId("import-error-cpu")).toBeVisible();
  await expect(page.getByTestId("count-cpu")).toHaveText("3");

  await page.locator('[data-testid="dropzone-gpu"] input[type="file"]').setInputFiles(GPU_FIXTURE);
  await expect(page.getByTestId("count-gpu")).toHaveText("1");

  await shot(page, "options");
  await page.close();
});

test("listing: badges for known CPUs only, idempotent for new items", async () => {
  const page = await context.newPage();
  await page.goto(LISTING_URL);

  await expect(page.locator("idealo-hw-badge")).toHaveCount(3);
  await expect(badgeOf(page, "1001")).toHaveCount(1);
  await expect(badgeOf(page, "1002")).toHaveCount(1);
  await expect(badgeOf(page, "1003")).toHaveCount(1);
  await expect(badgeOf(page, "1004")).toHaveCount(0);
  await expect(badgeOf(page, "1005")).toHaveCount(0);
  await expect(badgeOf(page, "1001")).toContainText("28.000");

  await badgeOf(page, "1001").getByTestId("rating-badge").hover();
  await expect(page.getByText("Matched to PassMark entry")).toBeVisible();
  await expect(page.getByText("Intel Core i7-13700H").first()).toBeVisible();
  await page.waitForTimeout(400);
  await shot(page, "listing-badges");
  await page.mouse.move(0, 0);

  await page.evaluate(() => {
    const item = document.createElement("li");
    item.className = "item";
    item.innerHTML = `<div data-wishlist-heart='{"productId":1006}'></div>
      <a href="/preisvergleich/OffersOfProduct/1006_zeta.html">Zeta Notebook Intel Core i9-13900HX</a>
      <span class="sr-detailedPriceInfo__price">2.499,00 €</span>`;
    document.querySelector("ul.results")?.append(item);
  });
  await expect(page.locator("idealo-hw-badge")).toHaveCount(4);
  await page.waitForTimeout(600);
  await expect(page.locator("idealo-hw-badge")).toHaveCount(4);
  await expect(page.locator("li.item > idealo-hw-badge")).toHaveCount(4);

  await page.close();
});

test("listing: only a power extreme gets an icon, in the chip and in the card", async () => {
  const page = await context.newPage();
  await page.goto(NOTEBOOKS_LISTING_URL);
  await expect(page.locator("idealo-hw-badge")).toHaveCount(3);

  const hx = badgeOf(page, "1003");
  await expect(hx.getByTestId("chip-power")).toHaveAttribute("aria-label", "Very high power");
  await expect(hx.getByTestId("chip-power")).toHaveAttribute("title", "Very high power");
  await expect(badgeOf(page, "1001").getByTestId("chip-power")).toHaveCount(0);
  await expect(badgeOf(page, "1002").getByTestId("chip-power")).toHaveCount(0);

  await hx.getByTestId("rating-badge").hover();
  await expect(page.getByTestId("card-row-power")).toContainText("Very high power");
  await expect(page.getByTestId("card-row-power")).toContainText("55 W TDP · 818 CPU Mark per W");
  await page.close();
});

test("listing: tap leaves the page's own fetch untouched and capture mode records it", async () => {
  const setup = await context.newPage();
  await setup.goto(`chrome-extension://${extensionId}/options.html`);
  await setup.getByTestId("capture-mode").check({ force: true });
  await expect
    .poll(() =>
      setup.evaluate(async () =>
        (await chrome.scripting.getRegisteredContentScripts()).map((script) => script.id),
      ),
    )
    .toContain("idealo-hw-network-tap");
  await setup.close();

  const page = await context.newPage();
  await page.goto(LISTING_URL);
  await expect.poll(() => page.evaluate(() => window.__filters)).toEqual(JSON.parse(FILTERS_JSON));

  // The tap reads the body, posts it to the relay and the relay stores it, all after the page's own
  // fetch has resolved: the listing stays open until the options page shows the capture.
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(options.getByTestId("capture-count")).toContainText(/^[1-9]\d* captured$/);
  await page.close();

  const download = options.waitForEvent("download");
  await options.getByTestId("capture-export").click();
  const path = await (await download).path();
  expect((await download).suggestedFilename()).toMatch(/^idealo-hw_captures_\d{8}T\d{6}Z\.json$/);
  const exported = JSON.parse(readFileSync(path, "utf8")) as {
    exportedAt: string;
    captures: { url: string; body: string; status: number; method: string }[];
  };
  expect(exported.exportedAt).toMatch(/Z$/);
  const hit = exported.captures.find((c) => c.url.endsWith("/api/filters.json"));
  expect(hit).toMatchObject({ status: 200, method: "GET", body: FILTERS_JSON });

  await options.getByRole("button", { name: "Clear" }).last().click();
  await expect(options.getByTestId("capture-count")).toHaveText("0 captured");
  await options.close();
});

test("settings: disabling strategies updates open listings live", async () => {
  const listing = await context.newPage();
  await listing.goto(NOTEBOOKS_LISTING_URL);
  const chip = badgeOf(listing, "1001").getByTestId("rating-badge");
  const rows = listing.locator('[data-testid^="card-row-"]');
  await chip.hover();
  await expect(listing.getByTestId("card-row-single_thread_score")).toContainText("3.900");
  await expect(listing.getByTestId("card-row-value_per_euro")).toContainText("21,6 /€");
  await expect(rows).toHaveCount(4);

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  for (const id of ["single_thread_score", "value_per_euro", "peer_percentile_on_listing"]) {
    await options.getByTestId(`strategy-${id}`).uncheck({ force: true });
  }
  await options.close();

  await listing.bringToFront();
  await listing.mouse.move(0, 0);
  await expect(listing.getByTestId("rating-card")).toHaveCount(0);
  await chip.hover();
  await expect(rows).toHaveCount(1);
  await expect(listing.getByTestId("card-row-raw_multithread_score")).toContainText("28.000");
  await expect(listing.getByTestId("card-row-raw_multithread_score")).toContainText(
    "top 33% of laptop CPUs",
  );
  await expect(badgeOf(listing, "1001").locator('[data-filled="4"]')).toHaveCount(1);
  await listing.close();
});

test("product page: badge next to the title, CPU read from the spec table", async () => {
  const page = await context.newPage();
  await page.goto(PRODUCT_URL);
  await expect(page.locator("h1 > idealo-hw-badge")).toHaveCount(1);
  await expect(page.locator("h1 > idealo-hw-badge")).toContainText("28.000");
  await page.close();
});

test("filter builder: batch toggles, one navigation", async () => {
  const page = await context.newPage();
  await page.goto(LISTING_URL);

  await page.getByTestId("filter-fab").click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const settingsTab = context.waitForEvent("page");
  await page.getByRole("button", { name: "Open settings" }).click();
  expect((await settingsTab).url()).toBe(`chrome-extension://${extensionId}/options.html`);
  await (await settingsTab).close();
  await page.bringToFront();

  await page.getByTestId("options-toggle").click();
  await expect(page.locator("idealo-hw-overlay").getByText("Prozessor-Hersteller")).toBeVisible();
  await page.getByTestId("filter-1234").check();
  await page.getByTestId("filter-2222").check();
  const target = page.getByTestId("target-url");
  await expect(target).toHaveText(
    "https://www.idealo.de/preisvergleich/ProductCategory/19116F1234-2222.html",
  );
  await expect(page.getByTestId("summary")).toContainText("Prozessor-Hersteller: Intel");
  await expect(page.getByTestId("summary")).toContainText("Arbeitsspeicher: 16 GB");

  await page.getByTestId("filter-search").fill("amd");
  await expect(page.getByTestId("filter-5678")).toBeVisible();
  await expect(page.getByTestId("filter-1234")).toHaveCount(0);
  await page.getByTestId("filter-search").fill("");

  await page.getByTestId("price-min").fill("500");
  await expect(target).toHaveText(
    "https://www.idealo.de/preisvergleich/ProductCategory/19116F1234-2222.html?p=500.0-",
  );
  await expect(page.getByTestId("raw-ids")).toHaveCount(0);
  await shot(page, "filter-drawer");

  const navigations: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });
  await page.getByTestId("apply").click();
  await page.waitForURL("**/19116F1234-2222.html?p=500.0-");
  expect(navigations).toEqual([
    "https://www.idealo.de/preisvergleich/ProductCategory/19116F1234-2222.html?p=500.0-",
  ]);
  await page.close();
});
