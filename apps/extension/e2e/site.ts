import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type BrowserContext, expect, type Page } from "@playwright/test";
import { ARTIFACTS_DIR } from "./launch";

const here = import.meta.dirname;

export const LISTING_HTML = readFileSync(resolve(here, "../test/fixtures/listing.html"), "utf8");
export const PRODUCT_HTML = readFileSync(resolve(here, "../test/fixtures/product.html"), "utf8");
export const CPU_FIXTURE = resolve(here, "fixtures/passmark-cpu.synthetic.json");
export const GPU_FIXTURE = resolve(here, "fixtures/passmark-gpu.synthetic.csv");
export const FILTERS_JSON = JSON.stringify({ filters: [{ id: 1234, name: "Intel" }] });

export const LISTING_URL = "https://www.idealo.de/preisvergleich/ProductCategory/19116.html";
export const SEARCH_URL =
  "https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=laptop+32GB";
/** Listing without filter links: category link only (no toggles), so the catalog is null. */
export const BARE_SEARCH_URL = `${SEARCH_URL}&variant=bare`;
/** Listing without any category link: the search page names no category at all. */
export const NOCAT_SEARCH_URL = `${SEARCH_URL}&variant=nocat`;
export const PRODUCT_URL =
  "https://www.idealo.de/preisvergleich/OffersOfProduct/1001_alpha-book-15.html";

const withoutFilters = (variant: string): string =>
  LISTING_HTML.replace(/<aside id="filters">[\s\S]*?<\/aside>/, () =>
    variant === "bare"
      ? '<aside id="filters"><a href="/preisvergleich/ProductCategory/19116.html">Notebooks</a></aside>'
      : '<aside id="filters"></aside>',
  );

/** Serves the synthetic idealo pages; every other idealo URL is a 404. */
export async function installSite(context: BrowserContext): Promise<void> {
  await context.route("https://www.idealo.de/**", (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;
    const variant = url.searchParams.get("variant");
    if (variant === "bare" || variant === "nocat") {
      return route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: withoutFilters(variant),
      });
    }
    if (pathname === "/api/filters.json") {
      return route.fulfill({ contentType: "application/json", body: FILTERS_JSON });
    }
    if (pathname.includes("/ProductCategory/") || pathname.includes("/MainSearchProductCategory")) {
      return route.fulfill({ contentType: "text/html; charset=utf-8", body: LISTING_HTML });
    }
    if (pathname.includes("/OffersOfProduct/")) {
      return route.fulfill({ contentType: "text/html; charset=utf-8", body: PRODUCT_HTML });
    }
    return route.fulfill({ status: 404, body: "" });
  });
}

/** Imports the synthetic PassMark CPU data through the real options page. */
export async function importCpuFixture(
  context: BrowserContext,
  extensionId: string,
): Promise<void> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.locator('[data-testid="dropzone-cpu"] input[type="file"]').setInputFiles(CPU_FIXTURE);
  await expect(page.getByTestId("count-cpu")).toHaveText("3");
  await page.close();
}

export const shot = (page: Page, name: string) =>
  page.screenshot({ path: resolve(ARTIFACTS_DIR, `${name}.png`) });
