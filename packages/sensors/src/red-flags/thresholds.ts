import type { VideoOutput } from "../facts";

const MODERN_VIDEO_KINDS: readonly VideoOutput["kind"][] = ["displayport", "thunderbolt", "usb_c"];

/**
 * Every cut-off of the red-flag catalog, drafted from the datasheet sample in
 * docs/adr/0015-product-sensors.yaml. "MaxGb" style limits are inclusive, "min" limits are the
 * lowest value that is still fine.
 */
export const RED_FLAG_THRESHOLDS = {
  display: { minHeightPx: 1080, dimMaxNits: 250 },
  ram: {
    tinyMaxGb: 4,
    lowMaxGb: 8,
    /** DDR3 and older. */
    typeRedMaxGeneration: 3,
    /** DDR4 and LPDDR4X; the newest generation is `typeCurrentGeneration`. */
    typeAmberMaxGeneration: 4,
    typeCurrentGeneration: 5,
  },
  storage: { tinyMaxGb: 128, smallMaxGb: 256 },
  wifi: {
    /** Wi-Fi 4 and older. */
    redMaxGeneration: 4,
    /** Wi-Fi 5. */
    infoMaxGeneration: 5,
    /** What the copy compares an old generation with. */
    currentGeneration: 6,
  },
  battery: { minWh: 45 },
  /** A model released this many years before now, or earlier, is old. */
  modelAgeYears: 5,
  usb: { minGeneration: 3 },
  video: {
    /** HDMI below this version caps 4K at 30 Hz. */
    hdmiMinVersion: 2,
    /** Outputs that rule out "HDMI 1.4 only". */
    modernKinds: MODERN_VIDEO_KINDS,
  },
} as const;
