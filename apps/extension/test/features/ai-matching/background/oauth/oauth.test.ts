import { calculatePKCECodeChallenge } from "oauth4webapi";
import { describe, expect, it, vi } from "vitest";
import {
  buildAuthorizationUrl,
  createPkce,
  exchangeCodeForKey,
  OPENROUTER_KEYS_URL,
  parseCallbackUrl,
  parseKeyExchangeResponse,
} from "../../../../../src/features/ai-matching/background/oauth";

const REDIRECT = "https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/";

describe("parseCallbackUrl", () => {
  it("returns the code when present", () => {
    expect(parseCallbackUrl(`${REDIRECT}?code=abc123`, REDIRECT)).toEqual({
      ok: true,
      value: "abc123",
    });
  });

  it("ignores unrelated params such as a stray state (OpenRouter defines none)", () => {
    expect(parseCallbackUrl(`${REDIRECT}?code=abc123&state=whatever`, REDIRECT)).toEqual({
      ok: true,
      value: "abc123",
    });
  });

  it("reports an error param as denied, with its description, and never as success", () => {
    const result = parseCallbackUrl(
      `${REDIRECT}?error=access_denied&error_description=User%20said%20no&code=ignored`,
      REDIRECT,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("denied");
    expect(result.error.message).toContain("access_denied: User said no");
    expect(result.error.message).not.toContain("ignored");
  });

  it("reports a missing or empty code", () => {
    for (const url of [REDIRECT, `${REDIRECT}?foo=bar`, `${REDIRECT}?code=`]) {
      const result = parseCallbackUrl(url, REDIRECT);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("missing_code");
    }
  });

  it("rejects a callback on another origin or a malformed URL", () => {
    for (const url of ["https://evil.example/?code=abc", "not a url"]) {
      const result = parseCallbackUrl(url, REDIRECT);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("invalid_callback");
    }
  });
});

describe("PKCE and authorization URL", () => {
  it("derives S256 challenges per RFC 7636 appendix B", async () => {
    expect(await calculatePKCECodeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });

  it("creates a fresh verifier whose challenge matches", async () => {
    const a = await createPkce();
    const b = await createPkce();
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
    expect(a.codeVerifier).toMatch(/^[A-Za-z0-9\-._~]{43,128}$/);
    expect(a.codeChallenge).toBe(await calculatePKCECodeChallenge(a.codeVerifier));
  });

  it("builds the documented auth URL and nothing else", () => {
    const url = new URL(buildAuthorizationUrl(REDIRECT, "chal"));
    expect(`${url.origin}${url.pathname}`).toBe("https://openrouter.ai/auth");
    expect([...url.searchParams.keys()].sort()).toEqual([
      "callback_url",
      "code_challenge",
      "code_challenge_method",
    ]);
    expect(url.searchParams.get("callback_url")).toBe(REDIRECT);
    expect(url.searchParams.get("code_challenge")).toBe("chal");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });
});

describe("parseKeyExchangeResponse", () => {
  it("maps user_id to userId", () => {
    expect(parseKeyExchangeResponse({ key: "sk-or-x", user_id: "user_1" })).toEqual({
      ok: true,
      value: { key: "sk-or-x", userId: "user_1" },
    });
  });

  it("rejects missing, empty or mistyped fields", () => {
    for (const body of [
      null,
      {},
      { key: "k" },
      { key: "", user_id: "u" },
      { key: 1, user_id: "u" },
    ]) {
      const result = parseKeyExchangeResponse(body);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("exchange_invalid");
    }
  });
});

describe("exchangeCodeForKey", () => {
  const respond = (status: number, body: unknown) =>
    vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));

  it("posts code, verifier and method to the keys endpoint", async () => {
    const fetchImpl = respond(200, { key: "sk-or-x", user_id: "user_1" });
    const result = await exchangeCodeForKey(fetchImpl, "the-code", "the-verifier");
    expect(result).toEqual({ ok: true, value: { key: "sk-or-x", userId: "user_1" } });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(OPENROUTER_KEYS_URL);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      code: "the-code",
      code_verifier: "the-verifier",
      code_challenge_method: "S256",
    });
  });

  it("reports HTTP failures with the status but not the body", async () => {
    const result = await exchangeCodeForKey(respond(403, { error: "secret detail" }), "c", "v");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("exchange_http");
    expect(result.error.message).toContain("403");
    expect(result.error.message).not.toContain("secret detail");
  });

  it("reports network failures and non-JSON bodies", async () => {
    const network = await exchangeCodeForKey(
      vi.fn<typeof fetch>(async () => {
        throw new TypeError("offline");
      }),
      "c",
      "v",
    );
    expect(network.ok === false && network.error.kind).toBe("exchange_network");

    const notJson = await exchangeCodeForKey(
      vi.fn<typeof fetch>(async () => new Response("<html>", { status: 200 })),
      "c",
      "v",
    );
    expect(notJson.ok === false && notJson.error.kind).toBe("exchange_invalid");
  });
});
