import { createAiTestService, probeDecider } from "../src/ai/ai-test-service";
import { storageKeyProvider } from "../src/ai/key-provider";
import { createOpenRouterService } from "../src/ai/openrouter-service";
import { createTapRegistrar } from "../src/capture/tap-registration";
import { installGlobalErrorReporting, recordError } from "../src/platform/errors";
import { onMessage } from "../src/platform/messaging";
import { aiTestResultItem, captureModeItem } from "../src/platform/storage";

export default defineBackground(() => {
  installGlobalErrorReporting("background");
  onMessage("openOptions", () => browser.runtime.openOptionsPage());

  const openrouter = createOpenRouterService({
    redirectUrl: browser.identity.getRedirectURL(),
    extensionBaseUrl: browser.runtime.getURL("/"),
    launchWebAuthFlow: (url) => browser.identity.launchWebAuthFlow({ url, interactive: true }),
  });
  onMessage("connectOpenRouter", ({ sender }) => openrouter.connect(sender.url));
  onMessage("disconnectOpenRouter", ({ sender }) => openrouter.disconnect(sender.url));

  const aiTest = createAiTestService({
    extensionBaseUrl: browser.runtime.getURL("/"),
    keys: storageKeyProvider,
    createDecider: probeDecider,
    save: (result) => aiTestResultItem.setValue(result),
    now: () => new Date(),
  });
  onMessage("testAiMatching", ({ sender }) => aiTest.run(sender.url));

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
