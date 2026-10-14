import { resolve } from "node:path";
import { type BrowserContext, expect, test } from "@playwright/test";
import { ARTIFACTS_DIR, extensionIdOf, launchWithExtension } from "./launch";
import { importCpuFixture, installSite, NOTEBOOKS_LISTING_URL } from "./site";
import { captureBaseline, resetToBaseline, type StorageBaseline } from "./state";

/** The slice of the extension API used inside `page.evaluate` on extension pages. */
declare const chrome: {
  storage: { local: { get: (key: string) => Promise<Record<string, unknown>> } };
};

let context: BrowserContext;
let extensionId: string;
let baseline: StorageBaseline;

test.beforeAll(async () => {
  context = await launchWithExtension();
  await installSite(context);
  extensionId = await extensionIdOf(context);
  await importCpuFixture(context, extensionId);
  baseline = await captureBaseline(context, extensionId);
});

test.beforeEach(() => resetToBaseline(context, extensionId, baseline));

test.afterAll(async () => {
  await context.close();
});

test("cohort policy: narrowing it to years without data drops the segment percentile from the chip live", async () => {
  const listing = await context.newPage();
  await listing.goto(NOTEBOOKS_LISTING_URL);
  const chip = listing
    .locator('li:has(a[href*="/OffersOfProduct/1001_"]) idealo-hw-badge')
    .getByTestId("rating-badge");
  await expect(chip).toHaveAttribute("aria-label", /of laptop CPUs/);

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  const storedPolicy = () =>
    options.evaluate(async () => (await chrome.storage.local.get("cohortPolicy")).cohortPolicy);
  await expect(options.getByTestId("cohort-years")).toHaveValue("5");

  await options.getByTestId("cohort-cutoff").getByText("Since year").click();
  await options.getByTestId("cohort-year").fill("2024");
  await expect.poll(storedPolicy).toEqual({
    yearCutoff: { kind: "since_year", year: 2024 },
    minScore: null,
  });
  await options.getByTestId("cohort-min-score").fill("1000");
  await expect.poll(storedPolicy).toEqual({
    yearCutoff: { kind: "since_year", year: 2024 },
    minScore: 1000,
  });
  await options
    .getByTestId("strategies")
    .screenshot({ path: resolve(ARTIFACTS_DIR, "options-cohort.png") });

  await listing.bringToFront();
  await expect(chip).toHaveAttribute("aria-label", /on this page/);

  await options.bringToFront();
  await options.getByTestId("cohort-cutoff").getByText("All years").click();
  await options.getByTestId("cohort-min-score").fill("");
  await expect.poll(storedPolicy).toEqual({ yearCutoff: { kind: "none" }, minScore: null });
  await listing.bringToFront();
  await expect(chip).toHaveAttribute("aria-label", /of laptop CPUs/);
  await options.close();
  await listing.close();
});
