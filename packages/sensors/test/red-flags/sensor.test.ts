import { describe, expect, it } from "vitest";
import { fromDatasheet, type RamType } from "../../src/facts";
import { RED_FLAG_IDS as ID, RED_FLAGS_SENSOR_ID, redFlagsSensor } from "../../src/red-flags";
import type { DeviceClass, Signal } from "../../src/signal";
import { datasheet, ddr, LPDDR5X, type Overrides } from "../fixtures/datasheets";

const NOW = { year: 2026 };

const sense = (
  overrides: Overrides = {},
  ramType: RamType = LPDDR5X,
  deviceClass: DeviceClass = "laptop",
): Signal[] =>
  redFlagsSensor.sense({
    facts: { ...fromDatasheet(datasheet(overrides)), ramType },
    cpu: null,
    deviceClass,
    now: NOW,
  });

const ids = (signals: Signal[]): string[] => signals.map((s) => s.id);

describe("redFlagsSensor golden datasheets", () => {
  it("raises nothing for a clean modern laptop", () => {
    expect(sense()).toEqual([]);
  });

  it("raises nothing without any facts", () => {
    expect(redFlagsSensor.sense({ facts: {}, cpu: null, deviceClass: "laptop", now: NOW })).toEqual(
      [],
    );
  });

  it("describes a tripped flag fully", () => {
    expect(sense({ RAM: "4 GB" })).toEqual([
      {
        sensorId: RED_FLAGS_SENSOR_ID,
        id: ID.ramTiny,
        kind: "flag",
        severity: "red",
        label: "Very little RAM",
        detail: "4 GB is too little for current Windows and browsers.",
        evidence: [{ field: "ramGb", value: "4 GB" }],
      },
    ]);
  });

  it("stacks independent flags of an old budget laptop", () => {
    const signals = sense(
      {
        Displayauflösung: "1.366 x 768 Pixel",
        RAM: "4 GB",
        Festplattentyp: "Flash-Speicher",
        "SSD-Speicher": null,
        Festplattenspeicher: "64 GB",
        "WLAN-Standard": "IEEE 802.11ac",
        Helligkeit: "220 cd/m²",
        Wattstunden: "38 Wh",
        Markteinführung: "2020",
        Anschlüsse: "2 x USB 2.0, 1 x USB 3.0",
        Videoausgang: "HDMI 1.4",
        Betriebssystem: "Free DOS",
      },
      ddr(4),
    );
    expect(ids(signals).sort()).toEqual(
      [
        ID.displayLowRes,
        ID.ramTiny,
        ID.storageEmmc,
        ID.storageTiny,
        ID.ramTypeOutdated,
        ID.wifiOld,
        ID.displayDim,
        ID.batterySmall,
        ID.modelOld,
        ID.videoOutOld,
        ID.noOs,
      ].sort(),
    );
  });
});

/** Rows that trip exactly one flag, and the row just inside the threshold that does not. */
describe("redFlagsSensor flags and their boundaries", () => {
  it.each([
    [ID.displayLowRes, "red", { Displayauflösung: "1.920 x 1.079 Pixel" }],
    [ID.ramLow, "amber", { RAM: "8 GB" }],
    [ID.storageSmall, "amber", { "SSD-Speicher": "256 GB" }],
    [ID.wifiOld, "info", { "WLAN-Standard": "IEEE 802.11ac" }],
    [ID.displayDim, "amber", { Helligkeit: "250 cd/m²" }],
    [ID.batterySmall, "amber", { Wattstunden: "44 Wh" }],
    [ID.modelOld, "amber", { Markteinführung: "2021" }],
    [ID.usb2Only, "red", { Anschlüsse: "6 x USB 2.0, 1 x LAN (RJ45), Kopfhörerausgang" }],
    [ID.videoOutOld, "info", { Videoausgang: "HDMI 1.4" }],
    [ID.noOs, "info", { Betriebssystem: "ohne Betriebssystem" }],
    [ID.noOs, "info", { Betriebssystem: "Free DOS" }],
    [ID.storageEmmc, "red", { Festplattentyp: "Flash-Speicher" }],
    [
      ID.storageHddOnly,
      "red",
      { Festplattentyp: "HDD-Festplatte", "SSD-Speicher": null, Festplattenspeicher: "1.000 GB" },
    ],
  ] as const)("%s (%s) trips on %j alone", (id, severity, overrides) => {
    const signals = sense(overrides);
    expect(ids(signals)).toEqual([id]);
    expect(signals[0]?.severity).toBe(severity);
    expect(signals[0]?.sensorId).toBe(RED_FLAGS_SENSOR_ID);
    expect(signals[0]?.kind).toBe("flag");
    expect(signals[0]?.evidence.length).toBeGreaterThan(0);
  });

  it.each([
    { Displayauflösung: "1.920 x 1.080 Pixel" },
    { RAM: "9 GB" },
    { RAM: "12 GB" },
    { "SSD-Speicher": "257 GB" },
    { "WLAN-Standard": "IEEE 802.11ax" },
    { Helligkeit: "251 cd/m²" },
    { Wattstunden: "45 Wh" },
    { Markteinführung: "2022" },
    { Anschlüsse: "2 x USB 2.0, 1 x USB 3.2" },
    { Anschlüsse: "6 x USB 2.0, 1 x USB Typ-C" },
    { Anschlüsse: "4 x USB 2.0, 1 x Thunderbolt 4" },
    { Videoausgang: "HDMI 2.0" },
    { Videoausgang: "HDMI" },
    { Videoausgang: "HDMI 1.4, DisplayPort" },
    { Videoausgang: "HDMI 1.4, USB Typ-C" },
    { Betriebssystem: "Chrome OS" },
    { Festplattentyp: "SSHD", "SSD-Speicher": null, Festplattenspeicher: "1.000 GB" },
    { Festplattentyp: "HDD-Festplatte", "SSD-Speicher": "512 GB" },
    { Festplattentyp: null, "SSD-Speicher": null, Festplattenspeicher: "1.000 GB" },
  ])("stays quiet on %j", (overrides) => {
    expect(sense(overrides)).toEqual([]);
  });

  it("states no flag for facts it was not given", () => {
    expect(
      sense({
        Displayauflösung: null,
        RAM: null,
        "SSD-Speicher": null,
        "WLAN-Standard": null,
        Helligkeit: null,
        Wattstunden: null,
        Markteinführung: null,
        Anschlüsse: null,
        Videoausgang: null,
        Betriebssystem: null,
        Festplattentyp: null,
      }),
    ).toEqual([]);
  });
});

describe("redFlagsSensor mutually exclusive tiers", () => {
  it.each([
    [{ RAM: "2 GB" }, ID.ramTiny],
    [{ RAM: "4 GB" }, ID.ramTiny],
    [{ RAM: "5 GB" }, ID.ramLow],
    [{ "SSD-Speicher": "64 GB" }, ID.storageTiny],
    [{ "SSD-Speicher": "128 GB" }, ID.storageTiny],
    [{ "SSD-Speicher": "129 GB" }, ID.storageSmall],
  ])("%j emits only %s", (overrides, id) => {
    expect(ids(sense(overrides))).toEqual([id]);
  });

  it.each([
    [{ "WLAN-Standard": "IEEE 802.11n" }, "red"],
    [{ "WLAN-Standards": "IEEE 802.11a, IEEE 802.11b, IEEE 802.11g, IEEE 802.11n" }, "red"],
    [{ "WLAN-Standard": "IEEE 802.11ac" }, "info"],
  ] as const)("Wi-Fi %j is one %s signal", (overrides, severity) => {
    const signals = sense({ "WLAN-Standard": null, ...overrides });
    expect(ids(signals)).toEqual([ID.wifiOld]);
    expect(signals[0]?.severity).toBe(severity);
  });

  it.each([
    [ddr(2), "red"],
    [ddr(3), "red"],
    [ddr(4), "amber"],
    [{ label: "LPDDR4X", generation: 4, lowPower: true }, "amber"],
  ] as const)("%j is one %s RAM-type signal", (ramType, severity) => {
    const signals = sense({}, ramType);
    expect(ids(signals)).toEqual([ID.ramTypeOutdated]);
    expect(signals[0]?.severity).toBe(severity);
  });

  it("stays quiet for DDR5 and for no RAM type", () => {
    expect(sense({}, ddr(5))).toEqual([]);
    expect(
      redFlagsSensor.sense({
        facts: fromDatasheet(datasheet()),
        cpu: null,
        deviceClass: "laptop",
        now: NOW,
      }),
    ).toEqual([]);
  });

  it("ages a model against the injected year", () => {
    const facts = fromDatasheet(datasheet({ Markteinführung: "2024" }));
    const at = (year: number) =>
      ids(redFlagsSensor.sense({ facts, cpu: null, deviceClass: "laptop", now: { year } }));
    expect(at(2028)).toEqual([]);
    expect(at(2029)).toEqual([ID.modelOld]);
  });
});

describe("redFlagsSensor device classes", () => {
  const laptopOnly: Overrides = {
    Displayauflösung: "1.366 x 768 Pixel",
    Helligkeit: "200 cd/m²",
    Wattstunden: "30 Wh",
    Videoausgang: "HDMI 1.4",
  };

  it("raises the laptop flags for a laptop", () => {
    expect(ids(sense(laptopOnly)).sort()).toEqual(
      [ID.displayLowRes, ID.displayDim, ID.batterySmall, ID.videoOutOld].sort(),
    );
  });

  it.each(["desktop", "unknown"] as const)("skips laptop flags for a %s", (deviceClass) => {
    expect(sense(laptopOnly, LPDDR5X, deviceClass)).toEqual([]);
  });

  it.each(["laptop", "desktop", "unknown"] as const)(
    "runs the any-device flags for a %s",
    (deviceClass) => {
      const signals = sense({ RAM: "4 GB", Betriebssystem: "Free DOS" }, LPDDR5X, deviceClass);
      expect(ids(signals)).toEqual([ID.ramTiny, ID.noOs]);
    },
  );
});
