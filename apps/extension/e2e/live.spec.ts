import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { type BrowserContext, expect, test } from "@playwright/test";
import { ARTIFACTS_DIR, extensionIdOf, launchWithExtension } from "./launch";

/**
 * Live smoke run against www.idealo.de with the user's private PassMark export (repo-root data/,
 * gitignored). Opt-in: LIVE=1 just e2e-live. Writes per-page chip coverage to artifacts/live.json.
 */
const DATA = resolve(import.meta.dirname, "../../../data");
const CPU_CSV = resolve(DATA, "passmark_cpu.csv");
const GPU_CSV = resolve(DATA, "passmark_gpu.csv");
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const PAGES = (
  process.env.LIVE_PAGES ?? "ProductCategory/3751.html,ProductCategory/3020F720310.html"
)
  .split(",")
  .map((p) => `https://www.idealo.de/preisvergleich/${p.trim()}`);

test.skip(
  process.env.LIVE !== "1" || !existsSync(CPU_CSV),
  "LIVE=1 and data/passmark_cpu.csv required",
);
test.describe.configure({ mode: "serial" });

let context: BrowserContext;

test.beforeAll(async () => {
  context = await launchWithExtension(UA);
  const id = await extensionIdOf(context);
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/options.html`);
  for (const [kind, file] of [
    ["cpu", CPU_CSV],
    ["gpu", GPU_CSV],
  ] as const) {
    if (!existsSync(file)) continue;
    await page.locator(`[data-testid="dropzone-${kind}"] input[type="file"]`).setInputFiles(file);
    await expect(page.getByTestId(`count-${kind}`)).not.toHaveText("0", { timeout: 30_000 });
  }
  await page.close();
});

test.afterAll(async () => {
  await context?.close();
});

test("live: chips on real idealo pages", async () => {
  const report: unknown[] = [];
  for (const [i, url] of PAGES.entries()) {
    const page = await context.newPage();
    const response = await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(6_000);
    const tiles = await page.evaluate(() =>
      [...document.querySelectorAll('[class^="sr-resultItemTile_"]')]
        .filter((el) => /^sr-resultItemTile_[\w-]{5}$/.test(el.className.split(" ")[0] ?? ""))
        .map((el) => ({
          title: el.querySelector("[class*='productSummary__title']")?.textContent?.trim() ?? null,
          specs:
            el.querySelector("[class*='productSummary__mainDetails']")?.textContent?.trim() ?? null,
          gpuLine:
            el
              .querySelector("idealo-hw-badge")
              ?.shadowRoot?.querySelector('[data-testid="chip-gpu"]')
              ?.getAttribute("title") ?? null,
          chip:
            el
              .querySelector("idealo-hw-badge")
              ?.shadowRoot?.querySelector("[aria-label]")
              ?.getAttribute("aria-label") ?? (el.querySelector("idealo-hw-badge") ? "chip" : null),
        })),
    );
    const productChip = await page.locator("h1#oopStage-title idealo-hw-badge").count();
    report.push({ url, status: response?.status(), tiles, productChip });
    await page.screenshot({ path: resolve(ARTIFACTS_DIR, `live-${i}.png`), fullPage: false });
    await page.close();
    await new Promise((r) => setTimeout(r, 3_000));
  }
  writeFileSync(resolve(ARTIFACTS_DIR, "live.json"), JSON.stringify(report, null, 1));
});
