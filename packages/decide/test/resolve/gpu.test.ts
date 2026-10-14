import { createCandidateIndex, createGpuMatcher } from "@idealo-hw/hw-bench";
import type { SystemOneRequest } from "@typesafe-ai/sdk";
import { describe, expect, it } from "vitest";
import { noopDecider, resolveGpu } from "../../src";
import { gpuSnapshot } from "../records-fixture";
import { labelsAsked, scriptedDecider } from "./scripted-decider";

const gpus = gpuSnapshot(
  ["GeForce RTX 9080", "Desktop", "36,001"],
  ["GeForce RTX 9080 Laptop GPU", "Mobile", "26,002"],
  ["Radeon 9060S", "Desktop", "18,013"],
  ["Quadro Z1000 Mobile Edition", "Mobile", "2,019"],
);
const gpuDeps = {
  matcher: createGpuMatcher(gpus),
  candidates: createCandidateIndex(gpus.records, { nameOf: (r) => r.name }),
};

describe("resolveGpu", () => {
  it("resolves laptop and desktop variants deterministically", async () => {
    const { client, decider } = scriptedDecider(null);
    expect(
      await resolveGpu("NVIDIA GeForce RTX 9080", "laptop", { ...gpuDeps, decider }),
    ).toMatchObject({
      status: "matched",
      source: "deterministic",
      record: { name: "GeForce RTX 9080 Laptop GPU" },
    });
    expect(
      await resolveGpu("NVIDIA GeForce RTX 9080", "desktop", { ...gpuDeps, decider }),
    ).toMatchObject({
      record: { name: "GeForce RTX 9080" },
    });
    expect(await resolveGpu("AMD Radeon 9060S", "laptop", { ...gpuDeps, decider })).toMatchObject({
      record: { name: "Radeon 9060S" },
    });
    expect(client.requests).toHaveLength(0);
  });

  it("asks the decider with both variants and the form factor when it is unknown", async () => {
    const { client, decider } = scriptedDecider("GeForce RTX 9080 Laptop GPU [mobile]");
    const result = await resolveGpu("NVIDIA GeForce RTX 9080", "unknown", {
      ...gpuDeps,
      decider,
      context: { product_title: "Gaming Notebook 16 Zoll" },
    });
    expect(result).toMatchObject({
      status: "matched",
      source: "jev",
      record: { name: "GeForce RTX 9080 Laptop GPU" },
    });
    expect(labelsAsked(client)).toEqual(
      ["GeForce RTX 9080 Laptop GPU [mobile]", "GeForce RTX 9080 [desktop]"].sort(),
    );
    expect((client.requests[0] as SystemOneRequest).state).toEqual({
      gpu_text: "NVIDIA GeForce RTX 9080",
      form_factor: "unknown",
      product_title: "Gaming Notebook 16 Zoll",
    });
  });

  it("uses the candidate index for unrecognised GPU text", async () => {
    const { client, decider } = scriptedDecider("Quadro Z1000 Mobile Edition [mobile]");
    const result = await resolveGpu("Quadro Z1000 OC", "laptop", { ...gpuDeps, decider });
    expect(result).toMatchObject({ status: "matched", source: "jev" });
    expect(client.requests).toHaveLength(1);
  });

  it("stays ambiguous offline", async () => {
    expect(
      await resolveGpu("GeForce RTX 9080", "unknown", { ...gpuDeps, decider: noopDecider }),
    ).toMatchObject({ status: "ambiguous", source: "none" });
  });
});
