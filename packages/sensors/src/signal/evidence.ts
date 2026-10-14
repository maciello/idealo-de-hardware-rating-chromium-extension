import type { OsKind, ProductFacts, StorageKind, VideoOutput } from "../facts";

/** The unit of a measured quantity. */
export type EvidenceUnit = "GB" | "px" | "nits" | "Wh" | "W" | "MP";

/** One fact as the sensor read it: exact numbers and kinds, never display text. */
export type EvidenceValue =
  | { readonly kind: "quantity"; readonly amount: number; readonly unit: EvidenceUnit }
  | { readonly kind: "generation"; readonly family: "wifi" | "usb"; readonly generation: number }
  | { readonly kind: "year"; readonly year: number }
  | { readonly kind: "ram_type"; readonly label: string }
  | { readonly kind: "storage"; readonly storage: StorageKind }
  | { readonly kind: "os"; readonly os: OsKind }
  | { readonly kind: "video_outputs"; readonly outputs: readonly VideoOutput[] }
  | { readonly kind: "answer"; readonly yes: boolean }
  | { readonly kind: "tdp_source"; readonly source: "datasheet" | "benchmark" };

/** What the evidence is about: a product fact, the CPU's TDP, or a part of the camera. */
export type EvidenceField =
  | Exclude<keyof ProductFacts, "cpuTdpWatts" | "webcam">
  | "tdp"
  | "tdpSource"
  | "webcam.present"
  | "webcam.heightPx"
  | "webcam.megapixels"
  | "webcam.irCamera";

export interface Evidence {
  readonly field: EvidenceField;
  readonly value: EvidenceValue;
}

export const quantity = (amount: number, unit: EvidenceUnit): EvidenceValue => ({
  kind: "quantity",
  amount,
  unit,
});
