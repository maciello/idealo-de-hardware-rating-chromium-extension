import { describe, expect, it } from "vitest";
import { parseCommand } from "../src/args";
import { runRank } from "../src/run";
import { inputSchemas } from "../src/schema";
import { fixture, tempOut } from "./paths";

describe("inputSchemas", () => {
  const schemas = inputSchemas();
  it("describes both files, with a description on the fields", () => {
    expect(schemas.wants.properties).toHaveProperty("budget_eur");
    expect(schemas.candidates.properties).toHaveProperty("candidates");
    const text = JSON.stringify(schemas);
    expect(text).toContain("idealo nameDelta");
    expect(text).toContain("refresh_hz_min");
  });
});

describe("parseCommand", () => {
  it("collects repeated --candidates", () => {
    const command = parseCommand([
      "rank",
      "--wants",
      "w",
      "--candidates",
      "a",
      "--candidates",
      "b",
      "--out",
      "o",
    ]);
    expect(command).toEqual({
      name: "rank",
      options: { wants: "w", candidates: ["a", "b"], passmarkDir: null, out: "o" },
    });
  });
  it("rejects missing options", () => {
    expect(() => parseCommand(["rank", "--wants", "w"])).toThrow(/required/);
    expect(() => parseCommand([])).toThrow(/Usage/);
  });
});

describe("bad input", () => {
  it("names the file and field of a schema error", () => {
    expect(() =>
      runRank({
        wants: fixture("bad-wants.yaml"),
        candidates: [fixture("cameras", "cameras.yaml")],
        passmarkDir: null,
        out: tempOut(),
      }),
    ).toThrow(/bad-wants\.yaml[\s\S]*weights\.zoom[\s\S]*neither a built-in metric/);
  });
});
