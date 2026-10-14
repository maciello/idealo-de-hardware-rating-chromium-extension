import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { type BrowserContext, chromium } from "@playwright/test";

export const EXTENSION_DIR = resolve(import.meta.dirname, "../.output/chrome-mv3");
export const ARTIFACTS_DIR = resolve(import.meta.dirname, "artifacts");

/**
 * Playwright ships its own Chromium revision, which may not be what is installed (this sandbox has
 * revision 1194). CHROMIUM_PATH wins; otherwise the newest chromium-* under PLAYWRIGHT_BROWSERS_PATH.
 */
function findChromium(): string | undefined {
  const fromEnv = process.env.CHROMIUM_PATH;
  if (fromEnv) return fromEnv;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  if (!existsSync(root)) return undefined;
  const revisions = readdirSync(root)
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort()
    .reverse();
  return revisions
    .map((name) => join(root, name, "chrome-linux", "chrome"))
    .find((candidate) => existsSync(candidate));
}

export async function launchWithExtension(): Promise<BrowserContext> {
  const executablePath = findChromium();
  return chromium.launchPersistentContext("", {
    ...(executablePath ? { executablePath } : { channel: "chromium" }),
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
  });
}

export async function extensionIdOf(context: BrowserContext): Promise<string> {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const id = worker.url().split("/")[2];
  if (!id) throw new Error(`Cannot read extension id from ${worker.url()}`);
  return id;
}
