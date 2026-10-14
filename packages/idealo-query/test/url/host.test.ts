import { describe, expect, it } from "vitest";
import { isIdealoHost } from "../../src/index";

describe("isIdealoHost", () => {
  it.each([
    ["www.idealo.de", true],
    ["idealo.de", true],
    ["api.idealo.com", true],
    ["a.b.idealo.de", true],
    ["WWW.IDEALO.DE", true],
    ["idealo.de.evil.example", false],
    ["notidealo.de", false],
    ["example.com", false],
  ])("%s -> %s", (host, expected) => {
    expect(isIdealoHost(host)).toBe(expected);
  });
});
