import {
  RED_FLAG_IDS as FLAG,
  POWER_SIGNAL_IDS as POWER,
  type SignalId,
  WEBCAM_SIGNAL_IDS as WEBCAM,
} from "@idealo-hw/sensors";

/** Name of each signal, by id. */
export const SIGNAL_LABELS: Readonly<Record<SignalId, string>> = {
  [POWER.veryLow]: "Very low power",
  [POWER.veryHigh]: "Very high power",
  [FLAG.displayLowRes]: "Low-res screen",
  [FLAG.ramTiny]: "Very little RAM",
  [FLAG.ramLow]: "Low RAM",
  [FLAG.storageEmmc]: "eMMC storage",
  [FLAG.storageHddOnly]: "Hard drive only",
  [FLAG.storageTiny]: "Very little storage",
  [FLAG.storageSmall]: "Small storage",
  [FLAG.ramTypeOutdated]: "Outdated RAM type",
  [FLAG.wifiOld]: "Old Wi-Fi",
  [FLAG.displayDim]: "Dim screen",
  [FLAG.batterySmall]: "Small battery",
  [FLAG.modelOld]: "Old model",
  [FLAG.usb2Only]: "USB 2 only",
  [FLAG.videoOutOld]: "Old video output",
  [FLAG.noOs]: "No operating system",
  [WEBCAM.fullHd]: "1080p+ webcam",
  [WEBCAM.ir]: "IR camera",
  [WEBCAM.low]: "720p webcam",
  [WEBCAM.none]: "No webcam",
};

/**
 * Sentence of each signal; the functions take figures already formatted. Where a figure is not
 * stated, `unstated.figure`, `unstated.ramType` or `unstated.year` stands in.
 */
export const SIGNAL_DETAILS = {
  power: (watts: string, perWatt: string | null): string =>
    perWatt === null ? `${watts} W TDP` : `${watts} W TDP · ${perWatt} CPU Mark per W`,
  displayLowRes: (height: string, minimum: string): string =>
    `Panel is ${height} px tall; Full HD (${minimum} px) is the usual minimum.`,
  ramTiny: (gb: string): string => `${gb} GB is too little for current Windows and browsers.`,
  ramLow: (gb: string): string => `${gb} GB covers basic use but leaves no room to grow.`,
  storageEmmc: "Soldered eMMC flash is slower than an SSD and cannot be swapped.",
  storageHddOnly: "A spinning hard drive and no SSD: slow to boot and to open anything.",
  storageTiny: (gb: string): string => `${gb} GB fills up quickly with the system and updates.`,
  storageSmall: (gb: string): string => `${gb} GB is workable but tight.`,
  ramTypeOutdated: (type: string, currentGeneration: number): string =>
    `${type} is older than DDR${currentGeneration}.`,
  wifiOld: (generation: string, current: string): string =>
    `Wi-Fi ${generation} is behind Wi-Fi ${current} in speed and range.`,
  displayDim: (nits: string): string => `${nits} nits is hard to read in a bright room.`,
  batterySmall: (wh: string): string => `${wh} Wh gives a short runtime.`,
  modelOld: (year: string, yearsAgo: string): string =>
    `Released in ${year}, ${yearsAgo} years ago.`,
  usb2Only: "No faster ports: slow for external drives and docks.",
  videoOutOld: "HDMI 1.4 caps a 4K display at 30 Hz.",
  noOs: "Ships without Windows; budget for a license or install your own.",
  webcamFullHd: "Sharp video calls.",
  webcamIr: "Face login with Windows Hello.",
  webcamLow: "Video calls look soft.",
  webcamNone: "The datasheet lists no camera.",
  unstated: { figure: "?", ramType: "This memory", year: "an unknown year" },
} as const;
