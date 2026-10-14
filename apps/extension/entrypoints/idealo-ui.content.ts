import { capturedJsonCatalog } from "../src/filters/captured-json-catalog";
import { firstCatalog } from "../src/filters/catalog-source";
import { startFilterBuilder } from "../src/filters/controller";
import { domLinkCatalog } from "../src/filters/dom-link-catalog";
import { heuristicIdealoAdapter } from "../src/page/heuristic-idealo-adapter";
import { startRatings } from "../src/ratings/controller";

export default defineContentScript({
  matches: ["https://www.idealo.de/*"],
  main(ctx) {
    startRatings(ctx, heuristicIdealoAdapter);
    void startFilterBuilder(ctx, firstCatalog([capturedJsonCatalog, domLinkCatalog]));
  },
});
