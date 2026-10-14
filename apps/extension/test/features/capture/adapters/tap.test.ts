import { describe, expect, it } from "vitest";
import {
  isIdealoHost,
  type ObservedResponse,
  toCapturedResponse,
} from "../../../../src/features/capture/adapters/tap";
import { MAX_BODY_CHARS } from "../../../../src/features/capture/config";

const BASE = "https://www.idealo.de/preisvergleich/ProductCategory/3751.html";
const NOW = () => new Date("2026-10-14T10:00:00.000Z");

const observed = (over: Partial<ObservedResponse> & { body?: string }): ObservedResponse => {
  const { body = "", ...rest } = over;
  return {
    url: "https://www.idealo.de/api/x",
    method: "GET",
    status: 200,
    contentType: "application/json",
    readText: async () => body,
    ...rest,
  };
};

describe("isIdealoHost", () => {
  it.each([
    ["www.idealo.de", true],
    ["idealo.de", true],
    ["api.idealo.com", true],
    ["a.b.idealo.de", true],
    ["idealo.de.evil.example", false],
    ["notidealo.de", false],
    ["example.com", false],
  ])("%s -> %s", (host, expected) => {
    expect(isIdealoHost(host)).toBe(expected);
  });
});

describe("toCapturedResponse", () => {
  it("captures JSON from another idealo subdomain, resolving relative urls", async () => {
    const body = '{"hits":[1,2]}';
    const same = await toCapturedResponse(observed({ url: "/suggest?q=a", body }), BASE, NOW);
    const cross = await toCapturedResponse(
      observed({
        url: "https://search-api.idealo.com/searchResult?categoryId=3751&pageIndex=1",
        body,
      }),
      BASE,
      NOW,
    );
    expect(same).toMatchObject({ body, bodyCaptured: true, truncated: false });
    expect(cross).toMatchObject({
      url: "https://search-api.idealo.com/searchResult?categoryId=3751&pageIndex=1",
      body,
      bodyCaptured: true,
      status: 200,
      method: "GET",
      capturedAt: "2026-10-14T10:00:00.000Z",
    });
  });

  it("captures JSON that the server labels text/plain", async () => {
    const result = await toCapturedResponse(
      observed({ contentType: "text/plain; charset=utf-8", body: '  [{"a":1}]' }),
      BASE,
      NOW,
    );
    expect(result).toMatchObject({
      contentType: "text/plain; charset=utf-8",
      body: '  [{"a":1}]',
      bodyCaptured: true,
    });
  });

  it("records nothing for third-party hosts, whatever the response", async () => {
    let read = false;
    const tracker = await toCapturedResponse(
      observed({
        url: "https://tracker.example.net/collect",
        method: "POST",
        status: 202,
        readText: async () => {
          read = true;
          return '{"secret":1}';
        },
      }),
      BASE,
      NOW,
    );
    const lookalike = await toCapturedResponse(
      observed({ url: "https://idealo.de.evil.example/api/x", body: "{}" }),
      BASE,
      NOW,
    );
    const unparseable = await toCapturedResponse(observed({ url: "http://[bad" }), BASE, NOW);
    expect([tracker, lookalike, unparseable]).toEqual([null, null, null]);
    expect(read).toBe(false);
  });

  it("records non-JSON idealo bodies and empty 202 sensor posts as metadata only", async () => {
    const html = await toCapturedResponse(
      observed({ contentType: "text/html", body: "<html></html>" }),
      BASE,
      NOW,
    );
    const empty = await toCapturedResponse(
      observed({
        url: "/VlzSZFrXQ-8-_VLmYKNKlQwtVKs/x",
        method: "POST",
        status: 202,
        contentType: "",
      }),
      BASE,
      NOW,
    );
    const broken = await toCapturedResponse(observed({ body: '{"cut":' }), BASE, NOW);
    for (const result of [html, empty, broken]) {
      expect(result).toMatchObject({ body: "", bodyCaptured: false, truncated: false });
    }
    expect(empty).toMatchObject({ method: "POST", status: 202 });
  });

  it("survives a body that cannot be read", async () => {
    const result = await toCapturedResponse(
      observed({
        readText: async () => {
          throw new Error("consumed");
        },
      }),
      BASE,
      NOW,
    );
    expect(result).toMatchObject({ body: "", bodyCaptured: false });
  });

  it("truncates huge JSON bodies to MAX_BODY_CHARS", async () => {
    const body = JSON.stringify({ blob: "x".repeat(MAX_BODY_CHARS + 10) });
    const result = await toCapturedResponse(observed({ body }), BASE, NOW);
    expect(result?.body).toHaveLength(MAX_BODY_CHARS);
    expect(result).toMatchObject({ truncated: true, bodyCaptured: true });
  });
});
