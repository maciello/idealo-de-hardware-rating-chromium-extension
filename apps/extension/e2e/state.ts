import { type BrowserContext, expect, type Page } from "@playwright/test";

/** The slice of the extension API used inside `page.evaluate` on extension pages. */
declare const chrome: {
  storage: {
    local: {
      get: (keys: null | string) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
      clear: () => Promise<void>;
    };
  };
  scripting: { getRegisteredContentScripts: () => Promise<{ id: string }[]> };
};

const TAP_ID = "idealo-hw-network-tap";

/** Everything in `chrome.storage.local`, as it stood when the fixtures were in place. */
export type StorageBaseline = Record<string, unknown>;

async function onExtensionPage<T>(
  context: BrowserContext,
  extensionId: string,
  run: (page: Page) => Promise<T>,
): Promise<T> {
  const page = await context.newPage();
  try {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    return await run(page);
  } finally {
    await page.close();
  }
}

/** Reads the whole extension storage; call it once the one-time fixture import is done. */
export function captureBaseline(
  context: BrowserContext,
  extensionId: string,
): Promise<StorageBaseline> {
  return onExtensionPage(context, extensionId, (page) =>
    page.evaluate(() => chrome.storage.local.get(null)),
  );
}

/** One stored value by its storage key (`requirements`, `settings`, ...); `undefined` when unset. */
export function storedValue(context: BrowserContext, extensionId: string, key: string) {
  return onExtensionPage(context, extensionId, (page) =>
    page.evaluate(async (name) => (await chrome.storage.local.get(name))[name], key),
  );
}

/**
 * Puts extension storage back to the baseline: saved requirements, settings, cohort policy, capture
 * mode and ring, filter vocabulary, OpenRouter key and status, error log, and any snapshot a test
 * imported or replaced all go back to what the fixture import left. Returns once the background has
 * followed a changed capture mode, so a test never inherits a registered network tap.
 */
export async function resetToBaseline(
  context: BrowserContext,
  extensionId: string,
  baseline: StorageBaseline,
): Promise<void> {
  await onExtensionPage(context, extensionId, async (page) => {
    await page.evaluate(async (saved) => {
      await chrome.storage.local.clear();
      await chrome.storage.local.set(saved);
    }, baseline);
    const tapExpected = baseline.captureMode === true;
    await expect
      .poll(() =>
        page.evaluate(
          async (id) =>
            (await chrome.scripting.getRegisteredContentScripts()).some((s) => s.id === id),
          TAP_ID,
        ),
      )
      .toBe(tapExpected);
  });
}
