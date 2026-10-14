import { type BrowserContext, expect, type Page, test, type Worker } from "@playwright/test";
import { extensionIdOf, launchWithExtension } from "./launch";

const KEYS_URL = "https://openrouter.ai/api/v1/auth/keys";
const KEY = "sk-or-test";

let context: BrowserContext;
let extensionId: string;
let worker: Worker;
let exchangeBodies: unknown[];
let exchangeStatus: number;

/**
 * openrouter.ai is unreachable from the sandbox, so the two network edges are stubbed:
 * the identity popup (launchWebAuthFlow, patched inside the background service worker) and the
 * code exchange (context.route, which Playwright applies to service-worker fetches too).
 */
async function stubAuthFlow(mode: "approve" | "cancel"): Promise<void> {
  await worker.evaluate((flowMode) => {
    const calls: string[] = [];
    Reflect.set(globalThis, "__authCalls", calls);
    chrome.identity.launchWebAuthFlow = (async (details: { url: string }) => {
      calls.push(details.url);
      if (flowMode === "cancel") throw new Error("The user did not approve access.");
      const callback = new URL(details.url).searchParams.get("callback_url");
      return `${callback}?code=stub-code`;
    }) as typeof chrome.identity.launchWebAuthFlow;
  }, mode);
}

const openOptions = async (): Promise<Page> => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  return page;
};

const storedValue = (name: string) =>
  worker.evaluate(async (item) => (await chrome.storage.local.get(item))[item] ?? null, name);

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  context = await launchWithExtension();
  extensionId = await extensionIdOf(context);
  worker = context.serviceWorkers().find((w) => w.url().includes(extensionId)) as Worker;
  await context.route(KEYS_URL, async (route) => {
    exchangeBodies.push(route.request().postDataJSON());
    if (exchangeStatus !== 200) return route.fulfill({ status: exchangeStatus, body: "{}" });
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ key: KEY, user_id: "user_test" }),
    });
  });
});

test.beforeEach(() => {
  exchangeBodies = [];
  exchangeStatus = 200;
});

test.afterAll(async () => {
  await context.close();
});

test("openrouter: connect shows status without ever rendering the key, disconnect deletes it", async () => {
  await stubAuthFlow("approve");
  const page = await openOptions();
  await expect(page.getByTestId("openrouter-status")).toHaveText("Not connected");

  await page.getByTestId("openrouter-connect").click();
  await expect(page.getByTestId("openrouter-status")).toHaveText("Connected");
  await expect(page.getByTestId("openrouter-details")).toContainText("user_test");

  const authCalls = (await worker.evaluate(() =>
    Reflect.get(globalThis, "__authCalls"),
  )) as string[];
  const authUrl = new URL(authCalls[0] ?? "");
  expect(`${authUrl.origin}${authUrl.pathname}`).toBe("https://openrouter.ai/auth");
  expect(authUrl.searchParams.get("callback_url")).toBe(`https://${extensionId}.chromiumapp.org/`);
  expect(authUrl.searchParams.get("code_challenge_method")).toBe("S256");
  expect(authUrl.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);

  expect(exchangeBodies).toEqual([
    {
      code: "stub-code",
      code_verifier: expect.stringMatching(/^[A-Za-z0-9\-._~]{43,128}$/),
      code_challenge_method: "S256",
    },
  ]);

  expect(await page.content()).not.toContain(KEY);
  expect(await page.locator("body").innerText()).not.toContain(KEY);
  expect(JSON.stringify(await storedValue("local:openrouterStatus"))).not.toContain(KEY);
  expect(await storedValue("local:openrouterKey")).toMatchObject({
    key: KEY,
    userId: "user_test",
  });

  await page.reload();
  await expect(page.getByTestId("openrouter-status")).toHaveText("Connected");
  expect(await page.content()).not.toContain(KEY);

  await page.getByTestId("openrouter-disconnect").click();
  await expect(page.getByTestId("openrouter-status")).toHaveText("Not connected");
  expect(await storedValue("local:openrouterKey")).toBeNull();
  await page.close();
});

test("openrouter: user cancel and exchange failure are reported, nothing is stored", async () => {
  const page = await openOptions();

  await stubAuthFlow("cancel");
  await page.getByTestId("openrouter-connect").click();
  await expect(page.getByTestId("openrouter-error")).toContainText("cancelled");
  await expect(page.getByTestId("openrouter-status")).toHaveText("Not connected");

  await stubAuthFlow("approve");
  exchangeStatus = 500;
  await page.getByTestId("openrouter-connect").click();
  await expect(page.getByTestId("openrouter-error")).toContainText("HTTP 500");
  await expect(page.getByTestId("openrouter-status")).toHaveText("Not connected");
  expect(await storedValue("local:openrouterKey")).toBeNull();
  await page.close();
});
