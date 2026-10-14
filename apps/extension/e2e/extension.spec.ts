import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type BrowserContext, type Page, expect, test } from "@playwright/test";
import { ARTIFACTS_DIR, extensionIdOf, launchWithExtension } from "./launch";

const here = import.meta.dirname;
const LISTING_HTML = readFileSync(resolve(here, "../test/fixtures/listing.html"), "utf8");
const PRODUCT_HTML = readFileSync(resolve(here, "../test/fixtures/product.html"), "utf8");
const CPU_FIXTURE = resolve(here, "fixtures/passmark-cpu.synthetic.json");
const FILTERS_JSON = JSON.stringify({ filters: [{ id: 1234, name: "Intel" }] });

const LISTING_URL = "https://www.idealo.de/preisvergleich/ProductCategory/19116.html";
const PRODUCT_URL = "https://www.idealo.de/preisvergleich/OffersOfProduct/1001_alpha-book-15.html";

let context: BrowserContext;
let extensionId: string;

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
});

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

  await page.locator('[data-testid="dropzone-cpu"] input[type="file"]').setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("not json"),
  });
  await expect(page.getByTestId("import-error-cpu")).toBeVisible();
  await expect(page.getByTestId("count-cpu")).toHaveText("3");

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
  await expect(badgeOf(page, "1001")).toContainText("28,000");

  await badgeOf(page, "1001").getByTestId("rating-badge").hover();
  await expect(page.getByText("PassMark match via normalized model key")).toBeVisible();
  await expect(page.getByText("Intel Core i7-13700H").first()).toBeVisible();
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

test("listing: tap leaves the page's own fetch untouched and capture mode records it", async () => {
  const page = await context.newPage();
  await page.goto(LISTING_URL);
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__filters")))
    .toEqual(JSON.parse(FILTERS_JSON));
  await page.close();

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(options.getByTestId("capture-count")).toContainText(/^[1-9]\d* captured$/);

  const download = options.waitForEvent("download");
  await options.getByTestId("capture-export").click();
  const path = await (await download).path();
  const exported = JSON.parse(readFileSync(path, "utf8")) as {
    captures: { url: string; body: string; status: number; method: string }[];
  };
  const hit = exported.captures.find((c) => c.url.endsWith("/api/filters.json"));
  expect(hit).toMatchObject({ status: 200, method: "GET", body: FILTERS_JSON });

  await options.getByRole("button", { name: "Clear" }).last().click();
  await expect(options.getByTestId("capture-count")).toHaveText("0 captured");
  await options.close();
});

test("product page: badge next to the title, CPU read from the spec table", async () => {
  const page = await context.newPage();
  await page.goto(PRODUCT_URL);
  await expect(page.locator("h1 > idealo-hw-badge")).toHaveCount(1);
  await expect(page.locator("h1 > idealo-hw-badge")).toContainText("28,000");
  await page.close();
});

test("filter builder: batch toggles, one navigation", async () => {
  const page = await context.newPage();
  await page.goto(LISTING_URL);

  await page.getByTestId("filter-fab").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Prozessor-Hersteller")).toBeVisible();

  await page.getByTestId("filter-1234").check({ force: true });
  await page.getByTestId("filter-2222").check({ force: true });
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
  await page.getByTestId("raw-ids").fill("9999");
  await page.getByTestId("raw-ids").press("Enter");
  await expect(target).toHaveText(
    "https://www.idealo.de/preisvergleich/ProductCategory/19116F1234-2222-9999.html?p=500.0-",
  );
  await expect(page.getByTestId("summary")).toContainText("Unknown filter ids: 9999");
  await shot(page, "filter-drawer");

  const navigations: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });
  await page.getByTestId("apply").click();
  await page.waitForURL("**/19116F1234-2222-9999.html?p=500.0-");
  expect(navigations).toEqual([
    "https://www.idealo.de/preisvergleich/ProductCategory/19116F1234-2222-9999.html?p=500.0-",
  ]);
  await page.close();
});
