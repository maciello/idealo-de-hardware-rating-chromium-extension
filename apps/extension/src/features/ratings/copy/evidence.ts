import type { EvidenceField, OsKind, StorageKind } from "@idealo-hw/sensors";

/** Evidence fields that read differently from their key; any other field is shown as its key. */
const FIELD_LABELS: Readonly<Partial<Record<EvidenceField, string>>> = {
  tdp: "TDP",
  tdpSource: "TDP source",
};

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

/** The tooltip lines of a signal's evidence: "<field>: <value>". */
export const EVIDENCE_COPY = {
  fieldLabels: FIELD_LABELS,
  line: (field: string, value: string): string => `${field}: ${value}`,
  separator: " · ",
  quantity: (amount: string, unit: string): string => `${amount} ${unit}`,
  generation: { wifi: (n: number): string => `Wi-Fi ${n}`, usb: (n: number): string => `USB ${n}` },
  storage: STORAGE_NAMES,
  os: OS_NAMES,
  answer: { yes: "yes", no: "no" },
  outputs: {
    hdmi: "HDMI",
    hdmiVersion: (version: number): string => `HDMI ${version}`,
    usb_c: "USB-C",
    displayport: "DisplayPort",
    thunderbolt: "Thunderbolt",
    vga: "VGA",
    dvi: "DVI",
    separator: ", ",
  },
} as const;
