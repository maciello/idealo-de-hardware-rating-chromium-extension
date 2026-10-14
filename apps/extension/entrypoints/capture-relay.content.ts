import { startCaptureRelay } from "../src/features/capture/adapters/relay";

export default defineContentScript({
  matches: ["https://www.idealo.de/*"],
  runAt: "document_start",
  main(ctx) {
    startCaptureRelay(ctx);
  },
});
