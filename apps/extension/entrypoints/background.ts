import { createTapRegistrar } from "../src/capture/tap-registration";
import { startAiMatchingBackground } from "../src/features/ai-matching/background";
import { installGlobalErrorReporting, recordError } from "../src/platform/errors";
import { onMessage } from "../src/platform/messaging";
import { captureModeItem } from "../src/platform/storage";

export default defineBackground(() => {
  installGlobalErrorReporting("background");
  onMessage("openOptions", () => browser.runtime.openOptionsPage());

  startAiMatchingBackground();

  // The network tap is opt-in: it is registered only while capture mode is on. Listeners are added
  // synchronously so a storage change can wake the service worker.
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
});
