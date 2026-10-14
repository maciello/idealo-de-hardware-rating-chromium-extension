import type { ConnectResult } from "../contracts";
import {
  clearOpenRouterCredentials,
  saveOpenRouterCredentials,
} from "../platform/storage/openrouter-key";
import { type ConnectDeps, connectOpenRouter } from "./openrouter-connect";

export interface ServiceEnv {
  redirectUrl: string;
  /** `browser.runtime.getURL("")`: the prefix every extension page URL starts with. */
  extensionBaseUrl: string;
  launchWebAuthFlow: ConnectDeps["launchWebAuthFlow"];
  fetch?: typeof fetch;
}

/** Content scripts report the host page's URL as sender; only our own pages may manage the key. */
export function isExtensionPage(senderUrl: string | undefined, extensionBaseUrl: string): boolean {
  return senderUrl?.startsWith(extensionBaseUrl) === true;
}

const REFUSED: ConnectResult = {
  ok: false,
  error: { kind: "launch_failed", message: "Only the extension's own pages may do this." },
};

export function createOpenRouterService(env: ServiceEnv) {
  let inFlight: Promise<ConnectResult> | undefined;

  return {
    /** Single flight: a second click while the sign-in window is open joins the first flow. */
    connect(senderUrl: string | undefined): Promise<ConnectResult> {
      if (!isExtensionPage(senderUrl, env.extensionBaseUrl)) return Promise.resolve(REFUSED);
      inFlight ??= connectOpenRouter({
        redirectUrl: env.redirectUrl,
        launchWebAuthFlow: env.launchWebAuthFlow,
        fetch: env.fetch ?? fetch,
        now: () => new Date(),
        save: saveOpenRouterCredentials,
      }).finally(() => {
        inFlight = undefined;
      });
      return inFlight;
    },
    async disconnect(senderUrl: string | undefined): Promise<void> {
      if (!isExtensionPage(senderUrl, env.extensionBaseUrl)) return;
      await clearOpenRouterCredentials();
    },
  };
}
