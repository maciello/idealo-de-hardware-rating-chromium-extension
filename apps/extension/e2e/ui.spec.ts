import { type BrowserContext, expect, test } from "@playwright/test";
import { extensionIdOf, launchWithExtension } from "./launch";
import { importCpuFixture, installSite, LISTING_URL } from "./site";

let context: BrowserContext;
let extensionId: string;

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
  const card = page.locator('[role="dialog"]');
  await expect(card).toBeVisible();
  await page.waitForTimeout(400);

  const box = await card.boundingBox();
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
  await page.close();
});
