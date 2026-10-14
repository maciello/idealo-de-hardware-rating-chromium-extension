import { describe, expect, it } from "vitest";
import { POWER_SIGNAL_IDS, powerSensor } from "../../../src/sensors/power/sensor";
import type { DeviceClass, SensorCpu, SensorInput } from "../../../src/signal";

const NOW = { year: 2026 };

const cpu = (overrides: Partial<SensorCpu> = {}): SensorCpu => ({
  name: "Test CPU",
  cpuMark: 9180,
  tdpWatts: null,
  releaseYear: 2024,
  ...overrides,
});

const input = (
  deviceClass: DeviceClass,
  tdpWatts: number | null,
  rest: Partial<SensorInput> = {},
): SensorInput => ({
  facts: {},
  cpu: cpu({ tdpWatts }),
  deviceClass,
  now: NOW,
  ...rest,
});

const idsOf = (i: SensorInput): string[] => powerSensor.sense(i).map((s) => s.id);

describe("powerSensor boundaries", () => {
  it.each([
    ["laptop", 9, [POWER_SIGNAL_IDS.veryLow]],
    ["laptop", 10, []],
    ["laptop", 54, []],
    ["laptop", 55, [POWER_SIGNAL_IDS.veryHigh]],
    ["desktop", 35, [POWER_SIGNAL_IDS.veryLow]],
    ["desktop", 36, []],
    ["desktop", 169, []],
    ["desktop", 170, [POWER_SIGNAL_IDS.veryHigh]],
  ] as const)("%s at %i W emits %j", (deviceClass, watts, expected) => {
    expect(idsOf(input(deviceClass, watts))).toEqual(expected);
  });

  it("emits nothing for the middle of either class", () => {
    expect(idsOf(input("laptop", 28))).toEqual([]);
    expect(idsOf(input("desktop", 65))).toEqual([]);
  });

  it.each([5, 28, 65, 200])("emits nothing for an unknown device class at %i W", (watts) => {
    expect(idsOf(input("unknown", watts))).toEqual([]);
  });
});

describe("powerSensor TDP source", () => {
  it("prefers the datasheet TDP over the benchmark TDP", () => {
    const [signal] = powerSensor.sense({
      facts: { cpuTdpWatts: 9 },
      cpu: cpu({ tdpWatts: 45 }),
      deviceClass: "laptop",
      now: NOW,
    });
    expect(signal?.id).toBe(POWER_SIGNAL_IDS.veryLow);
    expect(signal?.evidence).toEqual([
      { field: "tdp", value: { kind: "quantity", amount: 9, unit: "W" } },
      { field: "tdpSource", value: { kind: "tdp_source", source: "datasheet" } },
    ]);
  });

  it("lets a middle datasheet TDP override an extreme benchmark TDP", () => {
    expect(
      idsOf({
        facts: { cpuTdpWatts: 28 },
        cpu: cpu({ tdpWatts: 65 }),
        deviceClass: "laptop",
        now: NOW,
      }),
    ).toEqual([]);
  });

  it("falls back to the benchmark TDP and says so", () => {
    const [signal] = powerSensor.sense(input("desktop", 170));
    expect(signal?.evidence).toEqual([
      { field: "tdp", value: { kind: "quantity", amount: 170, unit: "W" } },
      { field: "tdpSource", value: { kind: "tdp_source", source: "benchmark" } },
    ]);
  });

  it("uses a datasheet TDP when no benchmark CPU matched", () => {
    expect(
      idsOf({ facts: { cpuTdpWatts: 9 }, cpu: null, deviceClass: "laptop", now: NOW }),
    ).toEqual([POWER_SIGNAL_IDS.veryLow]);
  });

  it.each([
    ["neither source has a TDP", { facts: {}, cpu: cpu() }],
    ["no CPU and no facts", { facts: {}, cpu: null }],
    ["a zero benchmark TDP", { facts: {}, cpu: cpu({ tdpWatts: 0 }) }],
    ["a zero datasheet TDP and no benchmark TDP", { facts: { cpuTdpWatts: 0 }, cpu: cpu() }],
  ] as const)("emits nothing when %s", (_name, rest) => {
    expect(idsOf({ ...rest, deviceClass: "laptop", now: NOW })).toEqual([]);
  });
});

describe("powerSensor signal content", () => {
  it("describes a very low TDP with its efficiency", () => {
    expect(powerSensor.sense(input("laptop", 9))).toEqual([
      {
        sensorId: "power",
        id: "power.very_low",
        kind: "badge",
        severity: "info",
        params: { tdpWatts: 9, cpuMarkPerWatt: 1020 },
        evidence: [
          { field: "tdp", value: { kind: "quantity", amount: 9, unit: "W" } },
          { field: "tdpSource", value: { kind: "tdp_source", source: "benchmark" } },
        ],
      },
    ]);
  });

  it("describes a very high TDP with its exact efficiency", () => {
    const [signal] = powerSensor.sense({
      facts: {},
      cpu: cpu({ cpuMark: 45000, tdpWatts: 55 }),
      deviceClass: "laptop",
      now: NOW,
    });
    expect(signal?.id).toBe(POWER_SIGNAL_IDS.veryHigh);
    expect(signal?.params).toEqual({ tdpWatts: 55, cpuMarkPerWatt: 45000 / 55 });
  });

  it("leaves the efficiency out when the CPU Mark is unknown", () => {
    const [signal] = powerSensor.sense({
      facts: { cpuTdpWatts: 9 },
      cpu: null,
      deviceClass: "laptop",
      now: NOW,
    });
    expect(signal?.params).toEqual({ tdpWatts: 9, cpuMarkPerWatt: null });
  });
});
