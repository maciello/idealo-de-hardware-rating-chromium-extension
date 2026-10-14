import { storage } from "@wxt-dev/storage";

export const captureModeItem = storage.defineItem<boolean>("local:captureMode", {
  fallback: false,
  version: 1,
});
