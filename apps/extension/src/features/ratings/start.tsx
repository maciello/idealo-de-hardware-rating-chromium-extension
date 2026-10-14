import type { PageAdapter } from "@idealo-hw/idealo-page";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { sendMessage } from "../../platform/messaging";
import type { Overlay } from "../../ui/host";
import { ConnectedRatingChip } from "./connected";
import { type RatingsHandle, startRatingsController } from "./controller";

const openSettings = (): void => void sendMessage("openOptions", undefined);

/** Starts rating the page: chips in every rated tile, cards in the overlay. */
export const startRatings = (
  ctx: ContentScriptContext,
  adapter: PageAdapter,
  getOverlay: () => Promise<Overlay>,
): RatingsHandle =>
  startRatingsController(ctx, adapter, getOverlay, (input) => (
    <ConnectedRatingChip {...input} onOpenSettings={openSettings} />
  ));
