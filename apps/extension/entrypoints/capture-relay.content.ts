import { IDEALO_MATCH_PATTERNS } from "@idealo-hw/idealo-query/url/constants";
import { startCaptureRelay } from "../src/features/capture/adapters/relay";

export default defineContentScript({
  matches: [...IDEALO_MATCH_PATTERNS],
  runAt: "document_start",
  main(ctx) {
    startCaptureRelay(ctx);
  },
});
