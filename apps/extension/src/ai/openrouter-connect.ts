import type { ConnectResult, OpenRouterStatus } from "../contracts";
import {
  buildAuthorizationUrl,
  createPkce,
  exchangeCodeForKey,
  parseCallbackUrl,
} from "./openrouter-oauth";

export interface ConnectDeps {
  /** `browser.identity.getRedirectURL()`, i.e. https://<extension-id>.chromiumapp.org/ */
  redirectUrl: string;
  /** `browser.identity.launchWebAuthFlow({url, interactive: true})`. */
  launchWebAuthFlow(url: string): Promise<string | undefined>;
  fetch: typeof fetch;
  now(): Date;
  /** Persists the credentials; structural type so this module never imports the key store. */
  save(credentials: { key: string; userId: string; obtainedAt: string }): Promise<OpenRouterStatus>;
}

/** Chromium rejects with this text when the user closes the window or declines. */
const USER_CANCELLED = /did not approve|user closed|cancel/i;

export async function connectOpenRouter(deps: ConnectDeps): Promise<ConnectResult> {
  const { codeVerifier, codeChallenge } = await createPkce();
  const authUrl = buildAuthorizationUrl(deps.redirectUrl, codeChallenge);

  let responseUrl: string | undefined;
  try {
    responseUrl = await deps.launchWebAuthFlow(authUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return USER_CANCELLED.test(message)
      ? {
          ok: false,
          error: { kind: "cancelled", message: "Authorization was cancelled. Nothing changed." },
        }
      : {
          ok: false,
          error: {
            kind: "launch_failed",
            message: "The OpenRouter sign-in window could not open.",
          },
        };
  }
  if (responseUrl === undefined) {
    return {
      ok: false,
      error: { kind: "cancelled", message: "Authorization was cancelled. Nothing changed." },
    };
  }

  const callback = parseCallbackUrl(responseUrl, deps.redirectUrl);
  if (!callback.ok) return callback;

  const exchanged = await exchangeCodeForKey(deps.fetch, callback.value, codeVerifier);
  if (!exchanged.ok) return exchanged;

  const status = await deps.save({
    key: exchanged.value.key,
    userId: exchanged.value.userId,
    obtainedAt: deps.now().toISOString(),
  });
  return { ok: true, status };
}
