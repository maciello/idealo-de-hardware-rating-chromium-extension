import type { Signal } from "@idealo-hw/sensors";
import { describe, expect, it } from "vitest";
import { signalsOf } from "../../../../../src/features/ratings/model";
import {
  cardViewOf,
  chipViewOf,
  signalsCardOf,
  signalsChipModel,
} from "../../../../../src/features/ratings/view-model";

const signalsFor = (datasheet: string, text = ""): readonly Signal[] =>
  signalsOf(
    { title: "Notebook", text, formFactor: "laptop", datasheet },
    { status: "no_match" },
    {
      year: 2026,
    },
  );

const NONE = signalsFor("");
const INFO_ONLY = signalsFor("Kameraauflösung\t1920 x 1080 Pixel\nWLAN-Standard\tIEEE 802.11ac");
const AMBER = signalsFor("RAM\t8 GB");
const RED = signalsFor("RAM\t4 GB\nSSD-Speicher\t128 GB");

const POWER_BADGE: Signal = {
  sensorId: "power",
  id: "power.very_low",
  kind: "badge",
  severity: "info",
  label: "Very low power",
  detail: "9 W TDP",
  evidence: [],
};

describe("signalsChipModel", () => {
  it("has nothing to draw without signals", () => {
    expect(signalsChipModel(NONE)).toBeNull();
    expect(signalsChipModel([])).toBeNull();
  });

  it("never draws info signals, webcam badges included", () => {
    expect(INFO_ONLY.map((s) => s.severity)).toEqual(["info", "info"]);
    expect(INFO_ONLY.map((s) => s.kind).sort()).toEqual(["badge", "flag"]);
    expect(signalsChipModel(INFO_ONLY)).toBeNull();
    expect(signalsChipModel([POWER_BADGE])).toBeNull();
  });

  it("counts an amber flag and names it", () => {
    expect(signalsChipModel(AMBER)).toEqual({
      memory: null,
      flags: { count: 1, severity: "amber", label: "1 flag, worst amber: Low RAM" },
      aria: ["1 flag, worst amber: Low RAM"],
    });
  });

  it("colours the count by the worst severity and counts red and amber only", () => {
    const model = signalsChipModel([...RED, ...AMBER]);
    expect(model?.flags).toEqual({
      count: 3,
      severity: "red",
      label: "3 flags, worst red: Very little RAM, Very little storage, Low RAM",
    });
  });

  it("shows the older-memory tag instead of counting its flag", () => {
    const ddr4 = signalsFor("", "Intel Core i7-13700H, DDR4");
    expect(ddr4.map((s) => s.id)).toEqual(["red_flags.ram_type_outdated"]);
    expect(signalsChipModel(ddr4)).toEqual({
      memory: { text: "DDR4", title: "Older memory generation" },
      flags: null,
      aria: ["DDR4: older memory generation"],
    });
    const both = signalsChipModel([...ddr4, ...AMBER]);
    expect(both?.memory?.text).toBe("DDR4");
    expect(both?.flags?.count).toBe(1);
    expect(both?.aria).toEqual(["DDR4: older memory generation", "1 flag, worst amber: Low RAM"]);
  });
});

describe("chipViewOf with signals", () => {
  it("draws a chip for a product whose only news is a red flag", () => {
    const view = chipViewOf(null, null, "raw_multithread_score", RED);
    expect(view).toMatchObject({ cpu: null, gpuModel: null, status: "signals" });
    expect(view?.aria).toBe(
      "2 flags, worst red: Very little RAM, Very little storage. Show details",
    );
  });

  it("draws nothing for info signals alone", () => {
    expect(chipViewOf(null, null, "raw_multithread_score", INFO_ONLY)).toBeNull();
  });

  it("adds the flags sentence after the CPU line in the accessible name", () => {
    const ambiguous = { status: "ambiguous", candidates: [{ id: 4, name: "A" }] } as never;
    const view = chipViewOf(ambiguous, null, "raw_multithread_score", AMBER);
    expect(view?.status).toBe("ambiguous");
    expect(view?.aria).toBe(
      "CPU: several PassMark matches. 1 flag, worst amber: Low RAM. Show details",
    );
  });
});

describe("signalsCardOf", () => {
  it("lists red, amber and info flags worst first with label, detail and evidence", () => {
    const { flags } = signalsCardOf([...INFO_ONLY, ...AMBER, ...RED]);
    expect(flags.map((f) => [f.id, f.severity])).toEqual([
      ["red_flags.ram_tiny", "red"],
      ["red_flags.storage_tiny", "red"],
      ["red_flags.ram_low", "amber"],
      ["red_flags.wifi_old", "info"],
    ]);
    expect(flags[0]).toEqual({
      id: "red_flags.ram_tiny",
      severity: "red",
      severityLabel: "Red",
      label: "Very little RAM",
      detail: "4 GB is too little for current Windows and browsers.",
      title: "ramGb: 4 GB",
    });
  });

  it("puts webcam badges under features and leaves the power badge to the CPU rows", () => {
    const { features, flags } = signalsCardOf([POWER_BADGE, ...INFO_ONLY]);
    expect(features).toEqual([
      { id: "webcam.full_hd", label: "1080p+ webcam", title: "Sharp video calls." },
    ]);
    expect(flags.map((f) => f.id)).toEqual(["red_flags.wifi_old"]);
  });

  it("has empty sections for a product with nothing to say", () => {
    expect(signalsCardOf(NONE)).toEqual({ flags: [], features: [] });
    expect(cardViewOf(null, null, NONE, null).signals).toEqual({ flags: [], features: [] });
  });
});
