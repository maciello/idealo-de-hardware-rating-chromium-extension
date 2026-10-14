import { readFileSync } from "node:fs";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { extensionIdOf, launchWithExtension } from "./launch";
import {
  BARE_SEARCH_URL,
  importCpuFixture,
  installSite,
  LISTING_URL,
  NOCAT_SEARCH_URL,
  SEARCH_URL,
  shot,
} from "./site";

/** The slice of the extension API used inside `page.evaluate` on extension pages. */
declare const chrome: {
  scripting: { getRegisteredContentScripts: () => Promise<{ id: string }[]> };
  runtime: { getManifest: () => { content_scripts?: { js?: string[] }[] } };
};

const TAP_ID = "idealo-hw-network-tap";

let context: BrowserContext;
let extensionId: string;

const popupUrl = () => `chrome-extension://${extensionId}/popup.html`;
const chipOf = (page: Page, productId: string) =>
  page.locator(`li:has(a[href*="/OffersOfProduct/${productId}_"]) idealo-hw-badge`);
const chipButton = (page: Page, productId: string) =>
  chipOf(page, productId).getByTestId("rating-badge");
const card = (page: Page) => page.locator('[role="dialog"]').filter({ hasText: "PassMark" });

const registeredScripts = (page: Page) =>
  page.evaluate(async () =>
    (await chrome.scripting.getRegisteredContentScripts()).map((s) => s.id),
  );

const fetchSource = (page: Page) => page.evaluate(() => window.fetch.toString());

/** Tabs until the chip's shadow host holds focus (it is the first stop inside tile 1). */
async function tabToChip(page: Page): Promise<void> {
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    const onChip = await page.evaluate(
      () => document.activeElement?.localName === "idealo-hw-badge",
    );
    if (onChip) return;
  }
  throw new Error("Tab never reached a chip");
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  context = await launchWithExtension();
  await installSite(context);
  extensionId = await extensionIdOf(context);
  await importCpuFixture(context, extensionId);
});

test.afterAll(async () => {
  await context.close();
});

test("stacking: the hover card paints above the following tiles", async () => {
  const page = await context.newPage();
  await page.goto(LISTING_URL);
  const chip = page.locator("li.item").first().getByTestId("rating-badge");
  await expect(chip).toBeVisible();
  await chip.hover();
  await expect(card(page)).toBeVisible();
  await page.waitForTimeout(400);

  const box = await card(page).boundingBox();
  if (!box) throw new Error("card has no box");
  const hit = await page.evaluate(
    ({ x, y }) => {
      const element = document.elementFromPoint(x, y);
      return {
        tag: element?.tagName ?? null,
        inOverlay: element?.closest("idealo-hw-overlay") !== null && element !== null,
      };
    },
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
  );
  expect(hit).toEqual({ tag: "IDEALO-HW-OVERLAY", inOverlay: true });

  // The overlay is one layer for everything: a direct child of <html>, click-through.
  const overlay = await page.evaluate(() => {
    const host = document.querySelector("idealo-hw-overlay");
    const style = host ? getComputedStyle(host) : null;
    return {
      parent: host?.parentElement?.localName,
      count: document.querySelectorAll("idealo-hw-overlay").length,
      position: style?.position,
      pointerEvents: style?.pointerEvents,
      inset: [style?.top, style?.left, style?.right, style?.bottom],
    };
  });
  expect(overlay).toEqual({
    parent: "html",
    count: 1,
    position: "fixed",
    pointerEvents: "none",
    inset: ["0px", "0px", "0px", "0px"],
  });

  await shot(page, "card");
  await page.close();
});

test("layout: chips do not move or resize any tile", async () => {
  const page = await context.newPage();
  // Runs before the content script (document_idle) can mount anything.
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const rects = [...document.querySelectorAll("li.item")].map((li) => {
        const { x, y, width, height } = li.getBoundingClientRect();
        return [x, y, width, height];
      });
      Reflect.set(window, "__before", {
        rects,
        height: document.documentElement.scrollHeight,
      });
    });
  });
  await page.goto(LISTING_URL);
  await expect(page.locator("idealo-hw-badge")).toHaveCount(3);
  await page.waitForTimeout(300);
  const result = await page.evaluate(() => {
    const before = Reflect.get(window, "__before") as { rects: number[][]; height: number };
    const after = [...document.querySelectorAll("li.item")].map((li) => {
      const { x, y, width, height } = li.getBoundingClientRect();
      return [x, y, width, height];
    });
    const chip = document.querySelector("idealo-hw-badge");
    return {
      before: before.rects,
      after,
      heightBefore: before.height,
      heightAfter: document.documentElement.scrollHeight,
      chipPosition: chip ? getComputedStyle(chip).position : null,
      tileChipHeight: chip?.shadowRoot?.querySelector("button")?.getBoundingClientRect().height,
    };
  });
  expect(result.before).toHaveLength(5);
  expect(result.after).toEqual(result.before);
  expect(result.heightAfter).toBe(result.heightBefore);
  expect(result.chipPosition).toBe("absolute");
  expect(result.tileChipHeight).toBe(24);

  const chip = chipButton(page, "1001");
  await shot(page, "chip");
  const clip = await chip.boundingBox();
  if (clip) {
    await page.screenshot({
      path: "e2e/artifacts/chip-closeup.png",
      clip: { x: Math.max(0, clip.x - 16), y: Math.max(0, clip.y - 16), width: 280, height: 90 },
    });
  }
  await page.close();
});

test("keyboard: Tab reaches the chip, Enter opens the card, Escape closes it", async () => {
  const page = await context.newPage();
  await page.goto(LISTING_URL);
  await expect(page.locator("idealo-hw-badge")).toHaveCount(3);

  await tabToChip(page);
  await expect(chipButton(page, "1001")).toBeFocused();
  await expect(chipButton(page, "1001")).toHaveAttribute("aria-label", /CPU rating Multi-thread/);
  await page.keyboard.press("Enter");
  await expect(card(page)).toBeVisible();
  await expect(card(page)).toContainText("Intel Core i7-13700H");

  await page.keyboard.press("Escape");
  await expect(card(page)).toHaveCount(0);
  await expect(chipButton(page, "1001")).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(card(page)).toBeVisible();
  await page.close();
});

test("scroll: the open card stays attached to its chip", async () => {
  const page = await context.newPage();
  await page.goto(LISTING_URL);
  await expect(page.locator("idealo-hw-badge")).toHaveCount(3);
  await page.evaluate(() => {
    document.body.style.minHeight = "4000px";
  });
  await tabToChip(page);
  await page.keyboard.press("Enter");
  await expect(card(page)).toBeVisible();
  await page.waitForTimeout(300);

  const gap = async () => {
    const chip = await chipButton(page, "1001").boundingBox();
    const dropdown = await card(page).boundingBox();
    if (!chip || !dropdown) throw new Error("missing box");
    return { chipTop: chip.y, offset: dropdown.y - chip.y, left: dropdown.x - chip.x };
  };
  const before = await gap();
  for (const delta of [4, 3, 5]) {
    await page.evaluate((dy) => window.scrollBy(0, dy), delta);
    await page.waitForTimeout(250);
  }
  const after = await gap();
  expect(Math.round(before.chipTop - after.chipTop)).toBe(12);
  expect(Math.abs(after.offset - before.offset)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.left - before.left)).toBeLessThanOrEqual(1);

  // Once the chip has scrolled out of sight the card follows it instead of floating in mid-air.
  await page.evaluate(() => window.scrollBy(0, 300));
  await expect(card(page)).toBeHidden();
  await page.close();
});

test("popup: shows benchmark data and the rated count of the open listing", async () => {
  const listing = await context.newPage();
  await listing.goto(LISTING_URL);
  await expect(listing.locator("idealo-hw-badge")).toHaveCount(3);

  const popup = await context.newPage();
  await popup.setViewportSize({ width: 360, height: 640 });
  await popup.goto(popupUrl());
  await expect(popup.getByTestId("popup-page")).toHaveText("3 of 5 products rated");
  await expect(popup.getByTestId("popup-data")).toContainText(/^CPU 3 \(imported \d\d\.\d\d\.\)$/);
  await expect(popup.getByTestId("popup-filter")).toBeEnabled();
  await expect(popup.getByTestId("popup-ai")).toHaveText("Not connected");
  await expect(popup.getByTestId("popup-connect")).toBeVisible();
  const width = await popup.evaluate(() => document.body.getBoundingClientRect().width);
  expect(width).toBe(360);
  await shot(popup, "popup");
  await popup.close();
  await listing.close();
});

test("popup: without an idealo page it says what to open", async () => {
  const popup = await context.newPage();
  await popup.goto(popupUrl());
  await expect(popup.getByTestId("popup-page")).toHaveText(
    "Open an idealo listing or product page",
  );
  await expect(popup.getByTestId("popup-filter")).toBeDisabled();
  await expect(popup.getByTestId("popup-snapshot")).toBeDisabled();
  await popup.close();
});

test("primary number: the popup switch changes the chip values on an open listing", async () => {
  const listing = await context.newPage();
  await listing.goto(LISTING_URL);
  const value = (id: string) => chipOf(listing, id).getByTestId("chip-value");
  await expect(value("1001")).toHaveText("28.000");
  await expect(value("1002")).toHaveText("17.000");

  const popup = await context.newPage();
  await popup.goto(popupUrl());
  await popup.getByTestId("popup-primary").getByText("Single", { exact: true }).click();
  await expect(value("1001")).toHaveText("3.900");
  await popup.getByTestId("popup-primary").getByText("Per €", { exact: true }).click();
  await expect(value("1001")).toHaveText("21,6 /€");
  await popup.getByTestId("popup-primary").getByText("Page rank", { exact: true }).click();
  await expect(value("1001")).toHaveText("#2 of 3");
  await expect(value("1003")).toHaveText("#1 of 3");
  await popup.getByTestId("popup-primary").getByText("Multi", { exact: true }).click();
  await expect(value("1001")).toHaveText("28.000");
  await popup.close();
  await listing.close();
});

test("filter builder: the button appears on a search page and the popup can open it", async () => {
  const page = await context.newPage();
  await page.goto(SEARCH_URL);
  await expect(page.getByTestId("filter-fab")).toBeVisible();
  await expect(page.locator("idealo-hw-badge")).toHaveCount(3);

  const popup = await context.newPage();
  await popup.goto(popupUrl());
  await expect(popup.getByTestId("popup-filter")).toBeEnabled();
  const closed = popup.waitForEvent("close");
  await popup.getByTestId("popup-filter").click();
  await closed.catch(() => undefined);

  await page.bringToFront();
  await expect(page.getByRole("dialog", { name: "Filter builder" })).toBeVisible();
  await expect(page.getByTestId("query-text")).toHaveValue("laptop 32GB");
  await page.getByTestId("options-toggle").click();
  await page.getByTestId("filter-1234").check();
  await expect(page.getByTestId("target-url")).toHaveText(
    "https://www.idealo.de/preisvergleich/ProductCategory/19116F1234.html?q=laptop%2032GB",
  );
  await page.waitForTimeout(400);
  await shot(page, "filter-drawer-search");
  await page.close();
});

test("filter builder: without a readable catalog it says so and stays usable", async () => {
  const page = await context.newPage();
  await page.goto(BARE_SEARCH_URL);
  await page.getByTestId("filter-fab").click();
  await expect(page.getByTestId("no-catalog-note")).toContainText(
    "Filters could not be read from this page",
  );
  await expect(page.getByTestId("no-catalog-note")).toContainText("page snapshot");
  await expect(page.getByTestId("requirements")).toHaveCount(0);
  await expect(page.getByTestId("raw-ids")).toHaveCount(0);
  await page.getByTestId("query-text").fill("gaming laptop");
  await page.getByTestId("details-toggle").click();
  await expect(page.getByTestId("target-url")).toHaveText(
    "https://www.idealo.de/preisvergleich/ProductCategory/19116.html?q=gaming%20laptop",
  );
  await expect(page.getByTestId("apply")).toBeEnabled();
  await page.close();
});

test("filter builder: a search page without a category still applies text and price", async () => {
  const page = await context.newPage();
  await page.goto(NOCAT_SEARCH_URL);
  await page.getByTestId("filter-fab").click();
  await expect(page.getByTestId("no-category-note")).toBeVisible();
  await expect(page.getByTestId("requirements")).toHaveCount(0);
  await page.getByTestId("query-text").fill("ultrabook");
  await page.getByTestId("price-max").fill("900");
  await expect(page.getByTestId("target-url")).toHaveText(
    "https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?p=-900.0&q=ultrabook",
  );
  await page.close();
});

test("snapshot: the popup saves a sanitized page as JSON", async () => {
  const listing = await context.newPage();
  await listing.goto(LISTING_URL);
  await expect(listing.locator("idealo-hw-badge")).toHaveCount(3);

  const popup = await context.newPage();
  await popup.goto(popupUrl());
  await expect(popup.getByTestId("popup-snapshot")).toBeEnabled();
  const download = popup.waitForEvent("download");
  await popup.getByTestId("popup-snapshot").click();
  const path = await (await download).path();
  const saved = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  expect(Object.keys(saved).sort()).toEqual([
    "capturedAt",
    "exportedAt",
    "html",
    "title",
    "truncated",
    "url",
  ]);
  expect(saved.exportedAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
  expect(saved.capturedAt).toMatch(/Z$/);
  expect((await download).suggestedFilename()).toMatch(
    /^idealo-hw_page-snapshot_\d{8}T\d{6}Z\.json$/,
  );
  expect(saved.url).toBe(LISTING_URL);
  expect(saved.title).toBe("SYNTHETIC listing fixture");
  expect(saved.truncated).toBe(false);
  const html = saved.html as string;
  expect(html).toContain("Alpha Book 15 Notebook");
  expect(html).not.toContain("idealo-hw-");
  expect(html).not.toContain("window.__filters");
  await expect(popup.getByTestId("popup-note")).toContainText("Snapshot saved");
  await popup.close();
  await listing.close();
});

test("tap: not injected while capture is off, injected after it is on and the page reloads", async () => {
  const popup = await context.newPage();
  await popup.goto(popupUrl());
  const manifest = await popup.evaluate(() => chrome.runtime.getManifest().content_scripts ?? []);
  expect(manifest.flatMap((c) => c.js ?? []).filter((js) => js.includes("network-tap"))).toEqual(
    [],
  );
  expect(await registeredScripts(popup)).not.toContain(TAP_ID);

  const page = await context.newPage();
  await page.goto(LISTING_URL);
  expect(await fetchSource(page)).toContain("[native code]");

  await popup.getByTestId("popup-capture").check({ force: true });
  await expect.poll(() => registeredScripts(popup)).toContain(TAP_ID);
  await page.reload();
  expect(await fetchSource(page)).not.toContain("[native code]");
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__filters")))
    .toEqual({ filters: [{ id: 1234, name: "Intel" }] });

  await popup.getByTestId("popup-capture").uncheck({ force: true });
  await expect.poll(() => registeredScripts(popup)).not.toContain(TAP_ID);
  await page.reload();
  expect(await fetchSource(page)).toContain("[native code]");
  await page.close();
  await popup.close();
});
