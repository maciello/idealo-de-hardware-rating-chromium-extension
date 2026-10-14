import type { RuleContext } from "./catalog";
import { type FlagId, RED_FLAG_IDS as ID } from "./ids";
import { RED_FLAG_THRESHOLDS as T } from "./thresholds";

/** The one place that fixes how numbers read. */
const NUMBER = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
const n = (value: number | undefined): string => (value === undefined ? "?" : NUMBER.format(value));

export interface FlagCopy {
  label: string;
  detail(context: RuleContext): string;
}

export const FLAG_COPY: Readonly<Record<FlagId, FlagCopy>> = {
  [ID.displayLowRes]: {
    label: "Low-res screen",
    detail: ({ facts }) =>
      `Panel is ${n(facts.displayHeightPx)} px tall; Full HD (${n(T.display.minHeightPx)} px) is the usual minimum.`,
  },
  [ID.ramTiny]: {
    label: "Very little RAM",
    detail: ({ facts }) => `${n(facts.ramGb)} GB is too little for current Windows and browsers.`,
  },
  [ID.ramLow]: {
    label: "Low RAM",
    detail: ({ facts }) => `${n(facts.ramGb)} GB covers basic use but leaves no room to grow.`,
  },
  [ID.storageEmmc]: {
    label: "eMMC storage",
    detail: () => "Soldered eMMC flash is slower than an SSD and cannot be swapped.",
  },
  [ID.storageHddOnly]: {
    label: "Hard drive only",
    detail: () => "A spinning hard drive and no SSD: slow to boot and to open anything.",
  },
  [ID.storageTiny]: {
    label: "Very little storage",
    detail: ({ facts }) => `${n(facts.storageGb)} GB fills up quickly with the system and updates.`,
  },
  [ID.storageSmall]: {
    label: "Small storage",
    detail: ({ facts }) => `${n(facts.storageGb)} GB is workable but tight.`,
  },
  [ID.ramTypeOutdated]: {
    label: "Outdated RAM type",
    detail: ({ facts }) =>
      `${facts.ramType?.label ?? "This memory"} is older than DDR${T.ram.typeCurrentGeneration}.`,
  },
  [ID.wifiOld]: {
    label: "Old Wi-Fi",
    detail: ({ facts }) =>
      `Wi-Fi ${n(facts.wifiGeneration)} is behind Wi-Fi ${n(T.wifi.currentGeneration)} in speed and range.`,
  },
  [ID.displayDim]: {
    label: "Dim screen",
    detail: ({ facts }) => `${n(facts.brightnessNits)} nits is hard to read in a bright room.`,
  },
  [ID.batterySmall]: {
    label: "Small battery",
    detail: ({ facts }) => `${n(facts.batteryWh)} Wh gives a short runtime.`,
  },
  [ID.modelOld]: {
    label: "Old model",
    detail: ({ facts, now }) =>
      `Released in ${facts.releaseYear ?? "an unknown year"}, ${n(now.year - (facts.releaseYear ?? now.year))} years ago.`,
  },
  [ID.usb2Only]: {
    label: "USB 2 only",
    detail: () => "No faster ports: slow for external drives and docks.",
  },
  [ID.videoOutOld]: {
    label: "Old video output",
    detail: () => "HDMI 1.4 caps a 4K display at 30 Hz.",
  },
  [ID.noOs]: {
    label: "No operating system",
    detail: () => "Ships without Windows; budget for a license or install your own.",
  },
};
