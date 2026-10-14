import type { ProductFacts } from "../facts";
import { type Evidence, type EvidenceValue, quantity } from "../signal";
import type { FlagField } from "./catalog";

const quantityOf = (
  value: number | undefined,
  unit: Parameters<typeof quantity>[1],
): EvidenceValue | undefined => (value === undefined ? undefined : quantity(value, unit));

/** How each fact reads as evidence; undefined when the product does not state it. */
const SHOWN: Readonly<Record<FlagField, (facts: ProductFacts) => EvidenceValue | undefined>> = {
  ramGb: (f) => quantityOf(f.ramGb, "GB"),
  ramType: (f) =>
    f.ramType === undefined ? undefined : { kind: "ram_type", label: f.ramType.label },
  storageGb: (f) => quantityOf(f.storageGb, "GB"),
  storageKind: (f) =>
    f.storageKind === undefined ? undefined : { kind: "storage", storage: f.storageKind },
  displayHeightPx: (f) => quantityOf(f.displayHeightPx, "px"),
  brightnessNits: (f) => quantityOf(f.brightnessNits, "nits"),
  batteryWh: (f) => quantityOf(f.batteryWh, "Wh"),
  wifiGeneration: (f) =>
    f.wifiGeneration === undefined
      ? undefined
      : { kind: "generation", family: "wifi", generation: f.wifiGeneration },
  releaseYear: (f) =>
    f.releaseYear === undefined ? undefined : { kind: "year", year: f.releaseYear },
  usbMaxGen: (f) =>
    f.usbMaxGen === undefined
      ? undefined
      : { kind: "generation", family: "usb", generation: f.usbMaxGen },
  videoOutputs: (f) =>
    f.videoOutputs === undefined ? undefined : { kind: "video_outputs", outputs: f.videoOutputs },
  osKind: (f) => (f.osKind === undefined ? undefined : { kind: "os", os: f.osKind }),
};

export const evidenceOf = (fields: readonly FlagField[], facts: ProductFacts): Evidence[] =>
  fields.flatMap((field) => {
    const value = SHOWN[field](facts);
    return value === undefined ? [] : [{ field, value }];
  });
