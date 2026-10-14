import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { type BrowserContext, expect, type Page } from "@playwright/test";
import { ARTIFACTS_DIR } from "./launch";

const here = import.meta.dirname;
const idealoPageFixture = (name: string): string =>
  readFileSync(
    createRequire(import.meta.url).resolve(`@idealo-hw/idealo-page/fixtures/${name}`),
    "utf8",
  );

export const LISTING_HTML = idealoPageFixture("listing.html");
export const PRODUCT_HTML = idealoPageFixture("product.html");
export const SSR_LISTING_HTML = idealoPageFixture("listing.idealo-ssr.html");
export const SSR_PRODUCT_HTML = idealoPageFixture("product.idealo-ssr.html");
export const CPU_FIXTURE = resolve(here, "fixtures/passmark-cpu.synthetic.json");
/** The CPUs named by the real-markup listing (four) and product page (one). */
export const SSR_CPU_FIXTURE = resolve(here, "fixtures/passmark-cpu.ssr.synthetic.json");
export const GPU_FIXTURE = resolve(here, "fixtures/passmark-gpu.synthetic.csv");
/** The GPUs named by the real-markup listing's Grafikkarte filters (six, with laptop names). */
export const SSR_GPU_FIXTURE = resolve(here, "fixtures/passmark-gpu.ssr.synthetic.csv");
export const FILTERS_JSON = JSON.stringify({ filters: [{ id: 1234, name: "Intel" }] });

export const LISTING_URL = "https://www.idealo.de/preisvergleich/ProductCategory/19116.html";
/**
 * The synthetic listing served as category 3751 (Notebooks). Its chips are in both device-class sets, so the
 * segment percentile needs a page that names the class; the made-up category 19116 names none.
 */
export const NOTEBOOKS_LISTING_URL =
  "https://www.idealo.de/preisvergleich/ProductCategory/3751.html?variant=synthetic";
/** Real idealo tile markup and embedded payload (category 3751). */
export const SSR_LISTING_URL = "https://www.idealo.de/preisvergleich/ProductCategory/3751.html";
/** The same listing markup served as category 3020 (PC-Systeme): the page's category sets the device class. */
export const SSR_DESKTOP_URL = "https://www.idealo.de/preisvergleich/ProductCategory/3020.html";
export const SSR_PRODUCT_URL =
  "https://www.idealo.de/preisvergleich/OffersOfProduct/209657188_-magicbook-pro-14-honor.html";
/** The product page with a RAM-type row added to its datasheet (the real page lists none). */
export const ssrProductUrl = (ramType: string): string => `${SSR_PRODUCT_URL}?ramtype=${ramType}`;
/** The product page with its RAM row changed to `ram` ("4 GB"): a synthetic value under the real label. */
export const ssrProductWithRamUrl = (ram: string): string =>
  `${SSR_PRODUCT_URL}?ram=${encodeURIComponent(ram)}`;
/**
 * The real-markup listing where the Nitro tile's payload names 4 GB RAM and a 128 GB SSD: synthetic
 * values under the real labels, enough for two red flags on an otherwise untouched page.
 */
export const SSR_LOW_SPEC_URL = `${SSR_LISTING_URL}?variant=lowspec`;
export const SEARCH_URL =
  "https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=laptop+32GB";
/** Listing without filter links: category link only (no toggles), so the catalog is null. */
export const BARE_SEARCH_URL = `${SEARCH_URL}&variant=bare`;
/** Listing without any category link: the search page names no category at all. */
export const NOCAT_SEARCH_URL = `${SEARCH_URL}&variant=nocat`;
export const PRODUCT_URL =
  "https://www.idealo.de/preisvergleich/OffersOfProduct/1001_alpha-book-15.html";

const PAYLOAD_ASSIGNMENT = /(initialData\['searchResult'\] = ")([A-Za-z0-9+/=]+)/;

interface ListingGroup {
  id: string;
  name: string;
  filters: { id: string; name: string; hits: number }[];
}

/** The slice of the embedded search payload these fixtures edit. */
interface ListingPayload {
  items: { id: string; characteristics?: string[] }[];
  filterGroups: ListingGroup[];
}

/** The real-markup listing with its embedded search payload edited in place and re-encoded. */
function listingWithPayload(edit: (payload: ListingPayload) => void): string {
  const encoded = PAYLOAD_ASSIGNMENT.exec(SSR_LISTING_HTML)?.[2] ?? "";
  const payload: ListingPayload = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  edit(payload);
  return SSR_LISTING_HTML.replace(
    PAYLOAD_ASSIGNMENT,
    (_, head: string) => head + Buffer.from(JSON.stringify(payload)).toString("base64"),
  );
}

/** The real-markup listing with filter groups added to its embedded payload, served as `categoryId`. */
const listingHtml = (categoryId: string, groups: ListingGroup[]): string =>
  listingWithPayload((payload) => {
    payload.filterGroups.push(...groups);
  }).replace("initialData['categoryId'] = \"3751\"", `initialData['categoryId'] = "${categoryId}"`);

const gigabytes = (sizes: Record<string, number>, hits = 500) =>
  Object.entries(sizes).map(([name, id]) => ({ id: String(id), name, hits }));

/**
 * idealo lists Grafikspeicher twice on Notebooks: the older group has a "Shared Memory" option, the
 * newer one is dedicated memory only (HAR 2026-10-14). Filter ids as in the idealo-query fixtures.
 */
const MEMORY_GROUPS: ListingGroup[] = [
  {
    id: "31502",
    name: "Grafikspeicher",
    filters: gigabytes({
      "1 GB": 106351679,
      "2 GB": 106351680,
      "3 GB": 106351681,
      "4 GB": 106351682,
      "6 GB": 106351683,
      "8 GB": 106351684,
      "12 GB": 106351686,
      "16 GB": 106351687,
      "24 GB": 106585584,
    }),
  },
  {
    id: "15869",
    name: "Grafikspeicher",
    filters: gigabytes({
      "Shared Memory": 720300,
      "4 GB": 786134,
      "6 GB": 2098333,
      "8 GB": 8532550,
      "12 GB": 9537023,
    }),
  },
];

/** Notebooks (3751): the real listing plus the two Grafikspeicher groups. */
const notebooksListingHtml = (): string => listingHtml("3751", MEMORY_GROUPS);

/**
 * The same listing as PC-Systeme (3020): category id swapped, and the RAM-Typ group that only that
 * category has (Notebooks lists none).
 */
const desktopListingHtml = (): string =>
  listingHtml("3020", [
    {
      id: "19540",
      name: "RAM Typ",
      filters: [
        { id: "19540001", name: "DDR4", hits: 900 },
        { id: "19540002", name: "DDR5", hits: 3000 },
        { id: "19540003", name: "LPDDR5X", hits: 1500 },
      ],
    },
  ]);

const NITRO_ID = "207096746";
const NBSP = " ";

/** The Nitro tile with 4 GB RAM and a 128 GB SSD in its payload: two red flags, nothing else changed. */
function lowSpecListingHtml(): string {
  return listingWithPayload((payload) => {
    const nitro = payload.items.find((item) => item.id === NITRO_ID);
    if (nitro?.characteristics === undefined) throw new Error("fixture lost the Nitro tile");
    nitro.characteristics = nitro.characteristics.map((value) =>
      value
        .replace(`32${NBSP}GB${NBSP}RAM`, `4${NBSP}GB${NBSP}RAM`)
        .replace(`512${NBSP}GB${NBSP}SSD-Speicher`, `128${NBSP}GB${NBSP}SSD-Speicher`),
    );
  });
}

const RAM_ROW = /(<td[^>]*>RAM<\/td><td[^>]*>)([^<]*)(<\/td><\/tr>)/;

function productHtml(ramType: string | null, ram: string | null): string {
  let html = SSR_PRODUCT_HTML;
  if (ram !== null)
    html = html.replace(
      RAM_ROW,
      (_, head: string, _value: string, tail: string) => head + ram + tail,
    );
  if (ramType === null) return html;
  const row = `<tr><td class="text-gray-700 px-2 py-1 w-1/2 sm:w-1/3 align-top wrap-break-word">RAM-Typ</td><td class="px-2 py-1 w-1/2 sm:w-2/3 align-top">${ramType}</td></tr>`;
  return html.replace(RAM_ROW, (whole) => `${whole}${row}`);
}

const withoutFilters = (variant: string): string =>
  LISTING_HTML.replace(/<aside id="filters">[\s\S]*?<\/aside>/, () =>
    variant === "bare"
      ? '<aside id="filters"><a href="/preisvergleich/ProductCategory/19116.html">Notebooks</a></aside>'
      : '<aside id="filters"></aside>',
  );

/** Serves the synthetic idealo pages and the real-markup listing; every other idealo URL is a 404. */
export async function installSite(context: BrowserContext): Promise<void> {
  await context.route("https://cdn.idealo.com/**", (route) => route.fulfill({ status: 404 }));
  await context.route("https://www.idealo.de/**", (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;
    const variant = url.searchParams.get("variant");
    if (variant === "synthetic" && pathname.includes("/ProductCategory/3751")) {
      return route.fulfill({ contentType: "text/html; charset=utf-8", body: LISTING_HTML });
    }
    if (variant === "bare" || variant === "nocat") {
      return route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: withoutFilters(variant),
      });
    }
    if (pathname === "/api/filters.json") {
      return route.fulfill({ contentType: "application/json", body: FILTERS_JSON });
    }
    if (variant === "lowspec" && pathname.includes("/ProductCategory/3751")) {
      return route.fulfill({ contentType: "text/html; charset=utf-8", body: lowSpecListingHtml() });
    }
    if (pathname.includes("/ProductCategory/3751")) {
      return route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: notebooksListingHtml(),
      });
    }
    if (pathname.includes("/ProductCategory/3020")) {
      return route.fulfill({ contentType: "text/html; charset=utf-8", body: desktopListingHtml() });
    }
    if (pathname.includes("/ProductCategory/") || pathname.includes("/MainSearchProductCategory")) {
      return route.fulfill({ contentType: "text/html; charset=utf-8", body: LISTING_HTML });
    }
    if (pathname.includes("/OffersOfProduct/209657188")) {
      return route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: productHtml(url.searchParams.get("ramtype"), url.searchParams.get("ram")),
      });
    }
    if (pathname.includes("/OffersOfProduct/")) {
      return route.fulfill({ contentType: "text/html; charset=utf-8", body: PRODUCT_HTML });
    }
    return route.fulfill({ status: 404, body: "" });
  });
}

/** Imports a synthetic PassMark CPU file (default: the three-CPU one) through the real options page. */
export async function importCpuFixture(
  context: BrowserContext,
  extensionId: string,
  file = CPU_FIXTURE,
  count = "3",
): Promise<void> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.locator('[data-testid="dropzone-cpu"] input[type="file"]').setInputFiles(file);
  await expect(page.getByTestId("count-cpu")).toHaveText(count);
  await page.close();
}

export async function importGpuFixture(
  context: BrowserContext,
  extensionId: string,
  file = GPU_FIXTURE,
  count = "1",
): Promise<void> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.locator('[data-testid="dropzone-gpu"] input[type="file"]').setInputFiles(file);
  await expect(page.getByTestId("count-gpu")).toHaveText(count);
  await page.close();
}

export const shot = (page: Page, name: string) =>
  page.screenshot({ path: resolve(ARTIFACTS_DIR, `${name}.png`) });
