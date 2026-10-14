/** A figure the product may not state; a rule only trips when it does, so a signal always has it. */
type Stated = number | undefined;

interface PowerParams {
  readonly tdpWatts: number;
  /** CPU Mark per watt of TDP; null when the CPU Mark is unknown. */
  readonly cpuMarkPerWatt: number | null;
}

/**
 * The figures each signal rests on, by signal id, so a consumer words them in its own language.
 * Null: the signal's id says it all. Each sensor declares its ids as constants that must name a key
 * here, so a renamed id fails to compile.
 */
export interface SignalParamsById {
  "power.very_low": PowerParams;
  "power.very_high": PowerParams;
  "red_flags.display_low_res": { readonly heightPx: Stated; readonly minHeightPx: number };
  "red_flags.ram_tiny": { readonly ramGb: Stated };
  "red_flags.ram_low": { readonly ramGb: Stated };
  "red_flags.storage_emmc": null;
  "red_flags.storage_hdd_only": null;
  "red_flags.storage_tiny": { readonly storageGb: Stated };
  "red_flags.storage_small": { readonly storageGb: Stated };
  "red_flags.ram_type_outdated": {
    readonly label: string | undefined;
    /** The newest DDR generation the product is compared with. */
    readonly currentGeneration: number;
  };
  "red_flags.wifi_old": {
    readonly generation: Stated;
    /** The Wi-Fi generation the product is compared with. */
    readonly currentGeneration: number;
  };
  "red_flags.display_dim": { readonly nits: Stated };
  "red_flags.battery_small": { readonly wh: Stated };
  "red_flags.model_old": { readonly releaseYear: Stated; readonly yearsAgo: number };
  "red_flags.usb2_only": null;
  "red_flags.video_out_old": null;
  "red_flags.no_os": null;
  "webcam.full_hd": null;
  "webcam.ir": null;
  "webcam.low_res": null;
  "webcam.none": null;
}

export type SignalId = keyof SignalParamsById;
