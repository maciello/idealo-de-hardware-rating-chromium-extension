import { startMainWorldTap } from "../src/features/capture/adapters/tap";

export default defineContentScript({
  matches: ["https://www.idealo.de/*"],
  // Not in the manifest: the background registers it with chrome.scripting only while capture mode
  // is on (src/features/capture/adapters/registration.ts). world and runAt are repeated there.
  registration: "runtime",
  runAt: "document_start",
  world: "MAIN",
  main() {
    startMainWorldTap();
  },
});
