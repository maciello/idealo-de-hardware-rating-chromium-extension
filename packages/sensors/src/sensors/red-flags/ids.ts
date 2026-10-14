export const RED_FLAGS_SENSOR_ID = "red_flags";

export const RED_FLAG_IDS = {
  displayLowRes: "red_flags.display_low_res",
  ramTiny: "red_flags.ram_tiny",
  ramLow: "red_flags.ram_low",
  storageEmmc: "red_flags.storage_emmc",
  storageHddOnly: "red_flags.storage_hdd_only",
  storageTiny: "red_flags.storage_tiny",
  storageSmall: "red_flags.storage_small",
  ramTypeOutdated: "red_flags.ram_type_outdated",
  wifiOld: "red_flags.wifi_old",
  displayDim: "red_flags.display_dim",
  batterySmall: "red_flags.battery_small",
  modelOld: "red_flags.model_old",
  usb2Only: "red_flags.usb2_only",
  videoOutOld: "red_flags.video_out_old",
  noOs: "red_flags.no_os",
} as const;

export type FlagId = (typeof RED_FLAG_IDS)[keyof typeof RED_FLAG_IDS];
