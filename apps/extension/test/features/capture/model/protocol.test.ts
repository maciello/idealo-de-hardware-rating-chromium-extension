import { describe, expect, it } from "vitest";
import {
  type CapturedResponse,
  isJsonText,
  TAP_SOURCE,
  TapMessageSchema,
} from "../../../../src/features/capture/model/protocol";

const entry = (n: number): CapturedResponse => ({
  url: `https://www.idealo.de/api/${n}.json`,
  method: "GET",
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({ n }),
  truncated: false,
  capturedAt: "2026-10-14T00:00:00.000Z",
});

describe("TapMessageSchema", () => {
  it("accepts tagged messages and rejects everything else", () => {
    expect(TapMessageSchema.safeParse({ source: TAP_SOURCE, response: entry(1) }).success).toBe(
      true,
    );
    expect(TapMessageSchema.safeParse({ source: "other", response: entry(1) }).success).toBe(false);
    expect(TapMessageSchema.safeParse({ source: TAP_SOURCE, response: { url: 1 } }).success).toBe(
      false,
    );
    expect(TapMessageSchema.safeParse("hello").success).toBe(false);
  });
});

describe("isJsonText", () => {
  it("accepts objects and arrays, tolerating leading whitespace", () => {
    expect(isJsonText('{"a":1}')).toBe(true);
    expect(isJsonText("  \n[1,2]")).toBe(true);
  });

  it("rejects scalars, broken JSON and markup", () => {
    expect(isJsonText("42")).toBe(false);
    expect(isJsonText('"text"')).toBe(false);
    expect(isJsonText('{"a":')).toBe(false);
    expect(isJsonText("<html></html>")).toBe(false);
    expect(isJsonText("")).toBe(false);
  });
});
