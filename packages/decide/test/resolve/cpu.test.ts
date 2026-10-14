import { createCandidateIndex, createCanonicalKeyMatcher } from "@idealo-hw/hw-bench";
import type { SystemOneRequest } from "@typesafe-ai/sdk";
import { describe, expect, it } from "vitest";
import { type Decider, noopDecider, type RecordChoice, resolveCpu } from "../../src";
import { cpuSnapshot } from "../records-fixture";
import { labelsAsked, scriptedDecider } from "./scripted-decider";

const cpus = cpuSnapshot(
  "Testcorp Ryzen AI Max+ 395",
  "Testcorp Ryzen AI Max+ Pro 395",
  "Testcorp Ryzen AI Max 390",
  "Testcorp Core Ultra 9 275HX",
  "Apple M4 8 Core",
  "Apple M4 10 Core",
);
const cpuDeps = {
  matcher: createCanonicalKeyMatcher(cpus),
  candidates: createCandidateIndex(cpus.records, { nameOf: (r) => r.name }),
};

describe("resolveCpu", () => {
  it("returns deterministic matches without consulting the decider", async () => {
    const { client, decider } = scriptedDecider(null);
    const result = await resolveCpu("Testcorp Core Ultra 9 275HX", { ...cpuDeps, decider });
    expect(result).toMatchObject({
      status: "matched",
      source: "deterministic",
      confidence: 1,
      record: { name: "Testcorp Core Ultra 9 275HX" },
    });
    expect(result.model).toBeUndefined();
    expect(client.requests).toHaveLength(0);
  });

  it("asks the decider over the ambiguous candidates only", async () => {
    const { client, decider } = scriptedDecider("Apple M4 10 Core", 0.88);
    const result = await resolveCpu("Apple M4", { ...cpuDeps, decider });
    expect(result).toMatchObject({
      status: "matched",
      source: "jev",
      confidence: 0.88,
      model: "typesafe/jev-1.13-20260917",
      record: { name: "Apple M4 10 Core" },
    });
    expect(labelsAsked(client)).toEqual(["Apple M4 10 Core", "Apple M4 8 Core"]);
  });

  it("keeps the ambiguity when the decider declines", async () => {
    const { decider } = scriptedDecider(null);
    const result = await resolveCpu("Apple M4", { ...cpuDeps, decider });
    expect(result.status).toBe("ambiguous");
    expect(result.source).toBe("none");
    expect(result.candidates?.map((c) => c.name)).toEqual(["Apple M4 10 Core", "Apple M4 8 Core"]);
    expect(result.record).toBeUndefined();
  });

  it("sends a vendor-less title through the candidate index to the decider", async () => {
    const title = 'OneXPlayer Super X 14" Tablet & Laptop 2-In-1 AI MAX+ 395 Water Cooled Version';
    expect(cpuDeps.matcher.match(title).status).toBe("no_match");
    const { client, decider } = scriptedDecider("Testcorp Ryzen AI Max+ 395");
    const result = await resolveCpu(title, {
      ...cpuDeps,
      decider,
      context: { product_title: title },
    });
    expect(result).toMatchObject({
      status: "matched",
      source: "jev",
      record: { name: "Testcorp Ryzen AI Max+ 395" },
    });
    expect(labelsAsked(client)).toEqual([
      "Testcorp Ryzen AI Max+ 395",
      "Testcorp Ryzen AI Max+ Pro 395",
    ]);
    expect((client.requests[0] as SystemOneRequest).state).toEqual({
      cpu_text: title,
      product_title: title,
    });
  });

  it("reports no_match when the decider picks nothing or confidence is below the threshold", async () => {
    const title = "Mystery Tablet AI MAX+ 395";
    const none = await resolveCpu(title, { ...cpuDeps, decider: scriptedDecider(null).decider });
    expect(none).toMatchObject({ status: "no_match", source: "none" });
    const weak = await resolveCpu(title, {
      ...cpuDeps,
      decider: scriptedDecider("Testcorp Ryzen AI Max+ 395", 0.6).decider,
    });
    expect(weak).toMatchObject({ status: "no_match", source: "none", confidence: 0.6 });
  });

  it("does not call the decider when the index has no candidates", async () => {
    const { client, decider } = scriptedDecider(null);
    const result = await resolveCpu("zzz qqq", { ...cpuDeps, decider });
    expect(result).toEqual({ status: "no_match", confidence: 0, source: "none" });
    expect(client.requests).toHaveLength(0);
  });

  it("caps the candidates handed to the decider", async () => {
    const { client, decider } = scriptedDecider(null);
    await resolveCpu("Apple Testcorp Ryzen Core", { ...cpuDeps, decider, maxCandidates: 2 });
    expect(labelsAsked(client)).toHaveLength(2);
  });

  it("works offline with the noop decider", async () => {
    expect(await resolveCpu("Apple M4", { ...cpuDeps, decider: noopDecider })).toMatchObject({
      status: "ambiguous",
      source: "none",
    });
    expect(
      await resolveCpu("AI MAX+ 395 tablet", { ...cpuDeps, decider: noopDecider }),
    ).toMatchObject({
      status: "no_match",
      source: "none",
    });
  });

  it("ignores a decider id that was never offered", async () => {
    const rogue: Decider = {
      ...noopDecider,
      chooseRecord: async (): Promise<RecordChoice> => ({
        chosenId: "does-not-exist",
        confidence: 0.99,
        probabilities: {},
        model: "rogue",
      }),
    };
    expect(await resolveCpu("Apple M4", { ...cpuDeps, decider: rogue })).toMatchObject({
      status: "ambiguous",
      source: "none",
    });
  });
});
