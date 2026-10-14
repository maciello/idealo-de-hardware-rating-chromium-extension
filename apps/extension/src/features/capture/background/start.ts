import { recordError } from "../../../platform/errors";
import { captureModeItem } from "../../../platform/storage";
import { createTapRegistrar } from "../adapters/registration";

/**
 * The network tap is opt-in: it is registered only while capture mode is on. Listeners are added
 * synchronously so a storage change can wake the service worker.
 */
export function startCaptureBackground(): void {
  const tap = createTapRegistrar(browser.scripting);
  const report = (error: unknown): void => {
    console.error("[idealo-hw] tap registration", error);
    void recordError("background", error);
  };
  captureModeItem.watch((enabled) => void tap.sync(enabled).catch(report));
  browser.runtime.onInstalled.addListener(
    () =>
      void captureModeItem
        .getValue()
        .then((on) => tap.sync(on, true))
        .catch(report),
  );
  void captureModeItem
    .getValue()
    .then((on) => tap.sync(on))
    .catch(report);
}
