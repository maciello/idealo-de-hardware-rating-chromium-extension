import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { storageKeyProvider } from "../src/ai/key-provider";
import { type ConnectDeps, connectOpenRouter } from "../src/ai/openrouter-connect";
import { createOpenRouterService, isExtensionPage } from "../src/ai/openrouter-service";
import {
  clearOpenRouterCredentials,
  loadOpenRouterCredentials,
  openrouterKeyItem,
  saveOpenRouterCredentials,
} from "../src/storage/openrouter-key";
import {
  loadOpenRouterStatus,
  NOT_CONNECTED,
  openrouterStatusItem,
} from "../src/storage/openrouter-status";

const REDIRECT = "https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/";
const EXTENSION_BASE = "chrome-extension://abcdefghijklmnopabcdefghijklmnop/";
const KEY = "sk-or-test-secret";
const NOW = new Date("2026-10-14T12:00:00.000Z");

const keyResponse = () =>
  vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify({ key: KEY, user_id: "user_test" }), { status: 200 }),
  );

const deps = (overrides: Partial<ConnectDeps> = {}): ConnectDeps => ({
  redirectUrl: REDIRECT,
  launchWebAuthFlow: async () => `${REDIRECT}?code=the-code`,
  fetch: keyResponse(),
  now: () => NOW,
  save: saveOpenRouterCredentials,
  ...overrides,
});

beforeEach(() => fakeBrowser.reset());

describe("connectOpenRouter", () => {
  it("runs the flow, stores key and status, and returns a keyless result", async () => {
    const launch = vi.fn<ConnectDeps["launchWebAuthFlow"]>(async () => `${REDIRECT}?code=the-code`);
    const fetchImpl = keyResponse();
    const result = await connectOpenRouter(deps({ launchWebAuthFlow: launch, fetch: fetchImpl }));

    const expectedStatus = {
      connected: true,
      userId: "user_test",
      obtainedAt: NOW.toISOString(),
    };
    expect(result).toEqual({ ok: true, status: expectedStatus });
    expect(JSON.stringify(result)).not.toContain(KEY);

    const authUrl = new URL(launch.mock.calls[0]?.[0] ?? "");
    expect(authUrl.searchParams.get("callback_url")).toBe(REDIRECT);
    const sent = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as Record<string, string>;
    expect(sent.code).toBe("the-code");
    expect(sent.code_verifier).toMatch(/^[A-Za-z0-9\-._~]{43,128}$/);

    expect(await loadOpenRouterCredentials()).toEqual({
      key: KEY,
      userId: "user_test",
      obtainedAt: NOW.toISOString(),
    });
    expect(await loadOpenRouterStatus()).toEqual(expectedStatus);
    expect(JSON.stringify(await openrouterStatusItem.getValue())).not.toContain(KEY);
    expect(await storageKeyProvider.getOpenRouterKey()).toBe(KEY);
  });

  it("maps a user-cancelled flow and stores nothing", async () => {
    for (const launchWebAuthFlow of [
      async () => {
        throw new Error("The user did not approve access.");
      },
      async () => undefined,
    ]) {
      const result = await connectOpenRouter(deps({ launchWebAuthFlow }));
      expect(result.ok === false && result.error.kind).toBe("cancelled");
    }
    expect(await storageKeyProvider.getOpenRouterKey()).toBeNull();
    expect(await loadOpenRouterStatus()).toEqual(NOT_CONNECTED);
  });

  it("maps other launch failures", async () => {
    const result = await connectOpenRouter(
      deps({
        launchWebAuthFlow: async () => {
          throw new Error("Authorization page could not be loaded.");
        },
      }),
    );
    expect(result.ok === false && result.error.kind).toBe("launch_failed");
  });

  it("surfaces an error param and does not call the exchange", async () => {
    const fetchImpl = keyResponse();
    const result = await connectOpenRouter(
      deps({ launchWebAuthFlow: async () => `${REDIRECT}?error=access_denied`, fetch: fetchImpl }),
    );
    expect(result.ok === false && result.error.kind).toBe("denied");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("keeps the previous state when the exchange fails", async () => {
    const failing = vi.fn<typeof fetch>(async () => new Response("{}", { status: 500 }));
    const result = await connectOpenRouter(deps({ fetch: failing }));
    expect(result.ok === false && result.error.kind).toBe("exchange_http");
    expect(await loadOpenRouterCredentials()).toBeNull();
    expect(await loadOpenRouterStatus()).toEqual(NOT_CONNECTED);
  });
});

describe("credential storage", () => {
  const credentials = { key: KEY, userId: "user_test", obtainedAt: NOW.toISOString() };

  it("treats a malformed stored key as absent", async () => {
    await openrouterKeyItem.setValue({ key: 42 } as never);
    expect(await loadOpenRouterCredentials()).toBeNull();
    expect(await storageKeyProvider.getOpenRouterKey()).toBeNull();
  });

  it("treats a malformed stored status as not connected", async () => {
    await openrouterStatusItem.setValue({ connected: "yes" } as never);
    expect(await loadOpenRouterStatus()).toEqual(NOT_CONNECTED);
  });

  it("clear removes key and status", async () => {
    await saveOpenRouterCredentials(credentials);
    await clearOpenRouterCredentials();
    expect(await loadOpenRouterCredentials()).toBeNull();
    expect(await loadOpenRouterStatus()).toEqual(NOT_CONNECTED);
  });
});

describe("OpenRouter service", () => {
  it("only trusts extension pages", () => {
    expect(isExtensionPage(`${EXTENSION_BASE}options.html`, EXTENSION_BASE)).toBe(true);
    expect(isExtensionPage("https://www.idealo.de/preisvergleich", EXTENSION_BASE)).toBe(false);
    expect(isExtensionPage(undefined, EXTENSION_BASE)).toBe(false);
  });

  const service = (launchWebAuthFlow: ConnectDeps["launchWebAuthFlow"]) =>
    createOpenRouterService({
      redirectUrl: REDIRECT,
      extensionBaseUrl: EXTENSION_BASE,
      launchWebAuthFlow,
      fetch: keyResponse(),
    });

  it("refuses connect and disconnect from a content-script sender", async () => {
    const launch = vi.fn<ConnectDeps["launchWebAuthFlow"]>(async () => `${REDIRECT}?code=c`);
    const svc = service(launch);
    const refused = await svc.connect("https://www.idealo.de/x");
    expect(refused.ok).toBe(false);
    expect(launch).not.toHaveBeenCalled();

    await saveOpenRouterCredentials({ key: KEY, userId: "u", obtainedAt: NOW.toISOString() });
    await svc.disconnect("https://www.idealo.de/x");
    expect(await storageKeyProvider.getOpenRouterKey()).toBe(KEY);
    await svc.disconnect(`${EXTENSION_BASE}options.html`);
    expect(await storageKeyProvider.getOpenRouterKey()).toBeNull();
  });

  it("joins a second connect while the first flow is open", async () => {
    let release: (url: string) => void = () => {};
    const launch = vi.fn<ConnectDeps["launchWebAuthFlow"]>(
      () => new Promise<string>((resolve) => (release = resolve)),
    );
    const svc = service(launch);
    const first = svc.connect(`${EXTENSION_BASE}options.html`);
    const second = svc.connect(`${EXTENSION_BASE}options.html`);
    await vi.waitFor(() => expect(launch).toHaveBeenCalled());
    release(`${REDIRECT}?code=c`);
    const [a, b] = await Promise.all([first, second]);
    expect(launch).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(a.ok).toBe(true);
  });
});
