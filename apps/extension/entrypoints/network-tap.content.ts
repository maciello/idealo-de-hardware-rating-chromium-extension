import { TAP_SOURCE, type TapMessage } from "../src/capture/protocol";
import { startNetworkTap } from "../src/capture/tap";

export default defineContentScript({
  matches: ["https://www.idealo.de/*"],
  // Not in the manifest: the background registers it with chrome.scripting only while capture mode
  // is on (src/capture/tap-registration.ts). world and runAt are repeated there.
  registration: "runtime",
  runAt: "document_start",
  world: "MAIN",
  main() {
    startNetworkTap((response) => {
      const message: TapMessage = { source: TAP_SOURCE, response };
      window.postMessage(message, location.origin);
    });
  },
});
