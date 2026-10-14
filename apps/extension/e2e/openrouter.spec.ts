import { type BrowserContext, expect, type Page, test, type Worker } from "@playwright/test";
import { extensionIdOf, launchWithExtension } from "./launch";
import { shot } from "./site";
import { captureBaseline, resetToBaseline, type StorageBaseline } from "./state";

/** The slice of the extension API used inside `worker.evaluate` (e2e has no chrome typings). */
declare const chrome: {
  identity: { launchWebAuthFlow: (details: { url: string }) => Promise<string> };
  storage: { local: { get: (key: string) => Promise<Record<string, unknown>> } };
};

const KEYS_URL = "https://openrouter.ai/api/v1/auth/keys";
const SYSTEMONE_URL = "https://openrouter.ai/api/v1/systemone";
const SERVED_MODEL = "typesafe/jev-1.13-20260917";
const KEY = "sk-or-test";

let context: BrowserContext;
let extensionId: string;
let baseline: StorageBaseline;
let worker: Worker;
let exchangeBodies: unknown[];
let exchangeStatus: number;
let jevStatus: number;
let jevRequests: { authorization: string | undefined; body: JevRequest }[];

interface JevRequest {
  model: string;
  questions: { pick: { criteria: Record<string, string> } };
}

/**
 * openrouter.ai is unreachable from the sandbox, so the two network edges are stubbed:
 * the identity popup (launchWebAuthFlow, patched inside the background service worker) and the
 * code exchange (context.route, which Playwright applies to service-worker fetches too).
 */
async function stubAuthFlow(mode: "approve" | "cancel"): Promise<void> {
  await worker.evaluate((flowMode) => {
    const calls: string[] = [];
    globalThis.__authCalls = calls;
    chrome.identity.launchWebAuthFlow = async (details) => {
      calls.push(details.url);
      if (flowMode === "cancel") throw new Error("The user did not approve access.");
      const callback = new URL(details.url).searchParams.get("callback_url");
      return `${callback}?code=stub-code`;
    };
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
  // Jev answers the probe correctly: picks the option described as the model number named in the state.
  await context.route(SYSTEMONE_URL, async (route) => {
    const body = route.request().postDataJSON() as JevRequest;
    jevRequests.push({ authorization: route.request().headers().authorization, body });
    if (jevStatus !== 200) {
      return route.fulfill({
        status: jevStatus,
        body: JSON.stringify({ error: "invalid api key" }),
      });
    }
    const criteria = body.questions.pick.criteria;
    const choice = Object.keys(criteria).find((k) => criteria[k] === "Intel Core i5-13400") ?? "";
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        model: SERVED_MODEL,
        answers: {
          pick: {
            type: "choice",
            choice,
            confidence: 0.98,
            probabilities: Object.fromEntries(
              Object.keys(criteria).map((k) => [k, k === choice ? 0.98 : 0.01]),
            ),
          },
        },
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    });
  });
  baseline = await captureBaseline(context, extensionId);
});

test.beforeEach(() => {
  exchangeBodies = [];
  exchangeStatus = 200;
  jevStatus = 200;
  jevRequests = [];
});

test.beforeEach(() => resetToBaseline(context, extensionId, baseline));

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

  const authCalls = (await worker.evaluate(() => globalThis.__authCalls)) ?? [];
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
  expect(JSON.stringify(await storedValue("openrouterStatus"))).not.toContain(KEY);
  expect(await storedValue("openrouterKey")).toMatchObject({
    key: KEY,
    userId: "user_test",
  });

  await page.reload();
  await expect(page.getByTestId("openrouter-status")).toHaveText("Connected");
  expect(await page.content()).not.toContain(KEY);

  await page.getByTestId("openrouter-disconnect").click();
  await expect(page.getByTestId("openrouter-status")).toHaveText("Not connected");
  expect(await storedValue("openrouterKey")).toBeNull();
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
  expect(await storedValue("openrouterKey")).toBeNull();
  await page.close();
});

test("openrouter: the test button runs one Jev probe and shows pick, latency and served model", async () => {
  const page = await openOptions();
  await expect(page.getByTestId("openrouter-test")).toBeDisabled();

  await stubAuthFlow("approve");
  await page.getByTestId("openrouter-connect").click();
  await expect(page.getByTestId("openrouter-status")).toHaveText("Connected");
  await expect(page.getByTestId("openrouter-test")).toBeEnabled();

  await page.getByTestId("openrouter-test").click();
  const result = page.getByTestId("openrouter-test-result");
  await expect(result).toContainText(
    /Working: picked Intel Core i5-13400 in \d+ ms, model typesafe\/jev-1\.13-20260917/,
  );
  expect(jevRequests).toHaveLength(1);
  expect(jevRequests[0]?.authorization).toBe(`Bearer ${KEY}`);
  expect(jevRequests[0]?.body.model).toBe("typesafe/jev-1.13");
  expect(await storedValue("aiTestResult")).toMatchObject({
    ok: true,
    picked: "Intel Core i5-13400",
    model: SERVED_MODEL,
  });
  expect(await page.content()).not.toContain(KEY);
  await shot(page, "options-ai-test");

  jevStatus = 401;
  await page.getByTestId("openrouter-test").click();
  await expect(result).toContainText("Failed:");
  await expect(result).toContainText("401");
  expect(await page.content()).not.toContain(KEY);
  expect(JSON.stringify(await storedValue("aiTestResult"))).not.toContain(KEY);

  await page.getByTestId("openrouter-disconnect").click();
  await expect(page.getByTestId("openrouter-status")).toHaveText("Not connected");
  await expect(result).toHaveCount(0);
  expect(await storedValue("aiTestResult")).toBeNull();
  await page.close();
});
