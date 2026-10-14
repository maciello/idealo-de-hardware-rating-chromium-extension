import { passmarkCpuSource } from "@idealo-hw/hw-bench";
import { describe, expect, it } from "vitest";
import { deviceClassOf, sensorInputOf } from "../../../../../src/features/ratings/model/cpu";

describe("deviceClassOf", () => {
  it.each([
    ["laptop", "Intel Core i5-13400"],
    ["desktop", "Intel Core i9-13900HX"],
  ] as const)("lets the %s page decide over the CPU's own class", (formFactor, name) => {
    expect(deviceClassOf(formFactor, name)).toBe(formFactor);
  });

  it("uses the class only one set claims when the page does not say", () => {
    expect(deviceClassOf("unknown", "Qualcomm Snapdragon X Elite X1E-78-100")).toBe("laptop");
    expect(deviceClassOf("unknown", "Intel Core i5-13400")).toBe("desktop");
  });

  it("stays unknown for a CPU in both sets or in neither", () => {
    expect(deviceClassOf("unknown", "AMD Ryzen 7 7840HS")).toBe("unknown");
    expect(deviceClassOf("unknown", "Intel Core i9-13900HX")).toBe("unknown");
    expect(deviceClassOf("unknown", "Qualcomm Snapdragon 8 Gen 2")).toBe("unknown");
  });
});

describe("sensorInputOf", () => {
  const [record] = passmarkCpuSource.parse(
    JSON.stringify({
      data: [
        {
          id: "1",
          name: "Intel Core i9-13900HX",
          cpumark: "45,000",
          thread: "4,100",
          tdp: "55",
          date: "Jan 2023",
          cat: "Laptop",
        },
      ],
    }),
  ).records;

  it("maps the benchmark record onto the sensor input", () => {
    if (record === undefined) throw new Error("expected a record");
    expect(sensorInputOf(record, "unknown", { year: 2026 })).toEqual({
      facts: {},
      cpu: { name: "Intel Core i9-13900HX", cpuMark: 45000, tdpWatts: 55, releaseYear: 2023 },
      deviceClass: "unknown",
      now: { year: 2026 },
    });
    expect(sensorInputOf(record, "laptop", { year: 2026 }).deviceClass).toBe("laptop");
  });
});
