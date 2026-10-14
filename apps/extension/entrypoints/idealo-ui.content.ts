import {
  capturePageSnapshot,
  domLinkCatalog,
  embeddedCatalog,
  embeddedStatus,
  firstCatalog,
  idealoAdapter,
} from "@idealo-hw/idealo-page";
import { IDEALO_MATCH_PATTERNS } from "@idealo-hw/idealo-query/url/constants";
import { buildPageReport } from "../src/features/diagnostics";
import { startFilterBuilder } from "../src/features/filters";
import { RATING_CARD_STYLES, startRatings } from "../src/features/ratings";
import { installGlobalErrorReporting } from "../src/platform/errors";
import { onMessage } from "../src/platform/messaging";
import { mountOverlay, type Overlay } from "../src/ui/host";
import { HOST_TAG_PREFIX } from "../src/ui/theme";

export default defineContentScript({
  matches: [...IDEALO_MATCH_PATTERNS],
  main(ctx) {
    installGlobalErrorReporting("content");
    // Created on first use, so pages with nothing to show get no overlay at all.
    let overlay: Promise<Overlay> | undefined;
    const getOverlay = (): Promise<Overlay> => {
      overlay ??= mountOverlay(ctx, { css: RATING_CARD_STYLES });
      return overlay;
    };

    const ratings = startRatings(ctx, idealoAdapter, getOverlay);
    const filters = startFilterBuilder(
      ctx,
      firstCatalog([embeddedCatalog, domLinkCatalog]),
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
    onMessage("getPageSnapshot", () =>
      capturePageSnapshot(document, location.href, { hostPrefix: HOST_TAG_PREFIX }),
    );
  },
});
