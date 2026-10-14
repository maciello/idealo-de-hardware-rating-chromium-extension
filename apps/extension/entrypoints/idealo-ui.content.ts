import { capturedJsonCatalog } from "../src/filters/captured-json-catalog";
import { firstCatalog } from "../src/filters/catalog-source";
import { startFilterBuilder } from "../src/filters/controller";
import { domLinkCatalog } from "../src/filters/dom-link-catalog";
import { onMessage } from "../src/messaging";
import { idealoAdapter } from "../src/page/idealo-adapter";
import { capturePageSnapshot } from "../src/page/snapshot";
import { startRatings } from "../src/ratings/controller";
import { mountOverlay, type Overlay } from "../src/ui/overlay";

export default defineContentScript({
  matches: ["https://www.idealo.de/*"],
  main(ctx) {
    // Created on first use, so pages with nothing to show get no overlay at all.
    let overlay: Promise<Overlay> | undefined;
    const getOverlay = (): Promise<Overlay> => {
      overlay ??= mountOverlay(ctx);
      return overlay;
    };

    const ratings = startRatings(ctx, idealoAdapter, getOverlay);
    const filters = startFilterBuilder(
      ctx,
      firstCatalog([capturedJsonCatalog, domLinkCatalog]),
      getOverlay,
    );

    onMessage("getPageStats", () => ratings.stats());
    onMessage("openFilterBuilder", () => {
      filters?.open();
      return filters !== null;
    });
    onMessage("getPageSnapshot", () => capturePageSnapshot(document, location.href));
  },
});
