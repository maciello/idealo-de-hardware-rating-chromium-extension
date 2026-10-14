import { describe, expect, it } from "vitest";
import { fromDatasheet } from "../../src/facts";
import type { DeviceClass, Signal } from "../../src/signal";
import { WEBCAM_SIGNAL_IDS as ID, WEBCAM_SENSOR_ID, webcamSensor } from "../../src/webcam/sensor";
import { datasheet, type Overrides } from "../fixtures/datasheets";

const sense = (rows: Overrides, deviceClass: DeviceClass = "laptop"): Signal[] =>
  webcamSensor.sense({
    facts: fromDatasheet(datasheet({ Kameraauflösung: null, ...rows })),
    cpu: null,
    deviceClass,
    now: { year: 2026 },
  });

const ids = (signals: Signal[]): string[] => signals.map((s) => s.id);

describe("webcamSensor", () => {
  it.each([
    [{ Kameraauflösung: "1920 x 1080 Pixel" }, [ID.fullHd]],
    [{ Kameraauflösung: "2.560 x 1.440 Pixel" }, [ID.fullHd]],
    [{ Kameraauflösung: "1280 x 1.079 Pixel" }, []],
    [{ Kameraauflösung: "1280 x 720 Pixel" }, [ID.low]],
    [{ Kameraauflösung: "1280 x 721 Pixel" }, []],
    [{ Kameraauflösung: "640 x 480 Pixel" }, [ID.low]],
    [{ Webcam: "2.0 Megapixel" }, [ID.fullHd]],
    [{ Webcam: "1.9 Megapixel" }, []],
    [{ Webcam: "5.0 Megapixel" }, [ID.fullHd]],
    [{ Webcam: "integriert" }, []],
    [{ Kamerafunktion: "HD-fähig" }, []],
  ])("%j gives %j", (rows, expected) => {
    expect(ids(sense(rows))).toEqual(expected);
  });

  it("badges an IR camera", () => {
    const signals = sense({ Ausstattung: "Fingerabdruckleser, IR-Kamera" });
    expect(ids(signals)).toEqual([ID.ir]);
    expect(signals[0]).toMatchObject({
      sensorId: WEBCAM_SENSOR_ID,
      kind: "badge",
      severity: "info",
      label: "IR camera",
    });
  });

  it("badges a sharp IR camera twice, sharp first", () => {
    expect(
      ids(sense({ Kameraauflösung: "1920 x 1080 Pixel", Kamerafunktion: "IR-Kamera" })),
    ).toEqual([ID.fullHd, ID.ir]);
  });

  it("describes the sharp badge with its evidence", () => {
    expect(sense({ Kameraauflösung: "1920 x 1080 Pixel" })).toEqual([
      {
        sensorId: WEBCAM_SENSOR_ID,
        id: ID.fullHd,
        kind: "badge",
        severity: "info",
        label: "1080p+ webcam",
        detail: "Sharp video calls.",
        evidence: [{ field: "webcam.heightPx", value: "1080 px" }],
      },
    ]);
  });

  it("flags a 720p laptop camera as info", () => {
    const [signal] = sense({ Kameraauflösung: "1280 x 720 Pixel" });
    expect(signal).toMatchObject({ id: ID.low, kind: "flag", severity: "info" });
  });

  it("flags a laptop whose datasheet says it has no webcam", () => {
    const [signal] = sense({ Webcam: "nein" });
    expect(signal).toMatchObject({
      id: ID.none,
      kind: "flag",
      severity: "amber",
      label: "No webcam",
    });
  });

  it("never infers a missing webcam from silence", () => {
    expect(sense({})).toEqual([]);
    expect(sense({ Ausstattung: "Fingerabdruckleser" })).toEqual([]);
  });

  it("says nothing about cameras on a desktop", () => {
    for (const rows of [
      { Webcam: "nein" },
      { Kameraauflösung: "1920 x 1080 Pixel" },
      { Kameraauflösung: "1280 x 720 Pixel" },
      { Kamerafunktion: "IR-Kamera" },
    ])
      expect(sense(rows, "desktop")).toEqual([]);
  });

  it("badges but never flags a camera of an unknown device class", () => {
    expect(ids(sense({ Kameraauflösung: "1920 x 1080 Pixel" }, "unknown"))).toEqual([ID.fullHd]);
    expect(sense({ Kameraauflösung: "1280 x 720 Pixel" }, "unknown")).toEqual([]);
    expect(sense({ Webcam: "nein" }, "unknown")).toEqual([]);
  });
});
