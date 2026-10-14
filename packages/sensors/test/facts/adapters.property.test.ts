import fc from "fast-check";
import { describe, it } from "vitest";
import { fromCharacteristics, fromDatasheet } from "../../src/facts";

const LABELS = [
  "Displayauflösung",
  "Display-Technologie",
  "RAM",
  "SSD-Speicher",
  "Festplattentyp",
  "WLAN-Standards",
  "Helligkeit",
  "Wattstunden",
  "Markteinführung",
  "Anschlüsse",
  "Videoausgang",
  "Betriebssystem",
  "Kameraauflösung",
  "Webcam",
  "Kamerafunktion",
  "Ausstattung",
];

/** Strings that look like datasheet values: digits, units, separators and the odd word. */
const valueLike = fc
  .array(
    fc.oneof(
      fc.string({ maxLength: 12 }),
      fc.constantFrom(
        "GB",
        "TB",
        "x",
        ".",
        ",",
        " ",
        "802.11",
        "ax",
        "USB",
        "HDMI",
        "1.4",
        "Wh",
        "Megapixel",
        "Webcam",
        "IR-Kamera",
      ),
      fc.nat(5000).map(String),
    ),
    { maxLength: 12 },
  )
  .map((parts) => parts.join(""));

describe("adapters never throw", () => {
  it("fromDatasheet on arbitrary maps", () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string({ maxLength: 20 }), fc.string()), (rows) => {
        fromDatasheet(new Map(Object.entries(rows)));
      }),
    );
  });

  it("fromDatasheet on known labels with value-like text", () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.constantFrom(...LABELS), valueLike)), (rows) => {
        fromDatasheet(new Map(rows));
      }),
    );
  });

  it("fromCharacteristics on arbitrary strings", () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (values) => {
        fromCharacteristics(values);
      }),
    );
  });

  it("fromCharacteristics on value-like text", () => {
    fc.assert(
      fc.property(fc.array(valueLike), (values) => {
        fromCharacteristics(values);
      }),
    );
  });

  it("only ever states positive numbers", () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.constantFrom(...LABELS), valueLike)), (rows) => {
        const facts = fromDatasheet(new Map(rows));
        const numbers = [
          facts.ramGb,
          facts.storageGb,
          facts.displayHeightPx,
          facts.brightnessNits,
          facts.batteryWh,
          facts.wifiGeneration,
          facts.releaseYear,
          facts.usbMaxGen,
          facts.webcam?.present ? facts.webcam.heightPx : undefined,
          facts.webcam?.present ? facts.webcam.megapixels : undefined,
        ].filter((value) => value !== undefined);
        return numbers.every((value) => Number.isFinite(value) && value > 0);
      }),
    );
  });
});
