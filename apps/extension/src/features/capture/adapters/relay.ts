import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { captureModeItem } from "../../../platform/storage";
import { TapMessageSchema } from "../model/protocol";
import { captureRing } from "./ring";

/**
 * Isolated-world side of the network tap: stores the responses the MAIN-world tap posts while
 * capture mode is on. Messages that arrive before the mode is known are held and then kept or
 * dropped.
 */
export function startCaptureRelay(ctx: ContentScriptContext): void {
  let enabled: boolean | undefined;
  const early: unknown[] = [];

  const accept = (data: unknown): void => {
    const message = TapMessageSchema.safeParse(data);
    if (message.success) void captureRing.append(message.data.response);
  };

  const flush = (): void => {
    for (const data of early.splice(0)) if (enabled) accept(data);
  };

  ctx.addEventListener(window, "message", (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    if (enabled === undefined) early.push(event.data);
    else if (enabled) accept(event.data);
  });

  void captureModeItem.getValue().then((value) => {
    enabled ??= value;
    flush();
  });
  const unwatch = captureModeItem.watch((value) => {
    enabled = value;
    flush();
  });
  ctx.onInvalidated(unwatch);
}
