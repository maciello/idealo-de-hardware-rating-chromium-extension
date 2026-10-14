import { startAiMatchingBackground } from "../src/features/ai-matching/background";
import { startCaptureBackground } from "../src/features/capture/background";
import { installGlobalErrorReporting } from "../src/platform/errors";
import { onMessage } from "../src/platform/messaging";

export default defineBackground(() => {
  installGlobalErrorReporting("background");
  onMessage("openOptions", () => browser.runtime.openOptionsPage());

  startAiMatchingBackground();

  startCaptureBackground();
});
