import { TAP_SOURCE, type TapMessage } from "../src/capture/protocol";
import { startNetworkTap } from "../src/capture/tap";

export default defineContentScript({
  matches: ["https://www.idealo.de/*"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    startNetworkTap((response) => {
      const message: TapMessage = { source: TAP_SOURCE, response };
      window.postMessage(message, location.origin);
    });
  },
});
