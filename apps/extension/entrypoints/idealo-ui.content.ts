import { installGlobalErrorReporting } from "../src/diagnostics/error-log";
import { buildPageReport } from "../src/diagnostics/page-report";
import { firstCatalog } from "../src/filters/catalog-source";
import { startFilterBuilder } from "../src/filters/controller";
import { domLinkCatalog } from "../src/filters/dom-link-catalog";
import { embeddedCatalog } from "../src/filters/embedded-catalog";
import { rememberingCatalog } from "../src/filters/remembering-catalog";
import { vocabularyStorage } from "../src/filters/vocabulary-storage";
import { onMessage } from "../src/messaging";
import { embeddedStatus } from "../src/page/embedded-listing";
import { idealoAdapter } from "../src/page/idealo-adapter";
import { capturePageSnapshot } from "../src/page/snapshot";
import { startRatings } from "../src/ratings/controller";
import { mountOverlay, type Overlay } from "../src/ui/host";

export default defineContentScript({
  matches: ["https://www.idealo.de/*"],
  main(ctx) {
    installGlobalErrorReporting("content");
    // Created on first use, so pages with nothing to show get no overlay at all.
    let overlay: Promise<Overlay> | undefined;
    const getOverlay = (): Promise<Overlay> => {
      overlay ??= mountOverlay(ctx);
      return overlay;
    };

    const ratings = startRatings(ctx, idealoAdapter, getOverlay);
    const filters = startFilterBuilder(
      ctx,
      rememberingCatalog(firstCatalog([embeddedCatalog, domLinkCatalog]), vocabularyStorage),
      getOverlay,
    );

    onMessage("getPageStats", () => ratings.stats());
    onMessage("getPageReport", async () =>
      buildPageReport(location.href, await ratings.inspect(), embeddedStatus(document)),
    );
    onMessage("openFilterBuilder", () => {
      filters?.open();
      return filters !== null;
    });
    onMessage("getPageSnapshot", () => capturePageSnapshot(document, location.href));
  },
});
