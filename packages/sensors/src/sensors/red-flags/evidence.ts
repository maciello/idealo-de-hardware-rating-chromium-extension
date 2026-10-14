import type { ProductFacts } from "../../facts";
import { type Evidence, type EvidenceUnit, type EvidenceValue, quantity } from "../../signal";
import type { FlagField } from "./catalog";

/** The evidence for a fact the product states; undefined when it does not. */
const stated = <T>(
  value: T | undefined,
  evidence: (value: T) => EvidenceValue,
): EvidenceValue | undefined => (value === undefined ? undefined : evidence(value));

const amount = (value: number | undefined, unit: EvidenceUnit): EvidenceValue | undefined =>
  stated(value, (v) => quantity(v, unit));

/** How each fact reads as evidence; undefined when the product does not state it. */
const SHOWN: Readonly<Record<FlagField, (facts: ProductFacts) => EvidenceValue | undefined>> = {
  ramGb: (f) => amount(f.ramGb, "GB"),
  ramType: (f) => stated(f.ramType, ({ label }) => ({ kind: "ram_type", label })),
  storageGb: (f) => amount(f.storageGb, "GB"),
  storageKind: (f) => stated(f.storageKind, (storage) => ({ kind: "storage", storage })),
  displayHeightPx: (f) => amount(f.displayHeightPx, "px"),
  brightnessNits: (f) => amount(f.brightnessNits, "nits"),
  batteryWh: (f) => amount(f.batteryWh, "Wh"),
  wifiGeneration: (f) =>
    stated(f.wifiGeneration, (generation) => ({ kind: "generation", family: "wifi", generation })),
  releaseYear: (f) => stated(f.releaseYear, (year) => ({ kind: "year", year })),
  usbMaxGen: (f) =>
    stated(f.usbMaxGen, (generation) => ({ kind: "generation", family: "usb", generation })),
  videoOutputs: (f) => stated(f.videoOutputs, (outputs) => ({ kind: "video_outputs", outputs })),
  osKind: (f) => stated(f.osKind, (os) => ({ kind: "os", os })),
};

export const evidenceOf = (fields: readonly FlagField[], facts: ProductFacts): Evidence[] =>
  fields.flatMap((field) => {
    const value = SHOWN[field](facts);
    return value === undefined ? [] : [{ field, value }];
  });
