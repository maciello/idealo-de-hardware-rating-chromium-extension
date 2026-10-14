import { createOpenRouterService } from "../src/ai/openrouter-service";
import { onMessage } from "../src/messaging";

export default defineBackground(() => {
  onMessage("openOptions", () => browser.runtime.openOptionsPage());

  const openrouter = createOpenRouterService({
    redirectUrl: browser.identity.getRedirectURL(),
    extensionBaseUrl: browser.runtime.getURL("/"),
    launchWebAuthFlow: (url) => browser.identity.launchWebAuthFlow({ url, interactive: true }),
  });
  onMessage("connectOpenRouter", ({ sender }) => openrouter.connect(sender.url));
  onMessage("disconnectOpenRouter", ({ sender }) => openrouter.disconnect(sender.url));
});
