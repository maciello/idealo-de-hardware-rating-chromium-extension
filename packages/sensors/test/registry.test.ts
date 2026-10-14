import { describe, expect, it } from "vitest";
import { SENSORS, senseAll } from "../src/registry";
import type { Sensor, SensorInput, Signal } from "../src/signal";

const NOW = { year: 2026 };

const input: SensorInput = {
  facts: { cpuTdpWatts: 9 },
  cpu: null,
  deviceClass: "laptop",
  now: NOW,
};

const signal = (sensorId: string): Signal => ({
  sensorId,
  id: `${sensorId}.x`,
  kind: "flag",
  severity: "amber",
  label: sensorId,
  detail: "",
  evidence: [],
});

describe("senseAll", () => {
  it("runs the registered sensors", () => {
    expect(SENSORS.map((s) => s.id)).toEqual(["power", "red_flags", "webcam"]);
    expect(senseAll(input).map((s) => s.id)).toEqual(["power.very_low"]);
  });

  it("concatenates signals in sensor order", () => {
    const sensors: Sensor[] = [
      { id: "a", sense: () => [signal("a")] },
      { id: "b", sense: () => [] },
      { id: "c", sense: () => [signal("c"), signal("c2")] },
    ];
    expect(senseAll(input, sensors).map((s) => s.sensorId)).toEqual(["a", "c", "c2"]);
  });

  it("reports nothing when no sensor has anything to say", () => {
    expect(senseAll({ facts: {}, cpu: null, deviceClass: "unknown", now: NOW })).toEqual([]);
  });
});
