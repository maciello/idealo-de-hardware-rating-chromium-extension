/** What kind of drive holds the system; "hybrid" is an SSHD, "emmc" soldered flash. */
export type StorageKind = "ssd" | "hdd" | "hybrid" | "emmc";

/** "none" is a stated absence (Free DOS, "ohne Betriebssystem"), not an unknown name. */
export type OsKind = "windows" | "macos" | "chromeos" | "linux" | "none";

/** A video connector; only HDMI carries a version, null when the datasheet writes a bare "HDMI". */
export type VideoOutput =
  | { readonly kind: "hdmi"; readonly version: number | null }
  | { readonly kind: "displayport" | "thunderbolt" | "usb_c" | "vga" | "dvi" };

/**
 * The camera: stated absent, or present with whatever detail is known. A camera with a resolution
 * is present by definition, so "absent with a resolution" cannot be written down.
 */
export type WebcamFact =
  | { readonly present: false }
  | {
      readonly present: true;
      /** Short side of the pixel grid. */
      readonly heightPx?: number;
      readonly megapixels?: number;
      /** An infrared camera (Windows Hello face login); absent when the datasheet does not say. */
      readonly irCamera?: true;
    };

/** System memory type, mapped by the caller from its own grammar (the extension uses hw-bench). */
export interface RamType {
  /** As idealo writes it: "DDR4", "LPDDR5X". */
  readonly label: string;
  /** 3 for DDR3, 5 for LPDDR5X. */
  readonly generation: number;
  readonly lowPower: boolean;
}

/**
 * What a product states about itself, in canonical units. Every field is optional: absent means
 * not stated, never 0 or "".
 */
export interface ProductFacts {
  /** CPU thermal design power in watts, as a product datasheet states it. */
  cpuTdpWatts?: number;
  ramGb?: number;
  ramType?: RamType;
  /** Largest stated drive capacity in GB (1 TB is 1000). */
  storageGb?: number;
  /** An SSD stated anywhere wins over an HDD, so "hdd" means no SSD is stated. */
  storageKind?: StorageKind;
  /** Short side of the panel's pixel grid (1.920 x 1.080 is 1080). */
  displayHeightPx?: number;
  brightnessNits?: number;
  batteryWh?: number;
  /** Wi-Fi generation: 802.11n is 4, ac 5, ax 6, be 7. */
  wifiGeneration?: number;
  releaseYear?: number;
  /** Newest USB generation among the ports (major version: 3 for 3.2, 4 for USB4); Thunderbolt counts as 4, USB-C as 3. */
  usbMaxGen?: number;
  /** Never empty. */
  videoOutputs?: readonly VideoOutput[];
  osKind?: OsKind;
  /** Absent when the datasheet says nothing about a camera; silence is never "no webcam". */
  webcam?: WebcamFact;
}
