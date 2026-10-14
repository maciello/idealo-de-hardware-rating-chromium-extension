import type { OsKind, ProductFacts, StorageKind, VideoOutput } from "../facts";
import type { Evidence } from "../signal";
import type { FlagField } from "./catalog";

const STORAGE_NAMES: Readonly<Record<StorageKind, string>> = {
  ssd: "SSD",
  hdd: "HDD",
  hybrid: "Hybrid (SSHD)",
  emmc: "eMMC",
};

const OS_NAMES: Readonly<Record<OsKind, string>> = {
  windows: "Windows",
  macos: "macOS",
  chromeos: "Chrome OS",
  linux: "Linux",
  none: "None",
};

const outputName = (output: VideoOutput): string => {
  switch (output.kind) {
    case "hdmi":
      return output.version === null ? "HDMI" : `HDMI ${output.version}`;
    case "usb_c":
      return "USB-C";
    case "displayport":
      return "DisplayPort";
    case "thunderbolt":
      return "Thunderbolt";
    case "vga":
      return "VGA";
    case "dvi":
      return "DVI";
  }
};

const shown = (value: number | undefined, before: string, after: string): string | undefined =>
  value === undefined ? undefined : `${before}${value}${after}`;

/** How each fact reads as evidence; undefined when the product does not state it. */
const SHOWN: Readonly<Record<FlagField, (facts: ProductFacts) => string | undefined>> = {
  ramGb: (f) => shown(f.ramGb, "", " GB"),
  ramType: (f) => f.ramType?.label,
  storageGb: (f) => shown(f.storageGb, "", " GB"),
  storageKind: (f) => (f.storageKind === undefined ? undefined : STORAGE_NAMES[f.storageKind]),
  displayHeightPx: (f) => shown(f.displayHeightPx, "", " px"),
  brightnessNits: (f) => shown(f.brightnessNits, "", " nits"),
  batteryWh: (f) => shown(f.batteryWh, "", " Wh"),
  wifiGeneration: (f) => shown(f.wifiGeneration, "Wi-Fi ", ""),
  releaseYear: (f) => shown(f.releaseYear, "", ""),
  usbMaxGen: (f) => shown(f.usbMaxGen, "USB ", ""),
  videoOutputs: (f) => f.videoOutputs?.map(outputName).join(", "),
  osKind: (f) => (f.osKind === undefined ? undefined : OS_NAMES[f.osKind]),
};

export const evidenceOf = (fields: readonly FlagField[], facts: ProductFacts): Evidence[] =>
  fields.flatMap((field) => {
    const value = SHOWN[field](facts);
    return value === undefined ? [] : [{ field, value }];
  });
