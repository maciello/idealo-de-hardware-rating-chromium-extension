import { describe, expect, it } from "vitest";
import { CPU_NAME_RULES } from "../../../src/rating/device-class/cpu/name-rules";
import { GPU_EXCLUDE_RULES } from "../../../src/rating/device-class/gpu/exclude-rules";
import { GPU_PRO_RULES } from "../../../src/rating/device-class/gpu/pro-rules";

const ids = (rules: readonly { readonly rule: string }[]) => rules.map(({ rule }) => rule);

describe("device-class rule tables", () => {
  it("keeps the CPU name rules in evaluation order: the first match decides", () => {
    expect(ids(CPU_NAME_RULES)).toEqual([
      "virtual-machine",
      "xeon-w-workstation",
      "nvidia-gb10",
      "snapdragon-x-and-compute",
      "kompanio-chromebook",
      "intel-iot-e-suffix",
      "apple-a18-pro-macbook",
      "server-atom-c",
      "atom-x-mini-pc",
      "intel-processor-n-u",
      "handheld-ryzen-z",
      "bare-core-or-android",
      "dev-board-soc",
      "phone-tablet-soc",
      "server",
      "embedded",
      "not-sold-in-de-retail",
    ]);
  });

  it("keeps the GPU exclusion rules in evaluation order, ahead of the identity parser", () => {
    expect(ids(GPU_EXCLUDE_RULES)).toEqual([
      "vgpu-profile",
      "virtual-display-adapter",
      "datacenter-accelerator",
      "mining-card",
      "engineering-sample",
      "virtualised-or-datacenter-radeon",
      "pro-display-controller",
      "windows-on-arm-and-chromebook-gpu",
      "phone-embedded-gpu",
    ]);
  });

  it("keeps the GPU workstation rules in evaluation order", () => {
    expect(ids(GPU_PRO_RULES)).toEqual([
      "nvidia-gb10",
      "radeon-ai-pro",
      "radeon-pro-mobile",
      "radeon-pro-wx",
      "radeon-pro-workstation",
      "radeon-vega-igpu",
      "quadro-rtx-3000-mobile-only",
      "quadro-mobile",
      "quadro-both-classes",
    ]);
  });

  it.each([
    ["CPU name rules", CPU_NAME_RULES],
    ["GPU exclusion rules", GPU_EXCLUDE_RULES],
    ["GPU workstation rules", GPU_PRO_RULES],
  ])("gives every rule of the %s a unique name", (_, rules) => {
    expect(new Set(ids(rules)).size).toBe(rules.length);
  });
});
