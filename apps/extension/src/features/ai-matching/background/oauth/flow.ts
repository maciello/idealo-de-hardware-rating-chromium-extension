import { z } from "zod";
import type { OAuthError, OAuthErrorKind } from "../../../../contracts";

/**
 * OpenRouter OAuth authorization URL, callback parsing and code-for-key exchange
 * (https://openrouter.ai/docs/guides/overview/auth/oauth). Pure functions plus one fetch; no
 * extension APIs, so everything here is unit-testable.
 *
 * OpenRouter's docs define no `state` parameter, so none is sent: the PKCE verifier (pkce.ts, kept in
 * memory for the duration of one flow) already binds the returned `code` to this client.
 */

export const OPENROUTER_AUTH_URL = "https://openrouter.ai/auth";
export const OPENROUTER_KEYS_URL = "https://openrouter.ai/api/v1/auth/keys";

export type Result<T> = { ok: true; value: T } | { ok: false; error: OAuthError };

const fail = (kind: OAuthErrorKind, message: string): { ok: false; error: OAuthError } => ({
  ok: false,
  error: { kind, message },
});

export function buildAuthorizationUrl(callbackUrl: string, codeChallenge: string): string {
  const url = new URL(OPENROUTER_AUTH_URL);
  url.searchParams.set("callback_url", callbackUrl);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

/**
 * Reads the final URL `launchWebAuthFlow` resolves with. The URL must live on the redirect origin
 * we asked for, so a flow that ended elsewhere is never mistaken for a grant.
 */
export function parseCallbackUrl(responseUrl: string, expectedRedirect: string): Result<string> {
  let url: URL;
  let expected: URL;
  try {
    url = new URL(responseUrl);
    expected = new URL(expectedRedirect);
  } catch {
    return fail("invalid_callback", "OpenRouter returned an unreadable callback URL.");
  }
  if (url.origin !== expected.origin) {
    return fail("invalid_callback", "The authorization flow ended on an unexpected address.");
  }
  const error = url.searchParams.get("error");
  if (error !== null) {
    const description = url.searchParams.get("error_description");
    const detail = description ? `${error}: ${description}` : error;
    return fail("denied", `OpenRouter refused the authorization (${detail}).`);
  }
  const code = url.searchParams.get("code");
  if (code === null || code === "") {
    return fail("missing_code", "OpenRouter did not return an authorization code.");
  }
  return { ok: true, value: code };
}

/** `{key, user_id}` per the OpenRouter docs; anything else is rejected. */
const KeyExchangeResponseSchema = z.object({
  key: z.string().min(1),
  user_id: z.string().min(1),
});

export interface ExchangedKey {
  key: string;
  userId: string;
}

export function parseKeyExchangeResponse(json: unknown): Result<ExchangedKey> {
  const parsed = KeyExchangeResponseSchema.safeParse(json);
  if (!parsed.success) {
    return fail("exchange_invalid", "OpenRouter's key response had an unexpected shape.");
  }
  return { ok: true, value: { key: parsed.data.key, userId: parsed.data.user_id } };
}

export async function exchangeCodeForKey(
  fetchImpl: typeof fetch,
  code: string,
  codeVerifier: string,
): Promise<Result<ExchangedKey>> {
  let response: Response;
  try {
    response = await fetchImpl(OPENROUTER_KEYS_URL, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, code_verifier: codeVerifier, code_challenge_method: "S256" }),
    });
  } catch {
    return fail("exchange_network", "Could not reach OpenRouter to exchange the authorization.");
  }
  if (!response.ok) {
    return fail(
      "exchange_http",
      `OpenRouter rejected the code exchange (HTTP ${response.status}).`,
    );
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return fail("exchange_invalid", "OpenRouter's key response was not valid JSON.");
  }
  return parseKeyExchangeResponse(json);
}
