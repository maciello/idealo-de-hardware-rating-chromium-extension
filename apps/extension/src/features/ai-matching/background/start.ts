import { onMessage } from "../../../platform/messaging";
import { aiTestResultItem } from "../../../platform/storage";
import { storageKeyProvider } from "./key-provider";
import { createOpenRouterService } from "./service";
import { createAiTestService, probeDecider } from "./test-call";

/**
 * Registers the OpenRouter connect, disconnect and test handlers. The key provider is wired in here
 * and never leaves this module: no barrel re-exports it.
 */
export function startAiMatchingBackground(): void {
  const extensionBaseUrl = browser.runtime.getURL("/");

  const openrouter = createOpenRouterService({
    redirectUrl: browser.identity.getRedirectURL(),
    extensionBaseUrl,
    launchWebAuthFlow: (url) => browser.identity.launchWebAuthFlow({ url, interactive: true }),
  });
  onMessage("connectOpenRouter", ({ sender }) => openrouter.connect(sender.url));
  onMessage("disconnectOpenRouter", ({ sender }) => openrouter.disconnect(sender.url));

  const aiTest = createAiTestService({
    extensionBaseUrl,
    keys: storageKeyProvider,
    createDecider: probeDecider,
    save: (result) => aiTestResultItem.setValue(result),
    now: () => new Date(),
  });
  onMessage("testAiMatching", ({ sender }) => aiTest.run(sender.url));
}
